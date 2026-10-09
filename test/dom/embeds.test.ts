// A thing from the web as a card: nothing is asked of anyone before the tap; after it, the browser's own element for a
// sound, a film, a PDF or a picture, a sandboxed frame for the rest, a summary for Wikipedia, and a plain link where
// nothing embeds (lib/embeds.ts, the <to-embed> card in kit/browser.ts).
import { test, expect, vi, afterEach } from 'vitest';
import { mount } from './helpers.ts';
import { settleAll } from './helpers-more.ts';
import { webRef } from '../../src/lib/embeds.ts';

const fetched = vi.spyOn(globalThis, 'fetch');
afterEach(() => fetched.mockReset());

/** The card for an address, on the page, drawn. */
async function card(url: string) {
  document.body.innerHTML = '';
  const el = document.createElement('to-embed');
  el.setAttribute('ref', webRef(url));
  document.body.append(el);
  await settleAll();
  const root = el.shadowRoot!;
  return { el, root, $: (sel: string) => root.querySelector(sel), load: () => root.querySelector<HTMLButtonElement>('button.load') };
}

test('a sound, a film and a PDF by their addresses: the card first, with no request; tapped, the browser plays or shows the file itself', async () => {
  const sound = await card('https://example.org/talks/keynote.mp3');
  expect(sound.root.textContent).toContain('example.org');
  expect(sound.$('audio, video, iframe, img')).toBeNull();
  expect(sound.load()!.textContent).toContain('Play (loads it from example.org)');
  sound.load()!.click();
  await settleAll();
  const audio = sound.$('audio')!;
  expect(audio).toBeTruthy();
  expect([audio.getAttribute('src'), audio.getAttribute('preload'), audio.hasAttribute('controls')]).toEqual(['https://example.org/talks/keynote.mp3', 'none', true]);
  expect(sound.$('iframe')).toBeNull();
  // The link under it goes to the file, not to an editor.
  expect(sound.$('figcaption a')!.getAttribute('href')).toBe('https://example.org/talks/keynote.mp3');

  const film = await card('https://example.org/film.mp4');
  expect(film.$('video')).toBeNull();
  film.load()!.click();
  await settleAll();
  const video = film.$('video')!;
  expect([video.getAttribute('src'), video.getAttribute('preload'), video.hasAttribute('controls'), video.hasAttribute('playsinline')]).toEqual(['https://example.org/film.mp4', 'none', true, true]);

  const paper = await card('https://example.org/papers/report.pdf');
  expect(paper.load()!.textContent).toContain('Show (loads it from example.org)');
  paper.load()!.click();
  await settleAll();
  const frame = paper.$('iframe')!;
  expect([frame.getAttribute('src'), frame.getAttribute('class'), frame.getAttribute('referrerpolicy')]).toEqual(['https://example.org/papers/report.pdf', 'pdf', 'no-referrer']);
  expect(frame.getAttribute('sandbox')).toContain('allow-scripts');
  expect(frame.getAttribute('sandbox')).not.toContain('allow-top-navigation');
  // No element asked anyone for anything on this page's behalf.
  expect(fetched).not.toHaveBeenCalled();
});

test('a post from the fediverse, a song and a place are frames from their own hosts, sized for what they are', async () => {
  const toot = await card('https://mastodon.social/@Gargron/100254563928908049');
  expect(toot.root.textContent).toContain('Mastodon');
  toot.load()!.click();
  await settleAll();
  expect([toot.$('iframe')!.getAttribute('src'), toot.$('iframe')!.getAttribute('class')]).toEqual(['https://mastodon.social/@Gargron/100254563928908049/embed', 'post']);

  const song = await card('https://open.spotify.com/track/4uLU6hMCjMI75M1A2tKUQC');
  expect(song.load()!.textContent).toContain('Play (loads it from Spotify)');
  song.load()!.click();
  await settleAll();
  expect(song.$('iframe')!.getAttribute('style')).toContain('height:152px');

  const place = await card('https://www.openstreetmap.org/#map=15/51.5007/-0.1246');
  place.load()!.click();
  await settleAll();
  expect(place.$('iframe')!.getAttribute('src')).toMatch(/^https:\/\/www\.openstreetmap\.org\/export\/embed\.html\?bbox=/);
  expect(fetched).not.toHaveBeenCalled();
});

test('a Wikipedia article: tapped, the card asks for the summary and shows it, with a way to read on; unanswered, it links there', async () => {
  fetched.mockResolvedValueOnce(new Response(JSON.stringify({ title: 'Ada Lovelace', extract: 'Ada Lovelace was an English mathematician.', thumbnail: { source: 'https://upload.wikimedia.org/ada.jpg' } }), { status: 200 }));
  const ada = await card('https://en.wikipedia.org/wiki/Ada_Lovelace');
  expect(fetched).not.toHaveBeenCalled();
  expect(ada.$('iframe, .summary')).toBeNull();
  ada.load()!.click();
  await settleAll();
  expect(fetched).toHaveBeenCalledTimes(1);
  expect(fetched.mock.calls[0][0]).toBe('https://en.wikipedia.org/api/rest_v1/page/summary/Ada_Lovelace');
  expect((fetched.mock.calls[0][1] as RequestInit).referrerPolicy).toBe('no-referrer');
  expect(ada.$('.summary')!.textContent).toContain('Ada Lovelace was an English mathematician.');
  expect(ada.$('.summary img')!.getAttribute('src')).toBe('https://upload.wikimedia.org/ada.jpg');
  expect(ada.$('.summary a')!.textContent).toBe('Read on Wikipedia');
  expect(ada.$('iframe')).toBeNull();

  fetched.mockRejectedValueOnce(new Error('offline'));
  const off = await card('https://en.wikipedia.org/wiki/Ada_Lovelace');
  off.load()!.click();
  await settleAll();
  expect(off.$('.summary')).toBeNull();
  expect(off.$('a.load')!.textContent).toContain('Open on Wikipedia');
  expect(off.$('a.load')!.getAttribute('href')).toBe('https://en.wikipedia.org/wiki/Ada_Lovelace');
});

test('where nothing embeds without the provider\'s script, the card is the way there', async () => {
  const gram = await card('https://www.instagram.com/p/C1a2b3c4d5e/');
  expect(gram.load()).toBeNull();
  const open = gram.$('a.load')!;
  expect(open.textContent).toContain('Open on Instagram');
  expect([open.getAttribute('href'), open.getAttribute('target'), open.getAttribute('rel')]).toEqual(['https://www.instagram.com/p/C1a2b3c4d5e/', '_blank', 'noopener noreferrer']);
  expect(gram.root.textContent).toContain('p/C1a2b3c4d5e');
  expect(fetched).not.toHaveBeenCalled();
});

test('a board card that is one address from the web shows its card under the words, loaded only when tapped', async () => {
  const { el } = await mount('board', '## To do\n\n- https://youtu.be/dQw4w9WgXcQ\n- Write the spec');
  const web = el.querySelector('to-embed.board-web')!;
  expect(web).toBeTruthy();
  expect(web.getAttribute('ref')).toBe('web\nhttps://youtu.be/dQw4w9WgXcQ');
  expect(web.shadowRoot!.textContent).toContain('YouTube');
  expect(web.shadowRoot!.querySelector('iframe')).toBeNull();
  expect(el.querySelectorAll('to-embed')).toHaveLength(1);
  web.shadowRoot!.querySelector<HTMLButtonElement>('button.load')!.click();
  await settleAll();
  expect(web.shadowRoot!.querySelector('iframe')!.getAttribute('src')).toBe('https://www.youtube-nocookie.com/embed/dQw4w9WgXcQ');
  // (The editor fetches its own things; nothing of YouTube's.)
  for (const [url] of fetched.mock.calls) expect(String(url)).not.toContain('youtu');
});
