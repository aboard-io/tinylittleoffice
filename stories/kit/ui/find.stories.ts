import type { Meta, StoryObj } from '@storybook/web-components-vite';
import { html } from 'lit';
import type { Template } from '../../../src/editors.ts';
import '../../../src/kit/ui/find.ts';
import type { ToFind } from '../../../src/kit/ui/find.ts';
import { editorBox, templatesOf } from '../../support.ts';

type Loaded = { loaded: { templates: Template[] } };
interface FindArgs {
  query: string;
}

/**
 * <to-find>: Find in this document (Mod+F on the site). A small bar beside the app's bar: the words to find, how many
 * there are and which is in hand, previous and next, Close. Its `target` is the element whose words it looks in
 * (here a Word Processor's box, over the meeting notes template); the words are marked with the browser's own
 * highlights, nothing in the page changed. An editor whose words are not text on the page finds them itself (`find`).
 */
const meta = {
  title: 'Kit/UI/Find',
  component: 'to-find',
  args: { query: 'what' },
  loaders: [async () => ({ templates: await templatesOf('write') })],
  render: ({ query }, ctx) => {
    const tpl = (ctx as unknown as Loaded).loaded.templates.find((t) => t.id === 'meeting')!;
    const find = document.createElement('to-find') as ToFind;
    const ed = editorBox('write', tpl.doc, {
      ready: async () => {
        find.target = ed;
        await find.show();
        const input = find.input!;
        input.value = query;
        input.dispatchEvent(new Event('input'));
      },
    });
    return html`${ed}${find}`;
  },
} satisfies Meta<FindArgs>;
export default meta;

export const Find: StoryObj<FindArgs> = {};
