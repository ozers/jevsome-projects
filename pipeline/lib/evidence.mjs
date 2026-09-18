// How much a piece of evidence is worth.
// GitHub code search matches prose as happily as code, so a README that names
// the endpoint looks identical to a client that calls it. Documentation is
// therefore capped at "claimed"; only a source file, a manifest or a config
// counts as proof.

const DOC_FILE = /\.(md|markdown|mdx|rst|txt|adoc)$/i;
const DOC_DIR = /(^|\/)(docs?|documentation|website|blog|\.github)\//i;
const LOCK_FILE = /(^|\/)(package-lock\.json|yarn\.lock|pnpm-lock\.yaml|Cargo\.lock|poetry\.lock|Gemfile\.lock)$/i;

export const CLAIMED = 2;   // says it uses Jev
export const PROVEN = 3;    // code, manifest or config that reaches the API

export function rate(item) {
  const path = item.source?.path ?? '';
  const raw = item.strength ?? 0;
  if (!path || path === 'README') return Math.min(raw, CLAIMED);
  if (LOCK_FILE.test(path)) return Math.min(raw, CLAIMED); // transitive, not a choice
  if (DOC_FILE.test(path) || DOC_DIR.test(path)) return Math.min(raw, CLAIMED);
  return raw;
}

export function score(evidence = []) {
  const rated = evidence.map((item) => ({ ...item, strength: rate(item) }));
  rated.sort((a, b) => b.strength - a.strength);
  return { evidence: rated, strength: rated[0]?.strength ?? 0 };
}
