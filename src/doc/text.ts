/**
 * The text layer: a document as what it says, in the order it says it, for whoever cannot see its pages (a screen
 * reader on a Display Link), for whoever would rather read it reflowed (the Display Link's Text), for a web page made
 * of it (kit/exports.ts htmlOf) and for an agent (src/api.ts `text`, as Markdown). A small tree of nodes: headings,
 * paragraphs (runs with their marks and links), lists (nested, a task with its state), tables (the values a reader
 * sees, worked out), fences as written, a document held in this one, footnotes, and the breaks between pages or slides.
 *
 * textOf builds it from the blocks every text-shaped app shares (Word Processor, Outliner, Presentation Builder,
 * Spreadsheet, Calculator); an app whose model is spatial gives its own in the same shape (kit/app.ts
 * AppDef.text). A fence naming an app is another document: the host says how to read it (`inner`); with none, it is
 * its text as written. textMarkdown writes the nodes as Markdown through the kernel's own writer (TLO is Markdown),
 * so read back and written again it is the same bytes. Read-only: nothing here edits a document.
 */
import { plainText, type Block, type Doc, type Run } from './model.ts';
import { parseInline, write } from './tlo.ts';
import { noteRuns, referenceNotes } from './notes.ts';
import { tableAt } from './table.ts';
import { evaluateTable, formatCell, type CellValue } from './formula.ts';

/** Words with their marks; a footnote's mark is its number (`t`), carrying the note's words as inline Markdown. */
export type TextRun = Omit<Run, 'ic' | 'fn'> & { note?: string };

/** A list item: its words, its state when it is a task, and the list under it. */
export interface TextItem {
  runs: TextRun[];
  done?: boolean;
  list?: TextList;
}
export interface TextList {
  k: 'list';
  ord: boolean;
  items: TextItem[];
}

/** One node of the text layer. */
export type TextNode =
  | { k: 'h'; level: 1 | 2 | 3 | 4; runs: TextRun[] }
  | { k: 'p'; runs: TextRun[] }
  | { k: 'quote'; runs: TextRun[] }
  | TextList
  | { k: 'table'; head: string[]; rows: string[][] }
  | { k: 'pre'; lang: string; body: string }
  /** Another document held in this one, by its app (its name), its title and its own nodes. */
  | { k: 'doc'; app: string; title: string; nodes: TextNode[] }
  /** The footnotes, numbered from 1 as their marks are. */
  | { k: 'notes'; notes: TextRun[][] }
  /** The next page or slide. */
  | { k: 'break' };

export interface TextOptions {
  /** A fence naming an app, read as that app's document; undefined to leave it as written. */
  inner?: (lang: string, body: string) => TextNode | undefined;
}

const ARROWS: Record<string, string> = { '->': '→', '<-': '←', '<->': '↔', '--': '—' };
/** Columns whose cells are words as typed, shown as written unless a formula. */
const WORDS = new Set(['text', 'long', 'name', 'option', 'url', 'icon']);

/** Runs for reading: an icon left out, a footnote's mark its number, neighbours with the same marks joined, the ends trimmed. */
function readable(runs: Run[], notes: string[]): TextRun[] {
  const out: TextRun[] = [];
  for (const r of runs) {
    if (r.ic) continue;
    const next: TextRun = r.fn !== undefined ? { t: String(notes.push(r.fn)), note: r.fn } : { ...r };
    const last = out[out.length - 1];
    if (last && last.note === undefined && next.note === undefined && same(last, next)) out[out.length - 1] = { ...last, t: last.t + next.t };
    else if (next.t) out.push(next);
  }
  const first = out[0],
    end = out[out.length - 1];
  if (first && first.note === undefined) out[0] = { ...first, t: first.t.trimStart() };
  if (end && end.note === undefined) out[out.length - 1] = { ...out[out.length - 1], t: out[out.length - 1].t.trimEnd() };
  return out.filter((r) => r.t);
}
const same = (a: TextRun, b: TextRun) => a.b === b.b && a.i === b.i && a.u === b.u && a.s === b.s && a.h === b.h && a.href === b.href;

/** A table as a reader sees it: each column's name, each cell worked out and formatted, empty rows and nameless empty columns left out. */
function tableNode(doc: Doc, at: number): TextNode {
  const b = doc.blocks[at] as Extract<Block, { k: 'table' }>;
  const table = tableAt(doc, at)!;
  let values: CellValue[][] = [];
  try {
    values = evaluateTable(table).values;
  } catch {
    // A table that cannot be worked out is shown as written.
  }
  const shown = b.rows.map((row, r) =>
    b.cols.map((col, c) => {
      const raw = row[c] ?? '';
      if (col.type === 'rich') return plainText(parseInline(raw));
      if (!raw.trim().startsWith('=') && WORDS.has(col.type)) return raw;
      const v = values[r]?.[c];
      return v === undefined ? raw : formatCell(v, col.type, col.currency || doc.head.currency);
    }),
  );
  const keep = b.cols.map((col, c) => !!col.name.trim() || shown.some((row) => row[c].trim()));
  return {
    k: 'table',
    head: b.cols.filter((_, c) => keep[c]).map((col) => col.name),
    rows: shown.filter((row) => row.some((x) => x.trim())).map((row) => row.filter((_, c) => keep[c])),
  };
}

/** The text layer of a document's blocks. */
export function textOf(doc: Doc, opts: TextOptions = {}): TextNode[] {
  const out: TextNode[] = [];
  const notes: string[] = [];
  // The lists open at each depth, deepest last, while list items follow one another.
  let open: { depth: number; list: TextList }[] = [];
  let edges: TextList | null = null;
  doc.blocks.forEach((b, at) => {
    if (b.k !== 'li') open = [];
    if (b.k !== 'edge') edges = null;
    switch (b.k) {
      case 'h': {
        const runs = readable(b.runs, notes);
        if (runs.length) out.push({ k: 'h', level: Math.min(4, b.level) as 1 | 2 | 3 | 4, runs });
        return;
      }
      case 'p': {
        const runs = readable(b.runs, notes);
        if (runs.length) out.push({ k: 'p', runs });
        return;
      }
      case 'quote': {
        const runs = readable(b.runs, notes);
        if (runs.length) out.push({ k: 'quote', runs });
        return;
      }
      case 'li': {
        const item: TextItem = { runs: readable(b.runs, notes), ...(b.done !== undefined ? { done: b.done } : {}) };
        while (open.length && open[open.length - 1].depth > b.depth) open.pop();
        const top = open[open.length - 1];
        if (!top) {
          const list: TextList = { k: 'list', ord: !!b.ord, items: [item] };
          out.push(list);
          open = [{ depth: b.depth, list }];
        } else if (top.depth === b.depth) top.list.items.push(item);
        else {
          const parent = top.list.items[top.list.items.length - 1];
          parent.list ??= { k: 'list', ord: !!b.ord, items: [] };
          parent.list.items.push(item);
          open.push({ depth: b.depth, list: parent.list });
        }
        return;
      }
      case 'hr':
        return void out.push({ k: 'break' });
      case 'table':
        return void out.push(tableNode(doc, at));
      case 'fence':
        return void out.push((b.lang && opts.inner?.(b.lang, b.body)) || { k: 'pre', lang: b.lang, body: b.body });
      case 'edge': {
        const item: TextItem = { runs: [{ t: `${b.from.trim()} ${ARROWS[b.dir]} ${b.to.trim()}${b.label?.trim() ? `: ${b.label.trim()}` : ''}` }] };
        if (edges) edges.items.push(item);
        else out.push((edges = { k: 'list', ord: false, items: [item] }));
        return;
      }
    }
  });
  if (notes.length) out.push({ k: 'notes', notes: notes.map((n) => readable(noteRuns(n), [])) });
  return out;
}

/* ---------- as Markdown ---------- */

/** Runs as the kernel's again: a footnote's number back to its note. */
const kernelRuns = (runs: TextRun[]): Run[] => runs.map(({ note, ...r }) => (note !== undefined ? { t: '', fn: note } : r));

function blocksOf(nodes: TextNode[]): Block[] {
  const out: Block[] = [];
  const items = (list: TextList, depth: number) => {
    for (const it of list.items) {
      out.push({ k: 'li', depth, ...(list.ord ? { ord: true as const } : {}), ...(it.done !== undefined ? { done: it.done } : {}), runs: kernelRuns(it.runs) });
      if (it.list) items(it.list, depth + 1);
    }
  };
  for (const n of nodes) {
    if (n.k === 'h') out.push({ k: 'h', level: n.level, runs: kernelRuns(n.runs) });
    else if (n.k === 'p' || n.k === 'quote') out.push({ k: n.k, runs: kernelRuns(n.runs) });
    else if (n.k === 'list') items(n, 0);
    else if (n.k === 'table') out.push({ k: 'table', cols: n.head.map((name) => ({ name, type: 'text' })), rows: n.rows });
    else if (n.k === 'pre') out.push({ k: 'fence', lang: n.lang, body: n.body });
    else if (n.k === 'doc') out.push(...blocksOf(n.nodes));
    else if (n.k === 'break') out.push({ k: 'hr' });
    // The notes ride in their marks, and are written at the end in Markdown's reference form.
  }
  return out;
}

/** The text layer as Markdown: what a document says, for an agent or a file; footnotes in the reference form other readers know. */
export const textMarkdown = (nodes: TextNode[]): string => write(referenceNotes({ head: {}, blocks: blocksOf(nodes) }));

/* ---------- counted ---------- */

const wordsIn = (s: string) => s.match(/\S+/g)?.length ?? 0;
const runWords = (runs: TextRun[]) => wordsIn(runs.map((r) => (r.note === undefined ? r.t : ' ')).join(''));

/** How many words a reader hears and how many headings they can move between. */
export function textCounts(nodes: TextNode[]): { words: number; headings: number } {
  let words = 0,
    headings = 0;
  const list = (l: TextList) => l.items.forEach((it) => ((words += runWords(it.runs)), it.list && list(it.list)));
  const walk = (ns: TextNode[]) => {
    for (const n of ns) {
      if (n.k === 'h') headings++;
      if (n.k === 'h' || n.k === 'p' || n.k === 'quote') words += runWords(n.runs);
      else if (n.k === 'list') list(n);
      else if (n.k === 'table') words += wordsIn([...n.head, ...n.rows.flat()].join(' '));
      else if (n.k === 'pre') words += wordsIn(n.body);
      else if (n.k === 'doc') walk(n.nodes);
      else if (n.k === 'notes') n.notes.forEach((r) => (words += runWords(r)));
    }
  };
  walk(nodes);
  return { words, headings };
}
