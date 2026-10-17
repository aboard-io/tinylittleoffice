// Privacy (Paul, 2026-10-09): the unlock dialog, Password… and the re-seal on
// every change, the state beside the title, and what the device holds.
import { test, expect, afterEach, vi } from 'vitest';
import { link, mount, privacyAlone, tick, until, said, openShare as openShareFromDrawer } from './helpers.ts';
import { decodeDoc, encodeDoc, isSealed } from '../../src/kit/core/codec.ts';
import { parseHash } from '../../src/kit/core/route.ts';
import { PREFS, forgetPrefs, prefsKept, lockWith, unlock } from '../../src/kit/share/privacy.ts';
import { pack } from '../../src/kit/share/crypt.ts';
import { forgetAll, keep, library } from '../../src/kit/share/library.ts';
import { keepLink } from '../../src/kit/share/kept-links.ts';
import { setKeeping, store } from '../../src/kit/core/store.ts';
import { BASE } from '../../src/kit/ui/zoom.ts';
import { chosenLanguage, language, setLanguage } from '../../src/kit/core/i18n.ts';
import type { ToShell } from '../../src/kit/core/shell.ts';
import type { ToText } from '../../src/kit/text/text.ts';
import type { ToDialog } from '../../src/kit/ui/dialog.ts';

afterEach(() => {
  vi.restoreAllMocks();
  setKeeping(false);
  store.remove('to-theme');
  history.replaceState(null, '', location.pathname);
});

const NOT_OPENED = 'That password doesn’t open this link. If you’re sure it’s right, the link may have been cut off when it was copied. Ask for it again, or for a short link.';
const payload = () => parseHash(location.hash).payload;
const pill = (shell: ToShell) => shell.querySelector<HTMLButtonElement>('.to-header .to-trust')!;
const dialog = (shell: ToShell, cls: string) => shell.querySelector<ToDialog>(`to-dialog.${cls}`)!;

/** Words typed into Write's editor at the start. */
async function type(shell: ToShell, words: string) {
  await until(() => !!shell.querySelector('to-write-editor to-text .tx'));
  const text = shell.querySelector<ToText>('to-text')!;
  await text.updateComplete;
  text.focus();
  text.sel = { anchor: { block: 0, offset: 0 }, focus: { block: 0, offset: 0 } };
  for (const ch of words) {
    text.tx.dispatchEvent(new InputEvent('beforeinput', { inputType: 'insertText', data: ch, bubbles: true, cancelable: true }));
    await text.updateComplete;
  }
  await shell.updateComplete;
}
async function openShare(shell: ToShell) {
  await openShareFromDrawer(shell);
  await until(() => dialog(shell, 'to-share-dialog').dialog.open && !!shell.querySelector('.to-share-protect'));
}
/** A field given words as a person types them. */
function fill(field: HTMLInputElement | HTMLTextAreaElement, value: string) {
  field.value = value;
  field.dispatchEvent(new Event('input', { bubbles: true }));
}
async function sealedLink(text: string, password: string) {
  return `#/v1/write/${await pack(text, await lockWith(password))}`;
}

test('a sealed link opens with the unlock dialog: nothing of the document shown, a wrong password said so, the right one opens it', async () => {
  const shell = await mount(await sealedLink('---\ntitle: Salaries\n---\nThe secret words.\n', 'correct horse'));
  const d = dialog(shell, 'to-unlock-dialog');
  await until(() => d.dialog.open);
  const field = shell.querySelector<HTMLInputElement>('.to-unlock-field')!;
  expect(field.type).toBe('password');
  // 16 of the nav's pixels (a phone never zooms on less), at the normal size BASE × 16px.
  expect(parseFloat(getComputedStyle(field).fontSize)).toBeCloseTo(16 * BASE, 1);
  // The title is the ciphertext's too: hidden.
  expect(document.title).toBe('Locked document · Tiny Little Office');
  expect(shell.textContent).not.toContain('Salaries');
  expect(shell.querySelector('to-write-editor')).toBeNull();
  expect(pill(shell).classList.contains('locked')).toBe(true);
  fill(field, 'wrong horse');
  shell.querySelector<HTMLButtonElement>('.to-unlock-go')!.click();
  await until(() => shell.querySelector('.to-unlock-wrong')!.textContent === NOT_OPENED);
  expect(field.getAttribute('aria-invalid')).toBe('true');
  expect(d.dialog.open).toBe(true);
  fill(field, 'correct horse');
  await shell.updateComplete;
  expect(shell.querySelector('.to-unlock-wrong')!.textContent).toBe('');
  shell.querySelector<HTMLButtonElement>('.to-unlock-go')!.click();
  await until(() => !d.dialog.open && !!shell.querySelector('to-write-editor to-text .tx p'));
  expect(shell.querySelector('to-text .tx p')!.textContent).toBe('The secret words.');
  expect(document.title).toBe('Locked document · Tiny Little Office');
  expect(pill(shell).classList.contains('quiet')).toBe(true);
  expect(pill(shell).textContent!.trim()).toBe('Protected by a password');
  // The address still holds the ciphertext alone.
  expect(isSealed(payload())).toBe(true);
  // Opened again this visit, it does not ask again.
  const again = await mount(location.hash);
  await until(() => !!again.querySelector('to-write-editor to-text .tx p'));
  expect(dialog(again, 'to-unlock-dialog').dialog.open).toBe(false);
});

test('Escape leaves a sealed document closed, its title hidden, with Unlock… to ask again', async () => {
  const shell = await mount(await sealedLink('---\ntitle: Salaries\n---\nWords.\n', 'pw'));
  const d = dialog(shell, 'to-unlock-dialog');
  await until(() => d.dialog.open);
  d.dialog.dispatchEvent(new Event('cancel', { cancelable: true }));
  d.dialog.close();
  await until(() => !d.dialog.open);
  await shell.updateComplete;
  expect(shell.querySelector('.to-locked p')!.textContent).toBe('This document is locked with a password.');
  expect(shell.querySelector('.to-title-locked')!.textContent).toBe('Locked document');
  expect(shell.textContent).not.toContain('Salaries');
  // Locked: the name alone, and nothing in the drawer to share or download.
  expect(shell.querySelector('.to-header .to-title-locked')).not.toBeNull();
  shell.querySelector<HTMLButtonElement>('.to-unlock-open')!.click();
  await until(() => d.dialog.open);
});

test('Password… shows a password the app made, with no field to type one; Set seals with it and it opens the document; removed, the plain link is back', async () => {
  const shell = await mount(`#/v1/write/${encodeDoc('Plain words.\n')}`);
  await until(() => !!shell.querySelector('to-write-editor to-text .tx p'));
  await openShare(shell);
  expect(shell.querySelector('.to-share-protect .to-trust-line')!.textContent).toContain('No password');
  shell.querySelector<HTMLButtonElement>('.to-password-open')!.click();
  const pd = dialog(shell, 'to-password-dialog');
  await until(() => pd.dialog.open);
  // Nothing to type in (Paul, 2026-10-11: "Only you can generate passwords for users"): one box, read-only, holding it.
  const writable = [...pd.querySelectorAll<HTMLInputElement | HTMLTextAreaElement>('input, textarea')].filter((f) => !f.readOnly && !f.disabled);
  expect(writable).toEqual([]);
  expect(pd.querySelector('[contenteditable]')).toBeNull();
  const box = pd.querySelector<HTMLInputElement>('.to-password-made')!;
  expect(box.readOnly).toBe(true);
  expect(box.value).toMatch(/^[^-]{5}-[^-]{5}-[^-]{5}-[^-]{5}$/);
  expect(box.getAttribute('aria-label')).toBe('Password');
  expect(pd.querySelector('.to-password-send')!.textContent).toBe('Copy this password and send it separately from the link. It won’t be shown again.');
  // No strength line, no second field, nothing to compare.
  expect(pd.querySelector('.to-password-cost, .to-password-differ, .to-password-new, .to-password-generate')).toBeNull();
  const password = box.value;
  const set = pd.querySelector<HTMLButtonElement>('.to-password-set')!;
  expect(set.disabled).toBe(false);
  set.click();
  await until(() => isSealed(payload()) && !pd.dialog.open);
  expect(location.hash).not.toContain(encodeDoc('Plain words.\n').slice(1, 12));
  expect(decodeDoc(payload())).toBe('');
  const first = payload();
  expect((await unlock(password, first))!.text).toContain('Plain words.');
  // An edit is sealed again: a new ciphertext, the new words inside it.
  await type(shell, 'More. ');
  // The address is written when typing stops: a read of the link brings it on, and the sealing follows.
  link();
  await until(() => payload() !== first);
  expect(isSealed(payload())).toBe(true);
  expect((await unlock(password, payload()))!.text).toContain('More. Plain words.');
  // The links to share are the ciphertext too.
  expect(parseHash(new URL(shell.link).hash).payload).toBe(payload());
  // Changing it is the same dialog with a new one made; Remove the password stays.
  shell.querySelector<HTMLButtonElement>('.to-password-open')!.click();
  await until(() => pd.dialog.open && !!shell.querySelector('.to-password-remove'));
  expect(pd.querySelector<HTMLInputElement>('.to-password-made')!.value).not.toBe(password);
  expect(pd.querySelector('.to-password-set')!.textContent!.trim()).toBe('Change password');
  shell.querySelector<HTMLButtonElement>('.to-password-remove')!.click();
  await until(() => !isSealed(payload()));
  expect(decodeDoc(payload())).toContain('More. Plain words.');
});

test('Under Saved, a sealed document is kept as ciphertext, with no name; the home page calls it locked', async () => {
  setKeeping(true);
  const shell = await mount(await sealedLink('---\ntitle: Salaries\n---\nWords.\n', 'Zq7-never-in-base64-Vx'));
  await until(() => dialog(shell, 'to-unlock-dialog').dialog.open);
  fill(shell.querySelector<HTMLInputElement>('.to-unlock-field')!, 'Zq7-never-in-base64-Vx');
  shell.querySelector<HTMLButtonElement>('.to-unlock-go')!.click();
  await until(() => !!shell.querySelector('to-write-editor to-text .tx p'));
  await type(shell, 'x');
  link();
  await until(() => library().length === 1, 3000);
  const [kept] = library();
  expect(kept.title).toBe('');
  expect(isSealed(parseHash(kept.hash).payload)).toBe(true);
  expect(JSON.stringify(localStorage)).not.toContain('Salaries');
  // A password random ciphertext cannot spell by chance ('pw' turned up inside base64 once in a while, and the test flaked).
  expect(JSON.stringify(localStorage)).not.toContain('never-in-base64');
  expect(JSON.stringify(localStorage)).not.toContain('Words.');
  const home = await mount('');
  await until(() => !!home.querySelector('.to-drive-words span'));
  expect(home.querySelector('.to-drive-words span')!.textContent).toBe('Locked document');
});

// Download everything is gone (Paul, 2026-10-12: "Get rid of … zip download"), and its test of the zip's names and heads with it.

test('what this device holds, item by item with Forget, and no Download everything', async () => {
  setKeeping(true);
  // What an earlier test kept, carried in from the visit's memory, is not this test's.
  forgetAll();
  keep({ id: 'a', app: 'write', title: 'Launch notes', hash: `#/v1/write/${encodeDoc('---\ntitle: Launch notes\n---\nGo.\n')}`, at: Date.now() });
  keep({ id: 'b', app: 'sheet', title: '', hash: `#/v1/sheet/${encodeDoc('a | b\n--- | ---\n1 | 2\n')}`, at: Date.now() - 1 });
  keep({ id: 'c', app: 'write', title: '', hash: `#/v1/write/${await pack('secret', await lockWith('pw'))}`, at: Date.now() - 2 });
  keepLink({ link: 'https://tinier.example/abcdefg#k', title: 'Launch notes', made: Date.now(), expires: Date.now() + 86_400_000 });
  // The preferences other test files on this origin left on the device are not this test's: gone, then the one it sets.
  for (const k of PREFS) (store.remove(k), localStorage.removeItem(k));
  store.set('to-theme', 'dark');
  await mount('');
  // The Privacy dialog alone (the menu no longer opens it: Paul, 2026-10-11), as a page without a document draws it.
  const privacy = await privacyAlone();
  await until(() => !!privacy.querySelector('.to-held'));
  // No document here: the document's own section is not shown.
  expect(privacy.querySelector('.to-privacy-doc')).toBeNull();
  const now = (cls: string) => privacy.querySelector(`.${cls} .to-held-now`)!.textContent;
  expect(now('to-held-docs')).toBe('3 documents');
  expect(now('to-held-links')).toBe('1 link');
  // The theme, and nothing else.
  expect(now('to-held-prefs')).toBe('1 set');
  // No zip of them: Download everything is gone (Paul, 2026-10-12).
  expect(privacy.querySelector('.to-download-all, .to-privacy-zip')).toBeNull();
  // Forget, one by one.
  privacy.querySelector<HTMLButtonElement>('.to-held-links .to-held-forget')!.click();
  await until(() => now('to-held-links') === '0 links');
  privacy.querySelector<HTMLButtonElement>('.to-held-docs .to-held-forget')!.click();
  await until(() => now('to-held-docs') === '0 documents');
  expect(library()).toEqual([]);
  // Forget everything, and Private from now on.
  vi.spyOn(window, 'confirm').mockReturnValue(true);
  privacy.querySelector<HTMLButtonElement>('.to-forget-all')!.click();
  await until(() => now('to-held-prefs') === 'None');
  expect(Object.keys(localStorage).filter((k) => k.startsWith('tinyoffice.') || k === 'to-theme')).toEqual([]);
  await tick();
});

// Which documents were told they are copies (kit/core/shell.ts) is something this device holds: counted, and forgotten with the rest.
test('the copies already told are counted among the preferences and forgotten with them', () => {
  try {
    setKeeping(true);
    for (const k of PREFS) store.remove(k);
    expect(prefsKept()).toBe(0);
    store.set('tinyoffice.copiesSaid', '["abc"]');
    expect(localStorage.getItem('tinyoffice.copiesSaid')).toBe('["abc"]');
    expect(prefsKept()).toBe(1);
    forgetPrefs();
    expect(prefsKept()).toBe(0);
    expect(localStorage.getItem('tinyoffice.copiesSaid')).toBeNull();
  } finally {
    setKeeping(false);
  }
});

test('the language is never among what the device holds: chosen, it counts no preference, and after Forget everything no key remains', async () => {
  try {
    setKeeping(true);
    store.set('to-theme', 'dark');
    await setLanguage('de');
    vi.spyOn(window, 'confirm').mockReturnValue(true);
    await mount('');
    // The Privacy dialog alone (the menu no longer opens it: Paul, 2026-10-11), as a page without a document draws it.
    const privacy = await privacyAlone();
    await until(() => !!privacy.querySelector('.to-held'));
    const now = (cls: string) => privacy.querySelector(`.${cls} .to-held-now`)!.textContent;
    // The theme alone: the language is in the link, not on the device.
    expect(now('to-held-prefs')!.startsWith('1 ')).toBe(true);
    expect(location.hash).toBe('#/?lang=de');
    privacy.querySelector<HTMLButtonElement>('.to-forget-all')!.click();
    await until(() => localStorage.getItem('to-theme') === null);
    expect(Object.keys(localStorage).filter((k) => k.startsWith('tinyoffice.') || k === 'to-theme')).toEqual([]);
    // Nothing on the device ever held it, so nothing changes under the person: the page is in German still, as its link says.
    expect(language()).toBe('de');
    expect(chosenLanguage()).toBe('de');
  } finally {
    await setLanguage(null);
  }
});

test("What this device holds names the browser's history: not ours to clear, every document opened here", async () => {
  await mount('');
  // The Privacy dialog alone (the menu no longer opens it: Paul, 2026-10-11), as a page without a document draws it.
  const privacy = await privacyAlone();
  await until(() => !!privacy.querySelector('.to-held'));
  const row = privacy.querySelector('.to-held-history')!;
  expect(row.querySelector('b')!.textContent).toBe('Your browser’s history');
  expect(row.querySelector('small')!.textContent).toBe('Every document you open, in full, unless it has a password.');
  expect(row.querySelector('.to-held-now')!.textContent).toBe('We can’t clear this');
  expect(row.querySelector('.to-held-forget')).toBeNull();
});

test('Make another makes a new password; Copy puts the one shown on the clipboard and says so; the one shown is the one set', async () => {
  const shell = await mount('#/v1/write');
  await until(() => !!shell.querySelector('to-text .tx'));
  await openShare(shell);
  shell.querySelector<HTMLButtonElement>('.to-password-open')!.click();
  await until(() => !!shell.querySelector('.to-password-dialog dialog[open]'));
  const box = shell.querySelector<HTMLInputElement>('.to-password-made')!;
  const first = box.value;
  shell.querySelector<HTMLButtonElement>('.to-password-another')!.click();
  await until(() => box.value !== first);
  expect(box.value).toMatch(/^[^-]{5}-[^-]{5}-[^-]{5}-[^-]{5}$/);
  const written: string[] = [];
  const clip = navigator.clipboard.writeText;
  Object.defineProperty(navigator.clipboard, 'writeText', { value: (s: string) => (written.push(s), Promise.resolve()), configurable: true });
  try {
    shell.querySelector<HTMLButtonElement>('.to-password-copy')!.click();
    await until(() => written.length === 1);
    expect(written[0]).toBe(box.value);
    await until(() => said() === 'Password copied');
  } finally {
    Object.defineProperty(navigator.clipboard, 'writeText', { value: clip, configurable: true });
  }
  const shown = box.value;
  shell.querySelector<HTMLButtonElement>('.to-password-set')!.click();
  await until(() => isSealed(payload()));
  expect(await unlock(first, payload())).toBeNull();
  expect(await unlock(shown, payload())).not.toBeNull();
});

test('a sealed link cut short in a chat, with the right password, is not called a wrong password', async () => {
  const link = await sealedLink('---\ntitle: Salaries\n---\nWords.\n', 'pw');
  const shell = await mount(link.slice(0, -10));
  await until(() => dialog(shell, 'to-unlock-dialog').dialog.open);
  fill(shell.querySelector<HTMLInputElement>('.to-unlock-field')!, 'pw');
  shell.querySelector<HTMLButtonElement>('.to-unlock-go')!.click();
  await until(() => shell.querySelector('.to-unlock-wrong')!.textContent === NOT_OPENED);
});

test('the state beside the title is a password alone; Share holds the password and nothing else of the kind; the Privacy dialog no key', async () => {
  const shell = await mount(`#/v1/write/${encodeDoc('---\ntitle: Terms\n---\nWe agree.\n')}`);
  await until(() => !!shell.querySelector('to-write-editor to-text .tx p'));
  // No password: nothing to say beside the title.
  expect(shell.querySelector('.to-header .to-trust')).toBeNull();
  await openShare(shell);
  const protect = shell.querySelector('.to-share-protect')!;
  expect(protect.querySelector('h3')!.textContent).toBe('Password');
  expect(protect.querySelector('.to-sign, .to-sign-name, .to-unsign')).toBeNull();
  expect(protect.textContent).not.toMatch(/sign/i);
  // The menu's Privacy dialog: what the device holds, and no key among it.
  await mount('');
  // The Privacy dialog alone (the menu no longer opens it: Paul, 2026-10-11), as a page without a document draws it.
  const privacy = await privacyAlone();
  await until(() => !!privacy.querySelector('.to-held'));
  expect(privacy.querySelector('.to-privacy-key, .to-held-key, .to-held-known, .to-zip-key')).toBeNull();
  expect(privacy.textContent).not.toMatch(/sign/i);
  // A sealed link: the lock, and the unlock dialog from it.
  const sealed = await mount(await sealedLink('x', 'pw'));
  await until(() => pill(sealed)?.classList.contains('locked'));
  expect(pill(sealed).textContent!.trim()).toBe('Locked');
});
