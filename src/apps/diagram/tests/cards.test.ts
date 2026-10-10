// A seating chart's Print place cards: the bar's button, there for seating alone, prints the cards through the
// kit's print path (a hidden frame holding the sheets, the browser's dialog stubbed here).
import { expect, test } from 'vitest';
import '../../../styles.css';
import '../editor.ts';
import type { ToDiagramEditor } from '../editor.ts';
import { until } from '../../../../test/browser/helpers.ts';

async function editor(value: string): Promise<ToDiagramEditor> {
  document.body.innerHTML = '';
  const el = document.createElement('to-diagram-editor') as ToDiagramEditor;
  el.value = value;
  document.body.append(el);
  await el.updateComplete;
  return el;
}

test('Print place cards: a sheet a page, a card a guest, the browser asked to print once', async () => {
  const el = await editor('---\ntitle: Dinner\nkind: seating\n---\n- Top table: Jo, Sam, Maria\n- Table 2: Pat, Ray\n');
  let printed = 0;
  const watch = new MutationObserver(() => {
    const f = document.querySelector<HTMLIFrameElement>('iframe.to-print');
    if (f && !f.dataset.stubbed) {
      f.dataset.stubbed = '1';
      // The frame's own window, now and once its page is in (whichever comes first in this browser).
      const stub = () => (f.contentWindow!.print = () => void printed++);
      stub();
      f.addEventListener('load', stub);
    }
  });
  watch.observe(document.body, { childList: true });
  const btn = el.querySelector<HTMLButtonElement>('to-bar button[aria-label="Print place cards"]')!;
  expect(btn.title).toMatch(/eight to a letter sheet/);
  btn.click();
  await until(() => printed === 1);
  watch.disconnect();
  const html = document.querySelector<HTMLIFrameElement>('iframe.to-print')!.srcdoc;
  expect(html).toContain('<title>Dinner</title>');
  expect(html).toContain('@page{size:8.5in 11in;margin:0}');
  expect((html.match(/<figure>/g) ?? []).length).toBe(1);
  expect((html.match(/stroke-dasharray="6 5"/g) ?? []).length).toBe(5);
  for (const name of ['Jo', 'Sam', 'Maria', 'Pat', 'Ray']) expect(html).toContain(`>${name}</text>`);
  document.querySelector('iframe.to-print')?.remove();
});

test('only a seating chart has place cards', async () => {
  const el = await editor('---\nkind: mind\n---\n- Idea\n');
  expect(el.querySelector('to-bar button[aria-label="Print place cards"]')).toBeNull();
});
