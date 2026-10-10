/**
 * A document checked by the API, never by eye: what a screenshot would have shown, said in words and numbers.
 * `lint` finds what the eye would have seen (a connection naming no thing, a comma splitting a number, a label
 * too long for its box, bullets under a chart, a headline shrunk or cut, a link too long to paste); `measure`
 * gives the numbers the layouts chose, page by page, so an agent can set its words from them. Both read the
 * layouts' own results (each app's lint.ts), with the fallback metrics the exports use, and never a browser.
 *
 * A document fenced inside another (a diagram on a slide, a chart in a text) is linted by its own app, its
 * findings at the fence's block. Loaded lazily by src/api.ts (`lint`, `measure`) and the command line.
 */
import { parse, type Doc } from './doc/index.ts';
import { lintDiagram, measureDiagram } from './apps/diagram/lint.ts';
import { lintDeck, measureDeck } from './apps/deck/lint.ts';
import { slidesOf } from './apps/deck/model.ts';

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
  const out: Finding[] = (LINTS[app]?.(text) ?? []).map((f) => ({ app, at: where(f.block), ...f }));
  doc.blocks.forEach((b, i) => {
    if (b.k !== 'fence' || !LINTS[b.lang]) return;
    for (const f of LINTS[b.lang](b.body)) out.push({ ...f, app: b.lang, at: where(i), block: i });
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

/** The numbers the layouts chose for a document: per slide or per diagram, and its fenced documents', with the link's length. */
export interface Measure {
  app: string;
  length: number;
  slides?: ReturnType<typeof measureDeck>;
  diagram?: ReturnType<typeof measureDiagram>;
  /** The documents fenced in it, each where it is and as its app measures it. */
  fences?: { at: string; block: number; app: string; diagram?: ReturnType<typeof measureDiagram>; slides?: ReturnType<typeof measureDeck> }[];
}

const MEASURES: Record<string, (text: string) => Partial<Measure>> = {
  diagram: (text) => ({ diagram: measureDiagram(text) }),
  deck: (text) => ({ slides: measureDeck(text) }),
};

export function measure(app: string, text: string, url = ''): Measure {
  const doc = parse(text);
  const where = placeOf(app, doc);
  const fences = doc.blocks.flatMap((b, i) => (b.k === 'fence' && MEASURES[b.lang] ? [{ at: where(i), block: i, app: b.lang, ...MEASURES[b.lang](b.body) }] : []));
  return { app, length: url.length, ...(MEASURES[app]?.(text) ?? {}), ...(fences.length ? { fences } : {}) };
}
