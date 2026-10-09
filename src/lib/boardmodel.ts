/**
 * Board (kanban) document model: the stages of a workflow, each holding
 * cards. The board is TLO (lib/tlo.ts): a heading for each stage, its limit
 * (the most cards it should hold at once) and its colour attributes, and
 * its cards a list under it; a card's checklist is the task list under it.
 *
 *   ## Doing {limit=2 color=g}
 *
 *   - Write the **spec**
 *     - [x] Outline
 *     - [ ] Draft
 *   - Review the copy
 */
import { parse, write, attr, columnsOf, type Block } from './tlo.ts';
import { PALETTE } from './palette.ts';

export interface Item {
  text: string;
  done: boolean;
}
export interface Card {
  /** One line of inline Markdown. */
  text: string;
  items: Item[];
}
export interface Stage {
  name: string;
  /** Work-in-progress limit, 0 for none. */
  limit: number;
  /** A palette letter, or '' for none. */
  color: string;
  cards: Card[];
}

const DEFAULT_STAGES = ['To do', 'Doing', 'Done'];
export const MAX_STAGES = 8;
/** The colours a stage may take: the palette, less black. */
export const STAGE_COLORS: Record<string, { name: string; hex: string }> = Object.fromEntries(Object.entries(PALETTE).filter(([k]) => k !== 'k'));

export const card = (text: string, items: Item[] = []): Card => ({ text, items });
const stage = (name: string, limit = 0, color = ''): Stage => ({ name, limit, color, cards: [] });

export function emptyBoard(): Stage[] {
  return DEFAULT_STAGES.map((name) => stage(name));
}

const limitOf = (v: string | undefined) => Math.max(0, parseInt(v ?? '', 10) || 0);
const colorOf = (v: string | undefined) => (v && v in STAGE_COLORS ? v : '');
const oneLine = (t: string) => t.replace(/\n/g, ' ');

export function parseBoard(text: string): Stage[] {
  const stages: Stage[] = [];
  for (const b of parse(text).blocks) {
    if (b.k === 'h') stages.push(stage(b.text, limitOf(attr(b, 'limit')), colorOf(attr(b, 'color'))));
    else if (b.k === 'li') {
      if (!stages.length) stages.push(stage(DEFAULT_STAGES[0]));
      const cards = stages[stages.length - 1].cards;
      // A task under a card is one of its checklist; any other line is a card of its own.
      if (b.depth > 0 && b.done !== undefined && cards.length) cards[cards.length - 1].items.push({ text: oneLine(b.text), done: b.done });
      else cards.push(card(oneLine(b.text)));
    }
  }
  return stages.length ? stages : emptyBoard();
}

export function serializeBoard(stages: Stage[]): string {
  // An untouched board costs nothing.
  if (stages.length === DEFAULT_STAGES.length && stages.every((s, i) => s.name === DEFAULT_STAGES[i] && !s.limit && !s.color && !s.cards.length)) return '';
  const blocks: Block[] = [];
  for (const s of stages) {
    const kv = { ...(s.limit > 0 ? { limit: String(Math.round(s.limit)) } : {}), ...(s.color ? { color: s.color } : {}) };
    blocks.push({ k: 'h', level: 2, text: oneLine(s.name), ...(Object.keys(kv).length ? { a: { kv } } : {}) });
    for (const c of s.cards) {
      if (!c.text.trim() && !c.items.length) continue;
      blocks.push({ k: 'li', depth: 0, text: oneLine(c.text) });
      for (const it of c.items) blocks.push({ k: 'li', depth: 1, done: it.done, text: oneLine(it.text) });
    }
  }
  return write({ head: {}, blocks }).trimEnd();
}

/** How much of a card's checklist is done, as "2/5"; '' without one. */
export const progress = (c: Card) => (c.items.length ? `${c.items.filter((i) => i.done).length}/${c.items.length}` : '');

/**
 * A board as a person or a model writes it, made canonical: headings of
 * any level for the stages, a limit written "(limit 2)" after one, lines
 * of words as cards (a task list under a card its checklist), and a table
 * of "Stage | Card" (a CSV of the board).
 */
export function readBoard(text: string): string {
  const stages: Stage[] = [];
  const find = (name: string) => stages.find((s) => s.name === name) ?? (stages.push(stage(name)), stages[stages.length - 1]);
  const last = () => stages[stages.length - 1] ?? find(DEFAULT_STAGES[0]);
  const blocks = parse(text).blocks;
  // An outline's first level is the stages (under a lone root, the level below it), and what is under each its cards.
  const outline = blocks.some((b) => b.k === 'li' && b.depth > 0 && b.done === undefined);
  const top = outline && blocks.filter((b) => b.k === 'li' && b.depth === 0).length === 1 ? 1 : 0;
  for (const b of blocks) {
    if (outline && b.k === 'li' && b.depth < top) continue;
    if (outline && b.k === 'li' && b.depth === top) stages.push(stage(b.text));
    else if (b.k === 'h') {
      const m = /^(.*?)\s*\(limit (\d+)\)$/i.exec(b.text);
      stages.push(stage(m ? m[1] : b.text, limitOf(attr(b, 'limit') ?? m?.[2]), colorOf(attr(b, 'color'))));
    } else if (b.k === 'li') {
      const cards = last().cards;
      if (b.depth > (outline ? top + 1 : 0) && b.done !== undefined && cards.length) cards[cards.length - 1].items.push({ text: oneLine(b.text), done: b.done });
      else cards.push(card(oneLine(b.text)));
    } else if (b.k === 'p') last().cards.push(...b.text.split('\n').map((l) => l.trim()).filter(Boolean).map((t) => card(t)));
    else if (b.k === 'table') {
      const [s, c] = columnsOf(b, /^stage$/, /^card$/);
      if (c < 0) continue;
      // A row with no stage of its own is in the stage of the row above.
      let at = '';
      for (const r of b.rows) {
        at = (s >= 0 && r[s]) || at || DEFAULT_STAGES[0];
        if (r[c]) find(at).cards.push(card(r[c]));
      }
    }
  }
  return serializeBoard(stages.length ? stages : emptyBoard());
}
