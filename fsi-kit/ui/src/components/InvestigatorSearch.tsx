import { AnimatePresence, motion } from "framer-motion";
import {
  AlertTriangle,
  ArrowRight,
  Building2,
  ExternalLink,
  Flag,
  History,
  Loader2,
  MapPin,
  Quote,
  Search,
  ShieldAlert,
  ShieldCheck,
  Square,
  Users,
} from "lucide-react";
import { AuditEntry, CaseFile, Finding, RiskRating, RunRecord } from "../types";
import ActivityFeed from "./ActivityFeed";

interface Props {
  query: string;
  onQueryChange: (q: string) => void;
  flagContext: string | null;
  onDismissFlag: () => void;
  isRunning: boolean;
  stage: string;
  caseFile: CaseFile | null;
  error: string | null;
  auditEntries: AuditEntry[];
  caseHistory: RunRecord[];
  onLoadCase: (caseId: string) => void;
  onRun: () => void;
  onStop: () => void;
}

const RATING_STYLE: Record<RiskRating, { label: string; classes: string }> = {
  low: { label: "Low risk", classes: "text-risk-low border-risk-low/30 bg-risk-low/10" },
  medium: { label: "Medium risk", classes: "text-risk-moderate border-risk-moderate/30 bg-risk-moderate/10" },
  high: { label: "High risk", classes: "text-risk-elevated border-risk-elevated/30 bg-risk-elevated/10" },
  critical: { label: "Critical risk", classes: "text-risk-critical border-risk-critical/30 bg-risk-critical/10" },
};

const SEVERITY_CLASSES: Record<Finding["severity"], string> = {
  low: "text-risk-low border-risk-low/30 bg-risk-low/10",
  medium: "text-risk-moderate border-risk-moderate/30 bg-risk-moderate/10",
  high: "text-risk-elevated border-risk-elevated/30 bg-risk-elevated/10",
  critical: "text-risk-critical border-risk-critical/30 bg-risk-critical/10",
};

function initials(name: string): string {
  const parts = name.trim().split(/\s+/).filter(Boolean);
  if (parts.length === 0) return "?";
  if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase();
  return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
}

function formatCaseTime(ts: number): string {
  const d = new Date(ts * 1000);
  const now = new Date();
  const sameDay =
    d.getFullYear() === now.getFullYear() &&
    d.getMonth() === now.getMonth() &&
    d.getDate() === now.getDate();
  const time = d.toLocaleTimeString(undefined, { hour: "2-digit", minute: "2-digit" });
  if (sameDay) return `Today ${time}`;
  return `${d.toLocaleDateString(undefined, { month: "short", day: "numeric" })} ${time}`;
}

export default function InvestigatorSearch({
  query,
  onQueryChange,
  flagContext,
  onDismissFlag,
  isRunning,
  stage,
  caseFile,
  error,
  auditEntries,
  caseHistory,
  onLoadCase,
  onRun,
  onStop,
}: Props) {
  const rating = caseFile ? RATING_STYLE[caseFile.risk_rating] : null;

  return (
    <div>
      {/* Search bar */}
      <div className="glass rounded-2xl p-5">
        <h2 className="font-display font-semibold text-ink-100">Enhanced due diligence</h2>
        <p className="text-xs text-ink-500 mt-0.5 mb-4">
          Investigator-driven case search — entity name, address, phone, or keyword
        </p>

        {flagContext && (
          <div className="mb-3 flex items-start gap-2 glass-subtle rounded-lg px-3 py-2.5">
            <Flag className="w-3.5 h-3.5 text-risk-elevated flex-shrink-0 mt-0.5" />
            <div className="flex-1 min-w-0">
              <p className="text-[11px] font-medium text-risk-elevated uppercase tracking-wide">
                Handed off from watchlist
              </p>
              <p className="text-xs text-ink-300 mt-0.5 line-clamp-2">{flagContext}</p>
            </div>
            <button
              onClick={onDismissFlag}
              className="text-[11px] text-ink-500 hover:text-ink-300 flex-shrink-0"
            >
              dismiss
            </button>
          </div>
        )}

        <div className="flex gap-2">
          <div className="flex-1 relative">
            <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-ink-500" />
            <input
              value={query}
              onChange={(e) => onQueryChange(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && !isRunning && onRun()}
              placeholder="e.g. Canaccord Genuity, or an address, phone number, keyword…"
              className="glass-input w-full rounded-xl pl-10 pr-4 py-3 text-sm text-ink-100 placeholder:text-ink-500 focus:outline-none focus:ring-2 focus:ring-accent-400/40"
            />
          </div>
          {isRunning ? (
            <button
              onClick={onStop}
              className="glass-button-active rounded-xl px-5 py-3 text-sm font-medium text-ink-100 flex items-center gap-2"
            >
              <Square className="w-3.5 h-3.5" />
              Stop
            </button>
          ) : (
            <button
              onClick={onRun}
              disabled={!query.trim()}
              className="glass-button-active rounded-xl px-5 py-3 text-sm font-medium text-ink-100 flex items-center gap-2 disabled:opacity-40"
            >
              Investigate
              <ArrowRight className="w-4 h-4" />
            </button>
          )}
        </div>
      </div>

      {/* Recent cases */}
      {caseHistory.length > 0 && (
        <div className="mt-3 flex items-center gap-2 flex-wrap">
          <span className="flex items-center gap-1.5 text-[10px] uppercase tracking-wider text-ink-500 font-medium">
            <History className="w-3 h-3" />
            Recent cases
          </span>
          {caseHistory.map((c) => (
            <button
              key={c.run_id}
              onClick={() => onLoadCase(c.run_id)}
              className="glass-subtle rounded-lg px-3 py-1.5 text-[11px] text-ink-400 hover:text-ink-200 transition-all flex items-center gap-2"
            >
              <span className="font-medium text-ink-300 max-w-[240px] truncate">{c.query}</span>
              <span className="opacity-70">{formatCaseTime(c.created_at)}</span>
            </button>
          ))}
        </div>
      )}

      {/* Live status + full action list */}
      <AnimatePresence>
        {(isRunning || auditEntries.length > 0) && (
          <motion.div
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0 }}
            className="mt-4 glass rounded-xl px-5 py-4"
          >
            {isRunning && (
              <div className="flex items-center gap-3 mb-3">
                <Loader2 className="w-4 h-4 text-accent-500 animate-spin flex-shrink-0" />
                <p className="text-sm text-ink-300 truncate">{stage || "Working…"}</p>
              </div>
            )}
            <ActivityFeed entries={auditEntries} live={isRunning} />
          </motion.div>
        )}
      </AnimatePresence>

      {error && (
        <div className="mt-4 glass rounded-xl px-5 py-4 flex items-center gap-3">
          <AlertTriangle className="w-4 h-4 text-risk-high flex-shrink-0" />
          <p className="text-sm text-risk-high">{error}</p>
        </div>
      )}

      {/* Case file */}
      <AnimatePresence>
        {caseFile && (
          <motion.div
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0 }}
            className="mt-4 space-y-4"
          >
            {/* Identity card */}
            <div className="glass rounded-2xl p-6">
              <div className="flex items-start justify-between gap-4 flex-wrap">
                <div className="flex items-start gap-3">
                  <div className="glass-subtle rounded-lg p-2.5">
                    <Building2 className="w-5 h-5 text-ink-300" />
                  </div>
                  <div>
                    <h3 className="font-display font-semibold text-lg text-ink-100">
                      {caseFile.legal_name}
                    </h3>
                    <div className="flex items-center gap-3 mt-1 text-xs text-ink-500 flex-wrap">
                      {caseFile.hq_address && (
                        <span className="flex items-center gap-1">
                          <MapPin className="w-3 h-3" />
                          {caseFile.hq_address}
                        </span>
                      )}
                      {caseFile.industry && <span>{caseFile.industry}</span>}
                      {caseFile.naics_code && (
                        <span className="font-mono">NAICS {caseFile.naics_code}</span>
                      )}
                    </div>
                  </div>
                </div>
                {rating && (
                  <span
                    className={`flex items-center gap-1.5 text-xs font-medium px-3 py-1.5 rounded-full border ${rating.classes}`}
                  >
                    {caseFile.risk_rating === "low" ? (
                      <ShieldCheck className="w-3.5 h-3.5" />
                    ) : (
                      <ShieldAlert className="w-3.5 h-3.5" />
                    )}
                    {rating.label}
                  </span>
                )}
              </div>

              <p className="mt-4 text-sm text-ink-200 leading-relaxed">{caseFile.summary}</p>

              {caseFile.leadership.length > 0 && (
                <div className="mt-5 pt-4 border-t border-white/40">
                  <p className="flex items-center gap-1.5 text-[11px] uppercase tracking-wider text-ink-500 font-medium mb-3">
                    <Users className="w-3.5 h-3.5" />
                    Executive leadership ({caseFile.leadership.length})
                  </p>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                    {caseFile.leadership.map((l, i) => (
                      <div
                        key={i}
                        className="glass-subtle rounded-lg px-3 py-2.5 flex items-center gap-3"
                      >
                        <div className="w-8 h-8 rounded-full bg-accent-500/10 border border-accent-500/20 flex items-center justify-center flex-shrink-0">
                          <span className="text-[11px] font-semibold text-accent-600">
                            {initials(l.name)}
                          </span>
                        </div>
                        <div className="min-w-0">
                          <p className="text-[13px] font-medium text-ink-100 leading-tight truncate">
                            {l.name}
                          </p>
                          <p className="text-[11px] text-ink-500 leading-tight truncate mt-0.5">
                            {l.title}
                          </p>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>

            {/* Findings */}
            {caseFile.findings.length > 0 && (
              <div className="glass rounded-2xl p-6">
                <p className="text-[11px] uppercase tracking-wider text-ink-500 font-medium mb-3">
                  Adverse findings ({caseFile.findings.length})
                </p>
                <div className="space-y-3">
                  {caseFile.findings.map((f, i) => (
                    <div key={i} className="glass-subtle rounded-xl p-4">
                      <div className="flex items-start justify-between gap-3">
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2 flex-wrap">
                            <p className="text-sm font-medium text-ink-100 leading-snug">
                              {f.headline}
                            </p>
                            <span
                              className={`text-[10px] uppercase tracking-wide font-medium px-2 py-0.5 rounded-full border ${SEVERITY_CLASSES[f.severity]}`}
                            >
                              {f.severity}
                            </span>
                          </div>
                          <div className="flex items-center gap-2 mt-1 text-[11px] text-ink-500">
                            {f.date && <span>{f.date}</span>}
                            <span className="uppercase tracking-wide">{f.risk_category}</span>
                          </div>
                        </div>
                        <a
                          href={f.url}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="flex-shrink-0 text-ink-500 hover:text-accent-500 transition-colors"
                          title={f.url}
                        >
                          <ExternalLink className="w-4 h-4" />
                        </a>
                      </div>
                      <p className="mt-2 text-[13px] text-ink-300 leading-relaxed">{f.summary}</p>
                      <div className="flex gap-2 mt-2.5">
                        <Quote className="w-3 h-3 text-ink-500 flex-shrink-0 mt-0.5" />
                        <p className="text-xs text-ink-400 italic leading-relaxed">
                          {f.quoted_passage}
                        </p>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Recommendation + queries */}
            <div className="glass rounded-2xl p-6">
              <p className="text-[11px] uppercase tracking-wider text-ink-500 font-medium mb-2">
                Recommended action
              </p>
              <p className="text-sm text-ink-200 leading-relaxed">{caseFile.recommended_action}</p>

              {caseFile.searches_performed.length > 0 && (
                <div className="mt-4 pt-4 border-t border-white/40">
                  <p className="text-[10px] uppercase tracking-wider text-ink-500 font-medium mb-1.5">
                    Agent queries ({caseFile.searches_performed.length})
                  </p>
                  <div className="space-y-0.5">
                    {caseFile.searches_performed.map((q, i) => (
                      <p key={i} className="font-mono text-[11px] text-ink-500 truncate">
                        "{q}"
                      </p>
                    ))}
                  </div>
                </div>
              )}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
