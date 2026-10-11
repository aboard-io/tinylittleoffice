/**
 * The Deck on a phone: a slide typed on in WebKit at 390 by 844 with a finger for a pointer. The bar stays
 * one row and as tall as it started, the page never scrolls under a tap, every box is 16px, nothing is
 * wider than the screen, the rail runs under the slide, Insert ▾ opens inside the screen and makes a slide,
 * and the Look menu writes the theme. Run on its own:
 *
 *   PW_PORT=4187 npx playwright test e2e/deck-phone.spec.ts --project=phone --workers=1
 */
import { test, expect } from '@playwright/test';
import { encodeDoc } from '../src/kit/codec.ts';

const SHOTS = process.env.SHOTS;

test('deck: on a phone, typing a slide neither scrolls the page nor moves the bar; the rail is under the slide; the menus fit', async ({ page }, info) => {
  test.skip(info.project.name !== 'phone', 'phone only');
  const errors: string[] = [];
  page.on('pageerror', (e) => errors.push(String(e)));
  page.on('console', (m) => m.type() === 'error' && errors.push(m.text()));
  await page.goto('/#/v1/deck');
  const title = page.locator('to-deck-editor to-text.deck-title .tx');
  await expect(title).toBeVisible();
  const measure = () =>
    page.evaluate(() => {
      const bar = document.querySelector<HTMLElement>('to-deck-editor to-bar')!;
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
  await title.tap();
  await page.keyboard.type('Hello from the phone');
  await expect(page).toHaveURL(/#\/v1\/deck\/[ryz]/);
  const afterTitle = await measure();
  await page.keyboard.press('Enter');
  const words = page.locator('to-deck-editor to-text.deck-words .tx');
  await expect(words).toBeFocused();
  await page.keyboard.type('One thing');
  await page.keyboard.press('Enter');
  await page.keyboard.type('Another');
  await expect(words.locator('li')).toHaveCount(2);
  const afterWords = await measure();
  // The rail is under the slide, one row that scrolls sideways; the current slide is marked.
  const canvas = page.locator('.deck-canvas');
  const rail = page.locator('.deck-rail');
  const [c, r] = [await canvas.boundingBox(), await rail.boundingBox()];
  expect(r!.y).toBeGreaterThanOrEqual(c!.y + c!.height - 1);
  await expect(page.locator('.deck-thumb[aria-current="true"]')).toHaveAttribute('aria-label', 'Slide 1: Hello from the phone');
  // Insert ▾ opens inside the screen and makes a title slide; Escape would close it.
  await page.getByRole('button', { name: 'Insert' }).tap();
  const menu = page.locator('to-insert [role=menu]');
  await expect(menu).toBeVisible();
  const box = (await menu.boundingBox())!;
  expect(box.x).toBeGreaterThanOrEqual(0);
  expect(box.x + box.width).toBeLessThanOrEqual(390);
  await page.getByRole('menuitem', { name: 'Title slide' }).tap();
  await expect(page.locator('.deck-thumb')).toHaveCount(2);
  await expect(page.locator('.deck-thumb[aria-current="true"]')).toHaveAttribute('aria-label', 'Slide 2');
  // The Look menu writes the theme into the header; the canvas wears it.
  await page.getByRole('button', { name: /^Look:/ }).tap();
  await page.getByRole('menuitemcheckbox', { name: 'Midnight' }).tap();
  await expect(page.locator('.deck-canvas.themed.dark')).toBeVisible();
  const last = await measure();
  test.info().annotations.push({ type: 'measured', description: JSON.stringify({ first, afterTitle, afterWords, last }) });
  if (SHOTS) await page.screenshot({ path: `${SHOTS}/deck-390.png`, fullPage: false });
  // The page stays where it was; the bar is one row, as tall as it started, and never over 56px; nothing is wider than the screen.
  expect([first.pageTop, afterTitle.pageTop, afterWords.pageTop, last.pageTop]).toEqual([0, 0, 0, 0]);
  expect(new Set([first.bar, afterTitle.bar, afterWords.bar, last.bar]).size).toBe(1);
  expect(first.bar).toBeLessThanOrEqual(56);
  expect([first.rows, afterTitle.rows, afterWords.rows, last.rows]).toEqual([1, 1, 1, 1]);
  expect(last.zoom).toBe(1);
  expect(last.wide).toBeLessThanOrEqual(0);
  // Every box a finger may land in is 16px or more, so Safari has no reason to zoom in.
  const small = await page.evaluate(() =>
    [...document.querySelectorAll<HTMLElement>('to-deck-editor .tx, to-deck-editor input')]
      .filter((el) => parseFloat(getComputedStyle(el).fontSize) < 16)
      .map((el) => `${el.getAttribute('aria-label') ?? el.className}: ${getComputedStyle(el).fontSize}`),
  );
  expect(small).toEqual([]);
  expect(errors).toEqual([]);
});

test('deck: on a phone, a tap on a thumbnail chooses the slide with its bar inside the screen; Duplicate works by finger; the icon button and the grip are 44px to a finger; a double tap never zooms', async ({
  page,
}, info) => {
  test.skip(info.project.name !== 'phone', 'phone only');
  await page.goto('/#/v1/deck');
  const title = page.locator('to-deck-editor to-text.deck-title .tx');
  await title.tap();
  await page.keyboard.type('First');
  await expect(page.locator('.deck-thumb')).toHaveCount(1);
  await page.locator('.deck-thumb').first().tap();
  await expect(page.locator('.deck-slot.ranged')).toHaveCount(1);
  const bar = page.locator('to-context.deck-context .to-context');
  await expect(bar).toBeVisible();
  const b = (await bar.boundingBox())!;
  expect(b.x).toBeGreaterThanOrEqual(0);
  expect(b.x + b.width).toBeLessThanOrEqual(390);
  await bar.getByRole('button', { name: 'Duplicate' }).tap();
  await expect(page.locator('.deck-thumb')).toHaveCount(2);
  await expect(page.locator('.deck-thumb').nth(1)).toHaveAttribute('aria-label', 'Slide 2: First');
  const sizes = await page.evaluate(() => {
    const hit = (sel: string) => {
      const before = getComputedStyle(document.querySelector(sel)!, '::before');
      return [parseFloat(before.width), parseFloat(before.height)];
    };
    const ta = (sel: string) => getComputedStyle(document.querySelector(sel)!).touchAction;
    return { pick: hit('.deck-pick'), grip: hit('.deck-grip'), canvas: ta('.deck-canvas'), rail: ta('.deck-rail'), thumb: ta('.deck-thumb'), gripTa: ta('.deck-grip') };
  });
  expect(Math.min(...sizes.pick)).toBeGreaterThanOrEqual(44);
  expect(Math.min(...sizes.grip)).toBeGreaterThanOrEqual(44);
  // touch-action is not inherited but applies to all inside: the rail's manipulation holds on a thumbnail, which a finger still scrolls sideways; the grip alone takes a drag.
  expect([sizes.canvas, sizes.rail, sizes.gripTa]).toEqual(['manipulation', 'manipulation', 'none']);
  expect(sizes.thumb).not.toBe('none');
  expect(await page.evaluate(() => window.visualViewport?.scale ?? 1)).toBe(1);
});

test("deck: on a phone, a drawing from Insert ▾ is made in a dialog that fills the screen, with Done reachable by finger; Tiny Little Office Doc's field and OK are one row inside the screen", async ({
  page,
}, info) => {
  test.skip(info.project.name !== 'phone', 'phone only');
  const errors: string[] = [];
  page.on('pageerror', (e) => errors.push(String(e)));
  await page.goto('/#/v1/deck');
  await expect(page.locator('to-deck-editor to-text.deck-title .tx')).toBeVisible();
  // On a phone the bar comes with the focus (kit/chrome.ts indoc): the words are tapped before Insert.
  await page.locator('to-deck-editor to-text.deck-title .tx').tap();
  await page.getByRole('button', { name: 'Insert', exact: true }).tap();
  await page.getByRole('menuitem', { name: 'Drawing Tool' }).tap();
  const dialog = page.locator('to-doc-dialog dialog[open]');
  await expect(dialog.locator('to-draw-editor')).toBeVisible();
  // The whole screen, nothing wider than it; Done inside it and a finger tall.
  const d = (await dialog.boundingBox())!;
  expect([Math.round(d.x), Math.round(d.y), Math.round(d.width)]).toEqual([0, 0, 390]);
  expect(d.height).toBeGreaterThanOrEqual(840);
  const done = dialog.getByRole('button', { name: 'Done' });
  const b = (await done.boundingBox())!;
  expect(b.x + b.width).toBeLessThanOrEqual(390);
  expect(b.height).toBeGreaterThanOrEqual(44);
  if (SHOTS) await page.screenshot({ path: `${SHOTS}/deck-390-doc-dialog.png` });
  await done.tap();
  await expect(page.locator('to-doc-dialog')).toHaveCount(0);
  await expect(page).toHaveURL(/#\/v1\/deck\/[ryz]/);
  await expect(page.locator('figure.deck-sub')).toBeVisible();
  // Tiny Little Office Doc: the link and OK on one row, both inside the screen, the field 16px.
  await page.getByRole('button', { name: 'Insert', exact: true }).tap();
  await page.getByRole('menuitem', { name: 'Tiny Little Office Doc…' }).tap();
  const field = page.locator('.to-ask-doc .to-ask-url');
  const ok = page.locator('.to-ask-doc .to-ask-ok');
  await expect(field).toBeVisible();
  const [f, o] = [(await field.boundingBox())!, (await ok.boundingBox())!];
  expect(Math.abs(f.y + f.height / 2 - (o.y + o.height / 2))).toBeLessThan(2);
  expect(o.x + o.width).toBeLessThanOrEqual(390);
  expect(await field.evaluate((el) => parseFloat(getComputedStyle(el).fontSize))).toBeGreaterThanOrEqual(16);
  expect(await page.evaluate(() => window.visualViewport?.scale ?? 1)).toBe(1);
  expect(errors).toEqual([]);
});

test("deck: on a phone, a footnote is typed at the slide's foot: Footnote puts the mark in and the caret in its note, 16px, nothing zoomed; a tap on the mark goes back to it", async ({
  page,
}, info) => {
  test.skip(info.project.name !== 'phone', 'phone only');
  const errors: string[] = [];
  page.on('pageerror', (e) => errors.push(String(e)));
  await page.goto('/#/v1/deck');
  const title = page.locator('to-deck-editor to-text.deck-title .tx');
  await title.tap();
  await page.keyboard.type('Sources');
  await page.keyboard.press('Enter');
  const words = page.locator('to-deck-editor to-text.deck-words .tx');
  await expect(words).toBeFocused();
  await page.keyboard.type('A claim');
  await page.getByRole('button', { name: 'Footnote', exact: true }).tap();
  const note = page.locator('to-deck-editor .deck-fn to-text .tx');
  await expect(note).toBeFocused();
  expect(await note.evaluate((el) => parseFloat(getComputedStyle(el).fontSize))).toBeGreaterThanOrEqual(16);
  await page.keyboard.type('Where it comes from');
  await expect(page.locator('.deck-thumb').first()).toHaveAttribute('aria-label', 'Slide 1: Sources');
  await expect(note).toHaveText('Where it comes from');
  const n = (await note.boundingBox())!;
  expect(n.x).toBeGreaterThanOrEqual(0);
  expect(n.x + n.width).toBeLessThanOrEqual(390);
  expect(await page.evaluate(() => window.visualViewport?.scale ?? 1)).toBe(1);
  // Enter in the note comes back to the words, after the mark; a tap on the mark goes to its note again.
  await page.keyboard.press('Enter');
  await expect(words).toBeFocused();
  await words.locator('.fn').tap();
  await expect(note).toBeFocused();
  expect(errors).toEqual([]);
});

test("deck: at 200% on a phone, the show's controls lie inside the screen and read on their backing in the light theme; a swipe left turns to the next slide", async ({ page }, info) => {
  test.skip(info.project.name !== 'phone', 'phone only');
  const errors: string[] = [];
  page.on('pageerror', (e) => errors.push(String(e)));
  await page.emulateMedia({ colorScheme: 'light' });
  await page.addInitScript(() => (localStorage.setItem('tinyoffice.keep', '1'), localStorage.setItem('tinyoffice.size', '2')));
  await page.goto(`/#/v1/deck/${encodeDoc('## One\n\n## Two\n\n## Three\n')}?show`);
  await expect(page.locator('html')).toHaveAttribute('data-theme', 'light');
  const pos = page.locator('.deck-show .pos');
  await expect(pos).toHaveText('1 / 4');
  const buttons = await page.locator('.deck-show .ctl .to-btn').evaluateAll((els) => {
    /** A colour as [r, g, b, a], from what getComputedStyle gives (rgb()/rgba(), or color(srgb …)). */
    const rgba = (c: string): number[] => {
      const n = c.match(/[\d.]+/g)!.map(Number);
      return c.startsWith('color(') ? [n[0] * 255, n[1] * 255, n[2] * 255, n[3] ?? 1] : [n[0], n[1], n[2], n[3] ?? 1];
    };
    const over = (top: number[], under: number[]) => [0, 1, 2].map((i) => top[i] * top[3] + under[i] * (1 - top[3])).concat(1);
    const lum = ([r, g, b]: number[]) => {
      const l = (v: number) => ((v /= 255) <= 0.04045 ? v / 12.92 : ((v + 0.055) / 1.055) ** 2.4);
      return 0.2126 * l(r) + 0.7152 * l(g) + 0.0722 * l(b);
    };
    return els.map((el) => {
      // What the icon is drawn on: each background from the button out, laid over the next, until one is solid.
      const layers: number[][] = [];
      for (let e: Element | null = el; e; e = e.parentElement) {
        const bg = rgba(getComputedStyle(e).backgroundColor);
        if (bg[3] > 0) layers.push(bg);
        if (bg[3] >= 1) break;
      }
      const backing = layers.reduceRight((under, top) => over(top, under), [255, 255, 255, 1]);
      const ink = over(rgba(getComputedStyle(el).color), backing);
      const [a, b] = [lum(ink), lum(backing)].sort((x, y) => y - x);
      const r = el.getBoundingClientRect();
      return { name: el.getAttribute('aria-label'), left: r.left, right: r.right, contrast: (a + 0.05) / (b + 0.05) };
    });
  });
  expect(buttons.length).toBeGreaterThanOrEqual(3);
  for (const b of buttons) {
    expect(b.left, `${b.name} starts on the screen`).toBeGreaterThanOrEqual(0);
    expect(b.right, `${b.name} ends on the screen`).toBeLessThanOrEqual(390);
    expect(b.contrast, `${b.name} reads on its backing`).toBeGreaterThanOrEqual(3);
  }
  // A finger drawn from right to left across the slide turns to the next one; one swipe, one slide.
  const swipe = (from: number, to: number) =>
    page.evaluate(
      ([x0, x1]) => {
        const show = document.querySelector('.deck-show')!;
        const fire = (type: string, x: number) =>
          show.dispatchEvent(new PointerEvent(type, { pointerId: 7, pointerType: 'touch', isPrimary: true, clientX: x, clientY: 400, bubbles: true, cancelable: true }));
        fire('pointerdown', x0);
        for (let i = 1; i <= 5; i++) fire('pointermove', x0 + ((x1 - x0) * i) / 5);
        fire('pointerup', x1);
      },
      [from, to],
    );
  await swipe(300, 80);
  await expect(pos).toHaveText('2 / 4');
  await swipe(80, 300);
  await expect(pos).toHaveText('1 / 4');
  expect(await page.evaluate(() => window.visualViewport?.scale ?? 1)).toBe(1);
  expect(errors).toEqual([]);
});
