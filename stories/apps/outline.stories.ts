import type { Meta } from '@storybook/web-components-vite';
import { templates as list } from '../../src/apps/outline/templates.ts';
import { appMeta, blank, editable, readOnly, shared, templates, type AppArgs } from './app.ts';

/** The Outliner: ideas under ideas, a nested list with lines to parents, documents under items and joins between any two. */
const meta = {
  title: 'Apps/Outliner',
  component: 'to-outline-editor',
  ...appMeta(
    'outline',
    list().map((t) => t.id),
  ),
} satisfies Meta<AppArgs>;
export default meta;

export const Editable = editable();
export const ReadOnly = readOnly();
export const Blank = blank('outline');
export const Shared = shared('outline');
export const Templates = templates('outline');
