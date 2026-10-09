/**
 * Board: a kanban board. The stages of a workflow as columns, cards in them, a limit on how many a stage
 * should hold and a colour for each. The document is headings and list items (model.ts), the editor is
 * editor.ts, the drawing and the CSV view.ts.
 */
import { Kanban } from 'lucide';
import { apply, parse, write, type Doc as Kernel } from '../../doc/index.ts';
import { defineApp, type Doc } from '../../kit/app.ts';
import { utf8 } from '../../kit/draw.ts';
import { t } from '../../kit/i18n.ts';
import { templates } from './templates.ts';
import { boardPage, boardToCsv } from './view.ts';

const headOf = (doc: Doc): Kernel => parse(doc);
export const titleOf = (doc: Doc): string => headOf(doc).head.title ?? '';
export const retitle = (doc: Doc, title: string): Doc => write(apply(headOf(doc), { op: 'head', key: 'title', value: title.replace(/\n/g, ' ').trim() || undefined }));

/** A new board: the three stages every workflow starts with, as headings to type under. */
export const blank = (): Doc => `## ${t('To do')}\n\n## ${t('Doing')}\n\n## ${t('Done')}\n`;

export default defineApp({
  id: 'board',
  get name() {
    return t('Board');
  },
  get group() {
    return t('Plan');
  },
  icon: Kanban,
  get blurb() {
    return t('A kanban board: the stages of a workflow, cards, and limits per stage.');
  },
  blank,
  get templates() {
    return templates();
  },
  editor: () => import('./editor.ts'),
  title: titleOf,
  retitle,
  view: (doc, opts) => [boardPage(parse(doc), opts?.small ? 12 : Infinity)],
  exports: [
    // The byte order mark is how Excel knows a CSV is UTF-8.
    { ext: 'csv', label: () => t('CSV'), mime: 'text/csv;charset=utf-8', build: (doc) => utf8('﻿' + boardToCsv(parse(doc))) },
  ],
});
