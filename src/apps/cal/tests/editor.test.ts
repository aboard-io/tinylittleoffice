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
  // At the top, whatever a test before left scrolled (the page is the size of everything's taller).
  window.scrollTo(0, 0);
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
const trow = (el: HTMLElement, at: number) => el.querySelector<HTMLElement>(`.cal-trow[data-at="${at}"]`)!;
const words = (el: HTMLElement, at: number) => trow(el, at).querySelector<ToText>('to-text')!;
const names = (el: HTMLElement) => [...el.querySelectorAll('.cal-trow to-text')].map((x) => x.textContent!.trim());
const ranged = (el: HTMLElement) => [...el.querySelectorAll<HTMLElement>('.cal-trow.ranged')].map((r) => Number(r.dataset.at));
const contextButton = (el: HTMLElement, label: string) => el.querySelector<HTMLButtonElement>(`.cal-context button[aria-label="${label}"]`)!;
const contextOpen = (el: HTMLElement) => !!el.querySelector('.cal-context .to-context')?.matches(':popover-open');
/** A key on what has the focus: a task's words, the tasks' box, a day, an entry. */
async function key(el: ToCalEditor, on: Element, k: string, more: KeyboardEventInit = {}) {
  on.dispatchEvent(new KeyboardEvent('keydown', { key: k, bubbles: true, cancelable: true, composed: true, ...more }));
  await settle(el);
}
/** The caret into a task's words at `offset`. */
async function caretAt(el: ToCalEditor, at: number, offset: number) {
  const tx = words(el, at);
  tx.focus();
  tx.sel = { anchor: { block: 0, offset }, focus: { block: 0, offset } };
  await settle(el);
  return tx;
}
async function input(el: ToCalEditor, tx: ToText, inputType: string, data?: string) {
  tx.tx.dispatchEvent(new InputEvent('beforeinput', { inputType, data, bubbles: true, cancelable: true, composed: true }));
  await settle(el);
}
async function clip(el: ToCalEditor, type: 'copy' | 'cut' | 'paste', on: Element, data: Record<string, string> = {}) {
  const dt = new DataTransfer();
  for (const [k, v] of Object.entries(data)) dt.setData(k, v);
  on.dispatchEvent(new ClipboardEvent(type, { clipboardData: dt, bubbles: true, cancelable: true }));
  await settle(el);
  return dt;
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

test('the schedule: the head says so; a bar dragged moves its task, its end (44px to hit, past the bar) makes it longer', async () => {
  const { el, last } = await editor(DOC);
  await pick(el, el.querySelector<HTMLElement>('to-menu.cal-view > button')!, 'Schedule');
  expect(last()).toBe(DOC.replace('green: Sam\n', 'green: Sam\nview: gantt\n'));
  const fresh = await editor(PLAN);
  const e2 = fresh.el;
  expect(names(e2)).toEqual(['Design', 'Sketch', 'Draw', 'Build']);
  expect(trow(e2, 0).classList.contains('parent')).toBe(true);
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
  // Draw, a day longer by its end; the end's hit area is 44px and reaches past the bar.
  const grip = e2.querySelector<SVGRectElement>('.grip[data-at="2"]')!;
  const g = grip.getBoundingClientRect();
  expect(g.width).toBeGreaterThanOrEqual(44);
  expect(g.height).toBeGreaterThanOrEqual(44);
  expect(g.right).toBeGreaterThan(e2.querySelector('.track[data-at="2"]')!.getBoundingClientRect().right + 20);
  const [gx, gy] = centre(grip);
  pointer(grip, 'pointerdown', gx, gy);
  pointer(svgEl, 'pointermove', gx + 24, gy);
  pointer(svgEl, 'pointerup', gx + 24, gy);
  await settle(e2);
  expect(fresh.last()).toContain('  - 2027-03-03 to 2027-03-06: Draw\n');
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
    for (const f of dialog().querySelectorAll<HTMLElement>('input:not([type=checkbox]), select')) expect(parseFloat(getComputedStyle(f).fontSize)).toBeGreaterThanOrEqual(16);
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
    for (const r of plan.el.querySelectorAll<HTMLElement>('.cal-trow')) expect(r.getBoundingClientRect().height).toBeGreaterThanOrEqual(44);
    for (const b of plan.el.querySelectorAll<HTMLElement>('.cal-tick')) expect(Math.min(b.getBoundingClientRect().width, b.getBoundingClientRect().height)).toBeGreaterThanOrEqual(44);
    // The words have room beside the chart.
    expect(plan.el.querySelector('.cal-trow to-text')!.getBoundingClientRect().width).toBeGreaterThanOrEqual(60);
  } finally {
    await page.viewport(1100, 800);
  }
});

/* ---------- the editing standard (docs/editing.md) ---------- */

const G = '---\nview: gantt\n---\n';
const BUILD = '- 2027-03-08 to 2027-03-10: Build\n';

test('the bar ends with the kit\'s Undo and Redo; the month, its list and the tasks never zoom on a double tap, the grid pans only up and down', async () => {
  const { el } = await editor();
  const tools = [...el.querySelectorAll<HTMLButtonElement>('to-bar.cal-bar button')].filter((b) => b.closest('to-bar') === el.querySelector('to-bar.cal-bar') && !b.closest('[popover]'));
  expect(tools.slice(-2).map((b) => b.getAttribute('aria-label'))).toEqual(['Undo', 'Redo']);
  expect(getComputedStyle(el.querySelector('.cal-grid')!).touchAction).toBe('pan-y');
  expect(getComputedStyle(el.querySelector('.cal-agenda')!).touchAction).toBe('manipulation');
  const plan = await editor(PLAN);
  expect(getComputedStyle(plan.el.querySelector('.cal-tasks')!).touchAction).toBe('manipulation');
  expect(getComputedStyle(plan.el.querySelector('.cal-grip')!).touchAction).toBe('none');
});

test('Mod+Z with the dialog open is the field\'s: the calendar underneath is not undone and the draft stays', async () => {
  const { el, changes } = await editor();
  const launch = cell(el, '2027-03-01').querySelector<HTMLButtonElement>('.cal-chip')!;
  launch.focus();
  await key(el, launch, 'Delete');
  expect(changes.at(-1)).toBe(DOC.replace('- 2027-03-01: Launch\n', ''));
  cell(el, '2027-03-01').querySelector<HTMLButtonElement>('.cal-chip')!.click();
  await settle(el);
  await type(el, 'X');
  const n = changes.length;
  await undo(el);
  expect(changes).toHaveLength(n);
  expect(dialog().open).toBe(true);
  expect(label().tx.textContent).toContain('X');
  dialog().close();
  await settle(el);
  await undo(el);
  expect(changes.at(-1)).toBe(DOC);
});

test('the dialog gives the focus back to what opened it: the day, the entry, or the day when a tap on the cell opened it', async () => {
  const { el } = await editor();
  const n5 = cell(el, '2027-03-05').querySelector<HTMLButtonElement>('.cal-n')!;
  n5.focus();
  n5.click();
  await settle(el);
  expect(dialog().open).toBe(true);
  dialog().close();
  await settle(el);
  await until(() => document.activeElement === n5);
  // A tap on the cell itself (no focus to remember): its day's button.
  (document.activeElement as HTMLElement).blur();
  cell(el, '2027-03-06').click();
  await settle(el);
  dialog().close();
  await settle(el);
  await until(() => document.activeElement === cell(el, '2027-03-06').querySelector('.cal-n'));
  // An entry tapped (Safari does not focus a tapped button): the entry.
  (document.activeElement as HTMLElement).blur();
  cell(el, '2027-03-02').querySelector<HTMLButtonElement>('.cal-chip')!.click();
  await settle(el);
  dialog().close();
  await settle(el);
  await until(() => (document.activeElement as HTMLElement)?.matches('.cal-chip[data-at="1"]'));
});

test('Mod+Enter in the dialog is Done, in the words and in a field; Duplicate writes another beside it', async () => {
  const { el, last } = await editor();
  cell(el, '2027-03-05').click();
  await settle(el);
  await until(() => document.activeElement === label().tx);
  await type(el, 'Tea');
  await key(el, label().tx, 'Enter', { metaKey: true });
  expect(dialog().open).toBe(false);
  expect(last()).toBe(DOC.replace('- 2027-03-10', '- 2027-03-05: Tea\n- 2027-03-10'));
  cell(el, '2027-03-12').click();
  await settle(el);
  await type(el, 'Run');
  await key(el, dialog().querySelector('input[type=date]')!, 'Enter', { ctrlKey: true });
  expect(dialog().open).toBe(false);
  expect(last()).toContain('- 2027-03-12: Run\n');
  cell(el, '2027-03-01').querySelectorAll<HTMLButtonElement>('.cal-chip')[1].click();
  await settle(el);
  button(dialog(), 'Duplicate').click();
  await settle(el);
  expect(dialog().open).toBe(false);
  expect(last()!.match(/Offsite \{color=green\}/g)).toHaveLength(2);
});

test('the month by keys: one day in the tab order, the arrows walk days and weeks, PageDown/PageUp the months, Shift+arrows sweep days that Enter makes a span over', async () => {
  const { el, last } = await editor();
  const days = () => [...el.querySelectorAll<HTMLButtonElement>('.cal-n')];
  expect(days().filter((b) => b.tabIndex === 0)).toHaveLength(1);
  const n = (iso: string) => cell(el, iso).querySelector<HTMLButtonElement>('.cal-n')!;
  expect(n('2027-03-01').tabIndex).toBe(0);
  n('2027-03-01').focus();
  await key(el, n('2027-03-01'), 'ArrowRight');
  expect(document.activeElement).toBe(n('2027-03-02'));
  await key(el, n('2027-03-02'), 'ArrowDown');
  expect(document.activeElement).toBe(n('2027-03-09'));
  expect(n('2027-03-09').tabIndex).toBe(0);
  await key(el, n('2027-03-09'), 'PageDown');
  expect(el.querySelector('.to-datenav-label')!.textContent).toBe('April 2027');
  expect(document.activeElement).toBe(n('2027-04-09'));
  await key(el, n('2027-04-09'), 'PageUp');
  expect(document.activeElement).toBe(n('2027-03-09'));
  await key(el, n('2027-03-09'), 'ArrowRight', { shiftKey: true });
  await key(el, n('2027-03-10'), 'ArrowRight', { shiftKey: true });
  expect(['09', '10', '11'].every((d) => cell(el, `2027-03-${d}`).classList.contains('range'))).toBe(true);
  await key(el, n('2027-03-11'), 'Enter');
  expect(dialog().open).toBe(true);
  await type(el, 'Fair');
  button(dialog(), 'Done').click();
  await settle(el);
  expect(last()).toBe(DOC.replace('- 2027-03-10', '- 2027-03-09 to 2027-03-11: Fair\n- 2027-03-10'));
});

test('a focused entry is the thing in hand: Delete takes it out (the focus stays near, an undo brings back its month and its focus), Mod+D makes another', async () => {
  const { el, last } = await editor();
  const launch = cell(el, '2027-03-01').querySelector<HTMLButtonElement>('.cal-chip')!;
  launch.focus();
  await key(el, launch, 'Backspace');
  expect(last()).toBe(DOC.replace('- 2027-03-01: Launch\n', ''));
  expect((document.activeElement as HTMLElement).matches('.cal-chip')).toBe(true);
  button(el, 'Next month').click();
  await settle(el);
  await undo(el);
  expect(last()).toBe(DOC);
  expect(el.querySelector('.to-datenav-label')!.textContent).toBe('March 2027');
  expect((document.activeElement as HTMLElement).matches('.cal-chip[data-at="0"]')).toBe(true);
  const offsite = cell(el, '2027-03-01').querySelectorAll<HTMLButtonElement>('.cal-chip')[1];
  offsite.focus();
  await key(el, offsite, 'd', { ctrlKey: true });
  expect(last()).toBe(DOC.replace('- 2027-03-10', '- 2027-03-01 to 2027-03-03: Offsite {color=green}\n- 2027-03-10'));
  // In the month's list too.
  const item = el.querySelector<HTMLButtonElement>('.cal-agenda-item[data-at="0"]')!;
  item.focus();
  await key(el, item, 'Delete');
  expect(last()).not.toContain('Launch');
});

test('an entry is copied and cut as TLO and our HTML; a paste onto a day lands there, words alone as an event that day', async () => {
  const { el, last } = await editor();
  const offsite = cell(el, '2027-03-01').querySelectorAll<HTMLButtonElement>('.cal-chip')[1];
  offsite.focus();
  const dt = await clip(el, 'copy', offsite);
  expect(dt.getData('text/plain')).toBe('- 2027-03-01 to 2027-03-03: Offsite {color=green}\n');
  expect(dt.getData('text/html')).toContain('TinyLittleOffice');
  const launch = cell(el, '2027-03-01').querySelector<HTMLButtonElement>('.cal-chip')!;
  launch.focus();
  const cut = await clip(el, 'cut', launch);
  expect(cut.getData('text/plain')).toBe('- 2027-03-01: Launch\n');
  expect(last()).toBe(DOC.replace('- 2027-03-01: Launch\n', ''));
  const day = cell(el, '2027-03-20').querySelector<HTMLButtonElement>('.cal-n')!;
  day.focus();
  await clip(el, 'paste', day, { 'text/plain': dt.getData('text/plain'), 'text/html': dt.getData('text/html') });
  expect(last()).toBe(DOC.replace('- 2027-03-01: Launch\n', '') + '- 2027-03-20 to 2027-03-22: Offsite {color=green}\n');
  await clip(el, 'paste', cell(el, '2027-03-21').querySelector('.cal-n')!, { 'text/plain': 'Picnic' });
  expect(last()).toContain('- 2027-03-21: Picnic\n');
});

test('a task\'s words are typed in place, one undo a burst; Enter at the end makes the next task, in the middle splits; Backspace joins, and takes an empty task away', async () => {
  const { el, last } = await editor(PLAN);
  let tx = await caretAt(el, 3, 5);
  await input(el, tx, 'insertText', 'e');
  await input(el, tx, 'insertText', 'r');
  expect(last()).toBe(PLAN.replace(': Build', ': Builder'));
  await undo(el);
  expect(last()).toBe(PLAN);
  await until(() => words(el, 3).contains(document.activeElement) || document.activeElement === words(el, 3).tx);
  expect(words(el, 3).sel?.focus.offset).toBe(5);
  tx = await caretAt(el, 3, 5);
  await input(el, tx, 'insertParagraph');
  expect(last()).toBe(PLAN + '- 2027-03-08 to 2027-03-10:\n');
  expect(words(el, 4).sel?.focus.offset).toBe(0);
  await input(el, words(el, 4), 'deleteContentBackward');
  expect(last()).toBe(PLAN);
  expect(words(el, 3).sel?.focus.offset).toBe(5);
  tx = await caretAt(el, 0, 3);
  await input(el, tx, 'insertParagraph');
  expect(last()).toBe(PLAN.replace('Design\n', 'Des\n- 2027-03-01 to 2027-03-05: ign\n'));
  await input(el, words(el, 1), 'deleteContentBackward');
  expect(last()).toBe(PLAN);
  expect(words(el, 0).sel?.focus.offset).toBe(3);
});

test('keys in a task\'s words: Tab nests it, Alt+arrows move it (the caret kept, an undo puts it back), the arrows go between tasks, Mod+D, Mod+Enter ticks, Mod+Alt+arrows move it a day', async () => {
  const { el, last } = await editor(PLAN);
  let tx = await caretAt(el, 3, 2);
  await key(el, tx, 'Tab');
  expect(last()).toBe(PLAN.replace(BUILD, '  ' + BUILD));
  expect(words(el, 3).sel?.focus.offset).toBe(2);
  await key(el, words(el, 3), 'Tab', { shiftKey: true });
  expect(last()).toBe(PLAN);
  tx = await caretAt(el, 1, 1);
  await key(el, tx, 'ArrowDown', { altKey: true });
  expect(names(el)).toEqual(['Design', 'Draw', 'Sketch', 'Build']);
  expect(words(el, 2).sel?.focus.offset).toBe(1);
  await undo(el);
  expect(last()).toBe(PLAN);
  expect(words(el, 1).sel?.focus.offset).toBe(1);
  tx = await caretAt(el, 0, 2);
  await key(el, tx, 'ArrowDown');
  await until(() => words(el, 1).contains(document.activeElement));
  expect(words(el, 1).sel?.focus.offset).toBe(2);
  tx = await caretAt(el, 3, 0);
  await key(el, tx, 'd', { metaKey: true });
  expect(last()).toBe(PLAN + BUILD);
  await undo(el);
  await key(el, words(el, 2), 'Enter', { ctrlKey: true });
  expect(last()).toContain('  - [x] 2027-03-03 to 2027-03-05: Draw\n');
  await undo(el);
  await key(el, words(el, 3), 'ArrowRight', { ctrlKey: true, altKey: true });
  expect(last()).toBe(PLAN.replace(BUILD, '- 2027-03-09 to 2027-03-11: Build\n'));
  // Alt+Enter: the task's dates, in the dialog.
  await key(el, words(el, 3), 'Enter', { altKey: true });
  expect(dialog().open).toBe(true);
  expect(document.querySelector('to-dialog.cal-dialog h2')!.textContent).toBe('Edit task');
  dialog().close();
  await settle(el);
  // The focus back in the words it came from.
  await until(() => words(el, 3).hasFocus());
});

test('a tap on a task\'s grip chooses it with its parts; the bar under it in the standard\'s order; its keys and buttons act on the chosen tasks, and an undo chooses them again', async () => {
  const { el, last } = await editor(PLAN);
  trow(el, 0).querySelector<HTMLButtonElement>('.cal-grip')!.click();
  await settle(el);
  expect(ranged(el)).toEqual([0, 1, 2]);
  expect(trow(el, 0).querySelector('.cal-grip')!.getAttribute('aria-pressed')).toBe('true');
  await until(() => contextOpen(el));
  const labels = [...el.querySelectorAll('.cal-context button')].map((b) => b.getAttribute('aria-label'));
  expect(labels).toEqual(['Edit', 'Move up', 'Move down', 'A day earlier', 'A day later', 'Dates…', 'Indent', 'Bring out', 'Duplicate', 'Copy', 'Cut', 'Paste', 'Delete']);
  expect(contextButton(el, 'Move up').disabled).toBe(true);
  contextButton(el, 'Move down').click();
  await settle(el);
  expect(names(el)).toEqual(['Build', 'Design', 'Sketch', 'Draw']);
  expect(ranged(el)).toEqual([1, 2, 3]);
  await undo(el);
  expect(last()).toBe(PLAN);
  expect(ranged(el)).toEqual([0, 1, 2]);
  const box = el.querySelector<HTMLElement>('.cal-tasks')!;
  await key(el, box, 'Delete');
  expect(last()).toBe(G + BUILD);
  await undo(el);
  expect(last()).toBe(PLAN);
  expect(ranged(el)).toEqual([0, 1, 2]);
  // Build chosen: Mod+D, a day earlier by Mod+Alt+Left, Indent from the bar.
  trow(el, 3).querySelector<HTMLButtonElement>('.cal-grip')!.click();
  await settle(el);
  await key(el, box, 'd', { metaKey: true });
  expect(last()).toBe(PLAN + BUILD);
  expect(ranged(el)).toEqual([4]);
  await key(el, box, 'ArrowLeft', { ctrlKey: true, altKey: true });
  expect(last()).toBe(PLAN + '- 2027-03-07 to 2027-03-09: Build\n');
  contextButton(el, 'Indent').click();
  await settle(el);
  expect(last()).toBe(PLAN + '  - 2027-03-07 to 2027-03-09: Build\n');
  // Escape lets go, to the caret.
  await key(el, box, 'Escape');
  expect(ranged(el)).toEqual([]);
  // Mod+A with a task's words whole takes every task.
  const tx = words(el, 0);
  tx.focus();
  tx.sel = { anchor: { block: 0, offset: 0 }, focus: { block: 0, offset: 6 } };
  await settle(el);
  await key(el, tx.tx, 'a', { metaKey: true });
  expect(ranged(el)).toEqual([0, 1, 2, 3, 4]);
});

test('chosen tasks are copied, cut and pasted as TLO and our HTML; lines pasted into a task\'s words are tasks after it', async () => {
  const { el, last } = await editor(PLAN);
  const box = el.querySelector<HTMLElement>('.cal-tasks')!;
  trow(el, 1).querySelector<HTMLButtonElement>('.cal-grip')!.click();
  await settle(el);
  const dt = await clip(el, 'copy', box);
  expect(dt.getData('text/plain')).toBe('- 2027-03-01 to 2027-03-02: Sketch {done=50%}\n');
  expect(dt.getData('text/html')).toContain('TinyLittleOffice');
  await clip(el, 'cut', box);
  expect(names(el)).toEqual(['Design', 'Draw', 'Build']);
  trow(el, 2).querySelector<HTMLButtonElement>('.cal-grip')!.click();
  await settle(el);
  await clip(el, 'paste', box, { 'text/plain': dt.getData('text/plain'), 'text/html': dt.getData('text/html') });
  expect(last()).toBe(`${G}- 2027-03-01 to 2027-03-05: Design\n  - 2027-03-03 to 2027-03-05: Draw\n- 2027-03-01 to 2027-03-02: Sketch {done=50%}\n`);
  const tx = await caretAt(el, 0, 6);
  await clip(el, 'paste', tx.tx, { 'text/plain': 'Test\nShip' });
  expect(last()).toBe(`${G}- 2027-03-01 to 2027-03-05: Design\n  - 2027-03-03 to 2027-03-05: Draw\n- 2027-03-01: Test\n- 2027-03-01: Ship\n- 2027-03-01 to 2027-03-02: Sketch {done=50%}\n`);
});

test('a task carried by its grip (pointer events) goes under another; the tick on a row (44px) says it is done', async () => {
  const { el, last } = await editor(PLAN);
  const grip = trow(el, 3).querySelector<HTMLElement>('.cal-grip')!;
  const h = grip.getBoundingClientRect();
  const d = trow(el, 0).getBoundingClientRect();
  const at = (type: string, x: number, y: number) => grip.dispatchEvent(new PointerEvent(type, { bubbles: true, cancelable: true, pointerId: 9, isPrimary: true, button: 0, pointerType: 'mouse', clientX: x, clientY: y }));
  at('pointerdown', h.left + 4, h.top + 4);
  at('pointermove', d.right - 10, d.top + d.height / 2);
  await settle(el);
  expect(el.rows.drag).toMatchObject({ id: 3, over: 0, how: 'under' });
  expect(trow(el, 3).classList.contains('dragging')).toBe(true);
  at('pointerup', d.right - 10, d.top + d.height / 2);
  await settle(el);
  expect(last()).toBe(PLAN.replace(BUILD, '  ' + BUILD));
  await undo(el);
  const tick = trow(el, 2).querySelector<HTMLButtonElement>('.cal-tick')!;
  expect(tick.getBoundingClientRect().width).toBeGreaterThanOrEqual(44);
  expect(tick.getAttribute('aria-checked')).toBe('false');
  tick.click();
  await settle(el);
  expect(last()).toContain('  - [x] 2027-03-03 to 2027-03-05: Draw\n');
  expect(trow(el, 2).querySelector('.cal-tick')!.getAttribute('aria-checked')).toBe('true');
  trow(el, 2).querySelector<HTMLButtonElement>('.cal-tick')!.click();
  await settle(el);
  expect(last()).toBe(PLAN);
  expect(trow(el, 0).querySelector('.cal-tick')).toBeNull();
});

test('the What field is one line: Markdown markers typed there stay words, and a footnote in an entry\'s words goes round the dialog unchanged', async () => {
  const { el, last } = await editor();
  cell(el, '2027-03-05').click();
  await settle(el);
  await until(() => document.activeElement === label().tx);
  await type(el, '# - Gig');
  button(dialog(), 'Done').click();
  await settle(el);
  expect(last()).toContain('- 2027-03-05: # - Gig\n');
  const noted = DOC.replace(': Launch', ': Launch^[bring cash]');
  const n = await editor(noted);
  cell(n.el, '2027-03-01').querySelector<HTMLButtonElement>('.cal-chip')!.click();
  await settle(n.el);
  expect(label().querySelector('.fn')).not.toBeNull();
  button(dialog(), 'Done').click();
  await settle(n.el);
  expect(n.last()).toBe(noted);
});

test('§1 opens with the focus on today\'s day, else the shown month\'s first; a Gantt chart in its first task\'s words; the page not scrolled', async () => {
  const { el: blank } = await editor('');
  await settle(blank);
  await blank.focusFirst();
  expect(document.activeElement).toBe(blank.querySelector('.cal-cell.today .cal-n'));
  const { el } = await editor();
  await settle(el);
  await el.focusFirst();
  expect(document.activeElement).toBe(cell(el, '2027-03-01').querySelector('.cal-n'));
  const { el: plan } = await editor(PLAN);
  await settle(plan);
  await plan.focusFirst();
  await until(() => !!plan.querySelector<ToText>('.cal-trow to-text')?.hasFocus());
  expect(plan.querySelector<ToText>('.cal-trow to-text')!.sel?.focus.offset).toBe('Design'.length);
  expect(document.scrollingElement!.scrollTop).toBe(0);
});
