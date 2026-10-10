/**
 * What a deploy checks of a build before it ships (scripts/deploy.mjs): the Content-Security-Policy and
 * the build's version, what the build writes after the bundler is done (vite.config.ts) and no test in the
 * browser sees.
 *
 *   - dist/_headers has the scripts' hashes in place of {{scripts}}: every script the apps' pages carry
 *     (src/kit/page.ts) and every inline script of a built page, or the browser would refuse to run it.
 *   - dist/version.json has the shape of src/kit/version.ts and the same script hashes as the policy.
 *
 *   node scripts/check-build.ts      the build in dist/, checked; a line per problem, and exit 1
 */
import { createHash } from 'node:crypto';
import { existsSync, readFileSync, readdirSync, type Dirent } from 'node:fs';
import { relative, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { isVersion } from '../src/kit/version.ts';

const hash = (code: string) => `'sha256-${createHash('sha256').update(code).digest('base64')}'`;

/** Every file of the build, relative to dist with forward slashes. */
function builtFiles(dist: string): string[] {
  return (readdirSync(dist, { recursive: true, withFileTypes: true }) as Dirent[]).filter((f) => f.isFile()).map((f) => relative(dist, resolve(f.parentPath, f.name)).replaceAll('\\', '/'));
}

/** The problems with the build in `dist`, in words; none when it may ship. `scripts` are the apps' page scripts. */
export function checkBuild(dist: string, scripts: string[] = []): string[] {
  const problems: string[] = [];
  const at = (p: string) => resolve(dist, p);
  if (!existsSync(at('index.html'))) return [`No build in ${dist}: run npm run build`];
  const built = builtFiles(dist);

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
      else if (
        policies.length &&
        version.csp.scripts.map((s) => `'${s}'`).join(' ') !==
          policies[0]
            .split(/\s+/)
            .filter((h) => h.startsWith("'sha256-"))
            .join(' ')
      )
        problems.push('version.json’s script hashes are not the policy’s');
    }
    for (const f of built.filter((b) => b.endsWith('.html'))) {
      const page = readFileSync(at(f), 'utf8');
      for (const m of page.matchAll(/<script(?![^>]*\bsrc=)(?![^>]*type="application\/(?:ld\+)?json")[^>]*>([\s\S]*?)<\/script>/g))
        if (m[1].trim() && !allowed(hash(m[1]))) problems.push(`${f} has an inline script the policy does not allow`);
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
  console.log(`  ✓ the policy's ${pageScripts().length} script hashes and version.json agree with the build`);
}
