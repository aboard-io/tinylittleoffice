// The shell round a long document (Paul, 2026-10-10): the header goes up with the page, the menu button stays at the
// top left, fixed, and the app's bar sticks at the top once the header has gone, moving over to make room for the
// button; a short link's banner sticks small under the bar. And the title, tapped, opens a row of its own across
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
  window.scrollTo(0, 0);
  history.replaceState(null, '', location.pathname);
});

const LONG = `---\ntitle: Long\n---\n${Array.from({ length: 60 }, (_, i) => `Paragraph ${i + 1}, long enough to take a line or two of the page.`).join('\n\n')}\n`;
const frame = () => new Promise<void>((r) => requestAnimationFrame(() => requestAnimationFrame(() => r())));
async function long(shell?: ToShell, hash = `#/v1/write/${encodeDoc(LONG)}`) {
  const s = shell ?? (await mount(hash));
  await until(() => !!s.querySelector('to-write-editor to-bar') && document.documentElement.scrollHeight > innerHeight * 2);
  return s;
}
/** The page scrolled to `y`, and the shell's frame after it. */
async function scrollTo(shell: ToShell, y: number) {
  window.scrollTo(0, y);
  window.dispatchEvent(new Event('scroll'));
  await frame();
  await shell.updateComplete;
  await frame();
}

test('the header scrolls with the page, the bar sticks, the menu button is fixed', async () => {
  await page.viewport(390, 700);
  const shell = await long();
  const header = shell.querySelector<HTMLElement>('.to-header')!;
  const bar = shell.querySelector<HTMLElement>('to-write-editor to-bar')!;
  const burger = shell.querySelector<HTMLElement>('.to-burger')!;
  expect(getComputedStyle(header).position).not.toBe('sticky');
  expect(getComputedStyle(header).position).not.toBe('fixed');
  expect(getComputedStyle(bar).position).toBe('sticky');
  expect(getComputedStyle(bar).top).toBe('0px');
  expect(getComputedStyle(burger).position).toBe('fixed');
  expect(shell.hasAttribute('scrolled')).toBe(false);

  // Past the header: it is off the screen, the bar at the top, the button over it on a card and the bar moved over for it.
  await scrollTo(shell, header.offsetHeight + 300);
  await until(() => shell.hasAttribute('scrolled'));
  await tick(300);
  expect(header.getBoundingClientRect().bottom).toBeLessThanOrEqual(0);
  expect(Math.round(bar.getBoundingClientRect().top)).toBe(0);
  const b = burger.getBoundingClientRect();
  expect(b.top).toBeGreaterThanOrEqual(0);
  expect(b.bottom).toBeLessThanOrEqual(bar.getBoundingClientRect().bottom);
  expect(bar.getBoundingClientRect().left).toBeGreaterThanOrEqual(b.right - 0.5);
  expect(getComputedStyle(burger).boxShadow).not.toBe('none');
  // The strip behind the stuck bar is as tall as the bar, across the screen (measured on the screen, drawn under the zoom).
  expect(shell.style.getPropertyValue('--to-stuck-h')).toBe(`${Math.round(bar.getBoundingClientRect().height)}px`);
  const strip = getComputedStyle(shell, '::before');
  expect(strip.position).toBe('fixed');
  expect(parseFloat(strip.height)).toBeCloseTo(bar.offsetHeight, 0);

  // Back to the top: the header is there again, and the bar where it was.
  await scrollTo(shell, 0);
  await until(() => !shell.hasAttribute('scrolled'));
  await tick(300);
  expect(Math.round(header.getBoundingClientRect().top)).toBe(0);
  expect(Math.round(bar.getBoundingClientRect().left)).toBe(0);
  await page.viewport(414, 896);
});

test('a short link’s banner: under the header at first, small and stuck under the bar once the header has gone', async () => {
  const now = new Date('2026-10-09T12:00:00Z').getTime();
  vi.useFakeTimers({ toFake: ['Date'], now });
  const shell = await long(undefined, `#/v1/write/${encodeDoc(LONG)}?s=abcdefg&x=${now + 3 * 86_400_000}`);
  const banner = shell.querySelector<HTMLElement>('.to-arrival')!;
  const header = shell.querySelector<HTMLElement>('.to-header')!;
  expect(Math.round(banner.getBoundingClientRect().top)).toBe(Math.round(header.getBoundingClientRect().bottom));
  await scrollTo(shell, 1200);
  await until(() => shell.hasAttribute('scrolled') && banner.classList.contains('small'));
  await frame();
  const bar = shell.querySelector<HTMLElement>('to-write-editor to-bar')!;
  expect(Math.round(bar.getBoundingClientRect().top)).toBe(0);
  expect(Math.round(banner.getBoundingClientRect().top)).toBe(Math.round(bar.getBoundingClientRect().bottom));
});

test('the home page: the header simply scrolls, nothing is stuck', async () => {
  await page.viewport(390, 500);
  const shell = await mount('');
  // (Room to scroll, whatever the home page holds today.)
  shell.querySelector<HTMLElement>('.to-main')!.style.minHeight = '2000px';
  await scrollTo(shell, 200);
  await until(() => shell.hasAttribute('scrolled'));
  expect(shell.querySelector('.to-header')!.getBoundingClientRect().bottom).toBeLessThanOrEqual(0);
  expect(getComputedStyle(shell.querySelector('.to-burger')!).position).toBe('fixed');
  shell.querySelector<HTMLElement>('.to-main')!.style.minHeight = '';
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
test('desktop: the editor has the window; the bar starts at the gutter and makes room for the menu once stuck', async () => {
  await page.viewport(1280, 800);
  const shell = await long();
  const main = shell.querySelector<HTMLElement>('.to-main')!;
  const bar = shell.querySelector<HTMLElement>('to-write-editor to-bar')!;
  expect(main.getBoundingClientRect().width).toBe(document.documentElement.clientWidth);
  expect(Math.round(main.getBoundingClientRect().left)).toBe(0);
  // The bar's box spans the window; what is on it starts at the gutter.
  expect(Math.round(bar.getBoundingClientRect().left)).toBe(0);
  expect(Math.round(bar.getBoundingClientRect().width)).toBe(document.documentElement.clientWidth);
  expect(Math.round(css((bar.firstElementChild as HTMLElement).getBoundingClientRect().left))).toBe(16);
  expect(document.documentElement.scrollWidth).toBe(document.documentElement.clientWidth);

  await scrollTo(shell, 1200);
  await until(() => shell.hasAttribute('scrolled'));
  await tick(300);
  const b = shell.querySelector<HTMLElement>('.to-burger')!.getBoundingClientRect();
  expect(Math.round(bar.getBoundingClientRect().top)).toBe(0);
  expect(bar.getBoundingClientRect().left).toBeGreaterThanOrEqual(b.right - 0.5);
  expect(bar.getBoundingClientRect().right).toBeLessThanOrEqual(document.documentElement.clientWidth + 0.5);
  await scrollTo(shell, 0);
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

test('desktop: the home page keeps its column', async () => {
  await page.viewport(1280, 800);
  const shell = await mount('');
  const main = shell.querySelector<HTMLElement>('.to-main')!;
  expect(main.classList.contains('to-wide')).toBe(false);
  expect(getComputedStyle(document.documentElement).getPropertyValue('--to-max-w').trim()).toBe('67.5rem');
  expect(css(parseFloat(getComputedStyle(main).maxWidth))).toBeCloseTo(1080, 1);
  expect(css(main.getBoundingClientRect().width)).toBeLessThanOrEqual(1080);
  await page.viewport(414, 896);
});
