/**
 * The agent skill, skill/tinyoffice/SKILL.md, and the guides for programs on the site, all written from the one
 * template skill/tinyoffice/SKILL.tpl.md and the registry: the apps, their templates and files come from their
 * definitions, so no guide can name an app, a template or a format the site does not have. Every example is one
 * of an app's own templates, and one that the kernel would not write back byte for byte (write(parse(x)) === x),
 * or whose plain link would not read back as itself, stops the build of the guide: it cannot teach a shape the
 * apps do not keep.
 *
 *   skill/tinyoffice/SKILL.md       the skill: the guide's opening sections, which every document needs
 *   skill/tinyoffice/references/    the rest of the guide, a file an app, one for the files and the API, one for the
 *                                   editors' keys, each read when the task needs it (skillFolder)
 *   public/llms-full.txt            the guide whole, without the skill's front matter
 *   public/llms.txt                 the short guide an agent fetches first, under 6 KB (makeShort)
 *   public/llms/<app>.txt           a page on one app, under 4 KB: its words and rules, its shapes, an example
 *   packages/doc/examples/<app>.json  each shape's example (scripts/shapes.ts), served at /examples/<app>.json
 *
 * `npm run skill` writes them; with --check it writes nothing and fails when one is stale (test/lints.test.ts runs that).
 *
 *   {{apps}}                the apps, a row each: id, name, what for
 *   {{tpl:<app>:<id>}}      that template: its TLO, and its plain link
 *   {{templates:<app>}}     the app's templates, by name
 *   {{exports:<app>}}       the app's own files, beyond the ones every app makes
 *   {{functions}}           the sheet's functions
 *   {{commands}}            the keys each app answers, from the command registry (scripts/commands.ts)
 *   {{embed}}               a document inside a document: two slides cut from the deck's lesson, the second an animation, as a plain link
 */
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import type { Template } from '../src/kit/core/app.ts';
import { apps, appOf } from '../src/kit/core/apps.ts';
import { FUNCTIONS, hasClass, parse, write, type Doc } from '../src/doc/index.ts';
import { plainLink, readPlain } from '../src/kit/core/plain.ts';
import { skillCommands } from './commands.ts';
import { cut, examplesOf, type Example } from './shapes.ts';
import { lint } from '../src/lint.ts';
import { generate } from './generated.ts';

const SITE = 'https://tinylittleoffice.com/';
/** The API's line, as the short guide gives it. */
const API_LINE = `import { link, read, lint } from '${SITE}api.js'`;
const at = (p: string) => fileURLToPath(new URL(`../${p}`, import.meta.url));

function app(id: string) {
  const def = appOf(id);
  if (!def) throw new Error(`make-skill: no app "${id}"`);
  return def;
}

/** Each app's templates, by its id: a module of their own, asked for once before the guide is written. */
type Templates = Map<string, Template[]>;

function example(all: Templates, id: string, tpl: string): string {
  const t = all.get(app(id).id)!.find((x) => x.id === tpl);
  if (!t) throw new Error(`make-skill: ${id} has no template "${tpl}"`);
  if (write(parse(t.doc)) !== t.doc) throw new Error(`make-skill: ${id}/${tpl} is not as the kernel writes it`);
  const url = plainLink(SITE, id, t.doc);
  const back = readPlain(url.slice(url.indexOf('#')), id, (x) => !!appOf(x));
  if (back?.app !== id || back.text !== t.doc) throw new Error(`make-skill: ${id}/${tpl}'s plain link does not read back as itself`);
  const fence = t.doc.includes('```') ? '````' : '```';
  return `${t.name}:\n\n${fence}\n${t.doc}${fence}\n\nAs a link: <${url}>`;
}

/**
 * The example of a document inside a document: the deck's lesson cut to two slides, its cover and the slide whose
 * model moves (an Animator document in an ```anim fence), as a plain link. Cut, never written by hand, and clean.
 */
export function embedLink(all: Templates): string {
  const lesson = all.get('deck')!.find((x) => x.id === 'lesson');
  if (!lesson) throw new Error('make-skill: the deck has no template "lesson"');
  // The cover first and an animation after it; the cut takes every other slide away.
  const covered = (d: Doc) => d.blocks[0]?.k === 'h' && hasClass(d.blocks[0], 'title') && d.blocks.some((b) => b.k === 'fence' && b.lang === 'anim');
  const text = write(cut('deck', parse(lesson.doc), covered));
  const url = plainLink(SITE, 'deck', text);
  if (parse(text).blocks.filter((b) => b.k === 'hr').length !== 1 || lint('deck', text, url).length) throw new Error('make-skill: the lesson does not cut to a clean cover and a slide that moves');
  return `<${url}>`;
}

/** The template's placeholders filled: the skill whole, or a piece of it (an app's section, for its own page). */
function fill(text: string, all: Templates): string {
  const table = ['| App | Name | For |', '| --- | --- | --- |', ...apps().map((a) => `| \`${a.id}\` | ${a.name} | ${a.blurb} |`)].join('\n');
  return text
    .replace('{{apps}}', table)
    .replace('{{functions}}', FUNCTIONS.map(([name]) => `\`${name}\``).join(', '))
    .replace('{{commands}}', () => skillCommands())
    .replace('{{embed}}', () => embedLink(all))
    .replace(/\{\{tpl:([a-z]+):([a-z0-9-]+)\}\}/g, (_, id: string, tpl: string) => example(all, id, tpl))
    .replace(
      /\{\{templates:([a-z]+)\}\}/g,
      (_, id: string) =>
        `Templates: ${all
          .get(app(id).id)!
          .map((t) => t.name)
          .join(', ')}.`,
    )
    .replace(/\{\{exports:([a-z]+)\}\}/g, (_, id: string) => {
      const own = (app(id).exports ?? []).map((x) => `\`.${x.ext}\``);
      return own.length ? `Its own files: ${own.join(', ')}.` : '';
    })
    .replace(/ +\n/g, '\n');
}

const TEMPLATE = () => readFileSync(at('skill/tinyoffice/SKILL.tpl.md'), 'utf8');
const templatesOf = async (): Promise<Templates> => new Map(await Promise.all(apps().map(async (a) => [a.id, await a.templates()] as const)));

export async function makeSkill(): Promise<string> {
  return fill(TEMPLATE(), await templatesOf());
}

/** /llms-full.txt: the same guide, without the skill's front matter. */
export const makeLlms = (skill: string): string => skill.replace(/^---\n[\s\S]*?\n---\n\n/, '');

/** A heading and its words, from its line to the next heading of its level (outside fences). */
interface Piece {
  heading: string;
  text: string;
}

/**
 * A text cut at its headings of one level (`## ` or `### `) outside fences: what is above the first, then a piece a
 * heading. A fence is closed by a line of at least as many backticks (an example of four holds fences of three).
 */
function pieces(text: string, level: number): { above: string; parts: Piece[] } {
  const mark = '#'.repeat(level) + ' ';
  const parts: Piece[] = [];
  let above: string[] = [];
  let into = above;
  let fence = 0;
  for (const line of text.split('\n')) {
    const ticks = /^(`{3,})/.exec(line)?.[1].length ?? 0;
    if (fence) {
      if (ticks >= fence && /^`+\s*$/.test(line)) fence = 0;
    } else if (ticks) fence = ticks;
    else if (line.startsWith(mark)) {
      parts.push({ heading: line.slice(mark.length), text: '' });
      into = [];
    }
    into.push(line);
    if (parts.length && into !== above) parts[parts.length - 1].text = into.join('\n');
  }
  return { above: above.join('\n'), parts };
}

/** The guide's sections that are a reference of their own in the skill, by the file's name: its title, and the sections, in the guide's order. */
const REFERENCES: Record<string, { title: string; sections: string[] }> = {
  api: { title: 'Files, short links, the API and the command line', sections: ["Every app's files", 'Short links', 'Who made it', 'Without a browser'] },
  editors: { title: 'Driving the editors', sections: ['Driving the editors'] },
};

/** A section's words with its heading raised to the top (`# `), and one blank line at the end. */
const raised = (p: Piece, level: number) => p.text.replace(new RegExp(`^${'#'.repeat(level)} `), '# ').replace(/\n*$/, '\n');

/**
 * The skill's folder, as Claude Code reads one (the Agent Skills form; Paul, 2026-10-15, after Oskar Austegard's
 * rewrite of the skill as a short SKILL.md with a reference an app: "make skills work like they are supposed to
 * work"): SKILL.md is read whole when the skill is chosen, so it holds what every document needs, the link, the rules,
 * the format, the apps and which reference to read; each app's section, the files and the API, and the editors' keys
 * are references/<name>.md, read when the task needs them. Cut from the one guide at its headings, outside fences, so
 * the skill and /llms-full.txt are the same words: every section of the guide is in exactly one file.
 */
export function skillFolder(guide: string): Record<string, string> {
  const { above, parts } = pieces(guide, 2);
  const files: Record<string, string> = {};
  const kept: string[] = [above.replace(/\n*$/, '\n')];
  const refs = new Map(Object.entries(REFERENCES).map(([name, r]) => [name, { ...r, found: [] as Piece[] }]));
  for (const part of parts) {
    const ref = [...refs.values()].find((r) => r.sections.includes(part.heading));
    const own = pieces(part.text, 3).parts;
    if (ref) ref.found.push(part);
    else if (own.length) {
      // A group of apps ("## Words": "### write: …", "### outline: …"): a reference an app.
      for (const p of own) {
        const id = /^([a-z]+): /.exec(p.heading)?.[1];
        if (!id || !appOf(id)) throw new Error(`make-skill: "### ${p.heading}" under "## ${part.heading}" is not an app's section`);
        files[`references/${id}.md`] = raised(p, 3);
      }
    } else kept.push(part.text.replace(/\n*$/, '\n'));
  }
  for (const [name, r] of refs) {
    if (r.found.length !== r.sections.length) throw new Error(`make-skill: the guide lacks a section for references/${name}.md: ${r.sections.join(', ')}`);
    files[`references/${name}.md`] = r.found.length === 1 ? raised(r.found[0], 2) : [`# ${r.title}`, '', ...r.found.map((p) => p.text.replace(/\n*$/, '\n'))].join('\n');
  }
  // After the apps' table: which reference to read, and when.
  const at = kept.findIndex((t) => t.startsWith('## The apps\n'));
  if (at < 0) throw new Error('make-skill: the guide has no section "The apps"');
  kept[at] +=
    `\nBefore writing for an app, read its reference, which says what it reads and gives one of its own templates as the example: ${apps()
      .map((a) => `[${a.id}](references/${a.id}.md)`)
      .join(', ')}. ` +
    'The files every document downloads, short links, the API and the command line are in [references/api.md](references/api.md); the keys that drive the editors in a browser are in [references/editors.md](references/editors.md).\n';
  return { 'SKILL.md': kept.join('\n'), ...Object.fromEntries(Object.entries(files).sort(([a], [b]) => a.localeCompare(b))) };
}

/** The skill's folder and /llms-full.txt, by their paths from the root: what `npm run skill` and `npm run commands` both write. */
export const skillOutputs = (guide: string): Record<string, string> => ({
  ...Object.fromEntries(Object.entries(skillFolder(guide)).map(([f, text]) => [`skill/tinyoffice/${f}`, text])),
  'public/llms-full.txt': makeLlms(guide),
});

/** A `## ` section of the guide, its heading and words, up to the next. */
function section(guide: string, heading: string): string {
  const from = guide.indexOf(`\n## ${heading}\n`);
  if (from < 0) throw new Error(`make-skill: the guide has no section "${heading}"`);
  const to = guide.indexOf('\n## ', from + 1);
  return guide.slice(from + 1, to < 0 ? undefined : to + 1);
}

/** Every app's examples, a shape each (scripts/shapes.ts), cut from its templates. */
async function makeExamples(all?: Templates): Promise<Map<string, Example[]>> {
  const t = all ?? (await templatesOf());
  return new Map(apps().map((a) => [a.id, examplesOf(a.id, t.get(a.id)!)] as const));
}

/**
 * /llms.txt: the guide an agent reads first, under 6 KB, the long part a fetch away. Above its first `##`: what
 * Tiny Little Office is (the template's first two sentences), the plain link (a document made with nothing but
 * percent-encoding), the API's line, the three commands that give examples, and where the rest is. Then one
 * example per app as a plain link, how a document goes inside another (with its example link), and the
 * template's three rules, word for word.
 */
export async function makeShort(skill: string, examples?: Map<string, Example[]>): Promise<string> {
  const ex = examples ?? (await makeExamples());
  const guide = makeLlms(skill);
  const intro = /^# .*\n\n(.*?\. .*?\.)(?: |\n)/.exec(guide)![1];
  return [
    '# Tiny Little Office',
    '',
    intro,
    '',
    'The document is TLO (Markdown with a few additions), percent-encoded after `#doc=`; the site and the API’s `link` write it packed, `#/v1/<app>/<payload>`; both open:',
    '',
    '```',
    `${SITE}<app>/#doc=<percent-encoded TLO>`,
    '```',
    '',
    `\`<app>\` is one of ${apps()
      .map((a) => `\`${a.id}\``)
      .join(
        ', ',
      )}. \`&title=\` names it, \`&by=\` says who made it, and \`&lang=\` (\`es\`, \`zh-hant\`…) picks the page's language. Write in the reader's language, right to left too. Emoji go in as characters; \`:name:\` is a Lucide icon, and first in a slide's headline the slide's icon; \`code\` is monospace. Keep a link under 2,000 characters and to the shapes shown: a hand-written link is checked by nothing.`,
    '',
    `With a runtime: \`${API_LINE}\` in a browser, Deno or Bun; \`npx tinylittleoffice\` in Node, where \`skill --into ~/.claude/skills\` installs this guide for Claude Code. To learn a shape by example:`,
    '',
    '- `npx tinylittleoffice shapes <app>`: what the app reads, a line a shape',
    '- `npx tinylittleoffice example <app> [shape]`: the smallest document that shows it, its JSON, lint and measures',
    '- `npx tinylittleoffice try <app> <file|->`: a draft’s lint, measures and JSON',
    '',
    `${SITE}llms/<app>.txt is a page on one app; ${SITE}examples/<app>.json every shape of it as a document, a link and JSON.`,
    '',
    '## One example per app',
    '',
    // Each app's first example, unless its link runs past 400 characters (the Drawing Tool's and the Animator's tables),
    // then its shortest: the guide stays under 6 KB, and the app's own page has the rest.
    ...apps().map((a) => {
      const all = ex.get(a.id)!;
      const e = all.find((x) => x.link.length <= 400) ?? [...all].sort((x, y) => x.link.length - y.link.length)[0];
      return `- \`${a.id}\` ${a.name}, ${e.name}: <${e.link}>`;
    }),
    '',
    section(guide, 'A document inside a document').trim(),
    '',
    section(guide, 'Three rules agents break first').trim(),
    '',
    '## More',
    '',
    `The whole description: ${SITE}llms-full.txt`,
    '',
  ].join('\n');
}

/** An app's own section of the template (`### <id>: …`), its examples left out: the words and the rules. */
function appSection(id: string): string {
  const tpl = TEMPLATE();
  const from = tpl.search(new RegExp(`^### ${id}: `, 'm'));
  if (from < 0) throw new Error(`make-skill: the template has no section "### ${id}:"`);
  const rest = tpl.slice(from);
  const to = rest.slice(4).search(/^##/m);
  return rest
    .slice(0, to < 0 ? undefined : to + 4)
    .split('\n')
    .filter((l) => !/^\{\{tpl:/.test(l))
    .join('\n')
    .replace(/\n{3,}/g, '\n\n')
    .trim();
}

/** /llms/<app>.txt: one app, under 4 KB: what it reads (the template's words on it, its rules), its shapes, and an example. */
function makeAppPage(id: string, all: Templates, ex: Example[]): string {
  const a = app(id);
  const e = ex[0];
  const fence = e.text.includes('```') ? '````' : '```';
  return [
    `# ${a.name} (\`${id}\`), Tiny Little Office`,
    '',
    `${a.blurb.replace(/\.$/, '')}. A document is a link: ${SITE}${id}/#doc=<percent-encoded TLO>`,
    '',
    fill(appSection(id), all).replace(/^### .*\n\n/, ''),
    '',
    '## Shapes',
    '',
    ...ex.map((x) => `- \`${x.id}\` ${x.name}, ${x.for}`),
    '',
    `## Example: ${e.name}`,
    '',
    fence,
    e.text + fence,
    '',
    `As a link: <${e.link}>`,
    '',
    `Every shape as a document, a link and JSON: ${SITE}examples/${id}.json. The whole description: ${SITE}llms-full.txt`,
    '',
  ].join('\n');
}

/** packages/doc/examples/<app>.json: the app's shapes and their examples, for the API, the command line and the site. */
const examplesJson = (id: string, ex: Example[]): string => `${JSON.stringify({ app: id, name: app(id).name, shapes: ex }, null, 2)}\n`;

/** Every file `npm run skill` writes, by its path from the root. */
async function skillFiles(): Promise<Record<string, string>> {
  const all = await templatesOf();
  const skill = fill(TEMPLATE(), all);
  const ex = await makeExamples(all);
  return {
    ...skillOutputs(skill),
    'public/llms.txt': await makeShort(skill, ex),
    ...Object.fromEntries(
      apps().flatMap((a) => [[`public/llms/${a.id}.txt`, makeAppPage(a.id, all, ex.get(a.id)!)] as const, [`packages/doc/examples/${a.id}.json`, examplesJson(a.id, ex.get(a.id)!)] as const]),
    ),
  };
}

if (process.argv[1] === fileURLToPath(import.meta.url)) generate(await skillFiles(), 'npm run skill');
