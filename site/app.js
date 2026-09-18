// Client-side filtering over the published index. No framework, no build step:
// the page ships with the data inlined and stays usable without JavaScript.

const state = { q: '', category: 'all', sort: 'stars' };
const data = window.__JEVSOME__;
const grid = document.getElementById('grid');
const count = document.getElementById('count');

const haystack = (e) =>
  [e.name, e.fullName, e.description, e.language, (e.topics || []).join(' ')]
    .filter(Boolean).join(' ').toLowerCase();

const SORTS = {
  stars: (a, b) => (b.stars ?? -1) - (a.stars ?? -1),
  newest: (a, b) => new Date(b.createdAt ?? 0) - new Date(a.createdAt ?? 0),
  updated: (a, b) => new Date(b.pushedAt ?? 0) - new Date(a.pushedAt ?? 0),
  name: (a, b) => a.name.localeCompare(b.name),
};

function render() {
  const q = state.q.trim().toLowerCase();
  const list = data.entries
    .filter((e) => state.category === 'all' || e.category === state.category)
    .filter((e) => !q || haystack(e).includes(q))
    .sort(SORTS[state.sort]);

  count.textContent = `${list.length} project${list.length === 1 ? '' : 's'}`;
  grid.innerHTML = list.length
    ? list.map(card).join('')
    : '<p class="empty">Nothing matches. Try a broader search.</p>';
}

function card(e) {
  const proof = e.evidence && e.evidence[0];
  const proofHtml = proof && proof.source && proof.source.url
    ? `<a class="proof${e.evidenceStrength >= 3 ? '' : ' weak'}" href="${esc(proof.source.url)}" title="${esc(proof.label)}">${e.evidenceStrength >= 3 ? '✓' : '~'} ${esc(proof.kind)}</a>`
    : '';
  const home = e.homepage
    ? `<a href="${esc(e.homepage)}">${e.homepageLive === false ? 'site (down)' : 'site'}</a>`
    : '';
  return `<article class="card">
    <h3><a href="${esc(e.url)}">${esc(e.name)}</a>${e.owner ? ` <span class="owner">by ${esc(e.owner)}</span>` : ''}</h3>
    <p>${esc(e.description || 'No description provided.')}</p>
    <div class="meta">
      <span class="dot ${e.status}" title="${e.status}"></span>
      ${e.language ? `<span class="tag">${esc(e.language)}</span>` : ''}
      ${e.license ? `<span class="tag">${esc(e.license)}</span>` : ''}
      ${e.stars != null ? `<span class="stars">★ ${e.stars.toLocaleString('en-US')}</span>` : ''}
      ${proofHtml}
      ${home}
    </div>
  </article>`;
}

function esc(s) {
  return String(s).replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
}

document.getElementById('q').addEventListener('input', (ev) => { state.q = ev.target.value; render(); });
document.getElementById('sort').addEventListener('change', (ev) => { state.sort = ev.target.value; render(); });
for (const chip of document.querySelectorAll('.chip')) {
  chip.addEventListener('click', () => {
    state.category = chip.dataset.category;
    for (const c of document.querySelectorAll('.chip')) c.setAttribute('aria-pressed', String(c === chip));
    render();
  });
}
render();
