export type ResearchStatusType = {
  step: string;
  message: string;
};

export type ResearchOutput = {
  summary: string;
  details: {
    report: string;
  };
};

export type LaneKey = "destination" | "trends" | "pricing" | "disruptions";

export type EnrichmentCounts = {
  destination: { total: number; enriched: number };
  trends: { total: number; enriched: number };
  pricing: { total: number; enriched: number };
  disruptions: { total: number; enriched: number };
};

export type SearchHit = {
  title: string;
  url: string;
  favicon: string;
  content: string;
  query: string;
  category: string;
};

export type GlassStyle = {
  base: string;
  card: string;
  input: string;
};

export type AnimationStyle = {
  fadeIn: string;
  writing: string;
};

export type ResearchStatusProps = {
  status: ResearchStatusType | null;
  error: string | null;
  isComplete: boolean;
  currentPhase: "search" | "enrichment" | "briefing" | "complete" | null;
  isResetting: boolean;
  glassStyle: GlassStyle;
  loaderColor: string;
  statusRef: React.RefObject<HTMLDivElement>;
};

export type ResearchQueriesProps = {
  queries: Array<{
    text: string;
    number: number;
    category: string;
  }>;
  streamingQueries: {
    [key: string]: {
      text: string;
      number: number;
      category: string;
      isComplete: boolean;
    };
  };
  isExpanded: boolean;
  onToggleExpand: () => void;
  isResetting: boolean;
  glassStyle: string;
};
