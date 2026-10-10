/**
 * Is the live site the build of its commit? (docs/transparency.md §1 item 3.) The site's own /version.json
 * says which commit it runs; that commit (or the one named) is built here, in a fresh checkout
 * (scripts/builds.ts), or this checkout's dist/ is used when it is that commit's build already; then every
 * file the build serves is fetched from the site, hashed and compared. A table, a line per file, and exit 1
 * on any difference. Reproducible builds (scripts/reproducible.ts) are what make the answer mean anything.
 *
 *   npm run verify-deploy -- https://tinylittleoffice.com/            the commit the site says it runs
 *   node scripts/verify-deploy.ts https://tinylittleoffice.com/ v1.0  against that commit or tag
 *
 * A fresh build is made for the site's address (VITE_SITE_URL, which the pages' link-preview tags name) unless
 * this checkout's .env or the environment sets it, as a deploy's build would.
 *
 * Every file of the build but _headers, which the host reads and does not serve. A file another host would
 * change on the way (compression aside, which fetch undoes) counts as different: the pages are served with
 * no-transform (public/_headers).
 */
import { join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { buildCommit, commitOf, distIs, hashTree, ROOT, sha256, viteEnv, type Made } from './builds.ts';
import { isVersion, type Version } from '../src/kit/version.ts';

/** A file of the build and how the site's copy compares. */
export interface Row {
  path: string;
  want: string;
  got: string | null;
  /** "same", "differs", or why the site's copy could not be had ("404", "failed: …"). */
  status: string;
}

/** The paths the site serves, from a build's hashes: everything but the host's own _headers. A page is asked for by its folder. */
export const served = (built: Map<string, string>) => [...built.keys()].filter((p) => p !== '_headers');
export const addressOf = (site: string, path: string) => new URL(path.replace(/(^|\/)index\.html$/, '$1'), site).href;

/** The rows as a table: the path, the build's hash and the site's (twelve characters each), and the verdict. */
export function table(rows: Row[]): string {
  const w = Math.max(4, ...rows.map((r) => r.path.length));
  const line = (a: string, b: string, c: string, d: string) => `${a.padEnd(w)}  ${b.padEnd(12)}  ${c.padEnd(12)}  ${d}`;
  return [
    line('file', 'built', 'live', ''),
    line('-'.repeat(w), '-'.repeat(12), '-'.repeat(12), '-'.repeat(7)),
    ...rows.map((r) => line(r.path, r.want.slice(0, 12), r.got?.slice(0, 12) ?? '-', r.status)),
  ].join('\n');
}

/** Each file fetched from `site` and compared with the build's hash, six at a time. */
export async function compare(site: string, built: Map<string, string>, get: typeof fetch = fetch): Promise<Row[]> {
  const paths = served(built);
  const rows: Row[] = new Array(paths.length);
  let next = 0;
  const worker = async () => {
    while (next < paths.length) {
      const i = next++;
      const path = paths[i];
      const want = built.get(path)!;
      try {
        const res = await get(addressOf(site, path), { cache: 'no-store', redirect: 'follow' });
        if (!res.ok) rows[i] = { path, want, got: null, status: String(res.status) };
        else {
          const got = sha256(new Uint8Array(await res.arrayBuffer()));
          rows[i] = { path, want, got, status: got === want ? 'same' : 'differs' };
        }
      } catch (e) {
        rows[i] = { path, want, got: null, status: `failed: ${(e as Error).message}` };
      }
    }
  };
  await Promise.all(Array.from({ length: 6 }, worker));
  return rows;
}

async function main() {
  const [site, ref] = process.argv.slice(2);
  if (!site || !/^https?:\/\//.test(site)) {
    console.error('Usage: node scripts/verify-deploy.ts <site url> [commit or tag]');
    process.exit(2);
  }
  const base = site.endsWith('/') ? site : `${site}/`;
  let live: Version | null = null;
  try {
    const res = await fetch(new URL('version.json', base), { cache: 'no-store' });
    const v: unknown = res.ok ? await res.json() : null;
    live = isVersion(v) ? v : null;
  } catch {
    live = null;
  }
  if (live) console.log(`${base} says it runs ${live.commit.slice(0, 7)}${live.tag ? ` (${live.tag})` : ''}, committed ${live.built}.`);
  else console.log(`${base} has no /version.json it can be asked for.`);
  const name = ref ?? live?.commit;
  if (!name) {
    console.error('Name the commit to check it against: node scripts/verify-deploy.ts <url> <commit>');
    process.exit(2);
  }
  const commit = commitOf(name);
  if (!commit) {
    console.error(`No commit ${name} in this checkout: git fetch --tags, then again.`);
    process.exit(2);
  }
  if (live && live.commit !== commit) console.log(`  ! the site says ${live.commit.slice(0, 7)}; checking it against ${commit.slice(0, 7)} as asked.`);

  // This checkout's dist/ when it is that commit's build (the commit checked out, nothing changed, its version.json the commit's); else a fresh build.
  const dist = join(ROOT, 'dist');
  let made: Made | null = null;
  if (distIs(commit)) console.log(`Using dist/, the build of ${commit.slice(0, 7)} already here.`);
  else {
    // The pages name the address they are published at (VITE_SITE_URL): the site's, unless this checkout's settings say.
    const site = viteEnv().VITE_SITE_URL ?? base;
    console.log(`Building ${commit.slice(0, 7)} for ${site}…`);
    made = buildCommit(commit, 'verify', { env: { VITE_SITE_URL: site } });
  }
  try {
    const built = hashTree(made?.dist ?? dist);
    const rows = await compare(base, built);
    console.log(`\n${table(rows)}\n`);
    const bad = rows.filter((r) => r.status !== 'same');
    if (bad.length) {
      console.error(`  ✗ ${bad.length} of ${rows.length} files are not the build of ${commit.slice(0, 7)}.`);
      process.exitCode = 1;
    } else console.log(`  ✓ every one of ${rows.length} files is the build of ${commit.slice(0, 7)}.`);
  } finally {
    made?.done();
  }
}

if (process.argv[1] && resolve(process.argv[1]) === fileURLToPath(import.meta.url)) await main();
