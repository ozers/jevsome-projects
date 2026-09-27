// Keep the published index in the run.
// A daily refresh only looks at the first page of each search. Without this,
// an empty Actions cache would rebuild the directory from that one page and
// drop everything the last good run had already listed.

import { readFile, writeFile } from 'node:fs/promises';

const INDEX = new URL('../data/index.json', import.meta.url);
const CANDIDATES = new URL('../data/candidates.json', import.meta.url);
const REPOS = new URL('../data/repos.json', import.meta.url);
const VERIFIED = new URL('../data/verified.json', import.meta.url);
const CLASSIFIED = new URL('../data/classified.json', import.meta.url);

async function readJson(url) {
  try { return JSON.parse(await readFile(url, 'utf8')); } catch { return {}; }
}

export async function carry() {
  let index;
  try { index = JSON.parse(await readFile(INDEX, 'utf8')); } catch { return; }
  const entries = (index.entries ?? []).filter((e) => e.fullName && !e.isSeed);

  const candidates = await readJson(CANDIDATES);
  const repos = await readJson(REPOS);
  const verified = await readJson(VERIFIED);
  const classified = await readJson(CLASSIFIED);
  let added = 0;

  for (const entry of entries) {
    const key = entry.fullName.toLowerCase();
    if (!candidates[key]) {
      const proof = entry.proof ?? {};
      candidates[key] = {
        fullName: entry.fullName,
        firstSeen: entry.firstSeen ?? (entry.createdAt ?? '').slice(0, 10),
        lastSeen: (entry.pushedAt ?? '').slice(0, 10),
        sources: proof.path ? [{
          signal: 'endpoint',
          weight: 3,
          path: proof.path,
          url: proof.url,
        }] : [],
      };
      added++;
    }
    if (!repos[key]?.pushedAt) {
      const proof = entry.proof ?? {};
      repos[key] = {
        fullName: entry.fullName,
        name: entry.name,
        owner: entry.owner,
        url: entry.url,
        homepage: entry.homepage ?? null,
        description: entry.description ?? null,
        language: entry.language ?? null,
        license: entry.license ?? null,
        stars: entry.stars ?? 0,
        forks: entry.forks ?? 0,
        topics: entry.topics ?? [],
        archived: entry.archived ?? false,
        createdAt: entry.createdAt ?? null,
        pushedAt: entry.pushedAt ?? null,
        firstSeen: entry.firstSeen ?? null,
        evidence: proof.path ? [{
          kind: 'endpoint',
          strength: 3,
          label: proof.label,
          source: { path: proof.path, url: proof.url },
        }] : [],
        evidenceStrength: proof.path ? 3 : 0,
        gone: false,
      };
    }
    if (!verified[key]?.proof && entry.proof?.path) {
      const proof = entry.proof;
      verified[key] = {
        pushedAt: entry.pushedAt ?? null,
        proof: {
          kind: proof.kind,
          strength: 3,
          label: proof.label,
          line: proof.line ?? null,
          text: proof.text ?? null,
          source: { path: proof.path, url: proof.url },
          verifiedAt: proof.verifiedAt ?? null,
        },
      };
    }
    if (!classified[key] && entry.category) {
      classified[key] = {
        category: entry.category,
        categoryConfidence: entry.categoryConfidence ?? null,
        isProject: null,
        substance: null,
        by: entry.categoryBy === 'jev' ? 'jev' : 'rules',
        pushedAt: entry.pushedAt ?? null,
      };
    }
  }

  await writeFile(CANDIDATES, JSON.stringify(candidates, null, 2) + '\n');
  await writeFile(REPOS, JSON.stringify(repos, null, 2) + '\n');
  await writeFile(VERIFIED, JSON.stringify(verified, null, 2) + '\n');
  await writeFile(CLASSIFIED, JSON.stringify(classified, null, 2) + '\n');
  console.log(`carry: kept ${entries.length} published entries (${added} were not in the candidate cache)`);
}

if (import.meta.url === `file://${process.argv[1]}`) await carry();
