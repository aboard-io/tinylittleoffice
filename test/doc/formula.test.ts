// The formula engine over a table block: arithmetic, references, functions, typed columns and dates, names; and
// evaluate(doc, at) over a Write document holding a table.
import { expect, test } from 'vitest';
import {
  asWords,
  dateToSerial,
  evaluate,
  evaluateTable,
  firstTable,
  formatCell,
  formatValue,
  namedCells,
  nameKey,
  parse,
  parseLiteral,
  serialToIso,
  tableAt,
  todaySerial,
  type ColType,
  type Table,
} from '../../src/doc/index.ts';

/** A table from rows of cells, its columns typed as given (text where not), with no names. */
const grid = (rows: string[][], types: string[] = []): Table => {
  const n = Math.max(...rows.map((r) => r.length), types.length);
  return {
    cols: Array.from({ length: n }, (_, c) => ({ name: '', type: (types[c] ?? 'text') as ColType })),
    rows: rows.map((r) => Array.from({ length: n }, (_, c) => r[c] ?? '')),
    lock: [],
    chart: '',
  };
};
const values = (t: Table) => evaluateTable(t).values;

test('arithmetic and precedence', () => {
  const v = values(grid([['=1+2*3'], ['=(1+2)*3'], ['=2^3^2'], ['=-2^2'], ['=10/4'], ['=50%']]));
  expect(v.map((r) => r[0])).toStrictEqual([7, 9, 512, 4, 2.5, 0.5]);
});

test('refs, ranges and functions', () => {
  const v = values(
    grid([
      ['1', '2', '=A1+B1'],
      ['3', '4', '=SUM(A1:B2)'],
      ['5', 'x', '=AVG(A1:A3)'],
      ['', '', '=COUNT(A1:B3)'],
      ['', '', '=MAX(A1:A3)-MIN(A1:A3)'],
      ['', '', '=ROUND(SQRT(2),3)'],
      ['', '', '=MOD(7,3)+INT(2.9)+ABS(-1)'],
    ]),
  );
  expect(v.map((r) => r[2])).toStrictEqual([3, 10, 3, 5, 4, 1.414, 4]);
});

test('errors', () => {
  const v = values(
    grid([
      ['=1/0', '=A1+1', '=foo(1)'],
      ['=A2', '=A3', '=x'],
      ['=B2', '=AA9', 'hello'],
      ['=C3+1', '=(1', '=1 2'],
    ]),
  );
  expect(v[0]).toStrictEqual(['#DIV/0', '#DIV/0', '#NAME']);
  expect(v[1]).toStrictEqual(['#CIRC', '#CIRC', '#NAME']);
  expect([v[2][0], v[2][1]]).toStrictEqual(['#CIRC', '#REF']);
  expect(v[3]).toStrictEqual(['#VALUE', '#ERR', '#ERR']);
  // A column past the table's width is empty, as a row past its last is.
  expect(values(grid([['=Z9+1']]))[0][0]).toBe(1);
  expect(values(grid([['', '', '=A1+1']]))[0][2]).toBe(1);
});

test('format', () => {
  expect(formatValue(0.1 + 0.2)).toBe('0.3');
  expect(formatValue(null)).toBe('');
  expect(formatValue('#ERR')).toBe('#ERR');
  expect(formatValue(1e20)).toBe('1.0000e+20');
});

test('comparisons, logic and business functions', () => {
  const v = values(
    grid([
      ['-1000', '300', '420', '680'],
      ['=IF(A1<0, 1, 1/0)', '=AND(B1>0, C1>=420)', '=OR(A1>0, D1<>680)', '=NOT(A1=-1000)'],
      ['=MEDIAN(A1:D1)', '=PRODUCT(B1:C1)', '=ROUNDUP(2.01, 0)', '=ROUNDDOWN(-2.99, 0)'],
      ['=NPV(0.1, B1:D1)', '=IRR(A1:D1)', '=PMT(0.05/12, 60, 20000)', '=FV(0.05, 10, -100)'],
      ['=PV(0.05, 10, -100)', '=IF(1=2, 5)', '=IRR(B1:D1)', '=E5+F30'],
    ]),
  );
  expect(v[1]).toStrictEqual([1, 1, 0, 0]);
  expect(v[2]).toStrictEqual([360, 126000, 3, -2]);
  const near = (a: unknown, b: number) => expect(typeof a === 'number' && Math.abs(a - b) < 0.005, `${a} vs ${b}`).toBe(true);
  near(v[3][0], 1130.73);
  near(v[3][1], 0.1634);
  near(v[3][2], -377.42);
  near(v[3][3], 1257.79);
  near(v[4][0], 772.17);
  expect(v[4].slice(1)).toStrictEqual([0, '#NUM', 0]);
});

test('typed columns: dates are numbers, and each type reads and shows its own way', () => {
  expect(dateToSerial(1900, 3, 1)).toBe(61);
  expect(serialToIso(dateToSerial(2027, 3, 1))).toBe('2027-03-01');
  const doc = parse(
    '---\nchart: line\n---\nWhen | Date:date | Cost:money | Share:percent | Link:url | Done:check\n--- | --- | --- | --- | --- | ---\nStart | 2027-03-01 | $1,200.5 | 12.5% | https://example.com/ | x\nEnd | 3/31/2027 | 80 | 7\n',
  );
  const t = tableAt(doc, 0)!;
  expect(t.chart).toBe('line');
  expect(t.cols.map((c) => c.type)).toStrictEqual(['text', 'date', 'money', 'percent', 'url', 'check']);
  const v = values(t);
  expect(v[0].slice(1)).toStrictEqual([dateToSerial(2027, 3, 1), 1200.5, 0.125, 'https://example.com/', 1]);
  expect(v[1].slice(1, 4)).toStrictEqual([dateToSerial(2027, 3, 31), 80, 0.07]);
  expect(v[0].map((x, c) => formatCell(x, t.cols[c].type))).toStrictEqual(['Start', '2027-03-01', '$1,200.50', '12.5%', 'https://example.com/', '☑']);
  expect(formatCell(-3.5, 'money')).toBe('-$3.50');
  expect(formatCell(1234567.891, 'number')).toBe('1,234,567.891');
  expect(formatCell(0, 'check')).toBe('☐');
  expect(formatCell(null, 'check')).toBe('');
  expect(formatCell('#REF', 'date')).toBe('#REF');
  // Text columns are left alone: what looks like money or a percentage stays as typed.
  expect(parseLiteral('$5')).toBe('$5');
  expect(parseLiteral('50%')).toBe('50%');
  expect(parseLiteral('2027-03-01')).toBe('2027-03-01');
  expect(parseLiteral('12', 'number')).toBe(12);
  // A type the sheet has no use for reads as words.
  expect(values(grid([['10:30', 'x']], ['time', 'icon']))[0]).toStrictEqual(['10:30', 'x']);
});

test('words that look like a formula, a number or a date are kept words by an apostrophe before them, as Excel and Sheets keep them', () => {
  // The apostrophe is not among the words; before words that read as themselves it is theirs.
  expect(values(grid([["'=SUM(1)", "'007", "'Tis", "''=x", "'", '=SUM(1)']], ['text', 'text', 'text', 'text', 'text', 'number']))[0]).toStrictEqual(['=SUM(1)', '007', "'Tis", "'=x", "'", 1]);
  expect(values(grid([["'2027-03-01", "'12.5%", "'x", "'5"]], ['date', 'percent', 'check', 'number']))[0]).toStrictEqual(['2027-03-01', '12.5%', 'x', '5']);
  // asWords writes them so: an apostrophe only where the words would read as something else.
  expect(['=SUM(1)', '007', "'Tis", "'=x", 'Rent', '  '].map((w) => asWords(w))).toStrictEqual(["'=SUM(1)", "'007", "'Tis", "''=x", 'Rent', '  ']);
  expect([asWords('2027-03-01', 'date'), asWords('2027-03-01'), asWords('x', 'check')]).toStrictEqual(["'2027-03-01", '2027-03-01', "'x"]);
  // A rich cell is inline Markdown, whose own escape keeps a "=" at its start from a formula.
  expect([asWords('=SUM(1)', 'rich'), asWords("'Tis", 'rich')]).toStrictEqual(['\\=SUM(1)', "'Tis"]);
  expect(values(grid([['\\=SUM(1)']], ['rich']))[0]).toStrictEqual(['\\=SUM(1)']);
  // And its cell is words whatever they say, a number or a date alone among them; a formula is a formula.
  expect([asWords('007', 'rich'), asWords('2027-03-01', 'rich')]).toStrictEqual(['007', '2027-03-01']);
  expect(values(grid([['007', '50%', '**12**', '=1+1']], ['rich', 'rich', 'rich', 'rich']))[0]).toStrictEqual(['007', '50%', '**12**', 2]);
  // Through the format the cell is as it was written.
  const doc = parse("A | B:date | C:rich\n--- | --- | ---\n'=SUM(1) | '2027-03-01 | \\\\=SUM(1)\n");
  expect(tableAt(doc, 0)!.rows[0]).toStrictEqual(["'=SUM(1)", "'2027-03-01", '\\=SUM(1)']);
});

test('date math, as of a given day', () => {
  const t = grid(
    [
      ['2027-01-31', '2027-03-01', '=B1-A1', '=A1+30', '=EDATE(A1, 1)', '=DAYS(B1, A1)'],
      ['=DATE(2027, 12, 25)', '=YEAR(A2)', '=MONTH(A2)', '=DAY(A2)', '=WEEKDAY(A2)', '=WORKDAYS(A1, B1)'],
      ['=TODAY()', '=A3-TODAY()', '=EDATE(A2, -10)', '=WORKDAYS(B1, A1)', '=IF(B1>A1, 1, 0)', '', 'today'],
    ],
    ['date', 'date', 'number', 'date', 'date', 'number', 'date'],
  );
  const today = dateToSerial(2027, 2, 1);
  const v = evaluateTable(t, today).values;
  const shown = v.map((row) => row.map((x, c) => formatCell(x, t.cols[c].type)));
  expect(shown[0]).toStrictEqual(['2027-01-31', '2027-03-01', '29', '2027-03-02', '2027-02-28', '29', '']);
  expect(v[1].slice(1, 5)).toStrictEqual([2027, 12, 25, 7]);
  expect(v[1][0]).toBe(dateToSerial(2027, 12, 25));
  expect(v[1][5]).toBe(21);
  expect(v[2][0]).toBe(today);
  expect(v[2][6]).toBe(today);
  expect([v[2][1], v[2][3], v[2][4]]).toStrictEqual([0, -21, 1]);
  expect(formatCell(v[2][2], 'date')).toBe('2027-02-25');
  expect(evaluateTable(grid([['=TODAY()']])).values[0][0]).toBe(todaySerial());
});

test('named cells: a name column names the cell to its right, and a formula may say so', () => {
  const t = grid(
    [
      ['Visitors', 'Signups', '=visitors*signup_rate/100', 'Visitors', '20000'],
      ['Visitors', 'Bounced', '=visitors-signups', 'Signup rate', '6'],
      ['', '', '', 'Signups', '=SUMIF(B1:B9, "Signups", C1:C9)'],
      ['', '', '', 'Nobody', '=nothing+1'],
    ],
    ['text', 'text', 'number', 'name', 'number'],
  );
  const v = values(t);
  expect([v[0][2], v[1][2], v[2][4]]).toStrictEqual([1200, 18800, 1200]);
  // Case and spaces do not matter; a name nothing holds is #NAME; the name column itself is words.
  expect(v[3][4]).toBe('#NAME');
  expect(v[0][3]).toBe('Visitors');
  expect([...namedCells(t).keys()]).toStrictEqual(['VISITORS', 'SIGNUP_RATE', 'SIGNUPS', 'NOBODY']);
  expect(nameKey('One-off gifts ')).toBe('ONE_OFF_GIFTS');
  expect([...evaluateTable(t).named.entries()][0]).toStrictEqual(['VISITORS', [0, 4]]);
});

test('SUMIF and COUNTIF: by words, by a cell, by a comparison; only the cells that match are worked out', () => {
  const v = values(
    grid([
      ['Run', '5', '=SUMIF(A1:A4, "run", B1:B4)'],
      ['Piano', '30', '=COUNTIF(A1:A4, "Run")'],
      ['Run', '7.5', '=SUMIF(B1:B4, ">6", B1:B4)'],
      ['Swim', '40', '=SUMIF(A1:A4, A2, B1:B4)'],
      ['Total', '=SUMIF(A1:A5, "Run", B1:B5)', '=COUNTIF(B1:B4, "<>5")'],
    ]),
  );
  expect([v[0][2], v[1][2], v[2][2], v[3][2], v[4][1], v[4][2]]).toStrictEqual([12.5, 2, 77.5, 30, 12.5, 3]);
});

test("evaluate(doc, at): a table inside a Write document is worked out in place, as the sheet document's is", () => {
  const doc = parse(
    '# Invoice 0042 {.title}\n\nThank you for the work.\n\nWhat | Qty:number | Price:money | Amount:money\n--- | --- | --- | ---\nDesign | 12 | 150 | =B1*C1\nBuild | 20 | 140 | =B2*C2\nTotal | | | =SUM(D1:D2)\n\nPayment by bank transfer.\n\nQ | Sales:money\n--- | ---\nQ1 | 120\nQ2 | =B1+60\n',
  );
  expect(firstTable(doc)).toBe(2);
  const e = evaluate(doc)!;
  expect(e.values.map((r) => r[3])).toStrictEqual([1800, 2800, 4600]);
  expect(e.values[2].slice(0, 3)).toStrictEqual(['Total', null, null]);
  expect(e.values[0].map((v, c) => formatCell(v, tableAt(doc, 2)!.cols[c].type))).toStrictEqual(['Design', '12', '$150.00', '$1,800.00']);
  // The second table is its own sheet: B1 is its own first row.
  expect(evaluate(doc, 4)!.values).toStrictEqual([
    ['Q1', 120],
    ['Q2', 180],
  ]);
  expect(evaluate(doc, 0)).toBeNull();
  expect(evaluate(parse('# No table\n'))).toBeNull();
});
