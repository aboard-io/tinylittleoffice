/**
 * <to-privacy>: a document's password and the Privacy dialog (kit/ui/privacy-dialog.ts). Alone, the Privacy dialog says
 * what this device holds, item by item, with Forget (the drawer's); with `doc`, it is the shell's, and holds the
 * document's password too: the dialog a sealed link opens with, asking for it. A host keeps its documents on its own
 * server under its own access, and needs none of this; a password on a link is the site's way of keeping a document.
 */
import type { Meta, StoryObj } from '@storybook/web-components-vite';
import { html } from 'lit';
import { action } from 'storybook/actions';
import { pack } from '../../src/kit/share/crypt.ts';
import { lockWith } from '../../src/kit/share/privacy.ts';
import type { ToPrivacy } from '../../src/kit/ui/privacy-dialog.ts';
import '../../src/kit/ui/privacy-dialog.ts';
import { templatesOf } from '../support.ts';
import { sampleOf, shown, siteMeta, type SiteArgs } from './site.ts';

/** The password the Unlock story's document is sealed with. */
const PASSWORD = 'tiny little office';

/** The element, its events told to the Actions panel, opened by `open`. */
function privacy(props: Partial<ToPrivacy>, open: (el: ToPrivacy) => unknown) {
  const el = Object.assign(document.createElement('to-privacy') as ToPrivacy, props);
  for (const name of ['to-unlock', 'to-lock', 'to-share-open']) el.addEventListener(name, (e) => action(name)((e as CustomEvent).detail));
  return html`${shown(el, open)}`;
}

const meta = { title: 'Site/Privacy', component: 'to-privacy', parameters: { page: true } } satisfies Meta;
export default meta;
type Story = StoryObj<SiteArgs>;

/** The Privacy dialog alone, as the drawer opens it: what this device holds. */
export const Device: Story = { render: () => privacy({}, (el) => el.show()) };
/** The shell's, for a document: its password first, then what this device holds. */
export const Document: Story = { render: () => privacy({ doc: true }, (el) => el.show()) };
/** A sealed link of the app's first template, asking for its password ("tiny little office" opens it, and "to-unlock" is told the text). */
export const Unlock: Story = {
  ...siteMeta(),
  loaders: [async ({ args }) => ({ sealed: await pack(sampleOf(args.app, { loaded: { templates: await templatesOf(args.app) } }), await lockWith(PASSWORD)) })],
  render: (_args, ctx) => privacy({ doc: true, sealed: (ctx.loaded as { sealed: string }).sealed }, (el) => el.askPassword()),
};
