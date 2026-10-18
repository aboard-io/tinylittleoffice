import type { Meta, StoryObj } from '@storybook/web-components-vite';
import { action } from 'storybook/actions';
import { html } from 'lit';
import { apps, icon, UI, type Template } from '../../../src/editors.ts';
import '../../../src/kit/ui/header.ts';
import '../../../src/kit/ui/search-box.ts';
import { templatesOf } from '../../support.ts';

type Loaded = { loaded: { tpl: Template } };
interface HeaderArgs {
  editable: boolean;
  search: boolean;
}

/**
 * <to-header>: a page's header in the site's look, for a page with no <to-shell> (docs/library.md, A page's header):
 * the way back up, the title (here the Word Processor's first template's, editable: Enter keeps it, Escape puts it
 * back, "titlechange"), and the page's own search and actions, given in the `search` and `actions` slots. Narrow, the
 * search takes a row of its own.
 */
const meta = {
  title: 'Kit/UI/Header',
  component: 'to-header',
  args: { editable: true, search: true },
  loaders: [async () => ({ tpl: (await templatesOf('write'))[0] })],
  render: (args, ctx) => {
    const { tpl } = (ctx as unknown as Loaded).loaded;
    const write = apps()[0];
    return html`<to-header
      .heading=${tpl.name}
      ?editable=${args.editable}
      .crumbs=${[{ label: 'Tiny Little Office', href: 'https://tinylittleoffice.com/' }, { label: write.name }]}
      @titlechange=${(e: CustomEvent) => action('titlechange')(e.detail.title)}
      @crumbpick=${(e: CustomEvent) => {
        e.preventDefault();
        action('crumbpick')(e.detail.index);
      }}
    >
      ${args.search ? html`<to-search slot="search" .search=${async () => []}></to-search>` : ''}
      <div slot="actions">
        <button type="button" class="to-btn to-tool" aria-label="Share" title="Share" @click=${action('share')}>${icon(UI.share)}</button>
        <button type="button" class="to-btn primary" @click=${action('new')}><span>New</span></button>
      </div>
    </to-header>`;
  },
} satisfies Meta<HeaderArgs>;
export default meta;

export const Header: StoryObj<HeaderArgs> = {};
/** The title as words, no search: a page that names itself and no more. */
export const Plain: StoryObj<HeaderArgs> = { args: { editable: false, search: false } };
/** At a phone's width: the search under the title and the actions. */
export const Narrow: StoryObj<HeaderArgs> = { decorators: [(story) => html`<div style="max-width: 22rem">${story()}</div>`] };
