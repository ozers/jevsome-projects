// Stage 1 — discovery.
// Finds candidate repositories by searching GitHub itself, not by scraping other
// lists. Code-search hits double as evidence: a file that names the System One
// endpoint or an official SDK is proof the project actually calls Jev.

import { readFile, writeFile } from 'node:fs/promises';
import { searchCode, searchRepos } from './lib/github.mjs';

// Strong signals: the code itself talks to the API.
export const CODE_QUERIES = [
  { q: '"api.typesafe.ai/v1/systemone"', signal: 'endpoint', weight: 3 },
  { q: '"jev-latest"', signal: 'model-route', weight: 3 },
  { q: '"@typesafe-ai/sdk"', signal: 'sdk-js', weight: 3 },
  { q: '"from typesafe import"', signal: 'sdk-python', weight: 3 },
  { q: '"typesafe.systemone"', signal: 'sdk-call', weight: 3 },
  { q: '"TYPESAFE_API_KEY"', signal: 'api-key', weight: 2 },
];

// Weak signals: the repo describes itself as Jev-related. Needs evidence later.
export const REPO_QUERIES = [
  { q: 'jev typesafe in:name,description,readme', signal: 'readme' },
  { q: 'topic:jev', signal: 'topic' },
  { q: 'topic:typesafe-ai', signal: 'topic' },
  { q: 'topic:system-one', signal: 'topic' },
  { q: '"system one" typesafe in:readme', signal: 'readme' },
];

const MAX_PAGES = Number(process.env.MAX_PAGES ?? 10);
const FACET_PAGES = Number(process.env.FACET_PAGES ?? 3);

// GitHub caps any search at 1000 results. A query that hits the cap is re-run
// split by language, which reaches repositories the first 1000 hid.
const FACET_LANGUAGES = [
  'TypeScript', 'JavaScript', 'Python', 'Rust', 'Go', 'Ruby', 'Elixir', 'PHP',
  'Java', 'C#', 'Swift', 'Kotlin', 'C++', 'Shell', 'HTML',
];
const CANDIDATES = new URL('../data/candidates.json', import.meta.url);

async function loadExisting() {
  try {
    return JSON.parse(await readFile(CANDIDATES, 'utf8'));
  } catch {
    return {};
  }
}

function touch(store, fullName, source) {
  const key = fullName.toLowerCase();
  const now = new Date().toISOString().slice(0, 10);
  const entry = (store[key] ??= { fullName, firstSeen: now, sources: [] });
  entry.fullName = fullName;
  entry.lastSeen = now;
  const dupe = entry.sources.find((s) => s.signal === source.signal && s.path === source.path);
  if (!dupe) entry.sources.push(source);
  return entry;
}

async function drainCode(store, q, signal, weight, maxPages) {
  let found = 0;
  for (let page = 1; page <= maxPages; page++) {
    const res = await searchCode(q, { page });
    const items = res?.items ?? [];
    for (const item of items) {
      touch(store, item.repository.full_name, {
        signal,
        weight,
        path: item.path,
        url: item.html_url,
        query: q,
      });
    }
    found += items.length;
    if (items.length < 100) break;
  }
  return found;
}

async function pagedCode(store) {
  for (const { q, signal, weight } of CODE_QUERIES) {
    let found;
    try {
      found = await drainCode(store, q, signal, weight, MAX_PAGES);
    } catch (err) {
      // Code search is the strongest signal but not the only one; a token
      // without access should still leave a usable run behind.
      console.warn(`  code ${q} -> skipped: ${err.message}`);
      continue;
    }
    console.log(`  code ${q} -> ${found} hits`);

    if (found >= MAX_PAGES * 100 && FACET_PAGES > 0) {
      console.log('    capped, re-running by language');
      for (const lang of FACET_LANGUAGES) {
        const n = await drainCode(store, `${q} language:${lang}`, signal, weight, FACET_PAGES);
        if (n) console.log(`    ${lang}: ${n}`);
      }
    }
  }
}

async function pagedRepos(store) {
  for (const { q, signal } of REPO_QUERIES) {
    let found = 0;
    for (let page = 1; page <= MAX_PAGES; page++) {
      const res = await searchRepos(q, { page });
      const items = res?.items ?? [];
      for (const item of items) {
        touch(store, item.full_name, { signal, weight: 1, url: item.html_url, query: q });
      }
      found += items.length;
      if (items.length < 100) break;
    }
    console.log(`  repo ${q} -> ${found} hits`);
  }
}

export async function discover() {
  const store = await loadExisting();
  const before = Object.keys(store).length;
  console.log(`discover: starting from ${before} known candidates`);
  await pagedCode(store);
  await pagedRepos(store);
  const after = Object.keys(store).length;
  console.log(`discover: ${after} candidates (+${after - before} new)`);
  await writeFile(CANDIDATES, JSON.stringify(store, null, 2) + '\n');
  return store;
}

if (import.meta.url === `file://${process.argv[1]}`) await discover();
