/**
 * A sheet opened as a calendar (the Download menu's "Open in"): each row with a date a day on it, named by
 * the row's first column of words. The date is the first date column's (or, with none typed so, the first
 * column whose cells read as dates); a second date column, when there is one, is where the span ends. A
 * row with no date is left out.
 */
import { parse, parseInline, serialToIso, write, type Block } from '../../doc/index.ts';
import { dayOf, itemBlock, newDraft } from '../cal/model.ts';
import { readSheet } from './model.ts';

export function sheetToCal(text: string): string {
  const doc = parse(text);
  const v = readSheet(doc);
  const cols = v.table.cols;
  const dayAt = (r: number, c: number): number | null => {
    const raw = (v.table.rows[r]?.[c] ?? '').trim();
    const val = v.values[r]?.[c];
    if (raw.startsWith('=') && typeof val === 'number' && cols[c]?.type === 'date') return dayOf(serialToIso(val));
    return dayOf(raw);
  };
  const rows = v.table.rows.map((_, r) => r);
  let dates = cols.flatMap((c, i) => (c.type === 'date' ? [i] : []));
  if (!dates.length) dates = cols.map((_, i) => i).filter((c) => rows.some((r) => dayOf(v.table.rows[r]?.[c]) !== null));
  const [from, to] = dates;
  if (from === undefined) return write({ head: doc.head.title ? { title: doc.head.title } : {}, blocks: [] });
  const words = cols.findIndex((c, i) => !dates.includes(i) && ['text', 'rich', 'long', 'name', 'option'].includes(c.type));
  const blocks: Block[] = [];
  for (const r of rows) {
    const start = dayAt(r, from);
    if (start === null) continue;
    const end = to === undefined ? null : dayAt(r, to);
    const label = words >= 0 ? (v.table.rows[r]?.[words] ?? '').replace(/\n/g, ' ').trim() : '';
    const runs = !label ? [] : cols[words].type === 'rich' ? parseInline(label) : [{ t: label }];
    blocks.push(itemBlock({ ...newDraft(start, end !== null && end >= start ? end : start), label: runs }, 'UTC'));
  }
  blocks.sort((a, b) => (a.k === 'li' && b.k === 'li' ? (a.runs[0]?.t ?? '').localeCompare(b.runs[0]?.t ?? '') : 0));
  return write({ head: doc.head.title ? { title: doc.head.title } : {}, blocks });
}
