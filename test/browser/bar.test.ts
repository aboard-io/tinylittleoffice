// The bar: one row that scrolls sideways, saying at its edges where there is more.
import { test, expect } from 'vitest';
import { render, html } from 'lit';
import { tool, btn } from '../../src/kit/bar.ts';
import { UI } from '../../src/kit/icons.ts';
import { until } from './helpers.ts';
import '../../src/styles.css';

test('a bar wider than its box fades at the end, then at the start once scrolled', async () => {
  document.body.innerHTML = '<div style="width:200px"><to-bar></to-bar></div>';
  const bar = document.querySelector<HTMLElement>('to-bar')!;
  render(html`${Array.from({ length: 12 }, (_, i) => tool({ label: `Tool ${i}`, icon: UI.bold }))}`, bar);
  await until(() => bar.hasAttribute('data-fade-end'));
  expect(bar.hasAttribute('data-fade-start')).toBe(false);
  expect(bar.getAttribute('role')).toBe('toolbar');
  bar.scrollLeft = 100;
  await until(() => bar.hasAttribute('data-fade-start'));
  expect(bar.hasAttribute('data-fade-end')).toBe(true);
  bar.scrollLeft = 10_000;
  await until(() => !bar.hasAttribute('data-fade-end'));
  // Wide enough, no fade at all.
  bar.parentElement!.style.width = '2000px';
  await until(() => !bar.hasAttribute('data-fade-start') && !bar.hasAttribute('data-fade-end'));
});

test('tool() and btn() are named buttons, 44px to the finger, with a state when they have one', () => {
  document.body.innerHTML = '<to-bar></to-bar>';
  let pressed = false;
  render(html`${tool({ label: 'Bold', icon: UI.bold, keys: 'Mod+B', pressed, does: () => (pressed = true) })}${btn({ label: 'Insert', icon: UI.plus })}`, document.querySelector('to-bar')!);
  const [t, b] = [...document.querySelectorAll<HTMLButtonElement>('button')];
  expect(t.getAttribute('aria-label')).toBe('Bold');
  expect(t.title).toMatch(/^Bold \((⌘|Ctrl\+)B\)$/);
  expect(t.getAttribute('aria-pressed')).toBe('false');
  expect(t.getBoundingClientRect().height).toBeGreaterThanOrEqual(44);
  expect(t.getBoundingClientRect().width).toBeGreaterThanOrEqual(44);
  t.click();
  expect(pressed).toBe(true);
  expect(b.textContent!.trim()).toBe('Insert');
  expect(b.hasAttribute('aria-pressed')).toBe(false);
});
