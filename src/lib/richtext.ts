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
 */
import { parse as parseTlo, write as writeTlo, parseInline as tloInline, writeInline, hasClass, type Attrs, type Block as TloBlock } from './tlo.ts';

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
const ALIGN_OF: Record<string, Align> = { center: 'c', right: 'r', justify: 'j' };

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
      if (last && !last.ic && !r.ic && !r.t.trim() && last.href === r.href) out[out.length - 1] = { ...last, t: last.t + r.t };
      else out.push(r);
      return out;
    }, []),
  );
/** One line of inline Markdown as runs. */
export const parseInline = (line: string): Run[] => tloInline(line);
/** The marks as words: what a line says, without them. */
export const plainInline = (line: string) => parseInline(line).map((r) => r.t).join('');

const alignOf = (a?: Attrs): Align | undefined => a?.cls?.map((c) => ALIGN_OF[c]).find(Boolean);
const alignAttrs = (a?: Align, more: string[] = []): Attrs | undefined => (a || more.length ? { cls: [...more, ...(a ? [ALIGN_NAMES[a]] : [])] } : undefined);

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
  for (const b of parseTlo(text).blocks) {
    if (b.k === 'h') line(hasClass(b, 'title') ? 'title' : b.level === 1 ? 'h1' : 'h2', b.text, b.a);
    // An empty paragraph, kept as the space it makes.
    else if (b.k === 'p') b.text.trim() === '<br>' ? blocks.push({ k: 'p', runs: [] }) : line('p', b.text.replace(/\n/g, ' '), b.a);
    else if (b.k === 'li') line(b.ord ? 'ol' : 'ul', (b.done === undefined ? '' : b.done ? '☑ ' : '☐ ') + b.text.replace(/\n/g, ' '), b.a, b.depth);
    else if (b.k === 'quote') line('p', b.text.replace(/\n/g, ' '), b.a);
    else if (b.k === 'fence') blocks.push({ k: 'e', runs: [], ref: `${b.lang || 'write'}\n${b.body}` });
    else if (b.k === 'table') blocks.push({ k: 'e', runs: [], ref: `sheet\n${writeTlo({ head: {}, blocks: [b] }).trimEnd()}` });
    else if (b.k === 'img') line('p', `[${b.alt || b.url}](${b.url})`);
    else if (b.k === 'edge') line('p', `${b.from} ${b.dir} ${b.to}${b.label ? ': ' + b.label : ''}`);
  }
  return blocks.length ? blocks : [{ k: 'p', runs: [] }];
}

export function serializeDoc(blocks: Block[]): string {
  const out: TloBlock[] = [];
  for (const blk of blocks) {
    const text = serializeInline(blk.runs);
    if (blk.k === 'e') {
      const nl = blk.ref?.indexOf('\n') ?? -1;
      if (nl < 0) continue;
      const [lang, body] = [blk.ref!.slice(0, nl), blk.ref!.slice(nl + 1)];
      // A sheet that is a table and nothing more is written as that table, as it was read.
      const sheet = lang === 'sheet' ? parseTlo(body) : null;
      const table = sheet && !Object.keys(sheet.head).length && sheet.blocks.length === 1 && sheet.blocks[0].k === 'table' ? sheet.blocks[0] : null;
      out.push(table ?? { k: 'fence', lang, body });
    } else if (blk.k === 'title') out.push({ k: 'h', level: 1, text, a: alignAttrs(blk.a, ['title']) });
    else if (blk.k === 'h1' || blk.k === 'h2') out.push({ k: 'h', level: blk.k === 'h1' ? 1 : 2, text, ...(blk.a ? { a: alignAttrs(blk.a) } : {}) });
    else if (blk.k === 'ul' || blk.k === 'ol') out.push({ k: 'li', depth: blk.d ?? 0, ...(blk.k === 'ol' ? { ord: true } : {}), text, ...(blk.a ? { a: alignAttrs(blk.a) } : {}) });
    // (An empty paragraph is written "<br>"; words that say "<br>" are escaped.)
    else out.push({ k: 'p', text: text === '<br>' ? '\\<br>' : text || '<br>', ...(blk.a ? { a: alignAttrs(blk.a) } : {}) });
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
