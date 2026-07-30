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

export type ClientStatus =
  | "queued"
  | "planning"
  | "searching"
  | "extracting"
  | "done"
  | "error";

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
  kind: "watchlist" | "investigation";
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
