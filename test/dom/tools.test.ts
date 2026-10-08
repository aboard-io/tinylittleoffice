// Calculator, calendar colours and pixel art worked as a person would, in happy-dom (ported from e2e/more.spec.ts).
import { test, expect, beforeEach } from 'vitest';
import { mount, settle, type, button, press, setSl } from './helpers.ts';
import { open, reopen, prefs, box, typeIn, settleAll, until } from './helpers-more.ts';
import { parseCalendar } from '../../src/lib/calmodel.ts';
import { parseCalc } from '../../src/lib/calc.ts';

beforeEach(() => prefs());

test('calculator: a tape, a graph, and a mortgage worked out as a page', async () => {
  await open('#/v0/calc');
  const calc = () => document.querySelector('to-calc')!;
  const key = async (k: string) => {
    [...calc().querySelectorAll<HTMLButtonElement>('.calc-keys button')].find((b) => b.textContent === k)!.click();
    await settleAll(2);
  };
  await key('7');
  await key('×');
  await key('6');
  expect(calc().querySelector('.calc-live')!.textContent).toBe('42');
  await key('=');
  expect(calc().querySelectorAll('.calc-tape li')).toHaveLength(1);
  expect(calc().querySelector('.calc-tape')!.textContent).toContain('= 42');
  const display = () => box(calc(), 'Expression');
  type(display(), 'sqrt(144)+5!');
  press(display(), 'Enter');
  await settleAll();
  expect(calc().querySelectorAll('.calc-tape li')).toHaveLength(2);
  expect(calc().querySelector('.calc-tape')!.textContent).toContain('= 132');
  await until(() => expect(location.hash).toMatch(/#\/v0\/calc\/[WYZR]/));
  // The graph draws y = f(x).
  const mode = (m: string) => setSl(calc().querySelector('sl-radio-group'), m);
  mode('graph');
  await settleAll();
  type(box(calc(), 'y = '), 'sin(x)');
  press(box(calc(), 'y = '), 'Enter');
  await settleAll();
  const right = () => calc().querySelector('.calc-right > svg')!;
  expect(right().textContent).toContain('y = sin(x)');
  expect(right().querySelectorAll('path[stroke-width="2.2"]')).toHaveLength(1);
  // A mortgage: boxes in, the answer and the years beside them.
  mode('mortgage');
  await settleAll();
  expect(right().textContent).toContain('2,022.62');
  const rate = [...calc().querySelectorAll('.calc-form label')].find((l) => l.textContent!.includes('Interest rate'))!.querySelector('input')!;
  type(rate, '5', 'change');
  await settleAll();
  expect(right().textContent).toContain('1,717.83');
  expect(parseCalc(calc().value).mode).toBe('mortgage');
  await until(() => expect(location.hash).not.toMatch(/\/$/));
  await reopen();
  expect(right().textContent).toContain('1,717.83');
  expect(document.title).toBe('Mortgage · TinyLittleOffice');
});

test('calendar: colours, and what they stand for', async () => {
  const first = await mount('cal', 'd2,2,Offsite');
  const cell = (el: Element, ymd: string) => el.querySelector<HTMLElement>(`[role="gridcell"][aria-label="${ymd}"]`)!;
  const radio = (el: Element, group: string, name: string) => el.querySelector<HTMLElement>(`[role="radiogroup"][aria-label="${group}"] [role="radio"][aria-label^="${name}"]`)!;
  // Someone else adds their dates in their own colour, and says whose it is.
  radio(first.el, 'Colour for new spans', 'Green').click();
  await settle(first.el);
  type(box(first.el, 'What this colour stands for'), 'Sam', 'change');
  await settle(first.el);
  cell(first.el, '2020-01-10').dispatchEvent(new PointerEvent('pointerdown', { bubbles: true, button: 0, pointerId: 1 }));
  first.el.querySelector('.cal-grid')!.dispatchEvent(new PointerEvent('pointerup', { bubbles: true, pointerId: 1 }));
  await settle(first.el);
  const label = first.el.querySelector('sl-dialog sl-input#label')!;
  setSl(label, 'Dentist', 'sl-input');
  await settle(first.el);
  press(label, 'Enter');
  await settle(first.el);
  const chip = (el: Element, ymd: string) => cell(el, ymd).querySelector<HTMLElement>('.cal-chip')!;
  expect(chip(first.el, '2020-01-10').classList).toContain('tint');
  expect([...first.el.querySelectorAll('.cal-legend .key')].map((k) => k.textContent)).toEqual(['Sam']);
  const cal = parseCalendar(first.last()!);
  expect(cal.spans.map((s) => [s.label, s.color])).toEqual([['Offsite', undefined], ['Dentist', 'g']]);
  // The same, opened again from what it saved.
  const { el, last } = await mount('cal', first.last()!);
  expect(chip(el, '2020-01-10').classList).toContain('tint');
  expect([...el.querySelectorAll('.cal-legend .key')].map((k) => k.textContent)).toEqual(['Sam']);
  // The first span keeps its own colour.
  expect(chip(el, '2020-01-03').classList).not.toContain('tint');
  // A span's colour can be changed where it is edited.
  chip(el, '2020-01-10').click();
  await settle(el);
  radio(el.querySelector('sl-dialog')!, 'Colour of this span', 'Red').click();
  await settle(el);
  expect(chip(el, '2020-01-10').getAttribute('style')).toMatch(/b3261e/);
  button(el.querySelector('sl-dialog')!, /Done/).click();
  await settle(el);
  expect(parseCalendar(last()!).spans.map((s) => s.color)).toEqual([undefined, 'r']);
});

test('pixel art: colour squares by tapping, from the keyboard, and with the tools', async () => {
  const { el, last } = await mount('pixel');
  const cells = () => [...el.querySelectorAll<HTMLElement>('[role="gridcell"]')];
  const cell = (r: number, c: number) => cells().find((b) => b.getAttribute('aria-label')!.startsWith(`Row ${r}, column ${c}:`))!;
  const name = (r: number, c: number) => cell(r, c).getAttribute('aria-label');
  const ink = async (n: string) => {
    el.querySelector<HTMLElement>(`.pixel-inks [role="radio"][aria-label="${n}"]`)!.click();
    await settle(el);
  };
  expect(cells()).toHaveLength(256);
  cell(1, 1).click();
  await settle(el);
  expect(name(1, 1)).toBe('Row 1, column 1: Black');
  await ink('Red');
  // Arrow keys move; Enter (a click on the square that has the focus) colours.
  cell(1, 1).focus();
  press(document.activeElement, 'ArrowRight');
  press(document.activeElement, 'ArrowDown');
  (document.activeElement as HTMLElement).click();
  await settle(el);
  expect(name(2, 2)).toBe('Row 2, column 2: Red');
  await ink('Eraser');
  cell(1, 1).click();
  await settle(el);
  expect(name(1, 1)).toBe('Row 1, column 1: empty');
  // Opened again from what it saved.
  const again = await mount('pixel', last()!);
  expect(again.el.querySelector('[aria-label^="Row 2, column 2:"]')!.getAttribute('aria-label')).toBe('Row 2, column 2: Red');
  expect(again.el.querySelector('[aria-label^="Row 1, column 1:"]')!.getAttribute('aria-label')).toBe('Row 1, column 1: empty');
});

test('pixel art: a box dragged out, a fill, a line, and the picture beside the grid', async () => {
  const { el } = await mount('pixel');
  const cell = (r: number, c: number) => el.querySelector<HTMLElement>(`[role="gridcell"][aria-label^="Row ${r}, column ${c}:"]`)!;
  const name = (r: number, c: number) => cell(r, c).getAttribute('aria-label');
  const ink = async (n: string) => {
    el.querySelector<HTMLElement>(`.pixel-inks [role="radio"][aria-label="${n}"]`)!.click();
    await settle(el);
  };
  // What is under the pointer: here a pointer's x and y are a column and a row (the real geometry is e2e's).
  document.elementFromPoint = (x: number, y: number) => cell(y, x);
  const grid = el.querySelector('.pixel-grid')!;
  const drag = async (r1: number, c1: number, r2: number, c2: number) => {
    const at = (type: string, r: number, c: number) => grid.dispatchEvent(new PointerEvent(type, { bubbles: true, clientX: c, clientY: r, buttons: 1, pointerId: 1 }));
    (grid as HTMLElement).setPointerCapture = () => {};
    at('pointerdown', r1, c1);
    await settle(el);
    at('pointermove', Math.round((r1 + r2) / 2), Math.round((c1 + c2) / 2));
    at('pointermove', r2, c2);
    await settle(el);
    at('pointerup', r2, c2);
    await settle(el);
  };
  await ink('Red');
  // The pencil, dragged across a row.
  await drag(3, 2, 3, 6);
  for (const c of [2, 4, 6]) expect(name(3, c)).toBe(`Row 3, column ${c}: Red`);
  await ink('Indigo');
  button(el, 'Box').click();
  await drag(6, 6, 9, 10);
  expect(name(6, 8)).toBe('Row 6, column 8: Indigo');
  expect(name(9, 6)).toBe('Row 9, column 6: Indigo');
  expect(name(7, 8)).toBe('Row 7, column 8: empty');
  button(el, 'Fill').click();
  await ink('Yellow');
  cell(7, 8).click();
  await settle(el);
  expect(name(8, 9)).toBe('Row 8, column 9: Yellow');
  expect(name(12, 12)).toBe('Row 12, column 12: empty');
  button(el, 'Line').click();
  await drag(12, 1, 12, 8);
  expect(name(12, 5)).toBe('Row 12, column 5: Yellow');
  // (One square per coloured cell, and the page's own white behind them.)
  expect(el.querySelectorAll('.pixel-preview .big svg rect')).toHaveLength(el.querySelectorAll('.pixel-grid button[style*="background"]').length + 1);
});
