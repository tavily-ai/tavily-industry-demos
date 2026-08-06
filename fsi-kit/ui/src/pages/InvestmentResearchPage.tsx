import { FormEvent, useCallback, useEffect, useMemo, useState } from "react";
import { AlertTriangle, Briefcase, CheckCircle2, Play, Square } from "lucide-react";
import RunHistory, { fetchStoredWorkflow, useRunHistory } from "../components/shared/RunHistory";
import SourceList from "../components/shared/SourceList";
import WorkstreamLanes from "../components/shared/WorkstreamLanes";
import { useWorkflowStream } from "../hooks/useWorkflowStream";
import { InvestmentEvidencePoint, InvestmentResearchResult, WorkflowLaneDefinition } from "../types";

const INVESTMENT_LANES: WorkflowLaneDefinition[] = [
  { id: "official_policy", label: "Official & policy" }, { id: "economic_data", label: "Economic data" }, { id: "market_expectations", label: "Market expectations" }, { id: "portfolio_implications", label: "Portfolio implications" }, { id: "scenarios", label: "Scenarios & counter-thesis" },
];
const fieldClass = "glass-input rounded-xl px-3 py-2.5 text-sm text-ink-100 placeholder:text-ink-500 outline-none focus:ring-2 focus:ring-tavily-orange/20 w-full";
function Bullets({ items }: { items?: string[] }) {
  if (!items?.length) return null;
  return (
    <ul className="space-y-2.5">
      {items.map((item, index) => (
        <li key={index} className="text-sm text-ink-300 leading-6 flex gap-3">
          <span className="w-1.5 h-1.5 rounded-full bg-tavily-orange shrink-0 mt-2" />
          <span>{item}</span>
        </li>
      ))}
    </ul>
  );
}

function Evidence({ items }: { items?: InvestmentEvidencePoint[] }) {
  if (!items?.length) return null;
  return (
    <div className="divide-y divide-ink-700/35">
      {items.map((item, index) => (
        <article key={`${item.claim}-${index}`} className="py-4 first:pt-0 last:pb-0 grid grid-cols-[24px_1fr] gap-3">
          <span className="w-6 h-6 rounded-full bg-tavily-orange/10 text-tavily-orange text-[11px] font-semibold flex items-center justify-center mt-0.5">
            {index + 1}
          </span>
          <div className="min-w-0">
            <div className="flex items-start justify-between gap-3">
              <h4 className="font-semibold text-sm text-ink-100 leading-6">{item.claim}</h4>
              {item.as_of && <span className="text-[10px] text-ink-500 whitespace-nowrap mt-1">As of {item.as_of}</span>}
            </div>
            <p className="text-sm text-ink-300 mt-1 leading-6">{item.detail}</p>
            {item.source_urls.length > 0 && (
              <div className="flex flex-wrap gap-x-3 gap-y-1 mt-2">
                {item.source_urls.map((url, sourceIndex) => (
                  <a key={url} href={url} target="_blank" rel="noreferrer" className="text-[11px] font-medium text-tavily-orange hover:underline">
                    Source {sourceIndex + 1} ↗
                  </a>
                ))}
              </div>
            )}
          </div>
        </article>
      ))}
    </div>
  );
}

function BriefSection({ number, title, intro, children }: { number: string; title: string; intro?: string; children: React.ReactNode }) {
  return (
    <section className="border-t border-ink-700/40 py-7 first:border-t-0">
      <div className="flex gap-3 items-baseline mb-4">
        <span className="text-xs font-mono font-semibold text-tavily-orange">{number}</span>
        <h3 className="font-display text-lg font-semibold text-ink-100">{title}</h3>
      </div>
      {intro && <p className="text-sm text-ink-300 leading-6 mb-5">{intro}</p>}
      {children}
    </section>
  );
}

function Subheading({ children }: { children: React.ReactNode }) {
  return <h4 className="text-[11px] uppercase tracking-[.14em] font-semibold text-ink-500 mt-6 mb-3 first:mt-0">{children}</h4>;
}

function TagList({ items }: { items?: string[] }) {
  if (!items?.length) return null;
  return <div className="flex flex-wrap gap-2">{items.map((item) => <span key={item} className="rounded-full bg-white/55 border border-white/70 px-2.5 py-1 text-xs text-ink-300">{item}</span>)}</div>;
}

function Scenario({ label, value, tone }: { label: string; value: string; tone: "base" | "upside" | "downside" }) {
  const toneClass = tone === "base" ? "border-tavily-lavender" : tone === "upside" ? "border-tavily-green" : "border-risk-elevated";
  return <div className={`border-l-2 ${toneClass} pl-4 py-1`}><p className="text-xs uppercase tracking-wider font-semibold text-ink-500">{label}</p><p className="text-sm text-ink-300 leading-6 mt-1">{value}</p></div>;
}

function MeetingBrief({ result }: { result: InvestmentResearchResult }) {
  return (
    <article className="glass rounded-2xl p-5 md:p-8">
      <div className="max-w-4xl mx-auto">
        <header className="pb-7">
          <div className="flex items-center gap-2 text-risk-low text-xs font-semibold uppercase tracking-wider">
            <CheckCircle2 className="w-4 h-4" /> Meeting brief ready
          </div>
          <h2 className="font-display text-2xl md:text-3xl font-semibold text-ink-100 mt-3 leading-tight">{result.topic}</h2>
          <div className="flex flex-wrap gap-2 mt-3">
            {[result.meeting_objective, result.audience, result.horizon].filter(Boolean).map((value) => (
              <span key={value} className="text-[11px] text-ink-400 bg-white/50 border border-white/70 rounded-full px-2.5 py-1">{value}</span>
            ))}
          </div>
        </header>

        <section className="rounded-xl bg-tavily-orange/[.07] border-l-4 border-tavily-orange px-5 py-4 mb-2">
          <h3 className="text-[11px] uppercase tracking-[.14em] font-semibold text-ink-500">Executive summary</h3>
          <p className="text-[15px] leading-7 text-ink-200 mt-2 whitespace-pre-line">{result.executive_summary}</p>
        </section>

        {result.official_policy && (
          <BriefSection number="01" title="Official policy">
            <Subheading>Key developments</Subheading>
            <Evidence items={result.official_policy.developments} />
            <Subheading>Official positions</Subheading>
            <Evidence items={result.official_policy.official_positions} />
            <Subheading>What to watch</Subheading>
            <Bullets items={result.official_policy.watch_items} />
          </BriefSection>
        )}

        {result.economic_data && (
          <BriefSection number="02" title="Economic and fundamental data" intro={result.economic_data.trend_summary}>
            <Subheading>Key indicators</Subheading>
            <Evidence items={result.economic_data.indicators} />
            <Subheading>Data limitations</Subheading>
            <Bullets items={result.economic_data.data_limitations} />
          </BriefSection>
        )}

        {result.market_expectations && (
          <BriefSection number="03" title="Market expectations">
            <Subheading>Consensus</Subheading>
            <Evidence items={result.market_expectations.consensus} />
            <Subheading>Where views differ</Subheading>
            <Evidence items={result.market_expectations.disagreements} />
            <Subheading>Observable market signals</Subheading>
            <Evidence items={result.market_expectations.market_signals} />
          </BriefSection>
        )}

        {result.portfolio_implications && (
          <BriefSection number="04" title="Portfolio and sector implications">
            <Evidence items={result.portfolio_implications.implications} />
            <Subheading>Affected assets and sectors</Subheading>
            <TagList items={result.portfolio_implications.affected_assets_or_sectors} />
            <Subheading>Transmission channels</Subheading>
            <Bullets items={result.portfolio_implications.transmission_channels} />
          </BriefSection>
        )}

        {result.scenarios && (
          <BriefSection number="05" title="Scenarios and counter-thesis">
            <div className="space-y-5">
              <Scenario label="Base case" value={result.scenarios.base_case} tone="base" />
              <Scenario label="Upside case" value={result.scenarios.upside_case} tone="upside" />
              <Scenario label="Downside case" value={result.scenarios.downside_case} tone="downside" />
            </div>
            <Subheading>Counter-thesis</Subheading>
            <Evidence items={result.scenarios.counter_thesis} />
            <Subheading>Signposts</Subheading>
            <Bullets items={result.scenarios.signposts} />
          </BriefSection>
        )}

        <BriefSection number="06" title="Questions for the meeting">
          <ol className="space-y-3">
            {result.discussion_questions.map((question, index) => (
              <li key={question} className="text-sm text-ink-300 leading-6 flex gap-3">
                <span className="font-mono text-xs text-tavily-orange mt-1">{String(index + 1).padStart(2, "0")}</span>
                <span>{question}</span>
              </li>
            ))}
          </ol>
        </BriefSection>

        {(result.evidence_gaps.length > 0 || Object.keys(result.lane_errors || {}).length > 0) && (
          <BriefSection number="07" title="Evidence gaps and caveats">
            <Bullets items={result.evidence_gaps} />
            {Object.keys(result.lane_errors || {}).length > 0 && (
              <div className="mt-4 rounded-lg bg-risk-high/10 p-3 text-xs text-risk-high leading-5">
                Some workstreams were incomplete: {Object.entries(result.lane_errors).map(([lane, message]) => `${lane}: ${message}`).join(" · ")}
              </div>
            )}
          </BriefSection>
        )}
      </div>
    </article>
  );
}
export default function InvestmentResearchPage() {
  const [topic, setTopic] = useState("");
  const [objective, setObjective] = useState("");
  const [audience, setAudience] = useState("");
  const [horizon, setHorizon] = useState("");
  const lanes = useMemo(() => INVESTMENT_LANES, []);
  const workflow = useWorkflowStream<InvestmentResearchResult>("/api/investment-research/stream", lanes);
  const history = useRunHistory("investment_research");
  const running = workflow.status === "running";

  const submit = (event: FormEvent) => {
    event.preventDefault();
    if (!topic.trim() || running) return;
    void workflow.run({
      topic: topic.trim(),
      meeting_objective: objective.trim() || undefined,
      audience: audience.trim() || undefined,
      horizon: horizon.trim() || undefined,
    });
  };

  useEffect(() => {
    if (workflow.status === "complete" || workflow.status === "partial") history.refresh();
  }, [workflow.status, history.refresh]);

  const load = useCallback(async (id: string) => {
    try {
      const stored = await fetchStoredWorkflow<InvestmentResearchResult>(id);
      workflow.hydrate(stored.result, stored.sources, id);
    } catch {
      // Saved partial runs may have no final result.
    }
  }, [workflow.hydrate]);

  return (
    <main>
      <header className="mb-6">
        <div className="flex items-center gap-2 text-xs uppercase tracking-[.16em] text-tavily-orange font-semibold">
          <Briefcase className="w-4 h-4" />
          Investment research
        </div>
        <h1 className="font-display text-3xl font-semibold text-ink-100 mt-3">Build a meeting-ready brief</h1>
        <p className="text-sm text-ink-400 mt-1.5 max-w-3xl">
          Parallel research lanes synthesize policy, data, expectations, implications, and counter-theses into a cited brief.
        </p>
      </header>

      <section className="glass rounded-2xl p-5 mb-5">
        <form
          onSubmit={submit}
          className="grid md:grid-cols-2 xl:grid-cols-[minmax(280px,2fr)_repeat(3,minmax(135px,1fr))_auto] gap-3 items-end"
        >
          <label className="block text-xs font-semibold text-ink-300">
            Research topic <span className="text-risk-high">*</span>
            <textarea
              rows={2}
              value={topic}
              onChange={(event) => setTopic(event.target.value)}
              className={`${fieldClass} mt-1.5 resize-none`}
              placeholder="e.g. Implications of the next Fed meeting for regional banks"
              required
              disabled={running}
            />
          </label>
          <label className="block text-xs font-semibold text-ink-300">
            Meeting objective
            <input value={objective} onChange={(event) => setObjective(event.target.value)} className={`${fieldClass} mt-1.5`} placeholder="Decide what to monitor" disabled={running} />
          </label>
          <label className="block text-xs font-semibold text-ink-300">
            Audience
            <input value={audience} onChange={(event) => setAudience(event.target.value)} className={`${fieldClass} mt-1.5`} placeholder="Investment committee" disabled={running} />
          </label>
          <label className="block text-xs font-semibold text-ink-300">
            Horizon
            <input value={horizon} onChange={(event) => setHorizon(event.target.value)} className={`${fieldClass} mt-1.5`} placeholder="Next 3–6 months" disabled={running} />
          </label>
          {running ? (
            <button type="button" onClick={workflow.stop} className="h-[42px] rounded-xl bg-ink-100 text-white px-4 text-sm font-semibold flex gap-2 items-center justify-center whitespace-nowrap">
              <Square className="w-4 h-4" /> Stop
            </button>
          ) : (
            <button type="submit" disabled={!topic.trim()} className="h-[42px] rounded-xl bg-tavily-orange text-white px-5 text-sm font-semibold flex gap-2 items-center justify-center whitespace-nowrap disabled:opacity-40">
              <Play className="w-4 h-4" /> Build brief
            </button>
          )}
        </form>
        <p className="text-[10px] text-ink-500 leading-relaxed mt-3">
          Public-web research can be incomplete or stale. Validate material claims before making investment decisions.
        </p>
      </section>

      <div className="space-y-5">
        <RunHistory runs={history.runs} activeRunId={workflow.runId} onLoad={load} />
        {workflow.error && <div className="glass rounded-xl p-4 text-sm text-risk-high flex gap-2"><AlertTriangle className="w-4 h-4 shrink-0" />{workflow.error}</div>}
        {workflow.status === "cancelled" && <div className="glass-subtle rounded-xl p-3 text-xs text-ink-400">Research stopped. Completed lane evidence remains visible; no final brief was inferred.</div>}
        <WorkstreamLanes lanes={workflow.lanes} heading="Parallel research workstreams" variant="list" />
        {workflow.result && <MeetingBrief result={workflow.result} />}
        <SourceList sources={workflow.sources.length ? workflow.sources : workflow.result?.sources || []} title="Brief sources" />
      </div>
    </main>
  );
}
