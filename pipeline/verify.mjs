// Stage 2b — verification.
// Discovery says "this file matched". That is not good enough: GitHub's index
// is stale, a match can sit in a comment, and a package.json whose *own name*
// contains "jev" looked exactly like a declared dependency. So every entry's
// evidence file is fetched and the matching line is located and read. What
// cannot be pointed at, line and all, does not count.

import { readFile, writeFile } from 'node:fs/promises';
import { readRepo } from './lib/tarball.mjs';
import { rate } from './lib/evidence.mjs';

const REPOS = new URL('../data/repos.json', import.meta.url);
const VERIFIED = new URL('../data/verified.json', import.meta.url);
const CONCURRENCY = 6;

// What the line has to be doing. Ordered strongest first.
const LINE_RULES = [
  { kind: 'api-call', strength: 3, re: /https?:\/\/api\.typesafe\.ai|["'`\/]v1\/systemone/i,
    label: 'calls the System One endpoint' },
  { kind: 'sdk-import', strength: 3,
    re: /^\s*(?:from\s+typesafe(?:_sdk|_ai|\.\w+)?\s+import\b|import\s+(?:typesafe(?:_sdk|_ai)?\b|.*\bfrom\s+['"][^'"]*typesafe)|const\s+.*=\s*require\(['"][^'"]*typesafe|use\s+typesafe(?:_\w+)?::|using\s+TypeSafe\.|import\s+['"]@typesafe-ai\/)/i,
    label: 'imports a TypeSafe SDK' },
  { kind: 'sdk-call', strength: 3, re: /\.?system_?one\s*\(|systemOne\s*\(|typesafe\.\w+\s*\(/i,
    label: 'invokes the System One client' },
  // Inside a string literal, optionally behind a provider prefix
  // ("typesafe/jev-latest", "~typesafe/jev-latest"). Prose does not quote.
  { kind: 'model-route', strength: 3, re: /(["'`])(?:[^"'`\s]*[/~:])?jev-(?:latest|\d[\w.]*)\1/i,
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

// Things that make a bare method call trustworthy: the same file imports a
// TypeSafe SDK or names the endpoint. `laya.systemOne(` alone is someone
// else's model with a borrowed method name.
const CORROBORATES = /api\.typesafe\.ai|@typesafe-ai\/|\bfrom\s+typesafe|\bimport\s+typesafe|typesafe_sdk|TypeSafeClient|typesafe-sdk|TypeSafe\.Sdk|typesafe\.NewClient|TYPESAFE_API_KEY/i;
// A definition is not a call.
const DEFINITION = /^\s*(?:export\s+)?(?:def|function|fn|func|public|private|protected|static|async\s+(?:def|function)|(?:async\s+)?[A-Za-z_]\w*\s*\([^)]*\)\s*(?::\s*[\w<>\[\], .|]+)?\s*\{)/;
const JS_FAMILY = /\.(m?[jt]sx?|cjs|vue|svelte|astro)$/i;

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
  const corroborated = CORROBORATES.test(text);
  let best = null;
  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];
    if (line.length > 500) continue;
    for (const rule of LINE_RULES) {
      const m = line.match(rule.re);
      if (!m) continue;
      if (rule.kind === 'sdk-call' && (DEFINITION.test(line) || !corroborated)) continue;
      if (rule.kind === 'model-route' && m[1] === '`' && !JS_FAMILY.test(path)) continue;
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
// found through repository search, npm or a report have none at all. Those
// get a whole-repository scan from the source archive: no search API, no
// penalties, every file read.
const SECOND_CHANCE_LIMIT = Number(process.env.SECOND_CHANCE ?? 300);
const MAX_DISK_KB = 60_000;
const RETRY_AFTER_DAYS = 14;
const ANNOUNCES = /\bjev|typesafe|system[- ]one/i;
const announces = (r) => ANNOUNCES.test(r.name ?? '') || ANNOUNCES.test(r.description ?? '')
  || (r.topics ?? []).some((t) => ANNOUNCES.test(t));

// The best line in the repository: a real call over a pinned name, product
// code over tests and fixtures, a short path over a deep one.
const KIND_RANK = { 'api-call': 0, 'sdk-import': 1, 'sdk-call': 2, dependency: 3, 'model-route': 4, 'api-key': 5 };
const TESTY = /(^|\/)(tests?|__tests__|spec|testdata|fixtures?|examples?|docs?|scripts)\/|[._-](test|spec|smoke)\.[a-z]+$|smoke/i;

async function scanRepo(repo) {
  let archive;
  try { archive = await readRepo(repo.fullName); } catch { return null; }
  if (!archive.ok) return null;
  const ref = archive.commit ?? 'HEAD';
  const found = [];
  for (const file of archive.files) {
    const hit = inspect(file.text, file.path);
    if (!hit) continue;
    hit.strength = rate({ ...hit, source: { path: file.path } });
    if (hit.strength < 3) continue;
    found.push({ ...hit, path: file.path });
  }
  if (!found.length) return null;
  found.sort((a, b) =>
    (KIND_RANK[a.kind] ?? 9) - (KIND_RANK[b.kind] ?? 9)
    || Number(TESTY.test(a.path)) - Number(TESTY.test(b.path))
    || a.path.length - b.path.length);
  const best = found[0];
  const url = `https://github.com/${repo.fullName}/blob/${ref}/${best.path}`;
  return {
    kind: best.kind, strength: best.strength, label: best.label, line: best.line, text: best.text,
    source: { path: best.path, url: best.line ? `${url}#L${best.line}` : url },
    verifiedAt: new Date().toISOString().slice(0, 10),
    via: 'archive',
  };
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
  // Where a repo came from lives with the candidates, not the metadata.
  let candidates = {};
  try { candidates = JSON.parse(await readFile(new URL('../data/candidates.json', import.meta.url), 'utf8')); } catch {}
  const reportedKeys = new Set(Object.entries(candidates)
    .filter(([, c]) => (c.sources ?? []).some((x) => x.signal === 'submitted'))
    .map(([k]) => k));
  const submitted = (r) => reportedKeys.has((r.fullName ?? '').toLowerCase());
  const retries = Object.entries(repos)
    .filter(([key, r]) => !r.gone && !(store[key]?.proof?.strength >= 3))
    .filter(([key, r]) => (announces(r) || submitted(r)))
    // Scanned recently and found nothing: wait, unless the repo has changed since.
    .filter(([key, r]) => !(store[key]?.searchedAt > cutoff) || (r.pushedAt ?? '').slice(0, 10) > store[key].searchedAt);
  // Reported repositories first and outside the daily budget; then the rest
  // by stars, as many as the budget allows.
  const reported = retries.filter(([, r]) => submitted(r));
  const rest = retries.filter(([, r]) => !submitted(r))
    .sort((a, b) => b[1].stars - a[1].stars)
    .slice(0, SECOND_CHANCE_LIMIT);
  retries.length = 0;
  retries.push(...reported, ...rest);

  if (retries.length) console.log(`verify: archive scan for ${retries.length} repos without proof`);
  let recovered = 0;
  let i = 0;
  // Wall-clock budget. Without a PAT one code search can cost a ten-minute
  // penalty, and a job that hits its timeout commits nothing at all.
  const deadline = Date.now() + Number(process.env.SECOND_CHANCE_MINUTES ?? 10) * 60_000;
  for (const [key, repo] of retries) {
    if (Date.now() > deadline && !submitted(repo)) {
      console.log(`verify: time budget spent after ${i} repos; the rest wait for tomorrow`);
      break;
    }
    if ((repo.diskUsage ?? 0) > MAX_DISK_KB && !submitted(repo)) { i++; continue; }
    const proof = await scanRepo(repo);
    const today = new Date().toISOString().slice(0, 10);
    if (proof?.strength >= 3) recovered++;
    store[key] = { pushedAt: repo.pushedAt, proof: proof ?? store[key]?.proof ?? null, searchedAt: today };
    if (++i % 50 === 0) {
      console.log(`  ${i}/${retries.length}, recovered ${recovered}`);
      await writeFile(VERIFIED, JSON.stringify(store, null, 2) + '\n');
    }
  }
  if (retries.length) console.log(`verify: recovered ${recovered} by archive scan`);

  await writeFile(VERIFIED, JSON.stringify(store, null, 2) + '\n');
  const proven = Object.values(store).filter((v) => v.proof?.strength >= 3).length;
  console.log(`verify: ${proven} of ${Object.keys(store).length} entries have a verified line`);
  return store;
}

if (import.meta.url === `file://${process.argv[1]}`) await verify();
