export interface RosterClient {
  id: string;
  name: string;
  country: string;
  industry: string;
  known_context?: string;
}

export interface EvidenceItem {
  headline: string;
  url: string;
  quoted_passage: string;
  date?: string | null;
}

export type Verdict = "clear" | "review" | "escalate";

export interface ScreeningVerdict {
  verdict: Verdict;
  risk_categories: string[];
  summary: string;
  evidence: EvidenceItem[];
  searches_performed: string[];
}

export type ClientStatus = "queued" | "planning" | "searching" | "extracting" | "done" | "error";

export interface ClientRunState {
  client: RosterClient;
  status: ClientStatus;
  stageDetail: string;
  verdict?: ScreeningVerdict;
  elapsedS?: number;
  error?: string;
  activity: AuditEntry[];
}

export interface AuditEntry {
  ts: number;
  run_id: string;
  kind: string;
  type: string;
  client_id?: string | null;
  [key: string]: unknown;
}

export interface WatchlistCounts {
  clear: number;
  review: number;
  escalate: number;
  error: number;
}

export interface WatchlistSummary {
  runId: string;
  elapsedS: number;
  counts: WatchlistCounts;
  auditLog: string;
}

export interface RunRecord {
  run_id: string;
  kind: "watchlist" | "investigation" | "investment_research" | "merchant_risk" | string;
  created_at: number;
  query?: string | null;
  elapsed_s?: number | null;
  counts?: WatchlistCounts | null;
}

export interface StoredWatchlistRun extends RunRecord {
  payload: {
    results: Record<
      string,
      { client: RosterClient; verdict: ScreeningVerdict; elapsed_s?: number }
    >;
    audit_log: string;
  };
}

export interface StoredInvestigationRun extends RunRecord {
  payload: {
    case_file: CaseFile | null;
    flag_context?: string | null;
    audit_log: string;
  };
}

export interface Leader {
  name: string;
  title: string;
}

export interface Finding {
  headline: string;
  date?: string | null;
  summary: string;
  risk_category: string;
  severity: "low" | "medium" | "high" | "critical";
  url: string;
  quoted_passage: string;
}

export type RiskRating = "low" | "medium" | "high" | "critical";

export interface CaseFile {
  legal_name: string;
  hq_address?: string | null;
  naics_code?: string | null;
  industry?: string | null;
  country?: string | null;
  leadership: Leader[];
  findings: Finding[];
  risk_rating: RiskRating;
  recommended_action: string;
  summary: string;
  searches_performed: string[];
}

export interface HandoffContext {
  entityName: string;
  flagNote: string;
}

// Normalized events shared by the research workflows.
export interface ResearchSource {
  url: string;
  title?: string;
  snippet?: string;
  content?: string;
  domain?: string;
  published_date?: string | null;
}
export interface WorkflowLaneDefinition {
  id: string;
  label: string;
}
export type WorkflowName = "investment_research" | "merchant_risk" | string;
export type NormalizedWorkflowEvent =
  | { type: "start"; run_id: string; workflow: WorkflowName; lanes: WorkflowLaneDefinition[] }
  | {
      type: "progress";
      run_id: string;
      workflow: WorkflowName;
      lane_id: string;
      phase?: string;
      message?: string;
      queries?: string[];
    }
  | {
      type: "sources_found";
      run_id: string;
      workflow: WorkflowName;
      lane_id: string;
      sources: ResearchSource[];
    }
  | {
      type: "lane_complete" | "category_complete";
      run_id: string;
      workflow: WorkflowName;
      lane_id?: string;
      category?: string;
      data: unknown;
      sources?: ResearchSource[];
      message?: string;
    }
  | {
      type: "lane_skipped";
      run_id: string;
      workflow: WorkflowName;
      lane_id: string;
      message: string;
    }
  | {
      type: "error";
      run_id?: string;
      workflow?: WorkflowName;
      lane_id?: string;
      category?: string;
      message: string;
    }
  | {
      type: "result";
      run_id: string;
      workflow: WorkflowName;
      data: unknown;
      sources?: ResearchSource[];
    }
  | { type: "complete"; run_id: string; workflow: WorkflowName; elapsed_s?: number };

export interface InvestmentResearchRequest {
  topic: string;
  meeting_objective?: string;
  audience?: string;
  horizon?: string;
}
export interface InvestmentEvidencePoint {
  claim: string;
  detail: string;
  source_urls: string[];
  as_of?: string | number | null;
}
export interface InvestmentResearchResult {
  topic: string;
  meeting_objective?: string | null;
  audience?: string | null;
  horizon?: string | null;
  executive_summary: string;
  official_policy?: {
    developments: InvestmentEvidencePoint[];
    official_positions: InvestmentEvidencePoint[];
    watch_items: string[];
  } | null;
  economic_data?: {
    indicators: InvestmentEvidencePoint[];
    trend_summary: string;
    data_limitations: string[];
  } | null;
  market_expectations?: {
    consensus: InvestmentEvidencePoint[];
    disagreements: InvestmentEvidencePoint[];
    market_signals: InvestmentEvidencePoint[];
  } | null;
  portfolio_implications?: {
    implications: InvestmentEvidencePoint[];
    affected_assets_or_sectors: string[];
    transmission_channels: string[];
  } | null;
  scenarios?: {
    base_case: string;
    upside_case: string;
    downside_case: string;
    counter_thesis: InvestmentEvidencePoint[];
    signposts: string[];
  } | null;
  discussion_questions: string[];
  evidence_gaps: string[];
  lane_errors: Record<string, string>;
  lane_skips: Record<string, string>;
  sources: ResearchSource[];
}

export interface MerchantRiskRequest {
  merchant_name: string;
  category_code: string;
  domain?: string;
  country?: string;
}
export interface MerchantEvidence {
  finding: string;
  significance: string;
  source_urls: string[];
  observed_date?: string | number | null;
}
export interface MerchantIdentity {
  canonical_name?: string | null;
  canonical_domain?: string | null;
  country?: string | null;
  business_description?: string | null;
  confidence: "low" | "medium" | "high" | "unresolved";
  match_basis: string[];
  ambiguities: string[];
  alternative_candidates: Array<{
    name: string;
    domain?: string | null;
    country?: string | null;
    rationale: string;
    source_urls: string[];
  }>;
}
export interface MerchantRiskResult {
  merchant_name: string;
  category_code: string;
  resolved_identity?: MerchantIdentity | null;
  identity_confidence: "low" | "medium" | "high" | "unresolved";
  identity_ambiguities: string[];
  category_fit?: {
    observed_offerings: MerchantEvidence[];
    category_fit: "consistent" | "mixed" | "inconsistent" | "insufficient_evidence";
    explanation: string;
  } | null;
  restricted_products?: {
    indicators: MerchantEvidence[];
    products_reviewed: string[];
    evidence_gaps: string[];
  } | null;
  reputation?: { indicators: MerchantEvidence[]; themes: string[]; evidence_gaps: string[] } | null;
  legal_regulatory?: {
    indicators: MerchantEvidence[];
    jurisdictions_checked: string[];
    evidence_gaps: string[];
  } | null;
  web_context_level: "insufficient_evidence" | "no_material_indicators_found" | "review_indicated";
  evidence_coverage: "weak" | "partial" | "strong";
  risk_indicators: MerchantEvidence[];
  evidence_gaps: string[];
  next_checks: string[];
  lane_errors: Record<string, string>;
  lane_skips: Record<string, string>;
  sources: ResearchSource[];
}
