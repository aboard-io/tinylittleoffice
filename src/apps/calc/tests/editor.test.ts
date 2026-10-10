// The Calculator editor in a real browser: the tape from the document; typing and the keys put a line in, worked
// out live; a line changed or taken away where it stands; an answer put back in the line; Up and Down recall;
// Insert ▾; the engine's units; the graph mode; a loose document made a tape as it arrives; undo; at phone
// width the keys a finger tall, the bar one row, the page never wider and never scrolled by typing; and the
// editing standard (docs/editing.md): the tape's lines as rows, their keys, clipboard and drag, the focus an
// undo puts back, and the line being typed keeping its own undo, its recall and its IME.
import { expect, test } from 'vitest';
import { page } from 'vitest/browser';
import '../../../styles.css';
import '../editor.ts';
import type { ToCalcEditor } from '../editor.ts';
import { hasEngine } from '../model.ts';
import { tick, until } from '../../../../test/browser/helpers.ts';

async function editor(value = ''): Promise<{ el: ToCalcEditor; changes: string[]; last: () => string | undefined }> {
  document.body.innerHTML = '';
  const main = document.createElement('main');
  main.className = 'to-main';
  document.body.append(main);
  const el = document.createElement('to-calc-editor') as ToCalcEditor;
  el.value = value;
  const changes: string[] = [];
  el.addEventListener('docchange', (e) => changes.push((e as CustomEvent<string>).detail));
  main.append(el);
  await el.updateComplete;
  return { el, changes, last: () => changes.at(-1) };
}
const settle = async (el: ToCalcEditor) => {
  await el.updateComplete;
  await tick(10);
  await el.updateComplete;
};
const display = (el: HTMLElement) => el.querySelector<HTMLInputElement>('.calc-display')!;
const lines = (el: HTMLElement) => [...el.querySelectorAll<HTMLInputElement>('.calc-line')].map((x) => x.value);
const answers = (el: HTMLElement) => [...el.querySelectorAll<HTMLElement>('.calc-ans')].map((x) => x.textContent!.trim());
const liveText = (el: HTMLElement) => el.querySelector('.calc-live')!.textContent!.trim();
const key = (el: HTMLElement, label: string) => el.querySelector<HTMLButtonElement>(`.calc-key[aria-label="${label}"]`)!;
const bar = (el: HTMLElement, label: string) => el.querySelector<HTMLButtonElement>(`to-bar button[aria-label="${label}"]`)!;
async function typeIn(el: ToCalcEditor, input: HTMLInputElement, s: string) {
  input.focus();
  input.value = s;
  input.dispatchEvent(new InputEvent('input', { bubbles: true, data: s, inputType: 'insertText' }));
  await settle(el);
}
async function press(el: ToCalcEditor, input: HTMLInputElement, k: string) {
  input.dispatchEvent(new KeyboardEvent('keydown', { key: k, bubbles: true, cancelable: true }));
  await settle(el);
}
async function pick(el: ToCalcEditor, opener: HTMLElement, label: string) {
  opener.click();
  await until(() => !!document.querySelector('[popover]:popover-open'));
  const items = [...document.querySelectorAll<HTMLElement>('[popover]:popover-open [role^=menuitem]')];
  const item = items.find((x) => x.textContent!.includes(label));
  if (!item) throw new Error(`no item ${label} among ${items.map((x) => x.textContent!.trim()).join(' | ')}`);
  item.click();
  await settle(el);
}

test('the tape from the document: each line a box, its answer beside it; an empty one says what to do', async () => {
  const { el } = await editor('a = 6\na * 7\nnope\n');
  expect(lines(el)).toEqual(['a = 6', 'a * 7', 'nope']);
  expect(answers(el)).toEqual(['= 6', '= 42', '= ?']);
  expect(el.querySelectorAll('.calc-ans')[2].hasAttribute('disabled')).toBe(true);
  expect(bar(el, 'Calculator').getAttribute('aria-pressed')).toBe('true');
  expect(bar(el, 'Graph').getAttribute('aria-pressed')).toBe('false');
  expect(el.querySelector('.calc-graph')).toBeNull();
  const empty = await editor('');
  expect(empty.el.querySelector('.calc-empty')!.textContent).toContain('press Enter');
  expect(bar(empty.el, 'Clear the tape').disabled).toBe(true);
});

test('typing: the answer as it is typed, Enter puts the line on the tape; a name is kept for the lines after', async () => {
  const { el, last, changes } = await editor('');
  await typeIn(el, display(el), 'price = 2.5 * 4');
  expect(liveText(el)).toBe('= 10');
  expect(changes).toEqual([]);
  await press(el, display(el), 'Enter');
  expect(last()).toBe('price = 2.5 * 4\n');
  expect(display(el).value).toBe('');
  await typeIn(el, display(el), 'price * 3');
  expect(liveText(el)).toBe('= 30');
  await press(el, display(el), 'Enter');
  expect(last()).toBe('price = 2.5 * 4\nprice * 3\n');
  expect(answers(el)).toEqual(['= 10', '= 30']);
  // Up walks the tape back into the line, Down forward again; Escape clears it.
  await press(el, display(el), 'ArrowUp');
  expect(display(el).value).toBe('price * 3');
  await press(el, display(el), 'ArrowUp');
  expect(display(el).value).toBe('price = 2.5 * 4');
  await press(el, display(el), 'ArrowDown');
  expect(display(el).value).toBe('price * 3');
  await press(el, display(el), 'Escape');
  expect(display(el).value).toBe('');
});

test('the keys type where the caret is and never take the focus; ⌫, C and = do what they say', async () => {
  const { el, last } = await editor('');
  for (const k of ['1', '2', '+', '3']) key(el, k).click();
  await settle(el);
  expect(display(el).value).toBe('12+3');
  expect(liveText(el)).toBe('= 15');
  // The caret between 1 and 2: a key goes there.
  display(el).setSelectionRange(1, 1);
  key(el, '0').click();
  await settle(el);
  expect(display(el).value).toBe('102+3');
  key(el, 'Backspace').click();
  await settle(el);
  expect(display(el).value).toBe('12+3');
  key(el, 'Square root').click();
  await settle(el);
  expect(display(el).value).toBe('1sqrt(2+3');
  key(el, 'Clear the line').click();
  await settle(el);
  expect(display(el).value).toBe('');
  for (const k of ['6', '×', '7']) key(el, k).click();
  await settle(el);
  expect(liveText(el)).toBe('= 42');
  // A key is a mousedown that is cancelled: it leaves the focus where it was.
  const down = new MouseEvent('mousedown', { bubbles: true, cancelable: true });
  key(el, '=').dispatchEvent(down);
  expect(down.defaultPrevented).toBe(true);
  key(el, '=').click();
  await settle(el);
  expect(last()).toBe('6×7\n');
  expect(answers(el)).toEqual(['= 42']);
  // ans: the answer before.
  for (const k of ['The answer before', '+', '1', '=']) key(el, k).click();
  await settle(el);
  expect(last()).toBe('6×7\nans+1\n');
  expect(answers(el)).toEqual(['= 42', '= 43']);
});

test('a line of the tape changed where it stands (the lines after follow), emptied or taken away; an answer goes back into the line', async () => {
  const { el, last } = await editor('a = 1\na + 1\na * 10\n');
  const second = el.querySelectorAll<HTMLInputElement>('.calc-line')[0];
  second.value = 'a = 5';
  second.dispatchEvent(new Event('change', { bubbles: true }));
  await settle(el);
  expect(last()).toBe('a = 5\na + 1\na * 10\n');
  expect(answers(el)).toEqual(['= 5', '= 6', '= 50']);
  el.querySelector<HTMLButtonElement>('button[aria-label="Take away line 2"]')!.click();
  await settle(el);
  expect(last()).toBe('a = 5\na * 10\n');
  const now = el.querySelectorAll<HTMLInputElement>('.calc-line')[1];
  now.value = '';
  now.dispatchEvent(new Event('change', { bubbles: true }));
  await settle(el);
  expect(last()).toBe('a = 5\n');
  el.querySelector<HTMLButtonElement>('.calc-ans')!.click();
  await settle(el);
  expect(display(el).value).toBe('5');
  // Undo brings each step back; Clear the tape takes it all.
  bar(el, 'Undo').click();
  await settle(el);
  expect(lines(el)).toEqual(['a = 5', 'a * 10']);
  bar(el, 'Clear the tape').click();
  await settle(el);
  expect(last()).toBe('');
  expect(lines(el)).toEqual([]);
});

test('Insert ▾ puts a function into the line at the caret; the engine reads units and algebra', async () => {
  const { el, last } = await editor('');
  await until(() => hasEngine());
  await pick(el, el.querySelector<HTMLButtonElement>('to-insert button')!, 'Sine');
  expect(display(el).value).toBe('sin(');
  await typeIn(el, display(el), '3 inch');
  await pick(el, el.querySelector<HTMLButtonElement>('to-insert button')!, 'Convert to');
  expect(display(el).value).toBe('3 inch to ');
  await typeIn(el, display(el), '3 inch to cm');
  expect(liveText(el)).toBe('= 7.62 cm');
  await press(el, display(el), 'Enter');
  expect(last()).toBe('3 inch to cm\n');
  expect(answers(el)).toEqual(['= 7.62 cm']);
});

test('the graph: a mode in the head, the curves drawn above the tape, x on the key ans had', async () => {
  const { el, last } = await editor('2+2\n');
  bar(el, 'Graph').click();
  await settle(el);
  expect(last()).toBe('---\nmode: graph\n---\n');
  expect(bar(el, 'Graph').getAttribute('aria-pressed')).toBe('true');
  expect(el.querySelector('.calc-graph svg')).not.toBeNull();
  expect(key(el, 'x').textContent).toBe('x');
  for (const k of ['x', '^', '2']) key(el, k).click();
  await settle(el);
  expect(liveText(el)).toBe('at x = 1: 1');
  key(el, '=').click();
  await settle(el);
  expect(last()).toBe('---\nmode: graph\n---\nx^2\n');
  expect(el.querySelector('.calc-graph')!.innerHTML).toContain('y = x^2');
  expect(el.querySelectorAll('.calc-swatch')).toHaveLength(1);
  // The same curve is not drawn twice.
  await typeIn(el, display(el), 'x^2');
  await press(el, display(el), 'Enter');
  expect(last()).toBe('---\nmode: graph\n---\nx^2\n');
  // Back to the calculator; one undo brings the graph back.
  bar(el, 'Calculator').click();
  await settle(el);
  expect(last()).toBe('');
  bar(el, 'Undo').click();
  await settle(el);
  expect(last()).toBe('---\nmode: graph\n---\nx^2\n');
});

test('a loosely written calculator arriving is made a tape, in one edit that undoes', async () => {
  const { el, changes } = await editor('# Sums\n\n- 2+2 = 4\n- a = 12\n');
  expect(changes).toEqual(['---\ntitle: Sums\n---\n2+2\na = 12\n']);
  expect(lines(el)).toEqual(['2+2', 'a = 12']);
  // Undone, it stays loose; a command then makes it a tape first.
  el.dispatchEvent(new CustomEvent('docundo', { cancelable: true }));
  await settle(el);
  expect(changes.at(-1)).toBe('# Sums\n\n- 2+2 = 4\n- a = 12\n');
  await typeIn(el, display(el), 'a / 4');
  await press(el, display(el), 'Enter');
  expect(changes.at(-1)).toBe('---\ntitle: Sums\n---\n2+2\na = 12\na / 4\n');
});

test('at phone width: keys and rows a finger tall, boxes 16px, the bar one row, nothing wider than the screen, and typing does not scroll the page', async () => {
  await page.viewport(390, 844);
  try {
    const { el } = await editor('food = 164.50\ndrinks = 58\ntip = (food + drinks) * 18%\n');
    for (const k of el.querySelectorAll<HTMLElement>('.calc-key')) {
      const box = k.getBoundingClientRect();
      expect(box.height).toBeGreaterThanOrEqual(44);
      expect(box.width).toBeGreaterThanOrEqual(44);
    }
    for (const r of el.querySelectorAll<HTMLElement>('.calc-row')) expect(r.getBoundingClientRect().height).toBeGreaterThanOrEqual(44);
    const barEl = el.querySelector<HTMLElement>('to-bar')!;
    const tops = new Set([...barEl.children].filter((x) => (x as HTMLElement).offsetWidth > 0).map((x) => Math.round(x.getBoundingClientRect().top)));
    expect(tops.size).toBe(1);
    expect(barEl.offsetHeight).toBeLessThanOrEqual(56);
    expect(document.documentElement.scrollWidth).toBeLessThanOrEqual(390);
    // The keys are below the tape, the line just above them.
    expect(display(el).getBoundingClientRect().top).toBeGreaterThan(el.querySelector('.calc-tape')!.getBoundingClientRect().bottom);
    expect(el.querySelector('.calc-keys')!.getBoundingClientRect().top).toBeGreaterThan(display(el).getBoundingClientRect().bottom);
    for (const box of [display(el), ...el.querySelectorAll<HTMLInputElement>('.calc-line')]) expect(parseFloat(getComputedStyle(box).fontSize)).toBeGreaterThanOrEqual(16);
    await typeIn(el, display(el), 'tip / 6');
    key(el, '=').click();
    await settle(el);
    expect(document.scrollingElement!.scrollTop).toBe(0);
    expect(document.documentElement.scrollWidth).toBeLessThanOrEqual(390);
    // The graph fits the screen too.
    bar(el, 'Graph').click();
    await settle(el);
    expect(el.querySelector('.calc-graph svg')!.getBoundingClientRect().width).toBeLessThanOrEqual(390);
    expect(document.documentElement.scrollWidth).toBeLessThanOrEqual(390);
  } finally {
    await page.viewport(1100, 800);
  }
});

/* ---------- the editing standard (docs/editing.md) ---------- */

const keyOn = (on: Element, k: string, o: KeyboardEventInit = {}) => {
  const e = new KeyboardEvent('keydown', { key: k, bubbles: true, cancelable: true, composed: true, ...o });
  on.dispatchEvent(e);
  return e;
};
const lineBox = (el: HTMLElement, i: number) => el.querySelectorAll<HTMLInputElement>('.calc-line')[i];
const tapeBox = (el: HTMLElement) => el.querySelector<HTMLElement>('.calc-tape')!;
const chosen = (el: HTMLElement) => [...el.querySelectorAll<HTMLElement>('.calc-row')].map((r, i) => (r.classList.contains('ranged') ? i : -1)).filter((i) => i >= 0);
const contextLabels = () => [...document.querySelectorAll<HTMLElement>('to-context.to-rows-context button')].map((b) => b.getAttribute('aria-label'));
const contextButton = (label: string) => [...document.querySelectorAll<HTMLButtonElement>('to-context.to-rows-context button')].find((b) => b.getAttribute('aria-label') === label)!;
const clip = (type: string, on: Element, dt = new DataTransfer()) => {
  const e = new ClipboardEvent(type, { clipboardData: dt, bubbles: true, cancelable: true });
  on.dispatchEvent(e);
  return { dt, e };
};
const pointer = (type: string, x: number, y: number, buttons = 1) => new PointerEvent(type, { clientX: x, clientY: y, button: 0, buttons, pointerId: 7, isPrimary: true, bubbles: true, pointerType: 'mouse' });
const mid = (e: Element) => {
  const r = e.getBoundingClientRect();
  return { x: r.left + r.width / 2, y: r.top + r.height / 2 };
};
async function tapGrip(el: ToCalcEditor, i: number) {
  const g = el.querySelectorAll<HTMLElement>('.calc-grip')[i];
  const { x, y } = mid(g);
  g.dispatchEvent(pointer('pointerdown', x, y));
  g.dispatchEvent(pointer('pointerup', x, y, 0));
  g.dispatchEvent(new MouseEvent('click', { bubbles: true, cancelable: true }));
  await settle(el);
}
/** Whether a keydown reaches the window, where the shell turns Mod+Z into the document's undo. */
function reachesWindow(on: Element, o: KeyboardEventInit): boolean {
  let heard = false;
  const hear = () => (heard = true);
  window.addEventListener('keydown', hear);
  keyOn(on, 'z', o);
  window.removeEventListener('keydown', hear);
  return heard;
}

test('Mod+Z in a box holding words not yet on the tape is the box’s own; with nothing typed it goes on to the document', async () => {
  const { el } = await editor('1+1\n2+2\n');
  // The line being typed, empty: the key reaches the shell; with words, it stops at the box.
  display(el).focus();
  expect(reachesWindow(display(el), { ctrlKey: true })).toBe(true);
  await typeIn(el, display(el), '3+');
  expect(reachesWindow(display(el), { ctrlKey: true })).toBe(false);
  expect(reachesWindow(display(el), { ctrlKey: true, shiftKey: true })).toBe(false);
  // A tape line changed and not yet put down: the same; as the tape has it, the document's undo.
  const box = lineBox(el, 0);
  box.focus();
  expect(reachesWindow(box, { metaKey: true })).toBe(true);
  box.value = '1+5';
  expect(reachesWindow(box, { metaKey: true })).toBe(false);
});

test('undo puts the focus back where it was: a line taken away comes back focused; a line put on the tape gives the caret back to the line being typed', async () => {
  const { el, last } = await editor('a = 1\na + 1\na * 10\n');
  const x = el.querySelector<HTMLButtonElement>('button[aria-label="Take away line 2"]')!;
  x.focus();
  x.click();
  await settle(el);
  expect(lines(el)).toEqual(['a = 1', 'a * 10']);
  el.dispatchEvent(new CustomEvent('docundo', { cancelable: true }));
  await settle(el);
  expect(lines(el)).toEqual(['a = 1', 'a + 1', 'a * 10']);
  expect(document.activeElement).toBe(lineBox(el, 1));
  // A line changed in its box: the undo puts the caret back in that box.
  const box = lineBox(el, 2);
  box.focus();
  box.value = 'a * 20';
  box.setSelectionRange(3, 3);
  keyOn(box, 'Enter');
  await settle(el);
  expect(last()).toBe('a = 1\na + 1\na * 20\n');
  expect(document.activeElement).toBe(display(el));
  el.dispatchEvent(new CustomEvent('docundo', { cancelable: true }));
  await settle(el);
  expect(lines(el)).toEqual(['a = 1', 'a + 1', 'a * 10']);
  expect(document.activeElement).toBe(lineBox(el, 2));
  // From the line being typed: back to it.
  await typeIn(el, display(el), '7*6');
  await press(el, display(el), 'Enter');
  lineBox(el, 0).focus();
  el.dispatchEvent(new CustomEvent('docundo', { cancelable: true }));
  await settle(el);
  expect(lines(el)).toHaveLength(3);
  expect(document.activeElement).toBe(display(el));
});

test('Shift, Alt and Mod with Up in the line being typed never recall the tape over what was typed; Escape clears only with no modifier', async () => {
  const { el } = await editor('1+1\n2+2\n');
  await typeIn(el, display(el), '9*9');
  for (const o of [{ shiftKey: true }, { altKey: true }, { metaKey: true }, { ctrlKey: true }]) {
    const e = keyOn(display(el), 'ArrowUp', o);
    await settle(el);
    expect(e.defaultPrevented).toBe(false);
    expect(display(el).value).toBe('9*9');
  }
  await press(el, display(el), 'ArrowUp');
  expect(display(el).value).toBe('2+2');
});

test('the Enter that ends an IME composition commits nothing, in the line being typed or in a tape line', async () => {
  const { el, changes } = await editor('1+1\n');
  await typeIn(el, display(el), '2+2');
  const e = keyOn(display(el), 'Enter', { isComposing: true });
  await settle(el);
  expect(e.defaultPrevented).toBe(false);
  expect(changes).toEqual([]);
  expect(display(el).value).toBe('2+2');
  const box = lineBox(el, 0);
  box.focus();
  keyOn(box, 'Enter', { isComposing: true });
  await settle(el);
  expect(document.activeElement).toBe(box);
});

test('a tape line: Escape puts back what it said, then chooses it; Enter is done (the caret to the line being typed); Up and Down go between lines', async () => {
  const { el, last, changes } = await editor('1+1\n2+2\n3+3\n');
  const box = lineBox(el, 1);
  box.focus();
  box.value = '2+20';
  keyOn(box, 'Escape');
  await settle(el);
  expect(box.value).toBe('2+2');
  expect(document.activeElement).toBe(box);
  keyOn(box, 'Escape');
  await settle(el);
  expect(chosen(el)).toEqual([1]);
  expect(document.activeElement).toBe(tapeBox(el));
  // Escape on the chosen line: back into its words.
  keyOn(tapeBox(el), 'Escape');
  await settle(el);
  expect(chosen(el)).toEqual([]);
  expect(document.activeElement).toBe(lineBox(el, 1));
  expect(changes).toEqual([]);
  // Up and Down move between the lines, the caret where it was; Down from the last goes to the line being typed.
  lineBox(el, 1).setSelectionRange(1, 1);
  keyOn(lineBox(el, 1), 'ArrowDown');
  await settle(el);
  expect(document.activeElement).toBe(lineBox(el, 2));
  expect(lineBox(el, 2).selectionStart).toBe(1);
  keyOn(lineBox(el, 2), 'ArrowDown');
  await settle(el);
  expect(document.activeElement).toBe(display(el));
  lineBox(el, 2).focus();
  keyOn(lineBox(el, 2), 'ArrowUp');
  await settle(el);
  expect(document.activeElement).toBe(lineBox(el, 1));
  // Enter: the change goes on the tape, the caret to the line being typed.
  lineBox(el, 1).value = '2*2';
  keyOn(lineBox(el, 1), 'Enter');
  await settle(el);
  expect(last()).toBe('1+1\n2*2\n3+3\n');
  expect(document.activeElement).toBe(display(el));
});

test('a tape line: Alt+Up/Down move it past its neighbour with the caret in it; Mod+D copies it under itself; Backspace on an empty line takes it away', async () => {
  const { el, last } = await editor('a = 2\nb = a * 3\nb + 1\n');
  const box = lineBox(el, 2);
  box.focus();
  box.setSelectionRange(2, 2);
  keyOn(box, 'ArrowUp', { altKey: true });
  await settle(el);
  expect(last()).toBe('a = 2\nb + 1\nb = a * 3\n');
  expect(document.activeElement).toBe(lineBox(el, 1));
  expect(lineBox(el, 1).selectionStart).toBe(2);
  // What was typed in it goes with it, in the same step.
  lineBox(el, 1).value = 'b + 2';
  keyOn(lineBox(el, 1), 'ArrowDown', { altKey: true });
  await settle(el);
  expect(last()).toBe('a = 2\nb = a * 3\nb + 2\n');
  expect(document.activeElement).toBe(lineBox(el, 2));
  el.dispatchEvent(new CustomEvent('docundo', { cancelable: true }));
  await settle(el);
  expect(lines(el)).toEqual(['a = 2', 'b + 1', 'b = a * 3']);
  // Mod+D: a copy under it, the caret in the copy.
  keyOn(lineBox(el, 0), 'd', { ctrlKey: true });
  await settle(el);
  expect(last()).toBe('a = 2\na = 2\nb + 1\nb = a * 3\n');
  expect(document.activeElement).toBe(lineBox(el, 1));
  // Backspace with nothing left in it: the line goes, the caret to the end of the one before.
  lineBox(el, 1).value = '';
  const e = keyOn(lineBox(el, 1), 'Backspace');
  await settle(el);
  expect(e.defaultPrevented).toBe(true);
  expect(last()).toBe('a = 2\nb + 1\nb = a * 3\n');
  expect(document.activeElement).toBe(lineBox(el, 0));
  expect(lineBox(el, 0).selectionStart).toBe(5);
});

test('lines chosen whole: a tap on the grip, the bar in the standard order, Shift+arrows, Alt+arrows, Mod+D, Delete; Mod+A twice takes the tape; undo brings the range back', async () => {
  const { el, last } = await editor('1+1\n2+2\n3+3\n4+4\n');
  await tapGrip(el, 1);
  expect(chosen(el)).toEqual([1]);
  expect(document.activeElement).toBe(tapeBox(el));
  expect(el.querySelectorAll('.calc-row')[1].querySelector('.calc-grip')!.getAttribute('aria-pressed')).toBe('true');
  expect(contextLabels()).toEqual(['Edit', 'Move up', 'Move down', 'Duplicate', 'Copy', 'Cut', 'Paste', 'Delete']);
  keyOn(tapeBox(el), 'ArrowDown', { shiftKey: true });
  await settle(el);
  expect(chosen(el)).toEqual([1, 2]);
  keyOn(tapeBox(el), 'ArrowUp', { altKey: true });
  await settle(el);
  expect(last()).toBe('2+2\n3+3\n1+1\n4+4\n');
  expect(chosen(el)).toEqual([0, 1]);
  // The bar's Move down, as a finger has it.
  contextButton('Move down').click();
  await settle(el);
  expect(last()).toBe('1+1\n2+2\n3+3\n4+4\n');
  expect(chosen(el)).toEqual([1, 2]);
  keyOn(tapeBox(el), 'd', { ctrlKey: true });
  await settle(el);
  expect(last()).toBe('1+1\n2+2\n3+3\n2+2\n3+3\n4+4\n');
  expect(chosen(el)).toEqual([3, 4]);
  keyOn(tapeBox(el), 'Delete');
  await settle(el);
  expect(last()).toBe('1+1\n2+2\n3+3\n4+4\n');
  expect(chosen(el)).toEqual([]);
  // Undo: the lines and the range they were.
  el.dispatchEvent(new CustomEvent('docundo', { cancelable: true }));
  await settle(el);
  expect(lines(el)).toHaveLength(6);
  expect(chosen(el)).toEqual([3, 4]);
  // Typing with lines chosen does nothing to them.
  keyOn(tapeBox(el), '7');
  await settle(el);
  expect(lines(el)).toHaveLength(6);
  // Mod+A in a box: its words first; with them whole, the whole tape.
  keyOn(tapeBox(el), 'Escape');
  await settle(el);
  const box = lineBox(el, 0);
  box.focus();
  box.setSelectionRange(1, 1);
  expect(keyOn(box, 'a', { ctrlKey: true }).defaultPrevented).toBe(false);
  box.select();
  keyOn(box, 'a', { ctrlKey: true });
  await settle(el);
  expect(chosen(el)).toEqual([0, 1, 2, 3, 4, 5]);
});

test('copy, cut and paste: chosen lines go out as TLO and our HTML and come back in place; several lines pasted into a box make several lines in one step', async () => {
  const { el, last } = await editor('a = 2*3\nb = a + 1\nb^2\n');
  await tapGrip(el, 0);
  const { dt } = clip('copy', tapeBox(el));
  expect(dt.getData('text/plain')).toBe('a = 2*3\n');
  expect(dt.getData('text/html')).toContain('content="TinyLittleOffice"');
  await tapGrip(el, 2);
  const cut = clip('cut', tapeBox(el)).dt;
  await settle(el);
  expect(cut.getData('text/plain')).toBe('b^2\n');
  expect(last()).toBe('a = 2*3\nb = a + 1\n');
  // Pasted over a chosen line: in its place.
  await tapGrip(el, 1);
  clip('paste', tapeBox(el), cut);
  await settle(el);
  expect(last()).toBe('a = 2*3\nb^2\n');
  // Our own copy into the line being typed: the words as they are, not their escapes.
  display(el).focus();
  const own = clip('paste', display(el), dt);
  await settle(el);
  expect(own.e.defaultPrevented).toBe(true);
  expect(display(el).value).toBe('a = 2*3');
  await press(el, display(el), 'Escape');
  // A column of sums: a line each on the tape, one undo takes them all.
  const column = new DataTransfer();
  column.setData('text/plain', '10 + 5\n20 * 2\n\n7 - 1 = 6\n');
  clip('paste', display(el), column);
  await settle(el);
  expect(last()).toBe('a = 2*3\nb^2\n10 + 5\n20 * 2\n7 - 1\n');
  expect(answers(el).slice(2)).toEqual(['= 15', '= 40', '= 6']);
  el.dispatchEvent(new CustomEvent('docundo', { cancelable: true }));
  await settle(el);
  expect(lines(el)).toEqual(['a = 2*3', 'b^2']);
  // Into a tape line, around the caret: the first joins the words before it, the rest come after.
  const box = lineBox(el, 1);
  box.focus();
  box.setSelectionRange(3, 3);
  const two = new DataTransfer();
  two.setData('text/plain', '+1\n5*5');
  clip('paste', box, two);
  await settle(el);
  expect(last()).toBe('a = 2*3\nb^2+1\n5*5\n');
  expect(document.activeElement).toBe(lineBox(el, 2));
  // Words alone are the box's own.
  const one = new DataTransfer();
  one.setData('text/plain', '42');
  expect(clip('paste', display(el), one).e.defaultPrevented).toBe(false);
});

test('a line carried by its grip with a pointer lands after the line it is dropped on', async () => {
  const { el, last } = await editor('1\n2\n3\n');
  const g = el.querySelectorAll<HTMLElement>('.calc-grip')[0];
  const from = mid(g);
  const to = mid(el.querySelectorAll('.calc-row')[2]);
  g.dispatchEvent(pointer('pointerdown', from.x, from.y));
  g.dispatchEvent(pointer('pointermove', from.x, from.y + 10));
  await settle(el);
  expect(el.querySelectorAll('.calc-row')[0].classList.contains('dragging')).toBe(true);
  g.dispatchEvent(pointer('pointermove', to.x, to.y));
  g.dispatchEvent(pointer('pointerup', to.x, to.y, 0));
  await settle(el);
  expect(last()).toBe('2\n3\n1\n');
});

test('the bar ends with Undo and Redo; the grip is the only thing a drag holds, and the editing surface never zooms on a double tap', async () => {
  const { el } = await editor('1+1\n');
  const tools = [...el.querySelectorAll<HTMLButtonElement>('to-bar button')].map((b) => b.getAttribute('aria-label'));
  expect(tools.slice(-2)).toEqual(['Undo', 'Redo']);
  expect(getComputedStyle(el.querySelector('.calc')!).touchAction).toBe('manipulation');
  const g = el.querySelector<HTMLElement>('.calc-grip')!;
  expect(g.classList.contains('to-rows-handle')).toBe(true);
  expect(getComputedStyle(g).touchAction).toBe('none');
});
