/**
 * The Spreadsheet's commands (kit/commands.ts), its editor the context: the bar (Insert ▾, Chart ▾, Fill down, Fill
 * right, Fit the columns, Show all the text, Lock), the bar under a block (fill | copy, cut, paste | clear), a row's
 * menu, and the grid's keys in a cell (docs/editing.md §4 and §8): the arrows, Enter and Shift+Enter, Tab and
 * Shift+Tab between cells; Shift+arrows stretch the block; F2 edits in place; Escape puts back what the cell held (or
 * lets a block go); Space ticks a checkbox; Delete clears a block; Mod+A the cell's words, then the sheet; Mod+D fills
 * down; Mod+Enter is done; Alt+Up/Down move the rows; Mod+Alt+= and Mod+Alt+- put rows in and take them out (Google
 * Sheets' chords). A key acts on the cell it is typed in (`here`, which the editor sets as the key comes); Insert ▾'s
 * functions are the formula language's names, listed by the editor after these.
 */
import { ArrowDown, ArrowDownToLine, ArrowRightToLine, ArrowUp, ChartColumn, ClipboardPaste, Columns3, Copy, Eraser, Lock, Maximize2, Rows3, Scaling, Scissors, Trash2 } from 'lucide';
import { CHART_KINDS, suggestChart } from '../../kit/chart.ts';
import { register, type Command, commandsOf } from '../../kit/commands.ts';
import { t } from '../../kit/i18n.ts';
import { MAX_COLS, ROWS } from '../../doc/index.ts';
import { chartOfSheet } from './view.ts';
import type { ToSheetEditor } from './editor.ts';

type S = ToSheetEditor;
const cmd = commandsOf<S>('sheet');
const here = (s: S) => s.here ?? { r: s.sel[0], c: s.sel[1], at: null };
/** The rows a row's menu is for, said: "row 3", "rows 2–5". */
const which = (s: S) => {
  const [r0, r1] = s.rowsFor(s.menuRow);
  return r1 === r0 ? t('row {n}', { n: r0 + 1 }) : t('rows {a}–{b}', { a: r0 + 1, b: r1 + 1 });
};
const rowsIn = (s: S) => s.rowsFor(s.menuRow)[1] - s.rowsFor(s.menuRow)[0] + 1;
const rowHead = (s?: S) => {
  if (!s) return '';
  const w = which(s);
  return w[0].toUpperCase() + w.slice(1);
};
const ARROWS: Record<string, [number, number]> = { ArrowUp: [-1, 0], ArrowDown: [1, 0], ArrowLeft: [0, -1], ArrowRight: [0, 1] };

const SHEET: Command<S>[] = [
  cmd('insert', 'Insert', { icon: Rows3, menu: 'insert', where: ['bar'], takesFocus: true, does: () => undefined }),
  cmd('insert.above', 'Row above', { at: 'cell', icon: Rows3, keys: 'Mod+Alt+=', where: ['menu:insert'], does: (s, e) => s.insertRowsAt(false, e instanceof KeyboardEvent ? here(s).r : undefined) }),
  cmd('insert.below', 'Row below', { icon: Rows3, where: ['menu:insert'], does: (s) => s.insertRowsAt(true) }),
  cmd('insert.column', 'Column after', { icon: Columns3, where: ['menu:insert'], disabled: (s) => s.cols >= MAX_COLS, does: (s) => s.addColumn(s.sel[1] + 1) }),
  cmd('insert.chart', 'Chart', {
    icon: ChartColumn,
    hint: (s) => (s?.view.table.chart ? t('The sheet has one') : undefined),
    where: ['menu:insert'],
    disabled: (s) => !!s.view.table.chart,
    does: (s) => s.chart(suggestChart(chartOfSheet(s.view)) || 'bar'),
  }),
  cmd('chart', 'Chart', { icon: ChartColumn, menu: 'chart', where: ['bar'], document: true, takesFocus: true, does: () => undefined }),
  cmd('chart.none', 'No chart', { where: ['menu:chart'], pressed: (s) => s.view.table.chart === '', does: (s) => s.chart('') }),
  ...CHART_KINDS.map((k) =>
    cmd(`chart.${k.id}`, () => k.name(), {
      hint: (s) => (s && k.id === suggestChart(chartOfSheet(s.view)) ? t('suggested') : undefined),
      where: ['menu:chart'],
      pressed: (s) => s.view.table.chart === k.id,
      does: (s) => s.chart(k.id),
    }),
  ),
  cmd('filldown', 'Fill down from the top row', {
    at: 'cell',
    icon: ArrowDownToLine,
    keys: 'Mod+D',
    where: ['bar', 'context'],
    group: 'fill',
    disabled: (s) => !s.many && s.here === null,
    does: (s) => s.fill(true),
  }),
  cmd('fillright', 'Fill right from the first column', { icon: ArrowRightToLine, where: ['bar', 'context'], group: 'fill', disabled: (s) => !s.many, does: (s) => s.fill(false) }),
  cmd('fit', 'Fit the columns to the page', { icon: Maximize2, where: ['bar'], document: true, pressed: (s) => !s.widths, does: (s) => (s.widths = null) }),
  cmd('showall', 'Show all the text', { icon: Scaling, where: ['bar'], document: true, pressed: (s) => !!s.widths, does: (s) => s.showAll() }),
  cmd('lock', (s) => (s && s.locked(s.sel[0], s.sel[1]) ? t('Unlock these cells') : t('Lock these cells, so a reader leaves them be')), {
    icon: Lock,
    where: ['bar'],
    pressed: (s) => s.locked(s.sel[0], s.sel[1]),
    does: (s) => s.toggleLock(),
  }),
  cmd('copy', 'Copy', { at: 'cell', icon: Copy, keys: 'Mod+C', native: true, where: ['context'], group: 'clip', does: (s) => s.copyOut(false) }),
  cmd('cut', 'Cut', { at: 'cell', icon: Scissors, keys: 'Mod+X', native: true, where: ['context'], group: 'clip', does: (s) => s.copyOut(true) }),
  cmd('paste', 'Paste', { at: 'cell', icon: ClipboardPaste, keys: 'Mod+V', native: true, where: ['context'], group: 'clip', does: (s) => s.pasteFromClipboard() }),
  cmd('clear', 'Clear these cells', { at: 'cell', icon: Eraser, keys: 'Delete / Backspace', where: ['context'], group: 'clear', when: (s) => s.many, does: (s) => s.clear() }),
  cmd('row', (s) => t('Row {n}', { n: (s?.menuRow ?? 0) + 1 }), { menu: 'row', where: ['in-doc'], does: () => undefined }),
  cmd('row.above', (s) => t('Insert {n|a row|# rows} above', { n: s ? rowsIn(s) : 1 }), {
    icon: ArrowUp,
    heading: rowHead,
    where: ['menu:row'],
    disabled: (s) => s.view.used.rows > ROWS - rowsIn(s),
    does: (s) => s.insertRowsAt(false, s.menuRow),
  }),
  cmd('row.below', (s) => t('Insert {n|a row|# rows} below', { n: s ? rowsIn(s) : 1 }), {
    icon: ArrowDown,
    heading: rowHead,
    where: ['menu:row'],
    disabled: (s) => s.view.used.rows > ROWS - rowsIn(s),
    does: (s) => s.insertRowsAt(true, s.menuRow),
  }),
  cmd('row.up', 'Move up', {
    at: 'cell',
    icon: ArrowUp,
    keys: 'Alt+ArrowUp',
    heading: rowHead,
    where: ['menu:row'],
    disabled: (s) => !s.here && s.rowsFor(s.menuRow)[0] === 0,
    does: (s, e) => s.moveRowsBy(-1, e instanceof KeyboardEvent ? here(s).r : s.menuRow),
  }),
  cmd('row.down', 'Move down', {
    at: 'cell',
    icon: ArrowDown,
    keys: 'Alt+ArrowDown',
    heading: rowHead,
    where: ['menu:row'],
    disabled: (s) => !s.here && s.rowsFor(s.menuRow)[1] >= ROWS - 1,
    does: (s, e) => s.moveRowsBy(1, e instanceof KeyboardEvent ? here(s).r : s.menuRow),
  }),
  cmd('row.delete', (s) => t('Delete {which}', { which: s ? which(s) : '' }), {
    at: 'cell',
    icon: Trash2,
    keys: 'Mod+Alt+-',
    heading: rowHead,
    where: ['menu:row'],
    does: (s, e) => s.deleteRowsAt(e instanceof KeyboardEvent ? here(s).r : s.menuRow),
  }),
  cmd('all', 'Select all: the words of the box, then everything', { at: 'cell', keys: 'Mod+A', where: ['keys-only'], does: (s) => s.selectAllKey() }),
  cmd('done', 'Done', { at: 'cell', keys: 'Mod+Enter', where: ['keys-only'], does: (s) => s.doneHere() }),
  cmd('next', 'Indent or bring out in a list; the next cell in a grid', {
    at: 'cell',
    keys: 'Tab / Shift+Tab',
    where: ['keys-only'],
    does: (s, e) => s.tabKey(e instanceof KeyboardEvent && e.shiftKey),
  }),
  cmd('edit', 'Edit the cell, the caret at its end', { at: 'cell', keys: 'F2', where: ['keys-only'], does: (s) => s.here?.at?.toEnd() }),
  cmd('stretch', 'Extend the selection', {
    at: 'cell',
    keys: 'Shift+ArrowUp / Shift+ArrowDown / Shift+ArrowLeft / Shift+ArrowRight',
    where: ['keys-only'],
    does: (s, e) => e instanceof KeyboardEvent && s.stretch(ARROWS[e.key]),
  }),
  cmd('tick', 'Tick or untick a task', { at: 'cell', keys: 'Space', where: ['keys-only'], does: (s) => s.tickHere() }),
  cmd('letgo', 'Step out: close, collapse, let go', { at: 'cell', keys: 'Escape', where: ['keys-only'], when: (s) => s.many, does: (s) => void (s.end = null) }),
  cmd('cancel', 'Put back what the cell held', { at: 'cell', keys: 'Escape', where: ['keys-only'], does: (s) => s.cancelHere() }),
  cmd('move', 'The next or the one before', {
    at: 'cell',
    keys: 'Enter / Shift+Enter / ArrowDown / ArrowUp / ArrowLeft / ArrowRight',
    where: ['keys-only'],
    does: (s, e) => e instanceof KeyboardEvent && s.moveKey(e),
  }),
];

export default register(SHEET) as Command<S>[];
