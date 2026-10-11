// A document locked with a password, placed inside another (kit/locked.ts): it goes in as its sealed link, the
// text keeps it byte for byte, and every drawing of the outer document draws the locked card, never blank; a
// link that cannot be read draws "cannot be read".
import { test, expect, beforeAll } from 'vitest';
import '../src/kit/apps.ts';
import { appOf } from '../src/kit/apps.ts';
import { lookup } from '../src/kit/app.ts';
import { encodeDoc, packDoc } from '../src/kit/codec.ts';
import { newLocker, seal, unseal } from '../src/kit/crypt.ts';
import { linkToFence } from '../src/kit/clipboard.ts';
import { forgetOpened, LOCKED_LANG, lockedFence, lockedOf, lockedPage, notOpened, setOpened } from '../src/kit/locked.ts';
import { routeHash } from '../src/kit/route.ts';
import { parse, write, type Block } from '../src/doc/index.ts';
import { fenceLink } from '../src/apps/write/view.ts';

let sealed = '';
const inner = '---\ntitle: Salaries\n---\nThe secret words\n';
beforeAll(async () => {
  const { flag, bytes } = packDoc(inner);
  sealed = await seal(await newLocker('pw', 1000), flag, bytes);
});
const link = () => `https://tinylittleoffice.com/${routeHash('write', sealed)}`;
const outer = () => write({ head: {}, blocks: [{ k: 'p', runs: [{ t: 'Before' }] }, linkToFence(link())!, { k: 'p', runs: [{ t: 'After' }] }] });

test('a sealed link goes in as itself, in a "locked" fence the text keeps byte for byte', () => {
  const f = linkToFence(link()) as Extract<Block, { k: 'fence' }>;
  expect(f).toEqual({ k: 'fence', lang: LOCKED_LANG, body: `#/v1/write/${sealed}` });
  expect(f).toEqual(lockedFence('write', sealed));
  expect(lockedOf(f.body)).toEqual({ app: 'write', payload: sealed });
  const text = outer();
  expect(text).toContain('```locked\n#/v1/write/E');
  expect(write(parse(text))).toBe(text);
  // Nothing of the document is in the outer one: not its title, not a word.
  expect(text).not.toContain('Salaries');
  expect(text).not.toContain('secret');
  // Its address is its own link.
  expect(fenceLink(f.lang, f.body, 'https://tinylittleoffice.com/')).toBe(link());
});

test('the locked card: the lock, the words, the app, at the app’s own small size', () => {
  const page = lockedPage(`#/v1/sheet/${sealed}`, { small: true });
  const blank = appOf('sheet')!.view(appOf('sheet')!.blank(), { small: true })[0];
  expect([page.w, page.h]).toEqual([blank.w, blank.h]);
  expect(page.svg).toContain('Locked with a password');
  expect(page.svg).toContain('Spreadsheet');
  expect(page.alt).toBe('A Spreadsheet document, locked with a password');
  // A link that is not a sealed document's (cut short, or of no app here) cannot be read, and says so.
  expect(lockedPage('#/v1/write/').svg).toContain('This document cannot be read.');
  expect(lockedPage(`#/v1/nope/${sealed}`).svg).toContain('This document cannot be read.');
});

test('opened this visit: drawn open in an editor alone; the pages and the files keep the locked card', () => {
  setOpened(sealed, inner);
  try {
    const body = `#/v1/write/${sealed}`;
    expect(lockedPage(body, { small: true, open: true }).svg).toContain('The secret words');
    expect(lockedPage(body, { small: true }).svg).toContain('Locked with a password');
    // The Word Processor's pages, its web page and a slide.
    const text = outer();
    const pages = appOf('write')!
      .view(text)
      .map((p) => p.svg)
      .join('');
    expect(pages).toContain('Locked with a password');
    expect(pages).toContain('Locked document');
    expect(pages).not.toContain('secret');
    const deck = write({ head: {}, blocks: [{ k: 'h', level: 2, runs: [{ t: 'Numbers' }] }, lockedFence('write', sealed)] });
    const slides = appOf('deck')!
      .view(deck)
      .map((p) => p.svg)
      .join('');
    expect(slides).toContain('Locked with a password');
    expect(slides).not.toContain('secret');
  } finally {
    forgetOpened();
  }
});

test('the registry knows the fence, as it knows a QR code; a plain link still goes in as its text', () => {
  expect(lookup.appOf(LOCKED_LANG)?.name).toBe('Locked document');
  expect(appOf(LOCKED_LANG)).toBeUndefined();
  const plain = linkToFence(`https://tinylittleoffice.com/${routeHash('write', encodeDoc('Hello\n'))}`);
  expect(plain).toEqual({ k: 'fence', lang: 'write', body: 'Hello\n' });
});

test('a link cut short by ten characters does not open with the right password, and the words say it may be cut short, not that the password is wrong', async () => {
  const cut = sealed.slice(0, -10);
  expect(await unseal('pw', sealed, 1000)).not.toBeNull();
  expect(await unseal('pw', cut, 1000)).toBeNull();
  expect(notOpened()).toBe('That password does not open this link. If you are sure of it, the link may have been cut short when it was copied: ask for it again, or for a short link.');
  expect(notOpened()).not.toMatch(/^Wrong password/);
});
