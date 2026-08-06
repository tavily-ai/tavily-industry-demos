import { useCallback, useEffect, useRef, useState } from "react";
import { ClipboardList } from "lucide-react";
import { useNavigate } from "react-router-dom";
import MorningWatchlist from "../../components/MorningWatchlist";
import ComplianceTabs from "../../components/compliance/ComplianceTabs";
import { getApiUrl, streamSSE } from "../../sse";
import {
  AuditEntry,
  ClientRunState,
  HandoffContext,
  RosterClient,
  RunRecord,
  ScreeningVerdict,
  StoredWatchlistRun,
  WatchlistSummary,
} from "../../types";

type LegacyEvent = {
  type: string;
  client_id?: string;
  stage?: string;
  detail?: string;
  entry?: AuditEntry;
  data?: ScreeningVerdict;
  elapsed_s?: number;
  message?: string;
  run_id?: string;
  counts?: WatchlistSummary["counts"];
  audit_log?: string;
};
const stageToStatus = (stage: string): ClientRunState["status"] =>
  stage.toLowerCase().includes("search")
    ? "searching"
    : /read|extract/i.test(stage)
      ? "extracting"
      : "planning";

export default function WatchlistPage() {
  const navigate = useNavigate();
  const [roster, setRoster] = useState<RosterClient[]>([]);
  const [runs, setRuns] = useState<Record<string, ClientRunState>>({});
  const [isRunning, setIsRunning] = useState(false);
  const [summary, setSummary] = useState<WatchlistSummary | null>(null);
  const [auditEntries, setAuditEntries] = useState<AuditEntry[]>([]);
  const [history, setHistory] = useState<RunRecord[]>([]);
  const [activeRunId, setActiveRunId] = useState<string | null>(null);
  const abortRef = useRef<AbortController | null>(null);
  const refreshHistory = useCallback(() => {
    fetch(`${getApiUrl()}/api/runs?kind=watchlist`)
      .then((r) => r.json())
      .then((d) => setHistory(d.runs || []))
      .catch(() => {});
  }, []);
  useEffect(() => {
    refreshHistory();
    fetch(`${getApiUrl()}/api/compliance/roster`)
      .then((r) => r.json())
      .then((d) => {
        const clients: RosterClient[] = d.clients || [];
        setRoster(clients);
        setRuns(
          Object.fromEntries(
            clients.map((client) => [
              client.id,
              { client, status: "queued", stageDetail: "", activity: [] },
            ]),
          ),
        );
      })
      .catch(() => {});
    return () => abortRef.current?.abort();
  }, [refreshHistory]);
  const handleEvent = useCallback(
    (event: LegacyEvent) => {
      if (event.type === "client_start" && event.client_id)
        setRuns((p) => ({
          ...p,
          [event.client_id!]: { ...p[event.client_id!], status: "planning", stageDetail: "" },
        }));
      if (event.type === "stage" && event.client_id)
        setRuns((p) => ({
          ...p,
          [event.client_id!]: {
            ...p[event.client_id!],
            status: stageToStatus(event.stage || ""),
            stageDetail: event.detail || event.stage || "",
          },
        }));
      if (event.type === "log" && event.entry) {
        setAuditEntries((p) => [...p, event.entry!]);
        if (event.entry.client_id)
          setRuns((p) => ({
            ...p,
            [event.entry!.client_id as string]: {
              ...p[event.entry!.client_id as string],
              activity: [...(p[event.entry!.client_id as string]?.activity || []), event.entry!],
            },
          }));
      }
      if (event.type === "result" && event.client_id && event.data)
        setRuns((p) => ({
          ...p,
          [event.client_id!]: {
            ...p[event.client_id!],
            status: "done",
            verdict: event.data,
            elapsedS: event.elapsed_s,
            stageDetail: "",
          },
        }));
      if (event.type === "error" && event.client_id)
        setRuns((p) => ({
          ...p,
          [event.client_id!]: {
            ...p[event.client_id!],
            status: "error",
            error: event.message,
            stageDetail: "",
          },
        }));
      if (event.type === "complete" && event.run_id && event.counts) {
        setSummary({
          runId: event.run_id,
          elapsedS: event.elapsed_s || 0,
          counts: event.counts,
          auditLog: event.audit_log || "",
        });
        setActiveRunId(event.run_id);
        refreshHistory();
      }
    },
    [refreshHistory],
  );
  const run = useCallback(async () => {
    setActiveRunId(null);
    setRuns(
      Object.fromEntries(
        roster.map((client) => [
          client.id,
          { client, status: "queued", stageDetail: "", activity: [] },
        ]),
      ),
    );
    setSummary(null);
    setAuditEntries([]);
    setIsRunning(true);
    abortRef.current?.abort();
    const controller = new AbortController();
    abortRef.current = controller;
    try {
      await streamSSE<LegacyEvent>(
        "/api/compliance/watchlist/stream",
        {},
        handleEvent,
        controller.signal,
      );
    } catch (error) {
      if (!controller.signal.aborted) console.error(error);
    } finally {
      if (!controller.signal.aborted) setIsRunning(false);
    }
  }, [roster, handleEvent]);
  const load = useCallback(async (id: string) => {
    try {
      const response = await fetch(`${getApiUrl()}/api/runs/${id}`);
      if (!response.ok) return;
      const past = (await response.json()) as StoredWatchlistRun;
      const restored: Record<string, ClientRunState> = {};
      Object.entries(past.payload.results).forEach(
        ([cid, res]) =>
          (restored[cid] = {
            client: res.client,
            status: "done",
            stageDetail: "",
            verdict: res.verdict,
            elapsedS: res.elapsed_s,
            activity: [],
          }),
      );
      setRuns(restored);
      setSummary({
        runId: past.run_id,
        elapsedS: past.elapsed_s || 0,
        counts: past.counts || { clear: 0, review: 0, escalate: 0, error: 0 },
        auditLog: past.payload.audit_log,
      });
      setActiveRunId(past.run_id);
    } catch {
      /* history is best effort */
    }
  }, []);
  const investigate = useCallback(
    (ctx: HandoffContext) => {
      const params = new URLSearchParams({ entity: ctx.entityName, context: ctx.flagNote });
      navigate(`/compliance/investigator?${params}`, { state: ctx });
    },
    [navigate],
  );
  return (
    <main>
      <header className="mb-8 flex flex-col gap-5 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <div className="flex items-center gap-2 text-xs uppercase tracking-[.16em] text-tavily-green font-semibold">
            <ClipboardList className="w-4 h-4" />
            Compliance intelligence
          </div>
          <h1 className="font-display text-3xl font-semibold text-ink-100 mt-3">
            Morning watchlist
          </h1>
          <p className="text-sm text-ink-400 mt-1.5 max-w-2xl">
            Monitor adverse media and escalate evidence-backed findings to an investigator.
          </p>
        </div>
        <ComplianceTabs />
      </header>
      <MorningWatchlist
        roster={roster}
        runs={runs}
        isRunning={isRunning}
        summary={summary}
        auditEntries={auditEntries}
        runHistory={history}
        activeRunId={activeRunId}
        onLoadRun={load}
        onRun={run}
        onStop={() => {
          abortRef.current?.abort();
          setIsRunning(false);
        }}
        onInvestigate={investigate}
      />
    </main>
  );
}
