// The invoice as a form: who, what and how much typed into boxes laid out like the paper, the sums done as they are
// typed, Enter starting the next line with the cursor in it; checked by the text saved (parseInvoice reads it).
import { test, expect } from 'vitest';
import { mount, settle, button, press, type } from './helpers.ts';
import { parseInvoice, spec } from '../../src/apps/invoice.def.ts';

const box = (el: ParentNode, label: string) => el.querySelector<HTMLInputElement>(`[aria-label="${label}"]`)!;
const sum = (el: ParentNode, what: string) => el.querySelector(`[data-inv="${what}"]`)!.textContent!.trim();

test('invoice: the parties, the dates and a line typed in; the sums follow; the text is the invoice', async () => {
  const { el, last } = await mount('invoice');
  // Empty: the form is there, every box a hint, the total nothing.
  expect(box(el, 'From, line 1').placeholder).toBe('Your name');
  expect(box(el, 'To, line 1').placeholder).toBe('Who this is for');
  expect(sum(el, 'total')).toBe('$0.00');
  expect(box(el, 'Date').type).toBe('date');
  type(box(el, 'From, line 1'), 'Harbor Studio');
  await settle(el);
  type(box(el, 'From, line 2'), '14 Quay Street');
  type(box(el, 'To, line 1'), 'Acme Ltd');
  type(box(el, 'Number'), '0042');
  type(box(el, 'Due'), '2027-03-31', 'change');
  type(box(el, 'Tax rate'), '8%');
  await settle(el);
  // An address typed on two lines is one setting with " | " between; a third box waits for the next line.
  expect(parseInvoice(last()!).fields).toMatchObject({ from: 'Harbor Studio | 14 Quay Street', to: 'Acme Ltd', number: '0042', due: '2027-03-31', tax: '8%' });
  expect(box(el, 'From, line 3')).toBeTruthy();
  // The first line, from the table's own button.
  button(el, /The first line/).click();
  await settle(el);
  expect(document.activeElement).toBe(box(el, 'What, line 1'));
  type(box(el, 'What, line 1'), 'Design');
  type(box(el, 'Qty, line 1'), '12');
  type(box(el, 'Units, line 1'), 'hours');
  type(box(el, 'Price, line 1'), '150');
  await settle(el);
  expect(sum(el, 'subtotal')).toBe('$1,800.00');
  expect(sum(el, 'taxed')).toBe('$144.00');
  expect(sum(el, 'total')).toBe('$1,944.00');
  expect(el.querySelector('.inv-items tbody td.amount')!.textContent).toBe('$1,800.00');
  const inv = parseInvoice(last()!);
  expect(inv.items).toEqual([{ what: 'Design', qty: 12, unit: 'hours', price: 150 }]);
  expect(last()).toMatch(/^---\nfrom: Harbor Studio \| 14 Quay Street\nto: Acme Ltd\nnumber: 0042\ndue: 2027-03-31\ntax: 8%\n---\nWhat \| Qty:number \| Units \| Price:money\n/);
});

test('invoice: Enter moves along a line and starts the next, Backspace in an empty line takes it away, × too', async () => {
  const { el, last } = await mount('invoice', spec.example);
  expect(el.querySelectorAll('.inv-items tbody tr')).toHaveLength(3);
  expect(sum(el, 'total')).toBe('$5,486.40');
  // Enter in the price of the last line: a fourth line, with the cursor in its first box.
  press(box(el, 'Price, line 3'), 'Enter');
  await settle(el);
  expect(el.querySelectorAll('.inv-items tbody tr')).toHaveLength(4);
  expect(document.activeElement).toBe(box(el, 'What, line 4'));
  // Enter in a box that is not the last moves along the line.
  type(box(el, 'What, line 4'), 'Review');
  press(box(el, 'What, line 4'), 'Enter');
  await settle(el);
  expect(document.activeElement).toBe(box(el, 'Qty, line 4'));
  // An empty line is not written; a line with words is.
  press(box(el, 'Price, line 4'), 'Enter');
  await settle(el);
  expect(el.querySelectorAll('.inv-items tbody tr')).toHaveLength(5);
  expect(parseInvoice(last()!).items.map((i) => i.what)).toEqual(['Design', 'Build', 'Hosting for a year', 'Review']);
  // Backspace in the empty fifth line takes it away, and the cursor goes to the end of the line before.
  press(box(el, 'What, line 5'), 'Backspace');
  await settle(el);
  expect(el.querySelectorAll('.inv-items tbody tr')).toHaveLength(4);
  expect(document.activeElement).toBe(box(el, 'Price, line 4'));
  // The × on a line.
  button(el, 'Remove line 2').click();
  await settle(el);
  expect(parseInvoice(last()!).items.map((i) => i.what)).toEqual(['Design', 'Hosting for a year', 'Review']);
  expect(sum(el, 'total')).toBe('$2,462.40');
  // A changed quantity changes the sums; a cleared date is a cleared date.
  type(box(el, 'Qty, line 1'), '10');
  type(box(el, 'Due'), '', 'change');
  await settle(el);
  expect(sum(el, 'total')).toBe('$2,138.40');
  expect(parseInvoice(last()!).fields.due).toBeUndefined();
  // Notes at the foot, a line each.
  type(el.querySelector<HTMLTextAreaElement>('.inv-notes'), 'Thank you.\nPay by transfer.');
  await settle(el);
  expect(parseInvoice(last()!).notes).toEqual(['Thank you.', 'Pay by transfer.']);
});

test('invoice: the bar inserts a line or goes to the notes, and the example fills the form', async () => {
  const { el, last } = await mount('invoice');
  button(el, 'Start from an example').click();
  await settle(el);
  expect(box(el, 'From, line 1').value).toBe('Harbor Studio');
  expect(box(el, 'Due').value).toBe('2027-03-31');
  expect(last()).toBe(spec.example);
  // Once there are words, the example is not offered.
  expect(() => button(el, 'Start from an example')).toThrow();
  // Insert: a line, with the cursor in it.
  el.querySelector<HTMLElement>('to-insert sl-button')!.click();
  await settle(el);
  [...el.querySelectorAll<HTMLElement>('to-insert [role="option"]')].find((o) => o.textContent?.includes('A line'))!.click();
  await settle(el);
  expect(document.activeElement).toBe(box(el, 'What, line 4'));
});
