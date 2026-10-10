// A pinch on a touch screen is the size of everything (kit/pinch.ts, kit/zoom.ts): two fingers spreading over the Word
// Processor change the size live with a pill showing it, lifting keeps it to the nearest 5%, the nav stops at 120%
// while the words go on to 200%, a pinch begun on a spatial canvas changes nothing, the paragraph under the fingers
// stays in view, and at 200% on a 390px screen the home page, Write, Outline and Board all fit. Every size is drawn at
// BASE (1.3) times itself: the root's zoom, and any zoomOf, is BASE × the size.
import { test, expect, afterEach } from 'vitest';
import { page } from 'vitest/browser';
import { mount, tick, until } from './helpers.ts';
import { encodeDoc } from '../../src/kit/codec.ts';
import { BASE, NAV_MAX, SIZE_MAX, size, stepSize, keepSize, zoomOf } from '../../src/kit/zoom.ts';
import type { ToShell } from '../../src/kit/shell.ts';
import type { ToDialog } from '../../src/kit/dialog.ts';
import type { ToContext } from '../../src/kit/context.ts';
import type { ToLinkPop } from '../../src/kit/link-pop.ts';
import type { ToComplete } from '../../src/kit/complete.ts';
import '../../src/kit/context.ts';
import '../../src/kit/link-pop.ts';
import '../../src/kit/complete.ts';

afterEach(async () => {
  stepSize(0);
  history.replaceState(null, '', location.pathname);
  await page.viewport(1100, 800);
});

const PARAS = Array.from({ length: 24 }, (_, i) => `Paragraph ${i + 1}: the ferry leaves the quay at nine and the café closes at five, so the walk is a long one.`).join('\n\n');
const WRITE = `#/v1/write/${encodeDoc(`# The quay\n\n${PARAS}\n`)}`;

/** Two touch pointers put down at a and b, moved to a2 and b2 in steps, and lifted unless `hold`. */
async function pinch(at: Element, a: [number, number], b: [number, number], a2: [number, number], b2: [number, number], hold = false) {
  const fire = (type: string, id: number, [x, y]: [number, number]) => {
    const target = type === 'pointerdown' ? at : (document.elementFromPoint(x, y) ?? document.body);
    target.dispatchEvent(new PointerEvent(type, { pointerId: id, pointerType: 'touch', isPrimary: id === 11, clientX: x, clientY: y, bubbles: true, cancelable: true, composed: true }));
  };
  fire('pointerdown', 11, a);
  fire('pointerdown', 12, b);
  const steps = 6;
  for (let i = 1; i <= steps; i++) {
    const f = (p: [number, number], q: [number, number]): [number, number] => [p[0] + ((q[0] - p[0]) * i) / steps, p[1] + ((q[1] - p[1]) * i) / steps];
    fire('pointermove', 11, f(a, a2));
    fire('pointermove', 12, f(b, b2));
    await new Promise(requestAnimationFrame);
  }
  if (hold) return () => (fire('pointerup', 11, a2), fire('pointerup', 12, b2));
  fire('pointerup', 11, a2);
  fire('pointerup', 12, b2);
  return () => {};
}

async function write(): Promise<ToShell> {
  window.scrollTo(0, 0);
  const shell = await mount(WRITE);
  await until(() => !!shell.querySelector('to-write-editor .tx p') && !!shell.querySelector('.to-editor to-bar button'));
  await tick(50);
  return shell;
}
const pill = () => document.querySelector<HTMLElement>('.to-pinch-pill');

test('two fingers spreading over the Word Processor change the size live, a pill says it, and lifting keeps it to the nearest 5%', async () => {
  await page.viewport(390, 844);
  const shell = await write();
  const p = shell.querySelector<HTMLElement>('to-write-editor .tx p')!;
  const r = p.getBoundingClientRect();
  const y = r.top + 10;
  const lift = await pinch(p, [150, y], [240, y], [130, y], [260, y], true);
  // 90px apart to 130px: the size follows, about 1.44, not yet kept.
  expect(size()).toBeGreaterThan(1.3);
  expect(size()).toBeLessThan(1.6);
  expect(Number(document.documentElement.style.zoom)).toBeCloseTo(BASE * size(), 3);
  expect(pill()?.matches(':popover-open, .shown')).toBe(true);
  expect(pill()!.textContent).toBe(`${Math.round(size() * 100)}%`);
  const live = size();
  lift();
  await tick();
  expect(size()).toBe(Math.round(live * 20) / 20);
  expect(localStorage.length >= 0).toBe(true);
  await tick(700);
  expect(pill()?.matches('.shown')).toBe(false);
  // The stepper moves in tens from there.
  const was = size();
  expect(stepSize(1)).toBeCloseTo(Math.floor(was * 10 + 1e-6) / 10 + 0.1, 5);
  expect(stepSize(-1)).toBeCloseTo(Math.floor(was * 10 + 1e-6) / 10, 5);
  // Pinching in brings it back down, never below the least.
  await pinch(p, [100, y], [300, y], [190, y], [210, y]);
  expect(size()).toBe(0.7);
});

test('at 200% the bar and the burger are the size they are at 120%, while the words are twice their normal size', async () => {
  await page.viewport(390, 844);
  let shell = await write();
  const font = () => parseFloat(getComputedStyle(shell.querySelector('to-write-editor .tx p')!).fontSize) * zoomOf(shell.querySelector('to-write-editor .tx p')!);
  const normal = font();
  keepSize(NAV_MAX);
  shell = await write();
  const bar15 = shell.querySelector('.to-editor to-bar')!.getBoundingClientRect().height;
  const burger15 = shell.querySelector('.to-burger')!.getBoundingClientRect();
  keepSize(SIZE_MAX);
  shell = await write();
  expect(size()).toBe(2);
  expect(shell.querySelector('.to-editor to-bar')!.getBoundingClientRect().height).toBeCloseTo(bar15, 0);
  const burger = shell.querySelector('.to-burger')!.getBoundingClientRect();
  expect(burger.width).toBeCloseTo(burger15.width, 0);
  expect(burger.left).toBeCloseTo(burger15.left, 0);
  expect(burger.top).toBeCloseTo(burger15.top, 0);
  expect(font()).toBeCloseTo(normal * 2, 0);
  expect(zoomOf(shell.querySelector('.to-burger')!)).toBeCloseTo(BASE * NAV_MAX, 5);
});

test('the same gesture begun inside a spatial element changes nothing', async () => {
  await page.viewport(390, 844);
  const shell = await write();
  const canvas = document.createElement('div');
  canvas.dataset.spatial = '';
  canvas.style.cssText = 'position:fixed;inset:200px 0 200px 0;background:#eee;z-index:9';
  const inner = document.createElement('span');
  inner.textContent = 'a canvas';
  canvas.append(inner);
  shell.append(canvas);
  await pinch(inner, [150, 400], [240, 400], [60, 400], [330, 400]);
  expect(size()).toBe(1);
  expect(document.documentElement.style.zoom).toBe(String(BASE));
  expect(pill()?.matches('.shown') ?? false).toBe(false);
  canvas.remove();
});

test('a pinch keeps the paragraph under the fingers in view', async () => {
  await page.viewport(390, 844);
  const shell = await write();
  const p = [...shell.querySelectorAll<HTMLElement>('to-write-editor .tx p')][9];
  p.scrollIntoView({ block: 'center' });
  await tick(50);
  const r = p.getBoundingClientRect();
  const y = r.top + r.height / 2;
  await pinch(p, [160, y], [230, y], [80, y], [310, y]);
  expect(size()).toBeGreaterThan(1.9);
  const after = p.getBoundingClientRect();
  expect(after.top).toBeLessThan(innerHeight);
  expect(after.bottom).toBeGreaterThan(0);
  // About where it was: the point under the fingers is still in the paragraph.
  expect(after.top).toBeLessThanOrEqual(y + 1);
  expect(after.bottom).toBeGreaterThanOrEqual(y - 1);
});

/** One row of nav, at `nav` (the size it is said at), and nothing wider than the screen. */
function fits(shell: ToShell, where: string, nav = NAV_MAX) {
  expect(document.documentElement.scrollWidth, `${where}: no sideways scroll`).toBeLessThanOrEqual(innerWidth);
  const bar = shell.querySelector<HTMLElement>('.to-editor to-bar');
  if (bar) {
    const kids = [...bar.children].filter((x) => (x as HTMLElement).offsetWidth > 0);
    expect(new Set(kids.map((x) => Math.round(x.getBoundingClientRect().top))).size, `${where}: the bar is one row`).toBe(1);
    expect(zoomOf(bar), `${where}: the bar is at ${nav * 100}%`).toBeCloseTo(BASE * nav, 5);
    for (const b of bar.querySelectorAll<HTMLElement>('.to-btn > span')) {
      if (!b.getClientRects().length || !b.textContent!.trim()) continue;
      expect(b.getBoundingClientRect().height, `${where}: "${b.textContent}" on one line`).toBeLessThan(parseFloat(getComputedStyle(b).fontSize) * zoomOf(b) * 2);
    }
  }
  const burger = shell.querySelector<HTMLElement>('.to-burger')!.getBoundingClientRect();
  expect(burger.left, `${where}: the burger at the left`).toBeLessThan(40);
  expect(burger.top, `${where}: the burger at the top`).toBeLessThan(60);
  expect(burger.width).toBeLessThan(80);
}

/** At the size kept now on a 390px screen (the nav at `nav`): the home page, the drawer, Write and its dialogs, Outline and Board all fit. */
async function allFit(nav: number) {
  // The home page and the drawer.
  const home = await mount('');
  await tick(100);
  fits(home, 'home', nav);
  home.querySelector<HTMLButtonElement>('.to-burger')!.click();
  const drawer = home.querySelector<HTMLDialogElement>('dialog.to-drawer')!;
  await until(() => drawer.open && !!drawer.querySelector('.to-drawer-prefs'));
  await tick(300);
  expect(zoomOf(drawer)).toBeCloseTo(BASE * nav, 5);
  const edge = drawer.getBoundingClientRect();
  expect(edge.right).toBeLessThanOrEqual(innerWidth + 0.5);
  for (const el of drawer.querySelectorAll<HTMLElement>('a, button, label, b, small, h2, h3, p')) {
    if (!el.getClientRects().length || el.closest('details:not([open])') || !el.textContent!.trim()) continue;
    const r = el.getBoundingClientRect();
    expect(r.right, `drawer: "${el.textContent!.trim().slice(0, 30)}" fits`).toBeLessThanOrEqual(edge.right + 0.5);
  }
  // The size row is there and its steps reachable.
  const more = drawer.querySelector<HTMLElement>('.to-size-more')!.getBoundingClientRect();
  expect(more.right).toBeLessThanOrEqual(edge.right + 0.5);
  expect(drawer.querySelector('.to-size-now')!.textContent).toBe(`${Math.round(size() * 100)}%`);
  drawer.close();
  // The templates list of an app's row fits the screen.
  home.querySelector<HTMLButtonElement>('.to-templates-btn')!.click();
  const list = home.querySelector<HTMLElement>('.to-listbox')!;
  await until(() => list.matches(':popover-open'));
  await tick(100);
  const lr = list.getBoundingClientRect();
  expect(lr.left).toBeGreaterThanOrEqual(-0.5);
  expect(lr.right).toBeLessThanOrEqual(innerWidth + 0.5);
  expect(lr.bottom).toBeLessThanOrEqual(innerHeight + 0.5);
  list.hidePopover();
  // Write: the words reflow to the width, the Share dialog fits with its buttons reachable.
  const shell = await write();
  fits(shell, 'write', nav);
  const p = shell.querySelector<HTMLElement>('to-write-editor .tx p')!;
  expect(p.getBoundingClientRect().right).toBeLessThanOrEqual(innerWidth);
  // The bar reaches across the screen, and once the header has gone it stands clear of the burger, the strip behind it its height.
  const bar = shell.querySelector<HTMLElement>('.to-editor to-bar')!;
  expect(bar.getBoundingClientRect().left).toBeCloseTo(0, 0);
  expect(bar.getBoundingClientRect().right).toBeCloseTo(innerWidth, 0);
  // A menu in the bar opens right under its button, inside the screen.
  const menu = bar.querySelector<HTMLElement>('to-menu')!;
  const opener = menu.querySelector<HTMLButtonElement>(':scope > button')!;
  opener.click();
  const pop = menu.querySelector<HTMLElement>('.to-menu')!;
  await until(() => pop.matches(':popover-open'));
  await tick(50);
  const o = opener.getBoundingClientRect();
  const m = pop.getBoundingClientRect();
  expect(Math.abs(m.top - (o.bottom + 4 * zoomOf(pop)))).toBeLessThan(8);
  expect(m.left).toBeGreaterThanOrEqual(0);
  expect(m.right).toBeLessThanOrEqual(innerWidth + 0.5);
  pop.hidePopover();
  window.scrollTo(0, 400);
  await until(() => shell.hasAttribute('scrolled'));
  await tick(300);
  const burger = shell.querySelector('.to-burger')!.getBoundingClientRect();
  expect(Math.round(bar.getBoundingClientRect().top)).toBe(0);
  expect(bar.getBoundingClientRect().left).toBeGreaterThanOrEqual(burger.right - 0.5);
  expect(burger.bottom).toBeLessThanOrEqual(bar.getBoundingClientRect().bottom + 0.5);
  expect(parseFloat(getComputedStyle(shell, '::before').height) * zoomOf(shell)).toBeCloseTo(bar.getBoundingClientRect().height, 0);
  window.scrollTo(0, 0);
  shell.querySelector<HTMLButtonElement>('.to-header .to-share')!.click();
  const share = shell.querySelector<ToDialog>('to-dialog.to-share-dialog')!;
  await until(() => share.dialog.open && !!share.querySelector('.to-share-links'));
  await tick(100);
  const box = share.dialog.getBoundingClientRect();
  expect(box.left).toBeGreaterThanOrEqual(-0.5);
  expect(box.right).toBeLessThanOrEqual(innerWidth + 0.5);
  for (const b of share.querySelectorAll<HTMLElement>('.to-share-links .to-btn')) {
    const r = b.getBoundingClientRect();
    if (r.width) expect(r.right, `share: "${b.textContent!.trim()}" reachable`).toBeLessThanOrEqual(box.right + 0.5);
  }
  share.close();
  // Outline: the rows reflow.
  const outline = await mount(`#/v1/outline/${encodeDoc('- One long line about the harbour and the ferry that leaves at nine\n  - Two, under it, also long enough to wrap\n- Three\n')}`);
  await until(() => !!outline.querySelector('.to-editor to-bar button'));
  await tick(100);
  fits(outline, 'outline', nav);
  for (const row of outline.querySelectorAll<HTMLElement>('to-text')) expect(row.getBoundingClientRect().right, 'outline: a row reflows').toBeLessThanOrEqual(innerWidth + 0.5);
  // Board: a column is still a column.
  const board = await mount(`#/v1/board/${encodeDoc('## To do\n\n- Post the letter\n- Buy coffee\n\n## Done\n\n- Walk the dog\n')}`);
  await until(() => !!board.querySelector('.to-editor to-bar button'));
  await tick(100);
  fits(board, 'board', nav);
  const col = board.querySelector<HTMLElement>('.board-col')!.getBoundingClientRect();
  expect(col.width, 'board: a column is a column, within the screen').toBeLessThanOrEqual(innerWidth);
  expect(col.height).toBeGreaterThan(col.width / 2);
}

test('at the normal size, nothing stored, on a 390px screen: the home page, the drawer, Write and its dialogs, Outline and Board all fit', async () => {
  await page.viewport(390, 844);
  stepSize(0);
  expect(size()).toBe(1);
  await allFit(1);
});

test('at 200% on a 390px screen: the home page, the drawer, Write and its dialogs, Outline and Board all fit', async () => {
  await page.viewport(390, 844);
  keepSize(SIZE_MAX);
  await allFit(NAV_MAX);
});

test('at the normal size on a 1440×900 desktop (1108 wide to the layout): the home page keeps its column, the paper its measure, and the rail stands beside the slide', async () => {
  await page.viewport(1440, 900);
  stepSize(0);
  const css = (px: number) => px / BASE;
  const home = await mount('');
  await tick(100);
  expect(document.documentElement.scrollWidth).toBeLessThanOrEqual(innerWidth);
  const main = home.querySelector<HTMLElement>('.to-main')!.getBoundingClientRect();
  expect(css(main.width)).toBeLessThanOrEqual(1080 + 0.5);
  const column = home.querySelector<HTMLElement>('.to-home')!.getBoundingClientRect();
  for (const r of home.querySelectorAll<HTMLElement>('.to-app')) expect(Math.round(r.getBoundingClientRect().width)).toBe(Math.round(column.width));
  // The Word Processor: the paper the window's width, its words a letter page's measure, in the middle.
  const write = await mount(WRITE);
  await until(() => !!write.querySelector('.write-page .write-text'));
  await tick(50);
  expect(document.documentElement.scrollWidth).toBeLessThanOrEqual(innerWidth);
  const words = write.querySelector<HTMLElement>('.write-page .write-text')!.getBoundingClientRect();
  expect(css(words.width)).toBeLessThanOrEqual(624.5);
  expect(css(words.width)).toBeGreaterThan(600);
  expect(Math.abs(words.left + words.width / 2 - innerWidth / 2)).toBeLessThanOrEqual(2);
  // The Presentation Builder: the rail at the right, level with the slide, beside it and inside the window.
  const deck = await mount(`#/v1/deck/${encodeDoc('## One\n\n- a point\n\n---\n\n## Two\n')}`);
  await until(() => !!deck.querySelector('.deck-rail') && !!deck.querySelector('.deck-canvas'));
  await tick(100);
  expect(document.documentElement.scrollWidth).toBeLessThanOrEqual(innerWidth);
  const canvas = deck.querySelector<HTMLElement>('.deck-canvas')!.getBoundingClientRect();
  const rail = deck.querySelector<HTMLElement>('.deck-rail')!.getBoundingClientRect();
  expect(rail.left).toBeGreaterThanOrEqual(canvas.right);
  expect(Math.abs(rail.top - canvas.top)).toBeLessThanOrEqual(1);
  expect(rail.right).toBeLessThanOrEqual(innerWidth + 0.5);
  expect(canvas.width).toBeGreaterThan(rail.width * 2);
});

test('at 200% the context bar, the link box, the completion list and the find bar land where they belong', async () => {
  await page.viewport(390, 844);
  keepSize(SIZE_MAX);
  document.body.innerHTML = '<div id="words" tabindex="0" style="position:absolute;top:60px;left:30px;width:40px;height:16px;background:#ccc"></div>';
  const words = document.getElementById('words')!;
  const a = words.getBoundingClientRect();
  // The context bar: centred under the words, inside the screen.
  const ctx = document.createElement('to-context') as ToContext;
  ctx.items = [{ label: 'Bold', text: 'B', does: () => {} }];
  document.body.append(ctx);
  await ctx.updateComplete;
  ctx.show(words);
  await until(() => ctx.isOpen);
  await tick(50);
  const c = ctx.querySelector('.to-context')!.getBoundingClientRect();
  expect(c.top).toBeGreaterThanOrEqual(a.bottom);
  expect(c.top - a.bottom).toBeLessThan(20);
  expect(Math.abs(c.left + c.width / 2 - (a.left + a.width / 2))).toBeLessThan(3);
  ctx.hide();
  // The link box: under the link, at its left.
  const link = document.createElement('to-link-pop') as ToLinkPop;
  document.body.append(link);
  link.show(a, 'https://example.com');
  await until(() => !!link.querySelector('.to-link-pop:popover-open'));
  await tick(50);
  const l = link.querySelector('.to-link-pop')!.getBoundingClientRect();
  expect(Math.abs(l.top - (a.bottom + 6))).toBeLessThan(3);
  expect(Math.abs(l.left - Math.min(a.left, innerWidth - l.width - 4))).toBeLessThan(3);
  expect(l.right).toBeLessThanOrEqual(innerWidth + 0.5);
  link.hide();
  // The completion list: under the words.
  const list = document.createElement('to-complete') as ToComplete;
  document.body.append(list);
  await list.show(a, [{ kind: 'emoji', value: '☕', name: 'coffee' }]);
  await tick(50);
  const k = list.querySelector('.to-complete')!.getBoundingClientRect();
  expect(Math.abs(k.top - (a.bottom + 4))).toBeLessThan(3);
  expect(Math.abs(k.left - Math.min(a.left, innerWidth - k.width - 4))).toBeLessThan(3);
  list.hide();
  // The find bar: just under the app's bar.
  const shell = await write();
  window.dispatchEvent(new KeyboardEvent('keydown', { key: 'f', ctrlKey: true, bubbles: true, cancelable: true }));
  const find = document.querySelector<HTMLElement>('to-find')!;
  await until(() => !!find.querySelector('.to-find'));
  await tick(50);
  const below = shell.querySelector('.to-editor to-bar')!.getBoundingClientRect().bottom;
  expect(Math.abs(find.getBoundingClientRect().top - (below + 4))).toBeLessThan(3);
});

/** Touches can be made here (Chromium; desktop WebKit has no Touch constructor). */
const touchable = (() => {
  try {
    return !!new Touch({ identifier: 0, target: document.body });
  } catch {
    return false;
  }
})();

test.runIf(touchable)('fingers the browser takes to pan go on being read from the touches, from the same spread', async () => {
  await page.viewport(390, 844);
  const shell = await write();
  const p = shell.querySelector<HTMLElement>('to-write-editor .tx p')!;
  const y = p.getBoundingClientRect().top + 10;
  const ptr = (type: string, id: number, x: number) => p.dispatchEvent(new PointerEvent(type, { pointerId: id, pointerType: 'touch', clientX: x, clientY: y, bubbles: true, cancelable: true }));
  ptr('pointerdown', 21, 150);
  ptr('pointerdown', 22, 250);
  ptr('pointermove', 22, 270);
  await new Promise(requestAnimationFrame);
  expect(size()).toBeCloseTo(1.2, 5);
  ptr('pointercancel', 21, 150);
  ptr('pointercancel', 22, 270);
  const touch = (id: number, x: number) => new Touch({ identifier: id, target: p, clientX: x, clientY: y });
  p.dispatchEvent(new TouchEvent('touchmove', { touches: [touch(1, 100), touch(2, 300)], bubbles: true }));
  await new Promise(requestAnimationFrame);
  expect(size()).toBeCloseTo(2, 5);
  p.dispatchEvent(new TouchEvent('touchend', { touches: [], bubbles: true }));
  await tick();
  expect(size()).toBe(2);
});

test("WebKit's gesture events stand in where two pointers never arrive", async () => {
  await page.viewport(390, 844);
  const shell = await write();
  const p = shell.querySelector<HTMLElement>('to-write-editor .tx p')!;
  const g = (type: string, scale: number) => {
    const e = Object.assign(new Event(type, { bubbles: true, cancelable: true }), { scale, clientX: 200, clientY: 300 });
    p.dispatchEvent(e);
    return e;
  };
  g('gesturestart', 1);
  expect(g('gesturechange', 1.5).defaultPrevented).toBe(true);
  await new Promise(requestAnimationFrame);
  expect(size()).toBeCloseTo(1.5, 5);
  g('gestureend', 1.52);
  await tick();
  expect(size()).toBe(1.5);
});
