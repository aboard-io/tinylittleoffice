// The Deck editor in a real Chromium: typing a headline and words is the document, Enter in the headline goes
// on to the words, Insert ▾ makes a slide of a layout, the rail follows, the Look menu is a head field, a
// footnote is listed at the slide's foot, a format changes the page and the rail, a page past what is
// written is born on its first letter, presenting shows a slide and Escape comes back, and at phone width
// the bar is one row and nothing is wider than the screen.
import { expect, test } from 'vitest';
import { page } from 'vitest/browser';
import '../editor.ts';
import type { ToDeckEditor } from '../editor.ts';
import { templates } from '../templates.ts';
import { tick, until } from '../../../../test/browser/helpers.ts';
import '../../../styles.css';

async function editor(value = ''): Promise<{ el: ToDeckEditor; changes: string[]; last: () => string | undefined }> {
  document.body.innerHTML = '';
  const main = document.createElement('main');
  main.className = 'to-main';
  document.body.append(main);
  const el = document.createElement('to-deck-editor') as ToDeckEditor;
  el.value = value;
  const changes: string[] = [];
  el.addEventListener('docchange', (e) => changes.push((e as CustomEvent<string>).detail));
  main.append(el);
  await el.updateComplete;
  await until(() => !!el.querySelector('to-text.deck-title .tx'));
  return { el, changes, last: () => changes.at(-1) };
}
const input = (tx: HTMLElement, inputType: string, data: string | null = null) => tx.dispatchEvent(new InputEvent('beforeinput', { inputType, data, bubbles: true, cancelable: true, composed: true }));
const box = (el: ToDeckEditor, which: 'title' | 'words' | 'right' | 'notes') => el.querySelector<HTMLElement>(`to-text.deck-${which} .tx`)!;
/** The caret at the end of a box (its selection setter focuses it). */
async function caretIn(el: ToDeckEditor, which: 'title' | 'words' | 'right' | 'notes') {
  const t = el.text(which)!;
  const last = t.model.length - 1;
  const len = t.model[last] && 'runs' in t.model[last] ? t.model[last].runs.reduce((n, r) => n + (r.ic || r.fn !== undefined ? 1 : r.t.length), 0) : 0;
  t.sel = { anchor: { block: last, offset: len }, focus: { block: last, offset: len } };
  await el.updateComplete;
  await tick();
}
async function type(el: ToDeckEditor, tx: HTMLElement, s: string) {
  for (const ch of s) {
    input(tx, 'insertText', ch);
    await el.updateComplete;
    await tick();
  }
}
const button = (root: ParentNode, label: string) => root.querySelector<HTMLButtonElement>(`button[aria-label="${label}"]`)!;
const thumbs = (el: ToDeckEditor) => [...el.querySelectorAll<HTMLButtonElement>('.deck-thumb')];
async function pick(el: ToDeckEditor, opener: HTMLElement, words: string) {
  opener.click();
  await until(() => !!document.querySelector('[popover]:popover-open'));
  const items = [...document.querySelectorAll<HTMLElement>('[popover]:popover-open [role^=menuitem]')];
  const item = items.find((x) => x.textContent!.includes(words));
  if (!item) throw new Error(`no item ${words} among ${items.map((x) => x.textContent!.trim()).join(' | ')}`);
  item.click();
  await el.updateComplete;
  await tick();
}
const talk = () => templates().find((x) => x.id === 'talk')!.doc;

test('typing a headline and words is the document; Enter in the headline goes on to the words; the rail follows', async () => {
  const { el, last } = await editor();
  expect(thumbs(el)).toHaveLength(1);
  await caretIn(el, 'title');
  await type(el, box(el, 'title'), 'Hello');
  expect(last()).toBe('## Hello\n');
  input(box(el, 'title'), 'insertParagraph');
  await until(() => document.activeElement === box(el, 'words'));
  await type(el, box(el, 'words'), 'One');
  expect(last()).toBe('## Hello\n\n- One\n');
  input(box(el, 'words'), 'insertParagraph');
  await tick();
  await type(el, box(el, 'words'), 'Two');
  await until(() => last() === '## Hello\n\n- One\n- Two\n');
  // Tab steps a bullet in; the bar's Indent is live for a bullet.
  box(el, 'words').dispatchEvent(new KeyboardEvent('keydown', { key: 'Tab', bubbles: true, cancelable: true }));
  await until(() => last() === '## Hello\n\n- One\n  - Two\n');
  // Speaker notes are a quote block at the slide's end.
  await caretIn(el, 'notes');
  await type(el, box(el, 'notes'), 'Say hi');
  await until(() => last() === '## Hello\n\n- One\n  - Two\n\n> Say hi\n');
  expect(thumbs(el)[0].getAttribute('aria-label')).toBe('Slide 1: Hello');
  expect(thumbs(el)[0].querySelector('svg')!.innerHTML).toContain('Hello');
  // A footnote from the bar: its mark in the words, its words at the slide's foot.
  el.text('words')!.sel = { anchor: { block: 0, offset: 3 }, focus: { block: 0, offset: 3 } };
  await tick();
  button(el, 'Footnote').click();
  await until(() => !!el.querySelector('.deck-words .fn'));
  const pop = el.querySelector<HTMLElement>('to-text.deck-words to-note-pop')!;
  await until(() => !!pop.querySelector('to-text .tx'));
  await type(el, pop.querySelector<HTMLElement>('to-text .tx')!, 'A note');
  await until(() => !!last()?.includes('- One^[A note]'));
  expect(el.querySelector('.deck-fn')!.textContent).toContain('A note');
});

test('Insert ▾ makes a slide of a layout after this one, with the caret in its headline; the Look menu is a head field; undo takes it back', async () => {
  const { el, last } = await editor(talk());
  expect(thumbs(el)).toHaveLength(6);
  expect(el.querySelector('.deck-end')).toBeTruthy();
  thumbs(el)[1].click();
  await el.updateComplete;
  expect(el.cur).toBe(1);
  // The headline box holds the words alone; the icon stays in front of whatever is typed.
  expect(box(el, 'title').textContent!.trim()).toBe('Tonight');
  await caretIn(el, 'title');
  await type(el, box(el, 'title'), '!');
  expect(last()).toContain('## :compass: Tonight!\n');
  await pick(el, el.querySelector<HTMLElement>('to-insert button')!, 'Two-column slide');
  expect(el.cur).toBe(2);
  expect(thumbs(el)).toHaveLength(7);
  expect(last()).toContain('\n\n---\n\n##  {.two}\n\n|\n\n---\n\n');
  await until(() => document.activeElement === box(el, 'title'));
  expect(el.querySelector('to-text.deck-right')).toBeTruthy();
  await type(el, box(el, 'title'), 'Both');
  expect(last()).toContain('## Both {.two}');
  await caretIn(el, 'right');
  await type(el, box(el, 'right'), 'Right');
  expect(last()).toContain('## Both {.two}\n\n|\n\n- Right\n');
  await pick(el, el.querySelector<HTMLElement>('to-menu.deck-look button')!, 'Ocean');
  expect(last()).toMatch(/^---\ntheme: ocean\n---\n/);
  expect(el.querySelector('.deck-canvas.themed')).toBeTruthy();
  // The layout menu changes the slide's class; moving a slide keeps the words.
  await pick(el, el.querySelector<HTMLElement>('to-menu.deck-layout button')!, 'Big icon');
  expect(last()).toContain('## Both {.icon}\n\n- Right\n');
  button(el, 'Move slide up').click();
  await el.updateComplete;
  expect(el.cur).toBe(1);
  expect(thumbs(el)[1].getAttribute('aria-label')).toBe('Slide 2: Both');
  button(el, 'Delete slide').click();
  await el.updateComplete;
  expect(thumbs(el)).toHaveLength(6);
  // Undo, through the shell's event, is the op log.
  expect(el.dispatchEvent(new CustomEvent('docundo', { cancelable: true, bubbles: true }))).toBe(false);
  await until(() => thumbs(el).length === 7);
});

test('a format changes the page, the rail and the bar; a page past what is written is born on its first letter; the sheets show', async () => {
  const { el, last } = await editor('## Small Joys\n\nIssue one\n');
  await pick(el, el.querySelector<HTMLElement>('to-menu.deck-format button')!, 'Zine');
  expect(last()).toBe('---\nformat: zine\n---\n## Small Joys\n\nIssue one\n');
  expect(thumbs(el)).toHaveLength(8);
  expect(thumbs(el)[0].getAttribute('aria-label')).toBe('Front cover: Small Joys');
  expect(thumbs(el)[2].getAttribute('aria-label')).toBe('Page 3');
  expect(el.querySelector('.deck-canvas')!.getAttribute('style')).toContain('--deck-w:264');
  expect(button(el, 'Present')).toBeNull();
  expect(button(el, 'See the sheets to print')).toBeTruthy();
  thumbs(el)[2].click();
  await el.updateComplete;
  await until(() => !!box(el, 'title'));
  await caretIn(el, 'title');
  await type(el, box(el, 'title'), 'Coffee');
  expect(last()).toBe('---\nformat: zine\n---\n## Small Joys\n\nIssue one\n\n---\n\n---\n\n## Coffee\n');
  // Prose on a page: the words are paragraphs.
  input(box(el, 'title'), 'insertParagraph');
  await until(() => document.activeElement === box(el, 'words'));
  await type(el, box(el, 'words'), 'The first cup.');
  expect(last()).toContain('## Coffee\n\nThe first cup.\n');
  button(el, 'See the sheets to print').click();
  await el.updateComplete;
  expect(el.querySelectorAll('.deck-sheet')).toHaveLength(1);
  expect(el.querySelector('.deck-sheets .to-hint')!.textContent).toContain('Fold it in half');
  await pick(el, el.querySelector<HTMLElement>('to-menu.deck-format button')!, 'Two-sided');
  expect(last()).toMatch(/^---\nformat: zine\nsides: 2\n---\n/);
  await until(() => el.querySelectorAll('.deck-sheet').length === 2);
  button(el, 'Back to the pages').click();
  await el.updateComplete;
  expect(el.querySelectorAll('.deck-sheet')).toHaveLength(0);
});

test('presenting shows the slide large, reveals a line a click, and Escape comes back to the Present button', async () => {
  const { el } = await editor(talk());
  button(el, 'Present').click();
  await el.updateComplete;
  const show = el.querySelector<HTMLElement>('.deck-show')!;
  expect(show).toBeTruthy();
  expect(show.querySelector('.pos')!.textContent).toBe('1 / 7');
  window.dispatchEvent(new KeyboardEvent('keydown', { key: 'ArrowRight', bubbles: true }));
  await el.updateComplete;
  expect(el.querySelector('.deck-show .pos')!.textContent).toBe('2 / 7');
  // The agenda has three lines: shown one at a time.
  expect(el.querySelector('.deck-show .frame svg')!.innerHTML).not.toContain('Why a six-page site');
  window.dispatchEvent(new KeyboardEvent('keydown', { key: 'ArrowRight', bubbles: true }));
  await el.updateComplete;
  expect(el.querySelector('.deck-show .frame svg')!.innerHTML).toContain('Why a six-page site');
  expect(el.querySelector('.deck-show .notes')!.textContent).toContain('Twenty minutes');
  window.dispatchEvent(new KeyboardEvent('keydown', { key: 'Escape', bubbles: true }));
  await el.updateComplete;
  expect(el.querySelector('.deck-show')).toBeNull();
  await until(() => document.activeElement === button(el, 'Present'));
});

test('at phone width the bar is one row, nothing is wider than the screen, and the rail runs under the slide', async () => {
  await page.viewport(390, 844);
  const { el } = await editor(talk());
  const bar = el.querySelector<HTMLElement>('to-bar')!;
  const tops = new Set([...bar.children].filter((c) => (c as HTMLElement).offsetWidth > 0).map((c) => Math.round(c.getBoundingClientRect().top)));
  expect(tops.size).toBe(1);
  expect(bar.offsetHeight).toBeLessThanOrEqual(56);
  expect(document.documentElement.scrollWidth - document.documentElement.clientWidth).toBeLessThanOrEqual(0);
  const canvas = el.querySelector<HTMLElement>('.deck-canvas')!;
  const rail = el.querySelector<HTMLElement>('.deck-rail')!;
  expect(rail.getBoundingClientRect().top).toBeGreaterThanOrEqual(canvas.getBoundingClientRect().bottom);
  // Every box is 16px or more.
  for (const tx of el.querySelectorAll<HTMLElement>('.tx')) expect(parseFloat(getComputedStyle(tx).fontSize)).toBeGreaterThanOrEqual(16);
  await page.viewport(1100, 800);
});
