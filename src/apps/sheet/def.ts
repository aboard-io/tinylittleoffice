/**
 * Sheet: a spreadsheet with formulas and a chart of it if you ask. The document is one table block, its
 * header row the columns' names and types, the chart and the lock in the head (docs/kernel.md §5). The
 * data model of the suite: budgets, logs and business models are its templates. The editor is
 * editor.ts, the drawing view.ts, the commands model.ts.
 */
import { Table2 } from 'lucide';
import { apply, parse, write, type Doc as Kernel } from '../../doc/index.ts';
import { defineApp, type Doc } from '../../kit/app.ts';
import { utf8, pageSvg } from '../../kit/draw.ts';
import { t } from '../../kit/i18n.ts';
import { raster } from '../../kit/raster.ts';
import { tableToXlsx } from '../../kit/xlsx.ts';
import { readSheet } from './model.ts';
import { chartOf, sheetPages, sheetToCsv } from './view.ts';
import { templates } from './templates.ts';

const headOf = (doc: Doc): Kernel => parse(doc);
/** The document's name: its title head field. */
export const titleOf = (doc: Doc): string => headOf(doc).head.title ?? '';
/** The document with this name: one head op, written back. */
export const retitle = (doc: Doc, title: string): Doc => write(apply(headOf(doc), { op: 'head', key: 'title', value: title.replace(/\n/g, ' ').trim() || undefined }));

export default defineApp({
  id: 'sheet',
  get name() {
    return t('Spreadsheet');
  },
  get group() {
    return t('Numbers');
  },
  icon: Table2,
  get blurb() {
    return t('A spreadsheet with formulas, named cells and charts; three columns to start, more as you need them.');
  },
  blank: () => '',
  get templates() {
    return templates();
  },
  editor: () => import('./editor.ts'),
  title: titleOf,
  retitle,
  view: (doc, opts) => sheetPages(doc, opts?.small),
  exports: [
    { ext: 'xlsx', label: () => t('Excel (XLSX)'), mime: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet', build: (doc) => xlsx(doc) },
    // The byte order mark is how Excel knows a CSV is UTF-8.
    { ext: 'csv', label: () => t('CSV'), mime: 'text/csv;charset=utf-8', build: (doc) => utf8('\ufeff' + sheetToCsv(parse(doc))) },
    { ext: 'chart.svg', label: () => t('Chart (SVG)'), mime: 'image/svg+xml', build: (doc) => chartSvg(doc) },
    {
      ext: 'chart.png',
      label: () => t('Chart (PNG)'),
      mime: 'image/png',
      build: async (doc) => {
        const p = chartOf(readSheet(parse(doc)));
        return (p && (await raster(pageSvg(p), p.w, p.h, 2))) ?? new Uint8Array();
      },
    },
  ],
});

/** The sheet as a workbook: the table and its values. */
function xlsx(doc: Doc): Uint8Array {
  const v = readSheet(parse(doc));
  return tableToXlsx(v.table, { values: v.values, named: v.named });
}

/** The chart as an SVG file; an empty chart's page when the sheet asks for none. */
function chartSvg(doc: Doc): Uint8Array {
  const v = readSheet(parse(doc));
  const p = chartOf(v) ?? sheetPages(doc, true)[0];
  return utf8(pageSvg(p));
}
