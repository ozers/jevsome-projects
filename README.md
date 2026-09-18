# Jevsome Projects

> Open-source projects that **provably call** Jev, TypeSafe AI's System One model. Every entry links to the line of code that proves it. Browse: [jevsome.ozersubasi.com](https://jevsome.ozersubasi.com)

**49 verified projects · 602 more in the JSON · 1,512 search hits examined · refreshed 2026-09-18**

Deliberately short. Jev is days old and the ecosystem is mostly two-day-old experiments; this list starts with what can be shown to be real and grows from there. The bar is the same for every entry, and it is written down.

## How an entry gets here

1. **Discovery.** GitHub code and repository search, run against the API surface itself. Nothing is copied from another list.
2. **Proof.** The matching file is downloaded and the matching *line* is located and read. A call to `/v1/systemone`, an SDK import, a pinned `jev-latest` route or a declared dependency counts. A README sentence, a comment, a changelog entry, or a `package.json` whose own name happens to contain "jev" does not.
3. **Classification.** Keyword rules against the section definitions below. The Jev path is wired up and takes over once a `TYPESAFE_API_KEY` is configured.
4. **Subject, not support.** The repository exists because of Jev: created after the model went public, or naming Jev or TypeSafe in its title, description or topics. Frameworks that predate Jev and added it as one provider among many are kept in the JSON as candidates, not listed here.
5. **Real code.** The proof line is source, not a mock, a recorded cassette or a data file.
6. **Five stars.** Someone besides the author cared. A presentation floor, not a correctness one; it is one number in [`pipeline/lib/quality.mjs`](pipeline/lib/quality.mjs) and will come down as the list matures.
7. **Health.** Stars, licence, last commit and demo links are re-checked daily.

Search casts a wide net — "typesafe" matches a lot of repositories that have nothing to do with Jev. Every hit that is not on the list is recorded in [`data/not-listed.json`](data/not-listed.json): 848 where no line of code calling Jev was found, 13 where it was found but the repository is not a project built on Jev. Argue with any of it.

Generated from [`data/index.json`](data/index.json); do not edit by hand. See [CONTRIBUTING.md](CONTRIBUTING.md).

🟢 pushed in 30 days · 🟡 90 days · ⚪ older · 📦 archived · 🔗 no repository

## Contents

- [SDKs & clients](#sdks-clients) (4)
- [Integrations](#integrations) (1)
- [Agent tooling](#agent-tooling) (21)
- [Browser & computer use](#browser-computer-use) (5)
- [Applications](#applications) (9)
- [Games & simulation](#games-simulation) (4)
- [Demos & playgrounds](#demos-playgrounds) (3)
- [Benchmarks & research](#benchmarks-research) (2)

## SDKs & clients

**In this section:** A library whose whole purpose is talking to the System One API from one language or runtime: request signing, typed Choice/Score/Noul answers, retries.

**Not here:** Applications that happen to ship a thin wrapper, and provider adapters that live inside a larger framework (those are integrations).

| Project | What it does | Language | License | Stars | Proof | Status |
| --- | --- | --- | --- | --- | --- | --- |
| [typesafe-sdk-js](https://github.com/typesafe-ai/typesafe-sdk-js) | The official TypeScript/JavaScript library for the TypeSafe API | TypeScript | MIT | 101 | [README.md:16](https://github.com/typesafe-ai/typesafe-sdk-js/blob/66880ccded6cb642dc1809620c2b108c33730214/README.md#L16) | 🟢 |
| [system-one-adapter-python](https://github.com/typesafe-ai/system-one-adapter-python) | Drop-in TypeSafeClient replacement backed by LLM APIs | Python | MIT | 98 | [tests/cassettes/test_client_with_live_apis/test_live_typesafe_response_matches_reference_shape.json:7](https://github.com/typesafe-ai/system-one-adapter-python/blob/adffc2eab300a4fa3c0e92252d4ffd6ceaa53700/tests/cassettes/test_client_with_live_apis/test_live_typesafe_response_matches_reference_shape.json#L7) | 🟢 |
| [typesafe-sdk-python](https://github.com/typesafe-ai/typesafe-sdk-python) | The official Python library for the TypeSafe API | Python | MIT | 70 | [tests/test_retry.py:14](https://github.com/typesafe-ai/typesafe-sdk-python/blob/2ce5c65f13646cab6e6f782328194c9d85f3300a/tests/test_retry.py#L14) | 🟢 |
| [typesafeai-dotnet-sdk](https://github.com/saibimajdi/typesafeai-dotnet-sdk) | Community .NET SDK for the TypeSafe AI System One API — typed noul, choice, and score questions with structured, confidence-scored answers. Not affiliated with TypeSafe AI. | C# | MIT | 5 | [tests/TypeSafe.Sdk.Tests/ClientBehaviorTests.cs:28](https://github.com/saibimajdi/typesafeai-dotnet-sdk/blob/1acb4a7c1d469520e9235d5fc15146c5ff87abf9/tests/TypeSafe.Sdk.Tests/ClientBehaviorTests.cs#L28) | 🟢 |

_17 more in this section passed the proof check but not the rest of the bar — in [`data/index.json`](data/index.json) as candidates._

## Integrations

**In this section:** An existing framework, platform or product that gained Jev support: a provider, adapter or plugin inside a codebase that is not about Jev.

**Not here:** Standalone tools built around Jev from the start.

| Project | What it does | Language | License | Stars | Proof | Status |
| --- | --- | --- | --- | --- | --- | --- |
| [dspy-typesafeify](https://github.com/typesafeainate/dspy-typesafeify) | Add a decorator for dspy Signatures that automatically uses TypeSafe where relevant | Python | MIT | 58 | [pyproject.toml:49](https://github.com/typesafeainate/dspy-typesafeify/blob/main/pyproject.toml#L49) | 🟢 |

_7 more in this section passed the proof check but not the rest of the bar — in [`data/index.json`](data/index.json) as candidates._

## Agent tooling

**In this section:** Tools that sit in an AI agent or developer workflow and use typed decisions to act: tool-call gates, routers, guardrails, MCP servers, code review, CLIs.

**Not here:** General applications that merely call a model, and browser automation (its own section).

| Project | What it does | Language | License | Stars | Proof | Status |
| --- | --- | --- | --- | --- | --- | --- |
| [fast-jev-compaction](https://github.com/tamaratran/fast-jev-compaction) | Claude Code plugin that replaces the compaction summary with Jev decisions: every tool call and result is scored in one fast request, stale ones are dropped or truncated, everything kept stays verbatim. | TypeScript | MIT | 2,191 | [src/request.ts:3](https://github.com/tamaratran/fast-jev-compaction/blob/e3f262a7f4d42bd8dd32ced30d26176f7cb545b0/src/request.ts#L3) | 🟢 |
| [foreman](https://github.com/thruwire/foreman) | Software Factory Foreman based on TypeSafe Jev model | Python | MIT | 254 | [src/foreman/foreman/jev.py:91](https://github.com/thruwire/foreman/blob/2c439828b9fe45ee5d40f6f57be81f7ff1f8a140/src/foreman/foreman/jev.py#L91) | 🟢 |
| [jev-review](https://github.com/devagrawal09/jev-review) | A staged code-review workflow and local dashboard built with TypeSafe Jev. | TypeScript | MIT | 217 | [src/review/judgments.ts:2](https://github.com/devagrawal09/jev-review/blob/31f89602797fb7bea007f8a480bf368bf564954e/src/review/judgments.ts#L2) | 🟢 |
| [jev-router](https://github.com/gargpratyush/jev-router) | Route to the cheapest model in claude code for your task using jev-router | JavaScript | MIT | 109 | [src/router.mjs:1](https://github.com/gargpratyush/jev-router/blob/86660a0248eba0e4523f81645ac2925e9808c000/src/router.mjs#L1) | 🟢 |
| [jev-review](https://github.com/NiazMorshed2007/jev-review) | Local-first MCP plugin for continuous software-quality review by AI coding agents, powered by Jev. | TypeScript | MIT | 98 | [src/jev/client.ts:4](https://github.com/NiazMorshed2007/jev-review/blob/57690af54ef7d862c2483342c1e61c14dffcf727/src/jev/client.ts#L4) | 🟢 |
| [jev-mcp](https://github.com/jkudish/jev-mcp) | Proof of concept MCP for Typesafe's new Jev AI model | TypeScript | MIT | 59 | [src/provider.ts:7](https://github.com/jkudish/jev-mcp/blob/619abb58061934470bafb60217bead6db7f91d33/src/provider.ts#L7) | 🟢 |
| [pi-warden](https://github.com/DevMortimer/pi-warden) | Guardrails for Pi built on pi-typesafe that steer the agent instead of interrupting you: Jev judges irreversible and off-task tool calls, detects stuck loops, checks unverified done claims, flags slop | TypeScript | MIT | 56 | [tests/extension.test.ts:113](https://github.com/DevMortimer/pi-warden/blob/c523080c5729a07c2564a1bcee9ebc769af5fdb0/tests/extension.test.ts#L113) | 🟢 |
| [typesafe-mcp](https://github.com/itsmostafa/typesafe-mcp) | mcp connector to give your AI agent direct access to typesafe ai's jev model | Go | MIT | 51 | [cmd/evaluate/main.go:107](https://github.com/itsmostafa/typesafe-mcp/blob/2137d0268badd5622243424fa7993a12f3330691/cmd/evaluate/main.go#L107) | 🟢 |
| [pi-jev](https://github.com/y0usaf/pi-jev) | TypeSafe Jev as a decision layer for the Pi coding agent: a measured tool-call gate plus jev_ask for typed, calibrated answers | TypeScript | MIT | 37 | [src/client.ts:13](https://github.com/y0usaf/pi-jev/blob/b3478fd4ca1ac8ffcb703f6dc8d6069b555f531e/src/client.ts#L13) | 🟢 |
| [supercov](https://github.com/supercorp-ai/supercov) | Code quality and coverage for coding agents | Rust | MIT | 21 | [crates/supercov-cli/src/quality.rs:29](https://github.com/supercorp-ai/supercov/blob/50572733085a23002ef88961bc27bbf2e66e5163/crates/supercov-cli/src/quality.rs#L29) | 🟢 |
| [save-token-jev-clean](https://github.com/IAmUnbounded/save-token-jev-clean) | Portable, Jev-guided context compaction for coding agents. | TypeScript | MIT | 20 | [src/client.ts:5](https://github.com/IAmUnbounded/save-token-jev-clean/blob/a7007354a8d3747f06ff82130561edb2822a17df/src/client.ts#L5) | 🟢 |
| [agent-router](https://github.com/nidhi-singh02/agent-router) | CLI that picks Cursor, Claude Code, Codex, or OpenCode + model/effort for a task, then launches it. Powered by Jev and Herdr | TypeScript | MIT | 17 | [packages/router/src/semantic/task-classifier.ts:1](https://github.com/nidhi-singh02/agent-router/blob/e1cc3c1bf11b52f845422ef38f9fa190f9fc16fb/packages/router/src/semantic/task-classifier.ts#L1) | 🟢 |
| [hono-jev-router](https://github.com/yusukebe/hono-jev-router) | Route HTTP requests by meaning. A semantic router for Hono powered by Jev. | TypeScript | MIT | 13 | [src/index.ts:77](https://github.com/yusukebe/hono-jev-router/blob/04f6e103e1397bca659ab85c042011a1f14b679d/src/index.ts#L77) | 🟢 |
| [Jevbridge](https://github.com/gamesonrblx/Jevbridge) | ACP and MCP adapter that bridges TypeSafe Jev with any LLM — computer use and typed decisions alongside Codex, Claude, Grok, and OpenCode. | TypeScript | MIT | 11 | [src/types.ts:111](https://github.com/gamesonrblx/Jevbridge/blob/54c5587565cb346788d67805ef2412f46a21bb33/src/types.ts#L111) | 🟢 |
| [pi-typesafe](https://github.com/DevMortimer/pi-typesafe) | TypeSafe decisions for Pi: batched evaluation tool, terminal playground, and typed API for extension authors | TypeScript | MIT | 11 | [src/errors.ts:1](https://github.com/DevMortimer/pi-typesafe/blob/dfb9b0d3cfcf3c49daffbd01ca1eb4b77fb97f82/src/errors.ts#L1) | 🟢 |
| [jev-axi](https://github.com/shiftynick/jev-axi) | Agent-ergonomic CLI for TypeSafe's Jev: fast calibrated judgments (pick, rate, check, rank, triage, guard) from the shell | TypeScript | MIT | 8 | [src/state.ts:2](https://github.com/shiftynick/jev-axi/blob/00bd247709202f8935960544bbc90ce1a98612b0/src/state.ts#L2) | 🟢 |
| [pi-jev-auto-mode](https://github.com/jomatsu/pi-jev-auto-mode) | Jev (TypeSafe System One) backed auto mode for the Pi coding agent: semantically auto-approves bash, write, and edit tool calls and fails closed when a decision cannot be made. | TypeScript | MIT | 8 | [src/jev/transport.ts:100](https://github.com/jomatsu/pi-jev-auto-mode/blob/06a56043088124ed650471a8589fddd8139708f4/src/jev/transport.ts#L100) | 🟢 |
| [jev-browser](https://github.com/Ying-Kai-Liao/jev-browser) | Browser automation where an LLM plans and Jev (Typesafe System One) decides. Library, CLI and MCP server. | JavaScript | MIT | 7 | [src/jev.mjs:8](https://github.com/Ying-Kai-Liao/jev-browser/blob/b7118e8535b14fd524bc0509a3513e0d0a783a68/src/jev.mjs#L8) | 🟢 |
| [jev-mcp](https://github.com/blakestone-x/jev-mcp) | MCP server for TypeSafe Jev: typed classify, score, check, match and screen for any agent, with confidence on every answer | Python | MIT | 7 | [tests/test_client.py:7](https://github.com/blakestone-x/jev-mcp/blob/59289a0b472a3ebc3e9abfebba2d59ec2c881863/tests/test_client.py#L7) | 🟢 |
| [JevLint](https://github.com/huntedman/JevLint) | Configurable semantic linting powered by Jev, with file-level NOUL judgments and a magic-strings plugin. | TypeScript | MIT | 5 | [src/jev-client.ts:52](https://github.com/huntedman/JevLint/blob/96b9d693c6e7e9355b802d87f12354a2cbf405f9/src/jev-client.ts#L52) | 🟢 |
| [perch](https://github.com/lakeday-org/perch) | AST powered semantic code linting with Jev | JavaScript | MIT | 5 | [test/systemone.test.js:10](https://github.com/lakeday-org/perch/blob/3289b85d233d35aba4996bc56a2cf8394e146005/test/systemone.test.js#L10) | 🟢 |

_124 more in this section passed the proof check but not the rest of the bar — in [`data/index.json`](data/index.json) as candidates._

## Browser & computer use

**In this section:** Drives a browser, desktop or operating system, deciding what to click, type or do next from page or screen state.

**Not here:** Scrapers and extensions that never decide an action.

| Project | What it does | Language | License | Stars | Proof | Status |
| --- | --- | --- | --- | --- | --- | --- |
| [jev-ultrafast](https://github.com/browser-use/jev-ultrafast) | A browser agent with a dynamic, indexed action space. | Python | MIT | 3,969 | [jev_ultrafast/model.py:108](https://github.com/browser-use/jev-ultrafast/blob/452c1ad2dd628008f1d5608f28158d76e49e6cc0/jev_ultrafast/model.py#L108) | 🟢 |
| [typesafe-computer-use](https://github.com/awlevin/typesafe-computer-use) | Computer use for about $0.0002 a step: OCR the screen, classify the next action with TypeSafe, click. macOS. | Python | MIT | 184 | [pyproject.toml:26](https://github.com/awlevin/typesafe-computer-use/blob/main/pyproject.toml#L26) | 🟢 |
| [mobile-jev](https://github.com/droidrun/mobile-jev) | ▶ Watch the demo — Jev opens Uber, enters a route from San Francisco Airport to the Golden Gate Bridge, and reaches payment selection. The recorded task timer shows about 21 seconds for 9 actions. A completed booking is not demonstrated. | JavaScript | MIT | 71 | [scripts/mobile-agent/policy.mjs:157](https://github.com/droidrun/mobile-jev/blob/395fc222beac4f059f9a0beb337d114a2b066e99/scripts/mobile-agent/policy.mjs#L157) | 🟢 |
| [jev-browser](https://github.com/jkudish/jev-browser) | Browser use using Typesafe's Jev model | TypeScript | MIT | 45 | [src/questions.ts:4](https://github.com/jkudish/jev-browser/blob/257edfc19dfe5194c153ba94f351425630a46aeb/src/questions.ts#L4) | 🟢 |
| [jev-browser-use](https://github.com/wy-coliney/jev-browser-use) | 5–10x faster browser operations: Jev clicks, Codex thinks and verifies. Built at EZCollegeApp. | JavaScript | MIT | 17 | [skills/jev-browser-use/bridge.mjs:11](https://github.com/wy-coliney/jev-browser-use/blob/f2795fc278859ad0ff20b77626236050f82e9a22/skills/jev-browser-use/bridge.mjs#L11) | 🟢 |

_22 more in this section passed the proof check but not the rest of the bar — in [`data/index.json`](data/index.json) as candidates._

## Applications

**In this section:** A product or hosted service someone uses, where a Jev decision is part of what it does: moderation, triage, matching, scoring, pricing.

**Not here:** Examples and experiments with no users (those are demos), and internal libraries.

| Project | What it does | Language | License | Stars | Proof | Status |
| --- | --- | --- | --- | --- | --- | --- |
| [jev-trader](https://github.com/jarrodwatts/jev-trader) | One AI trade decision every Monad block. Jev on Kuru MON-USDC. | TypeScript | MIT | 707 | [src/config.ts:32](https://github.com/jarrodwatts/jev-trader/blob/b587759e459ea049590102e54a0b07800864cdc3/src/config.ts#L32) | 🟢 |
| [unclutter](https://github.com/kitze/unclutter) | WXT browser extension: Jev-powered page clutter removal with reusable template rules. | TypeScript | MIT | 62 | [lib/jev.ts:6](https://github.com/kitze/unclutter/blob/9ef9beccc1e57b4e3115ae68644b8fc9c19c29f6/lib/jev.ts#L6) | 🟢 |
| [typesafe-adblock](https://github.com/realZachi/typesafe-adblock) | 🧹 Fun project: a Chrome extension that asks a tiny AI decision model (TypeSafe Jev) "is this DOM element an ad?" and pops it off the page. BYOK, no backend, not a real ad blocker. | JavaScript | MIT | 40 | [src/typesafe.js:5](https://github.com/realZachi/typesafe-adblock/blob/7e067d243d87b7fe4d511653c0ddcd77b9beee18/src/typesafe.js#L5) | 🟢 |
| [youtube-sponsor-detection](https://github.com/trungdq88/youtube-sponsor-detection) | Detect youtube sponsor segment with live audio and transcript powered by Jev | JavaScript | — | 28 | [test/extension-background.test.js:32](https://github.com/trungdq88/youtube-sponsor-detection/blob/de01f0568d043035889a296a61ce21e0accc8b16/test/extension-background.test.js#L32) | 🟢 |
| [Jev-Moderation-Bot](https://github.com/brainstormity/Jev-Moderation-Bot) | A Discord moderation bot built with Python and TypeSafe AI (Jev System One). It filters spam and scam links in real time, escalates offenses automatically, and lets moderators profile members based on their message history. | Python | — | 21 | [profiler.py:16](https://github.com/brainstormity/Jev-Moderation-Bot/blob/1629ac80bea758883ee7541ffc654c83acfae4b6/profiler.py#L16) | 🟢 |
| [jev-shell-history](https://github.com/mrnugget/jev-shell-history) | Fish-style zsh history autosuggestions ranked by Jev (TypeSafe) | TypeScript | — | 15 | [src/suggest.ts:1](https://github.com/mrnugget/jev-shell-history/blob/4b2b75d26c0ccf5726263904514a22a8e11659ea/src/suggest.ts#L1) | 🟢 |
| [blink](https://github.com/ellipsis-dev/blink) | Codebase search powered by Jev from @typesafe-ai | TypeScript | — | 14 | [src/search.ts:3](https://github.com/ellipsis-dev/blink/blob/a621ede75649303a933828c18c27ad800bb43ef0/src/search.ts#L3) | 🟢 |
| [killmyidea](https://github.com/monteduro/killmyidea) | Describe your startup idea. Jev decides: kill it, fix it or ship it. | TypeScript | — | 12 | [src/lib/typesafe.ts:3](https://github.com/monteduro/killmyidea/blob/bc853421f2eb6f17da435621896dd6cd881a051c/src/lib/typesafe.ts#L3) | 🟢 |
| [Jev-Trades](https://github.com/zadescoxp/Jev-Trades) | Trading bot with the all new TypeSafe AI's first system one model named as Jev | Python | Apache-2.0 | 7 | [pipeline/paper_trader.py:30](https://github.com/zadescoxp/Jev-Trades/blob/01fb18e4484d626f03345eaff2b93b641677b786/pipeline/paper_trader.py#L30) | 🟢 |

_109 more in this section passed the proof check but not the rest of the bar — in [`data/index.json`](data/index.json) as candidates._

## Games & simulation

**In this section:** A game, robot controller or physics simulation where Jev reacts to game or sensor state, usually in a loop.

**Not here:** Game-themed demos with no running loop.

| Project | What it does | Language | License | Stars | Proof | Status |
| --- | --- | --- | --- | --- | --- | --- |
| [jevpilot](https://github.com/standardagents/jevpilot) | A playable Three.js driving simulator with Jev-powered autopilot | JavaScript | — | 47 | [server/jev.js:78](https://github.com/standardagents/jevpilot/blob/e1beeb13b9a928fb76f167f86af584f4ce9cf180/server/jev.js#L78) | 🟢 |
| [tsai-sc](https://github.com/phyous/tsai-sc) | TypeSafe Jev controls original StarCraft shareware through keyboard and mouse with recorded action probabilities. | Python | MIT | 11 | [tsai_sc/typesafe.py:24](https://github.com/phyous/tsai-sc/blob/6046ecc60156c4a3c04d384b41821a4ff08501b7/tsai_sc/typesafe.py#L24) | 🟢 |
| [mario-jev](https://github.com/shantanugoel/mario-jev) | A uv-managed Python prototype that plays NES Super Mario Bros. (level 1-1 by default). Jev receives structured RAM observations and answers focused questions about movement, starting a jump, and sustaining a jump, plus timing hops under low | Python | — | 10 | [tests/test_policy.py:5](https://github.com/shantanugoel/mario-jev/blob/14f0c289e48cd99e3b5b91353d0456fb1f32d499/tests/test_policy.py#L5) | 🟢 |
| [OneVOneJev](https://github.com/emrickgarrett/OneVOneJev) | 1v1 Jev quickscope arena — Three.js + TypeSafe System One | TypeScript | — | 5 | [server/src/jev.ts:7](https://github.com/emrickgarrett/OneVOneJev/blob/365b339d04446836352687b3650762106ea37f17/server/src/jev.ts#L7) | 🟢 |

_19 more in this section passed the proof check but not the rest of the bar — in [`data/index.json`](data/index.json) as candidates._

## Demos & playgrounds

**In this section:** Built to show or learn one thing: examples, playgrounds, starters, tutorials, weekend experiments.

**Not here:** Anything with real users or a published package.

| Project | What it does | Language | License | Stars | Proof | Status |
| --- | --- | --- | --- | --- | --- | --- |
| [jev-experiments](https://github.com/dabit3/jev-experiments) | TypeSafe / Jev latency-focused demos built by Devin. Each app lives in its own top-level directory with its own README, TESTING.md and screenshots. | TypeScript | — | 99 | [jev-lint/proxy.mjs:4](https://github.com/dabit3/jev-experiments/blob/de202df2e3810bc13760a84636611754dba73db0/jev-lint/proxy.mjs#L4) | 🟢 |
| [neo4jev](https://github.com/jexp/neo4jev) | Typesafe.ai System One Model Jev navigating a Neo4j graph by using a classifier over neighbouring relationships | Jupyter Notebook | MIT | 12 | [pyproject.toml:12](https://github.com/jexp/neo4jev/blob/main/pyproject.toml#L12) | 🟢 |
| [typesafe-ai-playground](https://github.com/BunsDev/typesafe-ai-playground) | Community TypeSafe AI playground: 110 use cases, games, dilemmas and model challenges, with editable prompts, A/B comparisons and a mobile-friendly UI. | TypeScript | MIT | 6 | [lib/serverJev.ts:35](https://github.com/BunsDev/typesafe-ai-playground/blob/4413426c4283865329a310baccb769d53be2801f/lib/serverJev.ts#L35) | 🟢 |

_29 more in this section passed the proof check but not the rest of the bar — in [`data/index.json`](data/index.json) as candidates._

## Benchmarks & research

**In this section:** Measures Jev: benchmarks, calibration studies, accuracy or latency comparisons, reproductions, datasets.

**Not here:** Projects that merely report a benchmark number in their README.

| Project | What it does | Language | License | Stars | Proof | Status |
| --- | --- | --- | --- | --- | --- | --- |
| [jev-eval-agent](https://github.com/vinilana/jev-eval-agent) | A personal-assistant agent built with eve (Vercel), with 100 mocked tools, served through OpenRouter. The repository exists to answer one question: how many steps does the agent need to finish the same task when the LLM picks the tool itsel | HTML | — | 76 | [agent/lib/jev-router.ts:1](https://github.com/vinilana/jev-eval-agent/blob/037de1120c84b4b63cdf748e2acf258ff66d7731/agent/lib/jev-router.ts#L1) | 🟢 |
| [jev-benchmarks](https://github.com/AbdelStark/jev-benchmarks) | Probability-aware evaluation for typed decision models: calibration, selective risk, latency, and reproducible benchmarks. | Python | Apache-2.0 | 6 | [tests/test_adapters.py:47](https://github.com/AbdelStark/jev-benchmarks/blob/0d610cc53e79bcbec691312b0c4adb4a0e371642/tests/test_adapters.py#L47) | 🟢 |

_31 more in this section passed the proof check but not the rest of the bar — in [`data/index.json`](data/index.json) as candidates._

## License

[MIT](LICENSE) — the pipeline, the site and the data. Linked projects keep their own licences.

Not affiliated with TypeSafe AI.
