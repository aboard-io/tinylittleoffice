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
import { todoToBoard, todoToCal } from './convert.ts';
import { partOf } from '../../kit/steps.ts';
import { readTodo } from './model.ts';

/** How many tasks a list drawn small (on a slide, as a thumbnail) shows. */
const SMALL = 8;

const headOf = (doc: Doc): Kernel => parse(doc);
export const titleOf = (doc: Doc): string => headOf(doc).head.title ?? '';
export const retitle = (doc: Doc, title: string): Doc => write(apply(headOf(doc), { op: 'head', key: 'title', value: title.replace(/\n/g, ' ').trim() || undefined }));

export default defineApp({
  id: 'todo',
  get name() {
    return t('To-Do List');
  },
  get noun() {
    return t('list');
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
  view: (doc, opts) => {
    const d = parse(doc);
    const max = opts?.small ? SMALL : Infinity;
    if (opts?.upTo === undefined) return [todoPage(d, max)];
    // A task a step: the tasks after the ones shown so far left out of the drawing, the page the whole list's.
    const shown = new Set(readTodo(d).tasks.slice(0, opts.upTo).map((x) => x.at));
    return [partOf(todoPage(d, max), todoPage({ ...d, blocks: d.blocks.map((b, i) => (b.k === 'li' && !shown.has(i) ? { k: 'hr' as const } : b)) }, max))];
  },
  // On a slide (drawn small, the first eight), a task a step.
  steps: (doc) => Math.min(SMALL, readTodo(parse(doc)).tasks.length),
  exports: [
    { ext: 'md', label: () => t('Markdown'), mime: 'text/markdown;charset=utf-8', shows: 'text', build: (doc) => todoToMarkdown(parse(doc)) },
    { ext: 'ics', label: () => t('Calendar to-dos (ICS)'), mime: 'text/calendar;charset=utf-8', shows: null, build: (doc) => utf8(todoToIcs(parse(doc), Date.now())) },
  ],
  handoffs: [
    { to: 'board', label: () => t('Show on a board'), convert: todoToBoard },
    { to: 'cal', label: () => t('Put the dated tasks on a calendar'), convert: todoToCal },
  ],
});
