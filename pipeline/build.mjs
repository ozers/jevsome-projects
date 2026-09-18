// Stage 5 — assemble the index.
// Three gates, in order: proof that the project calls Jev (verified line by
// line), then whether it is a project at all, then which shelf it belongs on.
// Every rejection is written to data/rejected.json with its reason.

import { readFile, writeFile } from 'node:fs/promises';
import { parse } from 'yaml';
import { CATEGORY_ORDER } from './lib/taxonomy.mjs';
import { OFFICIAL_OWNERS, catalogueOnly, disqualify, focus, shelf, tier } from './lib/quality.mjs';
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
  // A one-liner like "i. am. speed." tells nobody anything; the README's
  // first paragraph usually does.
  const own = (repo.description ?? '').trim();
  const usable = own.length >= 24 || !repo.readmeSummary;
  const text = override?.description || (usable ? own : repo.readmeSummary) || repo.readmeSummary || '';
  return text.replace(/\s+/g, ' ').trim().slice(0, 240) || null;
}

export async function build() {
  const [repos, verified, classified, health, overrides, blocklist, seeds] = await Promise.all([
    readJson('data/repos.json'),
    readJson('data/verified.json'),
    readJson('data/classified.json'),
    readJson('data/health.json'),
    readYaml('data/overrides.yaml', {}),
    readYaml('data/blocklist.yaml', { repos: [] }),
    readYaml('data/seeds.yaml', { entries: [] }),
  ]);

  const blocked = new Map((blocklist.repos ?? []).map((b) => [(b.repo ?? b).toLowerCase(), b.reason]));
  const entries = [];
  const rejected = [];
  const reject = (repo, reason) => rejected.push({ repo: repo.fullName ?? repo, reason });

  for (const [key, repo] of Object.entries(repos)) {
    if (repo.gone) { reject(repo, 'repository no longer reachable'); continue; }

    const override = overrides[key] ?? overrides[repo.fullName] ?? null;
    if (blocked.has(key)) { reject(repo, `blocklisted: ${blocked.get(key)}`); continue; }

    // Gate 1 — proof. A verified line, or nothing.
    const proof = verified[key]?.proof ?? null;
    if (!(proof?.strength >= 3) && !override?.force) {
      reject(repo, proof ? `only a ${proof.kind} mention, no verified call` : 'no verifiable line of evidence');
      continue;
    }

    // Gate 2 — is it a project.
    const bad = override?.force ? null : (catalogueOnly(proof) ?? disqualify(repo));
    if (bad) { reject(repo, bad); continue; }

    const cls = classified[key] ?? {};
    if (cls.isProject != null && cls.isProject < 0.5 && !override?.force) {
      reject(repo, `Jev judged it not a project (p=${cls.isProject.toFixed(2)})`);
      continue;
    }

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
      shelf: override?.shelf ?? shelf(repo, { homepageLive: home?.ok }),
      focus: override?.focus ?? focus(repo, proof),
      // A directory of Jev projects is a neighbour, not a project; it stays a
      // candidate however well it scores.
      tier: override?.tier ?? (
        (override?.category ?? cls.category) === 'list'
          ? 'candidate'
          : tier(repo, proof, override?.focus ?? focus(repo, proof))
      ),
      official: OFFICIAL_OWNERS.has((repo.owner ?? '').toLowerCase()),
      proof: {
        kind: proof?.kind ?? 'override',
        label: proof?.label ?? 'included by maintainer override',
        path: proof?.source?.path ?? null,
        url: proof?.source?.url ?? repo.url,
        line: proof?.line ?? null,
        text: proof?.text ?? null,
        verifiedAt: proof?.verifiedAt ?? null,
      },
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
      shelf: 'listed',
      focus: seed.focus ?? 'built-on',
      tier: 'verified',
      official: false,
      isSeed: true,
      proof: { kind: 'manual', label: seed.evidence, url: seed.url, path: null, line: null, text: null },
    });
  }

  entries.sort((a, b) => (b.stars ?? -1) - (a.stars ?? -1) || a.name.localeCompare(b.name));

  const listed = entries.filter((e) => e.shelf === 'listed');
  const builtOn = listed.filter((e) => e.focus === 'built-on');
  const frontPage = entries.filter((e) => e.tier === 'verified');
  const classifiedBy = Object.values(classified).reduce((acc, c) => {
    acc[c.by ?? 'rules'] = (acc[c.by ?? 'rules'] ?? 0) + 1;
    return acc;
  }, {});

  const index = {
    generatedAt: new Date().toISOString(),
    classifiedBy,
    counts: {
      total: entries.length,
      verified: frontPage.length,
      candidates: entries.length - frontPage.length,
      listed: listed.length,
      new: entries.length - listed.length,
      builtOn: entries.filter((e) => e.focus === 'built-on').length,
      supports: entries.filter((e) => e.focus === 'supports').length,
      byCategory: Object.fromEntries(CATEGORY_ORDER.map((c) => [c, entries.filter((e) => e.category === c).length])),
      byCategoryListed: Object.fromEntries(CATEGORY_ORDER.map((c) => [c, builtOn.filter((e) => e.category === c).length])),
      byCategoryVerified: Object.fromEntries(CATEGORY_ORDER.map((c) => [c, frontPage.filter((e) => e.category === c).length])),
      byStatus: ['active', 'stale', 'dormant', 'archived', 'external'].reduce((acc, s) => {
        acc[s] = entries.filter((e) => e.status === s).length;
        return acc;
      }, {}),
      stars: entries.reduce((sum, e) => sum + (e.stars ?? 0), 0),
      examined: Object.keys(repos).length,
      rejected: rejected.length,
    },
    entries,
  };

  await writeFile(at('data/index.json'), JSON.stringify(index) + '\n');
  await writeFile(at('data/rejected.json'), JSON.stringify({
    generatedAt: index.generatedAt,
    note: 'Candidates that were discovered but kept out, with the reason. Published so the selection can be argued with.',
    count: rejected.length,
    rejected: rejected.sort((a, b) => a.repo.localeCompare(b.repo)),
  }, null, 2) + '\n');
  await writeFile(at('README.md'), renderReadme(index));

  console.log(`build: ${frontPage.length} verified for the front page · ${entries.length - frontPage.length} proven candidates kept in the index · ${rejected.length} rejected`);
  const reasons = rejected.reduce((acc, r) => { acc[r.reason] = (acc[r.reason] ?? 0) + 1; return acc; }, {});
  for (const [reason, n] of Object.entries(reasons).sort((a, b) => b[1] - a[1]).slice(0, 6)) {
    console.log(`  ${String(n).padStart(4)} ${reason}`);
  }
  return index;
}

if (import.meta.url === `file://${process.argv[1]}`) await build();
