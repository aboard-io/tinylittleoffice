/**
 * Write: words on a page. Rich text (headings, marks, lists, links, footnotes, icons), a table block the
 * formula engine works out in place, other documents and things from the web held in the text, printed
 * on letter or A4. The view is the document itself (docs/kernel.md §3); the editor is editor.ts around
 * one <to-text shape=doc>, the drawing and the files view.ts, the reading model.ts.
 */
import { PenLine } from 'lucide';
import { parse } from '../../doc/index.ts';
import { defineApp, isStill } from '../../kit/app.ts';
import { utf8 } from '../../kit/draw.ts';
import { t } from '../../kit/i18n.ts';
import { checkContract } from './contract.ts';
import { retitle, titleOf } from './model.ts';
import { templates } from './templates.ts';
import { docToDocx, docToHtml, docToMarkdown, docToRtf, pages } from './view.ts';
import { writeToDeck, writeToOutline } from './convert.ts';

/** The document read, its signatures verified first: a file says what was found when it was made. */
const checked = async (text: string) => {
  const doc = parse(text);
  await checkContract(doc);
  return doc;
};

export default defineApp({
  id: 'write',
  get name() {
    return t('Word Processor');
  },
  get noun() {
    return t('document');
  },
  get group() {
    return t('Words');
  },
  icon: PenLine,
  get blurb() {
    return t('Words on a page: headings, lists, links and notes, a table that adds up, printed on letter or A4.');
  },
  blank: () => '',
  get templates() {
    return templates();
  },
  editor: () => import('./editor.ts'),
  title: titleOf,
  retitle,
  view: (doc, opts) => pages(doc, opts?.small, isStill(opts)),
  exports: [
    {
      ext: 'docx',
      label: () => t('Word (DOCX)'),
      mime: 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
      shows: null,
      build: async (doc, ctx) => docToDocx(await checked(doc), ctx),
    },
    { ext: 'md', label: () => t('Markdown'), mime: 'text/markdown;charset=utf-8', shows: 'text', build: (doc) => docToMarkdown(parse(doc)) },
    { ext: 'rtf', label: () => t('Rich Text (RTF)'), mime: 'application/rtf', shows: null, build: async (doc, ctx) => utf8(docToRtf(await checked(doc), ctx)) },
    // In place of the kit's pictures of the pages: the words still words, in a page anyone can read.
    { ext: 'html', label: () => t('Web page (HTML)'), mime: 'text/html', shows: 'own', build: async (doc, ctx) => docToHtml(await checked(doc), ctx) },
  ],
  handoffs: [
    { to: 'deck', label: () => t('Show as slides'), convert: writeToDeck },
    { to: 'outline', label: () => t('Open as an outline'), convert: writeToOutline },
  ],
  commands: () => import('./commands.ts'),
});
