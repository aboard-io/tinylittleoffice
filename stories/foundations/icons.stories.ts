import type { Meta, StoryObj } from '@storybook/web-components-vite';
import { html, nothing } from 'lit';
import { action } from 'storybook/actions';
import { icon, iconNamed, UI } from '../../src/kit/draw/icons.ts';
import { searchIcons } from '../../src/kit/draw/icons-search.ts';
import { chooseIcon, type IconChoice } from '../../src/kit/ui/icons-picker.ts';
import type { ToDialog } from '../../src/kit/ui/dialog.ts';

/**
 * The icons: the kit's own (kit/draw/icons.ts `UI`, what the bars and menus draw, Lucide's), the whole of Lucide that a
 * document may name (searched as the picker searches it), and the picker itself (kit/ui/icons-picker.ts `chooseIcon`),
 * with the Emoji set beside the icons.
 */
const meta = { title: 'Foundations/Icons' } satisfies Meta;
export default meta;

/** Every icon of `UI`, by its key, at the size a bar draws them (`icon(node)`, 20). */
export const Interface: StoryObj = {
  render: () =>
    html`<div class="sb-icons">
      ${Object.entries(UI).map(([name, node]) => html`<figure class="sb-icon">${icon(node)}<figcaption>${name}</figcaption></figure>`)}
    </div>`,
};

/** Lucide's icons, as a document names them: the words typed find them by name, tag and category, best first. */
export const Library: StoryObj<{ query: string; size: number }> = {
  args: { query: 'calendar', size: 24 },
  argTypes: { query: { control: 'text' }, size: { control: { type: 'range', min: 12, max: 48, step: 4 } } },
  render: ({ query, size }) => {
    const names = searchIcons(query, 120);
    return html`<p class="sb-caption">${names.length} icons for “${query}”</p>
      <div class="sb-icons">
        ${names.map((name) => {
          const node = iconNamed(name);
          return node ? html`<figure class="sb-icon">${icon(node, size)}<figcaption>${name}</figcaption></figure>` : nothing;
        })}
      </div>`;
  },
};

type PickerArgs = Required<Pick<IconChoice, 'emoji' | 'none'>> & { current: string; suggested: string };

/** The icon and emoji picker, opened as the story draws (and again by its button): what is picked is told to Actions. */
export const Picker: StoryObj<PickerArgs> = {
  args: { emoji: true, none: false, current: 'heart', suggested: 'cake, gift, party-popper' },
  argTypes: {
    emoji: { description: 'Offer the Emoji set beside the icons' },
    none: { description: 'Offer “No icon”, which picks ""' },
    current: { description: 'The icon there now, shown pressed' },
    suggested: { description: 'Icons offered first, by name, comma-separated' },
  },
  // The picker is a modal on the page's body: it goes with the story.
  beforeEach: () => () => document.querySelectorAll<ToDialog>('to-dialog.to-icons').forEach((d) => d.close()),
  render: (args) => {
    const open = () =>
      void chooseIcon({
        emoji: args.emoji,
        none: args.none,
        current: args.current,
        suggested: args.suggested
          .split(',')
          .map((s) => s.trim())
          .filter(Boolean),
      }).then(action('picked'));
    queueMicrotask(open);
    return html`<button type="button" class="to-btn" @click=${open}>${icon(iconNamed('smile') ?? UI.plus)}<span>Choose an icon</span></button>`;
  },
};
