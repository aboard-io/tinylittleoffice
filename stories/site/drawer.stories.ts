/**
 * <to-drawer>: the site's menu behind the hamburger (kit/ui/drawer.ts), opened: the language, the manual, Save in
 * browser, the size of everything, one search for anything, This document (New, Share…, Download) and the theme. What
 * it acts on is the shell's page (Share, Download, Find), told to the Actions panel here. A host has its own menu and
 * search; what it might borrow is the parts, not the drawer: `setTheme`, `setLanguage`, `keepSize` and the commands'
 * `cmdMenu`.
 */
import type { Meta, StoryObj } from '@storybook/web-components-vite';
import { html } from 'lit';
import { action } from 'storybook/actions';
import type { Page } from '../../src/kit/core/keys.ts';
import { exportItems } from '../../src/kit/file/exports.ts';
import type { ToDrawer } from '../../src/kit/ui/drawer.ts';
import '../../src/kit/ui/drawer.ts';
import { defOf, sampleName, sampleOf, shown, siteMeta, type SiteArgs } from './site.ts';

interface DrawerArgs extends SiteArgs {
  /** A document open: This document's rows, its app's New and its Download. */
  document: boolean;
}

/** The shell's page, as the drawer asks it: each thing it does told to the Actions panel. */
const page = (): Page => ({
  flush: () => {},
  print: action('print'),
  shortcuts: action('shortcuts'),
  find: action('find'),
  keep: action('keep'),
  share: action('share'),
  download: action('download'),
  search: action('search'),
  doc: true,
  editing: true,
  editor: null,
});

const meta = {
  title: 'Site/Drawer',
  component: 'to-drawer',
  ...siteMeta(),
  args: { app: 'write', document: true },
  render: (args, ctx) => {
    const def = defOf(args.app);
    const doc = sampleOf(args.app, ctx);
    const el = document.createElement('to-drawer') as ToDrawer;
    if (args.document) {
      el.def = def;
      el.page = page();
      el.downloads = exportItems(def, () => ({ doc, ctx: { def, title: sampleName(ctx), link: '' } }));
    }
    return html`${shown(el, (d) => d.show())}`;
  },
} satisfies Meta<DrawerArgs>;
export default meta;
type Story = StoryObj<DrawerArgs>;

/** Opened over a document: This document's rows under the search. */
export const Document: Story = {};
/** Opened on the home page: no This document. */
export const Home: Story = { args: { document: false }, argTypes: { app: { table: { disable: true } } } };
