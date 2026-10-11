// Privacy, restored after the rebuild lost it (Paul, 2026-10-09: "We've lost the password-protection and
// document signing functions entirely … We need to see the signed documents and things need to be shown as
// signed or not"): the unlock dialog, Password… and the re-seal on every change, Sign and the check on open,
// stale after an edit, the state beside the title, the key, what the device holds, and the zip.
import { test, expect, afterEach, beforeAll, vi } from 'vitest';
import { unzipSync, strFromU8 } from 'fflate';
import { mount, tick, until, openShare as openShareFromDrawer, said } from './helpers.ts';
import { decodeDoc, encodeDoc, isSealed } from '../../src/kit/codec.ts';
import { parseHash } from '../../src/kit/route.ts';
import { checkSignature, PREFS, exportKey, forgetPrefs, prefsKept, forgetKey, knowKey, lockCost, lockWith, myFingerprint, myKey, pack, signerName, signWords, unlock } from '../../src/kit/privacy.ts';
import { createSigner, fingerprintOf, generate, verify } from '../../src/kit/sign.ts';
import { messageOf } from '../../src/kit/envelope.ts';
import { withHead } from '../../src/doc/tlo.ts';
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
  forgetKey();
  store.remove('tinyoffice.name');
  store.remove('tinyoffice.known');
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
/** A document signed under `name` by a key that is not this device's: somebody else's, or a forger's. */
async function signedElsewhere(text: string, name: string) {
  let kept: string | null = null;
  const other = createSigner({ get: () => kept, set: (v) => (kept = v), remove: () => (kept = null) }, () => generate('ec'));
  const unsigned = withHead(text, { by: name, created: '2026-10-05T14:32Z' });
  const { key, sig } = await other.sign(messageOf('write', unsigned));
  return { text: withHead(unsigned, { key, sig }), fp: await fingerprintOf(key) };
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
  expect(pill(shell).querySelector('.to-trust-lock')).not.toBeNull();
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

test('Sign: the name asked once and kept, the envelope written; checked on open; any change makes it stale until signed again', async () => {
  const shell = await mount(`#/v1/write/${encodeDoc('---\ntitle: Terms\n---\nWe agree.\n')}`);
  await until(() => !!shell.querySelector('to-write-editor to-text .tx p'));
  expect(pill(shell).classList.contains('quiet')).toBe(true);
  expect(pill(shell).getAttribute('aria-label')).toMatch(/^Unsigned · Private$/);
  await openShare(shell);
  fill(shell.querySelector<HTMLInputElement>('.to-sign-name')!, 'Paul');
  shell.querySelector<HTMLButtonElement>('.to-sign-go')!.click();
  await until(() => pill(shell).classList.contains('signed'));
  expect(pill(shell).textContent!.trim()).toBe('Signed by Paul');
  expect(pill(shell).title).toMatch(/^Signed by Paul · Key [a-z2-7]{5}-[a-z2-7]{5}-[a-z2-7]{5}-[a-z2-7]{5} · Private$/);
  expect(store.get('tinyoffice.name')).toBe('Paul');
  const text = decodeDoc(payload());
  expect(text).toMatch(/^---\ntitle: Terms\ncreated: \d{4}-\d\d-\d\dT\d\d:\d\dZ\nby: Paul\nkey: [\w~]{43}\nsig: [\w~]{86}\n---\nWe agree.\n$/);
  // The head line: when, and by whom.
  await until(() => /^Created .+ · by Paul$/.test(shell.querySelector('.to-share-made')?.textContent ?? ''));
  expect(shell.querySelector('.to-sign-go')!.textContent!.trim()).toBe('Sign again');
  // Opened again, it is checked at once.
  const again = await mount(location.hash);
  await until(() => pill(again).classList.contains('signed'));
  expect(pill(again).textContent!.trim()).toBe('Signed by Paul');
  // An edit: stale, and it says so.
  await type(again, 'Now ');
  await until(() => pill(again).classList.contains('mismatch'));
  expect(pill(again).textContent!.trim()).toBe('Changed since signed');
  // The name is not asked again: it is there.
  await openShare(again);
  expect(again.querySelector<HTMLInputElement>('.to-sign-name')!.value).toBe('Paul');
  again.querySelector<HTMLButtonElement>('.to-sign-go')!.click();
  await until(() => pill(again).classList.contains('signed'));
  // Removed: unsigned, and the head holds no key.
  again.querySelector<HTMLButtonElement>('.to-unsign')!.click();
  await until(() => pill(again).classList.contains('quiet'));
  expect(decodeDoc(payload())).not.toMatch(/\nsig: /);
  expect(decodeDoc(payload())).toMatch(/\ncreated: /);
});

test('the state beside the title, four ways: unsigned, signed by a key this device does not know (neutral), does not match (red), locked; it opens the Privacy dialog', async () => {
  // Signed elsewhere (the old tree, an Ed25519 key) and checked here.
  const OLD =
    '---\ntitle: Q3 budget\nby: Paul\ncreated: 2026-10-05T14:32Z\nkey: 9E3ieLH4GaPHFbLzA-gvCGg1PmAdTzYD6tiPYTW-S70\nsig: w8JnnS5IwMK42vdwH2XLmVVjO2NjNKX_lOu60fKIfDzxVRmQgkmBZz6nHqRffx5VNQYt27kWzgugnOEoIw3wBw\nchart: bar\n---\n# Budget\n\nQ | Sales:money\n--- | ---\nQ1 | 120\n';
  let shell = await mount(`#/v1/sheet/${encodeDoc(OLD)}`);
  await until(() => pill(shell).classList.contains('neutral'));
  expect(pill(shell).textContent!.trim()).toMatch(/^Signed as “Paul” · key [a-z2-7]{5}-[a-z2-7]{5}-[a-z2-7]{5}-[a-z2-7]{5}$/);
  const signed = getComputedStyle(pill(shell));
  // Somebody else's signature over words that are not what was signed.
  shell = await mount(`#/v1/sheet/${encodeDoc(OLD.replace('120', '999'))}`);
  await until(() => pill(shell).classList.contains('mismatch'));
  expect(pill(shell).textContent!.trim()).toBe('Signature does not match');
  const mismatch = getComputedStyle(pill(shell));
  expect(mismatch.color).not.toBe(signed.color);
  shell = await mount(`#/v1/sheet/${encodeDoc('a | b\n--- | ---\n1 | 2\n')}`);
  await until(() => !!pill(shell));
  expect(pill(shell).classList.contains('quiet')).toBe(true);
  // The test window is phone-narrow: a narrow header hides the quiet pill by design, so ask it at full width.
  shell.querySelector<HTMLElement>('.to-header')!.style.containerType = 'normal';
  const box = pill(shell).getBoundingClientRect();
  expect(box.height).toBeGreaterThanOrEqual(44);
  expect(box.width).toBeGreaterThanOrEqual(44);
  pill(shell).click();
  const privacy = shell.querySelector<ToPrivacy>('to-privacy[doc]')!;
  await until(() => !!privacy.querySelector('dialog')?.open && !!privacy.querySelector('.to-privacy-doc'));
  expect(privacy.querySelector('.to-privacy-doc .to-trust-line')!.textContent!.trim()).toBe('Unsigned');
  shell = await mount(await sealedLink('x', 'pw'));
  await until(() => pill(shell).classList.contains('locked'));
  expect(pill(shell).textContent!.trim()).toBe('Locked');
});

test('a browser without Ed25519 shows an Ed25519 signature as cannot check here (grey, the reason given), never as not matching', async () => {
  const OLD =
    '---\ntitle: Q3 budget\nby: Paul\ncreated: 2026-10-05T14:32Z\nkey: 9E3ieLH4GaPHFbLzA-gvCGg1PmAdTzYD6tiPYTW-S70\nsig: w8JnnS5IwMK42vdwH2XLmVVjO2NjNKX_lOu60fKIfDzxVRmQgkmBZz6nHqRffx5VNQYt27kWzgugnOEoIw3wBw\nchart: bar\n---\n# Budget\n\nQ | Sales:money\n--- | ---\nQ1 | 120\n';
  const real = crypto.subtle.importKey.bind(crypto.subtle);
  vi.spyOn(crypto.subtle, 'importKey').mockImplementation(((fmt: string, data: unknown, alg: AlgorithmIdentifier, ...rest: unknown[]) =>
    (alg as Algorithm).name === 'Ed25519'
      ? Promise.reject(new DOMException('Unrecognized name', 'NotSupportedError'))
      : (real as (...a: unknown[]) => unknown)(fmt, data, alg, ...rest)) as typeof crypto.subtle.importKey);
  // Untouched or changed, it cannot be checked here: neither is said to be valid or not.
  for (const text of [OLD, OLD.replace('120', '999')]) {
    const shell = await mount(`#/v1/sheet/${encodeDoc(text)}`);
    await until(() => pill(shell).textContent!.trim() === 'Cannot check here');
    expect(pill(shell).classList.contains('quiet')).toBe(true);
    expect(pill(shell).classList.contains('mismatch')).toBe(false);
    expect(pill(shell).title).toMatch(/^Cannot check here · This browser cannot check this kind of signature · Key [a-z2-7]{5}-[a-z2-7]{5}-[a-z2-7]{5}-[a-z2-7]{5} · Private$/);
    pill(shell).click();
    const privacy = shell.querySelector<ToPrivacy>('to-privacy[doc]')!;
    await until(() => !!privacy.querySelector('dialog')?.open && !!privacy.querySelector('.to-privacy-doc'));
    expect(privacy.querySelector('.to-privacy-doc .to-trust-line')!.classList.contains('quiet')).toBe(true);
    expect(privacy.querySelector('.to-unchecked-hint')!.textContent).toBe('This browser cannot check this kind of signature');
    privacy.close();
  }
  // Signed here, the key is P-256 (this browser's fallback): checked, green; changed, red.
  const realGen = crypto.subtle.generateKey.bind(crypto.subtle);
  vi.spyOn(crypto.subtle, 'generateKey').mockImplementation(((alg: AlgorithmIdentifier, ...rest: unknown[]) =>
    (alg as Algorithm).name === 'Ed25519'
      ? Promise.reject(new DOMException('Unrecognized name', 'NotSupportedError'))
      : (realGen as (...a: unknown[]) => unknown)(alg, ...rest)) as typeof crypto.subtle.generateKey);
  const shell = await mount(`#/v1/write/${encodeDoc('---\ntitle: Terms\n---\nWe agree.\n')}`);
  await until(() => !!shell.querySelector('to-write-editor to-text .tx p'));
  await openShare(shell);
  fill(shell.querySelector<HTMLInputElement>('.to-sign-name')!, 'Paul');
  shell.querySelector<HTMLButtonElement>('.to-sign-go')!.click();
  await until(() => pill(shell).classList.contains('signed'));
  expect(decodeDoc(payload())).toMatch(/\nkey: [\w~]{87}\n/);
  await type(shell, 'Now ');
  await until(() => pill(shell).classList.contains('mismatch'));
  expect(pill(shell).textContent!.trim()).toBe('Changed since signed');
});

test('the key: Export (a file, and the text), Import on another device signs as the same key, Forget asks first', async () => {
  const shell = await mount('#/v1/write');
  await until(() => !!pill(shell));
  pill(shell).click();
  const privacy = shell.querySelector<ToPrivacy>('to-privacy[doc]')!;
  await until(() => !!privacy.querySelector('.to-privacy-key'));
  expect(privacy.querySelector('.to-privacy-fp')!.textContent).toBe('None yet: one is made the first time you sign.');
  expect(privacy.querySelector('.to-privacy-key .to-hint')!.textContent).toMatch(/^Private: this key lasts for this visit only/);
  let exported = '';
  await saved(async (files) => {
    privacy.querySelector<HTMLButtonElement>('.to-key-export')!.click();
    await until(() => files().length === 1);
    expect(files()[0].name).toBe('tiny-little-office-key.json');
    exported = await files()[0].text();
  });
  const fp = (await myFingerprint())!;
  await until(() => privacy.querySelector('.to-privacy-fp code')?.textContent === fp);
  expect(privacy.querySelector<HTMLTextAreaElement>('.to-key-text')!.value).toBe(exported);
  expect(JSON.parse(exported).alg).toMatch(/^(ed|ec)$/);
  // Forget asks, and Cancel keeps it.
  const ask = vi.spyOn(window, 'confirm').mockReturnValue(false);
  privacy.querySelector<HTMLButtonElement>('.to-key-forget')!.click();
  expect(ask.mock.calls[0][0]).toContain('will no longer verify as yours');
  expect(await myFingerprint()).toBe(fp);
  ask.mockReturnValue(true);
  privacy.querySelector<HTMLButtonElement>('.to-key-forget')!.click();
  await until(() => !privacy.querySelector('.to-privacy-fp code'));
  expect(await myFingerprint()).toBeNull();
  // Import: pasted, and the same key again.
  privacy.querySelector<HTMLButtonElement>('.to-key-import')!.click();
  await until(() => !!privacy.querySelector('.to-key-use'));
  fill(privacy.querySelector<HTMLTextAreaElement>('.to-key-text')!, exported);
  await privacy.updateComplete;
  privacy.querySelector<HTMLButtonElement>('.to-key-use')!.click();
  await until(() => privacy.querySelector('.to-privacy-fp code')?.textContent === fp);
  // Junk is refused, and said so.
  privacy.querySelector<HTMLButtonElement>('.to-key-import')!.click();
  await until(() => !!privacy.querySelector('.to-key-use'));
  fill(privacy.querySelector<HTMLTextAreaElement>('.to-key-text')!, '{"alg":"rsa"}');
  await privacy.updateComplete;
  privacy.querySelector<HTMLButtonElement>('.to-key-use')!.click();
  await until(() => said() === 'That is not a signing key.');
  expect(await myFingerprint()).toBe(fp);
});

test('what this device holds, item by item with Forget, and Download everything: every kept document in one zip', async () => {
  setKeeping(true);
  // What an earlier test kept, carried in from the visit's memory, is not this test's.
  forgetAll();
  keep({ id: 'a', app: 'write', title: 'Launch notes', hash: `#/v1/write/${encodeDoc('---\ntitle: Launch notes\n---\nGo.\n')}`, at: Date.now() });
  keep({ id: 'b', app: 'sheet', title: '', hash: `#/v1/sheet/${encodeDoc('a | b\n--- | ---\n1 | 2\n')}`, at: Date.now() - 1 });
  keep({ id: 'c', app: 'write', title: '', hash: `#/v1/write/${await pack('secret', await lockWith('pw'))}`, at: Date.now() - 2 });
  keepLink({ owner: 'https://tinier.example/abcdefg#k.o', title: 'Launch notes', made: Date.now(), expires: Date.now() + 86_400_000 });
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
  expect(now('to-held-key')).toBe('None');
  // The zip: each document as its text, the locked one as its link; the key only when asked.
  await saved(async (files) => {
    privacy.querySelector<HTMLButtonElement>('.to-download-all')!.click();
    await until(() => files().length === 1);
    const zip = unzipSync(new Uint8Array(await files()[0].arrayBuffer()));
    expect(files()[0].name).toBe('tiny-little-office.zip');
    expect(Object.keys(zip).sort()).toEqual(['sheet/untitled.tlo', 'write/launch-notes.tlo', 'write/locked.txt']);
    expect(strFromU8(zip['write/launch-notes.tlo'])).toBe('---\ntitle: Launch notes\n---\nGo.\n');
    expect(strFromU8(zip['write/locked.txt'])).toMatch(/#\/v1\/write\/E[\w~]+\n$/);
    // A key, once there is one, goes in when asked.
    await exportKey();
    const box = privacy.querySelector<HTMLInputElement>('.to-zip-key')!;
    box.checked = true;
    box.dispatchEvent(new Event('change', { bubbles: true }));
    await privacy.updateComplete;
    privacy.querySelector<HTMLButtonElement>('.to-download-all')!.click();
    await until(() => files().length === 2);
    expect(Object.keys(unzipSync(new Uint8Array(await files()[1].arrayBuffer())))).toContain('signing-key.json');
  });
  await until(() => now('to-held-key') !== 'None');
  // Forget, one by one.
  privacy.querySelector<HTMLButtonElement>('.to-held-links .to-held-forget')!.click();
  await until(() => now('to-held-links') === '0 links');
  privacy.querySelector<HTMLButtonElement>('.to-held-docs .to-held-forget')!.click();
  await until(() => now('to-held-docs') === '0 documents');
  expect(library()).toEqual([]);
  // Forget everything: the key too, and Private from now on.
  vi.spyOn(window, 'confirm').mockReturnValue(true);
  privacy.querySelector<HTMLButtonElement>('.to-forget-all')!.click();
  await until(() => now('to-held-key') === 'None' && now('to-held-prefs') === 'None');
  // The language aside, as shell.test.ts sets it aside: another browser test file, running at once on this origin, may choose one after the forgetting.
  expect(Object.keys(localStorage).filter((k) => (k.startsWith('tinyoffice.') && k !== 'tinyoffice.lang') || k === 'to-theme')).toEqual([]);
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

test('Forget everything forgets the language chosen too, and the page keeps its words for the visit', async () => {
  try {
    setKeeping(true);
    store.set('to-theme', 'dark');
    store.set('tinyoffice.size', '1.2');
    await setLanguage('de');
    expect(localStorage.getItem('tinyoffice.lang')).toBe('de');
    vi.spyOn(window, 'confirm').mockReturnValue(true);
    const shell = await mount('');
    shell.querySelector<HTMLButtonElement>('.to-burger')!.click();
    await until(() => !!shell.querySelector('.to-drawer-privacy'));
    shell.querySelector<HTMLButtonElement>('.to-drawer-privacy')!.click();
    const privacy = shell.querySelector<ToPrivacy>('to-drawer to-privacy')!;
    await until(() => !!privacy.querySelector('.to-forget-all'));
    privacy.querySelector<HTMLButtonElement>('.to-forget-all')!.click();
    await until(() => localStorage.getItem('tinyoffice.lang') === null);
    expect(Object.keys(localStorage).filter((k) => k.startsWith('tinyoffice.') || k === 'to-theme')).toEqual([]);
    // The page does not change language under the person: German for the rest of the visit, and the menu says so.
    expect(language()).toBe('de');
    expect(document.documentElement.lang).toBe('de');
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

test("words signed with this device's key under a name (a contract's signature): the key is this device's, the name kept to sign under next time", async () => {
  expect(await myKey()).toBe(null);
  const { key, sig } = await signWords('tinyoffice-contract\nWords.\nPaul', '  Paul   Ford ');
  expect(await myKey()).toBe(key);
  expect(signerName()).toBe('Paul Ford');
  expect(await verify(key, sig, 'tinyoffice-contract\nWords.\nPaul')).toBe(true);
  forgetKey();
  expect(await myKey()).toBe(null);
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

test('a signature says what it proves: a key this device does not know reads "Signed as", neutral; known under Saved it is green; the same name with another key is amber', async () => {
  setKeeping(true);
  const a = await signedElsewhere('---\ntitle: Notice\n---\nCamp B is closed.\n', 'UNHCR');
  let shell = await mount(`#/v1/write/${encodeDoc(a.text)}`);
  await until(() => pill(shell).classList.contains('neutral'));
  expect(pill(shell).textContent!.trim()).toBe(`Signed as “UNHCR” · key ${a.fp}`);
  expect(pill(shell).classList.contains('signed')).toBe(false);
  pill(shell).click();
  let privacy = shell.querySelector<ToPrivacy>('to-privacy[doc]')!;
  await until(() => !!privacy.querySelector('dialog')?.open && !!privacy.querySelector('.to-privacy-doc .to-know-key'));
  expect(privacy.querySelector('.to-privacy-doc .to-trust-line')!.classList.contains('neutral')).toBe(true);
  expect(privacy.querySelector('.to-privacy-anyone')!.textContent).toBe('Anyone can sign under any name. Check this key with the person, another way.');
  // The reader has checked the key with the sender: this device knows it from now on.
  privacy.querySelector<HTMLButtonElement>('.to-know-key')!.click();
  await until(() => pill(shell).classList.contains('signed'));
  expect(pill(shell).textContent!.trim()).toBe('Signed by UNHCR');
  expect(JSON.parse(localStorage.getItem('tinyoffice.known')!)).toEqual({ unhcr: a.fp });
  await until(() => !privacy.querySelector('.to-know-key'));
  privacy.close();
  // Somebody else, under the same name: a different key, said in amber.
  const b = await signedElsewhere('---\ntitle: Notice\n---\nGo to camp C.\n', 'UNHCR');
  shell = await mount(`#/v1/write/${encodeDoc(b.text)}`);
  await until(() => pill(shell).classList.contains('otherkey'));
  expect(pill(shell).textContent!.trim()).toBe('A different key from the one UNHCR used before');
  expect(getComputedStyle(pill(shell)).color).not.toBe(getComputedStyle(pill(shell)).backgroundColor);
  // What the device holds lists it, with Forget.
  pill(shell).click();
  privacy = shell.querySelector<ToPrivacy>('to-privacy[doc]')!;
  await until(() => privacy.querySelector('.to-held-known .to-held-now')?.textContent === '1 key');
  privacy.querySelector<HTMLButtonElement>('.to-held-known .to-held-forget')!.click();
  await until(() => pill(shell).classList.contains('neutral'));
  expect(localStorage.getItem('tinyoffice.known')).toBeNull();
});

test('under Private nothing is remembered: no "I know this key", no write, every key unknown', async () => {
  const a = await signedElsewhere('---\ntitle: Notice\n---\nCamp B is closed.\n', 'UNHCR');
  const shell = await mount(`#/v1/write/${encodeDoc(a.text)}`);
  await until(() => pill(shell).classList.contains('neutral'));
  pill(shell).click();
  const privacy = shell.querySelector<ToPrivacy>('to-privacy[doc]')!;
  await until(() => !!privacy.querySelector('dialog')?.open && !!privacy.querySelector('.to-privacy-anyone'));
  expect(privacy.querySelector('.to-know-key')).toBeNull();
  knowKey('UNHCR', a.fp);
  expect(store.get('tinyoffice.known')).toBeNull();
  expect(localStorage.getItem('tinyoffice.known')).toBeNull();
  expect((await checkSignature('write', a.text)).known).toBeFalsy();
});
