import { useCallback, useEffect, useState } from "react";
import { Clock3, History } from "lucide-react";
import { getApiUrl } from "../../sse";
import { RunRecord } from "../../types";

export function useRunHistory(kind: string) {
  const [runs, setRuns] = useState<RunRecord[]>([]);
  const refresh = useCallback(() => fetch(`${getApiUrl()}/api/runs?kind=${encodeURIComponent(kind)}`).then((r) => r.ok ? r.json() : Promise.reject()).then((data) => setRuns(data.runs ?? [])).catch(() => setRuns([])), [kind]);
  useEffect(() => { refresh(); }, [refresh]);
  return { runs, refresh };
}

export async function fetchStoredWorkflow<TResult>(runId: string): Promise<{ result: TResult; sources: import("../../types").ResearchSource[] }> {
  const response = await fetch(`${getApiUrl()}/api/runs/${runId}`);
  if (!response.ok) throw new Error("Saved run could not be loaded");
  const stored = await response.json();
  const payload = stored.payload ?? stored;
  const result = payload.result ?? payload.data ?? payload.report ?? payload.meeting_brief ?? payload.risk_report;
  if (!result) throw new Error("This saved run has no completed result");
  return { result: result as TResult, sources: payload.sources ?? result.sources ?? [] };
}

export default function RunHistory({ runs, activeRunId, onLoad }: { runs: RunRecord[]; activeRunId: string | null; onLoad: (id: string) => void }) {
  if (!runs.length) return <div className="glass-subtle rounded-xl p-4 text-xs text-ink-500 flex gap-2"><History className="w-4 h-4"/>Completed runs will appear here.</div>;
  return <section className="glass rounded-2xl p-4"><h2 className="font-display text-sm font-semibold text-ink-100 flex gap-2 items-center mb-3"><History className="w-4 h-4"/>Recent runs</h2><div className="flex gap-2 overflow-x-auto pb-1">{runs.slice(0, 8).map((run) => <button key={run.run_id} onClick={() => onLoad(run.run_id)} className={`text-left shrink-0 rounded-xl px-3 py-2 border transition-colors ${activeRunId === run.run_id ? "bg-white/70 border-white" : "bg-white/30 border-white/50 hover:bg-white/50"}`}><span className="text-xs font-medium text-ink-200 block">{run.query || new Date(run.created_at * 1000).toLocaleDateString()}</span><span className="text-[10px] text-ink-500 flex gap-1 items-center mt-1"><Clock3 className="w-3 h-3"/>{new Date(run.created_at * 1000).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}</span></button>)}</div></section>;
}
