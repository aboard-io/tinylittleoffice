// The page before the app (Paul, 2026-10-12: "What can we do about fouc", then "Do both fixes"). What the build writes
// for crawlers into <header id="to-first"> (scripts/first.ts, scripts/seo.ts) is drawn by the stylesheet alone, no
// module, as the page the shell draws over it (page.css, #to-first): the home page's wordmark and the apps' names, and
// an app's name and line on its page, each within two pixels of where the shell puts them, at a phone's width and a
// desktop's; what the page does not show (the line for agents, the templates' names) out of sight. And while a face of
// Plex is on its way the words are set in the device's face standing in for it (src/styles/fonts.css), sized so the
// swap moves nothing: the same lines, the same height within 3%.
import { test, expect, afterAll } from 'vitest';
import { page } from 'vitest/browser';
import { mount, settled, until } from './helpers.ts';
// The built site's one stylesheet has every app's sheet in it (vite.config.ts); here an app's comes with its editor, so
// Write's, which the Word Processor's page reads, is asked for before that page is drawn without it.
import '../../src/apps/write/style.css';
import { apps } from '../../src/kit/core/apps.ts';
import { applySize, BASE } from '../../src/kit/ui/zoom.ts';
import { appFirst, homeFirst, type Listed } from '../../scripts/first.ts';

const SITE = 'https://office.example.org/';
const listed = (): Promise<Listed[]> => Promise.all(apps().map(async (a) => ({ id: a.id, name: a.name, blurb: a.blurb, templates: (await a.templates()).map((t) => t.name) })));

interface Box {
  x: number;
  y: number;
  w: number;
  h: number;
}
const boxOf = (r: DOMRect): Box => ({ x: r.left, y: r.top, w: r.width, h: r.height });
/** Where an element's words are drawn: the box of its text, not of the element. */
function words(el: Element): Box {
  const range = document.createRange();
  range.selectNodeContents(el);
  return boxOf(range.getBoundingClientRect());
}
const near = (a: number, b: number, what: string) => expect(Math.abs(a - b), `${what}: ${a.toFixed(1)} against the shell's ${b.toFixed(1)}`).toBeLessThanOrEqual(2);
/** Out of sight as a screen reader's words are (a11y.css .sr-only): taken out of the flow and clipped to nothing. */
const hidden = (el: Element) => {
  const s = getComputedStyle(el);
  return el.classList.contains('sr-only') && s.position === 'absolute' && s.clip === 'rect(0px, 0px, 0px, 0px)';
};

/** The page as it is before any module runs: the static header and the stylesheet, the size of everything not yet set. */
async function before(inner: string) {
  document.body.innerHTML = `<header id="to-first">${inner}</header>`;
  const root = document.documentElement.style;
  root.removeProperty('--to-doc');
  root.removeProperty('--to-nav');
  await settled();
}
afterAll(() => applySize());

for (const [w, h] of [
  [390, 844],
  [1100, 800],
]) {
  test(`${w} wide: the home page before the app is the home page the shell draws, the wordmark and each app's name within two pixels`, async () => {
    await page.viewport(w, h);
    const list = await listed();
    await before(homeFirst(SITE, list));
    // The size of everything is the normal one before the shell sets it (zoom.ts BASE).
    expect(parseFloat(getComputedStyle(document.documentElement).fontSize)).toBeCloseTo(16 * BASE, 1);
    const first = document.getElementById('to-first')!;
    expect(hidden(first.querySelector('p')!), 'the line for agents').toBe(true);
    expect(first.querySelector('p')!.textContent).toMatch(/^Agents: /);
    const mark = words(first.querySelector('h1')!);
    const names = [...first.querySelectorAll('li > a')].map((a) => [a.textContent!, words(a)] as const);
    const header = boxOf(first.querySelector('h1')!.getBoundingClientRect());

    applySize();
    const shell = await mount('');
    await settled();
    const brand = words(shell.querySelector('.to-brand')!);
    // The wordmark before the app is in the Serif's stand-in (fonts.css: no face of Plex before the first paint), at Plex's
    // place and line; its glyphs, and so its width within a few percent, are Plex's once the shell draws it.
    for (const k of ['x', 'y', 'h'] as const) near(mark[k], brand[k], `the wordmark's ${k}`);
    expect(Math.abs(mark.w / brand.w - 1), 'the wordmark’s width').toBeLessThan(0.06);
    const bar = boxOf(shell.querySelector('.to-header')!.getBoundingClientRect());
    for (const k of ['x', 'y', 'w', 'h'] as const) near(header[k], bar[k], `the header's ${k}`);
    const drawn = [...shell.querySelectorAll('.to-app-name')];
    expect(names.map(([n]) => n)).toEqual(drawn.map((n) => n.textContent));
    names.forEach(([name, box], i) => {
      const to = words(drawn[i]);
      for (const k of ['x', 'y', 'w', 'h'] as const) near(box[k], to[k], `${name}'s ${k}`);
    });
  });

  test(`${w} wide: the Word Processor's page before the app has its name where the title is and its line where the first words are`, async () => {
    await page.viewport(w, h);
    const write = (await listed()).find((a) => a.id === 'write')!;
    await before(appFirst(write));
    const first = document.getElementById('to-first')!;
    expect(hidden(first.querySelector('ul')!), 'the templates’ names').toBe(true);
    expect(first.querySelectorAll('ul li').length).toBe(write.templates.length);
    const title = words(first.querySelector('h1')!);
    const titleWeight = getComputedStyle(first.querySelector('h1')!).fontWeight;
    const line = first.querySelector('p')!;
    const lineStyle = getComputedStyle(line);
    const lineBox = line.getBoundingClientRect();
    const at = { x: lineBox.left + parseFloat(lineStyle.paddingLeft), y: lineBox.top + parseFloat(lineStyle.paddingTop) };
    const type = [lineStyle.fontSize, lineStyle.lineHeight, lineStyle.fontFamily];

    applySize();
    const shell = await mount('#/v1/write');
    await until(() => !!shell.querySelector('to-write-editor to-text .tx'), 'the editor never came');
    await settled();
    // The title box's words: inside its border and padding, in the middle of its height.
    const box = shell.querySelector<HTMLInputElement>('.to-title')!;
    const s = getComputedStyle(box);
    const r = box.getBoundingClientRect();
    near(title.x, r.left + parseFloat(s.borderLeftWidth) + parseFloat(s.paddingLeft), 'the title’s x');
    near(title.y + title.h / 2, r.top + r.height / 2, 'the title’s middle');
    expect(titleWeight).toBe(s.fontWeight);
    // The first words: where the editor's first line is, in its type.
    const tx = shell.querySelector('to-write-editor .tx')!;
    const t = tx.getBoundingClientRect();
    near(at.x, t.left + parseFloat(getComputedStyle(tx).paddingLeft), 'the line’s x');
    near(at.y, t.top + parseFloat(getComputedStyle(tx).paddingTop), 'the line’s y');
    const ts = getComputedStyle(tx);
    expect(type).toEqual([ts.fontSize, ts.lineHeight, ts.fontFamily]);
  });
}

// The device's faces standing in for Plex (src/styles/fonts.css): each one, under a family of its own so Plex cannot
// answer for it, sets a paragraph in as many lines as Plex does, its height within 3%; and its size is Plex's width
// over the stand-in's, measured here on Liberation's faces (the twins of Arial, Times and Courier New), within 1%.
const PARAGRAPH =
  'A tiny office suite where the link is the document. No accounts. Nothing is saved anywhere unless you choose to keep it on this device. The Word Processor, the Spreadsheet, the Presentation Builder and the Outliner open from the home page, with a template for each: a cover letter, a budget, a deck for a talk, a plan for the week. Every change goes into the link, and the link is what you send.';
const stand = [...document.styleSheets]
  .flatMap((sheet) => {
    const all: CSSRule[] = [];
    const walk = (rules: CSSRuleList) => [...rules].forEach((r) => ('cssRules' in r && !(r instanceof CSSFontFaceRule) ? walk((r as CSSGroupingRule).cssRules) : all.push(r)));
    try {
      walk(sheet.cssRules);
    } catch {
      // Another origin's sheet: none of ours.
    }
    return all;
  })
  .filter((r): r is CSSFontFaceRule => r instanceof CSSFontFaceRule && r.style.getPropertyValue('src').startsWith('local('));

test('every Sans, Serif and Mono face has its stand-in in the page’s stylesheet', () => {
  expect(stand.map((r) => `${r.style.getPropertyValue('font-family').replace(/["']/g, '')} ${r.style.getPropertyValue('font-weight')} ${r.style.getPropertyValue('font-style')}`)).toEqual([
    'IBM Plex Sans 400 normal',
    'IBM Plex Sans 400 italic',
    'IBM Plex Sans 600 normal',
    'IBM Plex Sans 600 italic',
    'IBM Plex Serif 400 normal',
    'IBM Plex Serif Stand-in 400 normal',
    'IBM Plex Serif 400 italic',
    'IBM Plex Serif 600 normal',
    'IBM Plex Serif 600 italic',
    'IBM Plex Mono 400 normal',
    'IBM Plex Mono 600 normal',
  ]);
});

const TWIN: Record<string, string> = { 'IBM Plex Sans': 'Liberation Sans', 'IBM Plex Serif': 'Liberation Serif', 'IBM Plex Mono': 'Liberation Mono' };
for (const [i, rule] of stand.entries()) {
  // The wordmark's stand-in (fonts.css) stands in for Plex Serif under a name of its own.
  const family = rule.style.getPropertyValue('font-family').replace(/["']/g, '').replace(' Stand-in', '');
  const weight = rule.style.getPropertyValue('font-weight');
  const style = rule.style.getPropertyValue('font-style');
  test(`${family} ${weight} ${style}: the stand-in sets a paragraph in Plex's lines and height, and its size is Plex's width over its own`, async () => {
    const d = (p: string) => rule.style.getPropertyValue(p);
    const name = `Stand-in ${i}`;
    // The descriptors as the rule has them (size-adjust is one the DOM's types do not name yet).
    const descriptors: FontFaceDescriptors & { sizeAdjust: string } = {
      weight,
      style,
      sizeAdjust: d('size-adjust'),
      ascentOverride: d('ascent-override'),
      descentOverride: d('descent-override'),
      lineGapOverride: d('line-gap-override'),
    };
    const face = new FontFace(name, d('src'), descriptors);
    document.fonts.add(face);
    await face.load();
    document.body.innerHTML = '';
    const para = (fam: string) => {
      const p = document.createElement('p');
      p.style.cssText = `width: 30rem; margin: 0; font: ${style} ${weight} 1.0625rem/1.6 '${fam}', monospace;`;
      p.textContent = PARAGRAPH;
      document.body.append(p);
      return p;
    };
    const plex = para(family);
    const stood = para(name);
    await document.fonts.load(`${style} ${weight} 16px '${family}'`, PARAGRAPH);
    await settled();
    const lh = parseFloat(getComputedStyle(plex).lineHeight);
    const lines = (p: HTMLElement) => Math.round(p.getBoundingClientRect().height / lh);
    expect(Math.abs(lines(stood) - lines(plex)), `${lines(stood)} lines against Plex's ${lines(plex)}`).toBeLessThanOrEqual(1);
    expect(Math.abs(stood.getBoundingClientRect().height / plex.getBoundingClientRect().height - 1)).toBeLessThanOrEqual(0.03);

    // The size, measured again: Plex's width over the twin's, on one line of the paragraph.
    const ctx = document.createElement('canvas').getContext('2d')!;
    const width = (font: string) => ((ctx.font = font), ctx.measureText(PARAGRAPH).width);
    const ratio = width(`${style} ${weight} 100px '${family}'`) / width(`${style} ${weight === '600' ? 700 : 400} 100px '${TWIN[family]}'`);
    expect(Math.abs(ratio * 100 - parseFloat(d('size-adjust'))), `size-adjust ${d('size-adjust')}, measured ${(ratio * 100).toFixed(2)}%`).toBeLessThanOrEqual(1);
    // And the line: Plex's ascent and descent (1025 and 275 of 1000) over the size.
    expect(parseFloat(d('ascent-override')) * parseFloat(d('size-adjust'))).toBeCloseTo(102.5 * 100, -1);
    expect(parseFloat(d('descent-override')) * parseFloat(d('size-adjust'))).toBeCloseTo(27.5 * 100, -1);
    document.fonts.delete(face);
    document.body.innerHTML = '';
  });
}
