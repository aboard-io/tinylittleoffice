#!/usr/bin/env node
/**
 * Ship the site and the shortener to Cloudflare, checking what the change can have broken. Always: the
 * types, the strings, the unit tests (node), the browser tests (the kit and every editor in Chromium), the
 * build, and what the build writes after the bundler (scripts/check-build.ts: files.json for the copy kept
 * on the device, the worker's version, the Content-Security-Policy's script hashes). When something on
 * screen changed since the last deploy (the kit, an editor, a style, a page the site serves): the smoke run
 * on the built site too, desktop Chromium and phone WebKit (the smoke, the keyboard alone, axe over every
 * app light and dark, the offline copy). The whole e2e suite only when asked.
 *
 *   npm run deploy                 what the change calls for
 *   npm run deploy -- --visual     the smoke run whatever changed
 *   npm run deploy -- --full       every e2e spec first (slow)
 *   npm run deploy -- --dry-run    the checks, and no deploy (uncommitted changes allowed)
 *
 * What was last deployed is kept in .wrangler/deployed (this checkout's own record; with none, a change
 * counts as on screen). Wrangler deploys `wrangler.jsonc` (dist/ as static assets, with dist/_headers) and
 * `tinier/wrangler.jsonc`, with the account it is logged in to.
 */
import { execSync } from 'node:child_process';
import { existsSync, mkdirSync, readFileSync, writeFileSync } from 'node:fs';

const args = new Set(process.argv.slice(2));
const known = ['--dry-run', '--visual', '--full'];
for (const a of args) if (!known.includes(a)) (console.error(`Unknown option ${a}; the options are ${known.join(', ')}.`), process.exit(2));
const dry = args.has('--dry-run');

const run = (what, cmd) => {
  const t = Date.now();
  process.stdout.write(`\n▸ ${what}\n`);
  execSync(cmd, { stdio: 'inherit' });
  console.log(`  ✓ ${what} (${((Date.now() - t) / 1000).toFixed(0)} s)`);
};
const git = (cmd) => execSync(`git ${cmd}`, { encoding: 'utf8' }).trim();

if (git('status --porcelain') && !dry) {
  console.error('There are changes not committed: commit them first, so what ships is a commit.');
  process.exit(1);
}
const head = git('rev-parse HEAD');
const RECORD = '.wrangler/deployed';
const last = existsSync(RECORD) ? readFileSync(RECORD, 'utf8').trim() : '';
/** The files changed since the last deploy, or null when that is not known (no record, or its commit is not in this checkout). */
let changed = null;
try {
  if (last) changed = git(`diff --name-only ${last} ${head}`).split('\n').filter(Boolean);
} catch {
  changed = null;
}

/** Can this file change what is on screen? The kit, an editor or its style, the shell's page and what it serves; not a definition, a model, templates or tests. */
const onScreen = (f) =>
  /\.css$/.test(f) ||
  /^src\/(main|sw)\.ts$/.test(f) ||
  /^src\/(kit|styles|i18n)\//.test(f) ||
  (/^src\/apps\/[^/]+\/[^/]+\.ts$/.test(f) && !/\/(def|model|templates)\.ts$/.test(f)) ||
  /^(index\.html|vite\.config\.ts|package-lock\.json)$/.test(f) ||
  /^e2e\//.test(f) ||
  (/^public\//.test(f) && !/^public\/og\//.test(f));

const seen = (changed ?? []).filter(onScreen);
const smoke = args.has('--visual') || args.has('--full') || !changed || seen.length > 0;
console.log(
  changed
    ? `Since the last deploy (${last.slice(0, 7)}): ${changed.length} files changed, ${seen.length} on screen${seen.length ? ': ' + seen.slice(0, 6).join(', ') + (seen.length > 6 ? '…' : '') : ''}.`
    : 'No record of the last deploy here: everything is checked.',
);

run('types', 'npm run -s typecheck');
run('strings', 'npm run -s i18n:check');
run('unit tests', 'npm run -s test:unit');
run('the kit and the editors, in Chromium', 'npm run -s test:browser');
// Playwright builds the site itself (playwright.config.ts) and previews it; dist/ is that build afterwards.
if (args.has('--full')) run('every e2e spec on the built site', 'npx playwright test');
else if (smoke) run('the smoke run on the built site', 'npx playwright test e2e/smoke.spec.ts e2e/keyboard.spec.ts e2e/a11y.spec.ts e2e/offline.spec.ts');
else run('build', 'npm run -s build');
run('the offline copy and the policy', 'node scripts/check-build.ts');

if (dry) {
  console.log(`\nDry run: ${head.slice(0, 7)} checked, nothing deployed.`);
  process.exit(0);
}
run('the site', 'npx wrangler deploy');
run('the shortener', 'npx wrangler deploy -c tinier/wrangler.jsonc');
mkdirSync('.wrangler', { recursive: true });
writeFileSync(RECORD, head + '\n');
console.log(`\nDeployed ${head.slice(0, 7)}.`);
