/**
 * <to-share>: the site's Share dialog (kit/ui/share-dialog.ts), open over one of the app's templates: where the link
 * fits, Copy, the edit and present links, a password, a short link, posting to a network, the QR code, the embed code.
 * Its links are the host's (`host.link`, tinylittleoffice.com's here). Making a short link or a preview card reaches
 * the site's servers; this story leaves them alone. A host shares its own way (its own records, its own access); a
 * document's link for the site, where it wants one, is `host.link(app, text)`.
 */
import type { Meta, StoryObj } from '@storybook/web-components-vite';
import { html } from 'lit';
import { action } from 'storybook/actions';
import { host } from '../../src/editors.ts';
import { encodeDoc } from '../../src/kit/core/codec.ts';
import type { ToShare } from '../../src/kit/ui/share-dialog.ts';
import '../../src/kit/ui/share-dialog.ts';
import { sampleName, sampleOf, shown, siteMeta, type SiteArgs } from './site.ts';

/** The dialog over the app's first template, opened as Share… opens it; `rooms`, with its table of where the link fits. */
function shareOf(app: string, ctx: unknown, rooms = false) {
  const doc = sampleOf(app, ctx);
  const el = Object.assign(document.createElement('to-share') as ToShare, {
    app,
    doc,
    heading: sampleName(ctx),
    locked: false,
    payloadLength: encodeDoc(doc).length,
    linkTo: (display: boolean) => host.link(app, doc, { display }),
  });
  el.addEventListener('to-link-copied', action('to-link-copied'));
  return html`${shown(el, (s) => (rooms ? s.showRooms() : s.show()))}`;
}

const meta = { title: 'Site/Share', component: 'to-share', ...siteMeta() } satisfies Meta<SiteArgs>;
export default meta;
type Story = StoryObj<SiteArgs>;

/** Share…, open. */
export const Open: Story = { render: (args, ctx) => shareOf(args.app, ctx) };
/** The table of the rooms a link fits in (the meter's). */
export const Rooms: Story = { render: (args, ctx) => shareOf(args.app, ctx, true) };
