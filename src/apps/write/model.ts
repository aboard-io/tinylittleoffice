/**
 * Write's reading of a document, with no DOM in it: the paper it prints on, its name, its own head fields
 * (an invoice's from and to), the word count, a table block as the sheet's renderer and the inline grid
 * see it, and the few commands that are not the editor's own (a cell typed into, a row or a column put in or
 * taken out, a card moved, copied or taken out). The view
 * Write draws is the Doc itself (docs/kernel.md §3); nothing is kept but the document.
 */
import {
  apply,
  applyAll,
  evaluateTable,
  hasClass,
  isText,
  MAX_COLS,
  notesOf,
  noteRuns,
  parse,
  plainText,
  putCells,
  tableAt,
  usedSize,
  write,
  type Block,
  type Cells,
  type ColType,
  type Doc,
  type Op,
  type TableBlock,
} from '../../doc/index.ts';
import type { SheetView } from '../sheet/model.ts';
import { addColumn, deleteRows, insertRows, isLetterName, letterName, putRect, rename, setType } from '../sheet/model.ts';

/** The paper a text prints on: its size in px (96 to the inch) and its margin, an inch or 25 mm. */
export const PAPERS = { letter: { name: 'Letter', w: 816, h: 1056, m: 96 }, a4: { name: 'A4', w: 794, h: 1123, m: 94 } } as const;
export type Paper = keyof typeof PAPERS;
/** The paper where the reader is: letter in North America, A4 nearly everywhere else (and where there is no reader: a program). */
export const defaultPaper = (): Paper => (typeof navigator === 'undefined' || /-(US|CA|MX|PR|PH|CL|CO|VE|GT|CR|PA|DO)$/i.test(navigator.language) ? 'letter' : 'a4');
/** The paper the text says, in its header ("paper: a4"), or the reader's. */
export const paperOf = (doc: Doc): Paper => (doc.head.paper && doc.head.paper in PAPERS ? (doc.head.paper as Paper) : defaultPaper());

/** The head's fields that are the shell's or Write's own (the paper, the look), not the document's (an invoice's from, to, number…). */
export const SHELL_KEYS = new Set(['title', 'by', 'created', 'app', 'paper', 'look']);
/** The document's own head fields, in order: what an invoice says above its lines. */
export const fieldsOf = (doc: Doc): [string, string][] => Object.entries(doc.head).filter(([k, v]) => !SHELL_KEYS.has(k) && v !== undefined);

/** The heading that is the document's title: a level-1 heading with the class title. */
export const titleBlock = (doc: Doc): Extract<Block, { k: 'h' }> | undefined => doc.blocks.find((b): b is Extract<Block, { k: 'h' }> => b.k === 'h' && b.level === 1 && hasClass(b, 'title'));

/** The document's name: the head's title, else its title heading's words, else nothing. */
export function titleOf(text: string): string {
  const doc = parse(text);
  if (doc.head.title) return doc.head.title;
  const h = titleBlock(doc);
  return h ? plainText(h.runs).trim() : '';
}
/** The document with this name: one head op, written back (the shell's one mechanism for every app). */
export const retitle = (text: string, title: string): string => write(apply(parse(text), { op: 'head', key: 'title', value: title.replace(/\n/g, ' ').trim() || undefined }));

const count = (s: string) => (s.match(/\S+/g) ?? []).length;
/** How many words the text holds: its blocks of words and its footnotes. */
export function wordCount(doc: Doc): number {
  let n = 0;
  for (const b of doc.blocks) n += blockWords(b);
  return n;
}
/** Each block's words, counted once: an edit makes new blocks only where it touched, so a keystroke counts one block. */
const counted = new WeakMap<Block, number>();
function blockWords(b: Block): number {
  let n = counted.get(b);
  if (n === undefined) {
    n = isText(b) ? count(plainText(b.runs)) : 0;
    for (const fn of notesOf([b])) n += count(plainText(noteRuns(fn)));
    counted.set(b, n);
  }
  return n;
}

/** A table block as the sheet's renderer and the grid see it: its columns, the values worked out in place. */
export function tableView(doc: Doc, at: number): SheetView | null {
  const table = tableAt(doc, at);
  if (!table) return null;
  const ev = evaluateTable(table);
  const used = usedSize(table);
  return {
    at,
    table,
    cols: table.cols,
    values: ev.values.map((row) => table.cols.map((_, c) => row[c] ?? null)),
    named: ev.named,
    // Every named column is drawn, filled or not.
    used: { rows: used.rows, cols: Math.max(used.cols, table.cols.length) },
    big: null,
    // Money in the head's currency, for the columns that name none.
    ...(doc.head.currency ? { currency: doc.head.currency } : {}),
  };
}

/** A new table to type into: three columns that go by their letters, no rows yet. */
export const blankTable = (): TableBlock => ({ k: 'table', cols: [0, 1, 2].map((c) => ({ name: letterName(c), type: 'text' })), rows: [] });

/** One cell of the table at `at` typed into: the table given the rows it needs, trailing blank rows never kept. A locked cell is left as it is (the op's own rule). */
export function setCellAt(doc: Doc, at: number, r: number, c: number, raw: string): Op[] {
  const t = tableAt(doc, at);
  if (!t) return [];
  if ((t.rows[r]?.[c] ?? '') === raw) return [];
  if (raw === '' && r >= t.rows.length) return [];
  const ops = putCells(doc, at, r, c, [[raw]]);
  const after = tableAt(applyAll(doc, ops), at)!;
  let n = after.rows.length;
  while (n > 0 && after.rows[n - 1].every((v) => v === '')) n--;
  if (n < after.rows.length) ops.push({ op: 'rows', at, r: n, n: after.rows.length - n });
  return ops;
}

/**
 * One of the sheet's commands (sheet/model.ts) on the table at `at`: they work on a document's first table, so
 * they are given a document of that block alone and their ops are moved to where it stands.
 */
function onTable(doc: Doc, at: number, f: (one: Doc) => Op[] | null): Op[] {
  const b = doc.blocks[at];
  if (b?.k !== 'table') return [];
  return (f({ head: {}, blocks: [b] }) ?? []).flatMap((op) => (op.op === 'head' ? [] : [{ ...op, at: op.at + at } as Op]));
}
/** `n` blank rows put in before row r of the table at `at` (inside a sum's reach, the sum takes them in). */
export const tableRowsIn = (doc: Doc, at: number, r: number, n = 1): Op[] => onTable(doc, at, (one) => insertRows(one, r, n));
/** Rows r0 to r1 of the table at `at` taken out. */
export const tableRowsOut = (doc: Doc, at: number, r0: number, r1: number): Op[] => onTable(doc, at, (one) => deleteRows(one, r0, r1));
/** A column put in before column c of the table at `at` (after the last when c is its width); nothing past Z. */
export const tableColIn = (doc: Doc, at: number, c: number): Op[] => onTable(doc, at, (one) => addColumn(one, c));
/** A rectangle of cells written into the table at `at` (a paste, a fill, a clear), the columns it needs added, trailing blank rows never kept. */
export const tablePut = (doc: Doc, at: number, cells: Cells): Op[] => onTable(doc, at, (one) => putRect(one, cells));
/** Column c of the table at `at` named; '' gives it its letter back. */
export const tableRename = (doc: Doc, at: number, c: number, name: string): Op[] => onTable(doc, at, (one) => rename(one, c, name));
/** What column c of the table at `at` holds; a money column may name its currency ('' or none: the head's `currency:`). */
export const tableSetType = (doc: Doc, at: number, c: number, type: ColType, currency?: string): Op[] => onTable(doc, at, (one) => setType(one, c, type, currency));
/** Column c of the table at `at` taken out with what it holds (a table keeps one); the columns that go by a letter take their new one. */
export function tableColOut(doc: Doc, at: number, c: number): Op[] {
  const t = tableAt(doc, at);
  if (!t || t.cols.length < 2 || c >= t.cols.length) return [];
  const ops: Op[] = [{ op: 'cols', at, c, n: 1 }];
  t.cols
    .filter((_, i) => i !== c)
    .forEach((col, i) => {
      if (isLetterName(col.name) && col.name !== letterName(i)) ops.push({ op: 'col', at, c: i, col: { ...col, name: letterName(i) } });
    });
  return ops;
}
/** Whether the table at `at` can take another column. */
export const roomForColumn = (doc: Doc, at: number): boolean => (tableAt(doc, at)?.cols.length ?? MAX_COLS) < MAX_COLS;

/* ---------- a card in hand: a table, a picture, another document, a thing from the web ---------- */

/** The block at `at` moved past its neighbour (up by -1, down by 1); null at either end. */
export function moveBlock(doc: Doc, at: number, by: 1 | -1): Op[] | null {
  const to = at + by;
  if (!doc.blocks[at] || to < 0 || to >= doc.blocks.length) return null;
  return [{ op: 'move', at, n: 1, to }];
}
/** A copy of the block at `at` put in after it. */
export const duplicateBlock = (doc: Doc, at: number): Op[] => (doc.blocks[at] ? [{ op: 'splice', at: at + 1, n: 0, blocks: [structuredClone(doc.blocks[at])] }] : []);
/** The block at `at` taken out. */
export const removeBlock = (doc: Doc, at: number): Op[] => (doc.blocks[at] ? [{ op: 'splice', at, n: 1, blocks: [] }] : []);
/** Blocks put in after the block at `at` (a paste onto a card in hand). */
export const putAfter = (at: number, blocks: Block[]): Op[] => (blocks.length ? [{ op: 'splice', at: at + 1, n: 0, blocks }] : []);

/** The words of another document held in a fence: its head's title, else its first heading's words, else its first words. */
export function fenceTitle(body: string): string {
  const d = parse(body);
  if (d.head.title) return d.head.title;
  const h = d.blocks.find((b) => b.k === 'h') ?? d.blocks.find((b) => isText(b) && b.runs.length);
  return h && isText(h) ? plainText(h.runs).trim() : '';
}
