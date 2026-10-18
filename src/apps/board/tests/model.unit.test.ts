// The Board as a view of a table, each command as the ops it produces (applied, and inverted back), under Node with no
// DOM: this file imports the model and the kernel and nothing else, so it is also the proof that a program builds a
// board from its own records and moves its cards with `tinylittleoffice/board/model` alone. A card's title and fields as the
// Spreadsheet shows their cells, and a title given as words written so it shows them, for any words in any column.
// The drawing, the words, the files and the templates speak through the kit, which runs in a page: view.test.ts.
import fc from 'fast-check';
import { expect, test } from 'vitest';
import { applyAll, column, invertAll, isLocked, parse, tableAt, write, type Doc, type Op } from '../../../doc/index.ts';
import { ALL_TYPES, arbitraryBoard, arbitraryWords, RUNS } from './arbitrary.ts';
import {
  ENGLISH_LANES,
  addCard,
  addLane,
  blankBoard,
  boardColumns,
  boardDoc,
  boardOf,
  cardsTable,
  duplicateCards,
  lanesOf,
  lanesText,
  moveCard,
  moveBack,
  moveCards,
  moveLane,
  pasteCards,
  removeCard,
  removeCards,
  removeLane,
  renameLane,
  setCells,
  setTitle,
} from '../model.ts';

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

test('the model runs under Node with no DOM: no window, no document, no custom elements here', () => {
  expect([typeof window, typeof document, typeof customElements]).toStrictEqual(['undefined', 'undefined', 'undefined']);
  expect(names(parse(BOARD))[0]).toEqual(['To do', ['Book the room', 'Print badges']]);
});

test('the lane column: Status or Stage by name, else the first option column, else the last; the title the first of words', () => {
  const board = (...h: string[]) => boardOf(parse(`| ${h.join(' | ')} |\n| ${h.map(() => '---').join(' | ')} |\n`));
  expect(board('Task', 'Priority:option', 'stage').laneCol).toBe(2);
  expect(board('Task', 'STATUS', 'Kind:option').laneCol).toBe(1);
  expect(board('Task', 'Kind:option', 'Owner').laneCol).toBe(1);
  expect(board('Task', 'Owner', 'Where').laneCol).toBe(2);
  expect(boardOf(parse('Words.\n')).laneCol).toBe(-1);
  // The title: the first column of words that is not the lane's, else the first other one.
  expect(board('Cost:money', 'Task', 'Status')).toMatchObject({ laneCol: 2, titleCol: 1 });
  expect(board('Cost:money', 'Status')).toMatchObject({ laneCol: 1, titleCol: 0 });
  expect(board('Status')).toMatchObject({ laneCol: 0, titleCol: -1 });
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
  expect(v.cards[0].fields).toEqual([{ col: 1, name: 'Owner', raw: 'Ben', shown: 'Ben' }]);
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

test('a blank board: To do, Doing and Done, a table of a title and a status with no cards; canonical; the suite’s text byte for byte', () => {
  const b = blankBoard();
  expect(write(parse(b))).toBe(b);
  // What the suite's blankBoard wrote in English, by hand.
  expect(b).toBe('---\nlanes: To do, Doing, Done\n---\nTitle | Status:option\n--- | ---\n');
  expect(names(parse(b))).toEqual([
    ['To do', []],
    ['Doing', []],
    ['Done', []],
  ]);
  expect(ENGLISH_LANES).toEqual(['To do', 'Doing', 'Done']);
  // Given lanes and columns, in another language: the status column is typed `option` whatever it is called.
  const es = blankBoard(['Por hacer', 'En curso', 'Hecho'], boardColumns({ title: 'Título', status: 'Estado' }));
  expect(es).toBe('---\nlanes: Por hacer, En curso, Hecho\n---\nTítulo | Estado:option\n--- | ---\n');
  expect(boardOf(parse(es))).toMatchObject({ laneCol: 1, titleCol: 0 });
});

test('a board from a host’s own records: its lanes in order, an empty one kept, a card a row, read back by boardOf', () => {
  const stages = ['Inbound', 'Qualifying', 'Proposal, signed', 'Won'];
  const cols = [column('Deal'), column('Stage:option'), column('Value:money')];
  const doc = boardDoc(stages, cols, [
    ['Website redesign', 'Inbound', '12000'],
    ['Annual retainer', 'Won', '48000'],
    ['Spring catalog', 'Proposal, signed', '22000'],
  ]);
  const text = write(doc);
  expect(write(parse(text))).toBe(text);
  expect(text.split('\n')[1]).toBe('lanes: Inbound, Qualifying, Proposal\\, signed, Won');
  expect(names(parse(text))).toEqual([
    ['Inbound', ['Website redesign']],
    ['Qualifying', []],
    ['Proposal, signed', ['Spring catalog']],
    ['Won', ['Annual retainer']],
  ]);
  // A card moved is ops the server orders as any editor's, and the board they make reads as the host meant.
  const ops = moveCard(doc, 0, 'Qualifying', 0);
  expect(names(roundTrip(doc, ops))[1]).toEqual(['Qualifying', ['Website redesign']]);
  // No lanes given: none in the head, and the lanes are the rows'.
  expect(boardDoc([], cols, [['A', 'Won', '1']]).head).toEqual({});
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
test('for any board, moving a card anywhere and inverting gives the document back, and the card lands where it was sent', () => {
  fc.assert(
    fc.property(arbitraryBoard(), fc.nat(9), fc.nat(9), fc.nat(9), (d, which, lane, to) => {
      const v = boardOf(d);
      fc.pre(v.cards.length > 0 && v.lanes.length > 0);
      const card = v.cards[which % v.cards.length];
      const target = v.lanes[lane % v.lanes.length].name;
      const ops = moveCard(d, card.row, target, to);
      const after = applyAll(d, ops);
      expect(applyAll(after, invertAll(d, ops))).toStrictEqual(d);
      const lock = tableAt(d, v.at)!.lock;
      if (isLocked(lock, card.row, v.laneCol)) return void expect(ops).toEqual([]);
      // A locked formula keeps its place but not its references into a row moved (#REF, as in the Spreadsheet): its words aside.
      const lockedCells = (x: Doc) =>
        (x.blocks[v.at] as { rows: string[][] }).rows.flatMap((row, r) => row.filter((cell, c) => isLocked(tableAt(x, v.at)!.lock, r, c) && !cell.startsWith('='))).sort();
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

/**
 * What a host that reads only moves reads: ops that are each a status cell written (`cells` on the
 * lane column, never forced), `lanes:` or the lock written (`head`), or a row taken out or put in, every row put in
 * one that was taken out as it was (a formula aside, which rows moved around it point elsewhere); a splice only of a
 * table that keeps its own lock. Null where they are not.
 */
function onlyMoves(d: Doc, ops: Op[]): Op[] | null {
  const v = boardOf(d);
  const out: string[] = [];
  const key = (r: string[]) => JSON.stringify(r.map((c) => (c.startsWith('=') ? '=' : c)));
  let now = d;
  for (const op of ops) {
    if (op.op === 'cells' && (op.c !== v.laneCol || op.force || op.values.some((r) => r.length !== 1))) return null;
    if (op.op === 'head' && op.key !== 'lanes' && op.key !== 'lock') return null;
    if (op.op === 'splice' && !(now.blocks[v.at] as { a?: { kv?: { lock?: string } } }).a?.kv?.lock && !(op.blocks[0] as { a?: { kv?: { lock?: string } } }).a?.kv?.lock) return null;
    if (op.op === 'rows' && !op.rows) out.push(...(now.blocks[op.at] as { rows: string[][] }).rows.slice(op.r, op.r + op.n).map(key));
    if (op.op === 'rows' && op.rows)
      for (const r of op.rows) {
        const i = out.indexOf(key(r));
        if (i < 0) return null;
        out.splice(i, 1);
      }
    if (!['cells', 'head', 'rows', 'splice'].includes(op.op)) return null;
    now = applyAll(now, [op]);
  }
  return out.length ? null : ops;
}

test('moveBack: a move taken back as a move, the cell and the row where they were; lanes: and the lock as they were', () => {
  // The reviewer's board: B moved across (cells, rows, rows), then along its lane (rows, rows); each taken back.
  const d = parse('---\nlanes: To do, Doing, Done\n---\nTask | Status\n--- | ---\nA | To do\nB | Doing\nC | Doing\nD | Done\n');
  for (const ops of [moveCard(d, 1, 'Done', 1), moveCard(d, 1, 'Doing', 1), moveCards(d, [1, 2], 'To do', 0)]) {
    const back = moveBack(d, ops);
    expect(onlyMoves(applyAll(d, ops), back)).toEqual(back);
    expect(back.some((o) => o.op === 'splice')).toBe(false);
    expect(applyAll(applyAll(d, ops), back)).toStrictEqual(d);
  }
  expect(moveBack(d, moveCard(d, 1, 'Done', 1)).map((o) => o.op)).toEqual(['rows', 'rows', 'cells']);
  // lanes: written by the move goes back as it was.
  const part = parse('---\nlanes: To do\n---\nTask | Status\n--- | ---\nA | To do\nB | Doing\nC | Done\n');
  const across = moveCard(part, 1, 'Done', 1);
  expect(across[0].op).toBe('head');
  expect(applyAll(applyAll(part, across), moveBack(part, across))).toStrictEqual(part);
  // The lock in the head and on the table itself: written again as it was.
  const head = parse(BOARD.replace('lanes: To do, Doing, Done, Blocked', 'lanes: To do, Doing, Done, Blocked\nlock: C1:C2, A5'));
  const own = parse('Task | Status\n--- | ---\na | Todo\nb | Todo\nc | Doing\n{lock=A3}\n');
  for (const [x, ops] of [
    [head, moveCard(head, 2, 'To do', 0)],
    [own, moveCard(own, 2, 'Todo', 0)],
  ] as const) {
    const back = moveBack(x, ops);
    expect(onlyMoves(applyAll(x, ops), back)).toEqual(back);
    expect(write(applyAll(applyAll(x, ops), back))).toBe(write(x));
  }
  expect(moveBack(d, [])).toEqual([]);
});

// Where the table holds a formula, one pointing into a row taken out is left at #REF by the move and stays so: there
// every other cell comes back where it was, and the formulas are not looked at.
test('for any board, a move and the move taken back by moveBack are only moves, and the document comes back', () => {
  fc.assert(
    fc.property(arbitraryBoard(), fc.nat(9), fc.nat(9), fc.nat(9), fc.boolean(), (d, which, lane, to, two) => {
      const v = boardOf(d);
      fc.pre(v.cards.length > 0 && v.lanes.length > 0);
      const card = v.cards[which % v.cards.length];
      const target = v.lanes[lane % v.lanes.length].name;
      const ops = two ? moveCards(d, [card.row, v.cards[(which + 1) % v.cards.length].row], target, to) : moveCard(d, card.row, target, to);
      const after = applyAll(d, ops);
      const back = moveBack(d, ops);
      // The move itself is only moves too: a row put in again as it was taken out, its lane cell kept where it was not written.
      expect(onlyMoves(d, ops)).toEqual(ops);
      expect(onlyMoves(after, back)).toEqual(back);
      const undone = applyAll(after, back);
      const cells = (x: Doc) => (x.blocks[v.at] as { rows: string[][] }).rows.map((r) => r.map((c) => (c.startsWith('=') ? '=' : c)));
      if ((d.blocks[v.at] as { rows: string[][] }).rows.some((r) => r.some((x) => x.startsWith('=')))) return void expect(cells(undone)).toEqual(cells(d));
      expect(write(undone)).toBe(write(d));
      expect(undone).toStrictEqual(d);
    }),
    { numRuns: RUNS },
  );
});

test('for any board, every command’s ops apply and invert back, and leave a board whose named lanes are kept or changed only as asked', () => {
  fc.assert(
    fc.property(arbitraryBoard(), fc.nat(9), fc.nat(9), fc.nat(5), (d, which, lane, at) => {
      const v = boardOf(d);
      fc.pre(v.lanes.length > 0);
      const name = v.lanes[lane % v.lanes.length].name;
      const row = v.cards.length ? v.cards[which % v.cards.length].row : 0;
      const all: Op[][] = [
        addCard(d, name, 'New card', at),
        addLane(d, 'Later', at),
        moveLane(d, name, at),
        removeCards(d, [row, row + 1]),
        duplicateCards(d, [row]),
        setTitle(d, row, 'Renamed'),
        renameLane(d, name, 'Renamed lane'),
        removeLane(d, name),
        moveCards(d, [row, row + 1], name, at),
        pasteCards(d, name, at, 'One\nTwo\n').ops,
      ];
      for (const ops of all) roundTrip(d, ops);
      // A card added in a lane is in it (titled, where the table has a column for a title); a lane added is there; no
      // lane is lost by a card added.
      const kept = (x: Doc) =>
        boardOf(x)
          .lanes.map((l) => l.name)
          .filter(Boolean);
      if (v.titleCol >= 0)
        expect(
          boardOf(applyAll(d, all[0]))
            .lanes.find((l) => l.name === name)!
            .cards.map((c) => c.title),
        ).toContain('New card');
      expect(kept(applyAll(d, all[1]))).toContain('Later');
      for (const n of kept(d)) expect(kept(applyAll(d, all[0]))).toContain(n);
    }),
    { numRuns: RUNS },
  );
});

test('addCard: after the lane’s last card, or before the card at its place; the table born with a title and a status, named as given', () => {
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
  // No table: one is made, its columns English where no names are given, and the reader's where they are.
  const none = parse('---\nlanes: A, B\n---\n');
  const made = roundTrip(none, addCard(none, 'B', 'Hello'));
  expect(write(made)).toBe('---\nlanes: A, B\n---\nTitle | Status:option\n--- | ---\nHello | B\n');
  const french = roundTrip(none, addCard(none, 'B', 'Bonjour', undefined, { title: 'Titre', status: 'Statut' }));
  expect(write(french)).toBe('---\nlanes: A, B\n---\nTitre | Statut:option\n--- | ---\nBonjour | B\n');
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
  // A table with no title column gets one, named as given (English where not).
  const bare = parse('| Status |\n| --- |\n| Done |\n');
  expect(write(roundTrip(bare, setTitle(bare, 0, 'Pay')))).toBe('Title | Status\n--- | ---\nPay | Done\n');
  expect(write(roundTrip(bare, setTitle(bare, 0, 'Pagar', { title: 'Título', status: 'Estado' })))).toBe('Título | Status\n--- | ---\nPagar | Done\n');
  // Several cards to another lane, in their order, after its cards.
  const m = roundTrip(d, moveCards(d, [1, 4], 'Done', 1));
  expect(names(m)[0]).toEqual(['To do', []]);
  expect(names(m)[2]).toEqual(['Done', ['Order food', 'Book the room', 'Print badges']]);
});

test('a card’s title and fields as the Spreadsheet shows their cells: "\'007" as 007, a formula’s value, money in its currency; the cell as written beside', () => {
  const d = parse(BOARD);
  const badges = boardOf(d).cards.find((c) => c.row === 4)!;
  expect([badges.title, badges.raw, badges.fields]).toEqual(['Print badges', 'Print badges', [{ col: 3, name: 'Cost', raw: '=D1*2', shown: '$240.00' }]]);
  const shown = (text: string) => boardOf(parse(text)).cards.map((c) => [c.title, c.raw, c.fields.map((f) => [f.raw, f.shown])]);
  // Words written as words ("'007", "'=1+1") show as they were typed; a formula shows its value; Markdown its words.
  expect(shown("Task | Status | Due:date | Cost:money(GBP)\n--- | --- | --- | ---\n'007 | To do | 2027-03-01 | 5\n'=1+1 | To do | 3/2/2027 | =D1*2\n=1+1 | To do | | \n")).toEqual([
    [
      '007',
      "'007",
      [
        ['2027-03-01', '2027-03-01'],
        ['5', '£5.00'],
      ],
    ],
    [
      '=1+1',
      "'=1+1",
      [
        ['3/2/2027', '2027-03-02'],
        ['=D1*2', '£10.00'],
      ],
    ],
    ['2', '=1+1', []],
  ]);
  expect(shown('---\ncurrency: €\n---\nTask:rich | Status | Cost:money\n--- | --- | ---\n**Launch** the _site_ | Doing | 1200\n\\=1+1 | Doing |\n')).toEqual([
    ['Launch the site', '**Launch** the _site_', [['1200', '€1,200.00']]],
    ['=1+1', '\\=1+1', []],
  ]);
  // No column of words: the title is the first other column, its value as that column shows it.
  expect(shown("Cost:money | Status\n--- | ---\n120 | To do\n'130 | To do\n")).toEqual([
    ['$120.00', '120', []],
    ['130', "'130", []],
  ]);
});

test('setTitle and addCard take words and write them as words, so the title shows them: 007 is "\'007", =1+1 never a formula', () => {
  const d = parse(BOARD);
  const titled = (x: Doc, row: number) => boardOf(x).cards.find((c) => c.row === row)!;
  const a = roundTrip(d, setTitle(d, 0, '007'));
  expect([titled(a, 0).title, titled(a, 0).raw]).toEqual(['007', "'007"]);
  const b = roundTrip(d, setTitle(d, 0, '=1+1'));
  expect([titled(b, 0).title, titled(b, 0).raw]).toEqual(['=1+1', "'=1+1"]);
  // Words that read as themselves are written as they are; words a card already shows write nothing.
  expect(setTitle(d, 0, 'Plain words')).toEqual([{ op: 'cells', at: 0, r: 0, c: 0, values: [['Plain words']] }]);
  expect(setTitle(a, 0, '007')).toEqual([]);
  const c = roundTrip(d, addCard(d, 'Done', '=SUM(1)'));
  expect(boardOf(c).lanes[2].cards.map((x) => [x.title, x.raw])).toEqual([
    ['Order food', 'Order food'],
    ['=SUM(1)', "'=SUM(1)"],
  ]);
  // A rich title column: Markdown's own escape, its words shown as typed.
  const rich = parse('Task:rich | Status\n--- | ---\n**Old** | Doing\n');
  const r = roundTrip(rich, setTitle(rich, 0, '=1+1 *not bold*'));
  expect([titled(r, 0).title, titled(r, 0).raw]).toEqual(['=1+1 *not bold*', '\\=1+1 \\*not bold\\*']);
  // A title column of money (no column of words): the value shown formatted, and words typed written as words, shown as typed.
  const money = parse('Cost:money | Status\n--- | ---\n120 | To do\n');
  expect(titled(money, 0).title).toBe('$120.00');
  expect(setTitle(money, 0, '$120.00')).toEqual([]);
  const m = roundTrip(money, setTitle(money, 0, '130'));
  expect([titled(m, 0).title, write(m)]).toEqual(['130', "Cost:money | Status\n--- | ---\n'130 | To do\n"]);
  expect(titled(roundTrip(money, addCard(money, 'To do', 'Call back')), 1).title).toBe('Call back');
  // A table born of a card, and a title column made for a table with none: words, as typed.
  const none = parse('---\nlanes: A\n---\n');
  expect(write(roundTrip(none, addCard(none, 'A', '007')))).toBe("---\nlanes: A\n---\nTitle | Status:option\n--- | ---\n'007 | A\n");
  const bare = parse('| Status |\n| --- |\n| Done |\n');
  expect(write(roundTrip(bare, setTitle(bare, 0, '2027-03-01')))).toBe('Title | Status\n--- | ---\n2027-03-01 | Done\n');
  expect(write(roundTrip(bare, setTitle(bare, 0, '1e5')))).toBe("Title | Status\n--- | ---\n'1e5 | Done\n");
});

test('for any words and any title column type, a card added or retitled shows exactly those words, and its text reads back the same', () => {
  const flat = (s: string) => s.replace(/\s+/g, ' ').trim();
  fc.assert(
    fc.property(arbitraryWords(), fc.constantFrom(...ALL_TYPES), fc.nat(1), (words, type, at) => {
      const d = boardDoc(['To do', 'Done'], [{ name: 'Task', type }, column('Status:option')], [['Old', 'To do']]);
      expect(boardOf(d).titleCol).toBe(0);
      const after = roundTrip(d, addCard(d, 'To do', words, at));
      const made = boardOf(after).lanes[0].cards[at];
      expect(made.title).toBe(flat(words));
      // Written and read back as text, it is the same document and the same title.
      const text = write(after);
      expect(write(parse(text))).toBe(text);
      expect(boardOf(parse(text)).lanes[0].cards[at].title).toBe(flat(words));
      // Retitled, the same; and split where a person presses Enter, each half shows its words.
      expect(boardOf(roundTrip(d, setTitle(d, 0, words))).cards[0].title).toBe(flat(words));
      const cut = Math.floor(words.length / 2);
      const head = setTitle(d, 0, words.slice(0, cut));
      const split = roundTrip(d, [...head, ...addCard(applyAll(d, head), 'To do', words.slice(cut), 1)]);
      expect(boardOf(split).lanes[0].cards.map((c) => c.title)).toEqual([flat(words.slice(0, cut)), flat(words.slice(cut))]);
    }),
    { numRuns: RUNS },
  );
});

test('setCells: a card’s cells from its dialog, each that changed, on one line; never its lane; a locked cell kept', () => {
  const d = parse(BOARD);
  const ops = setCells(d, 0, { 0: 'Write the  brief', 1: 'Ana\nLee ', 2: 'Done', 3: '120' });
  expect(ops).toEqual([{ op: 'cells', at: 0, r: 0, c: 1, values: [['Ana Lee']] }]);
  expect((roundTrip(d, ops).blocks[0] as { rows: string[][] }).rows[0]).toEqual(['Write the brief', 'Ana Lee', 'Doing', '120']);
  expect(setCells(d, 99, { 1: 'x' })).toEqual([]);
  expect(setCells(d, 0, { 9: 'x' })).toEqual([]);
  const locked = parse(BOARD.replace('lanes: To do, Doing, Done, Blocked', 'lanes: To do, Doing, Done, Blocked\nlock: B1'));
  expect((applyAll(locked, setCells(locked, 0, { 1: 'Bo', 3: '99' })).blocks[0] as { rows: string[][] }).rows[0]).toEqual(['Write the brief', 'Ana', 'Doing', '99']);
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
  // A title pasted shows as it was shown: a cell written "'007" by name as it is; by the pasted table's own title
  // column, its words as that table shows them, written as words; a line of words as typed.
  const quoted = (text: string) => boardOf(applyAll(d, pasteCards(d, 'Blocked', 0, text).ops)).lanes[3].cards.map((c) => [c.title, c.raw]);
  expect(quoted("Task | Status\n--- | ---\n'007 | x\n")).toEqual([['007', "'007"]]);
  expect(quoted("Name | Cost:money\n--- | ---\n'007 | 3\n=1+1 | 4\n")).toEqual([
    ['007', "'007"],
    ['2', "'2"],
  ]);
  expect(quoted('007\n=1+1\n')).toEqual([
    ['007', "'007"],
    ['=1+1', "'=1+1"],
  ]);
  // Into a document with no table: one is born, named as given.
  const none = parse('---\nlanes: A\n---\n');
  const born = pasteCards(none, 'A', 0, 'One\nTwo\n', { title: 'Titel', status: 'Status' });
  expect(write(roundTrip(none, born.ops))).toBe('---\nlanes: A\n---\nTitel | Status:option\n--- | ---\nOne | A\nTwo | A\n');
});
