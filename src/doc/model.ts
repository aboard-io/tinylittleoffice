/**
 * The document kernel's one model: a header of key: value fields and a
 * list of blocks. Every app draws a view of this and edits it with the
 * operations in ops.ts; TLO (tlo.ts) is its one serialisation. Text sits
 * in blocks as runs (words with their marks), a table as typed columns and
 * raw cells, and anything else as what it is: a rule, an edge, an image,
 * a fence holding another document.
 */
import { parseInline } from './tlo.ts';

/** The header: lowercase keys, string values (title, by, created, key, sig; an app's own settings). */
export type Head = Record<string, string>;

export interface Doc {
  head: Head;
  blocks: Block[];
}

/** What any block may end with: "{#id .cls key=value}". */
export interface Attrs {
  id?: string;
  cls?: string[];
  kv?: Record<string, string>;
}

export type Dir = '->' | '<-' | '<->' | '--';

export type Block =
  | { k: 'h'; level: 1 | 2 | 3 | 4 | 5 | 6; runs: Run[]; a?: Attrs }
  | { k: 'p'; runs: Run[]; a?: Attrs } // its lines stay lines: '\n' inside a run's t
  | { k: 'li'; depth: number; ord?: true; done?: boolean; runs: Run[]; a?: Attrs }
  | { k: 'quote'; runs: Run[]; a?: Attrs } // a note: a speaker's note, a page's aside, a site's button
  | { k: 'hr'; a?: Attrs } // a break: the next slide, page or card
  | { k: 'table'; cols: Column[]; rows: string[][]; a?: Attrs } // cells are raw strings: formulas, numbers, words
  | { k: 'fence'; lang: string; body: string; a?: Attrs } // lang names an app: another document; else text kept as written
  | { k: 'edge'; from: string; to: string; dir: Dir; label?: string; a?: Attrs }
  | { k: 'img'; alt: string; url: string; a?: Attrs };

/** The four kinds that hold words: h, p, li, quote. */
export type TextBlock = Extract<Block, { runs: Run[] }>;
export type TableBlock = Extract<Block, { k: 'table' }>;
export type FenceBlock = Extract<Block, { k: 'fence' }>;

/** Words with their marks. An icon or a footnote is a run of its own with no words (atomic: it counts as one character). */
export interface Run {
  t: string;
  b?: true;
  i?: true;
  u?: true;
  s?: true;
  /** Highlighted. */
  h?: true;
  /** Where these words link. */
  href?: string;
  /** An icon in the line, by name. */
  ic?: string;
  /** A footnote: the note's words as inline Markdown. */
  fn?: string;
}

export type ColType = 'text' | 'number' | 'money' | 'percent' | 'date' | 'time' | 'check' | 'url' | 'rich' | 'long' | 'icon' | 'name';
export interface Column {
  name: string;
  type: ColType;
}

/** The words alone, marks and all taken away. */
export const plainText = (runs: Run[]): string => runs.map((r) => r.t).join('');

/** The one way a string of inline Markdown becomes runs. */
export const text = (s: string): Run[] => parseInline(s);

/** Whether a block holds words. */
export const isText = (b: Block): b is TextBlock => b.k === 'h' || b.k === 'p' || b.k === 'li' || b.k === 'quote';

/** A run with no words of its own: an icon or a footnote mark. It counts as one character. */
export const isAtomic = (r: Run): boolean => !!r.ic || r.fn !== undefined;

/** Whether two runs carry the same marks, so their words may sit in one run. Atomic runs never merge. */
export const sameMarks = (a: Run, b: Run): boolean => !isAtomic(a) && !isAtomic(b) && a.b === b.b && a.i === b.i && a.u === b.u && a.s === b.s && a.h === b.h && a.href === b.href;

/** Runs as the parser would give them: no empty run of words, and no two neighbours with the same marks. */
export function normalRuns(runs: Run[]): Run[] {
  const out: Run[] = [];
  for (const r of runs) {
    if (!r.t && !isAtomic(r)) continue;
    const last = out[out.length - 1];
    if (last && sameMarks(last, r)) out[out.length - 1] = { ...last, t: last.t + r.t };
    else out.push(r);
  }
  return out;
}

/** A document with nothing in it. */
export const blankDoc = (): Doc => ({ head: {}, blocks: [] });

export const hasClass = (b: { a?: Attrs }, c: string): boolean => !!b.a?.cls?.includes(c);
export const attr = (b: { a?: Attrs }, k: string): string | undefined => b.a?.kv?.[k];

/**
 * Whether a block is a thing held in this document from elsewhere: another
 * document in a fence named for its app, a picture, or a paragraph that is
 * one web address and nothing else (a video, a post, a place; which one is
 * the view's to say).
 */
export const isEmbed = (b: Block): boolean => (b.k === 'fence' && !!b.lang) || b.k === 'img' || (b.k === 'p' && b.runs.length === 1 && !isAtomic(b.runs[0]) && /^https?:\/\/\S+$/.test(b.runs[0].t.trim()));

/** The blocks between rules: a deck's slides, a booklet's pages. */
export function pages(blocks: Block[]): Block[][] {
  const out: Block[][] = [[]];
  for (const b of blocks) b.k === 'hr' ? out.push([]) : out[out.length - 1].push(b);
  return out;
}

/** The blocks under each heading of a level: [heading, or null for what comes before, blocks]. */
export function sections(blocks: Block[], level: number): [Extract<Block, { k: 'h' }> | null, Block[]][] {
  const out: [Extract<Block, { k: 'h' }> | null, Block[]][] = [[null, []]];
  for (const b of blocks) b.k === 'h' && b.level <= level ? out.push([b, []]) : out[out.length - 1][1].push(b);
  return out[0][1].length ? out : out.slice(1);
}
