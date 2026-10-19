// Whole-repository scan without the search API.
// codeload.github.com serves `git archive` tarballs outside the REST rate
// limits, so verification can read every file of a repository in one request
// instead of spending code searches that cost ten-minute penalties. The
// archive's pax header carries the commit id, which makes every proof link a
// permalink that survives the file being moved later.

import zlib from 'node:zlib';

const MAX_COMPRESSED = 40 * 1024 * 1024;   // skip monorepos; they are not who this is for
const MAX_FILE = 400 * 1024;
const SOURCE = /\.(ts|tsx|js|jsx|mjs|cjs|py|rs|go|rb|ex|exs|php|swift|kt|kts|java|cs|zig|dart|lua|sh|scala|clj|ml|hs|c|cc|cpp|h|m|mm|vue|svelte|astro|json|toml|ya?ml|lock|txt|cfg|ini|env\.example|gemspec|gradle)$|(^|\/)(Gemfile|mix\.exs|go\.mod|Package\.swift|Dockerfile)$/i;
const SKIP_DIR = /(^|\/)(node_modules|vendor|dist|build|\.next|target|\.git|__pycache__|\.venv|venv|coverage)\//;

const str = (b) => b.toString('utf8').replace(/\0.*$/s, '');
const octal = (b) => parseInt(str(b).trim() || '0', 8);

function parsePax(body) {
  const out = {};
  for (const line of body.toString('utf8').split('\n')) {
    const m = line.match(/^\d+ ([^=]+)=(.*)$/);
    if (m) out[m[1]] = m[2];
  }
  return out;
}

// Yields { path, text } for every source-like file, plus the commit id.
export async function readRepo(fullName, { signal } = {}) {
  const res = await fetch(`https://codeload.github.com/${fullName}/tar.gz/HEAD`, {
    signal: signal ?? AbortSignal.timeout(60_000),
  });
  if (!res.ok) return { ok: false, status: res.status, files: [] };
  const gz = Buffer.from(await res.arrayBuffer());
  if (gz.length > MAX_COMPRESSED) return { ok: false, status: 'too-large', files: [] };
  const tar = zlib.gunzipSync(gz);

  const files = [];
  let commit = null;
  let longName = null;
  for (let off = 0; off + 512 <= tar.length;) {
    const header = tar.subarray(off, off + 512);
    if (header.every((b) => b === 0)) break;
    const size = octal(header.subarray(124, 136));
    const type = String.fromCharCode(header[156] || 48);
    const body = tar.subarray(off + 512, off + 512 + size);
    off += 512 + Math.ceil(size / 512) * 512;

    if (type === 'g') { commit = parsePax(body).comment ?? commit; continue; }
    if (type === 'x') { longName = parsePax(body).path ?? null; continue; }
    if (type !== '0' && type !== '\0') { longName = null; continue; }

    const prefix = str(header.subarray(345, 500));
    let path = longName ?? (prefix ? `${prefix}/${str(header.subarray(0, 100))}` : str(header.subarray(0, 100)));
    longName = null;
    path = path.replace(/^[^/]+\//, '');             // drop the "repo-sha/" root
    if (size > MAX_FILE || SKIP_DIR.test(path) || !SOURCE.test(path)) continue;
    files.push({ path, text: body.toString('utf8') });
  }
  return { ok: true, commit, files };
}
