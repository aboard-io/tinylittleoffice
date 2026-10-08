/**
 * Diagrams from text. Each diagram app (org chart, mind map, swimlanes...)
 * is a few lines that turn an outline into Draw's shapes and joins; Draw's
 * renderer does the rest, so every diagram is a picture, a PDF, a slide that
 * builds shape by shape, and can be opened in Draw to be rearranged by hand.
 */
import type { Kind as LineKind } from './lines.ts';
import { defineApp, utf8, pageSvg, listPage, xml, FONT, type AppDef, type Page } from '../kit/core.ts';
import { resolve } from '../kit/embed.ts';
import { GRID, W, H, isLink, serializeDrawing, type Color, type Fill, type Kind, type Shape, type TextSize } from './drawmodel.ts';
import { shapesPage } from '../apps/draw.def.ts';

export interface Diagram {
  shapes: Shape[];
  w: number;
  h: number;
}

/** A line of an outline, with the lines indented under it. */
export interface Node {
  text: string;
  depth: number;
  kids: Node[];
}

/** An indented outline as a forest. Two spaces or a tab go one level in. */
export function outline(text: string): Node[] {
  const roots: Node[] = [];
  const path: Node[] = [];
  for (const raw of text.split('\n')) {
    if (!raw.trim()) continue;
    const indent = /^[ \t]*/.exec(raw)![0].replace(/\t/g, '  ').length;
    const depth = Math.min(Math.floor(indent / 2), path.length);
    const node: Node = { text: raw.trim().replace(/^[-*]\s+/, ''), depth, kids: [] };
    path.length = depth;
    (depth ? path[depth - 1].kids : roots).push(node);
    path.push(node);
  }
  return roots;
}

/** A shape, briefly. */
export const shape = (k: Kind, x: number, y: number, w: number, h: number, text = '', f: Fill = 0, c?: Color, z?: TextSize): Shape => {
  const s: Shape = { k, x, y, w, h, f, text };
  if (c) s.c = c;
  if (z && z !== 2) s.z = z;
  return s;
};
/** A join between shape numbers `from` and `to`: an arrow, or a plain line. */
export const join = (from: number, to: number, arrow = true, text = '', c?: Color, f: Fill = 0): Shape => shape(arrow ? 'k' : 'j', from, to, 0, 0, text, f, c);

/** The colours a diagram gives its parts, in turn. */
export const COLOR_CYCLE: Color[] = ['b', 'g', 'o', 'p', 'r'];

/**
 * Put each join straight after the later of the two shapes it joins, so a
 * diagram reads (and builds on a slide) as: a thing, the next thing, the
 * line between them, the next thing, its line...
 */
export function weave(shapes: Shape[]): Shape[] {
  const order: number[] = [];
  const placed = new Set<number>();
  const links = shapes.map((s, i) => (isLink(s.k) ? i : -1)).filter((i) => i >= 0);
  shapes.forEach((s, i) => {
    if (isLink(s.k)) return;
    order.push(i);
    placed.add(i);
    for (const l of links) if (!placed.has(l) && placed.has(shapes[l].x) && placed.has(shapes[l].y)) (order.push(l), placed.add(l));
  });
  const now = new Map(order.map((old, at) => [old, at]));
  return order.map((old) => (isLink(shapes[old].k) ? { ...shapes[old], x: now.get(shapes[old].x)!, y: now.get(shapes[old].y)! } : shapes[old]));
}

/** Move the shapes so they start at a margin, size the page to hold them, and put them in reading order. */
export function frame(drawn: Shape[], pad = 44): Diagram {
  const shapes = weave(drawn);
  const solid = shapes.filter((s) => !isLink(s.k));
  if (!solid.length) return { shapes: [], w: 480, h: 240 };
  const x0 = Math.min(...solid.map((s) => Math.min(s.x, s.x + s.w)));
  const y0 = Math.min(...solid.map((s) => Math.min(s.y, s.y + s.h)));
  const x1 = Math.max(...solid.map((s) => Math.max(s.x, s.x + s.w)));
  const y1 = Math.max(...solid.map((s) => Math.max(s.y, s.y + s.h)));
  return { shapes: shapes.map((s) => (isLink(s.k) ? s : { ...s, x: s.x - x0 + pad, y: s.y - y0 + pad })), w: Math.max(320, x1 - x0 + 2 * pad), h: Math.max(160, y1 - y0 + 2 * pad) };
}

/** The diagram as a drawing Draw can open: scaled to fit its canvas and snapped to its grid. */
export function toDrawing(d: Diagram): string {
  const k = Math.min(1, W / d.w, H / d.h);
  const g = (n: number) => Math.round((n * k) / GRID) * GRID;
  return serializeDrawing(d.shapes.map((s) => (isLink(s.k) ? s : { ...s, x: g(s.x), y: g(s.y), w: Math.max(GRID, g(s.w)), h: Math.max(GRID, g(s.h)), ...(k < 0.75 ? { z: 1 as TextSize } : {}) })));
}

/** How a page app is asked for its page. */
export interface PageOpts {
  edit?: boolean;
  base?: string;
}

export interface DiagramSpec {
  /** One line on how to write it. */
  hint: string;
  example: string;
  /** For diagram apps: the outline as shapes. */
  layout?(text: string): Diagram;
  /** The kinds of line the text is made of: what the form to fill in is built from (see lib/lines.ts). */
  form?: LineKind[];
  /** Which fields of which kind hold a thing's place, and the px per unit: then a thing can be dragged where it goes. */
  moves?: { kind: number; x: number; y: number; unit: number };
  /**
   * Where the picture has regions (a lane, the circles of a Venn): the key
   * of the line a tap at x, y (in the picture's own units) belongs to, so a
   * tap there adds to it and a thing dragged there moves into it. The key
   * is what is written before the colon ("Sales", "Fast & Cheap").
   */
  keyAt?(text: string, x: number, y: number): string | undefined;
  /** The document is rows at heart (a database's tables): offer it as a list to fill in, beside the picture. */
  list?: boolean;
  /** For print apps: the text as sheets of paper. */
  sheets?(text: string): Page[];
  /**
   * For page apps: the text as a whole web page, shown beside it as it is
   * typed. `base` is the site's address, for links out of a downloaded
   * file. Asked for `edit`, the page as it is typed into in place: it may
   * mark its fields itself, with hints where they are empty (lib/pageedit.ts).
   */
  page?(text: string, opts?: PageOpts): string;
  /** A row added on the page starts with its words empty, shown as the page's hints (the invoice's boxes), rather than with its fields' names. */
  blankRows?: boolean;
  /** Anything to show under the picture, as HTML (query results, say). */
  aside?(text: string): string;
}

/** The keys every text app answers to, as a form and as text. */
export const OUTLINE_KEYS = [
  { keys: 'Enter', does: 'Another row like this one' },
  { keys: 'Alt+↑ / Alt+↓', does: 'Move the row, and what is under it, up or down' },
  { keys: 'Alt+→ / Alt+←', does: 'Indent the row, or bring it back out' },
  { keys: 'Backspace (in an empty row)', does: 'Remove the row' },
  { keys: 'Mod+Shift+T', does: 'The text itself (and back)' },
  { keys: 'Tab / Shift+Tab (as text)', does: 'Indent the line, or bring it back out' },
];

const SPECS = new Map<string, DiagramSpec>();
export const specOf = (id: string) => SPECS.get(id);

/** Register the spec of an app the diagram editor edits (defineDiagram and definePage do this themselves). */
export const registerSpec = (id: string, spec: DiagramSpec) => void SPECS.set(id, spec);

export function defineDiagram(app: Pick<AppDef, 'id' | 'name' | 'icon' | 'blurb'> & Partial<AppDef>, spec: DiagramSpec & { layout(text: string): Diagram }): AppDef {
  registerSpec(app.id, spec);
  const page = (body: string, upTo?: number): Page => {
    const d = spec.layout(body);
    return shapesPage(d.shapes, d.w, d.h, upTo);
  };
  // The picture as SVG, then anything of the app's own (a seating chart's place cards).
  const { downloads = [], ...rest } = app;
  return defineApp({
    title: () => '',
    outline: (body) => body.split('\n').map((l) => l.trim()).filter(Boolean).slice(0, 12),
    view: (body, opts = {}) => [page(body, opts.step)],
    // On a slide a diagram appears a shape per click, in the order it was written.
    steps: (body) => spec.layout(body).shapes.length,
    downloads: [{ ext: 'svg', label: 'SVG image', mime: 'image/svg+xml', build: (b) => utf8('<?xml version="1.0" encoding="UTF-8"?>\n' + pageSvg(page(b)) + '\n') }, ...downloads],
    shortcuts: OUTLINE_KEYS,
    // A diagram is a kind of drawing, unless it says where it belongs.
    ...(app.group === undefined && app.under === undefined ? { group: 'Design', under: 'draw' } : {}),
    ...rest,
  });
}

/**
 * Define a page app: an app whose document is a few lines of text and whose
 * result is a web page (a site, a store, an FAQ). The page is what the
 * .html download is; the same editor as the diagram apps shows it live.
 */
export function definePage(app: Pick<AppDef, 'id' | 'name' | 'icon' | 'blurb'> & Partial<AppDef>, spec: DiagramSpec & { page(text: string, opts?: PageOpts): string }): AppDef {
  registerSpec(app.id, spec);
  // Its lines, as words: headings without their marks, an embedded document by its name.
  const lines = (body: string) =>
    body
      .split('\n')
      .map((l) => l.trim().replace(/^(#+|=+)\s*/, ''))
      .filter(Boolean)
      .map((l) => (l.startsWith('@@') ? `↗  ${resolve(l.slice(2)).title}` : l));
  // Its title is its "# Heading", unless it says otherwise.
  const title = app.title ?? h1;
  return defineApp({
    title,
    outline: (body) => lines(body).slice(0, 14),
    view: (body, opts = {}) => [listPage(title(body) || app.name, lines(body).slice(1, opts.step === undefined ? 40 : 1 + opts.step), opts.w)],
    // On a slide, its lines arrive one at a time.
    steps: (body) => Math.max(0, Math.min(40, lines(body).length - 1)),
    document: (body, ctx) => spec.page(body, { base: ctx.base }),
    shortcuts: OUTLINE_KEYS,
    ...app,
  });
}

/** The frame every generated page shares: a title, a description for link previews, and its own styles. */
export function htmlPage(title: string, about: string, css: string, body: string, head = ''): string {
  return `<!doctype html>
<html lang="en">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<title>${xml(title)}</title>
<meta name="description" content="${xml(about)}">
<meta property="og:type" content="website">
<meta property="og:title" content="${xml(title)}">
<meta property="og:description" content="${xml(about)}">
<meta name="twitter:card" content="summary">
<meta name="generator" content="TinyLittleOffice">${head}
<style>
*{box-sizing:border-box}body{margin:0;font:17px/1.6 ${FONT};color:#18181b;background:#fff}
a{color:#4338ca}h1,h2,h3{line-height:1.2;letter-spacing:-.01em}
.wrap{max-width:60rem;margin:0 auto;padding:0 1.25rem}
button,.btn{font:inherit;font-weight:600;border:0;border-radius:.6rem;padding:.6rem 1.1rem;background:#4f46e5;color:#fff;cursor:pointer;text-decoration:none;display:inline-block}
button:focus-visible,a:focus-visible,input:focus-visible,summary:focus-visible{outline:3px solid #a5b4fc;outline-offset:2px}
${css}
</style>
</head>
<body>
${body}
</body>
</html>
`;
}

/* ---------- layouts shared by more than one app ---------- */

interface Placed {
  node: Node;
  /** Position across the leaves (0, 1, 2...), fractional for parents. */
  across: number;
  parent: number;
}

/** Lay a forest out as a tree: leaves in order, each parent centred over its children. */
export function placeTree(roots: Node[]): Placed[] {
  const out: Placed[] = [];
  let leaf = 0;
  const walk = (node: Node, parent: number): number => {
    const at = out.length;
    out.push({ node, across: 0, parent });
    const kids = node.kids.map((k) => walk(k, at));
    out[at].across = kids.length ? (out[kids[0]].across + out[kids[kids.length - 1]].across) / 2 : leaf++;
    return at;
  };
  for (const r of roots) walk(r, -1);
  return out;
}

/** The "# Title" of a text, and its other lines. */
export const h1 = (body: string) => /^#\s+(.*)$/m.exec(body)?.[1].trim() ?? '';
export const rest = (body: string) => body.split('\n').map((l) => l.trim()).filter((l) => l && !l.startsWith('# '));
/** A value written into a page's script, where nothing in it can end the script. */
export const js = (v: unknown) => JSON.stringify(v).replace(/</g, '\\u003c');
/** A number from a text, the same every time: for shuffles that should not change as you watch. */
export const seed = (s: string) => [...s].reduce((h, c) => (Math.imul(h, 31) + c.charCodeAt(0)) | 0, 7) >>> 0;
