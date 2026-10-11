// A document locked with a password, placed inside another (kit/locked.ts, kit/locked-doc.ts): the editor
// draws the locked card, a tap asks for the password, and opened the card draws the document for this visit
// while the outer link goes on holding the sealed one; a slide the same; the embed view of a locked link is
// the locked card with Unlock, and of a broken one says it cannot be read.
import { test, expect, beforeAll, afterEach } from 'vitest';
import { mount, until } from './helpers.ts';
import { decodeDoc, encodeDoc } from '../../src/kit/codec.ts';
import { lockCost, lockWith, pack } from '../../src/kit/privacy.ts';
import { forgetOpened, lockedFence } from '../../src/kit/locked.ts';
import { parseHash } from '../../src/kit/route.ts';
import { write } from '../../src/doc/index.ts';
import type { ToShell } from '../../src/kit/shell.ts';
import { setKeeping, store } from '../../src/kit/store.ts';

beforeAll(() => {
  // A password is slow to try on purpose; here, for both sides at once, it is quick.
  lockCost.iterations = 1000;
});
afterEach(() => {
  forgetOpened();
  document.querySelectorAll('to-dialog').forEach((d) => d.remove());
  history.replaceState(null, '', location.pathname);
});

const inner = '---\ntitle: Salaries\n---\nThe secret words\n';
/** A fresh seal each time: a password given in one test opens nothing in the next. */
const sealed = async () => pack(inner, await lockWith('pw'));

/** A password typed into the open unlock dialog, and Unlock. */
async function tryPassword(root: ParentNode, pw: string) {
  await until(() => !!root.querySelector('to-dialog.to-unlock-dialog dialog[open] .to-unlock-field'));
  const field = root.querySelector<HTMLInputElement>('to-dialog.to-unlock-dialog dialog[open] .to-unlock-field')!;
  field.value = pw;
  field.dispatchEvent(new Event('input', { bubbles: true }));
  root.querySelector<HTMLButtonElement>('to-dialog.to-unlock-dialog dialog[open] .to-unlock-go')!.click();
}

test('the Word Processor: the locked card, a tap asks for the password, opened it draws the document; the link keeps the seal', async () => {
  const payload = await sealed();
  const text = write({ head: {}, blocks: [{ k: 'p', runs: [{ t: 'Before' }] }, lockedFence('write', payload), { k: 'p', runs: [{ t: 'After' }] }] });
  const shell: ToShell = await mount(`#/v1/write/${encodeDoc(text)}`);
  await until(() => !!shell.querySelector('to-write-editor to-locked-doc .to-locked-open svg'));
  const card = shell.querySelector('to-write-editor to-locked-doc')!;
  expect(card.querySelector('.to-locked-open svg')!.innerHTML).toContain('Locked with a password');
  expect(card.querySelector('figcaption')!.textContent).toContain('Locked document');
  expect(card.querySelector('figcaption small')!.textContent).toBe('Word Processor');
  // Nothing asked until the card is tapped.
  expect(document.querySelector('to-dialog.to-locked-unlock')).toBeNull();
  card.querySelector<HTMLButtonElement>('.to-locked-open')!.click();
  await tryPassword(document, 'nope');
  await until(() => document.querySelector('to-dialog.to-locked-unlock .to-unlock-wrong')?.textContent === 'Wrong password');
  await tryPassword(document, 'pw');
  await until(() => !card.querySelector('.to-locked-open'));
  expect(document.querySelector('to-dialog.to-locked-unlock')).toBeNull();
  expect(card.querySelector('svg')!.innerHTML).toContain('The secret words');
  expect(card.querySelector('figcaption b')!.textContent).toBe('Salaries');
  // The outer document still holds the sealed link, and nothing of what it opened to.
  const now = decodeDoc(parseHash(location.hash).payload);
  expect(now).toContain(`#/v1/write/${payload}`);
  expect(now).not.toContain('secret');
});

test('a slide: the locked card; a tap asks for the password, and opened, the slide draws the document', async () => {
  const payload = await sealed();
  const text = write({ head: {}, blocks: [{ k: 'h', level: 2, runs: [{ t: 'Numbers' }] }, lockedFence('write', payload)] });
  const shell = await mount(`#/v1/deck/${encodeDoc(text)}`);
  await until(() => !!shell.querySelector('to-deck-editor .deck-sub svg'));
  const sub = () => shell.querySelector<HTMLElement>('to-deck-editor .deck-sub')!;
  expect(sub().innerHTML).toContain('Locked with a password');
  sub().click();
  await tryPassword(document, 'pw');
  await until(() => sub().innerHTML.includes('The secret words'));
  expect(decodeDoc(parseHash(location.hash).payload)).not.toContain('secret');
});

test('the embed view of a locked link: the locked card and Unlock; the password shows the pages', async () => {
  const payload = await sealed();
  const shell = await mount(`#/v1/write.embed/${payload}`);
  await until(() => !!shell.querySelector('.to-embed-locked .to-display-page svg'));
  expect(shell.querySelector('.to-embed-locked .to-display-page svg')!.innerHTML).toContain('Locked with a password');
  expect(shell.querySelector('.to-embed-title')!.textContent).toBe('Locked document');
  // Framed on another site, nothing opens over the page until Unlock is pressed.
  expect(shell.querySelector('to-dialog.to-unlock-dialog dialog[open]')).toBeNull();
  shell.querySelector<HTMLButtonElement>('.to-embed-locked .to-unlock-open')!.click();
  await tryPassword(shell, 'pw');
  await until(() => !!shell.querySelector('.to-embed:not(.to-embed-locked) .to-display-page svg'));
  expect(shell.querySelector('.to-embed .to-display-page svg')!.innerHTML).toContain('The secret words');
  expect(shell.querySelector('.to-embed-title')!.textContent).toBe('Salaries');
});

test('the embed view of a link that cannot be read says so, rather than a blank page', async () => {
  const shell = await mount('#/v1/write.embed/zzzzzz');
  await until(() => !!shell.querySelector('.to-empty'));
  expect(shell.querySelector('.to-empty')!.textContent).toContain('cannot be read');
  expect(shell.querySelector('.to-embed .to-display-page')).toBeNull();
});

test('Edit: opened with its password, edited in its own app, sealed again under the same password', async () => {
  const { editFence } = await import('../../src/kit/doc-dialog.ts');
  const { unlock } = await import('../../src/kit/privacy.ts');
  const payload = await sealed();
  const fence = lockedFence('write', payload) as { k: 'fence'; lang: string; body: string };
  const done = editFence(fence);
  await tryPassword(document, 'pw');
  await until(() => !!document.querySelector('to-doc-dialog dialog[open] .to-doc-dialog-body > *'));
  const ed = document.querySelector('to-doc-dialog .to-doc-dialog-body > *')!;
  expect((ed as HTMLElement & { value: string }).value).toBe(inner);
  ed.dispatchEvent(new CustomEvent('docchange', { detail: inner.replace('secret', 'open'), bubbles: true }));
  document.querySelector<HTMLButtonElement>('to-doc-dialog .to-doc-dialog-done')!.click();
  const next = (await done)!;
  const again = parseHash(next.body.trim());
  expect(next.lang).toBe('locked');
  expect(again.sealed && again.payload !== payload).toBe(true);
  expect(next.body).not.toContain('open words');
  expect((await unlock('pw', again.payload))?.text).toBe(inner.replace('secret', 'open'));
});

test('a sealed document, unlocked: the tab title and the library carry no title; the page itself still shows it', async () => {
  setKeeping(true);
  store.remove('tinyoffice.library');
  try {
    const shell: ToShell = await mount(`#/v1/write/${await sealed()}`);
    await until(() => document.title.startsWith('Locked document'));
    await tryPassword(shell, 'pw');
    await until(() => !!shell.querySelector('to-write-editor to-text .tx p'));
    expect(document.title).not.toContain('Salaries');
    expect(document.title).toContain('Locked document');
    expect(shell.querySelector<HTMLInputElement>('input.to-title')!.value).toBe('Salaries');
    shell.keepNow();
    const library = JSON.parse(store.get('tinyoffice.library') ?? '[]');
    expect(library[0].title).toBe('');
    expect(JSON.stringify(localStorage)).not.toContain('Salaries');
  } finally {
    store.remove('tinyoffice.library');
    setKeeping(false);
  }
});
