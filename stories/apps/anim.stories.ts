import type { Meta } from '@storybook/web-components-vite';
import { templates as list } from '../../src/apps/anim/templates.ts';
import { appMeta, blank, editable, readOnly, shared, templates, type AppArgs } from './app.ts';

/** The Animator: a drawing that moves, Draw's shapes keyed over time. */
const meta = {
  title: 'Apps/Animator',
  component: 'to-anim-editor',
  ...appMeta(
    'anim',
    list().map((t) => t.id),
  ),
} satisfies Meta<AppArgs>;
export default meta;

export const Editable = editable();
export const ReadOnly = readOnly();
export const Blank = blank('anim');
export const Shared = shared('anim');
export const Templates = templates('anim');
