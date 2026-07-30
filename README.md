# Tavily Industry Demos

Self-contained demo kits showcasing agentic workflows built with [Tavily](https://tavily.com), organized by industry and use case.

**Every folder is a complete, runnable project.** Grab just the kit you want — it has its own backend, frontend, environment setup, and docs.

## Kits

| Kit                                       | Industry            | Use case                                                        |
| ----------------------------------------- | ------------------- | --------------------------------------------------------------- |
| [fsi-compliance](fsi-compliance/)         | Financial services  | Compliance & Onboarding — adverse media screening + EDD case files |

## Use a kit

Each kit is self-contained. To take just one:

```bash
# Easiest — copies one folder, no git history
npx degit tavily-ai/tavily-industry-demos/fsi-compliance my-demo
```

Or with git sparse checkout:

```bash
git clone --filter=blob:none --sparse https://github.com/tavily-ai/tavily-industry-demos
cd tavily-industry-demos
git sparse-checkout set fsi-compliance
```

Then follow the kit's own README — for example, [fsi-compliance/README.md](fsi-compliance/README.md).

## Add a kit

1. Copy an existing kit folder and rename it.
2. Replace its data, prompts, and branding — each kit's README has a "Make it yours" section pointing at the right files.
3. Add a row to the table above, with the demo video link when it exists.

## License

[MIT](LICENSE)