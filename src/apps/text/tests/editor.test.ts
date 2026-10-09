// The Text app: typing in <to-text> fires docchange with the TLO; the bar's tools mark the selection and show its
// state; Insert ▾ makes a heading; undo comes through the shell's docundo event with the caret put back.
import { test, expect } from 'vitest';
import '../editor.ts';
import type { ToTextEditor } from '../editor.ts';
import { tick, until } from '../../../../test/browser/helpers.ts';
import '../../../styles.css';

async function editor(value = ''): Promise<{ el: ToTextEditor; changes: string[] }> {
  document.body.innerHTML = '';
  const el = document.createElement('to-text-editor') as ToTextEditor;
  el.value = value;
  const changes: string[] = [];
  el.addEventListener('docchange', (e) => changes.push((e as CustomEvent<string>).detail));
  document.body.append(el);
  await el.updateComplete;
  await el.text.updateComplete;
  return { el, changes };
}
const type = async (el: ToTextEditor, s: string) => {
  for (const ch of s) {
    el.text.tx.dispatchEvent(new InputEvent('beforeinput', { inputType: 'insertText', data: ch, bubbles: true, cancelable: true }));
    await el.updateComplete;
  }
};

test('typing is the document', async () => {
  const { el, changes } = await editor();
  el.text.focus();
  el.text.sel = { anchor: { block: 0, offset: 0 }, focus: { block: 0, offset: 0 } };
  await type(el, 'One line.');
  expect(changes.at(-1)).toBe('One line.\n');
  expect(el.value).toBe('One line.\n');
});

test('Bold marks the selection, shows pressed, and keeps the selection', async () => {
  const { el, changes } = await editor('make this bold\n');
  el.text.focus();
  el.text.sel = { anchor: { block: 0, offset: 5 }, focus: { block: 0, offset: 9 } };
  await tick();
  const bold = el.querySelector<HTMLButtonElement>('[aria-label=Bold]')!;
  bold.click();
  await el.updateComplete;
  await el.text.updateComplete;
  await tick();
  expect(changes.at(-1)).toBe('make **this** bold\n');
  expect(document.getSelection()!.toString()).toBe('this');
  await until(() => el.querySelector<HTMLButtonElement>('[aria-label=Bold]')!.getAttribute('aria-pressed') === 'true');
});

test('Insert ▾ makes the caret\'s block a heading; docundo puts it back with the caret', async () => {
  const { el, changes } = await editor('first\n\nsecond\n');
  el.text.focus();
  el.text.sel = { anchor: { block: 1, offset: 2 }, focus: { block: 1, offset: 2 } };
  el.querySelector<HTMLButtonElement>('to-insert button')!.click();
  await until(() => !!el.querySelector('[role=menuitem]:not([disabled])'));
  el.querySelector<HTMLElement>('[role=menuitem]')!.click();
  await until(() => changes.at(-1) === 'first\n\n## second\n');
  expect(el.dispatchEvent(new CustomEvent('docundo', { cancelable: true, bubbles: true }))).toBe(false);
  await until(() => changes.at(-1) === 'first\n\nsecond\n');
  await until(() => el.text.sel?.anchor.block === 1 && el.text.sel.anchor.offset === 2);
  // The title is a head field the shell sets; it comes back as an undoable head op.
  el.value = '---\ntitle: Named\n---\nfirst\n\nsecond\n';
  await el.updateComplete;
  expect(el.history.canUndo).toBe(true);
  el.dispatchEvent(new CustomEvent('docundo', { cancelable: true, bubbles: true }));
  await until(() => changes.at(-1) === 'first\n\nsecond\n');
});
