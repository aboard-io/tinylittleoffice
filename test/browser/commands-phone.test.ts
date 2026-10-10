// Round nine on a phone (directive r9-commands, points 4 and 5): the context bar is a row of the bottom bar, beginning
// with Cut, Copy and Paste, and nothing floats over the words; on a fine pointer it floats as before. The bar comes with
// a person's focus in the document and goes with it (the Calculator's always shows); what of it needs nothing in hand is
// a row of the drawer's This document. And the command palette (point 6): Mod+K, filtered as typed, Enter runs.
import { afterEach, expect, test, vi } from 'vitest';
import { cdp, page, userEvent } from 'vitest/browser';
import { mount, tick, until } from './helpers.ts';
import { encodeDoc } from '../../src/kit/codec.ts';
import { copyData, GENERATOR } from '../../src/kit/clipboard.ts';
import { parse } from '../../src/doc/index.ts';
import type { ToShell } from '../../src/kit/shell.ts';
import type { ToText } from '../../src/kit/text.ts';
import type { ToPalette } from '../../src/kit/palette.ts';
import type { ToLinkPop } from '../../src/kit/link-pop.ts';

const coarse = async (on: boolean) => cdp().send('Emulation.setTouchEmulationEnabled', on ? { enabled: true, maxTouchPoints: 5 } : { enabled: false });
afterEach(async () => {
  await coarse(false);
  vi.restoreAllMocks();
});
const frame = () => new Promise((r) => requestAnimationFrame(() => requestAnimationFrame(r)));
const settled = async () => {
  await frame();
  await until(() => !document.querySelector('to-chrome[gliding]') && document.getAnimations().every((a) => a.playState !== 'running'));
};
const DOC = '# Plans\n\nThe words of the plan, to be chosen.\n\nMore words after them.\n';

async function write(): Promise<{ shell: ToShell; text: ToText }> {
  const shell = await mount(`#/v1/write/${encodeDoc(DOC)}`);
  await until(() => !!shell.querySelector('to-write-editor to-text .tx') && !!shell.querySelector('.to-editor to-bar button'));
  const text = shell.querySelector<ToText>('to-write-editor to-text')!;
  await text.updateComplete;
  await settled();
  return { shell, text };
}
const bar = () => document.querySelector<HTMLElement>('.to-editor to-bar')!;
const shown = (el: HTMLElement) => getComputedStyle(el).opacity === '1' && getComputedStyle(el).transform === 'none';
const bubble = (text: ToText) => text.querySelector<HTMLElement>(':scope > to-context.tx-bubble > .to-context')!;
/** Some words selected, as a finger's drag leaves them: the second paragraph's first word. */
async function choose(text: ToText) {
  text.tx.focus();
  text.sel = { anchor: { block: 1, offset: 4 }, focus: { block: 1, offset: 9 } };
  await text.updateComplete;
  await until(() => bubble(text).matches(':popover-open'));
  await frame();
}

test('on a phone a selection puts Cut, Copy, Paste and the marks in the bottom bar’s row, nothing floats over the words, and the row goes when the selection collapses', async () => {
  await page.viewport(390, 844);
  await coarse(true);
  const { text } = await write();
  await userEvent.click(text.tx.querySelector('p')!);
  await settled();
  await choose(text);
  const row = bubble(text);
  expect(row.hasAttribute('data-docked')).toBe(true);
  const names = [...row.querySelectorAll('button')].map((b) => b.getAttribute('aria-label'));
  expect(names.slice(0, 3)).toStrictEqual(['Cut', 'Copy', 'Paste']);
  expect(names).toContain('Bold');
  expect(names).toContain('Link');
  // The row is the bottom bar's: across the column's foot, under the words chosen, never over them.
  await settled();
  const r = row.getBoundingClientRect();
  const chrome = document.querySelector('to-chrome')!.getBoundingClientRect();
  expect(r.bottom).toBeCloseTo(chrome.bottom, 0);
  expect(r.width).toBeCloseTo(chrome.width, 0);
  const words = document.getSelection()!.getRangeAt(0).getBoundingClientRect();
  expect(r.top).toBeGreaterThanOrEqual(words.bottom);
  // The app's bar has stepped aside under it.
  expect(document.documentElement.hasAttribute('data-context-row')).toBe(true);
  expect(shown(bar())).toBe(false);
  // The selection collapsed: the row goes, and the bar's own comes back.
  text.sel = { anchor: { block: 1, offset: 9 }, focus: { block: 1, offset: 9 } };
  await text.updateComplete;
  await until(() => !row.matches(':popover-open'));
  expect(document.documentElement.hasAttribute('data-context-row')).toBe(false);
  await settled();
  expect(shown(bar())).toBe(true);
});

test('Copy in the row puts our words and our HTML on the clipboard; Cut takes them; Paste refused says to use the keyboard’s', async () => {
  await page.viewport(390, 844);
  await coarse(true);
  const { text } = await write();
  const wrote: Record<string, string>[] = [];
  vi.spyOn(navigator.clipboard, 'write').mockImplementation(async (items: ClipboardItems) => {
    for (const item of items) {
      const got: Record<string, string> = {};
      for (const type of item.types) got[type] = await (await item.getType(type)).text();
      wrote.push(got);
    }
  });
  vi.spyOn(navigator.clipboard, 'read').mockRejectedValue(new DOMException('refused', 'NotAllowedError'));
  vi.spyOn(navigator.clipboard, 'readText').mockRejectedValue(new DOMException('refused', 'NotAllowedError'));
  await userEvent.click(text.tx.querySelector('p')!);
  await choose(text);
  bubble(text).querySelector<HTMLButtonElement>('button[aria-label="Copy"]')!.click();
  await until(() => wrote.length === 1);
  // What the keys' copy writes (kit/clipboard.ts copyData): the TLO of the words, and our HTML.
  expect(wrote[0]['text/plain'].trim()).toBe('words');
  expect(wrote[0]['text/html']).toContain(GENERATOR);
  expect(wrote[0]['text/html']).toContain('words');
  // Cut: the same, and the words gone.
  bubble(text).querySelector<HTMLButtonElement>('button[aria-label="Cut"]')!.click();
  await until(() => wrote.length === 2);
  await until(() => !text.tx.textContent!.includes('The words of'));
  // Paste where the browser refuses a page the clipboard: a line under the row says to use the keyboard's.
  await choose(text);
  bubble(text).querySelector<HTMLButtonElement>('button[aria-label="Paste"]')!.click();
  await until(() => !!bubble(text).querySelector('.to-context-hint'));
  expect(bubble(text).querySelector('.to-context-hint')!.textContent).toContain('keyboard');
});

test('Paste in the row, where the browser allows it, reads our words and our HTML and puts them in through the editor’s paste', async () => {
  await page.viewport(390, 844);
  await coarse(true);
  const { text } = await write();
  // What another document's Copy wrote (kit/clipboard.ts copyData): the TLO, and our HTML carrying the exact runs.
  const held = copyData(parse('Some **pasted** words\n').blocks, { anchor: { block: 0, offset: 0 }, focus: { block: 0, offset: 17 } });
  const read = vi
    .spyOn(navigator.clipboard, 'read')
    .mockResolvedValue([new ClipboardItem({ 'text/plain': new Blob([held.text], { type: 'text/plain' }), 'text/html': new Blob([held.html], { type: 'text/html' }) })]);
  await userEvent.click(text.tx.querySelector('p')!);
  await choose(text);
  bubble(text).querySelector<HTMLButtonElement>('button[aria-label="Paste"]')!.click();
  // The words chosen are replaced by the words held, the mark kept: read from our HTML's runs, not the bare words.
  await until(() => text.tx.textContent!.includes('The Some pasted words of the plan'));
  expect(read).toHaveBeenCalled();
  expect(text.tx.querySelector('b')!.textContent).toBe('pasted');
  expect(bubble(text).querySelector('.to-context-hint')).toBeNull();
});

test('on a fine pointer the selection bubble floats under the words, as before, with no Cut, Copy or Paste of its own', async () => {
  await page.viewport(1200, 800);
  const { text } = await write();
  await choose(text);
  const b = bubble(text);
  expect(b.hasAttribute('data-docked')).toBe(false);
  const names = [...b.querySelectorAll('button')].map((x) => x.getAttribute('aria-label'));
  expect(names[0]).toBe('Bold');
  expect(names).not.toContain('Copy');
  const words = document.getSelection()!.getRangeAt(0).getBoundingClientRect();
  expect(b.getBoundingClientRect().top).toBeGreaterThanOrEqual(words.bottom);
  expect(b.getBoundingClientRect().width).toBeLessThan(800);
  expect(shown(bar())).toBe(true);
});

test('on a phone the Word Processor shows no bar until the words are tapped, and hides it when the focus leaves', async () => {
  await page.viewport(390, 844);
  await coarse(true);
  const { text, shell } = await write();
  // The paper meets the header's hairline: no strip of grey between the border and the document (Paul, 2026-10-10).
  expect(shell.querySelector('.write-page')!.getBoundingClientRect().top).toBeCloseTo(shell.querySelector('.to-header')!.getBoundingClientRect().bottom, 0);
  // Opened with the focus in the words (the page's own): reading, no bar.
  expect(text.hasFocus()).toBe(true);
  expect(shown(bar())).toBe(false);
  await userEvent.click(text.tx.querySelector('p')!);
  await settled();
  expect(shown(bar())).toBe(true);
  expect(shown(shell.querySelector<HTMLElement>('.to-palette-btn')!)).toBe(true);
  // The focus gone from the document: the bar goes with it.
  text.tx.blur();
  (document.activeElement as HTMLElement | null)?.blur();
  await tick(50);
  await settled();
  expect(shown(bar())).toBe(false);
});

test('on a phone the Spreadsheet shows its bar with a cell chosen, and the Calculator always', async () => {
  await page.viewport(390, 844);
  await coarse(true);
  const sheet = await mount(`#/v1/sheet/${encodeDoc('Item | Cost\n--- | ---\nRent | 1200\n')}`);
  await until(() => !!sheet.querySelector('input[aria-label="B1"]'));
  await settled();
  expect(shown(bar())).toBe(false);
  await userEvent.click(sheet.querySelector<HTMLInputElement>('input[aria-label="B1"]')!);
  await settled();
  expect(shown(bar())).toBe(true);
  const calc = await mount('#/v1/calc');
  await until(() => !!calc.querySelector('.calc-display') && !!calc.querySelector('.to-editor to-bar button'));
  (document.activeElement as HTMLElement | null)?.blur();
  await settled();
  expect(shown(bar())).toBe(true);
});

test('on a phone the drawer’s This document has the app’s own rows that need nothing in hand: Present and Look in a deck, Look and Paper in a document', async () => {
  await page.viewport(390, 844);
  await coarse(true);
  const deck = await mount(`#/v1/deck/${encodeDoc('## One\n\n- a point\n')}`);
  await until(() => !!deck.querySelector('to-deck-editor to-bar button'));
  deck.querySelector<HTMLButtonElement>('.to-burger')!.click();
  await until(() => !!deck.querySelector('dialog.to-drawer[open] .to-drawer-doc'));
  const rows = () =>
    [...deck.querySelectorAll<HTMLElement>('.to-drawer-doc .to-drawer-cmd')].map((r) => (r.matches('to-menu') ? r.querySelector('button')!.textContent!.trim() : r.textContent!.trim()));
  expect(deck.querySelector('.to-drawer-app')!.textContent).toBe('Presentation Builder');
  expect(rows().some((r) => r.startsWith('Present'))).toBe(true);
  expect(rows().some((r) => r.startsWith('Look:'))).toBe(true);
  // Present from the drawer: the drawer closes and the show begins.
  [...deck.querySelectorAll<HTMLButtonElement>('.to-drawer-doc button.to-drawer-cmd')].find((b) => b.textContent!.trim().startsWith('Present'))!.click();
  await until(() => !!deck.querySelector('.deck-show'));
  expect(deck.querySelector<HTMLDialogElement>('dialog.to-drawer')!.open).toBe(false);
  const doc = await mount(`#/v1/write/${encodeDoc(DOC)}`);
  await until(() => !!doc.querySelector('to-write-editor to-bar button'));
  doc.querySelector<HTMLButtonElement>('.to-burger')!.click();
  await until(() => !!doc.querySelector('dialog.to-drawer[open] .to-drawer-doc'));
  const names = [...doc.querySelectorAll<HTMLElement>('.to-drawer-doc to-menu.to-drawer-cmd > button')].map((b) => b.textContent!.trim());
  expect(names.some((n) => n.startsWith('Look:'))).toBe(true);
  expect(names.some((n) => n.startsWith('Paper:'))).toBe(true);
});

const palette = () => document.querySelector<ToPalette>('to-palette')!;
test('the command palette: Mod+K opens every command in force, typing narrows it, Enter runs the one in hand; in words Mod+K is Link, and the bar’s button opens it with the words’ commands', async () => {
  await page.viewport(1200, 800);
  const { shell, text } = await write();
  // From the bar (not words): Mod+K.
  const heading = shell.querySelector<HTMLButtonElement>('to-bar button[aria-label="Heading"]')!;
  heading.focus();
  heading.dispatchEvent(new KeyboardEvent('keydown', { key: 'k', code: 'KeyK', ctrlKey: true, bubbles: true, cancelable: true }));
  await until(() => palette().isOpen);
  const items = () => [...palette().querySelectorAll('.to-palette-item')].map((i) => i.querySelector('.to-palette-words')!.textContent!.trim());
  expect(items()).toContain('Undo');
  expect(items()).toContain('Share…');
  expect(items()).toContain('Paragraph');
  expect(items()).not.toContain('All commands…');
  // Each with its keys beside it.
  const share = [...palette().querySelectorAll('.to-palette-item')].find((i) => i.textContent!.includes('Share…'))!;
  expect(share.querySelector('kbd')!.textContent).toMatch(/S$/);
  // Typing narrows it to the commands with a word that starts so.
  const find = palette().querySelector<HTMLInputElement>('.to-palette-find')!;
  expect(document.activeElement).toBe(find);
  await userEvent.type(find, 'subh');
  await until(() => items().length === 1);
  expect(items()).toStrictEqual(['Subheading']);
  await userEvent.keyboard('{Enter}');
  await until(() => !palette().isOpen);
  await until(() => !!text.tx.querySelector('h2'));
  // In words Mod+K is Link: the link box, not the palette.
  text.tx.focus();
  text.sel = { anchor: { block: 1, offset: 4 }, focus: { block: 1, offset: 9 } };
  await text.updateComplete;
  text.tx.dispatchEvent(new KeyboardEvent('keydown', { key: 'k', code: 'KeyK', ctrlKey: true, bubbles: true, cancelable: true }));
  await tick(50);
  expect(palette().isOpen).toBe(false);
  expect(text.querySelector<ToLinkPop>('to-link-pop')!.shown).toBe(true);
  for (const d of document.querySelectorAll<HTMLElement>('[popover]:popover-open')) d.hidePopover();
  // The bar's end button: the palette, the words' commands in it, and one runs on the words chosen.
  text.sel = { anchor: { block: 1, offset: 4 }, focus: { block: 1, offset: 9 } };
  await text.updateComplete;
  shell.querySelector<HTMLButtonElement>('.to-palette-btn')!.click();
  await until(() => palette().isOpen);
  expect(items()).toContain('Bold');
  await userEvent.type(palette().querySelector<HTMLInputElement>('.to-palette-find')!, 'bold');
  await until(() => items()[0] === 'Bold');
  await userEvent.keyboard('{ArrowDown}{ArrowUp}{Enter}');
  await until(() => !palette().isOpen);
  await until(() => !!text.tx.querySelectorAll('p')[0]?.querySelector('b') || !!text.tx.querySelector('b'));
  expect(text.tx.querySelector('b')!.textContent).toBe('words');
  // Escape closes it, and a word nothing starts says so.
  shell.querySelector<HTMLButtonElement>('.to-palette-btn')!.click();
  await until(() => palette().isOpen);
  await userEvent.type(palette().querySelector<HTMLInputElement>('.to-palette-find')!, 'zzq');
  await until(() => palette().querySelector('[role=status]')?.textContent === 'Nothing starts “zzq”');
  await userEvent.keyboard('{Escape}');
  await until(() => !palette().isOpen);
});

test('the palette opened over a bar’s menu (the tap closes the menu) gives the focus back to the menu’s button on Escape, never to nothing (walks: grid at a desktop, seed -909624643)', async () => {
  await page.viewport(1440, 900);
  const shell = await mount(`#/v1/sheet/${encodeDoc('Item | Cost:money\n--- | ---\nRent | 1200\n')}`);
  await until(() => !!shell.querySelector('.to-editor to-bar to-menu:not([keep]) > button'));
  const menu = shell.querySelector<HTMLElement>('.to-editor to-bar to-menu:not([keep])')!;
  const button = menu.querySelector<HTMLElement>(':scope > button')!;
  await userEvent.click(button);
  await until(() => menu.querySelector('[popover]')!.matches(':popover-open'));
  await userEvent.click(shell.querySelector<HTMLElement>('.to-palette-btn')!);
  await until(() => !!shell.querySelector<ToPalette>('to-palette')!.isOpen);
  await userEvent.keyboard('{Escape}');
  await until(() => !shell.querySelector<ToPalette>('to-palette')!.isOpen);
  await tick(20);
  expect(document.activeElement).toBe(button);
  await page.viewport(414, 896);
});
