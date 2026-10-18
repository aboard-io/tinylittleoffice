import type { Meta, StoryObj } from '@storybook/web-components-vite';
import { action } from 'storybook/actions';
import { html } from 'lit';
import '../../../src/kit/ui/link-pop.ts';
import type { ToLinkPop } from '../../../src/kit/ui/link-pop.ts';

interface LinkArgs {
  href: string;
}

/**
 * <to-link-pop>: the bubble under a link when the caret is in it: the address, Open, Edit, Remove; `ask()` opens it
 * with a box for the address. Its events: "link-set" (the address, '' to remove), "link-remove" and "link-cancel".
 * Its editor places it (`show(rect, href)`) and hides it; here the link below stands in for one in the words.
 */
const meta = {
  title: 'Kit/UI/Link pop',
  component: 'to-link-pop',
  args: { href: 'https://tinylittleoffice.com/' },
  render: ({ href }) =>
    html`<p class="sb-link-words">
      Words with <a class="sb-link" href=${href}>a link</a> in them.
      <to-link-pop @link-set=${(e: CustomEvent) => action('link-set')(e.detail)} @link-remove=${action('link-remove')} @link-cancel=${action('link-cancel')}></to-link-pop>
    </p>`,
} satisfies Meta<LinkArgs>;
export default meta;
type Story = StoryObj<LinkArgs>;

const at = (root: HTMLElement) => ({ pop: root.querySelector<ToLinkPop>('to-link-pop')!, rect: root.querySelector('.sb-link')!.getBoundingClientRect() });

/** The bubble for a link the caret is in. */
export const Shown: Story = {
  play: ({ canvasElement, args }) => {
    const { pop, rect } = at(canvasElement);
    pop.show(rect, args.href);
  },
};
/** The bubble asking for an address, as Mod+K does. */
export const Ask: Story = {
  play: ({ canvasElement, args }) => {
    const { pop, rect } = at(canvasElement);
    pop.ask(rect, args.href);
  },
};
