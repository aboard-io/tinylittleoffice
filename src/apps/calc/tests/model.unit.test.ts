// The Calculator as a view of the document: the hand parser, the tape as a little program, the second engine
// (mathjs: units, big numbers, algebra), the loose reading and `tidy`, each command as the ops it produces, the
// pages and the text. Under node, no DOM.
import { readdirSync, readFileSync } from 'node:fs';
import { createRequire } from 'node:module';
import { dirname, join } from 'node:path';
import { afterEach, expect, test } from 'vitest';
import { applyAll, invertAll, parse, write, type Op } from '../../../doc/index.ts';
import def from '../def.ts';
import { engine } from '../math.ts';
import { addLine, clearTape, dropLine, evaluate, isNote, live, moveLines, pastedLines, plot, readCalc, removeLine, replaceLines, result, setEngine, setLine, setMode, shown, tape, tidy, type CalcView } from '../model.ts';
import { calcPage, graphPage, tapePage, tapeText } from '../view.ts';
import { templates } from '../templates.ts';

afterEach(() => setEngine(null));

const run = (text: string, ops: (v: CalcView) => Op[]) => {
  const doc = parse(text);
  const made = ops(readCalc(doc));
  const out = applyAll(doc, made);
  // Every command can be taken back exactly.
  expect(applyAll(out, invertAll(doc, made))).toEqual(doc);
  return { ops: made, text: write(out) };
};

test('the hand parser: precedence, powers to the right, functions, implied products, percent; nothing else is a number', () => {
  expect(evaluate('2+3*4')).toBe(14);
  expect(evaluate('(2+3)*4')).toBe(20);
  expect(evaluate('2^3^2')).toBe(512);
  expect(evaluate('sqrt(16)+5!')).toBe(124);
  expect(evaluate('2x', 3)).toBe(6);
  expect(evaluate('3sin(0)+2(1+1)')).toBe(4);
  expect(evaluate('10%')).toBe(0.1);
  expect(evaluate('8 ÷ 2 × 3 − 1')).toBe(11);
  expect(evaluate('-2^2')).toBe(-4);
  expect(evaluate('2^-1')).toBe(0.5);
  expect(evaluate('(-2)^2')).toBe(4);
  expect(evaluate('total', NaN, { total: 7 })).toBe(7);
  for (const bad of ['2+', 'alert(1)', 'foo', '', '(1', '1)']) expect(evaluate(bad)).toBeNaN();
  expect(shown(1 / 3)).toBe('0.3333333333');
  expect(shown(-2)).toBe('−2');
  expect(shown(1e15)).toBe('1e+15');
  expect(shown(Infinity)).toBe('∞');
  expect(shown(NaN)).toBe('');
  expect(plot('x^2', -1, 1, 2).map((p) => p && p[1])).toEqual([1, 0, 1]);
  expect(plot('1/x', -1, 1, 2)[1]).toBeNull();
});

test('the tape is a little program: a name kept for the lines after it, ans the line before, a bad line nothing', () => {
  expect(tape(['a = 12', 'a * 3', 'ans + 1', 'unit price = 2.5', 'unit_price * a', 'nope']).results).toEqual([12, 36, 37, 2.5, 30, NaN]);
  // A function's or a constant's name is never taken.
  expect(tape(['sin = 2', 'sin(0)']).results[1]).toBe(0);
  expect(tape(['pi = 3', 'pi']).results[1]).toBeCloseTo(Math.PI);
  // What the line being typed comes to, after the tape: "b = …" is worked out as what follows the name.
  expect(live('a * 2', ['a = 21'], 'calc')).toBe('42');
  expect(live('b = a + 1', ['a = 21'], 'calc')).toBe('22');
  expect(live('x^2', [], 'graph')).toBe('1');
  expect(live('  ', [], 'calc')).toBe('');
  // Without the engine, a line only it reads is nothing.
  expect(tape(['3 inch to cm']).texts).toEqual(['']);
});

test('the second engine: units convert, add and divide; big numbers stay numbers; derivative and simplify answer as algebra; nothing runs as code', () => {
  setEngine(engine);
  const texts = (lines: string[]) => tape(lines).texts;
  expect(texts(['3 inch to cm', '60 mph in km/h', '2 cups + 3 tbsp', '100 celsius to fahrenheit', '5 km / 2 h to mph'])).toEqual(['7.62 cm', '96.56064 km / h', '2.190203878 cups', '212 fahrenheit', '1.553427981 mph']);
  expect(texts(['171!', '2^100', '0.1 + 0.2'])).toEqual(['1.24101807e+309', '1.267651e+30', '0.3']);
  expect(texts(['derivative("x^2 + 3x", "x")', 'simplify("2x + 3x")'])).toEqual(['2 * x + 3', '5 * x']);
  // A quantity kept by name is a quantity to the lines after; a plain number is still the hand parser's.
  const t = tape(['a = 12', 'a * 3', 'ans + 1', 'w = 3 inch', 'w to cm', 'w * 2', 'nope']);
  expect(t.results.slice(0, 3)).toEqual([12, 36, 37]);
  expect(t.texts).toEqual(['12', '36', '37', '3 inch', '7.62 cm', '6 inch', '']);
  expect(t.results[3]).toBeNaN();
  expect(t.names.a).toBe(12);
  expect('w' in t.names).toBe(false);
  // ln is natural and log base ten, as the keys say; π works.
  expect(texts(['ln(e) m', 'log(100) m', '2π m'])).toEqual(['1 m', '2 m', '6.283185307 m']);
  expect(result('alert(1) m').text).toBe('');
  expect(result('import("x")').text).toBe('');
});

test('mathjs never makes code out of text: no eval, no Function constructor, in any file of it', () => {
  const root = dirname(createRequire(import.meta.url).resolve('mathjs/package.json'));
  const files = readdirSync(join(root, 'lib/esm'), { recursive: true }).map(String).filter((f) => f.endsWith('.js'));
  expect(files.length).toBeGreaterThan(300);
  for (const f of files) expect(/\bnew\s+Function\s*\(|\beval\s*\(|\bFunction\s*\(\s*['"`]/.test(readFileSync(join(root, 'lib/esm', f), 'utf8')), f).toBe(false);
  // And it is pinned exactly: a new version is a choice, read before it is made.
  expect(JSON.parse(readFileSync(join(import.meta.dirname, '../../../../package.json'), 'utf8')).dependencies.mathjs).toMatch(/^\d+\.\d+\.\d+$/);
});

test('read: the tape is one paragraph, a line each; the mode is the head', () => {
  expect(readCalc(parse(''))).toEqual({ mode: 'calc', lines: [], at: -1, loose: false });
  expect(readCalc(parse('2+2\na = 3\n'))).toEqual({ mode: 'calc', lines: ['2+2', 'a = 3'], at: 0, loose: false });
  expect(readCalc(parse('---\nmode: graph\n---\nsin(x)\n'))).toEqual({ mode: 'graph', lines: ['sin(x)'], at: 0, loose: false });
  // Signs Markdown would read as marks are the signs typed; written back, they are escaped and read the same.
  const typed = readCalc(parse('2*3*4\n'));
  expect(typed.lines).toEqual(['2*3*4']);
  expect(typed.loose).toBe(true);
});

test('tidy: a loosely written calculator becomes a tape, in one edit; a tape is left alone', () => {
  const fix = (text: string) => {
    const doc = parse(text);
    return write(applyAll(doc, tidy(doc)));
  };
  // A list, results written after the sums (a name stays a name), a heading as the title.
  expect(fix('# Sums\n\n- 2+2 = 4\n- a = 12\n- a*2 = 24\n')).toBe('---\ntitle: Sums\n---\n2+2\na = 12\na*2\n');
  // Every line "y = …": a graph.
  expect(fix('- y = sin(x)\n- y = x^2\n')).toBe('---\nmode: graph\n---\nsin(x)\nx^2\n');
  // The old money modes: their inputs are names on the tape, and the mode goes.
  expect(fix('---\nmode: mortgage\n---\n- price = 400000\n- rate = 6.5\n')).toBe('price = 400000\nrate = 6.5\n');
  // Marks are the signs they were, and the canonical text says so.
  expect(fix('2*3*4\n')).toBe('2\\*3\\*4\n');
  expect(readCalc(parse('2\\*3\\*4\n'))).toEqual({ mode: 'calc', lines: ['2*3*4'], at: 0, loose: false });
  // A line Markdown would read as a list or a heading is kept as words.
  const odd = run('', (v) => addLine(v, '- 3'));
  expect(odd.text).toBe('\\- 3\n');
  expect(readCalc(parse(odd.text)).lines).toEqual(['- 3']);
  for (const tpl of ['2+2\n', '---\nmode: graph\n---\nx^2\n', '']) expect(tidy(parse(tpl))).toEqual([]);
});

test('the commands: a line in, changed or out is a text op on the tape; its birth and end a splice; the mode a head op', () => {
  // The first line: the tape's paragraph.
  expect(run('', (v) => addLine(v, ' 2 + 2 '))).toEqual({ ops: [{ op: 'splice', at: 0, n: 0, blocks: [{ k: 'p', runs: [{ t: '2 + 2' }] }] }], text: '2 + 2\n' });
  // The next lines: words at its end.
  expect(run('2+2\n', (v) => addLine(v, 'ans*3'))).toEqual({ ops: [{ op: 'text', at: 0, from: 3, to: 3, runs: [{ t: '\nans*3' }] }], text: '2+2\nans*3\n' });
  expect(run('2+2\n', (v) => addLine(v, '  '))).toEqual({ ops: [], text: '2+2\n' });
  // On a graph, a curve already drawn is not drawn twice.
  expect(run('---\nmode: graph\n---\nsin(x)\n', (v) => addLine(v, 'sin(x)')).ops).toEqual([]);
  // A line changed where it stands.
  expect(run('a = 1\na + 1\na * 10\n', (v) => setLine(v, 1, 'a + 2'))).toEqual({ ops: [{ op: 'text', at: 0, from: 6, to: 11, runs: [{ t: 'a + 2' }] }], text: 'a = 1\na + 2\na * 10\n' });
  expect(run('a = 1\n', (v) => setLine(v, 0, 'a = 1')).ops).toEqual([]);
  // Taken away: with the break after it, or (the last) the break before; emptied is taken away.
  expect(run('one\ntwo\nthree\n', (v) => removeLine(v, 0)).text).toBe('two\nthree\n');
  expect(run('one\ntwo\nthree\n', (v) => removeLine(v, 1)).text).toBe('one\nthree\n');
  expect(run('one\ntwo\nthree\n', (v) => removeLine(v, 2))).toEqual({ ops: [{ op: 'text', at: 0, from: 7, to: 13, runs: [] }], text: 'one\ntwo\n' });
  expect(run('one\ntwo\n', (v) => setLine(v, 1, ' ')).text).toBe('one\n');
  // The last line out, or the tape cleared: the paragraph goes. The title stays.
  expect(run('---\ntitle: Sums\n---\nonly\n', (v) => removeLine(v, 0))).toEqual({ ops: [{ op: 'splice', at: 0, n: 1, blocks: [] }], text: '---\ntitle: Sums\n---\n' });
  expect(run('a\nb\n', clearTape).text).toBe('');
  expect(run('', clearTape).ops).toEqual([]);
  // The mode: the head, and the tape starts again (its lines mean something else there).
  expect(run('2+2\n', (v) => setMode(v, 'graph'))).toEqual({ ops: [{ op: 'head', key: 'mode', value: 'graph' }, { op: 'splice', at: 0, n: 1, blocks: [] }], text: '---\nmode: graph\n---\n' });
  expect(run('---\nmode: graph\n---\n', (v) => setMode(v, 'calc')).text).toBe('');
  expect(run('2+2\n', (v) => setMode(v, 'calc')).ops).toEqual([]);
});

test('lines as rows: a run of lines replaced, moved past a neighbour, carried by a drag or copied under itself is one text op', () => {
  // Replaced: only the lines given way to are written.
  expect(run('a\nb\nc\n', (v) => replaceLines(v, 1, 2, ['x', ' y ']))).toEqual({ ops: [{ op: 'text', at: 0, from: 2, to: 3, runs: [{ t: 'x\ny' }] }], text: 'a\nx\ny\nc\n' });
  // Put in between (a duplicate, a paste with nothing chosen), at the start, at the end; empty lines dropped.
  expect(run('a\nb\n', (v) => replaceLines(v, 1, 1, ['a', ''])).text).toBe('a\na\nb\n');
  expect(run('a\nb\n', (v) => replaceLines(v, 0, 0, ['z'])).text).toBe('z\na\nb\n');
  expect(run('a\nb\n', (v) => replaceLines(v, 2, 2, ['c', 'd'])).text).toBe('a\nb\nc\nd\n');
  expect(run('', (v) => replaceLines(v, 0, 0, ['1+1', '2+2'])).text).toBe('1+1\n2+2\n');
  // Taken away: a run in the middle, at the end, or all of it.
  expect(run('a\nb\nc\nd\n', (v) => replaceLines(v, 1, 3, [])).text).toBe('a\nd\n');
  expect(run('a\nb\nc\n', (v) => replaceLines(v, 1, 3, [])).text).toBe('a\n');
  expect(run('---\ntitle: T\n---\na\nb\n', (v) => replaceLines(v, 0, 2, [])).text).toBe('---\ntitle: T\n---\n');
  // Moved: up and down past one neighbour; nothing past the ends.
  expect(run('a = 1\na + 1\nb\n', (v) => moveLines(v, 1, 2, -1))).toEqual({ ops: [{ op: 'text', at: 0, from: 0, to: 11, runs: [{ t: 'a + 1\na = 1' }] }], text: 'a + 1\na = 1\nb\n' });
  expect(run('a\nb\nc\nd\n', (v) => moveLines(v, 0, 2, 1)).text).toBe('c\na\nb\nd\n');
  expect(run('a\nb\n', (v) => moveLines(v, 0, 1, -1)).ops).toEqual([]);
  expect(run('a\nb\n', (v) => moveLines(v, 1, 2, 1)).ops).toEqual([]);
  // Carried by the grip to just after another line, either way.
  expect(run('a\nb\nc\nd\n', (v) => dropLine(v, 0, 2)).text).toBe('b\nc\na\nd\n');
  expect(run('a\nb\nc\nd\n', (v) => dropLine(v, 3, 0)).text).toBe('a\nd\nb\nc\n');
  expect(run('a\nb\n', (v) => dropLine(v, 1, 0)).ops).toEqual([]);
  // A paste read as tape lines: results after sums go; on a graph "y =" goes.
  expect(pastedLines(parse('2+2 = 4\n\n- a = 12\n').blocks, 'calc')).toEqual(['2+2', 'a = 12']);
  expect(pastedLines(parse('y = x^2\nsin(x)\n').blocks, 'graph')).toEqual(['x^2', 'sin(x)']);
});

test('the pages: the tape with its answers, the graph with its curves; the text; the definition', () => {
  const page = tapePage(['a = 6', 'a * 7', 'nope'], 'Sums');
  expect(page.svg).toContain('>Sums<');
  expect(page.svg).toContain('>= 42<');
  expect(page.alt).toBe('a = 6 = 6; a * 7 = 42; nope');
  expect(tapePage(Array.from({ length: 20 }, (_, i) => String(i)), '', 8).alt!.split('; ')).toHaveLength(8);
  const g = graphPage(['x from 0 to 4', 'x^2', 'sqrt(x)']);
  expect(g.svg).toContain('y = x^2');
  expect(g.svg).toContain('y = sqrt(x)');
  expect((g.svg.match(/<path /g) ?? []).length).toBe(2);
  expect(g.alt).toBe('y = x^2; y = sqrt(x), x from 0 to 4');
  expect(graphPage([]).svg).toContain('y = …');
  expect(calcPage(parse('---\nmode: graph\n---\nsin(x)\n')).svg).toContain('y = sin(x)');
  expect(tapeText(parse('---\ntitle: Sums\n---\na = 6\na * 7\nnope\n'))).toBe('Sums\n\na = 6 = 6\na * 7 = 42\nnope\n');
  expect(tapeText(parse('---\nmode: graph\n---\nx from 0 to 1\nx^2\n'))).toBe('x from 0 to 1\ny = x^2\n');
  expect(def.id).toBe('calc');
  expect(def.blank()).toBe('');
  expect(def.view(def.blank())).toHaveLength(1);
  expect(def.title(def.retitle('2+2\n', 'Sums'))).toBe('Sums');
  expect(def.retitle('2+2\n', 'Sums')).toBe('---\ntitle: Sums\n---\n2+2\n');
  expect(def.exports!.map((e) => e.ext)).toEqual(['txt']);
});

test('a note: a sentence with no answer, ending in a full stop, a colon or an exclamation mark; a word or a typo is not one', () => {
  setEngine(engine);
  expect(isNote('Check every dose with a pharmacist.', '')).toBe(true);
  expect(isNote('Hours on a 24-hour clock:', '')).toBe(true);
  expect(isNote('nope', '')).toBe(false);
  expect(isNote('nope.', '')).toBe(false);
  expect(isNote('3 inch to cmm', '')).toBe(false);
  expect(isNote('Two words.', '2')).toBe(false);
  const lines = ['Arithmetic only: check the label.', 'a = 6', 'a * 7'];
  expect(tape(lines).texts).toEqual(['', '6', '42']);
  const page = tapePage(lines);
  expect(page.svg).toContain('Arithmetic only: check the label.');
  expect(page.svg.match(/>= /g)).toHaveLength(2);
});

test('the templates: real working, canonical, a tape already, every line an answer or a note', () => {
  setEngine(engine);
  const all = templates();
  expect(all.map((x) => x.id)).toEqual([
    'bill', 'shopping', 'tax', 'percent', 'kitchen', 'recipe', 'units', 'currency', 'fuel', 'paint',
    'zones', 'pace', 'bmi', 'dose', 'power', 'loan', 'savings', 'break-even', 'slope', 'waves',
  ]);
  expect(new Set(all.map((x) => x.name)).size).toBe(all.length);
  // The dose says plainly that it is arithmetic, not advice.
  expect(all.find((x) => x.id === 'dose')!.doc).toMatch(/Arithmetic only: check every dose with a doctor, a pharmacist or the label\./);
  for (const tpl of all) {
    const doc = parse(tpl.doc);
    expect(write(doc)).toBe(tpl.doc);
    expect(tidy(doc)).toEqual([]);
    const v = readCalc(doc);
    expect(doc.head.title).toBeTruthy();
    expect(tpl.blurb, tpl.id).toBeTruthy();
    expect(tpl.doc, tpl.id).not.toMatch(/lorem|TODO/i);
    if (v.mode === 'calc') {
      const { texts } = tape(v.lines);
      v.lines.forEach((l, i) => expect(texts[i] !== '' || isNote(l, texts[i]), `${tpl.id}: ${l}`).toBe(true));
      // A tape is drawn small in the home page's list: the last eight lines, the title above them.
      expect(calcPage(doc, true).svg, tpl.id).toContain(tpl.doc.match(/title: (.*)/)![1].slice(0, 6));
    } else expect((graphPage(v.lines).svg.match(/<path /g) ?? []).length, tpl.id).toBe(v.lines.length - 1);
  }
  expect(tape(readCalc(parse(all[0].doc)).lines).texts.at(-1)).toBe('43.75833333');
  const answer = (id: string) => tape(readCalc(parse(all.find((x) => x.id === id)!.doc)).lines).texts;
  expect(answer('loan')[3]).toBe('474.0972569');
  expect(answer('recipe')[5]).toBe('1 cup');
  expect(answer('dose')[4]).toBe('8.4375 mL');
  expect(answer('zones')[5]).toBe('1');
  expect(answer('power')[4]).toBe('75.6');
});
