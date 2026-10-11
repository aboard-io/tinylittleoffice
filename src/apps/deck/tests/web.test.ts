// A thing from the web on a slide is the thing (Paul, 2026-10-11): in the editor and in the show, the live card,
// loaded on a tap and asking its provider nothing before; in the reader, a card by its kind that is a link; a picture
// that cannot be fetched is its card, never a broken glyph; a picture whose address holds brackets is a picture at
// phone width, not its Markdown; and a link in a slide's words is followed through the link guard, in the reader
// and in the show ("I also need to be able to click on links in an offered deck"), turning no slide.
import { afterEach, expect, test, vi } from 'vitest';
import { page, userEvent } from 'vitest/browser';
import '../../../styles.css';
import '../editor.ts';
import type { ToDeckEditor } from '../editor.ts';
import { mount, tick, until } from '../../../../test/browser/helpers.ts';
import { encodeDoc } from '../../../kit/codec.ts';
import { installLinkGuard } from '../../../kit/link-guard.ts';
import { forgetPictures, installPictures } from '../../../kit/pictures.ts';
import { pageSvg } from '../../../kit/draw.ts';
import { slidePage, lookOf } from '../view.ts';
import { parse } from '../../../doc/index.ts';
import { settingsOf, slidesOf } from '../model.ts';

const FILM = 'https://www.youtube.com/watch?v=eRVYwDtI2E8';
const DECK = `## The road\n\n[The neighbourhood the road replaced](${FILM})\n\n---\n\n## Before the name\n\n- The [Lenape](https://en.wikipedia.org/wiki/Lenape) called it Rananchqua\n`;

afterEach(() => {
  forgetPictures();
  document.querySelectorAll('dialog[open]').forEach((d) => (d as HTMLDialogElement).close());
  history.replaceState(null, '', location.pathname);
});

async function editor(value: string): Promise<ToDeckEditor> {
  document.body.innerHTML = '';
  const main = document.createElement('main');
  main.className = 'to-main';
  document.body.append(main);
  const el = document.createElement('to-deck-editor') as ToDeckEditor;
  el.value = value;
  main.append(el);
  await el.updateComplete;
  await until(() => !!el.querySelector('to-text.deck-title .tx'));
  return el;
}
async function guardOpen(): Promise<string> {
  await until(() => !!document.querySelector('to-dialog.to-link-guard dialog[open] .lg-host'));
  return document.querySelector('to-dialog.to-link-guard .lg-host')!.textContent!;
}
const click = (el: Element) => el.dispatchEvent(new MouseEvent('click', { bubbles: true, cancelable: true, composed: true, clientX: 900 }));

test('in the editor, a thing from the web on a slide is the live card: the title and the provider, loaded only by its tap', async () => {
  const fetches = vi.spyOn(window, 'fetch');
  const el = await editor(DECK);
  const card = el.querySelector('.deck-sub.web to-embed')!;
  expect(card).toBeTruthy();
  await (card as HTMLElement & { updateComplete: Promise<unknown> }).updateComplete;
  expect(card.querySelector('.to-embed-what b')!.textContent).toBe('The neighbourhood the road replaced');
  expect(card.querySelector('.to-embed-what small')!.textContent).toBe('YouTube');
  expect(card.querySelector('iframe')).toBeNull();
  expect(el.querySelector('.deck-sub > svg')).toBeNull();
  card.querySelector<HTMLButtonElement>('button.to-embed-load')!.click();
  await until(() => !!card.querySelector('iframe'));
  expect(card.querySelector('iframe')!.src).toBe('https://www.youtube-nocookie.com/embed/eRVYwDtI2E8');
  // The tap was the card's: the slide's menu stayed shut, and nothing was asked of anyone.
  await tick(30);
  expect(document.querySelector('to-menu.deck-submenu [popover]:popover-open')).toBeNull();
  expect(fetches).not.toHaveBeenCalled();
  fetches.mockRestore();
});

test("in the editor, Enter on the live card's button is the button's: it loads the card and opens no menu", async () => {
  const el = await editor(DECK);
  const card = el.querySelector<HTMLElement & { updateComplete: Promise<unknown> }>('.deck-sub.web to-embed')!;
  await card.updateComplete;
  const load = card.querySelector<HTMLButtonElement>('button.to-embed-load')!;
  load.focus();
  await userEvent.keyboard('{Enter}');
  await until(() => !!card.querySelector('iframe'));
  await tick(30);
  expect(document.querySelector('to-menu.deck-submenu [popover]:popover-open')).toBeNull();
});

/** The slide's menu, Change the address…, a new address given and OK: the Markdown written. */
async function readdress(value: string, url: string): Promise<string> {
  const el = await editor(value);
  const changes: string[] = [];
  el.addEventListener('docchange', (e) => changes.push((e as CustomEvent<string>).detail));
  el.querySelector<HTMLElement>('figure.deck-sub')!.click();
  await until(() => !!document.querySelector('to-menu.deck-submenu [popover]:popover-open [role^=menuitem]'));
  const items = [...document.querySelectorAll<HTMLElement>('to-menu.deck-submenu [popover]:popover-open [role^=menuitem]')];
  expect(items[0].textContent!.trim()).toBe('Change the address…');
  items[0].click();
  await until(() => !!document.querySelector('.to-ask-embed dialog[open]'));
  const box = document.querySelector<HTMLInputElement>('.to-ask-embed .to-ask-url')!;
  box.value = url;
  box.dispatchEvent(new Event('input', { bubbles: true }));
  await tick();
  document.querySelector<HTMLButtonElement>('.to-ask-embed .to-ask-ok')!.click();
  await until(() => changes.length > 0);
  return changes.at(-1)!;
}
const OTHER = 'https://www.youtube.com/watch?v=dQw4w9WgXcQ';

test('a new address for a titled thing from the web keeps the title its author gave the old one; a bare address stays bare', async () => {
  const titled = parse(await readdress(DECK, OTHER)).blocks.find((b) => b.k === 'p');
  expect(titled).toEqual({ k: 'p', runs: [{ t: 'The neighbourhood the road replaced', href: OTHER }] });
  const bare = parse(await readdress(`## The road\n\n${FILM}\n`, OTHER)).blocks.find((b) => b.k === 'p');
  expect(bare).toEqual({ k: 'p', runs: [{ t: OTHER }] });
});

test('presenting, the live card is over the slide: a tap loads it and turns no slide, the arrows still turn', async () => {
  const el = await editor(DECK);
  el.show(0);
  await el.updateComplete;
  await until(() => !!el.querySelector('.deck-show .frame .deck-live to-embed .to-embed-load'));
  const live = el.querySelector<HTMLElement>('.deck-show .frame .deck-live to-embed')!;
  const load = live.querySelector<HTMLButtonElement>('button.to-embed-load')!;
  load.click();
  await until(() => !!live.querySelector('iframe'));
  await el.updateComplete;
  expect(el.showing).toBe(0);
  expect(el.querySelector('.deck-show .pos')!.textContent).toBe('1 / 3');
  // Enter on the card's button is the button's; the right arrow turns the slide.
  load.dispatchEvent(new KeyboardEvent('keydown', { key: 'Enter', bubbles: true }));
  await el.updateComplete;
  expect(el.showing).toBe(0);
  window.dispatchEvent(new KeyboardEvent('keydown', { key: 'ArrowRight', bubbles: true }));
  await el.updateComplete;
  expect(el.showing).toBe(1);
  // A tap elsewhere on the slide still goes on: the next line of this one.
  click(el.querySelector('.deck-show .frame svg')!);
  await el.updateComplete;
  expect(el.shown).toBe(1);
});

test('presenting, a link in the words is followed through the link guard, naming its site, and turns no slide', async () => {
  installLinkGuard();
  const el = await editor(DECK);
  el.show(1, 1);
  await el.updateComplete;
  await until(() => !!el.querySelector('.deck-show .frame svg a[href="https://en.wikipedia.org/wiki/Lenape"]'));
  const a = el.querySelector('.deck-show .frame svg a[href="https://en.wikipedia.org/wiki/Lenape"]')!;
  const open = vi.spyOn(window, 'open').mockImplementation(() => null);
  click(a.querySelector('tspan')!);
  expect(await guardOpen()).toBe('en.wikipedia.org');
  await el.updateComplete;
  expect(el.showing).toBe(1);
  expect(open).not.toHaveBeenCalled();
  open.mockRestore();
});

test('in the reader, a link in the words and the card of a film are links, followed through the link guard', async () => {
  const shell = await mount(`#/v1/deck/${encodeDoc(DECK)}?d`);
  await until(() => shell.querySelectorAll('.to-display-page svg').length >= 2);
  const link = shell.querySelector('.to-display-page svg a[href="https://en.wikipedia.org/wiki/Lenape"]')!;
  expect(link.getAttribute('target')).toBe('_blank');
  click(link.querySelector('tspan')!);
  expect(await guardOpen()).toBe('en.wikipedia.org');
  document.querySelector<HTMLButtonElement>('to-dialog.to-link-guard .lg-cancel')!.click();
  await until(() => !document.querySelector('to-dialog.to-link-guard dialog[open]'));
  const film = shell.querySelector('.to-display-page svg a[data-kind="video"]')!;
  expect(film.getAttribute('href')).toBe(FILM);
  expect(film.textContent).toContain('The neighbourhood the road');
  expect(film.textContent).not.toContain('youtube.com');
  click(film.querySelector('rect')!);
  expect(await guardOpen()).toBe('www.youtube.com');
});

test('a picture that cannot be fetched is its card, never a broken glyph; one that comes hides its card', async () => {
  installPictures();
  document.body.innerHTML = '';
  const draw = (url: string) => {
    const doc = parse(`## Pic\n\n![Opening day, 1923](${url})\n`);
    const div = document.createElement('div');
    document.body.append(div);
    div.innerHTML = pageSvg(slidePage(doc, slidesOf(doc)[0], lookOf(settingsOf(doc))));
    return div;
  };
  const gone = draw('/no-such-picture.jpg');
  const came = draw('/a-picture-that-comes.jpg');
  await until(() => gone.querySelector('image')!.getAttribute('visibility') === 'hidden');
  expect(gone.querySelector('[data-pic-card]')!.getAttribute('visibility')).toBeNull();
  expect(gone.querySelector('[data-pic-card]')!.textContent).toContain('Opening day, 1923');
  // (A picture's load, as the browser says it: a headless page does not always paint one to load.)
  const img = came.querySelector('image')!;
  // The stand-in pixel of a picture not yet near the screen (kit/pictures.ts watchPictures) is not the picture: the card stays.
  img.setAttribute('data-src', '/a-picture-that-comes.jpg');
  img.dispatchEvent(new Event('load'));
  expect(came.querySelector('[data-pic-card]')!.getAttribute('visibility')).toBeNull();
  img.removeAttribute('data-src');
  img.removeAttribute('visibility');
  img.dispatchEvent(new Event('load'));
  expect(came.querySelector('[data-pic-card]')!.getAttribute('visibility')).toBe('hidden');
  expect(came.querySelector('image')!.getAttribute('visibility')).toBeNull();
});

test('at phone width, a picture whose address holds brackets is the picture on the slide, not its Markdown in the words', async () => {
  await page.viewport(390, 844);
  try {
    const el = await editor('## Opening day\n\n![Opening day, 1923](https://upload.wikimedia.org/x/Opening_Day_(baseball)_1.jpg)\n');
    expect(el.querySelector('.deck-sub > svg')).toBeTruthy();
    expect(el.querySelector('to-text.deck-words')).toBeNull();
    expect(el.querySelector('.deck-canvas')!.textContent).not.toContain('![');
    // The rail's thumbnail draws no Markdown either.
    expect(el.querySelector('.deck-thumb svg')!.textContent).not.toContain('](');
  } finally {
    await page.viewport(1100, 800);
  }
});
