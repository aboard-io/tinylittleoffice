/**
 * Finding documents by what is in them (ported from the old tree's src/lib/search.ts): every word of the search must be
 * somewhere in the document (in any order; "words in quotes" together),
 * matched without regard to case or accents. The best come first: a word
 * in the title counts most, then the app or the folder, then the text, and
 * a match at the start of a word more than one inside it; the newest wins
 * a tie. Each result says where its words are: the title with them marked,
 * and the lines of the document that hold them, cut down to the part
 * around them.
 */
import { isText, parse, plainText } from '../doc/index.ts';

export interface Searchable {
  id: string;
  title: string;
  app: string;
  folder: string;
  /** The document's text, a line each (its outline). */
  lines: string[];
  at: number;
}
/** A stretch of text, and whether it is a match. */
export type Seg = { t: string; hit: boolean };
export interface Found {
  id: string;
  score: number;
  title: Seg[];
  /** Up to two lines of the document that hold the words, each cut down to the part around them. */
  context: Seg[][];
}

/** Lower case, accents off, character for character, so a match's place in the folded text is its place in the text. */
export const fold = (s: string) => [...s].map((c) => c.normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase().slice(0, 1) || c).join('');

/** The search as its terms: words, and phrases in quotes. */
export function termsOf(q: string): string[] {
  const out: string[] = [];
  for (const m of q.matchAll(/"([^"]+)"|(\S+)/g)) {
    const t = fold((m[1] ?? m[2]).trim());
    if (t) out.push(t);
  }
  return out;
}

/** Where the terms are in a text: [start, end) pairs, merged where they touch. */
function hits(text: string, terms: string[]): [number, number][] {
  const f = fold(text);
  const spans: [number, number][] = [];
  for (const t of terms) for (let i = f.indexOf(t); i >= 0; i = f.indexOf(t, i + 1)) spans.push([i, i + t.length]);
  spans.sort((a, b) => a[0] - b[0]);
  const merged: [number, number][] = [];
  for (const s of spans) {
    const last = merged[merged.length - 1];
    if (last && s[0] <= last[1]) last[1] = Math.max(last[1], s[1]);
    else merged.push([...s]);
  }
  return merged;
}

/** A text as stretches, the matches marked. */
export function marked(text: string, terms: string[]): Seg[] {
  const out: Seg[] = [];
  let at = 0;
  for (const [a, b] of hits(text, terms)) {
    if (a > at) out.push({ t: text.slice(at, a), hit: false });
    out.push({ t: text.slice(a, b), hit: true });
    at = b;
  }
  if (at < text.length) out.push({ t: text.slice(at), hit: false });
  return out;
}

/** A long line cut to about `room` characters around its first match, "…" where it was cut. */
function around(text: string, terms: string[], room = 110): Seg[] {
  const h = hits(text, terms);
  if (text.length <= room || !h.length) return marked(text.length > room ? text.slice(0, room) + '…' : text, terms);
  let from = Math.max(0, h[0][0] - Math.floor(room / 3));
  // Start at a word.
  if (from > 0) from = text.indexOf(' ', from) + 1 || from;
  const to = Math.min(text.length, from + room);
  return marked((from > 0 ? '…' : '') + text.slice(from, to).trim() + (to < text.length ? '…' : ''), terms);
}

/** How well a term fits a text: 0 not there, 1 inside a word, 2 at the start of one, 3 the whole of a word. */
function fit(text: string, term: string): number {
  const f = fold(text);
  let best = 0;
  for (let i = f.indexOf(term); i >= 0 && best < 3; i = f.indexOf(term, i + 1)) {
    const start = i === 0 || !/[\p{L}\p{N}]/u.test(f[i - 1]);
    const end = i + term.length >= f.length || !/[\p{L}\p{N}]/u.test(f[i + term.length]);
    best = Math.max(best, start && end ? 3 : start ? 2 : 1);
  }
  return best;
}

export function search(docs: Searchable[], q: string): Found[] {
  const terms = termsOf(q);
  if (!terms.length) return [];
  const found: Found[] = [];
  for (const d of docs) {
    let score = 0;
    let all = true;
    for (const t of terms) {
      const where = [fit(d.title, t) * 10, Math.max(fit(d.app, t), fit(d.folder, t)) * 4, Math.max(0, ...d.lines.map((l) => fit(l, t))) * 2];
      const best = Math.max(...where);
      if (!best) {
        all = false;
        break;
      }
      score += best;
    }
    if (!all) continue;
    // The lines that hold the most of the words, in their order in the document.
    const lines = d.lines
      .map((l, i) => ({ l: l.trim(), i, n: terms.filter((t) => fold(l).includes(t)).length }))
      .filter((x) => x.n && x.l && x.l !== d.title.trim())
      .sort((a, b) => b.n - a.n || a.i - b.i)
      .slice(0, 2)
      .sort((a, b) => a.i - b.i);
    found.push({ id: d.id, score, title: marked(d.title, terms), context: lines.map((x) => around(x.l, terms)) });
  }
  const at = new Map(docs.map((d) => [d.id, d.at]));
  return found.sort((a, b) => b.score - a.score || at.get(b.id)! - at.get(a.id)!);
}

/**
 * A document's text as lines to search, from the kernel: a line per block of words (marks left out), a
 * table's rows with their cells side by side, the lines of a document held inside it. The head's fields
 * other than the title (a calendar's zone, an invoice's "to") are lines too.
 */
export function linesOf(text: string): string[] {
  const doc = parse(text);
  const out = Object.entries(doc.head)
    .filter(([k, v]) => k !== 'title' && v)
    .map(([, v]) => v);
  for (const b of doc.blocks) {
    if (isText(b)) out.push(...plainText(b.runs).split('\n'));
    else if (b.k === 'table') out.push(...b.rows.map((row) => row.filter(Boolean).join(' · ')));
    // (A document locked with a password holds its sealed link: no words to find.)
    else if (b.k === 'fence' && b.lang !== 'locked') out.push(...linesOf(b.body));
    else if (b.k === 'edge') out.push(`${b.from} → ${b.to}${b.label ? `: ${b.label}` : ''}`);
  }
  return out.filter((l) => l.trim());
}
