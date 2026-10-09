/**
 * A diagram as a view of the document, and its commands as operations. One app, eight kinds, named by the
 * head's `kind:` field; every kind is written as list items (and, for two of them, connections), as the old
 * tree's eight diagram apps wrote them:
 *
 *   mind, org, family   a nested list: an idea and its branches; "Name | Role" under who they report to;
 *                       "Ada + Charles | 1815" over their children. Org's "~ A -- B: advises" is a dotted line.
 *   lanes               "- Who: what they do", a step a line, in order; a step ending in "?" is a decision.
 *   timeline            "- When: what happened"; a span ("1990–1999") is an era, a band along the line.
 *   venn                "- Set: thing, thing"; "- A & B: what they share".
 *   seating             "- Table: Ann, Bob, Cy", seated round it in that order.
 *   net                 "- Thing" on its own, and "~ A -> B: label" or "~ A -- B" between two things.
 *
 * A line's words are rich text: an icon among them (`:rocket:`) is drawn on the thing. Where a line has a
 * key ("Sales: …", "Top table: …") the key is the words before the first ": ".
 *
 * Every command is pure: the document and what to do in, the `Op[]` out. A line edited is `text` ops on its
 * item (from the line editor, plus the follow-ups when a name others refer to changes); a thing added is a
 * `splice` of an item (or, for one thing more in a list, a `text` op on that list's line); a thing moved is
 * `move` (a family by the kernel's `placeFamily`) or the `text` ops that take it out of one list and put it
 * in another; a connection is a `splice` of an edge block; the kind is a `head` op.
 */
import { apply, family, isAtomic, normalRuns, placeFamily, removeItem, sliceRuns, type Block, type Dir, type Doc, type Op, type Run } from '../../doc/index.ts';

export const KINDS = ['mind', 'org', 'family', 'lanes', 'timeline', 'venn', 'seating', 'net'] as const;
export type KindId = (typeof KINDS)[number];

/** The document's kind; a document that names none is a mind map. */
export const kindOf = (doc: Doc): KindId => {
  const k = (doc.head.kind ?? '').trim().toLowerCase();
  return (KINDS as readonly string[]).includes(k) ? (k as KindId) : 'mind';
};
/** Kinds that are a tree: an item's place is under its parent. */
export const isTree = (k: KindId) => k === 'mind' || k === 'org' || k === 'family';
/** Kinds whose line holds a list of things after its key: the people at a table, the things in a set. */
export const isListed = (k: KindId) => k === 'venn' || k === 'seating';
/** Kinds whose things may be joined by a connection of their own. */
export const joins = (k: KindId) => k === 'org' || k === 'net';

/* ---------- reading ---------- */

/** An atomic run (an icon, a footnote) as one character, so offsets here are the line editor's. */
const OBJ = '￼';
export const charsOf = (runs: Run[]): string => runs.map((r) => (isAtomic(r) ? OBJ : r.t)).join('');

/** A stretch of a line: where it is (in the line editor's characters), its plain words and the icon in it. */
export interface Part {
  from: number;
  to: number;
  words: string;
  icon: string;
}

/** The part of the line between from and to, its spaces trimmed off. */
export function partOf(runs: Run[], chars: string, from: number, to: number): Part {
  while (from < to && /\s/.test(chars[from])) from++;
  while (to > from && /\s/.test(chars[to - 1])) to--;
  const words = chars.slice(from, to).split(OBJ).join('').replace(/\s+/g, ' ').trim();
  const icon = sliceRuns(runs, from, to).find((r) => r.ic)?.ic ?? '';
  return { from, to, words, icon };
}

/** A list item of the document, read as a line of a diagram. */
export interface Line {
  at: number;
  depth: number;
  runs: Run[];
  chars: string;
  /** The whole line. */
  all: Part;
  /** The words before the first ": ", or null for a line with none. */
  key: Part | null;
  /** The words after the key (the whole line when there is no key). */
  words: Part;
  /** The words after the key, cut at each comma: the things of a list. */
  items: Part[];
}

export function lineOf(b: Extract<Block, { k: 'li' }>, at: number): Line {
  const runs = b.runs;
  const chars = charsOf(runs);
  const all = partOf(runs, chars, 0, chars.length);
  const m = /:(\s|$)/.exec(chars);
  const ci = m ? m.index : -1;
  const key = ci >= 0 ? partOf(runs, chars, 0, ci) : null;
  const words = ci >= 0 ? partOf(runs, chars, ci + 1, chars.length) : all;
  const items: Part[] = [];
  if (words.from < words.to) {
    let start = words.from;
    for (let i = words.from; i <= words.to; i++) {
      if (i === words.to || chars[i] === ',') {
        items.push(partOf(runs, chars, start, i));
        start = i + 1;
      }
    }
  }
  return { at, depth: b.depth, runs, chars, all, key, words, items };
}

/** Every list item of the document, as lines. */
export const linesOf = (doc: Doc): Line[] => doc.blocks.flatMap((b, at) => (b.k === 'li' ? [lineOf(b, at)] : []));

/** A connection between two things, by their names. */
export interface Edge {
  at: number;
  from: string;
  to: string;
  dir: Dir;
  label: string;
}
export const edgesOf = (doc: Doc): Edge[] => doc.blocks.flatMap((b, at) => (b.k === 'edge' ? [{ at, from: b.from.trim(), to: b.to.trim(), dir: b.dir, label: b.label?.trim() ?? '' }] : []));

/** A part as a shape's label: ":rocket Launch", the icon first (as Draw's shapes take it). */
export const labelOf = (p: Part): string => (p.icon ? `:${p.icon}${p.words ? ' ' + p.words : ''}` : p.words);

/** A name as it is compared: its words alone, before any " | ", in any case. */
export const same = (a: string, b: string) => who(a) === who(b);
export const who = (s: string) => s.split(' | ')[0].replace(/\s+/g, ' ').trim().toLowerCase();

/** The sets a venn key names: "Fast & Cheap" is two. */
export const setNames = (key: string): string[] =>
  key
    .split('&')
    .map((n) => n.trim())
    .filter(Boolean);

/** Which part of a line a shape shows: all of it, its key, its words after the key, or one thing of its list. */
export type Which = 'all' | 'key' | 'words' | number;
/** That part of the line, as it now is (null for a thing of the list that is no longer there). */
export const partFor = (l: Line, which: Which): Part | null => (which === 'all' ? l.all : which === 'key' ? (l.key ?? l.words) : which === 'words' ? l.words : (l.items[which] ?? null));

/**
 * What a shape of the picture was drawn from, so a tap there edits it: a line's words (or one thing of its
 * list, or its key), a lane by its name, a thing of a network that only its connections name, a connection.
 */
export type Hit =
  | { k: 'line'; at: number; part: Which }
  | { k: 'lane'; name: string }
  | { k: 'node'; name: string }
  | { k: 'edge'; at: number };

/* ---------- commands ---------- */

/**
 * A thing about to be added: the line the editor opens on, and where it goes. `n` 0 puts the block in at
 * `at`; `n` 1 puts it in place of the line there (one thing more in a list). Nothing is in the document
 * until something is typed: the first keystroke is the one `splice` (`commitDraft`).
 */
export interface Draft {
  at: number;
  n: 0 | 1;
  block: Extract<Block, { k: 'li' }>;
  /** The caret, in the draft's characters. */
  sel: [number, number];
}

const li = (depth: number, runs: Run[]): Extract<Block, { k: 'li' }> => ({ k: 'li', depth, runs: normalRuns(runs) });
const draftOf = (at: number, n: 0 | 1, block: Extract<Block, { k: 'li' }>): Draft => {
  const end = charsOf(block.runs).length;
  return { at, n, block, sel: [end, end] };
};

/** The draft made real: its block put in. */
export const commitDraft = (d: Draft, block: Block): Op[] => [{ op: 'splice', at: d.at, n: d.n, blocks: [block] }];

/** The index just after the last list item (where a new thing of a flat kind goes): before any connections. */
function afterLines(doc: Doc): number {
  for (let i = doc.blocks.length - 1; i >= 0; i--) if (doc.blocks[i].k === 'li') return i + 1;
  return doc.blocks.findIndex((b) => b.k === 'edge') >= 0 ? doc.blocks.findIndex((b) => b.k === 'edge') : doc.blocks.length;
}

/** A line's key, as runs, with its ": " after it: what a new line in the same lane starts with. */
const keyRuns = (l: Line): Run[] => (l.key ? [...sliceRuns(l.runs, l.key.from, l.key.to), { t: ': ' }] : []);

/** One thing more in line l's list: its words with a separator on the end, the caret after it. */
function appendTo(doc: Doc, l: Line): Draft {
  const has = l.items.some((p) => p.words || p.icon);
  const tail = !l.key ? ': ' : has ? ', ' : /\s$/.test(l.chars) ? '' : ' ';
  const words = has ? sliceRuns(l.runs, 0, l.words.to) : l.runs;
  return draftOf(l.at, 1, { ...(doc.blocks[l.at] as Extract<Block, { k: 'li' }>), runs: normalRuns([...words, { t: tail }]) });
}

/** The venn line naming exactly these sets, in any order. */
const naming = (lines: Line[], key: string) => {
  const sorted = (k: string) => setNames(k).map((n) => n.toLowerCase()).sort().join('&');
  return lines.find((l) => sorted(l.key ? l.key.words : l.words.words) === sorted(key));
};

/**
 * A tap on empty space, or Insert: a new thing. In a region (a lane, the circles of a Venn) it goes there;
 * a tree's goes under its first root; a table is numbered on from the last.
 */
export function newThing(doc: Doc, key?: string): Draft {
  const kind = kindOf(doc);
  const lines = linesOf(doc);
  if (isTree(kind)) {
    const root = lines.find((l) => l.depth === 0);
    if (!root) return draftOf(afterLines(doc), 0, li(0, []));
    return draftOf(family(doc, root.at), 0, li(1, []));
  }
  if (kind === 'lanes' && key) {
    const last = [...lines].reverse().find((l) => (l.key?.words ?? '').toLowerCase() === key.toLowerCase());
    return draftOf(last ? last.at + 1 : afterLines(doc), 0, li(0, last ? keyRuns(last) : [{ t: `${key}: ` }]));
  }
  if (kind === 'venn' && key) {
    const l = naming(lines, key);
    return l ? appendTo(doc, l) : draftOf(afterLines(doc), 0, li(0, [{ t: `${key}: ` }]));
  }
  if (kind === 'seating') {
    const n = lines.length + 1;
    return draftOf(afterLines(doc), 0, li(0, [{ t: `${n === 1 ? 'Top table' : `Table ${n}`}: ` }]));
  }
  return draftOf(afterLines(doc), 0, li(0, []));
}

/** Enter on a thing: the next one like it. A tree's root gains a branch, a branch a sibling; a list one thing more; a lane its next step. */
export function nextThing(doc: Doc, hit: Hit): Draft | null {
  const kind = kindOf(doc);
  if (hit.k === 'lane') return newThing(doc, hit.name);
  if (hit.k === 'node') return newThing(doc);
  const b = hit.k === 'line' ? doc.blocks[hit.at] : null;
  if (hit.k !== 'line' || !b || b.k !== 'li') return null;
  const l = lineOf(b, hit.at);
  if (isTree(kind)) return l.depth === 0 ? childOf(doc, l.at) : draftOf(family(doc, l.at), 0, li(l.depth, []));
  if (isListed(kind)) return appendTo(doc, l);
  if (kind === 'lanes') return draftOf(l.at + 1, 0, li(0, keyRuns(l)));
  return draftOf(l.at + 1, 0, li(0, []));
}

/** One thing more under a tree's item (its last child), or in a line's list. */
export function childOf(doc: Doc, at: number): Draft {
  const b = doc.blocks[at] as Extract<Block, { k: 'li' }>;
  if (isListed(kindOf(doc))) return appendTo(doc, lineOf(b, at));
  return draftOf(family(doc, at), 0, li(b.depth + 1, []));
}

/** Take out the thing at `item` of line l: its words and the comma beside it. */
function dropItem(l: Line, item: number): Op[] {
  const it = l.items[item];
  if (!it) return [];
  const next = l.items[item + 1];
  const prev = l.items[item - 1];
  const [from, to] = next ? [it.from, next.from] : prev ? [prev.to, it.to] : [it.from, it.to];
  return [{ op: 'text', at: l.at, from, to, runs: [] }];
}

/** The thing tapped, taken away: one thing of a list; a tree's item (its family comes out a level); a line; a lane and its steps; a thing of a network and its connections; a connection. */
export function removeThing(doc: Doc, hit: Hit): Op[] {
  const kind = kindOf(doc);
  if (hit.k === 'edge') return doc.blocks[hit.at]?.k === 'edge' ? [{ op: 'splice', at: hit.at, n: 1, blocks: [] }] : [];
  if (hit.k === 'lane') {
    const gone = linesOf(doc).filter((l) => (l.key?.words ?? '').toLowerCase() === hit.name.toLowerCase());
    return gone.reverse().map((l): Op => ({ op: 'splice', at: l.at, n: 1, blocks: [] }));
  }
  if (hit.k === 'node') return removeNamed(doc, hit.name, -1);
  const b = doc.blocks[hit.at];
  if (!b || b.k !== 'li') return [];
  const l = lineOf(b, hit.at);
  if (typeof hit.part === 'number') return dropItem(l, hit.part);
  if (kind === 'net') return removeNamed(doc, l.all.words, l.at);
  if (isTree(kind)) {
    // An org chart's dotted lines to the person go with them.
    const lines = edgesOf(doc).filter((e) => same(e.from, l.all.words) || same(e.to, l.all.words));
    return [...lines.reverse().map((e): Op => ({ op: 'splice', at: e.at, n: 1, blocks: [] })), ...removeItem(doc, hit.at)];
  }
  return [{ op: 'splice', at: hit.at, n: 1, blocks: [] }];
}

/** A thing of a network taken out: its own line (if it has one) and every connection to it, from the last block back. */
function removeNamed(doc: Doc, name: string, at: number): Op[] {
  const gone = [at, ...edgesOf(doc).filter((e) => same(e.from, name) || same(e.to, name)).map((e) => e.at)].filter((i) => i >= 0).sort((a, b) => b - a);
  return gone.map((i): Op => ({ op: 'splice', at: i, n: 1, blocks: [] }));
}

/** Ops gathered in order, each applied to a running copy so the next sees what it did. */
class Builder {
  ops: Op[] = [];
  constructor(public doc: Doc) {}
  push(...ops: Op[]) {
    for (const op of ops) {
      this.doc = apply(this.doc, op);
      this.ops.push(op);
    }
    return this;
  }
  line(at: number): Line | null {
    const b = this.doc.blocks[at];
    return b?.k === 'li' ? lineOf(b, at) : null;
  }
}

/** Line l given this key (its words before ": "), in place of the one it had. */
function setKey(l: Line, key: Run[]): Op[] {
  if (l.key) return [{ op: 'text', at: l.at, from: l.key.from, to: l.key.to, runs: key }];
  return [{ op: 'text', at: l.at, from: 0, to: 0, runs: [...key, { t: ': ' }] }];
}

/**
 * One thing of line `from`'s list moved into line `to`'s: after its thing `after`, or at the end. A line `to`
 * of -1 is a new line keyed `key` (a thing moved into an overlap no line names yet).
 */
export function moveItem(doc: Doc, from: number, item: number, to: number, after = Infinity, key = ''): Op[] {
  const b = new Builder(doc);
  const src = b.line(from);
  const it = src?.items[item];
  if (!src || !it) return [];
  const runs = sliceRuns(src.runs, it.from, it.to);
  if (to === from && (after === item || after === item - 1)) return [];
  b.push(...dropItem(src, item));
  if (to < 0) return b.push({ op: 'splice', at: afterLines(b.doc), n: 0, blocks: [li(0, [{ t: `${key}: ` }, ...runs])] }).ops;
  const dst = b.line(to);
  if (!dst) return [];
  const things = dst.items.filter((p) => p.words || p.icon);
  const j = to === from && after > item ? after - 1 : after;
  if (!things.length) {
    const end = dst.chars.length;
    return b.push({ op: 'text', at: to, from: end, to: end, runs: [{ t: dst.key ? (/\s$/.test(dst.chars) ? '' : ' ') : ': ' }, ...runs] }).ops;
  }
  const at = j < dst.items.length ? dst.items[j].to : dst.words.to;
  return b.push({ op: 'text', at: to, from: at, to: at, runs: [{ t: ', ' }, ...runs] }).ops;
}

/** A thing dragged onto another: under it (a tree), after it and into its lane (a step), after it (an event), beside it (a person, a thing of a set), joined to it (a network). */
export function dropOn(doc: Doc, hit: Hit, onto: Hit): Op[] {
  const kind = kindOf(doc);
  if (kind === 'net') {
    const name = (h: Hit) => (h.k === 'node' ? h.name : h.k === 'line' && doc.blocks[h.at]?.k === 'li' ? lineOf(doc.blocks[h.at] as Extract<Block, { k: 'li' }>, h.at).all.words : '');
    return connect(doc, name(hit), name(onto));
  }
  if (hit.k !== 'line' || onto.k !== 'line' || doc.blocks[hit.at]?.k !== 'li' || doc.blocks[onto.at]?.k !== 'li') return [];
  if (isListed(kind)) {
    if (typeof hit.part !== 'number') return [];
    return moveItem(doc, hit.at, hit.part, onto.at, typeof onto.part === 'number' ? onto.part : Infinity);
  }
  if (hit.at === onto.at) return [];
  if (isTree(kind)) return placeFamily(doc, hit.at, onto.at, 'under') ?? [];
  const after = onto.at > hit.at ? onto.at : onto.at + 1;
  const move: Op = { op: 'move', at: hit.at, n: 1, to: after };
  if (kind !== 'lanes') return [move];
  const [l, o] = [lineOf(doc.blocks[hit.at] as Extract<Block, { k: 'li' }>, hit.at), lineOf(doc.blocks[onto.at] as Extract<Block, { k: 'li' }>, onto.at)];
  const key = o.key ? sliceRuns(o.runs, o.key.from, o.key.to) : [];
  const same = (l.key?.words ?? '') === (o.key?.words ?? '');
  return [...(same || !o.key ? [] : setKey(l, key)), move];
}

/** A thing dragged into a region: a step into another lane; a thing of a set into the circles round where it was let go. */
export function dropIn(doc: Doc, hit: Hit, key: string): Op[] {
  const kind = kindOf(doc);
  if (hit.k !== 'line' || doc.blocks[hit.at]?.k !== 'li') return [];
  const l = lineOf(doc.blocks[hit.at] as Extract<Block, { k: 'li' }>, hit.at);
  if (kind === 'lanes') {
    if ((l.key?.words ?? '').toLowerCase() === key.toLowerCase()) return [];
    const lane = linesOf(doc).find((x) => (x.key?.words ?? '').toLowerCase() === key.toLowerCase());
    return setKey(l, lane?.key ? sliceRuns(lane.runs, lane.key.from, lane.key.to) : [{ t: key }]);
  }
  if (kind === 'venn' && typeof hit.part === 'number') {
    const to = naming(linesOf(doc), key);
    if (to && to.at === l.at) return [];
    return moveItem(doc, l.at, hit.part, to ? to.at : -1, Infinity, key);
  }
  return [];
}

/** A connection from one named thing to another: an arrow in a network, a dotted line in an org chart. None to itself, none twice. */
export function connect(doc: Doc, from: string, to: string): Op[] {
  const [a, b] = [from.trim(), to.trim()];
  if (!a || !b || same(a, b)) return [];
  if (edgesOf(doc).some((e) => (same(e.from, a) && same(e.to, b)) || (same(e.from, b) && same(e.to, a)))) return [];
  const name = (s: string) => s.split(' | ')[0].trim();
  return [{ op: 'splice', at: doc.blocks.length, n: 0, blocks: [{ k: 'edge', from: name(a), to: name(b), dir: kindOf(doc) === 'net' ? '->' : '--' }] }];
}

/** A connection's words, or its direction: the edge block replaced. */
export function setEdge(doc: Doc, at: number, patch: { label?: string; dir?: Dir }): Op[] {
  const b = doc.blocks[at];
  if (!b || b.k !== 'edge') return [];
  const label = (patch.label ?? b.label ?? '').replace(/\s+/g, ' ').trim();
  const next: Block = { ...b, dir: patch.dir ?? b.dir, ...(label ? { label } : { label: undefined }) };
  if (!label) delete (next as { label?: string }).label;
  return [{ op: 'splice', at, n: 1, blocks: [next] }];
}

/** Every connection naming `old` names `now` instead. */
function renameEdges(doc: Doc, old: string, now: string): Op[] {
  const to = now.split(' | ')[0].trim();
  if (!who(old) || !to || same(old, now)) return [];
  return edgesOf(doc)
    .filter((e) => same(e.from, old) || same(e.to, old))
    .map((e): Op => ({ op: 'splice', at: e.at, n: 1, blocks: [{ ...(doc.blocks[e.at] as Extract<Block, { k: 'edge' }>), from: same(e.from, old) ? to : e.from, to: same(e.to, old) ? to : e.to }] }));
}

/**
 * After line `at` was typed in (`before` is the document as it was): whatever names the thing follows its new
 * name. An org chart's or a network's connections; the overlaps of a Venn that name the set.
 */
export function follow(before: Doc, after: Doc, at: number): Op[] {
  const kind = kindOf(after);
  const [was, now] = [before.blocks[at], after.blocks[at]];
  if (was?.k !== 'li' || now?.k !== 'li') return [];
  const [a, b] = [lineOf(was, at), lineOf(now, at)];
  if (joins(kind)) return renameEdges(after, a.all.words, b.all.words);
  if (kind === 'venn') {
    const [x, y] = [setNames(a.key?.words ?? ''), setNames(b.key?.words ?? '')];
    if (x.length !== 1 || y.length !== 1 || x[0].toLowerCase() === y[0].toLowerCase()) return [];
    return renameSet(after, x[0], y[0], at);
  }
  return [];
}

/** The set `old` renamed `now` in every overlap that names it (not line `skip`, the one typed in). */
function renameSet(doc: Doc, old: string, now: string, skip: number): Op[] {
  return linesOf(doc).flatMap((l): Op[] => {
    if (l.at === skip || !l.key) return [];
    const names = setNames(l.key.words);
    if (names.length < 2 || !names.some((n) => n.toLowerCase() === old.toLowerCase())) return [];
    return [{ op: 'text', at: l.at, from: l.key.from, to: l.key.to, runs: [{ t: names.map((n) => (n.toLowerCase() === old.toLowerCase() ? now : n)).join(' & ') }] }];
  });
}

/**
 * A name typed where it is not one line's words: a lane (every step in it), a thing of a network that only
 * connections name (each of them), a connection's words.
 */
export function rename(doc: Doc, hit: Hit, old: string, now: string): Op[] {
  if (hit.k === 'edge') return setEdge(doc, hit.at, { label: now });
  if (hit.k === 'node') return renameEdges(doc, old, now);
  if (hit.k === 'lane') {
    const to = now.replace(/:\s/g, ' ').trim();
    if (!to) return [];
    return linesOf(doc)
      .filter((l) => l.key && l.key.words.toLowerCase() === old.toLowerCase())
      .map((l): Op => ({ op: 'text', at: l.at, from: l.key!.from, to: l.key!.to, runs: [{ t: to }] }));
  }
  return [];
}

/** A picture on the thing: an icon at the start of its words, in place of the one there. */
export function withIcon(doc: Doc, hit: Hit, name: string): Op[] {
  if (hit.k !== 'line') return [];
  const b = doc.blocks[hit.at];
  if (!b || b.k !== 'li') return [];
  const l = lineOf(b, hit.at);
  const p = partFor(l, hit.part);
  if (!p) return [];
  const first = sliceRuns(l.runs, p.from, p.from + 1)[0];
  if (first?.ic) return [{ op: 'text', at: hit.at, from: p.from, to: name ? p.from + 1 : p.from + (l.chars[p.from + 1] === ' ' ? 2 : 1), runs: name ? [{ t: '', ic: name }] : [] }];
  return name ? [{ op: 'text', at: hit.at, from: p.from, to: p.from, runs: [{ t: '', ic: name }, { t: ' ' }] }] : [];
}

/** A list left tidy once its editor closes: no empty things between commas, nothing after the last. */
export function tidy(doc: Doc, at: number): Op[] {
  const b = doc.blocks[at];
  if (!isListed(kindOf(doc)) || !b || b.k !== 'li') return [];
  const l = lineOf(b, at);
  if (!l.key) return [];
  const things = l.items.filter((p) => p.words || p.icon);
  const runs: Run[] = things.flatMap((p, i) => [...(i ? [{ t: ', ' }] : []), ...sliceRuns(l.runs, p.from, p.to)]);
  const from = l.chars.indexOf(':', l.key.to) + 1;
  const want = normalRuns(things.length ? [{ t: ' ' }, ...runs] : []);
  const have = sliceRuns(l.runs, from, l.chars.length);
  return charsOf(want) === charsOf(have) ? [] : [{ op: 'text', at, from, to: l.chars.length, runs: want }];
}

/** The kind of diagram, as the head says it. */
export const setKind = (doc: Doc, kind: KindId): Op[] => (kindOf(doc) === kind && doc.head.kind === kind ? [] : [{ op: 'head', key: 'kind', value: kind }]);
