// Static site generator: data/index.json -> dist/.
// The entries are inlined so the page works from a file:// URL, and the same
// data is published as dist/projects.json for anyone who wants to consume it.

import { cp, mkdir, readFile, writeFile } from 'node:fs/promises';
import { CATEGORY_LABELS, CATEGORY_ORDER } from '../pipeline/lib/taxonomy.mjs';

const at = (p) => new URL(`../${p}`, import.meta.url);
const SITE_URL = process.env.SITE_URL ?? 'https://ozers.github.io/jevsome-projects/';
const REPO_URL = 'https://github.com/ozers/jevsome-projects';

const esc = (s) => String(s).replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));

// The page only needs what a card renders; the full record stays in projects.json.
const slim = (e) => ({
  name: e.name,
  fullName: e.fullName,
  owner: e.owner,
  url: e.url,
  homepage: e.homepage,
  homepageLive: e.homepageLive,
  description: e.description,
  category: e.category,
  language: e.language,
  license: e.license,
  stars: e.stars,
  topics: e.topics?.slice(0, 6),
  status: e.status,
  createdAt: e.createdAt,
  pushedAt: e.pushedAt,
  evidenceStrength: e.evidenceStrength,
  evidence: e.evidence?.slice(0, 1).map((x) => ({ kind: x.kind, label: x.label, source: { url: x.source?.url } })),
});

function page(index, css, js) {
  const { counts, entries, generatedAt } = index;
  const date = generatedAt.slice(0, 10);
  const chips = [
    `<button class="chip" data-category="all" aria-pressed="true">All<span class="n">${counts.total}</span></button>`,
    ...CATEGORY_ORDER.filter((c) => counts.byCategory[c]).map(
      (c) => `<button class="chip" data-category="${c}" aria-pressed="false">${esc(CATEGORY_LABELS[c])}<span class="n">${counts.byCategory[c]}</span></button>`,
    ),
  ].join('\n        ');

  // Rendered server-side too, so the list is readable without JavaScript and
  // indexable by search engines.
  const noscript = entries.slice(0, 200).map((e) =>
    `<li><a href="${esc(e.url)}">${esc(e.name)}</a> — ${esc(e.description ?? '')}</li>`).join('\n');

  return `<!doctype html>
<html lang="en">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<title>Jevsome Projects — evidence-backed directory of Jev projects</title>
<meta name="description" content="${counts.total} open-source projects that provably call Jev, TypeSafe AI's System One model. Each entry links to the code that proves it. Refreshed daily.">
<link rel="canonical" href="${SITE_URL}">
<meta property="og:title" content="Jevsome Projects">
<meta property="og:description" content="${counts.total} projects that provably call Jev. Each entry links to the proof.">
<meta property="og:type" content="website">
<meta property="og:url" content="${SITE_URL}">
<link rel="icon" href="data:image/svg+xml,<svg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 100 100'><text y='.9em' font-size='90'>✓</text></svg>">
<style>${css}</style>
</head>
<body>
<header class="top">
  <div class="top-inner">
    <div class="logo">Jev<span>some</span></div>
    <nav>
      <a href="${REPO_URL}">GitHub</a>
      <a href="projects.json">JSON API</a>
      <a href="${REPO_URL}/blob/main/CONTRIBUTING.md">Submit a project</a>
      <a href="https://typesafe.ai">What is Jev?</a>
    </nav>
  </div>
</header>

<main>
  <section class="wrap hero">
    <h1>Projects that provably run on Jev.</h1>
    <p>Jev is TypeSafe AI's System One model: it takes state plus a typed question and returns a constrained answer with a probability. This directory indexes what people build with it — and <strong>links to the code that proves each project actually calls it</strong>. Repositories that only mention Jev are left out.</p>
    <div class="stats">
      <div class="stat"><b>${counts.total}</b><span>projects</span></div>
      <div class="stat"><b>${counts.hardEvidence}</b><span>hard evidence</span></div>
      <div class="stat"><b>${counts.stars.toLocaleString('en-US')}</b><span>stars</span></div>
      <div class="stat"><b>${counts.byStatus.active}</b><span>active (30d)</span></div>
      <div class="stat"><b>${date}</b><span>last refresh</span></div>
    </div>
  </section>

  <div class="controls">
    <div class="controls-inner">
      <input id="q" type="search" placeholder="Search projects, languages, topics…" aria-label="Search projects">
      <select id="sort" aria-label="Sort by">
        <option value="stars">Most stars</option>
        <option value="updated">Recently updated</option>
        <option value="newest">Newest</option>
        <option value="name">Name</option>
      </select>
      <span id="count" class="stars"></span>
    </div>
    <div class="wrap">
      <div class="chips">
        ${chips}
      </div>
    </div>
  </div>

  <div class="wrap">
    <div id="grid" class="grid"></div>
    <noscript><ul>${noscript}</ul></noscript>
  </div>
</main>

<footer>
  <div class="wrap">
    <p><strong>How entries get here.</strong> A daily job searches GitHub code and repositories, keeps only projects where a file calls <code>/v1/systemone</code>, pins a <code>jev-latest</code> route or declares a TypeSafe SDK, then asks Jev itself to categorise each one. Stars, licences, last commit and demo links are re-checked on every run.</p>
    <p>Nothing here is copied from another list. Corrections and submissions: <a href="${REPO_URL}/issues/new">open an issue</a>.</p>
    <p>Community directory · CC0 1.0 · not affiliated with TypeSafe AI.</p>
  </div>
</footer>

<script>window.__JEVSOME__ = ${JSON.stringify({ entries: entries.map(slim), counts })};</script>
<script>${js}</script>
</body>
</html>
`;
}

const index = JSON.parse(await readFile(at('data/index.json'), 'utf8'));
const [css, js] = await Promise.all([
  readFile(at('site/styles.css'), 'utf8'),
  readFile(at('site/app.js'), 'utf8'),
]);

await mkdir(at('dist'), { recursive: true });
await writeFile(at('dist/index.html'), page(index, css, js));
await cp(at('data/index.json'), at('dist/projects.json'));
await writeFile(at('dist/.nojekyll'), '');
console.log(`site: dist/index.html with ${index.entries.length} entries`);
