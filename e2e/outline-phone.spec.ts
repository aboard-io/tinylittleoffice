/**
 * The Outline on a phone: whether typing, Enter and Tab scroll the page, how tall the bar is, and whether the
 * line menu opens inside the screen are real layout on a real phone engine (the phone project: WebKit, 390 by
 * 844, a finger for a pointer). Run on its own:
 *
 *   PW_PORT=4186 npx playwright test e2e/outline-phone.spec.ts --project=phone --workers=1
 */
import { test, expect } from '@playwright/test';
import { settled } from './settled.ts';
import { link } from './link.ts';

test('outline: on a phone, typing items neither scrolls the page nor moves the bar, which is one row; type is 16px; the line menu opens inside the screen', async ({ page }, info) => {
  test.skip(info.project.name !== 'phone', 'phone only');
  const errors: string[] = [];
  page.on('pageerror', (e) => errors.push(String(e)));
  await page.goto('/#/v1/outline');
  const row = (at: number) => page.locator(`.ol-row[data-at="${at}"] to-text .tx`);
  await expect(row(-1)).toBeVisible();
  const measure = () =>
    page.evaluate(() => {
      const bar = document.querySelector<HTMLElement>('to-outline-editor to-bar')!;
      const tops = new Set([...bar.children].filter((el) => (el as HTMLElement).offsetWidth > 0).map((el) => Math.round((el as HTMLElement).getBoundingClientRect().top)));
      return {
        bar: Math.round(bar.getBoundingClientRect().height / (parseFloat(getComputedStyle(document.documentElement).fontSize) / 16)),
        rows: tops.size,
        pageTop: document.scrollingElement!.scrollTop,
        zoom: window.visualViewport?.scale ?? 1,
        wide: document.documentElement.scrollWidth - document.documentElement.clientWidth,
      };
    });
  const first = await measure();
  await row(-1).tap();
  await page.keyboard.type('Launch');
  await expect.poll(() => link(page)).toMatch(/#\/v2\/outline\/[wv]/);
  const seen: { bar: number; rows: number; pageTop: number }[] = [await measure()];
  // Enter for the next item, Tab to put it under, words in each.
  // (The caret lands in the new row a frame later, as Safari wants; a finger is never that quick, so the test waits as one would.)
  await page.keyboard.press('Enter');
  await expect(row(1)).toBeFocused();
  await page.keyboard.type('Product');
  await page.keyboard.press('Tab');
  // (Tab draws the row again under its parent and the caret lands in it a frame later, as after Enter: waited for likewise.)
  const value = () => page.evaluate(() => (document.querySelector('to-outline-editor') as HTMLElement & { value: string }).value);
  await expect.poll(value).toBe('- Launch\n  - Product\n');
  await expect(row(1)).toBeFocused();
  seen.push(await measure());
  await page.keyboard.press('Enter');
  await expect(row(2)).toBeFocused();
  await page.keyboard.type('Pricing');
  await page.keyboard.press('Tab');
  await expect.poll(value).toBe('- Launch\n  - Product\n    - Pricing\n');
  await expect(row(2)).toBeFocused();
  seen.push(await measure());
  await page.keyboard.press('Enter');
  await expect(row(3)).toBeFocused();
  await page.keyboard.press('Shift+Tab');
  await page.keyboard.type('Marketing');
  seen.push(await measure());
  const doc = await value();
  expect(doc).toBe('- Launch\n  - Product\n    - Pricing\n  - Marketing\n');
  // Tapping another row, and the bar's Indent on it.
  await row(1).tap();
  await expect(page.locator('.ol-row[data-at="1"]')).toHaveClass(/\bsel\b/);
  await expect(page.getByRole('button', { name: 'Move down', exact: true })).toBeEnabled();
  seen.push(await measure());
  await page.getByRole('button', { name: 'Move down', exact: true }).tap();
  await expect(page.locator('.ol-row[data-at="1"] to-text .tx')).toHaveText('Marketing');
  seen.push(await measure());
  const last = await measure();
  test.info().annotations.push({ type: 'measured', description: JSON.stringify({ first, last, seen }) });
  // The page stays where it was; the bar is one row, as tall as it started, and never over 56px; nothing is wider than the screen.
  expect(seen.map((s) => s.pageTop)).toEqual(seen.map(() => 0));
  expect(last.pageTop).toBe(0);
  expect(new Set([first.bar, last.bar, ...seen.map((s) => s.bar)]).size).toBe(1);
  expect(first.bar).toBeLessThanOrEqual(56);
  expect([first.rows, last.rows, ...seen.map((s) => s.rows)]).toEqual([1, 1, ...seen.map(() => 1)]);
  expect(last.zoom).toBe(1);
  expect(last.wide).toBeLessThanOrEqual(0);
  // Every box a finger may land in is 16px or more, so Safari has no reason to zoom in.
  const small = await page.evaluate(() =>
    [...document.querySelectorAll<HTMLElement>('to-outline-editor .tx, to-outline-editor input')]
      .filter((el) => parseFloat(getComputedStyle(el).fontSize) < 16)
      .map((el) => `${el.getAttribute('aria-label') ?? el.className}: ${getComputedStyle(el).fontSize}`),
  );
  expect(small).toEqual([]);
  // A bullet's menu opens inside the screen and Escape closes it; the caret is back in the row's words (the bullet never takes the focus).
  const bullet = page.locator('.ol-row[data-at="2"] button.ol-kind');
  await bullet.tap();
  const menu = page.locator('.ol-line-menu [role=menu]');
  await expect(menu).toBeVisible();
  await expect(bullet).toHaveAttribute('aria-expanded', 'true');
  const box = (await menu.boundingBox())!;
  expect(box.x).toBeGreaterThanOrEqual(0);
  expect(box.x + box.width).toBeLessThanOrEqual(390);
  await page.keyboard.press('Escape');
  await expect(menu).toBeHidden();
  await expect(row(2)).toBeFocused();
  await expect(bullet).toHaveAttribute('aria-expanded', 'false');
  expect(await measure()).toMatchObject({ pageTop: 0, rows: 1 });
  expect(errors).toEqual([]);
});

test('outline: on a phone, a tap on a row’s handle chooses it whole; the bar under it is inside the screen and its Delete takes the row away', async ({ page }, info) => {
  test.skip(info.project.name !== 'phone', 'phone only');
  const errors: string[] = [];
  page.on('pageerror', (e) => errors.push(String(e)));
  const text = '- Launch\n  - Product\n  - Marketing\n';
  await page.goto('/#/v1/outline');
  await page.locator('to-outline-editor').evaluate((el, t) => ((el as HTMLElement & { value: string }).value = t), text);
  const handle = page.locator('.ol-row[data-at="1"] .ol-handle');
  await expect(handle).toBeVisible();
  await handle.tap();
  await expect(page.locator('.ol-row[data-at="1"]')).toHaveClass(/\branged\b/);
  const bar = page.locator('.ol-context .to-context');
  await expect(bar).toBeVisible();
  const box = (await bar.boundingBox())!;
  expect(box.x).toBeGreaterThanOrEqual(0);
  expect(box.x + box.width).toBeLessThanOrEqual(390);
  expect(box.y).toBeGreaterThanOrEqual(0);
  expect(box.y + box.height).toBeLessThanOrEqual(844);
  await bar.getByRole('button', { name: 'Delete', exact: true }).tap();
  await expect.poll(() => page.locator('to-outline-editor').evaluate((el) => (el as HTMLElement & { value: string }).value)).toBe('- Launch\n  - Marketing\n');
  await expect(bar).toBeHidden();
  expect(await page.evaluate(() => document.scrollingElement!.scrollTop)).toBe(0);
  expect(errors).toEqual([]);
});

test('outline: on a phone, a finger drags a row by its handle (pointer events, not a long press) onto another; the handle is 44px to the finger and alone stops the page panning', async ({
  page,
}, info) => {
  test.skip(info.project.name !== 'phone', 'phone only');
  const errors: string[] = [];
  page.on('pageerror', (e) => errors.push(String(e)));
  await page.goto('/#/v1/outline');
  await page.locator('to-outline-editor').evaluate((el, t) => ((el as HTMLElement & { value: string }).value = t), '- A\n- B\n- C\n');
  const handle = page.locator('.ol-row[data-at="0"] .ol-handle');
  await expect(handle).toBeVisible();
  // The hit area: 44px round the drawn handle, under a finger; touch-action none on the handle, manipulation on the rows.
  const hit = await handle.evaluate((h) => {
    const r = h.getBoundingClientRect();
    const before = getComputedStyle(h, '::before');
    const at = (x: number, y: number) => document.elementFromPoint(x, y)?.closest('.ol-handle') === h;
    return {
      coarse: matchMedia('(pointer: coarse)').matches,
      w: before.width,
      h: before.height,
      drawn: r.width,
      above: at(r.left + r.width / 2, r.top + r.height / 2 - 19),
      touch: getComputedStyle(h).touchAction,
      rows: getComputedStyle(document.querySelector('.ol')!).touchAction,
    };
  });
  // (44px at least: 2.75rem, drawn 57.2px at the size of 100%, kit/ui/zoom.ts BASE.)
  expect({ ...hit, w: parseFloat(hit.w) >= 44, h: parseFloat(hit.h) >= 44 }).toMatchObject({ coarse: true, w: true, h: true, touch: 'none', rows: 'manipulation' });
  expect(hit.drawn).toBeLessThan(44);
  expect(hit.above).toBe(true);
  // A finger's drag, as WebKit's pointer events carry it: down on A's handle, along to C's left half, up.
  await page.evaluate(() => {
    const h = document.querySelector<HTMLElement>('.ol-row[data-at="0"] .ol-handle')!;
    const c = document.querySelector<HTMLElement>('.ol-row[data-at="2"]')!.getBoundingClientRect();
    const r = h.getBoundingClientRect();
    const fire = (type: string, x: number, y: number) =>
      h.dispatchEvent(new PointerEvent(type, { bubbles: true, cancelable: true, pointerId: 11, isPrimary: true, button: 0, pointerType: 'touch', clientX: x, clientY: y }));
    fire('pointerdown', r.left + r.width / 2, r.top + r.height / 2);
    fire('pointermove', r.left + r.width / 2, r.top + r.height / 2 + 10);
    fire('pointermove', c.left + 60, c.top + c.height / 2);
  });
  await expect(page.locator('.to-rows-target')).toBeVisible();
  await expect(page.locator('.ol-row[data-at="0"]')).toHaveClass(/\bdragging\b/);
  await page.evaluate(() => {
    const h = document.querySelector<HTMLElement>('.ol-row[data-at="0"] .ol-handle')!;
    const c = document.querySelector<HTMLElement>('.ol-row[data-at="2"]')!.getBoundingClientRect();
    h.dispatchEvent(
      new PointerEvent('pointerup', { bubbles: true, cancelable: true, pointerId: 11, isPrimary: true, button: 0, pointerType: 'touch', clientX: c.left + 60, clientY: c.top + c.height / 2 }),
    );
  });
  await expect.poll(() => page.locator('to-outline-editor').evaluate((el) => (el as HTMLElement & { value: string }).value)).toBe('- B\n- C\n- A\n');
  await expect(page.locator('.to-rows-target')).toHaveCount(0);
  // A finger's tap on a handle chooses; a second tap on another extends (the bar is the bottom row on a phone,
  // kit/ui/context.ts docked: clear of the rows, inside the screen).
  await page.locator('.ol-row[data-at="1"] .ol-handle').tap();
  await expect(page.locator('.ol-row[data-at="1"]')).toHaveClass(/\branged\b/);
  const bar = (await page.locator('.ol-context .to-context').boundingBox())!;
  expect(bar.y).toBeGreaterThanOrEqual((await page.locator('.ol-row[data-at="2"]').boundingBox())!.y + (await page.locator('.ol-row[data-at="2"]').boundingBox())!.height);
  expect(bar.y + bar.height).toBeLessThanOrEqual(await page.evaluate(() => window.visualViewport!.height + 0.5));
  await page.locator('.ol-row[data-at="2"] .ol-handle').tap();
  await expect(page.locator('.ol-row.ranged')).toHaveCount(2);
  expect(await page.evaluate(() => document.scrollingElement!.scrollTop)).toBe(0);
  expect(errors).toEqual([]);
});

/**
 * A phone's keyboard, two ways (Paul, 2026-10-11: "I keep losing my cursor in Outline because it's below the
 * keyboard"). iOS: the layout viewport stays 844 tall and the visual one shrinks to 508 a moment after a box takes the
 * focus (`kbLate`), firing `resize`; and as Safari does, the window may then slide by up to the keyboard's height, which
 * it does to bring a caret it finds under the keyboard into sight, as the keyboard comes and after each input. Plain:
 * the window itself 390 by 508.
 */
const IOS = () => {
  const real = window.visualViewport!;
  let height: number | null = null;
  const vv = new EventTarget();
  for (const k of ['offsetTop', 'offsetLeft', 'pageTop', 'pageLeft', 'width', 'scale'] as const) Object.defineProperty(vv, k, { get: () => real[k] });
  Object.defineProperty(vv, 'height', { get: () => height ?? real.height });
  for (const type of ['resize', 'scroll']) real.addEventListener(type, () => vv.dispatchEvent(new Event(type)));
  Object.defineProperty(window, 'visualViewport', { configurable: true, value: vv });
  const w = window as unknown as { kbLate: number };
  w.kbLate = 60;
  const BOX = 'to-text, input, [contenteditable="true"]';
  const keyboard = (up: boolean) => {
    if ((height === 508) === up) return;
    height = up ? 508 : null;
    document.documentElement.style.height = up ? 'calc(100% + 336px)' : '';
    vv.dispatchEvent(new Event('resize'));
  };
  /** Safari's own reveal: a caret under the keyboard brought up by sliding the window. */
  const slide = () => {
    if (height === null || !document.activeElement?.closest(BOX)) return;
    const sel = document.getSelection();
    let r = sel?.rangeCount ? sel.getRangeAt(0).getBoundingClientRect() : null;
    if (!r || !r.height) r = document.activeElement.getBoundingClientRect();
    if (r.bottom > 508) window.scrollTo(0, window.scrollY + r.bottom - 508 + 24);
  };
  document.addEventListener('focusin', (e) => {
    if (!(e.target as Element).closest?.(BOX)) return;
    setTimeout(() => {
      if (!document.activeElement?.closest(BOX)) return;
      document.documentElement.style.height = 'calc(100% + 336px)';
      slide();
      keyboard(true);
    }, w.kbLate);
  });
  for (const type of ['beforeinput', 'keydown']) document.addEventListener(type, () => setTimeout(slide, 50), true);
  // The focus gone from every box: the keyboard down.
  document.addEventListener('focusout', () => setTimeout(() => !document.activeElement?.closest(BOX) && keyboard(false), 30));
};

for (const model of ['ios', 'plain'] as const) {
  test(`outline: on a phone with the keyboard up (${model}), the caret stays above the bar after every edit and focus move, and the window never scrolls`, async ({ page }, info) => {
    test.skip(info.project.name !== 'phone', 'phone only');
    test.setTimeout(90_000);
    const errors: string[] = [];
    page.on('pageerror', (e) => errors.push(String(e)));
    if (model === 'ios') await page.addInitScript(IOS);
    await page.goto('/#/v1/outline');
    const row = (at: number) => page.locator(`.ol-row[data-at="${at}"] to-text .tx`);
    await expect(row(-1)).toBeVisible();
    if (model === 'plain') await page.setViewportSize({ width: 390, height: 508 });
    await row(-1).tap();
    /** Where the caret is (its row's box where it has no rect of its own), what can be seen of the column above the bar, and the window's scroll. */
    const where = () =>
      page.evaluate(() => {
        const sel = document.getSelection()!;
        const n = sel.anchorNode;
        const el = n instanceof Element ? n : n?.parentElement;
        let r = sel.rangeCount ? sel.getRangeAt(0).getBoundingClientRect() : null;
        if (!r || !r.height) r = el?.closest('.ol-row')?.getBoundingClientRect() ?? null;
        const vv = window.visualViewport!;
        const bar = document.querySelector('to-outline-editor to-bar')!.getBoundingClientRect();
        const main = document.querySelector('.to-main')!.getBoundingClientRect();
        const bottom = Math.min(vv.offsetTop + vv.height, bar.top);
        const top = Math.max(vv.offsetTop, main.top);
        return {
          at: el?.closest<HTMLElement>('.ol-row')?.dataset.at ?? null,
          caret: r && [Math.round(r.top), Math.round(r.bottom)],
          room: [Math.round(top), Math.round(bottom)],
          scrollY: window.scrollY,
          vvTop: vv.offsetTop,
        };
      });
    /** Once the column has settled (a keyboard's glide, a frame for the caret): the caret inside the room, the window at its top. */
    const check = async (what: string) => {
      await page.waitForFunction(() => !document.querySelector('to-chrome[gliding]') && document.getAnimations().every((a) => a.playState !== 'running'));
      await settled(page);
      const w = await where();
      const inside = !!w.caret && w.caret[0] >= w.room[0] - 1 && w.caret[1] <= w.room[1] + 1;
      expect({ what, inside, scrollY: w.scrollY, vvTop: w.vvTop }, JSON.stringify(w)).toEqual({ what, inside: true, scrollY: 0, vvTop: 0 });
    };
    const value = () => page.evaluate(() => (document.querySelector('to-outline-editor') as HTMLElement & { value: string }).value);
    // Twenty-six rows, Enter after each, then on typing.
    for (let i = 0; i < 26; i++) {
      await page.keyboard.type(`Item ${String.fromCharCode(65 + i)}`);
      await page.keyboard.press('Enter');
      await expect(row(i + 1)).toBeFocused();
      await check(`enter ${i}`);
    }
    await page.keyboard.type('And on');
    await check('typing on');
    await expect.poll(async () => (await value()).split('\n').length).toBe(28);
    // Indent and outdent.
    await page.keyboard.press('Tab');
    await check('tab');
    await page.keyboard.press('Shift+Tab');
    await check('shift+tab');
    // A tap into a row near the bottom edge of what is seen, then Enter in the middle of its words.
    const near = await page.evaluate(() => {
      const bar = document.querySelector('to-outline-editor to-bar')!.getBoundingClientRect();
      const rows = [...document.querySelectorAll<HTMLElement>('.ol-row')].filter((r) => r.getBoundingClientRect().bottom <= Math.min(bar.top, window.visualViewport!.height));
      return Number(rows.at(-2)!.dataset.at);
    });
    await row(near).tap();
    await check('tap near the foot');
    await page.keyboard.press('ArrowLeft');
    await page.keyboard.press('ArrowLeft');
    await page.keyboard.press('Enter');
    await check('enter in the middle');
    await page.keyboard.press('Enter');
    await page.keyboard.press('Enter');
    await check('enter again');
    // The Backspace join: to the start of the row, then join it to the one before.
    await page.keyboard.press('Home');
    await page.keyboard.press('Backspace');
    await check('backspace');
    // A fold: the row before gets a child, the caret goes to it and folds it.
    await page.keyboard.press('End');
    await page.keyboard.press('Enter');
    await page.keyboard.type('Child');
    await page.keyboard.press('Tab');
    await page.keyboard.press('ArrowUp');
    await page.keyboard.press('Meta+Alt+ArrowUp');
    await check('fold');
    // The keyboard's resize late, after the caret moved: a row tapped near the top, typed in fast.
    await page.evaluate(() => ((window as unknown as { kbLate: number }).kbLate = 400));
    await page.evaluate(() => (document.activeElement as HTMLElement).blur());
    await page.waitForTimeout(100);
    const last = await page.evaluate(() =>
      Number([...document.querySelectorAll<HTMLElement>('.ol-row')].filter((r) => r.getBoundingClientRect().bottom <= window.visualViewport!.height - 60).at(-1)!.dataset.at),
    );
    await row(last).tap();
    await page.keyboard.press('Enter');
    await page.keyboard.type('Fast');
    await page.keyboard.press('Enter');
    await page.keyboard.type('Faster');
    await page.waitForTimeout(400);
    await check('late keyboard');
    expect(errors).toEqual([]);
  });
}
