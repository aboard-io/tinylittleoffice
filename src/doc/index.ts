/**
 * The document kernel's public surface. An app imports from here and
 * nowhere deeper: the model, TLO in and out, the operations and their
 * transformation for shared editing, footnotes and links over runs, tables
 * and the formula engine. README.md in this folder says how the pieces fit.
 */
export type { Attrs, Block, ColType, Column, Dir, Doc, Head, Run, TableBlock, TextBlock } from './model.ts';
export { attr, hasClass, isAtomic, isInnerDoc, isRule, isText, normalRuns, pages, plainText, rule, sections } from './model.ts';

export {
  balanceNote,
  column,
  columnsOf,
  columnText,
  currencyOf,
  escapeInline,
  fenceRef,
  parse,
  parseInline,
  parseLines,
  refFence,
  sayableRuns,
  splitAttrs,
  takeHead,
  text,
  withHead,
  write,
  writeBlock,
  writeInline,
} from './tlo.ts';

export type { Op } from './ops.ts';
export { apply, applyAll, depthOf, family, invert, invertAll, joinBlocks, moveFamily, placeFamily, putCells, removeItem, replaceSpan, runLength, shiftFamily, sliceRuns, splitBlock } from './ops.ts';

export type { Edit, Ordered } from './sync.ts';
export { applyEdits, Conflict, rebase, transform } from './sync.ts';

export { linkable, linkify, linkTarget, listNumbers, markNotes, noteNumbers, noteRuns, notesOf, referenceNotes, runLinks } from './notes.ts';

export type { Cells, Chart, Range, Table } from './table.ts';
export {
  clearCells,
  COL_NAMES,
  copyCells,
  dayToYmd,
  fillCells,
  firstTable,
  inHead,
  isLocked,
  lockedRanges,
  lockText,
  MAX_COLS,
  movedIn,
  movedOut,
  nameKey,
  namedCells,
  pasteCells,
  rangeOf,
  rangeRef,
  rcToRef,
  refToRC,
  remapLock,
  ROWS,
  seriesOf,
  shiftFormula,
  sortRows,
  tableAt,
  usedSize,
  withLock,
  withTable,
  ymdString,
  ymdToDay,
} from './table.ts';

export type { CellValue, Evaluated } from './formula.ts';
export { asWords, COLUMN_TYPES, dateToSerial, evaluate, evaluateTable, formatCell, formatMoney, formatValue, FUNCTIONS, parseLiteral, serialToIso, todaySerial } from './formula.ts';

export type { TextList, TextNode, TextRun } from './text.ts';
export { textCounts, textMarkdown, textOf, textWords } from './text.ts';
