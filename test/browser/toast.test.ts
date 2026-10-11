// The toast: a live region anything can speak through.
import { test, expect } from 'vitest';
import { toast } from '../../src/kit/toast.ts';
import type { ToDialog } from '../../src/kit/dialog.ts';
import '../../src/kit/dialog.ts';
import { until } from './helpers.ts';
import '../../src/styles.css';

test('toast() shows its words and says them in a status region, then takes them away', async () => {
  document.body.innerHTML = '<to-toast></to-toast>';
  const region = () => document.querySelector('[role=status]')!;
  const shown = () => document.querySelector('.to-toast')!;
  await until(() => !!region());
  expect(region().textContent).toBe('');
  toast('Link copied');
  await until(() => region().textContent === 'Link copied');
  expect(shown().classList.contains('shown')).toBe(true);
  expect(shown().textContent).toBe('Link copied');
  // What is seen is not said twice.
  expect(shown().getAttribute('aria-hidden')).toBe('true');
  await until(() => region().textContent === '' && !shown().classList.contains('shown'), 4000);
});

test('a toast said while a modal dialog is open is said inside it, where a screen reader still hears; the same words twice are said twice', async () => {
  document.body.innerHTML = '<to-toast></to-toast><to-dialog heading="Share"></to-dialog>';
  const d = document.querySelector<ToDialog>('to-dialog')!;
  await d.updateComplete;
  await d.show();
  toast('Link copied');
  const said = () => [...document.querySelectorAll('[role=status]')].find((s) => s.textContent === 'Link copied');
  await until(() => !!said());
  // Outside the modal the page is inert: the words are in a region inside it.
  expect(said()!.closest('dialog:modal')).toBe(d.dialog);
  const region = said()!;
  expect(region.classList.contains('sr-only')).toBe(true);
  // Said again: the region is emptied, then holds the words again, so the screen reader says them a second time.
  const heard: string[] = [];
  const watch = new MutationObserver(() => heard.push(region.textContent ?? ''));
  watch.observe(region, { childList: true, characterData: true, subtree: true });
  toast('Link copied');
  await until(() => heard.length >= 2 && region.textContent === 'Link copied');
  watch.disconnect();
  expect(heard).toContain('');
  // The visible toast is unchanged: the words, shown.
  expect(document.querySelector('.to-toast.shown')!.textContent).toBe('Link copied');
  d.close();
  // No dialog open: the page's own region says it.
  toast('Downloaded');
  await until(() => document.querySelector('to-toast [role=status]')?.textContent === 'Downloaded');
  expect(d.querySelector('[role=status]')!.textContent).toBe('');
});
