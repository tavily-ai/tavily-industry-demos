# FSI Intelligence Kit Refactor Plan


## Current execution status

- [x] Renamed the distributable project to `fsi-kit` and updated root metadata/docs.
- [x] Extracted backend core services and module-owned Compliance code with legacy API aliases.
- [x] Added one shared, asynchronous Tavily Research `mini` runtime with bounded lane orchestration, typed outputs, partial failures, source deduplication, and cancellation cleanup.
- [x] Added Investment Research and Merchant Risk backend vertical slices and persisted run history.
- [x] Added React Router, the shared FSI shell, module landing page, routed Compliance pages, and structured Investment/Merchant experiences.
- [x] Added mocked Research/runtime/API tests and production frontend build verification.
- [x] Run credentialed live-demo QA on an investment-policy brief and an identity-first Apple Store merchant case.
- [ ] Tune prompts and report semantics from the observed live Research results; no quality optimization was included in the integration fix.
- [ ] Add recorded demo fixtures and remaining lifecycle/history hardening from Phase 5.

## Goal

Turn the existing AML/KYC demo into one routed Financial Services Intelligence Kit with three focused modules:

1. Compliance Intelligence — Morning Watchlist and Investigator Search
2. Investment Research — parallel Tavily Research workstreams producing a meeting brief
3. Merchant Risk — public-web merchant enrichment producing evidence-backed review context

The existing compliance behavior remains functional while shared infrastructure is extracted. New research workflows use Tavily Research `mini`; Search + Extract remains available where exact verification passages matter.

## Architecture decisions

- One distributable `fsi-kit` project, not three copied applications.
- Domain-specific frontend pages and API routes over shared backend services.
- Browser routes are URL-addressable and support refresh/back/deep links.
- Tavily credentials stay in the backend.
- One shared asynchronous `/research` adapter and bounded lane orchestrator.
- Prompts, JSON Schemas, Pydantic results, and UI reports remain module-owned.
- A normalized outer event envelope supports both LangChain Search/Extract workflows and Tavily Research workflows.
- Research uses `mini`; Investment Research fans out predictable lanes and synthesizes their structured results. Merchant Risk resolves identity before risk lanes.

## Target routes

### Frontend

- `/` — kit/module landing page
- `/compliance/watchlist`
- `/compliance/investigator`
- `/investment-research`
- `/merchant-risk`

### Backend

- `GET /api/modules`
- `GET /api/config`
- `POST /api/compliance/watchlist/stream`
- `POST /api/compliance/investigate/stream`
- `POST /api/investment-research/stream`
- `POST /api/merchant-risk/stream`
- `GET /api/runs`
- `GET /api/runs/{run_id}`

Legacy compliance paths may remain as temporary aliases during migration.

## Phases

### Phase 1 — Rename and establish module boundaries

- Rename `fsi-compliance` to `fsi-kit` and update repository/package documentation.
- Move reusable backend code under `backend/core` and compliance code under `backend/modules/compliance`.
- Introduce FastAPI routers without changing the existing compliance response behavior.
- Split frontend shell, shared components, and compliance feature state.
- Add React Router and real routes.

Verification:
- Backend imports successfully.
- Existing compliance endpoints still work, including aliases.
- Frontend TypeScript and Vite production build pass.

### Phase 2 — Shared Tavily Research runtime

- Add one async Tavily Research streaming client.
- Add typed normalized research events and SSE encoding.
- Add bounded parallel lane orchestration with source deduplication and disconnect cleanup.
- Validate structured lane results and errors.
- Keep all module prompts and schemas outside the core runtime.

Verification:
- Unit tests cover upstream SSE parsing, structured deltas, lane completion, partial failure, and cancellation.
- No browser-supplied Tavily key.

### Phase 3 — Investment Research

- Add meeting-brief input/result schemas.
- Add predictable `mini` lanes: official/policy, economic data, market expectations, implications, and scenarios/counter-thesis.
- Stream lane progress and sources.
- Synthesize completed lanes into a structured meeting brief while retaining source provenance.
- Add routed live-workstream and meeting-brief UI with history.

Verification:
- Fixture-driven UI renders every report section.
- Mocked backend run produces typed lane and final events.
- Live run degrades gracefully if one lane fails.

### Phase 4 — Merchant Risk

- Add merchant input with required name/category and recommended domain/country.
- Resolve the merchant web identity first with a focused LangChain agent with Tavily Search + Extract, then hand the verified scope to Research lanes.
- Launch bounded risk lanes for category fit, restricted products, reputation/business practices, and legal/regulatory context.
- Add web-context level, identity confidence, evidence coverage, gaps, and next-check UI.

Verification:
- The workflow never treats missing public-web evidence as low risk.
- Identity ambiguity is visible and prevents silent entity merging.
- Fixture and mocked-stream tests pass.

### Phase 5 — Hardening and polish

- Persist started/running/completed/partial/failed/cancelled lifecycle states.
- Preserve submitted input, lane errors, sources, versions, and partial results in history.
- Add stable demo presets and recorded fixtures.
- Correct documentation, demo copy, model labels, and limitations.
- Add accessibility and navigation checks.

## Execution order for this change set

1. Rename and documentation foundation.
2. Backend module/core separation with compatibility routes.
3. Frontend router/shell separation.
4. Shared Tavily Research client and lane orchestrator.
5. Investment Research vertical slice.
6. Merchant Risk vertical slice.
7. Tests, docs, and demo fixtures.

## Non-goals for the initial demo

- Production authentication or authorization
- Real scheduling or background job infrastructure
- Transaction/chargeback inference from public-web data
- Investment recommendations or automated underwriting decisions
- SSE reconnection/resume across server restarts
