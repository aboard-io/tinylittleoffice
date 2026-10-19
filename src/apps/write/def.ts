/**
 * Write: words on a page. Rich text (headings, marks, lists, links, footnotes, icons), a table block the
 * formula engine works out in place, other documents held in the text, printed on letter or A4. The view is the document itself (docs/kernel.md §3); the editor is editor.ts around
 * one <to-text shape=doc>, the drawing and the files view.ts, the reading model.ts.
 */
import { PenLine } from 'lucide';
import { parse } from '../../doc/index.ts';
import { defineApp, isStill } from '../../kit/core/app.ts';
import { utf8 } from '../../kit/draw/draw.ts';
import { t } from '../../kit/core/i18n.ts';
import { retitle, titleOf } from './model.ts';
import { docToDocx, docToHtml, docToMarkdown, docToRtf, pages } from './view.ts';
import { writeToDeck, writeToOutline } from './convert.ts';

export default defineApp({
  id: 'write',
  get name() {
    return t('common-word-processor');
  },
  get noun() {
    return t('write-document-lowercase');
  },
  get group() {
    return t('common-words');
  },
  icon: PenLine,
  get blurb() {
    return t('write-words-on-page-headings-lists');
  },
  blank: () => '',
  templates: () => import('./templates.ts').then((m) => m.templates()),
  editor: () => import('./editor.ts'),
  title: titleOf,
  // A page of words: on a slide, what fits and "See more", never shrunk past reading (deck/view.ts).
  long: true,
  retitle,
  view: (doc, opts) => pages(doc, opts?.small, isStill(opts)),
  exports: [
    {
      ext: 'docx',
      label: () => t('write-word-docx'),
      mime: 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
      shows: null,
      build: async (doc, ctx) => docToDocx(parse(doc), ctx),
    },
    { ext: 'md', label: () => t('common-markdown'), mime: 'text/markdown;charset=utf-8', shows: 'text', build: (doc, ctx) => docToMarkdown(parse(doc), ctx) },
    { ext: 'rtf', label: () => t('write-rich-text-rtf'), mime: 'application/rtf', shows: null, build: async (doc, ctx) => utf8(docToRtf(parse(doc), ctx)) },
    // In place of the kit's pictures of the pages: the words still words, in a page anyone can read.
    { ext: 'html', label: () => t('common-web-page-html'), mime: 'text/html', shows: 'own', build: async (doc, ctx) => docToHtml(parse(doc), ctx) },
  ],
  handoffs: [
    { to: 'deck', label: () => t('common-show-as-slides'), convert: writeToDeck },
    { to: 'outline', label: () => t('write-open-as-outline'), convert: writeToOutline },
  ],
  commands: () => import('./commands.ts'),
});
