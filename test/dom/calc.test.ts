// The calculator worked as a person would: typed into, tapped, the tape changed where it stands.
import { test, expect, beforeEach } from 'vitest';
import { mount } from './helpers.ts';
import { prefs, box, settleAll } from './helpers-more.ts';
import { idle, typeKeys, key, until } from './helpers-shell.ts';
import { hasEngine, parseCalc } from '../../src/lib/calc.ts';

beforeEach(() => prefs());

test('calculator: typed, the line is worked out as it goes; Enter puts it on the tape; the tape is a program', async () => {
  const m = await mount('calc');
  const calc = () => m.el;
  const display = () => box(calc(), 'Expression');
  const live = () => calc().querySelector('.calc-live')!.textContent;
  const tape = () => [...calc().querySelectorAll('.calc-tape li')].map((li) => `${li.querySelector<HTMLInputElement>('.calc-line')!.value} ${li.querySelector('.calc-ans')!.textContent}`);
  // Typing, as keys do.
  display().focus();
  await typeKeys('12+3');
  expect(display().value).toBe('12+3');
  expect(live()).toBe('15');
  await key('Enter');
  expect(tape()).toEqual(['12+3 = 15']);
  expect(display().value).toBe('');
  // A name kept for the lines after; "ans" is the line before.
  await typeKeys('a = 12');
  await key('Enter');
  await typeKeys('a*3');
  expect(live()).toBe('36');
  await key('Enter');
  await typeKeys('ans+1');
  await key('Enter');
  expect(tape()).toEqual(['12+3 = 15', 'a = 12 = 12', 'a*3 = 36', 'ans+1 = 37']);
  expect(parseCalc(m.last()!).lines).toEqual(['12+3', 'a = 12', 'a*3', 'ans+1']);
  // A line changed where it stands: the lines after it follow.
  const second = calc().querySelectorAll<HTMLInputElement>('.calc-line')[1];
  second.value = 'a = 10';
  second.dispatchEvent(new Event('change', { bubbles: true }));
  await settleAll();
  expect(tape()).toEqual(['12+3 = 15', 'a = 10 = 10', 'a*3 = 30', 'ans+1 = 31']);
  // Up recalls the line before into the line.
  display().focus();
  await key('ArrowUp');
  expect(display().value).toBe('ans+1');
  await key('ArrowUp');
  expect(display().value).toBe('a*3');
  await key('Escape');
  expect(display().value).toBe('');
  // The keys type at the caret, and leave the focus where it is.
  const press = async (k: string) => {
    [...calc().querySelectorAll<HTMLButtonElement>('.calc-keys button')].find((b) => b.textContent === k)!.click();
    await idle();
  };
  await typeKeys('2+');
  await press('7');
  await press('×');
  await press('√');
  await press('9');
  await press(')');
  expect(display().value).toBe('2+7×sqrt(9)');
  expect(live()).toBe('23');
  expect(document.activeElement).toBe(display());
  await press('⌫');
  expect(display().value).toBe('2+7×sqrt(9');
  await press('C');
  expect(display().value).toBe('');
  // An answer on the tape is a key too.
  calc().querySelector<HTMLButtonElement>('.calc-ans')!.click();
  await idle();
  expect(display().value).toBe('15');
  // A line taken away.
  calc().querySelector<HTMLButtonElement>('.calc-tape li .to-icon-btn')!.click();
  await settleAll();
  expect(tape()).toHaveLength(3);
  expect(parseCalc(m.last()!).lines[0]).toBe('a = 10');
  // Units: the second engine, fetched when the calculator opened, reads what the hand parser cannot.
  await until(() => hasEngine(), 'the units engine');
  await press('C');
  await typeKeys('3 inch to cm');
  expect(live()).toBe('7.62 cm');
  await key('Enter');
  expect(tape().at(-1)).toBe('3 inch to cm = 7.62 cm');
  // The page beside the tape says the same.
  expect(calc().querySelector('.calc-right svg')!.textContent).toContain('7.62 cm');
});
