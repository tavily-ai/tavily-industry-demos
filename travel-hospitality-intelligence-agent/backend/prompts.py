"""Prompts for the Travel & Hospitality Intelligence Agent."""

DESTINATION_BRIEFING_PROMPT = """Create a concise operational briefing for the travel destination {company}. {industry} is the operator's travel segment and {research_priorities} describes the user's research priorities.

Use these exact headings:

### Demand signals
* Identify current visitor demand, origin markets, seasonality, and booking behavior.

### Traveler experience
* Summarize recurring traveler praise, concerns, and practical planning implications.

### Operational implications
* Give clear implications for marketing, pricing, staffing, inventory, or guest communications.

Use only evidence in the supplied sources. Each bullet must be a complete, specific fact. Do not mention missing information. Return only the briefing in markdown."""

INDUSTRY_BRIEFING_PROMPT = """Create a concise destination-trends and events briefing for {company}. {industry} is the operator's travel segment and {research_priorities} describes the user's research priorities.

Use these exact headings:

### Destination trends
* Cover traveler interests, demand shifts, new routes or access, and seasonal patterns.

### Events and calendar drivers
* List upcoming events, holidays, conventions, festivals, or cultural moments that can affect demand.

### Planning opportunities
* State concrete timing, packaging, or audience opportunities for a travel operator.

Use only evidence in the supplied sources. Sort dated events soonest first. Return only the briefing in markdown."""

FINANCIAL_BRIEFING_PROMPT = """Create a concise pricing and demand briefing for {company}. {industry} is the operator's travel segment and {research_priorities} describes the user's research priorities.

Use these exact headings:

### Price and capacity signals
* Include observed hotel, air, attraction, or transport pricing and availability signals when supported.

### Demand outlook
* Identify near-term high and low demand periods, booking windows, and traveler segments.

### Revenue actions
* Recommend evidence-based pricing, promotional, or inventory actions. Clearly label recommendations as recommendations.

Use only evidence in the supplied sources. Avoid invented numbers. Return only the briefing in markdown."""

NEWS_BRIEFING_PROMPT = """Create a concise disruption and local-sentiment briefing for {company}. {industry} is the operator's travel segment and {research_priorities} describes the user's research priorities.

Use these exact headings:

### Active disruptions
* Cover weather, strikes, transport closures, safety alerts, health notices, or other active operational issues.

### Local sentiment
* Summarize recent resident or traveler sentiment relevant to visitors, using attributable reporting or public posts surfaced in the sources.

### Customer communication
* Give practical, non-alarmist communication actions for travelers. Clearly distinguish confirmed facts from recommendations.

Prioritize current, dated information. Return only the briefing in markdown."""

BRIEFING_ANALYSIS_INSTRUCTION = """Analyze the supplied sources. Treat unverified claims cautiously and never present a recommendation as a confirmed fact."""

EDITOR_SYSTEM_MESSAGE = "You are an expert travel operations editor who produces source-backed destination intelligence briefs."

COMPILE_CONTENT_PROMPT = """Compile the following briefings into one clear operational report for {company}, a travel destination. The operator's travel segment is {industry}; the user's research priorities are {research_priorities}.

Briefings:
{combined_content}

Use this exact structure:

# {company} Travel Intelligence Brief

## Destination demand and traveler experience
[Destination demand and traveler experience content]

## Trends and events
[Destination trends and calendar drivers]

## Pricing and demand outlook
[Price, capacity, and revenue actions]

## Disruptions and local sentiment
[Active disruptions, sentiment, and communications]

Keep confirmed observations separate from recommended actions. Be specific about dates when sources provide them. Return clean markdown only."""

CONTENT_SWEEP_SYSTEM_MESSAGE = "You are an expert markdown editor for source-backed travel intelligence briefs."

CONTENT_SWEEP_PROMPT = """Edit this travel intelligence brief about {company}. Remove repetition, unsupported claims, and meta-commentary. Preserve the references section exactly.

{content}

The document must start with '# {company} Travel Intelligence Brief' and use only these ## headings, in order:
1. Destination demand and traveler experience
2. Trends and events
3. Pricing and demand outlook
4. Disruptions and local sentiment
5. References

Use ### only for subsections, use * for bullets, and return markdown only."""

COMPANY_ANALYZER_QUERY_PROMPT = """Generate queries about destination demand and traveler experience for {company}, including visitor origin markets, seasonality, travel blogs, reviews, and social sentiment."""

FINANCIAL_ANALYZER_QUERY_PROMPT = """Generate queries about pricing and demand for {company}, including hotel and flight pricing, capacity, booking windows, occupancy, and travel demand forecasts."""

INDUSTRY_ANALYZER_QUERY_PROMPT = """Generate queries about destination trends and events for {company}, including festivals, conventions, holidays, new routes, attractions, and travel planning trends."""

NEWS_SCANNER_QUERY_PROMPT = """Generate queries about current disruptions and local sentiment for {company}, including weather, strikes, safety alerts, transport disruption, closures, and recent visitor or resident concerns."""

QUERY_FORMAT_GUIDELINES = """
Important guidelines:
- Focus only on the destination {company}
- Prefer current information and include a timeframe when useful
- Make queries short and specific
- Provide exactly 2 queries, one per line, with no labels, bullets, or explanations
"""
