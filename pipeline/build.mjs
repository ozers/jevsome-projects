// Stage 5 — build the index and the README.
// data/index.json is the published artefact: the site reads it, and anything
// else may too. README.md is generated from the same data and is never edited
// by hand.

import { readFile, writeFile } from 'node:fs/promises';
import { parse } from 'yaml';
import { CATEGORY_ORDER } from './lib/taxonomy.mjs';
import { PROVEN, score } from './lib/evidence.mjs';
import { renderReadme } from './render.mjs';

const at = (p) => new URL(`../${p}`, import.meta.url);

const readJson = async (p, fallback = {}) => {
  try { return JSON.parse(await readFile(at(p), 'utf8')); } catch { return fallback; }
};
const readYaml = async (p, fallback) => {
  try { return parse(await readFile(at(p), 'utf8')) ?? fallback; } catch { return fallback; }
};

const DAY = 86_400_000;

function status(repo) {
  if (repo.archived) return 'archived';
  const age = Date.now() - new Date(repo.pushedAt).getTime();
  if (age < 30 * DAY) return 'active';
  if (age < 90 * DAY) return 'stale';
  return 'dormant';
}

function describe(repo, override) {
  const text = override?.description || repo.description || repo.readmeSummary || '';
  return text.replace(/\s+/g, ' ').trim().slice(0, 240) || null;
}

export async function build() {
  const [repos, classified, health, overrides, blocklist, seeds] = await Promise.all([
    readJson('data/repos.json'),
    readJson('data/classified.json'),
    readJson('data/health.json'),
    readYaml('data/overrides.yaml', {}),
    readYaml('data/blocklist.yaml', { repos: [] }),
    readYaml('data/seeds.yaml', { entries: [] }),
  ]);

  const blocked = new Set((blocklist.repos ?? []).map((b) => (b.repo ?? b).toLowerCase()));
  const entries = [];
  const rejected = { blocked: 0, unverified: 0, notProject: 0, gone: 0, fork: 0 };

  for (const [key, repo] of Object.entries(repos)) {
    if (repo.gone) { rejected.gone++; continue; }
    if (blocked.has(key)) { rejected.blocked++; continue; }

    const override = overrides[key] ?? overrides[repo.fullName] ?? null;
    const cls = classified[key] ?? {};

    // The whole point of this directory: no proof, no entry. A README that
    // names the endpoint is a claim, not evidence.
    const { evidence, strength } = score(repo.evidence);
    if (strength < PROVEN && !override?.force) { rejected.unverified++; continue; }
    if (cls.isProject !== null && cls.isProject !== undefined && cls.isProject < 0.5 && !override?.force) {
      rejected.notProject++; continue;
    }
    if (repo.isFork && repo.stars < 5 && !override?.force) { rejected.fork++; continue; }

    const home = health[key] ?? null;
    entries.push({
      id: key,
      name: override?.name ?? repo.name,
      fullName: repo.fullName,
      owner: repo.owner,
      url: repo.url,
      homepage: repo.homepage ?? null,
      homepageLive: home ? home.ok : null,
      description: describe(repo, override),
      category: override?.category ?? cls.category ?? 'app',
      categoryBy: override?.category ? 'human' : (cls.by ?? 'rules'),
      categoryConfidence: cls.categoryConfidence ?? null,
      substance: cls.substance ?? null,
      language: repo.language,
      license: repo.license,
      stars: repo.stars,
      forks: repo.forks,
      topics: repo.topics ?? [],
      archived: repo.archived,
      createdAt: repo.createdAt,
      pushedAt: repo.pushedAt,
      firstSeen: repo.firstSeen,
      status: status(repo),
      evidence,
      evidenceStrength: strength,
    });
  }

  for (const seed of seeds.entries ?? []) {
    entries.push({
      id: `seed:${seed.url}`,
      name: seed.name,
      url: seed.url,
      homepage: seed.url,
      description: seed.description ?? null,
      category: seed.category ?? 'demo',
      categoryBy: 'human',
      language: seed.language ?? null,
      license: null,
      stars: null,
      status: 'external',
      evidence: seed.evidence ? [{ kind: 'manual', strength: 3, label: seed.evidence, source: { url: seed.url } }] : [],
      evidenceStrength: seed.evidence ? 3 : 1,
      isSeed: true,
    });
  }

  entries.sort((a, b) => (b.stars ?? -1) - (a.stars ?? -1) || a.name.localeCompare(b.name));

  const classifiedBy = Object.values(classified).reduce((acc, c) => {
    acc[c.by ?? 'rules'] = (acc[c.by ?? 'rules'] ?? 0) + 1;
    return acc;
  }, {});

  const index = {
    generatedAt: new Date().toISOString(),
    classifiedBy,
    counts: {
      total: entries.length,
      byCategory: Object.fromEntries(
        CATEGORY_ORDER.map((c) => [c, entries.filter((e) => e.category === c).length]),
      ),
      byStatus: ['active', 'stale', 'dormant', 'archived', 'external'].reduce((acc, s) => {
        acc[s] = entries.filter((e) => e.status === s).length;
        return acc;
      }, {}),
      stars: entries.reduce((sum, e) => sum + (e.stars ?? 0), 0),
      hardEvidence: entries.filter((e) => e.evidenceStrength >= 3).length,
      rejected,
    },
    entries,
  };

  // Minified: this file is committed on every refresh, so its diff is churn.
  await writeFile(at('data/index.json'), JSON.stringify(index) + '\n');
  await writeFile(at('README.md'), renderReadme(index));
  console.log(`build: ${entries.length} entries, ${index.counts.hardEvidence} with hard evidence`);
  console.log(`build: rejected ${JSON.stringify(rejected)}`);
  return index;
}

if (import.meta.url === `file://${process.argv[1]}`) await build();
