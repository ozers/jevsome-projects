// Browsing over the published index. No framework, no build step; the data
// ships inline and the page reads fine without JavaScript.
// State lives in the URL hash, so any view can be linked.

const data = window.__JEVSOME__;
const SECTIONS = data.sections;
const LANGS = data.languages;
const PAGE = 40;
const $ = (id) => document.getElementById(id);

const state = { q: '', cat: 'all', lang: 'all', sort: 'stars', shown: PAGE };

// ---- highlighting: mark the part of a proof line that makes it a proof ----

const PROOF_TOKEN = /https?:\/\/api\.typesafe\.ai[^"'`\s,)]*|@typesafe-ai\/[\w-]+|\btypesafe[-_]sdk\b|\bTypeSafeClient\b|\bsystem_?[oO]ne\b|~?(?:typesafe[/:])?jev-(?:latest|\d[\w.]*)|\bfrom\s+typesafe\w*|\bTYPESAFE_API_KEY\b/;

function esc(s) {
  return String(s).replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
}

function marked(text) {
  const t = String(text ?? '').trim();
  const m = t.match(PROOF_TOKEN);
  if (!m) return esc(t);
  const i = m.index;
  return esc(t.slice(0, i)) + '<mark>' + esc(m[0]) + '</mark>' + esc(t.slice(i + m[0].length));
}

// ---- URL state ------------------------------------------------------------

const SORTS = {
  stars: (a, b) => (b.stars ?? -1) - (a.stars ?? -1),
  updated: (a, b) => new Date(b.pushedAt ?? 0) - new Date(a.pushedAt ?? 0),
  newest: (a, b) => new Date(b.createdAt ?? 0) - new Date(a.createdAt ?? 0),
  name: (a, b) => a.name.localeCompare(b.name),
};

function readHash() {
  const p = new URLSearchParams(location.hash.slice(1));
  state.q = p.get('q') ?? '';
  state.cat = SECTIONS.some((s) => s.key === p.get('cat')) ? p.get('cat') : 'all';
  state.lang = LANGS.some(([l]) => l === p.get('lang')) ? p.get('lang') : 'all';
  state.sort = SORTS[p.get('sort')] ? p.get('sort') : 'stars';
  state.shown = PAGE;
}

function writeHash() {
  const p = new URLSearchParams();
  if (state.q) p.set('q', state.q);
  if (state.cat !== 'all') p.set('cat', state.cat);
  if (state.lang !== 'all') p.set('lang', state.lang);
  if (state.sort !== 'stars') p.set('sort', state.sort);
  history.replaceState(null, '', p.toString() ? `#${p}` : location.pathname);
}

// ---- filtering ------------------------------------------------------------

const hay = (e) => [e.name, e.owner, e.description, e.language, (e.topics || []).join(' ')].join(' ').toLowerCase();
const byQuery = (e) => !state.q.trim() || hay(e).includes(state.q.trim().toLowerCase());
const byLang = (e) => state.lang === 'all' || e.language === state.lang;
const byCat = (e) => state.cat === 'all' || e.category === state.cat;

// ---- rendering ------------------------------------------------------------

function ago(iso) {
  if (!iso) return '';
  const d = Math.floor((Date.now() - new Date(iso)) / 86_400_000);
  if (d < 1) return 'updated today';
  if (d < 30) return `updated ${d}d ago`;
  if (d < 365) return `updated ${Math.floor(d / 30)}mo ago`;
  return `updated ${Math.floor(d / 365)}y ago`;
}

function row(e) {
  const p = e.proof || {};
  const loc = p.path ? `${p.path.split('/').pop()}:${p.line ?? ''}` : p.kind;
  return `<li class="row">
    <h3><a href="${esc(e.url)}">${esc(e.name)}</a><span class="owner">${esc(e.owner ?? '')}</span></h3>
    ${e.stars != null ? `<span class="stars">★ ${e.stars.toLocaleString('en-US')}</span>` : ''}
    <p class="desc">${esc(e.description || 'No description.')}</p>
    ${p.url ? `<a class="proof" href="${esc(p.url)}" title="${esc(`${p.label ?? ''} — ${p.path ?? ''}`)}">
      <span class="loc">${esc(loc)}</span><code class="src">${marked(p.text)}</code></a>` : ''}
    <div class="meta">
      ${e.language ? `<button class="lang" data-lang="${esc(e.language)}" title="Show only ${esc(e.language)}">${esc(e.language)}</button>` : ''}
      <span class="${e.status === 'active' ? 'fresh' : ''}">${ago(e.pushedAt)}</span>
      ${e.license ? `<span>${esc(e.license)}</span>` : ''}
      ${e.homepage ? `<a href="${esc(e.homepage)}">${e.homepageLive === false ? 'Website (unreachable)' : 'Website'}</a>` : ''}
    </div>
  </li>`;
}

function renderFacets() {
  const base = data.entries.filter(byQuery);
  const catPool = base.filter(byLang);
  const langPool = base.filter(byCat);

  $('cats').innerHTML = [['all', 'All projects', catPool.length], ...SECTIONS.map((s) => [s.key, s.label, catPool.filter((e) => e.category === s.key).length])]
    .map(([k, label, n]) => `<li><button class="facet" data-cat="${k}" aria-pressed="${k === state.cat}" ${n === 0 && k !== state.cat ? 'disabled' : ''}>${esc(label)}<span class="n">${n}</span></button></li>`).join('');
  $('langs').innerHTML = [['all', 'Any language', langPool.length], ...LANGS.map(([l]) => [l, l, langPool.filter((e) => e.language === l).length])]
    .map(([k, label, n]) => `<li><button class="facet" data-lang-facet="${esc(k)}" aria-pressed="${k === state.lang}" ${n === 0 && k !== state.lang ? 'disabled' : ''}>${esc(label)}<span class="n">${n}</span></button></li>`).join('');

  $('cat-select').value = state.cat;
  $('lang-select').value = state.lang;
}

function render() {
  renderFacets();
  const list = data.entries.filter(byQuery).filter(byLang).filter(byCat).sort(SORTS[state.sort]);
  const section = SECTIONS.find((s) => s.key === state.cat);
  const filtered = state.cat !== 'all' || state.lang !== 'all' || state.q.trim();

  $('list-title').textContent = section ? section.label : state.lang !== 'all' ? `${state.lang} projects` : 'All projects';
  $('count').textContent = `${list.length} ${list.length === 1 ? 'project' : 'projects'}${section && state.lang !== 'all' ? ` in ${state.lang}` : ''}`;
  $('rule').innerHTML = section ? `${esc(section.what)} <span class="not">Not here: ${esc(section.not)}</span>` : '';
  $('rule').hidden = !section;

  const shown = list.slice(0, state.shown);
  $('rows').innerHTML = shown.map(row).join('');
  $('rows').hidden = !shown.length;
  $('empty').hidden = shown.length > 0;
  $('empty-reset').hidden = !filtered;
  const rest = list.length - shown.length;
  $('more').hidden = rest <= 0;
  $('more').textContent = `Show ${Math.min(rest, PAGE)} more of ${rest}`;
  writeHash();
}

// ---- wiring ---------------------------------------------------------------

function sync() { $('q').value = state.q; $('sort').value = state.sort; }
function set(patch) { Object.assign(state, patch, { shown: PAGE }); render(); }
function toList() { const y = $('controls').offsetTop; if (scrollY > y) scrollTo({ top: y }); }

readHash(); sync();

$('q').addEventListener('input', (e) => set({ q: e.target.value }));
$('sort').addEventListener('change', (e) => set({ sort: e.target.value }));
$('cat-select').addEventListener('change', (e) => set({ cat: e.target.value }));
$('lang-select').addEventListener('change', (e) => set({ lang: e.target.value }));
$('cats').addEventListener('click', (e) => { const b = e.target.closest('[data-cat]'); if (b) { set({ cat: b.dataset.cat }); toList(); } });
$('langs').addEventListener('click', (e) => { const b = e.target.closest('[data-lang-facet]'); if (b) { set({ lang: b.dataset.langFacet }); toList(); } });
$('rows').addEventListener('click', (e) => { const b = e.target.closest('[data-lang]'); if (b) { set({ lang: b.dataset.lang }); toList(); } });
$('more').addEventListener('click', () => { state.shown += PAGE; render(); });
for (const id of ['reset', 'empty-reset']) $(id)?.addEventListener('click', () => { set({ q: '', cat: 'all', lang: 'all' }); sync(); });
addEventListener('hashchange', () => { readHash(); sync(); render(); });
addEventListener('keydown', (e) => {
  if (e.key === '/' && document.activeElement?.tagName !== 'INPUT') { e.preventDefault(); $('q').focus(); }
});
render();

// ---- proof panel: one real line at a time ----------------------------------

const reel = data.reel;
const panel = $('panel-body');
const dots = $('dots');
let at = 0;
let timer = null;
const still = matchMedia('(prefers-reduced-motion: reduce)').matches;

function paint(i) {
  const e = reel[i];
  const p = e.proof;
  $('panel-repo').textContent = e.fullName;
  $('panel-repo').href = e.url;
  $('panel-stars').textContent = e.stars != null ? `★ ${e.stars.toLocaleString('en-US')}` : '';
  $('panel-file').textContent = p.path;
  $('panel-line').textContent = p.line;
  $('panel-src').innerHTML = marked(p.text);
  $('panel-open').href = p.url;
  $('panel-kind').textContent = `Counts because it ${p.label ?? 'calls Jev'}.`;
  $('panel-what').textContent = e.description ?? '';
  for (const [n, d] of [...dots.children].entries()) d.setAttribute('aria-current', String(n === i));
}

function go(i, animate = true) {
  at = (i + reel.length) % reel.length;
  if (!animate || still) { paint(at); return; }
  panel.classList.add('swap');
  setTimeout(() => { paint(at); panel.classList.remove('swap'); }, 220);
}

function play() { if (!still) timer = setInterval(() => go(at + 1), 4200); }
function pause() { clearInterval(timer); timer = null; }

dots.innerHTML = reel.map((e, i) => `<button type="button" aria-label="Show ${esc(e.fullName)}"></button>`).join('');
dots.addEventListener('click', (e) => { const i = [...dots.children].indexOf(e.target); if (i >= 0) { pause(); go(i); } });
$('panel').addEventListener('mouseenter', pause);
$('panel').addEventListener('mouseleave', () => { if (!timer) play(); });
$('panel').addEventListener('focusin', pause);
go(0, false);
play();

// ---- theme: system until chosen; Auto -> Light -> Dark ---------------------

const themeBtn = $('theme');
function paintTheme() {
  const t = document.documentElement.dataset.theme;
  themeBtn.textContent = t === 'light' ? 'Light' : t === 'dark' ? 'Dark' : 'Auto';
  themeBtn.title = t ? `Theme: ${t}. Click to change.` : 'Theme follows your system. Click to change.';
}
themeBtn.addEventListener('click', () => {
  const t = document.documentElement.dataset.theme;
  const next = !t ? 'light' : t === 'light' ? 'dark' : null;
  try {
    if (next) { localStorage.setItem('theme', next); document.documentElement.dataset.theme = next; }
    else { localStorage.removeItem('theme'); delete document.documentElement.dataset.theme; }
  } catch {}
  paintTheme();
});
paintTheme();
