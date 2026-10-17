/**
 * The shapes each app reads: a heading, a task list, a money column, a Venn, a title
 * slide… one line each, with what it is for, and a test that says whether a document shows it. The examples an
 * agent asks for (`tinyoffice example <app> [shape]`, `example(app, shape)` in the API, /examples/<app>.json on
 * the site) are cut from the apps' own templates and the kernel's corpus by `examplesOf`: the smallest document
 * that still shows the shape, keeps its words byte for byte through the kernel (write(parse(x)) === x) and lints
 * clean. scripts/make-skill.ts writes them into packages/doc/examples/<app>.json; nothing here is hand-written
 * but the shapes' names and tests.
 */
import { existsSync, readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { hasClass, attr, parse, plainText, write, type Block, type Doc } from '../src/doc/index.ts';
import type { Template } from '../src/kit/core/app.ts';
import { plainLink } from '../src/kit/core/plain.ts';
import { lint } from '../src/lint.ts';

/** A shape an app reads: its id (for `example <app> <id>`), what it is called, what it is for, and whether a document shows it. */
export interface Shape {
  id: string;
  name: string;
  for: string;
  has: (d: Doc) => boolean;
}

/** An example as packages/doc/examples/<app>.json holds it: the shape, the document, its plain link and the kernel's document (its JSON). */
export interface Example {
  id: string;
  name: string;
  for: string;
  /** Where it was cut from: "template budget", or "corpus <name>". */
  from: string;
  text: string;
  link: string;
  json: Doc;
}

const SITE = 'https://tinylittleoffice.com/';

// What a document holds, asked of its blocks.
const any = (d: Doc, f: (b: Block) => boolean) => d.blocks.some(f);
const count = (d: Doc, f: (b: Block) => boolean) => d.blocks.filter(f).length;
const words = (b: Block) => ('runs' in b ? plainText(b.runs) : '');
const runs = (d: Doc, f: (r: { ic?: string; fn?: string; href?: string; b?: true; h?: true }) => boolean) => any(d, (b) => 'runs' in b && b.runs.some(f));
const items = (d: Doc) => count(d, (b) => b.k === 'li');
const tables = (d: Doc) => d.blocks.filter((b) => b.k === 'table');
const column = (d: Doc, type: string) => tables(d).some((t) => t.cols.some((c) => c.type === type));
const formula = (d: Doc) => tables(d).some((t) => t.rows.some((r) => r.some((c) => c.startsWith('='))));
const lines = (d: Doc) => d.blocks.flatMap((b) => words(b).split('\n'));
/** A drawing's or an animation's first table: a row a shape, its kind in the first cell. */
const kinds = (d: Doc) => new Set(tables(d)[0]?.rows.map((r) => r[0]) ?? []);
/** Two columns with words in each: items before and after the "|" line. */
const columns = (d: Doc) => {
  const bar = d.blocks.findIndex((b) => b.k === 'p' && words(b) === '|');
  return bar > 0 && d.blocks.slice(0, bar).some((b) => b.k === 'li') && d.blocks.slice(bar).some((b) => b.k === 'li');
};
const kindIs = (k: string) => (d: Doc) => d.head.kind === k && items(d) >= 2;
/** A fence holding another app's document, by the apps it may be: a document inside this one, drawn there by its own app. */
const fenced = (d: Doc, langs: string[]) => any(d, (b) => b.k === 'fence' && langs.includes(b.lang));
/** The apps whose documents are pictures: drawn, laid out, mapped or set on days. */
const PICTURES = ['draw', 'diagram', 'trip', 'cal'];

/** Every app's shapes, the one it is most often asked for first. */
export const SHAPES: Record<string, Shape[]> = {
  write: [
    { id: 'heading', name: 'headings', for: 'a text in sections: # and ## lines', has: (d) => count(d, (b) => b.k === 'h' && !hasClass(b, 'title')) >= 1 && count(d, (b) => b.k === 'p') >= 1 },
    { id: 'title', name: 'a title', for: 'the first line set large: # Words {.title}', has: (d) => any(d, (b) => b.k === 'h' && hasClass(b, 'title')) },
    { id: 'tasks', name: 'a task list', for: 'things to do and done: - [ ] and - [x]', has: (d) => any(d, (b) => b.k === 'li' && b.done !== undefined) },
    { id: 'numbered', name: 'a numbered list', for: 'steps in order: 1. 2. 3.', has: (d) => count(d, (b) => b.k === 'li' && !!b.ord) >= 2 },
    { id: 'bullets', name: 'a bulleted list', for: 'points in no order: - lines', has: (d) => count(d, (b) => b.k === 'li' && !b.ord && b.done === undefined) >= 2 },
    {
      id: 'align',
      name: 'an aligned paragraph',
      for: 'a line set right or centered: {.right} {.center}',
      has: (d) => any(d, (b) => b.k === 'p' && (hasClass(b, 'right') || hasClass(b, 'center') || hasClass(b, 'justify'))),
    },
    { id: 'quote', name: 'a quotation', for: 'words set apart: > lines', has: (d) => any(d, (b) => b.k === 'quote') },
    { id: 'footnote', name: 'a footnote', for: 'a note where its sentence is: ^[the note]', has: (d) => runs(d, (r) => r.fn !== undefined) },
    { id: 'marks', name: 'bold and highlights', for: 'words marked: **bold**, ==highlight==', has: (d) => runs(d, (r) => !!r.b) },
    { id: 'icon', name: 'an icon in a line', for: 'a picture among words: :icon-name:', has: (d) => runs(d, (r) => !!r.ic) },
    { id: 'table', name: 'a table that adds up', for: 'an invoice’s lines, a price list: a money column and a total', has: (d) => column(d, 'money') && formula(d) },
    { id: 'look', name: 'a look', for: 'the page’s type and colors: look: in the head', has: (d) => !!d.head.look },
    { id: 'chart', name: 'a chart in a text', for: 'another document inside this one: a ```sheet fence', has: (d) => any(d, (b) => b.k === 'fence' && b.lang === 'sheet') },
    {
      id: 'figure',
      name: 'a figure in the text',
      for: 'a drawing, a diagram, a chart or a map in a fence named by its app',
      has: (d) => fenced(d, [...PICTURES, 'anim']) && any(d, (b) => b.k === 'h' || b.k === 'p'),
    },
  ],
  outline: [
    {
      id: 'nested',
      name: 'a nested list',
      for: 'notes in a tree: - items, two spaces a level',
      has: (d) => any(d, (b) => b.k === 'li' && b.depth >= 1) && any(d, (b) => b.k === 'li' && b.depth >= 2),
    },
    { id: 'numbered', name: 'numbered steps', for: 'an order to follow: 1. items', has: (d) => count(d, (b) => b.k === 'li' && !!b.ord) >= 2 },
    { id: 'tie', name: 'an arrow to the parent', for: 'how an item feeds its parent: {.to label="…"}', has: (d) => any(d, (b) => b.k === 'li' && (hasClass(b, 'to') || hasClass(b, 'from'))) },
    { id: 'connection', name: 'a connection', for: 'two items joined across the tree: ~ A -> B: label', has: (d) => any(d, (b) => b.k === 'edge') },
    { id: 'footnote', name: 'a footnote', for: 'a note on an item: ^[the note]', has: (d) => runs(d, (r) => r.fn !== undefined) },
    { id: 'doc', name: 'a document under an item', for: 'a fence named by its app, {depth=n} for its place', has: (d) => any(d, (b) => b.k === 'fence' && !!b.lang && attr(b, 'depth') !== undefined) },
  ],
  deck: [
    { id: 'bullets', name: 'a slide of bullets', for: 'the usual slide: ## Headline, then - bullets', has: (d) => any(d, (b) => b.k === 'h' && b.level === 2 && !b.a) && items(d) >= 2 },
    { id: 'title', name: 'a title slide', for: 'the cover: ## Headline {.title}, the line under it its subtitle', has: (d) => any(d, (b) => b.k === 'h' && hasClass(b, 'title')) && items(d) >= 1 },
    { id: 'slides', name: 'slides', for: 'more than one: --- between them', has: (d) => count(d, (b) => b.k === 'hr') >= 1 && count(d, (b) => b.k === 'h') >= 2 && items(d) >= 2 },
    { id: 'two', name: 'two columns', for: 'a comparison: {.two}, | alone between the columns', has: (d) => any(d, (b) => b.k === 'h' && hasClass(b, 'two')) && columns(d) },
    { id: 'icon', name: 'an icon slide', for: 'bullets beside one big icon: ## :icon: Headline {.icon}', has: (d) => any(d, (b) => b.k === 'h' && hasClass(b, 'icon')) && items(d) >= 1 },
    { id: 'notes', name: 'speaker notes', for: 'what to say, not shown: > lines', has: (d) => any(d, (b) => b.k === 'quote') && items(d) >= 1 },
    { id: 'chart', name: 'a chart slide', for: 'numbers drawn: a table with {chart=bar} (line, pie)', has: (d) => any(d, (b) => b.k === 'table' && !!attr(b, 'chart')) },
    { id: 'moves', name: 'a slide that moves', for: 'an Animator document in a ```anim fence', has: (d) => fenced(d, ['anim']) },
    { id: 'shows', name: 'a slide that shows a document', for: 'a diagram, a drawing, a map or a calendar in a fence named by its app', has: (d) => fenced(d, PICTURES) },
    { id: 'theme', name: 'a theme', for: 'colors and type: theme: midnight in the head', has: (d) => !!d.head.theme && items(d) >= 1 },
    { id: 'poster', name: 'a poster', for: 'one page to print: format: poster', has: (d) => d.head.format === 'poster' && items(d) >= 1 },
    { id: 'zine', name: 'a zine', for: 'eight pages folded from one sheet: format: zine', has: (d) => d.head.format === 'zine' && count(d, (b) => b.k === 'hr') >= 1 },
    { id: 'booklet', name: 'a booklet', for: 'eight to twenty pages: format: booklet', has: (d) => d.head.format === 'booklet' && count(d, (b) => b.k === 'hr') >= 1 },
    { id: 'brochure', name: 'a brochure', for: 'six panels, folded in three: format: brochure', has: (d) => d.head.format === 'brochure' && count(d, (b) => b.k === 'hr') >= 1 },
    { id: 'comic', name: 'a comic', for: 'a panel a bullet: - :icon: What is said | caption', has: (d) => d.head.format === 'comic' && count(d, (b) => b.k === 'li' && words(b).includes(' | ')) >= 2 },
    { id: 'badges', name: 'name badges', for: 'a page a person: format: badges', has: (d) => d.head.format === 'badges' && count(d, (b) => b.k === 'hr') >= 1 },
  ],
  sheet: [
    { id: 'money', name: 'a money column', for: 'amounts set as $1,200.00: Cost:money in the header', has: (d) => column(d, 'money') },
    { id: 'formula', name: 'a formula', for: 'a cell worked out: =SUM(B1:B3), rows counted from the first data row', has: formula },
    { id: 'bar', name: 'a bar chart', for: 'labels against numbers: chart: bar in the head', has: (d) => d.head.chart === 'bar' },
    { id: 'line', name: 'a line chart', for: 'a trend: chart: line', has: (d) => d.head.chart === 'line' },
    { id: 'pie', name: 'a pie chart', for: 'parts of a whole: chart: pie', has: (d) => d.head.chart === 'pie' },
    { id: 'sankey', name: 'a flow chart', for: 'where money goes: chart: sankey, rows of From | To | Amount', has: (d) => d.head.chart === 'sankey' },
    { id: 'model', name: 'a model', for: 'assumptions with names: a name column, formulas that use the names', has: (d) => column(d, 'name') },
    { id: 'lock', name: 'locked formulas', for: 'a model a reader cannot break: lock: C1:C6 in the head', has: (d) => !!d.head.lock },
    { id: 'date', name: 'a date column', for: 'days: 2027-03-01 in a :date column', has: (d) => column(d, 'date') },
    { id: 'check', name: 'a check column', for: 'yes or no: a :check column', has: (d) => column(d, 'check') },
    { id: 'percent', name: 'a percent column', for: 'rates: a :percent column', has: (d) => column(d, 'percent') },
    { id: 'option', name: 'a choice column', for: 'one of a few words: an :option column', has: (d) => column(d, 'option') },
  ],
  calc: [
    { id: 'names', name: 'named lines', for: 'working kept: name = expression, used by the lines after it', has: (d) => d.head.mode !== 'graph' && lines(d).some((l) => /^[a-z_]+ = /.test(l)) },
    { id: 'percent', name: 'percentages', for: 'a tip, a tax: 18%', has: (d) => d.head.mode !== 'graph' && lines(d).some((l) => /\d%/.test(l)) },
    { id: 'units', name: 'units', for: 'conversions: 3 inch to cm, 60 mph in km/h', has: (d) => d.head.mode !== 'graph' && lines(d).some((l) => / to [a-z]/.test(l)) },
    { id: 'graph', name: 'a graph', for: 'curves y = f(x): mode: graph, x from 0 to 10', has: (d) => d.head.mode === 'graph' },
  ],
  draw: [
    { id: 'shapes', name: 'shapes joined by arrows', for: 'a flowchart, a sketch: a row a shape, k rows join two', has: (d) => !d.head.grid && kinds(d).has('k') },
    { id: 'text', name: 'words placed', for: 'a card, a sign: t rows', has: (d) => !d.head.grid && kinds(d).has('t') },
    { id: 'icon', name: 'icons', for: 'a picture by name: i rows, the label the icon', has: (d) => !d.head.grid && kinds(d).has('i') },
    { id: 'pixels', name: 'pixel art', for: 'a picture a square at a time: grid: 16, a letter a square', has: (d) => !!d.head.grid },
    { id: 'tile', name: 'a repeating tile', for: 'a pattern behind a drawing: tile: in the head', has: (d) => !!d.head.tile },
  ],
  diagram: [
    { id: 'mind', name: 'a mind map', for: 'ideas branching from one: kind: mind, a nested list', has: kindIs('mind') },
    { id: 'org', name: 'an org chart', for: 'who reports to whom: kind: org, - Name | Role', has: kindIs('org') },
    { id: 'family', name: 'a family tree', for: 'generations: kind: family, - Rose + Albert Hale | m. 1948', has: kindIs('family') },
    { id: 'lanes', name: 'swimlanes', for: 'a process passed between people: kind: lanes, - Who: what they do', has: kindIs('lanes') },
    { id: 'timeline', name: 'a timeline', for: 'dates spaced as they fell: kind: timeline, - When: what happened', has: kindIs('timeline') },
    {
      id: 'venn',
      name: 'a Venn diagram',
      for: 'what two or three sets share: kind: venn, - Set: thing, - A & B: thing',
      has: (d) => d.head.kind === 'venn' && count(d, (b) => b.k === 'li' && !words(b).split(':')[0].includes('&')) >= 2 && any(d, (b) => b.k === 'li' && words(b).split(':')[0].includes('&')),
    },
    { id: 'seating', name: 'a seating chart', for: 'who sits where: kind: seating, - Table: Ann, Bob', has: kindIs('seating') },
    { id: 'net', name: 'a network', for: 'what talks to what: kind: net, ~ A -> B: label', has: (d) => d.head.kind === 'net' && any(d, (b) => b.k === 'edge') },
    { id: 'dotted', name: 'a dotted line', for: 'a tie outside the tree: ~ Ben -- Eve: advises', has: (d) => !!d.head.kind && d.head.kind !== 'net' && any(d, (b) => b.k === 'edge') },
  ],
  anim: [
    { id: 'motion', name: 'a shape that moves', for: 'a drawing’s table, then Shape | Keys: frame,dx,dy,depth,size,spin', has: (d) => tables(d).length >= 2 },
    { id: 'effects', name: 'effects', for: 'impact, shadow, neon…: letters at the end of a key', has: (d) => tables(d)[1]?.rows.some((r) => /,[a-z3]+(;|$)/.test(r[1] ?? '')) ?? false },
    { id: 'loop', name: 'a loop', for: 'once, a number, or bounce: loop: in the head', has: (d) => !!d.head.loop && tables(d).length >= 2 },
  ],
  cal: [
    { id: 'days', name: 'things on days', for: 'a calendar: - 2027-03-01: Launch', has: (d) => d.head.view !== 'gantt' && items(d) >= 2 },
    { id: 'times', name: 'times', for: 'when in the day: - 2027-03-10 09:00-10:30: Retro', has: (d) => d.head.view !== 'gantt' && d.blocks.some((b) => /^\d{4}-\d\d-\d\d \d\d:\d\d/.test(words(b))) },
    {
      id: 'span',
      name: 'a span of days',
      for: 'a trip, a break: - 2027-03-01 to 2027-03-03: Offsite',
      has: (d) => d.head.view !== 'gantt' && d.blocks.some((b) => /^\d{4}-\d\d-\d\d to \d{4}/.test(words(b))),
    },
    { id: 'repeat', name: 'a repeat', for: 'every week or year: {every=week times=6}', has: (d) => d.head.view !== 'gantt' && any(d, (b) => !!attr(b, 'every')) },
    {
      id: 'colors',
      name: 'colors that mean something',
      for: 'whose it is: green: Sam in the head, {color=green} on the line',
      has: (d) => d.head.view !== 'gantt' && any(d, (b) => !!attr(b, 'color')) && Object.keys(d.head).some((k) => d.head[k] && ['green', 'orange', 'blue', 'red', 'purple'].includes(k)),
    },
    { id: 'gantt', name: 'a schedule', for: 'tasks over weeks: view: gantt, parts nested, {done=40%}', has: (d) => d.head.view === 'gantt' && any(d, (b) => b.k === 'li' && b.depth >= 1) },
  ],
  trip: [
    { id: 'route', name: 'a route', for: 'places in order: Place | Lat:number | Lon:number | Note', has: (d) => d.head.route !== 'dots' && (tables(d)[0]?.rows.length ?? 0) >= 2 },
    { id: 'units', name: 'distances', for: 'how far, in km or miles: units: km', has: (d) => !!d.head.units && d.head.route !== 'dots' },
    { id: 'dots', name: 'places on their own', for: 'a map of places, no route: route: dots', has: (d) => d.head.route === 'dots' },
  ],
  board: [
    {
      id: 'lanes',
      name: 'cards in lanes',
      for: 'a card a row of a table, its lane the Status (or Stage) column: Task | Status:option',
      has: (d) => (tables(d)[0]?.rows.length ?? 0) >= 2 && new Set(tables(d)[0].rows.map((r) => r[tables(d)[0].cols.findIndex((c) => /^(status|stage)$/i.test(c.name))] ?? '')).size >= 2,
    },
    { id: 'order', name: 'lanes in order', for: 'every lane, an empty one too, in its place: lanes: To do, Doing, Done in the head', has: (d) => !!d.head.lanes && tables(d).length >= 1 },
    { id: 'fields', name: 'fields on a card', for: 'more about each card: the other columns, typed (Owner, Due:date)', has: (d) => (tables(d)[0]?.cols.length ?? 0) >= 4 && column(d, 'date') },
    { id: 'money', name: 'a money field', for: 'what a deal is worth: Value:money', has: (d) => column(d, 'money') },
  ],
};

/** The apps whose rows or lines name each other by place (a drawing's joins, an animation's shapes, a calculator's names): their examples are whole templates, never cut. */
const WHOLE = new Set(['draw', 'anim', 'calc']);

/** The li at i and the items nested under it: one item, as a person would delete it. */
function family(blocks: Block[], i: number): number {
  const b = blocks[i];
  if (b.k !== 'li') return 1;
  let n = 1;
  while (blocks[i + n]?.k === 'li' && (blocks[i + n] as { depth: number }).depth > b.depth) n++;
  return n;
}

/** A table whose cells hold formulas loses only its last rows, so no formula comes to point at another row. */
const hasFormula = (b: Block) => b.k === 'table' && b.rows.some((r) => r.some((c) => c.startsWith('=')));

/** Every document one step smaller: an item and its children gone, a block gone, a slide gone, a table's row gone. */
function* smaller(app: string, d: Doc): Generator<Doc> {
  const { blocks } = d;
  const without = (i: number, n: number): Doc => ({ head: d.head, blocks: [...blocks.slice(0, i), ...blocks.slice(i + n)] });
  // A setting of the head the shape does not need (a title, a theme): gone first, so an example shows only its shape.
  for (const key of Object.keys(d.head)) yield { head: Object.fromEntries(Object.entries(d.head).filter(([k]) => k !== key)), blocks };
  if (app === 'deck' || app === 'write') {
    // A slide or a page whole: its blocks and the rule before it (or after it, for the first).
    const rules = blocks.flatMap((b, i) => (b.k === 'hr' ? [i] : []));
    for (let k = 0; k <= rules.length && rules.length; k++) {
      const from = k === 0 ? 0 : rules[k - 1];
      const to = k === 0 ? rules[0] + 1 : (rules[k] ?? blocks.length);
      yield without(from, to - from);
    }
  }
  for (let i = 0; i < blocks.length; i++) {
    const b = blocks[i];
    if (b.k === 'hr' || (app === 'deck' && b.k === 'h')) continue;
    yield without(i, family(blocks, i));
  }
  // A block's attributes the shape does not need ({big=B8}, {lock=E1:E7}).
  for (let i = 0; i < blocks.length; i++) if (blocks[i].a) yield { head: d.head, blocks: blocks.map((x, j) => (j === i ? { ...x, a: undefined } : x)) };
  for (let i = 0; i < blocks.length; i++) {
    const b = blocks[i];
    if (b.k !== 'table' || b.rows.length <= 2) continue;
    const at = hasFormula(b) ? [b.rows.length - 1] : b.rows.map((_, r) => r);
    for (const r of at) yield { head: d.head, blocks: blocks.map((x, j) => (j === i ? { ...b, rows: b.rows.filter((_, k) => k !== r) } : x)) };
  }
}

/** The apps whose documents are a list or a table: an example keeps two of its items or rows. */
const LISTS = new Set(['outline', 'diagram', 'cal', 'sheet', 'trip']);

/** Whether a cut document still reads as a document: no empty slide, no item without its parent, no connection to a thing gone, at least two of what it lists. */
function sound(d: Doc, floor: { items: number; rows: number }): boolean {
  const { blocks } = d;
  if (!blocks.length || blocks[0].k === 'hr' || blocks[blocks.length - 1].k === 'hr') return false;
  for (let i = 1; i < blocks.length; i++) if (blocks[i].k === 'hr' && blocks[i - 1].k === 'hr') return false;
  let prev = -1;
  for (const b of blocks) {
    // A document under an outline's item stands in the tree at the depth it says, as an item does.
    const under = b.k === 'fence' ? Number(attr(b, 'depth') ?? NaN) : NaN;
    if (Number.isInteger(under)) {
      if (under > prev + 1) return false;
      prev = under;
      continue;
    }
    if (b.k !== 'li') {
      if (b.k !== 'quote' && b.k !== 'edge') prev = -1;
      continue;
    }
    if (b.depth > prev + 1) return false;
    prev = b.depth;
  }
  const named = new Set(
    blocks.flatMap((b) =>
      b.k === 'li' || b.k === 'h'
        ? [
            words(b)
              .split(' | ')[0]
              .replace(/:[a-z0-9-]+:/g, '')
              .trim(),
            words(b).trim(),
          ]
        : [],
    ),
  );
  for (const b of blocks) if (b.k === 'edge' && d.head.kind !== 'net' && (!named.has(b.from) || !named.has(b.to))) return false;
  if (items(d) < floor.items) return false;
  return tables(d).every((t) => t.rows.length >= floor.rows);
}

/** The smallest document cut from `doc` that still shows the shape and comes back from the kernel as written. */
export function cut(app: string, doc: Doc, has: (d: Doc) => boolean): Doc {
  const floor = LISTS.has(app) ? { items: Math.min(2, items(doc)), rows: Math.min(2, ...tables(doc).map((t) => t.rows.length)) } : { items: 0, rows: 1 };
  const keeps = (d: Doc) => has(d) && sound(d, floor) && write(parse(write(d))) === write(d);
  let cur = doc;
  for (let more = !WHOLE.has(app); more;) {
    more = false;
    for (const next of smaller(app, cur))
      if (keeps(next)) {
        cur = next;
        more = true;
        break;
      }
  }
  return cur;
}

/** The kernel's corpus of an app (test/doc/corpus/apps/<app>.json), where it has one. */
function corpus(app: string): { name: string; text: string }[] {
  const at = fileURLToPath(new URL(`../test/doc/corpus/apps/${app}.json`, import.meta.url));
  return existsSync(at) ? (JSON.parse(readFileSync(at, 'utf8')) as { docs: { name: string; text: string }[] }).docs : [];
}

/** The smallest clean cut of these sources that shows the shape, or undefined. */
function smallest(app: string, shape: Shape, sources: { from: string; text: string }[]): { from: string; text: string } | undefined {
  return sources
    .filter((s) => shape.has(parse(s.text)))
    .flatMap((s) => {
      const small = write(cut(app, parse(s.text), shape.has));
      return small === s.text ? [s] : [{ from: s.from, text: small }, s];
    })
    .sort((a, b) => a.text.length - b.text.length || a.from.localeCompare(b.from))
    .find((c) => lint(app, c.text, plainLink(SITE, app, c.text)).length === 0);
}

/**
 * Each of an app's shapes, as the smallest document cut from its templates that shows it, round-trips and lints
 * clean; from the kernel's corpus (test/doc/corpus/apps/<app>.json) only where no template shows it, since the
 * corpus holds the kernel's edge cases too. A shape nothing shows stops the build of the guide.
 */
export function examplesOf(app: string, templates: Template[]): Example[] {
  const kept = (s: { from: string; text: string }) => write(parse(s.text)) === s.text;
  const own = templates.map((t) => ({ from: `template ${t.id}`, text: t.doc })).filter(kept);
  const fixtures = corpus(app)
    .map((c) => ({ from: `corpus ${c.name}`, text: c.text.endsWith('\n') ? c.text : c.text + '\n' }))
    .filter(kept);
  return (SHAPES[app] ?? []).map((shape) => {
    const best = smallest(app, shape, own) ?? smallest(app, shape, fixtures);
    if (!best) throw new Error(`shapes: nothing of ${app}'s shows "${shape.id}" and lints clean`);
    return { id: shape.id, name: shape.name, for: shape.for, from: best.from, text: best.text, link: plainLink(SITE, app, best.text), json: parse(best.text) };
  });
}
