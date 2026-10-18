import type { Meta, StoryObj } from '@storybook/web-components-vite';
import { action } from 'storybook/actions';
import { html } from 'lit';
import { UI } from '../../../src/editors.ts';
import { SEP, type ContextEntry, type ToContext } from '../../../src/kit/ui/context.ts';

interface ContextArgs {
  side: 'below' | 'above';
  hint: string;
}

const items: ContextEntry[] = [
  { label: 'Bold', icon: UI.bold, keys: 'Mod+B', pressed: true, does: action('bold') },
  { label: 'Italic', icon: UI.italic, keys: 'Mod+I', does: action('italic') },
  SEP,
  { label: 'Small', text: 'S', does: action('small') },
  { label: 'Medium', text: 'M', pressed: true, does: action('medium') },
  { label: 'Large', text: 'L', does: action('large') },
  SEP,
  { label: 'Indigo', swatch: '#4f46e5', does: action('indigo') },
  { label: 'Copy', icon: UI.copy, keys: 'Mod+D', does: action('copy') },
  { label: 'Delete', icon: UI.trash, disabled: true, does: action('delete') },
];

/**
 * <to-context>: the small bar beside the thing in hand (a shape chosen, some words selected), with what can be done to
 * it there. The host sets `items` and calls `show(anchor)` and `hide()`; its buttons never take the focus. On a phone
 * it is a row of the bottom bar instead.
 */
const meta = {
  title: 'Kit/UI/Context bar',
  component: 'to-context',
  args: { side: 'below', hint: '' },
  argTypes: { side: { control: 'inline-radio', options: ['below', 'above'] }, hint: { description: 'A line under the buttons' } },
  render: ({ side, hint }) => {
    const toggle = (e: Event) => {
      const shape = e.currentTarget as HTMLElement;
      const bar = shape.parentElement!.querySelector<ToContext>('to-context')!;
      if (bar.isOpen) return bar.hide();
      bar.hint = hint;
      bar.show(shape, side);
    };
    return html`<div class="sb-context">
      <button type="button" class="sb-shape" @click=${toggle}>A shape: click it to take it in hand</button>
      <to-context label="Shape" .items=${items}></to-context>
    </div>`;
  },
} satisfies Meta<ContextArgs>;
export default meta;

/** Up under the shape as the story opens; click the shape to let it go and take it again. */
export const ContextBar: StoryObj<ContextArgs> = {
  play: ({ canvasElement }) => canvasElement.querySelector<HTMLElement>('.sb-shape')!.click(),
};
