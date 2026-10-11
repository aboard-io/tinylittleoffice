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
import { fontIn } from './fonts.ts';
import ur from '../../src/i18n/ur.ts';

const words = async (): Promise<string[]> => {
  const out: string[] = [];
  for (const t of await appOf('diagram')!.templates()) for (const s of layout(parse(t.doc)).shapes) if (s.text) out.push(...s.text.replace(/^:[a-z0-9-]+\s*/, '').split(' | '));
  for (const t of await appOf('deck')!.templates()) for (const s of slidesOf(parse(t.doc))) out.push(plainText(s.title), ...s.items.map((it) => plainText(it.runs)));
  return out.map((w) => w.trim()).filter(Boolean);
};

test.each([
  ['plain', false],
  ['bold', true],
])('%s: the fallback metrics are within a tenth of Chromium’s', async (_, bold) => {
  const ctx = document.createElement('canvas').getContext('2d')!;
  ctx.font = `${bold ? 600 : 400} 14px ${FONT}`;
  const all = await words();
  expect(all.length).toBeGreaterThan(200);
  const real = all.reduce((a, w) => a + ctx.measureText(w).width, 0);
  const ours = all.reduce((a, w) => a + textWidth(w, 14, bold), 0);
  expect(ours / real).toBeGreaterThan(0.9);
  expect(ours / real).toBeLessThan(1.1);
});

// The scripts of the languages: words each language writes in its own script (its names for the world's countries, its
// months and its weekdays, from Intl, so no list here is a translation of anyone's), measured in its script's type
// (test/browser/fonts.ts), within the same tenth of the fallback's sum. Haitian Creole is in the Latin script, which the
// templates' words above hold, and Intl has no words of its own for it yet.
const REGIONS =
  'US GB FR DE ES IT NL PT BR JP CN TW HK KR IN BD PK RU UA PL HT SA EG MX CA AU NG KE ZA AR CL CO PE VE CU DO JM TR IR IQ IL GR SE NO DK FI IE BE CH AT CZ HU RO BG RS HR GE AM KZ AF NP LK MM TH VN KH MY ID PH SG NZ'.split(
    ' ',
  );
const native = (lang: string): string[] => {
  const regions = new Intl.DisplayNames([lang], { type: 'region' });
  const month = new Intl.DateTimeFormat(lang, { month: 'long' });
  const weekday = new Intl.DateTimeFormat(lang, { weekday: 'long' });
  return [
    ...REGIONS.map((r) => regions.of(r)!),
    ...Array.from({ length: 12 }, (_, m) => month.format(new Date(2026, m, 3))),
    ...Array.from({ length: 7 }, (_, d) => weekday.format(new Date(2026, 0, 4 + d))),
  ];
};

for (const lang of ['ru', 'uk', 'pl', 'bn', 'hi', 'ur', 'ko', 'zh-hant', 'zh-hans', 'ja', 'ar'])
  test.each([
    ['plain', false],
    ['bold', true],
  ])(`${lang}, %s: the fallback metrics are within a tenth of Chromium’s in the script’s type`, (_, bold) => {
    const ctx = document.createElement('canvas').getContext('2d')!;
    ctx.font = fontIn(lang, `${bold ? 600 : 400} 14px ${FONT}`);
    const all = native(lang);
    expect(all.some((w) => /[^\p{Script=Latin}\p{Script=Common}\p{Script=Inherited}]/u.test(w))).toBe(lang !== 'pl');
    const real = all.reduce((a, w) => a + ctx.measureText(w).width, 0);
    const ours = all.reduce((a, w) => a + textWidth(w, 14, bold), 0);
    expect(ours / real).toBeGreaterThan(0.9);
    expect(ours / real).toBeLessThan(1.1);
  });

// Urdu as its readers see it (Paul, 2026-10-11): Nastaliq, the stylesheet's first choice under :lang(ur). The words of
// the interface, every string of ur.ts, measured in Noto Nastaliq Urdu, come within the same tenth of the fallback's
// Arabic widths: Nastaliq is taller than Naskh, not wider (kit/draw.ts SCRIPTS).
test('ur: the interface’s own words in Nastaliq are within a tenth of the Arabic widths', () => {
  const ctx = document.createElement('canvas').getContext('2d')!;
  ctx.font = `400 14px 'Noto Nastaliq Urdu', ${FONT}`;
  const all = Object.values(ur).filter((w) => /\p{Script=Arabic}/u.test(w));
  expect(all.length).toBeGreaterThan(1000);
  const real = all.reduce((a, w) => a + ctx.measureText(w).width, 0);
  const ours = all.reduce((a, w) => a + textWidth(w, 14), 0);
  expect(ours / real).toBeGreaterThan(0.9);
  expect(ours / real).toBeLessThan(1.1);
});
