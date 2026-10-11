// A Display Link can be read (Paul, 2026-10-11: "Deal with the Display Link"): its text layer first, for a screen
// reader, the pages after it hidden from one; the Text button shows the words reflowed instead of the pages, and
// says so in the address ("&text"), so the link opens that way.
import { test, expect } from 'vitest';
import { mount, tick, until } from './helpers.ts';
import { apps } from '../../src/kit/apps.ts';
import { encodeDoc } from '../../src/kit/codec.ts';
import { forgetPictures } from '../../src/kit/pictures.ts';

const minutes = apps()
  .find((a) => a.id === 'write')!
  .templates.find((t) => t.id === 'minutes')!.doc;

test('the text layer comes first, the pages after it hidden from a screen reader; Text shows it and says so in the address', async () => {
  const shell = await mount(`#/v1/write/${encodeDoc(minutes)}?d`);
  await until(() => !!shell.querySelector('.to-display-page svg'));
  const main = shell.querySelector('main.to-display')!;
  const text = main.querySelector<HTMLElement>(':scope > .to-display-text')!;
  const pages = main.querySelector<HTMLElement>(':scope > .to-display-pages')!;
  expect(text).not.toBeNull();
  expect(text.compareDocumentPosition(pages) & Node.DOCUMENT_POSITION_FOLLOWING).toBeTruthy();
  for (const tag of ['h1', 'p', 'ul', 'table']) expect(text.querySelector(tag), tag).not.toBeNull();
  expect(text.querySelector('table th')!.getAttribute('scope')).toBe('col');
  expect(text.getAttribute('lang')).toBe(document.documentElement.lang);
  expect(pages.getAttribute('aria-hidden')).toBe('true');
  // Read by a screen reader, not seen: the pages are what a sighted person sees.
  expect(text.getBoundingClientRect().width).toBeLessThanOrEqual(1);
  expect(pages.getBoundingClientRect().height).toBeGreaterThan(100);
  expect(main.hasAttribute('data-spatial')).toBe(true);

  const button = shell.querySelector<HTMLButtonElement>('.to-display-mode')!;
  expect(button.textContent!.trim()).toBe('Text');
  button.click();
  await until(() => location.hash.endsWith('&text'));
  await tick();
  const shown = shell.querySelector<HTMLElement>('main.to-display > .to-display-text')!;
  expect(shown.getBoundingClientRect().width).toBeGreaterThan(200);
  expect(shell.querySelector<HTMLElement>('main.to-display > .to-display-pages')!.hidden).toBe(true);
  // Words reflow: a pinch is the size of everything, not a picture's zoom.
  expect(shell.querySelector('main.to-display')!.hasAttribute('data-spatial')).toBe(false);
  expect(shell.querySelector('.to-display-mode')!.textContent!.trim()).toBe('Pages');
  // The heading in the words is the page's, in the theme's ink, not a picture of paper.
  expect(getComputedStyle(shown.querySelector('h1')!).color).toBe(getComputedStyle(shell).color);

  // And back.
  shell.querySelector<HTMLButtonElement>('.to-display-mode')!.click();
  await until(() => !location.hash.includes('text'));
  await tick();
  expect(shell.querySelector<HTMLElement>('main.to-display > .to-display-pages')!.hidden).toBe(false);
  expect(location.hash).toMatch(/\?d$/);
});

test('"&text" in the link opens the words; the embed has no text layer', async () => {
  const shell = await mount(`#/v1/write/${encodeDoc('# Hello\n\nSome words.\n')}?d&text`);
  await until(() => !!shell.querySelector('.to-display-text h1'));
  expect(shell.querySelector<HTMLElement>('.to-display-pages')!.hidden).toBe(true);
  expect(shell.querySelector('.to-display-text p')!.textContent).toBe('Some words.');
  const embed = await mount(`#/v1/write.embed/${encodeDoc('# Hello\n')}`);
  await until(() => !!embed.querySelector('.to-display-page svg'));
  expect(embed.querySelector('.to-display-text, .to-display-mode')).toBeNull();
});

test('a picture from the web in the words waits to be asked for, as on the pages', async () => {
  forgetPictures();
  const shell = await mount(`#/v1/write/${encodeDoc('Before.\n\n![A harbour at dawn](https://example.com/harbour.jpg)\n')}?d&text`);
  await until(() => !!shell.querySelector('.to-display-text .to-webpic'));
  expect(shell.querySelector('.to-display-text img')).toBeNull();
  shell.querySelector<HTMLButtonElement>('.to-display-text .to-webpic-show')!.click();
  await until(() => !!shell.querySelector('.to-display-text img'));
  expect(shell.querySelector('.to-display-text img')!.getAttribute('alt')).toBe('A harbour at dawn');
  expect(shell.querySelector('.to-display-text img')!.getAttribute('referrerpolicy')).toBe('no-referrer');
  forgetPictures();
});

test('a spatial app reads as its own text: a diagram’s things and connections', async () => {
  const shell = await mount(`#/v1/diagram/${encodeDoc('---\nkind: net\n---\n- Shop\n- Warehouse\n~ Shop -> Warehouse: orders\n')}?d`);
  await until(() => !!shell.querySelector('.to-display-text h2'));
  expect([...shell.querySelectorAll('.to-display-text h2')].map((h) => h.textContent)).toEqual(['Shop', 'Warehouse', 'Connections']);
  expect(shell.querySelector('.to-display-text li')!.textContent).toBe('Shop → Warehouse: orders');
});

test('a link in the words behind the pages shows them when the keyboard reaches it', async () => {
  const shell = await mount(`#/v1/write/${encodeDoc('See [the site](https://example.com/).\n')}?d`);
  await until(() => !!shell.querySelector('.to-display-text a'));
  const words = shell.querySelector<HTMLElement>('.to-display-text')!;
  expect(words.getBoundingClientRect().width).toBeLessThanOrEqual(1);
  shell.querySelector<HTMLAnchorElement>('.to-display-text a')!.focus();
  await tick();
  expect(words.getBoundingClientRect().width).toBeGreaterThan(50);
});
