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
 * Every stage has a colour: the one written, else the palette's by its place (`hue`). `look: rows` in the head
 * draws the stages as bands one under another, their cards flowing across; columns, the default, is not written.
 *
 * `readBoard` is the view, a pure function of the document, each stage and card knowing the span of blocks it
 * holds; every command gives operations (`Op[]`) for the editor to apply. Nothing here touches the DOM.
 */
import { attr, isText, joinBlocks, plainText, runLength, sliceRuns, type Attrs, type Block, type Doc, type Op, type Run } from '../../doc/index.ts';
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
  /** A key of STAGE_COLORS as written, or '' for none written. */
  color: string;
  /** The colour it is drawn in: the one written, else the palette's by its place (AUTO). */
  hue: string;
  cards: Card[];
}
export interface BoardView {
  stages: Stage[];
  cards: number;
  /** `look: rows` in the head: the stages drawn as bands one under another, their cards flowing across. */
  rows: boolean;
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
/** The colours stages take by their place when none is written: the order a chart's series takes them (draw.ts SERIES). */
export const AUTO = ['b', 'o', 'g', 'p', 's', 'y', 'r'];
/**
 * How much of a stage's colour its edges and its heading's tint keep, the rest the page's ink (style.css mixes it
 * so, in sRGB): toward the dark ink in the light theme, the light ink in the dark, so every colour reads at 3:1 on
 * the page's surfaces in both (model.unit.test.ts checks it against tokens.css).
 */
export const EDGE_MIX = 70;
export const LIMITS = [0, 1, 2, 3, 5, 8];

const limitOf = (v: string | undefined) => Math.max(0, parseInt(v ?? '', 10) || 0);
const colorOf = (v: string | undefined) => (v && v in STAGE_COLORS ? v : '');
const oneLine = (s: string) => s.replace(/\n/g, ' ');
const rowsOf = (doc: Doc) => (doc.head.look ?? '').trim().toLowerCase() === 'rows';
/** A stage's colour as drawn: the one written, else the palette's by its place. */
const hueOf = (color: string, i: number) => color || autoHue(i);
/** The palette's colour for the `i`th stage. */
export const autoHue = (i: number) => AUTO[i % AUTO.length];

/** The stages of a document with their cards; nothing in the document is nothing on the board. */
export function readBoard(doc: Doc): BoardView {
  const stages: Stage[] = [];
  let cards = 0;
  // Cards that come before any heading are in a stage of their own, named for the first of the usual three.
  const open = (i: number): Stage => {
    if (!stages.length) stages.push({ at: -1, start: 0, end: 0, name: t('To do'), limit: 0, color: '', hue: hueOf('', 0), cards: [] });
    stages[stages.length - 1].end = i + 1;
    return stages[stages.length - 1];
  };
  doc.blocks.forEach((b, i) => {
    if (b.k === 'h') {
      const color = colorOf(attr(b, 'color'));
      stages.push({ at: i, start: i, end: i + 1, block: b, name: oneLine(plainText(b.runs)), limit: limitOf(attr(b, 'limit')), color, hue: hueOf(color, stages.length), cards: [] });
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
  return { stages, cards, rows: rowsOf(doc) };
}

/** The stages as rows (`look: rows`) or as columns, the default, which is not written. */
export const setLook = (doc: Doc, rows: boolean): Op[] => (rowsOf(doc) === rows ? [] : [{ op: 'head', key: 'look', value: rows ? 'rows' : undefined }]);

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

/** The cards of a span of blocks (a run of chosen cards), in order. */
export const cardsIn = (v: BoardView, from: number, to: number): Card[] => v.stages.flatMap((s) => s.cards).filter((c) => c.at >= from && c.at < to);
/** A card's blocks: its words and its checklist. */
export const blocksOf = (c: Card): Block[] => [c.block, ...c.items.map((i) => i.block)];
/** Cards taken out, each with its checklist (the headings between them stay). */
export const removeCards = (cards: Card[]): Op[] => [...cards].sort((a, b) => b.at - a.at).map((c) => ({ op: 'splice', at: c.at, n: c.end - c.at, blocks: [] }));
/** The stage holding all of these cards, or undefined when they are spread over several. */
export function stageOf(v: BoardView, cards: Card[]): Stage | undefined {
  const s = v.stages.find((x) => cards.length > 0 && cards.every((c) => x.cards.includes(c)));
  return s;
}
/**
 * A run of cards side by side in one stage moved past the card before (-1) or after (1) it, checklists and all.
 * `at` is where the first of them lands. Null at the stage's edge, or when the cards are not one run in one stage.
 */
export function moveCards(v: BoardView, cards: Card[], by: -1 | 1): { ops: Op[]; at: number } | null {
  const s = stageOf(v, cards);
  if (!s) return null;
  const i = s.cards.indexOf(cards[0]);
  const j = s.cards.indexOf(cards[cards.length - 1]);
  if (j - i !== cards.length - 1) return null;
  const past = s.cards[by < 0 ? i - 1 : j + 1];
  if (!past) return null;
  const from = cards[0].at;
  const n = cards[cards.length - 1].end - from;
  const to = by < 0 ? past.at : from + (past.end - past.at);
  return { ops: [{ op: 'move', at: from, n, to }], at: to };
}
/** A run of cards in one stage carried to the end of stage `to`; `at` is where the first lands. Null when nothing would move. */
export function carryCards(v: BoardView, cards: Card[], to: Stage): { ops: Op[]; at: number } | null {
  const s = stageOf(v, cards);
  if (!s || s === to) return null;
  const from = cards[0].at;
  const end = cards[cards.length - 1].end;
  const n = end - from;
  const dest = to.cards.at(-1)?.end ?? to.start + 1;
  const target = dest > end ? dest - n : dest;
  return { ops: [{ op: 'move', at: from, n, to: target }], at: target };
}
/** Card `c` again right after it, checklist and all; `at` is the copy's block index. */
export function duplicateCard(c: Card): { ops: Op[]; at: number } {
  return { ops: [{ op: 'splice', at: c.end, n: 0, blocks: blocksOf(c) }], at: c.end };
}
/** Cards again, each stage's run of them right after itself; `at` is the first copy's index when they are one run. */
export function duplicateCards(v: BoardView, cards: Card[]): { ops: Op[]; at: number } {
  const ops: Op[] = [];
  let first = -1;
  for (const s of [...v.stages].reverse()) {
    const mine = s.cards.filter((c) => cards.includes(c));
    if (!mine.length) continue;
    const end = mine[mine.length - 1].end;
    ops.push({ op: 'splice', at: end, n: 0, blocks: mine.flatMap(blocksOf) });
    first = end;
  }
  return { ops, at: first };
}
/**
 * Pasted blocks made cards: an item at the margin, a paragraph or a heading is a card; a task further in is an item of
 * the card before it (a card if there is none); what holds no words is left out.
 */
export function asCards(blocks: Block[]): Li[] {
  const out: Li[] = [];
  for (const b of blocks) {
    if (!isText(b)) continue;
    const task = b.k === 'li' && b.depth > 0 && b.done !== undefined && out.length > 0;
    if (task) out.push({ k: 'li', depth: 1, done: !!b.done, runs: b.runs });
    else if (b.k === 'li' && b.depth === 0 && b.done === undefined) out.push(b);
    else if (b.k === 'li') out.push({ k: 'li', depth: 0, runs: b.runs });
    else out.push(...linesOf(b.runs).map((runs): Li => ({ k: 'li', depth: 0, runs })));
  }
  return out;
}
/** Pasted blocks made checklist items, a paragraph's lines an item each. */
export const asItems = (blocks: Block[]): Li[] =>
  blocks.filter(isText).flatMap((b) => (b.k === 'li' ? [b.runs] : linesOf(b.runs)).map((runs): Li => ({ k: 'li', depth: 1, done: b.k === 'li' && !!b.done, runs })));
/** A paragraph's words cut at its line breaks, the empty lines left out: pasted lines are a card each. */
function linesOf(runs: Run[]): Run[][] {
  const lines: Run[][] = [[]];
  for (const r of runs) {
    if (r.ic || r.fn !== undefined || !r.t.includes('\n')) {
      lines[lines.length - 1].push(r);
      continue;
    }
    r.t.split('\n').forEach((part, i) => {
      if (i) lines.push([]);
      if (part) lines[lines.length - 1].push({ ...r, t: part });
    });
  }
  return lines.filter((l) => l.some((r) => r.ic || r.fn !== undefined || r.t.trim()));
}
/* ---------- the words of a line ---------- */

/**
 * Enter in card `c` with the caret at `offset`: at the start of words, an empty card above it (the caret stays with the
 * words); elsewhere the words after the caret are a new card after this one's checklist. `at` is the card the caret goes to.
 */
export function splitCard(c: Card, offset: number): { ops: Op[]; at: number } {
  const len = runLength(c.block.runs);
  if (offset <= 0 && len > 0) return { ops: [{ op: 'splice', at: c.at, n: 0, blocks: [{ k: 'li', depth: 0, runs: [] }] }], at: c.at + 1 };
  const right = sliceRuns(c.block.runs, offset, len);
  const ops: Op[] = [];
  if (right.length) ops.push({ op: 'splice', at: c.at, n: 1, blocks: [{ ...c.block, runs: sliceRuns(c.block.runs, 0, offset) }] });
  ops.push({ op: 'splice', at: c.end, n: 0, blocks: [{ k: 'li', depth: 0, runs: right }] });
  return { ops, at: c.end };
}
/** Enter in item `i` at `offset`: at the start of words, an empty item above; else split there, the new item ticked off. */
export function splitItem(i: Item, offset: number): { ops: Op[]; at: number } {
  const len = runLength(i.block.runs);
  if (offset <= 0 && len > 0) return { ops: [{ op: 'splice', at: i.at, n: 0, blocks: [{ k: 'li', depth: 1, done: false, runs: [] }] }], at: i.at + 1 };
  return {
    ops: [
      {
        op: 'splice',
        at: i.at,
        n: 1,
        blocks: [
          { ...i.block, runs: sliceRuns(i.block.runs, 0, offset) },
          { k: 'li', depth: 1, done: false, runs: sliceRuns(i.block.runs, offset, len) },
        ],
      },
    ],
    at: i.at + 1,
  };
}
/**
 * The line at `at` (a card or an item) joined onto the line before it (a card or an item), as Backspace at its start does;
 * a card's checklist then follows the line it joined. Nothing when the line before is a heading or none.
 */
export function joinLine(doc: Doc, at: number): Op[] {
  const prev = doc.blocks[at - 1];
  return prev?.k === 'li' && doc.blocks[at]?.k === 'li' ? joinBlocks(doc, at) : [];
}

/* ---------- the checklist ---------- */

/** An empty task after item `k` of card `c` (or first when -1; the end when `k` is omitted). */
export function addItem(c: Card, k: number = c.items.length - 1): { ops: Op[]; at: number } {
  const at = k < 0 ? c.at + 1 : c.items[k].at + 1;
  return { ops: [{ op: 'splice', at, n: 0, blocks: [{ k: 'li', depth: 1, done: false, runs: [] }] }], at };
}
export const setItemDone = (i: Item, done: boolean): Op[] => (i.done === done ? [] : [{ op: 'splice', at: i.at, n: 1, blocks: [{ ...i.block, done }] }]);
export const removeItem = (i: Item): Op[] => [{ op: 'splice', at: i.at, n: 1, blocks: [] }];
/** Item `k` of card `c` past its neighbour; null at either end of the checklist. */
export function moveItem(c: Card, k: number, by: -1 | 1): { ops: Op[]; at: number } | null {
  const i = c.items[k];
  if (!i || !c.items[k + by]) return null;
  return { ops: [{ op: 'move', at: i.at, n: 1, to: i.at + by }], at: i.at + by };
}

/** Operations from an editor over one block, moved to where that block is in the document. */
export function shifted(ops: Op[], by: number): Op[] {
  return ops.map((o) => (o.op === 'head' ? o : o.op === 'move' ? { ...o, at: o.at + by, to: o.to + by } : { ...o, at: o.at + by }));
}
