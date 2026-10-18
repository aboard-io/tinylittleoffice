import type { Meta, StoryObj } from '@storybook/web-components-vite';
import { action } from 'storybook/actions';
import { html } from 'lit';
import '../../../src/kit/ui/dialog.ts';
import type { ToDialog } from '../../../src/editors.ts';

interface DialogArgs {
  heading: string;
}

/**
 * <to-dialog>: a native modal <dialog> with a heading and a close button. Escape closes it, and so does a click on
 * the backdrop; the focus goes back where it was. Give it `body`, a template, and call `show()`; the body is drawn
 * only while it is open, and "to-close" says it closed.
 */
const meta = {
  title: 'Kit/UI/Dialog',
  component: 'to-dialog',
  args: { heading: 'Rename' },
  render: ({ heading }) => {
    const open = (e: Event) => ((e.currentTarget as HTMLElement).nextElementSibling as ToDialog).show();
    return html`<button type="button" class="to-btn" @click=${open}><span>Open the dialog</span></button>
      <to-dialog
        .heading=${heading}
        @to-close=${action('to-close')}
        .body=${html`<form
          class="sb-dialog-form"
          @submit=${(e: Event) => {
            e.preventDefault();
            action('submit')(new FormData(e.target as HTMLFormElement).get('name'));
            (e.target as HTMLElement).closest<ToDialog>('to-dialog')!.close();
          }}
        >
          <label class="to-field"><span>Name</span><input name="name" value="Status, week of October 12" /></label>
          <button type="submit" class="to-btn"><span>OK</span></button>
        </form>`}
      ></to-dialog>`;
  },
} satisfies Meta<DialogArgs>;
export default meta;

export const Dialog: StoryObj<DialogArgs> = {};
