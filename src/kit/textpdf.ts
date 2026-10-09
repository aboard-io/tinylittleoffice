/**
 * A PDF of words rather than of pictures: a title, sections, and bullets
 * under them, set in Helvetica (one of the fonts every PDF reader has, so
 * nothing is embedded), wrapped to the page, broken across Letter pages,
 * the words selectable, linked words clickable, each section a bookmark in
 * the reader's outline, the pages numbered. Helvetica's own widths are below, so lines break
 * where the reader will draw them. It writes Windows-1252: a character
 * outside it (beyond Western European letters) shows as "?".
 */
import type { Run } from '../lib/richtext.ts';

export interface TextBlock {
  /** 'title' at the top; 'h' a section, a bookmark; 'li' a bullet, `depth` levels in (0 the first); 'p' plain words. */
  kind: 'title' | 'h' | 'li' | 'p';
  runs: (Run & { sup?: boolean })[];
  depth?: number;
}

// Helvetica and Helvetica-Bold advance widths for " " to "~", in thousandths of the type size (Adobe's metrics).
const REG = [278, 278, 355, 556, 556, 889, 667, 191, 333, 333, 389, 584, 278, 333, 278, 278, 556, 556, 556, 556, 556, 556, 556, 556, 556, 556, 278, 278, 584, 584, 584, 556, 1015, 667, 667, 722, 722, 667, 611, 778, 722, 278, 500, 667, 556, 833, 722, 778, 667, 778, 722, 667, 611, 722, 667, 944, 667, 667, 611, 278, 278, 278, 469, 556, 333, 556, 556, 500, 556, 556, 278, 556, 556, 222, 222, 500, 222, 833, 556, 556, 556, 556, 333, 500, 278, 556, 500, 722, 500, 500, 500, 334, 260, 334, 584];
const BOLD = [278, 333, 474, 556, 556, 889, 722, 238, 333, 333, 389, 584, 278, 333, 278, 278, 556, 556, 556, 556, 556, 556, 556, 556, 556, 556, 333, 333, 584, 584, 584, 611, 975, 722, 722, 722, 722, 667, 611, 778, 722, 278, 556, 722, 611, 833, 722, 778, 667, 778, 722, 667, 611, 722, 667, 944, 667, 667, 611, 333, 278, 333, 584, 556, 333, 556, 611, 556, 611, 556, 333, 611, 611, 278, 278, 556, 278, 889, 611, 611, 611, 611, 389, 556, 333, 611, 556, 778, 556, 556, 500, 389, 280, 389, 584];
const SPECIAL: Record<string, number> = { '€': 0x80, '‚': 0x82, 'ƒ': 0x83, '„': 0x84, '…': 0x85, '†': 0x86, '‡': 0x87, 'ˆ': 0x88, '‰': 0x89, 'Š': 0x8a, '‹': 0x8b, 'Œ': 0x8c, 'Ž': 0x8e, '‘': 0x91, '’': 0x92, '“': 0x93, '”': 0x94, '•': 0x95, '–': 0x96, '—': 0x97, '˜': 0x98, '™': 0x99, 'š': 0x9a, '›': 0x9b, 'œ': 0x9c, 'ž': 0x9e, 'Ÿ': 0x9f };
const WIDE: Record<number, number> = { 0x95: 350, 0x96: 556, 0x97: 1000, 0x85: 1000, 0x91: 222, 0x92: 222, 0x93: 333, 0x94: 333, 0x99: 1000, 0x80: 556 };

/** A character as the byte Windows-1252 has for it; "?" where it has none. */
function byte(ch: string): number {
  const c = ch.codePointAt(0)!;
  if (c >= 32 && c < 127) return c;
  if (c >= 160 && c <= 255) return c;
  return SPECIAL[ch] ?? 63;
}
const encode = (s: string) => [...s].map(byte);
/** Width in points of text at a size, bold or not. */
export function measure(s: string, size: number, bold = false): number {
  const t = bold ? BOLD : REG;
  return (encode(s).reduce((a, b) => a + (b >= 32 && b < 127 ? t[b - 32] : (WIDE[b] ?? 556)), 0) * size) / 1000;
}
/** A string for a content stream: bytes, with "(", ")" and "\" escaped. */
const str = (s: string) => '(' + encode(s).map((b) => (b === 40 || b === 41 || b === 92 ? '\\' + String.fromCharCode(b) : String.fromCharCode(b))).join('') + ')';

const W = 612;
const H = 792;
const M = 60;
const LINK = '0.31 0.27 0.9';

interface Piece {
  t: string;
  b: boolean;
  i: boolean;
  href?: string;
  /** A footnote's number: small and raised. */
  sup?: boolean;
}
interface Line {
  pieces: { p: Piece; x: number; w: number }[];
  x: number;
  size: number;
  lead: number;
  before: number;
  bullet?: string;
  rule?: boolean;
  mark?: string;
}

/** The words of runs as pieces, a word (with its space) each, so lines break between them. */
function piecesOf(runs: (Run & { sup?: boolean })[], bold: boolean): Piece[] {
  return runs.flatMap<Piece>((r) => (r.ic ? [] : r.sup ? [{ t: r.t, b: false, i: false, sup: true }] : r.t.split(/(?<= )/).filter(Boolean).map((t) => ({ t, b: bold || !!r.b, i: !!r.i, href: r.href }))));
}

export function textPdf(blocks: TextBlock[], title = ''): Uint8Array {
  // Lay out: every block as lines, each knowing its type and where it starts.
  const lines: Line[] = [];
  const BULLETS = ['•', '–', '·'];
  for (const blk of blocks) {
    const size = blk.kind === 'title' ? 22 : blk.kind === 'h' ? 15 : 11;
    const lead = size * (blk.kind === 'title' ? 1.2 : 1.35);
    const indent = blk.kind === 'li' ? 16 + (blk.depth ?? 0) * 18 : 0;
    const x = M + indent;
    const room = W - M - x;
    const before = blk.kind === 'title' ? 0 : blk.kind === 'h' ? 16 : blk.kind === 'li' && !blk.depth ? 4 : 1;
    let cur: Line = { pieces: [], x, size, lead, before, bullet: blk.kind === 'li' ? BULLETS[Math.min(blk.depth ?? 0, 2)] : undefined, mark: blk.kind === 'h' ? blk.runs.map((r) => r.t).join('') : undefined };
    let at = 0;
    for (const p of piecesOf(blk.runs, blk.kind === 'title' || blk.kind === 'h')) {
      // A word too long for a line is cut where the line ends.
      let rest = p.t;
      const sz = p.sup ? size * 0.65 : size;
      while (rest) {
        const w = measure(rest.trimEnd(), sz, p.b);
        // (A note's mark stays with the word before it.)
        if (at + w <= room || (at === 0 && w <= room) || p.sup) {
          cur.pieces.push({ p: { ...p, t: rest }, x: at, w: measure(rest, sz, p.b) });
          at += measure(rest, sz, p.b);
          rest = '';
        } else if (at > 0) {
          lines.push(cur);
          cur = { pieces: [], x, size, lead, before: 0 };
          at = 0;
        } else {
          let n = rest.length;
          while (n > 1 && measure(rest.slice(0, n), size, p.b) > room) n--;
          cur.pieces.push({ p: { ...p, t: rest.slice(0, n) }, x: 0, w: measure(rest.slice(0, n), size, p.b) });
          lines.push(cur);
          cur = { pieces: [], x, size, lead, before: 0 };
          rest = rest.slice(n);
        }
      }
    }
    if (blk.kind === 'title') cur.rule = true;
    lines.push(cur);
  }

  // Pages: lines down each, a heading never left alone at the foot of one.
  const pages: { line: Line; y: number }[][] = [[]];
  let y = H - M;
  lines.forEach((l, i) => {
    const need = l.before + l.lead + (l.mark ? lines[i + 1]?.lead ?? 0 : 0);
    if (y - need < M && pages[pages.length - 1].length) {
      pages.push([]);
      y = H - M;
    } else y -= l.before;
    y -= l.lead;
    pages[pages.length - 1].push({ line: l, y });
    if (l.rule) y -= 10;
  });

  // Draw: each page a stream of text and lines, its links as annotations.
  const font = (b: boolean, i: boolean) => (b ? (i ? '/F4' : '/F2') : i ? '/F3' : '/F1');
  const drawn = pages.map((page, pi) => {
    let s = '';
    const links: { href: string; rect: number[] }[] = [];
    for (const { line, y } of page) {
      const base = y + line.lead - line.size * 1.05;
      if (line.bullet) s += `BT /F1 ${line.size} Tf 0 g 1 0 0 1 ${(line.x - 12).toFixed(2)} ${base.toFixed(2)} Tm ${str(line.bullet)} Tj ET\n`;
      line.pieces.forEach(({ p, x, w }, k) => {
        const px = line.x + x;
        s += `BT ${font(p.b, p.i)} ${p.sup ? (line.size * 0.65).toFixed(2) : line.size} Tf ${p.href ? LINK + ' rg' : '0 g'} 1 0 0 1 ${px.toFixed(2)} ${(p.sup ? base + line.size * 0.35 : base).toFixed(2)} Tm ${str(p.t)} Tj ET\n`;
        if (!p.href) return;
        // A link of several words is one underline and one place to click, as far as the line goes.
        const goesOn = line.pieces[k + 1]?.p.href === p.href;
        const tw = goesOn ? w : measure(p.t.trimEnd(), line.size, p.b);
        s += `${LINK} RG 0.6 w ${px.toFixed(2)} ${(base - 1.5).toFixed(2)} m ${(px + tw).toFixed(2)} ${(base - 1.5).toFixed(2)} l S\n`;
        const last = links[links.length - 1];
        if (k > 0 && line.pieces[k - 1].p.href === p.href && last) last.rect[2] = px + tw;
        else links.push({ href: p.href, rect: [px, base - 3, px + tw, base + line.size] });
      });
      if (line.rule) s += `0.31 0.27 0.9 RG 2 w ${M} ${(base - 10).toFixed(2)} m ${W - M} ${(base - 10).toFixed(2)} l S\n`;
    }
    // Page numbers, when there is more than one page, small and grey at the foot.
    if (pages.length > 1) {
      const num = `${pi + 1} / ${pages.length}`;
      s += `BT /F1 9 Tf 0.45 g ${(W / 2 - measure(num, 9) / 2).toFixed(2)} ${(M / 2).toFixed(2)} Td ${str(num)} Tj ET\n`;
    }
    return { s, links };
  });

  // The file. Objects: 1 catalog, 2 pages, 3 info, 4-7 fonts, 8 outlines, then a page, its contents and its links for each page, then a bookmark for each section.
  const objs: string[] = [];
  const set = (n: number, body: string) => (objs[n] = body);
  const fonts = ['Helvetica', 'Helvetica-Bold', 'Helvetica-Oblique', 'Helvetica-BoldOblique'];
  fonts.forEach((f, i) => set(4 + i, `<< /Type /Font /Subtype /Type1 /BaseFont /${f} /Encoding /WinAnsiEncoding >>`));
  let n = 9;
  const pageIds: number[] = [];
  drawn.forEach((d) => {
    const page = n++;
    const content = n++;
    const annots = d.links.map((l) => {
      const id = n++;
      set(id, `<< /Type /Annot /Subtype /Link /Rect [${l.rect.map((v) => v.toFixed(2)).join(' ')}] /Border [0 0 0] /A << /S /URI /URI ${str(l.href)} >> >>`);
      return `${id} 0 R`;
    });
    set(page, `<< /Type /Page /Parent 2 0 R /MediaBox [0 0 ${W} ${H}] /Resources << /Font << /F1 4 0 R /F2 5 0 R /F3 6 0 R /F4 7 0 R >> >> /Contents ${content} 0 R${annots.length ? ` /Annots [${annots.join(' ')}]` : ''} >>`);
    set(content, `<< /Length ${d.s.length} >>\nstream\n${d.s}endstream`);
    pageIds.push(page);
  });
  // Bookmarks: a section each, opening its page where it starts.
  const marks = pages.flatMap((page, pi) => page.filter(({ line }) => line.mark).map(({ line, y }) => ({ title: line.mark!, page: pageIds[pi], y: y + line.lead + line.before })));
  const markIds = marks.map(() => n++);
  marks.forEach((m, i) => set(markIds[i], `<< /Title ${hexText(m.title)} /Parent 8 0 R${i ? ` /Prev ${markIds[i - 1]} 0 R` : ''}${i < marks.length - 1 ? ` /Next ${markIds[i + 1]} 0 R` : ''} /Dest [${m.page} 0 R /XYZ 0 ${Math.min(H, m.y).toFixed(0)} 0] >>`));
  set(8, marks.length ? `<< /Type /Outlines /First ${markIds[0]} 0 R /Last ${markIds[markIds.length - 1]} 0 R /Count ${marks.length} >>` : '<< /Type /Outlines /Count 0 >>');
  set(1, `<< /Type /Catalog /Pages 2 0 R /Outlines 8 0 R${marks.length ? ' /PageMode /UseOutlines' : ''} >>`);
  set(2, `<< /Type /Pages /Kids [${pageIds.map((p) => `${p} 0 R`).join(' ')}] /Count ${pageIds.length} >>`);
  set(3, `<< /Title ${hexText(title)} /Producer (TinyLittleOffice) >>`);

  // Written out byte for byte (the streams hold Windows-1252, not UTF-8), with the table of where each object starts.
  let out = '%PDF-1.4\n%âãÏÓ\n';
  const offsets: number[] = [];
  for (let i = 1; i < objs.length; i++) {
    offsets[i] = out.length;
    out += `${i} 0 obj\n${objs[i]}\nendobj\n`;
  }
  const xref = out.length;
  out += `xref\n0 ${objs.length}\n0000000000 65535 f \n${offsets.slice(1).map((o) => String(o).padStart(10, '0') + ' 00000 n \n').join('')}`;
  out += `trailer\n<< /Size ${objs.length} /Root 1 0 R /Info 3 0 R >>\nstartxref\n${xref}\n%%EOF\n`;
  return Uint8Array.from(out, (c) => c.charCodeAt(0) & 0xff);
}

/** Text for the reader's own lists (bookmarks, the title): UTF-16, so any character shows. */
const hexText = (s: string) => '<FEFF' + [...s].map((c) => { const u = c.codePointAt(0)!; return u > 0xffff ? (((u - 0x10000) >> 10) + 0xd800).toString(16).padStart(4, '0') + (((u - 0x10000) & 0x3ff) + 0xdc00).toString(16).padStart(4, '0') : u.toString(16).padStart(4, '0'); }).join('') + '>';
