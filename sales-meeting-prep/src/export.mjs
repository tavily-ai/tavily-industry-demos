export function markdown(report, sample = false) {
  const lines = [`# ${report.title}`, '', sample ? 'Saved example. This is not a live search.' : 'Live Tavily Search brief.', `Retrieved: ${report.completedAt}`, `Status: ${report.status}`, '', ...Object.entries(report.input).map(([k,v]) => `${k}: ${v}`), '', report.note];
  for (const section of report.sections) {
    lines.push('', `## ${section.title}`, `Query: ${section.request.query}`, '', section.error || section.summary || 'Review the source excerpts below.');
    for (const source of section.sources) lines.push('', `### ${source.title}`, source.url, source.publishedDate ? `Published: ${source.publishedDate}` : 'Publication date unavailable', source.content);
  }
  lines.push('', '## Questions to explore', ...report.questions.map(q => `- ${q}`));
  return lines.join('\n');
}
