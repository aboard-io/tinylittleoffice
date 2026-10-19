import type { Meta, StoryObj } from '@storybook/web-components-vite';
import { action } from 'storybook/actions';
import { html } from 'lit';
import { icon, UI } from '../../../src/editors.ts';
import '../../../src/kit/ui/section.ts';
import '../../../src/kit/ui/table.ts';
import { members } from '../data/members.ts';

type Loaded = { loaded: Awaited<ReturnType<typeof members>> };
interface SectionArgs {
  /** The section given nothing: its empty words, and Add beside the heading. */
  empty: boolean;
  /** How many it says it holds. */
  count: boolean;
}

/**
 * <to-section>: one part of a host's page (docs/library.md, The kit's small pieces): a heading with how many things it
 * holds, the page's actions beside it (here Add, in the `actions` slot), and the page's own things under them, here
 * the Spreadsheet's membership roll as a typed table. Given nothing, it says what the page tells it to ("No members
 * yet"), in the kit's `.to-empty`.
 */
const meta = {
  title: 'Kit/UI/Section',
  component: 'to-section',
  args: { empty: false, count: true },
  loaders: [async () => members()],
  render: (args, ctx) => {
    const { rows, columns, title } = (ctx as unknown as Loaded).loaded;
    const shown = args.empty ? [] : rows;
    return html`<to-section heading=${title} .count=${args.count ? shown.length : null} empty="No members yet" style="max-width: 52rem">
      <button slot="actions" type="button" class="to-btn" @click=${action('add')}>${icon(UI.plus)}<span>Add</span></button>
      ${shown.length ? html`<to-table .columns=${columns} .rows=${shown} label=${title} style="--to-dt-h: 20rem"></to-table>` : ''}
    </to-section>`;
  },
} satisfies Meta<SectionArgs>;
export default meta;

export const WithTable: StoryObj<SectionArgs> = {};
/** Nothing in it: the words the page gave for that, under the heading and its Add. */
export const Empty: StoryObj<SectionArgs> = { args: { empty: true } };
/** No count said: the heading alone. */
export const Uncounted: StoryObj<SectionArgs> = { args: { count: false } };
