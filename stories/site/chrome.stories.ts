/**
 * <to-chrome>: the site's header, banners and column round a document (kit/ui/chrome.ts), drawn here round a Word
 * Processor mounted as a page mounts one. The controls are what the shell hands it: the document's name, a new
 * document's automatic name, a lock, the short link it arrived by, another version kept here, a newer link. A host
 * draws its own header and gives the editor a column of its own; the editors need none of this.
 */
import type { Meta, StoryObj } from '@storybook/web-components-vite';
import { html, nothing } from 'lit';
import { action } from 'storybook/actions';
import { encodeDoc } from '../../src/kit/core/codec.ts';
import { routeHash } from '../../src/kit/core/route.ts';
import { trustButton } from '../../src/kit/ui/privacy-dialog.ts';
import { mount } from '../../src/editors.ts';
import type { ToChrome } from '../../src/kit/ui/chrome.ts';
import '../../src/kit/ui/chrome.ts';
import { defOf, sampleName, sampleOf, shown, siteMeta, type SiteArgs } from './site.ts';

interface ChromeArgs extends SiteArgs {
  /** No document: the home page's header. */
  home: boolean;
  title: string;
  /** A new document's automatic name, chosen whole when the title is focused. */
  fresh: string;
  /** A password on it: the lock beside the title. */
  locked: boolean;
  /** Arrived by a short link that expires in this many hours (0: no banner). */
  expiresIn: number;
  /** Another version of this document kept here: the quiet line under the header (a newer link's line takes its place). */
  other: boolean;
  /** The link was made by a newer Tiny Little Office. */
  newer: boolean;
}

const meta = {
  title: 'Site/Chrome',
  component: 'to-chrome',
  ...siteMeta(),
  args: { app: 'write', home: false, title: '', fresh: '', locked: false, expiresIn: 0, other: false, newer: false },
  parameters: { page: true, layout: 'fullscreen' },
  render: (args, ctx) => {
    const def = defOf(args.app);
    const doc = sampleOf(args.app, ctx);
    const title = args.title || sampleName(ctx);
    const chrome = Object.assign(document.createElement('to-chrome') as ToChrome, {
      doc: args.home
        ? null
        : { def, title, value: args.fresh ? '' : title, locked: false, trust: args.locked ? trustButton(true, false, action('to-privacy-open')) : nothing, used: encodeDoc(doc).length },
      main: args.home ? html`<p class="sb-caption">The home page's column (Site/Home draws it).</p>` : nothing,
      mainClass: 'to-main to-wide',
      label: def.name,
      barred: !args.home,
      fresh: args.fresh,
      expires: args.expiresIn ? Date.now() + args.expiresIn * 3600_000 : 0,
      other: args.other ? { id: 'kept', app: def.id, title, hash: routeHash(def.id, encodeDoc(doc)), at: Date.now() - 3 * 3600_000 } : null,
      newer: args.newer,
    });
    for (const name of ['to-drawer-open', 'to-rooms-open', 'to-arrival-close', 'to-other-close', 'to-copy-new']) chrome.addEventListener(name, action(name));
    chrome.addEventListener('to-retitle', (e) => action('to-retitle')((e as CustomEvent<string>).detail));
    if (args.home) return chrome;
    // The editor goes straight into the column, as the shell puts it there (page.css places the bar by `main > .to-editor`).
    chrome.dataset.app = args.app;
    return shown(chrome, (c) =>
      mount(args.app, doc, c.column!, action('docchange')).then(
        () => (c.dataset.ready = ''),
        (e) => console.error('mounting failed', e),
      ),
    );
  },
} satisfies Meta<ChromeArgs>;
export default meta;
type Story = StoryObj<ChromeArgs>;

/** A document open: its name in the header, the bar's place kept in the column. */
export const Document: Story = {};
/** A new document, its automatic name in the title box. */
export const Fresh: Story = { args: { fresh: 'New Word Processor 2026-10-18 #1' } };
/** The banners: a short link that expires, and another version kept here; and the lock. */
export const Banners: Story = { args: { expiresIn: 30, other: true, locked: true } };
/** A link made by a newer Tiny Little Office: its line in the other's place. */
export const Newer: Story = { args: { newer: true } };
/** The home page's header: no document. */
export const Home: Story = { args: { home: true } };
