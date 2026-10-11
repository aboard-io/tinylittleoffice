// The toast: a live region anything can speak through.
import { test, expect } from 'vitest';
import { toast } from '../../src/kit/toast.ts';
import { until } from './helpers.ts';
import '../../src/styles.css';

test('toast() shows its words in a status region, then takes them away', async () => {
  document.body.innerHTML = '<to-toast></to-toast>';
  const region = () => document.querySelector('[role=status]')!;
  await until(() => !!region());
  expect(region().getAttribute('aria-live')).toBe('polite');
  expect(region().textContent).toBe('');
  toast('Link copied');
  await until(() => region().textContent === 'Link copied');
  expect(region().classList.contains('shown')).toBe(true);
  await until(() => region().textContent === '', 4000);
});

test('a toast stays long enough to read: a hundred characters are still shown at five seconds, and longer while a pointer is on it', async () => {
  document.body.innerHTML = '<to-toast></to-toast>';
  const region = () => document.querySelector<HTMLElement>('[role=status]')!;
  await until(() => !!region());
  const words = 'x'.repeat(100);
  toast(words);
  await until(() => region().textContent === words);
  await new Promise((r) => setTimeout(r, 5000));
  expect(region().textContent).toBe(words);
  // A pointer on it holds it: past its time, it is still there; the pointer gone, it goes.
  region().dispatchEvent(new PointerEvent('pointerenter'));
  await new Promise((r) => setTimeout(r, 2800));
  expect(region().textContent).toBe(words);
  region().dispatchEvent(new PointerEvent('pointerleave'));
  await until(() => region().textContent === '', 8000);
}, 20000);
