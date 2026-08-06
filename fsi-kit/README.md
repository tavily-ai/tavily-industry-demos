# Financial Services Intelligence Kit

An evidence-first collection of financial-services workflows powered by [Tavily](https://tavily.com). One FastAPI backend and routed React interface provide three focused modules while sharing live research, source provenance, run history, and streaming infrastructure.

## Modules

### Compliance Intelligence

- **Morning Watchlist** — bounded parallel adverse-media screening across a sample client roster.
- **Investigator Search** — investigator-driven enhanced due diligence with source-backed findings.

Compliance keeps the existing iterative Tavily Search + Extract agent workflow because exact article verification and quoted passages are central to the review.

### Investment Research

Turn a topic and optional meeting context into a structured meeting brief. Five predictable Tavily Research `mini` workstreams run in parallel:

- Official and policy developments
- Economic and fundamental data
- Market expectations
- Portfolio and sector implications
- Scenarios and counter-thesis

The UI shows each workstream, searches, sources, partial failures, and the final source-backed brief.

### Merchant Risk

Enrich a sparse merchant onboarding case using public-web evidence. The workflow resolves merchant identity first, then runs four Tavily Research `mini` lanes covering:

- Claimed category and observable business-model fit
- Restricted products and services
- Reputation and business practices
- Legal and regulatory context

The result is **web risk context**, not an underwriting decision. Missing public-web evidence is reported as insufficient coverage rather than low risk.

> **Demo only.** Results are generated from public-web research and language models. Do not use this kit for compliance, investment, underwriting, or other production decisions.

## Quickstart

### Prerequisites

- Python 3.11+
- [uv](https://docs.astral.sh/uv/)
- [Bun](https://bun.sh/) or npm
- Tavily API key
- Nebius API key for the Compliance module

### Configure

```bash
cp .env.sample .env
```

```dotenv
TAVILY_API_KEY=tvly-your-key
NEBIUS_API_KEY=your-nebius-key
```

Investment Research and Merchant Risk use Tavily Research `mini`. Compliance uses Tavily Search + Extract with the configured Nebius chat model.

### Run

Backend:

```bash
uv sync
uv run backend/app.py
```

Frontend:

```bash
cd ui
bun install
bun dev
```

Open <http://localhost:5173>. Alternatively, `./run.sh` launches both processes in tmux.

## Routes

### Browser

- `/` — module landing page
- `/compliance/watchlist`
- `/compliance/investigator`
- `/investment-research`
- `/merchant-risk`

### API

- `GET /api/modules`
- `GET /api/config`
- `GET /api/compliance/roster`
- `POST /api/compliance/watchlist/stream`
- `POST /api/compliance/investigate/stream`
- `POST /api/investment-research/stream`
- `POST /api/merchant-risk/stream`
- `GET /api/runs?kind=...`
- `GET /api/runs/{run_id}`

Temporary aliases preserve the previous `/api/roster`, `/api/watchlist/stream`, and `/api/investigate/stream` contracts.

## Architecture

```text
backend/
  app.py
  core/
    audit.py
    db.py
    llm.py
    tools.py
    research/              # one shared Tavily /research adapter + lane runner
    streaming/             # Search/Extract agent event adapter
  modules/
    compliance/
    investment_research/
    merchant_risk/

ui/src/
  components/layout/       # shared FSI shell
  components/shared/       # workstreams, sources, history
  hooks/                   # normalized workflow SSE state
  pages/                   # routed module experiences
```

Research prompts and Pydantic result contracts remain module-owned. The shared Research runtime is responsible only for calling Tavily, parsing upstream SSE, bounding concurrency, normalizing events, retaining partial results, and cancelling child work when a client disconnects.

See [`REFACTOR_PLAN.md`](REFACTOR_PLAN.md) for the staged architecture and remaining hardening work.

## Development checks

```bash
# Backend
.venv/bin/python -m compileall -q backend
.venv/bin/python -m unittest discover -s backend/tests -v

# Frontend
cd ui
bun run build
```

## Data and privacy

- Tavily credentials remain server-side.
- The shipped client roster is sample JSON under `backend/data/roster.json`.
- Run history is stored locally in SQLite and audit logs are written under `logs/`; both are gitignored.
- Do not submit confidential customer, transaction, portfolio, or case data to this demo without an approved data-handling design.
