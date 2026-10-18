import type { Meta } from '@storybook/web-components-vite';
import { registerBoard } from '../../src/board.ts';
import { templates as list } from '../../src/apps/board/templates.ts';
import { appMeta, blank, editable, readOnly, shared, templates, type AppArgs } from './app.ts';

/**
 * The Board: cards in lanes by their status, each card a row of a table. An app of the library's that the site does not
 * list (docs/library.md, The library's own apps), so a page registers it, as this file does, before anything draws it.
 */
registerBoard();
const meta = {
  title: 'Apps/Board',
  component: 'to-board-editor',
  ...appMeta(
    'board',
    list().map((t) => t.id),
  ),
} satisfies Meta<AppArgs>;
export default meta;

export const Editable = editable();
export const ReadOnly = readOnly();
export const Blank = blank('board');
export const Shared = shared('board');
export const Templates = templates('board');
