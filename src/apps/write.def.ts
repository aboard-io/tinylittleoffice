/** Write: what the shell knows about texts. Format: lib/richtext.ts. */
import { defineApp, utf8, xml, wrap, text, place, pageSvg, type DownloadContext, type Page, type Span } from '../kit/core.ts';
import { refPage, resolve } from '../kit/embed.ts';
import { ALIGN_NAMES, linkify, parseDoc, docText, type Block, type Run } from '../lib/richtext.ts';
import { ICON_SVG } from '../lib/icons.ts';

function rtfText(s: string): string {
  let out = '';
  for (let i = 0; i < s.length; i++) {
    const code = s.charCodeAt(i);
    const ch = s[i];
    if (ch === '\\' || ch === '{' || ch === '}') out += '\\' + ch;
    else if (ch === '\t') out += '\\tab ';
    else if (code < 32) continue;
    else if (code < 128) out += ch;
    // \uN takes a signed 16-bit number; astral characters go out as two surrogates.
    else out += `\\u${code > 32767 ? code - 65536 : code}?`;
  }
  return out;
}

function rtfRun(r: Run): string {
  const on = (r.b ? '\\b' : '') + (r.i ? '\\i' : '') + (r.u ? '\\ul' : '') + (r.s ? '\\strike' : '');
  // Web addresses in the text become real hyperlinks.
  const inner = (r.href ? [{ t: r.t, url: r.href }] : linkify(r.t))
    .map((p) => (p.url ? `{\\field{\\*\\fldinst HYPERLINK "${rtfText(p.url)}"}{\\fldrslt {\\ul\\cf1 ${rtfText(p.t)}}}}` : rtfText(p.t)))
    .join('');
  return on ? `{${on} ${inner}}` : inner;
}

export function docToRtf(body: string, ctx: DownloadContext = { created: null }): string {
  const out: string[] = ['{\\rtf1\\ansi\\ansicpg1252\\deff0\\uc1{\\fonttbl{\\f0\\fswiss\\fcharset0 Helvetica;}}{\\colortbl;\\red79\\green70\\blue229;}', '\\f0\\fs24'];
  const counts: number[] = [];
  for (const blk of parseDoc(body)) {
    const runs = blk.runs.map(rtfRun).join('');
    const d = blk.d ?? 0;
    if (blk.k === 'ol') counts[d] = (counts[d] ?? 0) + 1;
    counts.length = blk.k === 'ol' ? d + 1 : blk.k === 'ul' ? Math.min(counts.length, d + 1) : 0;
    const li = 720 + 360 * d;
    if (blk.k === 'e') {
      // An embedded document: a real hyperlink, then a few lines of what is in it.
      const p = resolve(blk.ref!);
      out.push(`{\\pard\\sb120\\sa60\\li360 {\\field{\\*\\fldinst HYPERLINK "${rtfText((ctx.base ?? '') + p.hash)}"}{\\fldrslt {\\ul\\cf1\\b ${rtfText(p.title)}}}} {\\i (${rtfText(p.def?.name ?? 'Document')})}\\par}`);
      for (const l of (p.def?.outline(p.body) ?? []).filter((l) => l !== p.title).slice(0, 4)) out.push(`{\\pard\\li720\\sa40\\fs20 ${rtfText(l)}\\par}`);
    } else if (blk.k === 'h1') out.push(`{\\pard\\sb240\\sa160\\b\\fs40 ${runs}\\par}`);
    else if (blk.k === 'h2') out.push(`{\\pard\\sb200\\sa120\\b\\fs30 ${runs}\\par}`);
    else if (blk.k === 'ul') out.push(`{\\pard\\li${li}\\fi-360\\sa60 \\bullet\\tab ${runs}\\par}`);
    else if (blk.k === 'ol') out.push(`{\\pard\\li${li}\\fi-360\\sa60 ${counts[d]}.\\tab ${runs}\\par}`);
    else out.push(`{\\pard\\sa160 ${runs}\\par}`);
  }
  return out.join('\n') + '\n}\n';
}

function htmlRun(r: Run): string {
  if (r.ic) return ICON_SVG[r.ic] ? `<svg class="ic" viewBox="0 0 24 24" width="1em" height="1em" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" role="img" aria-label="${xml(r.ic)}">${ICON_SVG[r.ic]}</svg>` : '';
  let s = (r.href ? [{ t: r.t, url: r.href }] : linkify(r.t))
    .map((p) => (p.url ? `<a href="${xml(p.url)}">${xml(p.t)}</a>` : xml(p.t)))
    .join('');
  if (r.h) s = `<mark>${s}</mark>`;
  if (r.s) s = `<s>${s}</s>`;
  if (r.u) s = `<u>${s}</u>`;
  if (r.i) s = `<em>${s}</em>`;
  if (r.b) s = `<strong>${s}</strong>`;
  return s;
}

/** The text as HTML: headings, paragraphs, properly nested lists, and embedded documents as figures. */
export function docToHtml(body: string, ctx: DownloadContext = { created: null }): string {
  const out: string[] = [];
  const open: string[] = []; // the lists we are inside, outermost first
  const closeTo = (depth: number) => {
    while (open.length > depth) out.push(`</li></${open.pop()}>`);
  };
  for (const blk of parseDoc(body)) {
    const inner = blk.runs.map(htmlRun).join('');
    if (blk.k === 'ul' || blk.k === 'ol') {
      const depth = (blk.d ?? 0) + 1;
      closeTo(depth);
      if (open.length === depth && open[depth - 1] !== blk.k) closeTo(depth - 1);
      if (open.length === depth) out.push('</li>');
      while (open.length < depth) {
        out.push(`<${blk.k}>`);
        open.push(blk.k);
        if (open.length < depth) out.push('<li>');
      }
      out.push(`<li${blk.a ? ` style="text-align:${ALIGN_NAMES[blk.a]}"` : ''}>${inner}`);
      continue;
    }
    closeTo(0);
    if (blk.k === 'e') {
      const p = resolve(blk.ref!);
      const page = refPage(blk.ref!);
      out.push(`<figure class="embed">${pageSvg(page, `role="img" aria-label="${xml(p.title)}"`)}<figcaption><a href="${xml((ctx.base ?? '') + p.hash)}">${xml(p.title)}</a> <small>${xml(p.def?.name ?? 'Document')}</small></figcaption></figure>`);
    } else out.push(`<${blk.k}${blk.a ? ` style="text-align:${ALIGN_NAMES[blk.a]}"` : ''}>${inner || '<br>'}</${blk.k}>`);
  }
  closeTo(0);
  return out.join('\n');
}

const title = (body: string) => {
  const first = parseDoc(body).find((b) => docText([b]).trim());
  return first ? docText([first]).trim() : '';
};

const W = 720;
const M = 56;
const PAGE_H = 1018; // the shape of a sheet of paper

/** The text laid out on pages. A text that fits on one page is exactly as tall as it needs to be. */
export function pages(body: string): Page[] {
  const bits: { h: number; svg: (y: number) => string }[] = [];
  const counts: number[] = [];
  for (const blk of parseDoc(body)) {
    const d = blk.d ?? 0;
    if (blk.k === 'ol') counts[d] = (counts[d] ?? 0) + 1;
    counts.length = blk.k === 'ol' ? d + 1 : blk.k === 'ul' ? Math.min(counts.length, d + 1) : 0;
    if (blk.k === 'e') {
      const page = refPage(blk.ref!);
      const h = Math.min(360, (page.h * (W - 2 * M)) / page.w);
      bits.push({ h: h + 24, svg: (y) => `<rect x="${M}" y="${y}" width="${W - 2 * M}" height="${h}" fill="#fff" stroke="#d4d4d8" rx="6"/>` + place(page, M, y, W - 2 * M, h) });
      continue;
    }
    const [px, bold, gap] = blk.k === 'h1' ? [30, true, 18] : blk.k === 'h2' ? [22, true, 14] : [16, false, blk.k === 'p' ? 12 : 5];
    const list = blk.k === 'ul' || blk.k === 'ol';
    const left = M + (list ? 26 * (d + 1) : 0);
    const spans: Span[] = blk.runs.flatMap((run) => (run.href ? [run] : linkify(run.t).map((p) => ({ ...run, t: p.t, link: !!p.url }))));
    const lines = wrap(spans.length ? spans : [{ t: '' }], W - M - left, px, bold);
    const lh = px * 1.45;
    const mark = blk.k === 'ul' ? '•' : blk.k === 'ol' ? `${counts[d]}.` : '';
    // Centred or right-aligned lines sit against the other edge (justified is drawn as left).
    const [tx, anchor] = blk.a === 'c' ? [(left + W - M) / 2, 'middle' as const] : blk.a === 'r' ? [W - M, 'end' as const] : [left, 'start' as const];
    bits.push({
      h: lines.length * lh + gap,
      svg: (y) => (mark ? text(left - 8, y + px, mark, { px, anchor: 'end' }) : '') + lines.map((l, i) => text(tx, y + px + i * lh, l, { px, bold, anchor })).join(''),
    });
  }
  const total = bits.reduce((a, b) => a + b.h, 0) + 2 * M;
  const out: Page[] = [];
  let svg = '';
  let y = M;
  for (const b of bits) {
    if (y + b.h > PAGE_H - M && y > M) {
      out.push({ w: W, h: PAGE_H, svg });
      svg = '';
      y = M;
    }
    svg += b.svg(y);
    y += b.h;
  }
  out.push({ w: W, h: total <= PAGE_H ? Math.max(160, total) : PAGE_H, svg });
  return out;
}

export default defineApp({
  id: 'write',
  group: '',
  name: 'Write',
  icon: 'write',
  blurb: 'A rich text editor: headings, bold, italic, nested lists, and other documents embedded in the text.',
  title,
  outline: (body) => parseDoc(body).map((b: Block) => (b.k === 'e' ? `↗  ${resolve(b.ref!).title}` : docText([b]).trim())).filter(Boolean),
  view: (body) => pages(body),
  html: docToHtml,
  prose: true,
  downloads: [{ ext: 'rtf', label: 'Rich Text', mime: 'application/rtf', build: (b, ctx) => utf8(docToRtf(b, ctx)) }],
  shortcuts: [
    { keys: 'Mod+B / Mod+I / Mod+U / Mod+Shift+H', does: 'Bold, italic, underline, highlight' },
    { keys: 'Mod+K', does: 'Link the selected words, or change the link the caret is in' },
    { keys: 'Mod+click', does: 'Follow a link (a click shows where it goes)' },
    { keys: 'Mod+1 / Mod+2 / Mod+0', does: 'Heading, subheading, paragraph' },
    { keys: 'Tab / Shift+Tab', does: 'Indent a list item, or bring it back out' },
    { keys: 'Backspace / Delete', does: 'Remove the selected embedded document' },
  ],
});
