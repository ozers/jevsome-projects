// Stage 3 — classification.
// Jev classifies the directory that catalogues Jev: one call per repo asks for
// a category, whether it is a real project, and how substantial it looks.
// Without an API key the same taxonomy is applied by keyword rules, so the
// pipeline still runs for contributors who have no TypeSafe account.

import { readFile, writeFile } from 'node:fs/promises';
import { ask, hasKey } from './lib/jev.mjs';
import { CATEGORIES } from './lib/taxonomy.mjs';

const REPOS = new URL('../data/repos.json', import.meta.url);
const CLASSIFIED = new URL('../data/classified.json', import.meta.url);

const RULES = [
  [/awesome|directory|curated list|catalogue/i, 'list'],
  [/benchmark|eval\b|evals|calibration|reproduc|comparison|study|dataset/i, 'research'],
  [/\bsdk\b|client library|api client|bindings|wrapper for/i, 'sdk'],
  [/mcp|guardrail|agent|tool.?call|router|gate|code review|cli for/i, 'agent-tooling'],
  [/browser|playwright|puppeteer|computer.use|chrome extension/i, 'browser-computer-use'],
  [/game|doom|mario|starcraft|chess|robot|drone|mujoco|simulat/i, 'game-sim'],
  [/rails|laravel|django|home assistant|langchain|llamaindex|vercel|plugin for|integration/i, 'integration'],
  [/demo|playground|example|starter|template|tutorial|toy|experiment/i, 'demo'],
];

// Where the evidence sits says a lot. A Jev file under providers/ or
// integrations/ in a large repository means an existing product grew TypeSafe
// support; it is an integration, not a project built on Jev.
const PROVIDER_PATH = /(^|\/)(providers?|partners?|integrations?|adapters?|plugins?|models)\//i;

function heuristicCategory(repo) {
  const paths = (repo.evidence ?? []).map((e) => e.source?.path ?? '').join(' ');
  if (PROVIDER_PATH.test(paths) && repo.stars >= 200) return 'integration';

  const hay = [repo.name, repo.description, repo.readmeSummary, (repo.topics ?? []).join(' ')]
    .filter(Boolean).join(' ');
  for (const [re, category] of RULES) if (re.test(hay)) return category;
  return 'app';
}

function stateFor(repo) {
  return {
    name: repo.name,
    owner: repo.owner,
    description: repo.description,
    readme_summary: repo.readmeSummary,
    language: repo.language,
    topics: repo.topics,
    stars: repo.stars,
    is_fork: repo.isFork,
    archived: repo.archived,
    has_homepage: Boolean(repo.homepage),
    evidence: (repo.evidence ?? []).map((e) => e.label),
  };
}

const QUESTIONS = {
  category: {
    type: 'choice',
    instructions: 'Which single category best describes this GitHub repository?',
    criteria: CATEGORIES,
  },
  is_project: {
    type: 'noul',
    instructions: 'Is this a real software project that uses Jev, rather than a fork, a stub, or a page about Jev?',
    criteria: {
      true: 'Contains working code or a running service that calls the System One API.',
      false: 'Empty scaffold, unmodified fork, personal notes, or only writing about Jev.',
    },
  },
  substance: {
    type: 'score',
    instructions: 'How substantial is this project?',
    criteria: [
      'Placeholder or a few lines of throwaway code',
      'A working single-purpose demo',
      'A maintained library or application with documentation',
    ],
  },
};

export async function classify() {
  const repos = JSON.parse(await readFile(REPOS, 'utf8'));
  let store = {};
  try { store = JSON.parse(await readFile(CLASSIFIED, 'utf8')); } catch {}

  const useJev = hasKey();
  console.log(`classify: ${useJev ? 'using Jev' : 'no TYPESAFE_API_KEY, using keyword rules'}`);

  const entries = Object.entries(repos).filter(([, r]) => !r.gone);
  let i = 0;

  for (const [key, repo] of entries) {
    i++;
    // Re-classify only when the repo changed since the last run.
    const cached = store[key];
    if (cached && cached.pushedAt === repo.pushedAt && cached.by === (useJev ? 'jev' : 'rules')) continue;

    if (!useJev) {
      store[key] = { category: heuristicCategory(repo), isProject: null, substance: null, by: 'rules', pushedAt: repo.pushedAt };
      continue;
    }

    try {
      const out = await ask(stateFor(repo), QUESTIONS);
      const a = out.answers;
      store[key] = {
        category: a.category.choice,
        categoryConfidence: a.category.confidence,
        isProject: a.is_project.noul,
        substance: a.substance.score,
        by: 'jev',
        pushedAt: repo.pushedAt,
      };
    } catch (err) {
      console.warn(`  ${repo.fullName}: ${err.message}; falling back to rules`);
      store[key] = { category: heuristicCategory(repo), isProject: null, substance: null, by: 'rules', pushedAt: repo.pushedAt };
    }

    if (i % 50 === 0) {
      console.log(`  ${i}/${entries.length}`);
      await writeFile(CLASSIFIED, JSON.stringify(store, null, 2) + '\n');
    }
  }

  await writeFile(CLASSIFIED, JSON.stringify(store, null, 2) + '\n');
  console.log(`classify: ${Object.keys(store).length} classified`);
  return store;
}

if (import.meta.url === `file://${process.argv[1]}`) await classify();
