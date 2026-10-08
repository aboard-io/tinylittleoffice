// The list apps worked as a person would, checked by the text they save (ported from e2e/apps.spec.ts).
import { test, expect } from 'vitest';
import { mount, settle, type, button, press, setSl } from './helpers.ts';
import { parseTodos } from '../../src/lib/todomodel.ts';
import { parseGantt } from '../../src/lib/ganttmodel.ts';
import { EPOCH_DAY } from '../../src/lib/calmodel.ts';
import { ymdToDay } from '../../src/lib/tz.ts';

/** A date as the documents count it: days since 2020-01-01. */
const day = (ymd: string) => ymdToDay(...(ymd.split('-').map(Number) as [number, number, number])) - EPOCH_DAY;

test('todo: add, tick, star, date, move, filter and clear', async () => {
  const { el, last } = await mount('todo');
  const add = el.querySelector('sl-input.todo-new')!;
  for (const t of ['Book flights', 'Renew passport', 'Pack']) {
    setSl(add, t, 'sl-input');
    press(add, 'Enter');
    await settle(el);
  }
  expect(last()).toBe('- Book flights\n- Renew passport\n- Pack');
  const rows = () => [...el.querySelectorAll('.todo-list li')];
  setSl(rows()[0].querySelector('sl-checkbox'), true);
  button(rows()[1], 'Star').click();
  type(rows()[1].querySelector('input.due'), '2027-03-01', 'change');
  await settle(el);
  button(rows()[2], 'Move up').click();
  await settle(el);
  expect(parseTodos(last()!)).toEqual([
    { text: 'Book flights', done: true, star: false, due: null },
    { text: 'Pack', done: false, star: false, due: null },
    { text: 'Renew passport', done: false, star: true, due: day('2027-03-01') },
  ]);
  expect(el.querySelector('.to-toolbar .to-hint')!.textContent).toBe('1 / 3');
  setSl(el.querySelector('sl-select[label="Show"]'), 'done');
  await settle(el);
  expect(rows()).toHaveLength(1);
  button(el, 'Clear done').click();
  await settle(el);
  expect(parseTodos(last()!).map((t) => t.text)).toEqual(['Pack', 'Renew passport']);
});

test('board: cards added, moved along, a stage renamed, added and given a limit', async () => {
  const { el, last } = await mount('board');
  const addTo = (name: string) => el.querySelector<HTMLInputElement>(`input[aria-label="Add a card to ${name}"]`);
  for (const t of ['Write the brief', 'Design the page']) {
    type(addTo('To do'), t);
    press(addTo('To do'), 'Enter');
    await settle(el);
  }
  const cols = () => [...el.querySelectorAll('.board-col')];
  button(cols()[0].querySelector('.board-card')!, 'Move to next stage').click();
  await settle(el);
  type(cols()[1].querySelector('input.name'), 'In progress');
  await settle(el);
  button(el, /^Stage$/).click();
  await settle(el);
  expect(cols()).toHaveLength(4);
  expect(last()).toMatch(/^#To do\nDesign the page\n#In progress\nWrite the brief\n#Done\n#New stage$/);
});

test('gantt: tasks follow one another, nest, and go', async () => {
  const { el, last } = await mount('gantt');
  button(el, /^Task$/).click();
  await settle(el);
  type(el.querySelector('input[aria-label="Task 1"]'), 'Design');
  type(el.querySelector('input[aria-label="Start of task 1"]'), '2027-03-01', 'change');
  type(el.querySelector('input[aria-label="Days for task 1"]'), '5', 'change');
  await settle(el);
  button(el, /^Task$/).click();
  await settle(el);
  type(el.querySelector('input[aria-label="Task 2"]'), 'Build');
  await settle(el);
  // A new task starts where the last one ends.
  expect(el.querySelector<HTMLInputElement>('input[aria-label="Start of task 2"]')!.value).toBe('2027-03-06');
  type(el.querySelector('input[aria-label="Percent done for task 1"]'), '50', 'change');
  await settle(el);
  expect(el.querySelectorAll('.gantt-chart .bar')).toHaveLength(2);
  const [design, build] = parseGantt(last()!);
  expect(design).toMatchObject({ label: 'Design', start: day('2027-03-01'), days: 5, done: 50 });
  expect(build).toMatchObject({ label: 'Build', start: day('2027-03-06') });
  // Return in a task adds the next one under it; Delete takes the one chosen away.
  press(el.querySelector('input[aria-label="Task 1"]'), 'Enter');
  await settle(el);
  expect(el.querySelectorAll('.gantt-chart .bar')).toHaveLength(3);
  button(el, 'Delete task').click();
  await settle(el);
  expect(el.querySelectorAll('.gantt-chart .bar')).toHaveLength(2);
});
