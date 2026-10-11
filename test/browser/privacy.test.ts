// Privacy, restored after the rebuild lost it (Paul, 2026-10-09): the unlock dialog, Password… and the re-seal on
// every change, the state beside the title, what the device holds, and the zip. Signing is gone (Paul, 2026-10-11:
// "Get rid of signatures everywhere, including templates"): a signature said more than it proved.
import { test, expect, afterEach, beforeAll, vi } from 'vitest';
import { unzipSync, strFromU8 } from 'fflate';
import { mount, tick, until, openShare as openShareFromDrawer } from './helpers.ts';
import { decodeDoc, encodeDoc, isSealed } from '../../src/kit/codec.ts';
import { parseHash } from '../../src/kit/route.ts';
import { PREFS, forgetPrefs, prefsKept, lockCost, lockWith, pack, unlock } from '../../src/kit/privacy.ts';
import { forgetAll, keep, library } from '../../src/kit/library.ts';
import { keepLink } from '../../src/kit/links.ts';
import { setKeeping, store } from '../../src/kit/store.ts';
import { BASE } from '../../src/kit/zoom.ts';
import { chosenLanguage, language, setLanguage } from '../../src/kit/i18n.ts';
import type { ToShell } from '../../src/kit/shell.ts';
import type { ToText } from '../../src/kit/text.ts';
import type { ToDialog } from '../../src/kit/dialog.ts';
import type { ToPrivacy } from '../../src/kit/privacy-dialog.ts';

beforeAll(() => {
  // A password is slow to try on purpose; here, for both sides at once, it is quick.
  lockCost.iterations = 1000;
});
afterEach(() => {
  vi.restoreAllMocks();
  setKeeping(false);
  store.remove('to-theme');
  history.replaceState(null, '', location.pathname);
});

const NOT_OPENED = 'That password does not open this link. If you are sure of it, the link may have been cut short when it was copied: ask for it again, or for a short link.';
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
/** What saveFile hands over (through the browser's own save-as), while `body` runs. */
async function saved(body: (files: () => File[]) => Promise<void>) {
  const files: File[] = [];
  const w = window as unknown as { showSaveFilePicker?: unknown };
  const had = w.showSaveFilePicker;
  w.showSaveFilePicker = async () => ({ createWritable: async () => ({ write: async (f: File) => void files.push(f), close: async () => {} }) });
  try {
    await body(() => files);
  } finally {
    w.showSaveFilePicker = had;
  }
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

test('Password… sets a password: the address bar holds ciphertext, sealed again on every change; removed, the plain link is back', async () => {
  const shell = await mount(`#/v1/write/${encodeDoc('Plain words.\n')}`);
  await until(() => !!shell.querySelector('to-write-editor to-text .tx p'));
  await openShare(shell);
  expect(shell.querySelector('.to-share-protect .to-trust-line')!.textContent).toContain('No password');
  shell.querySelector<HTMLButtonElement>('.to-password-open')!.click();
  const pd = dialog(shell, 'to-password-dialog');
  await until(() => pd.dialog.open);
  const [a, b] = [...shell.querySelectorAll<HTMLInputElement>('.to-password-new')];
  const set = shell.querySelector<HTMLButtonElement>('.to-password-set')!;
  fill(a, 'tulip');
  fill(b, 'tulips');
  expect(set.disabled).toBe(true);
  expect(shell.querySelector('.to-password-differ')!.textContent).toBe('The two passwords differ');
  fill(b, 'tulip');
  expect(set.disabled).toBe(false);
  // A short password says what it costs, and Set asks once before it is used.
  expect(shell.querySelector('.to-password-cost')!.getAttribute('role')).toBe('status');
  expect(shell.querySelector('.to-password-cost')!.textContent).toBe('Someone with the link can guess this offline. Use Generate, or four or more random words.');
  expect(shell.querySelector('.to-password-send')!.textContent).toBe('Send the password another way than the link.');
  const ask = vi.spyOn(window, 'confirm').mockReturnValueOnce(false);
  set.click();
  expect(ask).toHaveBeenCalledTimes(1);
  await tick();
  expect(isSealed(payload())).toBe(false);
  ask.mockReturnValueOnce(true);
  set.click();
  expect(ask).toHaveBeenCalledTimes(2);
  await until(() => isSealed(payload()) && !pd.dialog.open);
  expect(location.hash).not.toContain(encodeDoc('Plain words.\n').slice(1, 12));
  expect(decodeDoc(payload())).toBe('');
  const first = payload();
  expect((await unlock('tulip', first))!.text).toContain('Plain words.');
  // An edit is sealed again: a new ciphertext, the new words inside it.
  await type(shell, 'More. ');
  await until(() => payload() !== first);
  expect(isSealed(payload())).toBe(true);
  expect((await unlock('tulip', payload()))!.text).toContain('More. Plain words.');
  // The links to share are the ciphertext too.
  expect(parseHash(new URL(shell.link).hash).payload).toBe(payload());
  // Removed: the link is the plain text again.
  shell.querySelector<HTMLButtonElement>('.to-password-open')!.click();
  await until(() => pd.dialog.open && !!shell.querySelector('.to-password-remove'));
  shell.querySelector<HTMLButtonElement>('.to-password-remove')!.click();
  await until(() => !isSealed(payload()));
  expect(decodeDoc(payload())).toContain('More. Plain words.');
});

test('Under Saved, a sealed document is kept as ciphertext, with no name; the home page calls it locked', async () => {
  setKeeping(true);
  const shell = await mount(await sealedLink('---\ntitle: Salaries\n---\nWords.\n', 'pw'));
  await until(() => dialog(shell, 'to-unlock-dialog').dialog.open);
  fill(shell.querySelector<HTMLInputElement>('.to-unlock-field')!, 'pw');
  shell.querySelector<HTMLButtonElement>('.to-unlock-go')!.click();
  await until(() => !!shell.querySelector('to-write-editor to-text .tx p'));
  await type(shell, 'x');
  await until(() => library().length === 1, 3000);
  const [kept] = library();
  expect(kept.title).toBe('');
  expect(isSealed(parseHash(kept.hash).payload)).toBe(true);
  expect(JSON.stringify(localStorage)).not.toContain('Salaries');
  expect(JSON.stringify(localStorage)).not.toContain('pw');
  const home = await mount('');
  await until(() => !!home.querySelector('.to-drive-words span'));
  expect(home.querySelector('.to-drive-words span')!.textContent).toBe('Locked document');
});

test('what this device holds, item by item with Forget, and Download everything: every kept document in one zip', async () => {
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
  const shell = await mount('');
  shell.querySelector<HTMLButtonElement>('.to-burger')!.click();
  await until(() => !!shell.querySelector('.to-drawer-privacy'));
  shell.querySelector<HTMLButtonElement>('.to-drawer-privacy')!.click();
  const privacy = shell.querySelector<ToPrivacy>('to-drawer to-privacy')!;
  await until(() => !!privacy.querySelector('.to-held'));
  // No document here: the document's own section is not shown.
  expect(privacy.querySelector('.to-privacy-doc')).toBeNull();
  const now = (cls: string) => privacy.querySelector(`.${cls} .to-held-now`)!.textContent;
  expect(now('to-held-docs')).toBe('3 documents');
  expect(now('to-held-links')).toBe('1 link');
  // The theme, and nothing else.
  expect(now('to-held-prefs')).toBe('1 set');
  // The zip: each document as its text, the locked one as its link.
  await saved(async (files) => {
    privacy.querySelector<HTMLButtonElement>('.to-download-all')!.click();
    await until(() => files().length === 1);
    const zip = unzipSync(new Uint8Array(await files()[0].arrayBuffer()));
    expect(files()[0].name).toBe('tiny-little-office.zip');
    expect(Object.keys(zip).sort()).toEqual(['sheet/untitled.tlo', 'write/launch-notes.tlo', 'write/locked.txt']);
    expect(strFromU8(zip['write/launch-notes.tlo'])).toBe('---\ntitle: Launch notes\n---\nGo.\n');
    expect(strFromU8(zip['write/locked.txt'])).toMatch(/#\/v1\/write\/E[\w~]+\n$/);
  });
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

// Which documents were told they are copies (kit/shell.ts) is something this device holds: counted, and forgotten with the rest.
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
    const shell = await mount('');
    shell.querySelector<HTMLButtonElement>('.to-burger')!.click();
    await until(() => !!shell.querySelector('.to-drawer-privacy'));
    shell.querySelector<HTMLButtonElement>('.to-drawer-privacy')!.click();
    const privacy = shell.querySelector<ToPrivacy>('to-drawer to-privacy')!;
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
  const shell = await mount('');
  shell.querySelector<HTMLButtonElement>('.to-burger')!.click();
  await until(() => !!shell.querySelector('.to-drawer-privacy'));
  shell.querySelector<HTMLButtonElement>('.to-drawer-privacy')!.click();
  const privacy = shell.querySelector<ToPrivacy>('to-drawer to-privacy')!;
  await until(() => !!privacy.querySelector('.to-held'));
  const row = privacy.querySelector('.to-held-history')!;
  expect(row.querySelector('b')!.textContent).toBe('Your browser’s history');
  expect(row.querySelector('small')!.textContent).toBe('Every document opened here, in full, unless it has a password.');
  expect(row.querySelector('.to-held-now')!.textContent).toBe('Not ours to clear');
  expect(row.querySelector('.to-held-forget')).toBeNull();
});

test('Generate a strong password fills both fields, shows it, enables Set, and Copy copies it', async () => {
  const shell = await mount('#/v1/write');
  await until(() => !!shell.querySelector('to-text .tx'));
  await openShare(shell);
  shell.querySelector<HTMLButtonElement>('.to-password-open')!.click();
  await until(() => !!shell.querySelector('.to-password-dialog dialog[open]'));
  const fields = [...shell.querySelectorAll<HTMLInputElement>('.to-password-new')];
  const set = shell.querySelector<HTMLButtonElement>('.to-password-set')!;
  expect(set.disabled).toBe(true);
  const written: string[] = [];
  const clip = navigator.clipboard.writeText;
  Object.defineProperty(navigator.clipboard, 'writeText', { value: (s: string) => (written.push(s), Promise.resolve()), configurable: true });
  try {
    shell.querySelector<HTMLButtonElement>('.to-password-generate')!.click();
    await until(() => fields[0].value.length === 23);
    expect(fields[1].value).toBe(fields[0].value);
    expect(fields[0].type).toBe('text');
    expect(fields[0].value).toMatch(/^[^-]{5}-[^-]{5}-[^-]{5}-[^-]{5}$/);
    expect(shell.querySelector<HTMLElement>('.to-password-made')!.hidden).toBe(false);
    expect(set.disabled).toBe(false);
    // Twenty random characters: nothing to warn of.
    expect(shell.querySelector('.to-password-cost')!.textContent).toBe('');
    shell.querySelector<HTMLButtonElement>('.to-password-copy')!.click();
    await until(() => written.length === 1);
    expect(written[0]).toBe(fields[0].value);
  } finally {
    Object.defineProperty(navigator.clipboard, 'writeText', { value: clip, configurable: true });
  }
});

test('a sealed link cut short in a chat, with the right password, is not called a wrong password', async () => {
  const link = await sealedLink('---\ntitle: Salaries\n---\nWords.\n', 'pw');
  const shell = await mount(link.slice(0, -10));
  await until(() => dialog(shell, 'to-unlock-dialog').dialog.open);
  fill(shell.querySelector<HTMLInputElement>('.to-unlock-field')!, 'pw');
  shell.querySelector<HTMLButtonElement>('.to-unlock-go')!.click();
  await until(() => shell.querySelector('.to-unlock-wrong')!.textContent === NOT_OPENED);
});

test('signing is gone (Paul, 2026-10-11): the state beside the title is a password alone; Share holds the password and no Sign; the Privacy dialog no key', async () => {
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
  const home = await mount('');
  home.querySelector<HTMLButtonElement>('.to-burger')!.click();
  await until(() => !!home.querySelector('.to-drawer-privacy'));
  home.querySelector<HTMLButtonElement>('.to-drawer-privacy')!.click();
  const privacy = home.querySelector<ToPrivacy>('to-drawer to-privacy')!;
  await until(() => !!privacy.querySelector('.to-held'));
  expect(privacy.querySelector('.to-privacy-key, .to-held-key, .to-held-known, .to-zip-key')).toBeNull();
  expect(privacy.textContent).not.toMatch(/sign/i);
  // A sealed link: the lock, and the unlock dialog from it.
  const sealed = await mount(await sealedLink('x', 'pw'));
  await until(() => pill(sealed)?.classList.contains('locked'));
  expect(pill(sealed).textContent!.trim()).toBe('Locked');
});
