/**
 * The rows the table's stories show: the Spreadsheet's membership roll (its `members` template, src/apps/sheet/
 * templates.ts), read with the kernel and worked out (its renewals are formulas), each column typed as the sheet types
 * it. A host's records are rows like these; none is made up here. `many` repeats the roll to the length asked, each
 * copy's rows their own ids, for the story that shows how a long table scrolls.
 */
import { evaluate, firstTable, parse, serialToIso, tableAt } from '../../../src/doc/index.ts';
import type { TableColumn, TableRow } from '../../../src/editors.ts';
import { templatesOf } from '../../support.ts';

export interface Member extends TableRow {
  name: string;
  plot: string;
  email: { label: string; href: string };
  paid: string | null;
  renews: string | null;
  dues: number | null;
  key: boolean;
  role: string;
}

/** The roles' colors: the kit's chips, each a color of the kit's charts. */
const COLORS = ['#0072b2', '#d55e00', '#009e73', '#cc79a7', '#e69f00', '#56b4e9'];

/** The roll's rows and its columns, as the sheet holds them. */
export async function members(): Promise<{ rows: Member[]; columns: TableColumn<Member>[]; title: string }> {
  const tpl = (await templatesOf('sheet')).find((x) => x.id === 'members')!;
  const doc = parse(tpl.doc);
  const at = firstTable(doc);
  const table = tableAt(doc, at)!;
  const values = evaluate(doc, at)!.values;
  const day = (v: unknown) => (typeof v === 'number' ? serialToIso(v) : null);
  const rows: Member[] = table.rows
    .map((_, r) => values[r])
    .filter((v) => v[1])
    .map((v, i) => ({
      id: `m${i + 1}`,
      name: String(v[0]),
      plot: String(v[1]),
      email: { label: String(v[2]), href: `mailto:${String(v[2])}` },
      paid: day(v[3]),
      renews: day(v[4]),
      dues: typeof v[5] === 'number' ? v[5] : null,
      key: v[6] === 1,
      role: String(v[7] ?? ''),
    }));
  const name = (i: number) => table.cols[i].name;
  const roles = [...new Set(rows.map((r) => r.role))];
  const columns: TableColumn<Member>[] = [
    { key: 'name', label: name(0), type: 'person', editable: true },
    { key: 'plot', label: name(1), width: '5rem' },
    { key: 'email', label: name(2), type: 'link' },
    { key: 'paid', label: name(3), type: 'date', editable: true },
    { key: 'renews', label: name(4), type: 'date' },
    { key: 'dues', label: name(5), type: 'money', currency: 'USD', editable: true },
    { key: 'key', label: name(6), type: 'boolean', editable: true },
    { key: 'role', label: name(7), type: 'enum', editable: true, options: roles.map((value, i) => ({ value, color: COLORS[i % COLORS.length] })) },
  ];
  return { rows, columns, title: tpl.name };
}

/** The roll repeated to `n` rows, each its own id. */
export function many(rows: Member[], n: number): Member[] {
  return Array.from({ length: n }, (_, i) => ({ ...rows[i % rows.length], id: `r${i}`, plot: `${rows[i % rows.length].plot}-${Math.floor(i / rows.length) + 1}` }));
}
