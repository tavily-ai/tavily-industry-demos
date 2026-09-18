import config from '../demo.config.mjs';

export class InputError extends Error {}
export function validateInput(body) {
  if (!body || typeof body !== 'object' || Array.isArray(body)) throw new InputError('Enter your research details.');
  const input = {};
  for (const field of config.fields) {
    const value = body[field.id];
    if (typeof value !== 'string' || !value.trim() || value.length > field.maxLength) {
      throw new InputError(`${field.label} is required and must be ${field.maxLength} characters or fewer.`);
    }
    input[field.id] = value.trim().replace(/\s+/g, ' ');
    if (field.options && !field.options.includes(input[field.id])) throw new InputError(`Choose a valid ${field.label.toLowerCase()}.`);
  }
  input.timeRange = body.timeRange ?? config.defaultTimeRange;
  if (!['week', 'month', 'year', 'all'].includes(input.timeRange)) throw new InputError('Choose a valid search window.');
  if (config.id === 'threat-vulnerability-monitor') {
    try {
      const vendor = new URL(input.context.match(/^https?:/) ? input.context : `https://${input.context}`);
      if (!/^([a-z0-9-]+\.)+[a-z]{2,}$/i.test(vendor.hostname) || vendor.username || vendor.password || vendor.port || vendor.search || vendor.hash || vendor.pathname !== '/') throw new Error();
      input.context = vendor.hostname;
    } catch { throw new InputError('Enter a vendor hostname, such as tomcat.apache.org.'); }
  }
  return input;
}

export function safeUrl(value) {
  try { const u = new URL(value); return ['https:', 'http:'].includes(u.protocol) ? u.href : null; } catch { return null; }
}

export function buildPlan(input) {
  return config.lanes.map((lane, index) => {
    const spec = config.searches(input)[index];
    // URL-looking terms become filters; never include a site: operator in the query.
    const domains = [...(spec.domains ?? [])];
    let query = spec.query.replace(/(?:https?:\/\/|www\.)[^\s]+|(?:site:)?\b(?:[a-z0-9-]+\.)+[a-z]{2,}(?:\/[^\s]*)?/gi, value => {
      try { domains.push(new URL(value.replace(/^site:/, '').match(/^https?:/) ? value.replace(/^site:/, '') : `https://${value.replace(/^site:/, '')}`).hostname); } catch {}
      return '';
    }).replace(/\s+/g, ' ').trim();
    if (query.length > 120) query = query.slice(0,120).replace(/\s+\S*$/, '').trim();
    return {
      id: lane.id, title: lane.title, note: lane.note,
      request: {
        query, search_depth: 'advanced', max_results: 10, chunks_per_source: config.chunks,
        include_domains: [...new Set(domains)], exclude_domains: [],
        ...(domains.length ? {include_domains_mode:'filter'} : {}),
        topic: spec.topic ?? 'general', include_answer: config.includeAnswer ? 'basic' : false,
        include_usage: true, include_raw_content: false, include_published_date:true,
        ...(spec.evergreen || input.timeRange === 'all' ? {} : { time_range: input.timeRange, filter_by_published_date:true }),
      },
    };
  });
}

function publicError(error) {
  if (error.name === 'TimeoutError') return 'This search timed out. Try again with a narrower subject.';
  const status = error.status;
  if (status === 401 || status === 403) return 'Tavily rejected this API key. Check the key and retry.';
  if ([429, 432, 433].includes(status)) return 'Tavily rate or credit limit reached. Check your account and retry later.';
  if (status) return `Tavily returned HTTP ${status}. Please retry.`;
  return 'Could not reach Tavily. Check your connection and retry.';
}

export async function research(input, { apiKey, emit = () => {}, signal, fetchImpl = fetch }) {
  const startedAt = new Date().toISOString();
  const plan = buildPlan(input);
  emit({ type: 'plan', message: 'Starting three focused searches', lanes: plan.map(({id,title,request}) => ({id,title,request})) });
  const sections = await Promise.all(plan.map(async lane => {
    emit({ type: 'search', id: lane.id, message: `Searching ${lane.title.toLowerCase()}`, query: lane.request.query });
    try {
      const response = await fetchImpl('https://api.tavily.com/search', {
        method: 'POST', headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${apiKey}` },
        body: JSON.stringify(lane.request),
        signal: signal ? AbortSignal.any([signal, AbortSignal.timeout(60000)]) : AbortSignal.timeout(60000),
      });
      if (!response.ok) throw Object.assign(new Error('Tavily request failed'), {status: response.status});
      const data = await response.json();
      if (!Array.isArray(data.results)) throw new Error('Invalid Tavily response');
      const seen = new Set();
      let excluded = 0;
      const sources = data.results.flatMap(result => {
        const url = safeUrl(result.url);
        if (!url || seen.has(url)) return [];
        const hostname = new URL(url).hostname.toLowerCase();
        if (lane.request.include_domains.length && !lane.request.include_domains.some(domain => hostname === domain || hostname.endsWith('.'+domain))) { excluded++; return []; }
        seen.add(url);
        const text = `${result.title || ''} ${result.content || ''}`.toLowerCase();
        return [{ url, title: String(result.title || new URL(url).hostname), content: String(result.content || ''),
          ...(config.id === 'candidate-research' ? {identityHint: text.includes(input.entity.toLowerCase()) && text.includes(input.context.toLowerCase()) ? 'Name and affiliation mentioned. Confirm identity.' : 'Identity needs review.'} : {}),
          score: Number.isFinite(result.score) ? result.score : null, publishedDate: result.published_date || null }];
      });
      const section = { ...lane, status: 'complete', summary: config.includeAnswer && sources.length && !excluded && typeof data.answer === 'string' ? data.answer : null,
        sources, credits: Number.isFinite(data.usage?.credits) ? data.usage.credits : null, responseTime: data.response_time ?? null };
      emit({ type: 'result', id: lane.id, message: `${lane.title}: ${sources.length} sources found`, section });
      return section;
    } catch (error) {
      if (signal?.aborted) throw error;
      const section = { ...lane, status: 'error', error: publicError(error), sources: [], credits: null };
      emit({ type: 'search-error', id: lane.id, message: `${lane.title}: ${section.error}`, section });
      return section;
    }
  }));
  const successful = sections.filter(s => s.status === 'complete');
  const report = {
    title: config.title, input, startedAt, completedAt: new Date().toISOString(),
    status: successful.length === plan.length ? 'complete' : successful.length ? 'partial' : 'failed',
    sections, questions: config.questions(input), note: config.reportNote,
    sourceCount: new Set(sections.flatMap(s => s.sources.map(r => r.url))).size,
    credits: successful.length && successful.every(s => s.credits !== null) ? successful.reduce((sum,s) => sum + s.credits,0) : null,
  };
  emit({type: 'complete', message: report.status === 'complete' ? 'Your brief is ready' : report.status === 'partial' ? 'Partial brief ready. Some searches failed.' : 'Search failed. Check the errors below.', report});
  return report;
}
