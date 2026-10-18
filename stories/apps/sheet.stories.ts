import type { Meta } from '@storybook/web-components-vite';
import { templates as list } from '../../src/apps/sheet/templates.ts';
import { appMeta, blank, editable, readOnly, shared, templates, type AppArgs } from './app.ts';

/** The Spreadsheet: one table block, its header row the columns' names and types, formulas, a chart if asked for. */
const meta = {
  title: 'Apps/Spreadsheet',
  component: 'to-sheet-editor',
  ...appMeta(
    'sheet',
    list().map((t) => t.id),
  ),
} satisfies Meta<AppArgs>;
export default meta;

export const Editable = editable();
export const ReadOnly = readOnly();
export const Blank = blank('sheet');
export const Shared = shared('sheet');
export const Templates = templates('sheet');
