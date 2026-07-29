# Demo Script — AML/KYC Compliance Workbench

Target length: ~3 minutes. Two workflows, one story: **scheduled triage at scale + investigator-driven deep dives, every finding traced to a retrieved source.**

## Before you record (rehearsal checklist)

1. Backend + frontend running (`./run.sh`, or backend on :8000 and `bun dev` in `ui/`).
2. Keys in `.env`: `TAVILY_API_KEY`, `OPENAI_API_KEY`.
3. Do one full rehearsal run the same day — adverse media results are live, so confirm the 4 hit-clients still surface (Canaccord Genuity, Adani Enterprises, FirstEnergy, HealthSplash). Keep the browser on the Morning Watchlist view, roster loaded.
4. Close notifications, use a clean browser window at ~1440px wide.

---

## Beat 1 — The problem (0:00–0:15)
**Shot:** Morning Watchlist view, roster of 6 clients visible.

> "Every morning, a bank's compliance team has to screen its client book against the open web for adverse media — bribery, sanctions, money laundering, fraud. This workbench does that triage automatically, and every finding is backed by a retrieved source."

## Beat 2 — Run the daily screening (0:15–0:50)
**Shot:** Click **Run screening**. Let the per-client status chips tick (planning → searching → reading articles). Hover/expand one in-progress row to show the live query.

> "At 6 AM the watchlist runs. For each client, an agent decides its own risk queries based on the entity's country and industry — there's no hardcoded keyword list. Tavily Search finds the articles, Tavily Extract reads them, and the model confirms the coverage is actually about *this* entity before flagging it."

## Beat 3 — Triage board + evidence (0:50–1:30)
**Shot:** Run completes — summary counts appear (X clear / Y review / Z escalate). Expand **Canaccord Genuity** (escalate) and **Adani Enterprises**; scroll the quoted passages and source links.

> "Clients come back triaged — clear, review, escalate. Expand a flag and you see exactly why: the FinCEN penalty against Canaccord, the OFAC settlement against Adani — each with the verbatim passage and the source. Nothing is a black box."

## Beat 4 — Handoff to investigation (1:30–2:30)
**Shot:** Click **Investigate Canaccord Genuity →** — view switches, entity pre-filled, flag context banner shown. Click **Investigate**. Show the live stage line, then the case file: identity card (legal name, HQ, NAICS, leadership), findings with severity, risk rating, recommended action.

> "When an analyst needs to go deeper, one click hands the entity off to Investigator Search, flag context attached. The agent now builds a full enhanced-due-diligence case file — corporate profile, leadership, dated findings with severity, an overall risk rating, and a recommended next step. Investigators can also search anything directly — a name, an address, a phone number."

## Beat 5 — Close (2:30–2:45)
**Shot:** Case file on screen, scroll the agent queries at the bottom.

> "Scheduled monitoring at scale, plus on-demand investigation — grounded in real-time web retrieval, with every claim traceable to a source. That's what compliance agents look like in production."

---

## Fallback / retake notes

- If a live call hangs mid-take: **Stop** button cancels the run; re-run. Tavily Search latency is typically <1s, agent runs are ~30–60s per client (4 run concurrently).
- If a hit-client comes back unexpectedly clean that day, re-run — or expand **FirstEnergy** as an alternate; the roster has redundancy.
- `logs/<run-id>.jsonl` files persist after each run — you can scroll a previous audit trail on camera even if a re-record is needed.
