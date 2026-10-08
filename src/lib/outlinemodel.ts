/**
 * An outline: lines, each as deep as its indent (two spaces, or a tab, a
 * level). The same text an org chart, a mind map or a family tree reads, so
 * an outline can be dropped onto any of them. Marks are Write's inline ones
 * (*bold*, _italic_, =highlight=, :icon:).
 *
 * The line from an item to its parent can have a kind and a name, written
 * before the item's words: "-> Pricing" points from the parent to it,
 * "<- Pricing" from it to the parent, "<-> Pricing" both ways, and a name
 * goes in brackets: "-(sets)-> Pricing", "-(part of)- Pricing". Nothing
 * written is a plain line.
 *
 * Lines starting "~ " join any two items, whatever their places, named by
 * their words: "~ Pricing -(feeds)-> Press". They come after the items.
 */
/** Which way a connection points: '-' neither, '>' parent to child (or from to to), '<' back, '<>' both. */
export type Dir = '-' | '>' | '<' | '<>';
export const DIRS: Dir[] = ['-', '>', '<', '<>'];

export interface Item {
  depth: number;
  text: string;
  /** The line to the parent: which way it points (absent: neither). */
  dir?: Dir;
  /** The line to the parent: its name. */
  label?: string;
}

/** A connection between any two items, named by their words. */
export interface Link {
  from: string;
  to: string;
  dir: Dir;
  label?: string;
}

/** A connection written: '' for a plain unnamed line, else "->", "-(name)-", "<-(name)->" and so on. */
export function edgeText(dir: Dir = '-', label = ''): string {
  if (dir === '-' && !label) return '';
  const name = label ? `(${label.replace(/[()]/g, '')})-` : '';
  return `${dir === '<' || dir === '<>' ? '<' : ''}-${name}${dir === '>' || dir === '<>' ? '>' : ''}`;
}
const EDGE = /(<)?-(?:\(([^()]*)\)-)?(>)?/;
const dirOf = (lt?: string, gt?: string): Dir => (lt && gt ? '<>' : lt ? '<' : gt ? '>' : '-');

/** An item's words with any connection written before them taken off. */
function readEdge(line: string): Pick<Item, 'text' | 'dir' | 'label'> {
  const m = new RegExp('^' + EDGE.source + '(?=\\s|$)\\s*').exec(line);
  if (!m || (!m[1] && !m[2] && !m[3])) return { text: line };
  const out: Pick<Item, 'text' | 'dir' | 'label'> = { text: line.slice(m[0].length) };
  const dir = dirOf(m[1], m[3]);
  if (dir !== '-') out.dir = dir;
  if (m[2]?.trim()) out.label = m[2].trim();
  return out;
}

/** The "~ A -> B" lines of an outline. */
export function parseLinks(text: string): Link[] {
  const out: Link[] = [];
  for (const line of text.replace(/\r\n?/g, '\n').split('\n')) {
    if (!line.startsWith('~ ')) continue;
    const m = new RegExp('\\s' + EDGE.source + '\\s').exec(line.slice(2));
    if (!m) continue;
    const from = line.slice(2, 2 + m.index).trim();
    const to = line.slice(2 + m.index + m[0].length).trim();
    if (from && to) out.push({ from, to, dir: dirOf(m[1], m[3]), ...(m[2]?.trim() ? { label: m[2].trim() } : {}) });
  }
  return out;
}

export const linkLine = (l: Link) => `~ ${l.from} ${edgeText(l.dir, l.label) || '-'} ${l.to}`;

export function parseOutline(text: string): Item[] {
  if (!text.trim()) return [{ depth: 0, text: '' }];
  const items: Item[] = [];
  for (const raw of text.replace(/\r\n?/g, '\n').split('\n')) {
    if (raw.startsWith('~ ')) continue;
    const indent = /^[ \t]*/.exec(raw)![0];
    const depth = Math.floor(indent.replace(/\t/g, '  ').length / 2);
    // A Markdown bullet is forgiven, so lists paste in as they are.
    const line = raw.slice(indent.length).replace(/^(?:[-*+•]|\d+[.)])\s+/, '');
    items.push({ depth: Math.min(depth, (items[items.length - 1]?.depth ?? -1) + 1), ...readEdge(line) });
  }
  return items.length ? items : [{ depth: 0, text: '' }];
}

/** An item that is another document: its text is exactly "@@<app>/<payload>". */
export const embedOf = (text: string): string | null => /^@@([a-z]+\/[A-Za-z0-9_-]*)$/.exec(text.trim())?.[1] ?? null;

/**
 * The outline as a deck: every item with something under it is a slide,
 * its words the headline and the level just under it the bullets (deeper
 * levels have slides of their own), walked in order to the last leaf; an
 * item that is a document is a slide showing that document. A lone root
 * is the title slide.
 */
export function outlineToDeck(items: Item[]): string {
  const live = items.filter((it) => it.text.trim());
  const roots = live.filter((it) => it.depth === 0);
  const slides: string[] = [];
  const kids = (i: number) => live.slice(i + 1, blockEnd(live, i)).filter((it) => it.depth === live[i].depth + 1).map((it) => it.text);
  live.forEach((it, i) => {
    const sub = embedOf(it.text);
    if (sub) return void slides.push(`${it.depth === 0 && roots.length === 1 ? '::t\n' : ''}${' '}\n@@${sub}`);
    if (!hasChildren(live, i)) return;
    const title = it.depth === 0 && roots.length === 1 && i === 0;
    // A title slide names its parts beneath; elsewhere the family is the bullets, and a child that is a document has a slide to itself after.
    const body = kids(i).filter((b) => !embedOf(b.trim()));
    slides.push((title ? '::t\n' : '') + it.text + (body.length ? '\n' + body.join('\n') : ''));
  });
  return slides.join('\n\n');
}

export function serializeOutline(items: Item[], links: Link[] = []): string {
  const out = items.slice();
  while (out.length > 1 && !out[out.length - 1].text.trim() && !out[out.length - 1].label) out.pop();
  const known = new Set(out.map((it) => it.text.trim()));
  const joins = links.filter((l) => known.has(l.from) && known.has(l.to) && l.from !== l.to);
  if (out.length === 1 && !out[0].text.trim() && !joins.length) return '';
  const line = (it: Item) => {
    const edge = it.depth > 0 ? edgeText(it.dir, it.label) : '';
    return '  '.repeat(it.depth) + (edge ? edge + ' ' : '') + it.text.replace(/\n/g, ' ');
  };
  return [...out.map(line), ...joins.map(linkLine)].join('\n');
}

/** The outline as the plain indented text a mind map or family tree reads: no kinds of line, no joins. */
export function plainOutline(items: Item[]): string {
  return serializeOutline(items.map(({ depth, text }) => ({ depth, text })));
}

/** Item i's parent, or -1. */
export function parentOf(items: Item[], i: number): number {
  for (let p = i - 1; p >= 0; p--) if (items[p].depth < items[i].depth) return p;
  return -1;
}

/**
 * The outline as a network: every line to a parent and every join,
 * "A > B: name" for an arrow, "A - B" for a plain line, both ways as
 * "A <-> B". Items are named by their plain words.
 */
export function outlineToNet(items: Item[], links: Link[], plain: (t: string) => string = (t) => t): string {
  const name = (t: string) => plain(t).replace(/\s*[:>]\s*/g, ' ').replace(/\s+-\s+/g, ' ').trim();
  const arrow = (a: string, b: string, dir: Dir, label?: string) =>
    (dir === '<' ? `${b} > ${a}` : `${a} ${dir === '>' ? '>' : dir === '<>' ? '<->' : '-'} ${b}`) + (label ? `: ${label}` : '');
  const lines: string[] = [];
  items.forEach((it, i) => {
    if (!it.text.trim() || embedOf(it.text)) return;
    const p = parentOf(items, i);
    if (p < 0) return void (!items.some((_, j) => parentOf(items, j) === i) && lines.push(name(it.text)));
    lines.push(arrow(name(items[p].text), name(it.text), it.dir ?? '-', it.label));
  });
  for (const l of links) lines.push(arrow(name(l.from), name(l.to), l.dir, l.label));
  return lines.join('\n');
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

/** The outline as OPML, what every outliner reads. */
export function toOpml(items: Item[], title: string): string {
  const esc = (s: string) => s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/"/g, '&quot;');
  let out = '';
  let open = 0;
  items.forEach((it, i) => {
    const kids = hasChildren(items, i);
    out += `${'  '.repeat(it.depth + 2)}<outline text="${esc(it.text)}"${kids ? '>' : '/>'}\n`;
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
