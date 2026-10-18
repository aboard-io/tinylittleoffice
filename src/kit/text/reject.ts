/**
 * The edit that rejects a change, for a host whose documents several people write (docs/library.md, Tracked changes
 * and comments for a host): given what kit/text/changes.ts tracked (`track`, `trackOn`), the editor's blocks as they
 * are now and the changes to reject (a lozenge's `edit:` ids, or a Change's `id`), the kernel's operations that take
 * back exactly those: the words they put in taken out, the words they took out put back where they were with their
 * marks, and a word's marks, a block's kind or look, or a field of the head as they were. The host applies them as an
 * edit of its own, like any other, and the tracking sees a rejection. The Contract Editor made it (its review.ts); a
 * host had made its own meanwhile, with a longest common subsequence of its own to pair the blocks, which is the
 * kit's `diffLines` (kit/text/diff.ts, served beside this).
 *
 * - The tracked blocks still standing are paired with the editor's where their words read the same, as the ghosts
 *   pair them (kit/text/redline.ts).
 * - A block taken out is put back before the next block standing; one put in is taken out; a card (a table, a rule,
 *   another document) changed is put back whole as it was before the changes open on it, all of them; a block
 *   restyled is given its kind and look back, its words as they are.
 * - In a block of words: words put in are taken out, unless a restoring put them back and the taking out it undid is
 *   rejected too; words taken out go back together where they were taken from, with their marks as they were; words
 *   restyled get their marks back, where every restyling above the one rejected is rejected too.
 * - The edits are made from the end backwards, so each one's place is as it was found.
 *
 * Null when the change cannot be put back from what is tracked (its words have moved, or a restyling over it
 * stands), or when it is a change no part of the tracking could place (OTHER), which only an edit by hand undoes.
 * Pure: no DOM, nothing kept between calls.
 */
import type { Block, Op, Run } from '../../doc/index.ts';
import { blockFrom, isHead, kindTo, lookTo, OTHER, restylings, runOf, textOf, type Tok, type Tracked, type Under } from './changes.ts';
import { diffLines } from './diff.ts';

/** Blocks of words: kinds whose tokens are the editor's words. */
const TEXT = /^(p|h[1-6]|li\d+o?|quote)$/;

/** A tracked block's words still standing. */
const standing = (b: Tracked) =>
  b.toks
    .filter((x) => !x.del)
    .map((x) => x.t)
    .join('');

/** The tracked blocks still standing, by their index among `tracked`, paired with the editor's blocks where their words read the same. */
function align(tracked: readonly Tracked[], blocks: readonly Block[]): Map<number, number> {
  const up = tracked.flatMap((b, i) => (!b.del && !isHead(b) ? [i] : []));
  const out = new Map<number, number>();
  let i = 0;
  let j = 0;
  for (const c of diffLines(
    up.map((k) => standing(tracked[k])),
    blocks.map((b) => textOf(b)),
  )) {
    if (c.kind === ' ') out.set(up[i++], j++);
    else if (c.kind === '-') i++;
    else j++;
  }
  return out;
}

/**
 * Of a stack of restylings (the latest first), what rejecting the changes `of` names puts back: the latest ones
 * rejected, down to the first that is not, give back what the last of them was; none on top rejected, nothing; and
 * `false` where one beneath is, since a restyling beneath another cannot be rejected while that one stands.
 */
function restyledBack(levels: readonly Under[], of: (id?: string) => boolean): Under | null | false {
  let back: Under | null = null;
  for (let i = 0; i < levels.length && of(levels[i].fmtId); i++) back = levels[i];
  if (!back && levels.some((u) => of(u.fmtId))) return false;
  return back;
}

/** Words with their marks as they were where their restylings are rejected too; null where one cannot be. */
function asWas(toks: readonly Tok[], of: (id?: string) => boolean): Tok[] | null {
  const out: Tok[] = [];
  for (const x of toks) {
    const back = restyledBack(restylings(x), of);
    if (back === false) return null;
    out.push(back ? { ...x, m: back.was ?? '' } : x);
  }
  return out;
}

/** Runs from words, each with its marks, neighbors with the same marks joined. */
function runsOf(toks: readonly Tok[]): Run[] {
  const out: Run[] = [];
  const plain = (x: Run) => !x.ic && x.fn === undefined;
  for (const tok of toks) {
    const r = runOf(tok.t, tok.m ?? '');
    const last = out.at(-1);
    if (last && plain(r) && plain(last) && JSON.stringify({ ...last, t: '' }) === JSON.stringify({ ...r, t: '' })) last.t += r.t;
    else out.push(r);
  }
  return out;
}

/** A block taken out, as it was: its kind, look and words with their marks, the changes in it rejected too undone. */
function blockBack(b: Tracked, of: (id?: string) => boolean): Block | null {
  // A card is put back as it was written, or, its own changes rejected too, as it was before them.
  if (b.src !== undefined) {
    const own = restylings(b).some((u) => of(u.fmtId)) || b.toks.some((x) => of(x.insId) || of(x.delId) || restylings(x).some((u) => of(u.fmtId)));
    return blockFrom(own && b.wasSrc !== undefined ? b.wasSrc : b.src) ?? null;
  }
  const restyled = restyledBack(restylings(b), of);
  if (restyled === false) return null;
  const kind = restyled ? (restyled.wasKind ?? b.kind) : b.kind;
  const look = restyled ? (restyled.wasLook ?? '') : (b.look ?? '');
  const words = asWas(
    b.toks.filter((x) => !of(x.insId) && (!x.del || x.delId === b.delId || of(x.delId))),
    of,
  );
  if (!words) return null;
  const text = words.map((x) => x.t).join('');
  let block: Block;
  if (kind.startsWith('fence:')) block = { k: 'fence', lang: kind.slice(6), body: text };
  else if (kind === 'hr') block = { k: 'hr' };
  else block = kindTo({ k: 'p', runs: runsOf(words) }, kind);
  return lookTo(block, look);
}

/** One edit of the rejection, with where it acts, to order them from the end backwards. */
type Placed = { block: number; from: number; ti: number; op: Op };

/**
 * The operations that reject the changes `ids` of `tracked` (track's blocks), made against `blocks`, the editor's
 * blocks as they are now (the document the host's versions end in, or the words being typed): null where they cannot
 * be made (the header). Rejecting every change of a version gives back the version before it; rejecting some leaves
 * the others' words as they are, but on a card, which is put back whole.
 */
export function rejectOps(tracked: readonly Tracked[], blocks: readonly Block[], ids: readonly string[]): Op[] | null {
  const of = (x?: string) => !!x && ids.includes(x);
  const at = align(tracked, blocks);
  const ops: Placed[] = [];
  for (const [ti, b] of tracked.entries()) {
    if (isHead(b)) {
      if (!restylings(b).some((u) => of(u.fmtId))) continue;
      if (b.kind === OTHER) return null;
      const back = restyledBack(restylings(b), of);
      if (back === false) return null;
      if (back) ops.push({ ti, block: Infinity, from: 0, op: { op: 'head', key: b.kind.slice(5), value: back.wasLook || undefined } });
      continue;
    }
    // A whole block taken out: put back before the next block standing, unless it was itself a putting in rejected too.
    if (b.del && of(b.delId)) {
      if (of(b.insId)) continue;
      const back = blockBack(b, of);
      if (!back) return null;
      const next = [...at.entries()].find(([t]) => t > ti);
      const where = next ? next[1] : blocks.length;
      ops.push({ ti, block: where, from: -1, op: { op: 'splice', at: where, n: 0, blocks: [back] } });
      continue;
    }
    if (b.del) continue;
    const ei = at.get(ti);
    if (ei === undefined) {
      if (of(b.insId) || of(b.fmtId) || b.toks.some((x) => of(x.insId) || of(x.delId) || of(x.fmtId))) return null;
      continue;
    }
    // A whole block put in: taken out (one put back whole, unless the taking out it undid is rejected too).
    if (of(b.insId) && !(b.restored && of(b.from?.delId)) && b.toks.every((x) => of(x.insId) || x.del)) {
      ops.push({ ti, block: ei, from: Infinity, op: { op: 'splice', at: ei, n: 1, blocks: [] } });
      continue;
    }
    // A card changed: put back whole, as it was before the changes open on it.
    if (!TEXT.test(b.kind) && (restylings(b).some((u) => of(u.fmtId)) || b.toks.some((x) => of(x.insId) || of(x.delId) || restylings(x).some((u) => of(u.fmtId))))) {
      const was = b.wasSrc !== undefined ? blockFrom(b.wasSrc) : undefined;
      if (!was) return null;
      ops.push({ ti, block: ei, from: Infinity, op: { op: 'splice', at: ei, n: 1, blocks: [was] } });
      continue;
    }
    // A block restyled: its kind and look as they were, its words as they are.
    const restyled = restyledBack(restylings(b), of);
    if (restyled === false) return null;
    if (restyled) ops.push({ ti, block: ei, from: Infinity, op: { op: 'splice', at: ei, n: 1, blocks: [lookTo(kindTo(blocks[ei], restyled.wasKind ?? b.kind), restyled.wasLook ?? '')] } });
    let off = 0;
    // Words taken out together go back together, in their order, where they were taken from, with their marks.
    let back: { from: number; toks: Tok[] } | null = null;
    let stuck = false;
    const putBack = () => {
      const words = back && asWas(back.toks, of);
      if (back && !words) stuck = true;
      if (back && words) ops.push({ ti, block: ei, from: back.from, op: { op: 'text', at: ei, from: back.from, to: back.from, runs: runsOf(words) } });
      back = null;
    };
    for (const tok of b.toks) {
      const n = tok.t.length;
      if (tok.del) {
        // Put back, unless the words were only ever someone's change, rejected too.
        if (of(tok.delId) && !of(tok.insId)) back = back ? { from: back.from, toks: [...back.toks, tok] } : { from: off, toks: [tok] };
        continue;
      }
      putBack();
      // Words put back by a restoring: rejecting it takes them out again, unless the taking out it undid is rejected too.
      if (of(tok.insId) && !(tok.restored && tok.from && (of(tok.from.delId) || !tok.from.delId))) ops.push({ ti, block: ei, from: off, op: { op: 'text', at: ei, from: off, to: off + n, runs: [] } });
      else if (of(tok.insId)) {
        // Restored, its taking out rejected too: it stands, with the marks it had before it was taken out.
        if ((tok.from?.m ?? '') !== (tok.m ?? '')) ops.push({ ti, block: ei, from: off, op: { op: 'text', at: ei, from: off, to: off + n, runs: [runOf(tok.t, tok.from?.m ?? '')] } });
      } else {
        const was = restyledBack(restylings(tok), of);
        if (was === false) return null;
        if (was) ops.push({ ti, block: ei, from: off, op: { op: 'text', at: ei, from: off, to: off + n, runs: [runOf(tok.t, was.was ?? '')] } });
      }
      off += n;
    }
    putBack();
    if (stuck) return null;
  }
  // From the end backwards; at one place, what was put in comes out before what was taken out goes back; blocks put
  // back at one place go in from the last, so they stand in their order.
  const goesBack = (x: Placed) => Number(x.op.op === 'text' && x.op.from === x.op.to);
  return ops.sort((a, b) => b.block - a.block || b.from - a.from || b.ti - a.ti || goesBack(a) - goesBack(b)).map((x) => x.op);
}
