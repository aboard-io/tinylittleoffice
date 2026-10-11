// Types for /tinyoffice.js: Tiny Little Office links from a page's own JavaScript.
export interface LinkOptions {
  /** write, outline, deck, sheet, calc, draw, diagram, anim, cal or trip. */
  app: string;
  /** The document in the app's own text (TLO; see /llms.txt). */
  doc?: string;
  title?: string;
  by?: string;
  /** 'pdf', 'png', 'md', 'tlo' or an app's own format to download as it opens; 'show' for a deck presenting. */
  view?: string;
  /** The site; this one by default. */
  base?: string;
}
export function link(opts: LinkOptions): string;
export function embed(opts: Omit<LinkOptions, 'by' | 'view'> & { width?: number; height?: number }): string;
