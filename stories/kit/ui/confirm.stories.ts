import type { Meta, StoryObj } from '@storybook/web-components-vite';
import { action } from 'storybook/actions';
import { html } from 'lit';
import { confirm, type Template } from '../../../src/editors.ts';
import { templatesOf } from '../../support.ts';

type Loaded = { loaded: { tpl: Template } };
interface ConfirmArgs {
  danger: boolean;
}

/**
 * `confirm({ title, body, yes, no, danger })`: a question asked in the kit's dialog before something is done
 * (docs/library.md, The kit's small pieces), resolving true or false. Where yes destroys (`danger`), it is drawn in the
 * danger color (`.to-btn.to-danger`, a class any button may wear) and the focus starts on Cancel. The answer is told to
 * the Actions panel. Here it asks about the Word Processor's first template.
 */
const meta = {
  title: 'Kit/UI/Confirm',
  args: { danger: true },
  loaders: [async () => ({ tpl: (await templatesOf('write'))[0] })],
  render: ({ danger }, ctx) => {
    const { tpl } = (ctx as unknown as Loaded).loaded;
    const ask = async () =>
      action('answer')(
        await confirm(
          danger
            ? { title: `Delete “${tpl.name}”?`, body: 'Everyone it is shared with loses it too. This can’t be undone.', yes: 'Delete', danger: true }
            : { title: `Make a copy of “${tpl.name}”?`, yes: 'Make a copy' },
        ),
      );
    return html`<p style="display: flex; flex-wrap: wrap; gap: 0.5rem">
      <button type="button" class="to-btn sb-ask" @click=${ask}><span>Ask</span></button>
      <button type="button" class="to-btn to-danger"><span>A danger button</span></button>
      <button type="button" class="to-btn primary"><span>A primary button</span></button>
    </p>`;
  },
} satisfies Meta<ConfirmArgs>;
export default meta;

export const Danger: StoryObj<ConfirmArgs> = {};
export const Plain: StoryObj<ConfirmArgs> = { args: { danger: false } };
/** Asked as it opens, for a picture of the dialog itself. */
export const Open: StoryObj<ConfirmArgs> = {
  play: async ({ canvasElement }) => canvasElement.querySelector<HTMLButtonElement>('.sb-ask')?.click(),
};
