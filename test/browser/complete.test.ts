// Typing ":" and letters in any <to-text> opens a completion of icons and emoji under the caret (kit/complete.ts),
// with real keys: Up/Down move, Enter or Tab picks, Escape leaves the words as typed, ":name:" typed in full becomes
// the icon. "10:30" opens nothing; a marks-only editor (a shape's label) is offered emoji alone; at 390px the list
// sits inside the visual viewport. The Word Processor is tried through the shell.
import { afterEach, expect, test } from 'vitest';
import { page, userEvent } from 'vitest/browser';
import { applyAll, parse, write, type Doc } from '../../src/doc/index.ts';
import { encodeDoc } from '../../src/kit/codec.ts';
import { History } from '../../src/kit/history.ts';
import { caret } from '../../src/kit/textops.ts';
import type { TextOps, ToText } from '../../src/kit/text.ts';
import type { ToWriteEditor } from '../../src/apps/write/editor.ts';
import { mount as mountShell, tick, until } from './helpers.ts';
import '../../src/styles.css';
import '../../src/kit/text.ts';

class Host {
  doc: Doc;
  history = new History();
  el: ToText;
  constructor(tlo: string) {
    this.doc = parse(tlo);
    this.el = document.createElement('to-text');
    this.el.shape = 'doc';
    this.el.blocks = this.doc.blocks;
    this.el.addEventListener('text-ops', (e) => {
      const { ops, sel, before, kind } = (e as CustomEvent<TextOps>).detail;
      const was = this.doc;
      this.doc = applyAll(was, ops);
      this.history.record(was, ops, before, sel, kind);
      this.el.blocks = this.doc.blocks;
    });
  }
  get tlo() {
    return write(this.doc);
  }
}

async function mount(tlo = 'Go\n', opts: { marksOnly?: boolean; shape?: 'line' | 'doc' } = {}): Promise<Host> {
  document.body.innerHTML = '';
  const h = new Host(tlo);
  if (opts.shape) h.el.shape = opts.shape;
  h.el.marksOnly = !!opts.marksOnly;
  document.body.append(h.el);
  await h.el.updateComplete;
  h.el.focus();
  const b = h.doc.blocks[0];
  h.el.sel = caret(0, b && 'runs' in b ? b.runs.reduce((n, r) => n + (r.t.length || 1), 0) : 0);
  await h.el.updateComplete;
  await tick(20);
  return h;
}

const pop = () => document.querySelector<HTMLElement>('.to-complete:popover-open');
const rows = () => [...(pop()?.querySelectorAll<HTMLElement>('[role="option"]') ?? [])];
const labels = () => rows().map((r) => r.dataset.value);

afterEach(async () => {
  await page.viewport(1100, 800);
});

test('":ca" opens the list under the caret; Enter puts the car icon in place of ":ca", one undo step', async () => {
  const h = await mount();
  await userEvent.keyboard(' :ca');
  await until(() => !!pop());
  expect(labels()[0]).toBe('car');
  expect(rows()[0].getAttribute('aria-selected')).toBe('true');
  expect(rows().length).toBeLessThanOrEqual(8);
  // The editor says what it completes with.
  expect(h.el.tx.getAttribute('aria-autocomplete')).toBe('list');
  expect(h.el.tx.getAttribute('aria-activedescendant')).toBe(rows()[0].id);
  expect(pop()!.getAttribute('role')).toBe('listbox');
  // The full set and the emoji arrive: one more letter and the car emoji is offered too.
  await userEvent.keyboard('r');
  await until(() => labels().includes('🚗'), 8000);
  expect(labels()).toContain('car');
  await userEvent.keyboard('{Backspace}');
  // Back to ":ca": the whole of Lucide has joined now, and the shortest names lead ("can", "car", "cat").
  await until(() => labels().includes('car') && !labels().includes('car-front'));
  const first = labels()[0];
  expect(rows()[0].dataset.kind).toBe('icon');
  await userEvent.keyboard('{Enter}');
  await until(() => !pop());
  expect(h.tlo).toBe(`Go :${first}:\n`);
  expect(h.el.sel).toEqual(caret(0, 4));
  expect(h.el.tx.querySelector(`.ic[data-icon="${first}"] svg`)).not.toBeNull();
  expect(h.el.tx.hasAttribute('aria-autocomplete')).toBe(false);
  // Undo gives the typed words back.
  const s = h.history.undo()!;
  expect(write(applyAll(h.doc, s.ops))).toBe('Go :ca\n');
});

test('Up and Down move the highlight (wrapping); Tab picks; an emoji goes in as the character', async () => {
  const h = await mount();
  await userEvent.keyboard(' :car');
  await until(() => labels().includes('🚗'), 8000);
  const n = rows().length;
  await userEvent.keyboard('{ArrowUp}');
  expect(rows()[n - 1].getAttribute('aria-selected')).toBe('true');
  await userEvent.keyboard('{ArrowDown}');
  expect(rows()[0].getAttribute('aria-selected')).toBe('true');
  const at = labels().indexOf('🚗');
  for (let i = 0; i < at; i++) await userEvent.keyboard('{ArrowDown}');
  expect(h.el.tx.getAttribute('aria-activedescendant')).toBe(rows()[at].id);
  await userEvent.keyboard('{Tab}');
  await until(() => !pop());
  expect(h.tlo).toBe('Go 🚗\n');
  expect(h.el.hasFocus()).toBe(true);
});

test('Escape closes the list and leaves ":ca" as typed, and the press stops there; a space closes it too', async () => {
  const h = await mount();
  let reached = 0;
  document.body.addEventListener('keydown', (e) => e.key === 'Escape' && reached++);
  await userEvent.keyboard(' :ca');
  await until(() => !!pop());
  await userEvent.keyboard('{Escape}');
  await until(() => !pop());
  expect(reached).toBe(0);
  expect(h.tlo).toBe('Go :ca\n');
  // More letters after Escape: still closed for this word.
  await userEvent.keyboard('r');
  await tick(50);
  expect(pop()).toBeNull();
  await userEvent.keyboard(' :ca');
  await until(() => !!pop());
  await userEvent.keyboard(' ');
  await until(() => !pop());
  expect(h.tlo).toBe('Go :car :ca\\ \n');
});

test('"10:30" and "re: that" open nothing', async () => {
  const h = await mount('');
  await userEvent.keyboard('10:30 re: that a:b');
  await tick(80);
  expect(pop()).toBeNull();
  expect(h.tlo).toBe('10:30 re: that a:b\n');
});

test('":car:" typed in full becomes the icon; an unknown name stays words', async () => {
  const h = await mount();
  await userEvent.keyboard(' :car:');
  await until(() => h.tlo === 'Go :car:\n' && !!h.el.tx.querySelector('.ic[data-icon="car"]'));
  expect(pop()).toBeNull();
  expect(h.el.sel).toEqual(caret(0, 4));
  await userEvent.keyboard(' :nosuchthing:');
  await tick(50);
  expect(h.el.tx.querySelectorAll('.ic').length).toBe(1);
  expect(h.tlo).toBe('Go :car: \\:nosuchthing:\n');
});

test('moving the caret away closes the list; a tap on a row picks it', async () => {
  const h = await mount();
  await userEvent.keyboard(' :ca');
  await until(() => !!pop());
  h.el.sel = caret(0, 1);
  await until(() => !pop());
  h.el.sel = caret(0, 6);
  await h.el.updateComplete;
  await userEvent.keyboard('t');
  await until(() => labels().includes('cat'));
  const row = rows()[labels().indexOf('cat')];
  row.dispatchEvent(new MouseEvent('mousedown', { bubbles: true, cancelable: true }));
  row.click();
  await until(() => !pop());
  expect(h.tlo).toBe('Go :cat:\n');
});

test("marks-only (a shape's label) and no-bubble (plain words): only emoji are offered, and a pick puts the character in", async () => {
  const h = await mount('Go\n', { marksOnly: true, shape: 'line' });
  await userEvent.keyboard(' :car');
  await until(() => labels().includes('🚗'), 8000);
  expect(rows().every((r) => r.dataset.kind === 'emoji')).toBe(true);
  const at = labels().indexOf('🚗');
  for (let i = 0; i < at; i++) await userEvent.keyboard('{ArrowDown}');
  await userEvent.keyboard('{Enter}');
  await until(() => !pop());
  expect(h.tlo).toBe('Go 🚗\n');
  // Plain words (no-bubble: the Diagram Maker's, a trip's stops) hold no icon either.
  const p = await mount('Go\n', { shape: 'line' });
  p.el.noBubble = true;
  await p.el.updateComplete;
  await userEvent.keyboard(' :car');
  await until(() => labels().includes('🚗'), 8000);
  expect(rows().every((r) => r.dataset.kind === 'emoji')).toBe(true);
  // And ":car:" in full is no icon there: the emoji by that name, if any, else the words.
  await userEvent.keyboard('{Escape}: :cat:');
  await until(() => p.tlo === 'Go \\:car: 🐈\n');
});

test('at 390×844 the list sits inside the visual viewport', async () => {
  await page.viewport(390, 844);
  const h = await mount(`${'Words that wrap on a phone more than once, and again. '.repeat(4)}\n`);
  await userEvent.keyboard(' :ca');
  await until(() => !!pop());
  await tick(30);
  const vv = window.visualViewport!;
  const r = pop()!.getBoundingClientRect();
  expect(r.left).toBeGreaterThanOrEqual(vv.offsetLeft);
  expect(r.right).toBeLessThanOrEqual(vv.offsetLeft + vv.width + 0.5);
  expect(r.top).toBeGreaterThanOrEqual(vv.offsetTop);
  expect(r.bottom).toBeLessThanOrEqual(vv.offsetTop + vv.height + 0.5);
  expect(r.width).toBeLessThanOrEqual(390);
  expect(document.documentElement.scrollWidth).toBeLessThanOrEqual(390);
  h.el.remove();
});

test('the Word Processor: ":ca" then Enter puts the icon in the document', async () => {
  const shell = await mountShell(`#/v1/write/${encodeDoc('Drive\n')}`);
  await until(() => !!shell.querySelector('to-write-editor to-text .tx'));
  const el = shell.querySelector<ToWriteEditor>('to-write-editor')!;
  await el.updateComplete;
  el.text.tx.focus();
  el.text.sel = caret(0, 5);
  await el.text.updateComplete;
  await tick(30);
  await userEvent.keyboard(' :ca');
  await until(() => !!pop());
  await userEvent.keyboard('{Enter}');
  await until(() => !!el.text.tx.querySelector('.ic svg'));
  expect(el.text.tx.textContent).not.toContain(':ca');
  history.replaceState(null, '', location.pathname);
});

// Every host's words: the keys are the list's while it is up, wherever the host listens for Enter, Tab or the arrows.
const HOSTS: [string, string][] = [
  ['deck', '## Drive\n\n- Slowly\n'],
  ['outline', '- Drive\n- Slowly\n'],
];
for (const [app, tlo] of HOSTS) {
  test(`${app}: ":ca" then Enter puts an icon in the words and nothing else happens`, async () => {
    const shell = await mountShell(`#/v1/${app}/${encodeDoc(tlo)}`);
    await until(() => !!shell.querySelector('to-text .tx'), 5000);
    const text = shell.querySelector<ToText>('to-text')!;
    await text.updateComplete;
    text.tx.focus();
    const b = text.blocks[0];
    const end = b && 'runs' in b ? b.runs.reduce((n, r) => n + (r.t.length || 1), 0) : 0;
    text.sel = caret(0, end);
    await text.updateComplete;
    await tick(40);
    const count = shell.querySelectorAll('to-text').length;
    await userEvent.keyboard(' :ca');
    await until(() => !!pop());
    await userEvent.keyboard('{Enter}');
    await until(() => !!text.tx.querySelector('.ic svg'));
    expect(pop()).toBeNull();
    expect(text.tx.textContent).not.toContain(':ca');
    expect(shell.querySelectorAll('to-text').length).toBe(count);
    expect(text.hasFocus()).toBe(true);
    history.replaceState(null, '', location.pathname);
  });
}
