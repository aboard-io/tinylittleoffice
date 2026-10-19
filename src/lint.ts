/**
 * A document checked by the API, never by eye: what a screenshot would have shown, said in words and numbers.
 * `lint` finds what the eye would have seen (a connection naming no thing, a comma splitting a number, a label
 * too long for its box, bullets under a chart, a headline shrunk or cut, a link too long to paste); `measure`
 * gives the numbers the layouts chose, page by page (and whether the link fits in a short link), so an agent can set its words from them, and how many words and
 * headings a reader meets (the text layer's). Both read the
 * layouts' own results (each app's lint.ts), with the fallback metrics the exports use, and never a browser.
 *
 * A paragraph or a bullet that links to another Tiny Little Office document is a finding in every app: the
 * document could be inside this one, as a fence named by its app (Paul 2026-10-12: an agent
 * shipped four companion links from a deck's bullets, believing a slide could not hold a chart or an animation).
 *
 * A host-kept picture (doc/image.ts) with no words for whoever cannot see it is a finding; so is one on a page that
 * keeps no pictures (the site, the API, the command line: kit/core/host.ts `images`), where it is drawn as a card
 * saying so, not an error, since the document is sound and opens whole where its host is.
 *
 * A document fenced inside another (a diagram on a slide, a chart in a text) is linted by its own app, its
 * findings at the fence's block. Every table, wherever it is, has its formulas worked out (apps/sheet/lint.ts):
 * one whose value is an error is a finding. Loaded lazily by src/api.ts (`lint`, `measure`) and the command line.
 */
import { imageOf, isImage, parse, textCounts, textOf, type Doc } from './doc/index.ts';
import { appOf } from './kit/core/apps.ts';
import { host } from './kit/core/host.ts';
import { textLayer } from './kit/text/text-layer.ts';
import { lintDiagram, measureDiagram } from './apps/diagram/lint.ts';
import { lintDeck, measureDeck } from './apps/deck/lint.ts';
import { lintSheet, measureSheet } from './apps/sheet/lint.ts';
import { slidesOf } from './apps/deck/model.ts';
import { SHORT_LINK_MAX } from './kit/share/short.ts';

/** One thing the eye would have seen: the block it is about, what kind of finding, the words that say it, what to do. */
export interface Found {
  block: number;
  kind: string;
  words: string;
  fix: string;
}

/** A finding as the API gives it: with the app whose document it is in, and where that is ("slide 3", "block 4"). */
export interface Finding extends Found {
  app: string;
  at: string;
}

/** The longest link that pastes everywhere: some chat apps cut a link past about 2,000 characters. */
export const LINK_MAX = 2000;

const LINTS: Record<string, (text: string) => Found[]> = { diagram: lintDiagram, deck: lintDeck };
/** The apps a fence may hold that the lint reads: those with a lint of their own, and the sheet, whose tables every document's lint reads. */
const linted = (lang: string) => lang in LINTS || lang === 'sheet';
/** A document's own findings in an app: its app's, and its tables'. */
const lintOf = (app: string, text: string): Found[] => [...(LINTS[app]?.(text) ?? []), ...lintSheet(text)];

/**
 * A link to a Tiny Little Office document: an app's plain link (`/<app>/#doc=`, `#md=`, with or without a title
 * before it), a packed one (`#/v1/<app>/`), or a short link of the site's own shortener.
 */
const DOC_LINK = /https?:\/\/(?:www\.)?tinylittleoffice\.com\/(?:[a-z]+\/)?#(?:\/v1\/|[^\s)>]*?\b(?:doc|md)=)|https?:\/\/tinier\.tinylittleoffice\.com\/[\w~-]+/;

/** Each paragraph or bullet whose words or links hold a link to a document that could be inside this one, as a fence. */
function docLinks(doc: Doc): Found[] {
  return doc.blocks.flatMap((b, block) =>
    (b.k === 'p' || b.k === 'li') && b.runs.some((r) => DOC_LINK.test(r.t) || (!!r.href && DOC_LINK.test(r.href)))
      ? [{ block, kind: 'doc-link', words: 'a link to a Tiny Little Office document in the words', fix: 'to show the document here, put its text in a fence named by its app' }]
      : [],
  );
}

/** Each picture: one with no words, and, where this page keeps no pictures, one that cannot be shown here. */
function pictures(doc: Doc): Found[] {
  return doc.blocks.flatMap((b, block) => {
    if (!isImage(b)) return [];
    const im = imageOf(b);
    if (!im)
      return [
        {
          block,
          kind: 'image-ref',
          words: 'a picture whose body is no reference a host keeps: one word, not an address and not the bytes',
          fix: 'put the reference the host gave in the fence, alone',
        },
      ];
    const out: Found[] = [];
    if (!im.alt.trim()) out.push({ block, kind: 'image-no-alt', words: 'a picture with no words for whoever cannot see it', fix: 'say what it shows on the fence: {alt="…"}' });
    if (!host.images)
      out.push({
        block,
        kind: 'image-not-kept',
        words: 'a picture this page does not keep: it is drawn as a card saying so',
        fix: 'open the document where its pictures are kept, or say it in words',
      });
    return out;
  });
}

/** Where block i is, as a person finds it: a deck's slide, else the block's number (from 1). */
function placeOf(app: string, doc: Doc): (i: number) => string {
  if (app !== 'deck') return (i) => `block ${i + 1}`;
  const slides = slidesOf(doc);
  return (i) => `slide ${Math.max(1, slides.findIndex((s) => i >= s.from && i < s.to) + 1)}`;
}

/** The findings of a document in an app, its fenced documents' too; `url`, its link, is held to LINK_MAX. */
export function lint(app: string, text: string, url = ''): Finding[] {
  const doc = parse(text);
  const where = placeOf(app, doc);
  const out: Finding[] = [...lintOf(app, text), ...docLinks(doc), ...pictures(doc)].map((f) => ({ app, at: where(f.block), ...f }));
  doc.blocks.forEach((b, i) => {
    if (b.k !== 'fence' || !linted(b.lang)) return;
    for (const f of lintOf(b.lang, b.body)) out.push({ ...f, app: b.lang, at: where(i), block: i });
  });
  if (url.length > LINK_MAX)
    out.push({
      app,
      at: 'the link',
      block: -1,
      kind: 'length',
      words: `the link is ${url.length.toLocaleString('en')} characters: some chat apps cut a link past ${LINK_MAX.toLocaleString('en')}, and a QR code holds 2,953`,
      fix: 'share a short link, or say less',
    });
  return out.sort((a, b) => a.block - b.block);
}

/** A finding as one line: app · where · the finding · what to do. */
export const findingLine = (f: Finding): string => `${f.app} · ${f.at} · ${f.words} · ${f.fix}`;

/** The numbers the layouts chose for a document: per slide or per diagram, per table its formulas, and its fenced documents', with the link's length. */
export interface Measure {
  app: string;
  length: number;
  /** Whether the link fits in a short link (kit/share/short.ts SHORT_LINK_MAX), and by how many characters it does not. */
  short: { fits: boolean; over: number };
  slides?: ReturnType<typeof measureDeck>;
  diagram?: ReturnType<typeof measureDiagram>;
  /** Each table, by its block: its formulas, and the ones whose value is an error. */
  tables?: ReturnType<typeof measureSheet>;
  /** The words a reader hears in it and the headings they can move between: its text layer's (src/doc/text.ts). */
  words: number;
  headings: number;
  /** The documents fenced in it, each where it is and as its app measures it. */
  fences?: ({ at: string; block: number; app: string } & Omit<Measure, 'app' | 'length' | 'short' | 'fences' | 'words' | 'headings'>)[];
}

const MEASURES: Record<string, (text: string) => Partial<Measure>> = {
  diagram: (text) => ({ diagram: measureDiagram(text) }),
  deck: (text) => ({ slides: measureDeck(text) }),
};

/** A document's own numbers in an app: its app's, and its tables'. */
function measureOf(app: string, text: string): Partial<Measure> {
  const tables = measureSheet(text);
  return { ...(MEASURES[app]?.(text) ?? {}), ...(tables.length ? { tables } : {}) };
}

export function measure(app: string, text: string, url = ''): Measure {
  const doc = parse(text);
  const where = placeOf(app, doc);
  const fences = doc.blocks.flatMap((b, i) => (b.k === 'fence' && (b.lang in MEASURES || b.lang === 'sheet') ? [{ at: where(i), block: i, app: b.lang, ...measureOf(b.lang, b.body) }] : []));
  const def = appOf(app);
  const over = Math.max(0, new TextEncoder().encode(url).length - SHORT_LINK_MAX);
  return { app, length: url.length, short: { fits: !over, over }, ...textCounts(def ? textLayer(def, text) : textOf(doc)), ...measureOf(app, text), ...(fences.length ? { fences } : {}) };
}
