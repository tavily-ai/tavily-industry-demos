import { AlertTriangle, CheckCircle2, Circle, Loader2, Search } from "lucide-react";
import { LaneViewState } from "../../hooks/useWorkflowStream";

export default function WorkstreamLanes({ lanes, heading = "Live workstreams" }: { lanes: LaneViewState[]; heading?: string }) {
  return <section className="glass rounded-2xl p-5">
    <div className="flex justify-between items-center mb-4"><h2 className="font-display font-semibold text-ink-100">{heading}</h2><span className="text-[11px] uppercase tracking-wider text-ink-500">Predictable, bounded lanes</span></div>
    <div className="grid md:grid-cols-2 gap-3">{lanes.map((lane) => {
      const Icon = lane.status === "complete" ? CheckCircle2 : lane.status === "error" ? AlertTriangle : lane.status === "running" ? Loader2 : Circle;
      const color = lane.status === "complete" ? "text-risk-low" : lane.status === "error" ? "text-risk-high" : lane.status === "running" ? "text-tavily-blue" : "text-ink-500";
      return <article key={lane.id} className="glass-subtle rounded-xl p-4 min-h-[112px]">
        <div className="flex gap-3"><Icon className={`w-4 h-4 mt-0.5 shrink-0 ${color} ${lane.status === "running" ? "animate-spin" : ""}`}/><div className="min-w-0"><h3 className="text-sm font-semibold text-ink-100">{lane.label}</h3><p className={`text-xs mt-1 ${lane.status === "error" ? "text-risk-high" : "text-ink-400"}`}>{lane.message || (lane.status === "queued" ? "Waiting" : lane.status)}</p></div></div>
        <div className="mt-3 flex gap-3 text-[10px] text-ink-500">{lane.phase && <span className="uppercase tracking-wider">{lane.phase}</span>}<span className="flex items-center gap-1"><Search className="w-3 h-3"/>{lane.sources.length} source{lane.sources.length === 1 ? "" : "s"}</span></div>
      </article>;
    })}</div>
  </section>;
}
