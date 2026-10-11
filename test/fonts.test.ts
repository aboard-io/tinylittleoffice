// The type is IBM Plex, served by the site itself (directive r17-plex; Paul, 2026-10-11: "We use Plex everywhere"): every
// file src/styles/fonts.css names is in public/fonts/ with IBM's licence beside it, every file there is one the CSS names
// and docs/dependencies.md lists (scripts/dependencies.ts FONTS), each face waits behind its unicode-range, and the
// stacks put Plex first: the interface, the pages' SVG, the Serif look and code.
import { test, expect } from 'vitest';
import { existsSync, readFileSync, readdirSync } from 'node:fs';
import { FONTS } from '../scripts/dependencies.ts';
import { fontBytes, readBudgets } from '../scripts/budgets.ts';
import { FONT, text } from '../src/kit/draw.ts';
import { STACKS } from '../src/apps/write/look.ts';

const root = new URL('../', import.meta.url);
const read = (p: string) => readFileSync(new URL(p, root), 'utf8');
const css = read('src/styles/fonts.css').replace(/\/\*[\s\S]*?\*\//g, '');
const faces = [...css.matchAll(/@font-face\s*\{([^}]*)\}/g)].map((m) => {
  const prop = (name: string) => new RegExp(`${name}:\\s*([^;]+);`).exec(m[1])?.[1].trim() ?? '';
  return { family: prop('font-family').replace(/['"]/g, ''), weight: prop('font-weight'), style: prop('font-style'), src: prop('src'), range: prop('unicode-range'), display: prop('font-display') };
});
const fileOf = (src: string) => /url\(['"]?\/fonts\/([^'")]+)['"]?\)/.exec(src)?.[1];

test('the faces: Plex Sans and Serif in four, Mono in two, Arabic and Devanagari in two; 400 and 600 only', () => {
  const by = (family: string) => faces.filter((f) => f.family === family).map((f) => `${f.weight} ${f.style}`);
  const four = ['400 normal', '400 italic', '600 normal', '600 italic'];
  expect(by('IBM Plex Sans')).toEqual(four);
  expect(by('IBM Plex Serif')).toEqual(four);
  expect(by('IBM Plex Mono')).toEqual(['400 normal', '600 normal']);
  expect(by('IBM Plex Sans Arabic')).toEqual(['400 normal', '600 normal']);
  expect(by('IBM Plex Sans Devanagari')).toEqual(['400 normal', '600 normal']);
  expect(faces).toHaveLength(14);
  for (const f of faces) {
    expect(f.display, f.family).toBe('swap');
    // A page in a script Plex does not draw downloads nothing: every face waits behind the characters it has.
    expect(f.range, f.family).toMatch(/^U\+/);
    expect(f.src, f.family).toMatch(/format\(['"]woff2['"]\)$/);
  }
  const range = (family: string) => faces.find((f) => f.family === family)!.range;
  expect(range('IBM Plex Sans Arabic')).toContain('U+0600-06FF');
  expect(range('IBM Plex Sans Devanagari')).toContain('U+0900-097F');
  // Latin, Greek and Cyrillic are the main faces'; no Arabic or Devanagari there, no CJK anywhere.
  for (const family of ['IBM Plex Sans', 'IBM Plex Serif', 'IBM Plex Mono']) expect(range(family)).not.toMatch(/U\+0[69]|U\+[34]E00/);
});

test('every file the CSS names is in public/fonts/, every file there is named, and IBM’s licence is beside them', () => {
  const named = faces.map((f) => fileOf(f.src));
  expect(named.every(Boolean)).toBe(true);
  const shipped = readdirSync(new URL('public/fonts/', root)).filter((f) => f.endsWith('.woff2'));
  expect([...named].sort()).toEqual(shipped.sort());
  for (const f of named) expect(existsSync(new URL(`public/fonts/${f}`, root)), f).toBe(true);
  expect(read('public/fonts/LICENSE.txt')).toMatch(/SIL Open Font License, Version 1\.1/);
  expect(read('public/fonts/LICENSE.txt')).toMatch(/IBM Corp\./);
  // The list docs/dependencies.md is written from names the same files, each from IBM's own release.
  expect(FONTS.flatMap((f) => f.files).sort()).toEqual(shipped.sort());
  for (const f of FONTS) expect(f.from).toMatch(/^@ibm\/plex-/);
});

test('the stacks put Plex first, the old stack behind it: the interface, the serif, the mono, the pages', () => {
  const tokens = read('src/styles/tokens.css');
  const token = (name: string) => new RegExp(`${name}:\\s*([^;]+);`).exec(tokens)![1];
  expect(token('--to-font')).toMatch(/^'IBM Plex Sans', 'IBM Plex Sans Arabic', 'IBM Plex Sans Devanagari', system-ui, /);
  expect(token('--to-font-serif')).toMatch(/^'IBM Plex Serif', /);
  expect(token('--to-font-mono')).toMatch(/^'IBM Plex Mono', ui-monospace, /);
  // The pages (kit/draw.ts) and the Write looks (look.ts) name the same stacks the stylesheet does.
  expect(token('--to-font')).toBe(FONT);
  expect(STACKS.sans).toBe(FONT);
  expect(token('--to-font-serif')).toBe(STACKS.serif);
  expect(token('--to-font-mono')).toBe(STACKS.mono);
  // A bold word on a page is the 600 the site ships.
  expect(text(0, 0, 'x', { bold: true })).toContain('font-weight="600"');
  // The fonts load with the site's stylesheet, and only Plex Sans Regular is preloaded (the one every page draws).
  expect(read('src/styles.css')).toMatch(/@import '\.\/styles\/fonts\.css';/);
  const preloads = [...read('index.html').matchAll(/<link rel="preload"[^>]*>/g)].map((m) => m[0]);
  expect(preloads).toEqual(['<link rel="preload" href="./fonts/IBMPlexSans-Regular.woff2" as="font" type="font/woff2" crossorigin />']);
});

test('the stylesheets ask for no weight Plex is not shipped in: 400 and 600', () => {
  const sheets = [...readdirSync(new URL('src/styles/', root)).map((f) => `src/styles/${f}`), ...readdirSync(new URL('src/apps/', root)).map((a) => `src/apps/${a}/style.css`)].filter(
    (f) => f.endsWith('.css') && existsSync(new URL(f, root)),
  );
  const odd: string[] = [];
  for (const f of sheets) {
    const text = read(f).replace(/\/\*[\s\S]*?\*\//g, '');
    for (const m of text.matchAll(/font-weight:\s*([^;}]+)/g)) if (!['400', '600', 'normal', 'inherit'].includes(m[1].trim())) odd.push(`${f}: font-weight ${m[1].trim()}`);
    for (const m of text.matchAll(/\bfont:\s*(\d{3})\s/g)) if (!['400', '600'].includes(m[1])) odd.push(`${f}: font ${m[1]}`);
  }
  expect(odd).toEqual([]);
});

test('the type’s bytes are within budgets.json’s fonts line, the tripwire the build holds dist/fonts/ to', () => {
  const bytes = fontBytes(new URL('public/fonts/', root).pathname);
  expect(bytes).toBeGreaterThan(500_000);
  expect(bytes).toBeLessThanOrEqual(readBudgets().fonts!);
});
