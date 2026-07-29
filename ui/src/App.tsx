import { useCallback, useEffect, useRef, useState } from "react";
import { ClipboardList, Search, ShieldCheck } from "lucide-react";
import MorningWatchlist from "./components/MorningWatchlist";
import InvestigatorSearch from "./components/InvestigatorSearch";
import { getApiUrl, streamSSE } from "./sse";
import {
  AuditEntry,
  CaseFile,
  ClientRunState,
  HandoffContext,
  RosterClient,
  RunRecord,
  ScreeningVerdict,
  StoredInvestigationRun,
  StoredWatchlistRun,
  WatchlistSummary,
} from "./types";

type View = "watchlist" | "investigator";

function stageToStatus(stage: string): ClientRunState["status"] {
  const s = stage.toLowerCase();
  if (s.includes("search")) return "searching";
  if (s.includes("reading") || s.includes("extract")) return "extracting";
  return "planning";
}

export default function App() {
  const [view, setView] = useState<View>("watchlist");

  // ---- Watchlist state (lifted so it persists across tab switches) ----
  const [roster, setRoster] = useState<RosterClient[]>([]);
  const [runs, setRuns] = useState<Record<string, ClientRunState>>({});
  const [isRunning, setIsRunning] = useState(false);
  const [summary, setSummary] = useState<WatchlistSummary | null>(null);
  const [auditEntries, setAuditEntries] = useState<AuditEntry[]>([]);
  const [runHistory, setRunHistory] = useState<RunRecord[]>([]);
  const [activeRunId, setActiveRunId] = useState<string | null>(null);
  const abortRef = useRef<AbortController | null>(null);

  const refreshHistory = useCallback(() => {
    fetch(`${getApiUrl()}/api/runs?kind=watchlist`)
      .then((r) => r.json())
      .then((d) => setRunHistory(d.runs || []))
      .catch(() => {});
  }, []);

  const [caseHistory, setCaseHistory] = useState<RunRecord[]>([]);

  const refreshCaseHistory = useCallback(() => {
    fetch(`${getApiUrl()}/api/runs?kind=investigation`)
      .then((r) => r.json())
      .then((d) => setCaseHistory(d.runs || []))
      .catch(() => {});
  }, []);

  useEffect(() => {
    refreshHistory();
    refreshCaseHistory();
  }, [refreshHistory, refreshCaseHistory]);

  const loadPastRun = useCallback(async (runId: string) => {
    try {
      const r = await fetch(`${getApiUrl()}/api/runs/${runId}`);
      if (!r.ok) return;
      const run = (await r.json()) as StoredWatchlistRun;
      const restored: Record<string, ClientRunState> = {};
      for (const [cid, res] of Object.entries(run.payload.results)) {
        restored[cid] = {
          client: res.client,
          status: "done",
          stageDetail: "",
          verdict: res.verdict,
          elapsedS: res.elapsed_s,
          activity: [],
        };
      }
      setRuns(restored);
      setSummary({
        runId: run.run_id,
        elapsedS: run.elapsed_s ?? 0,
        counts: run.counts ?? { clear: 0, review: 0, escalate: 0, error: 0 },
        auditLog: run.payload.audit_log,
      });
      setActiveRunId(run.run_id);
    } catch {
      // ignore — history is best-effort
    }
  }, []);

  useEffect(() => {
    fetch(`${getApiUrl()}/api/roster`)
      .then((r) => r.json())
      .then((d) => {
        setRoster(d.clients || []);
        const initial: Record<string, ClientRunState> = {};
        for (const c of d.clients || []) {
          initial[c.id] = { client: c, status: "queued", stageDetail: "", activity: [] };
        }
        setRuns(initial);
      })
      .catch(() => {});
  }, []);

  const handleEvent = useCallback((event: any) => {
    switch (event.type) {
      case "client_start":
        setRuns((prev) => ({
          ...prev,
          [event.client_id]: { ...prev[event.client_id], status: "planning", stageDetail: "" },
        }));
        break;
      case "stage":
        if (event.client_id) {
          setRuns((prev) => ({
            ...prev,
            [event.client_id]: {
              ...prev[event.client_id],
              status: stageToStatus(event.stage || ""),
              stageDetail: event.detail || event.stage || "",
            },
          }));
        }
        break;
      case "log": {
        const entry = event.entry as AuditEntry;
        setAuditEntries((prev) => [...prev, entry]);
        if (entry.client_id) {
          setRuns((prev) => ({
            ...prev,
            [entry.client_id as string]: {
              ...prev[entry.client_id as string],
              activity: [...(prev[entry.client_id as string]?.activity || []), entry],
            },
          }));
        }
        break;
      }
      case "result":
        if (event.client_id) {
          const verdict = event.data as ScreeningVerdict;
          setRuns((prev) => ({
            ...prev,
            [event.client_id]: {
              ...prev[event.client_id],
              status: "done",
              verdict,
              elapsedS: event.elapsed_s,
              stageDetail: "",
            },
          }));
        }
        break;
      case "error":
        if (event.client_id) {
          setRuns((prev) => ({
            ...prev,
            [event.client_id]: {
              ...prev[event.client_id],
              status: "error",
              error: event.message,
              stageDetail: "",
            },
          }));
        }
        break;
      case "complete":
        setSummary({
          runId: event.run_id,
          elapsedS: event.elapsed_s,
          counts: event.counts,
          auditLog: event.audit_log,
        });
        setActiveRunId(event.run_id);
        refreshHistory();
        break;
    }
  }, [refreshHistory]);

  const runScreening = useCallback(async () => {
    setActiveRunId(null);
    setRuns((prev) => {
      const reset: Record<string, ClientRunState> = {};
      for (const c of roster) reset[c.id] = { client: c, status: "queued", stageDetail: "", activity: [] };
      return reset;
    });
    setSummary(null);
    setAuditEntries([]);
    setIsRunning(true);

    abortRef.current?.abort();
    const controller = new AbortController();
    abortRef.current = controller;

    try {
      await streamSSE("/api/watchlist/stream", {}, handleEvent, controller.signal);
    } catch (err: any) {
      if (err.name !== "AbortError") console.error("Watchlist stream error:", err);
    } finally {
      setIsRunning(false);
    }
  }, [roster, handleEvent]);

  const stopRun = useCallback(() => {
    abortRef.current?.abort();
    setIsRunning(false);
  }, []);

  // ---- Investigation state (lifted so it persists across tab switches) ----
  const [invQuery, setInvQuery] = useState("");
  const [invFlagContext, setInvFlagContext] = useState<string | null>(null);
  const [invRunning, setInvRunning] = useState(false);
  const [invStage, setInvStage] = useState("");
  const [caseFile, setCaseFile] = useState<CaseFile | null>(null);
  const [invError, setInvError] = useState<string | null>(null);
  const [caseAudit, setCaseAudit] = useState<AuditEntry[]>([]);
  const invAbortRef = useRef<AbortController | null>(null);

  const handleInvEvent = useCallback((event: any) => {
    switch (event.type) {
      case "stage":
        setInvStage(event.detail ? `${event.stage} — ${event.detail}` : event.stage || "");
        break;
      case "log":
        setCaseAudit((prev) => [...prev, event.entry as AuditEntry]);
        break;
      case "result":
        setCaseFile(event.data as CaseFile);
        setInvStage("");
        break;
      case "error":
        setInvError(event.message || "Investigation failed");
        setInvStage("");
        break;
      case "complete":
        refreshCaseHistory();
        break;
    }
  }, [refreshCaseHistory]);

  const loadPastCase = useCallback(async (caseId: string) => {
    try {
      const r = await fetch(`${getApiUrl()}/api/runs/${caseId}`);
      if (!r.ok) return;
      const run = (await r.json()) as StoredInvestigationRun;
      setInvQuery(run.query || "");
      setInvFlagContext(run.payload.flag_context || null);
      setCaseFile(run.payload.case_file);
      setInvError(null);
      setCaseAudit([]);
      setInvStage("");
    } catch {
      // ignore — history is best-effort
    }
  }, []);

  const runInvestigation = useCallback(async () => {
    if (!invQuery.trim()) return;
    setCaseFile(null);
    setInvError(null);
    setCaseAudit([]);
    setInvRunning(true);
    setInvStage("Planning search strategy");

    invAbortRef.current?.abort();
    const controller = new AbortController();
    invAbortRef.current = controller;

    try {
      await streamSSE(
        "/api/investigate/stream",
        { query: invQuery.trim(), flag_context: invFlagContext || undefined },
        handleInvEvent,
        controller.signal
      );
    } catch (err: any) {
      if (err.name !== "AbortError") setInvError(err.message || "Stream failed");
    } finally {
      setInvRunning(false);
    }
  }, [invQuery, invFlagContext, handleInvEvent]);

  const stopInvestigation = useCallback(() => {
    invAbortRef.current?.abort();
    setInvRunning(false);
    setInvStage("");
  }, []);

  // ---- Investigation handoff ----
  const handleInvestigate = useCallback((ctx: HandoffContext) => {
    setInvQuery(ctx.entityName);
    setInvFlagContext(ctx.flagNote);
    setCaseFile(null);
    setInvError(null);
    setView("investigator");
  }, []);
  const dismissFlagContext = useCallback(() => setInvFlagContext(null), []);

  return (
    <div className="min-h-screen relative" style={{ backgroundColor: "var(--color-background)" }}>
      {/* Background image layer */}
      <div
        className="fixed inset-0 z-0 bg-cover bg-center bg-no-repeat"
        style={{
          backgroundImage: "url(/tavily_landscapes_edited_11.webp)",
          opacity: 0.7,
          willChange: "transform",
          transform: "translateZ(0)",
        }}
      />
      {/* Top gradient fade */}
      <div
        className="fixed inset-x-0 top-0 z-0 h-48 pointer-events-none"
        style={{
          background: "linear-gradient(to bottom, var(--color-background), transparent)",
          transform: "translateZ(0)",
        }}
      />
      {/* Bottom gradient fade */}
      <div
        className="fixed inset-x-0 bottom-0 z-0 h-48 pointer-events-none"
        style={{
          background: "linear-gradient(to top, var(--color-background), transparent)",
          transform: "translateZ(0)",
        }}
      />

      {/* Brand header band */}
      <div className="relative z-10 border-b border-white/40 bg-white/20 backdrop-blur-sm">
        <div className="max-w-6xl mx-auto px-6 py-4 flex items-center justify-between gap-4">
          <div className="flex items-center gap-3.5">
            <img src="/tavily-full.svg" alt="Tavily" className="h-9 w-auto" />
            <span className="hidden sm:block w-px h-8" style={{ background: "rgba(31,30,30,0.18)" }} />
            <div className="hidden sm:block">
              <p className="font-display font-semibold text-ink-100 leading-tight">Compliance Workbench</p>
              <p className="text-[11px] text-ink-500 uppercase tracking-[0.18em]">AML / KYC</p>
            </div>
          </div>

          {/* View switcher */}
          <nav className="glass rounded-xl p-1 flex gap-1">
            <button
              onClick={() => setView("watchlist")}
              className={`flex items-center gap-2 rounded-lg px-4 py-2 text-sm font-medium transition-all ${
                view === "watchlist" ? "glass-button-active text-ink-100" : "text-ink-400 hover:text-ink-200"
              }`}
            >
              <ClipboardList className="w-4 h-4" />
              Morning Watchlist
            </button>
            <button
              onClick={() => setView("investigator")}
              className={`flex items-center gap-2 rounded-lg px-4 py-2 text-sm font-medium transition-all ${
                view === "investigator" ? "glass-button-active text-ink-100" : "text-ink-400 hover:text-ink-200"
              }`}
            >
              <Search className="w-4 h-4" />
              Investigator Search
            </button>
          </nav>
        </div>
      </div>

      <div className="relative z-10 max-w-6xl mx-auto px-6 pt-8">
        {/* Page intro */}
        <header className="mb-8">
          <h1 className="font-display text-3xl font-semibold text-ink-100">
            Evidence-first compliance, grounded in the live web
          </h1>
          <p className="text-sm text-ink-400 mt-1.5 max-w-2xl">
            Adverse media monitoring and enhanced due diligence powered by Tavily
            retrieval — every finding traced to a retrieved source, every step in
            a complete audit trail.
          </p>
        </header>

        <main className="pb-20">
          {view === "watchlist" ? (
            <MorningWatchlist
              roster={roster}
              runs={runs}
              isRunning={isRunning}
              summary={summary}
              auditEntries={auditEntries}
              runHistory={runHistory}
              activeRunId={activeRunId}
              onLoadRun={loadPastRun}
              onRun={runScreening}
              onStop={stopRun}
              onInvestigate={handleInvestigate}
            />
          ) : (
            <InvestigatorSearch
              query={invQuery}
              onQueryChange={setInvQuery}
              flagContext={invFlagContext}
              onDismissFlag={dismissFlagContext}
              isRunning={invRunning}
              stage={invStage}
              caseFile={caseFile}
              error={invError}
              auditEntries={caseAudit}
              caseHistory={caseHistory}
              onLoadCase={loadPastCase}
              onRun={runInvestigation}
              onStop={stopInvestigation}
            />
          )}
        </main>

        {/* Footer */}
        <footer className="border-t border-white/40 pt-5 pb-8 flex items-center justify-between gap-4 flex-wrap">
          <div className="flex items-center gap-2 text-[11px] text-ink-500">
            <ShieldCheck className="w-3.5 h-3.5" />
            <span>
              Demo — retrieval by Tavily Search &amp; Extract, agent orchestration
              by LangChain. Not for production compliance use.
            </span>
          </div>
          <div className="flex items-center gap-4 text-[11px] text-ink-500">
            <span className="flex items-center gap-1.5">
              <span className="w-2 h-2 rounded-full" style={{ background: "#80AF9B" }} />
              Source-backed findings
            </span>
            <span className="flex items-center gap-1.5">
              <span className="w-2 h-2 rounded-full" style={{ background: "#817FFF" }} />
              Complete audit trail
            </span>
            <span className="flex items-center gap-1.5">
              <span className="w-2 h-2 rounded-full" style={{ background: "#FF7300" }} />
              Real-time retrieval
            </span>
          </div>
        </footer>
      </div>
    </div>
  );
}
