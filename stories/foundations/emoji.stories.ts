import type { Meta, StoryObj } from '@storybook/web-components-vite';
import { html } from 'lit';
import { EMOJI_GROUPS, emojiIn, emojiName, searchEmoji } from '../../src/kit/draw/emoji.ts';

/**
 * The Emoji set the picker offers beside the icons (kit/draw/emoji.ts, from Unicode's and CLDR's data): characters,
 * drawn by the system as words are, found by name and keyword.
 */
const meta = { title: 'Foundations/Emoji' } satisfies Meta;
export default meta;

/** One of Unicode's groups, whole, in its order. */
export const Groups: StoryObj<{ group: string }> = {
  args: { group: EMOJI_GROUPS[0] },
  argTypes: { group: { control: 'select', options: [...EMOJI_GROUPS] } },
  render: ({ group }) => html`<div class="sb-emoji">${emojiIn(EMOJI_GROUPS.indexOf(group)).map((c) => html`<span title=${emojiName(c)}>${c}</span>`)}</div>`,
};

/** The emoji the words typed find, best first, each with its name. */
export const Search: StoryObj<{ query: string }> = {
  args: { query: 'cake' },
  render: ({ query }) =>
    html`<div class="sb-icons">
      ${searchEmoji(query, 60).map((c) => html`<figure class="sb-icon"><span class="sb-glyph">${c}</span><figcaption>${emojiName(c)}</figcaption></figure>`)}
    </div>`,
};
