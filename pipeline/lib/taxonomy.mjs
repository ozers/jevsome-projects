// Category definitions.
// Each one states what belongs in it *and* what does not, because a directory
// whose sections are vague is just a pile. The `what` text is sent to Jev as
// the choice criteria, and both lines are printed in the README and on the
// site, so a reader can check any entry against the same rule we used.

export const CATEGORIES = {
  sdk: {
    label: 'SDKs & clients',
    what: 'A library whose whole purpose is talking to the System One API from one language or runtime: request signing, typed Choice/Score/Noul answers, retries.',
    not: 'Applications that happen to ship a thin wrapper, and provider adapters that live inside a larger framework (those are integrations).',
  },
  integration: {
    label: 'Integrations',
    what: 'An existing framework, platform or product that gained Jev support: a provider, adapter or plugin inside a codebase that is not about Jev.',
    not: 'Standalone tools built around Jev from the start.',
  },
  'agent-tooling': {
    label: 'Agent tooling',
    what: 'Tools that sit in an AI agent or developer workflow and use typed decisions to act: tool-call gates, routers, guardrails, MCP servers, code review, CLIs.',
    not: 'General applications that merely call a model, and browser automation (its own section).',
  },
  'browser-computer-use': {
    label: 'Browser & computer use',
    what: 'Drives a browser, desktop or operating system, deciding what to click, type or do next from page or screen state.',
    not: 'Scrapers and extensions that never decide an action.',
  },
  app: {
    label: 'Applications',
    what: 'A product or hosted service someone uses, where a Jev decision is part of what it does: moderation, triage, matching, scoring, pricing.',
    not: 'Examples and experiments with no users (those are demos), and internal libraries.',
  },
  'game-sim': {
    label: 'Games & simulation',
    what: 'A game, robot controller or physics simulation where Jev reacts to game or sensor state, usually in a loop.',
    not: 'Game-themed demos with no running loop.',
  },
  demo: {
    label: 'Demos & playgrounds',
    what: 'Built to show or learn one thing: examples, playgrounds, starters, tutorials, weekend experiments.',
    not: 'Anything with real users or a published package.',
  },
  research: {
    label: 'Benchmarks & research',
    what: 'Measures Jev: benchmarks, calibration studies, accuracy or latency comparisons, reproductions, datasets.',
    not: 'Projects that merely report a benchmark number in their README.',
  },
  list: {
    label: 'Directories',
    what: 'Catalogues of Jev projects — the neighbours of this repository, listed so the ecosystem stays navigable.',
    not: 'Anything with running code of its own.',
  },
};

export const CATEGORY_ORDER = [
  'sdk', 'integration', 'agent-tooling', 'browser-computer-use',
  'app', 'game-sim', 'demo', 'research', 'list',
];

export const CATEGORY_LABELS = Object.fromEntries(
  Object.entries(CATEGORIES).map(([key, c]) => [key, c.label]),
);

// Sent to Jev as choice criteria: the "what" line, plus the exclusion so the
// model sees the boundary rather than guessing it.
export const CHOICE_CRITERIA = Object.fromEntries(
  Object.entries(CATEGORIES).map(([key, c]) => [key, `${c.what} Not: ${c.not}`]),
);
