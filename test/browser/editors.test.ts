// A page that is not the site holds an editor (docs/library.md): src/editors.ts mounts one with the page's own host, typing
// is the document the page is told, undo is answered inside it, and where a placed document opens is the host's answer,
// never the address. No shell is on the page: this file imports none of it.
import { expect, test } from 'vitest';
import { editorTag, host, mount, setup } from '../../src/editors.ts';
import type { ToOutlineEditor } from '../../src/apps/outline/editor.ts';
import { parse, plainText } from '../../src/doc/index.ts';
import { tick, until } from './wait.ts';

/** The page's own host: Atlas's documents open at its own addresses, and only its links name a document. */
const links: string[] = [];
Object.assign(host, {
  link: (lang: string, body: string, opts?: { display?: boolean }) => (links.push(`${lang}:${body.trim()}`), `https://atlas.test/open/${lang}?n=${links.length}${opts?.display ? '&display' : ''}`),
  read: (words: string) => (words.startsWith('atlas:') ? { lang: words.slice(6, words.indexOf('/')), body: words.slice(words.indexOf('/') + 1) } : null),
});

const words = (el: Element) => el.querySelector<HTMLElement>('[contenteditable=true]')!;
const type = async (el: Element, s: string) => {
  words(el).focus();
  for (const ch of s) {
    words(el).dispatchEvent(new InputEvent('beforeinput', { inputType: 'insertText', data: ch, bubbles: true, cancelable: true, composed: true }));
    await tick();
  }
};
const said = (text: string) => parse(text).blocks.map((b) => (b.k === 'p' ? plainText(b.runs) : b.k));

test('a Write editor on a bare page: typing is the text the page is told, with no shell and no link', async () => {
  document.body.innerHTML = '<main class="to-main"></main>';
  const changes: string[] = [];
  const editor = await mount('write', '', document.querySelector('main')!, (t) => changes.push(t));
  expect(editor.tagName.toLowerCase()).toBe('to-write-editor');
  expect(document.querySelectorAll('to-shell, to-chrome')).toHaveLength(0);
  await type(editor, 'Hi');
  await until(() => changes.length > 0);
  expect(said(changes.at(-1)!)).toStrictEqual(['Hi']);
  expect(location.hash).toBe('');
});

test('Mod+Z inside the editor undoes, as the site’s page answers it', async () => {
  document.body.innerHTML = '<main class="to-main"></main>';
  const changes: string[] = [];
  const editor = await mount('write', '', document.querySelector('main')!, (t) => changes.push(t));
  await type(editor, 'ab');
  await until(() => said(changes.at(-1) ?? '').join('') === 'ab');
  // One burst of typing is one history entry (kit/core/element.ts): one undo takes both letters.
  words(editor).dispatchEvent(new KeyboardEvent('keydown', { key: 'z', ctrlKey: true, bubbles: true, cancelable: true }));
  await until(() => changes.at(-1)!.trim() === '', 'the undo never reached the editor');
});

test('where a placed document opens is the host’s answer, and a pasted link is the host’s to read', async () => {
  await setup();
  const tag = await editorTag('outline');
  document.body.innerHTML = '<main class="to-main"></main>';
  const el = document.createElement(tag) as ToOutlineEditor;
  const changes: string[] = [];
  el.addEventListener('docchange', (e) => changes.push((e as CustomEvent<string>).detail));
  el.value = '# Plan\n\n- Budget\n  ```sheet\n  Item | Cost:money\n  --- | ---\n  Rent | 1200\n  ```\n';
  document.querySelector('main')!.append(el);
  await el.updateComplete;
  await until(() => !!el.querySelector('.ol-doc a'), 'the placed sheet was never drawn');
  const a = el.querySelector<HTMLAnchorElement>('.ol-doc a')!;
  expect(a.href).toMatch(/^https:\/\/atlas\.test\/open\/sheet\?n=\d+$/);
  // The sheet as the item holds it, its lines indented under the item: the host is given the text as the document has it.
  expect(links.at(-1)!.replace(/\n\s+/g, '\n')).toBe('sheet:Item | Cost:money\n--- | ---\nRent | 1200');
  // The page's own link to the same kind of document, pasted over the card: the host reads it, and the document under
  // the item is the one it names (the way an edit made in its own app comes back).
  const paste = new ClipboardEvent('paste', { bubbles: true, cancelable: true, clipboardData: new DataTransfer() });
  paste.clipboardData!.setData('text/plain', 'atlas:sheet/Item | Cost:money\n--- | ---\nRent | 1500\n');
  el.querySelector('.ol-doc')!.dispatchEvent(paste);
  await until(() => changes.some((c) => c.includes('1500')), 'the pasted link never became the item’s document');
  expect(changes.at(-1)).not.toContain('1200');
});
