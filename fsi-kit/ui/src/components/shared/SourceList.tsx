import { ChevronDown, ExternalLink, Globe2 } from "lucide-react";
import { ResearchSource } from "../../types";

interface Props { sources: ResearchSource[]; title?: string; compact?: boolean }

export default function SourceList({ sources, title = "Sources", compact = false }: Props) {
  if (!sources.length) return null;
  return (
    <details className="glass rounded-2xl group" aria-label={title}>
      <summary className="list-none cursor-pointer px-5 py-4 flex items-center gap-3 select-none">
        <Globe2 className="w-4 h-4 text-tavily-orange" />
        <h3 className="font-display font-semibold text-ink-100">{title}</h3>
        <span className="text-xs text-ink-500">{sources.length}</span>
        <span className="ml-auto text-[11px] text-ink-500 group-open:hidden">Show sources</span>
        <span className="ml-auto text-[11px] text-ink-500 hidden group-open:inline">Hide sources</span>
        <ChevronDown className="w-4 h-4 text-ink-500 transition-transform group-open:rotate-180" />
      </summary>
      <div className="border-t border-white/55 px-5 pb-5 pt-2 grid md:grid-cols-2 gap-x-6">
        {sources.map((source, index) => {
          let host = source.domain ?? "Source";
          try { host = new URL(source.url).hostname.replace(/^www\./, ""); } catch { /* retain fallback */ }
          return (
            <a
              key={`${source.url}-${index}`}
              href={source.url}
              target="_blank"
              rel="noreferrer"
              className="py-3 border-b border-ink-700/30 flex gap-3 group/source"
            >
              <span className="w-6 h-6 shrink-0 rounded-full bg-tavily-orange/10 text-[11px] font-semibold text-tavily-orange flex items-center justify-center">{index + 1}</span>
              <span className="min-w-0 flex-1">
                <span className="text-sm font-medium text-ink-100 group-hover/source:text-tavily-orange block leading-5">{source.title || host}</span>
                {!compact && (source.snippet || source.content) && <span className="text-xs text-ink-400 mt-1 line-clamp-2 block">{source.snippet || source.content}</span>}
                <span className="text-[10px] text-ink-500 mt-1 block">{host}{source.published_date ? ` · ${source.published_date}` : ""}</span>
              </span>
              <ExternalLink className="w-3.5 h-3.5 text-ink-500 shrink-0 mt-1" />
            </a>
          );
        })}
      </div>
    </details>
  );
}
