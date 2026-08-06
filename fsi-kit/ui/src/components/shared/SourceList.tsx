import { ExternalLink, Globe2 } from "lucide-react";
import { ResearchSource } from "../../types";

interface Props { sources: ResearchSource[]; title?: string; compact?: boolean }
export default function SourceList({ sources, title = "Sources", compact = false }: Props) {
  if (!sources.length) return null;
  return <section className="glass rounded-2xl p-5" aria-label={title}>
    <div className="flex items-center gap-2 mb-3"><Globe2 className="w-4 h-4 text-tavily-orange"/><h3 className="font-display font-semibold text-ink-100">{title}</h3><span className="text-xs text-ink-500">{sources.length}</span></div>
    <div className="space-y-2">
      {sources.map((source, index) => {
        let host = source.domain ?? "Source";
        try { host = new URL(source.url).hostname.replace(/^www\./, ""); } catch { /* retain fallback */ }
        return <a key={`${source.url}-${index}`} href={source.url} target="_blank" rel="noreferrer" className="glass-subtle rounded-xl p-3 flex gap-3 group hover:bg-white/60 transition-colors">
          <span className="w-6 h-6 shrink-0 rounded-full bg-white/60 text-[11px] font-semibold text-ink-400 flex items-center justify-center">{index + 1}</span>
          <span className="min-w-0 flex-1"><span className="text-sm font-medium text-ink-100 group-hover:text-tavily-orange block">{source.title || host}</span>{!compact && (source.snippet || source.content) && <span className="text-xs text-ink-400 mt-1 line-clamp-2 block">{source.snippet || source.content}</span>}<span className="text-[10px] text-ink-500 mt-1 block">{host}{source.published_date ? ` · ${source.published_date}` : ""}</span></span>
          <ExternalLink className="w-3.5 h-3.5 text-ink-500 shrink-0 mt-1"/>
        </a>;
      })}
    </div>
  </section>;
}
