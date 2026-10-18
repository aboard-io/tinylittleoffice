import type { Meta, StoryObj } from '@storybook/web-components-vite';
import { html } from 'lit';
import { tokens } from './tokens.ts';

/** The shapes: the radii and the shadows, in em, so they are as round and as deep as the words they hold are large. */
const meta = { title: 'Foundations/Shape' } satisfies Meta;
export default meta;

/** Each radius and each shadow on a panel of --to-surface. */
export const Shape: StoryObj = {
  render: () =>
    html`<div class="sb-row">
      ${tokens
        .filter((t) => /radius|shadow/.test(t.name))
        .map(
          (t) => html`<figure class="sb-swatch">
            <div class="sb-shape" style="${t.name.includes('radius') ? 'border-radius' : 'box-shadow'}: var(${t.name})"></div>
            <figcaption><code>${t.name}</code><br /><span>${t.value}</span></figcaption>
          </figure>`,
        )}
    </div>`,
};

/** The room: the gutter, the measure of a column, a finger's target. */
export const Room: StoryObj = {
  render: () =>
    html`${['--to-gutter', '--to-touch', '--to-max-w'].map(
      (name) => html`<p class="sb-caption"><code>${name}</code></p>
        <div class="sb-measure" style="width: min(100%, var(${name}))"></div>`,
    )}`,
};
