// Wide documents get wide thumbnails: in the templates list a landscape page is 72 tall and as wide as its shape,
// to twice its height, beside words that ellipsise; a kept document's <to-preview> the same at its own height.
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
import { zoomed } from '../../src/kit/zoom.ts';

/** A box on the screen in the stylesheet's own pixels: the normal size draws everything at kit/zoom.ts BASE. */
const css = (r: DOMRect) => ({ width: r.width / zoomed(), height: r.height / zoomed() });
import '../../src/styles.css';

const SHAPES: Record<string, [number, number]> = { Letter: [85, 110], Slide: [1600, 900], Page: [400, 300], Strip: [1300, 240] };

test('the templates list: a portrait page 56 by 72, a landscape one as wide as its shape to twice its height; the view is asked for a thumbnail', async () => {
  document.body.innerHTML = '<div id="box"></div>';
  const asked: (ViewOpts | undefined)[] = [];
  const long = 'A template whose name is far too long to sit beside a wide thumbnail on a phone';
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
  await until(() => el.listbox.matches(':popover-open') && !!el.listbox.querySelector('.to-thumb svg'));
  const thumbs = [...el.listbox.querySelectorAll<HTMLElement>('.to-thumb')].map((x) => css(x.getBoundingClientRect()));
  expect(thumbs.map((r) => Math.round(r.width))).toEqual([56, 128, 96, 144, 144]);
  for (const r of thumbs) expect(Math.round(r.height)).toBe(72);
  expect(asked.every((o) => o?.small && o.thumb)).toBe(true);
  // The words beside the widest: the name on one line, cut with an ellipsis; nothing wider than the list.
  const row = el.listbox.querySelectorAll<HTMLElement>('.to-option')[4];
  const name = row.querySelector<HTMLElement>('.to-option-words > span')!;
  expect(name.scrollWidth).toBeGreaterThan(name.clientWidth);
  expect(getComputedStyle(name).textOverflow).toBe('ellipsis');
  expect(row.scrollWidth).toBeLessThanOrEqual(row.clientWidth);
  el.listbox.hidePopover();
});

test('a kept document’s preview: a slide is as wide as its shape, a portrait page its own, at the preview’s height and the found list’s', async () => {
  const slide = routeHash('deck', encodeDoc('# A talk\n\nWords on a slide\n'));
  const letter = routeHash('write', encodeDoc('# A letter\n\nDear Sam,\n'));
  document.body.innerHTML = `<div style="display:flex"><to-preview hash="${slide}"></to-preview><to-preview hash="${letter}"></to-preview></div><div class="to-found" style="display:flex"><to-preview hash="${slide}"></to-preview></div>`;
  const all = [...document.querySelectorAll<ToPreview>('to-preview')];
  for (const p of all) p.draw();
  const box = (p: Element) => css(p.querySelector('svg')!.getBoundingClientRect());
  await until(() => all.every((p) => box(p).width > 0));
  const [wide, tall, found] = all.map(box);
  expect(Math.round(wide.height)).toBe(56);
  expect(Math.round(wide.width)).toBe(90); // 960 by 600
  expect(tall.width).toBeLessThan(tall.height);
  expect(Math.round(found.height)).toBe(40);
  expect(Math.round(found.width)).toBe(64);
});
