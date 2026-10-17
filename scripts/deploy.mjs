#!/usr/bin/env node
/**
 * Ship the site, the shortener and the journal to Cloudflare, checking what the change can have broken. Always: the
 * types, the strings, the unit tests (node), the browser tests (the kit and every editor in Chromium), the
 * build, and what the build writes after the bundler (scripts/check-build.ts: the Content-Security-Policy's
 * script hashes and version.json). When something on
 * screen changed since the last deploy (the kit, an editor, a style, a page the site serves): the smoke run
 * on the built site too, desktop Chromium and phone WebKit (the smoke, the keyboard alone, axe over every
 * app light and dark). The whole e2e suite only when asked.
 *
 *   npm run deploy                 what the change calls for
 *   npm run deploy -- --visual     the smoke run whatever changed
 *   npm run deploy -- --full       every e2e spec first (slow)
 *   npm run deploy -- --dry-run    the checks, and no deploy (uncommitted changes allowed)
 *
 * What was last deployed is kept in .wrangler/deployed (this checkout's own record; with none, a change
 * counts as on screen). Then, in order: the shortener's migrations (backends/tinier/migrations/, by wrangler, on the remote
 * database), the site (`backends/cloudflare/site/wrangler.jsonc`: dist/ as static assets, with dist/_headers), the shortener
 * (`backends/cloudflare/tinier/wrangler.jsonc`), the journal (`backends/cloudflare/journal/wrangler.jsonc`), and the command line on npm
 * (packages/doc, when it is not private and npm has not its version yet; with provenance when a GitHub runner runs this).
 *
 * Two callers, one script: a tag v* on GitHub (.github/workflows/deploy.yml, the runner's log public), or a
 * maintainer's machine. CLOUDFLARE_API_TOKEN, CLOUDFLARE_ACCOUNT_ID and NPM_TOKEN come from the environment (the
 * repository's secrets, on a runner) or else from this checkout's .env (never committed). They are taken out of the
 * environment before any check runs, so no test, build or dependency's script sees one, and handed to Wrangler and
 * npm alone; none is printed. A missing one stops everything, before the checks, in a sentence naming it. Before the
 * checks too: each Worker's secret BRAKE_KEY must exist (the shortener's, the site's and the journal's, each set once, by
 * hand), or that Worker would answer nothing.
 */
import { execSync } from 'node:child_process';
import { existsSync, mkdirSync, mkdtempSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';

const args = new Set(process.argv.slice(2));
const known = ['--dry-run', '--visual', '--full'];
for (const a of args) if (!known.includes(a)) (console.error(`Unknown option ${a}; the options are ${known.join(', ')}.`), process.exit(2));
const dry = args.has('--dry-run');
const stop = (sentence) => (console.error(sentence), process.exit(1));

// The three secrets: the environment's, else .env's; out of the environment either way.
const dotenv = existsSync('.env')
  ? Object.fromEntries([...readFileSync('.env', 'utf8').matchAll(/^\s*([A-Z][A-Z0-9_]*)\s*=\s*(.*?)\s*$/gm)].map(([, k, v]) => [k, v.replace(/^(["'])(.*)\1$/, '$2')]))
  : {};
const secret = {};
for (const k of ['CLOUDFLARE_API_TOKEN', 'CLOUDFLARE_ACCOUNT_ID', 'NPM_TOKEN']) {
  const v = process.env[k] || dotenv[k];
  delete process.env[k];
  if (v) secret[k] = v;
}
/** The command line's package: published when it is not private. */
const cli = existsSync('packages/doc/package.json') ? JSON.parse(readFileSync('packages/doc/package.json', 'utf8')) : { private: true };
const missing = ['CLOUDFLARE_API_TOKEN', 'CLOUDFLARE_ACCOUNT_ID', ...(cli.private ? [] : ['NPM_TOKEN'])].filter((k) => !secret[k]);
if (missing.length) {
  const names = missing.length === 1 ? missing[0] : `${missing.slice(0, -1).join(', ')} and ${missing.at(-1)}`;
  stop(
    `Not deployed: ${names} ${missing.length === 1 ? 'is' : 'are'} not set. On GitHub ${missing.length === 1 ? 'it is a repository secret' : 'each is a repository secret'} the deploy workflow names; ` +
      `on a machine, put ${missing.length === 1 ? 'it' : 'them'} in the environment or in this checkout's .env (never committed). docs/self-host.md says where each comes from.`,
  );
}
/** The environment Wrangler runs in: this one, with the Cloudflare token and account. */
const cloudflare = { ...process.env, CLOUDFLARE_API_TOKEN: secret.CLOUDFLARE_API_TOKEN, CLOUDFLARE_ACCOUNT_ID: secret.CLOUDFLARE_ACCOUNT_ID };

const run = (what, cmd, env = process.env) => {
  const t = Date.now();
  process.stdout.write(`\n▸ ${what}\n`);
  execSync(cmd, { stdio: 'inherit', env });
  console.log(`  ✓ ${what} (${((Date.now() - t) / 1000).toFixed(0)} s)`);
};

// Each Worker's BRAKE_KEY, which only a person sets (`wrangler secret put`); asking also proves the token works.
for (const [who, config] of [
  ['the shortener', 'backends/cloudflare/tinier/wrangler.jsonc'],
  ['the site', 'backends/cloudflare/site/wrangler.jsonc'],
  ['the journal', 'backends/cloudflare/journal/wrangler.jsonc'],
]) {
  process.stdout.write(`\n▸ ${who} has its BRAKE_KEY\n`);
  let names;
  try {
    names = JSON.parse(execSync(`npx wrangler secret list -c ${config} --format json`, { encoding: 'utf8', env: cloudflare, stdio: ['ignore', 'pipe', 'pipe'] })).map((s) => s.name);
  } catch (e) {
    stop(
      `Not deployed: Wrangler could not list ${who}'s secrets with this token and account (${String(e.stderr || e.message)
        .trim()
        .split('\n')
        .find((l) => /\S/.test(l))}).`,
    );
  }
  if (!names.includes('BRAKE_KEY')) stop(`Not deployed: ${who} has no BRAKE_KEY. Set it once, by hand: openssl rand -base64 32 | npx wrangler secret put BRAKE_KEY -c ${config}`);
  console.log(`  ✓ ${who} has its BRAKE_KEY`);
}
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
  /^src\/main\.ts$/.test(f) ||
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
run('the policy and the version', 'node scripts/check-build.ts');

/** On a GitHub runner that may ask for an identity (id-token: write), npm signs where the package was built. */
const provenance = Boolean(process.env.ACTIONS_ID_TOKEN_REQUEST_URL);
const ship = [
  // The tables first, so the shortener never runs against a database it does not know. CI: no question to answer.
  ["the shortener's tables", 'npx wrangler d1 migrations apply tinier --remote -c backends/cloudflare/tinier/wrangler.jsonc', { ...cloudflare, CI: 'true' }],
  ['the site', 'npx wrangler deploy -c backends/cloudflare/site/wrangler.jsonc', cloudflare],
  ['the shortener', 'npx wrangler deploy -c backends/cloudflare/tinier/wrangler.jsonc', cloudflare],
  ['the journal', 'npx wrangler deploy -c backends/cloudflare/journal/wrangler.jsonc', cloudflare],
];
if (dry) {
  console.log(`\nDry run: ${head.slice(0, 7)} checked, nothing deployed. A deploy would now run:`);
  for (const [what, cmd] of ship) console.log(`  ${what}: ${cmd}`);
  console.log(
    `  the command line, on npm: ${cli.private ? 'nothing (packages/doc is private)' : `${cli.name} ${cli.version}, if npm has not that version: npm publish --access public --provenance=${provenance}`}`,
  );
  process.exit(0);
}
for (const [what, cmd, env] of ship) run(what, cmd, env);
mkdirSync('.wrangler', { recursive: true });
writeFileSync(RECORD, head + '\n');
publishCli();
console.log(`\nDeployed ${head.slice(0, 7)}.`);

/**
 * The command line, packages/doc, on npm when it is not private and npm has not its version. NPM_TOKEN reaches npm
 * as NODE_AUTH_TOKEN through a .npmrc in a folder of its own, removed after: never the home directory's, never in a
 * log. A version with a part after "-" (1.0.0-next) goes under that dist-tag, as npm asks of a prerelease, and then
 * latest is moved to it as well: while every version is a prerelease the newest is the one to install (Paul,
 * 2026-10-12: "Latest is better"). The package is built first, whole: the command line and its API (npm run
 * build:cli) and the library, the kernel, the commands and the editors (npm run build:lib, docs/library.md). A
 * failure here comes after the site is deployed, and says so.
 */
function publishCli() {
  const what = 'the command line, on npm';
  process.stdout.write(`\n▸ ${what}\n`);
  if (cli.private) return console.log(`  ✓ ${what}: packages/doc is private, so nothing is published`);
  let published = '';
  try {
    published = execSync(`npm view ${cli.name} version`, { encoding: 'utf8', stdio: ['ignore', 'pipe', 'ignore'] }).trim();
  } catch {
    published = ''; // Not on npm yet.
  }
  if (published === cli.version) return console.log(`  ✓ ${what}: ${cli.version} is published already`);
  const dir = mkdtempSync(join(tmpdir(), 'tlo-npm-'));
  try {
    writeFileSync(join(dir, '.npmrc'), '//registry.npmjs.org/:_authToken=${NODE_AUTH_TOKEN}\n');
    execSync('npm run -s build:cli && npm run -s build:lib', { stdio: 'inherit' });
    const tag = cli.version.includes('-') ? ` --tag ${cli.version.split('-')[1].split('.')[0]}` : '';
    const env = { ...process.env, NODE_AUTH_TOKEN: secret.NPM_TOKEN, NPM_CONFIG_USERCONFIG: join(dir, '.npmrc') };
    execSync(`npm publish --access public --provenance=${provenance}${tag}`, { cwd: 'packages/doc', stdio: 'inherit', env });
    if (tag) execSync(`npm dist-tag add ${cli.name}@${cli.version} latest`, { stdio: 'inherit', env });
    console.log(`  ✓ ${what}: ${cli.version} published (npm had ${published || 'none'})`);
  } catch {
    console.error(`  ✗ ${what}: npm publish failed (above); the site, the shortener and the journal are deployed`);
    process.exitCode = 1;
  } finally {
    rmSync(dir, { recursive: true, force: true });
  }
}
