/**
 * Todo: the simplest list. Tasks to tick off, a star on the ones that matter and a due date on the ones that
 * have a day. The document is a task list (model.ts), the editor is editor.ts, the drawing and the files view.ts.
 */
import { ListTodo } from 'lucide';
import { apply, parse, write, type Doc as Kernel } from '../../doc/index.ts';
import { defineApp, type Doc } from '../../kit/app.ts';
import { utf8 } from '../../kit/draw.ts';
import { t } from '../../kit/i18n.ts';
import { templates } from './templates.ts';
import { todoPage, todoToIcs, todoToMarkdown } from './view.ts';

const headOf = (doc: Doc): Kernel => parse(doc);
export const titleOf = (doc: Doc): string => headOf(doc).head.title ?? '';
export const retitle = (doc: Doc, title: string): Doc => write(apply(headOf(doc), { op: 'head', key: 'title', value: title.replace(/\n/g, ' ').trim() || undefined }));

export default defineApp({
  id: 'todo',
  get name() {
    return t('To-Do List');
  },
  get group() {
    return t('Plan');
  },
  icon: ListTodo,
  get blurb() {
    return t('Tasks to tick off, with stars and due dates.');
  },
  // One empty task to type into.
  blank: () => '- [ ]\n',
  get templates() {
    return templates();
  },
  editor: () => import('./editor.ts'),
  title: titleOf,
  retitle,
  view: (doc, opts) => [todoPage(parse(doc), opts?.small ? 8 : Infinity)],
  exports: [
    { ext: 'md', label: () => t('Markdown'), mime: 'text/markdown;charset=utf-8', build: (doc) => todoToMarkdown(parse(doc)) },
    { ext: 'ics', label: () => t('Calendar to-dos (ICS)'), mime: 'text/calendar;charset=utf-8', build: (doc) => utf8(todoToIcs(parse(doc), Date.now())) },
  ],
});
