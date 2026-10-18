import type { Meta, StoryObj } from '@storybook/web-components-vite';
import { html } from 'lit';
import { isColor, tokens } from './tokens.ts';

/**
 * Every colour token of src/styles/tokens.css (docs/library.md, Theming), drawn with the theme in force: the toolbar's
 * Theme shows the dark values under :root[data-theme='dark']. A page themes the editors by setting these.
 */
const meta = { title: 'Foundations/Colors' } satisfies Meta;
export default meta;

/** The interface's colours and the paper's: each a swatch, its name and its light value as tokens.css writes it. */
export const Colors: StoryObj = {
  render: () =>
    html`<div class="sb-swatches">
      ${tokens.filter(isColor).map(
        (t) => html`<figure class="sb-swatch">
          <div class="sb-chip" style="background: var(${t.name})"></div>
          <figcaption><code>${t.name}</code><br /><span>${t.value}</span></figcaption>
        </figure>`,
      )}
    </div>`,
};

/** The pairs that carry words, each drawn as words on its ground (test/contrast.test.ts holds the site's to their contrast). */
export const Pairs: StoryObj = {
  render: () => {
    const pairs = [
      ['--to-ink', '--to-bg'],
      ['--to-ink-2', '--to-surface'],
      ['--to-ink-3', '--to-surface-2'],
      ['--to-on-accent', '--to-accent'],
      ['--to-accent', '--to-accent-soft'],
      ['--to-ok-ink', '--to-ok-bg'],
      ['--to-soon-ink', '--to-soon-bg'],
      ['--to-last-ink', '--to-last-bg'],
      ['--to-paper-ink', '--to-paper'],
      ['--to-paper-muted', '--to-paper-shade'],
    ];
    return html`<div class="sb-row">
      ${pairs.map(([ink, ground]) => html`<div class="sb-pair" style="color: var(${ink}); background: var(${ground})"><code>${ink}</code> on <code>${ground}</code></div>`)}
    </div>`;
  },
};
