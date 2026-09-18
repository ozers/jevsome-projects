// Stage 4 — liveness.
// A directory that links to dead demos is worse than no directory. Every
// homepage is probed once per run and the result is kept with the entry.

import { readFile, writeFile } from 'node:fs/promises';

const REPOS = new URL('../data/repos.json', import.meta.url);
const HEALTH = new URL('../data/health.json', import.meta.url);
const TIMEOUT_MS = 10_000;
const CONCURRENCY = 8;

async function probe(url) {
  const started = Date.now();
  for (const method of ['HEAD', 'GET']) {
    try {
      const res = await fetch(url, {
        method,
        redirect: 'follow',
        signal: AbortSignal.timeout(TIMEOUT_MS),
        headers: { 'user-agent': 'jevsome-projects link checker' },
      });
      if (res.status === 405 && method === 'HEAD') continue;
      return { url, status: res.status, ok: res.ok, ms: Date.now() - started, checkedAt: new Date().toISOString() };
    } catch (err) {
      if (method === 'GET') {
        return { url, status: 0, ok: false, error: err.name, ms: Date.now() - started, checkedAt: new Date().toISOString() };
      }
    }
  }
  return { url, status: 0, ok: false, error: 'unreachable', checkedAt: new Date().toISOString() };
}

export async function health() {
  const repos = JSON.parse(await readFile(REPOS, 'utf8'));
  const store = {};
  const targets = Object.entries(repos)
    .filter(([, r]) => !r.gone && r.homepage)
    .map(([key, r]) => [key, r.homepage.startsWith('http') ? r.homepage : `https://${r.homepage}`]);

  console.log(`health: probing ${targets.length} homepages`);
  for (let i = 0; i < targets.length; i += CONCURRENCY) {
    const batch = targets.slice(i, i + CONCURRENCY);
    const results = await Promise.all(batch.map(([, url]) => probe(url)));
    batch.forEach(([key], n) => { store[key] = results[n]; });
  }

  const live = Object.values(store).filter((h) => h.ok).length;
  console.log(`health: ${live}/${targets.length} homepages live`);
  await writeFile(HEALTH, JSON.stringify(store, null, 2) + '\n');
  return store;
}

if (import.meta.url === `file://${process.argv[1]}`) await health();
