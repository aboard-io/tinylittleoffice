import type { Meta } from '@storybook/web-components-vite';
import { templates as list } from '../../src/apps/write/templates.ts';
import { appMeta, blank, editable, readOnly, shared, templates, type AppArgs, type AppStory } from './app.ts';

/** The Word Processor: rich text, tables that add up, footnotes, other documents held in the words. */
const meta = {
  title: 'Apps/Word Processor',
  component: 'to-write-editor',
  ...appMeta(
    'write',
    list().map((t) => t.id),
  ),
} satisfies Meta<AppArgs>;
export default meta;

export const Editable = editable();
export const ReadOnly = readOnly();
export const Blank = blank('write');
export const Shared = shared('write');
export const Templates = templates('write');
/** A text holding a table that adds up (the invoice): the table is <to-write-table>, typed in cell by cell. */
export const Table = { args: { template: 'invoice' }, parameters: { covers: ['to-write-table'] } } satisfies AppStory;
/** The contract, the kind of document several people write and review (Kit/Text/Changes draws who did what over it). */
export const Contract = { args: { template: 'contract' } } satisfies AppStory;
