/**
 * An outline as a view of the document, and its commands as operations. The document is the kernel's: a
 * nested list, the first level its roots, with two more kinds of block (ported from the old tree's
 * lib/outlinemodel.ts):
 *
 *   - Launch
 *     - Product {.from label="sets"}
 *       - Pricing
 *     - Marketing
 *   ```sheet {depth=1}
 *   ...
 *   ```
 *   ~ Pricing -> Marketing: feeds
 *
 * An item's words are rich text. An item may say how it joins its parent: {.from} an arrow from the parent,
 * {.to} an arrow to it, {.both}, and label="..." names the line. Another document under an item is a fence
 * that says its depth; an item that is one web address is a thing from the web. Edges ("~ A -> B: name") join
 * any two items by their plain words.
 *
 * Read leniently: a text of headings and paragraphs reads as a tree too (a heading is an item with what
 * follows nested beneath it; `listify` is the one splice that makes such a text an outline). Every command
 * is pure: the document and what to do in, the ops out. The family helpers are the kernel's (family,
 * shiftFamily, moveFamily, placeFamily, removeItem, splitBlock); the rest are splices of one block, and
 * `text` ops come from the row's editor.
 */
import { applyAll, attr, family, fenceRef, isAtomic, isText, listNumbers, markNotes, moveFamily, normalRuns, noteNumbers, noteRuns, notesOf, parse, placeFamily, plainText, referenceNotes, refFence, removeItem, runLength, shiftFamily, sliceRuns, write, writeInline, type Attrs, type Block, type Dir, type Doc, type Op, type Run } from '../../doc/index.ts';
import type { TextBlock as PdfBlock } from '../../kit/textpdf.ts';

export type { Dir };

export interface Item {
  /** Where the item's block sits in the document. */
  at: number;
  depth: number;
  /** The words; none for a document. */
  runs: Run[];
  /** Another document under this item, as a ref: "<app>\n<its text>"; "web\n<address>" for a thing from the web. */
  doc?: string;
  /** The line to the parent: '->' from the parent to this, '<-' back to it, '<->' both; absent, a plain line. */
  dir?: Dir;
  /** The line to the parent: its name. */
  label?: string;
  /** Numbered: the item counts in a numbered list with its siblings. */
  ord?: true;
}

/** A connection between any two items, named by their plain words. */
export interface Link {
  at: number;
  from: string;
  to: string;
  dir: Dir;
  label?: string;
  /** Whether both ends name an item of the outline. */
  live: boolean;
}

export interface OutlineView {
  items: Item[];
  links: Link[];
  /** Each block's depth as an item (-1 for one that nests nothing), for the kernel's family helpers. */
  depths: number[];
  /** The document holds words that are not yet items (headings, paragraphs): `listify` makes them so. */
  loose: boolean;
}

const JOIN: Record<string, Dir> = { from: '->', to: '<-', both: '<->' };
const CLASS: Partial<Record<Dir, string>> = { '->': 'from', '<-': 'to', '<->': 'both' };

/** The address an item is, when its words are one web address and nothing else. */
export const webAddress = (runs: Run[]): string | null => (runs.length === 1 && !isAtomic(runs[0]) && /^https?:\/\/\S+$/.test(runs[0].t.trim()) ? runs[0].t.trim() : null);

/** A name as an edge can hold it: no arrow or colon inside to end it early. */
export const edgeName = (s: string): string =>
  s
    .replace(/\s+(?:<->|->|<-|--)\s+/g, ' ')
    .replace(/:\s/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
/** An item's name, as edges name it: its plain words. */
export const nameOf = (runs: Run[]): string => edgeName(plainText(runs));
/** Whether an edge's end names this item (by its plain words, or by its words as written). */
const names = (end: string, runs: Run[]): boolean => end === nameOf(runs) || end === writeInline(runs).trim();

/** The tree in a document, and the edges between its items. */
export function readOutline(doc: Doc): OutlineView {
  const items: Item[] = [];
  const links: Omit<Link, 'live'>[] = [];
  const depths: number[] = doc.blocks.map(() => -1);
  let loose = false;
  const top = Math.min(...doc.blocks.flatMap((b) => (b.k === 'h' ? [b.level] : [])));
  // After a heading, what follows sits beneath it.
  let pad = 0;
  const add = (it: Item) => {
    const depth = Math.max(0, Math.min(it.depth, (items[items.length - 1]?.depth ?? -1) + 1));
    items.push({ ...it, depth });
    depths[it.at] = depth;
  };
  doc.blocks.forEach((b, at) => {
    switch (b.k) {
      case 'li': {
        const url = webAddress(b.runs);
        if (url) return add({ at, depth: pad + b.depth, runs: [], doc: `web\n${url}` });
        const dir = b.a?.cls?.map((c) => JOIN[c]).find(Boolean);
        const label = attr(b, 'label');
        return add({ at, depth: pad + b.depth, runs: b.runs, ...(dir ? { dir } : {}), ...(label ? { label } : {}), ...(b.ord ? { ord: true as const } : {}) });
      }
      case 'fence': {
        const d = Number(attr(b, 'depth'));
        return add({ at, depth: Number.isFinite(d) ? d : pad, runs: [], doc: fenceRef(b) });
      }
      case 'edge':
        return void links.push({ at, from: b.from, to: b.to, dir: b.dir, ...(b.label ? { label: b.label } : {}) });
      case 'h': {
        loose = true;
        const depth = b.level - top;
        add({ at, depth, runs: b.runs });
        pad = depth + 1;
        return;
      }
      case 'p':
      case 'quote': {
        loose = true;
        const url = webAddress(b.runs);
        return add(url ? { at, depth: pad, runs: [], doc: `web\n${url}` } : { at, depth: pad, runs: b.runs });
      }
      case 'img':
        loose = true;
        return add({ at, depth: pad, runs: [], doc: `web\n${b.url}` });
      case 'table':
        loose = true;
        return add({ at, depth: pad, runs: [], doc: `sheet\n${write({ head: {}, blocks: [b] })}` });
      case 'hr':
        loose = true;
        return;
    }
  });
  return { items, links: links.map((l) => ({ ...l, live: items.some((it) => names(l.from, it.runs)) && items.some((it) => names(l.to, it.runs)) })), depths, loose };
}

/** A list item with these words at this depth, its line to the parent as attributes. */
export function itemBlock(depth: number, runs: Run[], dir?: Dir, label?: string, a?: Attrs, ord?: boolean): Block {
  const cls = [...(a?.cls ?? []).filter((c) => !JOIN[c]), ...(depth && dir && CLASS[dir] ? [CLASS[dir]!] : [])];
  const kv = { ...a?.kv };
  delete kv.label;
  delete kv.depth;
  if (depth && label) kv.label = label;
  const attrs: Attrs = { ...(a?.id ? { id: a.id } : {}), ...(cls.length ? { cls } : {}), ...(Object.keys(kv).length ? { kv } : {}) };
  return { k: 'li', depth, ...(ord ? { ord: true as const } : {}), runs, ...(Object.keys(attrs).length ? { a: attrs } : {}) };
}
/** A fence holding another document under an item, saying its depth. */
export const docBlock = (depth: number, ref: string): Block => ({ ...refFence(ref), a: { kv: { depth: String(depth) } } });
/** The item that is a thing from the web: its address as its words. */
export const webBlock = (depth: number, url: string): Block => ({ k: 'li', depth, runs: [{ t: url.trim() }] });

/** The one splice that makes loose words an outline: headings and paragraphs become items (a paragraph's lines each one), edges go last. Nothing for an outline already. */
export function listify(doc: Doc): Op[] {
  const v = readOutline(doc);
  if (!v.loose) return [];
  const blocks: Block[] = [];
  for (const it of v.items) {
    if (it.doc) {
      blocks.push(it.doc.startsWith('web\n') ? webBlock(it.depth, it.doc.slice(4)) : docBlock(it.depth, it.doc));
      continue;
    }
    // A line of a paragraph is an item of its own; marks never cross a line, so the runs cut cleanly.
    const lines: Run[][] = [[]];
    for (const r of it.runs) {
      if (isAtomic(r) || !r.t.includes('\n')) {
        lines[lines.length - 1].push(r);
        continue;
      }
      r.t.split('\n').forEach((t, i) => {
        if (i) lines.push([]);
        if (t) lines[lines.length - 1].push({ ...r, t });
      });
    }
    for (const runs of lines) blocks.push(itemBlock(it.depth, runs, it.dir, it.label, undefined, it.ord));
  }
  for (const l of v.links) blocks.push({ k: 'edge', from: l.from, to: l.to, dir: l.dir, ...(l.label ? { label: l.label } : {}) });
  return [{ op: 'splice', at: 0, n: doc.blocks.length, blocks }];
}

/* ---------- reading the tree ---------- */

/** Item i's parent (an index into items), or -1. */
export function parentOf(items: Item[], i: number): number {
  for (let p = i - 1; p >= 0; p--) if (items[p].depth < items[i].depth) return p;
  return -1;
}
/** Where item i's family ends (an index into items): the first later item no deeper than it. */
export function familyEnd(items: Item[], i: number): number {
  let j = i + 1;
  while (j < items.length && items[j].depth > items[i].depth) j++;
  return j;
}
export const hasChildren = (items: Item[], i: number): boolean => familyEnd(items, i) > i + 1;
/** The item whose block is at `at`, as an index into items; -1 for none. */
export const indexAt = (v: OutlineView, at: number): number => v.items.findIndex((it) => it.at === at);
/** Where the items end and the edges begin: where a new item goes. */
export const itemsEnd = (doc: Doc, v: OutlineView): number => Math.min(doc.blocks.length, ...v.links.map((l) => l.at));

/* ---------- commands ---------- */

/** A fence with no depth of its own is given one first, so the kernel's family helpers can move it. */
function depthed(doc: Doc, v: OutlineView, at: number): Op[] {
  const b = doc.blocks[at];
  if (b?.k !== 'fence' || attr(b, 'depth') !== undefined) return [];
  return [{ op: 'splice', at, n: 1, blocks: [{ ...b, a: { ...b.a, kv: { ...b.a?.kv, depth: String(v.depths[at]) } } }] }];
}
const withPre = (doc: Doc, pre: Op[], then: (d: Doc) => Op[] | null): Op[] | null => {
  const ops = then(applyAll(doc, pre));
  return ops ? [...pre, ...ops] : null;
};

/** Indent (by 1) or bring out (by -1) the item at `at` with its family. */
export const shiftItem = (doc: Doc, v: OutlineView, at: number, by: 1 | -1): Op[] | null => withPre(doc, depthed(doc, v, at), (d) => shiftFamily(d, at, by, v.depths));
/** Move the item at `at` with its family past the family before or after it at its level. */
export const moveItem = (doc: Doc, v: OutlineView, at: number, by: 1 | -1): Op[] | null => moveFamily(doc, at, by, v.depths);
/** Put the item at `at` with its family under the item at `to` (its last child) or right after `to`'s family. */
export const placeItem = (doc: Doc, v: OutlineView, at: number, to: number, how: 'under' | 'after'): Op[] | null => withPre(doc, depthed(doc, v, at), (d) => placeFamily(d, at, to, how, v.depths));
/** Take the item at `at` away; its family comes out a level. */
export const removeAt = (doc: Doc, v: OutlineView, at: number): Op[] => removeItem(doc, at, v.depths);

/** Where an edit leaves the caret: a row's block and the offset in its words. */
export interface Landing {
  ops: Op[];
  at: number;
  offset: number;
}
const isOrd = (b: Block | undefined): boolean => b?.k === 'li' && !!b.ord;
const wordsIn = (b: Block | undefined): number => (b && isText(b) ? runLength(b.runs) : 0);

/**
 * Enter in the row at `at` with the caret at `offset`. At the start of words, an empty item goes in before the row at
 * its depth and the words move down with the caret (the row pushed down). At the end (or on an empty row), a new item:
 * the first child when the row's children are showing, else a sibling after its family. In the middle, the words
 * after the caret go to that new item, in the same place. A numbered row's new sibling is numbered too.
 */
export function enterAt(doc: Doc, v: OutlineView, at: number, offset = Infinity, folded = false): Landing {
  const it = v.items[indexAt(v, at)];
  const b = doc.blocks[at];
  const end = family(doc, at, v.depths);
  const open = end > at + 1 && !folded;
  const len = wordsIn(b);
  if (len > 0 && offset <= 0) return { ops: [{ op: 'splice', at, n: 0, blocks: [itemBlock(it.depth, [], undefined, undefined, undefined, isOrd(b))] }], at: at + 1, offset: 0 };
  const where = open ? at + 1 : end;
  const depth = open ? it.depth + 1 : it.depth;
  const ord = open ? isOrd(doc.blocks[at + 1]) : isOrd(b);
  const cut = len > 0 && offset < len && isText(b);
  const ops: Op[] = cut ? [{ op: 'text', at, from: offset, to: len, runs: [] }] : [];
  ops.push({ op: 'splice', at: where, n: 0, blocks: [itemBlock(depth, cut ? sliceRuns(b.runs, offset, len) : [], undefined, undefined, undefined, ord)] });
  return { ops, at: where, offset: 0 };
}

/** Two rows' words made one: `into`'s block keeps its place and its attributes and takes `from`'s words; `from`'s block alone goes (its children stay where they are). Joins naming `into` follow its new words. */
function join(doc: Doc, into: number, from: number): Landing | null {
  const a = doc.blocks[into];
  const b = doc.blocks[from];
  if (!a || !b || !isText(a) || !isText(b)) return null;
  const joined: Block = { ...a, runs: normalRuns([...a.runs, ...b.runs]) };
  // The later block goes first, so the earlier one's index holds.
  const ops: Op[] = into < from ? [{ op: 'splice', at: from, n: 1, blocks: [] }, { op: 'splice', at: into, n: 1, blocks: [joined] }] : [{ op: 'splice', at: into, n: 1, blocks: [joined] }, { op: 'splice', at: from, n: 1, blocks: [] }];
  const next = applyAll(doc, ops);
  const renames = renameIn(next, readOutline(next), nameOf(a.runs), nameOf(joined.runs));
  return { ops: [...ops, ...renames], at: into < from ? into : into - 1, offset: runLength(a.runs) };
}
/** Backspace at the start of words: the row's words joined to the item before it in the document, the caret at the join. Nothing when that item is a document, or there is none. */
export function joinBack(doc: Doc, v: OutlineView, at: number): Landing | null {
  const i = indexAt(v, at);
  const prev = v.items[i - 1];
  if (i < 1 || prev.doc) return null;
  return join(doc, prev.at, at);
}
/** Delete at the end of words: the next item in the document joined into this row, the caret where it was. Nothing when the next is a document, or there is none. */
export function joinForward(doc: Doc, v: OutlineView, at: number): Landing | null {
  const i = indexAt(v, at);
  const next = v.items[i + 1];
  if (i < 0 || !next || next.doc) return null;
  return join(doc, at, next.at);
}

/** Where block `i` is after these ops: moved with its block, shifted past a splice; -1 when a splice took it (a splice that puts back as many blocks as it took keeps every place). What folds and the zoom are kept by. */
export function mapAt(ops: Op[], i: number): number {
  for (const o of ops) {
    if (i < 0) return -1;
    if (o.op === 'splice') {
      if (i >= o.at + o.n) i += o.blocks.length - o.n;
      else if (i >= o.at && o.blocks.length !== o.n) i = -1;
    } else if (o.op === 'move') {
      if (i >= o.at && i < o.at + o.n) i = o.to + (i - o.at);
      else {
        const rest = i < o.at ? i : i - o.n;
        i = rest < o.to ? rest : rest + o.n;
      }
    }
  }
  return i;
}

/* ---------- a run of rows chosen as nodes ---------- */

/** The blocks some chosen rows cover, [from, to). */
export interface Span {
  from: number;
  to: number;
}
/** The span chosen rows cover: from the first row's block to the end of the furthest family among them (hidden children too); to the end of the document, joins and all, when it holds every item. */
export function spanOf(doc: Doc, v: OutlineView, rows: number[]): Span | null {
  if (!rows.length) return null;
  const from = Math.min(...rows);
  let to = Math.max(...rows.map((at) => family(doc, at, v.depths)));
  if (v.items.length && from <= v.items[0].at && to >= itemsEnd(doc, v)) to = doc.blocks.length;
  return { from, to };
}
/** The items inside a span. */
export const itemsIn = (v: OutlineView, s: Span): Item[] => v.items.filter((it) => it.at >= s.from && it.at < s.to);
/** The items of a span whose parent is outside it: the span's top rows. */
export function topsOf(v: OutlineView, s: Span): Item[] {
  return v.items.filter((it, i) => {
    if (it.at < s.from || it.at >= s.to) return false;
    const p = parentOf(v.items, i);
    return p < 0 || v.items[p].at < s.from;
  });
}
/** A block given a depth: a list item's own, another document's `{depth=N}`; anything else is itself. */
function withDepth(b: Block, depth: number): Block {
  if (b.k === 'li') return b.depth === depth ? b : { ...b, depth };
  if (b.k === 'fence') return attr(b, 'depth') === String(depth) ? b : { ...b, a: { ...b.a, kv: { ...b.a?.kv, depth: String(depth) } } };
  return b;
}
/** The span's blocks, each item stepped by `by` (its depth as read). */
const stepped = (doc: Doc, v: OutlineView, s: Span, by: number): Block[] => doc.blocks.slice(s.from, s.to).map((b, k) => (v.depths[s.from + k] >= 0 ? withDepth(b, v.depths[s.from + k] + by) : b));

/** The span taken away: one splice. */
export const removeSpan = (s: Span): Op[] => [{ op: 'splice', at: s.from, n: s.to - s.from, blocks: [] }];
/**
 * Every item of the span a level in (1) or out (-1): one splice. In needs the first row to have a sibling before it;
 * out needs every item to stay at `floor` or deeper (the zoom's first level).
 */
export function shiftSpan(doc: Doc, v: OutlineView, s: Span, by: 1 | -1, floor = 0): Op[] | null {
  const inside = itemsIn(v, s);
  if (!inside.length) return null;
  const d = inside[0].depth;
  if (by > 0) {
    let p = indexAt(v, inside[0].at) - 1;
    while (p >= 0 && v.items[p].depth > d) p--;
    if (p < 0 || v.items[p].depth !== d) return null;
  } else if (Math.min(...inside.map((it) => it.depth)) - 1 < floor) return null;
  return [{ op: 'splice', at: s.from, n: s.to - s.from, blocks: stepped(doc, v, s, by) }];
}
/** The span moved past the family before it (-1) or after it (1) at its first row's level: one move. */
export function moveSpan(doc: Doc, v: OutlineView, s: Span, by: 1 | -1): Op[] | null {
  const d = v.depths[s.from];
  const n = s.to - s.from;
  if (by < 0) {
    let p = s.from - 1;
    while (p >= 0 && v.depths[p] > d) p--;
    return p < 0 || v.depths[p] !== d ? null : [{ op: 'move', at: s.from, n, to: p }];
  }
  if (s.to >= itemsEnd(doc, v) || v.depths[s.to] !== d) return null;
  return [{ op: 'move', at: s.from, n, to: family(doc, s.to, v.depths) - n }];
}
/** The span's items again, right after it (the joins stay where they are): one splice; the copy starts at `at`. */
export function duplicateSpan(doc: Doc, v: OutlineView, s: Span): { ops: Op[]; at: number } {
  const end = Math.min(s.to, itemsEnd(doc, v));
  return { ops: [{ op: 'splice', at: end, n: 0, blocks: doc.blocks.slice(s.from, end).map((b) => ({ ...b })) }], at: end };
}
/** The span's blocks as a clipboard holds them: the shallowest item at the margin. */
export function copySpan(doc: Doc, v: OutlineView, s: Span): Block[] {
  const ds = v.depths.slice(s.from, s.to).filter((d) => d >= 0);
  return stepped(doc, v, s, ds.length ? -Math.min(...ds) : 0);
}

/** Pasted text as blocks: TLO (and so Markdown); plain lines are a paragraph's lines, each an item once listified. */
export const pasteText = (text: string): Block[] => parse(text.replace(/\r\n?/g, '\n')).blocks;
/** Whether a paste into a row is items rather than words: more than one line, or a line that is a list item. */
export function pastesAsItems(text: string): boolean {
  const lines = text.replace(/\r\n?/g, '\n').split('\n').filter((l) => l.trim());
  return lines.length > 1 || (lines.length === 1 && /^\s*(?:[-*+]|\d+[.)])\s/.test(lines[0]));
}
/**
 * Blocks pasted into the outline: loose words listified, the items rebased to the target's depth, the joins to the
 * end. The target: a span, replaced (at its first row's depth); a row, after its family at its depth (an empty row is
 * replaced); none, the end. Says where the pasted items sit.
 */
export function pasteBlocks(doc: Doc, v: OutlineView, blocks: Block[], target: Span | number | null): { ops: Op[]; from: number; to: number } | null {
  let pasted: Doc = { head: {}, blocks };
  if (readOutline(pasted).loose) pasted = applyAll(pasted, listify(pasted));
  const pv = readOutline(pasted);
  const edges = pasted.blocks.filter((b) => b.k === 'edge');
  if (!pv.items.length && !edges.length) return null;
  let at = itemsEnd(doc, v);
  let n = 0;
  let depth = 0;
  if (target !== null && typeof target === 'object') {
    at = target.from;
    n = target.to - target.from;
    depth = Math.max(0, v.depths[target.from] ?? 0);
  } else if (typeof target === 'number' && indexAt(v, target) >= 0) {
    const it = v.items[indexAt(v, target)];
    const empty = !it.doc && !plainText(it.runs).trim();
    at = empty ? target : family(doc, target, v.depths);
    n = empty ? 1 : 0;
    depth = it.depth;
  }
  const items = pv.items.map((it) => withDepth(pasted.blocks[it.at], it.depth + depth));
  const ops: Op[] = [{ op: 'splice', at, n, blocks: items }];
  if (edges.length) ops.push({ op: 'splice', at: doc.blocks.length - n + items.length, n: 0, blocks: edges });
  return { ops, from: at, to: at + items.length };
}

/* ---------- numbered lists ---------- */

/** The list an item belongs to: the items at its depth under its parent (documents aside). */
export function siblingsOf(v: OutlineView, at: number): number[] {
  const i = indexAt(v, at);
  if (i < 0) return [];
  const d = v.items[i].depth;
  const p = parentOf(v.items, i);
  return v.items
    .slice(p + 1, p >= 0 ? familyEnd(v.items, p) : v.items.length)
    .filter((it) => it.depth === d && !it.doc)
    .map((it) => it.at);
}
/** These items numbered (or not): a splice for each list item that changes. */
export function setOrdered(doc: Doc, ats: number[], on: boolean): Op[] {
  const ops: Op[] = [];
  for (const at of ats) {
    const b = doc.blocks[at];
    if (b?.k !== 'li' || !!b.ord === on) continue;
    const { ord: _, ...rest } = b;
    ops.push({ op: 'splice', at, n: 1, blocks: [on ? { ...rest, ord: true } : rest] });
  }
  return ops;
}
/** Numbered or not, the list these items make: numbered unless every one of them already is. */
export const toggleOrdered = (doc: Doc, ats: number[]): Op[] => setOrdered(doc, ats, !ats.every((at) => isOrd(doc.blocks[at])));

/** An empty item at the end of the outline, at this depth. */
export function appendItem(doc: Doc, v: OutlineView, depth = 0): { ops: Op[]; at: number } {
  const at = itemsEnd(doc, v);
  return { ops: [{ op: 'splice', at, n: 0, blocks: [itemBlock(depth, [])] }], at };
}

/** The item's line to its parent: its kind and its name, as the item's attributes. */
export function setLine(doc: Doc, v: OutlineView, at: number, line: { dir?: Dir; label?: string }): Op[] {
  const b = doc.blocks[at];
  const i = indexAt(v, at);
  if (b?.k !== 'li' || i < 0) return [];
  const it = v.items[i];
  const dir = 'dir' in line ? line.dir : it.dir;
  const label = 'label' in line ? line.label?.trim() || undefined : it.label;
  const next = itemBlock(b.depth, b.runs, dir === '--' ? undefined : dir, label, b.a, b.ord);
  return write({ head: {}, blocks: [next] }) === write({ head: {}, blocks: [b] }) ? [] : [{ op: 'splice', at, n: 1, blocks: [next] }];
}

/** A document under the item at `after` (or at the end): a fence saying its depth, after the item's family. */
export function insertDoc(doc: Doc, v: OutlineView, after: number, ref: string): { ops: Op[]; at: number } {
  const i = indexAt(v, after);
  const at = i < 0 ? itemsEnd(doc, v) : family(doc, after, v.depths);
  const depth = i < 0 ? 0 : v.items[i].depth;
  return { ops: [{ op: 'splice', at, n: 0, blocks: [ref.startsWith('web\n') ? webBlock(depth, ref.slice(4)) : docBlock(depth, ref)] }], at };
}
/** The document under an item replaced by another text of the same app. */
export function setDoc(doc: Doc, at: number, ref: string): Op[] {
  const b = doc.blocks[at];
  if (b?.k !== 'fence') return [];
  return [{ op: 'splice', at, n: 1, blocks: [{ ...refFence(ref), ...(b.a ? { a: b.a } : {}) }] }];
}

/** A join between two items, by their words; nothing when they are the same item or already joined. */
export function connect(doc: Doc, v: OutlineView, from: number, to: number): Op[] {
  const a = v.items[indexAt(v, from)];
  const b = v.items[indexAt(v, to)];
  if (!a || !b || a.doc || b.doc) return [];
  const [f, t] = [nameOf(a.runs), nameOf(b.runs)];
  if (!f || !t || f === t || v.links.some((l) => (l.from === f && l.to === t) || (l.from === t && l.to === f))) return [];
  return [{ op: 'splice', at: doc.blocks.length, n: 0, blocks: [{ k: 'edge', from: f, to: t, dir: '--' }] }];
}
/** A join's kind or name changed. */
export function setLink(doc: Doc, at: number, patch: { dir?: Dir; label?: string }): Op[] {
  const b = doc.blocks[at];
  if (b?.k !== 'edge') return [];
  const label = 'label' in patch ? patch.label?.trim() : b.label;
  const next: Block = { k: 'edge', from: b.from, to: b.to, dir: patch.dir ?? b.dir, ...(label ? { label } : {}), ...(b.a ? { a: b.a } : {}) };
  return [{ op: 'splice', at, n: 1, blocks: [next] }];
}
/** A join taken away. */
export const unlink = (doc: Doc, at: number): Op[] => (doc.blocks[at]?.k === 'edge' ? [{ op: 'splice', at, n: 1, blocks: [] }] : []);

/** Joins name items by their words, so they follow a renamed item: the edges that named `was` now name `now` (when no other item still has the old name). */
export function renameIn(doc: Doc, v: OutlineView, was: string, now: string): Op[] {
  if (!was || was === now || v.items.some((it) => !it.doc && nameOf(it.runs) === was)) return [];
  const ops: Op[] = [];
  for (const l of v.links) {
    if (l.from !== was && l.to !== was) continue;
    const b = doc.blocks[l.at];
    if (b?.k !== 'edge') continue;
    ops.push({ op: 'splice', at: l.at, n: 1, blocks: [{ ...b, from: l.from === was ? now : l.from, to: l.to === was ? now : l.to }] });
  }
  return ops;
}

/* ---------- the outline as other things ---------- */

/** The items that say something: words, or a document. */
export const liveItems = (v: OutlineView): Item[] => v.items.filter((it) => plainText(it.runs).trim() || it.doc);
/** The joins whose two ends are items of the outline. */
export const liveLinks = (v: OutlineView): Link[] => v.links.filter((l) => l.live);

/** What an item holds in words, for a card or a listing: the app's name and the first line of the document (a thing from the web: its address). */
export function docGist(ref: string): { app: string; gist: string } {
  const nl = ref.indexOf('\n');
  const app = nl < 0 ? ref : ref.slice(0, nl);
  const body = nl < 0 ? '' : ref.slice(nl + 1);
  if (app === 'web') return { app, gist: body.trim() };
  const gist = body.split('\n').find((l) => l.trim() && !/^---/.test(l) && !/^[a-z]+:/.test(l)) ?? '';
  return { app, gist: gist.trim() };
}

/* ---------- footnotes in the files: a sub-item each, right under the item ---------- */

/**
 * An item's words with each footnote's mark written as "[k]" (k counting the item's own notes from 1), and the notes'
 * words in that order (inline Markdown, as the document keeps them). The files put each note right under its item, as
 * the first of its children, so the note travels with the idea it is about.
 */
export function notesApart(runs: Run[]): { runs: Run[]; notes: string[] } {
  const notes: string[] = [];
  const out = runs.map((r) => (r.fn === undefined ? r : (notes.push(r.fn), { t: `[${notes.length}]` })));
  return { runs: notes.length ? normalRuns(out) : runs, notes };
}
const oneLine = (s: string) => s.replace(/\s+/g, ' ').trim();
/** A note's words, plain. */
const notePlain = (fn: string) => oneLine(plainText(noteRuns(fn)));

/**
 * The document for Markdown: each item's notes made numbered items right under it, first among its children ("1. the
 * note", numbered as the outline's writer numbers a list), the marks in its words "[1]"; any other note (on a heading
 * or a paragraph) in Markdown's reference form at the end. The document itself keeps the inline form.
 */
export function notesAsItems(doc: Doc): Doc {
  if (!doc.blocks.some((b) => b.k === 'li' && b.runs.some((r) => r.fn !== undefined))) return referenceNotes(doc);
  const blocks = doc.blocks.flatMap((b): Block[] => {
    if (b.k !== 'li') return [b];
    const { runs, notes } = notesApart(b.runs);
    if (!notes.length) return [b];
    return [{ ...b, runs }, ...notes.map((fn): Block => ({ k: 'li', depth: b.depth + 1, ord: true, runs: noteRuns(fn) }))];
  });
  return referenceNotes({ head: doc.head, blocks });
}

/**
 * The outline as plain text: an item a line, "- " before it, "1. " and on for a numbered one, two spaces a level, a
 * document under an item as "- [App] its first line". Empty items are left out. An item's footnotes are lines right
 * under it, numbered "1. ", "2. " (the marks in its words "[1]", "[2]"). `appName` says an app's name.
 */
export function outlineText(v: OutlineView, appName: (id: string) => string = (id) => id): string {
  const count = listNumbers();
  const lines: string[] = [];
  for (const it of v.items) {
    const pad = '  '.repeat(it.depth);
    if (it.doc) {
      count({ k: 'hr' });
      const { app, gist } = docGist(it.doc);
      lines.push(`${pad}- [${appName(app)}] ${gist}`.trimEnd());
      continue;
    }
    const { runs, notes } = notesApart(it.runs);
    const words = oneLine(plainText(runs));
    if (!words) continue;
    const n = count({ k: 'li', depth: it.depth, ...(it.ord ? { ord: true as const } : {}), runs: [] });
    lines.push(`${pad}${n ? `${n}.` : '-'} ${words}`);
    notes.forEach((fn, k) => lines.push(`${pad}  ${k + 1}. ${notePlain(fn)}`));
  }
  return lines.length ? lines.join('\n') + '\n' : '';
}

/** The plain nested list a mind map or a family tree is: no kinds of line, no joins, no documents. */
export const plainTree = (v: OutlineView): Block[] => v.items.filter((it) => !it.doc).map((it) => itemBlock(it.depth, it.runs, undefined, undefined, undefined, it.ord));

/**
 * The outline as a deck: every item with something under it is a slide, its
 * words the headline and the level just under it the bullets (deeper levels
 * have slides of their own), walked in order to the last leaf; an item that
 * is a document is a slide showing that document. A lone root is the title
 * slide.
 */
export function outlineToDeck(v: OutlineView, head: Doc['head'] = {}): string {
  const live = liveItems(v);
  const roots = live.filter((it) => it.depth === 0);
  const slides: Block[][] = [];
  const kids = (i: number) => live.slice(i + 1, familyEnd(live, i)).filter((it) => it.depth === live[i].depth + 1 && !it.doc);
  live.forEach((it, i) => {
    if (it.doc) return void slides.push([it.doc.startsWith('web\n') ? { k: 'p', runs: [{ t: it.doc.slice(4) }] } : refFence(it.doc)]);
    if (!hasChildren(live, i)) return;
    const title = it.depth === 0 && roots.length === 1 && i === 0;
    slides.push([{ k: 'h', level: 2, runs: it.runs, ...(title ? { a: { cls: ['title'] } } : {}) }, ...kids(i).map((k): Block => ({ k: 'li', depth: 0, ...(k.ord ? { ord: true as const } : {}), runs: k.runs }))]);
  });
  return write({ head: head.title ? { title: head.title } : {}, blocks: slides.flatMap((s, n) => (n ? [{ k: 'hr' } as Block, ...s] : s)) });
}

/**
 * The outline as a network: every line to a parent and every join, as edges,
 * and an item with no line at all as a node on its own. Items are named by
 * their plain words.
 */
export function outlineToNet(v: OutlineView, head: Doc['head'] = {}): string {
  const items = v.items;
  const nodes: Block[] = [];
  const edges: Block[] = [];
  items.forEach((it, i) => {
    if (!plainText(it.runs).trim() || it.doc) return;
    const p = parentOf(items, i);
    if (p < 0) return void (!items.some((_, j) => parentOf(items, j) === i) && nodes.push({ k: 'li', depth: 0, runs: [{ t: nameOf(it.runs) }] }));
    edges.push({ k: 'edge', from: nameOf(items[p].runs), to: nameOf(it.runs), dir: it.dir ?? '--', ...(it.label ? { label: it.label } : {}) });
  });
  for (const l of liveLinks(v)) edges.push({ k: 'edge', from: l.from, to: l.to, dir: l.dir, ...(l.label ? { label: l.label } : {}) });
  return write({ head: { ...(head.title ? { title: head.title } : {}), kind: 'net' }, blocks: [...nodes, ...edges] });
}

/** The outline as an org chart: its people nested, each join a dotted line. */
export function outlineToOrg(v: OutlineView, head: Doc['head'] = {}): string {
  const edges: Block[] = liveLinks(v).map((l) => ({ k: 'edge', from: l.from, to: l.to, dir: '--', ...(l.label ? { label: l.label } : {}) }));
  return write({ head: { ...(head.title ? { title: head.title } : {}), kind: 'org' }, blocks: [...plainTree(v), ...edges] });
}

/** The outline as a mind map: the plain tree. */
export const outlineToMind = (v: OutlineView, head: Doc['head'] = {}): string => write({ head: { ...(head.title ? { title: head.title } : {}), kind: 'mind' }, blocks: plainTree(v) });

/**
 * The outline as OPML, what every outliner reads. A document is named by its app. An item's footnotes are outlines
 * right under it, first among its children, each its mark and its words ("[1] the note"); the marks stay in its words.
 */
export function toOpml(v: OutlineView, title: string): string {
  const esc = (s: string) => s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/"/g, '&quot;');
  const items = liveItems(v);
  let out = '';
  let open = 0;
  items.forEach((it, i) => {
    const { runs, notes } = it.doc ? { runs: it.runs, notes: [] } : notesApart(it.runs);
    const kids = hasChildren(items, i);
    const pad = '  '.repeat(it.depth + 2);
    out += `${pad}<outline text="${esc(it.doc ? it.doc.split('\n')[0] : plainText(runs))}"${kids || notes.length ? '>' : '/>'}\n`;
    for (const [k, fn] of notes.entries()) out += `${pad}  <outline text="${esc(`[${k + 1}] ${notePlain(fn)}`)}"/>\n`;
    if (notes.length && !kids) out += `${pad}</outline>\n`;
    if (kids) open++;
    // Close the families this item ends.
    const until = items[i + 1]?.depth ?? 0;
    for (let d = it.depth; d > until; d--) {
      out += `${'  '.repeat(d + 1)}</outline>\n`;
      open--;
    }
  });
  while (open-- > 0) out += `  </outline>\n`;
  return `<?xml version="1.0" encoding="UTF-8"?>\n<opml version="2.0">\n  <head><title>${esc(title)}</title></head>\n  <body>\n${out}  </body>\n</opml>\n`;
}

/* ---------- the text PDF: sections and bullets ---------- */

/**
 * The outline as the text PDF lays it out (kit/textpdf.ts): a lone top item is the title and its children
 * the sections; otherwise the document's title heads it and the top items are the sections. Deeper items are
 * bullets; an item holding a document is that document's app and first line, in brackets; the notes follow,
 * numbered as their marks came. (The old tree's outlineBlocks.)
 */
export function outlineBlocks(v: OutlineView, docTitle = '', notesHeading = 'Notes'): PdfBlock[] {
  const all = liveItems(v);
  const roots = all.filter((it) => it.depth === 0);
  const lone = roots.length === 1;
  const base = lone ? 1 : 0;
  const next = noteNumbers();
  const words = (it: Item): PdfBlock['runs'] => {
    if (it.doc) {
      const { app, gist } = docGist(it.doc);
      return [{ t: `[${app}${gist ? ': ' + gist : ''}]`, i: true }];
    }
    return [...(it.label ? [{ t: `${it.label} — `, i: true as const }] : []), ...markNotes(it.runs, next)];
  };
  const out: PdfBlock[] = [];
  const title = lone ? plainText(roots[0].runs).trim() : docTitle;
  if (title) out.push({ kind: 'title', runs: [{ t: title }] });
  for (const it of all) {
    if (lone && it.depth === 0) continue;
    out.push(it.depth === base ? { kind: 'h', runs: words(it) } : { kind: 'li', depth: Math.max(0, it.depth - base - 1), runs: words(it) });
  }
  const notes = notesOf(all.filter((it) => !it.doc));
  if (notes.length) {
    out.push({ kind: 'h', runs: [{ t: notesHeading }] });
    notes.forEach((fn, i) => out.push({ kind: 'p', runs: [{ t: `${i + 1}`, sup: true }, { t: ' ' }, ...noteRuns(fn)] }));
  }
  return out;
}
