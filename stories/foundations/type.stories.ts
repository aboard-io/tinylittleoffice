import type { Meta, StoryObj } from '@storybook/web-components-vite';
import { html } from 'lit';
import { tokens } from './tokens.ts';

/** The type: IBM Plex (src/styles/fonts.css, the faces served at /fonts/…), its stacks, and the two lines. */
const meta = { title: 'Foundations/Type' } satisfies Meta;
export default meta;

const SAMPLE = 'The document is the link. Whoever has the link has the document. 0123456789';

/** Each face token, its stack and a line set in it, regular, semibold and italic. */
export const Faces: StoryObj = {
  render: () =>
    html`${tokens
      .filter((t) => t.name.startsWith('--to-font'))
      .map(
        (t) => html`<section class="sb-face">
          <p class="sb-caption"><code>${t.name}</code>: ${t.value}</p>
          <p style="font-family: var(${t.name}); font-size: 1.25rem; margin: 0">${SAMPLE}</p>
          <p style="font-family: var(${t.name}); font-weight: 600; margin: 0">${SAMPLE}</p>
          <p style="font-family: var(${t.name}); font-style: italic; margin: 0">${SAMPLE}</p>
        </section>`,
      )}`,
};

/** The scale a document's words are drawn at (rem, so the size of everything moves them), on --to-line and --to-line-label. */
export const Sizes: StoryObj = {
  render: () =>
    html`${[2, 1.5, 1.25, 1, 0.875, 0.75].map(
      (rem) => html`<p style="font-size: ${rem}rem; line-height: var(${rem > 1.2 ? '--to-line-label' : '--to-line'}); margin: 0 0 0.5rem">
        <span class="sb-caption">${rem}rem</span> ${SAMPLE}
      </p>`,
    )}`,
};

/** Words in the scripts Plex is shipped for, each in its own face through --to-font. */
export const Scripts: StoryObj = {
  render: () =>
    html`${[
      ['en', 'A tiny office suite'],
      ['ar', 'مجموعة مكتبية صغيرة'],
      ['he', 'חבילת משרד קטנה'],
      ['hi', 'एक छोटा ऑफ़िस सूट'],
      ['ru', 'Крошечный офисный пакет'],
    ].map(([lang, words]) => html`<p lang=${lang} dir=${lang === 'ar' || lang === 'he' ? 'rtl' : 'ltr'} style="font-size: 1.25rem; margin: 0 0 0.5rem">${words}</p>`)}`,
};
