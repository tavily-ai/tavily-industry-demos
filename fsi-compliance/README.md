# AML/KYC Compliance Workbench

An evidence-first compliance workbench built with [Tavily](https://tavily.com). Use it as a starting point for experimenting with agentic adverse-media screening and due diligence.

Two connected workflows:

- **Morning Watchlist** — daily adverse media screening across a client roster, streamed live with triage verdicts (clear / review / escalate) and source-backed evidence.
- **Investigator Search** — one-off enhanced due diligence that produces a structured case file (legal name, HQ, NAICS, leadership, dated adverse findings with quoted passages, risk rating, recommended action).

A LangChain agent with Tavily Search + Extract tools generates its own risk queries from the entity context — no hardcoded keyword lists. Every agent step is written to a JSONL audit log on disk, and completed runs are stored in a local SQLite database so you can reload past results without re-running agents.

> **This is a demo / experimentation base, not a compliance product.** The sample roster references real companies, but all verdicts, findings, and risk ratings are LLM-generated for demonstration purposes only. Do not use the output for actual compliance decisions.

## Quickstart

### Prerequisites

- [uv](https://docs.astral.sh/uv/) (Python 3.11+)
- [bun](https://bun.sh) (or npm, but the repo is pinned to `bun.lock`)
- A [Tavily API key](https://app.tavily.com) and a [Nebius Token Factory](https://tokenfactory.nebius.com/) API key

### 1. Configure environment

```bash
cp .env.sample .env
```

Set your keys in `.env`:

```
TAVILY_API_KEY=tvly-your-key-here
NEBIUS_API_KEY=your-nebius-key-here
```

### 2. Start the backend

```bash
uv sync
uv run backend/app.py
```

The API server starts at **http://localhost:8000** (`GET /` returns a health check).

### 3. Start the frontend

In a separate terminal:

```bash
cd ui
bun install
bun dev
```

The UI opens at **http://localhost:5173**.

> **Tip:** `./run.sh` launches both processes in a tmux session.

## Usage

1. **Morning Watchlist** — click *Run screening*. Each client streams through planning → searching → reading articles → verdict. Flagged clients expand to show evidence with quoted passages and source links.
2. Click **Investigate →** on any flagged client to hand off to Investigator Search with the flag context attached.
3. **Investigator Search** — enter any entity name, address, phone, or keyword. The agent builds a full case file and streams its steps live.
4. **Audit trail** — the drawer in either view shows every query the agent issued, every source retrieved, and run completion with latency. Past runs reload from history without re-executing.

## Make it yours

This repo is lightweight and designed to be cloned and adapted. The main extension points:

### Bring your own client roster

The watchlist screens whatever `load_roster()` returns (`backend/watchlist.py`). The shipped `backend/data/roster.json` is just sample data — replace the JSON file, or rewire `load_roster()` to pull from your own systems: a CRM, customer database, onboarding queue, or internal knowledge base. Each client only needs an `id`, `name`, and optional context fields (`country`, `industry`, `known_context`) that get fed into the agent's planning prompt.

### Add internal knowledge sources

The agents' tools live in `backend/agents/tools.py` (Tavily Search + Extract for the public web). To ground screening in *your* data — prior case files, KYC documents, internal watchlists, transaction notes — add retriever tools over those sources alongside the web tools. The prompts in `backend/agents/prompts.py` already instruct the agent to cite its sources, so internal evidence flows into verdicts and case files the same way web evidence does.

### Swap the model

`backend/agents/llm.py` is the single place where the chat model is constructed. It uses Nebius Token Factory via `ChatNebius` — change `MODEL` to any model id from the [Nebius catalog](https://tokenfactory.nebius.com/models).

### Tune the agents

Screening and investigation behavior is prompt-driven (`backend/agents/prompts.py`), with structured outputs defined in `backend/agents/schemas.py`. Adjust verdict criteria, risk ratings, or the case file shape there.

## Project Structure

```
├── pyproject.toml                # Python project + dependencies (managed with uv)
├── uv.lock                       # Locked dependency graph
├── backend/
│   ├── app.py                    # FastAPI entry: streaming + roster + run history endpoints
│   ├── models.py                 # Request models
│   ├── audit.py                  # JSONL audit trail (logs/<run-id>.jsonl)
│   ├── db.py                     # SQLite run history (backend/data/runs.db, gitignored)
│   ├── watchlist.py              # Roster loader + parallel screening runner
│   ├── agents/
│   │   ├── llm.py                # Chat model construction (swap provider/model here)
│   │   ├── tools.py              # Shared TavilySearch + TavilyExtract tools
│   │   ├── prompts.py            # Screening + investigation system prompts
│   │   ├── schemas.py            # ScreeningVerdict + CaseFile structured outputs
│   │   ├── screening.py          # Screening agent factory
│   │   └── investigation.py      # Investigation agent factory
│   ├── streaming/
│   │   └── agent_stream.py       # LangChain agent events -> SSE
│   └── data/
│       └── roster.json           # Sample 6-client watchlist (replace with your own)
├── logs/                         # JSONL audit trails per run/case (gitignored)
├── run.sh                        # Launch backend + frontend in tmux
└── ui/
    └── src/
        ├── App.tsx               # Shell + view switcher + run history
        ├── sse.ts                # Shared SSE stream reader (VITE_API_URL)
        ├── types.ts
        └── components/
            ├── MorningWatchlist.tsx
            ├── InvestigatorSearch.tsx
            └── ActivityFeed.tsx
```

## Environment Variables

### Backend

| Variable         | Required | Description                                                        |
| ---------------- | -------- | ------------------------------------------------------------------ |
| `TAVILY_API_KEY` | Yes      | Tavily API key for Search + Extract tools.                         |
| `NEBIUS_API_KEY` | Yes      | API key for [Nebius Token Factory](https://tokenfactory.nebius.com/) (`moonshotai/Kimi-K2.5` via `ChatNebius` by default — see `backend/agents/llm.py`). |

### Frontend

| Variable       | Required | Description                                             |
| -------------- | -------- | ------------------------------------------------------- |
| `VITE_API_URL` | No       | Backend URL. Defaults to `http://localhost:8000`.       |

## API

### `GET /`
Health check.

### `GET /api/roster`
Returns the watchlist clients.

### `POST /api/watchlist/stream`
Streams the daily screening as SSE. Optional body: `{"max_clients": 3}`.

### `POST /api/investigate/stream`
Streams one EDD investigation as SSE. Body: `{"query": "Canaccord Genuity", "flag_context": "…optional handoff note…"}`.

### `GET /api/runs?kind=watchlist|investigation&limit=50`
Lists past runs (metadata only), newest first.

### `GET /api/runs/{run_id}`
Fetches one past run with its full results payload.

## Data & Audit

- **Audit logs** — every agent step is appended to `logs/<run-id>.jsonl` (gitignored).
- **Run history** — completed runs persist to `backend/data/runs.db` (gitignored) and are served via `/api/runs*`. Delete the file to start fresh; it is recreated on the next run.

## License

[MIT](LICENSE)
