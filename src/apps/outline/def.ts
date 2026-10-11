/**
 * Outline: an outliner, ideas under ideas. The document is a nested list with lines to parents, documents
 * under items and joins between any two (model.ts); the drawing is view.ts; the editor editor.ts. The same
 * tree a deck, a mind map, an org chart or a network reads: those are hand-offs, shown once the apps exist.
 */
import { ListTree } from 'lucide';
import { apply, parse, write, type Doc as Kernel } from '../../doc/index.ts';
import { defineApp, type Doc } from '../../kit/app.ts';
import { utf8 } from '../../kit/draw.ts';
import { textPdf } from '../../kit/textpdf.ts';
import { t } from '../../kit/i18n.ts';
import { liveItems, notesAsItems, outlineBlocks, outlineText, outlineToDeck, outlineToMind, outlineToFamily, outlineToNet, outlineToOrg, readOutline, toOpml } from './model.ts';
import { appName, outlinePage } from './view.ts';
import { templates } from './templates.ts';
import { partOf } from '../../kit/steps.ts';

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
    t('Untitled {noun}', { noun: t('outline') })
  );
}

const convert = (how: (v: ReturnType<typeof readOutline>, head: Kernel['head']) => string) => (doc: Doc) => {
  const d = headOf(doc);
  return how(readOutline(d), d.head);
};

export default defineApp({
  id: 'outline',
  get name() {
    return t('Outliner');
  },
  get noun() {
    return t('outline');
  },
  get group() {
    return t('Words');
  },
  icon: ListTree,
  get blurb() {
    return t('An outliner: ideas under ideas, folded and unfolded, moved around and joined; the same tree a deck or a mind map reads.');
  },
  blank: () => '',
  get templates() {
    return templates();
  },
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
    { ext: 'opml', label: () => t('OPML (for outliners)'), mime: 'text/x-opml;charset=utf-8', shows: null, build: (doc) => utf8(toOpml(readOutline(parse(doc)), nameFor(doc))) },
    // Markdown as other readers know it: an item's notes a numbered list right under it (any other in reference form at the end).
    { ext: 'md', label: () => t('Markdown'), mime: 'text/markdown;charset=utf-8', shows: 'text', build: (doc) => utf8(write(notesAsItems(parse(doc)))) },
    // The words as words: sections and bullets, selectable, linked, bookmarked (kit/textpdf.ts), in place of the kit's pictures of the page.
    {
      ext: 'pdf',
      label: () => t('PDF: sections and bullets'),
      mime: 'application/pdf',
      shows: 'own',
      build: (doc, ctx) => textPdf(outlineBlocks(readOutline(parse(doc)), ctx.title || titleOf(doc), t('Notes')), ctx.title || nameFor(doc)),
    },
    { ext: 'txt', label: () => t('Plain text'), mime: 'text/plain;charset=utf-8', shows: 'text', build: (doc) => utf8(outlineText(readOutline(parse(doc)), appName)) },
  ],
  handoffs: [
    { to: 'deck', label: () => t('Show as slides'), convert: convert(outlineToDeck) },
    { to: 'diagram', label: () => t('Draw as a mind map'), convert: convert(outlineToMind) },
    { to: 'diagram', label: () => t('Draw as an org chart'), convert: convert(outlineToOrg) },
    { to: 'diagram', label: () => t('Draw as a family tree'), convert: convert(outlineToFamily) },
    { to: 'diagram', label: () => t('Draw as a network'), convert: convert(outlineToNet) },
  ],
  commands: () => import('./commands.ts'),
});
