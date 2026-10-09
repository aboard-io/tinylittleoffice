/**
 * A tree: a nested list, the first level its roots. It is the one reader
 * of the outline, the mind map, the org chart and the family tree, so an
 * outline can be dropped onto any of them. The text is TLO (lib/tlo.ts):
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
 * An item's words are inline Markdown. An item may say how it joins its
 * parent: {.from} an arrow from the parent, {.to} an arrow to it, {.both},
 * and label="..." names the line. An embedded document under an item is a
 * fence, {depth=N} saying how far in it sits; a list starts again from the
 * left after a fence, so an item after one says its depth too, until the
 * next top item. Edges ("~ A -> B: name") join any two items by their words.
 */
import { fenceRef, refFence, parse, plain, write, type Attrs, type Block, type Dir } from './tlo.ts';

export type { Dir };

export interface Item {
  depth: number;
  text: string;
  /** The line to the parent: '->' from the parent to this, '<-' back to it, '<->' both; absent, a plain line. */
  dir?: Dir;
  /** The line to the parent: its name. */
  label?: string;
  /** Another document under this item, as a ref: "<app>\n<its text>" (kit/embed.ts). */
  doc?: string;
}

/** A connection between any two items, named by their words. */
export interface Link {
  from: string;
  to: string;
  dir: Dir;
  label?: string;
}


const JOIN: Record<string, Dir> = { from: '->', to: '<-', both: '<->' };
const CLASS: Partial<Record<Dir, string>> = { '->': 'from', '<-': 'to', '<->': 'both' };

/**
 * Loose Markdown as a nested list: a line with no bullet is an item at its
 * own indent, a "•" is a bullet, and a heading is an item with what follows
 * it nested beneath. Fences, edges, rules, tables and the header pass as
 * they are.
 */
function listify(text: string): string {
  const lines = text.replace(/\r\n?/g, '\n').split('\n');
  const levels = lines.map((l) => /^(#{1,6})\s/.exec(l.trim())?.[1].length ?? 9);
  const top = Math.min(...levels);
  const out: string[] = [];
  let pad = '';
  let fence = '';
  let i = 0;
  if (lines[0]?.trim() === '---') {
    const end = lines.findIndex((l, n) => n > 0 && (l.trim() === '---' || l.trim() === '...'));
    if (end > 0 && lines.slice(1, end).every((l) => /^[\w-]+:/.test(l))) out.push(...lines.slice(0, (i = end + 1)));
  }
  for (; i < lines.length; i++) {
    const line = lines[i];
    const t = line.trim();
    // A fenced document passes whole.
    if (fence) {
      out.push(line);
      if (t.startsWith(fence) && !t.replace(/^[`~]+/, '') && t[0] === fence[0]) fence = '';
      continue;
    }
    const open = /^(`{3,}|~{3,})/.exec(t)?.[1];
    if (open) {
      fence = open;
      out.push(line);
      continue;
    }
    const h = /^(#{1,6})\s+(.*)$/.exec(t);
    if (h) {
      const d = h[1].length - top;
      out.push(`${'  '.repeat(d)}- ${h[2]}`);
      pad = '  '.repeat(d + 1);
    } else if (!t || /^~\s/.test(t) || /^\s{0,3}([-*_])(?:\s*\1){2,}\s*$/.test(line) || /^\|?\s*:?-+:?\s*(\|\s*:?-+:?\s*)*\|?$/.test(t) || /^\s*\|?\s*:?-+:?\s*\|/.test(lines[i + 1] ?? '')) out.push(line);
    else {
      const indent = /^[ \t]*/.exec(line)![0].replace(/\t/g, '  ');
      const words = t.replace(/^•\s*/, '- ');
      out.push(pad + indent + (/^(?:[-*+]|\d{1,9}[.)])(?:\s|$)/.test(words) ? words : '- ' + words));
    }
  }
  return out.join('\n');
}

/** The tree in a text, and the edges between its items. */
export function readTree(text: string): { items: Item[]; links: Link[] } {
  const items: Item[] = [];
  const links: Link[] = [];
  const add = (it: Item) => items.push({ ...it, depth: Math.max(0, Math.min(it.depth, (items[items.length - 1]?.depth ?? -1) + 1)) });
  const depthOf = (b: Block) => Number(b.a?.kv?.depth);
  let offset = 0;
  for (const b of parse(listify(text)).blocks) {
    if (b.k === 'li') {
      // After a fence the list starts again from the left: an item that says its depth sets it for those that follow.
      if (Number.isFinite(depthOf(b))) offset = depthOf(b) - b.depth;
      else if (b.depth === 0 && offset) offset = 0;
      const dir = b.a?.cls?.map((c) => JOIN[c]).find(Boolean);
      const label = b.a?.kv?.label;
      add({ depth: b.depth + offset, text: b.text.replace(/\n/g, ' '), ...(dir ? { dir } : {}), ...(label ? { label } : {}) });
    } else if (b.k === 'fence') {
      add({ depth: depthOf(b) || 0, text: '', doc: fenceRef(b) });
      offset = 0;
    } else if (b.k === 'edge') links.push({ from: b.from, to: b.to, dir: b.dir, ...(b.label ? { label: b.label } : {}) });
    else if (b.k === 'p' || b.k === 'h' || b.k === 'quote') for (const line of b.text.split('\n')) add({ depth: 0, text: line });
  }
  return { items: items.length ? items : [{ depth: 0, text: '' }], links };
}

export const parseOutline = (text: string): Item[] => readTree(text).items;
export const parseLinks = (text: string): Link[] => readTree(text).links;

/** The outline as its canonical text: a nested list, its documents fenced, its joins as edges after it. */
export function serializeOutline(items: Item[], links: Link[] = []): string {
  const out = items.slice();
  while (out.length > 1 && !out[out.length - 1].text.trim() && !out[out.length - 1].doc && !out[out.length - 1].label) out.pop();
  const joins = links.filter((l) => l.from !== l.to);
  if (out.length === 1 && !out[0].text.trim() && !out[0].doc && !joins.length) return '';
  const blocks: Block[] = [];
  let fenced = false;
  for (const it of out) {
    if (it.doc) {
      blocks.push({ ...refFence(it.doc), ...(it.depth ? { a: { kv: { depth: String(it.depth) } } } : {}) });
      fenced = true;
      continue;
    }
    if (!it.depth) fenced = false;
    const a: Attrs = {};
    if (it.depth && it.dir && CLASS[it.dir]) a.cls = [CLASS[it.dir]!];
    if (it.depth && it.label) a.kv = { label: it.label };
    if (fenced) a.kv = { ...a.kv, depth: String(it.depth) };
    blocks.push({ k: 'li', depth: it.depth, text: it.text.replace(/\n/g, ' '), ...(a.cls || a.kv ? { a } : {}) });
  }
  for (const l of joins) blocks.push({ k: 'edge', from: l.from, to: l.to, dir: l.dir, ...(l.label ? { label: l.label } : {}) });
  return write({ head: {}, blocks }).trimEnd();
}

/** The joins whose two ends are items of the outline. */
export function liveLinks(items: Item[], links: Link[]): Link[] {
  const known = new Set(items.map((it) => it.text.trim()));
  return links.filter((l) => known.has(l.from) && known.has(l.to));
}

/** The tree as a few lines of plain words, indented. */
export const outlineLines = (text: string): string[] => parseOutline(text).filter((it) => it.text.trim() && !it.doc).map((it) => '  '.repeat(it.depth) + plain(it.text));

/** Loose Markdown (or a tree written any way) as the canonical nested list. */
export function readOutline(text: string): string {
  const { items, links } = readTree(text);
  return serializeOutline(items, links);
}

/** Whether a text is an outline: a list with something under something, and no headings or rules to make it anything else. */
export const nested = (text: string) => {
  const blocks = parse(text).blocks;
  return blocks.some((b) => b.k === 'li' && b.depth > 0) && blocks.every((b) => b.k === 'li' || b.k === 'edge' || b.k === 'fence');
};

/** Text as the plain nested list a mind map or family tree is: no kinds of line, no joins, no documents. */
export const readPlainTree = (text: string) => serializeOutline(readTree(text).items.filter((it) => !it.doc).map(({ depth, text }) => ({ depth, text })));

/** Item i's parent, or -1. */
export function parentOf(items: Item[], i: number): number {
  for (let p = i - 1; p >= 0; p--) if (items[p].depth < items[i].depth) return p;
  return -1;
}

/**
 * The outline as a deck: every item with something under it is a slide,
 * its words the headline and the level just under it the bullets (deeper
 * levels have slides of their own), walked in order to the last leaf; an
 * item that is a document is a slide showing that document. A lone root
 * is the title slide.
 */
export function outlineToDeck(items: Item[]): string {
  const live = items.filter((it) => it.text.trim() || it.doc);
  const roots = live.filter((it) => it.depth === 0);
  const slides: Block[][] = [];
  const kids = (i: number) => live.slice(i + 1, blockEnd(live, i)).filter((it) => it.depth === live[i].depth + 1 && !it.doc);
  live.forEach((it, i) => {
    if (it.doc) return void slides.push([refFence(it.doc)]);
    if (!hasChildren(live, i)) return;
    // A title slide names its parts beneath; elsewhere the family is the bullets, and a child that is a document has a slide to itself after.
    const title = it.depth === 0 && roots.length === 1 && i === 0;
    slides.push([{ k: 'h', level: 2, text: it.text, ...(title ? { a: { cls: ['title'] } } : {}) }, ...kids(i).map((k): Block => ({ k: 'li', depth: 0, text: k.text }))]);
  });
  return write({ head: {}, blocks: slides.flatMap((s, n) => (n ? [{ k: 'hr' } as Block, ...s] : s)) }).trimEnd();
}

/** A name as an edge can hold it: no arrow or colon inside to end it early. */
const edgeName = (t: string) => t.replace(/\s+(?:<->|->|<-|--)\s+/g, ' ').replace(/:\s/g, ' ').replace(/\s+/g, ' ').trim();

/**
 * The outline as a network: every line to a parent and every join, as
 * edges ("~ A -> B: name"), and an item with no line at all as a node on
 * its own. Items are named by their plain words.
 */
export function outlineToNet(items: Item[], links: Link[], plain: (t: string) => string = (t) => t): string {
  const name = (t: string) => edgeName(plain(t));
  const blocks: Block[] = [];
  const edges: Block[] = [];
  items.forEach((it, i) => {
    if (!it.text.trim() || it.doc) return;
    const p = parentOf(items, i);
    if (p < 0) return void (!items.some((_, j) => parentOf(items, j) === i) && blocks.push({ k: 'li', depth: 0, text: name(it.text) }));
    edges.push({ k: 'edge', from: name(items[p].text), to: name(it.text), dir: it.dir ?? '--', ...(it.label ? { label: it.label } : {}) });
  });
  for (const l of links) edges.push({ k: 'edge', from: name(l.from), to: name(l.to), dir: l.dir, ...(l.label ? { label: l.label } : {}) });
  return write({ head: {}, blocks: [...blocks, ...edges] }).trimEnd();
}

/** The outline as an org chart: its people nested, each join a dotted line ("~ A -- B: name"). */
export function outlineToOrg(items: Item[], links: Link[]): string {
  return serializeOutline(
    items.filter((it) => !it.doc).map(({ depth, text }) => ({ depth, text })),
    links.map((l) => ({ ...l, dir: '--' })),
  );
}

/** Where item i's family ends: the first later item no deeper than it. */
export function blockEnd(items: Item[], i: number): number {
  let j = i + 1;
  while (j < items.length && items[j].depth > items[i].depth) j++;
  return j;
}
export const hasChildren = (items: Item[], i: number) => blockEnd(items, i) > i + 1;

/** Indent (by 1) or bring out (by -1) item i with its family; an item can go at most one deeper than the one above it. */
export function shift(items: Item[], i: number, by: 1 | -1): Item[] | null {
  if (by > 0 && (i === 0 || items[i].depth > items[i - 1].depth)) return null;
  if (by < 0 && items[i].depth === 0) return null;
  const end = blockEnd(items, i);
  return items.map((it, n) => (n >= i && n < end ? { ...it, depth: it.depth + by } : it));
}

/** Move item i's family past the family before or after it at its level. */
export function move(items: Item[], i: number, by: 1 | -1): [Item[], number] | null {
  const end = blockEnd(items, i);
  if (by < 0) {
    let p = i - 1;
    while (p >= 0 && items[p].depth > items[i].depth) p--;
    if (p < 0 || items[p].depth < items[i].depth) return null;
    return [[...items.slice(0, p), ...items.slice(i, end), ...items.slice(p, i), ...items.slice(end)], p];
  }
  if (end >= items.length || items[end].depth < items[i].depth) return null;
  const next = blockEnd(items, end);
  return [[...items.slice(0, i), ...items.slice(end, next), ...items.slice(i, end), ...items.slice(next)], i + next - end];
}

/** Put item i's family under item `to` (as its last child), or right after `to`'s family at `to`'s level. */
export function place(items: Item[], i: number, to: number, how: 'under' | 'after'): Item[] | null {
  const end = blockEnd(items, i);
  if (to >= i && to < end) return null;
  const block = items.slice(i, end);
  const rest = [...items.slice(0, i), ...items.slice(end)];
  const at = to < i ? to : to - block.length;
  const target = rest[at];
  if (!target) return null;
  const depth = how === 'under' ? target.depth + 1 : target.depth;
  const d = depth - block[0].depth;
  const moved = block.map((it) => ({ ...it, depth: it.depth + d }));
  const where = blockEnd(rest, at);
  return [...rest.slice(0, where), ...moved, ...rest.slice(where)];
}

/** Take item i away; its family comes out a level to sit where it was. */
export function remove(items: Item[], i: number): Item[] {
  const end = blockEnd(items, i);
  const out = items.flatMap((it, n) => (n === i ? [] : n > i && n < end ? [{ ...it, depth: Math.max(0, it.depth - 1) }] : [it]));
  return out.length ? out : [{ depth: 0, text: '' }];
}

/** The outline as OPML, what every outliner reads. A document is named by its app. */
export function toOpml(items: Item[], title: string): string {
  const esc = (s: string) => s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/"/g, '&quot;');
  let out = '';
  let open = 0;
  items.forEach((it, i) => {
    const kids = hasChildren(items, i);
    out += `${'  '.repeat(it.depth + 2)}<outline text="${esc(it.doc ? it.doc.split('\n')[0] : it.text)}"${kids ? '>' : '/>'}\n`;
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
