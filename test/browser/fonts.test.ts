// The type is IBM Plex, from the site's own files (src/styles/fonts.css, public/fonts/): the page's words are set in
// Plex Sans once the fonts are ready, the Serif look in Plex Serif, code in Plex Mono, Arabic and Hindi in Plex Sans
// Arabic and Devanagari, each face loaded and drawing (its words measure otherwise than the fallback's).
import { test, expect } from 'vitest';
import './helpers.ts';
import '../../src/apps/write/style.css';
import { plex } from './fonts.ts';

const first = (el: Element) => getComputedStyle(el).fontFamily.split(',')[0].trim().replace(/["']/g, '');
/** Whether a family draws `sample` otherwise than the fallback alone would: the face is there and loaded. */
const draws = (family: string, sample: string, weight = 400) => {
  const ctx = document.createElement('canvas').getContext('2d')!;
  ctx.font = `${weight} 16px monospace`;
  const fallback = ctx.measureText(sample).width;
  ctx.font = `${weight} 16px '${family}', monospace`;
  return ctx.measureText(sample).width !== fallback;
};

test('the body is set in IBM Plex Sans, and the face is loaded once the fonts are ready', async () => {
  await plex;
  await document.fonts.ready;
  expect(first(document.body)).toBe('IBM Plex Sans');
  expect(document.fonts.check("16px 'IBM Plex Sans'")).toBe(true);
  expect(document.fonts.check("600 16px 'IBM Plex Sans'")).toBe(true);
  expect(document.fonts.check("italic 16px 'IBM Plex Sans'")).toBe(true);
  for (const weight of [400, 600]) expect(draws('IBM Plex Sans', 'Tiny Little Office', weight), `Plex Sans ${weight}`).toBe(true);
});

test('the Serif look resolves to IBM Plex Serif, code to IBM Plex Mono', async () => {
  document.body.innerHTML = '<div class="write-page" data-look="serif"><div class="tx"><p>Words</p></div></div><p><code>let x = 1</code></p>';
  await plex;
  expect(first(document.querySelector('.write-page .tx p')!)).toBe('IBM Plex Serif');
  expect(first(document.querySelector('code')!)).toBe('IBM Plex Mono');
  expect(document.fonts.check("16px 'IBM Plex Serif'")).toBe(true);
  expect(document.fonts.check("16px 'IBM Plex Mono'")).toBe(true);
  expect(draws('IBM Plex Serif', 'A bookish serif')).toBe(true);
  expect(draws('IBM Plex Mono', 'Monospace, ragged')).toBe(true);
  document.body.innerHTML = '';
});

test('Arabic and Devanagari are drawn by Plex Sans Arabic and Plex Sans Devanagari, behind their unicode-range', async () => {
  await plex;
  expect(document.fonts.check("16px 'IBM Plex Sans Arabic'", 'العربية')).toBe(true);
  expect(document.fonts.check("16px 'IBM Plex Sans Devanagari'", 'हिन्दी')).toBe(true);
  expect(draws('IBM Plex Sans Arabic', 'العربية')).toBe(true);
  expect(draws('IBM Plex Sans Devanagari', 'हिन्दी')).toBe(true);
  // The Latin face has no Arabic: its range leaves Arabic to the face that has it.
  const latin = [...document.fonts].find((f) => f.family.replace(/["']/g, '') === 'IBM Plex Sans' && f.weight === '400' && f.style === 'normal')!;
  expect(latin.unicodeRange).not.toMatch(/U\+6/);
});
