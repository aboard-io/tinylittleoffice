#!/usr/bin/env node
/**
 * Ship the site and the shortener to Cloudflare, checking only what the
 * change can have broken. Always (about half a minute): the types, the
 * unit tests (node), the editors in an emulated browser (Vitest with
 * happy-dom), and the build. When something on screen changed since the
 * last deploy (an editor, a style, the shell, a widget, a page the site
 * serves): the smoke check in a real browser too, every app opened at
 * desktop and phone size (e2e/smoke.spec.ts, e2e/header.spec.ts). The
 * whole browser suite only when asked.
 *
 *   npm run deploy                 what the change calls for
 *   npm run deploy -- --visual     the smoke check whatever changed
 *   npm run deploy -- --full       every browser test first (slow)
 *   npm run deploy -- --dry-run    the checks, and no deploy
 *
 * What was last deployed is kept in .wrangler/deployed (this checkout's
 * own record; with none, a change counts as visual).
 */
import { execSync } from 'node:child_process';
import { existsSync, mkdirSync, readFileSync, writeFileSync } from 'node:fs';

const args = new Set(process.argv.slice(2));
const run = (what, cmd) => {
  const t = Date.now();
  process.stdout.write(`\n▸ ${what}\n`);
  execSync(cmd, { stdio: 'inherit' });
  console.log(`  ✓ ${what} (${((Date.now() - t) / 1000).toFixed(0)} s)`);
};
const git = (cmd) => execSync(`git ${cmd}`, { encoding: 'utf8' }).trim();

if (git('status --porcelain') && !args.has('--dry-run')) {
  console.error('There are changes not committed: commit them first, so what ships is a commit.');
  process.exit(1);
}
const head = git('rev-parse HEAD');
const RECORD = '.wrangler/deployed';
const last = existsSync(RECORD) ? readFileSync(RECORD, 'utf8').trim() : '';
const changed = last ? git(`diff --name-only ${last} ${head}`).split('\n').filter(Boolean) : [];

/** Can this file change what is on screen? Editors, styles, the shell, widgets, the kit's browser half, the page and what it serves. */
const visual = (f) =>
  /\.css$/.test(f) ||
  (/^src\/apps\/[^/]+\.ts$/.test(f) && !/\.def\.ts$/.test(f)) ||
  /^src\/(app|main|kit)\.ts$/.test(f) ||
  /^src\/(widgets|kit)\//.test(f) ||
  /^src\/lib\/(pageedit|shoelace|icons)\.ts$/.test(f) ||
  /^(index\.html|vite\.config\.ts|package-lock\.json)$/.test(f) ||
  (/^public\//.test(f) && !/^public\/og\//.test(f));

const onScreen = changed.filter(visual);
const smoke = args.has('--visual') || args.has('--full') || !last || onScreen.length > 0;
console.log(last ? `Since the last deploy (${last.slice(0, 7)}): ${changed.length} files changed, ${onScreen.length} on screen${onScreen.length ? ': ' + onScreen.slice(0, 6).join(', ') + (onScreen.length > 6 ? '…' : '') : ''}.` : 'No record of the last deploy: everything is checked.');

run('types', 'npm run -s typecheck');
run('unit tests', 'npm run -s test:unit');
run('editors, in an emulated browser', 'npm run -s test:dom');
if (args.has('--full')) run('every browser test (builds the site)', 'npx playwright test');
else if (smoke) run('smoke check in a real browser (builds the site)', 'npx playwright test e2e/smoke.spec.ts e2e/header.spec.ts');
else run('build', 'npm run -s build');

if (args.has('--dry-run')) {
  console.log('\nDry run: nothing deployed.');
  process.exit(0);
}
run('the site', 'npx wrangler deploy');
run('the shortener', 'npx wrangler deploy -c tinier/wrangler.jsonc');
mkdirSync('.wrangler', { recursive: true });
writeFileSync(RECORD, head + '\n');
console.log(`\nDeployed ${head.slice(0, 7)}.`);
