// A document's password and signature, through the shell: what the dialog says, and what the link carries (ported from e2e/shell.spec.ts).
// (WebCrypto here is node's own: Ed25519, PBKDF2 and AES-GCM, the same calls a browser answers.)
import { test, expect } from 'vitest';
import { open, fresh, reopen, idle, until, link, $, $$, text, fill, press, menu, slBox, downloads } from './helpers-shell.ts';

const dialog = () => $('#doc-dialog');
const head = () => text($('.to-header .meta'));
/** The ring of the meter opens the document's dialog. */
async function info() {
  $('.to-meter sl-progress-ring').click();
  await idle();
  expect(dialog().hasAttribute('open')).toBe(true);
}
async function done() {
  await press('Done', dialog());
  await until(() => !dialog().hasAttribute('open'), 'the dialog to close');
}
/** A task added to the list: the cheapest document to work (the e2e tests used a sheet; nothing here is the sheet's). */
async function add(task: string) {
  const box = $('sl-input.todo-new');
  fill(box, task);
  box.dispatchEvent(new KeyboardEvent('keydown', { key: 'Enter', bubbles: true }));
  await idle();
}
const tasks = () => $$('.todo-list li sl-checkbox').map((c) => text(c).replace(/^Done: /, ''));

test('signing a document, and a change after it is seen', async () => {
  await open('#/v0/todo');
  await add('42');
  await info();
  expect(text(dialog())).toContain('Unsigned');
  expect($$('dd code', dialog())).toHaveLength(0);
  await press('Sign', dialog());
  await until(() => text(dialog()).includes('Valid'), 'a valid signature');
  expect(text(dialog())).toMatch(/\(yours\)/);
  const fp = text($('dd code', dialog()));
  expect(fp).toMatch(/^[0-9a-f]{5}-[0-9a-f]{5}$/);
  await done();
  expect(head()).toContain('signed');
  // The link carries the key and the signature.
  expect(link().env).toMatchObject({ key: expect.any(String), sig: expect.any(String) });
  const signed = location.hash;

  // The signature verifies in a fresh page, then breaks on an edit.
  await reopen();
  await until(() => head().includes('signed'), 'the signature checked');
  await add('43');
  await until(() => head().includes('signature mismatch'), 'the mismatch seen');
  await info();
  expect(text(dialog())).toContain('Mismatch');
  await press('Re-sign', dialog());
  await until(() => text(dialog()).includes('Valid'), 'signed again');
  await press('Remove', dialog());
  await until(() => text(dialog()).includes('Unsigned'), 'unsigned');
  await done();
  expect($$('.to-header .meta sl-tag')).toHaveLength(0);
  expect(link().env!.sig).toBeUndefined();

  // A tampered link reads as a mismatch, never as valid.
  const tampered = signed.replace(/#\/v0\/todo\/([yzr])(.)/, (_m, f: string, c: string) => `#/v0/todo/${f}${c === 'A' ? 'B' : 'A'}`);
  await open(tampered);
  await idle();
  await new Promise((r) => setTimeout(r, 50));
  await idle();
  expect(head()).not.toMatch(/\bsigned\b(?! mismatch)/);
});

test('signing keys can be exported and imported', async () => {
  await open('#/v0/todo');
  await info();
  await press('Export', dialog());
  const key = await until(() => $<HTMLTextAreaElement>('textarea[aria-label="Key"]', dialog()).value, 'the key');
  expect(JSON.parse(key)).toHaveProperty('priv');
  expect(await navigator.clipboard.readText()).toBe(key);
  const fp = await until(() => text(dialog().querySelector('dd code')), 'the fingerprint');

  // Another browser: nothing kept, then the key brought in.
  localStorage.clear();
  localStorage.setItem('tinyoffice.keep', '1');
  localStorage.setItem('tinyoffice.open', 'edit');
  await open('#/v0/todo');
  await info();
  // (What the privacy object remembers of the key is the module's; the page's own record is gone.)
  await press('Import', dialog());
  fill($('textarea[aria-label="Key"]', dialog()), key);
  await idle();
  await press('Use key', dialog());
  await until(() => text(dialog().querySelector('dd code')) === fp, 'the imported key in use');
});

test('a password locks the link, and is asked for before anything is shown', async () => {
  await open('#/v0/todo');
  await add('payroll 2026');
  const plain = location.hash;
  await menu('Privacy', /Password/);
  expect(dialog().hasAttribute('open')).toBe(true);
  fill(slBox('New password', dialog()), 'hunter2 is weak');
  await idle();
  await press(/Lock$/, dialog());
  await until(() => text(dialog()).includes('Locked'), 'locked');
  await done();
  expect(head()).toContain('locked');
  await until(() => /^#\/v0\/todo\/E[A-Za-z0-9_-]+$/.test(location.hash), 'a sealed link');
  expect(location.hash).not.toBe(plain);
  const locked = location.hash;

  // Reopened, it asks for the password; the content is not there until it is right.
  await fresh(locked);
  const prompt = $('#pw-dialog');
  expect(prompt.hasAttribute('open')).toBe(true);
  expect(document.querySelector('to-todo')).toBeNull();
  // The caret is in the password box, ready.
  await until(() => document.activeElement?.id === 'pw-input', 'the caret in the password box');
  fill($('#pw-input'), 'wrong');
  await press(/Open$/, prompt);
  await until(() => text(prompt).includes('Wrong password'), 'the wrong password refused');
  expect(prompt.hasAttribute('open')).toBe(true);
  fill($('#pw-input'), 'hunter2 is weak');
  $('#pw-input').dispatchEvent(new KeyboardEvent('keydown', { key: 'Enter', bubbles: true }));
  await until(() => !prompt.hasAttribute('open'), 'the prompt to close');
  expect(tasks()).toEqual(['payroll 2026']);
  expect(head()).toContain('locked');

  // Edits stay sealed; the password can be removed.
  await add('bonus');
  await until(() => location.hash !== locked && location.hash.startsWith('#/v0/todo/E'), 'the edit sealed');
  await open(location.hash);
  fill($('#pw-input'), 'hunter2 is weak');
  await press(/Open$/, $('#pw-dialog'));
  await until(() => document.querySelector('to-todo'), 'the list');
  expect(tasks()).toEqual(['payroll 2026', 'bonus']);
  await info();
  await press('Remove', dialog());
  await until(() => !text(dialog()).includes('Locked'), 'unlocked');
  await done();
  await until(() => /^#\/v0\/todo\/[yzr]/.test(location.hash), 'a plain link again');
  expect(link().env!.body).toBe('- [ ] payroll 2026\n- [ ] bonus');
  await open(location.hash);
  expect($('#pw-dialog').hasAttribute('open')).toBe(false);
  expect(tasks()).toEqual(['payroll 2026', 'bonus']);
});

test('password and signature live in the privacy menu', async () => {
  await open('#/v0/todo');
  await add('1');
  await menu('Privacy', /Password/);
  expect(dialog().hasAttribute('open')).toBe(true);
  await done();
  await menu('Privacy', /Signature/);
  expect(dialog().hasAttribute('open')).toBe(true);
  await press('Sign', dialog());
  await until(() => head().includes('signed'), 'signed');
});

test('a download view waits for the password', async () => {
  await open('#/v0/todo');
  await add('secret');
  await menu('Privacy', /Password/);
  fill(slBox('New password', dialog()), 'pw');
  await idle();
  await press(/Lock$/, dialog());
  await until(() => location.hash.startsWith('#/v0/todo/E'), 'sealed');
  await done();
  downloads.length = 0;
  await open(location.hash.replace('/todo/', '/todo.md/'));
  expect(downloads).toHaveLength(0);
  fill($('#pw-input'), 'pw');
  await press(/Open$/, $('#pw-dialog'));
  await until(() => downloads.length, 'the download');
  expect(downloads[0].name).toBe('todo.md');
  expect(await downloads[0].blob.text()).toContain('- [ ] secret');
});

test('a locked document still being sealed does not take the link back from the next one', async () => {
  // Sealing an edit takes a moment (it is encrypted); going to another document in that moment must not
  // leave the address bar holding the locked one while the new one is on screen.
  await open('#/v0/todo');
  await add('first');
  await menu('Privacy', /Password/);
  fill(slBox('New password', dialog()), 'pw');
  await idle();
  await press(/Lock$/, dialog());
  await until(() => location.hash.startsWith('#/v0/todo/E'), 'sealed');
  await done();
  const box = $('sl-input.todo-new');
  fill(box, 'second');
  box.dispatchEvent(new KeyboardEvent('keydown', { key: 'Enter', bubbles: true }));
  // A link followed at once: the shell hears of it while the edit is still being encrypted.
  history.pushState(null, '', '#/v0/deck');
  // (pushState's own event is the one env-shell.ts drops; this one stands for the browser's, heard at once.)
  window.dispatchEvent(new HashChangeEvent('hashchange'));
  await new Promise((r) => setTimeout(r, 50));
  await idle();
  expect(location.hash).toBe('#/v0/deck');
  expect(document.querySelector('to-deck')).toBeTruthy();
});
