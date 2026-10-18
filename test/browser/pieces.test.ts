// The kit's small pieces on a bare page (docs/library.md, The kit's small pieces): <to-segmented>, a radio group whose
// arrows move and choose; `confirm`, a question in the kit's dialog answered true or false, the danger's focus on no;
// and <to-field>, a fact edited in place, its edit told in a cancelable "fieldchange" that a page refuses at once or
// later, the words going back.
import { expect, test } from 'vitest';
import { userEvent } from 'vitest/browser';
import '../../src/editors.css';
import '../../src/kit/ui/segmented.ts';
import '../../src/kit/ui/field.ts';
import { confirm } from '../../src/kit/ui/confirm.ts';
import type { ToSegmented } from '../../src/kit/ui/segmented.ts';
import type { FieldChange, ToField } from '../../src/kit/ui/field.ts';
import { until } from './wait.ts';

test('a segmented control: one segment takes Tab, the arrows and Home and End move and choose, a click chooses, each told', async () => {
  document.body.innerHTML = '<button id="before">before</button><to-segmented label="Whose"></to-segmented>';
  const el = document.querySelector<ToSegmented>('to-segmented')!;
  el.options = [
    { value: 'mine', label: 'My' },
    { value: 'all', label: 'All' },
    { value: 'team', label: 'Team' },
  ];
  el.value = 'all';
  await el.updateComplete;
  const told: string[] = [];
  el.addEventListener('change', (e) => told.push((e as CustomEvent).detail.value));
  const group = el.querySelector('[role=radiogroup]')!;
  expect(group.getAttribute('aria-label')).toBe('Whose');
  const radios = [...el.querySelectorAll<HTMLElement>('[role=radio]')];
  expect(radios.map((r) => r.getAttribute('aria-checked'))).toStrictEqual(['false', 'true', 'false']);
  expect(radios.map((r) => r.tabIndex)).toStrictEqual([-1, 0, -1]);
  document.querySelector<HTMLElement>('#before')!.focus();
  await userEvent.keyboard('{Tab}');
  expect(document.activeElement?.textContent?.trim()).toBe('All');
  await userEvent.keyboard('{ArrowRight}');
  await until(() => document.activeElement?.textContent?.trim() === 'Team');
  await userEvent.keyboard('{ArrowRight}');
  await until(() => document.activeElement?.textContent?.trim() === 'My', 'the arrows did not go round');
  await userEvent.keyboard('{End}');
  await until(() => el.value === 'team');
  expect(told).toStrictEqual(['team', 'mine', 'team']);
  radios[0].click();
  expect(el.value).toBe('mine');
  expect(told.at(-1)).toBe('mine');
  // Right to left, Right goes back.
  el.setAttribute('dir', 'rtl');
  el.querySelector<HTMLElement>('[tabindex="0"]')!.focus();
  await userEvent.keyboard('{ArrowLeft}');
  await until(() => el.value === 'all');
});

test('confirm: yes is true, Cancel and Escape false; a danger’s yes is the danger’s color and the focus starts on no', async () => {
  document.body.innerHTML = '<button id="from">Delete</button>';
  const from = document.querySelector<HTMLElement>('#from')!;
  from.focus();
  let asked = confirm({ title: 'Delete Acme?', body: 'Its people stay.', yes: 'Delete', danger: true });
  await until(() => !!document.querySelector('dialog.to-confirm[open]'), 'no dialog');
  const dialog = document.querySelector<HTMLDialogElement>('dialog.to-confirm')!;
  expect(dialog.getAttribute('role')).toBe('alertdialog');
  expect(document.getElementById(dialog.getAttribute('aria-labelledby')!)!.textContent).toBe('Delete Acme?');
  expect(document.getElementById(dialog.getAttribute('aria-describedby')!)!.textContent).toBe('Its people stay.');
  const yes = dialog.querySelector<HTMLButtonElement>('.to-confirm-yes')!;
  expect(yes.classList.contains('to-danger')).toBe(true);
  expect(getComputedStyle(yes).backgroundColor).not.toBe(getComputedStyle(dialog.querySelector('.to-confirm-no')!).backgroundColor);
  expect(document.activeElement?.textContent?.trim()).toBe('Cancel');
  await userEvent.keyboard('{Escape}');
  expect(await asked).toBe(false);
  expect(document.querySelector('dialog.to-confirm')).toBeNull();
  expect(document.activeElement).toBe(from);
  asked = confirm({ title: 'Delete Acme?', yes: 'Delete', danger: true });
  await until(() => !!document.querySelector('.to-confirm-yes'));
  document.querySelector<HTMLButtonElement>('.to-confirm-yes')!.click();
  expect(await asked).toBe(true);
  asked = confirm({ title: 'Copy it?' });
  await until(() => !!document.querySelector('.to-confirm-yes'));
  expect(document.activeElement?.textContent?.trim()).toBe('OK');
  expect(document.querySelector('.to-confirm-yes')!.classList.contains('primary')).toBe(true);
  await userEvent.keyboard('{Enter}');
  expect(await asked).toBe(true);
});

async function field(html: string): Promise<ToField> {
  document.body.innerHTML = html;
  const el = document.querySelector<ToField>('to-field')!;
  await el.updateComplete;
  return el;
}

test('a field edited in place: a click or its pencil opens it, Enter keeps, Escape lets go, leaving keeps; refused, the words go back', async () => {
  const el = await field('<to-field label="Title"></to-field>');
  el.value = 'Director';
  await el.updateComplete;
  const told: FieldChange[] = [];
  let answer: 'keep' | 'refuse' | 'later' = 'keep';
  let later: (ok: boolean) => void = () => {};
  el.addEventListener('fieldchange', (e) => {
    const ev = e as CustomEvent<FieldChange>;
    told.push(ev.detail);
    if (answer === 'refuse') ev.preventDefault();
    if (answer === 'later') ev.detail.wait(new Promise<boolean>((ok) => (later = ok)));
  });
  expect(el.textContent?.trim()).toBe('Director');
  const pencil = el.querySelector<HTMLButtonElement>('.to-fd-edit')!;
  expect(pencil.getAttribute('aria-label')).toBe('Edit Title');
  el.querySelector<HTMLElement>('.to-fd-text')!.click();
  await until(() => document.activeElement === el.field, 'a click on the words opened nothing');
  await userEvent.keyboard('Head of Strategy{Enter}');
  expect(told.at(-1)).toMatchObject({ value: 'Head of Strategy', before: 'Director' });
  await until(() => document.activeElement === el.querySelector('.to-fd-edit'), 'the focus did not come back to the pencil');
  expect(el.textContent?.trim()).toBe('Head of Strategy');
  // Escape lets it go.
  await userEvent.keyboard('{Enter}');
  await until(() => document.activeElement === el.field);
  await userEvent.keyboard('Nope{Escape}');
  await until(() => !el.field);
  expect(told.length).toBe(1);
  expect(el.textContent?.trim()).toBe('Head of Strategy');
  // Refused at once, and later: the words go back.
  answer = 'refuse';
  await el.edit();
  await userEvent.keyboard('Chief{Enter}');
  await el.updateComplete;
  expect(el.textContent?.trim()).toBe('Head of Strategy');
  answer = 'later';
  await el.edit();
  await userEvent.keyboard('Chair');
  // Leaving keeps it.
  el.field!.blur();
  await el.updateComplete;
  expect(el.textContent?.trim()).toBe('Chair');
  later(false);
  await until(() => el.textContent?.trim() === 'Head of Strategy', 'the refused words never went back');
  // The page's value given again is the truth.
  el.value = 'Partner';
  await el.updateComplete;
  expect(el.textContent?.trim()).toBe('Partner');
});

test('a field of a type: money in whole units read as the Spreadsheet reads it, words where a number belongs not kept, an option, a link, read-only', async () => {
  const el = await field('<to-field label="Size" type="money" currency="$"></to-field>');
  el.value = 12000;
  el.decimals = 0;
  await el.updateComplete;
  expect(el.textContent?.trim()).toBe('$12,000');
  const told: unknown[] = [];
  el.addEventListener('fieldchange', (e) => told.push((e as CustomEvent<FieldChange>).detail.value));
  await el.edit();
  expect(el.field!.value).toBe('12000');
  expect(el.field!.getAttribute('inputmode')).toBe('decimal');
  await userEvent.keyboard('{Control>}a{/Control}lots{Enter}');
  expect(el.field!.getAttribute('aria-invalid')).toBe('true');
  await userEvent.keyboard('{Control>}a{/Control}$1,500.40{Enter}');
  expect(told).toStrictEqual([1500.4]);
  await until(() => el.textContent?.trim() === '$1,500');
  const pick = await field('<to-field label="Stage" type="enum"></to-field>');
  pick.options = [
    { value: 'lead', label: 'Lead' },
    { value: 'won', label: 'Won' },
  ];
  pick.value = 'lead';
  await pick.updateComplete;
  expect(pick.textContent?.trim()).toBe('Lead');
  await pick.edit();
  const select = pick.field as HTMLSelectElement;
  select.value = 'won';
  select.dispatchEvent(new KeyboardEvent('keydown', { key: 'Enter', bubbles: true }));
  await pick.updateComplete;
  expect(pick.textContent?.trim()).toBe('Won');
  const link = await field('<to-field label="Website" type="url" href="#acme"></to-field>');
  link.value = 'acme.com';
  await link.updateComplete;
  link.querySelector<HTMLAnchorElement>('a')!.click();
  await link.updateComplete;
  expect(link.field).toBeNull();
  expect(location.hash).toBe('#acme');
  history.replaceState(null, '', location.pathname + location.search);
  link.readonly = true;
  await link.updateComplete;
  expect(link.querySelector('.to-fd-edit')).toBeNull();
  await link.edit();
  expect(link.field).toBeNull();
});
