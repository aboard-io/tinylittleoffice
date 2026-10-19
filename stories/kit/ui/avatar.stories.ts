import type { Meta, StoryObj } from '@storybook/web-components-vite';
import { html } from 'lit';
import '../../../src/kit/ui/avatar.ts';
import { members } from '../data/members.ts';

type Loaded = { loaded: Awaited<ReturnType<typeof members>> };
interface AvatarArgs {
  size: 's' | 'm' | 'l';
  /** Each a link to the person's page. */
  linked: boolean;
}

/**
 * <to-avatar>: a person drawn small (docs/library.md, The kit's small pieces): their initials in a disc of a hue of
 * their own, the same for the same name on a Board's card and in a typed table's person cell. Here the Spreadsheet's
 * membership roll, each member beside their name, and the roll together in a `.to-avatars` row.
 */
const meta = {
  title: 'Kit/UI/Avatar',
  component: 'to-avatar',
  args: { size: 'm', linked: true },
  argTypes: { size: { control: 'inline-radio', options: ['s', 'm', 'l'] } },
  loaders: [async () => members()],
  render: (args, ctx) => {
    const { rows } = (ctx as unknown as Loaded).loaded;
    return html`<ul style="margin: 0; padding: 0; list-style: none; display: grid; gap: 0.5rem">
      ${rows.map((m) => html`<li style="display: flex; align-items: center; gap: 0.625rem"><to-avatar name=${m.name} href=${args.linked ? `#/people/${m.id}` : ''} size=${args.size}></to-avatar><span>${m.name}</span></li>`)}
    </ul>`;
  },
} satisfies Meta<AvatarArgs>;
export default meta;

export const Members: StoryObj<AvatarArgs> = {};
/** The roll together: a row, each overlapping the one before it a little, as a document's people are shown. */
export const Row: StoryObj<AvatarArgs> = {
  render: (args, ctx) => {
    const { rows } = (ctx as unknown as Loaded).loaded;
    return html`<span class="to-avatars">${rows.map((m) => html`<to-avatar name=${m.name} size=${args.size}></to-avatar>`)}</span>`;
  },
};
/** Large, for a page's header. */
export const Large: StoryObj<AvatarArgs> = { args: { size: 'l' } };
