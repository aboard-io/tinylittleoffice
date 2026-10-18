import type { Meta, StoryObj } from '@storybook/web-components-vite';
import { action } from 'storybook/actions';
import { html } from 'lit';
import { apps, pickTemplate, type PickedTemplate } from '../../../src/editors.ts';
import '../../../src/kit/ui/template-picker.ts';

interface PickerArgs {
  app: string;
}

/**
 * `pickTemplate(app?)` and <to-template-picker>: a template chosen and handed back, never opened (docs/library.md, A
 * template picker). Each template drawn small from its own document (<to-preview>), Blank first; the one chosen comes
 * back as `{ app, id, title, text }`, shown here and told to the Actions panel ("templatepick"). Without an app, every
 * app's templates under its name.
 */
const meta = {
  title: 'Kit/UI/Template picker',
  component: 'to-template-picker',
  args: { app: 'write' },
  argTypes: { app: { control: 'select', options: ['', ...apps().map((a) => a.id)], description: 'The app (`appOf(id).templates()`); none for every app' } },
  render: ({ app }) => {
    const shown = document.createElement('pre');
    shown.className = 'sb-caption';
    const pick = async () => {
      const picked: PickedTemplate | null = await pickTemplate(app || undefined);
      action('templatepick')(picked);
      shown.textContent = picked ? `${picked.app} / ${picked.id}: ${picked.title}\n\n${picked.text.slice(0, 400)}` : 'Let go';
    };
    return html`<button type="button" class="to-btn" @click=${pick}><span>Choose a template</span></button>${shown}`;
  },
} satisfies Meta<PickerArgs>;
export default meta;

export const OneApp: StoryObj<PickerArgs> = {};
export const EveryApp: StoryObj<PickerArgs> = { args: { app: '' } };
/** The element placed by the page, open as the story is shown. */
export const Open: StoryObj<PickerArgs> = {
  args: { app: 'sheet' },
  render: ({ app }) => {
    const el = document.createElement('to-template-picker');
    el.setAttribute('app', app);
    el.addEventListener('templatepick', (e) => action('templatepick')((e as CustomEvent).detail));
    requestAnimationFrame(() => void (el as HTMLElement & { show(): Promise<unknown> }).show());
    return el;
  },
};
