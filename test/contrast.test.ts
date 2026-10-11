// The colour tokens, in the light and in the dark, read against each other: text at 4.5:1 or better, edges at
// 3:1 in the dark (hairlines in the light). Read from src/styles/tokens.css as it is, var() chains followed.
// (Ported from the old tree's test/contrast.test.ts, without Shoelace's scales under it.)
import { test, expect } from 'vitest';
import { readFileSync } from 'node:fs';

type Vars = Map<string, string>;

/** Every "--name: value" in the blocks whose selector matches `where`. */
function declarations(css: string, where: RegExp, into: Vars = new Map()): Vars {
  for (const m of css.replace(/\/\*[\s\S]*?\*\//g, '').matchAll(/([^{}@]+)\{([^{}]*)\}/g)) {
    if (!where.test(m[1].trim())) continue;
    for (const d of m[2].matchAll(/(--[\w-]+)\s*:\s*([^;]+);/g)) into.set(d[1], d[2].trim());
  }
  return into;
}

const tokens = readFileSync(new URL('../src/styles/tokens.css', import.meta.url), 'utf8');
const light = declarations(tokens, /^:root$/);
const dark = declarations(tokens, /^:root\[data-theme='dark'\]$/, declarations(tokens, /^:root$/));

type Rgb = [number, number, number];
function resolve(vars: Vars, value: string, depth = 0): string {
  if (depth > 20) throw new Error(`a loop in ${value}`);
  return value.replace(/var\((--[\w-]+)(?:,\s*([^)]+))?\)/g, (_, name: string, fallback?: string) => resolve(vars, vars.get(name) ?? fallback ?? `(unset ${name})`, depth + 1));
}
function rgb(color: string): Rgb {
  let m = /^hsla?\(\s*([\d.]+)[,\s]+([\d.]+)%[,\s]+([\d.]+)%/.exec(color);
  if (m) {
    const h = +m[1] / 360,
      s = +m[2] / 100,
      l = +m[3] / 100;
    const q = l < 0.5 ? l * (1 + s) : l + s - l * s,
      p = 2 * l - q;
    const f = (t: number) => ((t = (t + 1) % 1), t < 1 / 6 ? p + (q - p) * 6 * t : t < 1 / 2 ? q : t < 2 / 3 ? p + (q - p) * (2 / 3 - t) * 6 : p);
    return [f(h + 1 / 3), f(h), f(h - 1 / 3)];
  }
  m = /^#([0-9a-f]{3}|[0-9a-f]{6})$/i.exec(color);
  if (m) {
    const hex = m[1].length === 3 ? [...m[1]].map((c) => c + c).join('') : m[1];
    return [0, 2, 4].map((i) => parseInt(hex.slice(i, i + 2), 16) / 255) as Rgb;
  }
  throw new Error(`not a colour: ${color}`);
}
const luminance = (c: Rgb) => [0.2126, 0.7152, 0.0722].reduce((sum, w, i) => sum + w * (c[i] <= 0.03928 ? c[i] / 12.92 : ((c[i] + 0.055) / 1.055) ** 2.4), 0);
/** WCAG contrast of two tokens (either may be the text). */
export function contrast(vars: Vars, a: string, b: string): number {
  const la = luminance(rgb(resolve(vars, `var(${a})`))),
    lb = luminance(rgb(resolve(vars, `var(${b})`)));
  return (Math.max(la, lb) + 0.05) / (Math.min(la, lb) + 0.05);
}

/** Text on what it sits on; the floors are the WCAG AA ones. */
const TEXT: [string, string][] = [
  ['--to-ink', '--to-bg'],
  ['--to-ink', '--to-surface'],
  ['--to-ink', '--to-surface-2'],
  ['--to-ink', '--to-accent-soft'],
  ['--to-ink-2', '--to-bg'],
  ['--to-ink-2', '--to-surface'],
  ['--to-ink-2', '--to-surface-2'],
  ['--to-ink-3', '--to-bg'],
  ['--to-ink-3', '--to-surface'],
  ['--to-ink-3', '--to-surface-2'],
  ['--to-accent', '--to-bg'],
  ['--to-accent', '--to-surface'],
  ['--to-accent', '--to-surface-2'],
  ['--to-accent', '--to-accent-soft'],
  ['--to-on-accent', '--to-accent'],
  ['--to-bg', '--to-ink'],
  ['--to-danger', '--to-surface'],
  ['--to-danger', '--to-bg'],
  // The link guard's two buttons: Cancel's words on red, Go's on green.
  ['--to-on-accent', '--to-danger'],
  ['--to-on-accent', '--to-go'],
  // The arrival banner, coloured by how long a short link has left.
  ['--to-ok-ink', '--to-ok-bg'],
  ['--to-soon-ink', '--to-soon-bg'],
  ['--to-last-ink', '--to-last-bg'],
  // A document's signed state beside its title, and its words in the Share and Privacy dialogs.
  ['--to-signed-ink', '--to-signed-bg'],
  ['--to-mismatch-ink', '--to-mismatch-bg'],
  ['--to-signed-ink', '--to-surface'],
  ['--to-mismatch-ink', '--to-surface'],
  ['--to-otherkey-ink', '--to-otherkey-bg'],
  ['--to-otherkey-ink', '--to-surface'],
  // Paper stays white in both themes: its ink, its quieter words and its accent must read on it and on its shading.
  ['--to-paper-ink', '--to-paper'],
  ['--to-paper-muted', '--to-paper'],
  ['--to-paper-accent', '--to-paper'],
  ['--to-paper-ink', '--to-paper-shade'],
  ['--to-paper-muted', '--to-paper-shade'],
  ['--to-placeholder', '--to-input-bg'],
  ['--to-ink', '--to-input-bg'],
  ['--to-paper-ink', '--to-paper'],
];
/** Edges and rings against what they are drawn on: 3:1 in the dark, where Paul found them faint; the light theme keeps its hairlines. */
const EDGES: [string, string][] = [
  ['--to-border', '--to-surface'],
  ['--to-border', '--to-bg'],
  ['--to-border', '--to-surface-2'],
  ['--to-border-strong', '--to-surface'],
  ['--to-input-border', '--to-input-bg'],
  ['--to-accent', '--to-bg'],
  ['--to-accent', '--to-surface'],
];

for (const [name, vars, edge] of [
  ['light', light, 1.1],
  ['dark', dark, 3],
] as const) {
  test(`${name}: every text token reads at 4.5:1 on what it sits on`, () => {
    const low = TEXT.map(([a, b]) => [a, b, contrast(vars, a, b)] as const).filter(([, , c]) => c < 4.5);
    expect(low.map(([a, b, c]) => `${a} on ${b}: ${c.toFixed(2)}`)).toEqual([]);
  });
  test(`${name}: edges and focus rings stand out at ${edge}:1`, () => {
    const low = EDGES.map(([a, b]) => [a, b, contrast(vars, a, b)] as const).filter(([, , c]) => c < edge);
    expect(low.map(([a, b, c]) => `${a} on ${b}: ${c.toFixed(2)}`)).toEqual([]);
  });
}
test('the dark page sits behind its panels, and a raised panel is lighter still', () => {
  const l = (v: string) => luminance(rgb(resolve(dark, `var(${v})`)));
  expect(l('--to-bg') < l('--to-surface') && l('--to-surface') < l('--to-surface-2')).toBe(true);
  // Not pure white on pure black: the dark keeps its character.
  expect(l('--to-ink')).toBeLessThan(0.95);
  expect(l('--to-bg')).toBeGreaterThan(0.003);
});
