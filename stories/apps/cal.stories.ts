import type { Meta } from '@storybook/web-components-vite';
import { templates as list } from '../../src/apps/cal/templates.ts';
import { appMeta, blank, editable, readOnly, shared, templates, type AppArgs } from './app.ts';

/** The Calendar: labelled spans of time on a month, a year or a schedule, or a Gantt chart. */
const meta = {
  title: 'Apps/Calendar',
  component: 'to-cal-editor',
  ...appMeta(
    'cal',
    list().map((t) => t.id),
  ),
} satisfies Meta<AppArgs>;
export default meta;

export const Editable = editable();
export const ReadOnly = readOnly();
export const Blank = blank('cal');
export const Shared = shared('cal');
export const Templates = templates('cal');
