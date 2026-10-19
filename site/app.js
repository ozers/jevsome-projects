// Client-side browsing over the published index. No framework, no build step:
// the data ships inline and the page stays readable without JavaScript.
//
// Two views. With nothing selected, projects are grouped by section, each
// section opening with its own rule and a dozen entries; "show all" expands
// one section in place. Any filter — a section chip, a language, a query —
// collapses to one flat, sorted grid. State lives in the URL hash so a view
// can be linked.

const data = window.__JEVSOME__;
const SECTIONS = data.sections;              // [{ key, label, what, not, count }]
const PREVIEW = 12;

const state = { q: '', cat: 'all', lang: 'all', sort: 'stars', open: new Set() };
const $ = (id) => document.getElementById(id);
const grid = $('grid');
const count = $('count');

// --- URL state -------------------------------------------------------------

function readHash() {
  const p = new URLSearchParams(location.hash.slice(1));
  state.q = p.get('q') ?? '';
  state.cat = p.get('cat') ?? 'all';
  state.lang = p.get('lang') ?? 'all';
  state.sort = SORTS[p.get('sort')] ? p.get('sort') : 'stars';
  if (!SECTIONS.some((s) => s.key === state.cat)) state.cat = 'all';
}

function writeHash() {
  const p = new URLSearchParams();
  if (state.q) p.set('q', state.q);
  if (state.cat !== 'all') p.set('cat', state.cat);
  if (state.lang !== 'all') p.set('lang', state.lang);
  if (state.sort !== 'stars') p.set('sort', state.sort);
  const next = p.toString() ? `#${p}` : location.pathname + location.search;
  history.replaceState(null, '', next);
}

// --- filtering -------------------------------------------------------------

const haystack = (e) =>
  [e.name, e.fullName, e.description, e.language, (e.topics || []).join(' ')]
    .filter(Boolean).join(' ').toLowerCase();

const SORTS = {
  stars: (a, b) => (b.stars ?? -1) - (a.stars ?? -1),
  updated: (a, b) => new Date(b.pushedAt ?? 0) - new Date(a.pushedAt ?? 0),
  newest: (a, b) => new Date(b.createdAt ?? 0) - new Date(a.createdAt ?? 0),
  name: (a, b) => a.name.localeCompare(b.name),
};

function matches(e) {
  const q = state.q.trim().toLowerCase();
  return (state.lang === 'all' || e.language === state.lang)
    && (!q || haystack(e).includes(q));
}

const filtering = () => state.cat !== 'all' || state.lang !== 'all' || state.q.trim() !== '';

// --- rendering -------------------------------------------------------------

function render() {
  const pool = data.entries.filter(matches).sort(SORTS[state.sort]);

  for (const chip of document.querySelectorAll('.chip')) {
    const key = chip.dataset.category;
    chip.setAttribute('aria-pressed', String(key === state.cat));
    const n = key === 'all' ? pool.length : pool.filter((e) => e.category === key).length;
    chip.querySelector('.n').textContent = n;
    chip.disabled = key !== 'all' && n === 0;
  }

  if (filtering()) {
    const list = state.cat === 'all' ? pool : pool.filter((e) => e.category === state.cat);
    const section = SECTIONS.find((s) => s.key === state.cat);
    count.textContent = `${list.length} of ${data.entries.length} projects`;
    grid.innerHTML = (section ? scope(section) : '')
      + (list.length
        ? `<div class="cards">${list.map(card).join('')}</div>`
        : '<p class="empty">Nothing matches. Try a broader search or clear a filter.</p>');
  } else {
    count.textContent = `${data.entries.length} projects in ${SECTIONS.length} sections`;
    grid.innerHTML = SECTIONS.map((s) => {
      const list = pool.filter((e) => e.category === s.key);
      if (!list.length) return '';
      const open = state.open.has(s.key);
      const shown = open ? list : list.slice(0, PREVIEW);
      const rest = list.length - shown.length;
      return `<section class="group" id="${s.key}">
        <header class="group-head">
          <h2>${esc(s.label)} <span class="n">${list.length}</span></h2>
          <p>${esc(s.what)}</p>
        </header>
        <div class="cards">${shown.map(card).join('')}</div>
        ${rest > 0 ? `<button class="more" data-open="${s.key}">Show all ${list.length} in ${esc(s.label)}</button>` : ''}
        ${open && list.length > PREVIEW ? `<button class="more" data-close="${s.key}">Show fewer</button>` : ''}
      </section>`;
    }).join('');
  }
  writeHash();
}

function scope(s) {
  return `<div class="scope"><b>${esc(s.label)}.</b> ${esc(s.what)} <span class="not">Not here: ${esc(s.not)}</span></div>`;
}

function ago(iso) {
  if (!iso) return '';
  const days = Math.floor((Date.now() - new Date(iso)) / 86_400_000);
  if (days < 1) return 'today';
  if (days < 30) return `${days}d ago`;
  if (days < 365) return `${Math.floor(days / 30)}mo ago`;
  return `${Math.floor(days / 365)}y ago`;
}

function card(e) {
  const p = e.proof;
  const file = p && p.path ? `${p.path.split('/').pop()}${p.line ? `:${p.line}` : ''}` : (p ? p.kind : '');
  const proofTitle = p ? `${p.label}${p.path ? ` — ${p.path}` : ''}${p.text ? `\n${p.text}` : ''}` : '';
  const proofHtml = p && p.url
    ? `<a class="proof" href="${esc(p.url)}" title="${esc(proofTitle)}"><span class="check">✓</span><span class="file">${esc(file)}</span></a>`
    : '';
  const home = e.homepage
    ? `<a class="site" href="${esc(e.homepage)}">${e.homepageLive === false ? 'site ↗ (down)' : 'site ↗'}</a>`
    : '';
  return `<article class="card">
    <h3><a href="${esc(e.url)}">${esc(e.name)}</a><span class="owner">${esc(e.owner ?? '')}</span></h3>
    <p>${esc(e.description || 'No description provided.')}</p>
    <div class="meta">
      ${e.language ? `<button class="tag lang" data-lang="${esc(e.language)}" title="Only ${esc(e.language)}">${esc(e.language)}</button>` : ''}
      ${e.stars != null ? `<span class="stars">★ ${e.stars.toLocaleString('en-US')}</span>` : ''}
      <span class="upd ${e.status}" title="last push">${ago(e.pushedAt)}</span>
      ${e.license ? `<span class="lic">${esc(e.license)}</span>` : ''}
      ${home}
    </div>
    ${proofHtml}
  </article>`;
}

function esc(s) {
  return String(s).replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
}

// --- wiring ----------------------------------------------------------------

readHash();
$('q').value = state.q;
$('sort').value = state.sort;
$('lang').value = state.lang;

$('q').addEventListener('input', (ev) => { state.q = ev.target.value; render(); });
$('sort').addEventListener('change', (ev) => { state.sort = ev.target.value; render(); });
$('lang').addEventListener('change', (ev) => { state.lang = ev.target.value; render(); });
for (const chip of document.querySelectorAll('.chip')) {
  chip.addEventListener('click', () => {
    state.cat = chip.dataset.category === state.cat ? 'all' : chip.dataset.category;
    render();
    if (state.cat !== 'all') $('controls').scrollIntoView({ block: 'start' });
  });
}
grid.addEventListener('click', (ev) => {
  const more = ev.target.closest('[data-open]');
  if (more) { state.open.add(more.dataset.open); render(); return; }
  const less = ev.target.closest('[data-close]');
  if (less) { state.open.delete(less.dataset.close); render(); $(less.dataset.close)?.scrollIntoView({ block: 'start' }); return; }
  const lang = ev.target.closest('[data-lang]');
  if (lang) { state.lang = lang.dataset.lang; $('lang').value = state.lang; render(); }
});
$('clear')?.addEventListener('click', () => {
  Object.assign(state, { q: '', cat: 'all', lang: 'all', sort: 'stars', open: new Set() });
  $('q').value = ''; $('sort').value = 'stars'; $('lang').value = 'all';
  render();
});
window.addEventListener('hashchange', () => { readHash(); $('q').value = state.q; $('sort').value = state.sort; $('lang').value = state.lang; render(); });
render();

// --- theme -----------------------------------------------------------------
// Follows the system until the visitor picks one: Auto -> Light -> Dark.
const themeBtn = $('theme');
const LABELS = { light: '☀ Light', dark: '☾ Dark' };
function paintThemeButton() {
  const chosen = document.documentElement.dataset.theme;
  themeBtn.textContent = chosen ? LABELS[chosen] : '◐ Auto';
  themeBtn.title = chosen ? `Theme: ${chosen}. Click to change.` : 'Theme follows your system. Click to override.';
}
themeBtn.addEventListener('click', () => {
  const chosen = document.documentElement.dataset.theme;
  const next = !chosen ? 'light' : chosen === 'light' ? 'dark' : null;
  try {
    if (next) { localStorage.setItem('theme', next); document.documentElement.dataset.theme = next; }
    else { localStorage.removeItem('theme'); delete document.documentElement.dataset.theme; }
  } catch {}
  paintThemeButton();
});
paintThemeButton();
