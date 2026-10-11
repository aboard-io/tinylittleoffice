/**
 * A text opened as another app (the Download menu's "Open in"): pure functions from this document's text to
 * the other app's. As slides, a slide a heading (the title heading the title slide), what follows it on the
 * slide, a page break a new slide too. As an outline, the kernel's own reading of headings and paragraphs as
 * a tree (outline/model.ts `listify`).
 */
import { applyAll, parse, write, type Block, type Doc, type Head } from '../../doc/index.ts';
import { listify } from '../outline/model.ts';
import { titleBlock, titleOf } from './model.ts';

const head = (text: string): Head => {
  const title = titleOf(text);
  return title ? { title } : {};
};

/** The blocks with the title heading taken out (the head carries the name). */
const body = (doc: Doc): Block[] => {
  const t = titleBlock(doc);
  return doc.blocks.filter((b) => b !== t);
};

export function writeToDeck(text: string): string {
  const doc = parse(text);
  const slides: Block[][] = [];
  const title = titleBlock(doc);
  let cur: Block[] | null = null;
  for (const b of doc.blocks) {
    if (b === title) {
      slides.push((cur = [{ k: 'h', level: 2, runs: b.runs, a: { cls: ['title'] } }]));
    } else if (b.k === 'h' && b.level <= 2) {
      slides.push((cur = [{ k: 'h', level: 2, runs: b.runs }]));
    } else if (b.k === 'hr') {
      cur = null;
    } else {
      if (!cur) slides.push((cur = []));
      // A heading further down is a line of the slide; the rest goes as it is.
      cur.push(b.k === 'h' ? { k: 'p', runs: b.runs.map((r) => ({ ...r, b: true as const })) } : b);
    }
  }
  return write({ head: head(text), blocks: slides.filter((s) => s.length).flatMap((s, n) => (n ? [{ k: 'hr' } as Block, ...s] : s)) });
}

export function writeToOutline(text: string): string {
  const doc: Doc = { head: head(text), blocks: body(parse(text)).filter((b) => b.k !== 'hr') };
  return write(applyAll(doc, listify(doc)));
}
