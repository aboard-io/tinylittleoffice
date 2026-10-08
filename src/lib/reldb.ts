/**
 * A tiny relational database: tables of text, joined and queried with a
 * small dialect of SQL. Everything is in memory and in the link.
 *
 * The text is TLO (lib/tlo.ts): each table is a "## name" heading followed
 * by a table, and the queries are a `sql` fence, each ending in ";":
 *
 *   ## people
 *
 *   id | name | team_id>teams
 *   --- | --- | ---
 *   1 | Ann | 1
 *   2 | Bo | 2
 *
 *   ```sql
 *   select name, teams.name from people join teams on team_id = teams.id where teams.name = 'Design' order by name;
 *   ```
 *
 * "team_id>teams" says the column refers to another table.
 *
 * SELECT understands: columns (bare or table.column, "as" names), *,
 * count(*), count/sum/avg/min/max(column); FROM with any number of
 * "JOIN t ON a = b"; WHERE with = <> < > <= >= and LIKE ('%' wildcards),
 * joined by AND and OR; GROUP BY; ORDER BY ... [DESC]; LIMIT.
 */
import { parse, write, column, type Block } from './tlo.ts';

export interface Column {
  name: string;
  /** The table this column refers to, if it is a foreign key. */
  ref?: string;
}
export interface Table {
  name: string;
  cols: Column[];
  rows: string[][];
}
export interface Database {
  tables: Table[];
  queries: string[];
}
export interface Result {
  cols: string[];
  rows: (string | number)[][];
  error?: string;
}

/** A column heading, "team_id>teams", as its name and the table it refers to. */
function columnOf(h: string): Column {
  const [name, ref] = h.split('>').map((p) => p.trim());
  return { name: column(name).name, ...(ref ? { ref: ref.split('.')[0] } : {}) };
}

/** The queries of a sql fence: each ends with ";" or a blank line, and may run over several lines. */
const queriesOf = (body: string) =>
  body
    .split(/;\s*(?:\n|$)|\n\s*\n/)
    .map((q) => q.replace(/\s+/g, ' ').trim())
    .filter(Boolean);

/** Leniently: a table under any heading (or under none, named for its place), queries in any fence that is not another app's. */
export function parseDb(text: string): Database {
  const db: Database = { tables: [], queries: [] };
  let name = '';
  for (const b of parse(text).blocks) {
    if (b.k === 'h') name = b.text.trim().replace(/\s+/g, '_');
    else if (b.k === 'table') {
      db.tables.push({ name: name || `table${db.tables.length + 1}`, cols: b.head.map(columnOf), rows: b.rows });
      name = '';
    } else if (b.k === 'fence' && (b.lang === 'sql' || !b.lang)) db.queries.push(...queriesOf(b.body));
  }
  return db;
}

export function serializeDb(db: Database): string {
  const blocks: Block[] = db.tables.flatMap((t): Block[] => [
    { k: 'h', level: 2, text: t.name },
    { k: 'table', head: t.cols.map((c) => (c.ref ? `${c.name}>${c.ref}` : c.name)), rows: t.rows },
  ]);
  if (db.queries.length) blocks.push({ k: 'fence', lang: 'sql', body: db.queries.map((q) => `${q.replace(/;\s*$/, '')};`).join('\n') });
  return write({ head: {}, blocks }).replace(/\n$/, '');
}

/** A database as it is loosely written, in its canonical form. */
export const readDb = (text: string) => serializeDb(parseDb(text));

type Row = Record<string, string | number>;
const value = (s: string): string | number => (/^-?\d+(\.\d+)?$/.test(s.trim()) ? parseFloat(s) : s);
const same = (a: string, b: string) => a.toLowerCase() === b.toLowerCase();

/** Run one query. Problems come back as `error` rather than being thrown. */
export function runQuery(db: Database, sql: string): Result {
  try {
    return run(db, sql);
  } catch (e) {
    return { cols: [], rows: [], error: e instanceof Error ? e.message : String(e) };
  }
}

function run(db: Database, sql: string): Result {
  const toks = sql.match(/'(?:[^']|'')*'|<>|<=|>=|[(),=<>*]|[^\s(),=<>*]+/g) ?? [];
  let p = 0;
  const peek = () => toks[p] ?? '';
  const is = (...words: string[]) => words.every((w, i) => same(toks[p + i] ?? '', w));
  const eat = (...words: string[]) => {
    if (!is(...words)) throw new Error(`Expected ${words.join(' ').toUpperCase()} near "${toks.slice(p, p + 3).join(' ') || 'the end'}"`);
    p += words.length;
  };
  const table = (name: string) => {
    const t = db.tables.find((x) => same(x.name, name));
    if (!t) throw new Error(`No table called "${name}"`);
    return t;
  };
  // Rows carry every column twice: as "table.column" and, where it is not ambiguous, bare.
  const rowsOf = (t: Table): Row[] => t.rows.map((r) => Object.fromEntries(t.cols.map((c, i) => [`${t.name}.${c.name}`.toLowerCase(), value(r[i] ?? '')])));
  let known: string[] = [];
  const key = (name: string): string => {
    const n = name.toLowerCase();
    if (known.includes(n)) return n;
    const hits = known.filter((k) => k.endsWith('.' + n));
    if (hits.length === 1) return hits[0];
    throw new Error(hits.length ? `"${name}" is in more than one table: say which` : `No column called "${name}"`);
  };

  eat('select');
  const items: { agg?: string; col: string; as: string }[] = [];
  do {
    if (peek() === ',') p++;
    const first = toks[p++];
    let item: { agg?: string; col: string; as: string };
    if (peek() === '(') {
      p++;
      const col = toks[p++];
      eat(')');
      item = { agg: first.toLowerCase(), col, as: `${first.toLowerCase()}(${col})` };
    } else item = { col: first, as: first };
    if (is('as')) {
      p++;
      item.as = toks[p++];
    }
    items.push(item);
  } while (peek() === ',');
  eat('from');
  const from = table(toks[p++]);
  let rows = rowsOf(from);
  known = from.cols.map((c) => `${from.name}.${c.name}`.toLowerCase());
  while (is('join') || is('inner', 'join')) {
    p += is('join') ? 1 : 2;
    const t = table(toks[p++]);
    const more = rowsOf(t);
    known = [...known, ...t.cols.map((c) => `${t.name}.${c.name}`.toLowerCase())];
    eat('on');
    const a = key(toks[p++]);
    eat('=');
    const b = key(toks[p++]);
    rows = rows.flatMap((r) => more.filter((m) => ({ ...r, ...m })[a] === ({ ...r, ...m })[b]).map((m) => ({ ...r, ...m })));
  }

  const operand = (r: Row): string | number => {
    const t = toks[p++];
    if (t === undefined) throw new Error('The query stops short');
    if (t.startsWith("'")) return t.slice(1, -1).replace(/''/g, "'");
    return /^-?\d+(\.\d+)?$/.test(t) ? parseFloat(t) : r[key(t)];
  };
  const test = (r: Row): boolean => {
    const a = operand(r);
    const op = toks[p++]?.toLowerCase();
    const b = operand(r);
    if (op === 'like') return new RegExp('^' + String(b).replace(/[.*+?^${}()|[\]\\]/g, '\\$&').replace(/%/g, '.*').replace(/_/g, '.') + '$', 'i').test(String(a));
    const cmp = typeof a === 'number' && typeof b === 'number' ? a - b : String(a).localeCompare(String(b), undefined, { sensitivity: 'accent' });
    if (op === '=') return cmp === 0;
    if (op === '<>') return cmp !== 0;
    if (op === '<') return cmp < 0;
    if (op === '>') return cmp > 0;
    if (op === '<=') return cmp <= 0;
    if (op === '>=') return cmp >= 0;
    throw new Error(`"${op}" is not a comparison`);
  };
  if (is('where')) {
    p++;
    const start = p;
    let end = p;
    rows = rows.filter((r) => {
      // OR of ANDs, read afresh for every row.
      p = start;
      let any = false;
      for (;;) {
        let all = test(r);
        while (is('and')) {
          p++;
          all = test(r) && all;
        }
        any = any || all;
        if (!is('or')) break;
        p++;
      }
      end = p;
      return any;
    });
    // (With no rows the condition was never read; skip over it.)
    if (end === start) while (p < toks.length && !is('group') && !is('order') && !is('limit')) p++;
    else p = end;
  }
  let groups: string[] = [];
  if (is('group', 'by')) {
    p += 2;
    do {
      if (peek() === ',') p++;
      groups.push(key(toks[p++]));
    } while (peek() === ',');
  }
  const orders: { name: string; desc: boolean }[] = [];
  if (is('order', 'by')) {
    p += 2;
    do {
      if (peek() === ',') p++;
      const name = toks[p++];
      const desc = is('desc');
      if (is('desc') || is('asc')) p++;
      orders.push({ name, desc });
    } while (peek() === ',');
  }
  let limit = Infinity;
  if (is('limit')) {
    p++;
    limit = parseInt(toks[p++], 10);
  }
  if (p < toks.length) throw new Error(`Did not understand "${toks.slice(p, p + 3).join(' ')}"`);

  // Expand * and work out each output column.
  const outCols = items.flatMap((it) => (it.col === '*' && !it.agg ? known.map((k) => ({ col: k, as: k.split('.')[1] }) as (typeof items)[number]) : [it]));
  const grouped = groups.length > 0 || outCols.some((c) => c.agg);
  const byKey = new Map<string, Row[]>();
  for (const r of rows) {
    const k = groups.map((g) => r[g]).join('\u0000');
    byKey.set(k, [...(byKey.get(k) ?? []), r]);
  }
  const sets: Row[][] = grouped ? [...byKey.values()] : rows.map((r) => [r]);
  if (grouped && !rows.length && !groups.length) sets.push([]);
  const cell = (set: Row[], c: (typeof items)[number]): string | number => {
    if (!c.agg) return set[0]?.[key(c.col)] ?? '';
    if (c.agg === 'count') return c.col === '*' ? set.length : set.filter((r) => r[key(c.col)] !== '').length;
    const nums = set.map((r) => r[key(c.col)]).filter((v): v is number => typeof v === 'number');
    if (c.agg === 'sum') return nums.reduce((a, b) => a + b, 0);
    if (c.agg === 'avg') return nums.length ? Math.round((nums.reduce((a, b) => a + b, 0) / nums.length) * 1e6) / 1e6 : '';
    if (c.agg === 'min') return nums.length ? Math.min(...nums) : '';
    if (c.agg === 'max') return nums.length ? Math.max(...nums) : '';
    throw new Error(`No function called "${c.agg}"`);
  };
  let out = sets.map((set) => ({ set, cells: outCols.map((c) => cell(set, c)) }));
  for (const o of orders.reverse()) {
    const at = outCols.findIndex((c) => same(c.as, o.name) || same(c.as.split('.').pop()!, o.name));
    const by = (x: (typeof out)[number]) => (at >= 0 ? x.cells[at] : x.set[0]?.[key(o.name)] ?? '');
    out = out
      .map((x, i) => ({ x, i }))
      .sort((a, b) => {
        const [va, vb] = [by(a.x), by(b.x)];
        const d = typeof va === 'number' && typeof vb === 'number' ? va - vb : String(va).localeCompare(String(vb));
        return (o.desc ? -d : d) || a.i - b.i;
      })
      .map((y) => y.x);
  }
  return { cols: outCols.map((c) => c.as), rows: out.slice(0, limit).map((o) => o.cells) };
}
