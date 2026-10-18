/**
 * A diagram as a view of the document, and its commands as operations. One app, eight kinds, named by the
 * head's `kind:` field; every kind is written as list items (and, for two of them, connections), as the old
 * tree's eight diagram apps wrote them:
 *
 *   mind, org, family   a nested list: an idea and its branches; "Name | Role" under who they report to;
 *                       "Ada + Charles | 1815" over their children. "~ A -- B: advises" joins any two of them
 *                       across the tree: a mind map's cross-link (a dashed curve; "->", "<-", "<->" arrows),
 *                       an org chart's or a family's dotted line ("godparent", "adopted").
 *   lanes               "- Who: what they do", a step a line, in order; a step ending in "?" is a decision. A
 *                       nested list, as a mind map's: a step leads to the steps under it (its branches), a step
 *                       with none to the next on the margin. Connections join any two as well: "~ Ready? ->
 *                       Ship it: Yes", with a mind map's arrows and words; a step joins by its words, or by
 *                       "Who: what they do" where two steps have the same words.
 *   timeline            "- When: what happened"; a span ("1990–1999") is an era, a band along the line.
 *   venn                "- Set: thing, thing"; "- A & B: what they share".
 *   seating             "- Table: Ann, Bob, Cy", seated round it in that order.
 *   net                 "- Thing" on its own, and "~ A -> B: label" or "~ A -- B" between two things.
 *
 * A line's words are rich text: an icon among them (`:rocket:`) is drawn on the thing. Where a kind draws its
 * things as boxes (a tree, swimlanes, a network) a line's class gives its shape, by Draw's names: "{.diamond}",
 * "{.cylinder}" (SHAPES). Where a line has a
 * key ("Sales: …", "Top table: …") the key is the words before the first ": ". A connection names its two
 * things by their words ("Name | Role" by the name alone), as the Outliner's joins do.
 *
 * The separators are the code's, never a person's: a thing's own words may hold any of them, and where one would
 * be read as structure the code writes it with a backslash in front, as the kernel writes "\|" in a table's cell:
 * "\," a comma in a guest's or a set's thing ("Smith\, Jones"), "\:" a colon ending a word in a key or in a line
 * with none ("Sales\: Q3"), "\|" a bar that is not a second line, "\&" an ampersand in a set's name ("R\&D"), and
 * "\\" a backslash before any of them. The reader takes the backslash off (`unescapeWords`), so `Part.words` and
 * every drawn label are the plain words; a separator written without one still separates, as it always has. (The
 * backslash is in the line's words, so the text writes it doubled: "- Top table: Smith\\, Jones, Ann".) A family's
 * couple, "Ada + Charles", is a person's words and nothing is read from it, so a "+" needs no escape. A
 * connection names things by their plain words, and when a name holds an arrow or ": " (`~ A -- B -> C`) it is
 * read against the things there are, a whole name first (`edgesOf`).
 *
 * Every command is pure: the document and what to do in, the `Op[]` out. A line edited is `text` ops on its
 * item (from the line editor, plus the follow-ups when a name others refer to changes); a thing added is a
 * `splice` of an item (or, for one thing more in a list, a `text` op on that list's line); a thing moved is
 * `move` (a family by the kernel's `placeFamily`) or the `text` ops that take it out of one list and put it
 * in another; a connection is a `splice` of an edge block; the kind is a `head` op.
 */
import { plainText, write } from '../../doc/index.ts';
import {
  apply,
  applyAll,
  depthOf,
  escapeInline,
  family,
  isAtomic,
  isText,
  moveFamily,
  normalRuns,
  placeFamily,
  removeItem,
  shiftFamily,
  sliceRuns,
  type Block,
  type Dir,
  type Doc,
  type Op,
  type Run,
} from '../../doc/index.ts';

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
/** Kinds whose things may be joined by a connection of their own: across a tree, or a network's every line. */
export const joins = (k: KindId) => isTree(k) || k === 'net' || k === 'lanes';

/**
 * The shapes a thing may be given, as its line's class says ("- Triage {.diamond}"), by the names Draw gives them;
 * a kind that draws its things as boxes (a tree, swimlanes, a network) draws one so. A line with none is drawn
 * as its kind draws it.
 */
export const SHAPES = { rectangle: 'r', rounded: 'o', ellipse: 'e', diamond: 'd', hexagon: 'h', parallelogram: 'p', cylinder: 'c', note: 'n' } as const;
export type ShapeName = keyof typeof SHAPES;
export const shapes = (k: KindId) => isTree(k) || k === 'lanes' || k === 'net';
/** The shape line `at` is given, if any. */
export function shapeOf(doc: Doc, at: number): ShapeName | undefined {
  return doc.blocks[at]?.a?.cls?.find((c): c is ShapeName => c in SHAPES);
}
/** Line `at` given a shape (null: its kind's own), in place of any it had; its other classes kept. */
export function setShape(doc: Doc, at: number, name: ShapeName | null): Op[] {
  const b = doc.blocks[at];
  if (b?.k !== 'li' || (shapeOf(doc, at) ?? null) === name) return [];
  const cls = [...(b.a?.cls ?? []).filter((c) => !(c in SHAPES)), ...(name ? [name] : [])];
  const { a: _was, ...bare } = b;
  const a = { ...b.a, cls };
  if (!cls.length) delete (a as { cls?: string[] }).cls;
  return [{ op: 'splice', at, n: 1, blocks: [Object.keys(a).length ? { ...bare, a } : bare] }];
}

/* ---------- reading ---------- */

/** An atomic run (an icon, a footnote) as one character, so offsets here are the line editor's. */
const OBJ = '￼';
export const charsOf = (runs: Run[]): string => runs.map((r) => (isAtomic(r) ? OBJ : r.t)).join('');

/* ---------- the separators, escaped ---------- */

/** The characters a backslash escapes in a thing's words: the separators, and itself. */
const ESCAPED = /\\([\\,:|&])/g;
/** Words as they are drawn: every escape taken off. */
const unescapeWords = (s: string): string => s.replace(ESCAPED, '$1');
/** Whether the character at i follows an odd run of backslashes, and so is a plain character. */
const escapedAt = (chars: string, i: number) => {
  let n = 0;
  while (i - n - 1 >= 0 && chars[i - n - 1] === '\\') n++;
  return n % 2 === 1;
};

/** Which separators would be read as structure where a part's words go: a colon (a key), a comma (a list), an ampersand (sets). A bar always is. */
export interface Seps {
  colon?: boolean;
  comma?: boolean;
  amp?: boolean;
}

/** Plain words as a part of a line writes them: whatever would be read as a separator there escaped, and a backslash before one. */
function escapeWords(s: string, seps: Seps = {}): string {
  let out = s.replace(/\\(?=[\\,:|&]|$)/g, '\\\\').replace(/\|/g, '\\|');
  if (seps.colon) out = out.replace(/:(?=\s|$)/g, '\\:');
  if (seps.comma) out = out.replace(/,/g, '\\,');
  if (seps.amp) out = out.replace(/&/g, '\\&');
  return out;
}
/** Runs' words escaped (an icon as it is). */
const escapeRuns = (runs: Run[], seps: Seps = {}): Run[] => runs.map((r) => (isAtomic(r) ? r : { ...r, t: escapeWords(r.t, seps) }));
/** Runs' words with their escapes taken off. */
const unescapeRuns = (runs: Run[]): Run[] => runs.map((r) => (isAtomic(r) ? r : { ...r, t: unescapeWords(r.t) }));

/**
 * What a part of a line escapes, by its kind: a thing of a list its commas; a key (a lane's, a date, a table's or a
 * set's name, a set's its ampersands too) and the words of a line with no key their colons; any part its bars.
 */
function sepsFor(kind: KindId, l: Line, which: Which): Seps {
  if (typeof which === 'number') return { comma: true };
  if (isTree(kind) || kind === 'net') return {};
  if (which === 'key') return { colon: true, amp: kind === 'venn' };
  return { colon: !l.key };
}

/** Whether a part of a line is shown with its second lines (a thing's own words, a step's), or is one line (a key, a thing of a list). */
export const hasLines = (which: Which) => which === 'all' || which === 'words';
/** Whether a part is a timeline's event whole: its date the first line, what happened the next. */
export const isDated = (kind: KindId, which: Which) => kind === 'timeline' && which === 'all';
/** A line's " | " as the words over it show them, a line break; and back. */
const asLines = (runs: Run[]): Run[] => runs.map((r) => (isAtomic(r) ? r : { ...r, t: r.t.split(' | ').join('\n') }));
const asBars = (runs: Run[]): Run[] => runs.map((r) => (isAtomic(r) ? r : { ...r, t: r.t.replace(/[ \t]*\n[ \t]*/g, ' | ') }));
const oneLine = (runs: Run[]): Run[] => runs.map((r) => (isAtomic(r) ? r : { ...r, t: r.t.replace(/\s*\n\s*/g, ' ') }));
const shown = (runs: Run[]): Run[] => unescapeRuns(asLines(runs));

/** The words of part `which` of line l, its characters [from, to), as they are typed: plain, a second line after a line break. */
export function wordsOn(kind: KindId, l: Line, which: Which, from: number, to: number): Run[] {
  if (isDated(kind, which) && l.key && l.key.from >= from) return [...shown(sliceRuns(l.runs, from, l.key.to)), { t: '\n' }, ...shown(sliceRuns(l.runs, l.words.from, to))];
  return hasLines(which) ? shown(sliceRuns(l.runs, from, to)) : unescapeRuns(sliceRuns(l.runs, from, to));
}
/**
 * Words typed on part `which` of line l, as the line writes them: whatever would be read as a separator there
 * escaped (`sepsFor`), then a line break as " | " (a timeline's first as ": ", its date escaped as a key is); a
 * part of one line has its breaks as spaces.
 */
export function wordsInto(kind: KindId, l: Line, which: Which, runs: Run[]): Run[] {
  if (!hasLines(which)) return normalRuns(escapeRuns(oneLine(runs), sepsFor(kind, l, which)));
  const chars = charsOf(runs);
  const i = chars.indexOf('\n');
  if (isDated(kind, which) && i >= 0) return normalRuns([...escapeRuns(sliceRuns(runs, 0, i), { colon: true }), { t: ': ' }, ...asBars(escapeRuns(sliceRuns(runs, i + 1, chars.length)))]);
  return normalRuns(asBars(escapeRuns(runs, isDated(kind, which) ? { colon: true } : sepsFor(kind, l, which))));
}

/** A stretch of a line: where it is (in the line editor's characters), its words as written and as drawn, and the icon in it. */
export interface Part {
  from: number;
  to: number;
  /** The words as the line writes them, escapes and all (a Venn's key is cut into its sets from these). */
  src: string;
  /** The plain words: escapes taken off, a second line (the line's " | ") after a line break. */
  words: string;
  icon: string;
}

/** The part of the line between from and to, its spaces trimmed off. */
export function partOf(runs: Run[], chars: string, from: number, to: number): Part {
  while (from < to && /\s/.test(chars[from])) from++;
  while (to > from && /\s/.test(chars[to - 1])) to--;
  const src = chars.slice(from, to).split(OBJ).join('').replace(/\s+/g, ' ').trim();
  const words = src.split(' | ').map(unescapeWords).join('\n');
  const icon = sliceRuns(runs, from, to).find((r) => r.ic)?.ic ?? '';
  return { from, to, src, words, icon };
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
  let ci = -1;
  for (let i = 0; i < chars.length && ci < 0; i++) if (chars[i] === ':' && (i + 1 === chars.length || /\s/.test(chars[i + 1])) && !escapedAt(chars, i)) ci = i;
  const key = ci >= 0 ? partOf(runs, chars, 0, ci) : null;
  const words = ci >= 0 ? partOf(runs, chars, ci + 1, chars.length) : all;
  const items: Part[] = [];
  if (words.from < words.to) {
    let start = words.from;
    for (let i = words.from; i <= words.to; i++) {
      if (i === words.to || (chars[i] === ',' && !escapedAt(chars, i))) {
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

const ARROW = / (<->|->|<-|--) /g;
/**
 * A connection read against the things there are. The text cuts "~ A -- B -> C: says" at its first arrow and its
 * first ": " after it; where that leaves an end naming nothing, every other cut is tried, and the one naming the most
 * things wins (the text's own on a tie), so a thing called "A -- B", or "Q3: plan", is matched whole.
 */
function resolveEdge(b: Extract<Block, { k: 'edge' }>, at: number, known: (name: string) => boolean): Edge {
  const score = (e: Edge) => +known(e.from) + +known(e.to);
  let best: Edge = { at, from: b.from.trim(), to: b.to.trim(), dir: b.dir, label: b.label?.trim() ?? '' };
  let most = score(best);
  if (most === 2) return best;
  const raw = `${b.from} ${b.dir} ${b.to}${b.label ? ': ' + b.label : ''}`;
  for (const m of raw.matchAll(new RegExp(ARROW.source, 'g'))) {
    const rest = raw.slice(m.index + m[0].length);
    const cuts: [string, string][] = [[rest, '']];
    for (let j = rest.indexOf(': '); j >= 0; j = rest.indexOf(': ', j + 1)) cuts.push([rest.slice(0, j), rest.slice(j + 2)]);
    for (const [to, label] of cuts) {
      const e: Edge = { at, from: raw.slice(0, m.index).trim(), to: to.trim(), dir: m[1] as Dir, label: label.trim() };
      if (e.from && e.to && score(e) > most) [best, most] = [e, score(e)];
    }
  }
  return best;
}
/** Every connection of the document, its ends read against its things. */
export function edgesOf(doc: Doc): Edge[] {
  const lines = linesOf(doc);
  const names = new Set(kindOf(doc) === 'lanes' ? lines.flatMap((l) => [who(l.words.words), who(laneName(lines, l))]) : lines.map((l) => who(l.all.words)));
  const known = (n: string) => names.has(who(n));
  return doc.blocks.flatMap((b, at) => (b.k === 'edge' ? [resolveEdge(b, at, known)] : []));
}
/** A connection as its block, with what it now says. */
function edgeBlock(doc: Doc, e: Edge, patch: Partial<Edge> = {}): Block {
  const b = doc.blocks[e.at] as Extract<Block, { k: 'edge' }>;
  const n = { ...e, ...patch };
  return { k: 'edge', from: n.from, to: n.to, dir: n.dir, ...(n.label ? { label: n.label } : {}), ...(b.a ? { a: b.a } : {}) };
}

/** Plain words as a label of Draw's (whose words are inline Markdown, " | " a second line): each line escaped, a plain bar too. */
export const asLabel = (words: string): string =>
  words
    .split('\n')
    .map((w) => escapeInline(w).replace(/\|/g, '\\|'))
    .join(' | ');
/** A part as a shape's label: ":rocket Launch", the icon first (as Draw's shapes take it). */
export const labelOf = (p: Pick<Part, 'words' | 'icon'>): string => (p.icon ? `:${p.icon}${p.words ? ' ' + asLabel(p.words) : ''}` : asLabel(p.words));

/** A name as it is compared: its words alone, its first line, in any case. */
export const same = (a: string, b: string) => who(a) === who(b);
export const who = (s: string) => nameOf(s).replace(/\s+/g, ' ').toLowerCase();
/** A thing's name: its words' first line ("Name" of "Name | Role"). */
export const nameOf = (s: string) => s.split('\n')[0].trim();

/** The sets a venn key names, plain: "Fast & Cheap" is two, "R\&D" one. */
export const setNames = (key: string): string[] => {
  const names: string[] = [];
  let start = 0;
  for (let i = 0; i <= key.length; i++) {
    if (i < key.length && (key[i] !== '&' || escapedAt(key, i))) continue;
    names.push(unescapeWords(key.slice(start, i)).trim());
    start = i + 1;
  }
  return names.filter(Boolean);
};
/** Set names as a Venn line's key: "Fast & R\&D". */
export const setKey = (names: string[]): string => names.map((n) => escapeWords(n, { colon: true, amp: true })).join(' & ');

/** Which part of a line a shape shows: all of it, its key, its words after the key, or one thing of its list. */
export type Which = 'all' | 'key' | 'words' | number;
/** That part of the line, as it now is (null for a thing of the list that is no longer there). */
export const partFor = (l: Line, which: Which): Part | null => (which === 'all' ? l.all : which === 'key' ? (l.key ?? l.words) : which === 'words' ? l.words : (l.items[which] ?? null));

/**
 * What a shape of the picture was drawn from, so a tap there edits it: a line's words (or one thing of its
 * list, or its key), a lane by its name, a thing of a network that only its connections name, a connection.
 */
export type Hit = { k: 'line'; at: number; part: Which } | { k: 'lane'; name: string } | { k: 'node'; name: string } | { k: 'edge'; at: number };

/* ---------- commands ---------- */

/**
 * A thing about to be added: the line the editor opens on, and where it goes. `n` 0 puts the block in at
 * `at`; `n` 1 puts it in place of the line there (one thing more in a list). The editor puts it in at once
 * (`commitDraft`, one `splice`), its words offered at the caret and chosen, and opens them over the thing.
 */
export interface Draft {
  at: number;
  n: 0 | 1;
  block: Extract<Block, { k: 'li' }>;
  /** The caret, in the draft's characters. */
  sel: [number, number];
  /** What is done first, before the block goes in: a lane named, so a step after it is in the lane it was meant for. */
  pre?: Op[];
}

const li = (depth: number, runs: Run[]): Extract<Block, { k: 'li' }> => ({ k: 'li', depth, runs: normalRuns(runs) });
const draftOf = (at: number, n: 0 | 1, block: Extract<Block, { k: 'li' }>): Draft => {
  const end = charsOf(block.runs).length;
  return { at, n, block, sel: [end, end] };
};

/** The draft made real: its block put in. */
export const commitDraft = (d: Draft, block: Block): Op[] => [...(d.pre ?? []), { op: 'splice', at: d.at, n: d.n, blocks: [block] }];

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
  const sorted = (k: string) =>
    setNames(k)
      .map((n) => n.toLowerCase())
      .sort()
      .join('&');
  return lines.find((l) => sorted(l.key ? l.key.src : l.words.src) === sorted(key));
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
  // A step goes last, whatever its lane, so no step moves to make room (Paul, 2026-10-18); a drag puts it elsewhere.
  if (kind === 'lanes' && key !== undefined) {
    const at = afterLines(doc);
    if (key) return draftOf(at, 0, li(0, [...laneRuns(lines, key), { t: ': ' }]));
    // The lane with no name, once another lane follows it: named first, from its first step, so the new one is in it.
    if (!lines.length || !laneOf(lines, lines[lines.length - 1].at)) return draftOf(at, 0, li(0, []));
    const name = newLaneName(lanesIn(lines), 1);
    return { ...draftOf(at, 0, li(0, [{ t: `${name}: ` }])), pre: keyed(lines[0], [{ t: name }]) };
  }
  if (kind === 'venn' && key) {
    const l = naming(lines, key);
    return l ? appendTo(doc, l) : draftOf(afterLines(doc), 0, li(0, [{ t: `${key}: ` }]));
  }
  if (kind === 'seating') {
    // A table's name is offered, chosen whole so the first letter typed replaces it.
    const n = lines.length + 1;
    const name = n === 1 ? 'Top table' : `Table ${n}`;
    return { ...draftOf(afterLines(doc), 0, li(0, [{ t: `${name}: ` }])), sel: [0, name.length] };
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
  // A step's next is its sibling, after its branches, in its lane.
  if (kind === 'lanes') return draftOf(family(doc, l.at), 0, li(l.depth, [...laneRuns(linesOf(doc), laneOf(linesOf(doc), l.at)), { t: ': ' }]));
  return draftOf(l.at + 1, 0, li(0, []));
}

/** One thing more under a tree's item (its last child), or in a line's list. */
export function childOf(doc: Doc, at: number): Draft {
  const b = doc.blocks[at] as Extract<Block, { k: 'li' }>;
  if (isListed(kindOf(doc))) return appendTo(doc, lineOf(b, at));
  // A swimlane's branch starts in the lane of the step it branches from.
  if (kindOf(doc) === 'lanes') {
    const lane = laneOf(linesOf(doc), at);
    return draftOf(family(doc, at), 0, li(b.depth + 1, lane ? [...laneRuns(linesOf(doc), lane), { t: ': ' }] : []));
  }
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
  if (kind === 'lanes') {
    // The step after it that names no lane followed it: it is given the lane's name, so it stays.
    const lines = linesOf(doc);
    const next = lines.find((x) => x.at > l.at);
    const keep = l.key && next && !next.key ? keyed(next, sliceRuns(l.runs, l.key.from, l.key.to)) : [];
    // Its connections go with it, from the last back.
    const joined = edgesOf(doc).filter((e) => stepNamed(lines, e.from)?.at === l.at || stepNamed(lines, e.to)?.at === l.at);
    const gone = joined.reverse().map((e): Op => ({ op: 'splice', at: e.at, n: 1, blocks: [] }));
    // Its branches come out a level, to sit where it was, as a tree's do.
    return steady(doc, [...gone, ...keep, ...removeItem(applyAll(doc, [...gone, ...keep]), hit.at)]);
  }
  return [{ op: 'splice', at: hit.at, n: 1, blocks: [] }];
}

/** A thing of a network taken out: its own line (if it has one) and every connection to it, from the last block back. */
function removeNamed(doc: Doc, name: string, at: number): Op[] {
  const gone = [
    at,
    ...edgesOf(doc)
      .filter((e) => same(e.from, name) || same(e.to, name))
      .map((e) => e.at),
  ]
    .filter((i) => i >= 0)
    .sort((a, b) => b - a);
  return gone.map((i): Op => ({ op: 'splice', at: i, n: 1, blocks: [] }));
}

/** Ops gathered in order, each applied to a running copy so the next sees what it did. */
class Builder {
  ops: Op[] = [];
  doc: Doc;
  constructor(doc: Doc) {
    this.doc = doc;
  }
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

/** Line l given this key (its words before ": ", as written), in place of the one it had. */
/**
 * A swimlane's flow, its steps (its lines with words, in order) numbered: each connection as the way it reads (a
 * "<-" from its far end); and the flow by itself, as a mind map branches (Paul, 2026-10-18): a step leads to the
 * steps indented under it, in parallel; one with none leads on to the next step on the margin after the one it is
 * under (where its branch rejoins). Not where a connection already does: between a step and one under it, or out of
 * the one or into the next. A "<->" is an exchange beside the flow: the step it goes to, joined by those alone (a
 * record looked up), is passed over by it.
 */
export function lanesFlow(doc: Doc) {
  const all = linesOf(doc);
  const steps = all.filter((l) => l.words.words || l.words.icon);
  const index = (name: string) => ((l) => (l ? steps.findIndex((x) => x.at === l.at) : -1))(stepNamed(all, name));
  const joined = edgesOf(doc).flatMap((e) => {
    const [a, b] = [index(e.from), index(e.to)];
    return a >= 0 && b >= 0 && a !== b ? [{ e, a, b }] : [];
  });
  const flows = joined.flatMap(({ e, a, b }): [number, number][] => (e.dir === '<-' ? [[b, a]] : e.dir === '<->' ? [] : [[a, b]]));
  const both = joined.filter(({ e }) => e.dir === '<->');
  const aside = (i: number) => both.some(({ b }) => b === i) && !joined.some(({ e, a, b }) => e.dir !== '<->' && (a === i || b === i));
  const depth = steps.map((l) => l.depth);
  const under = (i: number) => {
    const kids: number[] = [];
    for (let j = i + 1; j < steps.length && depth[j] > depth[i]; j++) if (depth[j] === depth[i] + 1 && !aside(j)) kids.push(j);
    return kids;
  };
  const top = (i: number) => {
    while (depth[i] > 0 && i > 0) i--;
    return i;
  };
  const onward = (i: number) => {
    for (let j = top(i) + 1; j < steps.length; j++) if (depth[j] === 0 && !aside(j)) return j;
    return -1;
  };
  const tied = (i: number, j: number) => joined.some(({ a, b }) => (a === i && b === j) || (a === j && b === i));
  const auto: [number, number][] = steps.flatMap((_, i): [number, number][] => {
    if (aside(i)) return [];
    const kids = under(i);
    if (kids.length) return kids.filter((j) => !tied(i, j)).map((j): [number, number] => [i, j]);
    const j = onward(i);
    return j >= 0 && !flows.some(([a, b]) => a === i || b === j) ? [[i, j]] : [];
  });
  return { steps, joined, flows, both, aside, auto };
}

/** A step with its lane's name, "Who: what they do", whether its line names the lane or follows the one before. */
const laneName = (lines: Line[], l: Line): string => ((lane) => (lane ? `${lane}: ${l.words.words}` : l.words.words))(laneOf(lines, l.at));
/** A step's name, as a connection names it: its words, or with its lane's where another step has the same words. */
export function stepName(lines: Line[], l: Line): string {
  return lines.some((x) => x.at !== l.at && same(x.words.words, l.words.words)) ? laneName(lines, l) : l.words.words;
}
/** The step a connection names: by its lane and words first ("Doctor: Treat patient"), then by its words alone. */
export function stepNamed(lines: Line[], name: string): Line | undefined {
  const steps = lines.filter((l) => l.words.words || l.words.icon);
  return steps.find((l) => same(laneName(lines, l), name)) ?? steps.find((l) => same(l.words.words, name));
}

/** The lane a step is in: the last "Who:" at or before it, or "" (the lane with no name) before any. */
function laneOf(lines: Line[], at: number): string {
  return [...lines].reverse().find((x) => x.at <= at && x.key)?.key?.words ?? '';
}

/** The lanes, each once, in order of first mention. */
const lanesIn = (lines: Line[]): string[] => [...new Map(lines.map((l) => laneOf(lines, l.at)).map((x) => [x.toLowerCase(), x])).values()];
/** A lane's name as a line writes it: as the first line that names it does, or escaped for a new one. */
function laneRuns(lines: Line[], name: string): Run[] {
  const l = lines.find((x) => x.key && x.key.words.toLowerCase() === name.toLowerCase());
  return l?.key ? sliceRuns(l.runs, l.key.from, l.key.to) : [{ t: escapeWords(name, { colon: true }) }];
}

/** The name a new lane is given: "Lane 2" after one lane (or from `n`), the next number no lane has. */
export function newLaneName(lanes: string[], n = lanes.length + 1): string {
  while (lanes.some((x) => x.toLowerCase() === `lane ${n}`)) n++;
  return `Lane ${n}`;
}

function keyed(l: Line, key: Run[]): Op[] {
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
  // (A step of a swimlane is put where it is let go instead: placeStep.)
  if (kind === 'lanes') return [];
  return [{ op: 'move', at: hit.at, n: 1, to: onto.at > hit.at ? onto.at : onto.at + 1 }];
}

/**
 * A step of a swimlane put where it was let go (Paul, 2026-10-18: "let me drag them to resequence"): into lane
 * `lane`, before the step that is `slot`th of the others (as many as there are: the end). Nothing else moves; every
 * other step keeps its lane and its place. So a step that names no lane, and would now follow another lane's step,
 * is given its own lane's name, and the lane with no name is named ("Lane 1") once one of its steps would.
 */
export function placeStep(doc: Doc, at: number, lane: string, slot: number, depth?: number): Op[] {
  const lines = linesOf(doc);
  const me = lines.find((l) => l.at === at);
  if (!me || kindOf(doc) !== 'lanes') return [];
  // The step with its branches (the lines under it), which go where it goes.
  const end = family(doc, at);
  const fam = lines.filter((l) => l.at >= at && l.at < end);
  const others = lines.filter((l) => l.at < at || l.at >= end);
  const before = others.filter((l) => l.words.words || l.words.icon)[slot];
  const order = before ? [...others.slice(0, others.indexOf(before)), ...fam, ...others.slice(others.indexOf(before))] : [...others, ...fam];
  const want = new Map(lines.map((l) => [l.at, l.at === at ? lane : laneOf(lines, l.at)]));
  const alike = (a: string, b: string) => a.toLowerCase() === b.toLowerCase();
  // Each line in its new order, keyed where the lane it would follow into is not its own; null if the lane with no name needs one.
  const keys = (): Op[] | null => {
    const ops: Op[] = [];
    let now = '';
    for (const l of order) {
      const w = want.get(l.at)!;
      if (l.key ? !alike(l.key.words, w) : !alike(now, w)) {
        if (!w) return null;
        ops.push(...keyed(l, laneRuns(lines, w)));
      }
      now = w;
    }
    return ops;
  };
  let ops = keys();
  let named = '';
  if (!ops) {
    named = newLaneName([...new Set(want.values())], 1);
    for (const [k, v] of want) if (!v) want.set(k, named);
    ops = keys()!;
  }
  const moved = order.indexOf(me) !== lines.indexOf(me);
  if (!moved || !others.length) return steady(doc, ops, named);
  // Put before a step, it is that step's sibling (a branch beside it, under the same one); at the end, on the margin.
  const by = (depth ?? (before ? before.depth : 0)) - me.depth;
  const keyedDoc = applyAll(doc, ops);
  const deeper = by ? fam.map((l): Op => ({ op: 'splice', at: l.at, n: 1, blocks: [{ ...(keyedDoc.blocks[l.at] as Extract<Block, { k: 'li' }>), depth: l.depth + by }] })) : [];
  const to = before ? before.at : others[others.length - 1].at + 1;
  return steady(doc, [...ops, ...deeper, { op: 'move', at, n: fam.length, to: to > at ? to - fam.length : to }], named);
}

/**
 * The lanes kept in their order whatever the steps do (Paul, 2026-10-18: "Lane three should be created at the
 * bottom"): a lane is drawn where it is first named, so where `ops` would name one first elsewhere, the lanes are
 * named in their order, "- Lane 1:" a line, above the steps (in place of any such lines there), and a new lane
 * after them. The lane with no name is named first, or its steps would follow the last of those lines; `named`, the
 * name `ops` gave it, keeps its place.
 */
function steady(doc: Doc, ops: Op[], named = ''): Op[] {
  if (!ops.length) return ops;
  const alike = (a: string, b: string) => a.toLowerCase() === b.toLowerCase();
  const has = (xs: string[], x: string) => xs.some((y) => alike(x, y));
  const was = lanesIn(linesOf(doc)).map((x) => x || named);
  const lines = linesOf(applyAll(doc, ops));
  const now = lanesIn(lines);
  const want = [...was.filter((x) => has(now, x)), ...now.filter((x) => !has(was, x))];
  if (want.every((x, i) => alike(x, now[i]))) return ops;
  // The lines that already only name lanes, at the top, are written again.
  let head = 0;
  while (head < lines.length && lines[head].key && !lines[head].words.words && !lines[head].words.icon) head++;
  const name = has(want, '') ? newLaneName(want, 1) : '';
  const blocks = want.map((x) => li(0, [...laneRuns(lines, x || name), { t: ':' }]));
  return [...ops, ...(name ? keyed(lines[0], [{ t: name }]) : []), { op: 'splice', at: lines[0].at, n: head, blocks }];
}

/** A thing dragged into a region: a step into another lane; a thing of a set into the circles round where it was let go. */
export function dropIn(doc: Doc, hit: Hit, key: string): Op[] {
  const kind = kindOf(doc);
  if (hit.k !== 'line' || doc.blocks[hit.at]?.k !== 'li') return [];
  const l = lineOf(doc.blocks[hit.at] as Extract<Block, { k: 'li' }>, hit.at);
  if (kind === 'venn' && typeof hit.part === 'number') {
    const to = naming(linesOf(doc), key);
    if (to && to.at === l.at) return [];
    return moveItem(doc, l.at, hit.part, to ? to.at : -1, Infinity, key);
  }
  return [];
}

/** A connection from one named thing to another: an arrow in a network, a plain line across a tree (dashed in a mind map, dotted in an org chart or a family). None to itself, none twice. */
export function connect(doc: Doc, from: string, to: string): Op[] {
  const [a, b] = [from.trim(), to.trim()];
  if (!a || !b || same(a, b)) return [];
  if (edgesOf(doc).some((e) => (same(e.from, a) && same(e.to, b)) || (same(e.from, b) && same(e.to, a)))) return [];
  return [{ op: 'splice', at: doc.blocks.length, n: 0, blocks: [{ k: 'edge', from: nameOf(a), to: nameOf(b), dir: kindOf(doc) === 'net' || kindOf(doc) === 'lanes' ? '->' : '--' }] }];
}

/** A connection's words, or its direction: the edge block replaced. */
export function setEdge(doc: Doc, at: number, patch: { label?: string; dir?: Dir }): Op[] {
  const e = edgesOf(doc).find((x) => x.at === at);
  if (!e) return [];
  const label = (patch.label ?? e.label).replace(/\s+/g, ' ').trim();
  return [{ op: 'splice', at, n: 1, blocks: [edgeBlock(doc, e, { dir: patch.dir ?? e.dir, label })] }];
}

/** Every connection naming `old` names `now` instead. */
function renameEdges(doc: Doc, old: string, now: string): Op[] {
  const to = nameOf(now);
  if (!who(old) || !to || same(old, now)) return [];
  return edgesOf(doc)
    .filter((e) => same(e.from, old) || same(e.to, old))
    .map((e): Op => ({ op: 'splice', at: e.at, n: 1, blocks: [edgeBlock(doc, e, { from: same(e.from, old) ? to : e.from, to: same(e.to, old) ? to : e.to })] }));
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
  if (kind === 'lanes') {
    const [x, y] = [linesOf(before), linesOf(after)];
    return [...renameEdges(after, a.words.words, b.words.words), ...renameEdges(after, laneName(x, a), laneName(y, b))];
  }
  if (joins(kind)) return renameEdges(after, a.all.words, b.all.words);
  if (kind === 'venn') {
    const [x, y] = [setNames(a.key?.src ?? ''), setNames(b.key?.src ?? '')];
    if (x.length !== 1 || y.length !== 1 || x[0].toLowerCase() === y[0].toLowerCase()) return [];
    return renameSet(after, x[0], y[0], at);
  }
  return [];
}

/** The set `old` renamed `now` in every overlap that names it (not line `skip`, the one typed in). */
function renameSet(doc: Doc, old: string, now: string, skip: number): Op[] {
  return linesOf(doc).flatMap((l): Op[] => {
    if (l.at === skip || !l.key) return [];
    const names = setNames(l.key.src);
    if (names.length < 2 || !names.some((n) => n.toLowerCase() === old.toLowerCase())) return [];
    return [{ op: 'text', at: l.at, from: l.key.from, to: l.key.to, runs: [{ t: setKey(names.map((n) => (n.toLowerCase() === old.toLowerCase() ? now : n))) }] }];
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
    const to = escapeWords(now.replace(/\s+/g, ' ').trim(), { colon: true });
    if (!to) return [];
    // The lane with no name (the steps before any "Who:") is named on its first step, and so are they all.
    const first = linesOf(doc)[0];
    if (!old) return first && !first.key ? [{ op: 'text', at: first.at, from: 0, to: 0, runs: [{ t: `${to}: ` }] }] : [];
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
export function setKind(doc: Doc, kind: KindId): Op[] {
  if (kindOf(doc) === kind && doc.head.kind === kind) return [];
  const head: Op = { op: 'head', key: 'kind', value: kind };
  return kindOf(doc) === 'lanes' && isTree(kind) ? [...lanesAsTree(doc), head] : [head];
}

/**
 * A swimlane made a tree (a mind map, an org chart, a family tree), which reads only its nesting (Paul, 2026-10-18:
 * "The conversion from swimlanes to mindmap loses most of the relationships"): each step under the first step before
 * it that leads into it (a look-up under the step it is looked up from), and every other way the flow goes a
 * connection ("~ A -> B"). Its connections stay, named as a tree names things, by the whole line ("Desk: Ready?"),
 * but for one without words the tree now draws; its steps keep their lanes in their words, so swimlanes again have
 * them back; the lines that only name a lane go.
 */
function lanesAsTree(doc: Doc): Op[] {
  const { steps, joined, flows, both, auto } = lanesFlow(doc);
  if (!steps.length) return [];
  const leads: [number, number][] = [...auto, ...flows, ...both.map(({ a, b }): [number, number] => [a, b])];
  const parent = steps.map((_, j) => Math.min(Infinity, ...leads.filter(([a, b]) => b === j && a < j).map(([a]) => a)));
  const order: [number, number][] = [];
  const walk = (i: number, depth: number) => {
    order.push([i, depth]);
    steps.forEach((_, j) => parent[j] === i && walk(j, depth + 1));
  };
  steps.forEach((_, i) => parent[i] === Infinity && walk(i, 0));
  const name = (i: number) => steps[i].all.words;
  const tree = (a: number, b: number) => parent[b] === a || parent[a] === b;
  const lines = order.map(([i, depth]) => ({ ...(doc.blocks[steps[i].at] as Extract<Block, { k: 'li' }>), depth }));
  const kept = joined.filter(({ e, a, b }) => e.label || !tree(a, b)).map(({ e, a, b }) => edgeBlock(doc, e, { from: name(a), to: name(b) }));
  const more = auto.filter(([a, b]) => !tree(a, b)).map(([a, b]): Block => ({ k: 'edge', from: name(a), to: name(b), dir: '->' }));
  const rest = doc.blocks.filter((b, at) => b.k !== 'li' && !(b.k === 'edge' && joined.some(({ e }) => e.at === at)));
  return [{ op: 'splice', at: 0, n: doc.blocks.length, blocks: [...lines, ...rest, ...kept, ...more] }];
}

/* ---------- a thing whole: copied, pasted, duplicated, moved ---------- */

/** The part of a line a kind draws as the line's own shape: a lane's step its words, a set or a table its key, anything else all of it. */
const lineHit = (kind: KindId, at: number): Hit => ({ k: 'line', at, part: kind === 'lanes' ? 'words' : isListed(kind) ? 'key' : 'all' });

/** A thing as blocks, for the clipboard: a line (a tree's with its family, brought to the margin), one thing of a list as a line of its own, a lane's steps, a thing only connections name, a connection. */
export function thingBlocks(doc: Doc, hit: Hit): Block[] {
  if (hit.k === 'edge') return doc.blocks[hit.at]?.k === 'edge' ? [doc.blocks[hit.at]] : [];
  if (hit.k === 'node') return hit.name ? [li(0, [{ t: hit.name }])] : [];
  if (hit.k === 'lane')
    return linesOf(doc)
      .filter((l) => (l.key?.words ?? '').toLowerCase() === hit.name.toLowerCase())
      .map((l) => doc.blocks[l.at]);
  const b = doc.blocks[hit.at];
  if (!b || b.k !== 'li') return [];
  if (typeof hit.part === 'number') {
    const p = lineOf(b, hit.at).items[hit.part];
    return p && (p.words || p.icon) ? [li(0, sliceRuns(b.runs, p.from, p.to))] : [];
  }
  const end = isTree(kindOf(doc)) ? family(doc, hit.at) : hit.at + 1;
  return doc.blocks.slice(hit.at, end).map((x) => (x.k === 'li' ? { ...x, depth: x.depth - b.depth } : x));
}

/**
 * Blocks pasted at a thing (or, with none, where a new thing goes): words alone into a list after the thing of it
 * (a seat at a table, a thing of a set); else lines after the thing (a tree's after its family, at its level, or
 * under a root unless `beside`; a step into its lane), and any connections at the end, none twice. The ops, and the first thing pasted.
 */
export function pasteThings(doc: Doc, hit: Hit | null, blocks: Block[], beside = false): { ops: Op[]; hit: Hit | null } {
  const kind = kindOf(doc);
  const lis = blocks.flatMap((b): Extract<Block, { k: 'li' }>[] => (b.k === 'li' ? [b] : isText(b) && 'runs' in b && charsOf(b.runs).trim() ? [li(0, b.runs)] : []));
  const edges = blocks.filter((b): b is Extract<Block, { k: 'edge' }> => b.k === 'edge');
  const bd = new Builder(doc);
  let first: Hit | null = null;
  const at = hit?.k === 'line' && doc.blocks[hit.at]?.k === 'li' ? hit.at : -1;
  const line = at >= 0 ? lineOf(doc.blocks[at] as Extract<Block, { k: 'li' }>, at) : null;
  const part = hit?.k === 'line' ? hit.part : null;
  if (lis.length && line && isListed(kind) && (typeof part === 'number' || part === 'key') && lis.every((b) => !lineOf(b, 0).key)) {
    // Words into the list, after the thing in hand (or at the end, after the table's or the set's name).
    const words = lis.map((b) => ({ b, p: lineOf(b, 0).all })).filter(({ p }) => p.words || p.icon);
    const runs: Run[] = words.flatMap(({ b, p }, i) => [...(i ? [{ t: ', ' }] : []), ...sliceRuns(b.runs, p.from, p.to)]);
    if (!runs.length) return { ops: [], hit: null };
    const things = line.items.filter((p) => p.words || p.icon);
    const n = typeof part === 'number' ? part : line.items.length - 1;
    if (!things.length) bd.push({ op: 'text', at, from: line.chars.length, to: line.chars.length, runs: [{ t: line.key ? (/\s$/.test(line.chars) ? '' : ' ') : ': ' }, ...runs] });
    else bd.push({ op: 'text', at, from: line.items[n].to, to: line.items[n].to, runs: [{ t: ', ' }, ...runs] });
    first = { k: 'line', at, part: things.length ? n + 1 : 0 };
  } else if (lis.length) {
    let to: number;
    let depth = 0;
    const root = linesOf(doc).find((l) => l.depth === 0);
    // At a tree's root, under it (as Enter there makes a branch); at anything else, beside it.
    if (line && isTree(kind)) [to, depth] = [family(doc, at), line.depth === 0 && !beside ? 1 : line.depth];
    else if (line) to = at + 1;
    else if (hit?.k === 'lane')
      to =
        (linesOf(doc)
          .filter((l) => (l.key?.words ?? '').toLowerCase() === hit.name.toLowerCase())
          .at(-1)?.at ?? afterLines(doc) - 1) + 1;
    else if (isTree(kind) && root) [to, depth] = [family(doc, root.at), 1];
    else to = afterLines(doc);
    const low = Math.min(...lis.map((b) => b.depth));
    const lane = kind === 'lanes' ? (line?.key ? keyRuns(line) : hit?.k === 'lane' && hit.name ? [{ t: `${escapeWords(hit.name, { colon: true })}: ` }] : []) : [];
    const put = lis.map((b) => li(isTree(kind) ? b.depth - low + depth : 0, lane.length && !lineOf(b, 0).key ? [...lane, ...b.runs] : b.runs));
    bd.push({ op: 'splice', at: to, n: 0, blocks: put });
    first = lineHit(kind, to);
  }
  for (const e of edges) {
    const names = new Set(linesOf(bd.doc).map((l) => who(l.all.words)));
    const r = resolveEdge(e, 0, (n) => names.has(who(n)));
    if (!connect(bd.doc, r.from, r.to).length) continue;
    bd.push({ op: 'splice', at: bd.doc.blocks.length, n: 0, blocks: [e] });
    first ??= { k: 'edge', at: bd.doc.blocks.length - 1 };
  }
  return { ops: bd.ops, hit: first };
}

/** Whether a thing can be duplicated: not a connection (never twice), not a thing of a network (one name is one thing). */
export const canDuplicate = (doc: Doc, hit: Hit): boolean => hit.k !== 'edge' && kindOf(doc) !== 'net';
/** A copy of the thing, right after it. */
export const duplicateThing = (doc: Doc, hit: Hit): { ops: Op[]; hit: Hit | null } => (canDuplicate(doc, hit) ? pasteThings(doc, hit, thingBlocks(doc, hit), true) : { ops: [], hit: null });

/** The thing past its neighbour (by -1 up, 1 down): a line (a tree's with its family, among its siblings); one thing of a list past the one beside it. Null when it cannot go. */
export function moveThing(doc: Doc, hit: Hit, by: 1 | -1): { ops: Op[]; hit: Hit } | null {
  if (hit.k !== 'line' || doc.blocks[hit.at]?.k !== 'li') return null;
  if (typeof hit.part === 'number') {
    const l = lineOf(doc.blocks[hit.at] as Extract<Block, { k: 'li' }>, hit.at);
    const [a, b] = by < 0 ? [l.items[hit.part - 1], l.items[hit.part]] : [l.items[hit.part], l.items[hit.part + 1]];
    if (!a || !b) return null;
    // The later one first, so the earlier's offsets still hold.
    const ops: Op[] = [
      { op: 'text', at: hit.at, from: b.from, to: b.to, runs: sliceRuns(l.runs, a.from, a.to) },
      { op: 'text', at: hit.at, from: a.from, to: a.to, runs: sliceRuns(l.runs, b.from, b.to) },
    ];
    return { ops, hit: { ...hit, part: hit.part + by } };
  }
  if (kindOf(doc) === 'lanes') {
    // Past the step beside it among its siblings, its branches with it (as a tree's), each step keeping its lane.
    const m = moveFamily(doc, hit.at, by)?.[0];
    if (!m || m.op !== 'move') return null;
    const lines = linesOf(doc);
    const me = lines.find((x) => x.at === hit.at)!;
    const slot = linesOf(applyAll(doc, [m])).filter((x) => x.at < m.to && (x.words.words || x.words.icon)).length;
    const ops = placeStep(doc, hit.at, laneOf(lines, hit.at), slot, me.depth);
    const at = linesOf(applyAll(doc, ops)).filter((x) => x.words.words || x.words.icon)[slot]?.at;
    return ops.length && at !== undefined ? { ops, hit: { ...hit, at } } : null;
  }
  const ops = moveFamily(doc, hit.at, by);
  const m = ops?.[0];
  if (!m || m.op !== 'move') return null;
  return { ops, hit: { ...hit, at: m.to } };
}

/** The thing into the lane above or below (a step), or to the table before or after (a seat): Mod+Alt+Left/Right. */
export function moveAcross(doc: Doc, hit: Hit, by: 1 | -1): { ops: Op[]; hit: Hit } | null {
  const kind = kindOf(doc);
  if (hit.k !== 'line' || doc.blocks[hit.at]?.k !== 'li') return null;
  const lines = linesOf(doc);
  const l = lines.find((x) => x.at === hit.at)!;
  if (kind === 'lanes') {
    const lanes = lanesIn(lines);
    const mine = laneOf(lines, l.at).toLowerCase();
    const to = lanes[lanes.findIndex((n) => n.toLowerCase() === mine) + by];
    if (to === undefined) return null;
    // In its own place, the steps before it as many as they were.
    const ops = placeStep(doc, l.at, to, lines.filter((x) => x.at < l.at && (x.words.words || x.words.icon)).length);
    return ops.length ? { ops, hit } : null;
  }
  if (kind === 'seating' && typeof hit.part === 'number') {
    const tables = lines.filter((x) => x.key);
    const to = tables[tables.findIndex((x) => x.at === l.at) + by];
    if (!to) return null;
    const ops = moveItem(doc, l.at, hit.part, to.at);
    return ops.length ? { ops, hit: { k: 'line', at: to.at, part: to.items.filter((p) => p.words || p.icon).length } } : null;
  }
  return null;
}

/** The nearest line before item i that is shallower than it: its parent in a tree (-1 for a root). */
function parentOf(depths: number[], i: number): number {
  for (let j = i - 1; j >= 0; j--) if (depths[j] >= 0 && depths[j] < depths[i]) return j;
  return -1;
}

/** A tree's thing moved by `placeFamily`, and where it now is, so the editor keeps it in hand. */
function placed(doc: Doc, hit: Hit, to: number, how: 'under' | 'after'): { ops: Op[]; hit: Hit } | null {
  const ops = placeFamily(doc, hit.k === 'line' ? hit.at : -1, to, how);
  const m = ops?.[1];
  return ops && m?.op === 'move' ? { ops, hit: { ...hit, at: m.to } as Hit } : null;
}

/** A tree's line, by its hit: null for anything else. */
const treeLine = (doc: Doc, hit: Hit): number => (hit.k === 'line' && isTree(kindOf(doc)) && doc.blocks[hit.at]?.k === 'li' ? hit.at : -1);

/**
 * Bring out (Shift+Tab): a tree's thing becomes a child of its grandparent, right after its parent, its whole
 * family a level shallower with it. Null for a root or a root's child: there is nowhere further out to go.
 */
export function promoteThing(doc: Doc, hit: Hit): { ops: Op[]; hit: Hit } | null {
  if (kindOf(doc) === 'lanes') return shifted(doc, hit, -1);
  const i = treeLine(doc, hit);
  if (i < 0) return null;
  const depths = doc.blocks.map(depthOf);
  const parent = parentOf(depths, i);
  if (parent < 0 || parentOf(depths, parent) < 0) return null;
  return placed(doc, hit, parent, 'after');
}

/**
 * A swimlane's step indented (Tab) to be a branch of the step before it, or brought out (Shift+Tab) to its parent's
 * level, its branches with it; any step may, the first of the flow too (a swimlane has no one root).
 */
function shifted(doc: Doc, hit: Hit, by: 1 | -1): { ops: Op[]; hit: Hit } | null {
  if (hit.k !== 'line' || doc.blocks[hit.at]?.k !== 'li') return null;
  const ops = shiftFamily(doc, hit.at, by);
  return ops ? { ops, hit } : null;
}

/** Indent (Tab): a tree's thing becomes the last child of the sibling before it, its family with it. Null for a first child or a root. */
export function demoteThing(doc: Doc, hit: Hit): { ops: Op[]; hit: Hit } | null {
  if (kindOf(doc) === 'lanes') return shifted(doc, hit, 1);
  const i = treeLine(doc, hit);
  if (i < 0) return null;
  const depths = doc.blocks.map(depthOf);
  if (parentOf(depths, i) < 0) return null;
  let sib = i - 1;
  while (sib >= 0 && !(depths[sib] >= 0 && depths[sib] <= depths[i])) sib--;
  if (sib < 0 || depths[sib] !== depths[i]) return null;
  return placed(doc, hit, sib, 'under');
}

/**
 * The diagram as an outline: its list as the Outliner reads it, its connections as the outline's joins. In an org
 * chart or a family tree a person's role or years, "Ada Diaz | Chief executive", goes back into brackets after the
 * name, "Ada Diaz (Chief executive)", which is how the outline writes a person (outline/model.ts personOf); the
 * kind stays behind, the title comes (Paul, 2026-10-11: a mind map had no way back to the outline).
 */
export function diagramToOutline(given: Doc): string {
  // Swimlanes go as the tree their flow draws, every other way it goes a join, as they go to a mind map.
  const doc = kindOf(given) === 'lanes' ? applyAll(given, lanesAsTree(given)) : given;
  const kind = kindOf(doc);
  const people = kind === 'org' || kind === 'family';
  const blocks = doc.blocks.filter((b): b is Extract<Block, { k: 'li' | 'edge' }> => b.k === 'li' || b.k === 'edge');
  const person = (runs: Run[]): Run[] => {
    const words = plainText(runs);
    const bar = words.indexOf(' | ');
    return people && bar >= 0 && !runs.some(isAtomic) ? [{ t: `${words.slice(0, bar).trim()} (${words.slice(bar + 3).trim()})` }] : runs;
  };
  // A join names an item as the outline does, a colon in its words a space ("Desk: Ready?" is "Desk Ready?"), so
  // nothing in a name ends it early (outline/model.ts edgeName).
  const join = (n: string) =>
    n
      .replace(/\s+(?:<->|->|<-|--)\s+/g, ' ')
      .replace(/:\s/g, ' ')
      .replace(/\s+/g, ' ')
      .trim();
  const out: Block[] = blocks.map((b) => (b.k === 'li' ? { ...b, runs: person(b.runs) } : { ...b, from: join(b.from), to: join(b.to) }));
  return write({ head: doc.head.title ? { title: doc.head.title } : {}, blocks: out });
}
