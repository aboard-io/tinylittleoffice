// The Calculator editor in a real browser: the tape from the document; typing and the keys put a line in, worked
// out live; a line changed or taken away where it stands; an answer put back in the line; Up and Down recall;
// Insert ▾; the engine's units; the graph mode; a loose document made a tape as it arrives; undo; and at phone
// width the keys a finger tall, the bar one row, the page never wider and never scrolled by typing.
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
