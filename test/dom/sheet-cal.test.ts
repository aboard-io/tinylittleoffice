// Sheet and Calendar worked as a person would, checked by what they save and show (ported from e2e/suite.spec.ts, e2e/calendar.spec.ts).
import { test, expect } from 'vitest';
import { mount, settle, type, setSl, button } from './helpers.ts';
import { parseGrid } from '../../src/lib/formula.ts';
import { parseCalendar } from '../../src/lib/calmodel.ts';

test('sheet: numbers and a formula typed into cells; the formula works out', async () => {
  const { el, last } = await mount('sheet');
  const cell = (ref: string) => el.querySelector<HTMLInputElement>(`input[aria-label="${ref}"]`);
  for (const [ref, v] of [['A1', '120'], ['A2', '180'], ['A3', '=SUM(A1:A2)']]) {
    cell(ref)!.dispatchEvent(new FocusEvent('focus'));
    type(cell(ref), v);
    await settle(el);
  }
  expect(parseGrid(last()!).slice(0, 3).map((r) => r[0])).toEqual(['120', '180', '=SUM(A1:A2)']);
  // Away from it, the cell shows what the formula comes to.
  cell('B1')!.dispatchEvent(new FocusEvent('focus'));
  await settle(el);
  expect(cell('A3')!.value).toBe('300');
  // A formula that refers to itself says so rather than hanging.
  cell('A4')!.dispatchEvent(new FocusEvent('focus'));
  type(cell('A4'), '=A4+1');
  cell('B1')!.dispatchEvent(new FocusEvent('focus'));
  await settle(el);
  expect(cell('A4')!.value).toMatch(/^#/);
});

test('calendar: a day pressed makes a span, named and set to repeat in its dialog, kept on Done', async () => {
  const { el, last } = await mount('cal');
  const days = [...el.querySelectorAll<HTMLElement>('.cal-grid [role="gridcell"]')].filter((d) => !d.classList.contains('out'));
  days[9].dispatchEvent(new PointerEvent('pointerdown', { bubbles: true, button: 0, pointerId: 1 }));
  el.querySelector('.cal-grid')!.dispatchEvent(new PointerEvent('pointerup', { bubbles: true, pointerId: 1 }));
  await settle(el);
  const dialog = el.querySelector('sl-dialog');
  expect(dialog, 'the span opens in a dialog').toBeTruthy();
  setSl(dialog!.querySelector('sl-input.label'), 'Offsite', 'sl-input');
  await settle(el);
  setSl(dialog!.querySelector('sl-select.cal-repeat'), 'w');
  await settle(el);
  // Nothing is written until Done.
  expect(last()).toBeUndefined();
  button(dialog!, 'Done').click();
  await settle(el);
  const spans = parseCalendar(last()!).spans;
  expect(spans).toHaveLength(1);
  expect(spans[0]).toMatchObject({ kind: 'd', label: 'Offsite', repeat: { every: 'w' } });
});

test('calendar: the year at a glance, days with something on them tinted; a month opens on its name, a day on itself', async () => {
  const { el } = await mount('cal', '- 2026-01-15 to 2026-01-17 Offsite\n- 2026-03-02 Dentist {color=g}');
  expect(el.querySelector('.to-datenav .cal-month')!.textContent).toBe('March 2026');
  button(el, 'Year').click();
  await settle(el);
  expect(el.querySelector('.cal-year')).toBeTruthy();
  expect(el.querySelector('.to-datenav .cal-month')!.textContent).toBe('2026');
  const minis = () => [...el.querySelectorAll('.cal-mini')];
  expect(minis()).toHaveLength(12);
  expect(minis()[0].querySelectorAll('.d.has')).toHaveLength(3);
  expect(minis()[2].querySelectorAll('.d.has')).toHaveLength(1);
  // The year moves by years.
  button(el, 'Next year').click();
  await settle(el);
  expect(el.querySelector('.to-datenav .cal-month')!.textContent).toBe('2027');
  expect(el.querySelectorAll('.d.has')).toHaveLength(0);
  button(el, 'Previous year').click();
  await settle(el);
  // A day tapped opens its month with the day marked.
  el.querySelector<HTMLElement>('.cal-mini .d[aria-label="2026-03-02"]')!.click();
  await settle(el);
  expect(el.querySelector('.cal-year')).toBeNull();
  expect(el.querySelector('.to-datenav .cal-month')!.textContent).toBe('March 2026');
  expect(el.querySelector('.cal-cell.picked')!.getAttribute('aria-label')).toBe('2026-03-02');
  // The month's name opens the year again; a month's name in it opens that month.
  button(el, /^March 2026$/).click();
  await settle(el);
  expect(el.querySelector('.cal-year')).toBeTruthy();
  minis()[5].querySelector<HTMLElement>('.cal-mini-name')!.click();
  await settle(el);
  expect(el.querySelector('.to-datenav .cal-month')!.textContent).toBe('June 2026');
});
