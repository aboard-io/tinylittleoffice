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
import { applyAll, attr, family, fenceRef, isAtomic, moveFamily, placeFamily, plainText, refFence, removeItem, runLength, shiftFamily, splitBlock, write, writeInline, type Attrs, type Block, type Dir, type Doc, type Op, type Run } from '../../doc/index.ts';

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
        return add({ at, depth: pad + b.depth, runs: b.runs, ...(dir ? { dir } : {}), ...(label ? { label } : {}) });
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
export function itemBlock(depth: number, runs: Run[], dir?: Dir, label?: string, a?: Attrs): Block {
  const cls = [...(a?.cls ?? []).filter((c) => !JOIN[c]), ...(depth && dir && CLASS[dir] ? [CLASS[dir]!] : [])];
  const kv = { ...a?.kv };
  delete kv.label;
  delete kv.depth;
  if (depth && label) kv.label = label;
  const attrs: Attrs = { ...(a?.id ? { id: a.id } : {}), ...(cls.length ? { cls } : {}), ...(Object.keys(kv).length ? { kv } : {}) };
  return { k: 'li', depth, runs, ...(Object.keys(attrs).length ? { a: attrs } : {}) };
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
    for (const runs of lines) blocks.push(itemBlock(it.depth, runs, it.dir, it.label));
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

/**
 * Enter on the item at `at`: a new item. With children showing, the first of
 * them; a leaf split at the caret (the words after it go to the new item);
 * else an empty item after the family. Returns where the new item's block
 * sits.
 */
export function newItem(doc: Doc, v: OutlineView, at: number, offset?: number, folded = false): { ops: Op[]; at: number } {
  const i = indexAt(v, at);
  const it = v.items[i];
  const end = family(doc, at, v.depths);
  const kids = end > at + 1;
  if (kids && !folded) return { ops: [{ op: 'splice', at: at + 1, n: 0, blocks: [itemBlock(it.depth + 1, [])] }], at: at + 1 };
  if (!kids && !it.doc && offset !== undefined && offset < runLength(it.runs)) return { ops: splitBlock(doc, at, offset), at: at + 1 };
  return { ops: [{ op: 'splice', at: end, n: 0, blocks: [itemBlock(it.depth, [])] }], at: end };
}
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
  const next = itemBlock(b.depth, b.runs, dir === '--' ? undefined : dir, label, b.a);
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

/** The tree as a few lines of plain words, indented. */
export const outlineLines = (v: OutlineView): string[] => v.items.filter((it) => plainText(it.runs).trim() && !it.doc).map((it) => '  '.repeat(it.depth) + plainText(it.runs).trim());

/** The plain nested list a mind map or a family tree is: no kinds of line, no joins, no documents. */
export const plainTree = (v: OutlineView): Block[] => v.items.filter((it) => !it.doc).map((it) => itemBlock(it.depth, it.runs));

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
    slides.push([{ k: 'h', level: 2, runs: it.runs, ...(title ? { a: { cls: ['title'] } } : {}) }, ...kids(i).map((k): Block => ({ k: 'li', depth: 0, runs: k.runs }))]);
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

/** The outline as OPML, what every outliner reads. A document is named by its app. */
export function toOpml(v: OutlineView, title: string): string {
  const esc = (s: string) => s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/"/g, '&quot;');
  const items = liveItems(v);
  let out = '';
  let open = 0;
  items.forEach((it, i) => {
    const kids = hasChildren(items, i);
    out += `${'  '.repeat(it.depth + 2)}<outline text="${esc(it.doc ? it.doc.split('\n')[0] : plainText(it.runs))}"${kids ? '>' : '/>'}\n`;
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
