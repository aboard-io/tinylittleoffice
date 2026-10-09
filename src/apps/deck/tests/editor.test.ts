// The Deck editor in a real Chromium: typing a headline and words is the document, Enter in the headline goes
// on to the words, Insert ▾ makes a slide of a layout, the rail follows, the Look menu is a head field, a
// footnote is listed at the slide's foot, a format changes the page and the rail, a page past what is
// written is born on its first letter, presenting shows a slide and Escape comes back, and at phone width
// the bar is one row and nothing is wider than the screen.
import { expect, test } from 'vitest';
import { page } from 'vitest/browser';
// The page's styles first, as the app has them: they name the layers' order (an app's own rules over the kit's).
import '../../../styles.css';
import '../editor.ts';
import type { ToDeckEditor } from '../editor.ts';
import { templates } from '../templates.ts';
import { tick, until } from '../../../../test/browser/helpers.ts';

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

/* ---------- the editing standard (docs/editing.md): slides chosen on the rail, the keys, undo ---------- */

const FOUR = '## A\n\n- a\n\n---\n\n## B\n\n---\n\n## C\n\n---\n\n## D\n';
const titles = (text: string | undefined) => (text ?? '').split('\n').filter((l) => l.startsWith('## ')).map((l) => l.slice(3));
const key = (on: EventTarget, k: string, o: KeyboardEventInit = {}) => {
  const e = new KeyboardEvent('keydown', { key: k, bubbles: true, cancelable: true, composed: true, ...o });
  on.dispatchEvent(e);
  return e;
};
const rail = (el: ToDeckEditor) => el.querySelector<HTMLElement>('.deck-rail')!;
const ranged = (el: ToDeckEditor) => [...el.querySelectorAll('.deck-slot')].flatMap((s, i) => (s.classList.contains('ranged') ? [i] : []));
const settle = async (el: ToDeckEditor) => {
  await el.updateComplete;
  await tick();
  await el.updateComplete;
};
async function clip(on: EventTarget, type: 'copy' | 'cut' | 'paste', data: Record<string, string> = {}) {
  const dt = new DataTransfer();
  for (const [k, v] of Object.entries(data)) dt.setData(k, v);
  on.dispatchEvent(new ClipboardEvent(type, { clipboardData: dt, bubbles: true, cancelable: true }));
  return dt;
}
const undo = (el: ToDeckEditor) => el.dispatchEvent(new CustomEvent('docundo', { cancelable: true }));
const contextLabels = () => [...document.querySelectorAll('to-context.deck-context .to-context > *')].map((b) => (b.getAttribute('role') === 'separator' ? '|' : b.getAttribute('aria-label')));

test('a tap on a thumbnail chooses the slide, with the contextual bar in the standard order; Enter and a double tap edit its words; the bar ends with Undo, Redo', async () => {
  const { el } = await editor(FOUR);
  thumbs(el)[1].click();
  await settle(el);
  expect(el.cur).toBe(1);
  expect(ranged(el)).toEqual([1]);
  expect(document.activeElement).toBe(rail(el));
  await until(() => !!document.querySelector('to-context.deck-context .to-context:popover-open'));
  expect(contextLabels()).toEqual(['Edit', 'Move up', 'Move down', 'Duplicate', '|', 'Copy', 'Cut', 'Paste', '|', 'Delete']);
  // Shift+tap extends.
  thumbs(el)[2].dispatchEvent(new MouseEvent('click', { bubbles: true, shiftKey: true }));
  await settle(el);
  expect(ranged(el)).toEqual([1, 2]);
  // Enter on the range: the caret into its words.
  key(rail(el), 'Enter');
  await until(() => document.activeElement === box(el, 'title'));
  expect(ranged(el)).toEqual([]);
  // Enter on a focused thumbnail edits its slide's words at once.
  thumbs(el)[3].focus();
  key(thumbs(el)[3], 'Enter');
  await until(() => document.activeElement === box(el, 'title') && el.cur === 3);
  // A double tap does too.
  thumbs(el)[0].dispatchEvent(new MouseEvent('dblclick', { bubbles: true }));
  await until(() => document.activeElement === box(el, 'title') && el.cur === 0);
  const tools = [...el.querySelectorAll('to-bar > button')].map((b) => b.getAttribute('aria-label'));
  expect(tools.slice(-2)).toEqual(['Undo', 'Redo']);
});

test('Escape in the words chooses the slide on the rail (never the body); Escape again puts the caret back; Mod+A twice takes every slide', async () => {
  const { el } = await editor(FOUR);
  thumbs(el)[2].click();
  await settle(el);
  key(rail(el), 'Escape');
  await until(() => document.activeElement === box(el, 'title'));
  key(box(el, 'title'), 'Escape');
  await settle(el);
  expect(ranged(el)).toEqual([2]);
  expect(document.activeElement).toBe(rail(el));
  // Select All with the headline whole: every slide.
  await caretIn(el, 'title');
  el.text('title')!.sel = { anchor: { block: 0, offset: 0 }, focus: { block: 0, offset: 1 } };
  await settle(el);
  key(box(el, 'title'), 'a', { ctrlKey: true });
  await settle(el);
  expect(ranged(el)).toEqual([0, 1, 2, 3]);
});

test('chosen slides: Delete takes them out, Alt+arrows move them, Mod+D duplicates them, Shift+arrows extend; undo shows the slide and chooses them again', async () => {
  const { el, last } = await editor(FOUR);
  // Delete on a focused thumbnail.
  thumbs(el)[1].focus();
  key(thumbs(el)[1], 'Delete');
  await settle(el);
  expect(titles(last())).toEqual(['A', 'C', 'D']);
  expect(document.activeElement).toBe(thumbs(el)[1]);
  el.cur = 0;
  undo(el);
  await settle(el);
  expect(titles(last())).toEqual(['A', 'B', 'C', 'D']);
  expect(el.cur).toBe(1);
  expect(ranged(el)).toEqual([1]);
  // Shift+Down extends, Alt+Down moves both past C… past D.
  key(rail(el), 'ArrowDown', { shiftKey: true });
  await settle(el);
  expect(ranged(el)).toEqual([1, 2]);
  key(rail(el), 'ArrowDown', { altKey: true });
  await settle(el);
  expect(titles(last())).toEqual(['A', 'D', 'B', 'C']);
  expect(ranged(el)).toEqual([2, 3]);
  key(rail(el), 'ArrowUp', { altKey: true });
  await settle(el);
  expect(titles(last())).toEqual(['A', 'B', 'C', 'D']);
  // Mod+D: the copies after them, chosen.
  key(rail(el), 'd', { ctrlKey: true });
  await settle(el);
  expect(titles(last())).toEqual(['A', 'B', 'C', 'B', 'C', 'D']);
  expect(ranged(el)).toEqual([3, 4]);
  expect(el.cur).toBe(4);
});

test('copy, cut and paste of chosen slides: TLO with the rules between, and our HTML; paste puts them after the range', async () => {
  const { el, last } = await editor(FOUR);
  thumbs(el)[0].click();
  await settle(el);
  key(rail(el), 'ArrowDown', { shiftKey: true });
  await settle(el);
  const dt = await clip(rail(el), 'copy');
  expect(dt.getData('text/plain')).toBe('## A\n\n- a\n\n---\n\n## B\n');
  expect(dt.getData('text/html')).toContain('content="TinyLittleOffice"');
  expect(dt.getData('text/html')).toContain('<hr>');
  thumbs(el)[3].click();
  await settle(el);
  await clip(rail(el), 'paste', { 'text/plain': dt.getData('text/plain'), 'text/html': dt.getData('text/html') });
  await settle(el);
  expect(titles(last())).toEqual(['A', 'B', 'C', 'D', 'A', 'B']);
  expect(last()).toContain('## D\n\n---\n\n## A\n\n- a\n\n---\n\n## B\n');
  thumbs(el)[2].click();
  await settle(el);
  const cut = await clip(rail(el), 'cut');
  await settle(el);
  expect(cut.getData('text/plain')).toBe('## C\n');
  expect(titles(last())).toEqual(['A', 'B', 'D', 'A', 'B']);
});

test('a slide dragged by its grip (pointer events) lands after the slide it is let go over, the target drawn; touch-action none on the grip alone', async () => {
  const { el, last } = await editor(FOUR);
  const grip = el.querySelectorAll<HTMLElement>('.deck-grip')[0];
  expect(getComputedStyle(grip).touchAction).toBe('none');
  expect(getComputedStyle(thumbs(el)[0]).touchAction).not.toBe('none');
  expect(grip.getAttribute('draggable')).toBeNull();
  const g = grip.getBoundingClientRect();
  const c = thumbs(el)[2].getBoundingClientRect();
  const at = (type: string, x: number, y: number) => grip.dispatchEvent(new PointerEvent(type, { bubbles: true, cancelable: true, pointerId: 5, isPrimary: true, button: 0, pointerType: 'mouse', clientX: x, clientY: y }));
  at('pointerdown', g.left + 3, g.top + 3);
  at('pointermove', c.left + c.width / 3, c.top + c.height / 2);
  await settle(el);
  expect(el.rows.drag).toMatchObject({ id: 0, over: 2, how: 'after' });
  expect(el.querySelectorAll('.deck-slot')[0].classList.contains('dragging')).toBe(true);
  expect(document.querySelector<HTMLElement>('.to-rows-target')!.hidden).toBe(false);
  at('pointerup', c.left + c.width / 3, c.top + c.height / 2);
  await settle(el);
  expect(titles(last())).toEqual(['B', 'C', 'A', 'D']);
  expect(el.cur).toBe(2);
  expect(document.querySelector('.to-rows-target')).toBeNull();
});

test('the keys from a box: Mod+Shift+Enter a new slide in every format, Mod+Alt+Enter presents, Mod+Enter in the headline goes on to the words, Mod+D and Alt+Up/Down act on the slide', async () => {
  const { el, last } = await editor(FOUR);
  thumbs(el)[1].click();
  await settle(el);
  await caretIn(el, 'title');
  // Alt+Up in the headline: the slide moves, the caret stays in its headline.
  key(box(el, 'title'), 'ArrowUp', { altKey: true });
  await settle(el);
  expect(titles(last())).toEqual(['B', 'A', 'C', 'D']);
  expect(el.cur).toBe(0);
  await until(() => document.activeElement === box(el, 'title'));
  expect(box(el, 'title').textContent!.trim()).toBe('B');
  // Mod+D from the words: the slide again after it, the caret in the copy.
  key(box(el, 'title'), 'd', { ctrlKey: true });
  await settle(el);
  expect(titles(last())).toEqual(['B', 'B', 'A', 'C', 'D']);
  expect(el.cur).toBe(1);
  // Mod+Enter in the headline: on to the words (a line's "done"), no slide made.
  await caretIn(el, 'title');
  key(box(el, 'title'), 'Enter', { ctrlKey: true });
  await until(() => document.activeElement === box(el, 'words'));
  expect(titles(last())).toHaveLength(5);
  // Mod+Shift+Enter: a new slide after this one, the caret in its headline.
  key(box(el, 'words'), 'Enter', { ctrlKey: true, shiftKey: true });
  await settle(el);
  expect(el.cur).toBe(2);
  expect(thumbs(el)).toHaveLength(6);
  await until(() => document.activeElement === box(el, 'title'));
  // Mod+Alt+Enter presents; the focus goes into the show, and letters never reach the box behind.
  key(box(el, 'title'), 'Enter', { ctrlKey: true, altKey: true });
  await settle(el);
  expect(el.querySelector('.deck-show')).toBeTruthy();
  await until(() => document.activeElement === el.querySelector('.deck-show'));
  const typed = new KeyboardEvent('keydown', { key: 'q', bubbles: true, cancelable: true });
  window.dispatchEvent(typed);
  expect(typed.defaultPrevented).toBe(true);
  window.dispatchEvent(new KeyboardEvent('keydown', { key: 'Escape', bubbles: true }));
  await settle(el);
  // In a printed format Mod+Shift+Enter is a new page too.
  const z = await editor('---\nformat: poster\n---\n## One\n');
  await caretIn(z.el, 'title');
  key(box(z.el, 'title'), 'Enter', { ctrlKey: true, shiftKey: true });
  await settle(z.el);
  expect(z.last()).toBe('---\nformat: poster\n---\n## One\n\n---\n');
  expect(z.el.querySelector('.deck-show')).toBeNull();
});

test('keys never act from a dialog or a field; PageUp/PageDown change slides from the rail only', async () => {
  const { el } = await editor(FOUR);
  await caretIn(el, 'title');
  key(box(el, 'title'), 'PageDown');
  await settle(el);
  expect(el.cur).toBe(0);
  thumbs(el)[0].focus();
  key(thumbs(el)[0], 'PageDown');
  await settle(el);
  expect(el.cur).toBe(1);
  await until(() => document.activeElement === thumbs(el)[1]);
  // The address box of Insert ▾'s Web Picture: Mod+Shift+Enter there makes no slide.
  await pick(el, el.querySelector<HTMLElement>('to-insert button')!, 'Web Picture');
  await until(() => !!document.querySelector('.to-ask-picture .to-ask-url'));
  const field = document.querySelector<HTMLInputElement>('.to-ask-picture .to-ask-url')!;
  key(field, 'Enter', { ctrlKey: true, shiftKey: true });
  key(field, 'd', { ctrlKey: true });
  await settle(el);
  expect(thumbs(el)).toHaveLength(4);
  document.querySelector<HTMLDialogElement>('.to-ask-picture dialog')!.close();
});

test('undo shows the slide the change was on and puts the caret back where it was', async () => {
  const { el, last } = await editor(FOUR);
  thumbs(el)[2].click();
  await settle(el);
  await caretIn(el, 'title');
  await type(el, box(el, 'title'), 'xy');
  expect(titles(last())).toEqual(['A', 'B', 'Cxy', 'D']);
  thumbs(el)[0].click();
  await settle(el);
  expect(el.cur).toBe(0);
  undo(el);
  await settle(el);
  expect(titles(last())).toEqual(['A', 'B', 'C', 'D']);
  expect(el.cur).toBe(2);
  await until(() => document.activeElement === box(el, 'title'));
  expect(el.text('title')!.sel).toEqual({ anchor: { block: 0, offset: 1 }, focus: { block: 0, offset: 1 } });
});

test('a box’s edges: Delete at the headline’s end goes on to the words; Backspace in the empty headline of an empty slide takes it away; Shift+Enter in the words is a line break', async () => {
  const { el, last } = await editor('## A\n\n- a\n\n---\n\n## B\n');
  thumbs(el)[1].click();
  await settle(el);
  await caretIn(el, 'title');
  input(box(el, 'title'), 'deleteContentForward');
  await until(() => document.activeElement === box(el, 'words'));
  // Shift+Enter in a bullet: a line break in it, not a new bullet.
  thumbs(el)[0].click();
  await settle(el);
  await caretIn(el, 'words');
  input(box(el, 'words'), 'insertLineBreak');
  await settle(el);
  await type(el, box(el, 'words'), 'b');
  expect(last()).toContain('- a\n  b\n\n---');
  expect(box(el, 'words').querySelectorAll('li')).toHaveLength(1);
  // A new, empty slide: Backspace in its headline takes it away, the caret at the end of the slide before.
  thumbs(el)[1].click();
  await settle(el);
  await caretIn(el, 'title');
  key(box(el, 'title'), 'Enter', { ctrlKey: true, shiftKey: true });
  await settle(el);
  expect(thumbs(el)).toHaveLength(3);
  await until(() => document.activeElement === box(el, 'title') && el.cur === 2);
  input(box(el, 'title'), 'deleteContentBackward');
  await settle(el);
  expect(thumbs(el)).toHaveLength(2);
  expect(el.cur).toBe(1);
});

test('a lone web address pasted into empty words is the thing from the web on the slide; Delete on it takes it off', async () => {
  const { el, last } = await editor('## Watch\n');
  await caretIn(el, 'words');
  await clip(box(el, 'words'), 'paste', { 'text/plain': 'https://example.com/a' });
  await settle(el);
  expect(last()).toBe('## Watch\n\nhttps://example.com/a\n');
  const fig = el.querySelector<HTMLElement>('figure.deck-sub')!;
  expect(fig).toBeTruthy();
  fig.focus();
  key(fig, 'Delete');
  await settle(el);
  expect(last()).toBe('## Watch\n');
  // Words already there: the address is words.
  await caretIn(el, 'words');
  await type(el, box(el, 'words'), 'Hi ');
  await clip(box(el, 'words'), 'paste', { 'text/plain': 'https://example.com/b' });
  await settle(el);
  expect(last()).toContain('- Hi https://example.com/b');
});

/* ---------- Insert ▾: the kit's dialogs, other documents on the slide, the speaker notes ---------- */

const docDialog = () => document.querySelector('to-doc-dialog');

test('Insert ▾ puts other local documents on the slide: a Kanban board is made in its own editor, and Done puts it on the slide', async () => {
  const { el, last } = await editor('## Plan\n');
  const opener = el.querySelector<HTMLElement>('to-insert button')!;
  opener.click();
  await until(() => !!document.querySelector('[popover]:popover-open [role^=menuitem]'));
  const labels = [...document.querySelectorAll<HTMLElement>('[popover]:popover-open [role^=menuitem]')].map((x) => x.textContent!.trim());
  expect(labels).toEqual(expect.arrayContaining(['Web Picture…', 'Table', 'Web Embed…', 'Tiny Little Office Doc…', 'Drawing Tool', 'Kanban Board']));
  expect(labels).not.toContain('Presentation Builder');
  opener.click();
  await tick();
  await pick(el, opener, 'Kanban Board');
  await until(() => !!docDialog()?.querySelector('dialog[open] to-board-editor'));
  docDialog()!.querySelector('to-board-editor')!.dispatchEvent(new CustomEvent('docchange', { detail: '## To do\n\n- Write it\n', bubbles: true }));
  docDialog()!.querySelector<HTMLButtonElement>('.to-doc-dialog-done')!.click();
  await until(() => (last() ?? '').includes('```board'));
  // The slide has its headline, so the board goes on a new slide after it.
  expect(last()).toBe('## Plan\n\n---\n\n```board\n## To do\n\n- Write it\n```\n');
  await until(() => !!el.querySelector('figure.deck-sub svg'));
});

test('the table on a slide: Insert ▾ Table opens the Spreadsheet at three by three; its menu\'s Edit opens it again; Cancel changes nothing', async () => {
  const { el, last } = await editor('');
  await pick(el, el.querySelector<HTMLElement>('to-insert button')!, 'Table');
  await until(() => !!docDialog()?.querySelector('dialog[open] to-sheet-editor'));
  const [rows] = [...document.querySelectorAll<HTMLInputElement>('.to-doc-dialog-size input')];
  rows.value = '2';
  rows.dispatchEvent(new Event('change', { bubbles: true }));
  await tick();
  docDialog()!.querySelector<HTMLButtonElement>('.to-doc-dialog-done')!.click();
  await until(() => (last() ?? '').includes('ColA | ColB | ColC'));
  expect(last()).toBe('ColA | ColB | ColC\n--- | --- | ---\n| |  |\n| |  |\n');
  const before = last();
  // The menu has Edit (no "Open in Spreadsheet"); Cancel leaves the slide alone.
  el.querySelector<HTMLElement>('figure.deck-sub')!.click();
  await until(() => !!document.querySelector('to-menu.deck-submenu [popover]:popover-open [role^=menuitem]'));
  const items = [...document.querySelectorAll<HTMLElement>('to-menu.deck-submenu [popover]:popover-open [role^=menuitem]')];
  expect(items.map((x) => x.textContent!.trim())).toEqual(['Edit', 'Remove from the slide']);
  items[0].click();
  await until(() => !!docDialog()?.querySelector('dialog[open] to-sheet-editor'));
  docDialog()!.querySelector<HTMLButtonElement>('.to-doc-dialog-cancel')!.click();
  await until(() => !docDialog());
  expect(last()).toBe(before);
});

test('a document on a slide: Edit then Open in a new tab; Done writes it back, one undo takes it back', async () => {
  const { el, last } = await editor('## Map\n\n```draw\nrect 10 10 100 60\n```\n');
  await until(() => !!el.querySelector('figure.deck-sub'));
  el.querySelector<HTMLElement>('figure.deck-sub')!.click();
  await until(() => !!document.querySelector('to-menu.deck-submenu [popover]:popover-open [role^=menuitem]'));
  const items = [...document.querySelectorAll<HTMLElement>('to-menu.deck-submenu [popover]:popover-open [role^=menuitem]')];
  expect(items.map((x) => x.textContent!.trim())).toEqual(['Edit', 'Open in a new tab', 'Remove from the slide']);
  items[0].click();
  await until(() => !!docDialog()?.querySelector('dialog[open] to-draw-editor'));
  docDialog()!.querySelector('to-draw-editor')!.dispatchEvent(new CustomEvent('docchange', { detail: 'rect 10 10 300 60\n', bubbles: true }));
  docDialog()!.querySelector<HTMLButtonElement>('.to-doc-dialog-done')!.click();
  await until(() => last() === '## Map\n\n```draw\nrect 10 10 300 60\n```\n');
  el.dispatchEvent(new CustomEvent('docundo', { cancelable: true, bubbles: true }));
  await until(() => last() === '## Map\n\n```draw\nrect 10 10 100 60\n```\n');
});

test('the speaker notes have room round them, as the words do: 12px, the hint inside it, while editing and while presenting', async () => {
  const { el } = await editor('## Hello\n\n> Say hi\n');
  const notes = box(el, 'notes');
  const cs = getComputedStyle(notes);
  expect([cs.paddingTop, cs.paddingRight, cs.paddingBottom, cs.paddingLeft]).toEqual(['12px', '12px', '12px', '12px']);
  const empty = await editor('## Hello\n');
  await until(() => !!box(empty.el, 'notes')?.classList.contains('blank'));
  const hint = getComputedStyle(box(empty.el, 'notes'), '::before');
  expect([hint.top, hint.left]).toEqual(['12px', '12px']);
  const { el: shown } = await editor('## Hello\n\n> Say hi\n');
  button(shown, 'Present').click();
  await until(() => !!shown.querySelector('.deck-show .notes'));
  expect(getComputedStyle(shown.querySelector('.deck-show .notes')!).padding).toBe('12px');
  key(window, 'Escape');
});

test('a footnote\'s box is one line of 16px words, wherever its mark is (even in the headline)', async () => {
  const { el } = await editor('## Big words\n');
  await caretIn(el, 'title');
  button(el, 'Footnote').click();
  await until(() => !!el.querySelector('to-note-pop to-text .tx'));
  const words = el.querySelector<HTMLElement>('to-note-pop to-text .tx')!;
  expect(getComputedStyle(words).fontSize).toBe('16px');
  expect(getComputedStyle(words).fontWeight).toBe('400');
  expect(words.getBoundingClientRect().height).toBeLessThan(60);
});
