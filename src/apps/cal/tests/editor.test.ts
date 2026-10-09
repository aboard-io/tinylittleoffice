// The Calendar editor in a real browser: the month from the document, opened where the next thing is; a tap on a
// day, a drag across days and a tap on a span, each through the native dialog's draft (Done writes one edit,
// Escape none); colour, repeat, all day and times; the year; the schedule with its bars dragged and its tasks
// nested by Tab; undo; and at phone width the bar one row, nothing wider than the screen, the dialog's fields 16px.
import { expect, test } from 'vitest';
import { page } from 'vitest/browser';
import '../../../styles.css';
import '../editor.ts';
import type { ToCalEditor } from '../editor.ts';
import type { ToText } from '../../../kit/text.ts';
import { tick, until } from '../../../../test/browser/helpers.ts';

const DOC = '---\nzone: Europe/London\ngreen: Sam\n---\n- 2027-03-01: Launch\n- 2027-03-01 to 2027-03-03: Offsite {color=green}\n- 2027-03-10 09:00-10:30: Retro {every=week times=3}\n';
const PLAN = '---\nview: gantt\n---\n- 2027-03-01 to 2027-03-05: Design\n  - 2027-03-01 to 2027-03-02: Sketch {done=50%}\n  - 2027-03-03 to 2027-03-05: Draw\n- 2027-03-08 to 2027-03-10: Build\n';

async function editor(value = DOC): Promise<{ el: ToCalEditor; changes: string[]; last: () => string | undefined }> {
  document.body.innerHTML = '';
  const main = document.createElement('main');
  main.className = 'to-main';
  document.body.append(main);
  const el = document.createElement('to-cal-editor') as ToCalEditor;
  el.zone = 'Europe/London';
  el.value = value;
  const changes: string[] = [];
  el.addEventListener('docchange', (e) => changes.push((e as CustomEvent<string>).detail));
  main.append(el);
  await el.updateComplete;
  return { el, changes, last: () => changes.at(-1) };
}
const settle = async (el: ToCalEditor) => {
  await el.updateComplete;
  await tick(30);
  await el.updateComplete;
};
const cell = (el: HTMLElement, iso: string) => {
  const [y, m, d] = iso.split('-').map(Number);
  return el.querySelector<HTMLElement>(`.cal-cell[data-day="${Date.UTC(y, m - 1, d) / 86400000}"]`)!;
};
const dialog = () => document.querySelector<HTMLDialogElement>('to-dialog.cal-dialog dialog')!;
const label = () => document.querySelector<ToText>('to-dialog.cal-dialog to-text.cal-label')!;
async function type(el: ToCalEditor, s: string) {
  for (const ch of s) {
    label().tx.dispatchEvent(new InputEvent('beforeinput', { inputType: 'insertText', data: ch, bubbles: true, cancelable: true, composed: true }));
    await el.updateComplete;
    await tick();
  }
}
const button = (root: ParentNode, words: string) => [...root.querySelectorAll<HTMLButtonElement>('button')].find((b) => b.textContent!.trim() === words || b.getAttribute('aria-label') === words)!;
async function pick(el: ToCalEditor, opener: HTMLElement, label: string) {
  opener.click();
  await until(() => !!document.querySelector('[popover]:popover-open'));
  const items = [...document.querySelectorAll<HTMLElement>('[popover]:popover-open [role^=menuitem]')];
  const item = items.find((x) => x.textContent!.includes(label));
  if (!item) throw new Error(`no item ${label} among ${items.map((x) => x.textContent!.trim()).join(' | ')}`);
  item.click();
  await settle(el);
}
const undo = async (el: ToCalEditor) => {
  el.dispatchEvent(new CustomEvent('docundo', { cancelable: true }));
  await settle(el);
};
function pointer(target: Element, type: string, x: number, y: number) {
  target.dispatchEvent(new PointerEvent(type, { clientX: x, clientY: y, button: 0, buttons: type === 'pointerup' ? 0 : 1, pointerId: 7, bubbles: true, cancelable: true, composed: true }));
}
const centre = (e: Element) => {
  const r = e.getBoundingClientRect();
  return [r.left + r.width / 2, r.top + r.height / 2] as const;
};

test('the month opens where the document is: its spans on their days, a span of days across them, the month as a list', async () => {
  const { el } = await editor();
  expect(el.querySelector('.to-datenav-label')!.textContent).toBe('March 2027');
  expect([...cell(el, '2027-03-01').querySelectorAll('.cal-chip')].map((c) => c.textContent!.trim())).toEqual(['Launch', 'Offsite']);
  expect(cell(el, '2027-03-02').querySelector('.cal-chip')!.classList.contains('cont')).toBe(true);
  // A weekly retro three times: the 10th, 17th and 24th, at nine in London.
  for (const d of ['10', '17', '24']) expect(cell(el, `2027-03-${d}`).querySelector('.cal-chip')!.textContent).toContain('9:00');
  expect(cell(el, '2027-03-31').querySelector('.cal-chip')).toBeNull();
  expect([...el.querySelectorAll('.cal-agenda-item .what')].map((x) => x.textContent!.trim().split(' ')[0])).toEqual(['Launch', 'Offsite', 'Retro', 'Retro', 'Retro']);
  expect(el.querySelector('.cal-legend')!.textContent).toContain('Sam');
  // The arrows go on a month and back; Today comes home.
  button(el, 'Next month').click();
  await settle(el);
  expect(el.querySelector('.to-datenav-label')!.textContent).toBe('April 2027');
});

test('a tap on a day opens a new span in the dialog; Done writes it in date order, one undo takes it out; Escape keeps nothing', async () => {
  const { el, last, changes } = await editor();
  cell(el, '2027-03-05').querySelector<HTMLButtonElement>('.cal-n')!.click();
  await settle(el);
  expect(dialog().open).toBe(true);
  expect(document.querySelector('to-dialog.cal-dialog h2')!.textContent).toBe('New event');
  await until(() => document.activeElement === label().tx);
  await type(el, 'Dinner');
  expect(changes).toHaveLength(0);
  button(dialog(), 'Done').click();
  await settle(el);
  expect(dialog().open).toBe(false);
  expect(last()).toBe(DOC.replace('- 2027-03-10', '- 2027-03-05: Dinner\n- 2027-03-10'));
  expect(cell(el, '2027-03-05').querySelector('.cal-chip')!.textContent).toBe('Dinner');
  await undo(el);
  expect(last()).toBe(DOC);
  // Opened and closed with Escape: nothing written.
  const n = changes.length;
  cell(el, '2027-03-06').click();
  await settle(el);
  expect(dialog().open).toBe(true);
  dialog().close();
  await settle(el);
  expect(changes).toHaveLength(n);
  expect(el.querySelector('to-dialog.cal-dialog .cal-form')).toBeNull();
});

test('a drag across days is a span over them, in the colour new spans take', async () => {
  const { el, last } = await editor();
  await pick(el, el.querySelector<HTMLElement>('to-menu.cal-ink > button')!, 'Purple');
  const grid = el.querySelector('.cal-grid')!;
  const [x0, y0] = centre(cell(el, '2027-03-15'));
  const [x1, y1] = centre(cell(el, '2027-03-17'));
  pointer(cell(el, '2027-03-15'), 'pointerdown', x0, y0);
  pointer(grid, 'pointermove', (x0 + x1) / 2, y0);
  pointer(grid, 'pointermove', x1, y1);
  await settle(el);
  expect(cell(el, '2027-03-16').classList.contains('range')).toBe(true);
  pointer(grid, 'pointerup', x1, y1);
  await settle(el);
  expect(dialog().open).toBe(true);
  await type(el, 'Trip');
  button(dialog(), 'Done').click();
  await settle(el);
  expect(last()).toBe(DOC + '- 2027-03-15 to 2027-03-17: Trip {color=purple}\n');
});

test('a tap on a span edits it: its words, a colour and what it stands for, a repeat; Delete takes it out', async () => {
  const { el, last } = await editor();
  cell(el, '2027-03-01').querySelectorAll<HTMLButtonElement>('.cal-chip')[1].click();
  await settle(el);
  expect(document.querySelector('to-dialog.cal-dialog h2')!.textContent).toBe('Edit event');
  expect(label().tx.textContent!.trim()).toBe('Offsite');
  expect(dialog().querySelector<HTMLInputElement>('.cal-legend-name')!.value).toBe('Sam');
  button(dialog(), 'Orange').click();
  await settle(el);
  const who = dialog().querySelector<HTMLInputElement>('.cal-legend-name')!;
  expect(who.value).toBe('');
  who.value = 'Ana';
  who.dispatchEvent(new Event('input', { bubbles: true }));
  const repeat = dialog().querySelector<HTMLSelectElement>('select')!;
  repeat.value = 'y';
  repeat.dispatchEvent(new Event('change', { bubbles: true }));
  await settle(el);
  const times = dialog().querySelector<HTMLInputElement>('.cal-times')!;
  times.value = '5';
  times.dispatchEvent(new Event('change', { bubbles: true }));
  await settle(el);
  button(dialog(), 'Done').click();
  await settle(el);
  expect(last()).toBe(DOC.replace('green: Sam\n', 'green: Sam\norange: Ana\n').replace('Offsite {color=green}', 'Offsite {color=orange every=year times=5}'));
  // One edit, one undo.
  await undo(el);
  expect(last()).toBe(DOC);
  cell(el, '2027-03-01').querySelector<HTMLButtonElement>('.cal-chip')!.click();
  await settle(el);
  button(dialog(), 'Delete').click();
  await settle(el);
  expect(last()).toBe(DOC.replace('- 2027-03-01: Launch\n', ''));
});

test('all day off gives the span a time, shown and written in the zone; Enter in the words is Done', async () => {
  const { el, last } = await editor();
  cell(el, '2027-03-20').click();
  await settle(el);
  const allDay = dialog().querySelector<HTMLInputElement>('.cal-allday input')!;
  allDay.click();
  await settle(el);
  const [start, end] = [...dialog().querySelectorAll<HTMLInputElement>('input[type=time]')];
  expect(start.value).toBe('09:00');
  expect(end.value).toBe('10:00');
  start.value = '18:30';
  start.dispatchEvent(new Event('change', { bubbles: true }));
  await settle(el);
  await until(() => document.activeElement === label().tx || !!label());
  label().focus();
  await type(el, 'Gig');
  label().tx.dispatchEvent(new InputEvent('beforeinput', { inputType: 'insertParagraph', bubbles: true, cancelable: true, composed: true }));
  await settle(el);
  expect(dialog().open).toBe(false);
  expect(last()).toBe(DOC + '- 2027-03-20 18:30-19:30: Gig\n');
});

test('the year at a glance: a day with something on it is tinted; a tap on a day opens its month, marked', async () => {
  const { el } = await editor();
  await pick(el, el.querySelector<HTMLElement>('to-menu.cal-view > button')!, 'Year');
  expect(el.querySelectorAll('.cal-mini')).toHaveLength(12);
  expect(el.querySelector('.to-datenav-label')!.textContent).toBe('2027');
  const has = [...el.querySelectorAll<HTMLButtonElement>('.cal-mini-days .d.has')].map((b) => b.getAttribute('aria-label'));
  const named = (d: number) => new Intl.DateTimeFormat('en', { day: 'numeric', month: 'long', timeZone: 'UTC' }).format(Date.UTC(2027, 2, d));
  expect(has).toEqual([1, 2, 3, 10, 17, 24].map(named));
  [...el.querySelectorAll<HTMLButtonElement>('.cal-mini-days .d')].find((b) => b.getAttribute('aria-label') === named(17))!.click();
  await settle(el);
  expect(el.querySelector('.to-datenav-label')!.textContent).toBe('March 2027');
  expect(cell(el, '2027-03-17').classList.contains('picked')).toBe(true);
});

test('the schedule: the head says so; a bar dragged moves its task, its end makes it longer; Tab nests a task, Alt+arrows move it', async () => {
  const { el, last } = await editor(DOC);
  await pick(el, el.querySelector<HTMLElement>('to-menu.cal-view > button')!, 'Schedule');
  expect(last()).toBe(DOC.replace('green: Sam\n', 'green: Sam\nview: gantt\n'));
  const fresh = await editor(PLAN);
  const e2 = fresh.el;
  expect([...e2.querySelectorAll('.cal-task')].map((b) => b.textContent!.trim())).toEqual(['Design', 'Sketch', 'Draw', 'Build']);
  expect(e2.querySelector('.cal-task')!.classList.contains('parent')).toBe(true);
  // Build, dragged two days on (24px a day).
  const svgEl = e2.querySelector('.cal-chart')!;
  const build = e2.querySelector<SVGRectElement>('.track[data-at="3"]')!;
  const [bx, by] = centre(build);
  pointer(build, 'pointerdown', bx, by);
  pointer(svgEl, 'pointermove', bx + 48, by);
  await settle(e2);
  expect(e2.querySelector('.bar.moving')).not.toBeNull();
  pointer(svgEl, 'pointerup', bx + 48, by);
  await settle(e2);
  expect(fresh.last()).toBe(PLAN.replace('2027-03-08 to 2027-03-10: Build', '2027-03-10 to 2027-03-12: Build'));
  // Draw, a day longer by its end.
  const grip = e2.querySelector<SVGRectElement>('.grip[data-at="2"]')!;
  const [gx, gy] = centre(grip);
  pointer(grip, 'pointerdown', gx, gy);
  pointer(svgEl, 'pointermove', gx + 24, gy);
  pointer(svgEl, 'pointerup', gx + 24, gy);
  await settle(e2);
  expect(fresh.last()).toContain('  - 2027-03-03 to 2027-03-06: Draw\n');
  // Build under Design, by Tab on its row; then back out with Shift+Tab.
  const row = () => e2.querySelector<HTMLButtonElement>('.cal-task[data-at="3"]')!;
  row().focus();
  row().dispatchEvent(new KeyboardEvent('keydown', { key: 'Tab', bubbles: true, cancelable: true }));
  await settle(e2);
  expect(fresh.last()).toContain('  - 2027-03-10 to 2027-03-12: Build\n');
  row().dispatchEvent(new KeyboardEvent('keydown', { key: 'Tab', shiftKey: true, bubbles: true, cancelable: true }));
  await settle(e2);
  expect(fresh.last()).toContain('\n- 2027-03-10 to 2027-03-12: Build\n');
  // Sketch below Draw.
  e2.querySelector<HTMLButtonElement>('.cal-task[data-at="1"]')!.dispatchEvent(new KeyboardEvent('keydown', { key: 'ArrowDown', altKey: true, bubbles: true, cancelable: true }));
  await settle(e2);
  expect(fresh.last()).toMatch(/Draw\n {2}- 2027-03-01 to 2027-03-02: Sketch \{done=50%\}\n/);
  for (let i = 0; i < 5; i++) await undo(e2);
  expect(fresh.last()).toBe(PLAN);
});

test('on the schedule a tap on a bar opens its task, with how far along it is; Insert adds a task after the current one', async () => {
  const { el, last } = await editor(PLAN);
  const sketch = el.querySelector<SVGRectElement>('.track[data-at="1"]')!;
  const [x, y] = centre(sketch);
  pointer(sketch, 'pointerdown', x, y);
  pointer(el.querySelector('.cal-chart')!, 'pointerup', x, y);
  await settle(el);
  expect(document.querySelector('to-dialog.cal-dialog h2')!.textContent).toBe('Edit task');
  const done = dialog().querySelector<HTMLInputElement>('.cal-done')!;
  expect(done.value).toBe('50');
  done.value = '100';
  done.dispatchEvent(new Event('change', { bubbles: true }));
  await settle(el);
  button(dialog(), 'Done').click();
  await settle(el);
  expect(last()).toContain('  - [x] 2027-03-01 to 2027-03-02: Sketch\n');
  await pick(el, el.querySelector<HTMLElement>('to-insert > button')!, 'Task');
  expect(document.querySelector('to-dialog.cal-dialog h2')!.textContent).toBe('New task');
  await type(el, 'Review');
  button(dialog(), 'Done').click();
  await settle(el);
  expect(last()).toContain('  - [x] 2027-03-01 to 2027-03-02: Sketch\n  - 2027-03-03 to 2027-03-05: Review\n  - 2027-03-03');
});

test('at phone width: the bar is one row, nothing is wider than the screen, the dialog\'s fields are 16px and typing never scrolls the page', async () => {
  await page.viewport(390, 844);
  try {
    const { el } = await editor();
    const bar = el.querySelector<HTMLElement>('to-bar')!;
    const tops = new Set([...bar.children].filter((x) => (x as HTMLElement).offsetWidth > 0).map((x) => Math.round(x.getBoundingClientRect().top)));
    expect(tops.size).toBe(1);
    expect(bar.offsetHeight).toBeLessThanOrEqual(56);
    expect(document.documentElement.scrollWidth).toBeLessThanOrEqual(390);
    for (const b of bar.querySelectorAll<HTMLElement>('button')) if (b.offsetWidth) expect(b.getBoundingClientRect().height).toBeGreaterThanOrEqual(44);
    cell(el, '2027-03-12').click();
    await settle(el);
    const box = dialog().getBoundingClientRect();
    expect(box.left).toBeGreaterThanOrEqual(0);
    expect(box.right).toBeLessThanOrEqual(390);
    for (const f of dialog().querySelectorAll<HTMLElement>('input, select')) expect(parseFloat(getComputedStyle(f).fontSize)).toBeGreaterThanOrEqual(16);
    expect(parseFloat(getComputedStyle(label().tx).fontSize)).toBeGreaterThanOrEqual(16);
    await type(el, 'Call');
    expect(document.scrollingElement!.scrollTop).toBe(0);
    dialog().close();
    await settle(el);
    // The schedule too: the names and the chart side by side, the chart scrolling inside its own box.
    const plan = await editor(PLAN);
    expect(document.documentElement.scrollWidth).toBeLessThanOrEqual(390);
    const scroller = plan.el.querySelector<HTMLElement>('.cal-gantt-scroll')!;
    expect(scroller.scrollWidth).toBeGreaterThan(scroller.clientWidth);
    for (const r of plan.el.querySelectorAll<HTMLElement>('.cal-task')) expect(r.getBoundingClientRect().height).toBeGreaterThanOrEqual(44);
  } finally {
    await page.viewport(1100, 800);
  }
});
