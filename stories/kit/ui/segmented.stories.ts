import type { Meta, StoryObj } from '@storybook/web-components-vite';
import { action } from 'storybook/actions';
import { html } from 'lit';
import { CalendarDays, Columns3, Table } from 'lucide';
import { apps, type Segment } from '../../../src/editors.ts';
import '../../../src/kit/ui/segmented.ts';

interface SegmentedArgs {
  value: string;
}

/**
 * <to-segmented>: a choice of a few as one row of segments (docs/library.md, The kit's small pieces), a radio group:
 * the chosen segment takes Tab, the arrows, Home and End move and choose, a click chooses, and each choice is told in
 * "change" (`{ value }`). A host's My and All, Table or Calendar, Board or Table.
 */
const meta = {
  title: 'Kit/UI/Segmented',
  component: 'to-segmented',
  args: { value: 'mine' },
  render: ({ value }) =>
    html`<to-segmented
      label="Whose"
      .options=${[
        { value: 'mine', label: 'My' },
        { value: 'all', label: 'All' },
      ]}
      .value=${value}
      @change=${(e: CustomEvent) => action('change')(e.detail.value)}
    ></to-segmented>`,
} satisfies Meta<SegmentedArgs>;
export default meta;

export const MyAndAll: StoryObj<SegmentedArgs> = {};
/** With icons: a page's views of the same records. */
export const Views: StoryObj<SegmentedArgs> = {
  args: { value: 'table' },
  render: ({ value }) => {
    const options: Segment[] = [
      { value: 'board', label: 'Board', icon: Columns3 },
      { value: 'table', label: 'Table', icon: Table },
      { value: 'calendar', label: 'Calendar', icon: CalendarDays },
    ];
    return html`<to-segmented label="View" .options=${options} .value=${value} @change=${(e: CustomEvent) => action('change')(e.detail.value)}></to-segmented>`;
  },
};
/** The suite's apps, a long choice, at a phone's width: the segments share the row, their words cut short where they must be. */
export const Many: StoryObj<SegmentedArgs> = {
  args: { value: 'write' },
  render: ({ value }) =>
    html`<div style="max-width: 22rem">
      <to-segmented label="App" .options=${apps()
        .slice(0, 5)
        .map((a) => ({ value: a.id, label: a.name }))} .value=${value} @change=${(e: CustomEvent) => action('change')(e.detail.value)}></to-segmented>
    </div>`,
};
