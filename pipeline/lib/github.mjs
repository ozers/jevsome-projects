// Minimal GitHub REST client: token auth, rate-limit awareness, retry with backoff.
// Search endpoints are heavily throttled (code search: 10 req/min), so every
// search call goes through a shared limiter.

const API = 'https://api.github.com';
const UA = 'jevsome-projects (+https://github.com/ozers/jevsome-projects)';

function token() {
  const t = process.env.GH_PAT || process.env.GITHUB_TOKEN;
  if (!t) throw new Error('No GitHub token. Set GH_PAT (code search needs a PAT) or GITHUB_TOKEN.');
  return t;
}

const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

let searchGate = Promise.resolve();
// Serialise search calls and space them out; code search allows 10/min.
function limitedSearch(fn, spacingMs) {
  const run = searchGate.then(async () => {
    const out = await fn();
    await sleep(spacingMs);
    return out;
  });
  searchGate = run.then(() => {}, () => {});
  return run;
}

export async function gh(path, { params, method = 'GET', accept } = {}) {
  const url = new URL(path.startsWith('http') ? path : API + path);
  for (const [k, v] of Object.entries(params ?? {})) url.searchParams.set(k, String(v));

  let longWaits = 0;
  for (let attempt = 0; attempt < 5; attempt++) {
    const res = await fetch(url, {
      method,
      headers: {
        authorization: `Bearer ${token()}`,
        accept: accept ?? 'application/vnd.github+json',
        'x-github-api-version': '2022-11-28',
        'user-agent': UA,
      },
    });

    if (res.status === 403 || res.status === 429) {
      // A 403 with quota left is a permission problem, not throttling: the
      // Actions token, for one, cannot use code search at all.
      const remaining = res.headers.get('x-ratelimit-remaining');
      if (res.status === 403 && remaining && Number(remaining) > 0) {
        throw new Error(`GitHub 403 on ${url.pathname} with quota left — the token lacks access. Set GH_PAT.`);
      }
      const retryAfter = Number(res.headers.get('retry-after') ?? 0);
      const reset = Number(res.headers.get('x-ratelimit-reset') ?? 0);
      const resetMs = reset ? Math.max(0, reset * 1000 - Date.now()) + 1000 : 0;
      const retryAfterMs = retryAfter > 0 ? retryAfter * 1000 : 0;
      // A 1s Retry-After while the quota window is still open burns the
      // attempt. When the quota is empty, wait for the reset instead.
      const waitMs = Math.max(retryAfterMs, remaining === '0' ? resetMs : 0) || resetMs || 2 ** attempt * 2000;
      // One ~12 minute penalty per call. A second one means this query is
      // stuck, and five of them used up the whole job before discovery finished.
      if (waitMs >= 60_000 && longWaits >= 1) {
        console.warn(`  rate limited on ${url.pathname}, not waiting again`);
        break;
      }
      if (waitMs >= 60_000) longWaits++;
      const capped = Math.min(waitMs, 15 * 60 * 1000);
      console.warn(`  rate limited on ${url.pathname}, waiting ${Math.ceil(capped / 1000)}s`);
      await sleep(capped);
      continue;
    }
    if (res.status === 404) return null;
    if (res.status >= 500) {
      await sleep(2 ** attempt * 1000);
      continue;
    }
    if (!res.ok) throw new Error(`GitHub ${res.status} ${url.pathname}: ${await res.text()}`);
    return (accept ?? '').includes('raw') ? res.text() : res.json();
  }
  throw new Error(`GitHub: gave up after retries on ${url.pathname}`);
}

export function searchRepos(q, { perPage = 100, page = 1, sort } = {}) {
  return limitedSearch(
    () => gh('/search/repositories', { params: { q, per_page: perPage, page, ...(sort ? { sort } : {}) } }),
    2_500, // repo search: 30/min
  );
}

export function searchCode(q, { perPage = 100, page = 1 } = {}) {
  return limitedSearch(
    () => gh('/search/code', {
      params: { q, per_page: perPage, page },
      accept: 'application/vnd.github.text-match+json',
    }),
    7_000, // code search: 10/min
  );
}

export const getRepo = (fullName) => gh(`/repos/${fullName}`);
export const getReadme = (fullName) =>
  gh(`/repos/${fullName}/readme`, { accept: 'application/vnd.github.raw' })
    .catch(() => null);
