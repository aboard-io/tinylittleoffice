// Todo as a view of the document, each command as the ops it produces, and the files: under node, no DOM.
import { expect, test } from 'vitest';
import { applyAll, invertAll, parse, write, type Op } from '../../../doc/index.ts';
import def from '../def.ts';
import { addAfter, asTasks, clearDone, dueOf, duplicateTasks, enterAt, joinTasks, moveOver, moveTasks, pastesAsTasks, pasteTasks, readTodo, removeTask, removeTasks, setDone, setDue, setStar, shifted, textTasks, today } from '../model.ts';
import { todoPage, todoToIcs, todoToMarkdown } from '../view.ts';
import { templates } from '../templates.ts';

const LIST = '- [x] Buy milk\n- [ ] Call 日本 {.star due=2020-02-01}\n- [ ] Pay rent {due=2027-03-01}\n';
const run = (text: string, ops: (v: ReturnType<typeof readTodo>) => Op[]) => {
  const doc = parse(text);
  const made = ops(readTodo(doc));
  const out = applyAll(doc, made);
  // Every command can be taken back exactly.
  expect(applyAll(out, invertAll(doc, made))).toEqual(doc);
  return { ops: made, text: write(out) };
};

test('read: a task per list item, with its star, its date, its words', () => {
  const v = readTodo(parse(LIST));
  expect(v.tasks.map((t) => [t.at, t.done, t.star, t.due, t.words])).toEqual([
    [0, true, false, '', 'Buy milk'],
    [1, false, true, '2020-02-01', 'Call 日本'],
    [2, false, false, '2027-03-01', 'Pay rent'],
  ]);
  expect(v.ticked).toBe(1);
  // Other blocks are left alone, and the indices count them.
  expect(readTodo(parse('# Errands\n\n- [ ] one\n\nA note.\n\n- [ ] two\n')).tasks.map((t) => t.at)).toEqual([1, 3]);
  expect(readTodo(parse('')).tasks).toEqual([]);
  expect(dueOf('2027-02-30')).toBe('');
  expect(dueOf('soon')).toBe('');
  expect(readTodo(parse('- [ ] x {due=2027-02-30}\n')).tasks[0].due).toBe('');
  expect(today(new Date(2027, 2, 1))).toBe('2027-03-01');
});

test('tick, star and due are one replaced item each; nothing changed is no ops', () => {
  expect(run(LIST, (v) => setDone(v.tasks[1], true)).text).toBe('- [x] Buy milk\n- [x] Call 日本 {.star due=2020-02-01}\n- [ ] Pay rent {due=2027-03-01}\n');
  expect(run(LIST, (v) => setStar(v.tasks[2], true)).text).toContain('- [ ] Pay rent {.star due=2027-03-01}');
  expect(run(LIST, (v) => setStar(v.tasks[1], false)).text).toContain('- [ ] Call 日本 {due=2020-02-01}');
  expect(run(LIST, (v) => setDue(v.tasks[1], '')).text).toContain('- [ ] Call 日本 {.star}\n');
  expect(run(LIST, (v) => setDue(v.tasks[0], '2027-05-06')).text).toContain('- [x] Buy milk {due=2027-05-06}\n');
  expect(run('- [ ] a {.star}\n', (v) => setStar(v.tasks[0], false)).text).toBe('- [ ] a\n');
  expect(run('- [ ] a {#x .wide due=2027-01-01}\n', (v) => setStar(v.tasks[0], true)).text).toBe('- [ ] a {#x .star .wide due=2027-01-01}\n');
  expect(run(LIST, (v) => setDone(v.tasks[0], true)).ops).toEqual([]);
  expect(run(LIST, (v) => setDue(v.tasks[1], 'not a date')).ops).toEqual([{ op: 'splice', at: 1, n: 1, blocks: [expect.objectContaining({ k: 'li' })] }]);
});

test('add, remove, clear done and move are splices and one move', () => {
  expect(run(LIST, () => addAfter(0)).text).toBe('- [x] Buy milk\n- [ ]\n- [ ] Call 日本 {.star due=2020-02-01}\n- [ ] Pay rent {due=2027-03-01}\n');
  expect(run(LIST, () => addAfter(-1)).text.startsWith('- [ ]\n- [x] Buy milk')).toBe(true);
  expect(run(LIST, (v) => removeTask(v.tasks[1])).text).toBe('- [x] Buy milk\n- [ ] Pay rent {due=2027-03-01}\n');
  expect(run('- [x] a\n- [ ] b\n- [x] c\n', (v) => clearDone(v)).text).toBe('- [ ] b\n');
  const down = run(LIST, (v) => moveOver(v.tasks[0], v.tasks[1]));
  expect(down.ops).toEqual([{ op: 'move', at: 0, n: 1, to: 1 }]);
  expect(down.text).toBe('- [ ] Call 日本 {.star due=2020-02-01}\n- [x] Buy milk\n- [ ] Pay rent {due=2027-03-01}\n');
  expect(run(LIST, (v) => moveOver(v.tasks[2], v.tasks[1])).text).toBe('- [x] Buy milk\n- [ ] Pay rent {due=2027-03-01}\n- [ ] Call 日本 {.star due=2020-02-01}\n');
});

test('ops from an editor over one block are carried to where the block is', () => {
  const text: Op = { op: 'text', at: 0, from: 0, to: 0, runs: [{ t: 'x' }] };
  expect(shifted([text, { op: 'head', key: 'title', value: 'a' }, { op: 'move', at: 0, n: 1, to: 2 }], 3)).toEqual([{ ...text, at: 3 }, { op: 'head', key: 'title', value: 'a' }, { op: 'move', at: 3, n: 1, to: 5 }]);
  const typed = applyAll(parse('- [ ] a\n- [ ] b\n'), shifted([{ op: 'text', at: 0, from: 1, to: 1, runs: [{ t: '!' }] }], 1));
  expect(write(typed)).toBe('- [ ] a\n- [ ] b!\n');
});

test('the page: a row a task, the done struck through, the date at the right', () => {
  const page = todoPage(parse(LIST));
  expect(page.w).toBe(720);
  expect(page.svg).toContain('Buy milk');
  expect(page.svg).toContain('2020-02-01');
  expect(page.svg).toContain('★ Call 日本');
  expect(page.alt).toBe('1 of 3: ☑ Buy milk; ☐ Call 日本; ☐ Pay rent');
  expect(todoPage(parse(LIST), 1).alt).toBe('1 of 1: ☑ Buy milk');
  expect(todoPage(parse('')).h).toBe(120);
  // Taller as it wraps.
  expect(todoPage(parse(`- [ ] ${'word '.repeat(40)}\n`)).h).toBeGreaterThan(todoPage(parse('- [ ] one\n')).h);
});

test('Markdown: a task list, a star in bold, a date after the words', () => {
  expect(todoToMarkdown(parse(LIST))).toBe('- [x] Buy milk\n- [ ] **Call 日本** (due 2020-02-01)\n- [ ] Pay rent (due 2027-03-01)\n');
  expect(todoToMarkdown(parse('- [ ] a **b**\n'))).toBe('- [ ] a **b**\n');
  expect(todoToMarkdown(parse(''))).toBe('');
});

test('iCalendar: a VTODO each, done or not, due on its day, a star the first priority', () => {
  const ics = todoToIcs(parse(LIST), Date.UTC(2026, 0, 2, 3, 4));
  expect(ics).toContain('BEGIN:VTODO\r\nUID:t0-@tinylittleoffice\r\nDTSTAMP:20260102T030400Z\r\nSUMMARY:Buy milk\r\nSTATUS:COMPLETED\r\nEND:VTODO');
  expect(ics).toContain('SUMMARY:Call 日本\r\nSTATUS:NEEDS-ACTION\r\nDUE;VALUE=DATE:20200201\r\nPRIORITY:1\r\nEND:VTODO');
  expect(ics.startsWith('BEGIN:VCALENDAR\r\nVERSION:2.0\r\n')).toBe(true);
  expect(ics.endsWith('END:VCALENDAR\r\n')).toBe(true);
  // Commas and semicolons are escaped; long lines are folded at 75 octets.
  const long = todoToIcs(parse(`- [ ] a, b; c ${'日本'.repeat(30)}\n`), 0);
  expect(long).toContain('SUMMARY:a\\, b\\; c ');
  for (const line of long.split('\r\n')) expect(new TextEncoder().encode(line).length).toBeLessThanOrEqual(75);
});

test('the definition: a blank list is one empty task; the templates are canonical and real', () => {
  expect(def.id).toBe('todo');
  expect(readTodo(parse(def.blank())).tasks).toHaveLength(1);
  expect(write(parse(def.blank()))).toBe(def.blank());
  expect(templates().map((t) => t.id)).toEqual(['week', 'daily', 'shopping', 'groceries', 'reading', 'trip', 'garden', 'launch', 'onboarding', 'moveout', 'wedding']);
  for (const tpl of templates()) {
    expect(write(parse(tpl.doc))).toBe(tpl.doc);
    // Each its own name, some done and some not, a star somewhere, every date a real one, no placeholder words.
    expect(def.title(tpl.doc)).not.toBe('');
    expect(tpl.name && tpl.blurb).toBeTruthy();
    const v = readTodo(parse(tpl.doc));
    expect(v.tasks.length).toBeGreaterThan(6);
    expect(v.ticked).toBeGreaterThan(0);
    expect(v.ticked).toBeLessThan(v.tasks.length);
    expect(v.tasks.some((x) => x.star)).toBe(true);
    for (const x of v.tasks) expect(x.words.trim()).not.toBe('');
    for (const m of tpl.doc.matchAll(/due=(\S+?)\}/g)) expect(dueOf(m[1])).toBe(m[1]);
    expect(tpl.doc).not.toMatch(/lorem|\bTODO\b|your name|example\.com/i);
    expect(def.view(tpl.doc)).toHaveLength(1);
  }
  expect(def.retitle('- [ ] a\n', 'Errands')).toBe('---\ntitle: Errands\n---\n- [ ] a\n');
  expect(def.title(def.retitle('', 'Errands'))).toBe('Errands');
  expect(def.exports!.map((e) => e.ext)).toEqual(['md', 'ics']);
});

test('enterAt: at the start the task is pushed down, at the end a new one, in the middle the words split into an open task', () => {
  const L = '- [x] Buy **milk** {.star due=2027-01-02}\n- [ ] two\n';
  const v = readTodo(parse(L));
  const start = enterAt(v.tasks[0], 0);
  expect(run(L, () => start.ops).text).toBe('- [ ]\n- [x] Buy **milk** {.star due=2027-01-02}\n- [ ] two\n');
  expect([start.at, start.offset]).toEqual([1, 0]);
  const end = enterAt(v.tasks[0], 8);
  expect(run(L, () => end.ops).text).toBe('- [x] Buy **milk** {.star due=2027-01-02}\n- [ ]\n- [ ] two\n');
  const mid = enterAt(v.tasks[0], 6);
  expect(run(L, () => mid.ops).text).toBe('- [x] Buy **mi** {.star due=2027-01-02}\n- [ ] **lk**\n- [ ] two\n');
  expect([mid.at, mid.offset]).toEqual([1, 0]);
  // The space where the words part goes.
  expect(run('- [ ] Buy milk\n', (w) => enterAt(w.tasks[0], 4).ops).text).toBe('- [ ] Buy\n- [ ] milk\n');
  // An empty task: Enter at its start is its end.
  expect(run('- [ ]\n', (w) => enterAt(w.tasks[0], 0).ops).text).toBe('- [ ]\n- [ ]\n');
});

test('joinTasks: the later words onto the earlier task, which keeps its tick, star and date; the caret at the join', () => {
  const L = '- [ ] one {.star}\n\nA note.\n\n- [x] *two*\n';
  const v = readTodo(parse(L));
  const r = joinTasks(v.tasks[0], v.tasks[1]);
  expect(run(L, () => r.ops).text).toBe('- [ ] one*two* {.star}\n\nA note.\n');
  expect([r.at, r.offset]).toEqual([0, 3]);
});

test('removeTasks, moveTasks, duplicateTasks: several tasks at once, each undone exactly', () => {
  const L = '- [ ] a\n- [ ] b\n- [ ] c\n- [ ] d\n';
  expect(run(L, () => removeTasks([1, 3, 1])).text).toBe('- [ ] a\n- [ ] c\n');
  const v = readTodo(parse(L));
  const [a, b, c, d] = v.tasks;
  const down = moveTasks([b, c], d, 1);
  expect(run(L, () => down.ops).text).toBe('- [ ] a\n- [ ] d\n- [ ] b\n- [ ] c\n');
  expect(down.ats).toEqual([2, 3]);
  const up = moveTasks([b, c], a, -1);
  expect(run(L, () => up.ops).text).toBe('- [ ] b\n- [ ] c\n- [ ] a\n- [ ] d\n');
  expect(up.ats).toEqual([0, 1]);
  // Apart (a filter hid what is between): they land together.
  const apart = moveTasks([a, c], d, 1);
  expect(run(L, () => apart.ops).text).toBe('- [ ] b\n- [ ] d\n- [ ] a\n- [ ] c\n');
  expect(apart.ats).toEqual([2, 3]);
  const dup = duplicateTasks([b, c]);
  expect(run(L, () => dup.ops).text).toBe('- [ ] a\n- [ ] b\n- [ ] c\n- [ ] b\n- [ ] c\n- [ ] d\n');
  expect(dup.at).toBe(3);
  // An id names one block: the copy has none.
  expect(run('- [ ] x {#k .star}\n', (w) => duplicateTasks(w.tasks).ops).text).toBe('- [ ] x {#k .star}\n- [ ] x {.star}\n');
});

test('paste: lines and items are tasks; in place of chosen tasks, after a task (in place of an empty one), or at the end', () => {
  expect(pastesAsTasks('one')).toBe(false);
  expect(pastesAsTasks('- one')).toBe(true);
  expect(pastesAsTasks('one\n\ntwo')).toBe(true);
  expect(write({ head: {}, blocks: textTasks('Eggs\n\n- [x] Milk {.star}\n# Bread\n* jam') })).toBe('- [ ] Eggs\n- [x] Milk {.star}\n- [ ] Bread\n- [ ] jam\n');
  expect(asTasks(parse('# A\n\n  - [ ] b\n\n```table\na\n```\n').blocks).map((b) => [b.depth, write({ head: {}, blocks: [b] })])).toEqual([
    [0, '- [ ] A\n'],
    [0, '- [ ] b\n'],
  ]);
  const L = '- [ ] a\n- [ ]\n- [ ] c\n';
  const tasks = textTasks('x\ny');
  const v = readTodo(parse(L));
  const after = pasteTasks(v, parse(L), tasks, 0)!;
  expect(run(L, () => after.ops).text).toBe('- [ ] a\n- [ ] x\n- [ ] y\n- [ ]\n- [ ] c\n');
  expect([after.from, after.to]).toEqual([1, 3]);
  expect(run(L, (w) => pasteTasks(w, parse(L), tasks, 1)!.ops).text).toBe('- [ ] a\n- [ ] x\n- [ ] y\n- [ ] c\n');
  expect(run(L, (w) => pasteTasks(w, parse(L), tasks, [0, 2])!.ops).text).toBe('- [ ] x\n- [ ] y\n- [ ]\n');
  expect(run(L, (w) => pasteTasks(w, parse(L), tasks, null)!.ops).text).toBe('- [ ] a\n- [ ]\n- [ ] c\n- [ ] x\n- [ ] y\n');
  expect(pasteTasks(v, parse(L), [], 0)).toBeNull();
});
