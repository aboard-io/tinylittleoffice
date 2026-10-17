/**
 * Board: cards in lanes by their status, each card a row of a table. The document is a table (model.ts: its first,
 * the lanes the values of its status column, their order in the head's `lanes:`), so a board and a spreadsheet are
 * two views of one table and each hands its document to the other. The editor is editor.ts, the drawing and the words
 * view.ts; the CSV is the Spreadsheet's own.
 */
import { SquareKanban } from 'lucide';
import { apply, parse, write } from '../../doc/index.ts';
import { defineApp, type Doc } from '../../kit/core/app.ts';
import { utf8 } from '../../kit/draw/draw.ts';
import { t } from '../../kit/core/i18n.ts';
import { sheetToCsv } from '../sheet/view.ts';
import { blankBoard } from './model.ts';
import { boardPages, boardText } from './view.ts';

/** The document's name: its title head field. */
const titleOf = (doc: Doc): string => parse(doc).head.title ?? '';
/** The document with this name: one head op, written back. */
const retitle = (doc: Doc, title: string): Doc => write(apply(parse(doc), { op: 'head', key: 'title', value: title.replace(/\n/g, ' ').trim() || undefined }));

export default defineApp({
  id: 'board',
  get name() {
    return t('board-board');
  },
  get noun() {
    return t('board-board-lowercase');
  },
  get group() {
    return t('common-plan');
  },
  icon: SquareKanban,
  get blurb() {
    return t('board-cards-in-lanes-by-status');
  },
  blank: blankBoard,
  templates: () => import('./templates.ts').then((m) => m.templates()),
  editor: () => import('./editor.ts'),
  title: titleOf,
  retitle,
  view: (doc, opts) => boardPages(parse(doc), !!opts?.small),
  text: (doc) => boardText(parse(doc)),
  exports: [
    // The Spreadsheet's CSV of the same table; the byte order mark is how Excel knows a CSV is UTF-8.
    { ext: 'csv', label: () => t('common-csv'), mime: 'text/csv;charset=utf-8', shows: 'text', build: (doc) => utf8('﻿' + sheetToCsv(parse(doc))) },
  ],
  commands: () => import('./commands.ts'),
  // The Spreadsheet reads the same table: the text goes as it is.
  handoffs: [{ to: 'sheet', label: () => t('board-open-cards-in-spreadsheet'), convert: (doc) => doc }],
});
