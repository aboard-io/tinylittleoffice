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
import { keyboard } from '../../src/kit/commands.ts';
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
  await settled();
  return { shell, text, main: shell.querySelector<HTMLElement>('.to-main')!, chrome: shell.querySelector<ToChrome>('to-chrome')! };
}
/** The bar where it is going: on a phone it comes with the focus (round nine), gliding in or out; measured once it is there. */
async function settled() {
  await frame();
  await until(() => !document.querySelector('to-chrome[gliding]') && document.getAnimations().every((a) => a.playState !== 'running'));
}
/** A tap in the words, as a person's: on a phone the bar comes with it (the focus a document opens with is not one). */
async function tapWords(text: ToText) {
  text.tx.blur();
  await userEvent.click(text.tx.querySelector('p, h1, h2')!);
  await until(() => !!document.querySelector('to-chrome[indoc]'));
  await settled();
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
    // Typed, the bar comes (on a phone, round nine) and the column glides to make its room; the caret is kept in sight once it settles.
    await settled();
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
  const { chrome, text } = await write();
  await tapWords(text);
  const bar = () => document.querySelector<HTMLElement>('.to-editor to-bar')!.getBoundingClientRect();
  const full = chrome.getBoundingClientRect().height;
  expect(full).toBeCloseTo(vv.height, 0);
  expect(bar().bottom).toBeCloseTo(vv.height, 0);
  vv.height -= 300;
  vv.dispatchEvent(new Event('resize'));
  // The column glides there (a fifth of a second).
  await until(() => Math.abs(chrome.getBoundingClientRect().height - (full - 300)) < 0.5 && !chrome.hasAttribute('gliding'));
  expect(chrome.getBoundingClientRect().height).toBeCloseTo(full - 300, 0);
  expect(bar().bottom).toBeCloseTo(vv.offsetTop + vv.height, 0);
  // One row, the whole width.
  expect(bar().width).toBeCloseTo(390, 0);
  // Nothing of the old measuring is left.
  const style = (el: Element) => (el as HTMLElement).style?.cssText ?? '';
  expect([document.documentElement, document.body, ...document.querySelectorAll('*')].some((el) => style(el).includes('--to-vv-top') || style(el).includes('--to-stuck-h'))).toBe(false);
  vv.height += 300;
  vv.dispatchEvent(new Event('resize'));
  await until(() => Math.abs(bar().bottom - full) < 0.5 && !chrome.hasAttribute('gliding'));
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
  await settled();
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

// A caret brought into the column stops above the bar at its foot, not under it (Paul, 2026-10-10: a new row of the
// outline appeared under the nav and was unreachable): what the bar covers is not room (kit/scroll.ts inner).
test('390×844 with a finger and a keyboard: Enter on the outline’s last row, at the column’s foot, lands the new row above the bar', async () => {
  await page.viewport(390, 844);
  await coarse(true);
  const vv = fakeViewport();
  const rows = Array.from({ length: 40 }, (_, i) => `- Row ${i + 1}`).join('\n') + '\n';
  const shell = await mount(`#/v1/outline/${encodeDoc(rows)}`);
  await until(() => shell.querySelectorAll('.ol-row to-text').length === 40 && !!shell.querySelector('to-outline-editor to-bar'));
  const last = shell.querySelectorAll<HTMLElement>('.ol-row to-text')[39];
  await userEvent.click(last);
  vv.height = 844 - 300;
  vv.dispatchEvent(new Event('resize'));
  await until(() => !shell.querySelector('to-chrome')!.hasAttribute('gliding') && shell.querySelector('to-chrome')!.getBoundingClientRect().height <= 545);
  await userEvent.keyboard('{End}');
  await userEvent.keyboard('{Enter}');
  await until(() => shell.querySelectorAll('.ol-row to-text').length === 41);
  await tick();
  await tick();
  const bar = shell.querySelector<HTMLElement>('to-outline-editor to-bar')!.getBoundingClientRect();
  const focused = (document.activeElement as HTMLElement).getBoundingClientRect();
  const caret = document.getSelection()!.getRangeAt(0).getBoundingClientRect();
  // The bar is at the foot of the shortened column, and the new row with its caret is above it.
  expect(Math.round(bar.bottom)).toBeLessThanOrEqual(545);
  expect(bar.top).toBeGreaterThan(400);
  expect(Math.max(focused.bottom, caret.bottom)).toBeLessThanOrEqual(bar.top + 0.5);
});

test('390×844 with a finger and a keyboard: Enter at the end of a long text lands the new paragraph above the bar, the column not jumped to its top', async () => {
  await page.viewport(390, 844);
  await coarse(true);
  const vv = fakeViewport();
  const shell = await mount(`#/v1/write/${encodeDoc(BIG)}`);
  await until(() => !!shell.querySelector('to-write-editor to-bar') && shell.querySelectorAll('to-write-editor p').length > 100);
  const last = [...shell.querySelectorAll<HTMLElement>('to-write-editor to-text p')].pop()!;
  await userEvent.click(last);
  vv.height = 844 - 300;
  vv.dispatchEvent(new Event('resize'));
  await until(() => !shell.querySelector('to-chrome')!.hasAttribute('gliding') && shell.querySelector('to-chrome')!.getBoundingClientRect().height <= 545);
  await userEvent.keyboard('{End}');
  const main = shell.querySelector<HTMLElement>('.to-main')!;
  const before = main.scrollTop;
  await userEvent.keyboard('{Enter}');
  await until(() => shell.querySelectorAll('to-write-editor to-text p').length > 300);
  await tick();
  await tick();
  const bar = shell.querySelector<HTMLElement>('to-write-editor to-bar')!.getBoundingClientRect();
  const caret = document.getSelection()!.getRangeAt(0);
  const block = (caret.startContainer instanceof Element ? caret.startContainer : caret.startContainer.parentElement!).closest('p')!.getBoundingClientRect();
  expect(main.scrollTop).toBeGreaterThan(before - 50);
  expect(block.bottom).toBeLessThanOrEqual(bar.top + 0.5);
  expect(block.top).toBeGreaterThanOrEqual(0);
});

// A new document made by the person's own tap arrives ready to type (Paul, 2026-10-11): the focus in its first box, the
// bar shown and the header away as after a tap into the words; a document a link opens is still read first.
test('390×844 with a finger: an app tapped on the home page opens editing, the first box focused and the bar shown; a link opened is not', async () => {
  await page.viewport(390, 844);
  await coarse(true);
  const shell = await mount('');
  await until(() => !!shell.querySelector('a.to-app-open[href="#/v1/write"]'));
  await userEvent.click(shell.querySelector<HTMLElement>('a.to-app-open[href="#/v1/write"]')!);
  await until(() => !!shell.querySelector('to-write-editor to-text .tx'));
  await until(() => document.activeElement?.classList.contains('tx') === true);
  const chrome = shell.querySelector('to-chrome')!;
  await until(() => chrome.hasAttribute('indoc'));
  expect(chrome.hasAttribute('editing')).toBe(true);
  expect(document.querySelector('.to-keyboard-hold')).toBeNull();
  const opened = await mount(`#/v1/write/${encodeDoc('Words\n')}`);
  await until(() => document.activeElement?.classList.contains('tx') === true);
  await tick();
  await tick();
  expect(opened.querySelector('to-chrome')!.hasAttribute('indoc')).toBe(false);
});

test('1440×900: the header stays while the words have the focus, and the bar is under it at the column’s top', async () => {
  await page.viewport(1440, 900);
  const { text, main, chrome } = await write();
  await userEvent.click(text.tx.querySelector('p')!);
  await until(() => chrome.editing);
  await frame();
  await settled();
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
  const fire = (type: string, x: number, y: number) =>
    handle.dispatchEvent(
      new PointerEvent(type, {
        pointerId: 7,
        pointerType: 'mouse',
        isPrimary: true,
        button: 0,
        buttons: type === 'pointerup' ? 0 : 1,
        clientX: x,
        clientY: y,
        bubbles: true,
        cancelable: true,
        composed: true,
      }),
    );
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
  for (const sel of ['.to-burger', '.to-header .to-here', '.to-editor to-bar']) {
    const b = shell.querySelector<HTMLElement>(sel)!.getBoundingClientRect();
    expect(show.contains(document.elementFromPoint(b.left + b.width / 2, b.top + b.height / 2))).toBe(true);
  }
  await userEvent.keyboard('{Escape}');
  await until(() => !shell.querySelector('.deck-show'));
});

/* ---- round nine (Paul, 2026-10-10, from his iPhone): the bar glides, the header is the title, the burger keeps out of the way, the drawer is tidy ---- */

const barOf = () => document.querySelector<HTMLElement>('.to-editor to-bar')!;

test('390×844 with a finger: the keyboard coming up glides the column (a height transition) and the bar fades out while it moves and back when it settles', async () => {
  await page.viewport(390, 844);
  await coarse(true);
  const vv = fakeViewport();
  const { chrome, text } = await write();
  await tapWords(text);
  const full = chrome.getBoundingClientRect().height;
  expect(getComputedStyle(barOf()).opacity).toBe('1');
  vv.height -= 300;
  vv.dispatchEvent(new Event('resize'));
  await frame();
  const look = getComputedStyle(chrome);
  expect(look.transitionProperty).toContain('height');
  expect(parseFloat(look.transitionDuration)).toBeGreaterThan(0.1);
  expect(parseFloat(look.transitionDuration)).toBeLessThanOrEqual(0.3);
  // Mid-flight: not yet where it is going.
  expect(chrome.getBoundingClientRect().height).toBeGreaterThan(full - 299);
  // The bar dips to nothing while the column moves…
  let least = 1;
  const end = performance.now() + 600;
  while (performance.now() < end && least > 0.02) {
    least = Math.min(least, parseFloat(getComputedStyle(barOf()).opacity));
    await new Promise((r) => requestAnimationFrame(r));
  }
  expect(least).toBeLessThan(0.05);
  // …and is back once it settles, at the keyboard's top.
  await until(() => getComputedStyle(barOf()).opacity === '1' && !chrome.hasAttribute('gliding'));
  expect(chrome.getBoundingClientRect().height).toBeCloseTo(full - 300, 0);
  expect(barOf().getBoundingClientRect().bottom).toBeCloseTo(full - 300, 0);
});

test('390×844 with a finger, reduced motion: the column takes the keyboard’s height at once (only the fade remains)', async () => {
  await page.viewport(390, 844);
  await coarse(true);
  await cdp().send('Emulation.setEmulatedMedia', { features: [{ name: 'prefers-reduced-motion', value: 'reduce' }] });
  try {
    const vv = fakeViewport();
    const { chrome, text } = await write();
    await tapWords(text);
    const full = chrome.getBoundingClientRect().height;
    vv.height -= 300;
    vv.dispatchEvent(new Event('resize'));
    await frame();
    expect(chrome.getBoundingClientRect().height).toBeCloseTo(full - 300, 0);
    await until(() => !chrome.hasAttribute('gliding') && getComputedStyle(barOf()).opacity === '1');
  } finally {
    await cdp().send('Emulation.setEmulatedMedia', { features: [] });
  }
});

for (const [w, h] of [
  [390, 844],
  [1440, 900],
] as const) {
  test(`${w}×${h}: the header is the title: no Share, no Download, and the title field takes the room they left`, async () => {
    await page.viewport(w, h);
    const { chrome } = await write(`#/v1/write/${encodeDoc('# Plans\n\nWords.\n')}`);
    const header = chrome.querySelector<HTMLElement>('.to-header')!;
    expect(header.querySelector('.to-share, .to-download, to-menu')).toBeNull();
    const title = header.querySelector<HTMLElement>('.to-title')!;
    // The rest of the row: the app's icon, the trust pill, the meter, whichever are drawn.
    const look = getComputedStyle(header);
    const inner = header.clientWidth - parseFloat(look.paddingLeft) - parseFloat(look.paddingRight);
    const others = [...header.children].filter((el) => el !== title && (el as HTMLElement).getBoundingClientRect().width > 0 && getComputedStyle(el).position !== 'absolute');
    const gap = parseFloat(look.columnGap);
    const rest = others.reduce((sum, el) => sum + el.getBoundingClientRect().width + gap, 0);
    expect(title.getBoundingClientRect().width).toBeGreaterThanOrEqual(inner - rest - 1);
    // Wider than the two buttons it lost would have left it: two 44px targets and their gaps.
    expect(title.getBoundingClientRect().width).toBeGreaterThan(w === 390 ? 150 : 900);
  });
}

test('390×844 with a finger: a tap in the words slides the burger to the very corner, translucent; a tap outside slides it back', async () => {
  await page.viewport(390, 844);
  await coarse(true);
  const { text, main, chrome } = await write(`#/v1/write/${encodeDoc('# Plans\n\nWords.\n')}`);
  const burger = chrome.querySelector<HTMLElement>('.to-burger')!;
  const em = parseFloat(getComputedStyle(burger).fontSize);
  const home = burger.getBoundingClientRect();
  expect(getComputedStyle(burger).opacity).toBe('1');
  expect(getComputedStyle(burger).transitionProperty).toMatch(/top|inset|transform|all/);
  text.tx.blur();
  await userEvent.click(text.tx.querySelector('p')!);
  await until(() => chrome.editing);
  await until(() => burger.getBoundingClientRect().top <= 0.5 * em && 390 - burger.getBoundingClientRect().right <= 0.5 * em && parseFloat(getComputedStyle(burger).opacity) < 0.7, 2000);
  const b = burger.getBoundingClientRect();
  // Still a finger's target.
  expect(b.width).toBeGreaterThanOrEqual(44);
  expect(b.height).toBeGreaterThanOrEqual(44);
  await userEvent.click(main, { position: { x: 5, y: main.clientHeight - 5 } });
  await until(() => !chrome.editing);
  await until(() => Math.abs(burger.getBoundingClientRect().top - home.top) < 0.5 && getComputedStyle(burger).opacity === '1', 2000);
  expect(burger.getBoundingClientRect().right).toBeCloseTo(home.right, 0);
});

test('390×844 with a finger: the drawer’s This document is a heading over full-width rows (New, Share…, Download, Find in this document), above the search; the dialog draws no ring and sits flush', async () => {
  await page.viewport(390, 844);
  await coarse(true);
  keyboard.seen = false;
  const { shell } = await write(`#/v1/write/${encodeDoc('# Plans\n\nWords.\n')}`);
  const drawer = shell.querySelector<ToDrawer>('to-drawer')!;
  shell.querySelector<HTMLButtonElement>('.to-burger')!.click();
  await until(() => drawer.dialog.open && !!drawer.querySelector('.to-drawer-doc'));
  await frame();
  // On a touch screen the dialog holds the focus (not the search: the keyboard), and draws no ring for it.
  expect(document.activeElement).toBe(drawer.dialog);
  expect(getComputedStyle(drawer.dialog).outlineStyle).toBe('none');
  // One hairline against the backdrop, the panel flush with the dialog's edge.
  const inner = drawer.querySelector<HTMLElement>('.to-drawer-inner')!;
  expect(inner.getBoundingClientRect().left).toBeCloseTo(drawer.dialog.getBoundingClientRect().left, 0);
  expect(getComputedStyle(inner).borderInlineStartWidth).toBe('1px');
  expect(drawer.dialog.getBoundingClientRect().right).toBeCloseTo(390, 0);
  const doc = drawer.querySelector<HTMLElement>('.to-drawer-doc')!;
  const head = doc.querySelector<HTMLElement>('.to-drawer-head3')!.getBoundingClientRect();
  const fresh = doc.querySelector<HTMLElement>('.to-drawer-new')!.getBoundingClientRect();
  const share = doc.querySelector<HTMLElement>('.to-drawer-share')!.getBoundingClientRect();
  const download = doc.querySelector<HTMLElement>('.to-drawer-download > button')!.getBoundingClientRect();
  expect(head.bottom).toBeLessThanOrEqual(fresh.top + 0.5);
  expect(fresh.bottom).toBeLessThanOrEqual(share.top + 0.5);
  expect(share.bottom).toBeLessThanOrEqual(download.top + 0.5);
  // Full width: the drawer's less the gutters, both alike, from the same edge.
  const d = drawer.dialog.getBoundingClientRect();
  for (const row of [fresh, share, download]) {
    expect(row.width).toBeGreaterThan(d.width - 3 * parseFloat(getComputedStyle(doc).fontSize));
    expect(row.left).toBeCloseTo(share.left, 0);
    expect(row.right).toBeCloseTo(share.right, 0);
    expect(row.height).toBeGreaterThanOrEqual(44);
  }
  // The heading's words begin where the rows' do: no empty column beside it.
  expect(head.left).toBeLessThan(share.left + d.width / 4);
  // The order: the head, This document, the search, the apps.
  expect(doc.compareDocumentPosition(drawer.querySelector('.to-find')!) & Node.DOCUMENT_POSITION_FOLLOWING).toBeTruthy();
  expect(drawer.querySelector('.to-drawer-head')!.compareDocumentPosition(doc) & Node.DOCUMENT_POSITION_FOLLOWING).toBeTruthy();
  // A finger with no keyboard seen: no keys written at the rows' right (the review of 2026-10-11), each row's keys its aria-keyshortcuts.
  expect(doc.querySelector('.to-drawer-share kbd')).toBeNull();
  expect(doc.querySelector('.to-drawer-download kbd')).toBeNull();
  expect(doc.querySelector('.to-drawer-share')!.getAttribute('aria-keyshortcuts')).toMatch(/Shift\+S$/);
  expect(doc.querySelector('.to-drawer-download > button')!.getAttribute('aria-keyshortcuts')).toMatch(/Shift\+D$/);
  drawer.close();
});

test('the keys: Mod+Shift+S opens Share, Mod+Shift+D the drawer with its Download table open', async () => {
  await page.viewport(1440, 900);
  const { shell } = await write(`#/v1/write/${encodeDoc('# Plans\n\nWords.\n')}`);
  const press = (key: string) => window.dispatchEvent(new KeyboardEvent('keydown', { key, ctrlKey: true, shiftKey: true, bubbles: true, cancelable: true }));
  press('S');
  await until(() => !!shell.querySelector('to-dialog.to-share-dialog dialog[open]'));
  shell.querySelector<HTMLElement>('to-dialog.to-share-dialog')!.querySelector<HTMLButtonElement>('.to-dialog-head button')!.click();
  await until(() => !shell.querySelector('to-dialog.to-share-dialog dialog[open]'));
  press('D');
  const drawer = shell.querySelector<ToDrawer>('to-drawer')!;
  await until(() => drawer.dialog.open && !!drawer.querySelector('.to-drawer-download [popover]:popover-open'));
  // By a key: the first item has the focus.
  await until(() => drawer.querySelector('.to-drawer-download [popover]')!.contains(document.activeElement));
  drawer.querySelector<HTMLElement>('.to-drawer-download [popover]')!.hidePopover();
  drawer.close();
});

test('390×844 with a finger, editing: the translucent burger is opaque under a hover, a key’s focus and while the drawer is open', async () => {
  await page.viewport(390, 844);
  await coarse(true);
  const { shell, text, chrome } = await write(`#/v1/write/${encodeDoc('# Plans\n\nWords.\n')}`);
  const burger = chrome.querySelector<HTMLElement>('.to-burger')!;
  const opacity = () => parseFloat(getComputedStyle(burger).opacity);
  text.tx.blur();
  await userEvent.click(text.tx.querySelector('p')!);
  await until(() => chrome.editing && opacity() < 0.7, 2000);
  // A hover: opaque, and translucent again when the pointer leaves.
  await userEvent.hover(burger);
  await until(() => opacity() === 1, 2000);
  await userEvent.unhover(burger);
  await until(() => opacity() < 0.7, 2000);
  // A key's focus: opaque at once (the transition aside), before the header comes back for the focus having left the box.
  burger.style.transition = 'none';
  await userEvent.keyboard('{Shift>}{Shift}'); // the last thing the person did was a key
  burger.focus();
  expect(burger.matches(':focus-visible')).toBe(true);
  expect(chrome.editing).toBe(true);
  expect(opacity()).toBe(1);
  burger.style.transition = '';
  // The drawer open: the focus is in the dialog (an aside), so editing holds, and the burger is opaque under it.
  text.tx.blur();
  await userEvent.click(text.tx.querySelector('p')!);
  await until(() => chrome.editing && opacity() < 0.7, 2000);
  const drawer = shell.querySelector<ToDrawer>('to-drawer')!;
  burger.click();
  await until(() => drawer.dialog.open);
  await frame();
  expect(chrome.editing).toBe(true);
  await until(() => opacity() === 1, 2000);
  drawer.close();
  await until(() => !drawer.dialog.open);
});

test('390×844 with a finger, reduced motion: the burger goes to the corner at once, no slide', async () => {
  await page.viewport(390, 844);
  await coarse(true);
  await cdp().send('Emulation.setEmulatedMedia', { features: [{ name: 'prefers-reduced-motion', value: 'reduce' }] });
  try {
    const { text, main, chrome } = await write(`#/v1/write/${encodeDoc('# Plans\n\nWords.\n')}`);
    const burger = chrome.querySelector<HTMLElement>('.to-burger')!;
    const em = parseFloat(getComputedStyle(burger).fontSize);
    const home = burger.getBoundingClientRect();
    // No transition on where it sits: every duration 0s.
    const look = getComputedStyle(burger);
    expect(look.transitionDuration.split(',').every((d) => parseFloat(d) === 0)).toBe(true);
    text.tx.blur();
    await userEvent.click(text.tx.querySelector('p')!);
    await until(() => chrome.editing);
    await chrome.updateComplete;
    // The first frame it is editing, it is in the corner: no glide through the frames between.
    const b = burger.getBoundingClientRect();
    expect(b.top).toBeLessThanOrEqual(0.5 * em);
    expect(390 - b.right).toBeLessThanOrEqual(0.5 * em);
    await userEvent.click(main, { position: { x: 5, y: main.clientHeight - 5 } });
    await until(() => !chrome.editing);
    await chrome.updateComplete;
    expect(burger.getBoundingClientRect().top).toBeCloseTo(home.top, 0);
    expect(burger.getBoundingClientRect().right).toBeCloseTo(home.right, 0);
  } finally {
    await cdp().send('Emulation.setEmulatedMedia', { features: [] });
  }
});

test('390×844 with a finger: the caret is kept in sight after the column settles, not while it glides', async () => {
  await page.viewport(390, 844);
  await coarse(true);
  const { text, main, chrome } = await write();
  text.tx.focus();
  const last = text.blocks.length - 1;
  text.sel = { anchor: { block: last, offset: 5 }, focus: { block: last, offset: 5 } };
  await text.updateComplete;
  await frame();
  // The caret placed there may have been scrolled to; the column back at its top, the caret far below what is seen.
  main.scrollTop = 0;
  await frame();
  expect(main.scrollTop).toBe(0);
  // In flight: an edit at the end of 300 paragraphs leaves the column where it is (kit/text.ts asks gliding()).
  chrome.setAttribute('gliding', '');
  await userEvent.keyboard('more');
  await until(() => chrome.editing && text.tx.textContent!.includes('Paragmoreraph 300'), 2000);
  await frame();
  expect(main.scrollTop).toBeLessThan(100);
  // Settled (the column's height transition ends): the caret is brought into what can be seen (kit/chrome.ts settle()).
  chrome.dispatchEvent(new TransitionEvent('transitionend', { propertyName: 'height' }));
  expect(chrome.hasAttribute('gliding')).toBe(false);
  await until(() => main.scrollTop > 1000);
  const caret = document.getSelection()!.getRangeAt(0).getBoundingClientRect();
  const box = main.getBoundingClientRect();
  expect(caret.top).toBeGreaterThanOrEqual(box.top);
  expect(caret.bottom).toBeLessThanOrEqual(box.bottom);
});

test('390×844 with a finger: the bar’s button focused while the bar is away (reading) never scrolls the chrome; the header stays where it is (walks: text at a phone, seed 1916216016)', async () => {
  await page.viewport(390, 844);
  await coarse(true);
  const { shell, chrome } = await write();
  const header = shell.querySelector<HTMLElement>('.to-header')!;
  const top = header.getBoundingClientRect().top;
  shell.querySelector<HTMLElement>('to-write-editor to-bar button')!.focus();
  await frame();
  expect(chrome.scrollTop).toBe(0);
  expect(shell.querySelector<HTMLElement>('.to-column')!.scrollTop).toBe(0);
  expect(header.getBoundingClientRect().top).toBe(top);
});

test('390×844 with a finger: the bar and the palette’s button slid away are inert (out of Tab and a screen reader’s swipes), back with the bar; under a docked context row too', async () => {
  await page.viewport(390, 844);
  await coarse(true);
  const { shell, text, chrome } = await write();
  const bar = shell.querySelector<HTMLElement>('to-write-editor to-bar')!;
  const palette = shell.querySelector<HTMLElement>('.to-palette-btn')!;
  // Reading: away, and inert.
  expect(chrome.hasAttribute('indoc')).toBe(false);
  expect([bar.inert, palette.inert]).toEqual([true, true]);
  await tapWords(text);
  expect([bar.inert, palette.inert]).toEqual([false, false]);
  // The context row docked over it: the bar away again, inert; undocked, back.
  document.documentElement.setAttribute('data-context-row', '');
  await until(() => bar.inert && palette.inert);
  document.documentElement.removeAttribute('data-context-row');
  await until(() => !bar.inert && !palette.inert);
  // At a desktop's size with a mouse the bar is never away.
  await coarse(false);
  await page.viewport(1440, 900);
  const desk = await write();
  expect(desk.shell.querySelector<HTMLElement>('to-write-editor to-bar')!.inert).toBe(false);
});
