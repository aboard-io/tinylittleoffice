// Sharing through the shell: a deck's link that opens presenting, an app's own page, two links compared, a shorter link (ported from e2e/shell.spec.ts).
import { test, expect } from 'vitest';
import { open, fresh, reopen, idle, until, link, $, $$, text, fill, key, button, press, menu, write, toast } from './helpers-shell.ts';
import { encodeEnvelope } from '../../src/lib/envelope.ts';
import { parseDeck } from '../../src/lib/deckmodel.ts';

const show = () => document.querySelector<HTMLElement>('[role="dialog"][aria-label="Presentation"]');
const slide = () => text(show()?.querySelector('.frame > svg'));
const qr = () => show()!.querySelectorAll('.frame > svg path[shape-rendering="crispEdges"]').length;

test('a shared deck opens presenting, with a way back to editing', async () => {
  await open('#/v0/deck');
  write('Headline', 'Spring launch');
  await idle();
  await press('Slide');
  write('Headline', 'Plan');
  write('Bullets', 'Build it\nShip it');
  await idle();
  expect(location.hash).toMatch(/^#\/v0\/deck\/[yzr]/);
  expect(parseDeck(link().env!.body).map((s) => [s.title, s.bullets])).toEqual([['Spring launch', []], ['Plan', ['Build it', 'Ship it']]]);
  const editing = location.href;

  // The link that is copied is the plain one: it opens as the deck to read, never presenting unless asked.
  await press('Copy link');
  await until(() => toast() === 'Link copied', 'copied');
  expect(await navigator.clipboard.readText()).toBe(editing.replace('/#/v0/deck/', '/deck/#/v0/deck/'));
  // A link that opens presenting is in Share, for when that is what is wanted.
  await menu('Share', 'Copy link (opens presenting)');
  await until(async () => (await navigator.clipboard.readText()).includes('deck.show'), 'the show link copied');
  const shared = await navigator.clipboard.readText();
  expect(shared).toBe(editing.replace('/#/v0/deck/', '/deck/#/v0/deck.show/'));

  // Someone opening the shared link lands in the presentation, on its own page.
  const visit = async () => {
    const u = new URL(shared);
    await fresh(u.hash, u.pathname);
  };
  await visit();
  expect(location.pathname).toBe('/deck/');
  expect(slide()).toContain('Spring launch');
  for (let i = 0; i < 3; i++) await key('ArrowRight');
  expect(slide()).toContain('Ship it');
  // The deck ends with a QR code of itself, titled; and the end of the deck is not the end of the show.
  await key('ArrowRight');
  expect(qr()).toBe(1);
  expect(slide()).toContain('Spring launch');
  await key('ArrowRight');
  expect(qr()).toBe(1);

  // "Edit this deck" is the way to the editor, and from then on the link is an editing link.
  await press('Edit this deck', show()!);
  expect(show()).toBeNull();
  expect(document.querySelector('[aria-label="Headline"]')).toBeTruthy();
  expect(location.hash).not.toContain('deck.show');
  await reopen();
  expect(show()).toBeNull();
  expect(document.querySelector('[aria-label="Headline"]')).toBeTruthy();
  // Presenting from the editor still ends by returning to it.
  await press('Present');
  expect(button('Exit', show()!)).toBeTruthy();
  await key('Escape');
  expect(show()).toBeNull();

  // Escape works for a visitor too.
  await visit();
  expect(slide()).toContain('Spring launch');
  await key('Escape');
  expect(show()).toBeNull();
  expect(document.querySelector('[aria-label="Headline"]')).toBeTruthy();
});

test('each app has a page of its own, where a new document of it opens', async () => {
  // (The page's own preview card is the server's: e2e checks it.)
  await fresh('', '/deck/');
  expect(text($('.to-panel h1'))).toMatch(/^Deck/);
  write('Headline', 'From the deck page');
  await idle();
  expect(location.pathname + location.hash).toMatch(/^\/deck\/#\/v0\/deck\/[yzr]/);
  await reopen();
  expect(text($('[aria-label="Headline"]'))).toBe('From the deck page');
});

test('two links compare side by side, with what changed', async () => {
  const created = Date.UTC(2026, 9, 6);
  const a = encodeEnvelope({ created, title: 'Chores', by: 'me', body: '- [ ] Sweep\n- [ ] Shop' }, 'todo');
  const b = encodeEnvelope({ created, title: 'Chores', by: 'chores-agent', body: '- [x] Sweep\n- [ ] Shop\n- [ ] Call mum' }, 'todo');
  await open(`#/compare/todo/${a}/todo/${b}`);
  const cmp = $('to-compare');
  const diff = () => $('.cmp-diff', cmp);
  expect(text($('h1', cmp))).toContain('Compare');
  expect(text($$('.cmp-meta', cmp)[1])).toContain('by chores-agent');
  expect($$('.add', diff())).toHaveLength(2);
  expect($$('.del', diff())).toHaveLength(1);
  expect(text(diff())).toContain('+ - [x] Sweep');
  expect(text(diff())).toContain('+ - [ ] Call mum');
  // Each side is shown as itself, in a frame (what runs in the frames is e2e's).
  expect($$('iframe', cmp).map((f) => f.getAttribute('src'))).toEqual([`/#/v0/todo.embed/${a}`, `/#/v0/todo.embed/${b}`]);
  await press('Swap', cmp);
  expect($$('.add', diff())).toHaveLength(1);

  // From a document, Share starts the comparison; the second link is pasted on the page.
  await navigator.clipboard.writeText('');
  await open(`#/v0/todo/${a}`);
  await menu('Share', /Compare with/);
  await until(() => location.hash.startsWith('#/compare/todo/'), 'the compare page');
  await idle();
  const second = $('sl-input[label="The second link"]');
  (second as unknown as { value: string }).value = `http://localhost/#/v0/todo/${b}`;
  second.dispatchEvent(new CustomEvent('sl-change', { bubbles: true, composed: true }));
  await new Promise((r) => setTimeout(r, 5));
  await idle();
  expect($$('.cmp-diff .add')).toHaveLength(2);
});

test('a shorter link that expires, with the key kept out of the server', async () => {
  await open('#/v0/todo');
  const add = $('sl-input.todo-new');
  fill(add, 'Secret plan');
  add.dispatchEvent(new KeyboardEvent('keydown', { key: 'Enter', bubbles: true }));
  await idle();
  expect(location.hash).toMatch(/^#\/v0\/todo\/[yzr]/);
  // A stand-in for tinier, remembering what it was sent.
  let sent: { c: string; iv: string; ttl: number } | null = null;
  const offline = globalThis.fetch;
  globalThis.fetch = (async (url: RequestInfo | URL, init?: RequestInit) => {
    if (String(url) !== 'https://tinier.tinylittleoffice.com/api') return offline(url, init);
    sent = JSON.parse(String(init!.body));
    return new Response(JSON.stringify({ id: 'abc2345', exp: Date.now() + sent!.ttl * 1000 }), { status: 201, headers: { 'content-type': 'application/json' } });
  }) as typeof fetch;
  try {
    await menu('Share', /Shorter link/);
    const dialog = $('#short-dialog');
    expect(dialog.hasAttribute('open')).toBe(true);
    const ttl = $('sl-radio-group', dialog) as unknown as HTMLElement & { value: string };
    ttl.value = $$('sl-radio-button', dialog).find((r) => text(r) === 'A day')!.getAttribute('value')!;
    ttl.dispatchEvent(new CustomEvent('sl-change', { bubbles: true, composed: true }));
    await idle();
    await press(/Make the short link/, dialog);
    await until(() => dialog.querySelector('code'), 'the short link');
    expect(text($('code', dialog))).toMatch(/^https:\/\/tinier\.tinylittleoffice\.com\/abc2345#[A-Za-z0-9_-]{22}$/);
    expect(text(dialog)).toContain('Expires');
    expect(sent!.ttl).toBe(86400);
    // Nothing of the document went to the server: not its words, not its link.
    expect(JSON.stringify(sent)).not.toContain('Secret');
    expect(JSON.stringify(sent)).not.toContain(link().payload);
    expect(await navigator.clipboard.readText()).toMatch(/^https:\/\/tinier\.tinylittleoffice\.com\/abc2345#/);
  } finally {
    globalThis.fetch = offline;
  }
});
