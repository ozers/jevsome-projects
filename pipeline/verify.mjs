// Stage 2b — verification.
// Discovery says "this file matched". That is not good enough: GitHub's index
// is stale, a match can sit in a comment, and a package.json whose *own name*
// contains "jev" looked exactly like a declared dependency. So every entry's
// evidence file is fetched and the matching line is located and read. What
// cannot be pointed at, line and all, does not count.

import { readFile, writeFile } from 'node:fs/promises';
import { searchCode } from './lib/github.mjs';
import { rate } from './lib/evidence.mjs';

const REPOS = new URL('../data/repos.json', import.meta.url);
const VERIFIED = new URL('../data/verified.json', import.meta.url);
const CONCURRENCY = 6;

// What the line has to be doing. Ordered strongest first.
const LINE_RULES = [
  { kind: 'api-call', strength: 3, re: /https?:\/\/api\.typesafe\.ai|["'`\/]v1\/systemone/i,
    label: 'calls the System One endpoint' },
  { kind: 'sdk-import', strength: 3,
    re: /^\s*(?:from\s+typesafe|import\s+.*\btypesafe\b|const\s+.*=\s*require\(['"][^'"]*typesafe|use\s+typesafe|using\s+TypeSafe|import\s+['"]@typesafe-ai\/)/i,
    label: 'imports a TypeSafe SDK' },
  { kind: 'sdk-call', strength: 3, re: /\.?system_?one\s*\(|systemOne\s*\(|typesafe\.\w+\s*\(/i,
    label: 'invokes the System One client' },
  { kind: 'model-route', strength: 3, re: /(?:^|[^a-z0-9_])jev-(?:latest|\d[\w.]*)\b/i,
    label: 'pins a jev model route' },
  { kind: 'api-key', strength: 2, re: /TYPESAFE_API_KEY/,
    label: 'reads TYPESAFE_API_KEY' },
];

// Lines that only talk about Jev. A comment proves intent, not integration.
const COMMENT = /^\s*(\/\/|#|\*|\/\*|<!--|--|;|%|"""|''')/;

// Packages that exist to talk to the System One API. A manifest proves
// integration only when one of these is declared as a dependency; the
// project's own name, its scripts and its package list prove nothing.
const SDK_PACKAGES = [
  '@typesafe-ai/sdk', 'typesafe-ai', 'typesafe-sdk', 'typesafe_sdk', 'typesafe', 'typesafe_ai',
  'typesafe-rs', 'typesafe-ai-rails', 'ruby_llm-typesafe', 'langchain-typesafe', 'langchain_typesafe',
  'pi-typesafe', 'jev-sdk', 'jev_sdk',
];
const isSdk = (name) => SDK_PACKAGES.includes(String(name).toLowerCase().replace(/^["']|["']$/g, ''));

const MANIFEST_DEPS = {
  'package.json': (text) => {
    try {
      const pkg = JSON.parse(text);
      const deps = Object.keys({
        ...pkg.dependencies, ...pkg.devDependencies, ...pkg.peerDependencies, ...pkg.optionalDependencies,
      });
      return deps.filter(isSdk);
    } catch { return []; }
  },
  generic: (text) => {
    const out = [];
    for (const line of text.split('\n')) {
      if (COMMENT.test(line)) continue;
      if (/^\s*(name|description|version|repository|authors?|packages|include|exclude)\s*[:=]/i.test(line)) continue;
      // Forms: `"typesafe>=1.0",`  `typesafe = "^1"`  `typesafe-sdk (~> 0.1)`  `github.com/x/typesafe-go v1`
      const m = line.match(/^\s*["']?(@?[\w.-]+(?:\/[\w.-]+)?)["']?\s*(?:[><=~^!]=?|\(|=|:|\s+v?\d)/);
      if (m && isSdk(m[1])) out.push(line.trim());
    }
    return out;
  },
};

function rawUrl(htmlUrl) {
  return htmlUrl
    .replace('https://github.com/', 'https://raw.githubusercontent.com/')
    .replace('/blob/', '/')
    .replace(/[#?].*$/, '');
}

export function inspect(text, path) {
  const manifest = MANIFEST_DEPS[path] ?? (/(Cargo|pyproject|composer|pubspec)\.(toml|json|yaml)$|requirements\.txt$|go\.mod$|Gemfile$|mix\.exs$/.test(path) ? MANIFEST_DEPS.generic : null);
  if (manifest) {
    const hits = manifest(text);
    if (hits.length) {
      const lineNo = text.split('\n').findIndex((l) => l.includes(hits[0].split(/[\s:=]/)[0].replace(/["']/g, '')));
      return {
        kind: 'dependency', strength: 3, label: `declares ${hits[0].slice(0, 80)}`,
        line: lineNo >= 0 ? lineNo + 1 : null, text: hits[0].slice(0, 160),
      };
    }
    return null; // a manifest that only *names* itself jev proves nothing
  }

  const lines = text.split('\n');
  let best = null;
  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];
    if (line.length > 500) continue;
    for (const rule of LINE_RULES) {
      if (!rule.re.test(line)) continue;
      // A comment mentioning the endpoint is documentation, not a call.
      const strength = COMMENT.test(line) ? Math.min(rule.strength, 2) : rule.strength;
      if (!best || strength > best.strength) {
        best = { kind: rule.kind, strength, label: rule.label, line: i + 1, text: line.trim().slice(0, 160) };
      }
      break;
    }
    if (best?.strength === 3 && !COMMENT.test(line)) break;
  }
  return best;
}

export async function verifyOne(repo) {
  let weaker = null;
  for (const item of repo.evidence ?? []) {
    const url = item.source?.url;
    if (!url || !url.includes('/blob/')) continue;
    let text;
    try {
      const res = await fetch(rawUrl(url), {
        headers: { authorization: `Bearer ${process.env.GH_PAT || process.env.GITHUB_TOKEN}` },
        signal: AbortSignal.timeout(20_000),
      });
      if (!res.ok) continue;      // file moved or repo went private
      text = await res.text();
    } catch { continue; }

    const found = inspect(text, item.source.path);
    // Documentation is capped at "claimed" wherever it is found — including
    // here, where a README can otherwise sneak in a perfectly real-looking
    // line of example code.
    if (found) found.strength = rate({ ...found, source: { path: item.source.path } });
    if (found?.strength >= 3) {
      return {
        ...found,
        source: { path: item.source.path, url: found.line ? `${url.replace(/#.*$/, '')}#L${found.line}` : url },
        verifiedAt: new Date().toISOString().slice(0, 10),
      };
    }
    if (found) weaker = { ...found, source: { path: item.source.path, url } };
  }
  return weaker;
}

// Discovery records at most a handful of matching files, and repositories
// found only through repository search have none at all. For every repository
// that presents itself as a Jev project, ask GitHub once, scoped to it, and
// read whatever files come back. One search per repo; "typesafe" matches the
// endpoint, the SDK imports and the API key alike.
const SECOND_CHANCE_LIMIT = Number(process.env.SECOND_CHANCE ?? 600);
const RETRY_AFTER_DAYS = 14;
const ANNOUNCES = /\bjev\b|typesafe|system[- ]one/i;
const announces = (r) => ANNOUNCES.test(r.name ?? '') || ANNOUNCES.test(r.description ?? '')
  || (r.topics ?? []).some((t) => ANNOUNCES.test(t));

async function secondChance(repo) {
  let res;
  try {
    res = await searchCode(`repo:${repo.fullName} typesafe`, { perPage: 10 });
  } catch { return null; }
  const files = (res?.items ?? []).map((item) => ({ source: { path: item.path, url: item.html_url } }));
  if (!files.length) return null;
  return verifyOne({ evidence: files });
}

export async function verify() {
  const repos = JSON.parse(await readFile(REPOS, 'utf8'));
  let store = {};
  try { store = JSON.parse(await readFile(VERIFIED, 'utf8')); } catch {}

  const todo = Object.entries(repos).filter(([key, r]) =>
    !r.gone && (r.evidence ?? []).length && store[key]?.pushedAt !== r.pushedAt);
  console.log(`verify: ${todo.length} entries to check`);

  for (let i = 0; i < todo.length; i += CONCURRENCY) {
    const batch = todo.slice(i, i + CONCURRENCY);
    const results = await Promise.all(batch.map(([, repo]) => verifyOne(repo)));
    batch.forEach(([key, repo], n) => {
      store[key] = { pushedAt: repo.pushedAt, proof: results[n] };
    });
    if (i % 120 === 0) {
      console.log(`  ${i}/${todo.length}`);
      await writeFile(VERIFIED, JSON.stringify(store, null, 2) + '\n');
    }
  }

  // Repositories without proof that call themselves Jev projects get a
  // repo-scoped search, strongest signals first. Each attempt is dated so a
  // daily run does not re-search the same silence forever.
  const cutoff = new Date(Date.now() - RETRY_AFTER_DAYS * 86_400_000).toISOString().slice(0, 10);
  const retries = Object.entries(repos)
    .filter(([key, r]) => !r.gone && !(store[key]?.proof?.strength >= 3))
    .filter(([key, r]) => announces(r) && !(store[key]?.searchedAt > cutoff))
    .sort((a, b) => b[1].stars - a[1].stars)
    .slice(0, SECOND_CHANCE_LIMIT);

  if (retries.length) console.log(`verify: repo-scoped search for ${retries.length} self-described Jev repos`);
  let recovered = 0;
  let i = 0;
  for (const [key, repo] of retries) {
    const proof = await secondChance(repo);
    const today = new Date().toISOString().slice(0, 10);
    if (proof?.strength >= 3) recovered++;
    store[key] = { pushedAt: repo.pushedAt, proof: proof ?? store[key]?.proof ?? null, searchedAt: today };
    if (++i % 50 === 0) {
      console.log(`  ${i}/${retries.length}, recovered ${recovered}`);
      await writeFile(VERIFIED, JSON.stringify(store, null, 2) + '\n');
    }
  }
  if (retries.length) console.log(`verify: recovered ${recovered} by repo-scoped search`);

  await writeFile(VERIFIED, JSON.stringify(store, null, 2) + '\n');
  const proven = Object.values(store).filter((v) => v.proof?.strength >= 3).length;
  console.log(`verify: ${proven} of ${Object.keys(store).length} entries have a verified line`);
  return store;
}

if (import.meta.url === `file://${process.argv[1]}`) await verify();
