/**
 * Footnotes, numbered lists and links, over runs: the helpers every drawing
 * of rich text shares. A footnote is written where its mark sits, as
 * ^[the note's words] (Pandoc's inline note): the note travels with its
 * sentence and is numbered by order of appearance when drawn. Its words are
 * rich text themselves (marks and links; no blocks). The parser folds
 * Markdown's reference form ([^id] with a "[^id]: the note" paragraph) into
 * the inline form; referenceNotes writes it back out, for other readers.
 */
import type { Block, Doc, Run } from './model.ts';
import { parseInline, writeInline } from './tlo.ts';

/** The notes some blocks hold, in order of appearance: each note's words, as inline Markdown. */
export const notesOf = (blocks: readonly (Block | { runs: Run[] })[]): string[] => blocks.flatMap((b) => ('runs' in b ? b.runs : []).filter((r) => r.fn !== undefined).map((r) => r.fn!));

/** A note's words as runs (a note inside a note is left out). */
export const noteRuns = (fn: string): Run[] => parseInline(fn).filter((r) => r.fn === undefined);

/** Numbers notes as they come: each call is the next number. */
export const noteNumbers = (from = 0) => () => ++from;

/** Runs as they are drawn: a note's mark is its number, raised (`sup`), the numbers given by `next` (noteNumbers()). */
export const markNotes = (runs: Run[], next: () => number): (Run & { sup?: boolean })[] => runs.map((r) => (r.fn === undefined ? r : { t: String(next()), sup: true }));

/**
 * A document's notes written the way Markdown's other readers know: "[^n]"
 * in the words and "[^n]: the note" paragraphs at the end. For export; the
 * document itself keeps the inline form. A document with no notes is itself.
 */
export function referenceNotes(doc: Doc): Doc {
  const notes: string[] = [];
  const blocks = doc.blocks.map((b): Block => {
    if (!('runs' in b) || !b.runs.some((r) => r.fn !== undefined)) return b;
    const runs = b.runs.map((r) => {
      if (r.fn === undefined) return r;
      notes.push(r.fn);
      return { t: `[^${notes.length}]` };
    });
    return { ...b, runs };
  });
  if (!notes.length) return doc;
  return { head: doc.head, blocks: [...blocks, ...notes.map((n, i): Block => ({ k: 'p', runs: parseInline(`[^${i + 1}]: ${n}`) }))] };
}

/**
 * Numbers a document's ordered lists as they come, as `write` numbers them:
 * given each block in turn, it says an ordered item's number. An ordered
 * item counts on at its depth across deeper items; a bulleted item resets
 * the count at its depth and ends the lists deeper; anything else ends
 * them all.
 */
export function listNumbers(): (b: Block) => number | undefined {
  const counts: number[] = [];
  return (b) => {
    if (b.k !== 'li') {
      counts.length = 0;
      return undefined;
    }
    counts.length = b.depth + 1;
    counts[b.depth] = b.ord ? (counts[b.depth] ?? 0) + 1 : 0;
    return b.ord ? counts[b.depth] : undefined;
  };
}

/** An address as it may be written in a link: what would end it early is percent-encoded. */
export const linkTarget = (url: string): string => url.trim().replace(/[\s()]/g, (c) => '%' + c.charCodeAt(0).toString(16).toUpperCase().padStart(2, '0'));
/** Whether an address may be a link's target at all. */
export const linkable = (url: string): boolean => /^(?:https?:\/\/[^\s]+|mailto:[^\s]+|tel:[^\s]+|#\S*)$/.test(linkTarget(url));

/** A run's words in pieces, each a link or not: linked words are one link, and a web address in plain words is a link as it stands. */
export const runLinks = (r: Run): { t: string; url?: string }[] => (r.href ? [{ t: r.t, url: r.href }] : linkify(r.t));

/** Web addresses in a piece of text. Nothing is stored for a link: an address in the text is a link wherever the text is shown. */
export function linkify(text: string): { t: string; url?: string }[] {
  const out: { t: string; url?: string }[] = [];
  let last = 0;
  for (const m of text.matchAll(/https?:\/\/[^\s<>"']+/g)) {
    // Punctuation after an address belongs to the sentence, not the address.
    const url = m[0].replace(/[.,;:!?)\]]+$/, '');
    if (url.length < 10) continue;
    if (m.index > last) out.push({ t: text.slice(last, m.index) });
    out.push({ t: url, url });
    last = m.index + url.length;
  }
  if (last < text.length) out.push({ t: text.slice(last) });
  return out;
}

/** The alignment classes a text block may carry, and their short names. */
export type Align = 'c' | 'r' | 'j';
export const ALIGN_NAMES: Record<Align, string> = { c: 'center', r: 'right', j: 'justify' };
export const ALIGN_OF: Record<string, Align> = { center: 'c', right: 'r', justify: 'j' };

/** Runs as one line of inline Markdown (writeInline, named for what it is used as). */
export { writeInline };
