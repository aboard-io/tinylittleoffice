/**
 * Rich text: what Write, an outline's items, a slide's words and the print
 * apps hold. It is written as TLO (lib/tlo.ts), which is Markdown:
 *
 *   # Words {.title}   the title         # / ##   heading, subheading
 *   - item / 1. item   lists, two spaces in per level
 *   Words {.center}    centred (.right, .justify)
 *   ```sheet           another document, embedded: its app, then its text
 *
 * Inline: **bold**, *italic*, ++underline++, ~~strike~~, ==highlight==,
 * :icon:, [words](address). A web address on its own is a link as it stands.
 * A Markdown table in a text is an embedded sheet.
 *
 * A footnote is written where its mark sits, ^[the note's words] (Pandoc's
 * inline note): the note travels with its sentence, and is numbered by
 * order of appearance when drawn. Its words are rich text themselves
 * (marks and links; no blocks). Markdown's reference form is read too,
 * [^id] in the text with a paragraph "[^id]: the note" anywhere, and is
 * folded into the inline form; the inline form is the one written. The
 * notes are drawn at the end of a text (a section of endnotes) or at the
 * foot of the slide that holds them; Markdown export writes them back out
 * in the reference form, for other readers.
 */
import { refFence, parse as parseTlo, write as writeTlo, parseInline, writeInline, hasClass, takeHead, balanceNote, type Attrs, type Block as TloBlock } from './tlo.ts';
import { embedOf, webRef } from './embeds.ts';
export { webRef };

export interface Run {
  t: string;
  b?: boolean;
  i?: boolean;
  u?: boolean;
  s?: boolean;
  /** Highlighted, in yellow. */
  h?: boolean;
  /** An icon, by name, in the line of text (t is then ''). */
  ic?: string;
  /** Where these words link to. */
  href?: string;
  /** A footnote: the note's words, as inline Markdown (t is then ''). */
  fn?: string;
}
export type Align = 'c' | 'r' | 'j';
export type BlockKind = 'p' | 'title' | 'h1' | 'h2' | 'ul' | 'ol' | 'e';
export interface Block {
  k: BlockKind;
  runs: Run[];
  /** For an embed ("e"): the document it holds, as "<app>\n<its text>" (see kit/embed.ts). */
  ref?: string;
  /** For list items: how far in, 0 (absent) for the outer level. */
  d?: number;
  /** Centred, right-aligned or justified; absent for the usual left. */
  a?: Align;
}

export const MAX_DEPTH = 3;
export const ALIGN_NAMES: Record<Align, string> = { c: 'center', r: 'right', j: 'justify' };
export const ALIGN_OF: Record<string, Align> = { center: 'c', right: 'r', justify: 'j' };

/** An address as it may be written in a link: what would end it early is percent-encoded. */
export const linkTarget = (url: string) => url.trim().replace(/[\s()]/g, (c) => '%' + c.charCodeAt(0).toString(16).toUpperCase().padStart(2, '0'));
/** Whether an address may be a link's target at all. */
export const linkable = (url: string) => /^(?:https?:\/\/[^\s]+|mailto:[^\s]+|tel:[^\s]+|#\S*)$/.test(linkTarget(url));

/**
 * Runs as one line of inline Markdown. Spaces on their own go with the
 * words before them: Markdown keeps spaces outside marks, so the marks
 * close there.
 */
export const serializeInline = (runs: Run[]): string =>
  writeInline(
    runs.reduce<Run[]>((out, r) => {
      const last = out[out.length - 1];
      if (last && !last.ic && !r.ic && last.fn === undefined && r.fn === undefined && !r.t.trim() && last.href === r.href) out[out.length - 1] = { ...last, t: last.t + r.t };
      else out.push(r);
      return out;
    }, []),
  );
/** One line of inline Markdown as runs. */
export { parseInline };
/** The marks as words: what a line says, without them. */
export const plainInline = (line: string) => parseInline(line).map((r) => r.t).join('');

const alignOf = (a?: Attrs): Align | undefined => a?.cls?.map((c) => ALIGN_OF[c]).find(Boolean);
const alignAttrs = (a?: Align, more: string[] = []): Attrs | undefined => (a || more.length ? { cls: [...more, ...(a ? [ALIGN_NAMES[a]] : [])] } : undefined);

/* ---------- footnotes ---------- */

const NOTE_DEF = /^\[\^([^\]\s]+)\]:\s*([\s\S]*)$/;
const NOTE_REF = /\[\^([^\]\s]+)\]/g;

/**
 * Markdown's reference footnotes folded into the inline form: a paragraph
 * "[^id]: the note" is taken out, and each "[^id]" in the words becomes
 * "^[the note]". A reference with no note stays as it was written.
 */
export function foldNotes(blocks: TloBlock[]): TloBlock[] {
  const defs = new Map<string, string>();
  // A paragraph that opens with a definition is definitions: each "[^id]:" line one, the lines under it carrying it on.
  const isDefs = (b: TloBlock) => b.k === 'p' && NOTE_DEF.test(b.text);
  for (const b of blocks.filter(isDefs)) {
    let id = '';
    for (const line of (b as { text: string }).text.split('\n')) {
      const m = NOTE_DEF.exec(line);
      if (m) defs.set((id = m[1]), m[2].trim());
      else if (id) defs.set(id, `${defs.get(id)} ${line.trim()}`.trim());
    }
  }
  if (!defs.size) return blocks;
  const fold = (t: string) => t.replace(NOTE_REF, (ref, id) => (defs.has(id) ? `^[${balanceNote(defs.get(id)!)}]` : ref));
  return blocks.filter((b) => !isDefs(b)).map((b) => ('text' in b ? { ...b, text: fold(b.text) } : b));
}

/** The notes a text holds, in order of appearance: each note's words, as inline Markdown. */
export const notesOf = (blocks: { runs: Run[] }[]): string[] => blocks.flatMap((b) => b.runs.filter((r) => r.fn !== undefined).map((r) => r.fn!));
/** The notes in lines of inline Markdown (a slide's words), in order. */
export const notesIn = (lines: string[]): string[] => notesOf(lines.map((l) => ({ runs: parseInline(l) })));
/** A note's words as runs (a note inside a note is left out). */
export const noteRuns = (fn: string): Run[] => parseInline(fn).filter((r) => r.fn === undefined);

/** Numbers notes as they come: each call is the next number. */
export const noteNumbers = (from = 0) => () => ++from;
/**
 * Runs as they are drawn: a note's mark is its number, raised (`sup`), the
 * numbers given by `next` (noteNumbers()).
 */
export const markNotes = (runs: Run[], next: () => number): (Run & { sup?: boolean })[] => runs.map((r) => (r.fn === undefined ? r : { t: String(next()), sup: true }));

/**
 * A text's notes written the way Markdown's other readers know: "[^n]" in
 * the words and "[^n]: the note" paragraphs at the end. For export; the
 * text itself keeps the inline form. A text with no notes is itself.
 */
export function referenceNotes(text: string): string {
  const doc = parseTlo(text);
  const notes: string[] = [];
  const out = (t: string) =>
    writeInline(
      parseInline(t).map((r) => {
        if (r.fn === undefined) return r;
        notes.push(r.fn);
        return { t: `[^${notes.length}]` };
      }),
    );
  const blocks = doc.blocks.map((b) => (b.k === 'h' || b.k === 'p' || b.k === 'li' || b.k === 'quote') && b.text.includes('^[') ? { ...b, text: b.text.split('\n').map(out).join('\n') } : b);
  if (!notes.length) return text;
  return writeTlo({ head: doc.head, blocks: [...blocks, ...notes.map((n, i) => ({ k: 'p', text: `[^${i + 1}]: ${n}` }) as TloBlock)] }).trimEnd();
}

/** A text's blocks from its TLO. What a text cannot hold (a quote, a rule) is kept as words. */
export function parseDoc(text: string): Block[] {
  if (!text.trim()) return [{ k: 'p', runs: [] }];
  const blocks: Block[] = [];
  const line = (k: BlockKind, s: string, a?: Attrs, d = 0) => {
    const blk: Block = { k, runs: parseInline(s) };
    if (d) blk.d = Math.min(MAX_DEPTH, d);
    const al = alignOf(a);
    if (al) blk.a = al;
    blocks.push(blk);
  };
  for (const b of foldNotes(parseTlo(text).blocks)) {
    if (b.k === 'h') line(hasClass(b, 'title') ? 'title' : b.level === 1 ? 'h1' : 'h2', b.text, b.a);
    // An empty paragraph, kept as the space it makes. A paragraph that is only a video's, a post's or a picture's address is that thing, from the web.
    else if (b.k === 'p') b.text.trim() === '<br>' ? blocks.push({ k: 'p', runs: [] }) : embedOf(b.text) ? blocks.push({ k: 'e', runs: [], ref: webRef(b.text.trim()) }) : line('p', b.text.replace(/\n/g, ' '), b.a);
    else if (b.k === 'li') line(b.ord ? 'ol' : 'ul', (b.done === undefined ? '' : b.done ? '☑ ' : '☐ ') + b.text.replace(/\n/g, ' '), b.a, b.depth);
    else if (b.k === 'quote') line('p', b.text.replace(/\n/g, ' '), b.a);
    else if (b.k === 'fence') blocks.push({ k: 'e', runs: [], ref: `${b.lang || 'write'}\n${b.body}` });
    else if (b.k === 'table') blocks.push({ k: 'e', runs: [], ref: `sheet\n${writeTlo({ head: {}, blocks: [b] }).trimEnd()}` });
    else if (b.k === 'img') embedOf(b.url) ? blocks.push({ k: 'e', runs: [], ref: webRef(b.url, b.alt) }) : line('p', `[${b.alt || b.url}](${b.url})`);
    else if (b.k === 'edge') line('p', `${b.from} ${b.dir} ${b.to}${b.label ? ': ' + b.label : ''}`);
  }
  return blocks.length ? blocks : [{ k: 'p', runs: [] }];
}

export function serializeDoc(blocks: Block[]): string {
  const out: TloBlock[] = [];
  for (const blk of blocks) {
    const text = serializeInline(blk.runs);
    if (blk.k === 'e') {
      if (!blk.ref?.includes('\n')) continue;
      const { lang, body } = refFence(blk.ref);
      // A thing from the web is written as its address alone: a picture as Markdown's image, the rest as a line.
      if (lang === 'web') {
        const [head, url] = takeHead(body, ['alt']);
        out.push(embedOf(url)?.kind === 'image' ? { k: 'img', alt: head.alt ?? '', url: url.trim() } : { k: 'p', text: url.trim() });
        continue;
      }
      // A sheet that is a table and nothing more is written as that table, as it was read.
      const sheet = lang === 'sheet' ? parseTlo(body) : null;
      const table = sheet && !Object.keys(sheet.head).length && sheet.blocks.length === 1 && sheet.blocks[0].k === 'table' ? sheet.blocks[0] : null;
      out.push(table ?? { k: 'fence', lang, body });
    } else if (blk.k === 'title') out.push({ k: 'h', level: 1, text, a: alignAttrs(blk.a, ['title']) });
    else if (blk.k === 'h1' || blk.k === 'h2') out.push({ k: 'h', level: blk.k === 'h1' ? 1 : 2, text, a: alignAttrs(blk.a) });
    else if (blk.k === 'ul' || blk.k === 'ol') out.push({ k: 'li', depth: blk.d ?? 0, ord: blk.k === 'ol', text, a: alignAttrs(blk.a) });
    // (An empty paragraph is written "<br>"; words that say "<br>" are escaped.)
    else out.push({ k: 'p', text: text === '<br>' ? '\\<br>' : text || '<br>', a: alignAttrs(blk.a) });
  }
  // Trailing empty paragraphs say nothing.
  while (out.length && out[out.length - 1].k === 'p' && (out[out.length - 1] as { text: string }).text === '<br>') out.pop();
  return writeTlo({ head: {}, blocks: out }).trimEnd();
}

/** Plain-text length of a document, handy for word/char counts. */
export function docText(blocks: Block[]): string {
  return blocks.map((b) => b.runs.map((r) => r.t).join('')).join('\n');
}

/**
 * Numbers a document's numbered lists as they come: given each block in
 * turn, it says a numbered item's number. A bulleted item ends the lists
 * deeper than it; anything else ends them all.
 */
export function listNumbers(): (blk: Block) => number | undefined {
  const counts: number[] = [];
  return (blk) => {
    const d = blk.d ?? 0;
    if (blk.k === 'ol') counts[d] = (counts[d] ?? 0) + 1;
    counts.length = blk.k === 'ol' ? d + 1 : blk.k === 'ul' ? Math.min(counts.length, d + 1) : 0;
    return counts[d];
  };
}

/** A run's words in pieces, each a link or not: linked words are one link, and a web address in plain words is a link as it stands. */
export const runLinks = (r: Run): { t: string; url?: string }[] => (r.href ? [{ t: r.t, url: r.href }] : linkify(r.t));

/**
 * Web addresses in a piece of text. Nothing is stored for a link: an address
 * in the text is a link wherever the text is shown.
 */
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
