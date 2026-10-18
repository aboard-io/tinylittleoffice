import type { Meta, StoryObj } from '@storybook/web-components-vite';
import { html } from 'lit';
import { keepSize, size } from '../../../src/editors.ts';
import { stepSize, SIZE_MAX, SIZE_MIN } from '../../../src/kit/ui/zoom.ts';
import { editorBox, templatesOf } from '../../support.ts';
import type { Template } from '../../../src/editors.ts';

interface ZoomArgs {
  size: number;
}
type Loaded = { loaded: { tpl: Template } };

/**
 * The size of everything (kit/ui/zoom.ts): `keepSize(n)` sets it, 70% to 200%, and keeps it on the device; `size()` is
 * the size now. It is two numbers on the root, `--to-doc` and `--to-nav`, and every length in rem follows (this
 * Storybook sets `html { font-size: calc(100% * var(--to-doc)) }`, as docs/library.md, Theming, says a page may). The
 * story sets the size its control says each time it is drawn, so leaving it at 1 puts the size back.
 */
const meta = {
  title: 'Kit/UI/Zoom',
  args: { size: 1 },
  argTypes: { size: { control: { type: 'range', min: SIZE_MIN, max: SIZE_MAX, step: 0.1 }, description: 'keepSize(n): the size of everything' } },
  loaders: [async () => ({ tpl: (await templatesOf('write')).find((t) => t.id === 'memo')! })],
  render: (args, ctx) => {
    keepSize(args.size);
    const said = () => `${Math.round(size() * 100)}%`;
    const step = (by: -1 | 1) => (e: Event) => {
      stepSize(by);
      (e.currentTarget as HTMLElement).parentElement!.querySelector('output')!.textContent = said();
    };
    return html`<div class="sb-zoom">
        <button type="button" class="to-btn to-tool" aria-label="Smaller" @click=${step(-1)}>−</button>
        <output>${said()}</output>
        <button type="button" class="to-btn to-tool" aria-label="Larger" @click=${step(1)}>+</button>
      </div>
      ${editorBox('write', (ctx as unknown as Loaded).loaded.tpl.doc)}`;
  },
} satisfies Meta<ZoomArgs>;
export default meta;

export const Size: StoryObj<ZoomArgs> = {};
