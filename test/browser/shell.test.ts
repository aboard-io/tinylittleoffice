// The shell: the home page, the route to an app, the link following every edit, the title in the head, and the
// documents kept on the device (Saved only) listed under their apps on the home page.
import { test, expect, afterEach } from 'vitest';
import { page } from 'vitest/browser';
import { mount, tick, until } from './helpers.ts';
import { apps } from '../../src/kit/apps.ts';
import { decodeDoc } from '../../src/kit/codec.ts';
import { keep, library } from '../../src/kit/library.ts';
import { keeping, setKeeping } from '../../src/kit/store.ts';
import type { ToShell } from '../../src/kit/shell.ts';
import type { ToText } from '../../src/kit/text.ts';

/** Words typed into Write's editor at the caret's place, `at` (the end of what is there). */
async function type(shell: ToShell, words: string, at = 0) {
  await until(() => !!shell.querySelector('to-write-editor to-text .tx'));
  const text = shell.querySelector<ToText>('to-text')!;
  await text.updateComplete;
  text.focus();
  text.sel = { anchor: { block: 0, offset: at }, focus: { block: 0, offset: at } };
  for (const ch of words) {
    text.tx.dispatchEvent(new InputEvent('beforeinput', { inputType: 'insertText', data: ch, bubbles: true, cancelable: true }));
    await text.updateComplete;
  }
  await shell.updateComplete;
}
/** Saved on this device for the length of `body`, then Private again (which forgets it all). */
async function saved(body: () => Promise<void>) {
  setKeeping(true);
  try {
    await body();
  } finally {
    setKeeping(false);
  }
}

afterEach(() => history.replaceState(null, '', location.pathname));

test('the home page lists the apps as tiles, each with its templates', async () => {
  const shell = await mount('');
  const tile = shell.querySelector('.to-tile')!;
  expect(tile.querySelector('b')!.textContent).toBe('Write');
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

test('the home page has no copy: every app, in order, its icon, its name and its templates; no lede, no blurbs, no headings but the hidden one', async () => {
  const shell = await mount('');
  const h1 = shell.querySelector('to-home h1')!;
  expect(h1.textContent).toBe('TinyLittleOffice');
  expect(h1.classList.contains('sr-only')).toBe(true);
  expect(shell.querySelector('to-home p, to-home h2, .to-tile-open small')).toBeNull();
  for (const a of apps()) expect(shell.textContent).not.toContain(a.blurb);
  const tiles = [...shell.querySelectorAll('.to-tile')];
  expect(tiles.map((t) => t.querySelector('.to-tile-open b')!.textContent)).toEqual(apps().map((a) => a.name));
  for (const tile of tiles) {
    expect(tile.querySelector('.to-tile-open svg')!.getAttribute('width')).toBe('20');
    expect(tile.querySelector('.to-tile-open')!.textContent!.trim()).toBe(tile.querySelector('b')!.textContent);
    expect(tile.querySelector('to-templates .to-templates-btn')).not.toBeNull();
  }
});

test('under Private an edit keeps nothing, and the home page shows no documents', async () => {
  expect(keeping()).toBe(false);
  const shell = await mount('#/v1/write');
  await type(shell, 'Not kept');
  await tick(1000);
  expect(library()).toEqual([]);
  expect(Object.keys(localStorage).filter((k) => k.startsWith('tinyoffice.'))).toEqual([]);
  const home = await mount('');
  expect(home.querySelector('.to-drive')).toBeNull();
});

test('under Saved a document typed in Write is kept, listed under Write, opened again, updated in place, forgotten', () =>
  saved(async () => {
    // Opened blank, nothing is kept until something is typed.
    let shell = await mount('#/v1/write');
    await tick(1000);
    expect(library()).toEqual([]);
    await type(shell, 'Launch notes');
    await until(() => library().length === 1);
    const first = library()[0];
    expect(first).toMatchObject({ app: 'write', title: 'Launch notes', hash: location.hash });
    expect(history.state).toEqual({ kept: first.id });
    // The home page lists it under Write, with its time.
    shell = await mount('');
    const write = shell.querySelector('.to-tile')!;
    const rows = write.querySelectorAll('.to-drive li');
    expect(rows).toHaveLength(1);
    expect(rows[0].querySelector('.to-drive-open span')!.textContent).toBe('Launch notes');
    expect(rows[0].querySelector('.to-drive-open small')!.textContent).toBe('now');
    expect(shell.querySelectorAll('.to-drive')).toHaveLength(1);
    // Opened from there, it is the document; a second edit is the same entry.
    rows[0].querySelector<HTMLAnchorElement>('.to-drive-open')!.click();
    await until(() => shell.querySelector('to-text .tx p')?.textContent === 'Launch notes');
    await type(shell, ', again', 'Launch notes'.length);
    await until(() => library()[0].title === 'Launch notes, again');
    expect(library()).toHaveLength(1);
    expect(library()[0].id).toBe(first.id);
    shell = await mount('');
    expect(shell.querySelectorAll('.to-drive li')).toHaveLength(1);
    // Forget takes it away, and with nothing kept nothing shows.
    shell.querySelector<HTMLButtonElement>('.to-drive li button')!.click();
    await shell.updateComplete;
    await shell.querySelector<ToShell>('to-home')!.updateComplete;
    expect(library()).toEqual([]);
    expect(shell.querySelector('.to-drive')).toBeNull();
  }));

test('more than five documents under an app: five, then "n more" unfolds the rest', () =>
  saved(async () => {
    for (let i = 0; i < 8; i++) keep({ id: `d${i}`, app: 'write', title: i ? `Doc ${i}` : '', hash: `#/v1/write/y${i}`, at: Date.now() - i * 3600e3 });
    const shell = await mount('');
    const write = shell.querySelector('.to-tile')!;
    expect([...write.querySelectorAll('.to-drive-open span')].map((s) => s.textContent)).toEqual(['Untitled', 'Doc 1', 'Doc 2', 'Doc 3', 'Doc 4']);
    expect(write.querySelectorAll('.to-drive-open small')[2].textContent).toBe('2 hours ago');
    const more = write.querySelector<HTMLButtonElement>('.to-drive-more')!;
    expect(more.textContent).toBe('3 more');
    more.click();
    await shell.querySelector<ToShell>('to-home')!.updateComplete;
    expect(write.querySelectorAll('.to-drive li')).toHaveLength(8);
    expect(write.querySelector('.to-drive-more')).toBeNull();
  }));

test('at 390px: one column, nothing wider than the screen, every tap target 44px', async () => {
  await page.viewport(390, 844);
  try {
    await saved(async () => {
      keep({ id: 'long', app: 'write', title: 'A document with a name far too long to fit on one line of a phone', hash: '#/v1/write/ylong', at: Date.now() });
      const shell = await mount('');
      await tick(50);
      expect(document.documentElement.scrollWidth).toBeLessThanOrEqual(document.documentElement.clientWidth);
      const lefts = new Set([...shell.querySelectorAll('.to-tile')].map((t) => Math.round(t.getBoundingClientRect().left)));
      expect(lefts.size).toBe(1);
      for (const el of shell.querySelectorAll<HTMLElement>('.to-tile-open, .to-templates-btn, .to-drive-open, .to-drive button')) {
        const r = el.getBoundingClientRect();
        expect(r.height).toBeGreaterThanOrEqual(44);
        expect(r.right).toBeLessThanOrEqual(390);
      }
    });
  } finally {
    await page.viewport(1100, 800);
  }
});

test('a link opens its app, and every edit goes into the link', async () => {
  const shell = await mount('#/v1/write');
  await until(() => !!shell.querySelector('to-write-editor to-text .tx'));
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
