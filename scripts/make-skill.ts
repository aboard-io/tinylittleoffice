/**
 * The agent skill, skill/tinyoffice/SKILL.md, and the same guide for programs at /llms.txt (public/llms.txt),
 * written from the template skill/tinyoffice/SKILL.tpl.md and the registry: the apps, their templates and
 * files come from their definitions, so the guide cannot name an app, a template or a format the site does
 * not have. Every example is one of an app's own templates, and one that the kernel would not write back
 * byte for byte (write(parse(x)) === x), or whose plain link would not read back as itself, stops the build
 * of the guide: it cannot teach a shape the apps do not keep. `npm run skill` writes both; with --check it
 * writes nothing and fails when either is stale (test/lints.test.ts runs that).
 *
 *   {{apps}}                the apps, a row each: id, name, what for
 *   {{tpl:<app>:<id>}}      that template: its TLO, and its plain link
 *   {{templates:<app>}}     the app's templates, by name
 *   {{exports:<app>}}       the app's own files, beyond the ones every app makes
 *   {{functions}}           the sheet's functions
 *   {{commands}}            the keys each app answers, from the command registry (scripts/commands.ts)
 */
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { apps, appOf } from '../src/kit/apps.ts';
import { FUNCTIONS, parse, write } from '../src/doc/index.ts';
import { plainLink, readPlain } from '../src/kit/plain.ts';
import { skillCommands } from './commands.ts';
import { generate } from './generated.ts';

const SITE = 'https://tinylittleoffice.com/';
const at = (p: string) => fileURLToPath(new URL(`../${p}`, import.meta.url));

function app(id: string) {
  const def = appOf(id);
  if (!def) throw new Error(`make-skill: no app "${id}"`);
  return def;
}

function example(id: string, tpl: string): string {
  const def = app(id);
  const t = def.templates.find((x) => x.id === tpl);
  if (!t) throw new Error(`make-skill: ${id} has no template "${tpl}"`);
  if (write(parse(t.doc)) !== t.doc) throw new Error(`make-skill: ${id}/${tpl} is not as the kernel writes it`);
  const url = plainLink(SITE, id, t.doc);
  const back = readPlain(url.slice(url.indexOf('#')), id, (x) => !!appOf(x));
  if (back?.app !== id || back.text !== t.doc) throw new Error(`make-skill: ${id}/${tpl}'s plain link does not read back as itself`);
  const fence = t.doc.includes('```') ? '````' : '```';
  return `${t.name}:\n\n${fence}\n${t.doc}${fence}\n\nAs a link: <${url}>`;
}

export function makeSkill(): string {
  const table = ['| App | Name | For |', '| --- | --- | --- |', ...apps().map((a) => `| \`${a.id}\` | ${a.name} | ${a.blurb} |`)].join('\n');
  return readFileSync(at('skill/tinyoffice/SKILL.tpl.md'), 'utf8')
    .replace('{{apps}}', table)
    .replace('{{functions}}', FUNCTIONS.map(([name]) => `\`${name}\``).join(', '))
    .replace('{{commands}}', () => skillCommands())
    .replace(/\{\{tpl:([a-z]+):([a-z0-9-]+)\}\}/g, (_, id: string, tpl: string) => example(id, tpl))
    .replace(
      /\{\{templates:([a-z]+)\}\}/g,
      (_, id: string) =>
        `Templates: ${app(id)
          .templates.map((t) => t.name)
          .join(', ')}.`,
    )
    .replace(/\{\{exports:([a-z]+)\}\}/g, (_, id: string) => {
      const own = (app(id).exports ?? []).map((x) => `\`.${x.ext}\``);
      return own.length ? `Its own files: ${own.join(', ')}.` : '';
    })
    .replace(/ +\n/g, '\n');
}

/** /llms.txt: the same guide, without the skill's front matter. */
export const makeLlms = (skill = makeSkill()): string => skill.replace(/^---\n[\s\S]*?\n---\n\n/, '');

if (process.argv[1] === fileURLToPath(import.meta.url)) {
  const skill = makeSkill();
  generate({ 'skill/tinyoffice/SKILL.md': skill, 'public/llms.txt': makeLlms(skill) }, 'npm run skill');
}
