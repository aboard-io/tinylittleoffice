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
import { command, register, type Command } from '../../kit/commands.ts';
import { t } from '../../kit/i18n.ts';
import { MAX_COLS, ROWS } from '../../doc/index.ts';
import { chartOfSheet } from './view.ts';
import type { ToSheetEditor } from './editor.ts';

type S = ToSheetEditor;
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
  command<S>({ id: 'sheet.insert', scope: 'sheet', label: () => t('Insert'), icon: Rows3, menu: 'insert', where: ['bar'], takesFocus: true, does: () => undefined }),
  command<S>({ id: 'sheet.insert.above', scope: 'sheet', label: () => t('Row above'), icon: Rows3, keys: 'Mod+Alt+=', where: ['menu:insert'], does: (s, e) => s.insertRowsAt(false, e instanceof KeyboardEvent ? here(s).r : undefined) }),
  command<S>({ id: 'sheet.insert.below', scope: 'sheet', label: () => t('Row below'), icon: Rows3, where: ['menu:insert'], does: (s) => s.insertRowsAt(true) }),
  command<S>({ id: 'sheet.insert.column', scope: 'sheet', label: () => t('Column after'), icon: Columns3, where: ['menu:insert'], disabled: (s) => s.cols >= MAX_COLS, does: (s) => s.addColumn(s.sel[1] + 1) }),
  // A chart goes above the table, of the kind the numbers suggest; the Chart menu changes its kind.
  command<S>({ id: 'sheet.insert.chart', scope: 'sheet', label: () => t('Chart'), icon: ChartColumn, hint: (s) => (s?.view.table.chart ? t('The sheet has one') : undefined), where: ['menu:insert'], disabled: (s) => !!s.view.table.chart, does: (s) => s.chart(suggestChart(chartOfSheet(s.view)) || 'bar') }),
  command<S>({ id: 'sheet.chart', scope: 'sheet', label: () => t('Chart'), icon: ChartColumn, menu: 'chart', where: ['bar'], document: true, takesFocus: true, does: () => undefined }),
  command<S>({ id: 'sheet.chart.none', scope: 'sheet', label: () => t('No chart'), where: ['menu:chart'], pressed: (s) => s.view.table.chart === '', does: (s) => s.chart('') }),
  ...CHART_KINDS.map((k) => command<S>({ id: `sheet.chart.${k.id}`, scope: 'sheet', label: () => k.name(), hint: (s) => (s && k.id === suggestChart(chartOfSheet(s.view)) ? t('suggested') : undefined), where: ['menu:chart'], pressed: (s) => s.view.table.chart === k.id, does: (s) => s.chart(k.id) })),
  command<S>({ id: 'sheet.filldown', scope: 'sheet', label: () => t('Fill down from the top row'), icon: ArrowDownToLine, keys: 'Mod+D', where: ['bar', 'context'], group: 'fill', disabled: (s) => !s.many && s.here === null, does: (s) => s.fill(true) }),
  command<S>({ id: 'sheet.fillright', scope: 'sheet', label: () => t('Fill right from the first column'), icon: ArrowRightToLine, where: ['bar', 'context'], group: 'fill', disabled: (s) => !s.many, does: (s) => s.fill(false) }),
  command<S>({ id: 'sheet.fit', scope: 'sheet', label: () => t('Fit the columns to the page'), icon: Maximize2, where: ['bar'], document: true, pressed: (s) => !s.widths, does: (s) => (s.widths = null) }),
  command<S>({ id: 'sheet.showall', scope: 'sheet', label: () => t('Show all the text'), icon: Scaling, where: ['bar'], document: true, pressed: (s) => !!s.widths, does: (s) => s.showAll() }),
  command<S>({ id: 'sheet.lock', scope: 'sheet', label: (s) => (s && s.locked(s.sel[0], s.sel[1]) ? t('Unlock these cells') : t('Lock these cells, so a reader leaves them be')), icon: Lock, where: ['bar'], pressed: (s) => s.locked(s.sel[0], s.sel[1]), does: (s) => s.toggleLock() }),
  command<S>({ id: 'sheet.copy', scope: 'sheet', label: () => t('Copy'), icon: Copy, keys: 'Mod+C', native: true, where: ['context'], group: 'clip', does: (s) => s.copyOut(false) }),
  command<S>({ id: 'sheet.cut', scope: 'sheet', label: () => t('Cut'), icon: Scissors, keys: 'Mod+X', native: true, where: ['context'], group: 'clip', does: (s) => s.copyOut(true) }),
  command<S>({ id: 'sheet.paste', scope: 'sheet', label: () => t('Paste'), icon: ClipboardPaste, keys: 'Mod+V', native: true, where: ['context'], group: 'clip', does: (s) => s.pasteFromClipboard() }),
  command<S>({ id: 'sheet.clear', scope: 'sheet', label: () => t('Clear these cells'), icon: Eraser, keys: 'Delete / Backspace', where: ['context'], group: 'clear', when: (s) => s.many, does: (s) => s.clear() }),
  // A row's menu (a tap on its number): the rows it is for under their name.
  command<S>({ id: 'sheet.row.above', scope: 'sheet', label: (s) => t('Insert {n|a row|# rows} above', { n: s ? rowsIn(s) : 1 }), icon: ArrowUp, heading: rowHead, where: ['menu:row'], disabled: (s) => s.view.used.rows > ROWS - rowsIn(s), does: (s) => s.insertRowsAt(false, s.menuRow) }),
  command<S>({ id: 'sheet.row.below', scope: 'sheet', label: (s) => t('Insert {n|a row|# rows} below', { n: s ? rowsIn(s) : 1 }), icon: ArrowDown, heading: rowHead, where: ['menu:row'], disabled: (s) => s.view.used.rows > ROWS - rowsIn(s), does: (s) => s.insertRowsAt(true, s.menuRow) }),
  command<S>({ id: 'sheet.row.up', scope: 'sheet', label: () => t('Move up'), icon: ArrowUp, keys: 'Alt+ArrowUp', heading: rowHead, where: ['menu:row'], disabled: (s) => !s.here && s.rowsFor(s.menuRow)[0] === 0, does: (s, e) => s.moveRowsBy(-1, e instanceof KeyboardEvent ? here(s).r : s.menuRow) }),
  command<S>({ id: 'sheet.row.down', scope: 'sheet', label: () => t('Move down'), icon: ArrowDown, keys: 'Alt+ArrowDown', heading: rowHead, where: ['menu:row'], disabled: (s) => !s.here && s.rowsFor(s.menuRow)[1] >= ROWS - 1, does: (s, e) => s.moveRowsBy(1, e instanceof KeyboardEvent ? here(s).r : s.menuRow) }),
  command<S>({ id: 'sheet.row.delete', scope: 'sheet', label: (s) => t('Delete {which}', { which: s ? which(s) : '' }), icon: Trash2, keys: 'Mod+Alt+-', heading: rowHead, where: ['menu:row'], does: (s, e) => s.deleteRowsAt(e instanceof KeyboardEvent ? here(s).r : s.menuRow) }),
  // The grid's keys in a cell.
  command<S>({ id: 'sheet.all', scope: 'sheet', label: () => t('Select all: the words of the cell, then the sheet'), keys: 'Mod+A', where: ['keys-only'], does: (s) => s.selectAllKey() }),
  command<S>({ id: 'sheet.done', scope: 'sheet', label: () => t('Done, staying on the cell'), keys: 'Mod+Enter', where: ['keys-only'], does: (s) => s.doneHere() }),
  command<S>({ id: 'sheet.next', scope: 'sheet', label: () => t('The next cell, the cell before'), keys: 'Tab / Shift+Tab', where: ['keys-only'], does: (s, e) => s.tabKey(e instanceof KeyboardEvent && e.shiftKey) }),
  command<S>({ id: 'sheet.edit', scope: 'sheet', label: () => t('Edit the cell, the caret at its end'), keys: 'F2', where: ['keys-only'], does: (s) => s.here?.at?.toEnd() }),
  command<S>({ id: 'sheet.stretch', scope: 'sheet', label: () => t('Stretch the block'), keys: 'Shift+ArrowUp / Shift+ArrowDown / Shift+ArrowLeft / Shift+ArrowRight', where: ['keys-only'], does: (s, e) => e instanceof KeyboardEvent && s.stretch(ARROWS[e.key]) }),
  command<S>({ id: 'sheet.tick', scope: 'sheet', label: () => t('Tick or untick a checkbox'), keys: 'Space', where: ['keys-only'], does: (s) => s.tickHere() }),
  command<S>({ id: 'sheet.letgo', scope: 'sheet', label: () => t('Let the block go'), keys: 'Escape', where: ['keys-only'], when: (s) => s.many, does: (s) => void (s.end = null) }),
  command<S>({ id: 'sheet.cancel', scope: 'sheet', label: () => t('Put back what the cell held'), keys: 'Escape', where: ['keys-only'], does: (s) => s.cancelHere() }),
  command<S>({ id: 'sheet.move', scope: 'sheet', label: () => t('The cell below, above, before, after'), keys: 'Enter / Shift+Enter / ArrowDown / ArrowUp / ArrowLeft / ArrowRight', where: ['keys-only'], does: (s, e) => e instanceof KeyboardEvent && s.moveKey(e) }),
];

export default register(SHEET) as Command<S>[];
