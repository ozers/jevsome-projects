// Rendering: data/index.json -> README.md.
// Separate from the pipeline so the README can be rebuilt from the committed
// index alone — a pull request never needs the caches.

import { readFile, writeFile } from 'node:fs/promises';
import { CATEGORIES, CATEGORY_ORDER } from './lib/taxonomy.mjs';

const at = (p) => new URL(`../${p}`, import.meta.url);

const STATUS_MARK = { active: '🟢', stale: '🟡', dormant: '⚪', archived: '📦', external: '🔗' };
const anchor = (s) => s.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '');

function row(e) {
  const desc = (e.description ?? '').replace(/\|/g, '\\|');
  const proof = e.proof?.url
    ? `[${e.proof.line ? `${e.proof.path}:${e.proof.line}` : e.proof.kind}](${e.proof.url})`
    : '—';
  const stars = e.stars == null ? '—' : e.stars.toLocaleString('en-US');
  return `| [${e.name}](${e.url}) | ${desc} | ${e.language ?? '—'} | ${e.license ?? '—'} | ${stars} | ${proof} | ${STATUS_MARK[e.status]} |`;
}

export function renderReadme(index) {
  const { counts, entries } = index;
  const date = index.generatedAt.slice(0, 10);
  const verified = entries.filter((e) => e.tier === 'verified');
  const candidates = entries.length - verified.length;
  const out = [];

  out.push('# Jevsome Projects');
  out.push('');
  out.push("> Open-source projects that **provably call** Jev, TypeSafe AI's System One model. Every entry links to the line of code that proves it.");
  out.push('');
  out.push(`**${verified.length} verified projects · ${candidates} more in the JSON · ${counts.examined.toLocaleString('en-US')} search hits examined · refreshed ${date}**`);
  out.push('');
  out.push('Deliberately short. Jev is days old and the ecosystem is mostly two-day-old experiments; this list starts with what can be shown to be real and grows from there. The bar is the same for every entry, and it is written down.');
  out.push('');
  out.push('## How an entry gets here');
  out.push('');
  out.push('1. **Discovery.** GitHub code and repository search, run against the API surface itself. Nothing is copied from another list.');
  out.push('2. **Proof.** The matching file is downloaded and the matching *line* is located and read. A call to `/v1/systemone`, an SDK import, a pinned `jev-latest` route or a declared dependency counts. A README sentence, a comment, a changelog entry, or a `package.json` whose own name happens to contain "jev" does not.');
  out.push(index.classifiedBy?.jev
    ? `3. **Classification.** Jev itself, one typed \`choice\` per repository against the section rules below (${index.classifiedBy.jev} entries).`
    : '3. **Classification.** Keyword rules against the section definitions below. The Jev path is wired up and takes over once a `TYPESAFE_API_KEY` is configured.');
  out.push('4. **Subject, not support.** The repository exists because of Jev: created after the model went public, or naming Jev or TypeSafe in its title, description or topics. Frameworks that predate Jev and added it as one provider among many are kept in the JSON as candidates, not listed here.');
  out.push('5. **Real code.** The proof line is source, not a mock, a recorded cassette or a data file.');
  out.push('6. **Five stars.** Someone besides the author cared. A presentation floor, not a correctness one; it is one number in [`pipeline/lib/quality.mjs`](pipeline/lib/quality.mjs) and will come down as the list matures.');
  out.push('7. **Health.** Stars, licence, last commit and demo links are re-checked daily.');
  out.push('');
  out.push(`Search casts a wide net — "typesafe" matches a lot of repositories that have nothing to do with Jev. Every hit that is not on the list is recorded in [\`data/not-listed.json\`](data/not-listed.json): ${counts.unverified.toLocaleString('en-US')} where no line of code calling Jev was found, ${counts.excluded} where it was found but the repository is not a project built on Jev. Argue with any of it.`);
  out.push('');
  out.push('Generated from [`data/index.json`](data/index.json); do not edit by hand. See [CONTRIBUTING.md](CONTRIBUTING.md).');
  out.push('');
  out.push('🟢 pushed in 30 days · 🟡 90 days · ⚪ older · 📦 archived · 🔗 no repository');
  out.push('');
  out.push('## Contents');
  out.push('');
  for (const cat of CATEGORY_ORDER) {
    const n = verified.filter((e) => e.category === cat).length;
    if (!n) continue;
    out.push(`- [${CATEGORIES[cat].label}](#${anchor(CATEGORIES[cat].label)}) (${n})`);
  }
  out.push('');

  for (const cat of CATEGORY_ORDER) {
    const list = verified.filter((e) => e.category === cat);
    if (!list.length) continue;
    const extra = entries.filter((e) => e.category === cat && e.tier !== 'verified' && e.focus === 'built-on').length;
    out.push(`## ${CATEGORIES[cat].label}`);
    out.push('');
    out.push(`**In this section:** ${CATEGORIES[cat].what}`);
    out.push('');
    out.push(`**Not here:** ${CATEGORIES[cat].not}`);
    out.push('');
    out.push('| Project | What it does | Language | License | Stars | Proof | Status |');
    out.push('| --- | --- | --- | --- | --- | --- | --- |');
    for (const e of list) out.push(row(e));
    out.push('');
    if (extra) out.push(`_${extra} more in this section passed the proof check but not the rest of the bar — in [\`data/index.json\`](data/index.json) as candidates._`);
    if (extra) out.push('');
  }

  out.push('## License');
  out.push('');
  out.push('[MIT](LICENSE) — the pipeline, the site and the data. Linked projects keep their own licences.');
  out.push('');
  out.push('Not affiliated with TypeSafe AI.');
  out.push('');
  return out.join('\n');
}

if (import.meta.url === `file://${process.argv[1]}`) {
  const index = JSON.parse(await readFile(at('data/index.json'), 'utf8'));
  await writeFile(at('README.md'), renderReadme(index));
  console.log(`render: README.md with ${index.entries.length} entries`);
}
