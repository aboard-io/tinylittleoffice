/**
 * What the small page apps (a bill split, a spinner, a Secret Santa...) share: their
 * text is read through their form (lib/lines.ts), so the form is the one
 * description of the format, and the page is drawn from its rows.
 */
import { isCatchAll, kindsOf, readLines, writeLines, type Kind, type Row } from './lines.ts';
import { cells, takeHead } from './tlo.ts';

/** The values of the rows of one kind, in order. */
export const valuesOf = (rows: Row[], kind: number) => rows.filter((r) => r.kind === kind).map((r) => r.values);

/**
 * Text as a person or a model loosely writes it, read into the form's
 * canonical TLO. A setting the form keeps as a line ("teams: A, B") may
 * come in the header. A line only the catch-all took is offered to `loose`
 * (a name alone on its line, "Sam: Tacos"); failing that, a line of cells
 * ("bom dia | good morning", or a row of a table whose columns are named
 * otherwise) is a row of the form's table, column by column. The rows there
 * is one of go at the top, in the form's order.
 */
export function tidy(text: string, form: Kind[], loose?: (line: string) => [kind: number, values: string[]] | null): string {
  const { kinds } = kindsOf(form);
  const keys = kinds.map((k) => (k.once ? /^([\w-]+): \{/.exec(k.is)?.[1] : undefined)).filter((k): k is string => !!k);
  const [head, rest] = takeHead(text.replace(/\r\n?/g, '\n'), keys);
  const settings = Object.entries(head).map(([k, v]) => `${k}: ${v}\n\n`).join('');
  const table = kinds.findIndex((k) => k.table);
  const rows = readLines(settings + rest, form).map((r): Row => {
    if (kinds[r.kind].table || !isCatchAll(kinds[r.kind])) return r;
    const hit = loose?.(r.values[0].trim()) ?? (table >= 0 && r.values[0].includes('|') ? ([table, cells(r.values[0])] as [number, string[]]) : null);
    return hit ? { kind: hit[0], values: hit[1], depth: 0 } : r;
  });
  const rank = (r: Row) => (kinds[r.kind].once ? r.kind : kinds.length);
  return writeLines(rows.sort((a, b) => rank(a) - rank(b)), form);
}
