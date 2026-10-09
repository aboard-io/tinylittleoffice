/**
 * Board's document, read and edited (docs/kernel.md §3). The stages are headings, each with the most cards it
 * should hold (`limit`) and a colour; a card is a list item of rich text; a card's checklist is the task items
 * one level in under it:
 *
 *   ## Doing {limit=2 color=g}
 *
 *   - Write the **spec**
 *     - [x] Outline
 *     - [ ] Draft
 *   - Review the copy
 *
 * `readBoard` is the view, a pure function of the document, each stage and card knowing the span of blocks it
 * holds; every command gives operations (`Op[]`) for the editor to apply. Nothing here touches the DOM.
 */
import { attr, plainText, type Attrs, type Block, type Doc, type Op, type Run } from '../../doc/index.ts';
import { t } from '../../kit/i18n.ts';

type Li = Extract<Block, { k: 'li' }>;

export interface Item {
  at: number;
  block: Li;
  done: boolean;
  words: string;
}
export interface Card {
  /** The card's block index, and the end of its span (its checklist follows it). */
  at: number;
  end: number;
  block: Li;
  words: string;
  items: Item[];
}
export interface Stage {
  /** The heading's block index; -1 for cards that come before any heading (the span then starts at the top). */
  at: number;
  /** The span: from the heading (or the top) to the next heading. */
  start: number;
  end: number;
  block?: Extract<Block, { k: 'h' }>;
  name: string;
  /** The most cards it should hold, 0 for no limit. */
  limit: number;
  /** A key of STAGE_COLORS, or ''. */
  color: string;
  cards: Card[];
}
export interface BoardView {
  stages: Stage[];
  cards: number;
}

/** The colours a stage may take, by the letter a document carries (the kit's palette without black). */
export const STAGE_COLORS: Record<string, { name: () => string; hex: string }> = {
  b: { name: () => t('Blue'), hex: '#0072b2' },
  s: { name: () => t('Sky'), hex: '#56b4e9' },
  g: { name: () => t('Green'), hex: '#009e73' },
  y: { name: () => t('Yellow'), hex: '#e8b400' },
  o: { name: () => t('Orange'), hex: '#d55e00' },
  r: { name: () => t('Red'), hex: '#b3261e' },
  p: { name: () => t('Purple'), hex: '#a05ca8' },
};
export const LIMITS = [0, 1, 2, 3, 5, 8];

const limitOf = (v: string | undefined) => Math.max(0, parseInt(v ?? '', 10) || 0);
const colorOf = (v: string | undefined) => (v && v in STAGE_COLORS ? v : '');
const oneLine = (s: string) => s.replace(/\n/g, ' ');

/** The stages of a document with their cards; nothing in the document is nothing on the board. */
export function readBoard(doc: Doc): BoardView {
  const stages: Stage[] = [];
  let cards = 0;
  // Cards that come before any heading are in a stage of their own, named for the first of the usual three.
  const open = (i: number): Stage => {
    if (!stages.length) stages.push({ at: -1, start: 0, end: 0, name: t('To do'), limit: 0, color: '', cards: [] });
    stages[stages.length - 1].end = i + 1;
    return stages[stages.length - 1];
  };
  doc.blocks.forEach((b, i) => {
    if (b.k === 'h') {
      stages.push({ at: i, start: i, end: i + 1, block: b, name: oneLine(plainText(b.runs)), limit: limitOf(attr(b, 'limit')), color: colorOf(attr(b, 'color')), cards: [] });
    } else if (b.k === 'li') {
      const s = open(i);
      const last = s.cards.at(-1);
      // A task under a card is one of its checklist; any other item is a card of its own.
      if (last && b.depth > 0 && b.done !== undefined) {
        last.items.push({ at: i, block: b, done: b.done, words: oneLine(plainText(b.runs)) });
        last.end = i + 1;
      } else {
        s.cards.push({ at: i, end: i + 1, block: b, words: oneLine(plainText(b.runs)), items: [] });
        cards++;
      }
    } else if (stages.length) {
      // Anything else under a stage moves with it.
      stages[stages.length - 1].end = i + 1;
    }
  });
  return { stages, cards };
}

/** How much of a card's checklist is done, as "2/5"; '' without one. */
export const progress = (c: Card) => (c.items.length ? `${c.items.filter((i) => i.done).length}/${c.items.length}` : '');

/** Attributes with the limit and the colour set as asked, every other class and key kept; none left, none written. */
function attrsWith(a: Attrs | undefined, limit: number, color: string): Attrs | undefined {
  const kv = { ...a?.kv };
  if (limit > 0) kv.limit = String(Math.round(limit));
  else delete kv.limit;
  if (color) kv.color = color;
  else delete kv.color;
  const out: Attrs = { ...(a?.id ? { id: a.id } : {}), ...(a?.cls?.length ? { cls: a.cls } : {}), ...(Object.keys(kv).length ? { kv } : {}) };
  return Object.keys(out).length ? out : undefined;
}
const heading = (runs: Run[], a?: Attrs): Block => ({ k: 'h', level: 2, runs, ...(a ? { a } : {}) });

/* ---------- stages ---------- */

/** A stage's limit and colour set. A stage without a heading (cards at the top) gets one. */
export function setStage(s: Stage, patch: { limit?: number; color?: string }): Op[] {
  const limit = patch.limit ?? s.limit;
  const color = patch.color ?? s.color;
  if (!s.block) return [{ op: 'splice', at: 0, n: 0, blocks: [heading([{ t: s.name }], attrsWith(undefined, limit, color))] }];
  if (limit === s.limit && color === s.color) return [];
  const { a: _, ...rest } = s.block;
  const a = attrsWith(s.block.a, limit, color);
  return [{ op: 'splice', at: s.at, n: 1, blocks: [{ ...rest, ...(a ? { a } : {}) }] }];
}
/** A new stage at the end, named; its heading's block index is the document's length. */
export const addStage = (doc: Doc, name: string): Op[] => [{ op: 'splice', at: doc.blocks.length, n: 0, blocks: [heading(name ? [{ t: name }] : [])] }];
/** A stage and everything in it taken out. */
export const removeStage = (s: Stage): Op[] => [{ op: 'splice', at: s.start, n: s.end - s.start, blocks: [] }];
/** A stage moved past its neighbour, cards and all. */
export function moveStage(v: BoardView, i: number, by: -1 | 1): Op[] {
  const s = v.stages[i];
  const over = v.stages[i + by];
  if (!s || !over) return [];
  return [{ op: 'move', at: s.start, n: s.end - s.start, to: by < 0 ? over.start : over.end - (s.end - s.start) }];
}

/* ---------- cards ---------- */

/** An empty card after card `c` and its checklist, or at the end of the stage's cards. Its block index is returned too. */
export function addCard(s: Stage, c?: Card): { ops: Op[]; at: number } {
  const at = c ? c.end : (s.cards.at(-1)?.end ?? s.start + 1);
  return { ops: [{ op: 'splice', at, n: 0, blocks: [{ k: 'li', depth: 0, runs: [] }] }], at };
}
/** A card and its checklist taken out. */
export const removeCard = (c: Card): Op[] => [{ op: 'splice', at: c.at, n: c.end - c.at, blocks: [] }];
/**
 * Card `c` (with its checklist) put into stage `to` before its `pos`th card (`pos` counts the cards as drawn, the
 * moved one among them). Nothing to do when it would land where it is. `at` is where its block ends up.
 */
export function moveCard(c: Card, to: Stage, pos: number): { ops: Op[]; at: number } | null {
  const n = c.end - c.at;
  const dest = pos < to.cards.length ? to.cards[pos].at : (to.cards.at(-1)?.end ?? to.start + 1);
  if (dest >= c.at && dest <= c.end) return null;
  const target = dest > c.end ? dest - n : dest;
  return { ops: [{ op: 'move', at: c.at, n, to: target }], at: target };
}

/* ---------- the checklist ---------- */

/** An empty task after item `k` of card `c` (or first when -1; the end when `k` is omitted). */
export function addItem(c: Card, k: number = c.items.length - 1): { ops: Op[]; at: number } {
  const at = k < 0 ? c.at + 1 : c.items[k].at + 1;
  return { ops: [{ op: 'splice', at, n: 0, blocks: [{ k: 'li', depth: 1, done: false, runs: [] }] }], at };
}
export const setItemDone = (i: Item, done: boolean): Op[] => (i.done === done ? [] : [{ op: 'splice', at: i.at, n: 1, blocks: [{ ...i.block, done }] }]);
export const removeItem = (i: Item): Op[] => [{ op: 'splice', at: i.at, n: 1, blocks: [] }];

/** Operations from an editor over one block, moved to where that block is in the document. */
export function shifted(ops: Op[], by: number): Op[] {
  return ops.map((o) => (o.op === 'head' ? o : o.op === 'move' ? { ...o, at: o.at + by, to: o.to + by } : { ...o, at: o.at + by }));
}
