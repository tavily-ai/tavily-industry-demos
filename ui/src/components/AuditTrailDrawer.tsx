import { AnimatePresence, motion } from "framer-motion";
import { ExternalLink, FileClock, X } from "lucide-react";
import { AuditEntry, RosterClient } from "../types";

interface Props {
  open: boolean;
  onClose: () => void;
  entries: AuditEntry[];
  clients?: RosterClient[];
}

function formatTime(ts: number): string {
  return new Date(ts * 1000).toLocaleTimeString("en-US", {
    hour12: false,
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
  });
}

function EntryRow({ entry, clientName }: { entry: AuditEntry; clientName?: string }) {
  const base = "px-4 py-3 border-b border-white/30";

  if (entry.type === "tool_call") {
    const tool = String(entry.tool || "");
    const args = (entry.args || {}) as Record<string, unknown>;
    const isSearch = tool.includes("search");
    return (
      <div className={base}>
        <div className="flex items-baseline gap-2">
          <span className="font-mono text-[10px] text-ink-500">{formatTime(entry.ts)}</span>
          <span className="text-[11px] font-medium text-accent-600 uppercase tracking-wide">
            {isSearch ? "Search" : "Extract"}
          </span>
          {clientName && <span className="text-[11px] text-ink-500">{clientName}</span>}
        </div>
        {typeof args.query === "string" && (
          <p className="mt-1 font-mono text-xs text-ink-200 leading-relaxed">"{args.query}"</p>
        )}
        {Array.isArray(args.urls) && (
          <div className="mt-1 space-y-0.5">
            {(args.urls as string[]).slice(0, 4).map((u, i) => (
              <a
                key={i}
                href={u}
                target="_blank"
                rel="noopener noreferrer"
                className="flex items-center gap-1 font-mono text-[11px] text-ink-400 hover:text-accent-500 truncate"
              >
                <ExternalLink className="w-3 h-3 flex-shrink-0" />
                <span className="truncate">{u}</span>
              </a>
            ))}
          </div>
        )}
      </div>
    );
  }

  if (entry.type === "tool_result") {
    const hits = (entry.hits || []) as Array<{ url?: string; title?: string }>;
    return (
      <div className={base}>
        <div className="flex items-baseline gap-2">
          <span className="font-mono text-[10px] text-ink-500">{formatTime(entry.ts)}</span>
          <span className="text-[11px] font-medium text-ink-400 uppercase tracking-wide">
            {hits.length} source{hits.length === 1 ? "" : "s"} retrieved
          </span>
          {clientName && <span className="text-[11px] text-ink-500">{clientName}</span>}
        </div>
        {hits[0]?.title && (
          <p className="mt-0.5 text-xs text-ink-500 truncate">{hits[0].title}</p>
        )}
      </div>
    );
  }

  if (entry.type === "run_complete") {
    return (
      <div className={base}>
        <div className="flex items-baseline gap-2">
          <span className="font-mono text-[10px] text-ink-500">{formatTime(entry.ts)}</span>
          <span className="text-[11px] font-medium text-risk-low uppercase tracking-wide">
            Run complete
          </span>
          {clientName && <span className="text-[11px] text-ink-500">{clientName}</span>}
          {typeof entry.elapsed_s === "number" && (
            <span className="text-[11px] text-ink-500 ml-auto">{entry.elapsed_s}s</span>
          )}
        </div>
        {typeof entry.verdict === "string" && (
          <p className="mt-0.5 text-xs text-ink-300">verdict: {entry.verdict}</p>
        )}
      </div>
    );
  }

  if (entry.type === "run_error") {
    return (
      <div className={base}>
        <div className="flex items-baseline gap-2">
          <span className="font-mono text-[10px] text-ink-500">{formatTime(entry.ts)}</span>
          <span className="text-[11px] font-medium text-risk-high uppercase tracking-wide">Error</span>
        </div>
        <p className="mt-0.5 text-xs text-risk-high">{String(entry.message || "")}</p>
      </div>
    );
  }

  return (
    <div className={base}>
      <div className="flex items-baseline gap-2">
        <span className="font-mono text-[10px] text-ink-500">{formatTime(entry.ts)}</span>
        <span className="text-[11px] text-ink-500">{entry.type}</span>
      </div>
    </div>
  );
}

export default function AuditTrailDrawer({ open, onClose, entries, clients }: Props) {
  const nameFor = (id?: string | null) =>
    id ? clients?.find((c) => c.id === id)?.name : undefined;

  return (
    <AnimatePresence>
      {open && (
        <>
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-40 bg-black/20"
            onClick={onClose}
          />
          <motion.aside
            initial={{ x: "100%" }}
            animate={{ x: 0 }}
            exit={{ x: "100%" }}
            transition={{ type: "tween", duration: 0.25, ease: "easeOut" }}
            className="fixed right-0 top-0 bottom-0 z-50 w-full max-w-md glass flex flex-col"
            style={{ background: "rgba(248, 248, 250, 0.92)" }}
          >
            <div className="flex items-center justify-between px-5 py-4 border-b border-white/50">
              <div className="flex items-center gap-2">
                <FileClock className="w-4 h-4 text-ink-400" />
                <h2 className="font-display font-semibold text-sm text-ink-100">
                  Audit trail
                </h2>
                <span className="text-[11px] text-ink-500">{entries.length} events</span>
              </div>
              <button
                onClick={onClose}
                className="p-1.5 rounded-md hover:bg-white/40 transition-colors"
                aria-label="Close audit trail"
              >
                <X className="w-4 h-4 text-ink-400" />
              </button>
            </div>

            <div className="flex-1 overflow-y-auto">
              {entries.length === 0 ? (
                <p className="px-5 py-8 text-sm text-ink-500 text-center">
                  No events yet — start a run to see the trail.
                </p>
              ) : (
                entries.map((entry, i) => (
                  <EntryRow key={i} entry={entry} clientName={nameFor(entry.client_id)} />
                ))
              )}
            </div>
          </motion.aside>
        </>
      )}
    </AnimatePresence>
  );
}
