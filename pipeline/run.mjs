// Full refresh: discover -> enrich -> verify -> classify -> health -> build.
// Each stage persists its own file, so a failure part-way through leaves the
// previous run's data intact and the next run resumes from it.

import { discover } from './discover.mjs';
import { enrich } from './enrich.mjs';
import { verify } from './verify.mjs';
import { classify } from './classify.mjs';
import { health } from './health.mjs';
import { build } from './build.mjs';

const only = process.argv.slice(2);
const wanted = (name) => only.length === 0 || only.includes(name);

if (wanted('discover')) await discover();
if (wanted('enrich')) await enrich();
if (wanted('verify')) await verify();
if (wanted('classify')) await classify();
if (wanted('health')) await health();
if (wanted('build')) await build();
