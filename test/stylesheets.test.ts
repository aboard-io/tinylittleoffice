// The stylesheets' one rule of length (kit.css's header): rem for the document, em inside a nav element, px only for
// hairlines and media queries. The size of everything is the root's font size (--to-doc) and the nav's own on each nav
// element (--to-nav), so a length in px would hold still while everything round it grows; and nothing is zoomed.
import { test, expect } from 'vitest';
import { readFileSync, readdirSync } from 'node:fs';

const root = new URL('../', import.meta.url);
const sheets = [
  ...readdirSync(new URL('src/styles/', root)).map((f) => `src/styles/${f}`),
  ...readdirSync(new URL('src/apps/', root)).map((a) => `src/apps/${a}/style.css`),
].filter((f) => f.endsWith('.css') && (() => { try { return !!readFileSync(new URL(f, root)); } catch { return false; } })());

/**
 * A sheet's declarations, each with the line it starts on: the text between one `;`, `{` or `}` and the next `;` or
 * `}`, comments out. What ends in `{` instead is a selector or the prelude of @media or @container, not a declaration.
 */
function declarations(f: string): { line: number; text: string }[] {
  const src = readFileSync(new URL(f, root), 'utf8').replace(/\/\*[\s\S]*?\*\//g, (c) => c.replace(/[^\n]/g, ' '));
  const out: { line: number; text: string }[] = [];
  let from = 0;
  for (let i = 0; i < src.length; i++) {
    const ch = src[i];
    if (ch !== ';' && ch !== '{' && ch !== '}') continue;
    const text = src.slice(from, i).trim();
    if (ch !== '{' && text.includes(':')) out.push({ line: src.slice(0, from + src.slice(from).search(/\S/)).split('\n').length, text: text.replace(/\s+/g, ' ') });
    from = i + 1;
  }
  return out;
}

/** Where a px is allowed: a hairline (a pixel or half of one), and the two scales' own font sizes. */
const allowed = (text: string) => text.replace(/calc\(16px \* var\(--to-(doc|nav)(, ?1)?\)\)/g, '').replace(/(^|[^\d.])(0\.5|1)px\b/g, '$1');

test('the stylesheets are found', () => {
  expect(sheets).toContain('src/styles/kit.css');
  expect(sheets).toContain('src/apps/write/style.css');
  expect(sheets.length).toBeGreaterThan(10);
});

test('no length in px but a hairline, the two scales and a media query', () => {
  const wrong = sheets.flatMap((f) => declarations(f).filter((d) => /\d(\.\d+)?px\b/.test(allowed(d.text))).map((d) => `${f}:${d.line}: ${d.text}`));
  expect(wrong).toEqual([]);
});

test('nothing is zoomed: no zoom property, and no length divided by a size', () => {
  const wrong = sheets.flatMap((f) => declarations(f).filter((d) => /^zoom:|--to-(size|nav-size|nav-zoom|vw|vh)\b/.test(d.text)).map((d) => `${f}:${d.line}: ${d.text}`));
  expect(wrong).toEqual([]);
});
