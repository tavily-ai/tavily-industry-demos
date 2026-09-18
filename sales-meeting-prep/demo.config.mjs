export default {
  id: "sales-meeting-prep",
  title: "Sales Meeting Prep",
  headline: "Sales Meeting Research & Preparation",
  description:
    "Research a prospect's business, recent announcements, and relevant initiatives to prepare a meeting brief with cited sources and conversation starters.",
  formTitle: "Who are you meeting?",
  action: "Prepare meeting brief",
  questionTitle: "CONVERSATION STARTERS",
  fields: [
    { id: "entity", label: "Company", placeholder: "e.g. Shopify", maxLength: 40 },
    { id: "context", label: "What you sell", placeholder: "e.g. enterprise search", maxLength: 40 },
  ],
  examples: [
    { label: "Shopify", input: { entity: "Shopify", context: "enterprise search" } },
    { label: "Datadog", input: { entity: "Datadog", context: "developer tools" } },
    { label: "Canva", input: { entity: "Canva", context: "data infrastructure" } },
  ],
  lanes: [
    {
      id: "company",
      title: "Company context",
      note: "Understand the business, products, and customers.",
    },
    {
      id: "news",
      title: "Recent developments",
      note: "Find timely launches, partnerships, and growth signals.",
    },
    {
      id: "opportunity",
      title: "Meeting angles",
      note: "Connect public signals with the problem you solve.",
    },
  ],
  defaultTimeRange: "month",
  chunks: 4,
  includeAnswer: true,
  reportNote:
    "Conversation starters are suggested questions, not verified customer needs. Company context uses any-time search; the selected window applies to developments and meeting angles.",
  repository: "https://github.com/tavily-ai/tavily-industry-demos/tree/main/sales-meeting-prep",
  searches: ({ entity, context }) => [
    { query: `${entity} company overview business model products`, evergreen: true },
    { query: `${entity} announcements partnerships product launches`, topic: "news" },
    { query: `${entity} ${context} initiatives challenges` },
  ],
  questions: ({ entity, context }) => [
    `Which current initiatives at ${entity} are creating the most urgency for your team?`,
    `How does ${context} fit into the priorities discussed in these sources?`,
    `What would a useful first project look like, and how would you measure its impact?`,
  ],
};
