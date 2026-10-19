import type { Meta, StoryObj } from '@storybook/web-components-vite';
import { action } from 'storybook/actions';
import { html } from 'lit';
import { FileText, LayoutGrid, Table, Waypoints } from 'lucide';
import type { Tab } from '../../../src/editors.ts';
import '../../../src/kit/ui/tabs.ts';

interface TabsArgs {
  value: string;
}

/** A project's views, each with an address of its own, the model saying how many rows it holds. */
const VIEWS: Tab[] = [
  { value: 'overview', label: 'Overview', href: '#overview', icon: LayoutGrid },
  { value: 'graph', label: 'Graph', href: '#graph', icon: Waypoints },
  { value: 'model', label: 'Model', href: '#model', count: 12, icon: Table },
  { value: 'documents', label: 'Documents', href: '#documents', count: 3, icon: FileText },
];

/**
 * <to-tabs>: a page's views along a row, one current (docs/library.md, The kit's small pieces): a project's Overview,
 * Graph, Model and Documents, each a link to its view's address, the current one marked `aria-current`. A tab taken
 * is told in "tabpick", which a page that routes itself prevents (as here, so the Storybook's address stays).
 */
const meta = {
  title: 'Kit/UI/Tabs',
  component: 'to-tabs',
  args: { value: 'overview' },
  render: ({ value }) =>
    html`<to-tabs
      label="Views of this project"
      .tabs=${VIEWS}
      .value=${value}
      @tabpick=${(e: CustomEvent) => {
        e.preventDefault();
        action('tabpick')(e.detail.value);
      }}
    ></to-tabs>`,
} satisfies Meta<TabsArgs>;
export default meta;

export const Views: StoryObj<TabsArgs> = {};
/** Tabs with no address: buttons, the current one `aria-current="true"`. */
export const Buttons: StoryObj<TabsArgs> = {
  args: { value: 'model' },
  render: ({ value }) => html`<to-tabs label="Views" .tabs=${VIEWS.map(({ href: _href, ...tab }) => tab)} .value=${value} @tabpick=${(e: CustomEvent) => action('tabpick')(e.detail.value)}></to-tabs>`,
};
/** At a phone's width the row scrolls sideways rather than wrapping. */
export const Narrow: StoryObj<TabsArgs> = {
  render: ({ value }) => html`<div style="max-width: 18rem"><to-tabs label="Views" .tabs=${VIEWS} .value=${value} @tabpick=${(e: CustomEvent) => e.preventDefault()}></to-tabs></div>`,
};
