import type { Meta, StoryObj } from '@storybook/web-components-vite';
import { html } from 'lit';
import { routeHash } from '../../../src/kit/core/route.ts';
import { pack } from '../../../src/kit/share/crypt.ts';
import { lockWith } from '../../../src/kit/share/privacy.ts';
import '../../../src/kit/ui/locked-doc.ts';
import { templatesOf } from '../../support.ts';

interface LockedArgs {
  password: string;
  caption: boolean;
}
type Loaded = { loaded: { ref: string } };

/**
 * <to-locked-doc>: a document locked with a password, placed in another, as an editor draws it: the locked card, a
 * tap asks for the password; opened, the document drawn small (kept for the visit, never written into the outer
 * document). `ref` is the locked fence's body, the sealed link. Here the Word Processor's letter, sealed with the
 * password in the controls.
 */
const meta = {
  title: 'Kit/UI/Locked doc',
  component: 'to-locked-doc',
  args: { password: 'tiny', caption: true },
  argTypes: { password: { description: 'The password the letter is sealed with: type it to open the card' }, caption: { description: 'Its name and app under it' } },
  loaders: [
    async ({ args }) => {
      const letter = (await templatesOf('write')).find((t) => t.id === 'letter')!;
      return { ref: routeHash('write', await pack(letter.doc, await lockWith((args as LockedArgs).password))) };
    },
  ],
  render: ({ caption }, ctx) => html`<figure class="sb-locked"><to-locked-doc .ref=${(ctx as unknown as Loaded).loaded.ref} ?caption=${caption}></to-locked-doc></figure>`,
} satisfies Meta<LockedArgs>;
export default meta;

export const Locked: StoryObj<LockedArgs> = {};
