// A host-kept picture in the kernel (src/doc/image.ts): an image fence read and made, never an address of the web or
// the bytes themselves, every reference a document names listed with no DOM (a server's collection and its ACLs), and
// the text layer saying a picture as its words (Paul, 2026-10-19: an image module for a host that keeps bytes; the
// site, which keeps none, has no pictures: 2026-10-11).
import { expect, test } from 'vitest';
import { IMAGE_LANG, imageBlock, imageOf, imageRefs, isImage, parse, textMarkdown, textOf, write } from '../../src/doc/index.ts';
import { lint } from '../../src/lint.ts';

test('an image fence is read: its reference, its words, its size; the size only where it is a whole number of pixels', () => {
  const [b] = parse('```image {alt="A cat on a mat" w=640 h=480}\nasset:7f3a9c\n```\n').blocks;
  expect(isImage(b)).toBe(true);
  expect(imageOf(b)).toStrictEqual({ ref: 'asset:7f3a9c', alt: 'A cat on a mat', w: 640, h: 480 });
  expect(imageOf(parse('```image {w=wide h=0}\natlas:img_7Hq\n```\n').blocks[0])).toStrictEqual({ ref: 'atlas:img_7Hq', alt: '' });
  expect(imageOf(parse('```image\n  asset:x  \n```\n').blocks[0])).toStrictEqual({ ref: 'asset:x', alt: '' });
  // Not a picture: another fence, words, a fence of no body.
  expect(imageOf(parse('```qr\nasset:x\n```\n').blocks[0])).toBeNull();
  expect(imageOf(parse('asset:x\n').blocks[0])).toBeNull();
  expect(imageOf(parse('```image\n```\n').blocks[0])).toBeNull();
  expect(imageOf(undefined)).toBeNull();
});

test('a reference is one word a host keeps: never an address of the web, never the bytes themselves', () => {
  for (const body of ['https://pictures.example/cat.png', 'http://x.y/a.jpg', 'data:image/png;base64,AAAA', 'blob:https://x.y/1', 'file:///a.png', 'JAVASCRIPT:alert(1)', 'two words', 'a\nb'])
    expect(imageOf({ k: 'fence', lang: IMAGE_LANG, body }), body).toBeNull();
  for (const body of ['asset:7f3a9c', 'atlas:img_7Hq', 'img_7Hq', '7f3a9c', 'a/b/c.png', 'cid:x']) expect(imageOf({ k: 'fence', lang: IMAGE_LANG, body })?.ref, body).toBe(body);
});

test('imageBlock writes the fence the reader reads back, its words and size as attributes, and carries another attribute along', () => {
  const b = imageBlock('asset:7f3a9c', 'A cat on a mat', 640, 480);
  expect(write({ head: {}, blocks: [b] })).toBe('```image {alt="A cat on a mat" w=640 h=480}\nasset:7f3a9c\n```\n');
  expect(imageOf(parse(write({ head: {}, blocks: [b] })).blocks[0])).toStrictEqual(imageOf(b));
  expect(imageBlock(' asset:x ')).toStrictEqual({ k: 'fence', lang: 'image', body: 'asset:x' });
  expect(imageBlock('asset:x', '', 10.4, 20.6)).toStrictEqual({ k: 'fence', lang: 'image', body: 'asset:x', a: { kv: { w: '10', h: '21' } } });
  // The words changed on a fence a host wrote a class and a caption on: those ride along, in their place after the kernel's.
  const theirs = parse('```image {#fig1 .wide alt=cat w=1 h=2 class=thumb caption="On the stoop"}\natlas:img_7Hq\n```\n').blocks[0];
  const next = imageBlock('atlas:img_7Hq', 'A cat', 1, 2, theirs.a);
  expect(write({ head: {}, blocks: [next] })).toBe('```image {#fig1 .wide alt="A cat" w=1 h=2 class=thumb caption="On the stoop"}\natlas:img_7Hq\n```\n');
});

test('imageRefs lists every reference once, in order, inside the documents a document holds too, with no DOM', () => {
  const text = [
    '# Plan',
    '```image {alt=one}\nasset:1\n```',
    '```deck\n## Slide\n\n```image {alt=two}\nasset:2\n```\n```',
    '```image\nasset:1\n```',
    '```js\nconst x = 1;\n```',
    '```image\nhttps://x.y/not-a-ref.png\n```',
  ].join('\n\n');
  expect(imageRefs(parse(text))).toStrictEqual(['asset:1', 'asset:2']);
  expect(imageRefs(parse('Words.\n'))).toStrictEqual([]);
  expect(imageRefs(parse(text).blocks)).toStrictEqual(['asset:1', 'asset:2']);
});

test('the text layer says a picture as its words, and nothing of one with none; the Markdown of it is those words', () => {
  const doc = parse('Before.\n\n```image {alt="A cat on a mat" w=640 h=480}\nasset:7f3a9c\n```\n\n```image\nasset:x\n```\n\nAfter.\n');
  expect(textOf(doc)).toStrictEqual([
    { k: 'p', runs: [{ t: 'Before.' }] },
    { k: 'p', runs: [{ t: 'A cat on a mat' }] },
    { k: 'p', runs: [{ t: 'After.' }] },
  ]);
  expect(textMarkdown(textOf(doc))).toBe('Before.\n\nA cat on a mat\n\nAfter.\n');
});

test('the lint names a picture with no words, and one this page keeps no pictures for (the API runs where no host keeps any)', () => {
  expect(lint('write', '```image\nasset:x\n```\n').map((f) => f.kind)).toStrictEqual(['image-no-alt', 'image-not-kept']);
  expect(lint('deck', '## Slide\n\n```image {alt="The stoop"}\nasset:x\n```\n').map((f) => [f.kind, f.at])).toStrictEqual([['image-not-kept', 'slide 1']]);
});
