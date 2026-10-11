// A short link in the shell: made in Share, opened by a visitor, its lifetime shown. It cannot be changed or
// recalled once made (Paul, 2026-10-11), so the dialog has no Update, Extend or Forget, the address carries no
// key, and nothing in it but the document and, for a visitor, the short link's id and expiry.
import { test, expect, afterEach, vi } from 'vitest';
import { mount, tick, until, openShare } from './helpers.ts';
import { encodeDoc } from '../../src/kit/codec.ts';
import { unshorten } from '../../src/kit/short.ts';
import type { ToText } from '../../src/kit/text.ts';
import type { ToShell } from '../../src/kit/shell.ts';
import type { ToShare } from '../../src/kit/share-dialog.ts';
import type { ToDialog } from '../../src/kit/dialog.ts';
import { store } from '../../src/kit/store.ts';

const DAY = 86_400_000;
afterEach(() => {
  vi.unstubAllGlobals();
  store.remove('tinyoffice.links');
  history.replaceState(null, '', location.pathname);
});
const section = (shell: HTMLElement) => shell.querySelector<HTMLElement>('to-dialog.to-share-dialog .to-share-short')!;
async function open(shell: ToShell) {
  await openShare(shell);
  const dialog = shell.querySelector<ToDialog>('to-dialog.to-share-dialog')!;
  await until(() => dialog.dialog.open && !!section(shell));
  return dialog;
}
const NOTHING_TO_OWN = '.to-update, .to-extend, .to-forget, .to-owner, .to-owner-field, .to-keep, .to-share-own';

test('a short link made here: the lifetime from the row, the link big with Copy and its expiry; nothing to update or forget', async () => {
  const shell = await mount(`#/v1/write/${encodeDoc('Hello')}`);
  await until(() => !!shell.querySelector('to-write-editor to-text .tx'));
  const before = location.hash;
  const exp = Date.now() + 30 * DAY;
  const sent: { url: string; method: string; body: Record<string, unknown> }[] = [];
  vi.stubGlobal('fetch', async (url: string, init?: RequestInit) => {
    sent.push({ url, method: init?.method ?? 'GET', body: JSON.parse(String(init?.body)) });
    return new Response(JSON.stringify({ id: 'qrstuvw', exp }), { status: 201, headers: { 'content-type': 'application/json' } });
  });
  const dialog = await open(shell);
  // The lifetimes end at a month, and the section says the link cannot be changed or recalled.
  expect([...section(shell).querySelectorAll('.to-ttl label')].map((l) => l.textContent)).toEqual(['An hour', 'A day', 'A week', 'A month']);
  expect(section(shell).textContent).toContain('A short link cannot be changed or recalled once made; it expires on its own.');
  expect(section(shell).querySelector(NOTHING_TO_OWN)).toBeNull();
  section(shell)
    .querySelector<HTMLInputElement>(`input[type=radio][value="${30 * 86400}"]`)!
    .click();
  section(shell).querySelector<HTMLButtonElement>('.to-make')!.click();
  await until(() => !!section(shell).querySelector('.to-short-field'));

  // One POST: ciphertext, its IV and the lifetime; no owner, nothing readable.
  expect(sent.map((r) => r.method)).toEqual(['POST']);
  expect(sent[0].url).toMatch(/\/api$/);
  expect(Object.keys(sent[0].body).sort()).toEqual(['c', 'iv', 'ttl']);
  expect(sent[0].body.ttl).toBe(30 * 86400);
  expect(JSON.stringify(sent[0].body)).not.toContain('Hello');
  const field = section(shell).querySelector<HTMLInputElement>('.to-short-field')!;
  expect(field.readOnly).toBe(true);
  expect(field.value).toMatch(/^https:\/\/tinier\.tinylittleoffice\.com\/qrstuvw#[A-Za-z0-9_~]{43}$/);
  // The key in the link opens what was sent: the document's link.
  expect(await unshorten(sent[0].body.c as string, sent[0].body.iv as string, field.value.split('#')[1])).toBe(shell.link);
  expect(section(shell).querySelector('.to-short-expires')!.textContent).toMatch(/^Expires in 30 days \(/);
  expect(section(shell).querySelector(NOTHING_TO_OWN)).toBeNull();

  // Copy at the field's right copies the short link.
  let copied = '';
  const clip = navigator.clipboard.writeText;
  navigator.clipboard.writeText = async (s: string) => void (copied = s);
  try {
    field.parentElement!.querySelector<HTMLButtonElement>('.to-btn')!.click();
    await until(() => copied === field.value);
  } finally {
    navigator.clipboard.writeText = clip;
  }
  // The address is the document and nothing else.
  expect(location.hash).toBe(before);
  expect(location.hash).not.toContain('?');
  dialog.close();
  await until(() => !shell.querySelector<ToShare>('to-share')!.sharing); // the dialog's close event, a task later
  // Opened again: a new short link can be made; the one made is in the list kept here.
  await open(shell);
  expect(section(shell).querySelector('.to-make')).not.toBeNull();
  expect(shell.querySelector('.to-kept-list summary')!.textContent).toBe('1 short link kept here');
});

test('opened by a short link: its lifetime shown; an edit leaves the address the document alone; a key or o in the address is not read', async () => {
  const exp = Date.now() + 12 * DAY + 60_000;
  // The query the living link of before handed its owner: k and o are ignored.
  const shell = await mount(`#/v1/write/${encodeDoc('Hello')}?s=abcdefg&k=${'K'.repeat(43)}&o=${'O'.repeat(43)}&x=${exp}`);
  await until(() => !!shell.querySelector('to-write-editor to-text .tx'));
  expect(shell.querySelector('.to-arrival-words')!.textContent).toBe('This link expires in 12 days');
  expect(shell.querySelector('.to-arrival-extend')).toBeNull();
  expect(shell.link.endsWith(`#/v1/write/${encodeDoc('Hello')}`)).toBe(true);
  expect('owned' in shell).toBe(false);

  const dialog = await open(shell);
  expect(section(shell).querySelector('.to-make')).not.toBeNull();
  expect(section(shell).querySelector(NOTHING_TO_OWN)).toBeNull();
  expect(section(shell).textContent).not.toContain('You own');
  dialog.close();
  await until(() => !shell.querySelector<ToShare>('to-share')!.sharing);

  // An edit: the document is a new one, and the address is its link alone.
  const text = shell.querySelector<ToText>('to-text')!;
  text.sel = { anchor: { block: 0, offset: 5 }, focus: { block: 0, offset: 5 } };
  for (const ch of ' again') {
    text.tx.dispatchEvent(new InputEvent('beforeinput', { inputType: 'insertText', data: ch, bubbles: true, cancelable: true }));
    await text.updateComplete;
  }
  await tick(200);
  await shell.updateComplete;
  expect(location.hash).toMatch(/^#\/v1\/write\/[A-Za-z0-9_~-]+$/);
  expect(location.hash).not.toMatch(/[?&][kos]=/);
});
