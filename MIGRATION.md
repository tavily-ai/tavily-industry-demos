# Public demo migration

Imported on 2026-09-18 from Robert Tylman's local working checkouts. All six working trees were clean. Files were copied from the checked-out development branches, not from their default branches. Source repositories, their Git history, and original PR discussions remain available at the links below. This is a source snapshot import, not a transfer of GitHub PR objects or Git history.

| Demo | Local branch | Source commit | Included PRs |
| --- | --- | --- | --- |
| sales-meeting-prep | feat/demo-ui-polish | `56dc54d9f6305d59659c59757c4d1f9d3b38725a` | [#1](https://github.com/tavily-ai/sales-meeting-prep/pull/1) |
| company-research-agent | feat/research-ui-refresh | `04520846a797f0d570c276ca18da9f31693e2d3b` | [#73](https://github.com/guy-hartstein/company-research-agent/pull/73) |
| market-researcher | feat/streaming-portfolio-ui | `5ee60a578529cc54000f6ac8692e52a7818680e2` | [#43](https://github.com/tavily-ai/market-researcher/pull/43) |
| vendor-supply-chain-risk | feat/demo-ui-polish | `ab3dd357ec5e67be626b66a4b6f15a570100cf9c` | [#1](https://github.com/tavily-ai/vendor-supply-chain-risk/pull/1) |
| travel-hospitality-intelligence-agent | feat/research-ui-refresh | `181e5bec42e9d176bbb1423acbd5087c0c65f376` | [#5](https://github.com/tavily-ai/travel-hospitality-intelligence-agent/pull/5), [#6](https://github.com/tavily-ai/travel-hospitality-intelligence-agent/pull/6) |
| tavily-chat | feat/tavily-chat-demo-ui | `30da427ae0554f559af283f9741632360e97b262` | [#27](https://github.com/tavily-ai/tavily-chat/pull/27) |

Travel PR #5's head commit is an ancestor of the imported PR #6 branch, so both sets of changes are included.

## Other open source PRs

These PRs were open at migration time but are outside the selected local branches. Their changes have not been applied by this migration and can be reviewed separately:

- Travel dependency updates: [#1 nanoid](https://github.com/tavily-ai/travel-hospitality-intelligence-agent/pull/1), [#2 yaml](https://github.com/tavily-ai/travel-hospitality-intelligence-agent/pull/2), [#3 js-yaml](https://github.com/tavily-ai/travel-hospitality-intelligence-agent/pull/3), [#4 ajv](https://github.com/tavily-ai/travel-hospitality-intelligence-agent/pull/4).
- Third-party Tavily Chat contributions: [#8 Claude guidance](https://github.com/tavily-ai/tavily-chat/pull/8), [#21 privacy notice](https://github.com/tavily-ai/tavily-chat/pull/21).

## Monorepo operation

- Each demo retains its own dependencies, environment examples, assets, Docker files, and license where present. Existing `fsi-kit` files are unchanged.
- Run each demo from its own directory using its README. Deployment services must set that directory as their root/build context.
- Local secret files, installed dependencies, generated builds, and nested Git metadata are excluded.
- `.github` files inside demo folders are retained as source material; GitHub only executes root-level workflows. The root public-demo workflow runs the three Node test suites and builds all six primary UIs.
- Candidate Research, Legal & Regulatory Monitoring, Threat & Vulnerability Monitoring, Insurance, Shopping, and People Enrichment are not included. People Enrichment had no PUBLIC/LOGIN designation in the supplied list.
