import { useCallback, useEffect, useRef, useState } from "react";
import { Search } from "lucide-react";
import { useLocation, useSearchParams } from "react-router-dom";
import InvestigatorSearch from "../../components/InvestigatorSearch";
import ComplianceTabs from "../../components/compliance/ComplianceTabs";
import { getApiUrl, streamSSE } from "../../sse";
import {
  AuditEntry,
  CaseFile,
  HandoffContext,
  RunRecord,
  StoredInvestigationRun,
} from "../../types";

type LegacyEvent = {
  type: string;
  stage?: string;
  detail?: string;
  entry?: AuditEntry;
  data?: CaseFile;
  message?: string;
};
export default function InvestigatorPage() {
  const location = useLocation();
  const [params] = useSearchParams();
  const state = location.state as HandoffContext | null;
  const [query, setQuery] = useState(() => state?.entityName || params.get("entity") || "");
  const [flagContext, setFlagContext] = useState<string | null>(
    () => state?.flagNote || params.get("context"),
  );
  const [running, setRunning] = useState(false);
  const [stage, setStage] = useState("");
  const [caseFile, setCaseFile] = useState<CaseFile | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [audit, setAudit] = useState<AuditEntry[]>([]);
  const [history, setHistory] = useState<RunRecord[]>([]);
  const abortRef = useRef<AbortController | null>(null);
  const refreshHistory = useCallback(
    () =>
      fetch(`${getApiUrl()}/api/runs?kind=investigation`)
        .then((r) => r.json())
        .then((d) => setHistory(d.runs || []))
        .catch(() => {}),
    [],
  );
  useEffect(() => {
    refreshHistory();
    return () => abortRef.current?.abort();
  }, [refreshHistory]);
  const eventHandler = useCallback(
    (event: LegacyEvent) => {
      if (event.type === "stage")
        setStage(event.detail ? `${event.stage} — ${event.detail}` : event.stage || "");
      if (event.type === "log" && event.entry) setAudit((p) => [...p, event.entry!]);
      if (event.type === "result" && event.data) {
        setCaseFile(event.data);
        setStage("");
      }
      if (event.type === "error") {
        setError(event.message || "Investigation failed");
        setStage("");
      }
      if (event.type === "complete") refreshHistory();
    },
    [refreshHistory],
  );
  const run = useCallback(async () => {
    if (!query.trim()) return;
    setCaseFile(null);
    setError(null);
    setAudit([]);
    setRunning(true);
    setStage("Planning search strategy");
    abortRef.current?.abort();
    const controller = new AbortController();
    abortRef.current = controller;
    try {
      await streamSSE<LegacyEvent>(
        "/api/compliance/investigate/stream",
        { query: query.trim(), flag_context: flagContext || undefined },
        eventHandler,
        controller.signal,
      );
    } catch (cause) {
      if (!controller.signal.aborted)
        setError(cause instanceof Error ? cause.message : "Stream failed");
    } finally {
      if (!controller.signal.aborted) setRunning(false);
    }
  }, [query, flagContext, eventHandler]);
  const load = useCallback(async (id: string) => {
    try {
      const response = await fetch(`${getApiUrl()}/api/runs/${id}`);
      if (!response.ok) return;
      const past = (await response.json()) as StoredInvestigationRun;
      setQuery(past.query || "");
      setFlagContext(past.payload.flag_context || null);
      setCaseFile(past.payload.case_file);
      setError(null);
      setAudit([]);
      setStage("");
    } catch {
      /* best effort */
    }
  }, []);
  return (
    <main>
      <header className="mb-8 flex flex-col gap-5 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <div className="flex items-center gap-2 text-xs uppercase tracking-[.16em] text-tavily-orange font-semibold">
            <Search className="w-4 h-4" />
            Compliance intelligence
          </div>
          <h1 className="font-display text-3xl font-semibold text-ink-100 mt-3">
            Investigator search
          </h1>
          <p className="text-sm text-ink-400 mt-1.5 max-w-2xl">
            Build a cited entity case file from current public-web evidence.
          </p>
        </div>
        <ComplianceTabs />
      </header>
      <InvestigatorSearch
        query={query}
        onQueryChange={setQuery}
        flagContext={flagContext}
        onDismissFlag={() => setFlagContext(null)}
        isRunning={running}
        stage={stage}
        caseFile={caseFile}
        error={error}
        auditEntries={audit}
        caseHistory={history}
        onLoadCase={load}
        onRun={run}
        onStop={() => {
          abortRef.current?.abort();
          setRunning(false);
          setStage("");
        }}
      />
    </main>
  );
}
