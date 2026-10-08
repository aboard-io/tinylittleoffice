import { test } from 'node:test';
import assert from 'node:assert/strict';
import { evaluateGrid, parseGrid, pasteCells, serializeGrid, refToRC, rcToRef, parseLiteral, formatValue } from '../src/lib/formula.ts';
import { parseDoc, serializeDoc, docText, type Block } from '../src/lib/richtext.ts';
import { encodeDoc, decodeDoc } from '../src/lib/codec.ts';
import { partsToUtc, utcToParts, offsetMinutes, allZones, localZone } from '../src/lib/tz.ts';
import { parseDeck, serializeDeck, MAX_SLIDES } from '../src/lib/deckmodel.ts';
import { parseDrawing, serializeDrawing } from '../src/lib/drawmodel.ts';
import { parseCalendar, serializeCalendar, spanEndMs } from '../src/lib/calmodel.ts';

const grid = (rows: string[][]) => pasteCells(parseGrid(''), 0, 0, rows.map((r) => r.join('\t')).join('\n')).grid;

test('formula: whitespace, nesting, reversed ranges, percent of refs', () => {
  const v = evaluateGrid(grid([['4', '=  A1  +  ( 2 * 3 ) ', '=SUM(A3:A1)'], ['2', '=ROUND(SQRT(ABS(-A1)) * 10, 0)', '=A1%'], ['1', '=MAX(A1:A3, 10, B1)', '=MIN()']]));
  assert.equal(v[0][1], 10);
  assert.equal(v[0][2], 7);
  assert.equal(v[1][1], 20);
  assert.equal(v[1][2], 0.04);
  assert.equal(v[2][1], 10);
  assert.equal(v[2][2], 0);
});

test('formula: text in arithmetic is #VALUE but is skipped inside ranges', () => {
  const v = evaluateGrid(grid([['x', '=A1+1', '=SUM(A1:A2)'], ['5', '=COUNT(A1:A2)', '=AVG(A1:A1)']]));
  assert.equal(v[0][1], '#VALUE');
  assert.equal(v[0][2], 5);
  assert.equal(v[1][1], 1);
  assert.equal(v[1][2], '#DIV/0');
});

test('formula: errors propagate and lowercase refs work', () => {
  const v = evaluateGrid(grid([['=1/0', '=a1*2', '=sum(b1:b1)'], ['=c1+c1', '=nope(1)', '=ROUND(2.345,2)']]));
  assert.equal(v[0][1], '#DIV/0');
  assert.equal(v[0][2], '#DIV/0');
  assert.equal(v[1][0], '#DIV/0');
  assert.equal(v[1][1], '#NAME');
  assert.equal(v[1][2], 2.35);
});

test('formula: deep chains and a 20-row sum', () => {
  const rows: string[][] = [];
  for (let r = 0; r < 20; r++) rows.push([String(r + 1), r === 0 ? '=A1' : `=B${r}+A${r + 1}`, '']);
  rows[0][2] = '=SUM(A1:A20)';
  const v = evaluateGrid(grid(rows));
  assert.equal(v[19][1], 210);
  assert.equal(v[0][2], 210);
});

test('formula: refs and literals', () => {
  assert.deepEqual(refToRC('C20'), [19, 2]);
  assert.deepEqual(refToRC('F1000'), [999, 5]);
  assert.equal(refToRC('C1001'), null);
  assert.equal(refToRC('G1'), null);
  assert.equal(rcToRef(0, 0), 'A1');
  assert.equal(parseLiteral(' 12.5 '), 12.5);
  assert.equal(parseLiteral('1e3'), 1000);
  assert.equal(parseLiteral('12 apples'), '12 apples');
  assert.equal(parseLiteral('   '), null);
  assert.equal(formatValue(1 / 3), '0.33333333');
  assert.equal(formatValue(-0.0000001), '-1.0000e-7');
  assert.equal(formatValue(Infinity), '#NUM');
});

test('formula: serialize is stable under re-parse and keeps inner blanks', () => {
  const text = 'ColA | ColB | ColC\n--- | --- | ---\na |  | c\n| |  |\n| |  | z';
  assert.equal(serializeGrid(parseGrid(text)), text);
  const full = parseGrid('');
  full[19][2] = 'end';
  // The names, the line under them, and twenty rows.
  assert.equal(serializeGrid(full).split('\n').length, 22);
});

test('richtext: nested and interleaved formatting', () => {
  const doc: Block[] = [
    { k: 'p', runs: [{ t: 'a', b: true }, { t: 'b', b: true, i: true }, { t: 'c', i: true }, { t: 'd', i: true, u: true, s: true }, { t: 'e' }] },
  ];
  const s = serializeDoc(doc);
  assert.equal(s, '**a*b**c~~++d++~~*e');
  assert.deepEqual(parseDoc(s), doc);
});

test('richtext: escapes survive at the edges', () => {
  const doc: Block[] = [{ k: 'p', runs: [{ t: '\\' }] }, { k: 'p', runs: [{ t: '*' }] }, { k: 'h1', runs: [{ t: '## not h2' }] }, { k: 'ul', runs: [{ t: '- dash' }] }];
  assert.deepEqual(parseDoc(serializeDoc(doc)), doc);
  // A dangling backslash at the end of a line is kept literally.
  assert.deepEqual(parseDoc('abc\\'), [{ k: 'p', runs: [{ t: 'abc\\' }] }]);
});

test('richtext: empty runs are dropped, text and counts', () => {
  const doc: Block[] = [{ k: 'p', runs: [{ t: '' }, { t: 'x', b: true }, { t: '' }] }, { k: 'p', runs: [] }, { k: 'ol', runs: [{ t: 'y' }] }];
  assert.equal(serializeDoc(doc), '**x**\n\n<br>\n\n1. y');
  assert.equal(docText(parseDoc(serializeDoc(doc))), 'x\n\ny');
});

test('codec: unicode and long repetitive text', () => {
  for (const d of ['日本語のテキスト', '🚀 emoji 🚀', 'Ünïcödé', '\u0000\u0001 control']) assert.equal(decodeDoc(encodeDoc(d)), d);
  const big = 'row\tvalue\n'.repeat(400);
  const e = encodeDoc(big);
  assert.ok(e.length < 100, `compressed to ${e.length}`);
  assert.equal(decodeDoc(e), big);
});

test('tz: fall-back overlap picks a real instant and zone list is sane', () => {
  // 2026-11-01 01:30 happens twice in New York; either answer must map back to 01:30.
  const ms = partsToUtc(2026, 11, 1, 1, 30, 'America/New_York');
  const p = utcToParts(ms, 'America/New_York');
  assert.equal(`${p.h}:${p.min}`, '1:30');
  assert.equal(offsetMinutes(Date.UTC(2026, 6, 1), 'Australia/Adelaide'), 570);
  assert.equal(offsetMinutes(Date.UTC(2026, 0, 1), 'Pacific/Chatham'), 825);
  const zones = allZones();
  assert.ok(zones.includes('UTC'));
  assert.ok(zones.includes(localZone()));
  assert.ok(zones.length > 100);
  assert.deepEqual(zones, [...zones].sort());
});

test('deck: icon-only and title-only slides, max slides constant', () => {
  const s = serializeDeck([{ icon: 'star', title: '', bullets: [] }, { icon: '', title: 'T', bullets: ['', 'b'] }]);
  assert.equal(s, '## :star:\n\n---\n\n## T\n\n- b\n');
  const back = parseDeck(s);
  assert.equal(back.length, 2);
  assert.equal(back[0].icon, 'star');
  assert.equal(back[1].title, 'T');
  assert.deepEqual(back[1].bullets, ['b']);
  assert.equal(MAX_SLIDES, Infinity);
});

test('draw: labels with newlines, commas and bars, fill clamping, a table written loosely', () => {
  const head = 'Kind | X | Y | W | H | Style | Label\n--- | --- | --- | --- | --- | --- | ---\n';
  const s = serializeDrawing([{ k: 'r', x: 0, y: 0, w: 8, h: 8, f: 0, text: 'two\nlines, one | two' }]);
  assert.equal(s, head + 'r | 0 | 0 | 1 | 1 | 0 | two lines, one \\| two');
  assert.equal(parseDrawing(s)[0].text, 'two lines, one | two');
  assert.equal(parseDrawing(head + 'r | 0 | 0 | 1 | 1 | 9 | x')[0].f, 2);
  assert.equal(parseDrawing(head + 'r | 0 | 0 | 1 | 1 | -3 | x')[0].f, 0);
  assert.equal(parseDrawing(head + 'r | a | b | c | d | e | x')[0].x, 0);
  // Columns in another order, kinds in words, rows that are not shapes left out.
  assert.deepEqual(parseDrawing('| Label | Kind | X | Y | W | H |\n|-|-|-|-|-|-|\n| Hi | ellipse | 1 | 2 | 3 | 4 |\n| No | blob | 0 | 0 | 1 | 1 |'), [{ k: 'e', x: 8, y: 16, w: 24, h: 32, f: 0, text: 'Hi' }]);
});

test('calendar: labels are capped and zone header only with spans', () => {
  const long = 'x'.repeat(200);
  const s = serializeCalendar({ zone: 'UTC', spans: [{ kind: 'd', start: 1, dur: 1, label: long }] });
  assert.equal(parseCalendar(s).spans[0].label.length, 60);
  assert.equal(serializeCalendar({ zone: 'Europe/Paris', spans: [] }), '');
  const e = parseCalendar('- 2020-01-01 00:00-01:00: x').spans[0];
  assert.equal(spanEndMs(e), Date.UTC(2020, 0, 1, 1, 0));
});

test('deck: no slide ever runs into the next, or into the header', () => {
  const cases = [
    [{ icon: 'star', title: '', bullets: [] }, { icon: '', title: 'T', bullets: [] }],
    [{ icon: 'star', title: '', bullets: ['b'] }, { icon: '', title: '', bullets: ['c'] }],
    [{ icon: '', title: '', bullets: [] }, { icon: '', title: '', bullets: ['x'] }, { icon: 'sun', title: '', bullets: [] }],
    [{ icon: '', title: '', bullets: ['transition: cut'] }, { icon: '', title: '---', bullets: ['---', '## not a slide'] }],
  ];
  for (const slides of cases) {
    const s = serializeDeck(slides);
    assert.ok(!/\n\n\n/.test(s), JSON.stringify(s));
    assert.deepEqual(parseDeck(s), slides);
    assert.equal(serializeDeck(parseDeck(s), 'cut').replace(/^---\ntransition: cut\n---\n/, ''), s);
  }
});
