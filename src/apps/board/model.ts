/**
 * A board as a view of the document, and its commands as operations (docs/kernel.md §3). A board is a view of a table
 * (docs/tlo.md, tables with typed headings): its first table, its lanes the distinct values of one column, its cards
 * the rows, each card's title the first column of words and its fields the rest of the row:
 *
 *   ---
 *   lanes: To do, Doing, Done
 *   ---
 *   Title | Status:option | Owner | Due:date
 *   --- | --- | --- | ---
 *   Write the brief | Doing | Ana | 2027-03-01
 *
 * The lane column, by the first rule that finds one: the first column named Status or Stage (in any case), else the
 * first column typed `option`, else the last column. The format has no type of its own for a status (src/doc/tlo.ts's
 * types end at `option`), so the name comes first, being what a person or a model writes over such a column and what
 * Atlas's pipeline calls its stages; `option`, one of the words the column holds, is the type the Spreadsheet gives
 * such a column (a blank board's is typed so, whatever its name in the reader's language); and the last column is
 * where a status sits in most tables pasted from elsewhere. The title is the first column of words (`text` or `rich`)
 * that is not the lane column, else the first other column.
 *
 * The lanes are in the order the head's `lanes:` gives (names between commas, a comma in a name written `\,`), which
 * also keeps a lane no card is in; then any other value in the order the rows first hold it. A row whose lane cell is
 * empty is in a lane of no name, which `lanes:` never holds. Within a lane the cards are in the order of their rows:
 * the table's own order, whatever lanes it interleaves, so a table from the Spreadsheet is a board as it is.
 *
 * Every command is pure: given the document, the `Op[]` that does it, through src/doc's operations, so undo and shared
 * editing (src/doc/sync.ts) work unchanged. A card moved writes its lane cell (`cells`) and, where its place among the
 * lane's cards changes, takes its row out and puts it in again just before the card it now precedes, or just after the
 * lane's last card (`rows`, twice): the rows of other lanes stay where they are, so the order within every lane stays
 * the order of its rows. Where a change would reorder the lanes or lose one (the first row of a lane moved below
 * another lane's, a lane's last card moved out), the lanes as they were are written into `lanes:` first (`head`), so a
 * lane never jumps or vanishes under a person's hand. A formula that points into a row taken out and put in again loses
 * its reference (#REF), as a row cut and pasted does in the Spreadsheet; a board's table seldom holds one. A locked
 * cell (the table's `lock:`) is left as it is, as in the Spreadsheet: a card whose lane cell is locked stays in its
 * lane and its place, and a lane renamed leaves such cards under the old name; where a card in a locked table changes
 * its place, the lock follows the rows as the Spreadsheet's rows moved do (written again after the row is put in,
 * since taking a row out drops its part of the lock). A card added goes after the lane's last card (or before the card
 * at the place asked for; into an empty lane, at the table's end), a lane added or moved is `lanes:` alone, and a lane
 * renamed is its cards' cells and its name in `lanes:`; a card's fields typed in its dialog are its cells. Nothing here
 * touches the DOM.
 */
import { applyAll, column, firstTable, inHead, isLocked, lockText, parse, tableAt, type Column, type Doc, type Op, type Range, type TableBlock } from '../../doc/index.ts';
import { t } from '../../kit/core/i18n.ts';

export interface Field {
  /** Its column. */
  col: number;
  name: string;
  /** The cell as written: a formula, a number, words. */
  raw: string;
}
export interface Card {
  /** Its row in the table. */
  row: number;
  /** Its lane, by its place in `lanes`. */
  lane: number;
  /** The title column's words ('' where there is none). */
  title: string;
  /** The rest of the row: every other column but the lane's, in the table's order, empty cells left out. */
  fields: Field[];
}
export interface Lane {
  name: string;
  cards: Card[];
}
export interface BoardView {
  /** The table's block index; -1 while the document has none. */
  at: number;
  /** The lane column and the title column; -1 for none. */
  laneCol: number;
  titleCol: number;
  cols: Column[];
  lanes: Lane[];
  /** Every card, lane by lane. */
  cards: Card[];
}

const flat = (s: string | undefined) => (s ?? '').replace(/\s+/g, ' ').trim();

/** The head's `lanes:` as names: split at commas a backslash does not escape, each trimmed, empty and repeated ones left out. */
export function lanesOf(value: string | undefined): string[] {
  const out: string[] = [];
  const put = (part: string) => {
    const name = flat(part);
    if (name && !out.includes(name)) out.push(name);
  };
  let part = '';
  const v = value ?? '';
  for (let i = 0; i < v.length; i++) {
    // A backslash before a comma or a backslash keeps it as a letter of the name; elsewhere it is one itself.
    if (v[i] === '\\' && (v[i + 1] === ',' || v[i + 1] === '\\')) part += v[++i];
    else if (v[i] === ',') (put(part), (part = ''));
    else part += v[i];
  }
  put(part);
  return out;
}
/** Names as `lanes:` writes them: a comma in a name escaped; undefined (the key taken away) for none. */
export const lanesText = (names: string[]): string | undefined =>
  names
    .filter(Boolean)
    .map((n) => n.replace(/[\\,]/g, '\\$&'))
    .join(', ') || undefined;

/** Which column holds the lane: Status or Stage by name, else the first `option` column, else the last (header). */
function laneColumn(cols: Column[]): number {
  if (!cols.length) return -1;
  const named = cols.findIndex((c) => /^(status|stage)$/i.test(c.name.trim()));
  if (named >= 0) return named;
  const option = cols.findIndex((c) => c.type === 'option');
  return option >= 0 ? option : cols.length - 1;
}
/** Which column is a card's title: the first of words that is not the lane's, else the first other one; -1 for none. */
function titleColumn(cols: Column[], lane: number): number {
  const words = cols.findIndex((c, i) => i !== lane && (c.type === 'text' || c.type === 'rich'));
  return words >= 0 ? words : cols.findIndex((_, i) => i !== lane);
}

/** The board a document is: its first table read as lanes and cards; a document with none is an empty board, with the head's lanes. */
export function boardOf(doc: Doc): BoardView {
  const at = firstTable(doc);
  const fixed = lanesOf(doc.head.lanes);
  const lanes: Lane[] = fixed.map((name) => ({ name, cards: [] }));
  if (at < 0) return { at, laneCol: -1, titleCol: -1, cols: [], lanes, cards: [] };
  const b = doc.blocks[at] as TableBlock;
  const laneCol = laneColumn(b.cols);
  const titleCol = titleColumn(b.cols, laneCol);
  b.rows.forEach((cells, row) => {
    const name = flat(cells[laneCol]);
    let lane = lanes.findIndex((l) => l.name === name);
    if (lane < 0) lane = lanes.push({ name, cards: [] }) - 1;
    const fields = b.cols.flatMap((c, col) => (col === laneCol || col === titleCol || !(cells[col] ?? '').trim() ? [] : [{ col, name: c.name, raw: cells[col] }]));
    lanes[lane].cards.push({ row, lane, title: titleCol >= 0 ? flat(cells[titleCol]) : '', fields });
  });
  return { at, laneCol, titleCol, cols: b.cols, lanes, cards: lanes.flatMap((l) => l.cards) };
}

/** The lanes' names, the nameless one left out (`lanes:` never holds it). */
const named = (v: BoardView): string[] => v.lanes.map((l) => l.name).filter(Boolean);
const same = (a: string[], b: string[]) => a.length === b.length && a.every((x, i) => x === b[i]);

/** The ops, with `lanes:` written first where the board they make would not have these lanes in this order. */
function keeping(doc: Doc, ops: Op[], want: string[]): Op[] {
  if (!ops.length) return ops;
  const after = boardOf(applyAll(doc, ops));
  return same(named(after), want) ? ops : [{ op: 'head', key: 'lanes', value: lanesText(want) }, ...ops];
}

/** The table row index a card put at place `i` among a lane's cards (`others`, without the card) goes in at, in the table without the card's own row (`gone`; -1 for none). */
function rowFor(others: Card[], i: number, end: number, gone = -1): number {
  const less = (r: number) => (gone >= 0 && r > gone ? r - 1 : r);
  if (!others.length) return less(end);
  return i < others.length ? less(others[i].row) : less(others[others.length - 1].row) + 1;
}

/** The columns a board's table is born with: its title and its status, named in the reader's language. */
const newColumns = (): Column[] => [column(t('common-title')), { name: t('board-status'), type: 'option' }];

/** A new board: To do, Doing and Done as its lanes, a table of a title and a status to hold its cards. */
export const blankBoard = (): string =>
  [`---`, `lanes: ${lanesText([t('board-to-do'), t('board-doing'), t('board-done')])}`, `---`, `${t('common-title')} | ${t('board-status')}:option`, `--- | ---`, ``].join('\n');

/**
 * A card in lane `lane` titled `title`, at place `at` among its cards (the end when not given); the table's birth, with
 * a title and a status, when the document has none.
 */
export function addCard(doc: Doc, lane: string, title = '', at?: number): Op[] {
  const v = boardOf(doc);
  const name = flat(lane);
  if (v.at < 0) {
    const table: TableBlock = { k: 'table', cols: newColumns(), rows: [[flat(title), name]] };
    return keeping(doc, [{ op: 'splice', at: doc.blocks.length, n: 0, blocks: [table] }], addName(named(v), name));
  }
  const b = doc.blocks[v.at] as TableBlock;
  const row = b.cols.map(() => '');
  row[v.laneCol] = name;
  if (v.titleCol >= 0) row[v.titleCol] = flat(title);
  const cards = v.lanes.find((l) => l.name === name)?.cards ?? [];
  const r = rowFor(cards, Math.max(0, Math.min(at ?? cards.length, cards.length)), b.rows.length);
  return keeping(doc, [{ op: 'rows', at: v.at, r, n: 1, rows: [row] }], addName(named(v), name));
}
const addName = (names: string[], name: string) => (!name || names.includes(name) ? names : [...names, name]);

/** A lock after row `from` is taken out and put in again at `to` (in the table without it): each range follows its rows, one the move splits a range per run of rows (sheet/model.ts `moveRows`). */
function lockAfterMove(lock: Range[], from: number, to: number): Range[] {
  const at = (i: number) => {
    if (i === from) return to;
    const j = i < from ? i : i - 1;
    return j >= to ? j + 1 : j;
  };
  return lock.flatMap((g) => {
    const runs: Range[] = [];
    for (const r of Array.from({ length: g.r1 - g.r0 + 1 }, (_, i) => at(g.r0 + i)).sort((x, y) => x - y)) {
      const last = runs[runs.length - 1];
      if (last && last.r1 === r - 1) last.r1 = r;
      else runs.push({ ...g, r0: r, r1: r });
    }
    return runs;
  });
}

/** The card on row `row` into lane `lane` (by name: a new one is made after the rest), at place `to` among that lane's other cards. Nothing when its lane cell is locked. */
export function moveCard(doc: Doc, row: number, lane: string, to: number): Op[] {
  const v = boardOf(doc);
  const card = v.cards.find((c) => c.row === row);
  if (!card) return [];
  const { lock } = tableAt(doc, v.at)!;
  if (isLocked(lock, row, v.laneCol)) return [];
  const b = doc.blocks[v.at] as TableBlock;
  const name = flat(lane);
  const others = (v.lanes.find((l) => l.name === name)?.cards ?? []).filter((c) => c.row !== row);
  const i = Math.max(0, Math.min(to, others.length));
  const ops: Op[] = [];
  if (flat(b.rows[row][v.laneCol]) !== name) ops.push({ op: 'cells', at: v.at, r: row, c: v.laneCol, values: [[name]] });
  // Into an empty lane the row stays where it is; else beside the card it lands by.
  const r = others.length ? rowFor(others, i, b.rows.length, row) : row;
  if (r !== row) {
    const cells = b.rows[row].map((x, c) => (c === v.laneCol ? name : x));
    ops.push({ op: 'rows', at: v.at, r: row, n: 1 }, { op: 'rows', at: v.at, r, n: 1, rows: [cells] });
    if (lock.length) {
      // Written where the lock is kept: the head, or the table's own `{lock=…}`.
      const value = lockText(lockAfterMove(lock, row, r));
      if (inHead(doc, v.at, 'lock')) ops.push({ op: 'head', key: 'lock', value });
      else {
        const put = applyAll(doc, ops).blocks[v.at] as TableBlock;
        ops.push({ op: 'splice', at: v.at, n: 1, blocks: [{ ...put, a: { ...put.a, kv: { ...put.a?.kv, lock: value } } }] });
      }
    }
  }
  return keeping(doc, ops, addName(named(v), name));
}

/** The card on row `row` taken away; its lane stays, empty. */
export function removeCard(doc: Doc, row: number): Op[] {
  const v = boardOf(doc);
  if (!v.cards.some((c) => c.row === row)) return [];
  return keeping(doc, [{ op: 'rows', at: v.at, r: row, n: 1 }], named(v));
}

/** Cards taken away, by their rows: from the last up, so each index holds; their lanes stay. */
export function removeCards(doc: Doc, rows: number[]): Op[] {
  const v = boardOf(doc);
  const gone = [...new Set(rows)].filter((r) => v.cards.some((c) => c.row === r)).sort((a, b) => b - a);
  return keeping(
    doc,
    gone.map((r): Op => ({ op: 'rows', at: v.at, r, n: 1 })),
    named(v),
  );
}

/** Cards again, by their rows: copies in the same order, put in together after the last of them. */
export function duplicateCards(doc: Doc, rows: number[]): Op[] {
  const v = boardOf(doc);
  const copied = v.cards.filter((c) => rows.includes(c.row)).map((c) => c.row);
  if (!copied.length) return [];
  const b = doc.blocks[v.at] as TableBlock;
  const sorted = [...copied].sort((a, z) => a - z);
  return [{ op: 'rows', at: v.at, r: sorted[sorted.length - 1] + 1, n: sorted.length, rows: sorted.map((r) => [...b.rows[r]]) }];
}

/** Where a row is after some ops of rows put in and taken out (none of them its own). */
const through = (row: number, ops: Op[]): number => ops.reduce((r, op) => (op.op !== 'rows' ? r : op.rows ? (r >= op.r ? r + op.n : r) : r >= op.r + op.n ? r - op.n : r), row);

/** Cards, by their rows, into lane `lane` at place `to` among its other cards, in the board's order: a move each, each after the last. */
export function moveCards(doc: Doc, rows: number[], lane: string, to: number): Op[] {
  const left = boardOf(doc)
    .cards.filter((c) => rows.includes(c.row))
    .map((c) => c.row);
  let now = doc;
  const ops: Op[] = [];
  left.forEach((row, k) => {
    const step = moveCard(now, row, lane, to + k);
    ops.push(...step);
    now = applyAll(now, step);
    for (let j = k + 1; j < left.length; j++) left[j] = through(left[j], step);
  });
  return ops;
}

/** A card's title as typed (a cell of the title column; a table with none gets one, at the start). */
export function setTitle(doc: Doc, row: number, title: string): Op[] {
  const v = boardOf(doc);
  const card = v.cards.find((c) => c.row === row);
  const words = flat(title);
  if (!card || words === card.title) return [];
  if (v.titleCol >= 0) return [{ op: 'cells', at: v.at, r: row, c: v.titleCol, values: [[words]] }];
  return [
    { op: 'cols', at: v.at, c: 0, n: 1, cols: [column(t('common-title'))] },
    { op: 'cells', at: v.at, r: row, c: 0, values: [[words]] },
  ];
}

/**
 * A card's cells as its dialog gives them, by column: a `cells` op for each that changed, the words on one line (the
 * title's spaces as `setTitle` keeps them). The lane's cell is left to `moveCard` (a lane changed is a card moved),
 * and a locked cell stays as it is (the operation's own rule, as in the Spreadsheet).
 */
export function setCells(doc: Doc, row: number, values: Record<number, string>): Op[] {
  const v = boardOf(doc);
  if (!v.cards.some((c) => c.row === row)) return [];
  const b = doc.blocks[v.at] as TableBlock;
  return Object.entries(values).flatMap(([k, raw]): Op[] => {
    const c = Number(k);
    const value = c === v.titleCol ? flat(raw) : raw.replace(/\s*\n\s*/g, ' ').trim();
    if (c === v.laneCol || !(c >= 0 && c < b.cols.length) || (b.rows[row][c] ?? '') === value) return [];
    return [{ op: 'cells', at: v.at, r: row, c, values: [[value]] }];
  });
}

/** Lane `from` called `to`: its cards' cells, and its name in `lanes:`. A name another lane has joins the two; an empty name changes nothing. */
export function renameLane(doc: Doc, from: string, to: string): Op[] {
  const v = boardOf(doc);
  const name = flat(to);
  const lane = v.lanes.find((l) => l.name === flat(from));
  if (!lane || !name || name === lane.name) return [];
  const want = named(v)
    .map((n) => (n === lane.name ? name : n))
    .filter((n, i, all) => all.indexOf(n) === i);
  const cells = lane.cards.map((c): Op => ({ op: 'cells', at: v.at, r: c.row, c: v.laneCol, values: [[name]] }));
  // The nameless lane named: a lane like the others, where its cards put it.
  if (!lane.name) return cells;
  const head: Op[] = lanesOf(doc.head.lanes).includes(lane.name) ? [{ op: 'head', key: 'lanes', value: lanesText(want) }] : [];
  return keeping(doc, [...head, ...cells], want);
}

/** A lane of no cards called `name`, at place `at` among the lanes (the end when not given): `lanes:` alone. */
export function addLane(doc: Doc, name: string, at?: number): Op[] {
  const v = boardOf(doc);
  const n = flat(name);
  const names = named(v);
  if (!n || names.includes(n)) return [];
  const want = [...names];
  want.splice(Math.max(0, Math.min(at ?? want.length, want.length)), 0, n);
  return [{ op: 'head', key: 'lanes', value: lanesText(want) }];
}

/** Lane `name` moved to place `to` among the lanes: `lanes:` alone. */
export function moveLane(doc: Doc, name: string, to: number): Op[] {
  const names = named(boardOf(doc));
  const i = names.indexOf(flat(name));
  if (i < 0) return [];
  const want = names.filter((_, k) => k !== i);
  want.splice(Math.max(0, Math.min(to, want.length)), 0, names[i]);
  return same(want, names) ? [] : [{ op: 'head', key: 'lanes', value: lanesText(want) }];
}

/** Lane `name` taken away with its cards; the other lanes stay as they were. */
export function removeLane(doc: Doc, name: string): Op[] {
  const v = boardOf(doc);
  const lane = v.lanes.find((l) => l.name === flat(name));
  if (!lane) return [];
  const want = named(v).filter((n) => n !== lane.name);
  const rows = lane.cards.map((c) => c.row).sort((a, b) => b - a);
  const ops: Op[] = rows.map((r) => ({ op: 'rows', at: v.at, r, n: 1 }));
  if (lanesOf(doc.head.lanes).includes(lane.name)) ops.unshift({ op: 'head', key: 'lanes', value: lanesText(want) });
  return keeping(doc, ops, want);
}

/**
 * Cards pasted into lane `lane` at place `at` among its cards: the rows of the first table pasted, their cells put in
 * the board's columns by name (the title by the pasted table's own title column where no name matches), or a card a
 * line of words. Says how many there are.
 */
export function pasteCards(doc: Doc, lane: string, at: number, text: string): { ops: Op[]; n: number } {
  const v = boardOf(doc);
  const got = parse(text);
  const src = got.blocks.find((b): b is TableBlock => b.k === 'table');
  const titles = src
    ? null
    : got.blocks
        .flatMap((b) => ('runs' in b ? b.runs.map((r) => r.t).join('') : '').split('\n'))
        .map(flat)
        .filter(Boolean);
  if (!src && !titles?.length) return { ops: [], n: 0 };
  const name = flat(lane);
  if (v.at < 0) {
    const rows = src ? src.rows.map((r) => [flat(r[titleColumn(src.cols, laneColumn(src.cols))]), name]) : titles!.map((x) => [x, name]);
    const table: TableBlock = { k: 'table', cols: newColumns(), rows };
    return { ops: keeping(doc, [{ op: 'splice', at: doc.blocks.length, n: 0, blocks: [table] }], addName(named(v), name)), n: rows.length };
  }
  const b = doc.blocks[v.at] as TableBlock;
  const rows = src
    ? src.rows.map((cells) =>
        b.cols.map((c, i) => {
          if (i === v.laneCol) return name;
          const k = src.cols.findIndex((s) => s.name.toLowerCase() === c.name.toLowerCase());
          if (k >= 0) return cells[k] ?? '';
          return i === v.titleCol ? flat(cells[titleColumn(src.cols, laneColumn(src.cols))]) : '';
        }),
      )
    : titles!.map((x) => b.cols.map((_, i) => (i === v.laneCol ? name : i === v.titleCol ? x : '')));
  if (!rows.length) return { ops: [], n: 0 };
  const cards = v.lanes.find((l) => l.name === name)?.cards ?? [];
  const r = rowFor(cards, Math.max(0, Math.min(at, cards.length)), b.rows.length);
  return { ops: keeping(doc, [{ op: 'rows', at: v.at, r, n: rows.length, rows }], addName(named(v), name)), n: rows.length };
}

/** Some cards as a table of their own (the clipboard's): the board's columns, their rows. */
export function cardsTable(doc: Doc, rows: number[]): TableBlock {
  const v = boardOf(doc);
  const b = doc.blocks[v.at] as TableBlock;
  return { k: 'table', cols: v.cols, rows: rows.map((r) => [...b.rows[r]]) };
}
