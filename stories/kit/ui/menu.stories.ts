import type { Meta, StoryObj } from '@storybook/web-components-vite';
import { action } from 'storybook/actions';
import { html } from 'lit';
import { UI, type MenuItem } from '../../../src/editors.ts';

interface MenuArgs {
  label: string;
  caret: boolean;
  iconOnly: boolean;
  filter: boolean;
  keep: boolean;
}

const align: MenuItem[] = [
  { label: 'Left', icon: UI.alignLeft, keys: 'Mod+Shift+L', checked: true, does: action('left') },
  { label: 'Center', icon: UI.alignCenter, keys: 'Mod+Shift+E', checked: false, does: action('center') },
  { label: 'Right', icon: UI.alignRight, keys: 'Mod+Shift+R', checked: false, does: action('right') },
  { label: 'Justify', icon: UI.alignJustify, disabled: true, does: action('justify') },
];

/**
 * <to-menu>: a button that opens a menu of items on the Popover API: light-dismissed, on top of everything, Escape
 * closes it and the focus comes back to the button. The arrows walk the items, letters jump to one, and with `filter`
 * letters narrow the list. An item may be a checkbox (`checked`), sit under a `group`, carry a `hint` and its `keys`,
 * show a `swatch`, or be a row of `actions`.
 */
const meta = {
  title: 'Kit/UI/Menu',
  component: 'to-menu',
  args: { label: 'Align', caret: true, iconOnly: false, filter: false, keep: false },
  argTypes: {
    iconOnly: { description: 'The icon alone; the label is the button’s name' },
    filter: { description: 'Letters typed narrow the items' },
    keep: { description: 'Never takes the focus by a pointer (it acts on an editor’s selection)' },
  },
  // Open as the story opens, as a click on its button opens it.
  play: ({ canvasElement }) => canvasElement.querySelector<HTMLElement>('to-menu > button')!.click(),
  render: (a) => html`<to-menu .label=${a.label} .icon=${UI.alignLeft} ?caret=${a.caret} ?icon-only=${a.iconOnly} ?filter=${a.filter} ?keep=${a.keep} .items=${align}></to-menu>`,
} satisfies Meta<MenuArgs>;
export default meta;
type Story = StoryObj<MenuArgs>;

/** Checkbox items, keys at their ends, one disabled. */
export const Checked: Story = {};

/** Items under headings, each with a second line. */
export const Groups: Story = {
  args: { label: 'Open', filter: true },
  render: (a) =>
    html`<to-menu
      .label=${a.label}
      .icon=${UI.folder}
      ?caret=${a.caret}
      ?icon-only=${a.iconOnly}
      ?filter=${a.filter}
      .items=${[
        { label: 'Word Processor', icon: UI.text, hint: 'Words on a page', group: 'Words', does: action('write') },
        { label: 'Outliner', icon: UI.list, hint: 'Ideas under ideas', group: 'Words', does: action('outline') },
        { label: 'Spreadsheet', icon: UI.table, hint: 'Formulas and charts', group: 'Numbers', does: action('sheet') },
        { label: 'Calendar', icon: UI.calendar, hint: 'What happens when', group: 'Time', does: action('cal') },
      ]}
    ></to-menu>`,
};

/** A menu of colours: the button shows the one chosen as a dot. */
export const Swatches: Story = {
  args: { label: 'Color', iconOnly: true },
  render: (a) =>
    html`<to-menu
      .label=${a.label}
      swatch="#4f46e5"
      ?caret=${a.caret}
      ?icon-only=${a.iconOnly}
      .items=${[
        { label: 'Ink', swatch: '#18181b', does: action('ink') },
        { label: 'Indigo', swatch: '#4f46e5', checked: true, does: action('indigo') },
        { label: 'Red', swatch: '#dc2626', does: action('red') },
        { label: 'Green', swatch: '#16a34a', does: action('green') },
      ]}
    ></to-menu>`,
};

/** Rows with actions, as the Download menu has: Left and Right go between a row's buttons. */
export const Rows: Story = {
  args: { label: 'Download' },
  render: (a) =>
    html`<to-menu
      .label=${a.label}
      .icon=${UI.download}
      ?caret=${a.caret}
      ?icon-only=${a.iconOnly}
      .items=${['PDF', 'Word (.docx)', 'Markdown'].map((f) => ({
        label: f,
        does: () => {},
        actions: [
          { icon: UI.view, label: `View ${f}`, does: action(`view ${f}`) },
          { icon: UI.download, label: `Download ${f}`, does: action(`download ${f}`) },
          { icon: UI.copy, label: `Copy ${f}`, does: action(`copy ${f}`) },
        ],
      }))}
    ></to-menu>`,
};
