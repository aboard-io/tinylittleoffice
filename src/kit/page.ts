/**
 * The scripts of pages the apps make (a shop's cart, a game): each a fixed text declared once at module
 * level, so the build can list its hash in the site's Content-Security-Policy (public/_headers, filled by
 * vite.config.ts) and no other inline script runs anywhere, not even inside a page shown in a frame. A
 * page's data goes beside its script in pageData(), never in it. No DOM here: the build imports this.
 */
const SCRIPTS = new Set<string>();

export function pageScript(code: string): string {
  SCRIPTS.add(code);
  return `<script>${code}</script>`;
}
export const pageScripts = (): string[] => [...SCRIPTS];

/** A page's data, as JSON its script reads by id. */
export const pageData = (id: string, value: unknown) => `<script type="application/json" id="${id}">${JSON.stringify(value).replace(/</g, '\\u003c')}</script>`;
