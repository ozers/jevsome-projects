// Stage 2 — enrichment.
// Metadata for every candidate, without spending the REST quota: one GraphQL
// request per hundred repositories, and READMEs from raw.githubusercontent.
// Whether a repository actually calls Jev is decided later, in verify, by
// reading its files; this stage only records what discovery already saw.

import { readFile, writeFile } from 'node:fs/promises';
import { graphql } from './lib/github.mjs';

const CANDIDATES = new URL('../data/candidates.json', import.meta.url);
const REPOS = new URL('../data/repos.json', import.meta.url);
const README_NAMES = ['README.md', 'readme.md', 'Readme.md', 'README.MD', 'README.rst', 'README'];
const CONCURRENCY = 8;

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

const SAFE_NAME = /^[A-Za-z0-9_.-]+$/;

async function refreshMetadata(store) {
  const keys = Object.keys(store).filter((k) => !store[k].gone && store[k].fullName);
  let refreshed = 0;
  let vanished = 0;
  for (let i = 0; i < keys.length; i += 100) {
    const batch = keys.slice(i, i + 100).filter((k) => {
      const [owner, name] = store[k].fullName.split('/');
      return SAFE_NAME.test(owner) && SAFE_NAME.test(name);
    });
    const fields = `nameWithOwner url homepageUrl description stargazerCount forkCount
      isFork isArchived createdAt pushedAt diskUsage primaryLanguage { name } licenseInfo { spdxId }
      repositoryTopics(first: 20) { nodes { topic { name } } }`;
    const query = `{ ${batch.map((k, n) => {
      const [owner, name] = store[k].fullName.split('/');
      return `r${n}: repository(owner: "${owner}", name: "${name}") { ${fields} }`;
    }).join('\n')} }`;

    let data;
    try { data = await graphql(query); } catch (err) {
      console.warn(`  metadata batch ${i / 100 + 1}: ${err.message}`);
      continue;
    }
    batch.forEach((k, n) => {
      const r = data[`r${n}`];
      if (r === undefined) return;          // batch failed for this alias; keep what we had
      if (r === null) { store[k].gone = true; vanished++; return; }
      const spdx = r.licenseInfo?.spdxId;
      Object.assign(store[k], {
        fullName: r.nameWithOwner,
        url: r.url,
        homepage: r.homepageUrl || null,
        description: r.description || null,
        language: r.primaryLanguage?.name ?? null,
        license: spdx && spdx !== 'NOASSERTION' ? spdx : null,
        stars: r.stargazerCount,
        forks: r.forkCount,
        topics: r.repositoryTopics.nodes.map((t) => t.topic.name),
        isFork: r.isFork,
        archived: r.isArchived,
        createdAt: r.createdAt,
        pushedAt: r.pushedAt,
        diskUsage: r.diskUsage,
        metadataAt: new Date().toISOString().slice(0, 10),
      });
      refreshed++;
    });
  }
  console.log(`enrich: metadata refreshed for ${refreshed} repos${vanished ? `, ${vanished} gone` : ''}`);
}

async function readmeOf(fullName) {
  for (const name of README_NAMES) {
    try {
      const res = await fetch(`https://raw.githubusercontent.com/${fullName}/HEAD/${name}`, {
        signal: AbortSignal.timeout(15_000),
      });
      if (res.ok) return await res.text();
    } catch {}
  }
  return null;
}

// Code-search hits from discovery are file-level evidence to check first.
function discoveredEvidence(cand) {
  return (cand.sources ?? [])
    .filter((s) => s.path && (s.weight ?? 0) >= 2)
    .map((s) => ({
      kind: s.signal,
      strength: s.weight,
      label: `code search matched ${s.signal} in ${s.path}`,
      source: { path: s.path, url: s.url },
    }));
}

export async function enrich() {
  const candidates = JSON.parse(await readFile(CANDIDATES, 'utf8'));
  let store = {};
  try { store = JSON.parse(await readFile(REPOS, 'utf8')); } catch {}

  // New names get a stub; evidence from discovery is merged for everyone.
  const fresh = [];
  for (const [key, cand] of Object.entries(candidates)) {
    const entry = (store[key] ??= { fullName: cand.fullName, firstSeen: cand.firstSeen, evidence: [] });
    entry.lastSeen = cand.lastSeen;
    const known = new Set((entry.evidence ?? []).map((e) => e.source?.path));
    for (const ev of discoveredEvidence(cand)) if (!known.has(ev.source.path)) (entry.evidence ??= []).push(ev);
    if (!entry.pushedAt && !entry.gone) fresh.push(key);
  }
  console.log(`enrich: ${Object.keys(store).length} known, ${fresh.length} new`);

  await refreshMetadata(store);

  // READMEs only for new names; a summary does not need refreshing daily.
  for (let i = 0; i < fresh.length; i += CONCURRENCY) {
    await Promise.all(fresh.slice(i, i + CONCURRENCY).map(async (key) => {
      const entry = store[key];
      if (entry.gone || !entry.pushedAt) return;
      entry.readmeSummary = firstParagraph(await readmeOf(entry.fullName));
      entry.name ??= entry.fullName.split('/')[1];
      entry.owner ??= entry.fullName.split('/')[0];
    }));
  }

  for (const entry of Object.values(store)) {
    if (!entry.fullName) continue;
    entry.name = entry.fullName.split('/')[1];
    entry.owner = entry.fullName.split('/')[0];
    entry.evidenceStrength = (entry.evidence ?? []).reduce((m, e) => Math.max(m, e.strength ?? 0), 0);
  }

  await writeFile(REPOS, JSON.stringify(store, null, 2) + '\n');
  console.log(`enrich: done`);
  return store;
}

if (import.meta.url === `file://${process.argv[1]}`) await enrich();
