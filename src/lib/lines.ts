/**
 * Lines: the one toolkit behind every app that is written as a few lines
 * of text. An app says what kinds of line it has, each as a pattern:
 *
 *   { name: 'Dish', is: '{Dish} | {Price}[ | {What it is}]' }
 *
 * and from that alone a line can be read into its fields and written back,
 * which is all a form needs: people fill in boxes, and what is saved (and
 * shared, and written by programs) is still the plain text.
 *
 * In a pattern, {Name} is a field; [..] is a part that may be left out;
 * everything else is written as it stands. A field may say what it holds:
 * {Text:long}, {Day:date}, {Picture:icon}, {Colour:choice=red,green}, {Who:pick},
 * {Who:list} (things with commas between, each a thing of its own on a picture),
 * {Price:number} (one word with a digit in it: then "Thanks, pay soon" is not
 * a thing with a price).
 *
 * The text is TLO (lib/tlo.ts): Markdown. Most kinds are lines of it as they
 * stand ("# Title", "- Point | detail", "From: Harbor Studio"). A kind marked
 * `table` is written as a table instead, its fields the columns, which is
 * how a person or a program most easily writes many things of one shape. A
 * kind that indents is a list item, nested. A blank line that means
 * something is a rule ("---"). A kind written "@@{Document}" is another
 * document, in a fenced block.
 */
import { fenceRef, refFence, parse as parseTlo, write as writeTlo, writeBlock, attrsText, column, columnText, type Block as TloBlock } from './tlo.ts';

export interface Kind {
  name: string;
  /** The pattern. An empty pattern is a blank line that means something (the next card, the next table). */
  is: string;
  /** There is at most one of these, and it goes at the top (a title, a setting). */
  once?: boolean;
  /** A heading: the lines after it, up to the next heading, belong to it (a section and its items). Several heading kinds nest in the order given (a page, then its sections). */
  head?: boolean;
  /** Lines of this kind nest: they can be indented under one another. */
  indent?: boolean;
  /** Written as the rows of a table whose columns are the fields. */
  table?: boolean;
  /** A setting kept in the document's header as "key: value", not in the text; its pattern starts "Key: ". */
  key?: string;
}

export interface Field {
  name: string;
  /** 'pick' offers the names already on the form (the first words of every other row); 'list' holds things with commas between; 'number' is one word with a digit in it. */
  type: 'text' | 'long' | 'date' | 'icon' | 'choice' | 'pick' | 'list' | 'number' | 'money' | 'percent' | 'url';
  options: string[];
  /** Inside a [..] part: the line reads without it. */
  optional?: boolean;
}

export interface Row {
  kind: number;
  values: string[];
  depth: number;
}

type Part = string | Field | Part[];
interface Compiled {
  fields: Field[];
  re: RegExp;
  write(values: string[]): string;
}

const esc = (s: string) => s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');

function compile(kind: Kind): Compiled {
  const fields: Field[] = [];
  let at = 0;
  let inside = 0;
  const src = kind.is;
  // The pattern as a tree: text, fields, and bracketed parts that may be left out.
  const parts = (): Part[] => {
    const out: Part[] = [];
    while (at < src.length && src[at] !== ']') {
      // "\[" and the like are the mark itself, written as it stands.
      if (src[at] === '\\') {
        out.push(src[at + 1] ?? '');
        at += 2;
      } else if (src[at] === '[') {
        at++;
        inside++;
        out.push(parts());
        inside--;
        at++;
      } else if (src[at] === '{') {
        const end = src.indexOf('}', at);
        const [name, type = 'text'] = src.slice(at + 1, end).split(':');
        const field: Field = { name, type: type.split('=')[0] as Field['type'], options: type.includes('=') ? type.split('=')[1].split(',') : [] };
        if (inside) field.optional = true;
        fields.push(field);
        out.push(field);
        at = end + 1;
      } else {
        const next = [src.indexOf('{', at), src.indexOf('[', at), src.indexOf(']', at), src.indexOf('\\', at)].filter((n) => n >= 0);
        const end = next.length ? Math.min(...next) : src.length;
        out.push(src.slice(at, end));
        at = end;
      }
    }
    return out;
  };
  const tree = parts();
  // Spaces in the pattern are loose in what is read: needed beside a word ("4 x 3", "0 to 9"), optional beside a mark ("a|b").
  const lit = (s: string) => s.replace(/(\s+)|([^\s]+)/g, (_, space, word, i: number) => (word ? esc(word) : /[\w-]/.test(s[i - 1] ?? '') || /[\w-]/.test(s[i + space.length] ?? '') ? '\\s+' : '\\s*'));
  const re = (list: Part[]): string => list.map((p) => (typeof p === 'string' ? lit(p) : Array.isArray(p) ? `(?:${re(p)})?` : p.type === 'icon' ? '([a-z0-9-]+)' : p.type === 'number' ? '([^\\s,|]*\\d[^\\s,|]*)' : p.type === 'money' || p.type === 'percent' ? '([^\\s|]*\\d[^\\s|]*)' : p.type === 'choice' ? `(${p.options.map(esc).join('|')})` : '(.*?)')).join('');
  const has = (list: Part[], values: string[]): boolean => list.some((p) => (typeof p === 'string' ? false : Array.isArray(p) ? has(p, values) : !!values[fields.indexOf(p)]?.trim()));
  const write = (list: Part[], values: string[]): string => list.map((p) => (typeof p === 'string' ? p : Array.isArray(p) ? (has(p, values) ? write(p, values) : '') : (values[fields.indexOf(p)] ?? '').replace(/\n/g, ' ').trim())).join('');
  return { fields, re: new RegExp(`^${re(tree)}$`, 'i'), write: (values) => write(tree, values).trimEnd() };
}

/** What is left for a line no kind claims: kept exactly as it was written. */
const OTHER: Kind = { name: 'Line', is: '{Text}' };
const cache = new WeakMap<Kind[], { kinds: Kind[]; made: Compiled[] }>();
/** A kind that is one field and nothing else: it takes whatever no other kind claims. */
export const isCatchAll = (k: Kind) => /^\{[^}]*\}$/.test(k.is);
/** The marks a kind's pattern opens with ("# ", "- "), before any field or optional part. */
const opening = (k: Kind) => /^[^{[]*/.exec(k.is)![0];

/** An app's kinds, ready to use: with the catch-all added, unless it has one of its own. */
export function kindsOf(given: Kind[]): { kinds: Kind[]; made: Compiled[] } {
  let hit = cache.get(given);
  if (!hit) {
    const kinds = given.some(isCatchAll) ? given : [...given, OTHER];
    cache.set(given, (hit = { kinds, made: kinds.map(compile) }));
  }
  return hit;
}

export const fieldsOf = (given: Kind[], kind: number) => kindsOf(given).made[kind].fields;

/** A field that holds words: not a picture, nor a choice of a few. */
export const holdsWords = (f: Field) => f.type !== 'icon' && f.type !== 'choice';

/** What a new row of a kind starts with: a choice at its first option, everything else empty. */
export const blankValues = (given: Kind[], kind: number) => fieldsOf(given, kind).map((f) => (f.type === 'choice' ? f.options[0] : ''));

/** The rows with field f of row i changed by `to`. */
export const withValue = (rows: Row[], i: number, f: number, to: (v: string) => string): Row[] =>
  rows.map((r, n) => (n === i ? { ...r, values: r.values.map((v, m) => (m === f ? to(v) : v)) } : r));

/** The lines of a TLO text as the patterns see them, each with how far in it sits; table rows come with their columns. */
interface Seen {
  line: string;
  depth: number;
  /** A list item's words without their mark, for a kind that nests. */
  item?: string;
  /** A table row: its values by column name. */
  cells?: Record<string, string>;
  /** A fenced document: "<app>\n<text>". */
  doc?: string;
  /** A setting in the header: [key, value]. */
  set?: [string, string];
}

function seen(text: string): Seen[] {
  const out: Seen[] = [];
  const doc = parseTlo(text);
  for (const [k, v] of Object.entries(doc.head)) out.push({ line: '', depth: 0, set: [k, v] });
  for (const b of doc.blocks) {
    if (b.k === 'table') {
      const names = b.head.map((h) => column(h).name.toLowerCase());
      for (const r of b.rows) out.push({ line: r.join(' | '), depth: 0, cells: Object.fromEntries(names.map((n, i) => [n, r[i] ?? ''])) });
    } else if (b.k === 'li') out.push({ line: `${b.ord ? '1.' : '-'} ${b.done === undefined ? '' : b.done ? '[x] ' : '[ ] '}${b.text}${attrsText(b.a)}`, depth: b.depth, item: b.text + attrsText(b.a) });
    else if (b.k === 'p') out.push(...(b.text + attrsText(b.a)).split('\n').map((line) => ({ line, depth: 0 })));
    else if (b.k === 'quote') out.push(...b.text.split('\n').map((line) => ({ line: `> ${line}`, depth: 0 })));
    else if (b.k === 'hr') out.push({ line: '', depth: 0 });
    else if (b.k === 'fence') out.push({ line: '', depth: 0, doc: fenceRef(b) });
    else out.push({ line: writeBlock(b), depth: 0 });
  }
  return out;
}

const isDoc = (k: Kind) => /^@@\{[^}]*\}$/.test(k.is);

export function readLines(text: string, given: Kind[]): Row[] {
  const { kinds, made } = kindsOf(given);
  const divider = kinds.findIndex((k) => k.is === '');
  const mark = (k: Kind) => opening(k).length;
  const order = kinds.map((_, i) => i).sort((a, b) => mark(kinds[b]) - mark(kinds[a]) || a - b);
  const rows: Row[] = [];
  for (const s of seen(text)) {
    if (s.set) {
      // (A setting no kind keeps is not the form's to show.)
      // Read as the line it would be ("theme: teal serif"), so a setting may have several fields.
      const kind = kinds.findIndex((k) => k.key === s.set![0]);
      const m = kind >= 0 ? made[kind].re.exec(`${kinds[kind].is.split(':')[0]}: ${s.set[1]}`) : null;
      if (kind >= 0) rows.push({ kind, values: m ? m.slice(1).map((v) => (v ?? '').trim()) : [s.set[1]], depth: 0 });
      continue;
    }
    if (s.doc !== undefined) {
      const kind = kinds.findIndex(isDoc);
      if (kind >= 0) rows.push({ kind, values: [s.doc], depth: 0 });
      continue;
    }
    if (s.cells) {
      // The table kind whose fields are most of the columns.
      const names = Object.keys(s.cells);
      const fit = (i: number) => made[i].fields.filter((f) => names.includes(f.name.toLowerCase())).length;
      const tables = kinds.map((_, i) => i).filter((i) => kinds[i].table);
      const kind = tables.sort((a, b) => fit(b) - fit(a))[0];
      if (kind !== undefined && fit(kind)) {
        rows.push({ kind, values: made[kind].fields.map((f) => s.cells![f.name.toLowerCase()] ?? ''), depth: 0 });
        continue;
      }
    }
    const line = s.line.trim();
    if (!line) {
      if (divider >= 0 && rows.length) rows.push({ kind: divider, values: [], depth: 0 });
      continue;
    }
    // A list item is first what a kind of its own says it is ("- {Point}"); else a thing that nests, at its depth.
    const nests = s.item !== undefined ? kinds.findIndex((k, i) => k.indent && !mark(k) && made[i].re.test(s.item!.trim())) : -1;
    // The kind whose opening mark is longest is tried first ("## " before "# "); otherwise in the order given.
    const claimed =
      order.find((i) => kinds[i].is !== '' && !kinds[i].table && !isDoc(kinds[i]) && made[i].re.test(line) && (mark(kinds[i]) > 0 || nests < 0)) ??
      // Whatever nothing else claims is words, kept as they are.
      kinds.findIndex(isCatchAll);
    const kind = nests >= 0 && (claimed === undefined || !mark(kinds[claimed])) ? nests : claimed;
    const k = kinds[kind];
    const words = kind === nests ? s.item!.trim() : line;
    // (A line nothing else claims is kept exactly as it was written, its indent and all.)
    if (k === OTHER) rows.push({ kind, values: [s.depth ? '  '.repeat(s.depth) + line : line], depth: 0 });
    else rows.push({ kind, values: made[kind].re.exec(words)!.slice(1).map((v) => (v ?? '').trim()), depth: k.indent ? s.depth : 0 });
  }
  return rows;
}

const typeOf = (f: Field) => (['number', 'date', 'money', 'percent', 'url'].includes(f.type) ? (f.type as 'number') : 'text');

export function writeLines(rows: Row[], given: Kind[]): string {
  const { kinds, made } = kindsOf(given);
  // A row with nothing in it yet is not written down (a blank line would mean something else, or nothing).
  const kept = rows.filter((r) => kinds[r.kind].is === '' || r.values.some((v) => v.trim()));
  const head: Record<string, string> = {};
  const blocks: TloBlock[] = [];
  let lines: string[] = [];
  const flush = () => {
    if (lines.length) blocks.push(...parseTlo(lines.join('\n')).blocks);
    lines = [];
  };
  // Words on lines of their own are paragraphs of their own; list items and headings sit line by line.
  const plain = (line: string) => parseTlo(line).blocks[0]?.k === 'p';
  const push = (line: string) => {
    if (lines.length && plain(line) && plain(lines[lines.length - 1])) lines.push('');
    lines.push(line);
  };
  for (let i = 0; i < kept.length; i++) {
    const r = kept[i];
    const k = kinds[r.kind];
    if (k.key) head[k.key] = made[r.kind].write(r.values).replace(/^[^:{]*:\s*/, '');
    else if (k.is === '') {
      flush();
      blocks.push({ k: 'hr' });
    } else if (isDoc(k)) {
      flush();
      blocks.push(refFence(r.values[0]));
    } else if (k.table) {
      flush();
      const fields = made[r.kind].fields;
      const table: TloBlock = { k: 'table', head: fields.map((f) => columnText(f.name, typeOf(f))), rows: [] };
      for (; i < kept.length && kept[i].kind === r.kind; i++) table.rows.push(fields.map((_, n) => (kept[i].values[n] ?? '').replace(/\n/g, ' ').trim()));
      i--;
      blocks.push(table);
    } else if (k === OTHER) push(r.values[0]);
    else if (k.indent && !opening(k)) push(`${'  '.repeat(r.depth)}- ${made[r.kind].write(r.values)}`);
    else push('  '.repeat(r.depth) + made[r.kind].write(r.values));
  }
  flush();
  return writeTlo({ head, blocks }).trimEnd();
}

/** Which heading a kind is, counting from 1 in the order given (a page is 1, a section 2); 0 for a kind that is not one. */
export function headLevel(given: Kind[], kind: number): number {
  const { kinds } = kindsOf(given);
  return kinds[kind]?.head ? kinds.filter((k, i) => k.head && i <= kind).length : 0;
}

/**
 * How far in each row sits when the text is seen as an outline: its own
 * indent, and one more for a line under a heading (two under a heading
 * that sits under another).
 */
export function depths(rows: Row[], given: Kind[]): number[] {
  const { kinds } = kindsOf(given);
  let under = 0;
  return rows.map((r) => {
    const k = kinds[r.kind];
    if (k.head) return (under = headLevel(given, r.kind)), under - 1;
    if (k.once) return 0;
    return r.depth + under;
  });
}

/** Where the rows that belong to row i end: everything after it that sits deeper. */
export function blockEnd(rows: Row[], given: Kind[], i: number): number {
  const d = depths(rows, given);
  let end = i + 1;
  while (end < rows.length && d[end] > d[i]) end++;
  return end;
}

/**
 * Move row i, with everything that belongs to it, past the row (and its
 * belongings) before or after it at the same level. A row with nothing
 * under it and no neighbour at its level steps one line instead, so an item
 * can cross from one section to the next. Returns the rows and where row i went.
 */
export function moveBlock(rows: Row[], given: Kind[], i: number, by: -1 | 1): [Row[], number] | null {
  const d = depths(rows, given);
  const end = blockEnd(rows, given, i);
  if (by < 0) {
    let p = i - 1;
    while (p >= 0 && d[p] > d[i]) p--;
    if (p < 0 || d[p] < d[i]) p = end - i === 1 && i > 0 ? i - 1 : -1;
    if (p < 0) return null;
    return [[...rows.slice(0, p), ...rows.slice(i, end), ...rows.slice(p, i), ...rows.slice(end)], p];
  }
  if (end >= rows.length) return null;
  const next = d[end] === d[i] ? blockEnd(rows, given, end) : end - i === 1 ? end + 1 : -1;
  if (next < 0) return null;
  return [[...rows.slice(0, i), ...rows.slice(end, next), ...rows.slice(i, end), ...rows.slice(next)], i + next - end];
}

/**
 * Move heading row i, with everything under it, past the heading of its
 * kind before or after it: a page past the next page, sections and all.
 * Null when there is no such neighbour (the home page has no heading row,
 * so nothing moves above it).
 */
export function movePart(rows: Row[], given: Kind[], i: number, by: -1 | 1): Row[] | null {
  const end = blockEnd(rows, given, i);
  if (by > 0) {
    if (!rows[end] || rows[end].kind !== rows[i].kind) return null;
    const next = blockEnd(rows, given, end);
    return [...rows.slice(0, i), ...rows.slice(end, next), ...rows.slice(i, end), ...rows.slice(next)];
  }
  let p = i - 1;
  while (p >= 0 && rows[p].kind !== rows[i].kind) p--;
  if (p < 0 || blockEnd(rows, given, p) !== i) return null;
  return [...rows.slice(0, p), ...rows.slice(i, end), ...rows.slice(p, i), ...rows.slice(end)];
}

/** Take heading row i away with everything under it. */
export function removePart(rows: Row[], given: Kind[], i: number): Row[] {
  return [...rows.slice(0, i), ...rows.slice(blockEnd(rows, given, i))];
}

/** Indent or bring out row i and what is under it. A row goes at most one level deeper than the row above it. */
export function shiftBlock(rows: Row[], given: Kind[], i: number, by: -1 | 1): Row[] | null {
  const { kinds } = kindsOf(given);
  if (!kinds[rows[i].kind].indent || (by > 0 ? i === 0 || rows[i].depth > rows[i - 1].depth || !kinds[rows[i - 1].kind].indent : rows[i].depth === 0)) return null;
  const end = blockEnd(rows, given, i);
  return rows.map((r, n) => (n >= i && n < end && kinds[r.kind].indent ? { ...r, depth: Math.max(0, r.depth + by) } : r));
}

/**
 * Put row i (with everything under it) somewhere else: under row `to`, as
 * its last child, or right after `to`'s block at `to`'s level. For a drag
 * of one thing onto another. Null when it makes no sense (onto itself or
 * its own child, or under a kind that has no children).
 */
export function placeBlock(rows: Row[], given: Kind[], i: number, to: number, how: 'under' | 'after'): Row[] | null {
  const { kinds } = kindsOf(given);
  const end = blockEnd(rows, given, i);
  if (to >= i && to < end) return null;
  if (how === 'under' && !kinds[rows[to].kind].indent) how = 'after';
  const block = rows.slice(i, end);
  const rest = [...rows.slice(0, i), ...rows.slice(end)];
  const at = to < i ? to : to - block.length;
  const target = rest[at];
  if (!target) return null;
  const depth = how === 'under' ? target.depth + 1 : target.depth;
  const shift = depth - block[0].depth;
  const moved = block.map((r) => ({ ...r, depth: kinds[r.kind].indent ? Math.max(0, r.depth + shift) : r.depth }));
  const where = blockEnd(rest, given, at);
  return [...rest.slice(0, where), ...moved, ...rest.slice(where)];
}

/** Take row i away. What was under it comes out a level, to sit where it was. */
export function removeRow(rows: Row[], given: Kind[], i: number): Row[] {
  const { kinds } = kindsOf(given);
  const end = kinds[rows[i].kind].indent ? blockEnd(rows, given, i) : i + 1;
  return rows.flatMap((r, n) => (n === i ? [] : n > i && n < end ? [{ ...r, depth: Math.max(0, r.depth - 1) }] : [r]));
}

/** The things in a list field's value, one by one: "Ann, Bob" is two. (One being typed may be empty for the moment; a list of nothing is no things.) */
export const listItems = (value: string): string[] => (value.trim() ? value.split(',').map((v) => v.trim()) : []);
/** The things of a list as the field holds them. */
export const joinItems = (items: string[]): string => items.map((v) => v.trim()).join(', ');

/**
 * Move thing `item` of row i's list field f into row j's list field g,
 * before its `at`th thing (at the end, when past it). For a person dragged
 * to another table, or after another person.
 */
export function moveItem(rows: Row[], i: number, f: number, item: number, j: number, g: number, at: number): Row[] {
  const from = listItems(rows[i]?.values[f] ?? '');
  const [thing] = from.splice(item, 1);
  if (thing === undefined || !rows[j]) return rows;
  const same = i === j && f === g;
  const to = same ? from : listItems(rows[j].values[g]);
  if (same && at > item) at--;
  to.splice(Math.min(at, to.length), 0, thing);
  return rows.map((r, n) => (n === i || n === j ? { ...r, values: r.values.map((v, m) => (n === j && m === g ? joinItems(to) : n === i && m === f ? joinItems(from) : v)) } : r));
}

/** The marks written after field n of a kind ("|", "..", ":"): a value holding one would read as two. */
export function marksAfter(given: Kind[], kind: number, n: number): string[] {
  const is = kindsOf(given).kinds[kind].is;
  const after = is.split('}').slice(n + 1).join('}');
  return [...new Set(after.replace(/\{[^}]*\}/g, ' ').replace(/[[\]]/g, ' ').split(/\s+/).filter((m) => m && !/^[\w]+$/.test(m)))];
}
