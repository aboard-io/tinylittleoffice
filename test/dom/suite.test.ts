// The suite at large (ported from e2e/suite.spec.ts): the home page, the meter, going back, a document's own QR code;
// and Sheet worked as a person would, tapped, typed, pointed, copied and pasted, checked by the cells it shows and the text it saves.
import { test, expect } from 'vitest';
import { mount } from './helpers.ts';
import { open, reopen, idle, until, link, $, $$, text, tap, fill, typeKeys, key, clip, focused, button, choose, menu, write, cell, downloads } from './helpers-shell.ts';
import { parseGrid, typesOf, chartOf } from '../../src/lib/formula.ts';
import { parseDoc } from '../../src/lib/richtext.ts';
// Deck and Draw, in a file of their own; one file to vitest, so everything is loaded, and warmed, once.
import './suite-deck.ts';

test('the launcher lists every app', async () => {
  await open('');
  const launcher = $$('.to-launcher a:not(.drive-tile)');
  expect(launcher).toHaveLength(49);
  expect(text(launcher[0])).toContain('Sheet');
});

test('the meter flags a document that outgrows the URL', async () => {
  await open('#/v0/write');
  const meter = $('.to-meter');
  expect(meter.classList.contains('over')).toBe(false);
  let junk = '';
  let seed = 12345;
  for (let i = 0; i < 2600; i++) {
    seed = (seed * 1103515245 + 12345) & 0x7fffffff;
    junk += String.fromCharCode(33 + (seed % 90));
  }
  const page = $('.write-page');
  page.textContent = junk;
  page.dispatchEvent(new Event('input', { bubbles: true }));
  await idle();
  expect(meter.classList.contains('over')).toBe(true);
  expect(text($('.to-panel-head'))).toContain('over limit');
  expect(location.href.length).toBeGreaterThan(2048);
});

test('back and forward move between documents', async () => {
  await open('#/v0/sheet');
  tap(cell('A1'));
  fill(cell('A1'), 'hello');
  await idle();
  // To Write through the menu, then back.
  button('Menu').click();
  await idle();
  $$<HTMLAnchorElement>('#nav-drawer .to-drawer-nav a').find((a) => text(a) === 'Write')!.click();
  await until(() => document.querySelector('[aria-label="Document"]'), 'Write');
  history.back();
  await until(() => document.querySelector('input[aria-label="A1"]'), 'the sheet again');
  expect(cell('A1').value).toBe('hello');
});

test('a document can carry its own QR code, so a reader can take a copy', async () => {
  await open('#/v0/write');
  write('Document', 'Take this home');
  await idle();
  const page = $('[aria-label="Document"]');
  // Return at the end of the line, as the caret is there after typing.
  getSelection()!.collapse(page.querySelector('p')!.firstChild!, 'Take this home'.length);
  const insert = $<HTMLInputElement>('input[aria-label="Insert"]');
  fill(insert, 'qr code of this');
  await idle();
  await key('Enter', {}, insert);
  const embed = () => $('to-embed[ref="qr/self"]');
  const code = () => embed().shadowRoot!.querySelector('svg path[shape-rendering="crispEdges"]');
  // The code is drawn, named for what it is, and keeps up with the document.
  expect(code()).toBeTruthy();
  expect(embed().shadowRoot!.querySelector('svg[role="img"]')!.getAttribute('aria-label')).toBe('This document, as a QR code');
  expect(location.hash).toMatch(/^#\/v0\/write\//);
  expect(parseDoc(link().env!.body).map((b) => b.k)).toContain('e');
  const d1 = code()!.getAttribute('d');
  const url1 = location.hash;
  const words = page.querySelector('p')!.firstChild as Text;
  words.data += ' tonight';
  page.dispatchEvent(new InputEvent('input', { bubbles: true, inputType: 'insertText', data: ' tonight' }));
  await idle();
  expect(location.hash).not.toBe(url1);
  await until(() => code()!.getAttribute('d') !== d1, 'the code to follow the document');
  // Reopened, it is still the document's own code; the download carries it.
  await reopen();
  expect(code()).toBeTruthy();
  downloads.length = 0;
  await menu('Download', /Web page/);
  const file = await until(() => downloads[0], 'the page');
  expect(await file.blob.text()).toContain('crispEdges');
  // On a slide too.
  await open('#/v0/deck');
  write('Headline', 'Thanks');
  const add = $<HTMLInputElement>('input[aria-label="Add a slide"]');
  fill(add, 'qr code of this');
  await idle();
  await key('Enter', {}, add);
  expect($$('.deck-slide to-embed[ref="qr/self"]')).toHaveLength(1);
});

/** A cell tapped and filled, as Playwright's fill() does. */
async function put(ref: string, v: string) {
  tap(cell(ref));
  fill(cell(ref), v);
  await idle();
}
const bar = () => $('sl-input[label="Formula"]') as HTMLElement & { value: string };
const selected = () => text($('[aria-label="Selected cells"]'));
/** Open the sheet again from the text it saved: what a reopened link shows. */
const remount = async (saved: string | undefined) => mount('sheet', saved ?? '');

test('sheet: formulas compute, and persist in what is saved', async () => {
  const { last } = await mount('sheet');
  for (const [ref, v] of [['A1', '10'], ['A2', '32'], ['A3', '=SUM(A1:A2)*2'], ['B1', '=A3/0'], ['C1', 'Total'], ['C2', '=ROUND(AVG(A1:A3),1)']]) await put(ref, v);
  tap(cell('C3'));
  await idle();
  expect(cell('A3').value).toBe('84');
  expect(cell('B1').value).toBe('#DIV/0');
  expect(cell('C2').value).toBe('42');
  expect(parseGrid(last()!).slice(0, 3).map((r) => r.slice(0, 3))).toEqual([['10', '=A3/0', 'Total'], ['32', '', '=ROUND(AVG(A1:A3),1)'], ['=SUM(A1:A2)*2', '', '']]);

  const again = await remount(last());
  expect(cell('A3').value).toBe('84');
  expect(cell('C1').value).toBe('Total');
  tap(cell('A3'));
  await idle();
  expect(cell('A3').value).toBe('=SUM(A1:A2)*2');
  expect(bar().value).toBe('=SUM(A1:A2)*2');
  await key('Enter');
  expect(focused()).toBe(cell('A4'));
  // Editing in the formula bar writes to the selected cell.
  fill(bar(), '=A1*3');
  await idle();
  tap(cell('B4'));
  await idle();
  expect(cell('A4').value).toBe('30');
  expect(parseGrid(again.last()!)[3][0]).toBe('=A1*3');
});

test('sheet: tapping cells builds a formula, and every function is one tap away', async () => {
  await mount('sheet');
  await put('A1', '10');
  await put('A2', '32');
  tap(cell('B1'));
  await typeKeys('=SUM(');
  tap(cell('A2'));
  await idle();
  expect(focused()).toBe(cell('B1'));
  expect(cell('B1').value).toBe('=SUM(A2');
  // A second tap corrects the first rather than piling up references.
  tap(cell('A1'));
  await idle();
  expect(cell('B1').value).toBe('=SUM(A1');
  await typeKeys(':');
  tap(cell('A2'));
  await idle();
  await typeKeys(')');
  expect(cell('B1').value).toBe('=SUM(A1:A2)');
  // Once the formula is complete a tap just moves on.
  tap(cell('C1'));
  await idle();
  expect(focused()).toBe(cell('C1'));
  expect(cell('B1').value).toBe('42');

  // The function menu starts a formula; taps fill in its arguments.
  const fns = $$('sl-menu-item', button('Functions').closest('sl-dropdown')!);
  expect(fns).toHaveLength(32);
  choose(fns.find((i) => text(i).startsWith('MAX'))!);
  await idle();
  expect(focused()).toBe(cell('C1'));
  expect(cell('C1').value).toBe('=MAX(');
  tap(cell('A1'));
  await idle();
  await typeKeys(',');
  tap(cell('A2'));
  await idle();
  await typeKeys(')');
  await key('Enter');
  expect(cell('C1').value).toBe('32');

  // Tapping also works from the formula bar.
  tap(cell('B2'));
  await idle();
  bar().focus();
  await idle();
  await typeKeys('=A1*');
  tap(cell('A2'));
  await idle();
  expect(bar().value).toBe('=A1*A2');
  await key('Enter');
  expect(cell('B2').value).toBe('320');

  // Arrow keys point at cells the same way: up from D3 is D2, then the pointer keeps moving.
  tap(cell('D3'));
  await typeKeys('=A1+');
  await key('ArrowUp');
  expect(focused()).toBe(cell('D3'));
  expect(cell('D3').value).toBe('=A1+D2');
  await key('ArrowLeft');
  await key('ArrowLeft');
  expect(cell('D3').value).toBe('=A1+B2');
  await typeKeys('*2');
  // With the formula complete, the arrows move between cells again.
  await key('ArrowDown');
  expect(focused()).toBe(cell('D4'));
  expect(cell('D3').value).toBe('650');

  // Enough for a small model: conditions and the time value of money.
  await put('E1', '=IF(B1>40, NPV(0.1, A1:A2), 0)');
  await put('E2', '=ROUND(PMT(0.05/12, 60, 20000), 2)');
  tap(cell('F1'));
  await idle();
  expect(cell('E1').value).toBe('35.53719008');
  expect(cell('E2').value).toBe('-377.42');
});

test('sheet: blocks of cells are selected, copied, cut, cleared and filled', async () => {
  const { last } = await mount('sheet');
  for (const [at, v] of [['A1', '1'], ['A2', '2'], ['B1', '10'], ['B2', '20'], ['C1', '=A1+B1']]) await put(at, v);

  // Shift+arrows stretch a block from the cell you are in.
  cell('C1').focus();
  await key('ArrowDown', { shift: true });
  expect(selected()).toBe('C1:C2');
  expect($$('table.sheet td.in')).toHaveLength(2);
  await key('Escape');
  expect(selected()).toBe('C1');

  // Copy a cell, select a block, paste: every copy points at its own neighbours.
  cell('C1').focus();
  await clip('copy');
  cell('C2').focus();
  await key('ArrowDown', { shift: true });
  await clip('paste');
  tap(cell('F1'));
  await idle();
  expect(cell('C2').value).toBe('22');
  tap(cell('C3'));
  await idle();
  expect(cell('C3').value).toBe('=A3+B3');

  // Cut a block and paste it elsewhere: it moves, and the old cells are empty.
  tap(cell('A1'));
  cell('A1').select();
  await key('ArrowDown', { shift: true });
  await key('ArrowRight', { shift: true });
  expect(selected()).toBe('A1:B2');
  await clip('cut');
  expect(cell('B2').value).toBe('');
  tap(cell('D5'));
  await clip('paste');
  expect(selected()).toBe('D5:E6');
  tap(cell('F1'));
  await idle();
  expect(cell('E6').value).toBe('20');
  expect(cell('D5').value).toBe('1');

  // Rows copied from another program arrive as cells.
  await navigator.clipboard.writeText('North\t100\nSouth\t250\n');
  tap(cell('A10'));
  await clip('paste');
  tap(cell('F1'));
  await idle();
  expect(cell('A11').value).toBe('South');
  expect(cell('B11').value).toBe('250');

  // Delete clears a whole block.
  tap(cell('A10'));
  cell('A10').select();
  await key('ArrowDown', { shift: true });
  await key('ArrowRight', { shift: true });
  await key('Delete');
  expect(cell('B11').value).toBe('');
  expect(cell('A10').value).toBe('');

  // A block's first row carries down it with Fill (the corner handle, dragged, is e2e's).
  await put('A1', '5');
  await put('B1', '=A1*2');
  tap(cell('A1'));
  cell('A1').select();
  await key('ArrowDown', { shift: true });
  await key('ArrowDown', { shift: true });
  await key('ArrowRight', { shift: true });
  expect(selected()).toBe('A1:B3');
  button('Fill down from the top row').click();
  await idle();
  tap(cell('F1'));
  await idle();
  expect(cell('A3').value).toBe('5');
  expect(cell('B3').value).toBe('10');
  expect(parseGrid(last()!)[2].slice(0, 2)).toEqual(['5', '=A3*2']);
});

test('sheet: charts suggest themselves and travel with the sheet', async () => {
  const { last } = await mount('sheet');
  for (const [ref, v] of [['A1', 'Item'], ['B1', 'Cost'], ['A2', 'Rent'], ['B2', '1200'], ['A3', 'Food'], ['B3', '600'], ['A4', 'Fun'], ['B4', '200']]) await put(ref, v);
  tap(cell('C1'));
  await idle();
  expect(document.querySelector('.sheet-chart')).toBeNull();
  const pick = () => $('sl-select.sheet-chart-pick') as HTMLElement & { value: string };
  // Three parts of a whole: a pie is suggested.
  expect(text($('sl-option[value="pie"]', pick()))).toContain('suggested');
  const choosePick = async (v: string) => {
    pick().value = v;
    pick().dispatchEvent(new CustomEvent('sl-change', { bubbles: true, composed: true }));
    await idle();
  };
  await choosePick('pie');
  const chart = () => $('.sheet-chart svg');
  const pie = () => {
    // Three slices (each with a white edge); the second and third also wear a pattern, for eyes that do not see the colours.
    expect(chart().querySelectorAll('svg > path[stroke="#fff"], path[stroke-width="2"]')).toHaveLength(3);
    expect(chart().querySelectorAll('path[fill^="url(#p"]')).toHaveLength(2);
  };
  pie();
  expect(text(chart())).toContain('Rent');
  expect(text(chart())).toContain('60%');
  expect(chartOf(last()!)).toBe('pie');
  await remount(last());
  pie();
  await choosePick('bar');
  expect(chart().querySelectorAll('rect[rx="2"]')).toHaveLength(3);
});

test('sheet: columns have types, and dates do arithmetic', async () => {
  const { last } = await mount('sheet');
  const setType = async (col: string, type: string) => {
    const dropdown = button(new RegExp(`^Column ${col}:`)).closest('sl-dropdown')!;
    choose($$('sl-menu-item', dropdown).find((i) => text(i).startsWith(type))!);
    await idle();
  };
  await setType('A', 'Date');
  await setType('B', 'Date');
  await setType('D', 'Money');
  await setType('E', 'Link');
  await setType('F', 'Checkbox');
  expect(text(button(/^Column A: Date/))).toContain('Date');

  await put('A1', '2027-01-31');
  await put('B1', '3/1/2027');
  await put('C1', '=B1-A1');
  await put('A2', '=A1+30');
  await put('B2', '=EDATE(A1, 1)');
  await put('D1', '1200.5');
  await put('E1', 'https://example.com/report');
  tap(cell('F1'));
  await key(' ');
  tap(cell('C3'));
  await idle();
  // A date less a date is days; a date plus days is a date.
  expect(cell('C1').value).toBe('29');
  expect(cell('B1').value).toBe('2027-03-01');
  expect(cell('A2').value).toBe('2027-03-02');
  expect(cell('B2').value).toBe('2027-02-28');
  expect(cell('D1').value).toBe('$1,200.50');
  expect(cell('F1').value).toBe('☑');
  // A link opens from its cell.
  expect($('a[aria-label="Open https://example.com/report"]').getAttribute('href')).toBe('https://example.com/report');
  expect(typesOf(last()!).slice(0, 6)).toEqual(['d', 'd', 't', '$', 'u', 'c']);

  await remount(last());
  expect(cell('C1').value).toBe('29');
  expect(cell('D1').value).toBe('$1,200.50');
  expect(button(/^Column E: Link/)).toBeTruthy();
  // Rich text shows its emphasis when you are not typing in it.
  await setType('C', 'Rich text');
  await put('C2', 'Very *important* thing');
  tap(cell('C3'));
  await idle();
  expect(text($('table.sheet td .rich .b'))).toBe('important');
});
