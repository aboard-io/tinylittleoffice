import type { Meta, StoryObj } from '@storybook/web-components-vite';
import { action } from 'storybook/actions';
import { html } from 'lit';
import type { Template } from '../../../src/editors.ts';
import { encodeDoc } from '../../../src/kit/core/codec.ts';
import { routeHash } from '../../../src/kit/core/route.ts';
import { askDocLink } from '../../../src/kit/ui/insert-dialogs.ts';
import { templatesOf } from '../../support.ts';

type Loaded = { loaded: { tpl: Template } };

/**
 * What Insert ▾ asks a link for: Tiny Little Office Doc, a <to-dialog> with one address field and, as soon as a link
 * is typed or pasted, the document it names drawn small. `askDocLink()` resolves to the fence that holds it, or null.
 * The link it reads is the host's to say (`host.read`); here the site's, so paste the link below.
 */
const meta = {
  title: 'Kit/UI/Insert dialogs',
  component: 'to-dialog',
  loaders: [async () => ({ tpl: (await templatesOf('sheet'))[0] })],
} satisfies Meta;
export default meta;

export const AskDocLink: StoryObj = {
  render: (_args, ctx) => {
    const { tpl } = (ctx as unknown as Loaded).loaded;
    const link = `https://tinylittleoffice.com/${routeHash('sheet', encodeDoc(tpl.doc))}`;
    return html`<button type="button" class="to-btn" @click=${async () => action('fence')(await askDocLink())}><span>Insert a Tiny Little Office Doc</span></button>
      <p class="sb-caption">A link to paste (the Spreadsheet’s ${tpl.name}):</p>
      <code class="sb-link-sample">${link}</code>`;
  },
};
