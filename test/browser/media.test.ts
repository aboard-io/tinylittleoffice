// The picture proxy in the kit: a picture from a whitelisted host shows at once, through the proxy's address;
// any other waits to be asked for; a shown one, an embedded one, a generated page's and an export's never
// ask the picture's own site.
import { test, expect, afterEach, vi } from 'vitest';
import { mount, until } from './helpers.ts';
import { encodeDoc } from '../../src/kit/codec.ts';
import { appOf } from '../../src/kit/apps.ts';
import { forgetPictures, gateHtml } from '../../src/kit/pictures.ts';
import { pictureSrc } from '../../src/kit/media.ts';
import { withPictures } from '../../src/kit/exports.ts';
import '../../src/kit/embeds.ts';
import type { ToShell } from '../../src/kit/shell.ts';

const WIKI = 'https://upload.wikimedia.org/wikipedia/commons/a/a9/Example.jpg';
const CAT = 'https://pictures.example/cat.png';
/** Nothing in the page names the picture's own site as a place to load from. */
const direct = (root: ParentNode, url: string) => root.querySelector(`img[src="${url}"], image[href="${url}"]`);

afterEach(() => {
  forgetPictures();
  history.replaceState(null, '', location.pathname);
  vi.restoreAllMocks();
});

async function write(text: string, flag = ''): Promise<ToShell> {
  const shell = await mount(`#/v1/write/${encodeDoc(text)}${flag}`);
  await until(() => !!shell.querySelector(flag ? '.to-display-page svg' : 'to-write-editor to-text .tx'));
  return shell;
}

test('in the editor: a whitelisted picture shows at once through the proxy; another host is its card, naming the host', async () => {
  const shell = await write(`![Example](${WIKI})\n\n![A cat](${CAT})\n`);
  const img = shell.querySelector<HTMLImageElement>(`to-text img[src="${pictureSrc(WIKI)}"]`)!;
  expect(img).not.toBeNull();
  expect(img.getAttribute('src')).toMatch(/^https:\/\/media\.tinylittleoffice\.com\/img\?u=/);
  expect(img.getAttribute('referrerpolicy')).toBe('no-referrer');
  const cards = shell.querySelectorAll('to-text .to-webpic');
  expect(cards).toHaveLength(1);
  expect(cards[0].textContent).toContain('pictures.example');
  expect(shell.querySelector(`img[src="${pictureSrc(CAT)}"]`)).toBeNull();
  expect(direct(shell, WIKI)).toBeNull();
  expect(direct(shell, CAT)).toBeNull();
});

test('the Display Link: the whitelisted picture drawn from the proxy at once; the other a card until tapped, then from the proxy', async () => {
  const shell = await write(`Words.\n\n![Example](${WIKI})\n\n![A cat](${CAT})\n`, '?d');
  expect(shell.querySelector(`.to-display image[href="${pictureSrc(WIKI)}"]`)).not.toBeNull();
  const card = shell.querySelector<SVGGElement>('.to-display [data-webpic]')!;
  expect(card.textContent).toContain('pictures.example');
  card.dispatchEvent(new MouseEvent('click', { bubbles: true, cancelable: true }));
  await until(() => !!shell.querySelector(`.to-display image[href="${pictureSrc(CAT)}"]`));
  expect(direct(shell, CAT)).toBeNull();
  expect(direct(shell, WIKI)).toBeNull();
});

test('a generated page (the Website Builder’s frame): pictures and the pictures its cards load come from the proxy', () => {
  const page = `<img class="pic" src="${WIKI}" alt=""><img src="${CAT}" alt=""><div class="web-pic" data-as="img" data-kind="image" data-src="${CAT}" data-title="Cat"><button class="web-load">Show</button></div><div class="web-pic" data-as="frame" data-kind="video" data-src="https://www.youtube-nocookie.com/embed/x" data-title="V"></div>`;
  const { html, hidden } = gateHtml(page);
  expect(hidden).toBe(1);
  expect(html).toContain(`src="${pictureSrc(WIKI).replace(/&/g, '&amp;')}"`);
  expect(html).toContain(`data-src="${pictureSrc(CAT)}"`);
  expect(html).toContain('data-src="https://www.youtube-nocookie.com/embed/x"');
  expect(html).not.toContain(`src="${CAT}"`);
});

test('a picture embedded by its address loads from the proxy when tapped', async () => {
  document.body.innerHTML = '';
  const el = document.createElement('to-embed');
  el.url = CAT;
  document.body.append(el);
  await el.updateComplete;
  expect(el.querySelector('img')).toBeNull();
  el.querySelector<HTMLButtonElement>('.to-embed-load')!.click();
  await el.updateComplete;
  expect(el.querySelector('img')!.getAttribute('src')).toBe(pictureSrc(CAT));
});

test('an export holds every picture’s bytes, fetched through the proxy and never from the picture’s site', async () => {
  const asked: string[] = [];
  vi.spyOn(window, 'fetch').mockImplementation(async (input) => {
    asked.push(String(input));
    return new Response(new Uint8Array([7, 7, 7]), { headers: { 'content-type': 'image/jpeg' } });
  });
  const pages = await withPictures(appOf('write')!.view(`Words.\n\n![Example](${WIKI})\n\n![A cat](${CAT})\n`));
  const svg = pages.map((p) => p.svg).join('');
  expect(asked.sort()).toEqual([pictureSrc(CAT), pictureSrc(WIKI)].sort());
  expect(svg.match(/href="data:image\/jpeg;base64,BwcH"/g)).toHaveLength(2);
  expect(svg).not.toContain('pictures.example');
});
