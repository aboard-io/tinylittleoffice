// The colour tokens, in the light and in the dark, read against each other: text at 4.5:1 or better, edges and rings at 3:1.
// The values are read from the stylesheet and Shoelace's two themes as they are, var() chains followed.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';

type Vars = Map<string, string>;

/** Every "--name: value" in the blocks whose selector list matches `where`. */
function declarations(css: string, where: RegExp, into: Vars = new Map()): Vars {
  for (const m of css.replace(/\/\*[\s\S]*?\*\//g, '').matchAll(/([^{}]+)\{([^{}]*)\}/g)) {
    if (!where.test(m[1].trim())) continue;
    for (const d of m[2].matchAll(/(--[\w-]+)\s*:\s*([^;]+);/g)) into.set(d[1], d[2].trim());
  }
  return into;
}

const sl = (file: string) => readFileSync(new URL(`../node_modules/@shoelace-style/shoelace/dist/themes/${file}`, import.meta.url), 'utf8');
const styles = readFileSync(new URL('../src/styles.css', import.meta.url), 'utf8');
// The dark theme is the light one with Shoelace's dark scales over it, then the stylesheet's shared tokens, then its dark block.
const SHARED = /:root,\s*:host,\s*\.sl-theme-dark$/;
const DARK = /(^|\s)\.sl-theme-dark$/;
const light = declarations(styles, SHARED, declarations(sl('light.css'), /:root/));
const dark = declarations(styles, DARK, declarations(styles, SHARED, declarations(sl('dark.css'), /sl-theme-dark/, declarations(sl('light.css'), /:root/))));

type Rgb = [number, number, number];
function resolve(vars: Vars, value: string, depth = 0): string {
  if (depth > 20) throw new Error(`a loop in ${value}`);
  return value.replace(/var\((--[\w-]+)(?:,\s*([^)]+))?\)/g, (_, name: string, fallback?: string) => resolve(vars, vars.get(name) ?? fallback ?? `(unset ${name})`, depth + 1));
}
function rgb(color: string): Rgb {
  let m = /^hsla?\(\s*([\d.]+)[,\s]+([\d.]+)%[,\s]+([\d.]+)%/.exec(color);
  if (m) {
    const h = +m[1] / 360, s = +m[2] / 100, l = +m[3] / 100;
    const q = l < 0.5 ? l * (1 + s) : l + s - l * s, p = 2 * l - q;
    const f = (t: number) => ((t = (t + 1) % 1), t < 1 / 6 ? p + (q - p) * 6 * t : t < 1 / 2 ? q : t < 2 / 3 ? p + (q - p) * (2 / 3 - t) * 6 : p);
    return [f(h + 1 / 3), f(h), f(h - 1 / 3)];
  }
  m = /^#([0-9a-f]{3}|[0-9a-f]{6})$/i.exec(color);
  if (m) {
    const hex = m[1].length === 3 ? [...m[1]].map((c) => c + c).join('') : m[1];
    return [0, 2, 4].map((i) => parseInt(hex.slice(i, i + 2), 16) / 255) as Rgb;
  }
  m = /^rgba?\(\s*([\d.]+)[,\s]+([\d.]+)[,\s]+([\d.]+)/.exec(color);
  if (m) return [+m[1] / 255, +m[2] / 255, +m[3] / 255];
  throw new Error(`not a colour: ${color}`);
}
const luminance = ([r, g, b]: Rgb) => [0.2126, 0.7152, 0.0722].reduce((sum, w, i) => sum + w * ([r, g, b][i] <= 0.03928 ? [r, g, b][i] / 12.92 : (([r, g, b][i] + 0.055) / 1.055) ** 2.4), 0);
/** WCAG contrast of two tokens (either may be the text). */
export function contrast(vars: Vars, a: string, b: string): number {
  const la = luminance(rgb(resolve(vars, `var(${a})`))), lb = luminance(rgb(resolve(vars, `var(${b})`)));
  return (Math.max(la, lb) + 0.05) / (Math.min(la, lb) + 0.05);
}

/** Text on what it sits on; the floors are the WCAG AA ones, the light theme's as it is (nothing may slip). */
const TEXT: [string, string][] = [
  ['--to-ink', '--to-bg'], ['--to-ink', '--to-surface'], ['--to-ink', '--to-surface-2'], ['--to-ink', '--to-accent-soft'],
  ['--to-ink-2', '--to-bg'], ['--to-ink-2', '--to-surface'], ['--to-ink-2', '--to-surface-2'],
  ['--to-ink-3', '--to-bg'], ['--to-ink-3', '--to-surface'], ['--to-ink-3', '--to-surface-2'],
  ['--to-accent', '--to-bg'], ['--to-accent', '--to-surface'], ['--to-accent', '--to-surface-2'], ['--to-accent', '--to-accent-soft'],
  ['--to-on-accent', '--to-accent'], ['--to-bg', '--to-ink'],
  ['--to-danger', '--to-surface'], ['--to-danger', '--to-bg'],
  ['--sl-input-placeholder-color', '--to-surface'], ['--sl-input-placeholder-color', '--to-surface-2'],
  ['--sl-input-color', '--sl-input-background-color'], ['--sl-input-help-text-color', '--to-surface'], ['--sl-input-help-text-color', '--to-surface-2'],
  ['--to-paper-ink', '--to-paper'], ['--sl-color-primary-800', '--to-accent-soft'],
];
/** Edges and rings against what they are drawn on: 3:1 in the dark, where Paul found them faint; the light theme keeps its hairlines (1.15:1 and up). */
const EDGES: [string, string][] = [
  ['--to-border', '--to-surface'], ['--to-border', '--to-bg'], ['--to-border', '--to-surface-2'],
  ['--to-border-strong', '--to-surface'], ['--sl-input-border-color', '--sl-input-background-color'],
  ['--to-accent', '--to-bg'], ['--to-accent', '--to-surface'],
];

for (const [name, vars, edge] of [['light', light, 1.1], ['dark', dark, 3]] as const) {
  test(`${name}: every text token reads at 4.5:1 on what it sits on`, () => {
    const low = TEXT.map(([a, b]) => [a, b, contrast(vars, a, b)] as const).filter(([, , c]) => c < 4.5);
    assert.deepEqual(low.map(([a, b, c]) => `${a} on ${b}: ${c.toFixed(2)}`), []);
  });
  test(`${name}: edges and focus rings stand out at ${edge}:1`, () => {
    const low = EDGES.map(([a, b]) => [a, b, contrast(vars, a, b)] as const).filter(([, , c]) => c < edge);
    assert.deepEqual(low.map(([a, b, c]) => `${a} on ${b}: ${c.toFixed(2)}`), []);
  });
}
test('the dark page sits behind its panels, and a raised panel is lighter still', () => {
  const l = (v: string) => luminance(rgb(resolve(dark, `var(${v})`)));
  assert.ok(l('--to-bg') < l('--to-surface') && l('--to-surface') < l('--to-surface-2'));
  // Not pure white on pure black: the dark keeps its character.
  assert.ok(l('--to-ink') < 0.95 && l('--to-bg') > 0.003);
});
