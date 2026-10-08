// Calendar worked as a person would: spans made in their dialog, zones, repeats; checked by what it saves and shows (ported from e2e/calendar.spec.ts).
import { test, expect, vi, beforeAll, afterAll } from 'vitest';
import { mount, settle, setSl, press, button, type Editor } from './helpers.ts';
import { parseCalendar, spanStartMs } from '../../src/lib/calmodel.ts';

// As the e2e browser is set: New York.
beforeAll(() => void vi.stubEnv('TZ', 'America/New_York'));
afterAll(() => void vi.unstubAllEnvs());

const cell = (el: Editor, ymd: string) => el.querySelector<HTMLElement>(`[role="gridcell"][aria-label="${ymd}"]`)!;
const chip = (el: Editor, ymd: string) => cell(el, ymd).querySelector<HTMLElement>('.cal-chip');
const chipText = (el: Editor, ymd: string) => chip(el, ymd)?.textContent?.trim() ?? null;
const dialog = (el: Editor) => el.querySelector<HTMLElement & { open: boolean }>('sl-dialog.cal-dialog')!;
const field = (el: Editor, label: string) => dialog(el).querySelector(`sl-input[label="${label}"]`);
const words = (e: Element | null) => (e?.textContent ?? '').replace(/\s+/g, ' ').trim();
const agenda = (el: Editor) => [...el.querySelectorAll('.cal-agenda li')];

/** A day pressed: the dialog opens for a span on it. */
async function pressDay(el: Editor, day: HTMLElement) {
  day.dispatchEvent(new PointerEvent('pointerdown', { bubbles: true, button: 0, pointerId: 1 }));
  el.querySelector('.cal-grid')!.dispatchEvent(new PointerEvent('pointerup', { bubbles: true, pointerId: 1 }));
  await settle(el);
}
async function fill(el: Editor, label: string, value: string) {
  setSl(field(el, label), value, label === 'Label' ? 'sl-input' : 'sl-change');
  await settle(el);
}
/** Return in the label: the same as Done. */
async function enter(el: Editor) {
  press(field(el, 'Label'), 'Enter');
  await settle(el);
}
async function click(el: Editor, target: HTMLElement | null) {
  target!.click();
  await settle(el);
}

test('calendar: spans, zones and the author-zone shortcut', async () => {
  const { el, last } = await mount('cal');
  await pressDay(el, el.querySelector('.cal-cell.today')!);
  expect(dialog(el).open).toBe(true);
  await fill(el, 'Label', 'Offsite');
  await fill(el, 'Start date', '2026-01-15');
  await fill(el, 'End date', '2026-01-17');
  // The draft is drawn as it changes, before anything is kept; Return is the same as Done.
  expect(words(el.querySelector('.cal-agenda .when'))).toBe('Jan 15 – 17, 2026');
  expect(last()).toBeUndefined();
  await enter(el);
  expect(dialog(el).open).toBe(false);
  expect(agenda(el)).toHaveLength(1);
  expect(parseCalendar(last()!).spans).toMatchObject([{ kind: 'd', label: 'Offsite', dur: 3 }]);

  await click(el, agenda(el)[0] as HTMLElement);
  expect(words(el.querySelector('.cal-month'))).toBe('January 2026');
  expect(dialog(el).open).toBe(true);
  for (const d of ['2026-01-15', '2026-01-16', '2026-01-17']) expect(chipText(el, d)).toBe('Offsite');
  expect(chip(el, '2026-01-18')).toBeNull();

  // Timed: 09:00 New York on Jan 15 is 14:00 UTC.
  const allDay = [...dialog(el).querySelectorAll<HTMLElement & { checked: boolean }>('sl-checkbox')].find((c) => c.textContent?.includes('All day'))!;
  expect(allDay.checked).toBe(true);
  setSl(allDay, false);
  await settle(el);
  expect((field(el, 'Start time') as HTMLInputElement).value).toBe('09:00');
  expect((field(el, 'End time') as HTMLInputElement).value).toBe('10:00');
  expect(chip(el, '2026-01-15')!.dataset.tip).toMatch(/9:00/);
  await click(el, button(dialog(el), /Done/));
  expect(dialog(el).open).toBe(false);
  const saved = parseCalendar(last()!);
  expect(saved).toMatchObject({ zone: 'America/New_York', spans: [{ kind: 't' }] });
  expect(spanStartMs(saved.spans[0])).toBe(Date.UTC(2026, 0, 15, 14));
  // The time zone is a box you can type in: a city is enough.
  const zone = el.querySelector<HTMLInputElement>('input[aria-label="Time zone"]')!;
  zone.value = 'utc';
  zone.dispatchEvent(new Event('change', { bubbles: true }));
  await settle(el);
  expect(zone.value).toBe('UTC');
  expect(chip(el, '2026-01-15')!.dataset.tip).toMatch(/2:00/);
  await click(el, chip(el, '2026-01-15'));
  expect((field(el, 'Start time') as HTMLInputElement).value).toBe('14:00');
  await fill(el, 'Label', 'Offsite call');
  await enter(el);
  expect(dialog(el).open).toBe(false);
  expect(chipText(el, '2026-01-15')).toMatch(/Offsite call/);

  // Opened again where the author's zone is not the viewer's: a button puts it back.
  const again = await mount('cal', last());
  const el2 = again.el;
  expect(words(el2.querySelector('.cal-month'))).toBe('January 2026');
  expect(chip(el2, '2026-01-15')!.dataset.tip).toMatch(/9:00/);
  const authorZone = () => [...el2.querySelectorAll('sl-button')].find((b) => /UTC time/.test(b.textContent ?? '')) as HTMLElement | undefined;
  expect(authorZone()).toBeTruthy();
  await click(el2, authorZone()!);
  expect(chip(el2, '2026-01-15')!.dataset.tip).toMatch(/2:00/);
  expect(authorZone()).toBeUndefined();

  // A span of several days (a drag across them is in e2e/calendar.spec.ts): its dates set in the dialog.
  await pressDay(el2, cell(el2, '2026-01-05'));
  await fill(el2, 'Label', 'Sprint');
  await fill(el2, 'End date', '2026-01-08');
  expect(agenda(el2)).toHaveLength(2);
  expect(words(agenda(el2)[0])).toContain('Jan 5 – 8, 2026');
  await click(el2, button(dialog(el2), /Done/));
  expect(dialog(el2).open).toBe(false);
  expect(agenda(el2)).toHaveLength(2);

  // Escape throws the dialog's changes away; Delete, outside a field, deletes the span.
  await click(el2, chip(el2, '2026-01-06'));
  await fill(el2, 'Label', 'Not this');
  press(dialog(el2), 'Escape');
  await settle(el2);
  expect(dialog(el2).open).toBe(false);
  expect(chipText(el2, '2026-01-06')).toBe('Sprint');
  await click(el2, chip(el2, '2026-01-06'));
  press(button(dialog(el2), /Done/), 'Delete');
  await settle(el2);
  expect(dialog(el2).open).toBe(false);
  expect(agenda(el2)).toHaveLength(1);
  expect(parseCalendar(again.last()!).spans.map((s) => s.label)).toEqual(['Offsite call']);
});

test('calendar: a span that repeats every week', async () => {
  const { el, last } = await mount('cal');
  await pressDay(el, el.querySelector('.cal-cell.today')!);
  await fill(el, 'Label', 'Standup');
  await fill(el, 'Start date', '2026-01-05');
  await fill(el, 'End date', '2026-01-05');
  setSl(dialog(el).querySelector('sl-select.cal-repeat'), 'w');
  await settle(el);
  await fill(el, 'Times', '4');
  await enter(el);
  expect(dialog(el).open).toBe(false);
  // One line in the agenda, saying so; its month shows it every Monday, four times.
  expect(agenda(el)).toHaveLength(1);
  expect(words(el.querySelector('.cal-agenda .rep'))).toBe('every week, 4 times');
  await click(el, agenda(el)[0] as HTMLElement);
  expect(words(el.querySelector('.cal-month'))).toBe('January 2026');
  press(dialog(el), 'Escape');
  await settle(el);
  expect(dialog(el).open).toBe(false);
  for (const d of ['2026-01-05', '2026-01-12', '2026-01-19', '2026-01-26']) expect(chipText(el, d)).toBe('Standup');
  expect(chip(el, '2026-01-06')).toBeNull();
  expect(agenda(el)).toHaveLength(4);
  await click(el, button(el, 'Next month'));
  expect(chip(el, '2026-02-02')).toBeNull();
  expect(parseCalendar(last()!).spans).toMatchObject([{ label: 'Standup', repeat: { every: 'w', count: 4 } }]);

  // The link carries the rule, and opens on the series' month once it is over; editing any one of them edits the series.
  const again = await mount('cal', last());
  const el2 = again.el;
  expect(words(el2.querySelector('.cal-month'))).toBe('January 2026');
  expect(agenda(el2)).toHaveLength(4);
  await click(el2, chip(el2, '2026-01-19'));
  expect((field(el2, 'Times') as HTMLInputElement).value).toBe('4');
  await fill(el2, 'Label', 'Standup!');
  setSl(dialog(el2).querySelector('sl-select.cal-repeat'), 'never');
  await settle(el2);
  await enter(el2);
  expect(chipText(el2, '2026-01-05')).toBe('Standup!');
  expect(chip(el2, '2026-01-12')).toBeNull();
  expect(agenda(el2)).toHaveLength(1);
  expect(parseCalendar(again.last()!).spans[0].repeat).toBeUndefined();
});
