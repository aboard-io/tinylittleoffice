// The lint's measure is the layouts' own, and the layouts measure words with the fallback metrics the exports use
// (kit/draw.ts `textWidth`: a character's width as a share of the type's size), so that a page, a PDF and the lint
// are made without a browser. Here they are held to Chromium's: the words every diagram and deck template draws,
// set in the pages' font (kit/draw.ts FONT) and measured by the canvas, come within 10% of the fallback's sum,
// plain and bold. Past that the lint would say a label fits that a reader sees cut, or the reverse.
import { expect, test } from 'vitest';
import { FONT, textWidth } from '../../src/kit/draw.ts';
import { appOf } from '../../src/kit/apps.ts';
import { parse, plainText } from '../../src/doc/index.ts';
import { layout } from '../../src/apps/diagram/view.ts';
import { slidesOf } from '../../src/apps/deck/model.ts';

const words = (): string[] => {
  const out: string[] = [];
  for (const t of appOf('diagram')!.templates) for (const s of layout(parse(t.doc)).shapes) if (s.text) out.push(...s.text.replace(/^:[a-z0-9-]+\s*/, '').split(' | '));
  for (const t of appOf('deck')!.templates) for (const s of slidesOf(parse(t.doc))) out.push(plainText(s.title), ...s.items.map((it) => plainText(it.runs)));
  return out.map((w) => w.trim()).filter(Boolean);
};

test.each([
  ['plain', false],
  ['bold', true],
])('%s: the fallback metrics are within a tenth of Chromium’s', (_, bold) => {
  const ctx = document.createElement('canvas').getContext('2d')!;
  ctx.font = `${bold ? 600 : 400} 14px ${FONT}`;
  const all = words();
  expect(all.length).toBeGreaterThan(200);
  const real = all.reduce((a, w) => a + ctx.measureText(w).width, 0);
  const ours = all.reduce((a, w) => a + textWidth(w, 14, bold), 0);
  expect(ours / real).toBeGreaterThan(0.9);
  expect(ours / real).toBeLessThan(1.1);
});
