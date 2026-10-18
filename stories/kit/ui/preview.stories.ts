import type { Meta, StoryObj } from '@storybook/web-components-vite';
import { html } from 'lit';
import { apps, type Template } from '../../../src/editors.ts';
import { encodeDoc } from '../../../src/kit/core/codec.ts';
import { routeHash } from '../../../src/kit/core/route.ts';
import '../../../src/kit/ui/preview.ts';
import { templatesOf } from '../../support.ts';

type Loaded = { loaded: { firsts: { app: string; tpl: Template }[] } };

/**
 * <to-preview hash="#/v1/write/…">: a document's first page, small, in the one 4:3 box every preview has, drawn from
 * its link alone (the payload decoded, the app's view), once it scrolls into sight. Here each app's first template,
 * by its link.
 */
const meta = {
  title: 'Kit/UI/Preview',
  component: 'to-preview',
  loaders: [async () => ({ firsts: await Promise.all(apps().map(async (a) => ({ app: a.id, tpl: (await templatesOf(a.id))[0] }))) })],
} satisfies Meta;
export default meta;

export const EachApp: StoryObj = {
  render: (_args, ctx) =>
    html`<div class="sb-previews">
      ${(ctx as unknown as Loaded).loaded.firsts.map(
        ({ app, tpl }) => html`<figure>
          <to-preview hash=${routeHash(app, encodeDoc(tpl.doc))}></to-preview>
          <figcaption>${tpl.name}</figcaption>
        </figure>`,
      )}
    </div>`,
};
