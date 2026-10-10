/**
 * Two builds of one commit are the same bytes (docs/transparency.md §1 item 3): the commit is built twice,
 * each in a fresh checkout at a different path and depth (scripts/builds.ts), every file of both dist/ folders is
 * hashed, and the first difference is printed; this checkout's dist/ too, when it is that commit's build. Nothing a build writes may come from the clock, the
 * machine, the path it is built at or the order a folder is read in; a difference here is one of those.
 * CI runs it (.github/workflows/ci.yml when there is one, and the release, .github/workflows/release.yml).
 *
 *   npm run build:verify               HEAD, built twice
 *   node scripts/reproducible.ts v1.0  that commit or tag
 */
import { join } from 'node:path';
import { buildCommit, commitOf, distIs, firstDifference, hashTree, ROOT } from './builds.ts';

const ref = process.argv[2] ?? 'HEAD';
const commit = commitOf(ref);
if (!commit) {
  console.error(`No commit ${ref} in this checkout.`);
  process.exit(2);
}
console.log(`Building ${commit.slice(0, 7)} twice…`);
const a = buildCommit(commit, 'a');
let b;
try {
  b = buildCommit(commit, 'b', { deep: true });
} catch (e) {
  a.done();
  throw e;
}
try {
  const ha = hashTree(a.dist);
  const hb = hashTree(b.dist);
  const diff = firstDifference(ha, hb);
  if (diff) {
    console.error(`  ✗ the two builds differ. First: ${diff}`);
    process.exitCode = 1;
  } else console.log(`  ✓ the two builds of ${commit.slice(0, 7)} are the same bytes: ${ha.size} files`);
  // And this checkout's dist/, when it is that commit's build: what a release attests and ships is what anyone builds.
  if (distIs(commit)) {
    const here = firstDifference(hashTree(join(ROOT, 'dist')), ha, ['dist/', 'a fresh build']);
    if (here) {
      console.error(`  ✗ dist/ is not the same. First: ${here}`);
      process.exitCode = 1;
    } else console.log('  ✓ and dist/ here is the same bytes');
  }
} finally {
  a.done();
  b.done();
}
