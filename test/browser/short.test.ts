// A short link in the shell: made in Share, opened by a visitor, its lifetime shown. It cannot be changed or
// recalled once made (Paul, 2026-10-11), so the dialog has no Update, Extend or Forget, the address carries no
// key, and nothing in it but the document and, for a visitor, the short link's id and expiry.
import { test, expect, afterEach, vi } from 'vitest';
import { link, mount, until, openShare } from './helpers.ts';
import { encodeDoc } from '../../src/kit/core/codec.ts';
import { unshorten } from '../../src/kit/share/short.ts';
import type { ToText } from '../../src/kit/text/text.ts';
import type { ToShell } from '../../src/kit/core/shell.ts';
import type { ToShare } from '../../src/kit/ui/share-dialog.ts';
import type { ToDialog } from '../../src/kit/ui/dialog.ts';
import { store } from '../../src/kit/core/store.ts';

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
  // Its switch on: the lifetimes, ending at a month; the section says the link cannot be changed or recalled.
  section(shell).querySelector<HTMLInputElement>('.to-short-switch')!.click();
  await until(() => !!section(shell).querySelector('.to-ttl'));
  expect([...section(shell).querySelectorAll('.to-ttl label')].map((l) => l.textContent)).toEqual(['an hour', 'a day', 'a week', 'a month']);
  expect(section(shell).textContent).toContain('Short links cannot be manually edited or deleted before their expiration date.');
  expect(section(shell).querySelector(NOTHING_TO_OWN)).toBeNull();
  section(shell)
    .querySelector<HTMLInputElement>(`input[type=radio][value="${30 * 86400}"]`)!
    .click();
  // Copy link makes it, and copies it.
  let copied = '';
  const [clip, item] = [navigator.clipboard.writeText, navigator.clipboard.write];
  navigator.clipboard.writeText = async (s: string) => void (copied = s);
  navigator.clipboard.write = async (items: ClipboardItems) => void (copied = await (await items[0].getType('text/plain')).text());
  dialog.querySelector<HTMLButtonElement>('.to-copy-link')!.click();
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

  // Copy link put it on the clipboard; Copy at the field's right does too.
  try {
    await until(() => copied === field.value);
    copied = '';
    field.parentElement!.querySelector<HTMLButtonElement>('.to-btn')!.click();
    await until(() => copied === field.value);
  } finally {
    navigator.clipboard.writeText = clip;
    navigator.clipboard.write = item;
  }
  // The address is the document and nothing else.
  expect(location.hash).toBe(before);
  expect(location.hash).not.toContain('?');
  dialog.close();
  await until(() => !shell.querySelector<ToShare>('to-share')!.sharing); // the dialog's close event, a task later
  // Opened again: a new short link can be made (its switch, off again); the one made is in the list kept here.
  await open(shell);
  expect(section(shell).querySelector<HTMLInputElement>('.to-short-switch')!.checked).toBe(false);
  expect(shell.querySelector('.to-kept-list summary')!.textContent).toBe('1 short link kept here');
});

test('opened by a short link: its lifetime shown; an edit leaves the address the document alone; a key or o in the address is not read', async () => {
  const exp = Date.now() + 12 * DAY + 60_000;
  // A k and an o in the query are ignored.
  const shell = await mount(`#/v1/write/${encodeDoc('Hello')}?s=abcdefg&k=${'K'.repeat(43)}&o=${'O'.repeat(43)}&x=${exp}`);
  await until(() => !!shell.querySelector('to-write-editor to-text .tx'));
  expect(shell.querySelector('.to-arrival-words')!.textContent).toBe('This link expires in 12 days');
  expect(shell.querySelector('.to-arrival-extend')).toBeNull();
  expect(shell.link.endsWith(`#/v1/write/${encodeDoc('Hello')}`)).toBe(true);
  expect('owned' in shell).toBe(false);

  const dialog = await open(shell);
  expect(section(shell).querySelector('.to-short-switch')).not.toBeNull();
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
  await until(() => /^#\/v1\/write\/[A-Za-z0-9_~-]+$/.test(link()), 'the link never followed the edit');
  await shell.updateComplete;
  expect(location.hash).toMatch(/^#\/v1\/write\/[A-Za-z0-9_~-]+$/);
  expect(location.hash).not.toMatch(/[?&][kos]=/);
});
