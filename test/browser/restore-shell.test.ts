// What the rebuild had lost round the document, restored: search on the home page, Find in this document,
// the shortcuts dialog, Mod+S, the skip link, the size of everything, another version kept here, the
// Share dialog's head line with the rooms, the install line, and the Display Link's pages at paper width.
import { test, expect, afterEach } from 'vitest';
import { page, userEvent } from 'vitest/browser';
import { mount, tick, until } from './helpers.ts';
import { encodeDoc } from '../../src/kit/codec.ts';
import { forgetAll, keep, library } from '../../src/kit/library.ts';
import { setKeeping } from '../../src/kit/store.ts';
import { remScale, size, stepSize } from '../../src/kit/zoom.ts';
import { place } from '../../src/kit/menu.ts';
import { keysText } from '../../src/kit/commands.ts';
import type { ToShell } from '../../src/kit/shell.ts';
import type { ToFind } from '../../src/kit/find.ts';

async function saved(body: () => Promise<void>) {
  setKeeping(true);
  forgetAll();
  try {
    await body();
  } finally {
    setKeeping(false);
  }
}
const key = (k: string, o: KeyboardEventInit = {}, at: EventTarget = document.body) => at.dispatchEvent(new KeyboardEvent('keydown', { key: k, ctrlKey: true, bubbles: true, cancelable: true, ...o }));
const toastSays = (shell: ToShell) => shell.querySelector('to-toast [role=status]')?.textContent ?? '';

afterEach(() => {
  history.replaceState(null, '', location.pathname);
  stepSize(0);
});

const NOTES = encodeDoc('---\ntitle: Harbour notes\n---\n# The quay\n\nThe café opens at seven.\n\nThe ferry leaves the quay at nine; the café closes at five.\n');

test('the home page searches the library: every word somewhere, the title and the lines that hold them, the words marked', () =>
  saved(async () => {
    keep({ id: 'a', app: 'write', title: 'Harbour notes', hash: `#/v1/write/${NOTES}`, at: Date.now() - 1000 });
    keep({ id: 'b', app: 'outline', title: 'Errands', hash: `#/v1/outline/${encodeDoc('- [ ] Post the letter\n- [ ] Buy coffee for the café\n')}`, at: Date.now() });
    const shell = await mount('');
    const box = shell.querySelector<HTMLInputElement>('to-home .to-search')!;
    expect(box.getAttribute('aria-label')).toBe('Search your documents');
    box.value = 'CAFE';
    box.dispatchEvent(new Event('input'));
    await until(() => !!shell.querySelector('.to-found-docs'));
    const found = [...shell.querySelectorAll('.to-found-docs li')];
    expect(found.map((li) => li.querySelector('b')!.textContent)).toEqual(['Errands', 'Harbour notes']);
    expect(found[1].querySelector('mark')!.textContent).toBe('café');
    expect(found[1].textContent).toContain('The café opens at seven.');
    // The apps step aside while a search is on; every word must be there.
    expect(shell.querySelector<HTMLElement>('.to-apps')!.hidden).toBe(true);
    box.value = 'ferry café';
    box.dispatchEvent(new Event('input'));
    await until(() => shell.querySelectorAll('.to-found-docs li').length === 1);
    box.value = 'nowhere';
    box.dispatchEvent(new Event('input'));
    await until(() => shell.textContent!.includes('No document here has those words'));
    // Enter opens the first found.
    box.value = 'ferry';
    box.dispatchEvent(new Event('input'));
    await until(() => !!shell.querySelector('.to-found-docs a'));
    box.dispatchEvent(new KeyboardEvent('keydown', { key: 'Enter', bubbles: true }));
    await until(() => location.hash === `#/v1/write/${NOTES}`);
  }));

test('nothing kept, no search box', async () => {
  const shell = await mount('');
  expect(shell.querySelector('.to-search')).toBeNull();
});

test('Mod+F finds in the document: the words marked, next and previous, Escape closes and the marks go', async () => {
  const shell = await mount(`#/v1/write/${NOTES}`);
  await until(() => !!shell.querySelector('to-write-editor to-text .tx p'));
  expect(key('f')).toBe(false);
  const find = shell.querySelector<ToFind>('to-find')!;
  await until(() => !!find.querySelector('.to-find-input'));
  const input = find.querySelector<HTMLInputElement>('.to-find-input')!;
  expect(document.activeElement).toBe(input);
  // Under the app's bar.
  const bar = shell.querySelector('to-write-editor to-bar')!.getBoundingClientRect();
  expect(find.getBoundingClientRect().top).toBeGreaterThanOrEqual(bar.bottom);
  input.value = 'cafe';
  input.dispatchEvent(new Event('input'));
  await find.updateComplete;
  expect(find.querySelector('.to-find-count')!.textContent).toBe('1 of 2');
  expect(CSS.highlights.get('to-find')!.size).toBe(2);
  const now = () => [...CSS.highlights.get('to-find-now')!][0] as Range;
  expect(now().toString()).toBe('café');
  expect(now().startContainer.textContent).toBe('The café opens at seven.');
  input.dispatchEvent(new KeyboardEvent('keydown', { key: 'Enter', bubbles: true }));
  await find.updateComplete;
  expect(find.querySelector('.to-find-count')!.textContent).toBe('2 of 2');
  expect(now().startContainer.textContent).toContain('ferry');
  find.querySelector<HTMLButtonElement>('[aria-label=Next]')!.click();
  await find.updateComplete;
  expect(find.querySelector('.to-find-count')!.textContent).toBe('1 of 2');
  find.querySelector<HTMLButtonElement>('[aria-label=Previous]')!.click();
  await find.updateComplete;
  expect(find.querySelector('.to-find-count')!.textContent).toBe('2 of 2');
  // Words not there are said so; the bar's own words are never found.
  input.value = 'zebra';
  input.dispatchEvent(new Event('input'));
  await find.updateComplete;
  expect(find.querySelector('.to-find-count')!.textContent).toBe('Not found');
  input.value = 'quay';
  input.dispatchEvent(new Event('input'));
  await find.updateComplete;
  expect(find.querySelector('.to-find-count')!.textContent).toBe('1 of 2');
  input.dispatchEvent(new KeyboardEvent('keydown', { key: 'Escape', bubbles: true }));
  await find.updateComplete;
  expect(find.querySelector('.to-find')).toBeNull();
  expect(CSS.highlights.has('to-find')).toBe(false);
  // The focus is in the words, the match in hand chosen.
  expect(window.getSelection()!.toString()).toBe('quay');
});

test('Find in a sheet goes from matching cell to matching cell, the focus left in the bar', async () => {
  const sheet = encodeDoc('| Item | Cost:money |\n|---|---|\n| Café supplies | 300 |\n| Rent | 1200 |\n| Rental van | 90 |\n');
  const shell = await mount(`#/v1/sheet/${sheet}`);
  await until(() => !!shell.querySelector('to-sheet-editor #c0_0'));
  key('f');
  const find = shell.querySelector<ToFind>('to-find')!;
  await until(() => !!find.querySelector('.to-find-input'));
  const input = find.querySelector<HTMLInputElement>('.to-find-input')!;
  input.value = 'rent';
  input.dispatchEvent(new Event('input'));
  await find.updateComplete;
  expect(find.querySelector('.to-find-count')!.textContent).toBe('1 of 2');
  const ed = shell.querySelector('to-sheet-editor') as HTMLElement & { sel: [number, number] };
  expect(ed.sel).toEqual([1, 0]);
  input.dispatchEvent(new KeyboardEvent('keydown', { key: 'Enter', bubbles: true }));
  await find.updateComplete;
  expect(ed.sel).toEqual([2, 0]);
  expect(document.activeElement).toBe(input);
  input.dispatchEvent(new KeyboardEvent('keydown', { key: 'Escape', bubbles: true }));
  await until(() => document.activeElement?.id === 'c2_0');
});

test('Find closed with nothing found (Escape or Close) gives the focus back where it was, never to nothing (walks: text at a desktop, seed 1880387784)', async () => {
  const shell = await mount(`#/v1/write/${NOTES}`);
  await until(() => !!shell.querySelector('to-write-editor to-text .tx p'));
  const words = shell.querySelector<HTMLElement>('to-write-editor to-text .tx')!;
  words.focus();
  key('f');
  const find = shell.querySelector<ToFind>('to-find')!;
  await until(() => !!find.querySelector('.to-find-input'));
  const input = find.querySelector<HTMLInputElement>('.to-find-input')!;
  await until(() => document.activeElement === input);
  input.dispatchEvent(new KeyboardEvent('keydown', { key: 'Escape', bubbles: true }));
  await find.updateComplete;
  expect(document.activeElement).toBe(words);
  key('f');
  await until(() => document.activeElement === find.querySelector('.to-find-input'));
  find.querySelector<HTMLButtonElement>('button[aria-label="Close"]')!.click();
  await find.updateComplete;
  expect(document.activeElement).toBe(words);
});

test('Mod+/ and the menu open the keyboard shortcuts, read from the command registry: the app’s own, the words’, the page’s', async () => {
  const shell = await mount(`#/v1/draw`);
  await until(() => !!shell.querySelector('to-draw-editor'));
  expect(key('/')).toBe(false);
  const dialog = () => shell.querySelector<HTMLDialogElement>('to-dialog.to-keys-dialog dialog')!;
  await until(() => dialog().open);
  const groups = [...dialog().querySelectorAll('.to-keys caption')].map((c) => c.textContent);
  expect(groups).toEqual(['Drawing Tool', 'Words', 'This page']);
  expect(dialog().textContent).toContain('Find in this document');
  expect(dialog().textContent).toContain('Rectangle');
  expect(dialog().querySelector('kbd')!.textContent).toBe('V');
  // The alignment keys, as this device writes them: the Drawing Tool's, a row each.
  const rows = (d: HTMLDialogElement) => [...d.querySelectorAll('.to-keys')[0].querySelectorAll('tr')].map((r) => [r.querySelector('kbd')!.textContent, r.querySelector('td')!.textContent]);
  const shift = (k: string) => keysText(`Mod+Shift+${k}`);
  expect(rows(dialog())).toContainEqual([shift('L'), 'Align: left']);
  expect(rows(dialog())).toContainEqual([shift('E'), 'Align: centre']);
  expect(rows(dialog())).toContainEqual([shift('R'), 'Align: right']);
  dialog().close();
  await until(() => !dialog().open);
  // The Word Processor's four.
  const write = await mount(`#/v1/write`);
  await until(() => !!write.querySelector('to-write-editor'));
  write.querySelector<HTMLButtonElement>('.to-burger')!.click();
  await until(() => !!write.querySelector('.to-drawer-keys'));
  write.querySelector<HTMLButtonElement>('.to-drawer-keys')!.click();
  const writeDialog = () => write.querySelector<HTMLDialogElement>('to-dialog.to-keys-dialog dialog')!;
  await until(() => writeDialog().open);
  expect(writeDialog().querySelector('.to-keys caption')!.textContent).toBe('Word Processor');
  for (const row of [
    [shift('L'), 'Align left'],
    [shift('E'), 'Centre'],
    [shift('R'), 'Align right'],
    [shift('J'), 'Justify'],
  ])
    expect(rows(writeDialog())).toContainEqual(row);
  writeDialog().close();
  await until(() => !writeDialog().open);
  // On the home page, from the menu.
  const home = await mount('');
  home.querySelector<HTMLButtonElement>('.to-burger')!.click();
  await until(() => !!home.querySelector('.to-drawer-keys'));
  home.querySelector<HTMLButtonElement>('.to-drawer-keys')!.click();
  await until(() => home.querySelector<HTMLDialogElement>('to-dialog.to-keys-dialog dialog')!.open);
  expect([...home.querySelectorAll('.to-keys-dialog .to-keys caption')].map((c) => c.textContent)).toEqual(['Words', 'This page']);
});

test('Mod+S keeps the document under Saved, and says why not under Private', async () => {
  const shell = await mount(`#/v1/write/${NOTES}`);
  await until(() => !!shell.querySelector('to-write-editor'));
  expect(key('s')).toBe(false);
  await until(() => toastSays(shell).startsWith('Private: this site keeps no documents'));
  await saved(async () => {
    const again = await mount(`#/v1/write/${NOTES}`);
    await until(() => !!again.querySelector('to-write-editor'));
    key('s');
    await until(() => toastSays(again) === 'Kept on this device');
    expect(library().map((k) => [k.title, k.hash])).toEqual([['Harbour notes', `#/v1/write/${NOTES}`]]);
    expect((history.state as { kept: string }).kept).toBe(library()[0].id);
  });
});

test('the skip link is the first thing a Tab reaches, hidden until then, and takes the focus into the document', async () => {
  const shell = await mount(`#/v1/write/${NOTES}`);
  await until(() => !!shell.querySelector('to-write-editor to-text .tx p'));
  const skip = shell.querySelector<HTMLButtonElement>('.to-skip')!;
  expect(shell.firstElementChild).toBe(skip);
  expect(skip.textContent).toBe('Skip to the document');
  expect(skip.getBoundingClientRect().bottom).toBeLessThanOrEqual(0);
  // The document opened with the focus in its words (docs/editing.md §1); from the top of the page again, a Tab.
  await until(() => !!shell.querySelector('to-write-editor to-text')!.contains(document.activeElement));
  const top = document.createElement('span');
  top.tabIndex = -1;
  document.body.prepend(top);
  top.focus();
  top.remove();
  await userEvent.tab();
  expect(document.activeElement).toBe(skip);
  expect(skip.getBoundingClientRect().top).toBeGreaterThanOrEqual(0);
  skip.click();
  expect(shell.querySelector('to-write-editor to-text')!.contains(document.activeElement) || document.activeElement?.localName === 'to-text').toBe(true);
});

test('the size of everything is first under the menu’s head on the home page, and the palette finds it by “larger” and “size”, with no key of its own; a new visit keeps it, Private or not', async () => {
  const shell = await mount('');
  shell.querySelector<HTMLButtonElement>('.to-burger')!.click();
  await until(() => shell.querySelector<HTMLDialogElement>('dialog.to-drawer')!.open);
  // On the home page straight under the head, before anything else in the menu.
  expect(shell.querySelector('.to-drawer-head')!.nextElementSibling!.classList.contains('to-size')).toBe(true);
  expect(shell.querySelector('.to-size-more')!.getAttribute('aria-label')).toBe('Everything larger');
  shell.querySelector<HTMLDialogElement>('dialog.to-drawer')!.close();
  const pal = () => shell.querySelector('to-palette')!;
  const items = () => [...pal().querySelectorAll('.to-palette-item')].map((i) => i.querySelector('.to-palette-words')!.textContent!.trim());
  const chosen = async (words: string, label: string) => {
    void shell.showPalette();
    await until(() => !!pal().querySelector('dialog[open]'));
    await userEvent.type(pal().querySelector<HTMLInputElement>('.to-palette-find')!, words);
    await until(() => items().includes(label));
    const row = [...pal().querySelectorAll('.to-palette-item')].find((i) => i.textContent!.includes(label))!;
    expect(row.querySelector('kbd')).toBeNull();
    (row as HTMLElement).click();
    await until(() => !pal().querySelector('dialog[open]'));
    // The dialog's close event comes a task later; the next opening waits for it.
    await tick(50);
  };
  await chosen('larger', 'Everything larger');
  await until(() => size() === 1.1);
  await chosen('larger', 'Everything larger');
  await until(() => size() === 1.2);
  // Kept on the device though the visit is private, as the language is.
  expect(localStorage.getItem('tinyoffice.size')).toBe('1.2');
  await chosen('smaller', 'Everything smaller');
  await until(() => size() === 1.1);
  await chosen('size', 'Normal size');
  await until(() => size() === 1);
  expect(localStorage.getItem('tinyoffice.size')).toBeNull();
});

test('the size of everything: 70% to 200% from the menu, on the root at 1.3 times itself, and a menu still opens under its button', async () => {
  const shell = await mount('');
  shell.querySelector<HTMLButtonElement>('.to-burger')!.click();
  await until(() => !!shell.querySelector('.to-size'));
  const more = shell.querySelector<HTMLButtonElement>('.to-size-more')!;
  const less = shell.querySelector<HTMLButtonElement>('.to-size-less')!;
  expect(shell.querySelector('.to-size-now')!.textContent).toBe('100%');
  for (let i = 0; i < 18; i++) (more.click(), await tick());
  expect(size()).toBe(2);
  expect(more.disabled).toBe(true);
  expect(document.documentElement.style.getPropertyValue('--to-doc')).toBe('2.6');
  expect(shell.querySelector('.to-size-now')!.textContent).toBe('200%');
  shell.querySelector<HTMLButtonElement>('.to-size-now')!.click();
  await tick();
  expect(document.documentElement.style.getPropertyValue('--to-doc')).toBe('1.3');
  for (let i = 0; i < 3; i++) (less.click(), await tick());
  expect(size()).toBe(0.7);
  expect(less.disabled).toBe(true);
  // A popover placed by hand sits under its button at any size.
  stepSize(1);
  stepSize(1);
  stepSize(1);
  stepSize(1);
  expect(size()).toBe(1.1);
  const btn = document.createElement('button');
  btn.textContent = 'Opener';
  btn.style.cssText = 'position:fixed;top:100px;left:100px';
  const pop = document.createElement('div');
  pop.popover = 'manual';
  pop.style.cssText = 'margin:0;position:fixed;inset:auto';
  pop.textContent = 'A menu';
  document.body.append(btn, pop);
  pop.showPopover();
  place(pop, btn);
  const b = btn.getBoundingClientRect();
  const p = pop.getBoundingClientRect();
  expect(Math.abs(p.top - (b.bottom + 4 * 1))).toBeLessThan(8);
  expect(Math.abs(p.left - b.left)).toBeLessThan(4);
  btn.remove();
  pop.remove();
});

test('opened from a link while the library keeps another version of the same document: a quiet line offers it', () =>
  saved(async () => {
    const newer = `#/v1/write/${encodeDoc('---\ntitle: Harbour notes\n---\nThe newer words.\n')}`;
    keep({ id: 'n', app: 'write', title: 'Harbour notes', hash: newer, at: Date.now() - 3600_000 });
    const shell = await mount(`#/v1/write/${NOTES}`);
    await until(() => !!shell.querySelector('.to-other'));
    const line = shell.querySelector('.to-other')!;
    expect(line.textContent).toContain('This device keeps another version of “Harbour notes”, from 1 hour ago.');
    expect(line.querySelector<HTMLAnchorElement>('.to-other-open')!.getAttribute('href')).toBe(newer);
    line.querySelector<HTMLButtonElement>('[aria-label=Close]')!.click();
    await until(() => !shell.querySelector('.to-other'));
    // The kept version itself, or another name, says nothing.
    const same = await mount(newer);
    await until(() => !!same.querySelector('to-write-editor'));
    expect(same.querySelector('.to-other')).toBeNull();
    const other = await mount(`#/v1/write/${encodeDoc('---\ntitle: Elsewhere\n---\nWords.\n')}`);
    await until(() => !!other.querySelector('to-write-editor'));
    expect(other.querySelector('.to-other')).toBeNull();
  }));

test('a link from a newer Tiny Little Office says so', async () => {
  const shell = await mount(`#/v2/write/${NOTES}`);
  await shell.updateComplete;
  expect(shell.textContent).toContain('This link was made by a newer Tiny Little Office. Reload the page to get it.');
});

test('the Share dialog’s head line: where the link fits with Copy, the rooms in a popover on a tap, red past the limit', async () => {
  const shell = await mount(`#/v1/write/${NOTES}`);
  await until(() => !!shell.querySelector('to-write-editor'));
  await shell.openShare();
  const fit = shell.querySelector('.to-share-fit')!;
  expect(fit.classList.contains('over')).toBe(false);
  expect(fit.querySelector('.to-fit-words')!.textContent).toContain('fits in a text message');
  expect(fit.querySelector('.to-fit-copy')!.getAttribute('aria-label')).toBe('Copy link');
  const rooms = fit.querySelector<HTMLElement>('.to-rooms')!;
  expect(rooms.matches(':popover-open')).toBe(false);
  fit.querySelector<HTMLButtonElement>('.to-fit-words')!.click();
  await until(() => rooms.matches(':popover-open'));
  const rows = [...rooms.querySelectorAll('tbody tr')];
  expect(rows.length).toBe(11);
  expect(rows.map((r) => r.querySelector('th')!.textContent)).toContain('a QR code');
  expect(rooms.textContent).toContain('any length');
  rooms.hidePopover();
  // A document past the link's limit: the line in red, said in characters over.
  const big = Array.from({ length: 3000 }, (_, i) => `${(i * 7919) % 10007}`).join(' ');
  const over = await mount(`#/v1/write/${encodeDoc(big)}`);
  await until(() => !!over.querySelector('to-write-editor'));
  await over.openShare();
  const line = over.querySelector('.to-share-fit')!;
  expect(line.classList.contains('over')).toBe(true);
  expect(line.textContent).toMatch(/characters over the link limit/);
  expect(getComputedStyle(line.querySelector('.to-fit-words')!).color).not.toBe(getComputedStyle(over.querySelector('.to-share-links')!).color);
});

test('the Display Link draws a letter page at its paper’s width, centred, never stretched', async () => {
  await page.viewport(1100, 800);
  const shell = await mount(`#/v1/write/${encodeDoc('Words on paper.\n')}?d`);
  await until(() => !!shell.querySelector('.to-display-page svg'));
  const svg = shell.querySelector('.to-display-page svg')!.getBoundingClientRect();
  const w = Number(shell.querySelector('.to-display-page svg')!.getAttribute('viewBox')!.split(' ')[2]);
  // At its paper's width in the page's own lengths, sixteenths of a rem: on the screen, the size of everything times that.
  expect(Math.abs(svg.width / remScale() - w)).toBeLessThan(2);
  expect(Math.abs(svg.left + svg.width / 2 - document.documentElement.clientWidth / 2)).toBeLessThan(10);
});

test('where the browser offers to install the site, the menu has Add to home screen, and it asks the browser once', async () => {
  const shell = await mount('');
  let asked = 0;
  const offer = Object.assign(new Event('beforeinstallprompt', { cancelable: true }), { prompt: async () => void asked++ });
  window.dispatchEvent(offer);
  expect(offer.defaultPrevented).toBe(true);
  shell.querySelector<HTMLButtonElement>('.to-burger')!.click();
  await until(() => !!shell.querySelector('.to-install'));
  expect(shell.querySelector('.to-install')!.textContent).toContain('Add to home screen');
  shell.querySelector<HTMLButtonElement>('.to-install')!.click();
  await until(() => asked === 1);
  await until(() => !shell.querySelector('.to-install'));
});
