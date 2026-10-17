/**
 * Write's looks: the type a document is set in, named in its head (`look: serif`) and worn everywhere it is
 * drawn: the editor (a data-look on the page, style.css), the pages (view.ts: print, PDF, pictures,
 * previews), the web page (CSS), Word (font names) and RTF (the font table). Absent means `sans`, the site's
 * own type. The sans, the serif and the mono are IBM Plex, the site's own files (src/styles/fonts.css), each with the
 * system's stack behind it for a page read without the site; the narrow face is the system's.
 *
 *   sans     the site's sans throughout
 *   serif    a serif throughout
 *   mono     a monospace throughout, ragged right, a typewriter's page
 *   mixed    serif headings over a sans body
 *   inverse  sans headings over a serif body
 *   book     serif, justified, each paragraph indented with no gap before it, headings in small caps
 *   news     a narrow serif headline over a sans body, set in two columns on paper
 */
import type { Doc } from '../../doc/index.ts';
import { FONT, MONO } from '../../kit/draw/draw.ts';
import { t } from '../../kit/core/i18n.ts';

export type Face = 'sans' | 'serif' | 'mono' | 'narrow';
export type LookId = 'sans' | 'serif' | 'mono' | 'mixed' | 'inverse' | 'book' | 'news';

/** The stacks, as CSS and SVG name them. */
export const STACKS: Record<Face, string> = {
  sans: FONT,
  serif: "'IBM Plex Serif', Charter, 'Bitstream Charter', 'Iowan Old Style', 'Palatino Linotype', Georgia, 'Noto Serif', serif",
  mono: MONO,
  narrow: "'Bodoni 72', Didot, 'Times New Roman', Times, 'Noto Serif', serif",
};
/** How wide each face sets beside the sans the page's widths are estimated in (kit/draw/draw.ts textWidth): Plex Serif and Plex Mono beside Plex Sans, measured. */
export const WIDTH: Record<Face, number> = { sans: 1, serif: 1.06, mono: 1.23, narrow: 0.9 };
/** The face a word processor names, for .docx and .rtf: one font each, the one most systems have. */
export const NAMED: Record<Face, { name: string; rtf: 'fswiss' | 'froman' | 'fmodern' }> = {
  sans: { name: 'Calibri', rtf: 'fswiss' },
  serif: { name: 'Georgia', rtf: 'froman' },
  mono: { name: 'Courier New', rtf: 'fmodern' },
  narrow: { name: 'Times New Roman', rtf: 'froman' },
};

export interface Look {
  id: LookId;
  name: () => string;
  /** The two lines the Look menu shows, in the look's own type. */
  sample: () => string;
  head: Face;
  body: Face;
  /** Lines set flush on both sides. */
  justify?: boolean;
  /** Each paragraph after the first indented, no gap between them. */
  indent?: boolean;
  /** Headings (not the title) in small capitals. */
  caps?: boolean;
  /** The body in two columns on paper. */
  columns?: 2;
}

export const LOOKS: Record<LookId, Look> = {
  sans: { id: 'sans', name: () => t('write-sans'), sample: () => t('write-clean-and-plain-throughout'), head: 'sans', body: 'sans' },
  serif: { id: 'serif', name: () => t('looks-serif'), sample: () => t('write-bookish-serif-throughout'), head: 'serif', body: 'serif' },
  mono: { id: 'mono', name: () => t('looks-typewriter'), sample: () => t('write-monospace-ragged-right'), head: 'mono', body: 'mono' },
  mixed: { id: 'mixed', name: () => t('write-serif-and-sans'), sample: () => t('write-serif-headings-sans-text'), head: 'serif', body: 'sans' },
  inverse: { id: 'inverse', name: () => t('write-sans-and-serif'), sample: () => t('write-sans-headings-serif-text'), head: 'sans', body: 'serif' },
  book: { id: 'book', name: () => t('write-book'), sample: () => t('write-justified-indented-small-caps'), head: 'serif', body: 'serif', justify: true, indent: true, caps: true },
  news: { id: 'news', name: () => t('write-newspaper'), sample: () => t('write-narrow-headline-two-columns'), head: 'narrow', body: 'sans', columns: 2 },
};
export const LOOK_IDS = Object.keys(LOOKS) as LookId[];

/** The look the head names, else sans. */
export const lookOf = (doc: Doc): Look => (Object.hasOwn(LOOKS, doc.head.look ?? '') ? LOOKS[doc.head.look as LookId] : LOOKS.sans);
