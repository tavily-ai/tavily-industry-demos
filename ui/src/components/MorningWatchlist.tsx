import { useEffect, useRef, useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import {
  AlertTriangle,
  CheckCircle2,
  ChevronDown,
  ExternalLink,
  History,
  Loader2,
  Play,
  Quote,
  Search,
  Square,
  XCircle,
} from "lucide-react";
import {
  AuditEntry,
  ClientRunState,
  HandoffContext,
  RosterClient,
  RunRecord,
  Verdict,
  WatchlistSummary,
} from "../types";
import ActivityFeed from "./ActivityFeed";

interface Props {
  roster: RosterClient[];
  runs: Record<string, ClientRunState>;
  isRunning: boolean;
  summary: WatchlistSummary | null;
  auditEntries: AuditEntry[];
  runHistory: RunRecord[];
  activeRunId: string | null;
  onLoadRun: (runId: string) => void;
  onRun: () => void;
  onStop: () => void;
  onInvestigate: (ctx: HandoffContext) => void;
}

const VERDICT_STYLE: Record<Verdict, { label: string; classes: string; icon: typeof CheckCircle2 }> = {
  clear: { label: "Clear", classes: "text-risk-low border-risk-low/30 bg-risk-low/10", icon: CheckCircle2 },
  review: { label: "Review", classes: "text-risk-elevated border-risk-elevated/30 bg-risk-elevated/10", icon: AlertTriangle },
  escalate: { label: "Escalate", classes: "text-risk-high border-risk-high/30 bg-risk-high/10", icon: XCircle },
};

const STATUS_LABEL: Record<ClientRunState["status"], string> = {
  queued: "Queued",
  planning: "Planning",
  searching: "Searching",
  extracting: "Reading articles",
  done: "Complete",
  error: "Error",
};

function formatRunTime(ts: number): { day: string; time: string } {
  const d = new Date(ts * 1000);
  const now = new Date();
  const sameDay =
    d.getFullYear() === now.getFullYear() &&
    d.getMonth() === now.getMonth() &&
    d.getDate() === now.getDate();
  const yesterday = new Date(now);
  yesterday.setDate(now.getDate() - 1);
  const isYesterday =
    d.getFullYear() === yesterday.getFullYear() &&
    d.getMonth() === yesterday.getMonth() &&
    d.getDate() === yesterday.getDate();
  const day = sameDay
    ? "Today"
    : isYesterday
      ? "Yesterday"
      : d.toLocaleDateString(undefined, { month: "short", day: "numeric" });
  const time = d.toLocaleTimeString(undefined, { hour: "2-digit", minute: "2-digit" });
  return { day, time };
}

export default function MorningWatchlist({
  roster,
  runs,
  isRunning,
  summary,
  auditEntries,
  runHistory,
  activeRunId,
  onLoadRun,
  onRun,
  onStop,
  onInvestigate,
}: Props) {
  const [expanded, setExpanded] = useState<Set<string>>(new Set());
  const autoExpandedRef = useRef<Set<string>>(new Set());

  const completedCount = roster.filter((c) => runs[c.id]?.status === "done").length;

  // Auto-expand flagged clients as they complete (once per run, so manual collapse sticks)
  useEffect(() => {
    const newlyFlagged = roster.filter(
      (c) =>
        runs[c.id]?.status === "done" &&
        runs[c.id]?.verdict?.verdict !== "clear" &&
        !expanded.has(c.id) &&
        !autoExpandedRef.current.has(c.id)
    );
    if (newlyFlagged.length === 0) return;
    for (const c of newlyFlagged) autoExpandedRef.current.add(c.id);
    setExpanded((prev) => {
      const next = new Set(prev);
      for (const c of newlyFlagged) next.add(c.id);
      return next;
    });
  }, [runs, roster, expanded]);

  const toggleExpanded = (id: string) => {
    setExpanded((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  // Collapse all rows when a fresh run starts
  const wasRunningRef = useRef(false);
  useEffect(() => {
    if (isRunning && !wasRunningRef.current) {
      setExpanded(new Set());
      autoExpandedRef.current = new Set();
    }
    wasRunningRef.current = isRunning;
  }, [isRunning]);

  const order: Verdict[] = ["escalate", "review", "clear"];
  const doneClients = order.flatMap((v) =>
    roster.filter((c) => runs[c.id]?.status === "done" && runs[c.id]?.verdict?.verdict === v)
  );
  const activeOrQueued = roster.filter((c) => runs[c.id]?.status !== "done");
  const orderedRoster = [...doneClients, ...activeOrQueued];

  return (
    <div>
      {/* Run controls */}
      <div className="glass rounded-2xl p-5 flex items-center gap-4 flex-wrap">
        <div className="flex-1 min-w-[220px]">
          <h2 className="font-display font-semibold text-ink-100">Daily adverse media screening</h2>
          <p className="text-xs text-ink-500 mt-0.5">
            Scheduled 06:00 · {roster.length} clients on watchlist
            {isRunning && ` · ${completedCount}/${roster.length} screened`}
          </p>
        </div>

        {summary && !isRunning && (
          <div className="flex items-center gap-3 text-xs">
            <span className="text-risk-low font-medium">{summary.counts.clear} clear</span>
            <span className="text-risk-elevated font-medium">{summary.counts.review} review</span>
            <span className="text-risk-high font-medium">{summary.counts.escalate} escalate</span>
            <span className="text-ink-500">{summary.elapsedS}s</span>
          </div>
        )}

        {isRunning ? (
          <button
            onClick={onStop}
            className="glass-button-active rounded-xl px-4 py-2 text-sm font-medium text-ink-100 flex items-center gap-2"
          >
            <Square className="w-3.5 h-3.5" />
            Stop
          </button>
        ) : (
          <button
            onClick={onRun}
            disabled={roster.length === 0}
            className="glass-button-active rounded-xl px-4 py-2 text-sm font-medium text-ink-100 flex items-center gap-2 disabled:opacity-40"
          >
            <Play className="w-3.5 h-3.5" />
            Run screening
          </button>
        )}
      </div>

      {/* Run history */}
      {runHistory.length > 0 && (
        <div className="mt-3 flex items-center gap-2 flex-wrap">
          <span className="flex items-center gap-1.5 text-[10px] uppercase tracking-wider text-ink-500 font-medium">
            <History className="w-3 h-3" />
            Past runs
          </span>
          {runHistory.map((run) => {
            const { day, time } = formatRunTime(run.created_at);
            const isActive = run.run_id === activeRunId;
            return (
              <button
                key={run.run_id}
                onClick={() => onLoadRun(run.run_id)}
                className={`rounded-lg px-3 py-1.5 text-[11px] flex items-center gap-2 transition-all ${
                  isActive ? "glass-button-active text-ink-100" : "glass-subtle text-ink-400 hover:text-ink-200"
                }`}
              >
                <span className="font-medium">{day}</span>
                <span className="opacity-70">{time}</span>
                {run.counts && (
                  <span className="flex items-center gap-1.5 ml-1">
                    {run.counts.escalate > 0 && (
                      <span className="text-risk-high font-medium">{run.counts.escalate} esc</span>
                    )}
                    {run.counts.review > 0 && (
                      <span className="text-risk-elevated font-medium">{run.counts.review} rev</span>
                    )}
                    {run.counts.clear > 0 && (
                      <span className="text-risk-low font-medium">{run.counts.clear} clear</span>
                    )}
                  </span>
                )}
              </button>
            );
          })}
        </div>
      )}

      {/* Roster */}
      <div className="mt-4 space-y-2">
        {orderedRoster.map((client) => {
          const run = runs[client.id];
          if (!run) return null;
          const verdict = run.verdict?.verdict;
          const style = verdict ? VERDICT_STYLE[verdict] : null;
          const isOpen = expanded.has(client.id);
          const hasFindings = (run.verdict?.evidence?.length || 0) > 0;
          const showActivity = run.activity.length > 0 && run.status !== "queued";

          return (
            <motion.div
              key={client.id}
              layout
              className="glass rounded-xl overflow-hidden"
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
            >
              <button
                onClick={() => toggleExpanded(client.id)}
                className="w-full px-5 py-3.5 flex items-center gap-4 text-left"
              >
                {/* status indicator */}
                <div className="w-5 flex-shrink-0 flex justify-center">
                  {run.status === "done" && style ? (
                    <style.icon className={style.classes.split(" ")[0]} style={{ width: 18, height: 18 }} />
                  ) : run.status === "error" ? (
                    <XCircle className="w-[18px] h-[18px] text-risk-high" />
                  ) : run.status === "queued" ? (
                    <div className="w-2 h-2 rounded-full bg-ink-600/40" />
                  ) : (
                    <Loader2 className="w-[18px] h-[18px] text-accent-500 animate-spin" />
                  )}
                </div>

                <div className="flex-1 min-w-0">
                  <div className="flex items-baseline gap-2">
                    <span className="font-medium text-sm text-ink-100">{client.name}</span>
                    <span className="text-[11px] text-ink-500">{client.id}</span>
                  </div>
                  <p className="text-[11px] text-ink-500 truncate">
                    {client.country} · {client.industry}
                  </p>
                </div>

                {/* live stage */}
                {run.status !== "done" && run.status !== "queued" && run.status !== "error" && (
                  <div className="hidden md:flex items-center gap-1.5 max-w-[300px]">
                    <Search className="w-3 h-3 text-ink-500 flex-shrink-0" />
                    <span className="text-[11px] text-ink-400 truncate">
                      {STATUS_LABEL[run.status]}
                      {run.stageDetail ? ` — ${run.stageDetail}` : ""}
                    </span>
                  </div>
                )}

                {run.status === "done" && style && (
                  <span className={`text-[11px] font-medium px-2.5 py-1 rounded-full border ${style.classes}`}>
                    {style.label}
                    {run.elapsedS != null && <span className="ml-1.5 opacity-60">{run.elapsedS}s</span>}
                  </span>
                )}

                {run.status === "error" && (
                  <span className="text-[11px] font-medium px-2.5 py-1 rounded-full border text-risk-high border-risk-high/30 bg-risk-high/10">
                    Error
                  </span>
                )}

                <ChevronDown className={`w-4 h-4 text-ink-500 transition-transform ${isOpen ? "rotate-180" : ""}`} />
              </button>

              {/* expanded detail */}
              <AnimatePresence>
                {isOpen && (
                  <motion.div
                    initial={{ height: 0, opacity: 0 }}
                    animate={{ height: "auto", opacity: 1 }}
                    exit={{ height: 0, opacity: 0 }}
                    transition={{ duration: 0.2 }}
                    className="overflow-hidden"
                  >
                    <div className="px-5 pb-4 pt-1 border-t border-white/40">
                      {run.status === "error" && <p className="text-sm text-risk-high">{run.error}</p>}

                      {/* Live activity stream — the agent's work as it happens */}
                      {showActivity && (
                        <div className="mb-3">
                          <ActivityFeed
                            entries={run.activity}
                            live={run.status !== "done" && run.status !== "error"}
                          />
                        </div>
                      )}

                      {run.verdict && (
                        <>
                          <p className="text-sm text-ink-200 leading-relaxed">{run.verdict.summary}</p>

                          {run.verdict.risk_categories.length > 0 && (
                            <div className="flex flex-wrap gap-1.5 mt-2.5">
                              {run.verdict.risk_categories.map((cat) => (
                                <span
                                  key={cat}
                                  className="text-[10px] uppercase tracking-wide font-medium px-2 py-0.5 rounded-full bg-accent-500/10 text-accent-600 border border-accent-500/20"
                                >
                                  {cat}
                                </span>
                              ))}
                            </div>
                          )}

                          {hasFindings && (
                            <div className="mt-3 space-y-2.5">
                              {run.verdict.evidence.map((ev, i) => (
                                <div key={i} className="glass-subtle rounded-lg p-3">
                                  <div className="flex items-start justify-between gap-3">
                                    <p className="text-[13px] font-medium text-ink-100 leading-snug">{ev.headline}</p>
                                    <a
                                      href={ev.url}
                                      target="_blank"
                                      rel="noopener noreferrer"
                                      className="flex-shrink-0 text-ink-500 hover:text-accent-500 transition-colors"
                                      title={ev.url}
                                    >
                                      <ExternalLink className="w-3.5 h-3.5" />
                                    </a>
                                  </div>
                                  {ev.date && <p className="text-[10px] text-ink-500 mt-0.5">{ev.date}</p>}
                                  <div className="flex gap-2 mt-2">
                                    <Quote className="w-3 h-3 text-ink-500 flex-shrink-0 mt-0.5" />
                                    <p className="text-xs text-ink-400 italic leading-relaxed">{ev.quoted_passage}</p>
                                  </div>
                                </div>
                              ))}
                            </div>
                          )}

                          {(run.verdict.searches_performed?.length || 0) > 0 && (
                            <div className="mt-3 pt-3 border-t border-white/40">
                              <p className="text-[10px] uppercase tracking-wider text-ink-500 font-medium mb-1.5">
                                Agent queries ({run.verdict.searches_performed.length})
                              </p>
                              <div className="space-y-0.5">
                                {run.verdict.searches_performed.map((q, i) => (
                                  <p key={i} className="font-mono text-[11px] text-ink-500 truncate">
                                    "{q}"
                                  </p>
                                ))}
                              </div>
                            </div>
                          )}

                          {verdict !== "clear" && (
                            <button
                              onClick={() =>
                                onInvestigate({
                                  entityName: client.name,
                                  flagNote: `${style?.label} — ${run.verdict?.summary}`,
                                })
                              }
                              className="mt-4 glass-button-active rounded-lg px-3.5 py-2 text-xs font-medium text-ink-100 flex items-center gap-1.5"
                            >
                              <Search className="w-3.5 h-3.5" />
                              Investigate {client.name} →
                            </button>
                          )}
                        </>
                      )}
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>
            </motion.div>
          );
        })}
      </div>
    </div>
  );
}
