import { useEffect, useRef } from "react";
import { Activity, CheckCircle2, ExternalLink, Search } from "lucide-react";
import { AuditEntry } from "../types";

interface Props {
  entries: AuditEntry[];
  live?: boolean;
}

interface SourceLink {
  url: string;
  title?: string;
}

function activityLine(entry: AuditEntry): {
  icon: "search" | "read" | "done" | "flag";
  text: string;
  links?: SourceLink[];
} {
  if (entry.type === "tool_call") {
    const tool = String(entry.tool || "");
    const args = (entry.args || {}) as Record<string, unknown>;
    if (tool.includes("search")) {
      return { icon: "search", text: `Search — "${args.query ?? ""}"` };
    }
    const urls = (args.urls as string[]) || [];
    return {
      icon: "read",
      text: `Read ${urls.length} article${urls.length === 1 ? "" : "s"}`,
      links: urls.map((url) => ({ url })),
    };
  }
  if (entry.type === "tool_result") {
    const hits = (entry.hits as { url?: string; title?: string }[]) || [];
    return {
      icon: "flag",
      text: `${hits.length} source${hits.length === 1 ? "" : "s"} retrieved`,
      links: hits.filter((h) => h?.url).map((h) => ({ url: h.url!, title: h.title })),
    };
  }
  if (entry.type === "run_complete") {
    return { icon: "done", text: `Verdict: ${entry.verdict ?? "—"}` };
  }
  if (entry.type === "run_error") {
    return { icon: "flag", text: `Error: ${entry.message ?? ""}` };
  }
  return { icon: "flag", text: entry.type };
}

function ActivityIcon({ kind }: { kind: string }) {
  const cls = "w-3 h-3 flex-shrink-0 mt-0.5";
  if (kind === "search") return <Search className={`${cls} text-accent-500`} />;
  if (kind === "read") return <ExternalLink className={`${cls} text-tavily-green`} />;
  if (kind === "done") return <CheckCircle2 className={`${cls} text-risk-low`} />;
  return <Activity className={`${cls} text-ink-500`} />;
}

function hostname(url: string): string {
  try {
    return new URL(url).hostname.replace(/^www\./, "");
  } catch {
    return url;
  }
}

function SourcePill({ link }: { link: SourceLink }) {
  const host = hostname(link.url);
  return (
    <a
      href={link.url}
      target="_blank"
      rel="noopener noreferrer"
      title={link.title || link.url}
      className="inline-flex items-center gap-1.5 max-w-full rounded-md bg-white/40 border border-white/50 px-1.5 py-0.5 text-[10px] text-ink-400 hover:text-accent-600 hover:border-accent-400/40 transition-colors"
    >
      <img
        src={`https://www.google.com/s2/favicons?domain=${host}&sz=32`}
        alt=""
        className="w-3 h-3 rounded-sm flex-shrink-0"
        loading="lazy"
        onError={(e) => {
          (e.target as HTMLImageElement).style.display = "none";
        }}
      />
      <span className="truncate">{host}</span>
    </a>
  );
}

export default function ActivityFeed({ entries, live = false }: Props) {
  const endRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    endRef.current?.scrollIntoView({ behavior: "smooth", block: "nearest" });
  }, [entries.length]);

  return (
    <div>
      <p className="flex items-center gap-1.5 text-[10px] uppercase tracking-wider text-ink-500 font-medium mb-1.5">
        <Activity className="w-3 h-3" />
        Agent activity
        {live && <span className="w-1.5 h-1.5 rounded-full bg-accent-500 animate-pulse-dot" />}
      </p>
      <div className="glass-subtle rounded-lg p-3 max-h-44 overflow-y-auto space-y-1.5">
        {entries.length === 0 && (
          <p className="text-[11px] text-ink-500">Waiting for the agent to start…</p>
        )}
        {entries.map((entry, i) => {
          const line = activityLine(entry);
          return (
            <div key={i} className="flex items-start gap-2">
              <ActivityIcon kind={line.icon} />
              <div className="min-w-0 flex-1">
                <p className="text-[11px] text-ink-300 leading-snug break-words">{line.text}</p>
                {line.links && line.links.length > 0 && (
                  <div className="flex flex-wrap gap-1 mt-1">
                    {line.links.map((link, j) => (
                      <SourcePill key={j} link={link} />
                    ))}
                  </div>
                )}
              </div>
            </div>
          );
        })}
        <div ref={endRef} />
      </div>
    </div>
  );
}
