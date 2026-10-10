// The spatial canvases (docs/editing.md "Pinch and size", kit/pinch.ts pinchZoom): two fingers spreading over the
// Drawing Tool's canvas, the Diagram Maker's picture (an outline drawn as a mind map or a family tree is one), and the
// Animator's stage zoom that picture about the fingers and leave the size of everything alone; the point under the
// fingers stays under them; two fingers moving together pan the frame; lifted, the zoom is rounded to the canvas's
// step. The same gesture on the bar beside the canvas is the size of everything and leaves the zoom alone; the Trip
// Planner's map is Leaflet's. At the largest size the bars around the canvases are the nav's, one row, on a 390px screen.
import { test, expect, afterEach } from 'vitest';
import { page } from 'vitest/browser';
import { mount, tick, until } from './helpers.ts';
import { encodeDoc } from '../../src/kit/codec.ts';
import { BASE, NAV_MAX, SIZE_MAX, keepSize, size, stepSize } from '../../src/kit/zoom.ts';
import { outlineToFamily, outlineToMind, readOutline } from '../../src/apps/outline/model.ts';
import { parse } from '../../src/doc/index.ts';
import type { ToShell } from '../../src/kit/shell.ts';

afterEach(async () => {
  stepSize(0);
  history.replaceState(null, '', location.pathname);
  await page.viewport(1100, 800);
});

const DRAWING = 'Kind | X | Y | W | H | Style | Label\n--- | --- | --- | --- | --- | --- | ---\no | 4 | 6 | 16 | 8 | 1b | Browser\no | 32 | 6 | 16 | 8 | 1b | Server\nk | 0 | 1 | 0 | 0 | 0 | asks\n';
const SHAPES = 'Kind | X | Y | W | H | Style | Label\n--- | --- | --- | --- | --- | --- | ---\nt | 4 | 20 | 20 | 4 | 04 | Lift off\ni | 8 | 36 | 8 | 8 | 0b | rocket\n';
const LIFT = '---\nframes: 24\nfps: 8\n---\n' + SHAPES + '\nShape | Keys\n--- | ---\n0 | 0,0,0,0,1,0; 23,0,-80,0,1,0,i\n1 | 0,0,0,0,1,0; 23,200,-200,80,1,-30,d\n';
const OUTLINE = '- Launch\n  - Product\n    - Pricing\n  - Marketing\n    - Press\n    - Social\n  - Support\n';
const FAMILY = '- Rose Hale (born 1926)\n  - Tom Hale (born 1950)\n    - Ivy Hale (born 1980)\n  - May Hale (born 1953)\n';

interface Canvas {
  name: string;
  hash: string;
  editor: string;
  frame: string;
  picture: string;
  /** The editor's zoom as it is drawn now (the Diagram Maker's 0 is "fits": measured). */
  zoom: (el: HTMLElement & { zoom: number }) => number;
  /** The step the zoom is rounded to when the fingers lift. */
  step: number;
}
const own = (el: { zoom: number }) => el.zoom;
const CANVASES: Canvas[] = [
  { name: 'the Drawing Tool', hash: `#/v1/draw/${encodeDoc(DRAWING)}`, editor: 'to-draw-editor', frame: '.draw-wrap', picture: 'svg.draw-canvas', zoom: own, step: 0.25 },
  { name: 'the Diagram Maker', hash: `#/v1/diagram/${encodeDoc('---\nkind: org\n---\n- Ada Diaz | Chief executive\n  - Ben Okoro | Engineering\n  - Eve Marsh | Design\n')}`, editor: 'to-diagram-editor', frame: '.dg-wrap', picture: 'svg.dg-pic', zoom: (el) => el.zoom, step: 0.25 },
  { name: 'the Animator', hash: `#/v1/anim/${encodeDoc(LIFT)}`, editor: 'to-anim-editor', frame: '.anim-wrap', picture: 'svg.anim-stage', zoom: own, step: 0.25 },
  { name: 'the Outliner drawn as a mind map', hash: `#/v1/diagram/${encodeDoc(outlineToMind(readOutline(parse(OUTLINE))))}`, editor: 'to-diagram-editor', frame: '.dg-wrap', picture: 'svg.dg-pic', zoom: (el) => el.zoom, step: 0.25 },
  { name: 'the Outliner drawn as a family tree', hash: `#/v1/diagram/${encodeDoc(outlineToFamily(readOutline(parse(FAMILY))))}`, editor: 'to-diagram-editor', frame: '.dg-wrap', picture: 'svg.dg-pic', zoom: (el) => el.zoom, step: 0.25 },
];

type Pt = [number, number];
/** Two touch pointers put down at a and b (on what is there), moved to a2 and b2 in steps, and lifted unless `hold`. */
async function pinch(a: Pt, b: Pt, a2: Pt, b2: Pt, hold = false) {
  const fire = (type: string, id: number, [x, y]: Pt) => {
    const target = document.elementFromPoint(x, y) ?? document.body;
    target.dispatchEvent(new PointerEvent(type, { pointerId: id, pointerType: 'touch', isPrimary: id === 31, clientX: x, clientY: y, button: 0, buttons: type === 'pointerup' ? 0 : 1, bubbles: true, cancelable: true, composed: true }));
  };
  fire('pointerdown', 31, a);
  fire('pointerdown', 32, b);
  const steps = 6;
  for (let i = 1; i <= steps; i++) {
    const f = (p: Pt, q: Pt): Pt => [p[0] + ((q[0] - p[0]) * i) / steps, p[1] + ((q[1] - p[1]) * i) / steps];
    fire('pointermove', 31, f(a, a2));
    fire('pointermove', 32, f(b, b2));
    await new Promise(requestAnimationFrame);
    await tick();
  }
  const lift = async () => {
    fire('pointerup', 31, a2);
    fire('pointerup', 32, b2);
    await tick(50);
  };
  if (!hold) await lift();
  return lift;
}

async function open(c: Canvas): Promise<{ shell: ToShell; el: HTMLElement & { zoom: number }; frame: HTMLElement; picture: () => Element }> {
  const shell = await mount(c.hash);
  await until(() => !!shell.querySelector(`${c.editor} ${c.frame} ${c.picture}`) && !!shell.querySelector('.to-editor to-bar button'));
  await tick(100);
  const el = shell.querySelector(c.editor) as HTMLElement & { zoom: number };
  return { shell, el, frame: el.querySelector<HTMLElement>(c.frame)!, picture: () => el.querySelector(c.picture)! };
}

/** The middle of what shows of the picture in its frame. */
function middle(frame: HTMLElement, picture: Element): Pt {
  const f = frame.getBoundingClientRect();
  const p = picture.getBoundingClientRect();
  const left = Math.max(f.left, p.left);
  const right = Math.min(f.right, p.right);
  const top = Math.max(f.top, p.top, 0);
  const bottom = Math.min(f.bottom, p.bottom, innerHeight);
  return [(left + right) / 2, (top + bottom) / 2];
}

/** Where a point of the picture (a fraction of its box) is now, from where it should be. */
function drift(picture: Element, at: Pt, x: number, y: number): Pt {
  const r = picture.getBoundingClientRect();
  return [Math.abs(r.left + at[0] * r.width - x), Math.abs(r.top + at[1] * r.height - y)];
}
const fraction = (picture: Element, x: number, y: number): Pt => {
  const r = picture.getBoundingClientRect();
  return [(x - r.left) / r.width, (y - r.top) / r.height];
};

for (const c of CANVASES) {
  test(`two fingers spreading over ${c.name} zoom it about them and leave the size alone; together they pan it`, async () => {
    await page.viewport(390, 844);
    const { el, frame, picture } = await open(c);
    expect(frame.hasAttribute('data-spatial')).toBe(true);
    const z0 = c.zoom(el);
    const w0 = picture().getBoundingClientRect().width;
    // Fitted to the frame's width: 60px apart to 120px about the middle, held, is twice the picture, the point under
    // the fingers kept under them across (the picture is no taller than its frame yet, so down it stays at the top).
    let [mx, my] = middle(frame, picture());
    let at = fraction(picture(), mx, my);
    let lift = await pinch([mx - 30, my], [mx + 30, my], [mx - 60, my], [mx + 60, my], true);
    expect(size()).toBe(1);
    expect(picture().getBoundingClientRect().width / w0).toBeGreaterThan(1.6);
    expect(drift(picture(), at, mx, my)[0], 'the point under the fingers stays under them, across').toBeLessThan(4);
    await lift();
    expect(size()).toBe(1);
    const z1 = c.zoom(el);
    expect(z1).not.toBe(z0);
    expect(Math.abs(z1 / c.step - Math.round(z1 / c.step)), 'lifted, the zoom is on its step').toBeLessThan(1e-9);
    // Larger than its frame both ways, from the middle of the frame: the point is kept across and down.
    el.zoom = z1 * Math.max(1, (1.3 * frame.clientHeight) / picture().getBoundingClientRect().height);
    await (el as unknown as { updateComplete: Promise<unknown> }).updateComplete;
    frame.scrollLeft = (frame.scrollWidth - frame.clientWidth) / 2;
    frame.scrollTop = (frame.scrollHeight - frame.clientHeight) / 2;
    await tick(50);
    const f = frame.getBoundingClientRect();
    [mx, my] = [f.left + f.width / 2, f.top + f.height / 2];
    at = fraction(picture(), mx, my);
    const h1 = picture().getBoundingClientRect().height;
    lift = await pinch([mx - 40, my - 20], [mx + 40, my + 20], [mx - 56, my - 28], [mx + 56, my + 28], true);
    expect(picture().getBoundingClientRect().height / h1).toBeGreaterThan(1.1);
    const [dx, dy] = drift(picture(), at, mx, my);
    expect(dx, 'across').toBeLessThan(4);
    expect(dy, 'down').toBeLessThan(4);
    await lift();
    const z = c.zoom(el);
    expect(Math.abs(z / c.step - Math.round(z / c.step))).toBeLessThan(1e-9);
    // Two fingers moving together, the same way: the frame scrolls with them, and the zoom stays.
    await tick(50);
    const [sx, sy] = [frame.scrollLeft, frame.scrollTop];
    await pinch([mx - 30, my], [mx + 30, my], [mx - 70, my - 20], [mx - 10, my - 20]);
    expect(frame.scrollLeft - sx, 'panned across').toBeGreaterThan(30);
    expect(frame.scrollTop - sy, 'panned down').toBeGreaterThan(12);
    expect(c.zoom(el)).toBe(z);
    expect(size()).toBe(1);
  });
}

test('the same gesture on the bar beside a canvas is the size of everything, and leaves the zoom alone', async () => {
  await page.viewport(390, 844);
  for (const c of CANVASES.slice(0, 3)) {
    stepSize(0);
    const { shell, el } = await open(c);
    const z0 = c.zoom(el);
    const bar = shell.querySelector<HTMLElement>('.to-editor to-bar')!.getBoundingClientRect();
    const y = bar.top + bar.height / 2;
    await pinch([150, y], [240, y], [120, y], [270, y]);
    expect(size(), c.name).toBeGreaterThan(1.3);
    expect(c.zoom(el), c.name).toBe(z0);
  }
});

test('a pinch on the Trip Planner’s map is Leaflet’s, not the size of everything', async () => {
  await page.viewport(390, 844);
  const shell = await mount(`#/v1/trip/${encodeDoc('Place | Lat:number | Lon:number | Note\n--- | --- | --- | ---\nLisbon | 38.7223 | -9.1393 |\nPorto | 41.1579 | -8.6291 |\n')}`);
  await until(() => !!shell.querySelector('.trip-map'));
  await tick(100);
  const map = shell.querySelector<HTMLElement>('.trip-map')!;
  expect(map.hasAttribute('data-spatial')).toBe(true);
  const r = map.getBoundingClientRect();
  const y = r.top + r.height / 2;
  await pinch([150, y], [240, y], [100, y], [290, y]);
  expect(size()).toBe(1);
});

test('at 200% on a 390px screen the bars round the canvases are the nav’s, one row, and the pictures are as they were', async () => {
  await page.viewport(390, 844);
  const before: number[] = [];
  for (const c of CANVASES.slice(0, 3)) {
    stepSize(0);
    const { el, frame, picture } = await open(c);
    before.push(c.zoom(el) || picture().getBoundingClientRect().width / frame.clientWidth);
  }
  keepSize(SIZE_MAX);
  for (const [n, c] of CANVASES.slice(0, 3).entries()) {
    const { shell, el, frame, picture } = await open(c);
    expect(document.documentElement.scrollWidth, `${c.name}: no sideways scroll`).toBeLessThanOrEqual(innerWidth);
    const bar = shell.querySelector<HTMLElement>('.to-editor to-bar')!;
    const kids = [...bar.children].filter((x) => (x as HTMLElement).offsetWidth > 0);
    expect(new Set(kids.map((x) => Math.round(x.getBoundingClientRect().top))).size, `${c.name}: the bar is one row`).toBe(1);
    expect(parseFloat(getComputedStyle(bar).fontSize), `${c.name}: the bar at the nav's limit`).toBeCloseTo(16 * BASE * NAV_MAX, 3);
    const b = bar.getBoundingClientRect();
    expect(b.left).toBeGreaterThanOrEqual(-0.5);
    expect(b.right).toBeLessThanOrEqual(innerWidth + 0.5);
    expect(b.bottom).toBeLessThanOrEqual(innerHeight + 0.5);
    // The canvas is the same picture at the same zoom: nothing in it reflowed.
    expect(c.zoom(el) || picture().getBoundingClientRect().width / frame.clientWidth, c.name).toBeCloseTo(before[n], 5);
    expect(frame.getBoundingClientRect().right).toBeLessThanOrEqual(innerWidth + 0.5);
    if (c.editor === 'to-anim-editor') {
      for (const nav of shell.querySelectorAll<HTMLElement>('.anim-props, .anim-time')) {
        expect(parseFloat(getComputedStyle(nav).fontSize), `${c.name}: the sliders at the nav's limit`).toBeCloseTo(16 * BASE * NAV_MAX, 3);
        expect(nav.getBoundingClientRect().right).toBeLessThanOrEqual(innerWidth + 0.5);
      }
    }
  }
});
