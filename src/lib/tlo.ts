/**
 * TLO: every document is Markdown with a few additions, and this reads and
 * writes it. The link holds this text (compressed), a .tlo file is this text,
 * and every app reads its document from the blocks here. docs/tlo.md is the
 * format as a person or a language model learns it.
 *
 * Blocks, one after another (a list item's depth says how it nests):
 *
 *   ---                      a header first: "key: value" lines between fences
 *   # Heading                levels 1 to 6
 *   Words                    a paragraph; its lines stay lines
 *   - item / 1. item         list items, two spaces in per level; "- [ ]" and "- [x]" are tasks
 *   > note                   a quote: a note, a speaker's note
 *   ---                      a rule: a break between pages or slides
 *   a | b                    a table: the header row names (and may type) the columns, "Price:money"
 *   --- | ---
 *   ```sheet                 a fenced block: another document inside this one, named by its app,
 *   ...                      or text kept exactly as written
 *   ```
 *   ~ A -> B: label          an edge between two things in the document (->, <-, <->, --)
 *   ![alt](address)          an image, or another document by its link, alone on a line
 *
 * Any block may end with attributes, "{#id .kind key=value}".
 * Inline: **bold**, *italic*, ++underline++, ~~strike~~, ==highlight==, [words](address), :icon:.
 */
import type { Run } from './richtext.ts';

export interface Attrs {
  id?: string;
  cls?: string[];
  kv?: Record<string, string>;
}

export type Block =
  | { k: 'h'; level: number; text: string; a?: Attrs }
  | { k: 'p'; text: string; a?: Attrs }
  | { k: 'li'; depth: number; ord?: boolean; done?: boolean; text: string; a?: Attrs }
  | { k: 'quote'; text: string; a?: Attrs }
  | { k: 'hr'; a?: Attrs }
  | { k: 'table'; head: string[]; rows: string[][]; a?: Attrs }
  | { k: 'fence'; lang: string; body: string; a?: Attrs }
  | { k: 'edge'; from: string; to: string; dir: Dir; label?: string; a?: Attrs }
  | { k: 'img'; alt: string; url: string; a?: Attrs };

export type Dir = '->' | '<-' | '<->' | '--';
export type Head = Record<string, string>;

export interface Tlo {
  head: Head;
  blocks: Block[];
}

/* ---------- attributes ---------- */

const ATTRS = /\s*(?<!\\)\{((?:[#.][\w-]+|[\w-]+=(?:"[^"]*"|[^\s"{}]*))(?:\s+(?:[#.][\w-]+|[\w-]+=(?:"[^"]*"|[^\s"{}]*)))*)\}\s*$/;

/** Words and the attributes at their end, if any. */
export function splitAttrs(line: string): [string, Attrs | undefined] {
  const m = ATTRS.exec(line);
  if (!m) return [unescapeTail(line), undefined];
  const a: Attrs = {};
  for (const part of m[1].match(/[#.][\w-]+|[\w-]+=(?:"[^"]*"|[^\s"{}]*)/g)!) {
    if (part[0] === '#') a.id = part.slice(1);
    else if (part[0] === '.') (a.cls ??= []).push(part.slice(1));
    else {
      const eq = part.indexOf('=');
      (a.kv ??= {})[part.slice(0, eq)] = part.slice(eq + 1).replace(/^"(.*)"$/, '$1');
    }
  }
  return [unescapeTail(line.slice(0, m.index)), a];
}

/** Words that only look like attributes at their end were written with "\{". */
function unescapeTail(line: string): string {
  const plain = line.replace(/\\\{(?=[^{]*$)/, '{');
  return plain !== line && ATTRS.test(plain) ? plain : line;
}

export function attrsText(a?: Attrs): string {
  if (!a) return '';
  const parts = [...(a.id ? ['#' + a.id] : []), ...(a.cls ?? []).map((c) => '.' + c), ...Object.entries(a.kv ?? {}).map(([k, v]) => `${k}=${/^[^\s"{}]*$/.test(v) && v ? v : `"${v.replace(/"/g, "'")}"`}`)];
  return parts.length ? ` {${parts.join(' ')}}` : '';
}

export const hasClass = (b: { a?: Attrs }, c: string) => !!b.a?.cls?.includes(c);
export const attr = (b: { a?: Attrs }, k: string): string | undefined => b.a?.kv?.[k];

/* ---------- reading ---------- */

const FENCE = /^(`{3,}|~{3,})\s*([\w-]*)\s*(.*)$/;
const HEADING = /^(#{1,6})(?:\s+(.*?))?\s*#*\s*$/;
const ITEM = /^(\s*)([-*+]|\d{1,9}[.)])(?:\s+(.*))?$/;
const RULE = /^\s{0,3}([-*_])(?:\s*\1){2,}\s*$/;
const SEP = /^\s*\|?\s*:?-+:?\s*(?:\|\s*:?-+:?\s*)*\|?\s*$/;
const EDGE = /^~\s+(.+?)\s+(<->|->|<-|--)\s+(.+?)(?::\s+(.*))?$/;
const IMAGE = /^!\[((?:\\.|[^\]\\])*)\]\(\s*<?([^)\s>]+)>?\s*\)$/;

/** The cells of a table row: pipes split them, "\|" is a pipe in a cell. */
export function cells(line: string): string[] {
  let s = line.trim();
  if (s.startsWith('|')) s = s.slice(1);
  if (s.endsWith('|') && !s.endsWith('\\|')) s = s.slice(0, -1);
  const out: string[] = [];
  let cur = '';
  for (let i = 0; i < s.length; i++) {
    if (s[i] === '\\' && (s[i + 1] === '|' || s[i + 1] === '\\')) (cur += s[i + 1]), i++;
    else if (s[i] === '|') out.push(cur.trim()), (cur = '');
    else cur += s[i];
  }
  out.push(cur.trim());
  return out.map((c) => c.replace(/<br\s*\/?>/gi, '\n'));
}

/** The header, if the text starts with one: "---", lines of "key: value", "---". */
function readHead(lines: string[]): [Head, number] {
  if (lines[0]?.trim() !== '---') return [{}, 0];
  const head: Head = {};
  for (let i = 1; i < lines.length; i++) {
    const line = lines[i];
    if (line.trim() === '---' || line.trim() === '...') return [head, i + 1];
    const m = /^([\w-]+):\s?(.*)$/.exec(line);
    if (!m) return [{}, 0];
    head[m[1].toLowerCase()] = m[2].trim().replace(/^"(.*)"$/, '$1');
  }
  return [{}, 0];
}

/** Undo the escapes that kept a line from being read as a block of another kind. */
const unblock = (s: string) => s.replace(/^\\(?=[#>~|!`\-+*[]|\d+[.)]|\{)/, '');

export function parse(text: string): Tlo {
  const lines = text.replace(/\r\n?/g, '\n').replace(/^﻿/, '').split('\n');
  const [head, start] = readHead(lines);
  const blocks: Block[] = [];
  // List nesting: the indents of the items we are inside, so two, three or four spaces all nest.
  let indents: number[] = [];
  let para: string[] = [];
  let paraKind: 'p' | 'quote' = 'p';
  const flush = () => {
    if (para.length) {
      const [text, a] = splitAttrs(para.join('\n'));
      blocks.push({ k: paraKind, text, ...(a ? { a } : {}) });
    }
    para = [];
  };
  for (let i = start; i < lines.length; i++) {
    const line = lines[i];
    const t = line.trim();
    if (!t) {
      flush();
      continue;
    }
    const fence = FENCE.exec(t);
    if (fence && (fence[1][0] === '~' ? !fence[3] : !fence[3].includes('`'))) {
      // (A fence between list items leaves the list's nesting as it was.)
      flush();
      const close = new RegExp(`^\\s*${fence[1][0] === '`' ? '`' : '~'}{${fence[1].length},}\\s*$`);
      const body: string[] = [];
      let j = i + 1;
      while (j < lines.length && !close.test(lines[j])) body.push(lines[j++]);
      const [, a] = splitAttrs(' ' + fence[3]);
      blocks.push({ k: 'fence', lang: fence[2].toLowerCase(), body: body.join('\n'), ...(a ? { a } : {}) });
      i = j;
      continue;
    }
    if (RULE.test(line)) {
      flush();
      indents = [];
      const [, a] = splitAttrs(t.replace(/^[-*_\s]+/, ' '));
      blocks.push({ k: 'hr', ...(a ? { a } : {}) });
      continue;
    }
    const h = HEADING.exec(t);
    if (h) {
      flush();
      indents = [];
      const [text, a] = splitAttrs(h[2] ?? '');
      blocks.push({ k: 'h', level: h[1].length, text, ...(a ? { a } : {}) });
      continue;
    }
    if (t.includes('|') && !para.length && i + 1 < lines.length && SEP.test(lines[i + 1]) && lines[i + 1].includes('-')) {
      flush();
      indents = [];
      const headCells = cells(t);
      const rows: string[][] = [];
      let j = i + 2;
      while (j < lines.length && lines[j].trim() && lines[j].includes('|')) rows.push(cells(lines[j++]));
      // A table's attributes ride on the line after it, alone.
      let a: Attrs | undefined;
      if (j < lines.length && /^\s*\{.*\}\s*$/.test(lines[j])) [, a] = splitAttrs(' ' + lines[j++].trim());
      blocks.push({ k: 'table', head: headCells, rows: rows.map((r) => headCells.map((_, c) => r[c] ?? '')), ...(a ? { a } : {}) });
      i = j - 1;
      continue;
    }
    const edge = EDGE.exec(t);
    if (edge) {
      flush();
      const [label, a] = splitAttrs(edge[4] ?? '');
      blocks.push({ k: 'edge', from: edge[1], to: edge[3], dir: edge[2] as Dir, ...(label ? { label } : {}), ...(a ? { a } : {}) });
      continue;
    }
    const [imgLine, imgA] = splitAttrs(t);
    const img = IMAGE.exec(imgLine);
    if (img) {
      flush();
      blocks.push({ k: 'img', alt: img[1].replace(/\\(.)/g, '$1'), url: img[2], ...(imgA ? { a: imgA } : {}) });
      continue;
    }
    const item = ITEM.exec(line);
    if (item && (item[3] !== undefined || /^[-*+]$|^\d+[.)]$/.test(t))) {
      flush();
      const indent = item[1].replace(/\t/g, '    ').length;
      while (indents.length && indent < indents[indents.length - 1]) indents.pop();
      if (!indents.length || indent > indents[indents.length - 1]) indents.push(indent);
      let words = item[3] ?? '';
      let done: boolean | undefined;
      const task = /^\[( |x|X)\](?:\s+|$)(.*)$/.exec(words);
      if (task) (done = task[1] !== ' '), (words = task[2]);
      const [text, a] = splitAttrs(unblock(words));
      blocks.push({ k: 'li', depth: indents.length - 1, ...(/\d/.test(item[2]) ? { ord: true } : {}), ...(done !== undefined ? { done } : {}), text, ...(a ? { a } : {}) });
      continue;
    }
    const quote = /^\s*>\s?(.*)$/.exec(line);
    if (quote) {
      if (paraKind !== 'quote') flush();
      paraKind = 'quote';
      para.push(quote[1]);
      continue;
    }
    // A line under a list item, indented, carries on that item.
    const last = blocks[blocks.length - 1];
    if (!para.length && last?.k === 'li' && /^\s/.test(line) && lines[i - 1]?.trim()) {
      last.text += '\n' + t;
      continue;
    }
    if (paraKind !== 'p') flush();
    paraKind = 'p';
    indents = [];
    para.push(unblock(t));
  }
  flush();
  return { head, blocks };
}

/** A text's header and the text after it. */
export function splitHead(text: string): [Head, string] {
  const lines = text.split('\n');
  const [head, start] = readHead(lines);
  return start ? [head, lines.slice(start).join('\n')] : [{}, text];
}

/** Some keys taken out of a text's header: [those keys, the text without them]. The rest of the header stays. */
export function takeHead(text: string, keys: string[]): [Head, string] {
  const lines = text.split('\n');
  const [head, start] = readHead(lines);
  if (!start || !keys.some((k) => k in head)) return [{}, text];
  const took: Head = {};
  const rest: Head = {};
  for (const [k, v] of Object.entries(head)) (keys.includes(k) ? took : rest)[k] = v;
  return [took, writeHead(rest) + lines.slice(start).join('\n')];
}

/** A text with keys put in its header (an empty value takes the key out). */
export function withHead(text: string, keys: Head): string {
  const lines = text.split('\n');
  const [head, start] = readHead(lines);
  const next = { ...head };
  for (const [k, v] of Object.entries(keys)) v ? (next[k] = v) : delete next[k];
  return writeHead(next) + lines.slice(start).join('\n');
}

/* ---------- writing ---------- */

/** A line as it must be written so it reads back as the same words, not as a block of another kind. */
function guard(line: string): string {
  // A lone "|" is a deck's column break, and reads back as itself.
  if (line === '|') return line;
  if (/^(#{1,6}(\s|$)|[-*+](\s|$)|\d{1,9}[.)](\s|$)|>|~\s|```|~~~|!\[|\|)/.test(line) || RULE.test(line)) return '\\' + line;
  return line;
}
const guardEnd = (s: string) => (ATTRS.test(s) ? s.replace(/\{(?=[^{]*$)/, '\\{') : s);

export function writeHead(head: Head): string {
  const keys = Object.keys(head).filter((k) => head[k] !== undefined && head[k] !== '');
  if (!keys.length) return '';
  return ['---', ...keys.map((k) => `${k}: ${String(head[k]).replace(/\n/g, ' ')}`), '---', ''].join('\n');
}

const cell = (s: string) => s.replace(/\\/g, '\\\\').replace(/\|/g, '\\|').replace(/\n/g, '<br>');

export function writeBlock(b: Block, n = 1): string {
  const at = attrsText(b.a);
  switch (b.k) {
    case 'h':
      return `${'#'.repeat(b.level)} ${guardEnd(b.text)}${at}`.trimEnd();
    case 'p':
      return guardEnd(b.text.split('\n').map(guard).join('\n')) + at;
    case 'quote':
      return guardEnd(b.text).split('\n').map((l) => `> ${l}`.trimEnd()).join('\n') + at;
    case 'li': {
      const mark = b.ord ? `${n}.` : '-';
      const task = b.done === undefined ? '' : b.done ? '[x] ' : '[ ] ';
      const [first, ...more] = b.text.split('\n');
      const pad = '  '.repeat(b.depth);
      const lead = (/^\[[ xX]\](\s|$)/.test(first) && b.done === undefined) || RULE.test(`- ${first}`) ? '\\' : '';
      return `${pad}${mark} ${task}${lead}${guardEnd(first)}${more.length ? '' : at}`.trimEnd() + more.map((l, i) => `\n${pad}  ${l}${i === more.length - 1 ? at : ''}`).join('');
    }
    case 'hr':
      return `---${at}`;
    case 'table': {
      // A table of one column, or one whose first words would read as something else ("# of units"), keeps its edges;
      // so does a row starting with an empty cell, or the pipe would be taken for the table's edge.
      const edged = b.head.length < 2 || guard(cell(b.head[0])) !== cell(b.head[0]);
      const row = (r: string[]) => (edged ? `| ${r.map(cell).join(' | ')} |` : (r[0] ? '' : '|') + r.map(cell).join(' | ')).trimEnd();
      return [row(b.head), row(b.head.map(() => '---')), ...b.rows.map(row), ...(at ? [at.trim()] : [])].join('\n');
    }
    case 'fence': {
      const longest = Math.max(2, ...(b.body.match(/`{3,}/g) ?? []).map((m) => m.length));
      const ticks = '`'.repeat(longest + 1);
      return `${ticks}${b.lang}${at}\n${b.body}${b.body ? '\n' : ''}${ticks}`;
    }
    case 'edge':
      return `~ ${b.from} ${b.dir} ${b.to}${b.label ? ': ' + b.label : ''}${at}`;
    case 'img':
      return `![${b.alt.replace(/[[\]\\]/g, '\\$&')}](${b.url})${at}`;
  }
}

/** Blocks as text. Blocks that would run together are kept apart by a blank line; list items and edges sit line by line. */
export function write(doc: Tlo): string {
  const out: string[] = [];
  const counts: number[] = [];
  let prev: Block | undefined;
  for (const b of doc.blocks) {
    let n = 1;
    if (b.k === 'li') {
      counts.length = b.depth + 1;
      // An ordered item counts on from the ordered item before it at its depth, across the deeper ones between.
      n = counts[b.depth] = b.ord && prev?.k === 'li' && (prev.depth > b.depth || prev.ord) && counts[b.depth] ? counts[b.depth] + 1 : 1;
      if (!b.ord) counts[b.depth] = 0;
    } else counts.length = 0;
    const tight = prev && ((prev.k === 'li' && b.k === 'li') || (prev.k === 'edge' && b.k === 'edge'));
    if (prev) out.push(tight ? '\n' : '\n\n');
    out.push(writeBlock(b, n));
    prev = b;
  }
  const body = out.join('');
  return writeHead(doc.head) + (body ? body + '\n' : '');
}

/* ---------- inline ---------- */

const MARKS: [string, keyof Run][] = [
  ['**', 'b'],
  ['__', 'b'],
  ['~~', 's'],
  ['==', 'h'],
  ['++', 'u'],
  ['*', 'i'],
  ['_', 'i'],
];
const LINK = /^\[((?:\\.|[^\]\\\n])*)\]\(\s*<?((?:https?:\/\/|mailto:|tel:|#)[^()\s>]*)>?\s*\)/;
const ICON = /^:([a-z][a-z0-9-]*):/;
/** A web or mail address, as far as it can go without taking in a mark that follows it. */
const URL = '(?:https?:\\/\\/|mailto:)(?:(?!\\*\\*|~~|==|\\+\\+|__|:[a-z][a-z0-9-]*:)[^\\s<`\\\\[\\]*])+';

/** Inline Markdown as runs of text with their marks. Lenient: what does not close is plain text. */
export function parseInline(s: string): Run[] {
  const runs: Run[] = [];
  const on: Partial<Record<keyof Run, boolean>> = {};
  let href: string | undefined;
  let buf = '';
  const push = (t: string, extra: Partial<Run> = {}) => {
    const r: Run = { t };
    for (const f of ['b', 'i', 'u', 's', 'h'] as const) if (on[f]) r[f] = true;
    if (href) r.href = href;
    Object.assign(r, extra);
    const last = runs[runs.length - 1];
    if (last && !r.ic && !last.ic && ['b', 'i', 'u', 's', 'h', 'href'].every((k) => last[k as keyof Run] === r[k as keyof Run])) last.t += r.t;
    else runs.push(r);
  };
  const flush = () => {
    if (buf) push(buf);
    buf = '';
  };
  /** Whether a mark opening here has a closing partner later, as Markdown wants: no space inside either end. */
  const closes = (from: number, mark: string) => {
    for (let j = s.indexOf(mark, from); j > from; j = s.indexOf(mark, j + 1)) if (s[j - 1] !== ' ' && !escaped(j)) return true;
    return false;
  };
  /** Whether the character at j follows an odd run of backslashes, and so is escaped. */
  const escaped = (j: number) => {
    let n = 0;
    while (j - n - 1 >= 0 && s[j - n - 1] === '\\') n++;
    return n % 2 === 1;
  };
  let linkEnd = -1;
  for (let i = 0; i < s.length; ) {
    if (i === linkEnd) {
      flush();
      href = undefined;
      linkEnd = -1;
      i = s.indexOf(')', i) + 1;
      continue;
    }
    const c = s[i];
    if (c === '\\' && i + 1 < s.length && /[\\`*_{}[\]()#+\-.!|~=:<>]/.test(s[i + 1])) {
      buf += s[i + 1];
      i += 2;
      continue;
    }
    if (c === '`') {
      const end = s.indexOf('`', i + 1);
      if (end > i) {
        buf += s.slice(i + 1, end);
        i = end + 1;
        continue;
      }
    }
    if (c === '[' && href === undefined) {
      const m = LINK.exec(s.slice(i));
      if (m) {
        flush();
        href = m[2];
        // The words are read in place, marks and all; the address is skipped at their end.
        linkEnd = i + 1 + m[1].length;
        i++;
        continue;
      }
    }
    // A web address is taken whole: the marks inside it (an "=" in its query, an "_" in its path) are its own.
    if ((c === 'h' || c === 'm') && (i === 0 || /[\s(]/.test(s[i - 1]))) {
      const m = new RegExp('^' + URL).exec(s.slice(i));
      if (m) {
        const url = m[0].replace(/[.,;:!?)]+$/, '');
        buf += url;
        i += url.length;
        continue;
      }
    }
    if (c === ':') {
      const m = ICON.exec(s.slice(i));
      if (m) {
        flush();
        push('', { ic: m[1] });
        i += m[0].length;
        continue;
      }
    }
    if (c === '<') {
      const m = /^<(\/?)u>/.exec(s.slice(i));
      if (m) {
        flush();
        on.u = !m[1];
        i += m[0].length;
        continue;
      }
    }
    const mark = MARKS.find(([m]) => s.startsWith(m, i));
    if (mark) {
      const [m, f] = mark;
      const next = s[i + m.length];
      const before = s[i - 1];
      // "_" inside a word (snake_case) is not a mark, as in Markdown.
      const intraword = m[0] === '_' && /\w/.test(before ?? '') && /\w/.test(next ?? '');
      if (!intraword && on[f] && before !== ' ' && before !== undefined) {
        flush();
        on[f] = false;
        i += m.length;
        continue;
      }
      if (!intraword && !on[f] && next && next !== ' ' && closes(i + m.length, m)) {
        flush();
        on[f] = true;
        i += m.length;
        continue;
      }
      buf += m;
      i += m.length;
      continue;
    }
    buf += c;
    i++;
  }
  flush();
  return runs.filter((r) => r.t || r.ic);
}

/** Plain words as Markdown: anything that would read as a mark is escaped. */
export function escapeInline(t: string): string {
  // A web address is read whole, so nothing inside it is escaped.
  return t
    .split(new RegExp(`((?:^|(?<=[\\s(]))${URL})`))
    .flatMap((part, n) => (n % 2 ? ((m) => [m![1], '', m![2]])(/^(.*?)([.,;:!?)]*)$/.exec(part)) : [part]))
    .map((part, n) => (n % 2 ? part : escapePlain(part)))
    .join('');
}

function escapePlain(t: string): string {
  return t
    .replace(/[\\`*_]/g, '\\$&')
    .replace(/(~~|==|\+\+)/g, (m) => '\\' + m[0] + '\\' + m[1])
    .replace(/\[(?=(?:\\.|[^\]\\\n])*\]\()/g, '\\[')
    .replace(/:(?=[a-z][a-z0-9-]*:)/g, '\\:')
    .replace(/<(?=\/?u>)/g, '\\<');
}

const FLAGS = [
  ['b', '**'],
  ['i', '*'],
  ['s', '~~'],
  ['h', '=='],
  ['u', '++'],
] as const;

/** Runs as inline Markdown. Marks open and close where they change; spaces stay outside them, as Markdown needs. */
export function writeInline(runs: Run[]): string {
  let out = '';
  for (let i = 0; i < runs.length; ) {
    const href = runs[i].href;
    let j = i + 1;
    while (j < runs.length && runs[j].href === href) j++;
    // Inside a link's words a "]" would end them early.
    const part = href ? marked(runs.slice(i, j)).replace(/(?<!\\)\]/g, '\\]') : marked(runs.slice(i, j));
    out += href ? `[${part}](${href.replace(/[\s()]/g, (c) => '%' + c.charCodeAt(0).toString(16).toUpperCase())})` : part;
    i = j;
  }
  return out;
}

function marked(runs: Run[]): string {
  let out = '';
  const open: string[] = [];
  // Marks that end close innermost first; marks that carry on stay open (a mark is read as a switch, so they need not nest).
  const close = (keep: Set<string>) => {
    for (let k = open.length - 1; k >= 0; k--)
      if (!keep.has(open[k])) {
        out += FLAGS.find(([g]) => g === open[k])![1];
        open.splice(k, 1);
      }
  };
  for (const r of runs) {
    if (r.ic) {
      close(new Set());
      out += `:${r.ic}:`;
      continue;
    }
    const want = new Set<string>(FLAGS.filter(([f]) => r[f]).map(([f]) => f));
    const m = /^(\s*)([\s\S]*?)(\s*)$/.exec(r.t)!;
    if (!m[2]) {
      // Spaces carry no marks of their own, but what they lack ends here.
      close(want);
      out += r.t;
      continue;
    }
    close(want);
    out += m[1];
    for (const [f, d] of FLAGS) if (want.has(f) && !open.includes(f)) (out += d), open.push(f);
    out += escapeInline(m[2]);
    if (m[3]) {
      close(new Set());
      out += m[3];
    }
  }
  close(new Set());
  return out;
}

/** The words alone, marks and all taken away. */
export const plain = (s: string) =>
  parseInline(s)
    .map((r) => r.t)
    .join('');

/* ---------- typed columns ---------- */

export type ColType = 'text' | 'number' | 'money' | 'percent' | 'date' | 'time' | 'check' | 'url' | 'rich' | 'long' | 'icon';
export const COL_TYPES: ColType[] = ['text', 'number', 'money', 'percent', 'date', 'time', 'check', 'url', 'rich', 'long', 'icon'];

/** A column heading, "Price:money", as its name and type. */
export function column(h: string): { name: string; type: ColType } {
  const m = /^(.*?):(\w+)$/.exec(h.trim());
  return m && COL_TYPES.includes(m[2] as ColType) ? { name: m[1].trim(), type: m[2] as ColType } : { name: h.trim(), type: 'text' };
}
/** Where in a table each column asked for is, found by its name (in any case, its type left off); -1 for one it has not got. */
export function columnsOf(table: { head: string[] }, ...want: RegExp[]): number[] {
  const names = table.head.map((h) => column(h).name.toLowerCase());
  return want.map((re) => names.findIndex((n) => re.test(n)));
}
export const columnText = (name: string, type: ColType = 'text') => (type === 'text' ? name : `${name}:${type}`);

/* ---------- structure ---------- */

/** The blocks between rules: a deck's slides, a booklet's pages. */
export function pages(blocks: Block[]): Block[][] {
  const out: Block[][] = [[]];
  for (const b of blocks) b.k === 'hr' ? out.push([]) : out[out.length - 1].push(b);
  return out;
}

/** The blocks under each heading of a level: [heading or null for what comes before, blocks]. */
export function sections(blocks: Block[], level: number): [Extract<Block, { k: 'h' }> | null, Block[]][] {
  const out: [Extract<Block, { k: 'h' }> | null, Block[]][] = [[null, []]];
  for (const b of blocks) b.k === 'h' && b.level <= level ? out.push([b, []]) : out[out.length - 1][1].push(b);
  return out[0][1].length ? out : out.slice(1);
}
