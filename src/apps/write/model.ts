/**
 * Write's reading of a document, with no DOM in it: the paper it prints on, its name, its own head fields
 * (an invoice's from and to), the word count, a table block as the sheet's renderer and the inline grid
 * see it, and the few commands that are not the editor's own (a cell typed into, a row put in). The view
 * Write draws is the Doc itself (docs/kernel.md §3); nothing is kept but the document.
 */
import { apply, applyAll, evaluateTable, hasClass, isEmbed, isText, notesOf, noteRuns, parse, plainText, putCells, tableAt, usedSize, write, type Block, type Doc, type Op, type TableBlock } from '../../doc/index.ts';
import type { SheetView } from '../sheet/model.ts';
import { letterName } from '../sheet/model.ts';

/** The paper a text prints on: its size in px (96 to the inch) and its margin, an inch or 25 mm. */
export const PAPERS = { letter: { name: 'Letter', w: 816, h: 1056, m: 96 }, a4: { name: 'A4', w: 794, h: 1123, m: 94 } } as const;
export type Paper = keyof typeof PAPERS;
/** The paper where the reader is: letter in North America, A4 nearly everywhere else (and where there is no reader: a program). */
export const defaultPaper = (): Paper => (typeof navigator === 'undefined' || /-(US|CA|MX|PR|PH|CL|CO|VE|GT|CR|PA|DO)$/i.test(navigator.language) ? 'letter' : 'a4');
/** The paper the text says, in its header ("paper: a4"), or the reader's. */
export const paperOf = (doc: Doc): Paper => (doc.head.paper && doc.head.paper in PAPERS ? (doc.head.paper as Paper) : defaultPaper());

/** The head's fields that are the shell's or Write's own, not the document's (an invoice's from, to, number…). */
export const SHELL_KEYS = new Set(['title', 'by', 'created', 'key', 'sig', 'app', 'paper']);
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
/** How many words the text holds: its blocks of words (a web address alone is not words) and its footnotes. */
export function wordCount(doc: Doc): number {
  let n = 0;
  for (const b of doc.blocks) if (isText(b) && !isEmbed(b)) n += count(plainText(b.runs));
  for (const fn of notesOf(doc.blocks)) n += count(plainText(noteRuns(fn)));
  return n;
}

/** Money as the sheet formats it ("$1,200.00"), with the head's currency in place of the dollar when it names one. */
export const money = (s: string, currency: string | undefined): string => (currency && currency !== '$' ? s.replace(/^(-?)\$/, `$1${currency}`) : s);

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

/** A blank row put in after row r of the table at `at`: a line added inside a sum's reach, so the sum takes it in. */
export const insertRowAfter = (at: number, r: number): Op[] => [{ op: 'rows', at, r: r + 1, n: 1, rows: [[]] }];

/** The words of another document held in a fence: its head's title, else its first heading's words, else its first words. */
export function fenceTitle(body: string): string {
  const d = parse(body);
  if (d.head.title) return d.head.title;
  const h = d.blocks.find((b) => b.k === 'h') ?? d.blocks.find((b) => isText(b) && b.runs.length);
  return h && isText(h) ? plainText(h.runs).trim() : '';
}

/** A paragraph that is one web address: a thing from the web. */
export const webBlock = (url: string): Block => ({ k: 'p', runs: [{ t: url.trim() }] });
