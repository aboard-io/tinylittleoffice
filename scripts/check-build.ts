/**
 * What a deploy checks of a build before it ships (scripts/deploy.mjs): the copy kept on the device and the
 * Content-Security-Policy, the two things the build writes after the bundler is done (vite.config.ts) and
 * no test in the browser sees.
 *
 *   - dist/files.json lists every file the device keeps (scripts/offline-files.ts), each one there, and its
 *     version is the one the build's files make now; dist/sw.js carries that version, so a new build is a
 *     new worker.
 *   - dist/_headers has the scripts' hashes in place of {{scripts}}: every script the apps' pages carry
 *     (src/kit/page.ts) and every inline script of a built page, or the browser would refuse to run it.
 *   - dist/version.json has the shape of src/kit/version.ts and the same script hashes as the policy.
 *
 *   node scripts/check-build.ts      the build in dist/, checked; a line per problem, and exit 1
 */
import { createHash } from 'node:crypto';
import { existsSync, readFileSync, readdirSync, statSync, type Dirent } from 'node:fs';
import { relative, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { offlineList, type OfflineList } from './offline-files.ts';
import { isVersion } from '../src/kit/version.ts';

const hash = (code: string) => `'sha256-${createHash('sha256').update(code).digest('base64')}'`;

/** Every file of the build, relative to dist with forward slashes, and its size. */
function builtFiles(dist: string) {
  return (readdirSync(dist, { recursive: true, withFileTypes: true }) as Dirent[])
    .filter((f) => f.isFile())
    .map((f) => ({ path: relative(dist, resolve(f.parentPath, f.name)).replaceAll('\\', '/'), bytes: statSync(resolve(f.parentPath, f.name)).size }));
}

/** The problems with the build in `dist`, in words; none when it may ship. `scripts` are the apps' page scripts. */
export function checkBuild(dist: string, scripts: string[] = []): string[] {
  const problems: string[] = [];
  const at = (p: string) => resolve(dist, p);
  if (!existsSync(at('index.html'))) return [`No build in ${dist}: run npm run build`];
  const built = builtFiles(dist);

  // The offline copy.
  let list: OfflineList | null = null;
  try {
    list = JSON.parse(readFileSync(at('files.json'), 'utf8')) as OfflineList;
  } catch {
    problems.push('files.json is missing or not JSON');
  }
  if (list) {
    const want = offlineList(built);
    for (const name of list.files) if (!existsSync(at(name === '' || name.endsWith('/') ? `${name}index.html` : name))) problems.push(`files.json names ${name || '/'}, which the build does not have`);
    const missing = want.files.filter((f) => !list.files.includes(f));
    if (missing.length) problems.push(`files.json leaves out ${missing.slice(0, 5).join(', ')}${missing.length > 5 ? '…' : ''}`);
    if (list.version !== want.version) problems.push(`files.json is version ${list.version}, the build's files make ${want.version}`);
    const sw = existsSync(at('sw.js')) ? readFileSync(at('sw.js'), 'utf8') : '';
    if (!sw) problems.push('sw.js is missing');
    else if (sw.includes('__TLO_VERSION__') || !sw.includes(list.version)) problems.push('sw.js does not carry the version of files.json');
  }

  // The Content-Security-Policy.
  const headers = existsSync(at('_headers')) ? readFileSync(at('_headers'), 'utf8') : '';
  if (!headers) problems.push('_headers is missing');
  else {
    if (headers.includes('{{scripts}}')) problems.push('_headers still has {{scripts}}: the hashes were not written');
    const policies = [...headers.matchAll(/script-src ([^;]*);/g)].map((m) => m[1]);
    if (!policies.length) problems.push('_headers has no script-src');
    const allowed = (h: string) => policies.every((p) => p.split(/\s+/).includes(h));
    for (const code of scripts) if (!allowed(hash(code))) problems.push(`a page script is not in the policy: ${code.slice(0, 40).replace(/\s+/g, ' ')}…`);
    // /version.json names the same hashes, for anyone checking the site against its source.
    let version: unknown = null;
    try {
      version = JSON.parse(readFileSync(at('version.json'), 'utf8'));
    } catch {
      problems.push('version.json is missing or not JSON');
    }
    if (version !== null) {
      if (!isVersion(version)) problems.push('version.json is not { commit, tag, built, csp: { scripts } }');
      else if (policies.length && version.csp.scripts.map((s) => `'${s}'`).join(' ') !== policies[0].split(/\s+/).filter((h) => h.startsWith("'sha256-")).join(' ')) problems.push('version.json’s script hashes are not the policy’s');
    }
    for (const f of built.filter((b) => b.path.endsWith('.html'))) {
      const page = readFileSync(at(f.path), 'utf8');
      for (const m of page.matchAll(/<script(?![^>]*\bsrc=)(?![^>]*type="application\/(?:ld\+)?json")[^>]*>([\s\S]*?)<\/script>/g)) if (m[1].trim() && !allowed(hash(m[1]))) problems.push(`${f.path} has an inline script the policy does not allow`);
    }
  }
  return problems;
}

if (process.argv[1] && resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  // The registry first: the apps declare their page scripts as they load.
  await import('../src/kit/apps.ts');
  const { pageScripts } = await import('../src/kit/page.ts');
  const problems = checkBuild(resolve(import.meta.dirname, '..', 'dist'), pageScripts());
  for (const p of problems) console.error(`  ✗ ${p}`);
  if (problems.length) process.exit(1);
  console.log(`  ✓ files.json, sw.js and the policy's ${pageScripts().length} script hashes agree with the build`);
}
