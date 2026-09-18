# Financial Services & Insurance Kit

An evidence-first collection of financial services and insurance workflows powered by [Tavily](https://tavily.com). One FastAPI backend and routed React interface provide three focused modules while sharing live research, source provenance, run history, and streaming infrastructure.

Live research uses `TAVILY_API_KEY` and `OPENAI_API_KEY` on the server. The browser never sees or sends a key.

## What it does

- **Compliance Intelligence** — screen a morning watchlist, then run investigator-driven enhanced due diligence with source-backed findings.
- **Investment Research** — fan out five Tavily Research `mini` workstreams and synthesize a cited meeting brief.
- **Merchant Risk** — resolve a merchant’s public-web identity, then surface evidence, ambiguity, coverage gaps, and next checks.

Compliance uses iterative Tavily Search + Extract because quoted passages matter for review. Investment Research and Merchant Risk use Tavily Research `mini`. Merchant identity is resolved first by a LangChain agent with Search + Extract. Results are web context for a reviewer, not compliance, investment, or underwriting decisions.

## Architecture

```text
React UI → POST /api/<module>/stream
        ← real SSE events  ← Compliance: Tavily Search + Extract
                           ← Investment / Merchant: Tavily Research mini
                           ← Merchant identity: LangChain + Search / Extract
```

The UI connects to the API with `VITE_API_URL`. Stopping a run aborts the in-flight request.

## Prerequisites

- [uv](https://docs.astral.sh/uv/) (Python 3.11 or later)
- Node.js 18 or later
- Tavily API key
- OpenAI API key for Compliance and Merchant identity

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
   uv run uvicorn backend.app:app --reload --port 8000
   ```

5. Start the UI in a second terminal:

   ```bash
   cd ui
   npm run dev
   ```

Open [http://localhost:5173](http://localhost:5173). The API is available at [http://localhost:8000/docs](http://localhost:8000/docs).

From `ui/`, `npm run lint` and `npm run fmt:check` run oxlint and oxfmt. Alternatively, `./setup.sh` installs dependencies, writes env files if they are missing, and can start both servers.

## API

| Method | Endpoint | Purpose |
| --- | --- | --- |
| `GET` | `/` | Readiness. |
| `GET` | `/api/config` | Provider and model labels, never the keys themselves. |
| `GET` | `/api/modules` | Module ids, labels, and browser routes. |
| `GET` | `/api/compliance/roster` | Sample watchlist roster. |
| `POST` | `/api/compliance/watchlist/stream` | Parallel adverse-media screening. |
| `POST` | `/api/compliance/investigate/stream` | Enhanced due diligence stream. |
| `POST` | `/api/investment-research/stream` | Meeting-brief research stream. |
| `POST` | `/api/merchant-risk/stream` | Identity resolution plus risk-lane research. |
| `GET` | `/api/runs?kind=...` | Local run history. |
| `GET` | `/api/runs/{run_id}` | Stored run detail. |

Temporary aliases preserve the previous `/api/roster`, `/api/watchlist/stream`, and `/api/investigate/stream` contracts.

Example request:

```bash
curl -N -X POST http://localhost:8000/api/investment-research/stream \
  -H 'Content-Type: application/json' \
  -d '{
    "topic": "US regional bank credit conditions",
    "meeting_objective": "Prepare a 20-minute investment committee brief"
  }'
```

Streaming endpoints return `text/event-stream`. Missing keys and invalid input return JSON errors before opening a stream. Stopping a run aborts in-flight work, although work already accepted by Tavily or OpenAI may still consume credits.

## Configuration reference

| Variable | Required | Used by |
| --- | --- | --- |
| `TAVILY_API_KEY` | Yes | Backend Search, Extract, and Research |
| `OPENAI_API_KEY` | Yes | Compliance and merchant-identity chat model |
| `VITE_API_URL` | Yes | Frontend API connection |

## Data and privacy

- Tavily and OpenAI credentials remain server-side.
- The shipped client roster is sample JSON under `backend/data/roster.json`.
- Run history is stored locally in SQLite and audit logs are written under `logs/`; both are gitignored.
- Do not submit confidential customer, transaction, portfolio, or case data to this demo without an approved data-handling design.

## Make it yours

This folder is a complete app. Copy it, then change:

- `backend/modules/compliance/` — watchlist, investigation, and screening prompts
- `backend/modules/investment_research/` — meeting-brief lanes, schemas, and prompts
- `backend/modules/merchant_risk/` — identity resolution and risk-lane research
- `backend/core/research/` — shared Tavily Research adapter
- `backend/data/roster.json` — sample compliance roster
- `ui/src/pages/` — routed module experiences

No other kit is required:

```bash
npx degit tavily-ai/tavily-industry-demos/fsi-kit my-demo
```

Included brand assets and Suisse fonts do not grant a separate trademark or font redistribution license.

## License

[MIT](LICENSE)
