/**
 * Board (kanban) document model: the stages of a workflow, each holding
 * cards. The board is TLO (lib/tlo.ts): a heading for each stage, its limit
 * (the most cards it should hold at once) an attribute, and its cards a
 * list under it.
 *
 *   ## Doing {limit=2}
 *
 *   - Write the spec
 *   - Review the copy
 */
import { parse, write, attr, columnsOf, type Block } from './tlo.ts';

export interface Stage {
  name: string;
  /** Work-in-progress limit, 0 for none. */
  limit: number;
  cards: string[];
}

export const DEFAULT_STAGES = ['To do', 'Doing', 'Done'];
export const MAX_STAGES = 8;

export function emptyBoard(): Stage[] {
  return DEFAULT_STAGES.map((name) => ({ name, limit: 0, cards: [] }));
}

const limitOf = (v: string | undefined) => Math.max(0, parseInt(v ?? '', 10) || 0);

export function parseBoard(text: string): Stage[] {
  const stages: Stage[] = [];
  for (const b of parse(text).blocks) {
    if (b.k === 'h') stages.push({ name: b.text, limit: limitOf(attr(b, 'limit')), cards: [] });
    else if (b.k === 'li') {
      if (!stages.length) stages.push({ name: DEFAULT_STAGES[0], limit: 0, cards: [] });
      stages[stages.length - 1].cards.push(b.text.replace(/\n/g, ' '));
    }
  }
  return stages.length ? stages : emptyBoard();
}

export function serializeBoard(stages: Stage[]): string {
  // An untouched board costs nothing.
  if (stages.length === DEFAULT_STAGES.length && stages.every((s, i) => s.name === DEFAULT_STAGES[i] && !s.limit && !s.cards.length)) return '';
  const blocks: Block[] = [];
  for (const s of stages) {
    blocks.push({ k: 'h', level: 2, text: s.name.replace(/\n/g, ' '), ...(s.limit > 0 ? { a: { kv: { limit: String(Math.round(s.limit)) } } } : {}) });
    for (const c of s.cards) if (c.trim()) blocks.push({ k: 'li', depth: 0, text: c.replace(/\n/g, ' ') });
  }
  return write({ head: {}, blocks }).trimEnd();
}

/**
 * A board as a person or a model writes it, made canonical: headings of
 * any level for the stages, a limit written "(limit 2)" after one, lines
 * of words as cards, and a table of "Stage | Card" (a CSV of the board).
 */
export function readBoard(text: string): string {
  const stages: Stage[] = [];
  const stage = (name: string) => stages.find((s) => s.name === name) ?? (stages.push({ name, limit: 0, cards: [] }), stages[stages.length - 1]);
  const last = () => stages[stages.length - 1] ?? stage(DEFAULT_STAGES[0]);
  const blocks = parse(text).blocks;
  // An outline's first level is the stages (under a lone root, the level below it), and what is under each its cards.
  const outline = blocks.some((b) => b.k === 'li' && b.depth > 0);
  const top = outline && blocks.filter((b) => b.k === 'li' && b.depth === 0).length === 1 ? 1 : 0;
  for (const b of blocks) {
    if (outline && b.k === 'li' && b.depth < top) continue;
    if (outline && b.k === 'li' && b.depth === top) stages.push({ name: b.text, limit: 0, cards: [] });
    else if (b.k === 'h') {
      const m = /^(.*?)\s*\(limit (\d+)\)$/i.exec(b.text);
      stages.push({ name: m ? m[1] : b.text, limit: limitOf(attr(b, 'limit') ?? m?.[2]), cards: [] });
    } else if (b.k === 'li') last().cards.push(b.text.replace(/\n/g, ' '));
    else if (b.k === 'p') last().cards.push(...b.text.split('\n').map((l) => l.trim()).filter(Boolean));
    else if (b.k === 'table') {
      const [s, c] = columnsOf(b, /^stage$/, /^card$/);
      if (c < 0) continue;
      // A row with no stage of its own is in the stage of the row above.
      let at = '';
      for (const r of b.rows) {
        at = (s >= 0 && r[s]) || at || DEFAULT_STAGES[0];
        if (r[c]) stage(at).cards.push(r[c]);
      }
    }
  }
  return serializeBoard(stages.length ? stages : emptyBoard());
}
