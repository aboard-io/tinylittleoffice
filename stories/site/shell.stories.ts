/**
 * <to-shell>: the site's page, which owns the address (kit/core/shell.ts). In a story it is routed by the hash of the
 * story's own frame, put there before it is drawn, the frame's query (which story it is) kept, so the Storybook around
 * it never moves; what it writes into the address it writes into that frame's hash alone. Its links home lead to the
 * frame's own root, the Storybook's: follow them in a tab of the site instead. A host adopts none of this: it keeps the
 * document where it likes and mounts an editor with `mount` (Kit/Core/Mount), with `host` saying where links go.
 */
import type { Meta, StoryObj } from '@storybook/web-components-vite';
import { encodeDoc } from '../../src/kit/core/codec.ts';
import { routeHash } from '../../src/kit/core/route.ts';
import '../../src/kit/core/shell.ts';
import { sampleOf, siteMeta, type SiteArgs } from './site.ts';

/** A shell routed to `hash` in this frame. */
function shellAt(hash: string): HTMLElement {
  history.replaceState(null, '', location.pathname + location.search + hash);
  return document.createElement('to-shell');
}

const meta = {
  title: 'Site/Shell',
  component: 'to-shell',
  ...siteMeta(),
  parameters: { page: true, layout: 'fullscreen' },
} satisfies Meta<SiteArgs>;
export default meta;
type Story = StoryObj<SiteArgs>;

/** The site with a document open in its app: the chrome, the editor, the drawer behind the menu button. */
export const Document: Story = { render: (args, ctx) => shellAt(routeHash(args.app, encodeDoc(sampleOf(args.app, ctx)))) };
/** The same document as its Display Link: its pages, to read or print, with Edit. */
export const Display: Story = { render: (args, ctx) => shellAt(routeHash(args.app, encodeDoc(sampleOf(args.app, ctx)), '', true)) };
/** The home page: no document, every app's row. */
export const Home: Story = { argTypes: { app: { table: { disable: true } } }, render: () => shellAt('') };
