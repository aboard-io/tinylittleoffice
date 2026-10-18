/**
 * The tokens as src/styles/tokens.css declares them, read from the file itself so a token added there is shown here:
 * every custom property of the light theme's :root, in the file's order, with its value as written. What a swatch
 * shows is `var(--name)`, so it follows the theme the toolbar chooses.
 */
import source from '../../src/styles/tokens.css?raw';

export interface Token {
  name: string;
  value: string;
}

/** The custom properties of the first `:root { … }` rule, comments taken out. */
export const tokens: Token[] = (() => {
  const css = source.replace(/\/\*[\s\S]*?\*\//g, '');
  const root = /:root\s*\{([^}]*)\}/.exec(css)?.[1] ?? '';
  return [...root.matchAll(/(--to-[\w-]+)\s*:\s*([^;]+);/g)].map((m) => ({ name: m[1], value: m[2].trim().replace(/\s+/g, ' ') }));
})();

/** A token that is a colour: its value a colour function, or another colour token. */
export const isColor = (t: Token) => /^(hsl|rgb|#|oklch)/.test(t.value) || (/^var\(--to-/.test(t.value) && !/font|radius|shadow|line|gutter|nav|scale|touch/.test(t.name));
