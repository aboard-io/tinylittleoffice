import type { Meta, StoryObj } from '@storybook/web-components-vite';
import { action } from 'storybook/actions';
import '../../../src/kit/ui/toast.ts';
import { html } from 'lit';
import { toast } from '../../../src/editors.ts';

interface ToastArgs {
  words: string;
  label: string;
}

/**
 * <to-toast>: the one voice. Anything says something with `toast('Link copied')`, an event on the window, and the
 * page's one <to-toast> shows it long enough to read and says it to a screen reader. With an action
 * (`toast(words, { action: { label, does } })`) it draws a button after the words, and stays while it has the focus.
 */
const meta = {
  title: 'Kit/UI/Toast',
  component: 'to-toast',
  args: { words: 'Moved to Won.', label: 'Undo' },
  render: ({ words, label }) =>
    html`<div class="sb-row" style="grid-template-columns:auto auto;justify-content:start">
        <button type="button" class="to-btn" @click=${() => toast(words)}><span>Say it</span></button>
        <button type="button" class="to-btn" @click=${() => toast(words, { action: { label, does: action(label) } })}><span>Say it with ${label}</span></button>
      </div>
      <to-toast></to-toast>`,
} satisfies Meta<ToastArgs>;
export default meta;

export const Toast: StoryObj<ToastArgs> = {};
