/**
 * What the eye would see on a deck's slides, said in words and numbers (src/lint.ts runs it): the slide's own
 * layout (`layoutSlide`) says what it chose, so nothing here draws, and nothing needs a browser.
 *
 *   fence-bullets  a slide that shows a document and has bullets too: the document is drawn alone
 *   title-cut      a headline longer than its lines: the rest is not drawn
 *   title-small    a headline set at its smallest size to fit
 *   body-over      words that run past the foot of the slide at their smallest size
 *   body-small     words set at their smallest size to fit
 */
import { parse, plainText, type Block } from '../../doc/index.ts';
import { settingsOf, slidesOf, type Slide } from './model.ts';
import { layoutSlide } from './view.ts';
import type { Found } from '../../lint.ts';

const quote = (s: string, n = 48) => `"${s.length > n ? s.slice(0, n - 1).trimEnd() + '…' : s}"`;
const said = (s: Slide) => [...s.items, ...s.right].filter((it) => plainText(it.runs).trim() || it.runs.some((r) => r.ic));

/** What the document on a slide is, in a word: "the diagram", "the chart", "the table". */
function subName(b: Block | undefined): string {
  if (!b) return 'the document';
  if (b.k === 'fence') return /^chart:/m.test(b.body) ? 'the chart' : `the ${b.lang || 'document'}`;
  return b.a?.kv?.chart ? 'the chart' : 'the table';
}

/** The slide a finding is on, and the block it is about: its headline, or its first block. */
const blockOf = (s: Slide) => (s.head >= 0 ? s.head : s.from);

export function lintDeck(text: string): Found[] {
  const doc = parse(text);
  const printed = !!settingsOf(doc).format;
  const out: Found[] = [];
  slidesOf(doc).forEach((s) => {
    const bullets = said(s);
    if (s.sub >= 0 && bullets.length) {
      const what = subName(doc.blocks[s.sub]);
      out.push({
        block: blockOf(s),
        kind: 'fence-bullets',
        words: `the slide shows ${what} alone; the ${bullets.length === 1 ? 'line' : `${bullets.length} lines`} beside it (${quote(plainText(bullets[0].runs).trim(), 32)}${bullets.length > 1 ? ', …' : ''}) ${bullets.length === 1 ? 'is' : 'are'} not drawn`,
        fix: `put ${bullets.length === 1 ? 'it' : 'them'} in the notes (> lines) or on a slide of ${bullets.length === 1 ? 'its' : 'their'} own`,
      });
    }
    // A printed page with no layout is set as prose, by its own fitting; a slide's sizes are the deck's.
    if (printed) return;
    const L = layoutSlide(s);
    const title = plainText(s.title).trim();
    if (L.fit.title.cut)
      out.push({
        block: blockOf(s),
        kind: 'title-cut',
        words: `the headline ${quote(title)} is cut after ${L.title.lines.length} line${L.title.lines.length === 1 ? '' : 's'}: ${L.fit.title.cut} more ${L.fit.title.cut === 1 ? 'is' : 'are'} not drawn`,
        fix: 'a headline of a few words; the rest goes in a bullet or the notes',
      });
    else if (L.fit.title.smallest)
      out.push({
        block: blockOf(s),
        kind: 'title-small',
        words: `the headline ${quote(title)} is set at its smallest size, ${Math.round(L.titlePx)}px, to fit`,
        fix: 'a shorter headline is set larger',
      });
    if (L.fit.body.over > 0)
      out.push({
        block: blockOf(s),
        kind: 'body-over',
        words: `the words run ${Math.ceil(L.fit.body.over)}px past the foot of the slide, at their smallest size (${Math.round(L.bodyPx)}px)`,
        fix: 'fewer or shorter lines, or a second slide',
      });
    else if (L.fit.body.smallest)
      out.push({
        block: blockOf(s),
        kind: 'body-small',
        words: `the words are set at their smallest size, ${Math.round(L.bodyPx)}px, to fit`,
        fix: 'fewer or shorter lines are set larger, or a second slide',
      });
  });
  return out;
}

/** One slide as the layout set it: the sizes it chose, the lines it wrapped to, and what it left out. */
export interface SlideMeasure {
  slide: number;
  layout: string;
  title: { px: number; lines: number; smallest: boolean; cut: number };
  body: { px: number; lines: number; smallest: boolean; over: number };
  /** Lines written on the slide; on a slide that shows a document, none of them is drawn. */
  bullets: number;
  hidden: number;
  /** The document the slide shows, by its app ('table' for a table); '' for none. */
  shows: string;
  notes: number;
}

export function measureDeck(text: string): SlideMeasure[] {
  const doc = parse(text);
  return slidesOf(doc).map((s, i) => {
    const L = layoutSlide(s);
    const b = s.sub >= 0 ? doc.blocks[s.sub] : undefined;
    const bullets = said(s).length;
    const lines = L.cols.reduce((a, c) => a + c.items.reduce((n, it) => n + it.lines.length, 0), 0);
    return {
      slide: i + 1,
      layout: s.layout || 'bullets',
      title: { px: Math.round(L.titlePx * 10) / 10, lines: L.title.lines.length, smallest: L.fit.title.smallest, cut: L.fit.title.cut },
      body: { px: Math.round(L.bodyPx * 10) / 10, lines, smallest: L.fit.body.smallest, over: Math.ceil(L.fit.body.over) },
      bullets,
      hidden: s.sub >= 0 ? bullets : 0,
      shows: !b ? '' : b.k === 'fence' ? b.lang || 'text' : b.k === 'table' ? 'table' : '',
      notes: s.noteLines.length,
    };
  });
}
