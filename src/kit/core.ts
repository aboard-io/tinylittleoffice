/**
 * The kit: what every TinyLittleOffice app is made from.
 *
 * An app is a definition (this file's AppDef: its name, how to read a title
 * out of a document, how to draw it, what it can be saved as) plus an editor
 * element. Everything the shell offers is driven by the definitions: the
 * menu, routes, downloads, pictures, PDFs, previews of one document inside
 * another, share cards and the list of keyboard shortcuts. Nothing in here
 * touches the DOM, so it all runs under node --test.
 */

/** One page of a document, drawn. `svg` is what goes inside the <svg> element. */
export interface Page {
  w: number;
  h: number;
  svg: string;
  /** What the page shows, in words, for anyone who cannot see it (a drawing's alt text). */
  alt?: string;
}

export interface ViewOpts {
  /** How much has been revealed, for documents that build up (see AppDef.steps). Absent: everything. */
  step?: number;
  /** Drawn inside another document: the gist rather than the whole thing. */
  embed?: boolean;
  /** The width to lay out for, when it will sit somewhere narrow (a zine page). Apps made of lines of text reflow to it; pictures ignore it. */
  w?: number;
  /** A preview in a text being written, at its own size: a table looks like the spreadsheet it is. */
  preview?: boolean;
}

export interface DownloadContext {
  /** Creation time of the document in ms, if known. */
  created: number | null;
  /** Address of the site ("https://host/path/"), so links in a file point somewhere. */
  base?: string;
  /** PNG pictures the browser drew for formats that cannot hold SVG, by key. */
  png?: Record<string, Uint8Array>;
  /** The name its author gave the document, if any. */
  title?: string;
}

export interface Download {
  ext: string;
  label: string;
  mime: string;
  build?(body: string, ctx: DownloadContext): Uint8Array;
  /** Pictures this format needs drawn first: key -> SVG. */
  needs?(body: string): Record<string, { svg: string; w: number; h: number }>;
  /** Instead of `build`: a PDF of these pages rather than of the document's own (a seating chart's place cards). The browser draws it. */
  pages?(body: string): Page[];
}

export interface Shortcut {
  keys: string;
  does: string;
}

export interface AppDef {
  /** Route name and file stem: "sheet". */
  id: string;
  name: string;
  /** Key of an icon in lib/icons.ts UI. */
  icon: string;
  /** One line for menus, link previews and search engines. */
  blurb: string;
  /** The heading it is listed under in the menu ("Visualization"). */
  group?: string;
  /** The app it is a kind of: listed indented beneath it ("draw", for the diagram apps). */
  under?: string;
    /** For apps whose document IS a web page (a site, a store): that page, whole. Used for the .html download. */
  document?(body: string, ctx: DownloadContext): string;
  /** The document's own title, '' if it has none. */
  title(body: string): string;
  /** The document as a few lines of plain text. */
  outline(body: string): string[];
  /** The document, drawn. Always at least one page. */
  view(body: string, opts?: ViewOpts): Page[];
  /** How many reveals the document has when presented (shapes, rows, stops). */
  steps?(body: string): number;
  /** The document as it moves: pages to show one after another, for an animated GIF. `fade` asks for a cross-fade between them. */
  frames?(body: string): { pages: Page[]; delayMs: number; fade?: boolean };
  /** The document as plain, meaningful HTML (goes inside <body>). Default: its pictures and outline. */
  html?(body: string, ctx: DownloadContext): string;
  /**
   * The app can show a document to an audience. A link "<app>.show/..." then
   * opens it presenting, and that is the link the shell hands out; the editor
   * is given `present = true` and fires "present-end" when the viewer wants
   * to edit instead.
   */
  presents?: boolean;
  /**
   * Turn text written by hand (or by a program) into a document, where the
   * app's own format is too terse to write: real dates instead of counted
   * days, decimal degrees instead of packed ones. Text already in the app's
   * format passes through. Used by plain-parameter links ("?doc=...").
   */
  read?(text: string): string;
  /**
   * This app's own ways to become another, where the other reading its
   * words (`read`) would not do it justice: a diagram's picture as a
   * drawing. (See kit/embed.ts convert.)
   */
  into?: Record<string, (body: string) => string>;
  /** Its HTML (see `html`) is the best way to read it: words that flow, rather than pictures of pages. */
  prose?: boolean;
  /** Formats beyond the ones every app gets (.html, .png, .pdf). */
  downloads?: Download[];
  shortcuts?: Shortcut[];
}

const REGISTRY = new Map<string, AppDef>();

/**
 * The version of the link format, written "v0" at the front of every
 * document's link: "#/v0/<app>/<payload>". Version 0 is the one that
 * launches; until then the format changes freely and nothing older is read.
 */
export const LINK_VERSION = 0;
/** What every document's link starts with, after the "#". */
export const LINK = `#/v${LINK_VERSION}/`;

export function defineApp(def: AppDef): AppDef {
  REGISTRY.set(def.id, def);
  return def;
}
export const apps = (): AppDef[] => [...REGISTRY.values()];
export const appOf = (id: string): AppDef | undefined => REGISTRY.get(id);

/* ---------- text ---------- */

export const xml = (s: string) =>
  s
    .replace(/[\u0000-\u0008\u000b\u000c\u000e-\u001f]/g, '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');

const csvCell = (s: string) => (/[",\r\n]/.test(s) || s !== s.trim() ? `"${s.replace(/"/g, '""')}"` : s);
export const csv = (rows: (string | number)[][]) => (rows.length ? rows.map((r) => r.map((c) => csvCell(String(c))).join(',')).join('\r\n') + '\r\n' : '');

export const utf8 = (s: string) => new TextEncoder().encode(s);

export const clamp = (n: number, lo: number, hi: number) => Math.max(lo, Math.min(hi, n));

/** The list with items i and j exchanged; the list itself when either is off the end. */
export function swap<T>(list: T[], i: number, j: number): T[] {
  if (i < 0 || j < 0 || i >= list.length || j >= list.length) return list;
  const out = [...list];
  [out[i], out[j]] = [out[j], out[i]];
  return out;
}

/** A moment, the way this person's locale writes one: "7 Oct 2026, 20:33". */
export const fmtDate = (ms: number) => new Intl.DateTimeFormat(undefined, { dateStyle: 'medium', timeStyle: 'short' }).format(ms);

export function slug(s: string): string {
  return s
    .normalize('NFKD')
    .replace(/[̀-ͯ]/g, '')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 48)
    .replace(/-+$/, '');
}

/** A file name for a download: the title if there is one, otherwise the app's id. */
export const fileName = (def: AppDef, body: string, ext: string, title = '') => `${slug(title || def.title(body)) || def.id}.${ext}`;

/* ---------- drawing ---------- */

export const INK = '#18181b';
export const MUTED = '#52525b';
/** The lightest grey for words: 4.9:1 on white, which is enough to read. */
export const FAINT = '#6b7280';
export const LINE = '#d4d4d8';
export const SHADE = '#f4f4f5';
export const PAPER = '#ffffff';
export const ACCENT = '#4f46e5';
export const FONT = "'IBM Plex Sans', system-ui, -apple-system, 'Segoe UI', Helvetica, Arial, sans-serif";

export interface Span {
  t: string;
  b?: boolean;
  i?: boolean;
  u?: boolean;
  s?: boolean;
  /** A web address: drawn as a link. */
  link?: boolean;
  /** Where linked words go: drawn as a link to there. */
  href?: string;
  /** Highlighted: yellow behind the words. */
  h?: boolean;
  /** An icon in the line, by name (t is then ''). */
  ic?: string;
}
export const HIGHLIGHT = '#fef08a';
/** How wide an icon in a line of text is, in px, for its size of type. */
export const iconWidth = (px: number) => px * 1.25;

/**
 * Width of text in px. A browser replaces this with real measurement (see
 * kit/browser.ts); the estimate keeps layout working anywhere else.
 */
let measurer = (text: string, px: number, bold: boolean) => text.length * px * (bold ? 0.56 : 0.52);
export const setMeasurer = (fn: typeof measurer) => (measurer = fn);
export const textWidth = (text: string, px: number, bold = false) => measurer(text, px, bold);

/** Break styled text into lines no wider than `max`. */
export function wrap(spans: Span[], max: number, px: number, bold = false): Span[][] {
  const lines: Span[][] = [[]];
  let width = 0;
  for (const span of spans) {
    if (span.ic) {
      const w = iconWidth(px);
      if (width + w > max && width > 0) {
        lines.push([]);
        width = 0;
      }
      lines[lines.length - 1].push({ ...span });
      width += w;
      continue;
    }
    for (const word of span.t.split(/(?<= )/).flatMap((wd) => breakWord(wd, max, px, bold || !!span.b))) {
      const w = textWidth(word, px, bold || !!span.b);
      if (width + textWidth(word.trimEnd(), px, bold || !!span.b) > max && width > 0) {
        lines.push([]);
        width = 0;
      }
      const line = lines[lines.length - 1];
      const last = line[line.length - 1];
      if (last && !last.ic && last.b === span.b && last.i === span.i && last.u === span.u && last.s === span.s && last.h === span.h && last.link === span.link && last.href === span.href) last.t += word;
      else line.push({ ...span, t: word });
      width += w;
    }
  }
  return lines;
}
/**
 * A word too long for a line (a web address, say) in pieces that fit: broken
 * after a "/", ".", "-", "?", "&", "=" or "_" where one is near the end of a
 * piece, else where the line runs out. A word that fits is itself.
 */
function breakWord(word: string, max: number, px: number, bold: boolean): string[] {
  if (max <= 0 || textWidth(word.trimEnd(), px, bold) <= max) return [word];
  const out: string[] = [];
  let rest = word;
  while (rest && textWidth(rest.trimEnd(), px, bold) > max) {
    // As many characters as fit, then back to a good place to break, if one is in the last third.
    let n = 1;
    while (n < rest.length && textWidth(rest.slice(0, n + 1), px, bold) <= max) n++;
    const soft = Math.max(...['/', '.', '-', '?', '&', '=', '_'].map((c) => rest.lastIndexOf(c, n - 1)));
    const at = soft >= Math.ceil(n * 0.66) ? soft + 1 : n;
    out.push(rest.slice(0, at));
    rest = rest.slice(at);
  }
  if (rest) out.push(rest);
  return out;
}
export const wrapText = (text: string, max: number, px: number, bold = false) => wrap([{ t: text }], max, px, bold).map((l) => l.map((s) => s.t).join('').trimEnd());

/** Cut text to fit a width, with an ellipsis. */
export function clip(text: string, max: number, px: number, bold = false): string {
  if (textWidth(text, px, bold) <= max) return text;
  let t = text;
  while (t.length > 1 && textWidth(t + '…', px, bold) > max) t = t.slice(0, -1);
  return t.trimEnd() + '…';
}

export interface TextStyle {
  px?: number;
  bold?: boolean;
  fill?: string;
  anchor?: 'start' | 'middle' | 'end';
}

/** One line of text. y is the baseline. */
export function text(x: number, y: number, content: string | Span[], style: TextStyle = {}): string {
  const { px = 16, bold = false, fill = INK, anchor = 'start' } = style;
  // Highlights and icons need to know where each span falls, so the line is measured span by span.
  let before = '';
  let at = 0;
  const spans = typeof content === 'string' ? [{ t: content } as Span] : content;
  const total = spans.reduce((a, s) => a + (s.ic ? iconWidth(px) : textWidth(s.t, px, bold || !!s.b)), 0);
  const x0 = anchor === 'middle' ? x - total / 2 : anchor === 'end' ? x - total : x;
  const inner = spans
    .map((s) => {
      const w = s.ic ? iconWidth(px) : textWidth(s.t, px, bold || !!s.b);
      if (s.h && !s.ic) before += `<rect x="${r(x0 + at)}" y="${r(y - px * 0.82)}" width="${r(w)}" height="${r(px * 1.1)}" fill="${HIGHLIGHT}" rx="2"/>`;
      if (s.ic) before += iconGlyph(s.ic, x0 + at + px * 0.1, y - px * 0.85, px * 1.05, fill);
      at += w;
      if (s.ic) return `<tspan dx="${r(w)}"></tspan>`;
      const link = s.link || !!s.href;
      const a = (s.b ? ' font-weight="700"' : '') + (s.i ? ' font-style="italic"' : '') + (link ? ` fill="${ACCENT}"` : '') + (s.u || s.s || link ? ` text-decoration="${[(s.u || link) && 'underline', s.s && 'line-through'].filter(Boolean).join(' ')}"` : '');
      const span = a ? `<tspan${a}>${xml(s.t)}</tspan>` : xml(s.t);
      return s.href ? `<a href="${xml(s.href)}">${span}</a>` : span;
    })
    .join('');
  return before + `<text x="${r(x)}" y="${r(y)}" font-size="${px}"${bold ? ' font-weight="700"' : ''}${anchor !== 'start' ? ` text-anchor="${anchor}"` : ''} fill="${fill}" xml:space="preserve">${inner}</text>`;
}

/** An icon drawn into a picture, by name; nothing if there is no such icon. Set by the icon library once it loads (the kit itself has no icons). */
export let iconGlyph: (name: string, x: number, y: number, size: number, color: string) => string = () => '';
export const setIconGlyph = (fn: typeof iconGlyph) => (iconGlyph = fn);

export const r = (n: number) => String(Math.round(n * 100) / 100);
export const rect = (x: number, y: number, w: number, h: number, fill: string, extra = '') => `<rect x="${r(x)}" y="${r(y)}" width="${r(w)}" height="${r(h)}" fill="${fill}"${extra ? ' ' + extra : ''}/>`;

/** A page as a complete SVG document. */
export function pageSvg(p: Page, attrs = ''): string {
  // Alt text is said after the name a picture is given, and kept inside the file as its <title>.
  const alt = p.alt ? xml(p.alt) : '';
  const a = alt ? (/aria-label="/.test(attrs) ? attrs.replace(/aria-label="([^"]*)"/, (_, name) => `aria-label="${name ? name + '. ' : ''}${alt}"`) : `${attrs ? attrs + ' ' : ''}role="img" aria-label="${alt}"`) : attrs;
  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${p.w} ${p.h}" width="${p.w}" height="${p.h}" font-family="${FONT}"${a ? ' ' + a : ''}>${alt ? `<title>${alt}</title>` : ''}${rect(0, 0, p.w, p.h, PAPER)}${p.svg}</svg>`;
}

/** A page placed inside a box on another page, scaled to fit and centred. */
export function place(p: Page, x: number, y: number, w: number, h: number): string {
  const k = Math.min(w / p.w, h / p.h);
  return `<svg x="${r(x + (w - p.w * k) / 2)}" y="${r(y + (h - p.h * k) / 2)}" width="${r(p.w * k)}" height="${r(p.h * k)}" viewBox="0 0 ${p.w} ${p.h}">${p.svg}</svg>`;
}

/** Several pages as one tall one. */
export function stack(pages: Page[], gap = 16): Page {
  if (pages.length === 1) return pages[0];
  const w = Math.max(...pages.map((p) => p.w));
  let y = 0;
  let svg = '';
  for (const p of pages) {
    svg += `<svg x="${(w - p.w) / 2}" y="${y}" width="${p.w}" height="${p.h}" viewBox="0 0 ${p.w} ${p.h}">${rect(0, 0, p.w, p.h, PAPER)}${p.svg}</svg>`;
    y += p.h + gap;
  }
  return { w, h: y - gap, svg: rect(0, 0, w, y - gap, SHADE) + svg };
}

/** Rows of text as a page: the fallback picture of any document. */
export function listPage(title: string, lines: string[], w = 720): Page {
  let y = 64;
  let svg = text(48, y, clip(title, w - 96, 30, true), { px: 30, bold: true });
  y += 20;
  for (const l of lines) for (const row of wrapText(l, w - 96, 17)) svg += text(48, (y += 28), row, { px: 17, fill: MUTED });
  return { w, h: Math.max(240, y + 48), svg };
}

/* ---------- documents as web pages ---------- */

/**
 * The scripts of pages the apps make (a store's cart, a game). Each is a
 * fixed text, declared once at module level, so the build can list its
 * hash in the site's Content-Security-Policy (public/_headers) and no
 * other inline script runs anywhere, not even inside a page shown in a
 * frame. A page's data goes beside it in pageData(), never in the script.
 */
const SCRIPTS = new Set<string>();
export function pageScript(code: string): string {
  SCRIPTS.add(code);
  return `<script>${code}</script>`;
}
export const pageScripts = (): string[] => [...SCRIPTS];
/** A page's data, as JSON the page's script reads by id. */
export const pageData = (id: string, value: unknown) => `<script type="application/json" id="${id}">${JSON.stringify(value).replace(/</g, '\\u003c')}</script>`;

export interface DocRef {
  def: AppDef;
  body: string;
  /** The name its author gave it, if any. */
  title?: string;
}

/**
 * A document as a standalone web page: real HTML where the app has it,
 * pictures otherwise, with the tags search engines and link previews read.
 */
export function docHtml({ def, body, title: given }: DocRef, ctx: DownloadContext, link = ''): string {
  const title = given || def.title(body) || def.name;
  const outline = def.outline(body);
  const about = (outline.filter((l) => l !== title).join(' · ') || def.blurb).slice(0, 200);
  const base = ctx.base ?? '';
  const inner =
    def.html?.(body, ctx) ??
    `<h1>${xml(title)}</h1>\n${def
      .view(body)
      .map((p) => `<figure>${pageSvg(p, `role="img" aria-label="${xml(title)}"`)}</figure>`)
      .join('\n')}\n${outline.length ? `<ul>\n${outline.map((l) => `<li>${xml(l)}</li>`).join('\n')}\n</ul>` : ''}`;
  const meta = [
    ['name', 'description', about],
    ['name', 'generator', 'TinyLittleOffice'],
    ['property', 'og:type', 'article'],
    ['property', 'og:site_name', 'TinyLittleOffice'],
    ['property', 'og:title', title],
    ['property', 'og:description', about],
    ...(base ? [['property', 'og:image', `${base}og/${def.id}.png`], ['property', 'og:image:width', '1200'], ['property', 'og:image:height', '630']] : []),
    ...(link ? [['property', 'og:url', link]] : []),
    ['name', 'twitter:card', 'summary_large_image'],
    ...(ctx.created !== null ? [['property', 'article:published_time', new Date(ctx.created).toISOString()]] : []),
  ]
    .map(([k, n, v]) => `<meta ${k}="${n}" content="${xml(v)}">`)
    .join('\n');
  return `<!doctype html>
<html lang="en">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<title>${xml(title)}</title>
${meta}${link ? `\n<link rel="alternate" href="${xml(link)}" title="Open in TinyLittleOffice">` : ''}
<style>
body{font:17px/1.6 ${FONT};color:${INK};max-width:46em;margin:2em auto;padding:0 1em}
figure{margin:1em 0}figure svg,figure img{display:block;max-width:100%;height:auto;border:1px solid ${LINE};border-radius:8px}
table{border-collapse:collapse}th,td{border:1px solid ${LINE};padding:.3em .7em;text-align:left}td.n{text-align:right;font-variant-numeric:tabular-nums}
figcaption small,footer{color:${MUTED};font-size:.85em}ul.check{list-style:none;padding-left:0}
</style>
</head>
<body>
<main>
${inner}
</main>${link ? `\n<footer><p><a href="${xml(link)}">Open this ${xml(def.name.toLowerCase())} in TinyLittleOffice</a></p></footer>` : ''}
</body>
</html>
`;
}

/** The formats every app has, after its own. */
export const COMMON: { ext: string; label: string }[] = [
  { ext: 'pdf', label: 'PDF' },
  { ext: 'png', label: 'Picture' },
  { ext: 'html', label: 'Web page' },
  { ext: 'md', label: 'Markdown' },
  { ext: 'tlo', label: 'TinyLittleOffice file' },
];
/** Apps that move offer a GIF as well. */
export const MOVING: { ext: string; label: string } = { ext: 'gif', label: 'Animated GIF' };

const ALIASES: Record<string, string> = { ppt: 'pptx', xls: 'xlsx', ical: 'ics', icalendar: 'ics', htm: 'html', markdown: 'md', json: 'geojson', image: 'png', jpg: 'png' };
export const extOf = (ext: string) => ALIASES[ext.toLowerCase()] ?? ext.toLowerCase();

/* ---------- undo ---------- */

/**
 * Undo and redo for a document, whatever app it belongs to: a document is
 * text, so its history is the texts it has been. Changes that come in a
 * burst (typing) count as one step.
 */
export class History {
  private past: string[] = [];
  private future: string[] = [];
  private last = 0;
  private burst: number;
  private limit: number;
  /** `burst`: changes closer together than this many ms are one step. */
  constructor(burst = 700, limit = 200) {
    this.burst = burst;
    this.limit = limit;
  }

  get canUndo() {
    return this.past.length > 0;
  }
  get canRedo() {
    return this.future.length > 0;
  }

  /** Note that the document is about to stop being `before`. */
  record(before: string, now = Date.now()) {
    if (now - this.last > this.burst || !this.past.length) {
      this.past.push(before);
      if (this.past.length > this.limit) this.past.shift();
    }
    this.last = now;
    this.future = [];
  }

  /** The document to go back to, given what it is now; null if there is nothing to undo. */
  undo(current: string): string | null {
    if (!this.past.length) return null;
    this.future.push(current);
    this.last = 0;
    return this.past.pop()!;
  }

  redo(current: string): string | null {
    if (!this.future.length) return null;
    this.past.push(current);
    this.last = 0;
    return this.future.pop()!;
  }

  clear() {
    this.past = [];
    this.future = [];
    this.last = 0;
  }
}
