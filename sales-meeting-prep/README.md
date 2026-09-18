# Sales Meeting Prep

![Sales Meeting Prep app](docs/images/app-screenshot.png)

Walk into your next meeting with current company context, recent developments, and questions worth asking.

A small, standalone React + Node.js demo of **Tavily Search**. One form starts three focused searches in parallel and streams real completion events to the browser. It needs only a Tavily key, with no separate model service, database, or agent framework.

## What it covers

1. **Company context:** Understand the business, products, and customers.
2. **Recent developments:** Find timely launches, partnerships, and growth signals.
3. **Meeting angles:** Connect public signals with the problem you solve.

The brief includes source excerpts, publication/update dates when available, a complete list of source links, suggested follow-up questions, and Markdown export. Concise summaries come from the Search endpoint’s `include_answer: "basic"` option.

## Run in two commands

Requires **Node.js 24 or newer**.

```bash
npm ci
npm run dev
```

Open [localhost:3000](http://localhost:3000). Choose **View saved example** for a key-free walkthrough, or enter your [Tavily API key](https://app.tavily.com) to search live. Example chips populate the form; they do not trigger API calls.

Optional: copy `.env.example` to `.env` and set `TAVILY_API_KEY` for trusted local use. A supplied session key takes precedence. Neither path writes keys into reports, logs, browser storage, or saved examples. To use another port: `PORT=3001 npm run dev`.

## How Tavily is used

```text
React form → POST /api/research → 3 concurrent Tavily Search requests
           ← real SSE events  ← completed sources and errors
```

The upstream Search endpoint returns JSON. This application emits its own SSE events around real request starts and completions; it does not simulate progress or use the Tavily Research endpoint.

- Short queries, `search_depth: "advanced"`, up to ten results, and 4 content chunks per source.
- Domain restrictions use `include_domains_mode: "filter"` and are checked again against returned hostnames. An out-of-scope result is removed, and its search summary is suppressed.
- Time-sensitive searches use the chosen window with strict publication-date filtering. This can omit undated sources. Evergreen searches explicitly use any time; each section shows its actual filters.
- Duplicate URLs are removed. Search scores are relevance signals, not proof of a fact or identity.
- Each advanced search currently uses two credits, so a completed brief normally uses six. The UI displays reported usage; saved examples make no API calls. See the [Search API documentation](https://docs.tavily.com/documentation/api-reference/endpoint/search) for current behavior and parameters.

One real request for this demo:

```json
{
  "query": "Shopify company overview business model products",
  "search_depth": "advanced",
  "max_results": 10,
  "chunks_per_source": 4,
  "include_domains": [],
  "exclude_domains": [],
  "topic": "general",
  "include_answer": "basic",
  "include_usage": true,
  "include_raw_content": false,
  "include_published_date": true
}
```

## API and streaming

`GET /api/health` returns readiness and whether a server key is configured, never the key itself.

`POST /api/research` accepts:

```json
{
  "entity": "Shopify",
  "context": "enterprise search",
  "timeRange": "month",
  "apiKey": "tvly-YOUR_KEY"
}
```

It returns `text/event-stream` with JSON `data:` frames: `plan`, `search`, `result`, `search-error`, and `complete`. A completion report is explicitly `complete`, `partial`, or `failed`. Missing keys and invalid input return JSON errors before opening a stream. The browser surfaces truncated streams and keeps successful sections after a partial failure. Stopping a search aborts in-flight upstream requests, although work already accepted by Tavily may still consume credits. Requests time out after 60 seconds.

## Build, test, and run

```bash
npm test
npm run build
npm start
```

The tests use mock upstream responses and cover parallel execution, stream framing, cancellation, validation, partial failures, empty results, domain filtering, safe source URLs, and credential redaction. They do not consume API credits. GitHub Actions runs these tests and a production build on pushes and pull requests.

For a container:

```bash
docker build -t sales-meeting-prep .
docker run --rm -p 3000:3000 sales-meeting-prep
```

The container uses visitor-supplied keys by default. The local server binds to `127.0.0.1`; Docker binds to `0.0.0.0`. This is a demo without user authentication or persistent storage. Put a shared-key deployment behind your own authentication and HTTPS. Per-process concurrency and short request throttles are included, but are not an account-level quota system. Set `HOST` and `PORT` for your deployment environment.

## Customize

- `demo.config.mjs`: fields, examples, queries, source domains, and follow-up questions.
- `server/research.mjs`: Tavily calls and report assembly.
- `server/index.mjs`: HTTP API, stream forwarding, and static serving.
- `src/main.jsx` and `src/style.css`: the Tavily-branded responsive UI.
- `public/sample-report.json`: a dated, saved real search with shortened excerpts and all returned source links. It is visibly labeled as a saved example.

Brand assets and local Suisse fonts are reused from the existing Tavily travel demo. Their inclusion does not grant a separate trademark or font redistribution license.

## Scope

Conversation starters are suggested questions, not verified customer needs. Company context uses any-time search; the selected window applies to developments and meeting angles.

The follow-up questions are deterministic prompts to explore, not generated findings. The app does not run a scheduler, send notifications, or make decisions for the user.
