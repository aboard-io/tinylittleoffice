// What a web address embeds: a video, a post or a picture by its address, from the provider's privacy endpoint; anything else is a link.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { embedOf, withAccount, parseWeb, KNOWN, LOOKUP_HOST } from '../src/lib/embeds.ts';

test('embeds: videos, posts and pictures are known by their addresses; everything else is a link', () => {
  const yt = embedOf('https://www.youtube.com/watch?v=dQw4w9WgXcQ&t=43s')!;
  assert.deepEqual([yt.kind, yt.provider, yt.src], ['video', 'YouTube', 'https://www.youtube-nocookie.com/embed/dQw4w9WgXcQ']);
  assert.equal(embedOf('https://youtu.be/dQw4w9WgXcQ')!.src, yt.src);
  assert.equal(embedOf('https://youtube.com/shorts/dQw4w9WgXcQ')!.src, yt.src);
  assert.equal(embedOf('https://vimeo.com/76979871')!.src, 'https://player.vimeo.com/video/76979871?dnt=1');
  const sky = embedOf('https://bsky.app/profile/ftrain.com/post/3kqz2abcde2a')!;
  assert.deepEqual([sky.kind, sky.provider, sky.src, sky.title], ['post', 'Bluesky', 'https://embed.bsky.app/embed/ftrain.com/app.bsky.feed.post/3kqz2abcde2a', '@ftrain.com']);
  // Bluesky's embed wants the account's id, not the handle: the handle is looked up (on the tap), a post given by id needs no lookup.
  assert.equal(sky.lookup, 'https://public.api.bsky.app/xrpc/com.atproto.identity.resolveHandle?handle=ftrain.com');
  const named = withAccount(sky, 'did:plc:abc123');
  assert.equal(named.src, 'https://embed.bsky.app/embed/did:plc:abc123/app.bsky.feed.post/3kqz2abcde2a');
  assert.equal(named.lookup, undefined);
  const byId = embedOf('https://bsky.app/profile/did:plc:abc123/post/3kqz2abcde2a')!;
  assert.equal(byId.lookup, undefined);
  assert.equal(byId.src, named.src);
  assert.deepEqual(parseWeb('---\nalt: The sea\n---\nhttps://example.org/sea.jpg'), { url: 'https://example.org/sea.jpg', alt: 'The sea', embed: embedOf('https://example.org/sea.jpg') });
  const x = embedOf('https://x.com/ftrain/status/1234567890')!;
  assert.deepEqual([x.provider, x.src], ['X', 'https://platform.twitter.com/embed/Tweet.html?id=1234567890&dnt=true']);
  assert.equal(embedOf('https://twitter.com/ftrain/status/1234567890')!.src, x.src);
  const pic = embedOf('https://example.org/photos/Sea%20view.jpg?w=800')!;
  assert.deepEqual([pic.kind, pic.provider, pic.src, pic.title, pic.file], ['image', 'example.org', 'https://example.org/photos/Sea%20view.jpg?w=800', 'Sea view.jpg', true]);
  assert.equal(embedOf('https://example.org/'), null);
  assert.equal(embedOf('https://youtube.com/'), null);
  assert.equal(embedOf('see https://youtu.be/dQw4w9WgXcQ'), null);
  assert.equal(embedOf('javascript:alert(1)'), null);
});

/** Every provider: the address as people paste it, and what it becomes (kind, provider, what is loaded, the card's words). */
const TABLE: [string, string, string, string, string, number?][] = [
  // Native: the browser's own elements, the file itself, its host for a provider.
  ['https://example.org/talks/Keynote%202025.mp3', 'audio', 'example.org', 'https://example.org/talks/Keynote%202025.mp3', 'Keynote 2025.mp3'],
  ['https://cdn.example.org/a.flac?dl=1', 'audio', 'cdn.example.org', 'https://cdn.example.org/a.flac?dl=1', 'a.flac'],
  ['https://example.org/film.mp4', 'video', 'example.org', 'https://example.org/film.mp4', 'film.mp4'],
  ['https://example.org/clip.webm#t=10', 'video', 'example.org', 'https://example.org/clip.webm#t=10', 'clip.webm'],
  ['https://example.org/papers/report.pdf', 'pdf', 'example.org', 'https://example.org/papers/report.pdf', 'report.pdf'],
  ['https://example.org/logo.svg', 'image', 'example.org', 'https://example.org/logo.svg', 'logo.svg'],
  // Videos.
  ['https://m.youtube.com/watch?feature=share&v=dQw4w9WgXcQ', 'video', 'YouTube', 'https://www.youtube-nocookie.com/embed/dQw4w9WgXcQ', 'Video dQw4w9WgXcQ'],
  ['https://www.youtube.com/live/dQw4w9WgXcQ?si=x', 'video', 'YouTube', 'https://www.youtube-nocookie.com/embed/dQw4w9WgXcQ', 'Video dQw4w9WgXcQ'],
  ['https://vimeo.com/video/76979871', 'video', 'Vimeo', 'https://player.vimeo.com/video/76979871?dnt=1', 'Video 76979871'],
  ['https://archive.org/details/Sita_Sings_the_Blues', 'video', 'Internet Archive', 'https://archive.org/embed/Sita_Sings_the_Blues', 'Sita_Sings_the_Blues'],
  ['https://archive.org/details/78_a-tisket-a-tasket_1938', 'video', 'Internet Archive', 'https://archive.org/embed/78_a-tisket-a-tasket_1938', '78_a-tisket-a-tasket_1938'],
  ['https://framatube.org/w/9c9de5e8-0a1e-484a-b099-e80766180a6d', 'video', 'PeerTube', 'https://framatube.org/videos/embed/9c9de5e8-0a1e-484a-b099-e80766180a6d', 'Video 9c9de5e8-0a1e-484a-b099-e80766180a6d'],
  ['https://tube.example.org/videos/watch/aBcDeFgHiJ', 'video', 'PeerTube', 'https://tube.example.org/videos/embed/aBcDeFgHiJ', 'Video aBcDeFgHiJ'],
  // Pages and posts.
  ['https://web.archive.org/web/20090101000000/http://ftrain.com/', 'page', 'Wayback Machine', 'https://web.archive.org/web/20090101000000/http://ftrain.com/', 'ftrain.com/'],
  ['https://mastodon.social/@Gargron/100254563928908049', 'post', 'Mastodon', 'https://mastodon.social/@Gargron/100254563928908049/embed', '@Gargron@mastodon.social'],
  ['https://mastodon.social/users/Gargron/statuses/100254563928908049', 'post', 'Mastodon', 'https://mastodon.social/@Gargron/100254563928908049/embed', '@Gargron@mastodon.social'],
  ['https://hachyderm.io/@someone@other.example/112345678901234567', 'post', 'Mastodon', 'https://hachyderm.io/@someone@other.example/112345678901234567/embed', '@someone@hachyderm.io'],
  ['https://old.reddit.com/r/typography/comments/1abc2de/the_best_serif/', 'post', 'Reddit', 'https://embed.reddit.com/r/typography/comments/1abc2de/the_best_serif/?embed=true', 'r/typography'],
  ['https://www.reddit.com/r/typography/comments/1abc2de', 'post', 'Reddit', 'https://embed.reddit.com/r/typography/comments/1abc2de/?embed=true', 'r/typography'],
  // Music.
  ['https://open.spotify.com/track/4uLU6hMCjMI75M1A2tKUQC?si=abc', 'music', 'Spotify', 'https://open.spotify.com/embed/track/4uLU6hMCjMI75M1A2tKUQC', 'Track 4uLU6hMCjMI75M1A2tKUQC', 152],
  ['https://open.spotify.com/intl-de/album/0ETFjACtuP2ADo6LFhL6HN', 'music', 'Spotify', 'https://open.spotify.com/embed/album/0ETFjACtuP2ADo6LFhL6HN', 'Album 0ETFjACtuP2ADo6LFhL6HN', 352],
  ['https://open.spotify.com/episode/5Xt5DXGzch68nYYamXrNxZ', 'music', 'Spotify', 'https://open.spotify.com/embed/episode/5Xt5DXGzch68nYYamXrNxZ', 'Episode 5Xt5DXGzch68nYYamXrNxZ', 232],
  ['https://soundcloud.com/forss/flickermood', 'music', 'SoundCloud', 'https://w.soundcloud.com/player/?url=https%3A%2F%2Fsoundcloud.com%2Fforss%2Fflickermood&visual=false', 'forss/flickermood', 166],
  // Places and code.
  ['https://www.openstreetmap.org/#map=15/51.5007/-0.1246', 'map', 'OpenStreetMap', 'https://www.openstreetmap.org/export/embed.html?bbox=-0.13998,51.49531,-0.10922,51.50609&layer=mapnik&marker=51.5007,-0.1246', '51.5007, -0.1246'],
  ['https://www.openstreetmap.org/?mlat=48.8584&mlon=2.2945#map=17/48.8584/2.2945', 'map', 'OpenStreetMap', 'https://www.openstreetmap.org/export/embed.html?bbox=2.29065,48.85698,2.29835,48.85982&layer=mapnik&marker=48.8584,2.2945', '48.8584, 2.2945'],
  ['https://codepen.io/chriscoyier/pen/NWxZKBm', 'code', 'CodePen', 'https://codepen.io/chriscoyier/embed/NWxZKBm?default-tab=result', '@chriscoyier', 400],
  ['https://en.wikipedia.org/wiki/Ada_Lovelace', 'article', 'Wikipedia', '', 'Ada Lovelace'],
  ['https://de.m.wikipedia.org/wiki/K%C3%B6ln', 'article', 'Wikipedia', '', 'Köln'],
  // Nothing embeds without the provider's own script: a card that opens it there.
  ['https://www.instagram.com/p/C1a2b3c4d5e/', 'link', 'Instagram', '', 'p/C1a2b3c4d5e'],
  ['https://www.tiktok.com/@scout2015/video/6718335390845095173', 'link', 'TikTok', '', '@scout2015/video/6718335390845095173'],
  ['https://www.threads.net/@zuck/post/C1a2b3c4d5e', 'link', 'Threads', '', '@zuck/post/C1a2b3c4d5e'],
  ['https://www.facebook.com/nasa/posts/pfbid0abc', 'link', 'Facebook', '', 'nasa/posts/pfbid0abc'],
  ['https://www.linkedin.com/posts/jane-doe_activity-7123', 'link', 'LinkedIn', '', 'posts/jane-doe_activity-7123'],
  ['https://gist.github.com/ftrain/0123456789abcdef', 'link', 'GitHub', '', 'ftrain/0123456789abcdef'],
  ['https://sufjan.bandcamp.com/album/illinois', 'link', 'Bandcamp', '', 'album/illinois'],
];

test('embeds: every provider, from the address as pasted to what is loaded, and the policy that allows it', () => {
  for (const [url, kind, provider, src, title, h] of TABLE) {
    const e = embedOf(url);
    assert.ok(e, url);
    assert.deepEqual([e.kind, e.provider, e.src, e.title, e.url], [kind, provider, src, title, url], url);
    if (h) assert.equal(e.h, h, url);
    // The thing itself, by its address: a file for the browser's own element. A card that only links: nothing to load.
    assert.equal(!!e.file, /^(audio|video|pdf|image)$/.test(kind) && provider.includes('.'), url);
    if (kind === 'link') assert.equal(e.src, '');
  }
  // Wikipedia is asked for the article's summary, on the tap, and shows that; nothing is framed.
  assert.equal(embedOf('https://en.wikipedia.org/wiki/Ada_Lovelace')!.lookup, 'https://en.wikipedia.org/api/rest_v1/page/summary/Ada_Lovelace');
  assert.equal(embedOf('https://de.m.wikipedia.org/wiki/K%C3%B6ln')!.lookup, 'https://de.wikipedia.org/api/rest_v1/page/summary/K%C3%B6ln');
  // The site's policy (public/_headers) allows exactly this: any https: frame after the tap (the fediverse is any host), sounds and films
  // by their addresses, and the two lookups.
  const csp = Object.fromEntries(
    readFileSync(new URL('../public/_headers', import.meta.url), 'utf8')
      .split('\n')
      .find((l) => l.includes('Content-Security-Policy:'))!
      .split('Content-Security-Policy:')[1]
      .split(';')
      .map((d) => d.trim().split(/\s+/))
      .map(([name, ...sources]) => [name, sources]),
  ) as Record<string, string[]>;
  const allows = (sources: string[], url: string) => sources.some((s) => s === 'https:' || s === new URL(url).origin || (s.startsWith('https://*.') && new URL(url).hostname.endsWith(s.slice(9))));
  assert.ok(csp['frame-src'].includes('https:') && !csp['frame-src'].some((s) => s.includes('youtube')), 'frame-src is any https: address, not a list of providers');
  assert.deepEqual(csp['media-src'], ['https:']);
  assert.deepEqual(csp['object-src'], ["'none'"]);
  for (const [url, kind] of TABLE) {
    const e = embedOf(url)!;
    if (e.lookup) assert.ok(allows(csp['connect-src'], e.lookup), `connect-src for ${e.lookup}`);
    if (!e.src) continue;
    if (kind === 'image') assert.ok(allows(csp['img-src'], e.src), url);
    else if (kind === 'audio' || (kind === 'video' && e.file)) assert.ok(allows(csp['media-src'], e.src), url);
    else assert.ok(allows(csp['frame-src'], e.src), url);
  }
  assert.ok(allows(csp['connect-src'], LOOKUP_HOST + '/xrpc/x'));
});

test('embeds: what is not one: an article, a profile, a TinyLittleOffice link, a root, a page that only looks like a post', () => {
  for (const url of [
    'https://www.nytimes.com/2025/01/01/technology/some-article.html',
    'https://example.org/blog/post-1',
    'https://medium.com/@someone/a-story-about-things-1a2b3c',
    'https://mastodon.social/@Gargron',
    'https://soundcloud.com/forss',
    'https://open.spotify.com/user/someone',
    'https://www.openstreetmap.org/',
    'https://www.openstreetmap.org/node/123',
    'https://en.wikipedia.org/wiki/',
    'https://www.instagram.com/',
    'https://archive.org/',
    'https://example.org/file.exe',
    'https://tinylittleoffice.com/write/#/v0/write/yAbc',
    'https://www.tinylittleoffice.com/deck/#title=A&doc=https%3A%2F%2Fyoutu.be%2FdQw4w9WgXcQ',
    'https://tinier.tinylittleoffice.com/x/abc',
    'https://tinylittleoffice.com/pictures/a.pdf',
    'ftp://example.org/a.mp3',
    'https://exa mple.org/a.mp3',
  ])
    assert.equal(embedOf(url), null, url);
  // The guide's line names every provider in the table.
  for (const name of new Set(TABLE.map((r) => r[2]).filter((p) => !p.includes('.') && !['Instagram', 'TikTok', 'Threads', 'Facebook', 'LinkedIn', 'GitHub', 'Bandcamp'].includes(p)))) assert.ok(KNOWN.includes(name), name);
});

test('embeds: a text, an outline and a deck keep such an address as itself, and read it back as the thing', async () => {
  const { parseDoc, serializeDoc } = await import('../src/lib/richtext.ts');
  const { parseOutline, serializeOutline } = await import('../src/lib/outlinemodel.ts');
  const { parseDeck, serializeDeck } = await import('../src/lib/deckmodel.ts');
  await import('../src/apps/index.ts');
  const { appOf } = await import('../src/kit/core.ts');
  const text = 'Watch:\n\nhttps://youtu.be/dQw4w9WgXcQ\n\n![The sea](https://example.org/sea.jpg)\n\nSee https://example.org/ too';
  const blocks = parseDoc(text);
  assert.deepEqual(blocks.map((b) => b.k), ['p', 'e', 'e', 'p']);
  assert.equal(blocks[1].ref, 'web\nhttps://youtu.be/dQw4w9WgXcQ');
  assert.equal(blocks[2].ref, 'web\n---\nalt: The sea\n---\nhttps://example.org/sea.jpg');
  assert.equal(serializeDoc(blocks), text);
  const items = parseOutline('- Sources\n  - https://youtu.be/dQw4w9WgXcQ\n  - A note');
  assert.deepEqual(items.map((it) => [it.depth, it.text, it.doc ?? '']), [[0, 'Sources', ''], [1, '', 'web\nhttps://youtu.be/dQw4w9WgXcQ'], [1, 'A note', '']]);
  assert.equal(serializeOutline(items), '- Sources\n  - https://youtu.be/dQw4w9WgXcQ\n  - A note');
  const deck = parseDeck('## The film\n\nhttps://vimeo.com/76979871');
  assert.equal(deck[0].sub, 'web\nhttps://vimeo.com/76979871');
  assert.deepEqual(deck[0].bullets, []);
  assert.equal(serializeDeck(deck).trim(), '## The film\n\nhttps://vimeo.com/76979871');
  // Drawn anywhere, it is a card naming the provider; the card is the hidden web app's page.
  const card = appOf('web')!.view('---\nalt: The sea\n---\nhttps://example.org/sea.jpg')[0];
  assert.ok(card.svg.includes('example.org') && card.svg.includes('The sea'));
  assert.equal(appOf('web')!.title('https://youtu.be/dQw4w9WgXcQ'), 'YouTube: Video dQw4w9WgXcQ');
  assert.ok(appOf('write')!.view(text)[0].svg.includes('YouTube'));
});

test('write: letter or A4 paper, said in the header or by the reader; a heading never sits alone at the foot of a page', async () => {
  await import('../src/apps/index.ts');
  const { pages, paperOf, PAPERS } = await import('../src/apps/write.def.ts');
  assert.equal(paperOf('---\npaper: a4\n---\n# Hi'), 'a4');
  assert.equal(paperOf('# Hi'), 'letter');
  const a4 = pages('---\npaper: a4\n---\n' + '# Heading\n\nWords.\n\n'.repeat(40));
  assert.ok(a4.length > 1 && a4.every((p) => p.w === PAPERS.a4.w && p.h === PAPERS.a4.h));
  const letter = pages('# Heading\n\nWords.\n\n'.repeat(40));
  assert.ok(letter.length > 1 && letter.every((p) => p.w === 816 && p.h === 1056));
  // More than one page: each numbered at its foot; one page is not.
  letter.forEach((p, i) => assert.ok(p.svg.includes(`>${i + 1}</text>`), `page ${i + 1} numbered`));
  assert.ok(!/>1<\/text>/.test(pages('# Hi\n\nThere')[0].svg));
  // A short text is one page, only as tall as it needs to be.
  assert.ok(pages('# Hi\n\nThere')[0].h < 400);
  // No page ends with a heading: the last text on every page but the last is not a heading's.
  for (const p of letter.slice(0, -1)) {
    const texts = [...p.svg.matchAll(/<text[^>]*>([^<]*)<\/text>/g)].map((m) => m[1]);
    assert.notEqual(texts[texts.length - 1], 'Heading');
  }
});
