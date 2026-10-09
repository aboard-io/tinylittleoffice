// What a web address embeds: a video, a post or a picture by its address, from the provider's privacy endpoint; anything else is a link.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { embedOf, withAccount, parseWeb } from '../src/lib/embeds.ts';

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
  assert.deepEqual([pic.kind, pic.provider, pic.src, pic.title], ['image', 'example.org', 'https://example.org/photos/Sea%20view.jpg?w=800', 'Sea view.jpg']);
  assert.equal(embedOf('https://example.org/'), null);
  assert.equal(embedOf('https://youtube.com/'), null);
  assert.equal(embedOf('see https://youtu.be/dQw4w9WgXcQ'), null);
  assert.equal(embedOf('javascript:alert(1)'), null);
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
