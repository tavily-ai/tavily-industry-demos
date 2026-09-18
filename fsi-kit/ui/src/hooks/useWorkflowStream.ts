import { useCallback, useEffect, useRef, useState } from "react";
import { streamSSE } from "../sse";
import { NormalizedWorkflowEvent, ResearchSource, WorkflowLaneDefinition } from "../types";

export type LaneStatus = "queued" | "running" | "complete" | "error" | "skipped";
export interface LaneViewState extends WorkflowLaneDefinition {
  status: LaneStatus;
  phase?: string;
  message?: string;
  queries: string[];
  sources: ResearchSource[];
  data?: unknown;
  error?: string;
}
export type WorkflowStatus = "idle" | "running" | "complete" | "partial" | "failed" | "cancelled";

const sourceKey = (source: ResearchSource) => source.url;
const mergeSources = (left: ResearchSource[], right: ResearchSource[] = []) => {
  const merged = new Map(left.map((source) => [sourceKey(source), source]));
  right.forEach(
    (source) =>
      source?.url && merged.set(sourceKey(source), { ...merged.get(source.url), ...source }),
  );
  return [...merged.values()];
};

export function useWorkflowStream<TResult>(path: string, initialLanes: WorkflowLaneDefinition[]) {
  const makeLanes = useCallback(
    () =>
      initialLanes.map((lane) => ({
        ...lane,
        status: "queued" as const,
        queries: [],
        sources: [],
      })),
    [initialLanes],
  );
  const [lanes, setLanes] = useState<LaneViewState[]>(makeLanes);
  const [status, setStatus] = useState<WorkflowStatus>("idle");
  const [result, setResult] = useState<TResult | null>(null);
  const [sources, setSources] = useState<ResearchSource[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [runId, setRunId] = useState<string | null>(null);
  const [elapsedS, setElapsedS] = useState<number | null>(null);
  const abortRef = useRef<AbortController | null>(null);
  const laneErrorsRef = useRef(0);
  const completedRef = useRef(false);

  useEffect(() => () => abortRef.current?.abort(), []);

  const updateLane = useCallback(
    (laneId: string, update: (lane: LaneViewState) => LaneViewState) => {
      setLanes((current) => {
        const found = current.some((lane) => lane.id === laneId);
        const next = found
          ? current
          : [
              ...current,
              {
                id: laneId,
                label: laneId.replace(/_/g, " "),
                status: "queued",
                queries: [],
                sources: [],
              } as LaneViewState,
            ];
        return next.map((lane) => (lane.id === laneId ? update(lane) : lane));
      });
    },
    [],
  );

  const handleEvent = useCallback(
    (event: NormalizedWorkflowEvent) => {
      if (event.run_id) setRunId(event.run_id);
      switch (event.type) {
        case "start":
          if (event.lanes?.length)
            setLanes(
              event.lanes.map((lane) => ({ ...lane, status: "queued", queries: [], sources: [] })),
            );
          break;
        case "progress":
          updateLane(event.lane_id, (lane) => ({
            ...lane,
            status: "running",
            phase: event.phase,
            message: event.message,
            queries: event.queries ?? lane.queries,
          }));
          break;
        case "sources_found":
          setSources((current) => mergeSources(current, event.sources));
          updateLane(event.lane_id, (lane) => ({
            ...lane,
            status: "running",
            sources: mergeSources(lane.sources, event.sources),
          }));
          break;
        case "lane_complete": {
          const laneId = event.lane_id;
          if (!laneId) break;
          const eventSources = event.sources ?? [];
          setSources((current) => mergeSources(current, eventSources));
          updateLane(laneId, (lane) => ({
            ...lane,
            status: "complete",
            data: event.data,
            message: event.message || "Evidence collected",
            sources: mergeSources(lane.sources, eventSources),
          }));
          break;
        }
        case "lane_skipped":
          updateLane(event.lane_id, (lane) => ({
            ...lane,
            status: "skipped",
            message: event.message,
          }));
          break;
        case "error": {
          const laneId = event.lane_id;
          const eventSources = event.sources ?? [];
          if (eventSources.length) {
            setSources((current) => mergeSources(current, eventSources));
          }
          if (laneId) {
            laneErrorsRef.current += 1;
            updateLane(laneId, (lane) => ({
              ...lane,
              status: "error",
              error: event.message,
              message: event.message,
              sources: mergeSources(lane.sources, eventSources),
            }));
          } else {
            setError(event.message);
            setStatus("failed");
          }
          break;
        }
        case "result":
          setResult(event.data as TResult);
          setSources((current) => mergeSources(current, event.sources));
          break;
        case "complete":
          completedRef.current = true;
          setElapsedS(event.elapsed_s ?? null);
          setStatus(laneErrorsRef.current > 0 ? "partial" : "complete");
          break;
      }
    },
    [updateLane],
  );

  const run = useCallback(
    async (body: Record<string, unknown>) => {
      abortRef.current?.abort();
      const controller = new AbortController();
      abortRef.current = controller;
      laneErrorsRef.current = 0;
      completedRef.current = false;
      setLanes(makeLanes());
      setResult(null);
      setSources([]);
      setError(null);
      setRunId(null);
      setElapsedS(null);
      setStatus("running");
      try {
        await streamSSE<NormalizedWorkflowEvent>(path, body, handleEvent, controller.signal);
        if (!completedRef.current && !controller.signal.aborted) {
          setError("The response stream ended before the workflow completed");
          setStatus("failed");
        }
      } catch (cause) {
        if (controller.signal.aborted) return;
        setError(cause instanceof Error ? cause.message : "The stream ended unexpectedly");
        setStatus("failed");
      }
    },
    [handleEvent, makeLanes, path],
  );

  const stop = useCallback(() => {
    abortRef.current?.abort();
    setStatus("cancelled");
    setLanes((current) =>
      current.map((lane) =>
        lane.status === "running"
          ? { ...lane, status: "queued", message: "Stopped before completion" }
          : lane,
      ),
    );
  }, []);

  const hydrate = useCallback(
    (stored: TResult, storedSources: ResearchSource[] = [], storedRunId?: string) => {
      abortRef.current?.abort();
      setResult(stored);
      setSources(storedSources);
      setRunId(storedRunId ?? null);
      setError(null);
      setStatus("complete");
      setLanes(makeLanes());
    },
    [makeLanes],
  );

  return { lanes, status, result, sources, error, runId, elapsedS, run, stop, hydrate };
}
