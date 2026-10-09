// A web address as a thing from the web (kit/embeds.ts): which provider, what to load, what the card says; an
// ordinary link and a TinyLittleOffice link are nothing of the kind.
import { expect, test } from 'vitest';
import { embedCaption, embedOf, withAccount } from '../src/kit/embeds.ts';

test('the providers, by their addresses', () => {
  expect(embedOf('https://www.youtube.com/watch?v=dQw4w9WgXcQ')).toMatchObject({ kind: 'video', provider: 'YouTube', src: 'https://www.youtube-nocookie.com/embed/dQw4w9WgXcQ' });
  expect(embedOf('https://youtu.be/dQw4w9WgXcQ')!.src).toBe('https://www.youtube-nocookie.com/embed/dQw4w9WgXcQ');
  expect(embedOf('https://vimeo.com/123456')).toMatchObject({ kind: 'video', provider: 'Vimeo' });
  expect(embedOf('https://bsky.app/profile/alice.example/post/3k2a')).toMatchObject({ kind: 'post', provider: 'Bluesky', title: '@alice.example', lookup: expect.stringContaining('resolveHandle?handle=alice.example') });
  expect(embedOf('https://mastodon.social/@alice/112233')).toMatchObject({ kind: 'post', provider: 'Mastodon', src: 'https://mastodon.social/@alice/112233/embed' });
  expect(embedOf('https://open.spotify.com/track/abc123')).toMatchObject({ kind: 'music', provider: 'Spotify', h: 152 });
  expect(embedOf('https://www.openstreetmap.org/#map=15/51.5/-0.12')).toMatchObject({ kind: 'map', provider: 'OpenStreetMap' });
  expect(embedOf('https://en.wikipedia.org/wiki/Ada_Lovelace')).toMatchObject({ kind: 'article', provider: 'Wikipedia', title: 'Ada Lovelace', lookup: 'https://en.wikipedia.org/api/rest_v1/page/summary/Ada_Lovelace' });
  expect(embedOf('https://www.instagram.com/p/abc/')).toMatchObject({ kind: 'link', provider: 'Instagram' });
  expect(embedOf('https://example.com/song.mp3')).toMatchObject({ kind: 'audio', file: true, title: 'song.mp3' });
  expect(embedOf('https://example.com/a.pdf')).toMatchObject({ kind: 'pdf', file: true });
  expect(embedOf('https://example.com/pic.png')).toMatchObject({ kind: 'image', file: true });
});

test('what is not a thing from the web', () => {
  expect(embedOf('https://example.com/a-page')).toBeNull();
  expect(embedOf('https://tinylittleoffice.com/#/v1/sheet/rAbc')).toBeNull();
  expect(embedOf('not an address')).toBeNull();
});

test('the account id goes into a Bluesky embed; the caption names the provider or the host', () => {
  const e = embedOf('https://bsky.app/profile/alice.example/post/3k2a')!;
  expect(withAccount(e, 'did:plc:xyz').src).toBe('https://embed.bsky.app/embed/did:plc:xyz/app.bsky.feed.post/3k2a');
  expect(embedCaption('https://www.youtube.com/watch?v=dQw4w9WgXcQ')).toEqual({ provider: 'YouTube', title: 'Video dQw4w9WgXcQ' });
  expect(embedCaption('https://example.com/a-page')).toEqual({ provider: 'example.com', title: 'https://example.com/a-page' });
});
