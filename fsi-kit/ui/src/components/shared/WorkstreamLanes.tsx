import {
  AlertTriangle,
  CheckCircle2,
  Circle,
  Globe2,
  Loader2,
  MinusCircle,
  Search,
} from "lucide-react";
import { LaneViewState } from "../../hooks/useWorkflowStream";
import { ResearchSource } from "../../types";

function sourceDomain(source: ResearchSource): string {
  if (source.domain) return source.domain.replace(/^www\./, "");
  try {
    return new URL(source.url).hostname.replace(/^www\./, "");
  } catch {
    return "Source";
  }
}

function sourceTitle(source: ResearchSource): string {
  const title = source.title?.trim();
  return title && title !== source.url ? title : sourceDomain(source);
}

export default function WorkstreamLanes({
  lanes,
  heading = "Live workstreams",
  variant = "cards",
}: {
  lanes: LaneViewState[];
  heading?: string;
  variant?: "cards" | "list";
}) {
  return (
    <section className="glass rounded-2xl p-4">
      <div className="flex justify-between items-center mb-3">
        <h2 className="font-display font-semibold text-ink-100">{heading}</h2>
        <span className="text-[11px] uppercase tracking-wider text-ink-500">
          Predictable, bounded lanes
        </span>
      </div>
      <div
        className={variant === "list" ? "divide-y divide-ink-700/35" : "grid md:grid-cols-2 gap-3"}
      >
        {lanes.map((lane) => {
          const Icon =
            lane.status === "complete"
              ? CheckCircle2
              : lane.status === "error"
                ? AlertTriangle
                : lane.status === "skipped"
                  ? MinusCircle
                  : lane.status === "running"
                    ? Loader2
                    : Circle;
          const color =
            lane.status === "complete"
              ? "text-risk-low"
              : lane.status === "error"
                ? "text-risk-high"
                : lane.status === "running"
                  ? "text-tavily-green"
                  : "text-ink-500";
          return (
            <article
              key={lane.id}
              className={
                variant === "list" ? "py-2.5 first:pt-0 last:pb-0" : "glass-subtle rounded-xl p-3"
              }
            >
              <div className="flex gap-2.5">
                <Icon
                  className={`w-3.5 h-3.5 mt-0.5 shrink-0 ${color} ${lane.status === "running" ? "animate-spin" : ""}`}
                />
                <div className="min-w-0 flex-1">
                  <div className="flex flex-wrap justify-between gap-2">
                    <h3 className="text-sm font-semibold text-ink-100">{lane.label}</h3>
                    <span className="flex items-center gap-1 text-[10px] text-ink-500">
                      <Search className="w-3 h-3" />
                      {lane.sources.length} source{lane.sources.length === 1 ? "" : "s"}
                    </span>
                  </div>
                  <div className="flex flex-wrap items-center gap-x-2 gap-y-1 mt-1">
                    <p
                      className={`text-xs ${lane.status === "error" ? "text-risk-high" : "text-ink-400"}`}
                    >
                      {lane.message || (lane.status === "queued" ? "Waiting" : lane.status)}
                    </p>
                    {lane.phase && (
                      <span className="text-[9px] uppercase tracking-wider text-ink-500">
                        {lane.phase.replace(/_/g, " ")}
                      </span>
                    )}
                  </div>

                  {lane.queries.length > 0 && (
                    <div className="mt-1.5 flex min-w-0 items-center gap-1.5">
                      <Search className="w-2.5 h-2.5 text-ink-500 shrink-0" />
                      <p
                        className="text-[10px] text-ink-500 truncate"
                        title={lane.queries[lane.queries.length - 1]}
                      >
                        {lane.queries[lane.queries.length - 1]}
                      </p>
                    </div>
                  )}

                  {lane.sources.length > 0 && (
                    <div className="mt-2 flex flex-wrap gap-1.5">
                      {lane.sources
                        .slice(-3)
                        .reverse()
                        .map((source) => (
                          <a
                            key={source.url}
                            href={source.url}
                            target="_blank"
                            rel="noreferrer"
                            title={`${sourceTitle(source)} · ${sourceDomain(source)}${
                              source.snippet
                                ? `

${source.snippet}`
                                : ""
                            }`}
                            className="group inline-flex min-w-0 max-w-[240px] items-center gap-1.5 rounded-md border border-white/45 bg-white/25 px-2 py-1 hover:bg-white/50 transition-colors"
                          >
                            {source.favicon ? (
                              <img
                                src={source.favicon}
                                alt=""
                                loading="lazy"
                                className="w-3.5 h-3.5 rounded-sm object-contain shrink-0"
                                onError={(event) => {
                                  event.currentTarget.style.display = "none";
                                }}
                              />
                            ) : (
                              <Globe2 className="w-3 h-3 text-ink-500 shrink-0" />
                            )}
                            <span className="text-[10px] text-ink-300 truncate group-hover:text-ink-100">
                              {sourceTitle(source)}
                            </span>
                          </a>
                        ))}
                      {lane.sources.length > 3 && (
                        <span className="inline-flex items-center rounded-md bg-white/20 px-2 py-1 text-[9px] text-ink-500">
                          +{lane.sources.length - 3}
                        </span>
                      )}
                    </div>
                  )}
                </div>
              </div>
            </article>
          );
        })}
      </div>
    </section>
  );
}
