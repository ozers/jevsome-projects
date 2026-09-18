// What gets listed, and how prominently.
// Proof that a repository calls Jev is the hard gate. It is not the only
// question: a personal dotfiles repo with an API key in a shell profile calls
// Jev and still does not belong in a project directory, and a two-day-old
// weekend experiment should not sit next to a maintained library.

const PERSONAL_CONFIG = /^(\.?dotfiles|dot-?files|my-?configs?|configs?|nvim|neovim|vimrc|zsh|zshrc|bashrc|emacs\.d|home-?manager|nix-?config|machine-?setup|workstation|setup|env)$/i;
const CONFIG_TOPICS = new Set(['dotfiles', 'dotfile', 'nixos-config', 'home-manager', 'personal-config']);
const PERSONAL_NOTES = /^(notes?|scratch|tmp|test|testing|playground-?\d*|untitled|new-?repo)$/i;

const DOCS_REPO = /(^|[-_])(docs?|documentation|handbook|awesome)$/i;
// Models that copy Jev's interface without calling Jev. They say so in the
// first line of their own description.
const REIMPLEMENTATION = /\b(re-?implementation|re-?creation|reimplements|recreates)\b|\bjev-?(style|like)\b|\bopen[- ]?jev\b/i;
const CATALOGUE = /database of (ai )?models|model (catalog|catalogue|directory)|list of (ai )?models|documentation (site|for)/i;

// A data file describing the model is not a call to it. Model catalogues,
// pricing tables and provider registries all "contain" jev-latest without
// integrating anything.
const CATALOGUE_PATH = /(^|\/)(catalog|catalogue|registry|models?|providers?|pricing)(\/|[-_])/i;
const DATA_FILE = /\.(json|toml|ya?ml|csv)$/i;

export function catalogueOnly(proof) {
  if (!proof || proof.kind !== 'model-route') return null;
  const path = proof.source?.path ?? proof.path ?? '';
  if (DATA_FILE.test(path) && CATALOGUE_PATH.test(path)) {
    return 'a model catalogue entry, not a call';
  }
  return null;
}

// Reasons an entry is kept out even with proof. Recorded, never silent.
export function disqualify(repo) {
  const name = repo.name ?? '';
  const topics = new Set(repo.topics ?? []);
  if (PERSONAL_CONFIG.test(name) || [...topics].some((t) => CONFIG_TOPICS.has(t))) {
    return 'personal configuration, not a project';
  }
  if (PERSONAL_NOTES.test(name) && repo.stars < 3) {
    return 'scratch repository';
  }
  if (repo.isFork && repo.stars < 5) {
    return 'unmodified fork';
  }
  if (DOCS_REPO.test(name)) {
    return 'documentation repository, not a project';
  }
  if (CATALOGUE.test(repo.description ?? '')) {
    return 'catalogue of models, not a project built on Jev';
  }
  if (REIMPLEMENTATION.test(`${repo.name} ${repo.description ?? ''}`)) {
    return 'reimplementation of the Jev interface on another model; does not call Jev';
  }
  return null;
}

// Jev went public on 2026-09-16. A repository created after that date and
// calling the API exists *because of* Jev; one created years earlier does not.
const JEV_PUBLIC = '2026-09-15';
const ANNOUNCES_JEV = /\bjev\b|typesafe|system[- ]one/i;

// Proof that a project calls Jev does not say how much Jev matters to it.
// A framework where Jev is the hundredth provider and a game that cannot run
// without it are both "users" of the API and belong in different places.
export function focus(repo, proof) {
  const announces = ANNOUNCES_JEV.test(repo.name ?? '')
    || ANNOUNCES_JEV.test(repo.description ?? '')
    || (repo.topics ?? []).some((t) => ANNOUNCES_JEV.test(t));
  const bornAfter = (repo.createdAt ?? '') >= JEV_PUBLIC;
  if (announces || bornAfter) return 'built-on';

  // An older project that added Jev quietly: support, not subject.
  return 'supports';
}

// Two shelves, by signals a reader can check, not by taste. `listed` entries
// carry at least one sign that someone besides the author uses the project;
// the rest are real and proven, just brand new.
export function shelf(repo, { homepageLive } = {}) {
  const signals = [
    repo.stars >= 3,
    Boolean(repo.license),
    homepageLive === true,
    Boolean(repo.description) && (repo.topics ?? []).length > 0,
  ].filter(Boolean).length;
  return signals >= 1 ? 'listed' : 'new';
}

// The bar for the README and the site. Everything else that passed the proof
// gate stays in data/index.json as a candidate, so the list can grow by
// changing numbers here rather than by re-running anything.
//
// "Verified" means all of: the repository exists because of Jev (built-on),
// says so itself (name, description or topics), and the proof is real code —
// not a mock, not a recorded cassette, not a data file. The star floor is a
// presentation choice, not a correctness one: it keeps two-day-old hackathon
// forks off the front page until someone besides the author cares.
export const VERIFIED_MIN_STARS = 5;
export const OFFICIAL_OWNERS = new Set(['typesafe-ai']);

const STRONG_KINDS = new Set(['api-call', 'sdk-import', 'sdk-call', 'dependency']);
const CODE_FILE = /\.(ts|tsx|js|jsx|mjs|cjs|py|rs|go|rb|ex|exs|php|swift|kt|java|cs|zig|dart|lua|sh|scala|clj|ml|hs|c|cc|cpp|m|mm)$/i;
const FAKE_PATH = /mock|fixture|stub|snapshot|cassette|__tests__\/fixtures/i;

export function strongProof(proof) {
  if (!proof || proof.strength < 3) return false;
  const path = proof.source?.path ?? proof.path ?? '';
  if (FAKE_PATH.test(path)) return false;
  if (STRONG_KINDS.has(proof.kind)) return true;
  // A pinned route inside source code is a real integration; the same string
  // in a JSON or TOML file is usually a catalogue or a config template.
  return proof.kind === 'model-route' && CODE_FILE.test(path);
}

export function announces(repo) {
  return ANNOUNCES_JEV.test(repo.name ?? '')
    || ANNOUNCES_JEV.test(repo.description ?? '')
    || (repo.topics ?? []).some((t) => ANNOUNCES_JEV.test(t));
}

export function tier(repo, proof, focusValue) {
  if (OFFICIAL_OWNERS.has((repo.owner ?? '').toLowerCase()) && strongProof(proof)) return 'verified';
  if (focusValue !== 'built-on') return 'candidate';
  if (!announces(repo)) return 'candidate';
  if (!strongProof(proof)) return 'candidate';
  if ((repo.stars ?? 0) < VERIFIED_MIN_STARS) return 'candidate';
  return 'verified';
}
