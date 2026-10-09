/**
 * Calculator: a tape. Every line worked out as it is typed, a line "a = 12" keeping its answer by name for
 * the lines after, units and conversions and a little algebra beside the plain sums; or curves y = f(x)
 * drawn. The document is the tape (model.ts), the editor is editor.ts (the mathjs engine a chunk of its own,
 * math.ts), the drawing and the text view.ts.
 */
import { Calculator } from 'lucide';
import { apply, parse, write } from '../../doc/index.ts';
import { defineApp, type Doc } from '../../kit/app.ts';
import { t } from '../../kit/i18n.ts';
import { templates } from './templates.ts';
import { calcPage, tapeText } from './view.ts';

export const titleOf = (doc: Doc): string => parse(doc).head.title ?? '';
export const retitle = (doc: Doc, title: string): Doc => write(apply(parse(doc), { op: 'head', key: 'title', value: title.replace(/\n/g, ' ').trim() || undefined }));

export default defineApp({
  id: 'calc',
  get name() {
    return t('Calculator');
  },
  get noun() {
    return t('calculation');
  },
  get group() {
    return t('Numbers');
  },
  icon: Calculator,
  get blurb() {
    return t('A calculator that keeps its working: names, units and conversions, and graphs of y = f(x).');
  },
  blank: () => '',
  get templates() {
    return templates();
  },
  editor: () => import('./editor.ts'),
  title: titleOf,
  retitle,
  view: (doc, opts) => [calcPage(parse(doc), opts?.small)],
  exports: [{ ext: 'txt', label: () => t('The tape (text)'), mime: 'text/plain;charset=utf-8', build: (doc) => tapeText(parse(doc)) }],
});
