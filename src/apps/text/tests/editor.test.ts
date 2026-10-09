// The placeholder Text editor: typing fires docchange with the text; the bar's tools mark the selection; Insert ▾ adds a block.
import { test, expect } from 'vitest';
import '../editor.ts';
import type { ToTextEditor } from '../editor.ts';
import { until } from '../../../../test/browser/helpers.ts';
import '../../../styles.css';

async function editor(value = ''): Promise<{ el: ToTextEditor; changes: string[] }> {
  document.body.innerHTML = '';
  const el = document.createElement('to-text-editor') as ToTextEditor;
  el.value = value;
  const changes: string[] = [];
  el.addEventListener('docchange', (e) => changes.push((e as CustomEvent<string>).detail));
  document.body.append(el);
  await el.updateComplete;
  return { el, changes };
}

test('typing is the document', async () => {
  const { el, changes } = await editor();
  const area = el.area;
  area.value = 'One line.';
  area.dispatchEvent(new Event('input', { bubbles: true }));
  expect(changes).toEqual(['One line.']);
  expect(el.value).toBe('One line.');
});

test('Bold wraps the selection and keeps it selected', async () => {
  const { el, changes } = await editor('make this bold');
  el.area.setSelectionRange(5, 9);
  el.querySelector<HTMLButtonElement>('[aria-label=Bold]')!.click();
  expect(changes.at(-1)).toBe('make **this** bold');
  expect(el.area.value.slice(el.area.selectionStart, el.area.selectionEnd)).toBe('this');
});

test('Insert ▾ puts a heading on its own line after the caret', async () => {
  const { el, changes } = await editor('first\nsecond');
  el.area.setSelectionRange(2, 2);
  el.querySelector<HTMLButtonElement>('to-insert button')!.click();
  await until(() => !!el.querySelector('[role=menuitem]:not([disabled])'));
  el.querySelector<HTMLElement>('[role=menuitem]')!.click();
  expect(changes.at(-1)).toBe('first\n\n## \nsecond');
});
