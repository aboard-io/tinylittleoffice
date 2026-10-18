/**
 * Board: cards in lanes by their status, each card a row of a table. The document is a table (model.ts: its first,
 * the lanes the values of its status column, their order in the head's `lanes:`), so a board and a spreadsheet are
 * two views of one table and the board hands its document to the Spreadsheet as it is. The editor is editor.ts, the
 * drawing and the words view.ts; the CSV is the Spreadsheet's own (its view's `sheetToCsv`).
 *
 * The definition is the suite's contract (kit/core/app.ts `AppDef`), but the Board is an app of the library's that the
 * site does not list (docs/library.md, The library's own apps): kit/core/apps.ts names it in no list, and a page
 * registers it (src/board.ts `registerBoard`), after which the registry finds it by its id, `mount('board', …)` draws
 * its editor, and a board placed in another document is drawn by its own `view`, as any app of the suite is. Its words
 * are its own messages (src/i18n/, `board-…`) and the suite's shared ones (`common-…`), said by `t()`; its editor and
 * its templates are loaded when first asked for, as the suite's are.
 */
import { SquareKanban } from 'lucide';
import { apply, parse, write } from '../../doc/index.ts';
import { defineApp } from '../../kit/core/app.ts';
import { t } from '../../kit/core/i18n.ts';
import { sheetToCsv } from '../sheet/view.ts';
import { utf8 } from '../../kit/draw/draw.ts';
import { blankBoard, boardColumns } from './model.ts';
import { boardPages, boardText } from './view.ts';
import { blankLanes, columnNames } from './words.ts';

/** The document's name: its title head field. */
const titleOf = (doc: string): string => parse(doc).head.title ?? '';
/** The document with this name: one head op, written back. */
const retitle = (doc: string, title: string): string => write(apply(parse(doc), { op: 'head', key: 'title', value: title.replace(/\n/g, ' ').trim() || undefined }));

/** The Board's definition: what a page registers (src/board.ts `registerBoard`), and what the registry and `mount` read. */
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
  // A blank board in the reader's language: its lanes and its table's two columns.
  blank: () => blankBoard(blankLanes(), boardColumns(columnNames())),
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
