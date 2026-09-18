export default {
  id: "vendor-supply-chain-risk",
  title: "Vendor & Supply Chain Risk",
  headline: "Vendor & Supply Chain Risk Research",
  description:
    "Research a supplier's business developments, operational disruptions, and published sanctions or trade restrictions in one brief with linked sources.",
  formTitle: "Which supplier are you reviewing?",
  action: "Research supplier signals",
  questionTitle: "SUPPLIER FOLLOW-UP",
  fields: [
    {
      id: "entity",
      label: "Supplier or vendor",
      placeholder: "e.g. TSMC",
      maxLength: 40,
    },
    {
      id: "context",
      label: "Supply chain focus",
      placeholder: "e.g. Taiwan semiconductors",
      maxLength: 40,
    },
  ],
  examples: [
    { label: "TSMC", input: { entity: "TSMC", context: "Taiwan semiconductors" } },
    { label: "Maersk", input: { entity: "Maersk", context: "Red Sea shipping" } },
    { label: "Boeing", input: { entity: "Boeing", context: "commercial aircraft" } },
  ],
  lanes: [
    {
      id: "business",
      title: "Business signals",
      note: "Review disclosures, financial pressures, and vendor news.",
    },
    {
      id: "disruptions",
      title: "Operational disruptions",
      note: "Track logistics, outages, and supply constraints.",
    },
    {
      id: "sanctions",
      title: "Official risk sources",
      note: "Search sanctions and trade-restriction publications.",
    },
  ],
  defaultTimeRange: "month",
  chunks: 4,
  includeAnswer: true,
  reportNote:
    "Signals for follow-up, not a supplier risk score. Official-source search is not a complete sanctions screening, and no results must not be treated as clearance. Sanctions and trade searches use any time. This is an on-demand snapshot.",
  repository:
    "https://github.com/tavily-ai/tavily-industry-demos/tree/main/vendor-supply-chain-risk",
  searches: ({ entity, context }) => [
    { query: `${entity} business financial disclosure news`, topic: "news" },
    { query: `${entity} ${context} supply disruption`, topic: "news" },
    {
      query: `${entity} sanctions export restrictions`,
      domains: ["ofac.treasury.gov", "bis.gov", "gov.uk", "consilium.europa.eu"],
      evergreen: true,
    },
  ],
  questions: ({ entity }) => [
    `Which reported events could affect ${entity}'s delivery commitments to us?`,
    "What inventory, alternate supplier, or routing options should procurement validate?",
    "Do legal entity names and ownership require a separate sanctions screening?",
  ],
};
