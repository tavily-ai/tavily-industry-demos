import config from "../demo.config.mjs";

export class InputError extends Error {}

export function validateInput(body) {
  if (!body || typeof body !== "object" || Array.isArray(body)) {
    throw new InputError("Enter your research details.");
  }

  const input = {};
  for (const field of config.fields) {
    const value = body[field.id];
    if (typeof value !== "string" || !value.trim() || value.length > field.maxLength) {
      throw new InputError(
        `${field.label} is required and must be ${field.maxLength} characters or fewer.`,
      );
    }
    input[field.id] = value.trim().replace(/\s+/g, " ");
  }

  input.timeRange = body.timeRange ?? config.defaultTimeRange;
  if (!["week", "month", "year", "all"].includes(input.timeRange)) {
    throw new InputError("Choose a valid search window.");
  }
  return input;
}

export function safeUrl(value) {
  try {
    const url = new URL(value);
    return url.protocol === "https:" || url.protocol === "http:" ? url.href : null;
  } catch {
    return null;
  }
}

function allowedHost(url, domains) {
  if (!domains?.length) return true;
  const hostname = new URL(url).hostname.toLowerCase();
  return domains.some((domain) => hostname === domain || hostname.endsWith(`.${domain}`));
}

export function buildPlan(input) {
  return config.lanes.map((lane, index) => {
    const spec = config.searches(input)[index];
    const domains = [...new Set(spec.domains ?? [])];
    return {
      id: lane.id,
      title: lane.title,
      note: lane.note,
      request: {
        query: spec.query,
        search_depth: "advanced",
        max_results: 10,
        chunks_per_source: config.chunks,
        topic: spec.topic ?? "general",
        include_answer: config.includeAnswer ? "basic" : false,
        include_favicon: true,
        include_usage: true,
        ...(domains.length ? { include_domains: domains } : {}),
        ...(spec.evergreen || input.timeRange === "all" ? {} : { time_range: input.timeRange }),
      },
    };
  });
}

function publicError(error) {
  if (error.name === "TimeoutError")
    return "This search timed out. Try again with a narrower subject.";
  const status = error.status;
  if (status === 401 || status === 403)
    return "Tavily rejected the server API key. Check TAVILY_API_KEY and retry.";
  if ([429, 432, 433].includes(status))
    return "Tavily rate or credit limit reached. Check your account and retry later.";
  if (status) return `Tavily returned HTTP ${status}. Please retry.`;
  return "Could not reach Tavily. Check your connection and retry.";
}

function toSource(result) {
  const url = safeUrl(result.url);
  if (!url) return null;
  return {
    url,
    title: String(result.title || new URL(url).hostname),
    content: String(result.content || ""),
    favicon: safeUrl(result.favicon),
    score: Number.isFinite(result.score) ? result.score : null,
    publishedDate: result.published_date || null,
  };
}

export async function research(input, { apiKey, emit = () => {}, signal, fetchImpl = fetch }) {
  const startedAt = new Date().toISOString();
  const plan = buildPlan(input);
  emit({
    type: "plan",
    message: `Starting ${plan.length} focused searches`,
    lanes: plan.map(({ id, title, request }) => ({ id, title, request })),
  });

  const sections = await Promise.all(
    plan.map(async (lane) => {
      emit({
        type: "search",
        id: lane.id,
        message: `Searching ${lane.title.toLowerCase()}`,
        query: lane.request.query,
      });
      try {
        const response = await fetchImpl("https://api.tavily.com/search", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${apiKey}`,
            "X-Client-Name": "public-usecases--vendor-supply-chain-risk",
          },
          body: JSON.stringify(lane.request),
          signal: signal
            ? AbortSignal.any([signal, AbortSignal.timeout(60000)])
            : AbortSignal.timeout(60000),
        });
        if (!response.ok)
          throw Object.assign(new Error("Tavily request failed"), { status: response.status });
        const data = await response.json();
        if (!Array.isArray(data.results)) throw new Error("Invalid Tavily response");

        const domains = lane.request.include_domains;
        const seen = new Set();
        const sources = [];
        let excluded = 0;
        for (const result of data.results) {
          const source = toSource(result);
          if (!source || seen.has(source.url)) continue;
          if (!allowedHost(source.url, domains)) {
            excluded++;
            continue;
          }
          seen.add(source.url);
          sources.push(source);
        }

        const section = {
          ...lane,
          status: "complete",
          summary:
            config.includeAnswer && sources.length && !excluded && typeof data.answer === "string"
              ? data.answer
              : null,
          sources,
          credits: Number.isFinite(data.usage?.credits) ? data.usage.credits : null,
          responseTime: data.response_time ?? null,
        };
        emit({
          type: "result",
          id: lane.id,
          message: `${lane.title}: ${sources.length} sources found`,
          section,
        });
        return section;
      } catch (error) {
        if (signal?.aborted) throw error;
        const section = {
          ...lane,
          status: "error",
          error: publicError(error),
          sources: [],
          credits: null,
        };
        emit({
          type: "search-error",
          id: lane.id,
          message: `${lane.title}: ${section.error}`,
          section,
        });
        return section;
      }
    }),
  );

  const successful = sections.filter((section) => section.status === "complete");
  const report = {
    title: config.title,
    input,
    startedAt,
    completedAt: new Date().toISOString(),
    status:
      successful.length === plan.length ? "complete" : successful.length ? "partial" : "failed",
    sections,
    questions: config.questions(input),
    note: config.reportNote,
    sourceCount: new Set(sections.flatMap((section) => section.sources.map((source) => source.url)))
      .size,
    credits:
      successful.length && successful.every((section) => section.credits !== null)
        ? successful.reduce((sum, section) => sum + section.credits, 0)
        : null,
  };
  emit({
    type: "complete",
    message:
      report.status === "complete"
        ? "Your brief is ready"
        : report.status === "partial"
          ? "Partial brief ready. Some searches failed."
          : "Search failed. Check the errors below.",
    report,
  });
  return report;
}
