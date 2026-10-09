// Owned short links in the shell: the owner's query rides in the address, never in a shared link; the Share
// panel offers update, extend and forget; an update is one tap and a toast with the version.
import { test, expect, afterEach, vi } from 'vitest';
import { mount, until } from './helpers.ts';
import { encodeDoc } from '../../src/kit/codec.ts';
import { parse, write } from '../../src/doc/index.ts';
import type { ToText } from '../../src/kit/text.ts';
import type { ToMenu } from '../../src/kit/menu.ts';
import type { ToDialog } from '../../src/kit/dialog.ts';

const OWNED = `?s=abcdefg&k=${'K'.repeat(43)}&o=${'O'.repeat(43)}`;
afterEach(() => {
  vi.unstubAllGlobals();
  history.replaceState(null, '', location.pathname);
});
const labels = (shell: HTMLElement) => shell.querySelector<ToMenu>('to-menu.to-share')!.items.map((i) => i.label);

test('opened from an owner link, the document can update its short link; the shared link carries no key', async () => {
  const shell = await mount(`#/v1/text/${encodeDoc('Hello')}${OWNED}`);
  await until(() => !!shell.querySelector('to-text-editor to-text .tx'));
  expect(shell.owned).toEqual({ id: 'abcdefg', key: 'K'.repeat(43), o: 'O'.repeat(43) });
  expect(shell.link).not.toContain('?');
  expect(shell.link.endsWith(`#/v1/text/${encodeDoc('Hello')}`)).toBe(true);
  // Nothing changed yet: extend and forget are offered, an update is not.
  expect(labels(shell)).toContain('Extend the short link…');
  expect(labels(shell)).toContain('Forget this link');
  expect(labels(shell)).not.toContain('Update the short link');
  expect(labels(shell)).not.toContain('Shorter link that expires…');

  // An edit: the address keeps the owner's query, the shared link still has none, and Update appears.
  const text = shell.querySelector<ToText>('to-text')!;
  text.sel = { anchor: { block: 0, offset: 5 }, focus: { block: 0, offset: 5 } };
  for (const ch of ' again') {
    text.tx.dispatchEvent(new InputEvent('beforeinput', { inputType: 'insertText', data: ch, bubbles: true, cancelable: true }));
    await text.updateComplete;
  }
  await shell.updateComplete;
  const again = encodeDoc(write(parse('Hello again')));
  expect(location.hash).toContain(OWNED);
  expect(location.hash.startsWith(`#/v1/text/${again}?`)).toBe(true);
  expect(shell.link).toBe(`${location.origin}${location.pathname}#/v1/text/${again}`);
  expect(labels(shell)).toContain('Update the short link');

  // One tap: a PUT with the new ciphertext and o, answered with the version; the toast says so.
  const sent: { url: string; method: string; body: Record<string, unknown> }[] = [];
  vi.stubGlobal('fetch', async (url: string, init?: RequestInit) => {
    sent.push({ url, method: init?.method ?? 'GET', body: JSON.parse(String(init?.body)) });
    return new Response(JSON.stringify({ id: 'abcdefg', exp: Date.now() + 86_400_000, ver: 3, updated: Date.now() }), { status: 200, headers: { 'content-type': 'application/json' } });
  });
  shell.querySelector<ToMenu>('to-menu.to-share')!.items.find((i) => i.label === 'Update the short link')!.does();
  await until(() => document.querySelector('[role=status]')!.textContent === 'Updated · version 3');
  expect(sent.length).toBe(1);
  expect(sent[0].method).toBe('PUT');
  expect(sent[0].url).toMatch(/\/api\/abcdefg$/);
  expect(sent[0].body.o).toBe('O'.repeat(43));
  expect(sent[0].body.ttl).toBeUndefined();
  expect(typeof sent[0].body.c).toBe('string');
  expect(JSON.stringify(sent[0].body)).not.toContain('Hello'); // ciphertext, not the link
  await until(() => !labels(shell).includes('Update the short link'));

  // The owner's panel: the public link shown, Extend sends a lifetime, Forget asks first.
  shell.querySelector<ToMenu>('to-menu.to-share')!.items.find((i) => i.label === 'Extend the short link…')!.does();
  const dialog = shell.querySelector<ToDialog>('to-dialog.to-short')!;
  await until(() => dialog.dialog.open);
  expect(dialog.querySelector('.to-short-link')!.textContent).toBe(`https://tinier.tinylittleoffice.com/abcdefg#${'K'.repeat(43)}`);
  expect(dialog.querySelector<HTMLButtonElement>('.to-update')!.disabled).toBe(true);
  const select = dialog.querySelector<HTMLSelectElement>('select')!;
  expect([...select.options].map((o) => o.textContent)).toEqual(['An hour', 'A day', 'A week', 'A month', 'A year']);
  select.value = String(365 * 86400);
  select.dispatchEvent(new Event('change', { bubbles: true }));
  dialog.querySelector<HTMLButtonElement>('.to-extend')!.click();
  await until(() => sent.length === 2);
  expect(sent[1].body.ttl).toBe(365 * 86400);
  await until(() => /^Expires /.test(document.querySelector('[role=status]')!.textContent ?? ''));

  vi.stubGlobal('confirm', () => false);
  dialog.querySelector<HTMLButtonElement>('.to-forget')!.click();
  await shell.updateComplete;
  expect(sent.length).toBe(2);
  expect(shell.owned).not.toBeNull();
  vi.stubGlobal('confirm', () => true);
  vi.stubGlobal('fetch', async (url: string, init?: RequestInit) => {
    sent.push({ url, method: init?.method ?? 'GET', body: JSON.parse(String(init?.body)) });
    return new Response(null, { status: 204 });
  });
  dialog.querySelector<HTMLButtonElement>('.to-forget')!.click();
  await until(() => shell.owned === null);
  expect(sent[2].method).toBe('DELETE');
  expect(sent[2].body).toEqual({ o: 'O'.repeat(43) });
  expect(location.hash).toBe(`#/v1/text/${again}`);
  await until(() => labels(shell).includes('Shorter link that expires…'));
});

test('a short link made here comes as two links, and the document owns it from then on', async () => {
  const shell = await mount(`#/v1/text/${encodeDoc('Hello')}`);
  await until(() => !!shell.querySelector('to-text-editor to-text .tx'));
  expect(shell.owned).toBeNull();
  vi.stubGlobal('fetch', async (_url: string, init?: RequestInit) => {
    const body = JSON.parse(String(init?.body)) as { owner: string; ttl: number };
    expect(body.owner).toMatch(/^[A-Za-z0-9_-]{43}$/);
    expect(body.ttl).toBe(86400);
    return new Response(JSON.stringify({ id: 'qrstuvw', exp: Date.now() + 86_400_000 }), { status: 201, headers: { 'content-type': 'application/json' } });
  });
  shell.querySelector<ToMenu>('to-menu.to-share')!.items.find((i) => i.label === 'Shorter link that expires…')!.does();
  const dialog = shell.querySelector<ToDialog>('to-dialog.to-short')!;
  await until(() => dialog.dialog.open);
  dialog.querySelector<HTMLButtonElement>('.to-btn.primary')!.click();
  await until(() => !!dialog.querySelector('.to-owner-link'));
  const [pub, own] = [...dialog.querySelectorAll<HTMLAnchorElement>('.to-short-link')].map((a) => a.textContent!);
  expect(pub).toMatch(/^https:\/\/tinier\.tinylittleoffice\.com\/qrstuvw#[A-Za-z0-9_-]{43}$/);
  expect(own).toBe(`${pub}.${shell.owned!.o}`);
  expect(dialog.textContent).toContain('Keep this one to update it later');
  // Private: the offer to keep it is a hint about the switch, not a button.
  expect(dialog.querySelector('.to-keep')).toBeNull();
  expect(dialog.textContent).toContain('Turn on Saved on this device');
  // The address now carries the ownership; the shared link does not.
  expect(location.hash).toContain(`?s=qrstuvw&k=${shell.owned!.key}&o=${shell.owned!.o}`);
  expect(shell.link).not.toContain('?');
  dialog.close();
  await until(() => !dialog.dialog.open);
  expect(labels(shell)).toContain('Extend the short link…');
});
