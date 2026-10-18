import type { Meta, StoryObj } from '@storybook/web-components-vite';
import { action } from 'storybook/actions';
import { html } from 'lit';
import { UI } from '../../../src/editors.ts';

/**
 * <to-insert>: the Insert ▾ menu every bar has, a <to-menu> named Insert with a plus. The app gives it what can be
 * put in; letters typed narrow the list ("ta" to Table).
 */
const meta = {
  title: 'Kit/UI/Insert',
  component: 'to-insert',
  // Open as the story opens, as a click on its button opens it.
  play: ({ canvasElement }) => canvasElement.querySelector<HTMLElement>('to-insert > button')!.click(),
} satisfies Meta;
export default meta;

export const Insert: StoryObj = {
  render: () =>
    html`<to-insert
      .items=${[
        { label: 'Heading', icon: UI.heading, does: action('heading') },
        { label: 'List', icon: UI.list, does: action('list') },
        { label: 'Footnote', icon: UI.footnote, does: action('footnote') },
        { label: 'Table', icon: UI.table, group: 'Data', does: action('table') },
        { label: 'Picture', icon: UI.image, group: 'Data', does: action('image') },
        { label: 'QR code of this document', icon: UI.qr, group: 'Other documents', does: action('qr') },
        { label: 'Tiny Little Office Doc', icon: UI.link, group: 'Other documents', does: action('doc') },
      ]}
    ></to-insert>`,
};
