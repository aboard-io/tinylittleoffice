// The list apps worked as a person would, checked by the text they save (ported from e2e/apps.spec.ts).
import { test, expect } from 'vitest';
import { mount, settle, type, button, press, setSl } from './helpers.ts';
import { parseTodos, serializeTodos } from '../../src/lib/todomodel.ts';
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
  expect(last()).toBe('- [ ] Book flights\n- [ ] Renew passport\n- [ ] Pack');
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
  expect(last()).toBe('## To do\n\n- Design the page\n\n## In progress\n\n- Write the brief\n\n## Done\n\n## New stage');
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

test('todo: what is saved opens again as it was', async () => {
  const saved = serializeTodos([
    { text: 'Book flights', done: true, star: false, due: null },
    { text: 'Pack', done: false, star: false, due: null },
    { text: 'Renew passport', done: false, star: true, due: day('2027-03-01') },
  ]);
  const { el, last } = await mount('todo', saved);
  const rows = () => [...el.querySelectorAll('.todo-list li')];
  expect(rows()).toHaveLength(3);
  expect(rows()[0].classList.contains('done')).toBe(true);
  expect(el.querySelector<HTMLInputElement>('[aria-label="Task 2"]')!.value).toBe('Pack');
  expect(rows()[2].querySelector<HTMLInputElement>('input.due')!.value).toBe('2027-03-01');
  expect(rows()[2].querySelector('button.star')!.getAttribute('aria-pressed')).toBe('true');
  button(el, 'Clear done').click();
  await settle(el);
  expect(rows()).toHaveLength(2);
  expect(el.querySelector('.to-toolbar .to-hint')!.textContent).toBe('0 / 2');
  expect(parseTodos(last()!)).toHaveLength(2);
});

test('board: a stage named as it is added, a limit, opened again, and a card dragged to another stage', async () => {
  const { el, last } = await mount('board', '## To do\n\n- Write the brief\n- Design the page\n\n## In progress\n\n## Done');
  const cols = () => [...el.querySelectorAll<HTMLElement>('.board-col')];
  // A new stage has its name ready to type over.
  button(el, /^Stage$/).click();
  await settle(el);
  expect(cols()).toHaveLength(4);
  expect(document.activeElement).toBe(cols()[3].querySelector('input.name'));
  type(document.activeElement as HTMLInputElement, 'Review');
  await settle(el);
  // A limit, from the stage's menu: over it, the stage says so.
  const menu = cols()[0].querySelector('sl-menu')!;
  const one = [...menu.querySelectorAll('sl-menu-item')].find((i) => i.textContent?.trim() === '1')!;
  menu.dispatchEvent(new CustomEvent('sl-select', { bubbles: true, composed: true, detail: { item: one } }));
  await settle(el);
  expect(cols()[0].classList.contains('full')).toBe(true);
  expect(cols()[0].querySelector('.count')!.textContent!.trim()).toBe('2 / 1');
  // Opened again, it is all there.
  const again = await mount('board', last());
  const cols2 = () => [...again.el.querySelectorAll<HTMLElement>('.board-col')];
  expect(cols2().map((c) => c.querySelector<HTMLInputElement>('input.name')!.value)).toEqual(['To do', 'In progress', 'Done', 'Review']);
  expect(cols2()[0].classList.contains('full')).toBe(true);
  // Drag and drop between stages (a mouse thing; on touch screens the arrows do it).
  const card = cols2()[0].querySelectorAll('.board-card')[0];
  const data = new DataTransfer();
  card.dispatchEvent(new DragEvent('dragstart', { bubbles: true, dataTransfer: data }));
  cols2()[2].dispatchEvent(new DragEvent('dragover', { bubbles: true, cancelable: true, dataTransfer: data }));
  cols2()[2].dispatchEvent(new DragEvent('drop', { bubbles: true, cancelable: true, dataTransfer: data }));
  card.dispatchEvent(new DragEvent('dragend', { bubbles: true, dataTransfer: data }));
  await settle(again.el);
  expect(cols2()[2].querySelector('.board-card .write-page')!.textContent).toBe('Write the brief');
  expect(cols2()[0].classList.contains('full')).toBe(false);
  expect(again.last()).toBe('## To do {limit=1}\n\n- Design the page\n\n## In progress\n\n## Done\n\n- Write the brief\n\n## Review');
});

test('gantt: Return adds the next task, bars dragged and stretched, tasks nested and brought out', async () => {
  const { el, last } = await mount('gantt');
  const bars = () => el.querySelectorAll('.gantt-chart .bar');
  const input = (label: string) => el.querySelector<HTMLInputElement>(`input[aria-label="${label}"]`)!;
  button(el, /^Task$/).click();
  await settle(el);
  type(input('Task 1'), 'Design');
  type(input('Start of task 1'), '2027-03-01', 'change');
  type(input('Days for task 1'), '5', 'change');
  type(input('Percent done for task 1'), '50', 'change');
  await settle(el);
  button(el, /^Task$/).click();
  await settle(el);
  type(input('Task 2'), 'Build');
  await settle(el);
  // Return adds the next task right below, ready to type; it starts where this one ends.
  input('Task 1').focus();
  press(input('Task 1'), 'Enter');
  await settle(el);
  expect(bars()).toHaveLength(3);
  expect(document.activeElement).toBe(input('Task 2'));
  expect(input('Start of task 2').value).toBe('2027-03-06');
  expect(input('Task 3').value).toBe('Build');
  button(el, 'Delete task').click();
  await settle(el);
  expect(bars()).toHaveLength(2);
  expect(el.querySelectorAll('.gantt-chart .done')).toHaveLength(1);

  const { el: el2, last: last2 } = await mount('gantt', last());
  const input2 = (label: string) => el2.querySelector<HTMLInputElement>(`input[aria-label="${label}"]`)!;
  expect(input2('Task 1').value).toBe('Design');
  expect(input2('Days for task 1').value).toBe('5');
  // Drag the second bar two days later (a day is 24 pixels), then make it two days longer.
  const chart = el2.querySelector('.gantt-chart')!;
  const drag = async (handle: Element, dx: number) => {
    handle.dispatchEvent(new PointerEvent('pointerdown', { bubbles: true, cancelable: true, pointerId: 1, clientX: 100 }));
    chart.dispatchEvent(new PointerEvent('pointermove', { bubbles: true, pointerId: 1, clientX: 100 + dx / 2 }));
    chart.dispatchEvent(new PointerEvent('pointermove', { bubbles: true, pointerId: 1, clientX: 100 + dx }));
    chart.dispatchEvent(new PointerEvent('pointerup', { bubbles: true, pointerId: 1, clientX: 100 + dx }));
    await settle(el2);
  };
  await drag(el2.querySelectorAll('.gantt-chart .bar')[1].querySelector('.track')!, 48);
  expect(input2('Start of task 2').value).toBe('2027-03-08');
  await drag(el2.querySelectorAll('.gantt-chart .bar')[1].querySelector('.grip')!, 48);
  expect(input2('Days for task 2').value).toBe('5');
  expect(parseGantt(last2()!)[1]).toMatchObject({ label: 'Build', start: day('2027-03-08'), days: 5 });
  // A task can be part of the one above: Tab indents it, and the one above becomes a bracket around its parts.
  input2('Task 2').focus();
  press(input2('Task 2'), 'Tab');
  await settle(el2);
  expect(el2.querySelector('.gantt-rows tbody tr')!.classList.contains('parent')).toBe(true);
  expect(el2.querySelectorAll('.gantt-chart .bar.parent')).toHaveLength(1);
  const { el: el3 } = await mount('gantt', last2());
  expect(el3.querySelectorAll('.gantt-chart .bar.parent')).toHaveLength(1);
  const task2 = el3.querySelector<HTMLInputElement>('input[aria-label="Task 2"]')!;
  task2.focus();
  task2.dispatchEvent(new FocusEvent('focusin', { bubbles: true }));
  await settle(el3);
  button(el3, 'Bring out').click();
  await settle(el3);
  expect(el3.querySelectorAll('.gantt-chart .bar.parent')).toHaveLength(0);
  button(el3, 'Indent under the task above').click();
  await settle(el3);
  expect(el3.querySelectorAll('.gantt-chart .bar.parent')).toHaveLength(1);
});

test('board: a card is rich text with a checklist, a stage has a colour, and it all comes back', async () => {
  const { el, last } = await mount('board', '## To do\n\n- Write the brief\n\n## Doing\n\n## Done');
  const cols = () => [...el.querySelectorAll<HTMLElement>('.board-col')];
  const card = () => cols()[0].querySelector<HTMLElement>('.board-card')!;
  // The words are a rich line: a mark typed in Markdown is kept as one.
  const page = card().querySelector<HTMLElement>('.write-page')!;
  page.focus();
  page.innerHTML = '<p>Write the <b>brief</b></p>';
  page.dispatchEvent(new InputEvent('input', { bubbles: true, composed: true, inputType: 'insertText' }));
  await settle(el);
  expect(last()).toBe('## To do\n\n- Write the **brief**\n\n## Doing\n\n## Done');
  // A checklist under it: Enter in an item starts the next; a tick is counted on the card.
  button(card(), 'Add a checklist').click();
  await settle(el);
  const items = () => [...card().querySelectorAll<HTMLInputElement>('.board-items input[type="text"]')];
  expect(document.activeElement).toBe(items()[0]);
  type(items()[0], 'Outline');
  press(items()[0], 'Enter');
  await settle(el);
  type(items()[1], 'Draft');
  await settle(el);
  const tick = card().querySelector<HTMLInputElement>('.board-items input[type="checkbox"]')!;
  tick.checked = true;
  tick.dispatchEvent(new Event('change', { bubbles: true }));
  await settle(el);
  expect(card().querySelector('.board-progress')!.textContent).toBe('1/2');
  expect(last()).toBe('## To do\n\n- Write the **brief**\n  - [x] Outline\n  - [ ] Draft\n\n## Doing\n\n## Done');
  // Backspace in an empty item takes it away.
  type(items()[1], '');
  press(items()[1], 'Backspace');
  await settle(el);
  expect(items()).toHaveLength(1);
  // A stage's colour, from its menu, tints the column.
  const menu = cols()[1].querySelector('sl-menu')!;
  const green = [...menu.querySelectorAll('sl-menu-item')].find((i) => i.getAttribute('value') === 'color:g')!;
  menu.dispatchEvent(new CustomEvent('sl-select', { bubbles: true, composed: true, detail: { item: green } }));
  await settle(el);
  expect(cols()[1].classList.contains('tinted')).toBe(true);
  expect(last()).toBe('## To do\n\n- Write the **brief**\n  - [x] Outline\n\n## Doing {color=g}\n\n## Done');
  // Opened again, it is all there.
  const again = await mount('board', last());
  expect(again.el.querySelector('.board-card .write-page b')?.textContent).toBe('brief');
  expect(again.el.querySelectorAll('.board-col')[1].classList.contains('tinted')).toBe(true);
  expect(again.el.querySelector('.board-progress')!.textContent).toBe('1/1');
});

test('gantt: the date nav scrolls the chart a week at a time and back to today', async () => {
  const { el } = await mount('gantt', 'Task | Start:date | Days:number | Done:percent\n--- | --- | --- | ---\nPlan | 2020-01-01 | 3 | 0%\nBuild | 2020-01-04 | 5 | 0%');
  const box = el.querySelector<HTMLElement>('.gantt-scroll')!;
  expect(el.querySelector('.to-datenav .cal-month')!.textContent).toBe('Dec 2019');
  button(el, 'A week later').click();
  await settle(el);
  expect(box.scrollLeft).toBe(7 * 24);
  button(el, 'A week earlier').click();
  await settle(el);
  expect(box.scrollLeft).toBe(0);
});
