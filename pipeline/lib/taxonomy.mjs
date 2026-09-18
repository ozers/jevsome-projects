// Shared category definitions. The descriptions are sent to Jev verbatim as
// choice criteria, so the heuristic path and the model path classify against
// exactly the same wording.

export const CATEGORIES = {
  sdk: 'A client library or SDK that wraps the TypeSafe System One API for a language or runtime.',
  integration: 'Plugs Jev into an existing framework, platform or product (web framework, ORM, home automation, LLM gateway, CMS).',
  'agent-tooling': 'Tooling for AI agents and developers: tool-call gates, routers, guardrails, MCP servers, code review, CLIs.',
  'browser-computer-use': 'Drives a browser, desktop or operating system by making typed decisions about what to click or do next.',
  app: 'An end-user application or hosted service whose product value comes from Jev decisions.',
  'game-sim': 'A game, robotics controller or physical simulation where Jev reacts to game or sensor state.',
  demo: 'A small demo, playground, example, tutorial or starter template rather than a maintained product.',
  research: 'Benchmarks, evaluations, calibration studies, reproductions or comparisons against other models.',
  list: 'A directory, awesome list or catalogue of other Jev projects rather than a project itself.',
};

export const CATEGORY_LABELS = {
  sdk: 'SDKs & clients',
  integration: 'Integrations',
  'agent-tooling': 'Agent tooling',
  'browser-computer-use': 'Browser & computer use',
  app: 'Applications',
  'game-sim': 'Games & simulation',
  demo: 'Demos & playgrounds',
  research: 'Benchmarks & research',
  list: 'Other directories',
};

export const CATEGORY_ORDER = [
  'sdk', 'integration', 'agent-tooling', 'browser-computer-use',
  'app', 'game-sim', 'demo', 'research', 'list',
];
