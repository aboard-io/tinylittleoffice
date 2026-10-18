import type { Meta } from '@storybook/web-components-vite';
import { templates as list } from '../../src/apps/deck/templates.ts';
import { appMeta, blank, editable, readOnly, shared, templates, type AppArgs } from './app.ts';

/** The Presentation Builder: slides, and the printed things that are slides (zine, booklet, poster, badges), chosen by the head's format. */
const meta = {
  title: 'Apps/Presentation Builder',
  component: 'to-deck-editor',
  ...appMeta(
    'deck',
    list().map((t) => t.id),
  ),
} satisfies Meta<AppArgs>;
export default meta;

export const Editable = editable();
export const ReadOnly = readOnly();
export const Blank = blank('deck');
export const Shared = shared('deck');
export const Templates = templates('deck');
