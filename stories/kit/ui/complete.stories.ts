import type { Meta, StoryObj } from '@storybook/web-components-vite';
import { action } from 'storybook/actions';
import { html } from 'lit';
import { completions, loadCompletions, type Completion, type ToComplete } from '../../../src/kit/ui/complete.ts';

interface CompleteArgs {
  query: string;
  icons: boolean;
}

/**
 * <to-complete>: the list under the caret while ":" and letters are typed in a <to-text> (":ca"), icons and emoji
 * whose names begin with the letters, the best eight. Its editor says what was typed (`show(rect, items)`), moves the
 * highlight (`move`) and picks (`current`); a tap on a row says "complete-pick". Here a field stands in for the words:
 * type in it, the arrows move the highlight and Enter picks.
 */
const meta = {
  title: 'Kit/UI/Complete',
  component: 'to-complete',
  args: { query: 'ca', icons: true },
  argTypes: { query: { description: 'What was typed after the ":"' }, icons: { description: 'Icons offered beside emoji (an editor that holds icon runs)' } },
  loaders: [async () => (await loadCompletions(), {})],
  render: ({ query, icons }) => {
    const pop = (field: HTMLElement) => field.closest('div')!.querySelector<ToComplete>('to-complete')!;
    const offer = (field: HTMLInputElement) => {
      const items: Completion[] = completions(field.value, icons);
      void pop(field).show(field.getBoundingClientRect(), items);
    };
    const key = (e: KeyboardEvent) => {
      const list = pop(e.currentTarget as HTMLElement);
      if (e.key === 'ArrowDown' || e.key === 'ArrowUp') list.move(e.key === 'ArrowDown' ? 1 : -1);
      else if (e.key === 'Enter') action('complete-pick')(list.current);
      else if (e.key === 'Escape') list.hide();
      else return;
      e.preventDefault();
    };
    return html`<div>
      <label class="to-field"><span>After the “:”</span><input class="sb-complete-field" .value=${query} @input=${(e: Event) => offer(e.target as HTMLInputElement)} @keydown=${key} /></label>
      <to-complete @complete-pick=${(e: CustomEvent) => action('complete-pick')(e.detail)} @complete-cancel=${action('complete-cancel')}></to-complete>
    </div>`;
  },
  play: ({ canvasElement }) => {
    const field = canvasElement.querySelector<HTMLInputElement>('.sb-complete-field')!;
    field.dispatchEvent(new Event('input'));
  },
} satisfies Meta<CompleteArgs>;
export default meta;

export const Icons: StoryObj<CompleteArgs> = {};
/** Where the words hold no icons (a shape's label), emoji alone. */
export const EmojiOnly: StoryObj<CompleteArgs> = { args: { query: 'heart', icons: false } };
