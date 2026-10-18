import type { Meta } from '@storybook/web-components-vite';
import { templates as list } from '../../src/apps/calc/templates.ts';
import { appMeta, blank, editable, readOnly, shared, templates, type AppArgs } from './app.ts';

/** The Calculator: a tape, every line worked out as it is typed, a line that names its answer kept for the lines after; or curves. */
const meta = {
  title: 'Apps/Calculator',
  component: 'to-calc-editor',
  ...appMeta(
    'calc',
    list().map((t) => t.id),
  ),
} satisfies Meta<AppArgs>;
export default meta;

export const Editable = editable();
export const ReadOnly = readOnly();
export const Blank = blank('calc');
export const Shared = shared('calc');
export const Templates = templates('calc');
