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
import { boardToTodo } from './convert.ts';
import { partOf } from '../../kit/steps.ts';
import { readBoard } from './model.ts';

/** How many cards a board drawn small (on a slide, as a thumbnail) shows. */
const SMALL = 12;

const headOf = (doc: Doc): Kernel => parse(doc);
export const titleOf = (doc: Doc): string => headOf(doc).head.title ?? '';
export const retitle = (doc: Doc, title: string): Doc => write(apply(headOf(doc), { op: 'head', key: 'title', value: title.replace(/\n/g, ' ').trim() || undefined }));

/** A new board: the three stages every workflow starts with, as headings to type under. */
export const blank = (): Doc => `## ${t('To do')}\n\n## ${t('Doing')}\n\n## ${t('Done')}\n`;

export default defineApp({
  id: 'board',
  get name() {
    return t('Kanban Board');
  },
  get noun() {
    return t('board');
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
  view: (doc, opts) => {
    const d = parse(doc);
    const max = opts?.small ? SMALL : Infinity;
    if (opts?.upTo === undefined) return [boardPage(d, max, opts?.thumb)];
    // A card a step, in the order the document holds them: the rest (and their checklists) left out of the drawing.
    const hidden = new Set(readBoard(d).stages.flatMap((s) => s.cards).slice(opts.upTo).flatMap((c) => Array.from({ length: c.end - c.at }, (_, i) => c.at + i)));
    return [partOf(boardPage(d, max), boardPage({ ...d, blocks: d.blocks.filter((_, i) => !hidden.has(i)) }, max))];
  },
  // On a slide (drawn small, the first twelve cards), a card a step.
  steps: (doc) => Math.min(SMALL, readBoard(parse(doc)).cards),
  exports: [
    // The byte order mark is how Excel knows a CSV is UTF-8.
    { ext: 'csv', label: () => t('CSV'), mime: 'text/csv;charset=utf-8', shows: 'text', build: (doc) => utf8('﻿' + boardToCsv(parse(doc))) },
  ],
  keys: [
    { keys: 'Mod+Alt+ArrowLeft / Mod+Alt+ArrowRight', does: () => t('Move the cards to the stage before or after') },
  ],
  handoffs: [{ to: 'todo', label: () => t('Make a to-do list of the cards'), convert: boardToTodo }],
});
