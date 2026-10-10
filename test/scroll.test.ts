// The page never scrolls (round eight, kit/scroll.ts): the document is in a column that scrolls by itself, and every
// scroll-to goes through kit/scroll.ts. A module that reads the window's scroll or scrolls the window (or reveals an
// element with the browser's scrollIntoView, which scrolls every box round it, the window too) brings back the page
// that slid under a phone's keyboard; this fails on one. The Website Builder's frame script and a site's own page
// script run in windows of their own (a sandboxed frame, a visitor's tab) and scroll those.
import { test, expect } from 'vitest';
import { readFileSync, readdirSync, statSync } from 'node:fs';

const root = new URL('../', import.meta.url);
/** Windows of their own: the frame's script, and the script of a site as published. */
const OWN_WINDOW = ['src/apps/site/frame.ts', 'src/apps/site/view.ts'];

function sources(dir: string): string[] {
  return readdirSync(new URL(dir, root)).flatMap((f) => {
    const path = `${dir}${f}`;
    if (statSync(new URL(path, root)).isDirectory()) return f === 'tests' ? [] : sources(`${path}/`);
    return /\.ts$/.test(f) ? [path] : [];
  });
}

/** The code, comments out. */
const code = (path: string) =>
  readFileSync(new URL(path, root), 'utf8')
    .replace(/\/\*[\s\S]*?\*\//g, '')
    .replace(/(^|[^:'"`])\/\/.*$/gm, '$1');

const WINDOW_SCROLL = /\b(?:window\.)?(?:scrollY|scrollX|pageYOffset|pageXOffset)\b|\bwindow\.scroll(?:To|By)?\s*\(|\.scrollIntoView\s*\(|document\.scrollingElement!?\.scroll(?:Top|To|By)\s*[=(+-]/;

test('the kit and the apps are found', () => {
  const all = sources('src/');
  expect(all).toContain('src/kit/scroll.ts');
  expect(all).toContain('src/kit/text.ts');
  expect(all.length).toBeGreaterThan(50);
});

test('no module but kit/scroll.ts reads the window’s scroll or scrolls the window', () => {
  const found = sources('src/')
    .filter((p) => p !== 'src/kit/scroll.ts' && !OWN_WINDOW.includes(p))
    .flatMap((p) =>
      code(p)
        .split('\n')
        .map((line, i) => ({ at: `${p}:${i + 1}`, line: line.trim() }))
        .filter(({ line }) => WINDOW_SCROLL.test(line)),
    );
  expect(found).toEqual([]);
});

test('kit/scroll.ts scrolls the window only to put it back at its top', () => {
  const lines = code('src/kit/scroll.ts')
    .split('\n')
    .filter((l) => /window\.scroll/.test(l));
  expect(lines.map((l) => l.trim())).toEqual(['if (window.scrollX || window.scrollY) window.scrollTo(0, 0);']);
});
