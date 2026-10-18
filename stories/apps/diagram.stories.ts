import type { Meta } from '@storybook/web-components-vite';
import { templates as list } from '../../src/apps/diagram/templates.ts';
import { appMeta, blank, editable, readOnly, shared, templates, type AppArgs } from './app.ts';

/** The Diagram Maker: shapes with meaning from a few lines of text, eight kinds (mind map, org chart, swimlanes, Venn…). */
const meta = {
  title: 'Apps/Diagram Maker',
  component: 'to-diagram-editor',
  ...appMeta(
    'diagram',
    list().map((t) => t.id),
    'mind-launch',
  ),
} satisfies Meta<AppArgs>;
export default meta;

export const Editable = editable();
export const ReadOnly = readOnly();
export const Blank = blank('diagram');
export const Shared = shared('diagram');
export const Templates = templates('diagram');
