/**
 * Database: tables, the data in them, and questions asked of it. The
 * picture is the schema (tables and what refers to what); the answers to
 * the queries come from lib/reldb.ts and are listed under it.
 */
import type { Kind as LineKind } from '../lib/lines.ts';
import { defineDiagram, frame, join, shape, type Diagram } from '../lib/diagram.ts';
import { csv, utf8, xml, listPage } from '../kit/core.ts';
import { parseDb, runQuery } from '../lib/reldb.ts';
import type { Shape } from '../lib/drawmodel.ts';
import { shapesPage } from './draw.def.ts';

const TW = 190;
const LINE = 20;

function layout(text: string): Diagram {
  const { tables } = parseDb(text);
  const perRow = Math.min(3, Math.max(1, tables.length));
  const tall = (n: number) => 34 + n * LINE + 10;
  const rowHeight = (row: number) => Math.max(0, ...tables.slice(row * perRow, row * perRow + perRow).map((t) => tall(t.cols.length)));
  const heads: Shape[] = [];
  const rest: Shape[] = [];
  tables.forEach((t, i) => {
    const x = (i % perRow) * (TW + 70);
    let y = 0;
    for (let r = 0; r < Math.floor(i / perRow); r++) y += rowHeight(r) + 50;
    // The table's name on a solid bar; its columns listed in the box below.
    heads.push(shape('r', x, y, TW, 30, `${t.name} | ${t.rows.length} ${t.rows.length === 1 ? 'row' : 'rows'}`, 2, 'b', 1));
    rest.push(shape('r', x, y + 30, TW, t.cols.length * LINE + 14, '', 0, 'b'));
    t.cols.forEach((c, k) => rest.push(shape('t', x + 6, y + 36 + k * LINE, TW - 12, LINE, c.ref ? `${c.name} → ${c.ref}` : c.name, 0, undefined, 1)));
  });
  const links = tables.flatMap((t, i) => t.cols.flatMap((c) => {
    const to = tables.findIndex((o) => o.name.toLowerCase() === c.ref?.toLowerCase());
    return to >= 0 && to !== i ? [join(i, to, true)] : [];
  }));
  return frame([...heads, ...rest, ...links], 30);
}

function schemaPage(body: string, upTo?: number) {
  const d = layout(body);
  return shapesPage(d.shapes, d.w, d.h, upTo);
}

/** Each query and its answer, as HTML tables. */
function aside(text: string): string {
  const db = parseDb(text);
  return db.queries
    .map((q) => {
      const r = runQuery(db, q);
      const head = `<h2><code>${xml(q)}</code></h2>`;
      if (r.error) return `${head}<p class="err">${xml(r.error)}</p>`;
      return `${head}<table><thead><tr>${r.cols.map((c) => `<th scope="col">${xml(c)}</th>`).join('')}</tr></thead><tbody>${r.rows.map((row) => `<tr>${row.map((v) => (typeof v === 'number' ? `<td class="n">${v}</td>` : `<td>${xml(v)}</td>`)).join('')}</tr>`).join('')}</tbody></table><p class="count">${r.rows.length} ${r.rows.length === 1 ? 'row' : 'rows'}</p>`;
    })
    .join('\n');
}

export const spec = {
  form: [
    { name: 'Query', is: '? {Query}' },
    { name: 'Table', is: '{Table}: {Columns}' },
    { name: 'Next table', is: '' },
    { name: 'Row', is: '{Values}' },
  ] as LineKind[],
  hint: 'A table: "name: column, column > other_table", then a row per line. Blank line between tables. A line starting "?" is a query.',
  example: 'teams: id, name\n1, Platform\n2, Design\n\npeople: id, name, team_id > teams\n1, Ann, 1\n2, Bo, 2\n3, Cy, 1\n\n? select teams.name, count(*) as people from people join teams on team_id = teams.id group by teams.name order by people desc',
  layout,
  aside,
};

export default defineDiagram(
  {
    id: 'db', group: 'Track',
    name: 'Database',
    icon: 'db',
    blurb: 'A tiny relational database: tables, rows, and SQL queries, with its schema drawn.',
    outline: (body) => parseDb(body).tables.map((t) => `${t.name}  ·  ${t.rows.length} rows`),
    html: (body) => `<h1>Database</h1>\n${parseDb(body).tables.map((t) => `<h2>${xml(t.name)}</h2>\n<table><thead><tr>${t.cols.map((c) => `<th scope="col">${xml(c.name)}</th>`).join('')}</tr></thead><tbody>${t.rows.map((r) => `<tr>${t.cols.map((_, i) => `<td>${xml(r[i] ?? '')}</td>`).join('')}</tr>`).join('')}</tbody></table>`).join('\n')}\n${aside(body)}`,
    // The schema, then a page for each query's answer.
    view(body, opts = {}) {
      const db = parseDb(body);
      return [schemaPage(body, opts.step), ...(opts.embed ? [] : db.queries.map((q) => {
        const r = runQuery(db, q);
        return listPage(q, r.error ? [r.error] : [r.cols.join('  ·  '), ...r.rows.map((row) => row.join('  ·  '))]);
      }))];
    },
    downloads: [{ ext: 'csv', label: 'CSV of the first query (or first table)', mime: 'text/csv;charset=utf-8', build: (b) => {
      const db = parseDb(b);
      const r = db.queries.length ? runQuery(db, db.queries[0]) : null;
      const t = db.tables[0];
      return utf8('﻿' + (r && !r.error ? csv([r.cols, ...r.rows]) : t ? csv([t.cols.map((c) => c.name), ...t.rows]) : ''));
    } }],
  },
  spec,
);

