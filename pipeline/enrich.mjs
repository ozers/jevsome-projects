// Stage 2 — enrichment and evidence.
// Every candidate gets repo metadata plus a verdict on whether it *actually*
// uses Jev. Naming the model in a README is not enough: an entry is only
// "verified" when we can point at a file that calls the API, pins the model
// route, or declares a TypeSafe SDK dependency.

import { readFile, writeFile } from 'node:fs/promises';
import { gh, getReadme, getRepo } from './lib/github.mjs';

const CANDIDATES = new URL('../data/candidates.json', import.meta.url);
const REPOS = new URL('../data/repos.json', import.meta.url);

// Dependency names published by TypeSafe or by community SDK authors.
const SDK_PACKAGES = [
  '@typesafe-ai/sdk', 'typesafe-ai', 'typesafe-sdk', 'typesafe_sdk', 'typesafe-rs',
  'typesafe-ai-rails', 'ruby_llm-typesafe', 's1-rs', 'jev', 'jev-sdk',
];
const MANIFESTS = [
  'package.json', 'requirements.txt', 'pyproject.toml', 'Cargo.toml', 'go.mod',
  'Gemfile', 'mix.exs', 'composer.json', 'pubspec.yaml', 'build.gradle', 'Package.swift',
];
// Ordered strongest first; the first match decides the headline evidence.
const TEXT_SIGNALS = [
  { re: /api\.typesafe\.ai\/v1\/systemone/i, kind: 'endpoint', strength: 3, label: 'calls POST /v1/systemone' },
  { re: /jev-latest|jev-1|models?\/jev\b/i, kind: 'model-route', strength: 3, label: 'pins a jev model route' },
  { re: /TYPESAFE_API_KEY/, kind: 'api-key', strength: 2, label: 'reads TYPESAFE_API_KEY' },
  { re: /system\s?one|systemone/i, kind: 'system-one', strength: 1, label: 'mentions System One' },
];

const strongestOf = (evidence) => evidence.reduce((m, e) => Math.max(m, e.strength ?? 0), 0);

function scanText(text, source) {
  const out = [];
  if (!text) return out;
  for (const sig of TEXT_SIGNALS) {
    if (sig.re.test(text)) out.push({ kind: sig.kind, strength: sig.strength, label: sig.label, source });
  }
  return out;
}

async function rootFiles(fullName, branch) {
  const tree = await gh(`/repos/${fullName}/git/trees/${encodeURIComponent(branch)}`).catch(() => null);
  return new Set((tree?.tree ?? []).filter((n) => n.type === 'blob').map((n) => n.path));
}

async function rawFile(fullName, path) {
  return gh(`/repos/${fullName}/contents/${path}`, { accept: 'application/vnd.github.raw' })
    .catch(() => null);
}

async function manifestEvidence(repo) {
  const files = await rootFiles(repo.full_name, repo.default_branch ?? 'main');
  const out = [];
  for (const name of MANIFESTS) {
    if (!files.has(name)) continue;
    const body = await rawFile(repo.full_name, name);
    if (typeof body !== 'string') continue;
    const hit = SDK_PACKAGES.find((pkg) => body.includes(pkg));
    if (hit) {
      out.push({
        kind: 'dependency',
        strength: 3,
        label: `declares ${hit}`,
        source: { path: name, url: `${repo.html_url}/blob/${repo.default_branch}/${name}` },
      });
      break;
    }
  }
  return out;
}

function firstParagraph(readme) {
  if (!readme) return null;
  const body = readme
    .replace(/^---[\s\S]*?---/, '')
    .replace(/^#.*$/gm, '')
    .replace(/!\[[^\]]*\]\([^)]*\)/g, '')
    .replace(/\[([^\]]*)\]\([^)]*\)/g, '$1')
    .replace(/<[^>]+>/g, '')
    .replace(/[`*_>]/g, '');
  const para = body.split(/\n\s*\n/).map((s) => s.trim()).find((s) => s.length > 40 && !s.startsWith('|'));
  return para ? para.replace(/\s+/g, ' ').slice(0, 320) : null;
}

export async function enrich() {
  const candidates = JSON.parse(await readFile(CANDIDATES, 'utf8'));
  let store = {};
  try { store = JSON.parse(await readFile(REPOS, 'utf8')); } catch {}

  const keys = Object.keys(candidates);
  console.log(`enrich: ${keys.length} candidates`);
  let i = 0;

  for (const key of keys) {
    const cand = candidates[key];
    i++;
    const repo = await getRepo(cand.fullName);
    if (!repo) {
      store[key] = { ...store[key], fullName: cand.fullName, gone: true };
      continue;
    }

    // Code-search hits from discovery are already file-level proof.
    const evidence = cand.sources
      .filter((s) => s.path && (s.weight ?? 0) >= 2)
      .map((s) => ({
        kind: s.signal,
        strength: s.weight,
        label: `code search matched ${s.signal} in ${s.path}`,
        source: { path: s.path, url: s.url },
      }));

    const readme = await getReadme(repo.full_name);
    if (strongestOf(evidence) < 3) {
      evidence.push(...scanText(readme, { path: 'README', url: `${repo.html_url}#readme` }));
    }
    if (strongestOf(evidence) < 3) {
      evidence.push(...(await manifestEvidence(repo)));
    }

    store[key] = {
      fullName: repo.full_name,
      name: repo.name,
      owner: repo.owner.login,
      url: repo.html_url,
      homepage: repo.homepage || null,
      description: repo.description || null,
      readmeSummary: firstParagraph(readme),
      language: repo.language || null,
      license: repo.license?.spdx_id && repo.license.spdx_id !== 'NOASSERTION' ? repo.license.spdx_id : null,
      stars: repo.stargazers_count,
      forks: repo.forks_count,
      openIssues: repo.open_issues_count,
      topics: repo.topics ?? [],
      isFork: repo.fork,
      archived: repo.archived,
      createdAt: repo.created_at,
      pushedAt: repo.pushed_at,
      firstSeen: cand.firstSeen,
      lastSeen: cand.lastSeen,
      evidence: evidence.sort((a, b) => b.strength - a.strength).slice(0, 4),
      evidenceStrength: strongestOf(evidence),
      gone: false,
    };

    if (i % 25 === 0) {
      console.log(`  ${i}/${keys.length}`);
      await writeFile(REPOS, JSON.stringify(store, null, 2) + '\n');
    }
  }

  await writeFile(REPOS, JSON.stringify(store, null, 2) + '\n');
  const verified = Object.values(store).filter((r) => r.evidenceStrength >= 3).length;
  console.log(`enrich: ${Object.keys(store).length} repos, ${verified} with hard evidence`);
  return store;
}

if (import.meta.url === `file://${process.argv[1]}`) await enrich();
