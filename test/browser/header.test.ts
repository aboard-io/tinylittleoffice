// <to-header> on a bare page (kit/ui/header.ts; docs/library.md, A page's header): the way back up as links and
// buttons, each told ("crumbpick", which a page that routes itself prevents); the title as words or as a field whose
// new words are told ("titlechange") and Escape puts back; and the page's own search and actions in their slots.
import { expect, test } from 'vitest';
import { page, userEvent } from 'vitest/browser';
import '../../src/editors.css';
import '../../src/kit/ui/header.ts';
import type { ToHeader } from '../../src/kit/ui/header.ts';
import { until } from './wait.ts';

async function header(inner = ''): Promise<ToHeader> {
  document.body.innerHTML = `<to-header heading="Clear Channel Digital Strategy">${inner}</to-header>`;
  const el = document.querySelector<ToHeader>('to-header')!;
  el.crumbs = [{ label: 'Projects', href: '#projects' }, { label: 'Clear Channel' }];
  await el.updateComplete;
  return el;
}

test('the title, the way back up, and the page’s slots in their places', async () => {
  const el = await header('<button slot="actions" id="share">Share</button><input slot="search" id="find"><p id="stays">words</p>');
  expect(el.querySelector('[role=heading]')!.getAttribute('aria-level')).toBe('1');
  expect(el.querySelector('[role=heading]')!.textContent!.trim()).toBe('Clear Channel Digital Strategy');
  expect(el.querySelector('nav')!.getAttribute('aria-label')).toBe('Breadcrumbs');
  expect([...el.querySelectorAll('.to-ph-crumbs li > *')].map((c) => c.tagName)).toStrictEqual(['A', 'BUTTON']);
  expect(el.querySelector('#share')!.parentElement!.className).toBe('to-ph-actions');
  expect(el.querySelector('#find')!.parentElement!.className).toBe('to-ph-search');
  // A child given later with a slot joins it; one with none is left where the page put it.
  const more = Object.assign(document.createElement('button'), { id: 'more', slot: 'actions' });
  el.append(more);
  await until(() => more.parentElement?.className === 'to-ph-actions', 'a later child never joined its slot');
  expect([...el.querySelectorAll('.to-ph-actions > *')].map((b) => b.id)).toStrictEqual(['share', 'more']);
  expect(el.querySelector('#stays')!.parentElement).toBe(el);
});

test('a crumb is told, and a page that routes itself prevents the link', async () => {
  const el = await header();
  const told: number[] = [];
  el.addEventListener('crumbpick', (e) => {
    told.push((e as CustomEvent).detail.index);
    e.preventDefault();
  });
  el.querySelector<HTMLAnchorElement>('.to-ph-crumbs a')!.click();
  el.querySelector<HTMLButtonElement>('.to-ph-crumbs button')!.click();
  expect(told).toStrictEqual([0, 1]);
  expect(location.hash).not.toBe('#projects');
});

test('an editable title: Enter keeps new words and tells them, Escape puts the old back, empty words are none', async () => {
  const el = await header();
  el.editable = true;
  await el.updateComplete;
  const titles: string[] = [];
  el.addEventListener('titlechange', (e) => titles.push((e as CustomEvent).detail.title));
  const field = el.field!;
  expect(field.getAttribute('aria-label')).toBe('Title');
  field.focus();
  field.select();
  await userEvent.keyboard('Clear Channel Pitch{Enter}');
  expect(titles).toStrictEqual(['Clear Channel Pitch']);
  expect(el.heading).toBe('Clear Channel Pitch');
  field.select();
  await userEvent.keyboard('Something else{Escape}');
  expect(field.value).toBe('Clear Channel Pitch');
  field.focus();
  field.select();
  await userEvent.keyboard('{Backspace}{Enter}');
  expect(field.value).toBe('Clear Channel Pitch');
  expect(titles).toStrictEqual(['Clear Channel Pitch']);
});

test('a title the page gives while the field has the focus is the field’s words, and leaving it tells nothing of the old', async () => {
  const el = await header();
  el.editable = true;
  await el.updateComplete;
  const titles: string[] = [];
  el.addEventListener('titlechange', (e) => titles.push((e as CustomEvent).detail.title));
  const field = el.field!;
  field.focus();
  // The route changes and the focus leaves in the same moment, before the header draws again.
  el.heading = 'Mubadala Pitch';
  field.blur();
  await el.updateComplete;
  expect(titles).toStrictEqual([]);
  expect(field.value).toBe('Mubadala Pitch');
  // Given while the field has the focus and the header draws: the field's words, Escape and Enter after it are about the new title.
  field.focus();
  el.heading = 'Sixth Street Review';
  await el.updateComplete;
  expect(field.value).toBe('Sixth Street Review');
  await userEvent.keyboard('{Escape}');
  expect(field.value).toBe('Sixth Street Review');
  field.focus();
  field.select();
  await userEvent.keyboard('Sixth Street Plan{Enter}');
  expect(titles).toStrictEqual(['Sixth Street Plan']);
  // Typed, then a new title given: the typed words give way to it, and nothing is told.
  field.select();
  await userEvent.keyboard('Half typed');
  el.heading = 'Aboard Roadmap';
  await el.updateComplete;
  expect(field.value).toBe('Aboard Roadmap');
  field.blur();
  expect(titles).toStrictEqual(['Sixth Street Plan']);
});

const LONG = 'Clear Channel Outdoor Digital Strategy, Spring Campaign Measurement and the Quarterly Review of Every Regional Partner’s Screens, Sites and Audiences';

test('at 1440, a long title wraps to two lines before it is cut, and the search gives way first', async () => {
  await page.viewport(1440, 900);
  try {
    const el = await header('<div slot="search" id="find" style="height: 2.5rem"></div><button slot="actions">Share</button>');
    el.heading = LONG;
    await el.updateComplete;
    const words = el.querySelector<HTMLElement>('.to-ph-words')!;
    const line = parseFloat(getComputedStyle(words).lineHeight);
    expect(words.offsetHeight).toBeGreaterThan(line * 1.5);
    expect(words.offsetHeight).toBeLessThan(line * 2.5);
    const search = el.querySelector<HTMLElement>('.to-ph-search')!;
    const em = parseFloat(getComputedStyle(search).fontSize);
    expect(search.offsetWidth).toBeLessThanOrEqual(12 * em + 1);
    // A short title leaves the search its whole width.
    el.heading = 'Projects';
    await el.updateComplete;
    expect(search.offsetWidth).toBeGreaterThan(20 * em);
    // A title that is a field, one line, is drawn smaller before it is cut.
    el.editable = true;
    el.heading = LONG;
    await el.updateComplete;
    await until(() => !!el.querySelector<HTMLElement>('.to-ph-title')!.style.getPropertyValue('--to-ph-k'), 'the field was never drawn smaller');
    const k = Number(el.querySelector<HTMLElement>('.to-ph-title')!.style.getPropertyValue('--to-ph-k'));
    expect(k).toBeGreaterThanOrEqual(0.75);
    expect(k).toBeLessThan(1);
    expect(document.documentElement.scrollWidth).toBeLessThanOrEqual(1440);
  } finally {
    await page.viewport(1280, 800);
  }
});
