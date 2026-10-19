/**
 * Outline: an outliner, ideas under ideas. The document is a nested list with lines to parents, documents
 * under items and joins between any two (model.ts); the drawing is view.ts; the editor editor.ts. The same
 * tree a deck, a mind map, an org chart or a network reads: those are hand-offs, shown once the apps exist.
 */
import { ListTree } from 'lucide';
import { apply, parse, write, type Doc as Kernel } from '../../doc/index.ts';
import { defineApp, type Doc } from '../../kit/core/app.ts';
import { utf8 } from '../../kit/draw/draw.ts';
import { textPdf } from '../../kit/file/textpdf.ts';
import { t } from '../../kit/core/i18n.ts';
import {
  liveItems,
  notesAsItems,
  outlineBlocks,
  outlineText,
  outlineToCal,
  outlineToDeck,
  outlineToMind,
  outlineToLanes,
  outlineToFamily,
  outlineToNet,
  outlineToOrg,
  readOutline,
  toOpml,
} from './model.ts';
import { appName, outlinePage } from './view.ts';
import { partOf } from '../../kit/draw/steps.ts';

const headOf = (doc: Doc): Kernel => parse(doc);
/** The document's name: its title head field. */
export const titleOf = (doc: Doc): string => headOf(doc).head.title ?? '';
/** The document with this name: one head op, written back. */
export const retitle = (doc: Doc, title: string): Doc => write(apply(headOf(doc), { op: 'head', key: 'title', value: title.replace(/\n/g, ' ').trim() || undefined }));

/** What the outline is called in a file: its title, else its first words. */
function nameFor(doc: Doc): string {
  const d = headOf(doc);
  const first = liveItems(readOutline(d)).find((it) => !it.doc);
  return (
    d.head.title ||
    (first
      ? first.runs
          .map((r) => r.t)
          .join('')
          .trim()
      : '') ||
    t('common-untitled-noun', { noun: t('outline-outline-lowercase') })
  );
}

const convert = (how: (v: ReturnType<typeof readOutline>, head: Kernel['head']) => string) => (doc: Doc) => {
  const d = headOf(doc);
  return how(readOutline(d), d.head);
};

export default defineApp({
  id: 'outline',
  get name() {
    return t('outline-outliner');
  },
  get noun() {
    return t('outline-outline-lowercase');
  },
  get group() {
    return t('common-words');
  },
  icon: ListTree,
  get blurb() {
    return t('outline-outliner-ideas-under-ideas-folded');
  },
  blank: () => '',
  templates: () => import('./templates.ts').then((m) => m.templates()),
  editor: () => import('./editor.ts'),
  title: titleOf,
  retitle,
  view: (doc, opts) => {
    const d = parse(doc);
    if (opts?.upTo === undefined) return [outlinePage(d, 720, opts?.small)];
    // An item a step: the document cut after the last item shown (drawn from the top, nothing above it moves), the page the whole outline's.
    const next = readOutline(d).items[opts.upTo];
    return [partOf(outlinePage(d, 720, opts.small), outlinePage({ ...d, blocks: next ? d.blocks.slice(0, next.at) : d.blocks }, 720, opts.small))];
  },
  // On a slide (drawn small, the first twelve), an item a step.
  steps: (doc) => Math.min(12, readOutline(parse(doc)).items.length),
  exports: [
    { ext: 'opml', label: () => t('outline-opml-for-outliners'), mime: 'text/x-opml;charset=utf-8', shows: null, build: (doc) => utf8(toOpml(readOutline(parse(doc)), nameFor(doc))) },
    // Markdown as other readers know it: an item's notes a numbered list right under it (any other in reference form at the end).
    { ext: 'md', label: () => t('common-markdown'), mime: 'text/markdown;charset=utf-8', shows: 'text', build: (doc) => utf8(write(notesAsItems(parse(doc)))) },
    // The words as words: sections and bullets, selectable, linked, bookmarked (kit/file/textpdf.ts), in place of the kit's pictures of the page.
    {
      ext: 'pdf',
      label: () => t('outline-pdf-sections-and-bullets'),
      mime: 'application/pdf',
      shows: 'own',
      build: (doc, ctx) => textPdf(outlineBlocks(readOutline(parse(doc)), ctx.title || titleOf(doc), t('common-notes')), ctx.title || nameFor(doc)),
    },
    { ext: 'txt', label: () => t('outline-plain-text'), mime: 'text/plain;charset=utf-8', shows: 'text', build: (doc) => utf8(outlineText(readOutline(parse(doc)), appName)) },
  ],
  handoffs: [
    { to: 'deck', label: () => t('common-show-as-slides'), convert: convert(outlineToDeck) },
    { to: 'diagram', label: () => t('outline-draw-as-mind-map'), convert: convert(outlineToMind) },
    { to: 'diagram', label: () => t('outline-draw-as-swimlanes'), convert: convert(outlineToLanes) },
    { to: 'diagram', label: () => t('outline-draw-as-org-chart'), convert: convert(outlineToOrg) },
    { to: 'diagram', label: () => t('outline-draw-as-family-tree'), convert: convert(outlineToFamily) },
    { to: 'diagram', label: () => t('outline-draw-as-network'), convert: convert(outlineToNet) },
    { to: 'cal', label: () => t('common-calendar'), convert: convert(outlineToCal) },
  ],
  commands: () => import('./commands.ts'),
});
