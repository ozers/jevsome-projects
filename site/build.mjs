// Static site generator: data/index.json -> dist/.
// Only verified entries are rendered. The full index, candidates included, is
// published next to the page as projects.json for anyone who wants more.

import { cp, mkdir, readFile, writeFile } from 'node:fs/promises';
import { CATEGORIES, CATEGORY_ORDER } from '../pipeline/lib/taxonomy.mjs';

const at = (p) => new URL(`../${p}`, import.meta.url);
const SITE_URL = process.env.SITE_URL ?? 'https://jevsome.ozersubasi.com/';
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
  proof: e.proof && { kind: e.proof.kind, label: e.proof.label, url: e.proof.url, path: e.proof.path, line: e.proof.line, text: e.proof.text },
});

function page(index, css, js) {
  const { counts, generatedAt } = index;
  const entries = index.entries.filter((e) => e.tier === 'verified');
  const byCat = Object.fromEntries(CATEGORY_ORDER.map((c) => [c, entries.filter((e) => e.category === c).length]));
  const sections = CATEGORY_ORDER.filter((c) => byCat[c]).map((c) => ({
    key: c, label: CATEGORIES[c].label, what: CATEGORIES[c].what, not: CATEGORIES[c].not, count: byCat[c],
  }));
  const languages = Object.entries(entries.reduce((acc, e) => {
    if (e.language) acc[e.language] = (acc[e.language] ?? 0) + 1;
    return acc;
  }, {})).sort((a, b) => b[1] - a[1]).filter(([, n]) => n >= 3);
  const date = generatedAt.slice(0, 10);

  const chips = [
    `<button class="chip" data-category="all" aria-pressed="true">All<span class="n">${entries.length}</span></button>`,
    ...sections.map((s) =>
      `<button class="chip" data-category="${s.key}" aria-pressed="false" title="${esc(s.what)}">${esc(s.label)}<span class="n">${s.count}</span></button>`),
  ].join('\n        ');

  const langOptions = [
    '<option value="all">Any language</option>',
    ...languages.map(([l, n]) => `<option value="${esc(l)}">${esc(l)} (${n})</option>`),
  ].join('\n        ');

  // Readable without JavaScript, and what search engines index.
  const noscript = sections.map((s) => `<h2>${esc(s.label)}</h2><ul>${
    entries.filter((e) => e.category === s.key).map((e) =>
      `<li><a href="${esc(e.url)}">${esc(e.name)}</a> — ${esc(e.description ?? '')}</li>`).join('\n')
  }</ul>`).join('\n');

  return `<!doctype html>
<html lang="en">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<title>Jevsome Projects</title>
<meta name="description" content="${entries.length} open-source projects that provably call Jev, TypeSafe AI's System One model. Every entry links to the line of code that proves it.">
<link rel="canonical" href="${SITE_URL}">
<meta property="og:title" content="Jevsome Projects">
<meta property="og:description" content="${entries.length} projects that provably call Jev. Each entry links to the proof.">
<meta property="og:type" content="website">
<meta property="og:url" content="${SITE_URL}">
<link rel="icon" href="data:image/svg+xml,<svg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 100 100'><text y='.9em' font-size='90'>✓</text></svg>">
<style>${css}</style>
<script>
  // Apply a remembered theme before first paint so there is no flash.
  try { var t = localStorage.getItem('theme'); if (t === 'light' || t === 'dark') document.documentElement.dataset.theme = t; } catch (e) {}
</script>
</head>
<body>
<header class="top">
  <div class="top-inner">
    <a class="logo" href="${SITE_URL}">Jev<span>some</span></a>
    <nav>
      <a href="${REPO_URL}">GitHub</a>
      <a href="projects.json">JSON</a>
      <a href="${REPO_URL}/blob/main/CONTRIBUTING.md">Submit</a>
      <a href="https://typesafe.ai">About Jev</a>
      <button class="theme" id="theme" type="button" aria-label="Switch theme">Theme</button>
    </nav>
  </div>
</header>

<main>
  <section class="wrap hero">
    <h1>Projects that provably run on Jev.</h1>
    <p>Jev is TypeSafe AI's System One model: state and a typed question in, a constrained answer with a probability out. Every project here <strong>links to the line of code that makes the call</strong>. Mentions, forks, imitations and catalogues are left out, and what is left out is published too.</p>
    <div class="stats">
      <div class="stat"><b>${entries.length}</b><span>verified projects</span></div>
      <div class="stat"><b>${sections.length}</b><span>sections</span></div>
      <div class="stat"><b>${counts.examined.toLocaleString('en-US')}</b><span>repositories read</span></div>
      <div class="stat"><b>${date}</b><span>refreshed</span></div>
    </div>
  </section>

  <div class="controls" id="controls">
    <div class="controls-inner">
      <input id="q" type="search" placeholder="Search…" aria-label="Search projects">
      <select id="lang" aria-label="Language">
        ${langOptions}
      </select>
      <select id="sort" aria-label="Sort by">
        <option value="stars">Most stars</option>
        <option value="updated">Recently updated</option>
        <option value="newest">Newest</option>
        <option value="name">Name</option>
      </select>
    </div>
  </div>

  <div class="wrap">
    <div class="chips">
        ${chips}
    </div>
    <div class="summary">
      <span id="count"></span>
      <span><button class="link" id="clear" type="button">Clear filters</button> · ✓ = the file and line that proves the call</span>
    </div>
    <div id="grid"></div>
    <noscript>${noscript}</noscript>
  </div>
</main>

<footer>
  <div class="wrap">
    <p><strong>What "verified" means.</strong> The repository exists because of Jev — created after the model went public, or carrying its name. Its proof is a real line of product code: a call to <code>api.typesafe.ai</code>, an SDK import, a pinned <code>jev-latest</code> route, or a declared SDK dependency. Not a README sentence, a comment, a test, a mock, a catalogue entry, or a server that imitates the API. And at least five people besides the author starred it.</p>
    <p><strong>What else exists.</strong> ${counts.candidates.toLocaleString('en-US')} more repositories passed the proof check but not the rest — too new, or frameworks that added Jev as one provider among many. They are in <a href="projects.json">projects.json</a> with a <code>tier</code> field and surface here as the bar comes down. The remaining ${counts.unverified.toLocaleString('en-US')} repositories read are in <a href="${REPO_URL}/blob/main/data/not-listed.json">not-listed.json</a>: no line of code calling Jev was found in them.</p>
    <p>Refreshed daily from GitHub source archives. Nothing is copied from another list. Missing a project? <a href="${REPO_URL}/issues/new">Open an issue</a>. MIT · not affiliated with TypeSafe AI.</p>
  </div>
</footer>

<script>window.__JEVSOME__ = ${JSON.stringify({ entries: entries.map(slim), sections })};</script>
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
console.log(`site: dist/index.html with ${index.entries.filter((e) => e.tier === 'verified').length} verified entries`);
