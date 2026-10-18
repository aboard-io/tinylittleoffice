// The Board's definition as the registry reads it, in a page (its words and its drawing are the kit's, which runs in
// one): its name, a blank board, the cards as drawn, as the Spreadsheet shows their cells (the model's words, which
// are the kit's own `cellAsShown` for any board), the pages a print, a file or a thumbnail gets, the board as words,
// the files and the hand-off, and the templates. The model's are model.unit.test.ts, under Node.
import fc from 'fast-check';
import { expect, test } from 'vitest';
import { evaluateTable, parse, tableAt, write } from '../../../doc/index.ts';
import { appOf } from '../../../kit/core/apps.ts';
import { cellText as cellAsShown } from '../../sheet/view.ts';
import def from '../def.ts';
import { blankBoard, boardOf, lanesOf } from '../model.ts';
import { templates } from '../templates.ts';
import { boardPages, boardText } from '../view.ts';
import { arbitraryBoard, RUNS } from './arbitrary.ts';
import './page.ts';

const BOARD = [
  '---',
  'lanes: To do, Doing, Done, Blocked',
  '---',
  'Task | Owner | Status:option | Cost:money',
  '--- | --- | --- | ---',
  'Write the brief | Ana | Doing | 120',
  'Book the room | Ben | To do |',
  'Send invites | Ana | Doing | 15.5',
  'Order food | Cy | Done | 300',
  'Print badges | | To do | =D1*2',
  '',
].join('\n');

test('the definition: the Board, named in its words, a plan, registered under its id; a blank board is the model’s in English', async () => {
  expect(appOf('board')).toBe(def);
  expect([def.id, def.name, def.noun, def.group, def.blurb]).toStrictEqual(['board', 'Board', 'board', 'Plan', 'Cards in lanes by their status, each card a row of a table.']);
  expect(Array.isArray(def.icon)).toBe(true);
  expect(def.blank()).toBe(blankBoard());
  expect(def.title('---\ntitle: Launch\n---\nTask | Status\n--- | ---\n')).toBe('Launch');
  // Renamed: the title on one line, the rest of the document as it was.
  const renamed = parse(def.retitle(BOARD, 'Launch\nplan '));
  expect(renamed.head).toStrictEqual({ lanes: 'To do, Doing, Done, Blocked', title: 'Launch plan' });
  expect(renamed.blocks).toStrictEqual(parse(BOARD).blocks);
  // Its commands are the Board's scope, labeled by its messages.
  const { default: commands } = await def.commands!();
  expect(commands.every((c) => c.id.startsWith('board.'))).toBe(true);
  expect(commands.find((c) => c.id === 'board.lane.rename')?.label).toBe('board-rename-lane');
});

test('the cards as drawn: a field as its column shows it, money in dollars, a formula’s value; a title written "\'007" drawn 007', () => {
  const cards = boardOf(parse(BOARD)).cards;
  const card = (row: number) => cards.find((c) => c.row === row)!;
  expect([card(0).title, card(0).fields.map((f) => [f.name, f.shown])]).toEqual([
    'Write the brief',
    [
      ['Owner', 'Ana'],
      ['Cost', '$120.00'],
    ],
  ]);
  expect(card(4).fields.map((f) => f.shown)).toEqual(['$240.00']);
  // Words written as words are drawn as typed, on the page and in words; a formula as its value.
  const quoted = parse("Task | Status | N:number\n--- | --- | ---\n'007 | To do | 1200\n'=1+1 | To do |\n=2+2 | To do |\n");
  expect(boardPages(quoted)[0].alt).toBe('To do (3): 007, =1+1, 4');
  expect(boardPages(quoted, true)[0].alt).toBe('To do (3): 007, =1+1, 4');
  expect(boardText(quoted)[1]).toEqual({
    k: 'list',
    ord: false,
    items: [{ runs: [{ t: '007', b: true }, { t: ' · N: 1,200' }] }, { runs: [{ t: '=1+1', b: true }] }, { runs: [{ t: '4', b: true }] }],
  });
});

test('for any board, each title and field the model shows is the kit’s cellAsShown of its cell worked out: the Spreadsheet’s words', () => {
  fc.assert(
    fc.property(arbitraryBoard(), fc.constantFrom(undefined, '€', 'GBP'), (d, currency) => {
      const doc = currency ? { ...d, head: { ...d.head, currency } } : d;
      const v = boardOf(doc);
      const values = evaluateTable(tableAt(doc, v.at)!).values;
      const kit = (r: number, c: number) =>
        cellAsShown(values[r]?.[c] ?? null, v.cols[c].type, v.cols[c].currency || doc.head.currency || undefined)
          .replace(/\s+/g, ' ')
          .trim();
      for (const card of v.cards) {
        expect(card.title).toBe(v.titleCol >= 0 ? kit(card.row, v.titleCol) : '');
        for (const f of card.fields) expect(f.shown).toBe(kit(card.row, f.col));
      }
    }),
    { numRuns: RUNS },
  );
});

test('view(): pages never empty, holding every card’s title; four lanes to a landscape page, the rest wrapping onto more', () => {
  const docs = [BOARD, blankBoard(), '', 'Just words.\n', ...templates().map((x) => x.doc)];
  for (const text of docs) {
    for (const small of [false, true]) {
      const pages = def.view(text, { small, thumb: small });
      expect(pages.length).toBeGreaterThan(0);
      for (const p of pages) expect(p.svg.length && p.w > 0 && p.h > 0).toBeTruthy();
    }
    const svg = def
      .view(text)
      .map((p) => p.svg)
      .join('');
    for (const c of boardOf(parse(text)).cards) expect(svg).toContain(c.title.replace(/&/g, '&amp;').split(' ')[0]);
  }
  const six = parse(templates().find((x) => x.id === 'pipeline')!.doc);
  const pages = boardPages(six);
  expect(pages.length).toBe(2);
  expect(pages.map((p) => [p.w, p.h >= 816])).toEqual([
    [1056, true],
    [1056, true],
  ]);
  expect(pages[1].alt).toMatch(/^Won \(1\): Brand refresh\. Lost/);
  // Small: one landscape page, four by three.
  const [thumb] = boardPages(six, true);
  expect(thumb.h).toBe(Math.round((thumb.w * 3) / 4));
  // A page draws a card whole: a long title and six fields, none cut.
  const title = 'Draft the long statement of work for the regional rollout and send it round';
  const wide = parse(`Task | Status | A | B | C | D | E | F\n--- | --- | --- | --- | --- | --- | --- | ---\n${title} | Doing | one | two | three | four | five | six\n`);
  const [page] = boardPages(wide);
  for (const word of title.split(' ')) expect(page.svg).toContain(word);
  for (const value of ['one', 'two', 'three', 'four', 'five', 'six']) expect(page.svg).toMatch(new RegExp(`[A-F]: ${value}<`));
  expect(page.svg).not.toContain('…');
  // A board with no lanes is one page saying it has no cards.
  expect(boardPages(parse('Just words.\n'))[0].alt).toBe('No cards');
});

test('text(): lane by lane, card by card, every card there', () => {
  for (const tpl of templates()) {
    const nodes = def.text!(tpl.doc);
    const said = JSON.stringify(nodes);
    for (const c of boardOf(parse(tpl.doc)).cards) expect(said).toContain(JSON.stringify(c.title).slice(1, -1));
  }
  expect(boardText(parse(BOARD))).toEqual([
    { k: 'h', level: 2, runs: [{ t: 'To do' }] },
    {
      k: 'list',
      ord: false,
      items: [{ runs: [{ t: 'Book the room', b: true }, { t: ' · Owner: Ben' }] }, { runs: [{ t: 'Print badges', b: true }, { t: ' · Cost: $240.00' }] }],
    },
    { k: 'h', level: 2, runs: [{ t: 'Doing' }] },
    {
      k: 'list',
      ord: false,
      items: [{ runs: [{ t: 'Write the brief', b: true }, { t: ' · Owner: Ana, Cost: $120.00' }] }, { runs: [{ t: 'Send invites', b: true }, { t: ' · Owner: Ana, Cost: $15.50' }] }],
    },
    { k: 'h', level: 2, runs: [{ t: 'Done' }] },
    { k: 'list', ord: false, items: [{ runs: [{ t: 'Order food', b: true }, { t: ' · Owner: Cy, Cost: $300.00' }] }] },
    { k: 'h', level: 2, runs: [{ t: 'Blocked' }] },
    { k: 'p', runs: [{ t: 'No cards' }] },
  ]);
  // A document with no board is its own words.
  expect(def.text!('Just words.\n')).toEqual([{ k: 'p', runs: [{ t: 'Just words.' }] }]);
});

test('the files and the hand-off: the Spreadsheet’s CSV, the same text to the Spreadsheet', async () => {
  const csv = def.exports!.find((x) => x.ext === 'csv')!;
  expect(csv.label()).toBe('CSV');
  const bytes = (await csv.build(BOARD, { def, title: '', link: '' })) as Uint8Array;
  const text = new TextDecoder('utf-8', { ignoreBOM: true }).decode(bytes);
  expect(text.startsWith('﻿')).toBe(true);
  expect(text).toContain('Write the brief');
  const handoff = def.handoffs!.find((h) => h.to === 'sheet')!;
  expect(handoff.label()).toBe('Open the cards in a spreadsheet');
  expect(handoff.convert(BOARD)).toBe(BOARD);
});

test('the templates: canonical, each a status column, a title and typed fields, its lanes in the head; named in the Board’s words', async () => {
  const all = await def.templates();
  expect(all.map((x) => [x.id, x.name])).toEqual([
    ['project', 'Project board'],
    ['pipeline', 'Sales pipeline'],
    ['hiring', 'Hiring'],
    ['content', 'Content calendar'],
  ]);
  for (const tpl of all) {
    expect(write(parse(tpl.doc))).toBe(tpl.doc);
    expect(tpl.blurb).toBeTruthy();
    const v = boardOf(parse(tpl.doc));
    expect(v.laneCol).toBeGreaterThanOrEqual(0);
    expect(v.cols[v.laneCol].type).toBe('option');
    expect(v.cols.some((c) => c.type === 'date')).toBe(true);
    expect(v.lanes.map((l) => l.name)).toEqual(lanesOf(parse(tpl.doc).head.lanes));
  }
  expect(boardOf(parse(all[1].doc)).lanes.map((l) => l.name)).toEqual(['Inbound', 'Qualifying', 'Proposal', 'Negotiating', 'Won', 'Lost']);
});
