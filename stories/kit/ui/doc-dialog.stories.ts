import type { Meta, StoryObj } from '@storybook/web-components-vite';
import { action } from 'storybook/actions';
import { html } from 'lit';
import type { Template } from '../../../src/editors.ts';
import { parse } from '../../../src/doc/index.ts';
import { editDoc, editTable } from '../../../src/kit/ui/doc-dialog.ts';
import { templatesOf } from '../../support.ts';

type Loaded = { loaded: { templates: Template[] } };
const APPS = ['draw', 'sheet', 'diagram', 'cal', 'outline', 'calc'];

interface DocArgs {
  app: string;
}

/**
 * <to-doc-dialog>: another document held in this one, edited where it is, in that app's own editor in a modal (the
 * whole screen on a phone). Done hands back the text, Cancel null. `editDoc({ app, text })` opens one;
 * `editTable(table)` opens the Spreadsheet over one table block, with its size in the dialog's bar.
 */
const meta = {
  title: 'Kit/UI/Doc dialog',
  component: 'to-doc-dialog',
  args: { app: 'draw' },
  argTypes: { app: { control: 'select', options: APPS, description: 'The app whose first template is edited in the dialog' } },
  loaders: [async ({ args }) => ({ templates: await templatesOf((args as DocArgs).app) })],
} satisfies Meta<DocArgs>;
export default meta;
type Story = StoryObj<DocArgs>;

/** A document of another app, from its first template: Done's text is told to the Actions panel. */
export const EditDoc: Story = {
  render: ({ app }, ctx) => {
    const text = (ctx as unknown as Loaded).loaded.templates[0]?.doc ?? '';
    return html`<button type="button" class="to-btn" @click=${async () => action('done')(await editDoc({ app, text }))}><span>Edit the ${app} document</span></button>`;
  },
};

/** A table block, from the Spreadsheet's first template, with Rows and Columns: Done's block is told. */
export const EditTable: Story = {
  args: { app: 'sheet' },
  argTypes: { app: { table: { disable: true } } },
  render: (_args, ctx) => {
    const tpl = (ctx as unknown as Loaded).loaded.templates[0];
    const table = parse(tpl?.doc ?? '').blocks.find((b) => b.k === 'table');
    return html`<button type="button" class="to-btn" ?disabled=${!table} @click=${async () => table?.k === 'table' && action('done')(await editTable(table))}><span>Edit the table</span></button>`;
  },
};
