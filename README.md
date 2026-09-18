<p align="center">
  <a href="https://www.tavily.com">
    <picture>
      <source media="(prefers-color-scheme: dark)" srcset="assets/tavily-full-on-dark.svg">
      <img alt="Tavily" src="assets/tavily-full.svg" width="280">
    </picture>
  </a>
</p>

<h1 align="center">Industry Demos</h1>

<p align="center">
  Self-contained demo kits showcasing agentic workflows built with <a href="https://tavily.com">Tavily</a>, organized by industry and use case.
</p>

<p align="center">
  <a href="https://tavily.com"><img alt="Built with Tavily" src="https://img.shields.io/badge/built_with-Tavily-FF7300"></a>
  <a href="LICENSE"><img alt="License: MIT" src="https://img.shields.io/badge/license-MIT-1F1E1E"></a>
  <img alt="Kits: 7" src="https://img.shields.io/badge/kits-7-817FFF">
</p>

---

> **Customizable starters** These kits are designed for you to adapt their prompts, schemas, sources, models, policies, UI, and controls to your use case. Validate generated results and add appropriate safeguards before production use.

**Every folder is a complete, runnable project.** Grab just the kit you want — it has its own backend, frontend, environment setup, and docs.

## Kits

| Kit                 | Industry                       | Use case                                                        |
| ------------------- | ------------------------------ | --------------------------------------------------------------- |
| [fsi-kit](fsi-kit/) | Financial Services & Insurance | Compliance, investment research, and merchant-risk intelligence |
| [sales-meeting-prep](sales-meeting-prep/) | Sales & GTM | Web-sourced meeting briefs and customer context |
| [company-research-agent](company-research-agent/) | Product & Competitive Intelligence | Company briefings and market research |
| [market-researcher](market-researcher/) | Finance | Cited stock portfolio and investment research |
| [vendor-supply-chain-risk](vendor-supply-chain-risk/) | Risk | Vendor events and supply-chain disruptions |
| [travel-hospitality-intelligence-agent](travel-hospitality-intelligence-agent/) | Travel & Hospitality | Destination trends, demand, and disruptions |
| [tavily-chat](tavily-chat/) | AI Assistants | Streaming web-grounded chat with citations |

The six imported demos use the latest local development branches, including the author's open PR changes. See [MIGRATION.md](MIGRATION.md) for source commits and PR provenance.

## Use a kit

Each kit is self-contained. To take just one:

```bash
# Easiest — copies one folder, no git history
npx degit tavily-ai/tavily-industry-demos/fsi-kit my-demo
```

Or with git sparse checkout:

```bash
git clone --filter=blob:none --sparse https://github.com/tavily-ai/tavily-industry-demos
cd tavily-industry-demos
git sparse-checkout set fsi-kit
```

Then follow the kit's own README — for example, [fsi-kit/README.md](fsi-kit/README.md).

For any other demo, replace `fsi-kit` above with its folder name, then `cd` into that folder before following its README. Install dependencies and build from the individual demo directory. Docker build contexts and deployment root directories must also point to that demo's folder. Demos may use the same default ports; run them separately or configure different ports.

## Add a kit

1. Copy an existing kit folder and rename it.
2. Replace its data, prompts, and branding — each kit's README has a "Make it yours" section pointing at the right files.
3. Add a row to the table above, with the demo video link when it exists.

## License

[MIT](LICENSE)
