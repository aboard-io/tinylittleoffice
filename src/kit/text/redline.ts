/**
 * Tracked changes drawn over the text editor's words without touching them (docs/library.md, Tracked changes and
 * comments for a host), from what kit/text/changes.ts says of who did what. The words each person put in are
 * highlighted in that person's color, and the words they restyled underlined with dots in it, by the CSS Custom
 * Highlight API: a range over the editor's own text (kit/text/text.ts domPoint), so typing and the caret are as they
 * were. Among the words, as the editor's ghosts (kit/text/text.ts Ghost: drawn, never written, passed over by the
 * caret), each edit is bracketed in its author's color with a lozenge of their initials after the opening bracket, and
 * the words it took out stand in place, struck through; a paragraph taken out is a struck line of its own. A comment
 * is found by its words (its quote) wherever they are now, highlighted, and its place measured for a note beside them.
 *
 * The highlights are the page's, not the editor's (CSS.highlights is one registry for the document), so they are named
 * with a prefix a host may give (PREFIX, "tlo-by-": "tlo-by-0" for the first person's words, "tlo-by-fmt-0" for their
 * restyling, "tlo-by-comment" for the comments' words); the editors' stylesheet colors those of the default prefix
 * (src/styles/changes.css), and a host that gives its own colors them itself. Where the browser has no highlights,
 * nothing is painted and the ghosts are drawn all the same.
 */
import type { Block } from '../../doc/index.ts';
import type { Ghost, ToText } from './text.ts';
import { diffLines } from './diff.ts';
import { isHead, textOf, type Tok, type Tracked } from './changes.ts';

/** The colors, by a person's place among the host's people (`order`): Okabe–Ito's, as the kit's charts take them. */
export const COLORS = ['#0072b2', '#d55e00', '#009e73', '#a05ca8', '#56b4e9', '#b3261e'];
/** The highlights' names begin with this unless a host gives its own (the header). */
export const PREFIX = 'tlo-by-';
const highlights = (prefix: string) => COLORS.map((_, i) => `${prefix}${i}`);
const formats = (prefix: string) => COLORS.map((_, i) => `${prefix}fmt-${i}`);

/**
 * What the drawing reads of the text editor: its blocks as drawn, a place in them as a point in its DOM, and each
 * block's element. A <to-text> is one (a mounted Word Processor's is wordsOf(editor)).
 */
export type Painted = Pick<ToText, 'model' | 'domPoint' | 'blockEls'>;
/** A mounted editor's words: the <to-text> that holds its whole document (the Word Processor's), or null. */
export const wordsOf = (editor: Element): ToText | null => editor.querySelector<ToText>('to-text[shape="doc"]');

/**
 * Each person's initials, by the string their versions name them with (Step's `author`, an email): the first letters
 * of their name's first and last words, more of the first where two would match; their email's, with no name.
 */
export function initialsOf(people: { email: string; name: string }[]): Map<string, string> {
  const base = (name: string, n: number) => {
    const words = name.trim().split(/\s+/).filter(Boolean);
    if (!words.length) return '?';
    const first = [...words[0]].slice(0, n).join('');
    return (words.length > 1 ? first + [...words.at(-1)!][0] : first).toUpperCase();
  };
  const out = new Map<string, string>();
  for (const p of people) {
    let n = 1;
    let ini = base(p.name || p.email, n);
    while ([...out.values()].includes(ini) && n < 4) ini = base(p.name || p.email, ++n);
    out.set(p.email, ini);
  }
  return out;
}

const supported = () => typeof CSS !== 'undefined' && 'highlights' in CSS && typeof Highlight !== 'undefined';

/** The words' highlights taken away (paint's, under the same prefix). */
export function unpaint(prefix = PREFIX) {
  if (supported()) for (const h of [...highlights(prefix), ...formats(prefix)]) CSS.highlights.delete(h);
}

const liveText = (b: Tracked) =>
  b.toks
    .filter((x) => !x.del)
    .map((x) => x.t)
    .join('');

/**
 * The tracked blocks still standing, each with the blocks taken out before it, paired with the editor's blocks where
 * their words are the same; the blocks taken out after the last one standing go after the last one paired (`after`),
 * or, with none paired, before the editor's first block, so that nothing taken out goes undrawn.
 */
function pairsOf(tracked: Tracked[], blocks: readonly Block[], settled: (id: string) => boolean) {
  const standing: { b: Tracked; gone: Tracked[] }[] = [];
  let gone: Tracked[] = [];
  for (const b of tracked) {
    if (isHead(b)) continue;
    if (b.del) {
      if (!b.delId || !settled(b.delId)) gone.push(b);
    } else (standing.push({ b, gone }), (gone = []));
  }
  const pairs: { b: Tracked; gone: Tracked[]; at: number; after: Tracked[] }[] = [];
  let i = 0;
  let j = 0;
  for (const c of diffLines(
    standing.map((st) => liveText(st.b)),
    blocks.map((b) => textOf(b)),
  )) {
    if (c.kind === ' ') pairs.push({ ...standing[i++], at: j++, after: [] });
    else if (c.kind === '-') i++;
    else j++;
  }
  if (gone.length) {
    if (pairs.length) pairs.at(-1)!.after = gone;
    else if (blocks.length) pairs.push({ b: { kind: 'p', toks: [] }, gone, at: 0, after: [] });
  }
  return pairs;
}

/** One person's edit in a block: a run of their changes with nothing but spaces between, from the token `first` to `last`. */
interface Edit {
  ids: string[];
  who: string;
  first: number;
  last: number;
  /** A rejection of someone's change, or words put back, said on its lozenge. */
  how?: 'rejection' | 'restore';
}
/** Which open change a token is part of, and whose: words put in, taken out, or restyled. */
function changeAt(tok: Tok, settled: (id: string) => boolean): { id: string; who: string; also?: string } | null {
  // Words someone put in and someone else took out: the taking out, the putting in with it.
  if (tok.del) return tok.delId && !settled(tok.delId) ? { id: tok.delId, who: tok.del, ...(tok.insId && !settled(tok.insId) ? { also: tok.insId } : {}) } : null;
  if (tok.insId && tok.ins && !settled(tok.insId)) return { id: tok.insId, who: tok.ins };
  if (tok.fmtId && tok.fmt && !settled(tok.fmtId)) return { id: tok.fmtId, who: tok.fmt };
  return null;
}
/** A block's edits: its changes in order, one person's joined when only spaces lie between; a block restyled is one edit over all of it. */
function editsIn(b: Tracked, settled: (id: string) => boolean): Edit[] {
  const edits: Edit[] = [];
  let open: Edit | null = null;
  let gap = '';
  b.toks.forEach((tok, i) => {
    const ch = changeAt(tok, settled);
    if (!ch) {
      if (open) gap += tok.t;
      return;
    }
    if (open && open.who === ch.who && !gap.trim()) {
      if (!open.ids.includes(ch.id)) open.ids.push(ch.id);
      open.last = i;
    } else edits.push((open = { ids: [ch.id], who: ch.who, first: i, last: i }));
    if (ch.also && !open.ids.includes(ch.also)) open.ids.push(ch.also);
    if (tok.rejected) open.how = 'rejection';
    else if (tok.restored && !open.how) open.how = 'restore';
    gap = '';
  });
  if (b.fmtId && b.fmt && !settled(b.fmtId) && b.toks.length) {
    const whole = edits.length === 1 && edits[0].who === b.fmt && edits[0].first === 0 && edits[0].last === b.toks.length - 1;
    if (whole) edits[0].ids.unshift(b.fmtId);
    else edits.unshift({ ids: [b.fmtId], who: b.fmt, first: 0, last: b.toks.length - 1 });
  }
  return edits;
}

/**
 * How the ghosts name and draw a person (by their versions' `author`): their color, initials and name, and whether
 * this reader has accepted an edit (a lozenge still waiting for them is filled); and the host's words, in its language.
 */
export interface Drawing {
  color(who: string): string;
  initials(who: string): string;
  name(who: string): string;
  accepted(ids: string[]): boolean;
  /** What a deleted word's ghost says on hover, given a name. */
  takenOutBy(name: string): string;
  /** What a card (a table, another document, a rule) changed says beside its lozenge. */
  cardChanged: string;
  /** What a lozenge says after the initials for a rejection and for words put back ("rejected", "restored"). */
  rejected: string;
  restored: string;
}

const TEXT = /^(p|h[1-6]|li\d+o?|quote)$/;

/**
 * Every edit drawn in the editor's words without being written there (kit/text/text.ts Ghost): an opening bracket in
 * its author's color, their lozenge right after it at the size of the words, the edit, and a closing bracket; the words
 * it took out in place, struck through in red; a paragraph taken out, a struck line of its own with its lozenge. A
 * lozenge's ghost is named "edit:" and its changes' ids, for the host to open, and says the words its edit covers
 * (`covers`), so the text editor finds it from the caret (Alt+Enter, "text-ghost"). A settled change is not drawn.
 */
export function ghostsOf(tracked: Tracked[], blocks: readonly Block[], settled: (id: string) => boolean, d: Drawing): Map<number, Ghost[]> {
  const out = new Map<number, Ghost[]>();
  const lozenge = (ids: string[], who: string, how?: 'rejection' | 'restore') => ({
    text: `${d.initials(who)}${how === 'rejection' ? ` ${d.rejected}` : how === 'restore' ? ` ${d.restored}` : ''}`,
    cls: `tx-loz${d.accepted(ids) ? '' : ' tx-loz-waiting'}`,
    id: `edit:${ids.join(' ')}`,
    title: d.name(who),
    style: `--c: ${d.color(who)}`,
  });
  for (const { b, gone, at, after } of pairsOf(tracked, blocks, settled)) {
    const list: Ghost[] = [];
    let order = 0;
    const put = (g: Omit<Ghost, 'order'>) => list.push({ ...g, order: order++ });
    // A paragraph taken out: a line of its own, bracketed, its lozenge first; one after the last block, after its words.
    const goneLine = (g: Tracked, offset: number, last = false) =>
      put({
        offset,
        text: '',
        block: true,
        ...(last ? { after: true as const } : {}),
        cls: last ? 'tx-gone tx-gone-after' : 'tx-gone',
        style: `--c: ${d.color(g.del!)}`,
        parts: [
          { text: '[', cls: 'tx-br' },
          // Before the block's words: the edit Alt+Enter finds from its start, where nothing nearer is.
          { ...lozenge([g.delId ?? ''], g.del!, g.rejected ? 'rejection' : undefined), covers: [offset, offset] },
          { text: liveText(g), cls: 'tx-out', title: d.takenOutBy(d.name(g.del!)) },
          { text: ']', cls: 'tx-br' },
        ],
      });
    const end = liveText(b).length;
    for (const g of gone) goneLine(g, 0);
    for (const g of after) goneLine(g, end, true);
    // A card's insides are not words in the editor: its changes are one bracket each person, at its head.
    if (!TEXT.test(b.kind)) {
      const who = new Map<string, string[]>();
      const add = (id?: string, person?: string) => id && person && !settled(id) && (who.get(person) ?? who.set(person, []).get(person)!).push(id);
      add(b.insId, b.ins);
      add(b.fmtId, b.fmt);
      for (const tok of b.toks) {
        if (tok.del) add(tok.delId, tok.del);
        else (add(tok.insId, tok.ins), add(tok.fmtId, tok.fmt));
      }
      for (const [person, ids] of who)
        put({
          offset: 0,
          text: '',
          tag: 'span',
          cls: 'tx-card-change',
          parts: [
            { text: '[', cls: 'tx-br', style: `--c: ${d.color(person)}` },
            lozenge([...new Set(ids)], person),
            { text: d.cardChanged, cls: 'tx-card-said' },
            { text: ']', cls: 'tx-br', style: `--c: ${d.color(person)}` },
          ],
        });
      if (list.length) out.set(at, list);
      continue;
    }
    const edits = editsIn(b, settled);
    // An empty line put in: its bracket and lozenge alone.
    if (!b.toks.length && b.insId && b.ins && !settled(b.insId)) edits.push({ ids: [b.insId], who: b.ins, first: -1, last: -1, ...(b.restored ? { how: 'restore' as const } : {}) });
    if (edits.some((e) => e.first < 0)) {
      const e = edits.find((x) => x.first < 0)!;
      put({ offset: 0, text: '[', tag: 'span', cls: 'tx-br', style: `--c: ${d.color(e.who)}` });
      put({ offset: 0, tag: 'span', ...lozenge(e.ids, e.who, e.how), covers: [0, 0] });
      put({ offset: 0, text: ']', tag: 'span', cls: 'tx-br', style: `--c: ${d.color(e.who)}` });
    }
    // Edits may share a first or a last word (a block restyled by one person, words in it by another): the wider opens
    // first and closes last, so the brackets nest.
    const span = (e: Edit) => e.last - e.first;
    const group = (list: Edit[], key: (e: Edit) => number) => {
      const m = new Map<number, Edit[]>();
      for (const e of list) m.set(key(e), [...(m.get(key(e)) ?? []), e]);
      return m;
    };
    const opens = group(
      [...edits].sort((a, b) => span(b) - span(a)),
      (e) => e.first,
    );
    const closes = group(
      [...edits].sort((a, b) => span(a) - span(b)),
      (e) => e.last,
    );
    // Where each token begins among the words (those taken out are none of them), so a lozenge says the words its edit covers.
    const starts: number[] = [];
    b.toks.reduce((at, tok, i) => ((starts[i] = at), tok.del ? at : at + tok.t.length), 0);
    const covers = (e: Edit): [number, number] => [starts[e.first], starts[e.last] + (b.toks[e.last].del ? 0 : b.toks[e.last].t.length)];
    let off = 0;
    b.toks.forEach((tok, i) => {
      for (const e of opens.get(i) ?? []) {
        put({ offset: off, text: '[', tag: 'span', cls: 'tx-br', style: `--c: ${d.color(e.who)}` });
        put({ offset: off, tag: 'span', ...lozenge(e.ids, e.who, e.how ?? (b.rejected && b.fmtId && e.ids.includes(b.fmtId) ? 'rejection' : undefined)), covers: covers(e) });
      }
      if (tok.del) {
        if (tok.delId && !settled(tok.delId)) {
          const last = list.at(-1);
          if (last && !last.tag && !last.block && last.id === tok.delId && last.offset === off) last.text += tok.t;
          else put({ offset: off, text: tok.t, id: tok.delId, cls: 'tx-out', title: d.takenOutBy(d.name(tok.del)) });
        }
      } else off += tok.t.length;
      for (const c of closes.get(i) ?? []) put({ offset: off, text: ']', tag: 'span', cls: 'tx-br', style: `--c: ${d.color(c.who)}` });
    });
    if (list.length) out.set(at, list);
  }
  return out;
}

/**
 * The words each person put in highlighted in their color, and the words they restyled underlined with dots in it:
 * over the editor's own text (CSS Custom Highlights), its ghosts already drawn (ghostsOf, given to showGhosts and
 * awaited), since a ghost drawn moves the text the ranges are in. `order` is the people, a person's color their place
 * in it (COLORS); a change `settled` is not painted.
 */
export function paint(text: Painted, tracked: Tracked[], order: string[], settled: (id: string) => boolean = () => false, prefix = PREFIX) {
  if (!supported()) return;
  const put: Range[][] = COLORS.map(() => []);
  const styled: Range[][] = COLORS.map(() => []);
  const colorOf = (who: string) => Math.max(0, order.indexOf(who)) % COLORS.length;
  const range = (block: number, from: number, to: number): Range | null => {
    const s = text.domPoint({ block, offset: from });
    const e = text.domPoint({ block, offset: to });
    if (!s || !e) return null;
    try {
      const r = document.createRange();
      r.setStart(s[0], s[1]);
      r.setEnd(e[0], e[1]);
      // A word's first place reads as the end of what comes before it, ghosts and all (a bracket, a lozenge): the range
      // begins inside the word instead, a character in and one back.
      if (to > from) {
        const inside = text.domPoint({ block, offset: from + 1 });
        if (inside && inside[0].nodeType === Node.TEXT_NODE && inside[1] >= 1) r.setStart(inside[0], inside[1] - 1);
      }
      return r;
    } catch {
      return null; // the words moved under us: drawn again with the next change
    }
  };
  for (const { b, at } of pairsOf(tracked, text.model, settled)) {
    let off = 0;
    const whole = b.fmtId && b.fmt && !settled(b.fmtId) ? b.fmt : '';
    for (const tok of b.toks) {
      if (tok.del) continue;
      const end = off + tok.t.length;
      // Every word and every space between them, so a run of typing is one unbroken highlight.
      if (tok.ins && tok.insId && !settled(tok.insId)) {
        const r = range(at, off, end);
        if (r) put[colorOf(tok.ins)].push(r);
      } else if ((tok.fmt && tok.fmtId && !settled(tok.fmtId)) || whole) {
        const r = range(at, off, end);
        if (r) styled[colorOf(tok.fmt && tok.fmtId && !settled(tok.fmtId) ? tok.fmt : whole)].push(r);
      }
      off = end;
    }
  }
  highlights(prefix).forEach((name, k) => (put[k].length ? CSS.highlights.set(name, new Highlight(...put[k])) : CSS.highlights.delete(name)));
  formats(prefix).forEach((name, k) => (styled[k].length ? CSS.highlights.set(name, new Highlight(...styled[k])) : CSS.highlights.delete(name)));
}

/** Where a comment sits: the paragraph its words are in, measured from `frame`'s top. */
export interface Pinned {
  id: string;
  top: number;
}

/**
 * The comments' words found in the editor and highlighted, and where each comment's note goes (a post-it in the
 * margin beside them). A comment is kept as its words, its quote, and found by them as the words are now (the first
 * line of the quote, where it first reads), so nothing about it moves with an edit elsewhere. A comment whose words are
 * no longer there is not pinned: the host lists it where it lists the rest.
 */
export function pinComments(text: Painted, frame: HTMLElement, comments: { id: string; quote: string }[], prefix = PREFIX): Pinned[] {
  const blocks = text.model.map((b) => textOf(b));
  const els = text.blockEls();
  const top0 = frame.getBoundingClientRect().top;
  const ranges: Range[] = [];
  const out: Pinned[] = [];
  for (const { id, quote } of comments) {
    const q = quote.split('\n')[0].trim();
    if (!q) continue;
    const at = blocks.findIndex((b) => b.includes(q));
    if (at < 0 || !els[at]) continue;
    const from = blocks[at].indexOf(q);
    const s = text.domPoint({ block: at, offset: from });
    const e = text.domPoint({ block: at, offset: from + q.length });
    if (s && e)
      try {
        const r = document.createRange();
        r.setStart(s[0], s[1]);
        r.setEnd(e[0], e[1]);
        ranges.push(r);
        out.push({ id, top: r.getBoundingClientRect().top - top0 });
        continue;
      } catch {
        /* drawn again with the next change */
      }
    out.push({ id, top: els[at].getBoundingClientRect().top - top0 });
  }
  if (supported()) {
    if (ranges.length) CSS.highlights.set(`${prefix}comment`, new Highlight(...ranges));
    else CSS.highlights.delete(`${prefix}comment`);
  }
  return out;
}
/** The comments' highlight taken away. */
export const unpin = (prefix = PREFIX) => void (supported() && CSS.highlights.delete(`${prefix}comment`));
