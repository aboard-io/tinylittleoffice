// The calculator's second engine: units and conversions, big numbers, a little algebra, beside the hand parser's plain tape.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readdirSync, readFileSync } from 'node:fs';
import { createRequire } from 'node:module';
import { dirname, join } from 'node:path';
import { engine } from '../src/lib/calc-math.ts';
import { result, setEngine, tape } from '../src/lib/calc.ts';

test('units convert, add and divide; big numbers stay numbers; derivative and simplify answer as algebra', () => {
  setEngine(engine);
  try {
    const texts = (lines: string[]) => tape(lines).texts;
    assert.deepEqual(texts(['3 inch to cm', '60 mph in km/h', '2 cups + 3 tbsp', '100 celsius to fahrenheit', '5 km / 2 h to mph']), ['7.62 cm', '96.56064 km / h', '2.190203878 cups', '212 fahrenheit', '1.553427981 mph']);
    assert.deepEqual(texts(['171!', '2^100', '0.1 + 0.2']), ['1.24101807e+309', '1.267651e+30', '0.3']);
    assert.deepEqual(texts(['derivative("x^2 + 3x", "x")', 'simplify("2x + 3x")']), ['2 * x + 3', '5 * x']);
    // A quantity kept by name is a quantity to the lines after; the plain tape is the hand parser's, as before.
    const t = tape(['a = 12', 'a * 3', 'ans + 1', 'w = 3 inch', 'w to cm', 'w * 2', 'nope']);
    assert.deepEqual(t.results.slice(0, 3), [12, 36, 37]);
    assert.deepEqual(t.texts, ['12', '36', '37', '3 inch', '7.62 cm', '6 inch', '']);
    assert.ok(isNaN(t.results[3]) && t.names.a === 12 && !('w' in t.names));
    // ln is natural, log is base ten, as the keys say; π works; nothing runs as code.
    assert.deepEqual(texts(['ln(e) m', 'log(100) m', '2π m']), ['1 m', '2 m', '6.283185307 m']);
    assert.equal(result('alert(1) m').text, '');
    assert.equal(result('import("x")').text, '');
  } finally {
    setEngine(null);
  }
  // Without the engine, a line it would have read is nothing, as before.
  assert.deepEqual(tape(['3 inch to cm']).texts, ['']);
});

test('mathjs never makes code out of text: no eval, no Function constructor, in any file of it', () => {
  const root = dirname(createRequire(import.meta.url).resolve('mathjs/package.json'));
  const files = readdirSync(join(root, 'lib/esm'), { recursive: true }).map(String).filter((f) => f.endsWith('.js'));
  assert.ok(files.length > 300);
  for (const f of files) {
    const src = readFileSync(join(root, 'lib/esm', f), 'utf8');
    assert.ok(!/\bnew\s+Function\s*\(|\beval\s*\(|\bFunction\s*\(\s*['"`]/.test(src), f);
  }
});
