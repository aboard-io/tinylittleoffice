// Owned short links in the shell: the owner's query rides in the address, never in a shared link; the Share
// dialog's short-link section offers Update (once changed), Extend over the lifetimes, and Forget, in that
// order; a short link made here comes big with Copy, the owner link folded under it.
import { test, expect, afterEach, vi } from 'vitest';
import { mount, until } from './helpers.ts';
import { decodeDoc, encodeDoc } from '../../src/kit/codec.ts';
import { parseHash } from '../../src/kit/route.ts';
import { parse, write } from '../../src/doc/index.ts';
import type { ToText } from '../../src/kit/text.ts';
import type { ToShell } from '../../src/kit/shell.ts';
import type { ToDialog } from '../../src/kit/dialog.ts';

const OWNED = `?s=abcdefg&k=${'K'.repeat(43)}&o=${'O'.repeat(43)}`;
afterEach(() => {
  vi.unstubAllGlobals();
  history.replaceState(null, '', location.pathname);
});
const section = (shell: HTMLElement) => shell.querySelector<HTMLElement>('to-dialog.to-share-dialog .to-share-short')!;
async function open(shell: ToShell) {
  shell.querySelector<HTMLButtonElement>('.to-header .to-share')!.click();
  const dialog = shell.querySelector<ToDialog>('to-dialog.to-share-dialog')!;
  await until(() => dialog.dialog.open && !!section(shell));
  return dialog;
}
const ttl = (shell: HTMLElement, seconds: number) => {
  const radio = section(shell).querySelector<HTMLInputElement>(`input[type=radio][value="${seconds}"]`)!;
  radio.click();
};

test('opened from an owner link, the document can update its short link; the shared link carries no key', async () => {
  const shell = await mount(`#/v1/write/${encodeDoc('Hello')}${OWNED}`);
  await until(() => !!shell.querySelector('to-write-editor to-text .tx'));
  expect(shell.owned).toEqual({ id: 'abcdefg', key: 'K'.repeat(43), o: 'O'.repeat(43) });
  expect(shell.link).not.toContain('?');
  expect(shell.link.endsWith(`#/v1/write/${encodeDoc('Hello')}`)).toBe(true);

  // The owner's section: the link, Update (nothing changed yet: off), the lifetimes with Extend, Forget, in that order.
  let dialog = await open(shell);
  const s = section(shell);
  expect(s.textContent).toContain('You own this short link');
  expect(s.querySelector<HTMLInputElement>('.to-short-field')!.value).toBe(`https://tinier.tinylittleoffice.com/abcdefg#${'K'.repeat(43)}`);
  const order = [...s.querySelectorAll('.to-short-field, .to-update, .to-ttl, .to-extend, .to-forget')].map((e) => e.className.match(/to-(short-field|update|ttl|extend|forget)/)![1]);
  expect(order).toEqual(['short-field', 'update', 'ttl', 'extend', 'forget']);
  expect(s.querySelector<HTMLButtonElement>('.to-update')!.disabled).toBe(true);
  expect(s.querySelector('.to-make')).toBeNull();
  dialog.close();
  await until(() => !shell.sharing); // the dialog's close event, a task later

  // An edit: the address keeps the owner's query, the shared link still has none, and Update wakes.
  const text = shell.querySelector<ToText>('to-text')!;
  text.sel = { anchor: { block: 0, offset: 5 }, focus: { block: 0, offset: 5 } };
  for (const ch of ' again') {
    text.tx.dispatchEvent(new InputEvent('beforeinput', { inputType: 'insertText', data: ch, bubbles: true, cancelable: true }));
    await text.updateComplete;
  }
  await shell.updateComplete;
  // (The first change stamps the time the document was first written into its head.)
  const again = parseHash(location.hash).payload;
  expect(decodeDoc(again).replace(/^---\ncreated: \d{4}-\d\d-\d\dT\d\d:\d\dZ\n---\n/, '')).toBe(write(parse('Hello again')));
  expect(location.hash).toContain(OWNED);
  expect(location.hash.startsWith(`#/v1/write/${again}?`)).toBe(true);
  expect(shell.link).toBe(`${location.origin}${location.pathname}#/v1/write/${again}`);

  // One tap: a PUT with the new ciphertext and o, answered with the version; the toast says so.
  const sent: { url: string; method: string; body: Record<string, unknown> }[] = [];
  const exp = Date.now() + 30 * 86_400_000;
  vi.stubGlobal('fetch', async (url: string, init?: RequestInit) => {
    sent.push({ url, method: init?.method ?? 'GET', body: JSON.parse(String(init?.body)) });
    return new Response(JSON.stringify({ id: 'abcdefg', exp, ver: 3, updated: Date.now() }), { status: 200, headers: { 'content-type': 'application/json' } });
  });
  dialog = await open(shell);
  const update = section(shell).querySelector<HTMLButtonElement>('.to-update')!;
  expect(update.disabled).toBe(false);
  update.click();
  await until(() => document.querySelector('[role=status]')!.textContent === 'Updated · version 3');
  expect(sent.length).toBe(1);
  expect(sent[0].method).toBe('PUT');
  expect(sent[0].url).toMatch(/\/api\/abcdefg$/);
  expect(sent[0].body.o).toBe('O'.repeat(43));
  expect(sent[0].body.ttl).toBeUndefined();
  expect(typeof sent[0].body.c).toBe('string');
  expect(JSON.stringify(sent[0].body)).not.toContain('Hello'); // ciphertext, not the link
  await until(() => section(shell).querySelector<HTMLButtonElement>('.to-update')!.disabled);
  // The expiry the service answered is shown, and rides in the address beside the owner's query.
  expect(section(shell).querySelector('.to-short-expires')!.textContent).toMatch(/^Expires in 30 days \(/);
  expect(location.hash).toContain(`${OWNED}&x=${exp}`);

  // Extend sends the lifetime chosen in the row.
  ttl(shell, 365 * 86400);
  section(shell).querySelector<HTMLButtonElement>('.to-extend')!.click();
  await until(() => sent.length === 2);
  expect(sent[1].body.ttl).toBe(365 * 86400);
  await until(() => /^Expires in /.test(document.querySelector('[role=status]')!.textContent ?? ''));

  // Forget asks first.
  vi.stubGlobal('confirm', () => false);
  section(shell).querySelector<HTMLButtonElement>('.to-forget')!.click();
  await shell.updateComplete;
  expect(sent.length).toBe(2);
  expect(shell.owned).not.toBeNull();
  vi.stubGlobal('confirm', () => true);
  vi.stubGlobal('fetch', async (url: string, init?: RequestInit) => {
    sent.push({ url, method: init?.method ?? 'GET', body: JSON.parse(String(init?.body)) });
    return new Response(null, { status: 204 });
  });
  section(shell).querySelector<HTMLButtonElement>('.to-forget')!.click();
  await until(() => shell.owned === null);
  expect(sent[2].method).toBe('DELETE');
  expect(sent[2].body).toEqual({ o: 'O'.repeat(43) });
  expect(location.hash).toBe(`#/v1/write/${again}`);
  // The section is the maker again.
  await until(() => !!section(shell).querySelector('.to-make'));
});

test('a short link made here: the lifetime from the row, the link big with Copy, the owner link folded under it', async () => {
  const shell = await mount(`#/v1/write/${encodeDoc('Hello')}`);
  await until(() => !!shell.querySelector('to-write-editor to-text .tx'));
  expect(shell.owned).toBeNull();
  const exp = Date.now() + 86_400_000;
  vi.stubGlobal('fetch', async (_url: string, init?: RequestInit) => {
    const body = JSON.parse(String(init?.body)) as { owner: string; ttl: number };
    expect(body.owner).toMatch(/^[A-Za-z0-9_-]{43}$/);
    expect(body.ttl).toBe(86400);
    return new Response(JSON.stringify({ id: 'qrstuvw', exp }), { status: 201, headers: { 'content-type': 'application/json' } });
  });
  const dialog = await open(shell);
  ttl(shell, 86400);
  section(shell).querySelector<HTMLButtonElement>('.to-make')!.click();
  await until(() => !!section(shell).querySelector('.to-owner'));
  const field = section(shell).querySelector<HTMLInputElement>('.to-short-field')!;
  expect(field.readOnly).toBe(true);
  expect(field.value).toMatch(/^https:\/\/tinier\.tinylittleoffice\.com\/qrstuvw#[A-Za-z0-9_-]{43}$/);
  expect(section(shell).querySelector('.to-short-expires')!.textContent).toMatch(/^Expires in 1 day \(/);

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

  // The owner link waits in a disclosure; opened, it is there with its Copy, and (Private) the hint about Saved.
  const owner = section(shell).querySelector<HTMLDetailsElement>('.to-owner')!;
  expect(owner.open).toBe(false);
  owner.querySelector('summary')!.click();
  await until(() => owner.open);
  expect(owner.querySelector<HTMLInputElement>('.to-owner-field')!.value).toBe(`${field.value}.${shell.owned!.o}`);
  expect(owner.querySelector('.to-keep')).toBeNull();
  expect(owner.textContent).toContain('Turn on Saved on this device');
  // The address now carries the ownership and the expiry; the shared link does not.
  expect(location.hash).toContain(`?s=qrstuvw&k=${shell.owned!.key}&o=${shell.owned!.o}&x=${exp}`);
  expect(shell.link).not.toContain('?');
  dialog.close();
  await until(() => !shell.sharing); // the dialog's close event, a task later
  // Opened again: the owner's section.
  await open(shell);
  expect(section(shell).textContent).toContain('You own this short link');
});
