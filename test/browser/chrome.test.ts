// The page is the visible window and the document scrolls in a column (round eight, kit/chrome.ts, kit/scroll.ts).
// Safari on iOS does not make the page shorter for the keyboard, only the visible window, so the column is the visual
// viewport's height and the bar has a place of its own in it: under the header on a wide screen, at the column's bottom
// under a finger, so above the keyboard. On a phone, while a box has the focus, the header steps aside and the menu
// button floats at the column's top inline end; the drawer offers Share and Download. Phone tests run at 390×844 with
// touch emulated (a coarse pointer), the others at 1440×900.
import { test, expect, afterEach } from 'vitest';
import { cdp, page, userEvent } from 'vitest/browser';
import { mount, tick, until } from './helpers.ts';
import { encodeDoc } from '../../src/kit/codec.ts';
import type { ToShell } from '../../src/kit/shell.ts';
import type { ToText } from '../../src/kit/text.ts';
import type { ToDrawer } from '../../src/kit/drawer.ts';
import type { ToChrome } from '../../src/kit/chrome.ts';

const frame = () => new Promise<void>((r) => requestAnimationFrame(() => requestAnimationFrame(() => r())));
const BIG = `---\ntitle: Long\n---\n${Array.from({ length: 300 }, (_, i) => `Paragraph ${i + 1}, long enough to take a line or two of the page when it is drawn.`).join('\n\n')}\n`;

/** A finger: touch emulated, so `(pointer: coarse)` holds for the stylesheet and the code. */
async function coarse(on: boolean) {
  await cdp().send('Emulation.setTouchEmulationEnabled', on ? { enabled: true, maxTouchPoints: 5 } : { enabled: false });
}
const REAL = window.visualViewport!;
let faked = false;
/** A visual viewport of our own: its height is what a keyboard leaves. */
function fakeViewport() {
  const real = REAL;
  faked = true;
  const vv = Object.assign(new EventTarget(), { offsetTop: 0, offsetLeft: 0, pageTop: 0, pageLeft: 0, width: real.width, height: real.height, scale: 1 });
  Object.defineProperty(window, 'visualViewport', { configurable: true, value: vv });
  return vv;
}

afterEach(async () => {
  await coarse(false);
  if (faked) Object.defineProperty(window, 'visualViewport', { configurable: true, value: REAL });
  faked = false;
  history.replaceState(null, '', location.pathname);
  await page.viewport(414, 896);
});

async function write(hash = `#/v1/write/${encodeDoc(BIG)}`): Promise<{ shell: ToShell; text: ToText; main: HTMLElement; chrome: ToChrome }> {
  const shell = await mount(hash);
  await until(() => !!shell.querySelector('to-write-editor to-text .tx') && !!shell.querySelector('.to-editor to-bar button'));
  const text = shell.querySelector<ToText>('to-write-editor to-text')!;
  await text.updateComplete;
  await frame();
  return { shell, text, main: shell.querySelector<HTMLElement>('.to-main')!, chrome: shell.querySelector<ToChrome>('to-chrome')! };
}

for (const [w, h, finger] of [
  [390, 844, true],
  [1440, 900, false],
] as const) {
  test(`${w}×${h}: the window never scrolls; the column does, and the caret typed at the end of 300 paragraphs is inside it`, async () => {
    await page.viewport(w, h);
    await coarse(finger);
    const { text, main } = await write();
    // The page is the visible window: nothing to scroll, whatever is asked.
    expect(document.documentElement.scrollHeight).toBeLessThanOrEqual(innerHeight);
    window.scrollTo(0, 3000);
    expect(window.scrollY).toBe(0);
    text.tx.focus();
    text.sel = { anchor: { block: text.blocks.length - 1, offset: 5 }, focus: { block: text.blocks.length - 1, offset: 5 } };
    await text.updateComplete;
    await userEvent.keyboard('more');
    await until(() => main.scrollTop > 1000);
    await frame();
    expect(window.scrollY).toBe(0);
    // keepCaretVisible, through kit/scroll.ts: the caret within the column's box (not under the bar, not under the header).
    const caret = document.getSelection()!.getRangeAt(0).getBoundingClientRect();
    const box = main.getBoundingClientRect();
    expect(caret.top).toBeGreaterThanOrEqual(box.top);
    expect(caret.bottom).toBeLessThanOrEqual(box.bottom);
    const bar = document.querySelector<HTMLElement>('.to-editor to-bar')!.getBoundingClientRect();
    expect(caret.bottom <= bar.top || caret.top >= bar.bottom).toBe(true);
  });
}

test('390×844 with a finger: a visual viewport 300px shorter (a keyboard) makes the column 300px shorter, the bar’s bottom the viewport’s', async () => {
  await page.viewport(390, 844);
  await coarse(true);
  const vv = fakeViewport();
  const { chrome } = await write();
  const bar = () => document.querySelector<HTMLElement>('.to-editor to-bar')!.getBoundingClientRect();
  const full = chrome.getBoundingClientRect().height;
  expect(full).toBeCloseTo(vv.height, 0);
  expect(bar().bottom).toBeCloseTo(vv.height, 0);
  vv.height -= 300;
  vv.dispatchEvent(new Event('resize'));
  await frame();
  expect(chrome.getBoundingClientRect().height).toBeCloseTo(full - 300, 0);
  expect(bar().bottom).toBeCloseTo(vv.offsetTop + vv.height, 0);
  // One row, the whole width.
  expect(bar().width).toBeCloseTo(390, 0);
  // Nothing of the old measuring is left.
  const style = (el: Element) => (el as HTMLElement).style?.cssText ?? '';
  expect([document.documentElement, document.body, ...document.querySelectorAll('*')].some((el) => style(el).includes('--to-vv-top') || style(el).includes('--to-stuck-h'))).toBe(false);
  vv.height += 300;
  vv.dispatchEvent(new Event('resize'));
  await frame();
  expect(bar().bottom).toBeCloseTo(full, 0);
});

test('390×844 with a finger: a tap in the words hides the header (the focus a document opens with does not); the burger floats at the top inline end, the bar at the bottom; a tap outside brings the header back', async () => {
  await page.viewport(390, 844);
  await coarse(true);
  const { text, main, chrome } = await write(`#/v1/write/${encodeDoc('# Plans\n\nWords.\n')}`);
  const header = chrome.querySelector<HTMLElement>('.to-header')!;
  const burger = chrome.querySelector<HTMLElement>('.to-burger')!;
  // Opened with the focus in the words (the page's own, which raises no keyboard): the header stays.
  await until(() => text.hasFocus());
  await tick(100);
  expect(chrome.editing).toBe(false);
  expect(header.getBoundingClientRect().height).toBeGreaterThan(0);
  // The burger at the inline end on every screen: the right here, in the header's row.
  expect(burger.getBoundingClientRect().right).toBeGreaterThan(390 - 60);
  expect(burger.getBoundingClientRect().bottom).toBeLessThanOrEqual(header.getBoundingClientRect().bottom);
  // A tap in the words: editing.
  text.tx.blur();
  await userEvent.click(text.tx.querySelector('p')!);
  await until(() => chrome.editing);
  await frame();
  expect(getComputedStyle(header).display).toBe('none');
  const b = burger.getBoundingClientRect();
  expect(b.width).toBeGreaterThan(0);
  expect(b.top).toBeGreaterThanOrEqual(0);
  expect(b.top).toBeLessThan(20);
  expect(b.right).toBeGreaterThan(390 - 60);
  expect(getComputedStyle(burger).boxShadow).not.toBe('none');
  const bar = document.querySelector<HTMLElement>('.to-editor to-bar')!.getBoundingClientRect();
  expect(bar.bottom).toBeCloseTo(chrome.getBoundingClientRect().bottom, 0);
  expect(bar.top).toBeGreaterThanOrEqual(main.getBoundingClientRect().bottom - 1);
  // A tap on the bar keeps it so; a tap outside the box brings the header back.
  await userEvent.click(main, { position: { x: 5, y: main.clientHeight - 5 } });
  await until(() => !chrome.editing);
  await frame();
  expect(getComputedStyle(header).display).not.toBe('none');
});

test('1440×900: the header stays while the words have the focus, and the bar is under it at the column’s top', async () => {
  await page.viewport(1440, 900);
  const { text, main, chrome } = await write();
  await userEvent.click(text.tx.querySelector('p')!);
  await until(() => chrome.editing);
  await frame();
  const header = chrome.querySelector<HTMLElement>('.to-header')!.getBoundingClientRect();
  const bar = document.querySelector<HTMLElement>('.to-editor to-bar')!.getBoundingClientRect();
  expect(header.height).toBeGreaterThan(0);
  expect(bar.top).toBeCloseTo(header.bottom, 0);
  expect(main.getBoundingClientRect().top).toBeCloseTo(bar.bottom, 0);
  // The column scrolls under the bar; the bar does not move.
  main.scrollTop = 2000;
  await frame();
  expect(document.querySelector<HTMLElement>('.to-editor to-bar')!.getBoundingClientRect().top).toBeCloseTo(bar.top, 0);
  // The burger at the inline end of the header.
  expect(chrome.querySelector<HTMLElement>('.to-burger')!.getBoundingClientRect().right).toBeGreaterThan(1440 - 80);
});

test('the drawer lists Share… and Download with a document open, and not on the home page; Share… opens the Share dialog', async () => {
  await page.viewport(390, 844);
  const { shell } = await write(`#/v1/write/${encodeDoc('# Plans\n\nWords.\n')}`);
  const drawer = shell.querySelector<ToDrawer>('to-drawer')!;
  shell.querySelector<HTMLButtonElement>('.to-burger')!.click();
  await until(() => drawer.dialog.open && !!drawer.querySelector('.to-drawer-doc'));
  const doc = drawer.querySelector<HTMLElement>('.to-drawer-doc')!;
  expect(doc.textContent).toContain('This document');
  expect(doc.querySelector('.to-drawer-share')!.textContent).toContain('Share…');
  expect(doc.querySelector('to-menu.to-drawer-download')!.textContent).toContain('Download');
  // At its top: before the apps.
  expect(doc.compareDocumentPosition(drawer.querySelector('.to-drawer-apps')!) & Node.DOCUMENT_POSITION_FOLLOWING).toBeTruthy();
  // The drawer slides in from the burger's side.
  expect(drawer.dialog.getBoundingClientRect().right).toBeCloseTo(390, 0);
  doc.querySelector<HTMLButtonElement>('.to-drawer-share')!.click();
  await until(() => !!shell.querySelector('to-dialog.to-share-dialog dialog[open]'));
  expect(drawer.dialog.open).toBe(false);
  shell.querySelector<HTMLElement>('to-dialog.to-share-dialog')!.querySelector<HTMLButtonElement>('.to-dialog-head button')!.click();

  location.hash = '';
  await until(() => !!shell.querySelector('to-home'));
  shell.querySelector<HTMLButtonElement>('.to-burger')!.click();
  await until(() => drawer.dialog.open && !!drawer.querySelector('.to-drawer-apps'));
  expect(drawer.querySelector('.to-drawer-doc')).toBeNull();
  drawer.close();
});

test('the Outliner’s row dragged to the column’s edge scrolls the column', async () => {
  await page.viewport(390, 844);
  const items = Array.from({ length: 80 }, (_, i) => `- Item ${i + 1}`).join('\n');
  const shell = await mount(`#/v1/outline/${encodeDoc(`${items}\n`)}`);
  await until(() => shell.querySelectorAll('to-outline-editor .ol-handle').length > 40);
  await frame();
  const main = shell.querySelector<HTMLElement>('.to-main')!;
  expect(main.scrollTop).toBe(0);
  const handle = shell.querySelector<HTMLElement>('to-outline-editor .ol-handle')!;
  const h = handle.getBoundingClientRect();
  const bottom = main.getBoundingClientRect().bottom;
  const fire = (type: string, x: number, y: number) => handle.dispatchEvent(new PointerEvent(type, { pointerId: 7, pointerType: 'mouse', isPrimary: true, button: 0, buttons: type === 'pointerup' ? 0 : 1, clientX: x, clientY: y, bubbles: true, cancelable: true, composed: true }));
  fire('pointerdown', h.left + 4, h.top + 4);
  fire('pointermove', h.left + 4, h.top + 40);
  fire('pointermove', h.left + 4, bottom - 8);
  await until(() => main.scrollTop > 0);
  fire('pointerup', h.left + 4, bottom - 8);
  expect(window.scrollY).toBe(0);
});

test('presenting a deck covers the chrome: the header, the burger and the bar are under the show', async () => {
  await page.viewport(390, 844);
  const shell = await mount(`#/v1/deck/${encodeDoc('# One\n\n---\n\n# Two\n')}`);
  await until(() => !!shell.querySelector('to-deck-editor button.deck-present'));
  shell.querySelector<HTMLButtonElement>('to-deck-editor button.deck-present')!.click();
  await until(() => !!shell.querySelector('.deck-show'));
  await tick(50);
  const show = shell.querySelector<HTMLElement>('.deck-show')!;
  const r = show.getBoundingClientRect();
  expect(r.top).toBe(0);
  expect(r.left).toBe(0);
  expect(r.width).toBeCloseTo(innerWidth, 0);
  expect(r.height).toBeCloseTo(innerHeight, 0);
  for (const sel of ['.to-burger', '.to-header .to-share', '.to-editor to-bar']) {
    const b = shell.querySelector<HTMLElement>(sel)!.getBoundingClientRect();
    expect(show.contains(document.elementFromPoint(b.left + b.width / 2, b.top + b.height / 2))).toBe(true);
  }
  await userEvent.keyboard('{Escape}');
  await until(() => !shell.querySelector('.deck-show'));
});
