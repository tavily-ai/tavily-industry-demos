import { FormEvent, useCallback, useEffect, useMemo, useState } from "react";
import {
  AlertTriangle,
  ArrowDown,
  CheckCircle2,
  Circle,
  FileSearch,
  Fingerprint,
  Info,
  Loader2,
  Play,
  Square,
} from "lucide-react";
import RunHistory, { fetchStoredWorkflow, useRunHistory } from "../components/shared/RunHistory";
import SourceList from "../components/shared/SourceList";
import WorkstreamLanes from "../components/shared/WorkstreamLanes";
import { LaneViewState, useWorkflowStream } from "../hooks/useWorkflowStream";
import {
  MerchantEvidence,
  MerchantIdentity,
  MerchantRiskResult,
  WorkflowLaneDefinition,
} from "../types";

const MERCHANT_LANES: WorkflowLaneDefinition[] = [
  { id: "identity", label: "Web identity checkpoint" },
  { id: "category_fit", label: "Category fit" },
  { id: "restricted_products", label: "Restricted products" },
  { id: "reputation", label: "Reputation & practices" },
  { id: "legal_regulatory", label: "Legal & regulatory" },
];
const fieldClass =
  "glass-input rounded-xl px-3 py-2.5 text-sm text-ink-100 placeholder:text-ink-500 outline-none focus:ring-2 focus:ring-tavily-green/20 w-full";

const List = ({ items, empty }: { items?: string[]; empty?: string }) =>
  items?.length ? (
    <ul className="space-y-2.5">
      {items.map((item, index) => (
        <li className="text-sm text-ink-300 leading-6 flex gap-3" key={index}>
          <span className="w-1.5 h-1.5 rounded-full bg-tavily-green shrink-0 mt-2" />
          <span>{item}</span>
        </li>
      ))}
    </ul>
  ) : empty ? (
    <p className="text-xs text-ink-500 italic">{empty}</p>
  ) : null;

function EvidenceRows({ items }: { items?: MerchantEvidence[] }) {
  if (!items?.length) return null;
  return (
    <div className="divide-y divide-ink-700/35">
      {items.map((item, index) => (
        <article
          key={`${item.finding}-${index}`}
          className="py-4 first:pt-0 last:pb-0 grid grid-cols-[24px_1fr] gap-3"
        >
          <span className="w-6 h-6 rounded-full bg-tavily-green/10 text-tavily-green text-[11px] font-semibold flex items-center justify-center mt-0.5">
            {index + 1}
          </span>
          <div className="min-w-0">
            <div className="flex items-start justify-between gap-3">
              <h4 className="text-sm font-semibold text-ink-100 leading-6">{item.finding}</h4>
              {item.observed_date && (
                <span className="text-[10px] text-ink-500 whitespace-nowrap mt-1">
                  {item.observed_date}
                </span>
              )}
            </div>
            <p className="text-sm text-ink-300 leading-6 mt-1">{item.significance}</p>
            {item.source_urls.length > 0 && (
              <div className="flex flex-wrap gap-x-3 gap-y-1 mt-2">
                {item.source_urls.map((url, i) => (
                  <a
                    key={url}
                    href={url}
                    target="_blank"
                    rel="noreferrer"
                    className="text-[11px] font-medium text-tavily-green hover:underline"
                  >
                    Evidence {i + 1} ↗
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

function ReportSection({
  number,
  title,
  children,
}: {
  number: string;
  title: string;
  children: React.ReactNode;
}) {
  return (
    <section className="border-t border-ink-700/40 py-7">
      <div className="flex gap-3 items-baseline mb-4">
        <span className="text-xs font-mono font-semibold text-tavily-green">{number}</span>
        <h3 className="font-display text-lg font-semibold text-ink-100">{title}</h3>
      </div>
      {children}
    </section>
  );
}

function Subheading({ children }: { children: React.ReactNode }) {
  return (
    <h4 className="text-[11px] uppercase tracking-[.14em] font-semibold text-ink-500 mt-6 mb-3 first:mt-0">
      {children}
    </h4>
  );
}

function IdentityCheckpoint({
  lane,
  storedIdentity,
}: {
  lane?: LaneViewState;
  storedIdentity?: MerchantIdentity | null;
}) {
  const identity = (lane?.data as MerchantIdentity | undefined) || storedIdentity || undefined;
  const status =
    storedIdentity && lane?.status === "queued" ? "complete" : lane?.status || "queued";
  const StatusIcon =
    status === "complete"
      ? CheckCircle2
      : status === "error"
        ? AlertTriangle
        : status === "running"
          ? Loader2
          : Circle;
  const statusColor =
    status === "complete"
      ? "text-risk-low"
      : status === "error"
        ? "text-risk-high"
        : status === "running"
          ? "text-tavily-green"
          : "text-ink-500";
  return (
    <section className="glass rounded-2xl p-5 md:p-7">
      <div className="max-w-4xl mx-auto">
        <div className="flex flex-wrap justify-between gap-3 items-start">
          <div>
            <p className="text-[10px] uppercase tracking-[.16em] font-semibold text-tavily-green">
              Step 1
            </p>
            <h2 className="font-display text-lg font-semibold text-ink-100 mt-1">
              Resolve merchant identity
            </h2>
          </div>
        </div>
        <div className="flex gap-3 mt-4 items-start">
          <StatusIcon
            className={`w-4 h-4 mt-0.5 shrink-0 ${statusColor} ${status === "running" ? "animate-spin" : ""}`}
          />
          <div className="min-w-0 flex-1">
            <p className={`text-sm ${status === "error" ? "text-risk-high" : "text-ink-300"}`}>
              {lane?.message ||
                (status === "queued" ? "Waiting to verify the submitted merchant" : status)}
            </p>
            {lane?.phase && (
              <p className="text-[10px] uppercase tracking-wider text-ink-500 mt-1">
                {lane.phase.replace(/_/g, " ")}
              </p>
            )}
          </div>
          <span className="text-[10px] text-ink-500 whitespace-nowrap">
            {lane?.sources.length || 0} sources
          </span>
        </div>
        {identity && (
          <div className="mt-5 border-t border-ink-700/35 pt-5">
            <div className="flex flex-wrap gap-x-5 gap-y-2 items-center">
              <p className="font-semibold text-ink-100">
                {identity.canonical_name || "Identity unresolved"}
              </p>
              <p className="text-sm text-ink-400">
                {identity.canonical_domain || "No verified domain"}
              </p>
              <span className="text-[10px] uppercase tracking-wider text-ink-500">
                {identity.confidence} confidence
              </span>
            </div>
            {identity.business_description && (
              <p className="text-sm text-ink-300 leading-6 mt-3">{identity.business_description}</p>
            )}
            <Subheading>Match basis</Subheading>
            <List items={identity.match_basis} empty="No supporting match basis was returned." />
            {identity.ambiguities.length > 0 && (
              <>
                <Subheading>Identity caveats</Subheading>
                <List items={identity.ambiguities} />
              </>
            )}
          </div>
        )}
      </div>
    </section>
  );
}

function RiskReport({ result }: { result: MerchantRiskResult }) {
  const identity = result.resolved_identity;
  const needsReview = result.web_context_level === "review_indicated";
  const insufficient = result.web_context_level === "insufficient_evidence";
  const BannerIcon = needsReview || insufficient ? AlertTriangle : CheckCircle2;
  const bannerColor = needsReview || insufficient ? "text-risk-elevated" : "text-risk-low";
  const bannerText = needsReview
    ? "Supported signals require review"
    : insufficient
      ? "Identity or evidence coverage is incomplete"
      : "No material indicators found in reviewed sources";
  const labels = [
    ["Web context", result.web_context_level.replace(/_/g, " ")],
    ["Identity confidence", result.identity_confidence],
    ["Evidence coverage", result.evidence_coverage],
    ["Submitted category", result.category_code],
  ];
  return (
    <article className="glass rounded-2xl p-5 md:p-8">
      <div className="max-w-4xl mx-auto">
        <header className="pb-6">
          <div
            className={`${bannerColor} text-xs font-semibold uppercase tracking-wider flex gap-2 items-center`}
          >
            <BannerIcon className="w-4 h-4" />
            {bannerText}
          </div>
          <h2 className="font-display text-2xl md:text-3xl font-semibold text-ink-100 mt-3">
            {identity?.canonical_name || result.merchant_name}
          </h2>
        </header>
        <dl className="border-y border-ink-700/40 divide-y divide-ink-700/30">
          {labels.map(([label, value]) => (
            <div key={label} className="py-3 flex flex-wrap justify-between gap-2 text-sm">
              <dt className="text-ink-500">{label}</dt>
              <dd className="font-medium text-ink-100 capitalize">{value}</dd>
            </div>
          ))}
        </dl>

        {identity && (
          <ReportSection number="01" title="Resolved identity">
            <div className="space-y-2 text-sm">
              <p>
                <span className="text-ink-500">Domain: </span>
                <span className="text-ink-200">{identity.canonical_domain || "Unverified"}</span>
              </p>
              <p>
                <span className="text-ink-500">Country: </span>
                <span className="text-ink-200">{identity.country || "Unverified"}</span>
              </p>
            </div>
            {identity.business_description && (
              <p className="text-sm text-ink-300 leading-6 mt-4">{identity.business_description}</p>
            )}
            <Subheading>Match basis</Subheading>
            <List items={identity.match_basis} />
            {[...new Set([...result.identity_ambiguities, ...identity.ambiguities])].length > 0 && (
              <>
                <Subheading>Identity caveats</Subheading>
                <List
                  items={[...new Set([...result.identity_ambiguities, ...identity.ambiguities])]}
                />
              </>
            )}
          </ReportSection>
        )}

        {result.category_fit && (
          <ReportSection
            number="02"
            title={`Category fit · ${result.category_fit.category_fit.replace(/_/g, " ")}`}
          >
            <p className="text-sm text-ink-300 leading-6">{result.category_fit.explanation}</p>
            <Subheading>Observed offerings</Subheading>
            <EvidenceRows items={result.category_fit.observed_offerings} />
          </ReportSection>
        )}

        {result.restricted_products && (
          <ReportSection number="03" title="Restricted products and services">
            <EvidenceRows items={result.restricted_products.indicators} />
            <Subheading>Products reviewed</Subheading>
            <List
              items={result.restricted_products.products_reviewed}
              empty="No specific restricted-product indicators were returned."
            />
            <Subheading>Coverage gaps</Subheading>
            <List items={result.restricted_products.evidence_gaps} />
          </ReportSection>
        )}

        {result.reputation && (
          <ReportSection number="04" title="Reputation and business practices">
            <EvidenceRows items={result.reputation.indicators} />
            <Subheading>Observed themes</Subheading>
            <List items={result.reputation.themes} empty="No material themes were returned." />
            <Subheading>Coverage gaps</Subheading>
            <List items={result.reputation.evidence_gaps} />
          </ReportSection>
        )}

        {result.legal_regulatory && (
          <ReportSection number="05" title="Legal and regulatory context">
            <EvidenceRows items={result.legal_regulatory.indicators} />
            <Subheading>Jurisdictions checked</Subheading>
            <List items={result.legal_regulatory.jurisdictions_checked} />
            <Subheading>Coverage gaps</Subheading>
            <List items={result.legal_regulatory.evidence_gaps} />
          </ReportSection>
        )}

        <ReportSection number="06" title="Evidence gaps">
          <List items={result.evidence_gaps} empty="Coverage gaps were not reported." />
          {Object.keys(result.lane_errors || {}).length > 0 && (
            <p className="text-xs text-risk-high leading-5 mt-4">
              Incomplete workstreams:{" "}
              {Object.entries(result.lane_errors)
                .map(([lane, message]) => `${lane}: ${message}`)
                .join(" · ")}
            </p>
          )}
          {Object.keys(result.lane_skips || {}).length > 0 && (
            <p className="text-xs text-risk-elevated leading-5 mt-4">
              Research held back:{" "}
              {Object.entries(result.lane_skips)
                .map(([lane, message]) => `${lane}: ${message}`)
                .join(" · ")}
            </p>
          )}
        </ReportSection>

        <ReportSection number="07" title="Recommended next checks">
          <List items={result.next_checks} empty="No next checks were returned." />
        </ReportSection>
      </div>
    </article>
  );
}
export default function MerchantRiskPage() {
  const [name, setName] = useState("");
  const [category, setCategory] = useState("");
  const [domain, setDomain] = useState("");
  const [country, setCountry] = useState("");
  const lanes = useMemo(() => MERCHANT_LANES, []);
  const workflow = useWorkflowStream<MerchantRiskResult>("/api/merchant-risk/stream", lanes);
  const history = useRunHistory("merchant_risk");
  const running = workflow.status === "running";
  const identityLane = workflow.lanes.find((lane) => lane.id === "identity");
  const identityReady =
    identityLane?.status === "complete" || Boolean(workflow.result?.resolved_identity);
  const researchLanes = workflow.lanes
    .filter((lane) => lane.id !== "identity")
    .map((lane) =>
      lane.status === "queued"
        ? {
            ...lane,
            message: identityReady ? "Ready for resolved identity" : "Waiting for identity handoff",
          }
        : lane,
    );

  const submit = (event: FormEvent) => {
    event.preventDefault();
    if (!name.trim() || !category.trim() || running) return;
    void workflow.run({
      merchant_name: name.trim(),
      category_code: category.trim(),
      domain: domain.trim() || undefined,
      country: country.trim() || undefined,
    });
  };

  useEffect(() => {
    if (workflow.status === "complete" || workflow.status === "partial") history.refresh();
  }, [workflow.status, history.refresh]);

  const load = useCallback(
    async (id: string) => {
      try {
        const stored = await fetchStoredWorkflow<MerchantRiskResult>(id);
        workflow.hydrate(stored.result, stored.sources, id);
      } catch {
        // Partial stored runs may not have a final result.
      }
    },
    [workflow.hydrate],
  );

  return (
    <main>
      <header className="mb-6">
        <div className="flex items-center gap-2 text-xs uppercase tracking-[.16em] text-tavily-green font-semibold">
          <Fingerprint className="w-4 h-4" />
          Merchant risk
        </div>
        <h1 className="font-display text-3xl font-semibold text-ink-100 mt-3">
          Build an identity-grounded risk brief
        </h1>
        <p className="text-sm text-ink-400 mt-1.5 max-w-3xl">
          Confirm who the merchant is on the public web, then run parallel checks for category fit,
          restricted products, reputation, and regulatory signals.
        </p>
      </header>

      <section className="glass rounded-2xl p-5 mb-5">
        <form
          onSubmit={submit}
          className="grid sm:grid-cols-2 xl:grid-cols-[repeat(4,minmax(150px,1fr))_auto] gap-3 items-end"
        >
          <label className="block text-xs font-semibold text-ink-300">
            Merchant name <span className="text-risk-high">*</span>
            <input
              value={name}
              onChange={(event) => setName(event.target.value)}
              className={`${fieldClass} mt-1.5`}
              placeholder="Legal or trading name"
              required
              disabled={running}
            />
          </label>
          <label className="block text-xs font-semibold text-ink-300">
            Merchant category <span className="text-risk-high">*</span>
            <input
              value={category}
              onChange={(event) => setCategory(event.target.value)}
              className={`${fieldClass} mt-1.5`}
              placeholder="e.g. Electronics retailer"
              required
              disabled={running}
            />
          </label>
          <label className="block text-xs font-semibold text-ink-300">
            Domain
            <input
              value={domain}
              onChange={(event) => setDomain(event.target.value)}
              className={`${fieldClass} mt-1.5`}
              placeholder="example.com"
              disabled={running}
            />
          </label>
          <label className="block text-xs font-semibold text-ink-300">
            Country
            <input
              value={country}
              onChange={(event) => setCountry(event.target.value)}
              className={`${fieldClass} mt-1.5`}
              placeholder="e.g. United States"
              disabled={running}
            />
          </label>
          {running ? (
            <button
              type="button"
              onClick={workflow.stop}
              className="h-[42px] rounded-xl bg-ink-100 text-white px-4 text-sm font-semibold flex gap-2 items-center justify-center whitespace-nowrap"
            >
              <Square className="w-4 h-4" /> Stop
            </button>
          ) : (
            <button
              type="submit"
              disabled={!name.trim() || !category.trim()}
              className="h-[42px] rounded-xl bg-tavily-green text-white px-5 text-sm font-semibold flex gap-2 items-center justify-center whitespace-nowrap disabled:opacity-40"
            >
              <Play className="w-4 h-4" /> Review web
            </button>
          )}
        </form>
        <p className="text-[10px] text-ink-500 leading-relaxed mt-3">
          Name and category are required. Domain and country materially improve identity resolution
          and reduce silent merging.
        </p>
      </section>

      <div className="space-y-5">
        <RunHistory runs={history.runs} activeRunId={workflow.runId} onLoad={load} />
        {workflow.error && (
          <div className="glass rounded-xl p-4 text-sm text-risk-high flex gap-2">
            <AlertTriangle className="w-4 h-4 shrink-0" />
            {workflow.error}
          </div>
        )}
        {workflow.status === "cancelled" && (
          <div className="glass-subtle rounded-xl p-3 text-xs text-ink-400">Review stopped.</div>
        )}
        <IdentityCheckpoint
          lane={identityLane}
          storedIdentity={workflow.result?.resolved_identity}
        />
        <div className="flex items-center justify-center gap-2 text-[10px] uppercase tracking-[.14em] text-ink-500">
          <ArrowDown className="w-3.5 h-3.5 text-tavily-green" />
          {identityReady
            ? "Resolved scope handed to all four lanes"
            : "Research waits for the identity checkpoint"}
        </div>
        <WorkstreamLanes
          lanes={researchLanes}
          heading="Step 2 · Parallel Research workstreams"
          variant="list"
        />
        {workflow.result && <RiskReport result={workflow.result} />}
        <SourceList
          sources={workflow.sources.length ? workflow.sources : workflow.result?.sources || []}
          title="Public-web sources"
        />
      </div>
    </main>
  );
}
