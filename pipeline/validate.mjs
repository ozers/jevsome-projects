// Checks the hand-edited data files before a pull request is merged.

import { readFile } from 'node:fs/promises';
import { parse } from 'yaml';
import { CATEGORY_ORDER } from './lib/taxonomy.mjs';

const at = (p) => new URL(`../${p}`, import.meta.url);
const errors = [];

const yaml = async (p) => parse(await readFile(at(p), 'utf8')) ?? {};

const seeds = await yaml('data/seeds.yaml');
for (const [i, e] of (seeds.entries ?? []).entries()) {
  const where = `seeds.yaml entry ${i + 1} (${e?.name ?? 'unnamed'})`;
  if (!e?.name) errors.push(`${where}: name is required`);
  if (!e?.url?.startsWith('http')) errors.push(`${where}: url must be an absolute http(s) URL`);
  if (!e?.description) errors.push(`${where}: description is required`);
  if (!e?.evidence) errors.push(`${where}: evidence is required — say what proves it runs on Jev`);
  if (e?.category && !CATEGORY_ORDER.includes(e.category)) {
    errors.push(`${where}: unknown category "${e.category}"`);
  }
}

const overrides = await yaml('data/overrides.yaml');
for (const [key, o] of Object.entries(overrides ?? {})) {
  if (!/^[^/]+\/[^/]+$/.test(key)) errors.push(`overrides.yaml: "${key}" must be owner/repo`);
  if (key !== key.toLowerCase()) errors.push(`overrides.yaml: "${key}" must be lowercase`);
  if (o?.category && !CATEGORY_ORDER.includes(o.category)) {
    errors.push(`overrides.yaml ${key}: unknown category "${o.category}"`);
  }
}

const blocklist = await yaml('data/blocklist.yaml');
for (const b of blocklist.repos ?? []) {
  if (!b?.repo) errors.push('blocklist.yaml: every item needs a repo');
  if (!b?.reason) errors.push(`blocklist.yaml ${b?.repo}: every exclusion needs a reason`);
}

if (errors.length) {
  console.error('validate: failed\n' + errors.map((e) => `  - ${e}`).join('\n'));
  process.exit(1);
}
console.log('validate: ok');
