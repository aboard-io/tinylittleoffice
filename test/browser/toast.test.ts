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
