# AML/KYC Compliance Workbench

An evidence-first compliance workbench built with [Tavily](https://tavily.com) and LangChain. Two connected workflows:

- **Morning Watchlist** — daily adverse media screening across a 6-client roster, streamed live with triage verdicts (clear / review / escalate) and source-backed evidence.
- **Investigator Search** — one-off enhanced due diligence that produces a structured case file (legal name, HQ, NAICS, leadership, dated adverse findings with quoted passages, risk rating, recommended action).

A LangChain agent with Tavily Search + Extract tools generates its own risk queries from the entity context — no hardcoded keyword lists. Every agent step is written to a JSONL audit log on disk.

## Getting Started

### 1. Configure environment

```bash
cp .env.sample .env
```

Set your keys in `.env`:

```
TAVILY_API_KEY=tvly-your-key-here
OPENAI_API_KEY=sk-your-key-here   # for the LangChain chat model (backend/agents/llm.py)
```

### 2. Start the backend

```bash
uv venv .venv --python 3.11
uv pip install --python .venv/bin/python -r requirements.txt
.venv/bin/python backend/app.py
```

The API server starts at **http://localhost:8000**.

### 3. Start the frontend

In a separate terminal:

```bash
cd ui
bun install   # or npm install
bun dev       # or npm run dev
```

The UI opens at **http://localhost:5173**. Or use `./run.sh` to launch both in tmux.

## Usage

1. **Morning Watchlist** — click *Run screening*. Each client streams through planning → searching → reading articles → verdict. Flagged clients expand to show evidence with quoted passages and source links.
2. Click **Investigate →** on any flagged client to hand off to Investigator Search with the flag context attached.
3. **Investigator Search** — enter any entity name, address, phone, or keyword. The agent builds a full case file and streams its steps live.
4. **Audit trail** — the drawer in either view shows every query the agent issued, every source retrieved, and run completion with latency. Persisted to `logs/<run-id>.jsonl`.

## Project Structure

```
├── backend/
│   ├── app.py                    # FastAPI entry: /api/roster, /api/watchlist/stream, /api/investigate/stream
│   ├── models.py                 # Request models
│   ├── audit.py                  # JSONL audit trail
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
│       └── roster.json           # 6-client watchlist (real companies)
├── logs/                         # JSONL audit trails per run/case
└── ui/
    └── src/
        ├── App.tsx               # Shell + view switcher
        ├── sse.ts                # Shared SSE stream reader
        ├── types.ts
        └── components/
            ├── MorningWatchlist.tsx
            ├── InvestigatorSearch.tsx
            └── AuditTrailDrawer.tsx
```

## Environment Variables

| Variable         | Required | Description                                                  |
| ---------------- | -------- | ------------------------------------------------------------ |
| `TAVILY_API_KEY` | Yes      | Tavily API key for Search + Extract tools.                   |
| `OPENAI_API_KEY` | Yes      | API key for the LangChain chat model (default `openai:gpt-5`). |

To use a different model/provider, edit `MODEL` in `backend/agents/llm.py`.

## API

### `GET /api/roster`
Returns the watchlist clients.

### `POST /api/watchlist/stream`
Streams the daily screening as SSE. Optional body: `{"max_clients": 3}`.

### `POST /api/investigate/stream`
Streams one EDD investigation as SSE. Body: `{"query": "Canaccord Genuity", "flag_context": "…optional handoff note…"}`.
