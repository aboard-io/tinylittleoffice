import type { Meta } from '@storybook/web-components-vite';
import { templates as list } from '../../src/apps/draw/templates.ts';
import { appMeta, blank, editable, readOnly, shared, templates, type AppArgs } from './app.ts';

/** The Drawing Tool: boxes, lines, arrows, icons and labels on a grid, and pixel art as a grid mode. */
const meta = {
  title: 'Apps/Drawing Tool',
  component: 'to-draw-editor',
  ...appMeta(
    'draw',
    list().map((t) => t.id),
  ),
} satisfies Meta<AppArgs>;
export default meta;

export const Editable = editable();
export const ReadOnly = readOnly();
export const Blank = blank('draw');
export const Shared = shared('draw');
export const Templates = templates('draw');
