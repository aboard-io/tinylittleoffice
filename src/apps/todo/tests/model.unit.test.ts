// Todo as a view of the document, each command as the ops it produces, and the files: under node, no DOM.
import { expect, test } from 'vitest';
import { applyAll, invertAll, parse, write, type Op } from '../../../doc/index.ts';
import def from '../def.ts';
import { addAfter, clearDone, dueOf, moveOver, readTodo, removeTask, setDone, setDue, setStar, shifted, today } from '../model.ts';
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
  expect(templates().map((t) => t.id)).toEqual(['week', 'shopping', 'trip']);
  for (const tpl of templates()) {
    expect(write(parse(tpl.doc))).toBe(tpl.doc);
    expect(readTodo(parse(tpl.doc)).tasks.length).toBeGreaterThan(4);
    expect(def.view(tpl.doc)).toHaveLength(1);
  }
  expect(def.retitle('- [ ] a\n', 'Errands')).toBe('---\ntitle: Errands\n---\n- [ ] a\n');
  expect(def.title(def.retitle('', 'Errands'))).toBe('Errands');
  expect(def.exports!.map((e) => e.ext)).toEqual(['md', 'ics']);
});
