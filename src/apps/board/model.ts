/**
 * A board as a view of the document, and its commands as operations (docs/kernel.md §3). A board
 * is a view of a table (docs/tlo.md, tables with typed headings): its first table, its lanes the distinct values of
 * one column, its cards the rows, each card's title the first column of words and its fields the rest of the row:
 *
 *   ---
 *   lanes: To do, Doing, Done
 *   ---
 *   Title | Status:option | Owner | Due:date
 *   --- | --- | --- | ---
 *   Write the brief | Doing | Ana | 2027-03-01
 *
 * The lane column, by the first rule that finds one: the first column named Status or Stage (in any case), else the
 * first column typed `option`, else the last column. The format has no type of its own for a status (the kernel's
 * types end at `option`), so the name comes first, being what a person or a model writes over such a column and what
 * a sales pipeline calls its stages; `option`, one of the words the column holds, is the type the Spreadsheet gives
 * such a column (a blank board's is typed so, whatever its name in the reader's language); and the last column is
 * where a status sits in most tables pasted from elsewhere. The title is the first column of words (`text` or `rich`)
 * that is not the lane column, else the first other column.
 *
 * The lanes are in the order the head's `lanes:` gives (names between commas, a comma in a name written `\,`), which
 * also keeps a lane no card is in; then any other value in the order the rows first hold it. A row whose lane cell is
 * empty is in a lane of no name, which `lanes:` never holds. Within a lane the cards are in the order of their rows:
 * the table's own order, whatever lanes it interleaves, so a table from the Spreadsheet is a board as it is.
 *
 * How a lane looks beside its cards is the head's `lane-looks:` (`LaneLook`): entries between commas, each a lane's
 * name, `=`, and the look's words, a width (a number of rem, from `LANE_MIN` to `LANE_MAX`; the page's own width is
 * said by nothing), `collapsed` (the lane folded to a strip of its name and its count) and a color (one of the Board's
 * palette, `LANE_COLORS`, or a tone of the page's own), in any order: `lane-looks: Inbound=11, Lost=gray collapsed,
 * Won=green 24`. A width was once a word, and a document written then still reads: `narrow` is 11, `wide` 24 and
 * `normal` the page's own (`LANE_REM`); what is written is the number (Paul, 2026-10-21: a lane shaped by its handles,
 * editor.ts, A lane in hand). A name is escaped
 * as `lanes:` escapes it, and an `=` in it `\=`. A lane with no entry looks as every lane does. `setLaneLook` writes
 * a lane's look whole, `renameLane` carries it to the new name and `removeLane` takes it away, so a look rides with
 * its lane through the kernel's undo and shared editing as `lanes:` does.
 *
 * Every command is pure: given the document, the `Op[]` that does it, through the kernel's operations
 * (src/doc), so undo and shared editing (the kernel's `rebase` and `transform`) work unchanged. A card moved writes its lane cell (`cells`) and, where its place among the
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
 * renamed is its cards' cells and its name in `lanes:`; a card's fields typed in its dialog are its cells.
 *
 * A card's title and fields are read as the Spreadsheet shows their cells (`shownCell`): the table worked out
 * (`evaluateTable`, so a formula is its value), each cell formatted by its column's type (`formatCell`: money in its
 * currency, a date as a date, a number with its commas) and a rich cell as its inline Markdown's words. So a title
 * written "'007", words that would otherwise read as a number, shows 007, and the board on screen, on a page and in
 * words says what the Spreadsheet says. The title is words both ways: what `setTitle`, `addCard` and `pasteCards` are
 * given they write as words of the title column's type (`asWords`: "'007", "'=1+1", a rich column's "\=1+1"), so
 * the title shown after the change is exactly the words given, and a caller never escapes them itself. Where the title
 * column is not one of words (a table of none, whose title falls to its first other column: a number, an amount, a
 * date), the title shown is the value formatted ($120.00), and words given are written as words all the same: 130
 * typed there shows 130, not $130.00, as the Spreadsheet keeps "'130" typed in a money cell.
 *
 * Nothing here touches the DOM, and nothing here speaks a language: the names a board's table is born with (its title
 * column and its status column, where a document has no table yet) are given (`ColumnNames`, English where none are),
 * and so are a blank board's lanes. So the kernel is the one import, and a program under Node builds a board from its
 * own records and moves its cards with this file alone (`tinylittleoffice/board/model`, dist/board-model.js: a CRM's
 * pipeline, its leads the cards and its stages the lanes), while the editor gives the names in the reader's language (def.ts, editor.ts).
 */
import {
  applyAll,
  asWords,
  column,
  evaluateTable,
  firstTable,
  formatCell,
  inHead,
  invertAll,
  isLocked,
  lockText,
  parse,
  parseInline,
  plainText,
  tableAt,
  write,
  type CellValue,
  type Column,
  type Doc,
  type Op,
  type Range,
  type TableBlock,
} from '../../doc/index.ts';

export interface Field {
  /** Its column. */
  col: number;
  name: string;
  /** The cell as written: a formula, a number, words. */
  raw: string;
  /** The cell as its column shows it, on one line (`shownCell`): a formula's value, money in its currency, a date as a date, a rich cell's words; '' where it shows nothing. */
  shown: string;
  /** The cell worked out (`evaluateTable`): a number for an amount, a date's serial day, a formula's value, words. */
  value: CellValue;
}
export interface Card {
  /** Its row in the table. */
  row: number;
  /** Its lane, by its place in `lanes`. */
  lane: number;
  /** The title as its column shows it, on one line (`shownCell`): the words a person reads on the card and types, and what `setTitle` and `addCard` take ('' where there is none). */
  title: string;
  /** The title's cell as written, on one line: an apostrophe before words that would read as something else ("'007"), a formula as its text ('' where there is none). */
  raw: string;
  /** The rest of the row: every other column but the lane's, in the table's order, empty cells left out. */
  fields: Field[];
  /** The whole row worked out, a value a column (`evaluateTable`): what a table of the same cards shows (`<to-table>`, a host's). */
  values: CellValue[];
}
export interface Lane {
  name: string;
  cards: Card[];
}
/** A lane's width as it was once said, in words: narrow, normal (every lane's, unless said) or wide; read as `LANE_REM` says. */
export type LaneWidth = 'narrow' | 'normal' | 'wide';
/**
 * How a lane looks beside its cards (the head's `lane-looks:`, or a page's `laneLook`): its width, whether it is
 * collapsed to a strip of its name and its count, and its color, one of the Board's palette (`LANE_COLORS`) or a tone
 * of the page's own. A field left out is none: normal, open, no color.
 */
export interface LaneLook {
  /** A number of rem (`laneRem` reads it); a word, from a document or a page of before, is read as `LANE_REM` says. */
  width?: number | LaneWidth;
  collapsed?: boolean;
  color?: string;
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
  /** The lanes' looks by name, from the head's `lane-looks:`; a lane with none looks as every lane does. */
  looks: Record<string, LaneLook>;
}

/** The colors a lane or a card may be given by name, each drawn by the Board's stylesheet; any other word is a tone of the page's own, drawn by its own rules. */
export const LANE_COLORS: readonly string[] = ['blue', 'green', 'amber', 'red', 'violet', 'teal', 'gray'];
/** The words a width was once said in, as rem: what a document or a page written before a width was a number means by them. */
export const LANE_REM: Readonly<Record<LaneWidth, number>> = { narrow: 11, normal: 17, wide: 24 };
/** The least width an open lane is drawn at, and the most, in rem. */
export const LANE_MIN = 8;
export const LANE_MAX = 36;
/** A lane shaped narrower than this (rem) snaps to `LANE_MIN`: there are no widths between. */
export const LANE_SNAP = 10;
/** A lane shaped narrower than this (rem) folds to its strip. */
export const LANE_FOLD = 5;

/** A width as rem: a number within `LANE_MIN` and `LANE_MAX`, whole; a word as `LANE_REM` says, `normal` none (the page's own); undefined for none or for anything else. */
export function laneRem(width: unknown): number | undefined {
  if (width === 'narrow' || width === 'wide') return LANE_REM[width];
  const n = typeof width === 'number' ? width : typeof width === 'string' && /^\d+(\.\d+)?(rem)?$/i.test(width.trim()) ? parseFloat(width) : NaN;
  return Number.isFinite(n) && n > 0 ? Math.min(LANE_MAX, Math.max(LANE_MIN, Math.round(n))) : undefined;
}
/**
 * The look a hand gives a lane drawn `rem` wide by its handle: under `LANE_FOLD` it folds (and opens again at
 * `LANE_MIN`); under `LANE_SNAP`, `LANE_MIN`; else the width, whole, no more than `LANE_MAX`. A folded lane (`folded`)
 * stays folded until it is drawn out past `LANE_MIN`.
 */
export function shapedLook(rem: number, folded = false): { width: number; collapsed: boolean } {
  if (rem < (folded ? LANE_MIN : LANE_FOLD)) return { width: LANE_MIN, collapsed: true };
  if (rem < LANE_SNAP) return { width: LANE_MIN, collapsed: false };
  return { width: Math.min(LANE_MAX, Math.round(rem)), collapsed: false };
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

/** `v` cut at each `sep` a backslash does not escape, the parts as written (their escapes kept, for `unescaped`). */
function cut(v: string, sep: string): string[] {
  const out: string[] = [];
  let part = '';
  for (let i = 0; i < v.length; i++) {
    if (v[i] === '\\' && i + 1 < v.length) part += v[i] + v[++i];
    else if (v[i] === sep) (out.push(part), (part = ''));
    else part += v[i];
  }
  out.push(part);
  return out;
}
/** A backslash before a comma, an equals sign or a backslash taken away; elsewhere it is a letter of the name. */
const unescaped = (s: string) => s.replace(/\\([\\,=])/g, '$1');

/** Whether a look says nothing: the page's width, open, no color. */
export const plainLook = (look: LaneLook | null | undefined): boolean => !look || (laneRem(look.width) === undefined && !look.collapsed && !look.color);
/** A look from its words: a width (a number of rem, or a word of before), "collapsed", a color, in any order and any case; a word that is none of these is passed over. */
function lookOf(words: string): LaneLook {
  const look: LaneLook = {};
  for (const w of words.toLowerCase().split(/\s+/).filter(Boolean)) {
    const rem = laneRem(w);
    if (rem !== undefined) look.width = rem;
    else if (w === 'normal') delete look.width;
    else if (w === 'collapsed') look.collapsed = true;
    else if (!look.color && /^[a-z][a-z0-9-]*$/.test(w)) look.color = w;
  }
  return look;
}
/** A look as its words: its width as a number of rem where it has one, "collapsed" where it is, its color; '' for a plain one. */
const lookWords = (look: LaneLook): string =>
  [
    String(laneRem(look.width) ?? ''),
    look.collapsed ? 'collapsed' : '',
    (look.color ?? '')
      .trim()
      .toLowerCase()
      .replace(/[^a-z0-9-]/g, ''),
  ]
    .filter(Boolean)
    .join(' ');

/** The head's `lane-looks:` as looks by lane name: entries between commas, each a name, `=` and the look's words; a plain look, a repeated name and an entry with no `=` are left out. */
export function laneLooksOf(value: string | undefined): Record<string, LaneLook> {
  const out: Record<string, LaneLook> = {};
  for (const entry of cut(value ?? '', ',')) {
    const [rawName, ...rest] = cut(entry, '=');
    const name = flat(unescaped(rawName));
    if (!name || !rest.length || out[name]) continue;
    const look = lookOf(rest.join('='));
    if (!plainLook(look)) out[name] = look;
  }
  return out;
}
/** Looks as `lane-looks:` writes them: each lane's name (a comma, an equals sign or a backslash in it escaped), `=`, the look's words; undefined (the key taken away) for none. */
export function laneLooksText(looks: Record<string, LaneLook>): string | undefined {
  return (
    Object.entries(looks)
      .flatMap(([name, look]) => {
        const words = lookWords(look);
        return flat(name) && words ? [`${flat(name).replace(/[\\,=]/g, '\\$&')}=${words}`] : [];
      })
      .join(', ') || undefined
  );
}

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

/**
 * A cell's value as its column shows it, on one line: the Spreadsheet's rule (apps/sheet/view.ts `cellText`, which
 * the kit serves a page as `cellAsShown`), from the kernel alone. A rich cell is its inline Markdown's words, its marks
 * left out; any other is its value as the column's type formats it (`formatCell`): money in the column's currency,
 * else the document's (`currency`), a date as a date, a number with its commas, words as they are. The formatting is
 * the kernel's, which takes no language: the same words the kit's drawing shows (tests/view.test.ts holds the
 * two to one another for any board).
 */
function shownCell(value: CellValue, col: Column | undefined, currency: string | undefined): string {
  const words = col?.type === 'rich' && typeof value === 'string' ? plainText(parseInline(value)) : formatCell(value, col?.type, col?.currency || currency || undefined);
  return flat(words);
}

/** The board a document is: its first table read as lanes and cards; a document with none is an empty board, with the head's lanes. */
export function boardOf(doc: Doc): BoardView {
  const at = firstTable(doc);
  const fixed = lanesOf(doc.head.lanes);
  const lanes: Lane[] = fixed.map((name) => ({ name, cards: [] }));
  const looks = laneLooksOf(doc.head['lane-looks']);
  if (at < 0) return { at, laneCol: -1, titleCol: -1, cols: [], lanes, cards: [], looks };
  const b = doc.blocks[at] as TableBlock;
  const laneCol = laneColumn(b.cols);
  const titleCol = titleColumn(b.cols, laneCol);
  // The table worked out once, as the Spreadsheet works it out: a formula's value, words written "'007" as 007.
  const values = evaluateTable(tableAt(doc, at)!).values;
  const shown = (row: number, col: number) => shownCell(values[row]?.[col] ?? null, b.cols[col], doc.head.currency);
  b.rows.forEach((cells, row) => {
    const name = flat(cells[laneCol]);
    let lane = lanes.findIndex((l) => l.name === name);
    if (lane < 0) lane = lanes.push({ name, cards: [] }) - 1;
    const fields = b.cols.flatMap((c, col) =>
      col === laneCol || col === titleCol || !(cells[col] ?? '').trim() ? [] : [{ col, name: c.name, raw: cells[col], shown: shown(row, col), value: values[row]?.[col] ?? null }],
    );
    const [title, raw] = titleCol >= 0 ? [shown(row, titleCol), flat(cells[titleCol])] : ['', ''];
    lanes[lane].cards.push({ row, lane, title, raw, fields, values: b.cols.map((_, col) => values[row]?.[col] ?? null) });
  });
  return { at, laneCol, titleCol, cols: b.cols, lanes, cards: lanes.flatMap((l) => l.cards), looks };
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

/** What a board's table is born with, named: its title column and its status column, in the reader's language. */
export interface ColumnNames {
  title: string;
  status: string;
}
/** The names where none are given: a program's, which speaks no language of a reader's. */
export const ENGLISH_NAMES: ColumnNames = { title: 'Title', status: 'Status' };
/** A new board's lanes where none are given. */
export const ENGLISH_LANES: readonly string[] = ['To do', 'Doing', 'Done'];

/** The columns a board's table is born with: its title (words) and its status (`option`, whatever it is called). */
export const boardColumns = (names: ColumnNames = ENGLISH_NAMES): Column[] => [column(names.title), { name: names.status, type: 'option' }];

/**
 * A board as a document, from a host's own records: these lanes in this order in the head's `lanes:` (an empty lane
 * kept), a table of these columns, a row for each card, its cells in the columns' order, and, given, the lanes' looks
 * by name in `lane-looks:` (a stage's color, a lane folded). The kernel writes it (`write`), so it is canonical;
 * boardOf reads it back.
 */
export function boardDoc(lanes: readonly string[], cols: readonly Column[], rows: readonly (readonly string[])[] = [], looks: Record<string, LaneLook> = {}): Doc {
  const head: Record<string, string> = {};
  const named = lanesText([...lanes]);
  if (named) head.lanes = named;
  const looked = laneLooksText(looks);
  if (looked) head['lane-looks'] = looked;
  return { head, blocks: [{ k: 'table', cols: [...cols], rows: rows.map((r) => [...r]) }] };
}

/** A new board, as text: these lanes (To do, Doing and Done unless given), a table of these columns (a title and a status) to hold its cards, and no card. */
export const blankBoard = (lanes: readonly string[] = ENGLISH_LANES, cols: readonly Column[] = boardColumns()): string => write(boardDoc(lanes, cols));

/** Words as a title column of type `type` writes them: on one line, and as words (`asWords`), so the card shows them as given. */
const titleCell = (words: string, type: string | undefined) => asWords(flat(words), type);

/**
 * A card in lane `lane` titled `title`, at place `at` among its cards (the end when not given); the table's birth, with
 * a title and a status named `names`, when the document has none. The title is words, written as its column writes
 * words (`asWords`), so the card shows it as given: "007" is written "'007" in a column of words.
 */
export function addCard(doc: Doc, lane: string, title = '', at?: number, names: ColumnNames = ENGLISH_NAMES): Op[] {
  const v = boardOf(doc);
  const name = flat(lane);
  if (v.at < 0) {
    const cols = boardColumns(names);
    const table: TableBlock = { k: 'table', cols, rows: [[titleCell(title, cols[0].type), name]] };
    return keeping(doc, [{ op: 'splice', at: doc.blocks.length, n: 0, blocks: [table] }], addName(named(v), name));
  }
  const b = doc.blocks[v.at] as TableBlock;
  const row = b.cols.map(() => '');
  row[v.laneCol] = name;
  if (v.titleCol >= 0) row[v.titleCol] = titleCell(title, b.cols[v.titleCol].type);
  const cards = v.lanes.find((l) => l.name === name)?.cards ?? [];
  const r = rowFor(cards, Math.max(0, Math.min(at ?? cards.length, cards.length)), b.rows.length);
  return keeping(doc, [{ op: 'rows', at: v.at, r, n: 1, rows: [row] }], addName(named(v), name));
}
const addName = (names: string[], name: string) => (!name || names.includes(name) ? names : [...names, name]);

/** A lock after row `from` is taken out and put in again at `to` (in the table without it): each range follows its rows, one the move splits a range per run of rows (as the Spreadsheet's `moveRows` in Tiny Little Office). */
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

/** The card on row `row` into lane `lane` (by name: a new one is made after the rest), at place `to` among that lane's other cards. Nothing when its lane cell is locked, or where it already is. */
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
  // Let go where it was: nothing moves, and no row of another lane is passed over.
  if (v.lanes[card.lane].name === name && v.lanes[card.lane].cards.indexOf(card) === i) return [];
  const ops: Op[] = [];
  if (flat(b.rows[row][v.laneCol]) !== name) ops.push({ op: 'cells', at: v.at, r: row, c: v.laneCol, values: [[name]] });
  // Into an empty lane the row stays where it is; else beside the card it lands by.
  const r = others.length ? rowFor(others, i, b.rows.length, row) : row;
  if (r !== row) {
    // The row as it is, but for its lane cell where that was written: put in again as it was taken out.
    const cells = b.rows[row].map((x, c) => (c === v.laneCol && ops.length ? name : x));
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

/**
 * The ops that take a move back as a move: `ops`, a card's move or chosen cards' (`moveCard`, `moveCards`) made on
 * `doc`, undone as moves are made, so a host that reads only moves reads its undo too (a board carried only, editor.ts).
 * Each card's status cell is written as it was (`cells`) and its row taken out and put in again where it was (`rows`,
 * twice, the row as it then is); `lanes:` goes back as it was (`head`), and where the table keeps a lock the lock is
 * written again as it was after the rows, as `moveCard` writes it. The kernel's own inverse (`invertAll`) puts a table
 * whose rows moved back whole (a `splice`), so that a formula a row taken out left at #REF comes home: here it stays as
 * the move left it, as a row cut and pasted back in the Spreadsheet. An op that is no move's is the kernel's to invert.
 */
export function moveBack(doc: Doc, ops: Op[]): Op[] {
  const at = boardOf(doc).at;
  const back: Op[] = [];
  let now = doc;
  for (const op of ops) {
    const rows = op.op === 'cells' || op.op === 'rows' ? (now.blocks[op.at] as TableBlock).rows : [];
    if (op.op === 'cells')
      back.unshift({ op: 'cells', at: op.at, r: op.r, c: op.c, values: rows.slice(op.r, op.r + op.values.length).map((row, i) => row.slice(op.c, op.c + (op.values[i]?.length ?? 0))) });
    else if (op.op === 'rows')
      back.unshift(op.rows ? { op: 'rows', at: op.at, r: op.r, n: op.n } : { op: 'rows', at: op.at, r: op.r, n: op.n, rows: rows.slice(op.r, op.r + op.n).map((row) => [...row]) });
    else if (op.op === 'head' && op.key !== 'lock') back.unshift({ op: 'head', key: op.key, value: now.head[op.key] });
    // The lock, in the head or on the table (a splice of it), is written once, at the end.
    else if (!(op.op === 'head' || (op.op === 'splice' && op.at === at && op.n === 1))) back.unshift(...invertAll(now, [op]));
    now = applyAll(now, [op]);
  }
  if (!back.length) return back;
  const end = applyAll(now, back);
  const was = doc.blocks[at] as TableBlock;
  const is = end.blocks[at] as TableBlock;
  if (JSON.stringify(was.a) !== JSON.stringify(is.a)) {
    const { a: _, ...bare } = is;
    back.push({ op: 'splice', at, n: 1, blocks: [was.a ? { ...bare, a: was.a } : bare] });
  }
  if (end.head.lock !== doc.head.lock) back.push({ op: 'head', key: 'lock', value: doc.head.lock });
  return back;
}

/**
 * A card's title as typed: words, written as the title column writes words (`asWords`), so the title shown after it is
 * the words typed ("007" written "'007", "=1+1" "'=1+1", never a formula); nothing where it already shows them. A table
 * with no title column gets one, at the start, named `names.title`.
 */
export function setTitle(doc: Doc, row: number, title: string, names: ColumnNames = ENGLISH_NAMES): Op[] {
  const v = boardOf(doc);
  const card = v.cards.find((c) => c.row === row);
  const words = flat(title);
  if (!card || words === card.title) return [];
  if (v.titleCol >= 0) return [{ op: 'cells', at: v.at, r: row, c: v.titleCol, values: [[titleCell(words, v.cols[v.titleCol].type)]] }];
  const col = column(names.title);
  return [
    { op: 'cols', at: v.at, c: 0, n: 1, cols: [col] },
    { op: 'cells', at: v.at, r: row, c: 0, values: [[titleCell(words, col.type)]] },
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
  // Its look goes with it, unless the lane it joins has one of its own.
  const looks: Op[] = v.looks[lane.name] ? [{ op: 'head', key: 'lane-looks', value: laneLooksText(lookRenamed(v.looks, lane.name, name)) }] : [];
  return keeping(doc, [...head, ...looks, ...cells], want);
}
/** The looks with lane `from`'s under `to`, where `to` has none of its own (else `from`'s is dropped), in the order they were. */
function lookRenamed(looks: Record<string, LaneLook>, from: string, to: string): Record<string, LaneLook> {
  return Object.fromEntries(Object.entries(looks).flatMap(([k, l]) => (k !== from ? [[k, l]] : looks[to] ? [] : [[to, l]])));
}

/**
 * Lane `name`'s look as given, whole (a field left out is none: a width normal, the lane open, no color), in the
 * head's `lane-looks:`; null, or a plain look, takes its entry away. Nothing where the board has no such lane, or the
 * look is what it has.
 */
export function setLaneLook(doc: Doc, name: string, look: LaneLook | null): Op[] {
  const v = boardOf(doc);
  const n = flat(name);
  if (!n || !v.lanes.some((l) => l.name === n)) return [];
  const next = look ?? {};
  const looks: Record<string, LaneLook> = {};
  let seen = false;
  for (const [k, l] of Object.entries(v.looks)) {
    if (k !== n) looks[k] = l;
    else if (((seen = true), !plainLook(next))) looks[k] = next;
  }
  if (!seen && !plainLook(next)) looks[n] = next;
  const value = laneLooksText(looks);
  return value === laneLooksText(v.looks) ? [] : [{ op: 'head', key: 'lane-looks', value }];
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
  // Its look goes with it.
  if (v.looks[lane.name]) ops.unshift({ op: 'head', key: 'lane-looks', value: laneLooksText(Object.fromEntries(Object.entries(v.looks).filter(([k]) => k !== lane.name))) });
  if (lanesOf(doc.head.lanes).includes(lane.name)) ops.unshift({ op: 'head', key: 'lanes', value: lanesText(want) });
  return keeping(doc, ops, want);
}

/**
 * Cards pasted into lane `lane` at place `at` among its cards: the rows of the first table pasted, their cells put in
 * the board's columns by name, as they are written (the title by the pasted table's own title column where no name
 * matches: its words as that table shows them, written as words), or a card a line of words, written as words; into a
 * document with no table, a table born with a title and a status named `names`. Says how many there are.
 */
export function pasteCards(doc: Doc, lane: string, at: number, text: string, names: ColumnNames = ENGLISH_NAMES): { ops: Op[]; n: number } {
  const v = boardOf(doc);
  const got = parse(text);
  const src = got.blocks.find((b): b is TableBlock => b.k === 'table');
  // The pasted table read as a board: each row's title as it shows it, by its own title column.
  const from = src ? boardOf({ head: got.head, blocks: [src] }) : null;
  const shownTitle = (r: number) => from?.cards.find((c) => c.row === r)?.title ?? '';
  const titles = src
    ? src.rows.map((_, r) => shownTitle(r))
    : got.blocks
        .flatMap((b) => ('runs' in b ? b.runs.map((r) => r.t).join('') : '').split('\n'))
        .map(flat)
        .filter(Boolean);
  if (!titles.length) return { ops: [], n: 0 };
  const name = flat(lane);
  if (v.at < 0) {
    const cols = boardColumns(names);
    const rows = titles.map((x) => [titleCell(x, cols[0].type), name]);
    const table: TableBlock = { k: 'table', cols, rows };
    return { ops: keeping(doc, [{ op: 'splice', at: doc.blocks.length, n: 0, blocks: [table] }], addName(named(v), name)), n: rows.length };
  }
  const b = doc.blocks[v.at] as TableBlock;
  const title = (x: string) => (v.titleCol >= 0 ? titleCell(x, b.cols[v.titleCol].type) : '');
  const rows = src
    ? src.rows.map((cells, r) =>
        b.cols.map((c, i) => {
          if (i === v.laneCol) return name;
          const k = src.cols.findIndex((s) => s.name.toLowerCase() === c.name.toLowerCase());
          if (k >= 0) return cells[k] ?? '';
          return i === v.titleCol ? title(titles[r]) : '';
        }),
      )
    : titles.map((x) => b.cols.map((_, i) => (i === v.laneCol ? name : i === v.titleCol ? title(x) : '')));
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

/**
 * How a card shows one of its fields: `line`, the line under the title (a deal's company, a task's project), one card
 * holds one; `money`, an amount, set apart and summed under its lane's name; `date`, a day, short; `person`, someone
 * (an owner, an author), their initials in a round mark, the name said on hover and to a screen reader; `badge`, a
 * small chip (a choice, a count, a box ticked); `text`, a quiet name and value. The editor draws them (editor.ts);
 * here they are only named, so a host's server and its page say the same.
 */
export type CardFieldAs = 'line' | 'text' | 'money' | 'date' | 'person' | 'badge';
/** A field a card shows: its column, by name (any case) or by place, and how (by its column's type where not said). */
export interface CardField {
  column: string | number;
  as?: CardFieldAs;
}
/** A field resolved: its column's place in the table, and how it is shown. */
export interface ShownField {
  col: number;
  as: CardFieldAs;
}
/** A column's name that says it holds a person: what a person or a model writes over such a column. */
const PERSON = /^(owner|owners|assignee|assigned( to)?|author|person|people|who|rep|sales ?rep|account owner|contact|lead|manager|reviewer|editor)$/i;
/** How many fields a card shows where the host says nothing, beside its line: enough to tell a card, few enough to scan. */
export const CARD_FIELDS = 4;

/** How a column is shown on a card where the host does not say: by its type, a person by its name. */
export function fieldAs(col: Column): CardFieldAs {
  if (col.type === 'money') return 'money';
  if (col.type === 'date') return 'date';
  if (col.type === 'number' || col.type === 'percent' || col.type === 'check' || col.type === 'option') return 'badge';
  return PERSON.test(col.name.trim()) ? 'person' : 'text';
}

/**
 * The fields a card shows, and how: the host's (`given`: columns by name or place, in its order; a column named that
 * the table lacks, the lane's and the title's left out, a second `line` shown as text), else the defaults from the
 * columns' types: the first column of words that holds no person is the line under the title, then the others, up to
 * CARD_FIELDS, as their types say (`fieldAs`). A host that gives an empty list shows the title alone.
 */
export function cardFieldsOf(v: Pick<BoardView, 'cols' | 'laneCol' | 'titleCol'>, given?: readonly CardField[] | null): ShownField[] {
  const free = (c: number) => c >= 0 && c < v.cols.length && c !== v.laneCol && c !== v.titleCol;
  let line = false;
  const once = (as: CardFieldAs): CardFieldAs => (as === 'line' ? (line ? 'text' : ((line = true), 'line')) : as);
  if (given) {
    const seen = new Set<number>();
    return given.flatMap((f): ShownField[] => {
      const col = typeof f.column === 'number' ? f.column : v.cols.findIndex((c) => c.name.trim().toLowerCase() === String(f.column).trim().toLowerCase());
      if (!free(col) || seen.has(col)) return [];
      seen.add(col);
      return [{ col, as: once(f.as ?? fieldAs(v.cols[col])) }];
    });
  }
  const out: ShownField[] = [];
  v.cols.forEach((c, col) => {
    if (!free(col)) return;
    const as = fieldAs(c);
    if (as === 'text' && !line && (c.type === 'text' || c.type === 'rich' || !c.type)) out.push({ col, as: once('line') });
    else if (out.filter((f) => f.as !== 'line').length < CARD_FIELDS) out.push({ col, as });
  });
  return out;
}

/** The first column of money, whose amounts a lane sums under its name; -1 for none. */
export const moneyColumn = (v: Pick<BoardView, 'cols' | 'laneCol' | 'titleCol'>): number => v.cols.findIndex((c, i) => c.type === 'money' && i !== v.laneCol);

/** Lane `lane`'s cards' amounts in column `col`, added up: each card's value worked out (a formula's too), a cell that is no number left out. */
export function laneSum(v: BoardView, lane: number, col: number): number {
  return (v.lanes[lane]?.cards ?? []).reduce((sum, c) => {
    const x = c.values[col];
    return typeof x === 'number' && isFinite(x) ? sum + x : sum;
  }, 0);
}

/**
 * One cell as a table of the same cards changes it (a host's `<to-table>` beside the board, its `rowchange`): the
 * lane's cell is the card moved to the end of that lane (`moveCard`, a new lane made after the rest), the title's is
 * words (`setTitle`), any other its cell as written (`setCells`). Nothing where nothing changes.
 */
export function setCell(doc: Doc, row: number, col: number, value: string, names: ColumnNames = ENGLISH_NAMES): Op[] {
  const v = boardOf(doc);
  const card = v.cards.find((c) => c.row === row);
  if (!card) return [];
  if (col === v.laneCol) {
    const name = flat(value);
    if (name === v.lanes[card.lane].name) return [];
    const others = (v.lanes.find((l) => l.name === name)?.cards ?? []).filter((c) => c.row !== row);
    return moveCard(doc, row, name, others.length);
  }
  if (col === v.titleCol) return setTitle(doc, row, value, names);
  return setCells(doc, row, { [col]: value });
}
