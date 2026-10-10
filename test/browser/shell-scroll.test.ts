// The shell round a long document (round eight: the page is the visible window, the document scrolls in a column,
// kit/chrome.ts). The header and the app's bar hold still while the column scrolls under them, the menu button at the
// top inline end; a short link's banner sits under the header. And the title, tapped, opens a row of its own across
// the header, at a size that can be read: Enter keeps it, Escape puts back what was there.
import { test, expect, afterEach, vi } from 'vitest';
import { page, userEvent } from 'vitest/browser';
import { mount, tick, until } from './helpers.ts';
import { encodeDoc } from '../../src/kit/codec.ts';
import { localDay } from '../../src/kit/library.ts';
import { remScale } from '../../src/kit/zoom.ts';
import type { ToShell } from '../../src/kit/shell.ts';

/** A length on the screen in the stylesheet's own pixels, sixteenths of a rem: the normal size draws a rem at kit/zoom.ts BASE × 16px. */
const css = (px: number) => px / remScale();

afterEach(() => {
  vi.useRealTimers();
  history.replaceState(null, '', location.pathname);
});

const LONG = `---\ntitle: Long\n---\n${Array.from({ length: 60 }, (_, i) => `Paragraph ${i + 1}, long enough to take a line or two of the page.`).join('\n\n')}\n`;
const frame = () => new Promise<void>((r) => requestAnimationFrame(() => requestAnimationFrame(() => r())));
const column = (shell: ToShell) => shell.querySelector<HTMLElement>('.to-main')!;
async function long(shell?: ToShell, hash = `#/v1/write/${encodeDoc(LONG)}`) {
  const s = shell ?? (await mount(hash));
  await until(() => !!s.querySelector('to-write-editor to-bar') && column(s).scrollHeight > innerHeight * 2);
  return s;
}
/** The column scrolled to `y`. */
async function scrollTo(shell: ToShell, y: number) {
  column(shell).scrollTop = y;
  await frame();
}

test('the column scrolls under the header and the bar; the menu button stays at the top inline end', async () => {
  await page.viewport(390, 700);
  const shell = await long();
  const header = shell.querySelector<HTMLElement>('.to-header')!;
  const bar = shell.querySelector<HTMLElement>('to-write-editor to-bar')!;
  const burger = shell.querySelector<HTMLElement>('.to-burger')!;
  const at = () => [header, bar, burger].map((el) => Math.round(el.getBoundingClientRect().top));
  const before = at();
  expect(before[0]).toBe(0);
  expect(before[1]).toBe(Math.round(header.getBoundingClientRect().bottom));
  await scrollTo(shell, header.offsetHeight + 600);
  expect(column(shell).scrollTop).toBeGreaterThan(600);
  expect(at()).toEqual(before);
  expect(window.scrollY).toBe(0);
  expect(burger.getBoundingClientRect().right).toBeGreaterThan(390 - 60);
  await page.viewport(414, 896);
});

test('a short link’s banner: under the header, and there as the column scrolls', async () => {
  const now = new Date('2026-10-09T12:00:00Z').getTime();
  vi.useFakeTimers({ toFake: ['Date'], now });
  const shell = await long(undefined, `#/v1/write/${encodeDoc(LONG)}?s=abcdefg&x=${now + 3 * 86_400_000}`);
  const banner = shell.querySelector<HTMLElement>('.to-arrival')!;
  const header = shell.querySelector<HTMLElement>('.to-header')!;
  expect(Math.round(banner.getBoundingClientRect().top)).toBe(Math.round(header.getBoundingClientRect().bottom));
  await scrollTo(shell, 1200);
  expect(Math.round(banner.getBoundingClientRect().top)).toBe(Math.round(header.getBoundingClientRect().bottom));
  const bar = shell.querySelector<HTMLElement>('to-write-editor to-bar')!;
  expect(Math.round(bar.getBoundingClientRect().top)).toBe(Math.round(banner.getBoundingClientRect().bottom));
});

test('the home page: the header holds still and the column scrolls', async () => {
  await page.viewport(390, 500);
  const shell = await mount('');
  // (Room to scroll, whatever the home page holds today.)
  shell.querySelector<HTMLElement>('to-home')!.style.minHeight = '2000px';
  await scrollTo(shell, 200);
  expect(column(shell).scrollTop).toBe(200);
  expect(shell.querySelector('.to-header')!.getBoundingClientRect().top).toBe(0);
  expect(window.scrollY).toBe(0);
  shell.querySelector<HTMLElement>('to-home')!.style.minHeight = '';
  await page.viewport(414, 896);
});

test('the title, focused, opens a wide row: the automatic name chosen whole, Enter keeps what is typed', async () => {
  const shell = await mount('#/v1/write');
  await until(() => !!shell.querySelector('to-write-editor'));
  const header = shell.querySelector<HTMLElement>('.to-header')!;
  const field = shell.querySelector<HTMLInputElement>('input.to-title')!;
  const small = field.getBoundingClientRect();
  expect(header.classList.contains('titling')).toBe(false);
  field.focus();
  await until(() => header.classList.contains('titling'));
  await tick(300);
  const r = field.getBoundingClientRect();
  expect(css(r.height)).toBeCloseTo(44, 0);
  expect(css(parseFloat(getComputedStyle(field).fontSize))).toBeCloseTo(20, 1);
  expect(r.width).toBeGreaterThan(small.width + 40);
  expect(r.top).toBeGreaterThanOrEqual(small.bottom);
  // Across the header, from one margin to the other; the rest stays on the first row.
  expect(r.width).toBeGreaterThanOrEqual(header.clientWidth - 2 * 16 - 1);
  expect(shell.querySelector('.to-share')!.getBoundingClientRect().bottom).toBeLessThanOrEqual(r.top);
  expect(css(header.getBoundingClientRect().height)).toBeCloseTo(56 + 8 + 44, 0);
  expect(field.value).toBe(`New Document ${localDay()} #1`);
  expect(field.value.slice(field.selectionStart!, field.selectionEnd!)).toBe(field.value);

  await userEvent.keyboard('Minutes{Enter}');
  await until(() => !header.classList.contains('titling'));
  expect(document.activeElement).not.toBe(field);
  await shell.updateComplete;
  expect(shell.querySelector<HTMLInputElement>('input.to-title')!.value).toBe('Minutes');
  expect((shell as unknown as { doc: string }).doc).toContain('title: Minutes');
});

test('Escape puts back the title it had and closes the row; a tap elsewhere closes it too', async () => {
  const shell = await mount(`#/v1/write/${encodeDoc('---\ntitle: Plans\n---\nWords.\n')}`);
  await until(() => !!shell.querySelector('to-write-editor'));
  const header = shell.querySelector<HTMLElement>('.to-header')!;
  const field = shell.querySelector<HTMLInputElement>('input.to-title')!;
  field.focus();
  await until(() => header.classList.contains('titling'));
  // A name given is not chosen whole: the caret goes where it is put.
  expect(field.selectionEnd! - field.selectionStart!).toBe(0);
  await userEvent.keyboard('{Control>}a{/Control}Something else{Escape}');
  await until(() => !header.classList.contains('titling'));
  expect(field.value).toBe('Plans');
  expect((shell as unknown as { doc: string }).doc).toContain('title: Plans');

  field.focus();
  await until(() => header.classList.contains('titling'));
  field.blur();
  await until(() => !header.classList.contains('titling'));
  await tick(300);
  expect(css(header.getBoundingClientRect().height)).toBeCloseTo(56, 0);
});

// On a desktop the document has the window, not a 1080px column (Paul, 2026-10-10): the editor's main and its bar
// span it, the gutter the only inset; the Word Processor's paper runs edge to edge, its words at the page's measure.
test('desktop: the editor has the window; the bar starts at the gutter and holds still as the column scrolls', async () => {
  await page.viewport(1280, 800);
  const shell = await long();
  const main = column(shell);
  const bar = shell.querySelector<HTMLElement>('to-write-editor to-bar')!;
  expect(main.getBoundingClientRect().width).toBe(document.documentElement.clientWidth);
  expect(Math.round(main.getBoundingClientRect().left)).toBe(0);
  // The bar's box spans the window; what is on it starts at the gutter.
  expect(Math.round(bar.getBoundingClientRect().left)).toBe(0);
  expect(Math.round(bar.getBoundingClientRect().width)).toBe(document.documentElement.clientWidth);
  expect(Math.round(css((bar.firstElementChild as HTMLElement).getBoundingClientRect().left))).toBe(16);
  expect(document.documentElement.scrollWidth).toBe(document.documentElement.clientWidth);
  const top = bar.getBoundingClientRect().top;
  await scrollTo(shell, 1200);
  expect(bar.getBoundingClientRect().top).toBe(top);
  expect(bar.getBoundingClientRect().right).toBeLessThanOrEqual(document.documentElement.clientWidth + 0.5);
  await page.viewport(414, 896);
});

test('desktop: the paper is as wide as the window, its words no wider than the page’s measure and centred', async () => {
  await page.viewport(1280, 800);
  const shell = await long();
  const paper = shell.querySelector<HTMLElement>('.write-page')!.getBoundingClientRect();
  const words = shell.querySelector<HTMLElement>('.write-page .write-text')!.getBoundingClientRect();
  const w = document.documentElement.clientWidth;
  expect(Math.round(paper.left)).toBe(0);
  expect(Math.round(paper.width)).toBe(w);
  // A letter page is 816px with an inch (96px) each side: 624px of words, in the middle of the window.
  expect(css(words.width)).toBeLessThanOrEqual(624.5);
  expect(css(words.width)).toBeGreaterThan(600);
  expect(Math.abs(words.left + words.width / 2 - w / 2)).toBeLessThanOrEqual(1);
  await page.viewport(414, 896);
});

test('desktop: the home page keeps its column, the column scrolling the window’s width', async () => {
  await page.viewport(1600, 900);
  const shell = await mount('');
  const main = column(shell);
  expect(main.classList.contains('to-wide')).toBe(false);
  expect(getComputedStyle(document.documentElement).getPropertyValue('--to-max-w').trim()).toBe('67.5rem');
  // The box that scrolls is the window's width; what it holds, the measure less the gutter each side, in the middle.
  expect(main.getBoundingClientRect().width).toBe(document.documentElement.clientWidth);
  const home = shell.querySelector<HTMLElement>('to-home')!.getBoundingClientRect();
  expect(css(home.width)).toBeCloseTo(Math.min(1080, css(main.clientWidth)) - 2 * 16, 0);
  expect(Math.abs(home.left + home.width / 2 - main.clientWidth / 2)).toBeLessThanOrEqual(1);
  await page.viewport(414, 896);
});
