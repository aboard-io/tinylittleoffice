// Every preview is the one 4:3 box whatever the page's shape, the page scaled to cover it and cropped from the top:
// 96 by 72 in the templates list beside words that ellipsise, 72 by 54 for a kept document, 48 by 36 in the found list.
import { test, expect } from 'vitest';
import { render, html } from 'lit';
import '../../src/kit/home.ts';
import type { ToTemplates } from '../../src/kit/home.ts';
import type { ToPreview } from '../../src/kit/preview.ts';
import type { ViewOpts } from '../../src/kit/app.ts';
import { encodeDoc } from '../../src/kit/codec.ts';
import { routeHash } from '../../src/kit/route.ts';
import { UI } from '../../src/kit/icons.ts';
import { until } from './helpers.ts';
import { remScale } from '../../src/kit/zoom.ts';

/** A box on the screen in sixteenths of a rem, at the default size (a rem is kit/zoom.ts BASE × 16px). */
const css = (r: DOMRect) => ({ width: r.width / remScale(), height: r.height / remScale() });
import '../../src/styles.css';

const SHAPES: Record<string, [number, number]> = { Letter: [85, 110], Slide: [1600, 900], Page: [400, 300], Strip: [1300, 240] };

test('the templates list: every page, portrait, slide, wide or a strip, in the one 96 by 72 box, cropped to cover it; the view is asked for a thumbnail', async () => {
  document.body.innerHTML = '<div id="box"></div>';
  const asked: (ViewOpts | undefined)[] = [];
  const long = 'A template whose name is far too long to sit beside a wide thumbnail on a phone, or beside one in the widest column a desktop gives it';
  const app = {
    id: 'demo', name: 'Demo', noun: 'demo', group: '', icon: UI.plus, blurb: '', blank: () => 'Letter', blankInTemplates: true,
    templates: [...Object.keys(SHAPES), long].map((name) => ({ id: name.toLowerCase(), name, blurb: name === long ? 'And a blurb that wraps onto a second line rather than pushing the row wider' : '', doc: SHAPES[name] ? name : 'Strip' })),
    editor: async () => ({ tag: 'x' }), title: () => '', retitle: (d: string) => d,
    view: (doc: string, opts?: ViewOpts) => (asked.push(opts), [{ w: SHAPES[doc][0], h: SHAPES[doc][1], svg: '' }]),
  };
  render(html`<to-templates .app=${app}></to-templates>`, document.querySelector('#box')!);
  const el = document.querySelector<ToTemplates>('to-templates')!;
  await el.updateComplete;
  el.button.click();
  await until(() => el.dialog.open && !!el.listbox.querySelector('.to-thumb svg'));
  const thumbs = [...el.listbox.querySelectorAll<HTMLElement>('.to-thumb')].map((x) => css(x.getBoundingClientRect()));
  expect(thumbs.map((r) => Math.round(r.width))).toEqual([96, 96, 96, 96, 96]);
  for (const r of thumbs) expect(Math.round(r.height)).toBe(72);
  // The drawing covers the box and is cut, not letterboxed: the SVG fills the box and slices from the top.
  for (const svg of el.listbox.querySelectorAll<SVGSVGElement>('.to-thumb svg')) {
    expect(svg.getAttribute('preserveAspectRatio')).toBe('xMidYMin slice');
    const r = css(svg.getBoundingClientRect());
    expect([Math.round(r.width), Math.round(r.height)]).toEqual([94, 70]); // inside the box's 1px border
  }
  expect(asked.every((o) => o?.small && o.thumb)).toBe(true);
  // The words beside the widest: the name on one line, cut with an ellipsis; nothing wider than the list.
  const row = el.listbox.querySelectorAll<HTMLElement>('.to-option')[4];
  const name = row.querySelector<HTMLElement>('.to-option-words > span')!;
  expect(name.scrollWidth).toBeGreaterThan(name.clientWidth);
  expect(getComputedStyle(name).textOverflow).toBe('ellipsis');
  expect(row.scrollWidth).toBeLessThanOrEqual(row.clientWidth);
  el.hide();
});

test('a kept document’s preview: a slide and a portrait page are the same 72 by 54 box, and 48 by 36 in the found list', async () => {
  const slide = routeHash('deck', encodeDoc('# A talk\n\nWords on a slide\n'));
  const letter = routeHash('write', encodeDoc('# A letter\n\nDear Sam,\n'));
  document.body.innerHTML = `<div style="display:flex"><to-preview hash="${slide}"></to-preview><to-preview hash="${letter}"></to-preview></div><div class="to-found" style="display:flex"><to-preview hash="${slide}"></to-preview></div>`;
  const all = [...document.querySelectorAll<ToPreview>('to-preview')];
  for (const p of all) p.draw();
  const box = (p: Element) => css(p.getBoundingClientRect());
  await until(() => all.every((p) => !!p.querySelector('svg') && p.querySelector('svg')!.getBoundingClientRect().width > 0));
  const [wide, tall, found] = all.map(box);
  expect([Math.round(wide.width), Math.round(wide.height)]).toEqual([72, 54]);
  expect([Math.round(tall.width), Math.round(tall.height)]).toEqual([72, 54]);
  expect([Math.round(found.width), Math.round(found.height)]).toEqual([48, 36]);
  // The drawing fills each box inside its 1px border.
  for (const p of all) {
    const r = css(p.querySelector('svg')!.getBoundingClientRect());
    expect([Math.round(r.width), Math.round(r.height)]).toEqual([Math.round(box(p).width) - 2, Math.round(box(p).height) - 2]);
  }
  for (const p of all) expect(p.querySelector('svg')!.getAttribute('preserveAspectRatio')).toBe('xMidYMin slice');
});
