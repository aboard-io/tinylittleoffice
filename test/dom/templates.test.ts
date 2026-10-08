// Starting from a template, in the shell as a visitor finds it (ported from e2e/templates.spec.ts).
import { test, expect } from 'vitest';
import { button } from './helpers.ts';
import { shell, bodyOf, editorOf, settleAll, until, texts } from './helpers-apps.ts';
import { parseGrid } from '../../src/lib/formula.ts';

/** The template dialog, once it is open. */
async function picker() {
  let dialog: HTMLElement | null = null;
  await until(() => {
    dialog = document.querySelector('sl-dialog.to-templates');
    expect(dialog?.hasAttribute('open')).toBe(true);
  });
  return dialog!;
}

/** Choose a template by name in the open dialog, and wait for it to go. */
async function choose(name: string) {
  const dialog = await picker();
  [...dialog.querySelectorAll<HTMLElement>('.to-template')].find((c) => c.textContent?.includes(name))!.click();
  await until(() => expect(document.querySelector('sl-dialog.to-templates')).toBeNull());
  await settleAll();
}

/** Open the picker from the toolbar and choose a template. */
async function startFrom(name: string) {
  [...document.querySelectorAll<HTMLElement>('.to-template-tool')].find((b) => b.textContent?.includes('Start from a template'))!.click();
  await choose(name);
}

const undo = async () => {
  button(document.querySelector('to-app')!, 'Undo').click();
  await settleAll();
};

test('an empty text starts from a template: a picture of each, one undo back to blank', async () => {
  await shell('#/v0/write');
  // Offered twice, quietly: a line on the blank page and a button in the toolbar. Never a dialog by itself.
  const line = () => document.querySelector('.to-template-line');
  expect(line()?.textContent).toContain('Start from a template');
  expect(document.querySelector('.to-template-tool')).toBeTruthy();
  expect(document.querySelector('sl-dialog.to-templates')).toBeNull();
  line()!.querySelector('button')!.click();
  const dialog = await picker();
  const cards = dialog.querySelectorAll('.to-template');
  expect(cards).toHaveLength(8);
  expect(dialog.querySelectorAll('.to-template .pic svg')).toHaveLength(8);
  expect(texts(dialog, '.to-template b').filter((t) => t === 'Business plan')).toHaveLength(1);
  await choose('Meeting notes');
  const doc = editorOf('write');
  expect(texts(doc, 'h1')).toEqual(['Meeting notes']);
  expect(texts(doc, 'h2')).toEqual(['Agenda', 'Notes', 'Decisions', 'Actions']);
  await until(() => expect(location.hash).toMatch(/#\/v0\/write\/[WYZR]/));
  expect(bodyOf()).toMatch(/^# Meeting notes\n/);
  // Once there are words, the offer is gone; one undo and the blank page is back, offer and all.
  expect(line()).toBeNull();
  expect(document.querySelector('.to-template-tool')).toBeNull();
  await undo();
  expect(doc.querySelectorAll('h1')).toHaveLength(0);
  expect(line()).toBeTruthy();
  // The plans are templates here now: the sections, each with its questions in italics.
  await startFrom('Go-to-market plan');
  expect(texts(doc, 'h1')).toEqual(['Go-to-market plan']);
  expect(texts(doc, 'h2')).toHaveLength(7);
  expect(texts(doc, 'h2')[0]).toBe('The customer');
  // (The first italic line is the subtitle; the questions follow each heading.)
  expect(doc.querySelector('h2 + p i')?.textContent).toContain('Who buys first');
});

test('a sheet starts from a template, sums and chart included', async () => {
  await shell('#/v0/sheet');
  const cell = (ref: string) => document.querySelector<HTMLInputElement>(`to-sheet input[aria-label="${ref}"]`)!;
  expect(document.querySelector('.to-template-line')).toBeTruthy();
  await startFrom('Budget');
  expect(cell('A1').value).toBe('Item');
  expect(cell('D8').value).toBe('$65.00');
  expect(document.querySelector('.to-template-line')).toBeNull();
  await undo();
  expect(cell('A1').value).toBe('');
  expect(bodyOf()).toBe('');
  await startFrom('Comparison');
  expect(document.querySelector('.sheet-chart svg')).toBeTruthy();
  expect(cell('A2').value).toBe('Alpha');
  expect(parseGrid(bodyOf().replace(/^!.*\n/, ''))[1][0]).toBe('Alpha');
});

test('a deck starts from a template: slides with icons, from the first', async () => {
  await shell('#/v0/deck');
  expect(document.querySelector('.to-template-line')).toBeTruthy();
  await startFrom('A talk');
  expect(document.querySelectorAll('.deck-thumb')).toHaveLength(6);
  expect(document.querySelector('to-rich.title .write-page')?.textContent?.trim()).toBe('Talk title');
  expect(document.querySelector('.deck-kind')?.textContent?.trim()).toBe('Title');
  expect(document.querySelector('.to-template-line')).toBeNull();
  await undo();
  expect(document.querySelectorAll('.deck-thumb')).toHaveLength(1);
  expect(document.querySelector('.to-template-line')).toBeTruthy();
});
