// A money column names its currency: "Price:money(£)", "Price:money(GBP)". Read leniently, written canonically;
// its money shown in that currency (a code as the browser writes it), typed money read with a symbol or a code.
import { expect, test } from 'vitest';
import { column, columnText, currencyOf, evaluateTable, formatCell, formatMoney, parse, parseLiteral, tableAt, write } from '../../src/doc/index.ts';
import { tableToXlsx } from '../../src/kit/xlsx.ts';
import { unzipSync, strFromU8 } from 'fflate';

const gbp = (n: number) => new Intl.NumberFormat(undefined, { style: 'currency', currency: 'GBP' }).format(n);

test('the column head: a symbol or a code in parentheses after money; the plain form as it was', () => {
  expect(column('Price:money(£)')).toStrictEqual({ name: 'Price', type: 'money', currency: '£' });
  expect(column('Price:money(GBP)')).toStrictEqual({ name: 'Price', type: 'money', currency: 'GBP' });
  expect(column('Price:money(R$)')).toStrictEqual({ name: 'Price', type: 'money', currency: 'R$' });
  expect(column('Price:money')).toStrictEqual({ name: 'Price', type: 'money' });
  // Leniently: spaces anywhere, a code in small letters.
  expect(column('Price: money ( gbp )')).toStrictEqual({ name: 'Price', type: 'money', currency: 'GBP' });
  expect(column(' Per night:money( £ ) ')).toStrictEqual({ name: 'Per night', type: 'money', currency: '£' });
  // Only money takes one; anything else in parentheses, or another type with them, is a name.
  expect(column('Cost:number(£)')).toStrictEqual({ name: 'Cost:number(£)', type: 'text' });
  expect(column('Price:money(pounds)')).toStrictEqual({ name: 'Price:money(pounds)', type: 'text' });
  expect(column('Price:money(12)')).toStrictEqual({ name: 'Price:money(12)', type: 'text' });
  expect(column('Price:money()')).toStrictEqual({ name: 'Price:money()', type: 'text' });
  expect(column('Price (£):number')).toStrictEqual({ name: 'Price (£)', type: 'number' });
  expect(currencyOf('kr')).toBe(null);
  expect(currencyOf('₹')).toBe('₹');
  expect(columnText('Price', 'money', 'GBP')).toBe('Price:money(GBP)');
  expect(columnText('Price', 'number', 'GBP')).toBe('Price:number');
});

test('a table with currencies is written back byte for byte, and the lenient forms canonically', () => {
  const doc = 'Job | Price:money(£) | Abroad:money(EUR) | Cost:number(£)\n--- | --- | --- | ---\nCall-out | 85 | 90 | 1\n';
  expect(write(parse(doc))).toBe(doc);
  expect(parse(write(parse(doc)))).toStrictEqual(parse(doc));
  expect(write(parse('Job | Price: money ( gbp )\n--- | ---\nA | 1\n'))).toBe('Job | Price:money(GBP)\n--- | ---\nA | 1\n');
});

test('formatCell: a symbol where the dollar was, a code as the browser writes it, none the dollar', () => {
  expect(formatCell(1234.5, 'money', '£')).toBe('£1,234.50');
  expect(formatCell(-1234.5, 'money', '£')).toBe('-£1,234.50');
  expect(formatCell(1234.5, 'money', 'R$')).toBe('R$1,234.50');
  expect(formatCell(1234.5, 'money')).toBe('$1,234.50');
  expect(formatCell(-3.5, 'money', '')).toBe('-$3.50');
  expect(formatCell(1234.5, 'money', 'GBP')).toBe(gbp(1234.5));
  expect(formatCell(-1234.5, 'money', 'GBP')).toBe(gbp(-1234.5));
  expect(formatMoney(2, 'GBP')).toMatch(/2\.00|2,00/);
  // A currency is money's alone.
  expect(formatCell(12, 'number', '£')).toBe('12');
});

test('typed money is read with a symbol or a code before or after it, and its commas', () => {
  expect(parseLiteral('£1,200', 'money')).toBe(1200);
  expect(parseLiteral('1200 GBP', 'money')).toBe(1200);
  expect(parseLiteral('GBP 1,200.50', 'money')).toBe(1200.5);
  expect(parseLiteral('-€3.50', 'money')).toBe(-3.5);
  expect(parseLiteral('€-3.50', 'money')).toBe(-3.5);
  expect(parseLiteral('R$ 40', 'money')).toBe(40);
  expect(parseLiteral('12 €', 'money')).toBe(12);
  expect(parseLiteral('$5', 'money')).toBe(5);
  // Elsewhere a pound sign is words, as before; and a percentage is still one.
  expect(parseLiteral('£1,200', 'number')).toBe('£1,200');
  expect(parseLiteral('5%', 'money')).toBe(0.05);
  expect(parseLiteral('twelve apples', 'money')).toBe('twelve apples');
});

test("the workbook gives each money column its own sign, the document's where it names none", () => {
  const t = tableAt(parse('Job | Price:money(£) | Abroad:money(€) | Here:money\n--- | --- | --- | ---\nA | 85 | 90 | 3\n'), 0)!;
  const files = unzipSync(tableToXlsx(t, evaluateTable(t), null, 'CHF'));
  const styles = strFromU8(files['xl/styles.xml']);
  const sheet = strFromU8(files['xl/worksheets/sheet1.xml']);
  expect(styles).toContain('formatCode="&quot;£&quot;#,##0.00"');
  expect(styles).toContain('formatCode="&quot;€&quot;#,##0.00"');
  expect(styles).toContain('<cellXfs count="6">');
  expect(sheet).toContain('<c r="B2" s="2"><v>85</v></c>');
  expect(sheet).toContain('<c r="C2" s="4"><v>90</v></c>');
  expect(sheet).toContain('<c r="D2" s="5"><v>3</v></c>');
});
