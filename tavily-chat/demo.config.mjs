export default {
  title: "Tavily Chat",
  repository: "https://github.com/tavily-ai/tavily-industry-demos/tree/main/tavily-chat",
  model: "gpt-5.6-luna",
  timeoutMs: 90000,
  maxMessageLength: 2000,
  maxHistory: 6,
  prompts: [
    { label: "Catch up on AI", question: "What are the most notable AI developments this week?" },
    {
      label: "Compare technologies",
      question: "How do sodium-ion batteries compare with lithium-ion batteries?",
    },
    {
      label: "Explore a breakthrough",
      question: "What are the latest breakthroughs in fusion energy?",
    },
    {
      label: "Follow an industry",
      question: "What is happening in the space industry this month?",
    },
    { label: "Track the markets", question: "What is driving the stock market this week?" },
    {
      label: "Check the weather",
      question: "What is the weather forecast for San Francisco this weekend?",
    },
    { label: "Plan a trip", question: "What are the best times of year to visit Japan?" },
    {
      label: "Learn something new",
      question: "Explain how large language models are trained, in simple terms.",
    },
    { label: "Research a company", question: "What has Tavily shipped or announced recently?" },
    {
      label: "Get health guidance",
      question: "What does current research say about the benefits of intermittent fasting?",
    },
  ],
};
