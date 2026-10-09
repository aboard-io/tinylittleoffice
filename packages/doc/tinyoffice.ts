#!/usr/bin/env node
/**
 * tinyoffice: Tiny Little Office from the command line, for people and agents. Links from files, files from
 * links; over src/api.ts (the same module the site serves at /api.js), run by Node 24 as it is (no build).
 *
 *   tinyoffice apps                                   every app: id, name, what for
 *   tinyoffice templates <app>                        an app's templates: id and name
 *   tinyoffice template <app> <id>                    a template's document (TLO)
 *   tinyoffice link <app> [file]                      a link for a document (a file, or stdin)
 *   tinyoffice link <file.tlo>                        a link for a .tlo file (its app is in its head)
 *        --title T  --by B  --view pdf|show|embed|…  --display  --plain  --site URL
 *   tinyoffice read <link>                            the document's TLO text (--json: app, view, title, by too)
 *   tinyoffice file <link> [--as tlo|md|csv|…] [--out path|-]
 *                                                     the document as a file, named after its title (.tlo by default)
 *   tinyoffice diff <link> <link>                     what the second changed, block by block (exit 1 when they differ)
 */
import { existsSync, readFileSync, writeFileSync } from 'node:fs';
import { apps, compare, file, fromTlo, link, plain, read, templates } from '../../src/api.ts';
import { slug } from '../../src/kit/draw.ts';

const USAGE = readFileSync(new URL(import.meta.url), 'utf8').match(/\/\*\*\n([\s\S]*?)\*\//)![1].replace(/^ \* ?/gm, '');

// Piped into `head`, the rest is not wanted: stop quietly.
process.stdout.on('error', (e: NodeJS.ErrnoException) => (e.code === 'EPIPE' ? process.exit(0) : die(e.message)));

const [cmd = '', ...rest] = process.argv.slice(2);
const flags: Record<string, string | true> = {};
const args: string[] = [];
for (let i = 0; i < rest.length; i++) {
  const a = rest[i];
  if (a.startsWith('--')) flags[a.slice(2)] = i + 1 < rest.length && !rest[i + 1].startsWith('--') && !['display', 'plain', 'json'].includes(a.slice(2)) ? rest[++i] : true;
  else args.push(a);
}
const str = (k: string) => (typeof flags[k] === 'string' ? (flags[k] as string) : undefined);
const out = (s: string) => process.stdout.write(s.endsWith('\n') ? s : s + '\n');
function die(message: string, code = 2): never {
  process.stderr.write(`tinyoffice: ${message}\n`);
  process.exit(code);
}
const words = (path?: string) => (path && path !== '-' ? (existsSync(path) ? readFileSync(path, 'utf8') : die(`no file ${path}`)) : readFileSync(0, 'utf8'));

async function main() {
  switch (cmd) {
    case 'apps':
      for (const a of await apps()) out(`${a.id.padEnd(9)} ${a.name.padEnd(22)} ${a.blurb}`);
      return;
    case 'templates':
      for (const t of await templates(args[0] ?? die('which app?'))) out(`${t.id.padEnd(20)} ${t.name}`);
      return;
    case 'template': {
      const t = (await templates(args[0] ?? die('which app?'))).find((x) => x.id === args[1]);
      return out(t ? t.text : die(`no template "${args[1]}"; tinyoffice templates ${args[0]} lists them`));
    }
    case 'link': {
      // One argument that is a file: a .tlo, its app in its head; else the app, then the file (or stdin).
      const tlo = args.length === 1 && existsSync(args[0]) ? fromTlo(words(args[0])) : null;
      const app = tlo?.app || (tlo ? die(`${args[0]} names no app in its head (app: sheet); say which: tinyoffice link <app> ${args[0]}`) : (args[0] ?? die('which app?')));
      const text = tlo ? tlo.text : words(args[1]);
      const view = str('view');
      const site = str('site');
      return out(
        flags.plain
          ? plain(app, text, { title: str('title'), by: str('by'), view, site })
          : link(app, text, { title: str('title'), by: str('by'), view: view === 'show' ? '' : view, show: view === 'show', display: !!flags.display, site }),
      );
    }
    case 'read': {
      const r = read(args[0] ?? die('which link?'));
      return out(flags.json ? JSON.stringify(r, null, 2) : r.text);
    }
    case 'file': {
      const r = read(args[0] ?? die('which link?'));
      const ext = str('as') ?? 'tlo';
      const data = await file(r.app, r.text, ext, { link: args[0] });
      const to = str('out') ?? `${slug(r.title) || r.app}.${ext}`;
      if (to === '-') return void process.stdout.write(data);
      writeFileSync(to, data);
      return out(to);
    }
    case 'diff': {
      const c = compare(args[0] ?? die('which links?'), args[1] ?? die('and the second?'));
      for (const ch of c.changes) out(ch.line.split('\n').map((l, i) => `${i ? ' ' : ch.kind} ${l}`).join('\n'));
      if (!c.same) process.exitCode = 1;
      return;
    }
    case '':
    case 'help':
    case '--help':
      return out(USAGE);
    default:
      die(`no command "${cmd}"\n\n${USAGE}`);
  }
}

main().catch((err: unknown) => die(err instanceof Error ? err.message : String(err), 2));
