/**
 * The kit: what every TinyOffice app is made from.
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
}

export interface ViewOpts {
  /** How much has been revealed, for documents that build up (see AppDef.steps). Absent: everything. */
  step?: number;
  /** Drawn inside another document: the gist rather than the whole thing. */
  embed?: boolean;
}

export interface DownloadContext {
  /** Creation time of the document in ms, if known. */
  created: number | null;
  /** Address of the site ("https://host/path/"), so links in a file point somewhere. */
  base?: string;
  /** PNG pictures the browser drew for formats that cannot hold SVG, by key. */
  png?: Record<string, Uint8Array>;
}

export interface Download {
  ext: string;
  label: string;
  mime: string;
  build(body: string, ctx: DownloadContext): Uint8Array;
  /** Pictures this format needs drawn first: key -> SVG. */
  needs?(body: string): Record<string, { svg: string; w: number; h: number }>;
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
  /** The document's own title, '' if it has none. */
  title(body: string): string;
  /** The document as a few lines of plain text. */
  outline(body: string): string[];
  /** The document, drawn. Always at least one page. */
  view(body: string, opts?: ViewOpts): Page[];
  /** How many reveals the document has when presented (shapes, rows, stops). */
  steps?(body: string): number;
  /** 'click' reveals wait for the presenter; 'auto' ones play by themselves. */
  build?: 'click' | 'auto';
  /** The document as plain, meaningful HTML (goes inside <body>). Default: its pictures and outline. */
  html?(body: string, ctx: DownloadContext): string;
  /** Formats beyond the ones every app gets (.html, .png, .pdf). */
  downloads?: Download[];
  shortcuts?: Shortcut[];
}

const REGISTRY = new Map<string, AppDef>();

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
export const fileName = (def: AppDef, body: string, ext: string) => `${slug(def.title(body)) || def.id}.${ext}`;

/* ---------- drawing ---------- */

export const INK = '#18181b';
export const MUTED = '#52525b';
export const FAINT = '#a1a1aa';
export const LINE = '#d4d4d8';
export const SHADE = '#f4f4f5';
export const PAPER = '#ffffff';
export const ACCENT = '#4f46e5';
export const FONT = "system-ui, -apple-system, 'Segoe UI', Helvetica, Arial, sans-serif";

export interface Span {
  t: string;
  b?: boolean;
  i?: boolean;
  u?: boolean;
  s?: boolean;
  /** A web address: drawn as a link. */
  link?: boolean;
}

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
    for (const word of span.t.split(/(?<= )/)) {
      const w = textWidth(word, px, bold || !!span.b);
      if (width + textWidth(word.trimEnd(), px, bold || !!span.b) > max && width > 0) {
        lines.push([]);
        width = 0;
      }
      const line = lines[lines.length - 1];
      const last = line[line.length - 1];
      if (last && last.b === span.b && last.i === span.i && last.u === span.u && last.s === span.s && last.link === span.link) last.t += word;
      else line.push({ ...span, t: word });
      width += w;
    }
  }
  return lines;
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
  const inner =
    typeof content === 'string'
      ? xml(content)
      : content
          .map((s) => {
            const a = (s.b ? ' font-weight="700"' : '') + (s.i ? ' font-style="italic"' : '') + (s.link ? ` fill="${ACCENT}"` : '') + (s.u || s.s || s.link ? ` text-decoration="${[(s.u || s.link) && 'underline', s.s && 'line-through'].filter(Boolean).join(' ')}"` : '');
            return a ? `<tspan${a}>${xml(s.t)}</tspan>` : xml(s.t);
          })
          .join('');
  return `<text x="${r(x)}" y="${r(y)}" font-size="${px}"${bold ? ' font-weight="700"' : ''}${anchor !== 'start' ? ` text-anchor="${anchor}"` : ''} fill="${fill}" xml:space="preserve">${inner}</text>`;
}

export const r = (n: number) => String(Math.round(n * 100) / 100);
export const rect = (x: number, y: number, w: number, h: number, fill: string, extra = '') => `<rect x="${r(x)}" y="${r(y)}" width="${r(w)}" height="${r(h)}" fill="${fill}"${extra ? ' ' + extra : ''}/>`;

/** A page as a complete SVG document. */
export function pageSvg(p: Page, attrs = ''): string {
  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${p.w} ${p.h}" width="${p.w}" height="${p.h}" font-family="${FONT}"${attrs ? ' ' + attrs : ''}>${rect(0, 0, p.w, p.h, PAPER)}${p.svg}</svg>`;
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

export interface DocRef {
  def: AppDef;
  body: string;
}

/**
 * A document as a standalone web page: real HTML where the app has it,
 * pictures otherwise, with the tags search engines and link previews read.
 */
export function docHtml({ def, body }: DocRef, ctx: DownloadContext, link = ''): string {
  const title = def.title(body) || def.name;
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
    ['name', 'generator', 'TinyOffice'],
    ['property', 'og:type', 'article'],
    ['property', 'og:site_name', 'TinyOffice'],
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
${meta}${link ? `\n<link rel="alternate" href="${xml(link)}" title="Open in TinyOffice">` : ''}
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
</main>${link ? `\n<footer><p><a href="${xml(link)}">Open this ${xml(def.name.toLowerCase())} in TinyOffice</a></p></footer>` : ''}
</body>
</html>
`;
}

/** The formats every app has, after its own. */
export const COMMON: { ext: string; label: string }[] = [
  { ext: 'pdf', label: 'PDF' },
  { ext: 'png', label: 'Picture' },
  { ext: 'html', label: 'Web page' },
];

const ALIASES: Record<string, string> = { ppt: 'pptx', xls: 'xlsx', ical: 'ics', icalendar: 'ics', htm: 'html', markdown: 'md', json: 'geojson', image: 'png', jpg: 'png' };
export const extOf = (ext: string) => ALIASES[ext.toLowerCase()] ?? ext.toLowerCase();
