/**
 * The editor's model maths, with no DOM in it: a position is a block and an
 * offset in its characters (an icon, a footnote mark or a line break counts
 * one); a selection is two of them. Every edit the editor makes is a pure
 * function from the blocks it owns and the selection to the operations
 * (docs/kernel.md §3) and the selection after; `settle` keeps what they
 * make as the format does (no mark on a space at its edge), so the model is
 * what its text reads back as. text.ts maps events onto these; the node
 * tests work them without a browser.
 */
import {
  apply,
  applyAll,
  hasClass,
  isAtomic,
  isText as holdsRuns,
  normalRuns,
  plainText,
  rule,
  runLength,
  sayableRuns,
  sliceRuns,
  splitBlock,
  type Attrs,
  type Block,
  type Doc,
  type Op,
  type Run,
  type TextBlock,
} from '../../doc/index.ts';
import { joined, lineEnd } from '../../doc/ops.ts';

/** Whether a block is words the caret can sit in: a heading, a paragraph, an item, a note. Anything else is a card. */
export const isWords = holdsRuns;
const isText = isWords;

export interface Pos {
  block: number;
  offset: number;
}
export interface Sel {
  anchor: Pos;
  focus: Pos;
}
/** What the editor can be told to do; some take a word (a link's address, an icon's name, another document's ref). */
export type Command =
  'b' | 'i' | 'u' | 's' | 'h' | 'c' | 'link' | 'unlink' | 'fn' | 'icon' | 'date' | 'title' | 'h1' | 'h2' | 'p' | 'quote' | 'ul' | 'ol' | 'indent' | 'outdent' | 'left' | 'center' | 'right' | 'justify';
export type Mark = 'b' | 'i' | 'u' | 's' | 'h' | 'c';
/** The marks in force where the caret is: what the next letter typed will carry. */
export type Fmt = Partial<Pick<Run, Mark | 'href'>>;
export type Shape = 'doc' | 'lines' | 'line';
/** An edit: the operations, and where the selection sits once they are applied. */
export interface Edit {
  ops: Op[];
  sel: Sel;
}

export const MARKS: Mark[] = ['b', 'i', 'u', 's', 'h', 'c'];
const MAX_DEPTH = 3;
const ALIGNS = ['center', 'right', 'justify'];

/* ---------- positions ---------- */

export const cmp = (a: Pos, b: Pos): number => a.block - b.block || a.offset - b.offset;
const samePos = (a: Pos, b: Pos): boolean => cmp(a, b) === 0;
export const collapsed = (s: Sel): boolean => samePos(s.anchor, s.focus);
/** The selection's two ends, first the one nearer the start. */
export const ordered = (s: Sel): [Pos, Pos] => (cmp(s.anchor, s.focus) <= 0 ? [s.anchor, s.focus] : [s.focus, s.anchor]);
export const caret = (block: number, offset: number): Sel => ({ anchor: { block, offset }, focus: { block, offset } });
export const sameSel = (a: Sel | null, b: Sel | null): boolean => (!a && !b) || (!!a && !!b && samePos(a.anchor, b.anchor) && samePos(a.focus, b.focus));

/** How many characters a block holds: none for a block that is not words. */
export const blockLength = (b: Block | undefined): number => (b && isText(b) ? runLength(b.runs) : 0);

/** A position held within the blocks: the block exists and the offset is within its words. */
export function clampPos(blocks: Block[], p: Pos): Pos {
  const block = Math.max(0, Math.min(p.block, blocks.length - 1));
  return { block, offset: Math.max(0, Math.min(p.offset, blockLength(blocks[block]))) };
}
/** A selection held within the blocks, and never resting on a card (another document, a table, a rule). */
export const clampSel = (blocks: Block[], s: Sel): Sel => ({ anchor: skipCard(blocks, s.anchor), focus: skipCard(blocks, s.focus) });

/**
 * A selection carried over ops someone else applied (docs/kernel.md §12), as the kernel's transform carries an op on a
 * block, plainly: past blocks put in or taken out before its block, with its block through a move, and past words put
 * in or taken out before it in its block (a place where words were put in stays before them; one inside words
 * replaced goes to their end). A place inside blocks taken out goes to what follows them. Held within the document
 * after with `clampSel`.
 */
export function carrySel(s: Sel, ops: Op[]): Sel {
  const carry = (p: Pos): Pos => {
    for (const op of ops) {
      if (op.op === 'splice') {
        if (p.block >= op.at + op.n) p = { block: p.block + op.blocks.length - op.n, offset: p.offset };
        else if (p.block >= op.at && p.block >= op.at + op.blocks.length) p = { block: op.at + op.blocks.length, offset: 0 };
      } else if (op.op === 'move') {
        let b = p.block;
        if (b >= op.at && b < op.at + op.n) b = op.to + b - op.at;
        else {
          if (b >= op.at + op.n) b -= op.n;
          if (b >= op.to) b += op.n;
        }
        p = { block: b, offset: p.offset };
      } else if (op.op === 'text' && op.at === p.block && p.offset > op.from) {
        const put = runLength(op.runs);
        p = { block: p.block, offset: p.offset >= op.to ? p.offset + put - (op.to - op.from) : op.from + put };
      }
    }
    return p;
  };
  return { anchor: carry(s.anchor), focus: carry(s.focus) };
}

/** The nearest text block at or after `i` (dir 1) or at or before it (dir -1), or -1. */
function textBlock(blocks: Block[], i: number, dir: 1 | -1): number {
  for (let j = i; j >= 0 && j < blocks.length; j += dir) if (isText(blocks[j])) return j;
  return -1;
}

/** A position that sits in words: one on a card is moved to the next text block's start (or the previous one's end). */
export function skipCard(blocks: Block[], p: Pos, dir: 1 | -1 = 1): Pos {
  if (!blocks.length || isText(blocks[Math.min(p.block, blocks.length - 1)])) return clampPos(blocks, p);
  let j = textBlock(blocks, p.block, dir);
  if (j < 0) j = textBlock(blocks, p.block, dir === 1 ? -1 : 1);
  if (j < 0) return { block: 0, offset: 0 };
  return { block: j, offset: j > p.block ? 0 : blockLength(blocks[j]) };
}

/** The run holding the character at `offset` (the one that starts at or spans it), with where it starts. */
export function runAt(runs: Run[], offset: number): { run: Run; start: number; index: number } | null {
  let at = 0;
  for (let i = 0; i < runs.length; i++) {
    const len = isAtomic(runs[i]) ? 1 : runs[i].t.length;
    if (offset >= at && offset < at + len) return { run: runs[i], start: at, index: i };
    at += len;
  }
  return null;
}

/** The marks where the caret sits: those of the words just before it, or just after it at a block's start. An atomic run gives none. */
export function marksAt(runs: Run[], offset: number): Fmt {
  const r = (offset > 0 ? runAt(runs, offset - 1) : null)?.run ?? runAt(runs, offset)?.run;
  if (!r || isAtomic(r)) return {};
  const out: Fmt = {};
  for (const m of MARKS) if (r[m]) out[m] = true;
  if (r.href) out.href = r.href;
  return out;
}

/**
 * The runs a selection's marks are judged by: its words, without the spaces and breaks among them, which carry no mark
 * at a mark's edge ("word " selected and made bold is bold, its space not: sayableRuns); the spaces when that is all.
 */
const judged = (runs: Run[]): Run[] => (runs.some((r) => r.t.trim()) ? runs.filter((r) => r.t.trim()) : runs);

/** The marks a selection shows: at a caret, those of the words before it; over a range, those every selected word has (a link when all share one). */
export function marksOf(blocks: Block[], sel: Sel): Fmt {
  const [a] = ordered(sel);
  const b = blocks[a.block];
  if (!b || !isText(b)) return {};
  if (collapsed(sel)) return marksAt(b.runs, a.offset);
  // (A piece cut from words is words, whatever it would be alone: a linked word is not a card.)
  const picked = judged(
    sliceBlocks(blocks, sel)
      .flatMap((x) => (holdsRuns(x) ? x.runs : []))
      .filter((r) => !isAtomic(r) && r.t),
  );
  if (!picked.length) return {};
  const out: Fmt = {};
  for (const m of MARKS) if (picked.every((r) => r[m])) out[m] = true;
  if (picked[0].href && picked.every((r) => r.href === picked[0].href)) out.href = picked[0].href;
  return out;
}

/** The plain character at `offset`: '' for an atomic run or past the end. */
export function charAt(runs: Run[], offset: number): string {
  const hit = runAt(runs, offset);
  return !hit || isAtomic(hit.run) ? '' : hit.run.t[offset - hit.start];
}

const text = (b: Block): TextBlock => {
  if (!isText(b)) throw new RangeError('not words');
  return b;
};

/** The blocks' words between two positions, the first and last cut at their offsets; what is not words comes whole. */
export function sliceBlocks(blocks: Block[], sel: Sel): Block[] {
  const [a, b] = ordered(sel);
  const out: Block[] = [];
  for (let i = a.block; i <= b.block && i < blocks.length; i++) {
    const blk = blocks[i];
    if (!isText(blk)) {
      out.push(blk);
      continue;
    }
    const from = i === a.block ? a.offset : 0;
    const to = i === b.block ? b.offset : runLength(blk.runs);
    out.push({ ...blk, runs: sliceRuns(blk.runs, from, to) });
  }
  return out;
}

/* ---------- edits ---------- */

/**
 * The selection taken out and `runs` put in its place: one `text` op within
 * a block; across blocks, one `splice` joining the first block's start to
 * the last one's end. The caret lands after what was put in.
 */
export function insertRuns(blocks: Block[], sel: Sel, runs: Run[]): Edit {
  const [a, b] = ordered(sel);
  const after = caret(a.block, a.offset + runLength(runs));
  if (a.block === b.block && isText(blocks[a.block])) return { ops: [{ op: 'text', at: a.block, from: a.offset, to: b.offset, runs }], sel: after };
  const first = baseOf(blocks, a, b);
  const last = blocks[b.block];
  const left = sliceRuns(first.runs, 0, a.offset);
  const right = isText(last) ? sliceRuns(last.runs, b.offset, runLength(last.runs)) : [];
  return { ops: [{ op: 'splice', at: a.block, n: b.block - a.block + 1, blocks: [{ ...first, runs: normalRuns([...left, ...runs, ...right]) }] }], sel: after };
}

export const deleteSel = (blocks: Block[], sel: Sel): Edit => insertRuns(blocks, sel, []);

/**
 * The whole document as a selection (Select All in a doc): from the start of the first block to the end of the
 * last, cards included, so its ends may rest on a card (the one place they do; clampSel would move them to the
 * words). An edit over it (insertRuns, insertBlocks, splitAt) takes the cards at its ends with the words, and
 * what is left is one block of words.
 */
export const wholeSel = (blocks: Block[]): Sel => ({ anchor: { block: 0, offset: 0 }, focus: { block: Math.max(0, blocks.length - 1), offset: blockLength(blocks[blocks.length - 1]) } });
/** The block an edit from `a` to `b` builds on: the first block's own words; an empty paragraph when that is a card taken out, or when the edit takes the whole document (what is left of everything is a paragraph). */
function baseOf(blocks: Block[], a: Pos, b: Pos): TextBlock {
  const first = blocks[a.block];
  const all = a.block === 0 && a.offset === 0 && b.block === blocks.length - 1 && b.offset >= blockLength(blocks[b.block]) && blocks.length > 1;
  return first && isText(first) && !all ? first : { k: 'p', runs: [] };
}

/**
 * Blocks put in at the selection (a paste): the first one's words join the
 * block the caret is in, the last one's words begin the block after, and
 * what is between stands on its own. A lone text block is put in as words.
 */
export function insertBlocks(blocks: Block[], sel: Sel, put: Block[]): Edit {
  if (!put.length) return { ops: [], sel };
  const [a, b] = ordered(sel);
  const first = put[0];
  const last = put[put.length - 1];
  // One block of words goes in as words; a paragraph that is one web address (a card) stands on its own.
  if (put.length === 1 && isWords(first)) return insertRuns(blocks, sel, first.runs);
  const cur = baseOf(blocks, a, b);
  const end = blocks[b.block];
  const left = sliceRuns(cur.runs, 0, a.offset);
  const right = isText(end) ? sliceRuns(end.runs, b.offset, runLength(end.runs)) : [];
  const out: Block[] = [];
  let from = 0;
  let to = put.length;
  if (isWords(first)) {
    // Into a block with no words, the pasted block comes as it is (its own kind); else its words join the block.
    out.push(cur.runs.length ? { ...cur, runs: normalRuns([...left, ...first.runs]) } : first);
    from = 1;
  } else if (left.length) out.push({ ...cur, runs: left });
  let tail: TextBlock;
  if (isWords(last) && put.length > 1) {
    to = put.length - 1;
    tail = { ...last, runs: normalRuns([...last.runs, ...right]) };
  } else tail = { k: 'p', runs: right };
  out.push(...put.slice(from, to));
  const at = a.block + out.length;
  out.push(tail);
  return { ops: [{ op: 'splice', at: a.block, n: b.block - a.block + 1, blocks: out }], sel: caret(at, runLength(tail.runs) - runLength(right)) };
}

/** A block of another kind in place of a list item that has no words: a level out, or a paragraph. */
const unlist = (b: Extract<Block, { k: 'li' }>): Block => (b.depth > 0 ? { ...b, depth: b.depth - 1 } : { k: 'p', runs: b.runs, ...(b.a ? { a: b.a } : {}) });

/** Enter: the block split at the caret (a selection goes first). An empty list item comes out of its list instead; at the start of a block's words a paragraph opens above it. */
export function splitAt(blocks: Block[], sel: Sel): Edit {
  const [a, b] = ordered(sel);
  const cur = collapsed(sel) ? text(blocks[a.block]) : baseOf(blocks, a, b);
  if (collapsed(sel) && cur.k === 'li' && !cur.runs.length) return { ops: [{ op: 'splice', at: a.block, n: 1, blocks: [unlist(cur)] }], sel };
  // At the start of words that are not an item, an empty paragraph goes in above and the block stays as it is: a heading pushed down stays a heading, and nothing empty is left styled as one.
  if (collapsed(sel) && a.offset === 0 && cur.k !== 'li' && cur.runs.length) return { ops: [{ op: 'splice', at: a.block, n: 0, blocks: [{ k: 'p', runs: [] }] }], sel: caret(a.block + 1, 0) };
  const end = blocks[b.block];
  const joined: TextBlock = { ...cur, runs: normalRuns([...sliceRuns(cur.runs, 0, a.offset), ...(isText(end) ? sliceRuns(end.runs, b.offset, runLength(end.runs)) : [])]) };
  const halves = splitBlock({ head: {}, blocks: [joined] }, 0, a.offset);
  let two = halves[0]?.op === 'splice' ? halves[0].blocks : [joined];
  // At the end of an item whose children follow, the new item is their first (Docs, Workflowy).
  const next = blocks[b.block + 1];
  if (collapsed(sel) && cur.k === 'li' && a.offset === runLength(cur.runs) && next?.k === 'li' && next.depth === cur.depth + 1 && two.length === 2)
    two = [two[0], { k: 'li', depth: next.depth, ...(next.ord ? { ord: true } : {}), ...(next.done !== undefined ? { done: false } : {}), runs: [] }];
  return { ops: [{ op: 'splice', at: a.block, n: b.block - a.block + 1, blocks: two }], sel: caret(a.block + 1, 0) };
}

/**
 * Backspace with the caret together: one character or one atomic run; at a
 * block's start a list item comes out of its list, a card before it is
 * taken out, or the block joins the one before. 'exit' at the very start
 * when the editor is not a document; null when there is nothing to do.
 */
export function backspace(blocks: Block[], sel: Sel, shape: Shape): Edit | 'exit' | null {
  if (!collapsed(sel)) return deleteSel(blocks, sel);
  const { block, offset } = sel.anchor;
  const cur = text(blocks[block]);
  if (offset > 0) return { ops: [{ op: 'text', at: block, from: offset - 1, to: offset, runs: [] }], sel: caret(block, offset - 1) };
  // A line-shaped editor owns one block: at its start the host decides (an outline takes an empty item away), whatever the block's kind.
  if (shape === 'line') return 'exit';
  // An empty item with children goes, and they come out a level to sit where it was; the caret ends the block before.
  const under = blocks[block + 1];
  if (cur.k === 'li' && !cur.runs.length && under?.k === 'li' && under.depth > cur.depth) {
    let end = block + 1;
    while (blocks[end]?.k === 'li' && (blocks[end] as Extract<Block, { k: 'li' }>).depth > cur.depth) end++;
    const out = blocks.slice(block + 1, end).map((x) => (x.k === 'li' ? { ...x, depth: Math.max(0, x.depth - 1) } : x));
    const prev = textBlock(blocks, block - 1, -1);
    return { ops: [{ op: 'splice', at: block, n: end - block, blocks: out }], sel: prev >= 0 ? caret(prev, blockLength(blocks[prev])) : caret(block, 0) };
  }
  if (cur.k === 'li') return { ops: [{ op: 'splice', at: block, n: 1, blocks: [unlist(cur)] }], sel };
  if (block === 0) return shape === 'doc' ? null : 'exit';
  const prev = blocks[block - 1];
  if (!isText(prev)) return { ops: [{ op: 'splice', at: block - 1, n: 1, blocks: [] }], sel: caret(block - 1, 0) };
  return join(block - 1, prev, cur, caret(block - 1, runLength(prev.runs)));
}

/** Delete: one character or atomic run forward; at a block's end the next block joins this one, or a card after it is taken out. */
export function forwardDelete(blocks: Block[], sel: Sel): Edit | null {
  if (!collapsed(sel)) return deleteSel(blocks, sel);
  const { block, offset } = sel.anchor;
  const cur = text(blocks[block]);
  if (offset < runLength(cur.runs)) return { ops: [{ op: 'text', at: block, from: offset, to: offset + 1, runs: [] }], sel };
  const next = blocks[block + 1];
  if (!next) return null;
  if (!isText(next)) return { ops: [{ op: 'splice', at: block + 1, n: 1, blocks: [] }], sel };
  return join(block, cur, next, sel);
}

/**
 * Two blocks of words made one (Backspace at the second's start, Delete at
 * the first's end). An empty one simply goes, so the block with words keeps
 * its kind and its element: a heading pulled up into an empty line stays a
 * heading (Docs). With words in both, the first keeps its kind; a heading,
 * one line, takes only the second's first line, and the second keeps the
 * rest (the kernel's `joined`). The caret lands where the two met.
 */
function join(at: number, first: TextBlock, second: TextBlock, sel: Sel): Edit {
  if (!first.runs.length) return { ops: [{ op: 'splice', at, n: 1, blocks: [] }], sel: caret(at, 0) };
  if (!second.runs.length) return { ops: [{ op: 'splice', at: at + 1, n: 1, blocks: [] }], sel };
  return { ops: [{ op: 'splice', at, n: 2, blocks: joined(first, second) }], sel };
}

/** Every selected run of words, as their marks are judged. */
function selectedRuns(blocks: Block[], sel: Sel): Run[] {
  return judged(
    sliceBlocks(blocks, sel)
      .flatMap((b) => (isText(b) ? b.runs : []))
      .filter((r) => !isAtomic(r) && r.t),
  );
}

/** A mark put on the selection, or taken off when every selected word has it. One `text` op per block; the selection is kept. */
export function toggleMark(blocks: Block[], sel: Sel, m: Mark): Edit {
  const picked = selectedRuns(blocks, sel);
  const on = !!picked.length && picked.every((r) => r[m]);
  return setMark(blocks, sel, m, !on);
}

/** The selection's words with a mark set (on) or taken off; the selection is kept. */
export function setMark(blocks: Block[], sel: Sel, m: Mark | 'href', value: boolean | string): Edit {
  const [a, b] = ordered(sel);
  const ops: Op[] = [];
  for (let i = a.block; i <= b.block; i++) {
    const blk = blocks[i];
    if (!blk || !isText(blk)) continue;
    const from = i === a.block ? a.offset : 0;
    const to = i === b.block ? b.offset : runLength(blk.runs);
    if (from >= to) continue;
    const runs = sliceRuns(blk.runs, from, to).map((r) => {
      if (isAtomic(r)) return r;
      const out: Run = { ...r };
      if (m === 'href') typeof value === 'string' && value ? (out.href = value) : delete out.href;
      else value ? (out[m] = true) : delete out[m];
      return out;
    });
    ops.push({ op: 'text', at: i, from, to, runs });
  }
  return { ops, sel };
}

/** The blocks the selection touches, as a span. */
const spanOf = (sel: Sel): [number, number] => {
  const [a, b] = ordered(sel);
  return [a.block, b.block + 1];
};

/** A block with these attributes, as the format reads them back: what is empty in them (no class left) is not there. */
const withAttrs = (b: Block, a: Attrs | undefined): Block => {
  const out = { ...b } as Block & { a?: Attrs };
  const kept: Attrs = { ...(a?.id ? { id: a.id } : {}), ...(a?.cls?.length ? { cls: a.cls } : {}), ...(a?.kv && Object.keys(a.kv).length ? { kv: a.kv } : {}) };
  if (Object.keys(kept).length) out.a = kept;
  else delete out.a;
  return out;
};

/** The kind a block is asked to be: a paragraph, a heading, the title, a list item. Asking for the kind it already is (a list) makes it a paragraph. */
export function setKind(blocks: Block[], sel: Sel, kind: 'p' | 'h1' | 'h2' | 'title' | 'quote' | 'ul' | 'ol'): Edit {
  const [from, to] = spanOf(sel);
  const span = blocks.slice(from, to);
  const items = span.filter(isText);
  const already =
    kind === 'ul' ? items.every((b) => b.k === 'li' && !b.ord) : kind === 'ol' ? items.every((b) => b.k === 'li' && !!b.ord) : kind === 'quote' ? items.every((b) => b.k === 'quote') : false;
  const want = already ? 'p' : kind;
  // A heading is one line (the format says no other): a block of several lines made a heading is its first line, and
  // the lines after it stay a paragraph, every one of them (nothing typed is lost: Paul, 2026-10-10). The selection
  // follows: a caret in a line that moved is in the paragraph, and the blocks after a split are one further on.
  const heading = want === 'h1' || want === 'h2' || want === 'title';
  const out: Block[] = [];
  const splits: number[] = [];
  span.forEach((b, i) => {
    if (!isText(b)) return void out.push(b);
    const a = notTitle(b.a);
    const nl = heading ? lineEnd(b.runs) : -1;
    const runs = nl < 0 ? b.runs : sliceRuns(b.runs, 0, nl);
    switch (want) {
      case 'p':
        return void out.push(withAttrs({ k: 'p', runs: b.runs }, a));
      case 'quote':
        return void out.push(withAttrs({ k: 'quote', runs: b.runs }, a));
      case 'h1':
        out.push(withAttrs({ k: 'h', level: 1, runs }, a));
        break;
      case 'h2':
        out.push(withAttrs({ k: 'h', level: 2, runs }, a));
        break;
      case 'title':
        out.push(withAttrs({ k: 'h', level: 1, runs }, { ...a, cls: [...(a.cls ?? []), 'title'] }));
        break;
      case 'ul':
      case 'ol':
        return void out.push(withAttrs({ k: 'li', depth: b.k === 'li' ? b.depth : 0, ...(want === 'ol' ? { ord: true } : {}), runs: b.runs }, a));
    }
    if (nl >= 0) {
      out.push(linesAfter(b, nl));
      splits.push(from + i);
    }
  });
  const moved = (p: Pos): Pos => {
    const before = splits.filter((at) => at < p.block).length;
    const here = splits.includes(p.block) ? lineEnd((blocks[p.block] as TextBlock).runs) : -1;
    if (here >= 0 && p.offset > here) return { block: p.block + before + 1, offset: p.offset - here - 1 };
    return { block: p.block + before, offset: here >= 0 ? Math.min(p.offset, here) : p.offset };
  };
  return { ops: [{ op: 'splice', at: from, n: to - from, blocks: out }], sel: splits.length ? { anchor: moved(sel.anchor), focus: moved(sel.focus) } : sel };
}

/** A block's attributes but the title's class. */
const notTitle = (a: Attrs | undefined): Attrs => ({ ...a, cls: (a?.cls ?? []).filter((c) => c !== 'title') });

/**
 * The lines of a block after its first (`nl`, the first line break) as a paragraph: what a heading cannot hold. It keeps
 * the block's alignment and classes but the title's, and not its id, which names the heading's line alone.
 */
const linesAfter = (b: TextBlock, nl: number): Block => withAttrs({ k: 'p', runs: sliceRuns(b.runs, nl + 1, runLength(b.runs)) }, { ...notTitle(b.a), id: undefined });

/** Whether the first selected block is of a kind: for a bar's pressed states. */
export function kindAt(blocks: Block[], sel: Sel): 'p' | 'h1' | 'h2' | 'title' | 'ul' | 'ol' | 'quote' | null {
  const b = blocks[ordered(sel)[0].block];
  if (!b || !isText(b)) return null;
  if (b.k === 'h') return hasClass(b, 'title') ? 'title' : b.level === 1 ? 'h1' : 'h2';
  if (b.k === 'li') return b.ord ? 'ol' : 'ul';
  return b.k;
}

/** The selected blocks aligned: left is no class at all. */
export function align(blocks: Block[], sel: Sel, how: 'left' | 'center' | 'right' | 'justify'): Edit {
  const [from, to] = spanOf(sel);
  const out = blocks.slice(from, to).map((b): Block => {
    if (!isText(b)) return b;
    const cls = (b.a?.cls ?? []).filter((c) => !ALIGNS.includes(c));
    if (how !== 'left') cls.push(how);
    return withAttrs(b, { ...b.a, cls });
  });
  return { ops: [{ op: 'splice', at: from, n: to - from, blocks: out }], sel };
}

/** The alignment of the first selected block. */
export function alignAt(blocks: Block[], sel: Sel): 'left' | 'center' | 'right' | 'justify' {
  const b = blocks[ordered(sel)[0].block];
  return ((b && ALIGNS.find((c) => hasClass(b, c))) as 'center' | 'right' | 'justify' | undefined) ?? 'left';
}

/** The selected list items a level deeper (by 1) or shallower (by -1): never deeper than the item above them plus one, never past the margin or the third level. Null when nothing moves. */
export function shiftItems(blocks: Block[], sel: Sel, by: 1 | -1): Edit | null {
  const [from, to] = spanOf(sel);
  let moved = false;
  const out = blocks.slice(from, to).map((b, j): Block => {
    if (b.k !== 'li') return b;
    const above = blocks[from + j - 1];
    const limit = above?.k === 'li' ? above.depth + 1 : 0;
    const depth = Math.max(0, Math.min(MAX_DEPTH, limit, b.depth + by));
    if (depth === b.depth) return b;
    moved = true;
    return { ...b, depth };
  });
  return moved ? { ops: [{ op: 'splice', at: from, n: to - from, blocks: out }], sel } : null;
}

/** Where an item's family ends: the first block after `i` that is not an item deeper than it. */
function familyEnd(blocks: Block[], i: number): number {
  const b = blocks[i];
  let j = i + 1;
  if (b?.k !== 'li') return j;
  while (blocks[j]?.k === 'li' && (blocks[j] as Extract<Block, { k: 'li' }>).depth > b.depth) j++;
  return j;
}

/**
 * Alt+Up/Down: the selected items, with their deeper followers, moved past
 * the family before (by -1) or after (by 1) at their level; never out of
 * their parent, never past a block that is not an item. One splice over the
 * two families, the same blocks in another order; the selection moves with
 * them. Null when there is nowhere to go.
 */
export function moveItems(blocks: Block[], sel: Sel, by: 1 | -1): Edit | null {
  const [a, z] = ordered(sel);
  const first = blocks[a.block];
  if (first?.k !== 'li') return null;
  const d = first.depth;
  let end = a.block;
  while (end <= z.block) end = familyEnd(blocks, end);
  for (let i = a.block; i < end; i++) {
    const x = blocks[i];
    if (x.k !== 'li' || x.depth < d) return null;
  }
  const level = (i: number) => blocks[i]?.k === 'li' && (blocks[i] as Extract<Block, { k: 'li' }>).depth === d;
  const move = (from: number, mid: number, to: number, shift: number): Edit => ({
    ops: [{ op: 'splice', at: from, n: to - from, blocks: [...blocks.slice(mid, to), ...blocks.slice(from, mid)] }],
    sel: { anchor: { ...sel.anchor, block: sel.anchor.block + shift }, focus: { ...sel.focus, block: sel.focus.block + shift } },
  });
  if (by > 0) {
    if (!level(end)) return null;
    const after = familyEnd(blocks, end);
    return move(a.block, end, after, after - end);
  }
  let p = a.block - 1;
  while (p >= 0 && blocks[p].k === 'li' && (blocks[p] as Extract<Block, { k: 'li' }>).depth > d) p--;
  if (p < 0 || !level(p)) return null;
  return move(p, a.block, end, p - a.block);
}

/* ---------- typing ---------- */

const OPENERS = /[\s(\[{‘“« ]|^$/;
/** A straight quote as the curly one the place calls for: opening after a space or a bracket, closing (or an apostrophe) after a letter. */
export function smartQuote(q: '"' | "'", before: string): string {
  const open = OPENERS.test(before.slice(-1));
  return q === '"' ? (open ? '“' : '”') : open ? '‘' : '’';
}

/** A paragraph that begins "- ", "1. ", "# " or "> " becomes a list item, a heading or a quote as the space is typed: the shortcut's op, or null. */
export function shortcut(blocks: Block[], sel: Sel, shape: Shape): Edit | null {
  if (!collapsed(sel) || shape === 'line') return null;
  const { block, offset } = sel.anchor;
  const b = blocks[block];
  if (!b || b.k !== 'p') return null;
  const head = sliceRuns(b.runs, 0, offset);
  if (head.length !== 1 || isAtomic(head[0]) || head[0].href) return null;
  const words = head[0].t;
  const rest = sliceRuns(b.runs, offset, runLength(b.runs));
  const a = b.a;
  // Three hyphens alone on a line in a document are a horizontal rule, with an empty paragraph after it for the caret.
  if (shape === 'doc' && words === '---' && !rest.length) return { ops: [{ op: 'splice', at: block, n: 1, blocks: [rule(), { k: 'p', runs: [], ...(a ? { a } : {}) }] }], sel: caret(block + 1, 0) };
  let made: Block | null = null;
  if (/^[-*+]$/.test(words)) made = { k: 'li', depth: 0, runs: rest, ...(a ? { a } : {}) };
  else if (/^1[.)]$/.test(words)) made = { k: 'li', depth: 0, ord: true, runs: rest, ...(a ? { a } : {}) };
  else if (shape === 'doc' && words === '>') made = { k: 'quote', runs: rest, ...(a ? { a } : {}) };
  else if (shape === 'doc' && /^#{1,6}$/.test(words)) made = { k: 'h', level: words.length as 1 | 2 | 3 | 4 | 5 | 6, runs: rest, ...(a ? { a } : {}) };
  return made ? { ops: [{ op: 'splice', at: block, n: 1, blocks: [made] }], sel: caret(block, 0) } : null;
}

/**
 * One `text` op taking a block's runs to other runs (what the browser made
 * of them during a composition): the common start and end are kept, what
 * is between is replaced. Null when they are the same.
 */
export function runsDiff(at: number, from: Run[], to: Run[]): Op | null {
  const a = normalRuns(from);
  const b = normalRuns(to);
  const la = runLength(a);
  const lb = runLength(b);
  const same = (i: number, j: number) => {
    const x = runAt(a, i);
    const y = runAt(b, j);
    if (!x || !y) return false;
    if (isAtomic(x.run) || isAtomic(y.run)) return x.run === y.run || (x.run.ic === y.run.ic && x.run.fn === y.run.fn && (!!x.run.ic || x.run.fn !== undefined));
    return x.run.t[i - x.start] === y.run.t[j - y.start] && MARKS.every((m) => x.run[m] === y.run[m]) && x.run.href === y.run.href;
  };
  let head = 0;
  while (head < la && head < lb && same(head, head)) head++;
  let tail = 0;
  while (tail < la - head && tail < lb - head && same(la - 1 - tail, lb - 1 - tail)) tail++;
  if (head === la && la === lb) return null;
  return { op: 'text', at, from: head, to: la - tail, runs: sliceRuns(b, head, lb - tail) };
}

/* ---------- what the format keeps ---------- */

/** A block of words as the format keeps it (sayableRuns); any other block, and words already so, as it is. */
export function sayableBlock<B extends Block>(b: B): B {
  if (!isText(b)) return b;
  const runs = sayableRuns(b.runs, b.k === 'quote');
  return runs === b.runs ? b : { ...b, runs };
}

/**
 * Marks the format let go of just before a caret: the spaces from `from` to `to` (the caret) carried them as they were
 * typed, or until the words after them went, and a mark never ends on a space (sayableRuns). `fmt` is the marks in
 * force there all the same, so the next letter typed carries them, and the spaces take back those they share with it
 * (`typeRuns`): a bold word, a space and a bold word are one bold "a b".
 */
export interface Held {
  block: number;
  from: number;
  to: number;
  fmt: Fmt;
}

/** What a position carries besides its letter: the marks, the link, the icon or the note. */
const marksKey = (r: Run): string => [...MARKS.map((m) => (r[m] ? m : '')), r.href ?? '', r.ic ?? '', r.fn ?? ''].join('\u0000');

/** Where two runs of the same words carry other marks: the first position and the one after the last; null where none. */
function marksDiffer(a: Run[], b: Run[]): [number, number] | null {
  const keys = (runs: Run[]) => runs.flatMap((r) => Array<string>(isAtomic(r) ? 1 : r.t.length).fill(marksKey(r)));
  const x = keys(a);
  const y = keys(b);
  if (x.length !== y.length) return [0, Math.max(x.length, y.length)];
  let lo = 0;
  while (lo < x.length && x[lo] === y[lo]) lo++;
  if (lo === x.length) return null;
  let hi = x.length;
  while (hi > lo && x[hi - 1] === y[hi - 1]) hi--;
  return [lo, hi];
}

/**
 * One op as the format keeps what it makes (`made`, the op applied to `doc`): as it is, widened over the marks let go
 * of, or null when it then changes nothing.
 */
function settleOp(doc: Doc, made: Doc, op: Op): Op | null {
  if (op.op === 'splice') {
    const put = op.blocks.map(sayableBlock);
    return put.every((b, i) => b === op.blocks[i]) ? op : { ...op, blocks: put };
  }
  if (op.op !== 'text') return op;
  const block = made.blocks[op.at] as TextBlock;
  const said = sayableBlock(block);
  if (said === block) return op;
  const span = marksDiffer(block.runs, said.runs);
  if (!span) return op;
  // The same words in the same places: the op reaches over the marks let go of, before or after what it put in.
  const put = runLength(op.runs);
  const from = Math.min(op.from, span[0]);
  const end = Math.max(op.from + put, span[1]);
  const before = (doc.blocks[op.at] as TextBlock).runs;
  if (runLength(before) === runLength(said.runs) && plainText(before) === plainText(said.runs) && !marksDiffer(before, said.runs)) return null;
  return { op: 'text', at: op.at, from, to: op.to + end - op.from - put, runs: normalRuns(sliceRuns(said.runs, from, end)) };
}

/** The spaces just before a collapsed caret whose marks the format let go of: from the ops as made (`made`) to as kept (`kept`). */
function heldAt(made: Block[], kept: Block[], sel: Sel): Held | null {
  if (!collapsed(sel)) return null;
  const { block, offset } = sel.anchor;
  const u = made[block];
  const s = kept[block];
  if (!u || !s || !isText(u) || !isText(s)) return null;
  let from = offset;
  while (from > 0 && /^[^\S\n]$/.test(charAt(u.runs, from - 1))) from--;
  if (from === offset) return null;
  const typed = marksAt(u.runs, offset);
  const fmt = marksAt(s.runs, offset);
  const lost = MARKS.filter((m) => typed[m] && !fmt[m]);
  if (!lost.length) return null;
  for (const m of lost) fmt[m] = true;
  return { block, from, to: offset, fmt };
}

/**
 * An op (`op`, settled) as the format keeps a heading: one line (setKind). Words with a line break put into a heading
 * (lines pasted or typed there; `after`, what the op makes of `before`) leave it its first line, and the lines after it
 * go in as a paragraph after it, in the op itself: a `text` op puts in the heading's line, and a splice after it the
 * paragraph; a splice's heading is put in as the two blocks. So each op told leaves a document its text says, and a
 * server that applies each to what its text reads back holds what the editor holds. `splits` gets each heading split:
 * its block in what the op would have made, and its first line's end.
 */
function oneLine(before: Doc, after: Doc, op: Op, splits: [number, number][]): Op[] {
  if (op.op === 'text') {
    const b = after.blocks[op.at] as TextBlock;
    const nl = b.k === 'h' ? lineEnd(b.runs) : -1;
    if (nl < 0) return [op];
    splits.push([op.at, nl]);
    const from = Math.min(op.from, nl);
    return [
      { op: 'text', at: op.at, from, to: blockLength(before.blocks[op.at]), runs: sliceRuns(b.runs, from, nl) },
      { op: 'splice', at: op.at + 1, n: 0, blocks: [linesAfter(b, nl)] },
    ];
  }
  if (op.op !== 'splice') return [op];
  const blocks = op.blocks.flatMap((b, j): Block[] => {
    const nl = b.k === 'h' ? lineEnd(b.runs) : -1;
    if (b.k !== 'h' || nl < 0) return [b];
    splits.push([op.at + j, nl]);
    return [{ ...b, runs: sliceRuns(b.runs, 0, nl) }, linesAfter(b, nl)];
  });
  return blocks.length === op.blocks.length ? [op] : [{ ...op, blocks }];
}

/**
 * An edit's ops as the format keeps what they make (docs/kernel.md §2, point 5): every block of
 * words they leave is what its text reads back as, so the editor holds what `parse(write(model))` gives, and a server
 * that keeps the text and applies the same ops holds the same words (2026-10-17). A splice's blocks go in so;
 * a `text` op that would leave a mark on a space at its edge reaches over the marks let go of (its words and their
 * places stay as they were, so the selection after it does too), and one that then changes nothing goes. An op that
 * leaves a heading holding a line break leaves it one line and a paragraph after it (`oneLine`), and `sel` (the
 * selection after the ops; an edit puts lines into a heading with its last op) follows. `held` is what was let go of
 * just before the caret, if it is one.
 */
export function settle<S extends Sel | undefined>(blocks: Block[], ops: Op[], sel?: S): { ops: Op[]; held: Held | null; sel: S } {
  let kept: Doc = { head: {}, blocks };
  let made = kept;
  const out: Op[] = [];
  const splits: [number, number][] = [];
  for (const op of ops) {
    made = apply(kept, op);
    const said = settleOp(kept, made, op);
    if (!said) continue;
    const after = said === op ? made : apply(kept, said);
    const one = oneLine(kept, after, said, splits);
    out.push(...one);
    kept = one[0] === said ? after : applyAll(kept, one);
  }
  let held = sel ? heldAt(made.blocks, kept.blocks, sel) : null;
  // The selection follows a heading's lines into the paragraph after it, and the blocks after a split are one further
  // on. The last first, so each split leaves the places of those before it.
  let at: Sel | undefined = sel;
  for (const [i, nl] of splits.sort((x, y) => y[0] - x[0])) {
    const moved = (p: Pos): Pos => (p.block > i ? { ...p, block: p.block + 1 } : p.block === i && p.offset > nl ? { block: i + 1, offset: p.offset - nl - 1 } : p);
    if (at) at = { anchor: moved(at.anchor), focus: moved(at.focus) };
    if (held && held.block >= i) held = null;
  }
  return { ops: out, held, sel: at as S };
}

/**
 * Words typed at the caret (or over the selection), with their marks. Where the format let go of marks just before
 * the caret (`held`), the spaces there take back those they share with the words' first run, and the words follow:
 * typing a bold word, a space and a bold word writes "**a b**". Spaces alone are only put in: at the edge again,
 * settle holds them again.
 */
export function typeRuns(blocks: Block[], sel: Sel, runs: Run[], held: Held | null): Edit {
  const at = held && collapsed(sel) && held.block === sel.anchor.block && held.to === sel.anchor.offset ? held : null;
  const b = at ? blocks[at.block] : null;
  const first = runs.find((r) => isAtomic(r) || r.t.trim());
  if (!at || !b || !isText(b) || !first || isAtomic(first)) return insertRuns(blocks, sel, runs);
  const keep = MARKS.filter((m) => at.fmt[m] && first[m]);
  const between = sliceRuns(b.runs, at.from, at.to);
  if (!keep.length || between.some((r) => isAtomic(r) || r.t.trim() || r.t.includes('\n'))) return insertRuns(blocks, sel, runs);
  const spaces = between.map((r): Run => Object.assign({ ...r }, ...keep.map((m) => ({ [m]: true }))));
  return insertRuns(blocks, { anchor: { block: at.block, offset: at.from }, focus: sel.anchor }, [...spaces, ...runs]);
}
