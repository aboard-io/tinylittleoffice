// The contract in Write, in a real Chromium: the signatures card shows each row as it stands (valid with the day and
// the key, changed since in red, not signed yet), checked on open; Sign this contract asks the name and signs the
// words with this device's key; a word typed after makes the signature stale; a second signer on the same text signs
// under the first and both hold; Enter on the card in hand signs; the printed block says what was verified; a
// browser without Ed25519 says an Ed25519 row cannot be checked here, in grey, never red.
import { afterEach, expect, test, vi } from 'vitest';
import '../../../styles.css';
import '../editor.ts';
import type { ToWriteEditor } from '../editor.ts';
import def from '../def.ts';
import { templates } from '../templates.ts';
import { forgetKey, myKey } from '../../../kit/privacy.ts';
import { store } from '../../../kit/store.ts';
import { signatureIcon, uncheckedHint } from '../../../kit/privacy-dialog.ts';
import { iconInner } from '../../../kit/icons.ts';
import { tick, until } from '../../../../test/browser/helpers.ts';

afterEach(() => {
  vi.restoreAllMocks();
  forgetKey();
  store.remove('tinyoffice.name');
});

/** Signed by the old tree, two parties. */
const OLD = "# Dog-walking agreement\n\nBetween Paul Ford and Sam Reyes, from 1 March 2027.\n\n## What is agreed\n\n- Sam walks Biscuit every weekday at noon.\n- Paul pays $20 a walk, on Fridays.\n\n```signatures\nName | Key | Signature\n--- | --- | ---\nPaul Ford | gTuAwZkOkxT4natjwaGS687f67m7GMVJFyPXZGSgAzo | dz0LbgV6Xwvq5aRwVoIpgPOT28xlSq-lBjxAJ8Ye0zc36ukrn11i0S7VGlkqSG9r2KGK3MgYELqKAKbzjGCqBA\nSam Reyes | djJ8ndfQOrk4TI2nmSSn2Sy-QioX-i02t6PV_qZP224 | an7NrGCTv1Cmf-FGk9e7QG8CtvZaaD2RyvG0qZG6IQMi2O_zL-4hbyOGLqfQABFsypODpw6nU138lg16CUd2BA\n```";
const contract = () => templates().find((t) => t.id === 'contract')!.doc;

async function editor(value: string) {
  document.body.innerHTML = '';
  const main = document.createElement('main');
  main.className = 'to-main';
  document.body.append(main);
  const el = document.createElement('to-write-editor') as ToWriteEditor;
  el.value = value;
  const changes: string[] = [];
  el.addEventListener('docchange', (e) => changes.push((e as CustomEvent<string>).detail));
  main.append(el);
  await el.updateComplete;
  await el.text.updateComplete;
  return { el, last: () => changes.at(-1) ?? value };
}
const rows = (el: ToWriteEditor) => [...el.querySelectorAll<HTMLElement>('.write-signatures .write-sig')].map((li) => [li.querySelector('b')!.textContent!.trim(), li.classList.contains('valid') ? 'valid' : li.classList.contains('mismatch') ? 'mismatch' : li.classList.contains('unsigned') ? 'unsigned' : li.classList.contains('unchecked') ? 'unchecked' : 'checking']);
const signButton = (el: ToWriteEditor) => el.querySelector<HTMLButtonElement>('.write-signatures .write-sign')!;
/** The name asked for, answered. */
async function answer(el: ToWriteEditor, name: string | null, expectGuess?: string) {
  await until(() => !!el.querySelector<HTMLInputElement>('.write-ask-form input'));
  const input = el.querySelector<HTMLInputElement>('.write-ask-form input')!;
  if (expectGuess !== undefined) expect(input.value).toBe(expectGuess);
  if (name === null) return el.querySelector<HTMLDialogElement>('to-dialog.write-ask dialog')!.close();
  input.value = name;
  el.querySelector<HTMLFormElement>('.write-ask-form')!.requestSubmit();
}
async function sign(el: ToWriteEditor, name: string, expectGuess?: string) {
  signButton(el).click();
  await answer(el, name, expectGuess);
}

test('on open every row is checked: a contract the old tree signed shows both valid, with the key; a word changed shows both in red', async () => {
  const { el } = await editor(OLD);
  await until(() => rows(el).every((r) => r[1] === 'valid') && rows(el).length === 2);
  expect(rows(el)).toEqual([['Paul Ford', 'valid'], ['Sam Reyes', 'valid']]);
  expect(el.querySelector('.write-sig small')!.textContent).toMatch(/^key [0-9a-f]{5}-[0-9a-f]{5}$/);
  expect(el.querySelector('.write-sig.valid .write-sig-state')!.textContent).toContain('Signed these words');
  const { el: changed } = await editor(OLD.replace('noon', 'one'));
  await until(() => rows(changed).length === 2 && rows(changed).every((r) => r[1] === 'mismatch'));
  expect(changed.querySelector('.write-sig.mismatch .write-sig-state')!.textContent).toContain('The words have changed since this was signed');
  expect(getComputedStyle(changed.querySelector('.write-sig.mismatch .write-sig-state')!).color).not.toBe(getComputedStyle(changed.querySelector('.write-sig b')!).color);
  // A party named, yet to sign; nobody at all.
  const { el: named } = await editor(contract().replace('--- | --- | --- | ---\n', '--- | --- | --- | ---\nDee |  |  |\n'));
  expect(rows(named)).toEqual([['Dee', 'unsigned']]);
  const { el: none } = await editor(contract());
  expect(none.querySelector('.write-signatures')!.textContent).toContain('No one has signed yet.');
});

test('Sign this contract: the name asked for, the words signed with this device\'s key, the row put in with the day; a word typed after makes it stale; signing again puts it right', async () => {
  const { el, last } = await editor('---\nby: Paul Ford\n---\n' + contract());
  // The name the document says made it, while nobody has signed under it.
  await sign(el, 'Paul Ford', 'Paul Ford');
  await until(() => rows(el).length === 1 && rows(el)[0][1] === 'valid');
  const me = await myKey();
  const today = new Date();
  const day = `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, '0')}-${String(today.getDate()).padStart(2, '0')}`;
  expect(last()).toContain(`\nPaul Ford | ${me} | `);
  expect(last()).toContain(` | ${day}\n`);
  expect(el.querySelector('.write-sig small')!.textContent).toContain(day);
  // A word typed into the agreement: the signature no longer holds.
  el.text.focus();
  el.text.sel = { anchor: { block: 1, offset: 0 }, focus: { block: 1, offset: 0 } };
  el.text.tx.dispatchEvent(new InputEvent('beforeinput', { inputType: 'insertText', data: 'X', bubbles: true, cancelable: true, composed: true }));
  await until(() => rows(el)[0]?.[1] === 'mismatch');
  // Signed again: the same row, put right (the name this key signed under is the guess).
  await sign(el, 'Paul Ford', 'Paul Ford');
  await until(() => rows(el).length === 1 && rows(el)[0][1] === 'valid');
  expect(last().match(/\nPaul Ford \|/g)!.length).toBe(1);
  // Undone: the signature as it was, stale again.
  el.dispatchEvent(new CustomEvent('docundo', { cancelable: true, bubbles: true }));
  await until(() => rows(el)[0]?.[1] === 'mismatch');
  // Cancelled: nothing changes.
  const before = last();
  signButton(el).click();
  await answer(el, null);
  await tick(50);
  expect(last()).toBe(before);
});

test('a second signer opens the same text and signs under the first: both hold', async () => {
  const { el, last } = await editor(contract());
  await sign(el, 'Paul Ford', '');
  await until(() => rows(el).length === 1 && rows(el)[0][1] === 'valid');
  const sent = last();
  // Another device: another key, nobody's name kept.
  forgetKey();
  store.remove('tinyoffice.name');
  const { el: sam, last: samLast } = await editor(sent);
  await until(() => rows(sam).length === 1 && rows(sam)[0][1] === 'valid');
  await sign(sam, 'Sam Reyes', '');
  await until(() => rows(sam).length === 2 && rows(sam).every((r) => r[1] === 'valid'));
  expect(rows(sam)).toEqual([['Paul Ford', 'valid'], ['Sam Reyes', 'valid']]);
  // And opened again by Paul: both still hold.
  const { el: back } = await editor(samLast());
  await until(() => rows(back).length === 2 && rows(back).every((r) => r[1] === 'valid'));
});

test('the card in hand: its bar starts with Sign this contract, and Enter signs', async () => {
  const { el } = await editor(contract());
  const at = el.text.tx.children.length - 1;
  const card = el.text.tx.children[at] as HTMLElement;
  card.dispatchEvent(new MouseEvent('click', { bubbles: true }));
  await until(() => document.activeElement === card);
  await until(() => document.querySelectorAll('to-context.write-cardbar .to-context:popover-open button').length > 0);
  expect(document.querySelector('to-context.write-cardbar .to-context:popover-open button')!.getAttribute('aria-label')).toBe('Sign this contract');
  card.dispatchEvent(new KeyboardEvent('keydown', { key: 'Enter', bubbles: true, cancelable: true, composed: true }));
  await answer(el, 'Paul Ford');
  await until(() => rows(el).length === 1 && rows(el)[0][1] === 'valid');
});

test('printed: a signature block with the name, the day, the key and "verified"; after a change, "does not match"', async () => {
  const { el, last } = await editor(contract());
  await sign(el, 'Paul Ford');
  await until(() => rows(el)[0]?.[1] === 'valid');
  const svg = def.view(last()).map((p) => p.svg).join('');
  expect(svg).toContain('>Paul Ford</text>');
  expect(svg).toMatch(/Signed \d{4}-\d{2}-\d{2} · key [0-9a-f]{5}-[0-9a-f]{5} · verified/);
  const html = String(await def.exports!.find((x) => x.ext === 'html')!.build(last(), { title: 'Deal', link: '' }));
  expect(html).toContain('<div class="valid"><strong>Paul Ford</strong>');
  const changed = last().replace('noon', 'one');
  const file = String(await def.exports!.find((x) => x.ext === 'html')!.build(changed, { title: 'Deal', link: '' }));
  expect(file).toContain('does not match these words');
});

test('a browser without Ed25519: the old tree\'s Ed25519 rows say Cannot check here, grey with the Privacy dialog\'s icon and reason, still who and when; a P-256 row signed here is checked as ever', async () => {
  const real = crypto.subtle.importKey.bind(crypto.subtle);
  vi.spyOn(crypto.subtle, 'importKey').mockImplementation(((fmt: string, data: unknown, alg: AlgorithmIdentifier, ...rest: unknown[]) =>
    (alg as Algorithm).name === 'Ed25519' ? Promise.reject(new DOMException('Unrecognized name', 'NotSupportedError')) : (real as (...a: unknown[]) => unknown)(fmt, data, alg, ...rest)) as typeof crypto.subtle.importKey);
  const realGen = crypto.subtle.generateKey.bind(crypto.subtle);
  vi.spyOn(crypto.subtle, 'generateKey').mockImplementation(((alg: AlgorithmIdentifier, ...rest: unknown[]) =>
    (alg as Algorithm).name === 'Ed25519' ? Promise.reject(new DOMException('Unrecognized name', 'NotSupportedError')) : (realGen as (...a: unknown[]) => unknown)(alg, ...rest)) as typeof crypto.subtle.generateKey);
  const { el } = await editor(OLD.replace('Fridays', 'Friday evenings'));
  await until(() => rows(el).length === 2 && rows(el).every((r) => r[1] === 'unchecked'));
  const row = el.querySelector<HTMLElement>('.write-sig.unchecked')!;
  const state = row.querySelector<HTMLElement>('.write-sig-state')!;
  expect(state.textContent!.trim()).toBe('Cannot check here');
  expect(state.title).toBe(uncheckedHint());
  expect(row.querySelector('.to-unchecked-hint')!.textContent!.trim()).toBe(uncheckedHint());
  const glyph = document.createElementNS('http://www.w3.org/2000/svg', 'svg');
  glyph.innerHTML = iconInner(signatureIcon({ state: 'unchecked' }));
  expect(state.querySelector('svg')!.innerHTML.replace(/<!--.*?-->/g, '')).toBe(glyph.innerHTML);
  expect(row.querySelector('b')!.textContent).toBe('Paul Ford');
  expect(row.querySelector('small')!.textContent).toMatch(/^key [0-9a-f]{5}-[0-9a-f]{5}$/);
  // Grey: not the mismatch red, neither the words nor the line above them.
  const probe = document.createElement('span');
  probe.style.color = 'var(--to-mismatch-ink)';
  el.append(probe);
  const redNow = getComputedStyle(probe).color;
  probe.remove();
  expect(getComputedStyle(state).color).not.toBe(redNow);
  expect(getComputedStyle(row).borderTopColor).not.toBe(redNow);
  // Signed here with this browser's P-256 key: checked, valid; a word typed after, that row red and the others still grey.
  await sign(el, 'Dee Lee');
  await until(() => rows(el).length === 3 && rows(el)[2][1] === 'valid');
  expect(rows(el).map((r) => r[1])).toEqual(['unchecked', 'unchecked', 'valid']);
  el.text.focus();
  el.text.sel = { anchor: { block: 1, offset: 0 }, focus: { block: 1, offset: 0 } };
  el.text.tx.dispatchEvent(new InputEvent('beforeinput', { inputType: 'insertText', data: 'X', bubbles: true, cancelable: true, composed: true }));
  await until(() => rows(el)[2]?.[1] === 'mismatch');
  expect(rows(el).map((r) => r[1])).toEqual(['unchecked', 'unchecked', 'mismatch']);
});
