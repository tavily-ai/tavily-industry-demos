# Company Research Agent

An agentic research tool that turns a company name into a structured, source-backed briefing. The FastAPI backend coordinates specialized research and synthesis steps; the React interface streams progress and lets you export the finished report as a PDF.

![Company Research Agent landing page](static/app-screenshot.png)

## What it does

- Researches a company’s business, industry, financial context, and recent news.
- Uses Tavily Search and Extract to find, score, and enrich source material.
- Synthesizes category briefings and the final report with OpenAI.
- Streams real completion events to the browser on `POST /research`.
- Supports PDF export.

Live research uses `TAVILY_API_KEY` and `OPENAI_API_KEY` on the server. The browser never sees or sends a key.

## Architecture

```text
React form → POST /research → analyzers → collector → curator → briefing → editor
           ← real SSE events  ← Tavily Search / Extract and OpenAI
```

Research graph:

```text
analyzers → collector → curator → briefing → editor
      ├── Tavily Search: query discovery and source scoring
      ├── Tavily Extract: page enrichment
      └── OpenAI: search queries, category briefings, and final editing
```

The UI connects to the API with `VITE_API_URL`. Stopping a run aborts the in-flight request.

## Prerequisites

- [uv](https://docs.astral.sh/uv/) (Python 3.11 or later)
- Node.js 24 or later
- Tavily and OpenAI API keys on the backend

## Run locally

1. Install backend dependencies:

   ```bash
   uv sync
   ```

2. Create `.env` from the example and set the required backend keys:

   ```bash
   cp .env.example .env
   ```

   ```env
   TAVILY_API_KEY=your_tavily_key
   OPENAI_API_KEY=your_openai_key
   ```

3. Configure the frontend:

   ```bash
   cp ui/.env.development.example ui/.env.development.local
   cd ui && npm ci && cd ..
   ```

   Set `VITE_API_URL=http://localhost:8000` in `ui/.env.development.local`.

4. Start the API in one terminal:

   ```bash
   uv run uvicorn application:app --reload --port 8000
   ```

5. Start the UI in a second terminal:

   ```bash
   cd ui
   npm run dev
   ```

Open [http://localhost:3000](http://localhost:3000). The API is available at [http://localhost:8000/docs](http://localhost:8000/docs).

From `ui/`, `npm run lint` and `npm run fmt:check` run oxlint and oxfmt.

## Docker

After creating the root `.env` and `ui/.env.development.local` files, run:

```bash
docker compose up --build
```

This exposes the API on port `8000` and the UI on port `3000`.

## API

| Method | Endpoint | Purpose |
| --- | --- | --- |
| `GET` | `/health` | Readiness and whether server keys are configured, never the keys themselves. |
| `POST` | `/research` | Run research and stream SSE events on the same response. |
| `POST` | `/generate-pdf` | Generate a PDF from report Markdown. |

Example request:

```bash
curl -N -X POST http://localhost:8000/research \
  -H 'Content-Type: application/json' \
  -d '{
    "company": "Tavily",
    "company_url": "https://tavily.com",
    "industry": "AI search",
    "hq_location": "New York, USA"
  }'
```

`POST /research` returns `text/event-stream` with JSON `data:` frames, including `query_generated`, `curation`, `enrichment`, `briefing_complete`, `report_chunk`, `complete`, and `error`. Missing keys and invalid input return JSON errors before opening a stream. Stopping a search aborts in-flight work, although work already accepted by Tavily or OpenAI may still consume credits.

## Configuration reference

| Variable | Required | Used by |
| --- | --- | --- |
| `TAVILY_API_KEY` | Yes | Backend Search and Extract |
| `OPENAI_API_KEY` | Yes | Backend query generation, briefing, and report editing |
| `VITE_API_URL` | Yes | Frontend API connection |

## Make it yours

This folder is a complete app. Copy it, then change:

- `ui/src/components/ExamplePopup.tsx` and `ui/src/components/ResearchForm.tsx` — form fields and example chips
- `backend/prompts.py` — query, briefing, and editor prompts
- `backend/nodes/` — Tavily Search, Extract, and report assembly
- `application.py` — HTTP API and SSE streaming
- `ui/src/` — UI

No other kit is required:

```bash
npx degit tavily-ai/tavily-industry-demos/company-research-agent my-demo
```

Included brand assets and Suisse fonts do not grant a separate trademark or font redistribution license.

## License

[MIT](LICENSE)
