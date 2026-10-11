/**
 * The document kernel's public surface. An app imports from here and
 * nowhere deeper: the model, TLO in and out, the operations, footnotes and
 * links over runs, tables and the formula engine. README.md in this folder
 * says how the pieces fit.
 */
export type { Attrs, Block, ColType, Column, Dir, Doc, FenceBlock, Head, Run, TableBlock, TextBlock } from './model.ts';
export { attr, blankDoc, hasClass, isAtomic, isEmbed, isText, normalRuns, pages, plainText, sameMarks, sections, webBlock, webOf } from './model.ts';

export {
  amountOf,
  attrsText,
  balanceNote,
  cells,
  column,
  columnsOf,
  columnText,
  COL_TYPES,
  currencyOf,
  escapeInline,
  fenceRef,
  parse,
  parseInline,
  parseLines,
  refFence,
  splitAttrs,
  splitHead,
  takeHead,
  text,
  withHead,
  write,
  writeBlock,
  writeHead,
  writeInline,
  writeLines,
} from './tlo.ts';

export type { Op } from './ops.ts';
export { apply, applyAll, depthOf, family, invert, invertAll, joinBlocks, moveFamily, placeFamily, putCells, removeItem, replaceSpan, runLength, shiftFamily, sliceRuns, splitBlock } from './ops.ts';

export type { Align } from './notes.ts';
export { ALIGN_NAMES, ALIGN_OF, linkable, linkify, linkTarget, listNumbers, markNotes, noteNumbers, noteRuns, notesOf, referenceNotes, runLinks } from './notes.ts';

export type { Cells, Chart, Moved, Range, Table } from './table.ts';
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
  remapRefs,
  ROWS,
  seriesOf,
  shiftFormula,
  sortRows,
  stays,
  tableAt,
  usedSize,
  withLock,
  withTable,
  ymdString,
  ymdToDay,
} from './table.ts';

export type { CellValue, Evaluated } from './formula.ts';
export { COLUMN_TYPES, dateToSerial, evaluate, evaluateTable, formatCell, formatMoney, formatValue, FUNCTIONS, parseLiteral, serialToIso, todaySerial } from './formula.ts';
