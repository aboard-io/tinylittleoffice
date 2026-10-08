// Undo and redo, which are the shell's, in every kind of editor (ported from e2e/shell.spec.ts).
import { test, expect } from 'vitest';
import { passTime } from './env-shell.ts';
import { open, reopen, idle, until, $, $$, text, tap, fill, key, button, press, poke, write, cell, body } from './helpers-shell.ts';
import { encodeEnvelope } from '../../src/lib/envelope.ts';

const undo = () => button('Undo');
const redo = () => button('Redo');
const off = (b: HTMLElement) => b.hasAttribute('disabled');
/** Changes a moment apart are separate steps; a burst of typing is one. */
const pause = () => passTime(800);

test('todo: undone and redone with the keyboard, and the link follows', async () => {
  await open('#/v0/todo');
  expect(off(undo())).toBe(true);
  const add = $('sl-input.todo-new');
  for (const t of ['One', 'Two']) {
    fill(add, t);
    add.dispatchEvent(new KeyboardEvent('keydown', { key: 'Enter', bubbles: true }));
    await idle();
    pause();
  }
  const rows = () => $$('.todo-list li');
  const box = rows()[0].querySelector('sl-checkbox') as HTMLElement & { checked: boolean };
  box.checked = true;
  box.dispatchEvent(new CustomEvent('sl-change', { bubbles: true, composed: true }));
  await idle();
  expect(rows()[0].classList.contains('done')).toBe(true);
  await key('z', { ctrl: true });
  expect(rows()[0].classList.contains('done')).toBe(false);
  await key('z', { ctrl: true });
  expect(rows()).toHaveLength(1);
  await key('z', { ctrl: true, shift: true });
  expect(rows()).toHaveLength(2);
  await key('y', { ctrl: true });
  expect(rows()[0].classList.contains('done')).toBe(true);
  expect(off(redo())).toBe(true);
  // The link follows: what is undone is gone from it too.
  await press('Undo');
  await press('Undo');
  expect(rows()).toHaveLength(1);
  expect(body()).toBe('- [ ] One');
  await reopen();
  expect(rows()).toHaveLength(1);
  // A reopened link is a fresh start.
  expect(off(undo())).toBe(true);
});

test('sheet: undone and redone with the buttons', async () => {
  await open('#/v0/sheet');
  for (const [ref, v] of [['A1', '10'], ['A2', '=A1*2']]) {
    tap(cell(ref));
    fill(cell(ref), v);
    await idle();
    pause();
  }
  tap(cell('B1'));
  await idle();
  expect(cell('A2').value).toBe('20');
  await press('Undo');
  expect(cell('A2').value).toBe('');
  expect(cell('A1').value).toBe('10');
  await press('Redo');
  expect(cell('A2').value).toBe('20');
});

test('write: typing in one go is one step', async () => {
  await open('#/v0/write');
  const page = () => text($('[aria-label="Document"]'));
  write('Document', 'First');
  await idle();
  write('Document', 'First thought.');
  await idle();
  pause();
  write('Document', 'First thought. Second thought.');
  await idle();
  await key('z', { ctrl: true });
  expect(page()).toBe('First thought.');
  await key('z', { ctrl: true, shift: true });
  expect(page()).toBe('First thought. Second thought.');
});

test('deck: a deleted slide comes back', async () => {
  await open('#/v0/deck');
  write('Headline', 'Title');
  await idle();
  pause();
  await press('Slide');
  write('Headline', 'Second');
  await idle();
  pause();
  const thumbs = () => $$('.deck-rail .deck-thumb');
  expect(thumbs()).toHaveLength(2);
  await press('Delete slide');
  expect(thumbs()).toHaveLength(1);
  await key('z', { ctrl: true });
  expect(thumbs()).toHaveLength(2);
});

test('draw, board, gantt and motion take the same undo, since it is the shell’s', async () => {
  const cases: [string, string, string, string][] = [
    ['draw', 'Kind | X | Y | W | H | Style | Label\n--- | --- | --- | --- | --- | --- | ---\nr | 2 | 1 | 12 | 6 | 1 | Box', 'g.shape', 'Delete'],
    ['board', '## To do\n\n- A\n- B\n\n## Done', '.board-card', 'Delete card'],
    ['gantt', 'Task | Start:date | Days:number | Done:percent\n--- | --- | --- | ---\nDesign | 2025-06-23 | 5 | 50%\nBuild | 2025-06-28 | 2 | 0%', '.gantt-chart .bar', 'Delete task'],
    ['anim', 'Kind | X | Y | W | H | Style | Label\n--- | --- | --- | --- | --- | --- | ---\nt | 4 | 4 | 10 | 3 | 0 | Hello', '.motion-stage g.hit', 'Delete'],
  ];
  for (const [app, doc, sel, del] of cases) {
    await open(`#/v0/${app}/${encodeEnvelope({ created: null, body: doc })}`);
    const n = $$(sel).length;
    expect(n, app).toBeGreaterThan(0);
    await poke($(sel));
    await press(del);
    expect($$(sel), app).toHaveLength(n - 1);
    await press('Undo');
    expect($$(sel), app).toHaveLength(n);
    expect(body(), app).toBe(doc);
  }
});

test('undo inside a document that is inside another', async () => {
  const draw = 'Kind | X | Y | W | H | Style | Label\n--- | --- | --- | --- | --- | --- | ---\nr | 2 | 1 | 12 | 6 | 1 | One\ne | 20 | 10 | 10 | 8 | 0 | Two';
  await open('#/v0/write/' + encodeEnvelope({ created: null, body: `Intro\n\n\`\`\`draw\n${draw}\n\`\`\`` }));
  const embed = $('to-embed');
  button('Edit', embed.shadowRoot!).click();
  await idle();
  const sub = $('sl-dialog.to-sub');
  const shapes = () => $$('g.shape', sub);
  expect(shapes()).toHaveLength(2);
  await poke(shapes()[0]);
  await key('Delete');
  expect(shapes()).toHaveLength(1);
  // Undo here undoes the drawing, not the text around it.
  await key('z', { ctrl: true });
  expect(shapes()).toHaveLength(2);
  await key('z', { ctrl: true, shift: true });
  expect(shapes()).toHaveLength(1);
  // The sub-editor's own Done (the drawing's alt text dialog inside it has one too).
  ([...sub.querySelectorAll<HTMLElement>('sl-button')].find((b) => text(b).includes('Done') && !b.closest('.draw-alt-dialog')))!.click();
  await until(() => !document.querySelector('sl-dialog.to-sub'), 'the editor to close');
  const drawn = () => $('to-embed').shadowRoot!.querySelector('svg[role="img"]')!;
  expect(drawn().querySelectorAll('ellipse')).toHaveLength(1);
  expect(drawn().querySelectorAll('rect')).toHaveLength(0);
  // Back in the text, undo puts the drawing back as it was.
  await key('z', { ctrl: true }, document.body);
  expect($('to-embed').shadowRoot!.querySelector('svg[role="img"]')!.querySelectorAll('rect')).toHaveLength(1);
  expect(text($('[aria-label="Document"]'))).toContain('Intro');
});

test('a title typed is undone and redone like any other change, in order with the document', async () => {
  await open('#/v0/todo');
  const title = () => $<HTMLInputElement>('input.to-title');
  fill(title(), 'Errands');
  await idle();
  pause();
  const add = $('sl-input.todo-new');
  fill(add, 'Milk');
  add.dispatchEvent(new KeyboardEvent('keydown', { key: 'Enter', bubbles: true }));
  await idle();
  pause();
  fill(title(), 'Errands, Saturday');
  await idle();
  await key('z', { ctrl: true }, title());
  expect(title().value).toBe('Errands');
  expect(body()).toContain('Milk');
  await key('z', { ctrl: true }, title());
  expect(body()).not.toContain('Milk');
  expect(title().value).toBe('Errands');
  await key('z', { ctrl: true }, title());
  expect(title().value).toBe('');
  await key('z', { ctrl: true, shift: true }, title());
  expect(title().value).toBe('Errands');
});
