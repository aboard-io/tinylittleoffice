// The shell: the home page, the route to an app, the link following every edit, the title in the head.
import { test, expect, afterEach } from 'vitest';
import { mount, until } from './helpers.ts';
import { decodeDoc } from '../../src/kit/codec.ts';
import type { ToText } from '../../src/kit/text.ts';

afterEach(() => history.replaceState(null, '', location.pathname));

test('the home page lists the apps as tiles, each with its templates', async () => {
  const shell = await mount('');
  const tile = shell.querySelector('.to-tile')!;
  expect(tile.querySelector('b')!.textContent).toBe('Word Processor');
  expect(tile.querySelector<HTMLAnchorElement>('.to-tile-open')!.getAttribute('href')).toBe('#/v1/write');
  const picker = tile.querySelector<HTMLButtonElement>('.to-templates-btn')!;
  expect(picker.textContent!.trim()).toBe('Blank');
  picker.click();
  await until(() => !!tile.querySelector('[role=option] svg'));
  const options = [...tile.querySelectorAll('[role=option]')];
  expect(options.map((o) => o.querySelector('.to-option-words span')!.textContent)).toEqual(['Blank', 'A letter', 'Meeting notes', 'Résumé', 'Contract', 'Invoice']);
  expect(options[0].getAttribute('aria-selected')).toBe('true');
  // Choosing a template opens the app with that document.
  (options[2] as HTMLElement).click();
  await until(() => location.hash.startsWith('#/v1/write/'));
  expect(decodeDoc(location.hash.slice('#/v1/write/'.length))).toContain('# Launch meeting {.title}');
});

test('a link opens its app, and every edit goes into the link', async () => {
  const shell = await mount('#/v1/write');
  await until(() => !!shell.querySelector('to-write-editor to-text .tx'));
  // A document with no name is called by its app's noun, not the app's name.
  expect(document.title).toBe('Untitled document · TinyLittleOffice');
  expect(shell.querySelector<HTMLInputElement>('.to-title')!.placeholder).toBe('Untitled document');
  expect(shell.querySelector('.to-here')!.getAttribute('aria-label')).toBe('New document');
  const text = shell.querySelector<ToText>('to-text')!;
  await text.updateComplete;
  text.focus();
  text.sel = { anchor: { block: 0, offset: 0 }, focus: { block: 0, offset: 0 } };
  for (const ch of 'Hello, link.') {
    text.tx.dispatchEvent(new InputEvent('beforeinput', { inputType: 'insertText', data: ch, bubbles: true, cancelable: true }));
    await text.updateComplete;
  }
  await shell.updateComplete;
  expect(location.hash).toMatch(/^#\/v1\/write\/[ryz]/);
  expect(decodeDoc(location.hash.split('/')[3])).toBe('Hello, link.\n');
  // The title field writes the head, and the tab's name follows.
  const title = shell.querySelector<HTMLInputElement>('.to-title')!;
  title.value = 'A note';
  title.dispatchEvent(new Event('change', { bubbles: true }));
  await shell.updateComplete;
  expect(decodeDoc(location.hash.split('/')[3])).toBe('---\ntitle: A note\n---\nHello, link.\n');
  expect(document.title).toBe('A note · TinyLittleOffice');
  // The same link, opened again, is the same document.
  const again = await mount(location.hash);
  await until(() => !!again.querySelector('to-text .tx p'));
  expect(again.querySelector('to-text .tx p')!.textContent).toBe('Hello, link.');
  expect(again.querySelector<HTMLInputElement>('.to-title')!.value).toBe('A note');
});

test('an unreadable link is said so, not thrown', async () => {
  const shell = await mount('#/v1/write/yNOTREALLY');
  await shell.updateComplete;
  expect(shell.querySelector('.to-empty')!.textContent).toContain('cannot be read');
  expect(shell.querySelector('.to-empty a')!.getAttribute('href')).toBe('#/v1/write');
});

test('an unknown app is the home page', async () => {
  const shell = await mount('#/v1/nothing/abc');
  expect(shell.querySelector('to-home')).not.toBeNull();
});

test('Mod+Z is the editor\'s only from the editor: typed in a dialog\'s field, the header\'s title or the note box, it leaves the document alone', async () => {
  const shell = await mount('#/v1/write');
  await until(() => !!shell.querySelector('to-write-editor to-text .tx'));
  const text = shell.querySelector<ToText>('to-text')!;
  await text.updateComplete;
  text.focus();
  text.sel = { anchor: { block: 0, offset: 0 }, focus: { block: 0, offset: 0 } };
  for (const ch of 'abc') {
    text.tx.dispatchEvent(new InputEvent('beforeinput', { inputType: 'insertText', data: ch, bubbles: true, cancelable: true }));
    await text.updateComplete;
  }
  await shell.updateComplete;
  const doc = () => decodeDoc(location.hash.split('/')[3] ?? '');
  expect(doc()).toBe('abc\n');
  const z = (target: EventTarget, init: KeyboardEventInit = {}) => {
    const ev = new KeyboardEvent('keydown', { key: 'z', ctrlKey: true, bubbles: true, cancelable: true, ...init });
    target.dispatchEvent(ev);
    return ev;
  };
  // A dialog inside the editor, with a field: its own undo.
  const dialog = document.createElement('dialog');
  const field = document.createElement('input');
  dialog.append(field);
  shell.editor!.append(dialog);
  dialog.show();
  field.focus();
  expect(z(field).defaultPrevented).toBe(false);
  dialog.remove();
  // The header's title, and an IME composing in the words.
  expect(z(shell.querySelector('.to-title')!).defaultPrevented).toBe(false);
  expect(z(text.tx, { isComposing: true }).defaultPrevented).toBe(false);
  await shell.updateComplete;
  expect(doc()).toBe('abc\n');
  // In the words, the document's undo.
  expect(z(text.tx).defaultPrevented).toBe(true);
  await text.updateComplete;
  await shell.updateComplete;
  expect(doc()).toBe('');
});
