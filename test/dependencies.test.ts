// docs/dependencies.md is what package.json, the lockfile and scripts/dependencies.json say (scripts/dependencies.ts writes it;
// test/lints.test.ts holds it current).
import { test, expect } from 'vitest';
import { readFileSync } from 'node:fs';
import { measure, packageOf, sizesIn } from '../scripts/dependencies.ts';

const doc = () => readFileSync(new URL('../docs/dependencies.md', import.meta.url), 'utf8');

test('every dependency names the native API it beat', () => {
  const pkg = JSON.parse(readFileSync(new URL('../package.json', import.meta.url), 'utf8')) as Record<string, Record<string, string>>;
  const why = JSON.parse(readFileSync(new URL('../scripts/dependencies.json', import.meta.url), 'utf8')) as Record<string, string>;
  expect(Object.keys(why).sort()).toEqual([...Object.keys(pkg.dependencies!), ...Object.keys(pkg.devDependencies!)].sort());
  for (const line of Object.values(why)) expect(line.length).toBeGreaterThan(40);
});

test('a module is counted to the package it came from, scoped or not, the innermost when nested', () => {
  expect(packageOf('/w/node_modules/lit-html/lit-html.js')).toBe('lit-html');
  expect(packageOf('/w/node_modules/@lit/reactive-element/css-tag.js')).toBe('@lit/reactive-element');
  expect(packageOf('/w/node_modules/d3-sankey/node_modules/d3-array/src/max.js')).toBe('d3-array');
  expect(packageOf('/w/src/kit/chart.ts')).toBeNull();
});

test("a chunk's bytes are shared among its modules by what each rendered", () => {
  const sizes = measure([
    { code: 'x'.repeat(100), modules: { '/n/node_modules/a/i.js': { renderedLength: 30 }, '/n/node_modules/b/i.js': { renderedLength: 10 }, '/n/src/main.ts': { renderedLength: 60 } } },
  ]);
  expect(sizes).toEqual({ a: 30, b: 10 });
});

test('the sizes the page holds are read back as their own share', () => {
  const sizes = sizesIn(doc());
  expect(sizes['lit']).toBe('none');
  expect(sizes['vite']).toBe('not shipped');
  expect(sizes['lit-html']).toMatch(/KB$/);
});
