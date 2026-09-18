# Contributing

This directory is generated. `README.md` and `data/index.json` are build output —
a pull request that edits them by hand will fail CI.

## The one rule

**Every entry points at the line of code that proves the call.** Not the repo,
not the README — the line. The pipeline downloads each candidate file and reads
the matching line before anything is listed. What counts:

1. A line that calls `https://api.typesafe.ai/v1/systemone`.
2. A line that imports a TypeSafe SDK, or invokes its client.
3. A line that pins a model route such as `jev-latest`.
4. A manifest that *declares* a TypeSafe SDK as a dependency — parsed as a
   dependency, so a `package.json` whose own name contains "jev" does not count.

What does not count, however often it is repeated: README prose, code comments,
changelog entries, a model catalogue listing Jev among a hundred models, an
`.env.example` on its own.

## Subject or support

Proof of a call answers "does it use Jev". It does not answer "is it a Jev
project". A gateway that speaks to a hundred models and a game that cannot run
without Jev both call the API.

The other directories in this ecosystem disagree on where that line sits. The
largest of them lists framework providers alongside single-purpose projects;
others set the bar at "a concrete Jev decision loop" or ask whether a repository
is "genuinely about Jev", and big multi-provider frameworks do not appear in
them at all.

This list keeps both and refuses to blur them:

- **Built on Jev** — created after Jev went public, or naming Jev or TypeSafe in
  its title, description or topics. It exists because the model does. These fill
  the sections of this README.
- **Supports Jev** — predates Jev and added it as one option among many. Real,
  worth knowing, and kept in its own section at the bottom, with a link to the
  file where Jev actually lives in that codebase.

Both are decided from repository metadata, not from an opinion about how
important the project is.

## The two shelves

Proof is the gate; it is not the whole question. A weekend experiment proven to
call Jev is real, and still should not sit next to a maintained library.

- **Listed** — something beyond the author points at it: stars, a licence, a
  live demo, or a described and tagged repository. These are in the README.
- **New** — proven, but with none of those signals yet. On the site behind the
  "show newer projects" toggle, and counted in the totals.

A project moves shelf on its own as the signals appear. Nothing is deleted for
being small.

## What is kept out

Even with proof, these are not projects built on Jev, and each rejection is
written to `data/rejected.json` with its reason:

- personal dotfiles and machine configs that happen to export an API key
- documentation repositories and model catalogues that describe the model
- unmodified forks with no traction of their own

## Adding a project

**A public GitHub repository:** you usually do not need to do anything. The daily
refresh searches GitHub code and repositories, and a repo with any of the evidence
above is picked up within a day. If yours was missed, open an issue with the link
and the file that proves the call — that is a pipeline bug worth fixing.

**Anything else** (hosted demo, playground, service with no public repo): add it to
[`data/seeds.yaml`](data/seeds.yaml).

```yaml
entries:
  - name: Typewriter
    url: https://example.val.run
    category: demo
    description: One line, in your own words, about what it does.
    evidence: "The about page states every keystroke is judged by jev-latest."
```

## Correcting an entry

Wrong category or a description taken from marketing copy? Add an override in
[`data/overrides.yaml`](data/overrides.yaml), keyed by lowercase `owner/repo`:

```yaml
someone/their-repo:
  category: agent-tooling
  description: What it actually does.
```

If a repo does not belong here at all, add it to [`data/blocklist.yaml`](data/blocklist.yaml)
with a reason. Exclusions are always recorded, never silent.

## Categories

`sdk` · `integration` · `agent-tooling` · `browser-computer-use` · `app` ·
`game-sim` · `demo` · `research` · `list` — defined in
[`pipeline/lib/taxonomy.mjs`](pipeline/lib/taxonomy.mjs). The same wording is sent to
Jev as `choice` criteria, so changing a description changes how things get classified.

## Running the pipeline locally

```bash
npm install
export GH_PAT=...              # code search needs a PAT
export TYPESAFE_API_KEY=...    # optional; without it, keyword rules classify
npm run refresh                # discover -> enrich -> classify -> health -> build
node site/build.mjs            # writes dist/
```

Single stages: `node pipeline/run.mjs classify build`.

A full discovery pass takes ~15 minutes — GitHub allows 10 code searches a minute.
`MAX_PAGES=1` gives a fast, partial run for development.

## Writing style

Descriptions are plain statements of what a project does. No "blazing fast", no
"revolutionary", no copied taglines. If an upstream README says
"the ultimate AI-powered decision engine", write what it actually is.

## Running in CI

The daily job needs two secrets:

| Secret | Required | What it is for |
| --- | --- | --- |
| `GH_PAT` | yes | GitHub code search. The token Actions provides cannot query that endpoint, so discovery falls back to repository search without it. A fine-grained PAT with public read access is enough. |
| `TYPESAFE_API_KEY` | no | Classification by Jev. Without it the keyword rules run and the README says so. |

`data/index.json` is the only generated file kept in git. The intermediate caches
(`candidates`, `repos`, `classified`, `health`) live in the Actions cache; losing
them only costs one slower run.
