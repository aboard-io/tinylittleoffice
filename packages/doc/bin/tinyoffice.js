#!/usr/bin/env node
/**
 * tinyoffice: TinyLittleOffice from the command line, for people and agents.
 *
 *   tinyoffice apps                                  every app, with a line on each
 *   tinyoffice example <app>                         an example body in the app's format
 *   tinyoffice link <app> [file] [--title T] [--by B] [--md] [--view V]
 *                                                    a link for a body (a file, or stdin); --md reads Markdown or CSV
 *   tinyoffice read <link>                           the document as Markdown (--json for the envelope, --body for the raw body)
 *   tinyoffice eval <link|file>                      a sheet, computed, as CSV; or a model, run, as flows (--set Name=value)
 *   tinyoffice diff <link> <link>                    what the second changed
 *   tinyoffice lint <app> [file]                     unknown icons, a layout that does not exist, a link too long
 *   tinyoffice sign <link> [--key file]              the link, signed (the key is made and kept in the file; ~/.tinyoffice/key by default)
 *   tinyoffice verify <link>                         whether the signature holds, and whose it is
 *   tinyoffice seal <link> --password P              the link, sealed under a password
 *   tinyoffice open <link> --password P              a sealed link, read
 *   tinyoffice render <link> --out file.pdf|png|html|pptx|xlsx|md
 *                                                    the document as a file (needs playwright for anything but .md)
 */
import { readFileSync, writeFileSync, mkdirSync, existsSync } from 'node:fs';
import { homedir } from 'node:os';
import { dirname, join, extname } from 'node:path';
import * as T from '../dist/index.js';

const [cmd, ...rest] = process.argv.slice(2);
const flags = {};
const args = [];
for (let i = 0; i < rest.length; i++) {
  if (rest[i].startsWith('--')) {
    const k = rest[i].slice(2);
    const v = i + 1 < rest.length && !rest[i + 1].startsWith('--') ? rest[++i] : true;
    if (k === 'set') (flags.set ??= []).push(v);
    else flags[k] = v;
  } else args.push(rest[i]);
}
const stdin = () => readFileSync(0, 'utf8');
const bodyFrom = (a) => (a && existsSync(a) ? readFileSync(a, 'utf8') : a ? a : stdin());
const print = (s) => process.stdout.write(s.endsWith('\n') ? s : s + '\n');
const die = (m) => (console.error(m), process.exit(1));

function fileStore(path) {
  return {
    get: () => (existsSync(path) ? readFileSync(path, 'utf8') : null),
    set: (v) => (mkdirSync(dirname(path), { recursive: true }), writeFileSync(path, v, { mode: 0o600 })),
    remove: () => existsSync(path) && writeFileSync(path, ''),
  };
}

const opts = () => ({ title: flags.title, by: flags.by, view: flags.view, site: flags.site });

switch (cmd) {
  case 'apps':
    print(T.apps().map((a) => `${a.id.padEnd(12)} ${a.name.padEnd(16)} ${a.group.padEnd(12)} ${a.blurb}`).join('\n'));
    break;
  case 'example':
    print(T.example(args[0] ?? die('Which app?')));
    break;
  case 'link': {
    const app = args[0] ?? die('Which app?');
    const body = bodyFrom(args[1]);
    print(flags.md ? T.linkFromMarkdown(app, body, opts()) : T.link(app, body, opts()));
    break;
  }
  case 'read': {
    const p = T.parse(args[0] ?? stdin().trim());
    if (p.sealed) die('Sealed: use `tinyoffice open <link> --password P`');
    print(flags.json ? JSON.stringify({ app: p.app, view: p.view, ...p.env }, null, 2) : flags.body ? p.env.body : p.markdown);
    break;
  }
  case 'eval': {
    const src = args[0] ?? stdin().trim();
    const p = /#\//.test(src) ? T.parse(src) : { app: flags.app ?? 'sheet', env: { body: T.read(flags.app ?? 'sheet', bodyFrom(src)) } };
    if (p.app === 'flow') {
      const set = Object.fromEntries((flags.set ?? []).map((kv) => [kv.split('=')[0], +kv.split('=')[1]]));
      const r = T.runModel(p.env.body, set);
      print(r.flows.map((f) => `${f.from} > ${f.to}: ${f.value}`).join('\n'));
    } else print(T.evaluateSheet(p.env.body).map((r) => r.map((c) => (/[",\n]/.test(c) ? `"${c.replace(/"/g, '""')}"` : c)).join(',')).join('\n'));
    break;
  }
  case 'lint': {
    const app = args[0] ?? die('Which app?');
    const warnings = await T.lint(app, bodyFrom(args[1]), opts());
    print(warnings.length ? warnings.map((w) => `${w.level}${w.line ? ` line ${w.line}` : ''}: ${w.message}`).join('\n') : 'ok');
    process.exit(warnings.some((w) => w.level === 'error') ? 1 : 0);
  }
  // eslint-disable-next-line no-fallthrough
  case 'diff': {
    const r = T.compare(args[0], args[1]);
    print(r.changes.map((c) => `${c.kind} ${c.line}`).join('\n') + (r.same ? '\n(same)' : ''));
    break;
  }
  case 'sign': {
    const signer = T.createSigner(fileStore(flags.key ?? join(homedir(), '.tinyoffice', 'key')));
    print(await T.signed(args[0] ?? stdin().trim(), signer));
    break;
  }
  case 'verify': {
    const r = await T.verified(args[0] ?? stdin().trim());
    print(r === null ? 'unsigned' : r.ok ? `valid: signed by ${r.by}` : 'INVALID: the document does not match its signature');
    process.exit(r === null ? 2 : r.ok ? 0 : 1);
  }
  // eslint-disable-next-line no-fallthrough
  case 'seal':
    print(await T.sealed(args[0] ?? stdin().trim(), flags.password ?? die('--password?')));
    break;
  case 'open': {
    const p = await T.open(args[0] ?? stdin().trim(), flags.password ?? die('--password?'));
    print(flags.json ? JSON.stringify({ app: p.app, ...p.env }, null, 2) : flags.body ? p.env.body : p.markdown);
    break;
  }
  case 'render': {
    const url = args[0] ?? stdin().trim();
    const out = flags.out ?? die('--out file.pdf (or .png, .html, .pptx, .xlsx, .md)?');
    const ext = extname(out).slice(1);
    const p = T.parse(url);
    if (ext === 'md') {
      writeFileSync(out, p.markdown);
      print(out);
      break;
    }
    let chromium;
    try {
      ({ chromium } = await import('playwright'));
    } catch {
      die('Rendering needs playwright: npm i playwright && npx playwright install chromium');
    }
    const browser = await chromium.launch();
    const page = await browser.newPage({ acceptDownloads: true });
    const view = url.replace(/#\/v2\/([a-z0-9-]+)(\.[a-z0-9]+)?\//, `#/v2/$1.${ext}/`);
    const [download] = await Promise.all([page.waitForEvent('download', { timeout: 60000 }), page.goto(view)]);
    await download.saveAs(out);
    await browser.close();
    print(out);
    break;
  }
  default:
    print(readFileSync(new URL(import.meta.url), 'utf8').split('\n').slice(2, 18).map((l) => l.replace(/^ \* ?/, '')).join('\n'));
    process.exit(cmd ? 1 : 0);
}
