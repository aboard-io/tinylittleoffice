// The Board as a view of a table, each command as the ops it produces (applied, and inverted back), the drawing, the
// words and the files: under node.
import fc from 'fast-check';
import { expect, test } from 'vitest';
import { applyAll, column, invertAll, isLocked, parse, tableAt, write, type Doc, type Op } from '../../../doc/index.ts';
import { arbitraryDoc, arbitraryTable, RUNS } from '../../../../test/doc/tlo-grammar.ts';
import def from '../def.ts';
import { sheetToBoard } from '../../sheet/convert.ts';
import {
  addCard,
  addLane,
  blankBoard,
  boardOf,
  cardsTable,
  duplicateCards,
  laneColumn,
  lanesOf,
  lanesText,
  moveCard,
  moveCards,
  moveLane,
  pasteCards,
  removeCard,
  removeCards,
  removeLane,
  renameLane,
  setTitle,
  titleColumn,
} from '../model.ts';
import { templates } from '../templates.ts';
import { boardPages, boardText, shownCards } from '../view.ts';

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

const names = (d: Doc) => boardOf(d).lanes.map((l) => [l.name, l.cards.map((c) => c.title)]);
/** The ops applied, then their inverse: the document comes back exactly. */
function roundTrip(d: Doc, ops: Op[]): Doc {
  const after = applyAll(d, ops);
  expect(applyAll(after, invertAll(d, ops))).toStrictEqual(d);
  return after;
}

test('the lane column: Status or Stage by name, else the first option column, else the last', () => {
  const cols = (...h: string[]) => ({ cols: h.map(column) });
  expect(laneColumn(cols('Task', 'Priority:option', 'stage').cols)).toBe(2);
  expect(laneColumn(cols('Task', 'STATUS', 'Kind:option').cols)).toBe(1);
  expect(laneColumn(cols('Task', 'Kind:option', 'Owner').cols)).toBe(1);
  expect(laneColumn(cols('Task', 'Owner', 'Where').cols)).toBe(2);
  expect(laneColumn([])).toBe(-1);
  // The title: the first column of words that is not the lane's, else the first other one.
  expect(titleColumn(cols('Cost:money', 'Task', 'Status').cols, 2)).toBe(1);
  expect(titleColumn(cols('Cost:money', 'Status').cols, 1)).toBe(0);
  expect(titleColumn(cols('Status').cols, 0)).toBe(-1);
});

test('the lanes: in the order lanes: gives, an empty one kept; the rest as the rows first hold them; the nameless lane for empty cells', () => {
  const d = parse(BOARD);
  expect(names(d)).toEqual([
    ['To do', ['Book the room', 'Print badges']],
    ['Doing', ['Write the brief', 'Send invites']],
    ['Done', ['Order food']],
    ['Blocked', []],
  ]);
  const v = boardOf(d);
  expect([v.laneCol, v.titleCol]).toEqual([2, 0]);
  expect(v.cards.map((c) => c.row)).toEqual([1, 4, 0, 2, 3]);
  expect(v.cards[0].fields).toEqual([{ col: 1, name: 'Owner', raw: 'Ben' }]);
  // Without lanes:, by first appearance; a row with no status is in the lane of no name.
  const loose = parse('Task | Stage\n--- | ---\na | Won\nb | \nc | Lost\nd | Won\n');
  expect(names(loose)).toEqual([
    ['Won', ['a', 'd']],
    ['', ['b']],
    ['Lost', ['c']],
  ]);
  // No table: the head's lanes alone, an empty board.
  expect(names(parse('---\nlanes: A, B\n---\nWords.\n'))).toEqual([
    ['A', []],
    ['B', []],
  ]);
  expect(boardOf(parse('')).lanes).toEqual([]);
});

test('lanes: is names between commas, a comma in a name escaped; empty and repeated ones left out', () => {
  expect(lanesOf(' To do ,Doing,, Doing, Won\\, finally ')).toEqual(['To do', 'Doing', 'Won, finally']);
  expect(lanesText(['To do', 'Won, finally', 'a\\b'])).toBe('To do, Won\\, finally, a\\\\b');
  expect(lanesOf(lanesText(['To do', 'Won, finally', 'a\\b']))).toEqual(['To do', 'Won, finally', 'a\\b']);
  expect(lanesText([])).toBeUndefined();
  expect(lanesOf(lanesText(['x\\', 'two lines']))).toEqual(['x\\', 'two lines']);
  expect(lanesOf('a\\b, c')).toEqual(['a\\b', 'c']);
});

test('a blank board: To do, Doing and Done, a table of a title and a status with no cards; canonical', () => {
  const b = blankBoard();
  expect(write(parse(b))).toBe(b);
  expect(names(parse(b))).toEqual([
    ['To do', []],
    ['Doing', []],
    ['Done', []],
  ]);
  expect(def.blank()).toBe(b);
});

test('moveCard: the lane cell and, where its place changes, the row out and in again beside the card it lands by', () => {
  const d = parse(BOARD);
  // Within a lane: Book the room after Print badges.
  const a = moveCard(d, 1, 'To do', 1);
  expect(a.map((o) => o.op)).toEqual(['rows', 'rows']);
  expect(names(roundTrip(d, a))[0]).toEqual(['To do', ['Print badges', 'Book the room']]);
  // Across lanes between two cards whose rows it already sits between: only the cell.
  const b = moveCard(d, 1, 'Doing', 1);
  expect(b.map((o) => o.op)).toEqual(['cells']);
  expect(names(roundTrip(d, b)).slice(0, 2)).toEqual([
    ['To do', ['Print badges']],
    ['Doing', ['Write the brief', 'Book the room', 'Send invites']],
  ]);
  // To the first place: the row before the lane's first card's.
  expect(names(roundTrip(d, moveCard(d, 1, 'Doing', 0)))[1]).toEqual(['Doing', ['Book the room', 'Write the brief', 'Send invites']]);
  // To the end of another lane: the cell and the row after the lane's last card.
  const c = moveCard(d, 0, 'Done', 5);
  expect(c.map((o) => o.op)).toEqual(['cells', 'rows', 'rows']);
  const after = roundTrip(d, c);
  expect(names(after)[1]).toEqual(['Doing', ['Send invites']]);
  expect(names(after)[2]).toEqual(['Done', ['Order food', 'Write the brief']]);
  // Into an empty lane the row stays where it is.
  expect(names(roundTrip(d, moveCard(d, 3, 'Blocked', 0)))[3]).toEqual(['Blocked', ['Order food']]);
  // A card that is not there moves nothing.
  expect(moveCard(d, 99, 'Done', 0)).toEqual([]);
});

test('a move that would reorder the lanes or lose one writes lanes: first, so no lane jumps or vanishes', () => {
  const d = parse('Task | Status\n--- | ---\na | Todo\nb | Doing\nc | Todo\n');
  expect(names(d).map(([n]) => n)).toEqual(['Todo', 'Doing']);
  // a into Doing after b: the first row is then Doing's, which would put Doing first.
  const ops = moveCard(d, 0, 'Doing', 1);
  expect(ops[0]).toEqual({ op: 'head', key: 'lanes', value: 'Todo, Doing' });
  expect(names(roundTrip(d, ops)).map(([n]) => n)).toEqual(['Todo', 'Doing']);
  // The last card out of a lane: the lane stays, empty.
  const one = parse('Task | Status\n--- | ---\na | Todo\nb | Doing\n');
  expect(names(roundTrip(one, moveCard(one, 1, 'Todo', 1)))).toEqual([
    ['Todo', ['a', 'b']],
    ['Doing', []],
  ]);
  expect(names(roundTrip(one, removeCard(one, 1)))).toEqual([
    ['Todo', ['a']],
    ['Doing', []],
  ]);
  // A move that changes neither writes nothing to the head.
  expect(moveCard(d, 2, 'Todo', 0).some((o) => o.op === 'head')).toBe(false);
});

test('a locked cell is left as it is: a card whose lane cell is locked stays; elsewhere the lock follows the rows; #REF for a formula into a moved row', () => {
  // The lock in the head (A1 the first row under the headings): the Status cells of Write the brief and Book the room, and Print badges' Task.
  const d = parse(BOARD.replace('lanes: To do, Doing, Done, Blocked', 'lanes: To do, Doing, Done, Blocked\nlock: C1:C2, A5'));
  expect(moveCard(d, 0, 'Done', 0)).toEqual([]);
  expect(moveCard(d, 1, 'Doing', 0)).toEqual([]);
  // Send invites (row 3) to the top of To do: before Book the room, so above it in the table; each locked cell keeps its words.
  const after = roundTrip(d, moveCard(d, 2, 'To do', 0));
  expect(names(after)[0]).toEqual(['To do', ['Send invites', 'Book the room', 'Print badges']]);
  expect(after.head.lock).toBe('C1, C3, A5');
  const locked = (x: Doc) => {
    const t = x.blocks[0] as { rows: string[][] };
    return t.rows.flatMap((row, r) => row.flatMap((v, c) => (isLocked(tableAt(x, 0)!.lock, r, c) ? [v] : []))).sort();
  };
  expect(locked(after)).toEqual(locked(d));
  // The lock on the table itself, `{lock=…}`: written back there.
  const own = parse('Task | Status\n--- | ---\na | Todo\nb | Todo\nc | Doing\n{lock=A3}\n');
  const moved = roundTrip(own, moveCard(own, 2, 'Todo', 0));
  expect(names(moved)[0]).toEqual(['Todo', ['c', 'a', 'b']]);
  expect(write(moved)).toContain('{lock=A1}');
  // A lane renamed leaves a card whose lane cell is locked under the old name.
  expect(names(roundTrip(d, renameLane(d, 'To do', 'Next'))).map(([n, c]) => [n, c.length])).toEqual([
    ['Next', 1],
    ['Doing', 2],
    ['Done', 1],
    ['Blocked', 0],
    ['To do', 1],
  ]);
  // A formula that points into a row taken out and put in again: #REF, as a row cut and pasted.
  const f = parse('Task | Status | N:number\n--- | --- | ---\na | Todo | 1\nb | Todo | =C1+1\n');
  expect((roundTrip(f, moveCard(f, 0, 'Todo', 1)).blocks[0] as { rows: string[][] }).rows.map((r) => r[2])).toEqual(['=#REF+1', '1']);
});

// A formula pointing into a row that moves loses its reference (#REF): where the table holds one, the inverse is checked
// and where the card lands is not. A card whose lane cell is locked moves nothing, and every locked cell keeps its words.
test('for any table document, moving a card anywhere and inverting gives the document back, and the card lands where it was sent', () => {
  const doc = fc
    .tuple(arbitraryDoc(3), arbitraryTable(4, 5), fc.nat(3))
    .map(([d, table, at]) => ({ head: d.head, blocks: [...d.blocks.slice(0, at).filter((b) => b.k !== 'table'), { ...table, a: undefined }, ...d.blocks.slice(at)] }) as Doc);
  fc.assert(
    fc.property(doc, fc.nat(9), fc.nat(9), fc.nat(9), (d, which, lane, to) => {
      const v = boardOf(d);
      fc.pre(v.cards.length > 0 && v.lanes.length > 0);
      const card = v.cards[which % v.cards.length];
      const target = v.lanes[lane % v.lanes.length].name;
      const ops = moveCard(d, card.row, target, to);
      const after = applyAll(d, ops);
      expect(applyAll(after, invertAll(d, ops))).toStrictEqual(d);
      const lock = tableAt(d, v.at)!.lock;
      if (isLocked(lock, card.row, v.laneCol)) return void expect(ops).toEqual([]);
      const lockedCells = (x: Doc) => (x.blocks[v.at] as { rows: string[][] }).rows.flatMap((row, r) => row.filter((_, c) => isLocked(tableAt(x, v.at)!.lock, r, c))).sort();
      expect(lockedCells(after)).toEqual(lockedCells(d));
      if ((d.blocks[v.at] as { rows: string[][] }).rows.some((r) => r.some((x) => x.startsWith('=')))) return;
      const now = boardOf(after);
      const there = now.lanes.find((l) => l.name === target)!;
      const others = v.lanes.find((l) => l.name === target)!.cards.filter((c) => c.row !== card.row).length;
      expect(there.cards[Math.min(to, others)].title).toBe(card.title);
      // The lanes keep their order (the nameless one aside, which goes when it empties).
      const kept = (x: typeof v) => x.lanes.map((l) => l.name).filter(Boolean);
      expect(kept(now)).toEqual(kept(v));
    }),
    { numRuns: RUNS },
  );
});

test('addCard: after the lane’s last card, or before the card at its place; the table born with a title and a status', () => {
  const d = parse(BOARD);
  const a = roundTrip(d, addCard(d, 'Doing', 'Call the caterer'));
  expect(names(a)[1]).toEqual(['Doing', ['Write the brief', 'Send invites', 'Call the caterer']]);
  const b = roundTrip(d, addCard(d, 'To do', 'First', 0));
  expect(names(b)[0]).toEqual(['To do', ['First', 'Book the room', 'Print badges']]);
  // Into an empty lane: at the table's end.
  const c = roundTrip(d, addCard(d, 'Blocked', 'Waiting on legal'));
  expect(names(c)[3]).toEqual(['Blocked', ['Waiting on legal']]);
  // A new lane: after the others.
  expect(names(roundTrip(d, addCard(d, 'Later', 'Someday'))).at(-1)).toEqual(['Later', ['Someday']]);
  // No table: one is made.
  const none = parse('---\nlanes: A, B\n---\n');
  const made = roundTrip(none, addCard(none, 'B', 'Hello'));
  expect(write(made)).toBe('---\nlanes: A, B\n---\nTitle | Status:option\n--- | ---\nHello | B\n');
});

test('removeCard, removeCards, duplicateCards, setTitle, moveCards: ops that apply and invert', () => {
  const d = parse(BOARD);
  expect(names(roundTrip(d, removeCards(d, [1, 4])))[0]).toEqual(['To do', []]);
  expect(names(roundTrip(d, removeCard(d, 0)))[1]).toEqual(['Doing', ['Send invites']]);
  expect(removeCard(d, 99)).toEqual([]);
  expect(names(roundTrip(d, duplicateCards(d, [0, 2])))[1]).toEqual(['Doing', ['Write the brief', 'Send invites', 'Write the brief', 'Send invites']]);
  const t = roundTrip(d, setTitle(d, 3, '  Order   lunch '));
  expect(boardOf(t).cards.find((c) => c.row === 3)!.title).toBe('Order lunch');
  expect(setTitle(d, 3, 'Order food')).toEqual([]);
  // A table with no title column gets one.
  const bare = parse('| Status |\n| --- |\n| Done |\n');
  expect(write(roundTrip(bare, setTitle(bare, 0, 'Pay')))).toBe('Title | Status\n--- | ---\nPay | Done\n');
  // Several cards to another lane, in their order, after its cards.
  const m = roundTrip(d, moveCards(d, [1, 4], 'Done', 1));
  expect(names(m)[0]).toEqual(['To do', []]);
  expect(names(m)[2]).toEqual(['Done', ['Order food', 'Book the room', 'Print badges']]);
});

test('lanes: added, moved, renamed and taken away, through lanes: and the cards’ cells', () => {
  const d = parse(BOARD);
  expect(roundTrip(d, addLane(d, 'Review', 2)).head.lanes).toBe('To do, Doing, Review, Done, Blocked');
  expect(addLane(d, 'Doing')).toEqual([]);
  expect(roundTrip(d, moveLane(d, 'Blocked', 0)).head.lanes).toBe('Blocked, To do, Doing, Done');
  expect(moveLane(d, 'To do', 0)).toEqual([]);
  const r = roundTrip(d, renameLane(d, 'Doing', 'In progress'));
  expect(names(r)[1]).toEqual(['In progress', ['Write the brief', 'Send invites']]);
  expect(r.head.lanes).toBe('To do, In progress, Done, Blocked');
  expect(renameLane(d, 'Doing', '  ')).toEqual([]);
  // A name another lane has joins the two.
  expect(names(roundTrip(d, renameLane(d, 'To do', 'Done')))).toEqual([
    ['Done', ['Book the room', 'Order food', 'Print badges']],
    ['Doing', ['Write the brief', 'Send invites']],
    ['Blocked', []],
  ]);
  // The nameless lane named: its cards' cells.
  const loose = parse('Task | Stage\n--- | ---\na | Won\nb | \n');
  expect(names(roundTrip(loose, renameLane(loose, '', 'Open')))).toEqual([
    ['Won', ['a']],
    ['Open', ['b']],
  ]);
  const gone = roundTrip(d, removeLane(d, 'Doing'));
  expect(names(gone)).toEqual([
    ['To do', ['Book the room', 'Print badges']],
    ['Done', ['Order food']],
    ['Blocked', []],
  ]);
});

test('pasteCards: a table’s rows into the board’s columns by name, or a card a line of words; cardsTable is what a copy holds', () => {
  const d = parse(BOARD);
  const copied = write({ head: {}, blocks: [cardsTable(d, [3, 0])] });
  expect(copied).toBe('Task | Owner | Status:option | Cost:money\n--- | --- | --- | ---\nOrder food | Cy | Done | 300\nWrite the brief | Ana | Doing | 120\n');
  const p = pasteCards(d, 'Blocked', 0, copied);
  expect(p.n).toBe(2);
  expect(names(roundTrip(d, p.ops))[3]).toEqual(['Blocked', ['Order food', 'Write the brief']]);
  const w = pasteCards(d, 'To do', 1, 'Buy pens\n\nBuy paper\n');
  expect(names(roundTrip(d, w.ops))[0]).toEqual(['To do', ['Book the room', 'Buy pens', 'Buy paper', 'Print badges']]);
  // Another table's columns: by name, the title by its own title column.
  const other = pasteCards(d, 'Done', 9, 'Name | Cost:money\n--- | ---\nGlue | 3\n');
  const row = boardOf(applyAll(d, other.ops)).lanes[2].cards[1];
  expect([row.title, row.fields.map((f) => f.raw)]).toEqual(['Glue', ['3']]);
  expect(pasteCards(d, 'Done', 0, '')).toEqual({ ops: [], n: 0 });
});

test('the cards as drawn: a field as its column shows it, money in dollars, a formula’s value', () => {
  const s = shownCards(parse(BOARD));
  expect(s.get(0)).toEqual({
    title: 'Write the brief',
    fields: [
      { name: 'Owner', value: 'Ana' },
      { name: 'Cost', value: '$120.00' },
    ],
  });
  expect(s.get(4)!.fields).toEqual([{ name: 'Cost', value: '$240.00' }]);
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

test('the files and the hand-offs: the Spreadsheet’s CSV, the same text to the Spreadsheet, a sheet’s first table to the Board', async () => {
  const csv = def.exports!.find((x) => x.ext === 'csv')!;
  const bytes = (await csv.build(BOARD, { def, title: '', link: '' })) as Uint8Array;
  const text = new TextDecoder('utf-8', { ignoreBOM: true }).decode(bytes);
  expect(text.startsWith('﻿')).toBe(true);
  expect(text).toContain('Write the brief');
  expect(def.handoffs!.find((h) => h.to === 'sheet')!.convert(BOARD)).toBe(BOARD);
  const sheet = '---\ntitle: Deals\nchart: bar\nlock: A1\n---\nDeal | Stage\n--- | ---\nA | Won\n\nWords after.\n';
  expect(sheetToBoard(sheet)).toBe('---\ntitle: Deals\n---\nDeal | Stage\n--- | ---\nA | Won\n');
  expect(sheetToBoard('Just words.\n')).toBe('');
});

test('the templates: canonical, each a status column, a title and typed fields, its lanes in the head', () => {
  const all = templates();
  expect(all.map((x) => x.id)).toEqual(['project', 'pipeline', 'hiring', 'content']);
  for (const tpl of all) {
    expect(write(parse(tpl.doc))).toBe(tpl.doc);
    const v = boardOf(parse(tpl.doc));
    expect(v.laneCol).toBeGreaterThanOrEqual(0);
    expect(v.cols[v.laneCol].type).toBe('option');
    expect(v.cols.some((c) => c.type === 'date')).toBe(true);
    expect(v.lanes.map((l) => l.name)).toEqual(lanesOf(parse(tpl.doc).head.lanes));
  }
  expect(boardOf(parse(all[1].doc)).lanes.map((l) => l.name)).toEqual(['Inbound', 'Qualifying', 'Proposal', 'Negotiating', 'Won', 'Lost']);
});
