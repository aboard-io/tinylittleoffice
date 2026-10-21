/**
 * The Spreadsheet's commands (kit/core/commands.ts), its editor the context: the bar (Insert ▾, Chart ▾, Fill down, Fill
 * right, Fit the columns, Show all the text, Lock), the bar under a block (fill | copy, cut, paste | clear), a row's
 * menu, and the grid's keys in a cell (docs/editing.md §4 and §8): the arrows, Enter and Shift+Enter, Tab and
 * Shift+Tab between cells; Shift+arrows stretch the block; F2 edits in place; Escape puts back what the cell held (or
 * lets a block go); Space ticks a checkbox; Delete clears a block; Mod+A the cell's words, then the sheet; Mod+D fills
 * down; Mod+Enter is done; Alt+Up/Down move the rows; Mod+Alt+= and Mod+Alt+- put rows in and take them out (Google
 * Sheets' chords); under a finger, ABC asks for the letters keyboard in a number column. A key acts on the cell it is
 * typed in (`here`, which the editor sets as the key comes); Insert ▾'s functions are the formula language's names,
 * listed by the editor after these.
 */
import { ArrowDown, ArrowDownToLine, ArrowRightToLine, ArrowUp, CaseSensitive, ChartColumn, ClipboardPaste, Columns3, Copy, Eraser, Lock, Maximize2, Rows3, Scaling, Scissors, Trash2 } from 'lucide';
import { CHART_KINDS, suggestChart } from '../../kit/draw/chart.ts';
import { register, type Command, commandsOf } from '../../kit/core/commands.ts';
import { t } from '../../kit/core/i18n.ts';
import { MAX_COLS, ROWS } from '../../doc/index.ts';
import { chartOfSheet } from './view.ts';
import type { ToSheetEditor } from './editor.ts';

type S = ToSheetEditor;
const cmd = commandsOf<S>('sheet');
const here = (s: S) => s.here ?? { r: s.sel[0], c: s.sel[1], at: null };
/** The rows a row's menu is for, said: "row 3", "rows 2–5". */
const which = (s: S) => {
  const [r0, r1] = s.rowsFor(s.menuRow);
  return r1 === r0 ? t('common-row-n-lowercase', { n: r0 + 1 }) : t('common-rows-b', { a: r0 + 1, b: r1 + 1 });
};
const rowsIn = (s: S) => s.rowsFor(s.menuRow)[1] - s.rowsFor(s.menuRow)[0] + 1;
const rowHead = (s?: S) => {
  if (!s) return '';
  const w = which(s);
  return w[0].toUpperCase() + w.slice(1);
};
const ARROWS: Record<string, [number, number]> = { ArrowUp: [-1, 0], ArrowDown: [1, 0], ArrowLeft: [0, -1], ArrowRight: [0, 1] };

const SHEET: Command<S>[] = [
  // Under a finger the first of the bar, above the keyboard (style.css hides it elsewhere): a number column's cells ask for the numbers keyboard.
  cmd('letters', 'sheet-letters-keyboard', {
    icon: CaseSensitive,
    hint: 'sheet-abc-or-123-for-this',
    where: ['bar'],
    pressed: (s) => s.keyboard(s.sel[0], s.sel[1]) === 'text',
    disabled: (s) => !s.numeric,
    does: (s) => s.toggleLetters(),
  }),
  cmd('insert', 'common-insert', { icon: Rows3, menu: 'insert', where: ['bar'], takesFocus: true, does: () => undefined }),
  cmd('insert.above', 'sheet-row-above', {
    at: 'cell',
    icon: Rows3,
    keys: 'Mod+Alt+=',
    where: ['menu:insert'],
    does: (s, e) => s.insertRowsAt(false, e instanceof KeyboardEvent ? here(s).r : undefined),
  }),
  cmd('insert.below', 'sheet-row-below', { icon: Rows3, where: ['menu:insert'], does: (s) => s.insertRowsAt(true) }),
  cmd('insert.column', 'sheet-column-after', { icon: Columns3, where: ['menu:insert'], disabled: (s) => s.cols >= MAX_COLS, does: (s) => s.addColumn(s.sel[1] + 1) }),
  cmd('insert.chart', 'sheet-chart', {
    icon: ChartColumn,
    hint: (s) => (s?.view.table.chart ? t('sheet-has-one') : undefined),
    where: ['menu:insert'],
    disabled: (s) => !!s.view.table.chart,
    does: (s) => s.chart(suggestChart(chartOfSheet(s.view)) || 'bar'),
  }),
  cmd('chart', 'sheet-chart', { icon: ChartColumn, menu: 'chart', where: ['bar'], document: true, takesFocus: true, does: () => undefined }),
  cmd('chart.none', 'sheet-no-chart', { where: ['menu:chart'], pressed: (s) => s.view.table.chart === '', does: (s) => s.chart('') }),
  ...CHART_KINDS.map((k) =>
    cmd(`chart.${k.id}`, () => k.name(), {
      hint: (s) => (s && k.id === suggestChart(chartOfSheet(s.view)) ? t('sheet-suggested') : undefined),
      where: ['menu:chart'],
      pressed: (s) => s.view.table.chart === k.id,
      does: (s) => s.chart(k.id),
    }),
  ),
  cmd('filldown', 'sheet-fill-down-from-top-row', {
    at: 'cell',
    icon: ArrowDownToLine,
    keys: 'Mod+D',
    where: ['bar', 'context'],
    group: 'fill',
    disabled: (s) => !s.many && s.here === null,
    does: (s) => s.fill(true),
  }),
  cmd('fillright', 'sheet-fill-right-from-first-column', { icon: ArrowRightToLine, where: ['bar', 'context'], group: 'fill', disabled: (s) => !s.many, does: (s) => s.fill(false) }),
  cmd('fit', 'sheet-fit-columns-to-page', { icon: Maximize2, where: ['bar'], group: 'view', document: true, pressed: (s) => !s.widths, does: (s) => (s.widths = null) }),
  cmd('showall', 'sheet-show-all-text', { icon: Scaling, where: ['bar'], group: 'view', document: true, pressed: (s) => !!s.widths, does: (s) => s.showAll() }),
  cmd('lock', (s) => (s && s.locked(s.sel[0], s.sel[1]) ? t('sheet-unlock-these-cells') : t('sheet-lock-these-cells-so-reader')), {
    icon: Lock,
    where: ['bar'],
    pressed: (s) => s.locked(s.sel[0], s.sel[1]),
    does: (s) => s.toggleLock(),
  }),
  cmd('copy', 'common-copy', { at: 'cell', icon: Copy, keys: 'Mod+C', native: true, where: ['context'], group: 'clip', does: (s) => s.copyOut(false) }),
  cmd('cut', 'common-cut', { at: 'cell', icon: Scissors, keys: 'Mod+X', native: true, where: ['context'], group: 'clip', does: (s) => s.copyOut(true) }),
  cmd('paste', 'common-paste', { at: 'cell', icon: ClipboardPaste, keys: 'Mod+V', native: true, where: ['context'], group: 'clip', does: (s) => s.pasteFromClipboard() }),
  cmd('clear', 'sheet-clear-these-cells', { at: 'cell', icon: Eraser, keys: 'Delete / Backspace', where: ['context'], group: 'clear', when: (s) => s.many, does: (s) => s.clear() }),
  cmd('row', (s) => t('common-row-n', { n: (s?.menuRow ?? 0) + 1 }), { menu: 'row', where: ['in-doc'], does: () => undefined }),
  cmd('row.above', (s) => t('common-insert-n-rows-above', { n: s ? rowsIn(s) : 1 }), {
    icon: ArrowUp,
    heading: rowHead,
    where: ['menu:row'],
    disabled: (s) => s.view.used.rows > ROWS - rowsIn(s),
    does: (s) => s.insertRowsAt(false, s.menuRow),
  }),
  cmd('row.below', (s) => t('common-insert-n-rows-below', { n: s ? rowsIn(s) : 1 }), {
    icon: ArrowDown,
    heading: rowHead,
    where: ['menu:row'],
    disabled: (s) => s.view.used.rows > ROWS - rowsIn(s),
    does: (s) => s.insertRowsAt(true, s.menuRow),
  }),
  cmd('row.up', 'common-move-up', {
    at: 'cell',
    icon: ArrowUp,
    keys: 'Alt+ArrowUp',
    heading: rowHead,
    where: ['menu:row'],
    disabled: (s) => !s.here && s.rowsFor(s.menuRow)[0] === 0,
    does: (s, e) => s.moveRowsBy(-1, e instanceof KeyboardEvent ? here(s).r : s.menuRow),
  }),
  cmd('row.down', 'common-move-down', {
    at: 'cell',
    icon: ArrowDown,
    keys: 'Alt+ArrowDown',
    heading: rowHead,
    where: ['menu:row'],
    disabled: (s) => !s.here && s.rowsFor(s.menuRow)[1] >= ROWS - 1,
    does: (s, e) => s.moveRowsBy(1, e instanceof KeyboardEvent ? here(s).r : s.menuRow),
  }),
  cmd('row.delete', (s) => t('common-delete-which', { which: s ? which(s) : '' }), {
    at: 'cell',
    icon: Trash2,
    keys: 'Mod+Alt+-',
    heading: rowHead,
    where: ['menu:row'],
    does: (s, e) => s.deleteRowsAt(e instanceof KeyboardEvent ? here(s).r : s.menuRow),
  }),
  cmd('all', 'common-select-all-words-of-box', { at: 'cell', keys: 'Mod+A', where: ['keys-only'], does: (s) => s.selectAllKey() }),
  cmd('done', 'common-done', { at: 'cell', keys: 'Mod+Enter', where: ['keys-only'], does: (s) => s.doneHere() }),
  cmd('next', 'common-indent-or-bring-out-in', {
    at: 'cell',
    keys: 'Tab / Shift+Tab',
    where: ['keys-only'],
    does: (s, e) => s.tabKey(e instanceof KeyboardEvent && e.shiftKey),
  }),
  cmd('edit', 'sheet-edit-cell-caret-at-its', { at: 'cell', keys: 'F2', where: ['keys-only'], does: (s) => s.here?.at?.toEnd() }),
  cmd('stretch', 'common-extend-selection', {
    at: 'cell',
    keys: 'Shift+ArrowUp / Shift+ArrowDown / Shift+ArrowLeft / Shift+ArrowRight',
    where: ['keys-only'],
    does: (s, e) => e instanceof KeyboardEvent && s.stretch(ARROWS[e.key]),
  }),
  cmd('tick', 'common-check-or-uncheck-task', { at: 'cell', keys: 'Space', where: ['keys-only'], does: (s) => s.tickHere() }),
  cmd('letgo', 'common-step-out-close-collapse-let', { at: 'cell', keys: 'Escape', where: ['keys-only'], when: (s) => s.many, does: (s) => void (s.end = null) }),
  cmd('cancel', 'sheet-put-back-what-cell-held', { at: 'cell', keys: 'Escape', where: ['keys-only'], does: (s) => s.cancelHere() }),
  cmd('move', 'common-next-or-one-before', {
    at: 'cell',
    keys: 'Enter / Shift+Enter / ArrowDown / ArrowUp / ArrowLeft / ArrowRight',
    where: ['keys-only'],
    does: (s, e) => e instanceof KeyboardEvent && s.moveKey(e),
  }),
];

export default register(SHEET) as Command<S>[];
