import type { Meta } from '@storybook/web-components-vite';
import { templates as list } from '../../src/apps/pinboard/templates.ts';
import { appMeta, blank, editable, readOnly, shared, templates, type AppArgs } from './app.ts';

/** The Pinboard: sticky notes, pictures, frames, pen strokes and arrows on a board without edges, shared live. */
const meta = {
  title: 'Apps/Pinboard',
  component: 'to-pinboard-editor',
  ...appMeta(
    'pinboard',
    list().map((t) => t.id),
  ),
} satisfies Meta<AppArgs>;
export default meta;

export const Editable = editable();
export const ReadOnly = readOnly();
export const Blank = blank('pinboard');
export const Shared = shared('pinboard');
export const Templates = templates('pinboard');
