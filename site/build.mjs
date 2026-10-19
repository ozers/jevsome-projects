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
  const sections = CATEGORY_ORDER
    .map((c) => ({ key: c, label: CATEGORIES[c].label, what: CATEGORIES[c].what, not: CATEGORIES[c].not, count: entries.filter((e) => e.category === c).length }))
    .filter((s) => s.count);
  const languages = Object.entries(entries.reduce((acc, e) => {
    if (e.language) acc[e.language] = (acc[e.language] ?? 0) + 1;
    return acc;
  }, {})).sort((a, b) => b[1] - a[1]).filter(([, n]) => n >= 3);

  // The hero reel: real proof lines from the most-starred projects, one per
  // owner, short enough to read at a glance.
  const owners = new Set();
  const reel = entries
    .filter((e) => e.proof?.text && e.proof.line && e.proof.text.trim().length <= 90 && !/test|spec|example/i.test(e.proof.path ?? ''))
    .sort((a, b) => (b.stars ?? 0) - (a.stars ?? 0))
    .filter((e) => (owners.has(e.owner) ? false : owners.add(e.owner)))
    .slice(0, 8)
    .map(slim);

  const date = new Date(generatedAt).toLocaleDateString('en-GB', { day: 'numeric', month: 'long', year: 'numeric' });

  const options = (pairs, value) => pairs.map(([v, label]) => `<option value="${esc(v)}"${v === value ? ' selected' : ''}>${esc(label)}</option>`).join('');
  const catOptions = options([['all', 'All sections'], ...sections.map((s) => [s.key, `${s.label} (${s.count})`])], 'all');
  const langOptions = options([['all', 'Any language'], ...languages.map(([l, n]) => [l, `${l} (${n})`])], 'all');

  const noscript = sections.map((s) => `<h2>${esc(s.label)}</h2><ul>${
    entries.filter((e) => e.category === s.key).map((e) =>
      `<li><a href="${esc(e.url)}">${esc(e.name)}</a>: ${esc(e.description ?? '')}</li>`).join('')
  }</ul>`).join('');

  return `<!doctype html>
<html lang="en">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<title>Jevsome: projects that provably call Jev</title>
<meta name="description" content="${entries.length} open-source projects that call Jev, TypeSafe AI's System One model. Each entry shows the line of code that makes the call.">
<link rel="canonical" href="${SITE_URL}">
<meta property="og:title" content="Jevsome">
<meta property="og:description" content="${entries.length} projects that provably call Jev. Each one shows you the line.">
<meta property="og:type" content="website">
<meta property="og:url" content="${SITE_URL}">
<meta name="theme-color" content="#f2f4f7" media="(prefers-color-scheme: light)">
<meta name="theme-color" content="#0f1420" media="(prefers-color-scheme: dark)">
<link rel="icon" href="data:image/svg+xml,<svg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 32 32'><rect width='32' height='32' rx='8' fill='%232747c9'/><path d='M9 16.5l4.5 4.5L23 11.5' stroke='white' stroke-width='3.2' fill='none' stroke-linecap='round' stroke-linejoin='round'/></svg>">
<link rel="preconnect" href="https://fonts.googleapis.com">
<link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
<link href="https://fonts.googleapis.com/css2?family=Hanken+Grotesk:wght@400;500;600;700&family=JetBrains+Mono:wght@400;500&display=swap" rel="stylesheet">
<style>${css}</style>
<script>try{var t=localStorage.getItem('theme');if(t==='light'||t==='dark')document.documentElement.dataset.theme=t}catch(e){}</script>
</head>
<body>
<header class="bar">
  <div class="wrap">
    <a class="logo" href="${SITE_URL}"><span class="tick" aria-hidden="true">✓</span>jevsome</a>
    <nav>
      <a class="navlink hide-sm" href="#how">How it works</a>
      <a class="navlink hide-sm" href="projects.json">JSON</a>
      <a class="navlink" href="${REPO_URL}">GitHub</a>
      <button class="icon-btn" id="theme" type="button" aria-label="Theme">
        <svg class="i-auto" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" aria-hidden="true"><circle cx="12" cy="12" r="8"/><path d="M12 4v16" /><path d="M12 4a8 8 0 0 1 0 16z" fill="currentColor"/></svg>
        <svg class="i-light" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" aria-hidden="true"><circle cx="12" cy="12" r="4"/><path d="M12 2v2M12 20v2M4.9 4.9l1.4 1.4M17.7 17.7l1.4 1.4M2 12h2M20 12h2M4.9 19.1l1.4-1.4M17.7 6.3l1.4-1.4"/></svg>
        <svg class="i-dark" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" aria-hidden="true"><path d="M20 14.5A8 8 0 1 1 9.5 4a6.5 6.5 0 0 0 10.5 10.5z"/></svg>
      </button>
      <a class="btn" href="${REPO_URL}/issues/new">Submit<span class="hide-sm">a project</span></a>
    </nav>
  </div>
</header>

<main>
  <section class="wrap hero">
    <div>
      <h1>${entries.length} projects that call Jev. Each one shows you the line.</h1>
      <p>Jev is TypeSafe AI's System One model: state and a typed question in, a constrained answer with a probability out. This is a directory of open-source code that uses it, where every entry is backed by the exact line that makes the call.</p>
      <ul class="facts">
        <li><b>${counts.examined.toLocaleString('en-US')}</b> repositories read</li>
        <li><b>${sections.length}</b> sections</li>
        <li>Updated <b>${esc(date)}</b></li>
      </ul>
    </div>
    <figure class="panel" id="panel" aria-label="Proof lines from listed projects" style="margin:0">
      <div class="panel-body" id="panel-body">
        <div class="panel-head"><a class="repo" id="panel-repo" href="#"></a><span class="stars" id="panel-stars"></span></div>
        <div class="panel-file" id="panel-file"></div>
        <div class="panel-code" aria-live="polite"><span class="ln" id="panel-line"></span><span class="src" id="panel-src"></span></div>
        <div class="panel-why"><p class="kind" id="panel-kind"></p><p class="what" id="panel-what"></p></div>
      </div>
      <figcaption class="panel-foot"><a id="panel-open" href="#">Open this line on GitHub</a><span class="dots" id="dots"></span></figcaption>
    </figure>
  </section>

  <div class="directory"><div class="wrap body">
    <aside class="rail" aria-label="Filters">
      <h2>Sections</h2>
      <ul id="cats"></ul>
      <h2>Language</h2>
      <ul id="langs"></ul>
    </aside>
    <section>
      <div class="controls" id="controls">
        <label class="search">
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" aria-hidden="true"><circle cx="11" cy="11" r="7"/><path d="M20 20l-3.5-3.5"/></svg>
          <input id="q" type="search" placeholder="Search projects" aria-label="Search projects" autocomplete="off">
          <kbd>/</kbd>
        </label>
        <select id="cat-select" class="only-narrow" aria-label="Section">${catOptions}</select>
        <select id="lang-select" class="only-narrow" aria-label="Language">${langOptions}</select>
        <label class="sort"><span>Sort</span>
          <select id="sort" aria-label="Sort">
            <option value="stars">Most stars</option>
            <option value="updated">Recently updated</option>
            <option value="newest">Newest</option>
            <option value="name">Name</option>
          </select>
        </label>
      </div>
      <div class="list-head" aria-live="polite"><h2 id="list-title">All projects</h2><span class="count" id="count"></span></div>
      <p class="rule" id="rule" hidden></p>
      <ul class="rows" id="rows"></ul>
      <div class="empty" id="empty" hidden>
        <p>No listed project matches that.</p>
        <button class="reset" id="empty-reset" type="button">Clear search and filters</button>
      </div>
      <button class="more" id="more" type="button" hidden></button>
      <noscript>${noscript}</noscript>
    </section>
  </div></div>

  <section class="how" id="how">
    <div class="wrap">
      <h2>How a project gets listed</h2>
      <ol>
        <li><h3>Found</h3><p>Every day, new repositories, npm packages and reported projects are collected. Nothing is copied from another list.</p></li>
        <li><h3>Proven</h3><p>The source archive is read file by file. A call to api.typesafe.ai, an SDK import, a pinned jev model or a declared dependency counts. A README sentence, a comment, a test or a server imitating the API does not.</p></li>
        <li><h3>Listed</h3><p>The project exists because of Jev, the proof sits in product code, and at least five people starred it. ${counts.candidates.toLocaleString('en-US')} more pass the proof but not the rest yet; they are in the JSON.</p></li>
      </ol>
      <p class="after">Repositories that were read but not listed are published with the reason in <a href="${REPO_URL}/blob/main/data/not-listed.json">not-listed.json</a>. Missing a project? <a href="${REPO_URL}/issues/new">Open an issue</a> with the file that makes the call.</p>
    </div>
  </section>
</main>

<footer>
  <div class="wrap">
    <span>Community directory, not affiliated with TypeSafe AI.</span>
    <span><a href="${REPO_URL}">Source</a> under MIT. <a href="projects.json">Full data as JSON</a>.</span>
  </div>
</footer>

<script>window.__JEVSOME__ = ${JSON.stringify({ entries: entries.map(slim), sections, languages, reel })};</script>
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
