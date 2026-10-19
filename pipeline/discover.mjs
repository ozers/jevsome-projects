// Stage 1 — discovery.
// Finds candidate repositories by searching GitHub itself, not by scraping other
// lists. Code-search hits double as evidence: a file that names the System One
// endpoint or an official SDK is proof the project actually calls Jev.

import { readFile, writeFile } from 'node:fs/promises';
import { parse } from 'yaml';
import { SearchPenalty, searchCode, searchRepos } from './lib/github.mjs';

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

async function save(store) {
  await writeFile(CANDIDATES, JSON.stringify(store, null, 2) + '\n');
}

async function pagedCode(store) {
  for (const { q, signal, weight } of CODE_QUERIES) {
    let found;
    try {
      found = await drainCode(store, q, signal, weight, MAX_PAGES);
    } catch (err) {
      // Code search is a bonus. Once GitHub hands out a penalty, every
      // further query earns another one; stop asking until tomorrow.
      console.warn(`  code ${q} -> skipped: ${err.message}`);
      if (err instanceof SearchPenalty) {
        console.warn('  code search penalised; remaining code queries skipped this run');
        return;
      }
      continue;
    }
    console.log(`  code ${q} -> ${found} hits`);

    if (found >= MAX_PAGES * 100 && FACET_PAGES > 0) {
      console.log('    capped, re-running by language');
      for (const lang of FACET_LANGUAGES) {
        try {
          const n = await drainCode(store, `${q} language:${lang}`, signal, weight, FACET_PAGES);
          if (n) console.log(`    ${lang}: ${n}`);
        } catch (err) {
          console.warn(`    ${lang}: skipped: ${err.message}`);
        }
      }
    }
    await save(store);
  }
}

async function pagedRepos(store) {
  for (const { q, signal } of REPO_QUERIES) {
    let found = 0;
    try {
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
    } catch (err) {
      console.warn(`  repo ${q} -> skipped: ${err.message}`);
    }
    await save(store);
  }
}

const SUBMISSIONS = new URL('../data/submissions.yaml', import.meta.url);

// Reported repositories enter as candidates like any search hit. The signal
// is recorded so verification knows to give them a scoped search.
async function addSubmissions(store) {
  let list = [];
  try { list = parse(await readFile(SUBMISSIONS, 'utf8'))?.repos ?? []; } catch {}
  for (const s of list) {
    if (!s?.repo) continue;
    touch(store, s.repo, { signal: 'submitted', weight: 1, url: `https://github.com/${s.repo}`, query: `issue #${s.issue ?? '?'}` });
  }
  if (list.length) console.log(`  submissions -> ${list.length}`);
}

// New repositories, by creation date. Repository search is lenient (30 a
// minute, no long penalties) and the ecosystem grows by new repos, so a
// rolling window catches what code search's first page never reaches.
const RECENT_DAYS = Number(process.env.RECENT_DAYS ?? 7);
const RECENT_TERMS = ['jev', 'typesafe', 'systemone', '"system one"'];

async function recentRepos(store) {
  const since = new Date(Date.now() - RECENT_DAYS * 86_400_000).toISOString().slice(0, 10);
  for (const term of RECENT_TERMS) {
    const q = `${term} created:>=${since}`;
    let found = 0;
    try {
      for (let page = 1; page <= 3; page++) {
        const res = await searchRepos(q, { page, sort: 'created' });
        const items = res?.items ?? [];
        for (const item of items) touch(store, item.full_name, { signal: 'recent', weight: 1, url: item.html_url, query: q });
        found += items.length;
        if (items.length < 100) break;
      }
      console.log(`  recent ${q} -> ${found}`);
    } catch (err) {
      console.warn(`  recent ${q} -> skipped: ${err.message}`);
    }
  }
}

// npm packages tagged for Jev, with their source repositories. Outside
// GitHub's limits entirely.
const NPM_KEYWORDS = ['jev', 'typesafe-ai', 'system-one', 'systemone'];

async function npmPackages(store) {
  for (const kw of NPM_KEYWORDS) {
    try {
      const url = `https://registry.npmjs.org/-/v1/search?size=250&text=${encodeURIComponent(`keywords:${kw}`)}`;
      const res = await fetch(url, { signal: AbortSignal.timeout(20_000) }).then((r) => r.json());
      let n = 0;
      for (const o of res.objects ?? []) {
        const m = (o.package.links?.repository ?? '').match(/github\.com\/([\w.-]+\/[\w.-]+?)(?:\.git)?(?:[/#?]|$)/);
        if (!m) continue;
        touch(store, m[1], { signal: 'npm', weight: 1, url: `https://www.npmjs.com/package/${o.package.name}`, query: `keywords:${kw}` });
        n++;
      }
      console.log(`  npm keywords:${kw} -> ${n}`);
    } catch (err) {
      console.warn(`  npm keywords:${kw} -> skipped: ${err.message}`);
    }
  }
}

export async function discover() {
  const store = await loadExisting();
  const before = Object.keys(store).length;
  console.log(`discover: starting from ${before} known candidates`);
  await addSubmissions(store);
  await recentRepos(store);
  await npmPackages(store);
  await save(store);
  // Code search is off unless asked for. It is the one GitHub API that hands
  // out ten-minute penalties, and everything it finds, the archive scan of a
  // repository found by cheaper means finds too.
  if (process.env.CODE_SEARCH === '1') await pagedCode(store);
  else console.log('  code search off (CODE_SEARCH=1 to enable)');
  await pagedRepos(store);
  const after = Object.keys(store).length;
  console.log(`discover: ${after} candidates (+${after - before} new)`);
  await save(store);
  return store;
}

if (import.meta.url === `file://${process.argv[1]}`) await discover();
