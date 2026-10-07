/**
 * An outline: lines, each as deep as its indent (two spaces, or a tab, a
 * level). The same text an org chart, a mind map or a family tree reads, so
 * an outline can be dropped onto any of them. Marks are Write's inline ones
 * (*bold*, _italic_, =highlight=, :icon:).
 */
export interface Item {
  depth: number;
  text: string;
}

export function parseOutline(text: string): Item[] {
  if (!text.trim()) return [{ depth: 0, text: '' }];
  const items: Item[] = [];
  for (const raw of text.replace(/\r\n?/g, '\n').split('\n')) {
    const indent = /^[ \t]*/.exec(raw)![0];
    const depth = Math.floor(indent.replace(/\t/g, '  ').length / 2);
    // A Markdown bullet is forgiven, so lists paste in as they are.
    const line = raw.slice(indent.length).replace(/^(?:[-*+•]|\d+[.)])\s+/, '');
    items.push({ depth: Math.min(depth, (items[items.length - 1]?.depth ?? -1) + 1), text: line });
  }
  return items;
}

/** An item that is another document: its text is exactly "@@<app>/<payload>". */
export const embedOf = (text: string): string | null => /^@@([a-z]+\/[A-Za-z0-9_-]*)$/.exec(text.trim())?.[1] ?? null;

/**
 * The outline as a deck: every item with something under it is a slide
 * (its words the headline, its family the bullets, nested as deep as a
 * slide nests), walked in order to the last leaf; an item that is a
 * document is a slide showing that document. A lone root is the title slide.
 */
export function outlineToDeck(items: Item[]): string {
  const live = items.filter((it) => it.text.trim());
  const roots = live.filter((it) => it.depth === 0);
  const slides: string[] = [];
  const kids = (i: number) => {
    const end = blockEnd(live, i);
    return live.slice(i + 1, end).map((it) => '  '.repeat(Math.min(3, it.depth - live[i].depth - 1)) + (embedOf(it.text) ? it.text.replace(/^@@.*$/, (m) => m) : it.text));
  };
  live.forEach((it, i) => {
    const sub = embedOf(it.text);
    if (sub) return void slides.push(`${it.depth === 0 && roots.length === 1 ? '::t\n' : ''}${' '}\n@@${sub}`);
    if (!hasChildren(live, i)) return;
    const title = it.depth === 0 && roots.length === 1 && i === 0;
    // A title slide names its parts beneath; elsewhere the family is the bullets, and a child that is a document has a slide to itself after.
    const body = kids(i).filter((b) => !embedOf(b.trim()) && (!title || !b.startsWith('  ')));
    slides.push((title ? '::t\n' : '') + it.text + (body.length ? '\n' + body.join('\n') : ''));
  });
  return slides.join('\n\n');
}

export function serializeOutline(items: Item[]): string {
  const out = items.slice();
  while (out.length > 1 && !out[out.length - 1].text.trim()) out.pop();
  if (out.length === 1 && !out[0].text.trim()) return '';
  return out.map((it) => '  '.repeat(it.depth) + it.text.replace(/\n/g, ' ')).join('\n');
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
