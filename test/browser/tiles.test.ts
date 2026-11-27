// A map's tiles on the screen are asked with the site's name as the referrer (kit/draw/tiles.ts): asked as an SVG
// <image> under the page's no-referrer, OpenStreetMap answers every one with "Access blocked" (#46).
import { expect, test, vi } from 'vitest';
import { until } from './helpers.ts';
import { installTiles } from '../../src/kit/draw/tiles.ts';
import { origin } from '../../src/kit/core/network.ts';

const PNG = Uint8Array.from(atob('iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNkYPhfDwAChwGA60e6kgAAAABJRU5ErkJggg=='), (c) => c.charCodeAt(0));

test('every tile drawn, then and later, is asked once with the origin as the referrer and shown from what came; one that does not come is left', async () => {
  const asked: { url: string; init?: RequestInit }[] = [];
  const fetch = vi.spyOn(globalThis, 'fetch').mockImplementation(async (url, init) => {
    asked.push({ url: String(url), init });
    return String(url).includes('/9/') ? new Response('no', { status: 404 }) : new Response(new Blob([PNG], { type: 'image/png' }));
  });
  try {
    const tile = (z: number) => `<image href="${origin('tiles')}/${z}/1/1.png" width="256" height="256"/>`;
    document.body.innerHTML = `<svg>${tile(3)}${tile(3)}</svg>`;
    installTiles();
    const images = () => [...document.querySelectorAll('image')].map((i) => i.getAttribute('href')!);
    await until(() => images().every((h) => h.startsWith('data:image/png')));
    // Drawn later (a slide put on the page), and one the server does not give.
    document.body.insertAdjacentHTML('beforeend', `<svg>${tile(3)}${tile(4)}${tile(9)}</svg>`);
    await until(() => images().filter((h) => h.startsWith('data:')).length === 4);
    await new Promise((r) => setTimeout(r, 50));
    expect(images().at(-1)).toBe(`${origin('tiles')}/9/1/1.png`);
    expect(asked.map((a) => a.url)).toEqual([`${origin('tiles')}/3/1/1.png`, `${origin('tiles')}/4/1/1.png`, `${origin('tiles')}/9/1/1.png`]);
    for (const a of asked) expect(a.init).toMatchObject({ referrerPolicy: 'strict-origin', credentials: 'omit' });
  } finally {
    fetch.mockRestore();
    document.body.innerHTML = '';
  }
});
