/** Write: what the shell knows about texts. Format: lib/richtext.ts, and docs/tlo.md. */
import { defineApp, utf8, xml, wrap, text, place, pageSvg, MUTED, type DownloadContext, type Page, type Span } from '../kit/core.ts';
import { linkToRef, refPage, resolve } from '../kit/embed.ts';
import { ALIGN_NAMES, linkify, listNumbers, parseDoc, runLinks, serializeDoc, docText, type Block, type Run } from '../lib/richtext.ts';
import { refFence, parse, write, takeHead } from '../lib/tlo.ts';
import { zip, XML_HEAD } from '../kit/zip.ts';
import { ICON_SVG } from '../lib/icons.ts';
import { parseWeb } from '../lib/embeds.ts';

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
  const inner = runLinks(r)
    .map((p) => (p.url ? `{\\field{\\*\\fldinst HYPERLINK "${rtfText(p.url)}"}{\\fldrslt {\\ul\\cf1 ${rtfText(p.t)}}}}` : rtfText(p.t)))
    .join('');
  return on ? `{${on} ${inner}}` : inner;
}

export function docToRtf(body: string, ctx: DownloadContext = { created: null }): string {
  const out: string[] = ['{\\rtf1\\ansi\\ansicpg1252\\deff0\\uc1{\\fonttbl{\\f0\\fswiss\\fcharset0 Helvetica;}}{\\colortbl;\\red79\\green70\\blue229;}', '\\f0\\fs24'];
  const number = listNumbers();
  for (const blk of parseDoc(body)) {
    const runs = blk.runs.map(rtfRun).join('');
    const n = number(blk);
    const li = 720 + 360 * (blk.d ?? 0);
    if (blk.k === 'e') {
      // An embedded document: a real hyperlink, then a few lines of what is in it.
      const p = resolve(blk.ref!);
      out.push(`{\\pard\\sb120\\sa60\\li360 {\\field{\\*\\fldinst HYPERLINK "${rtfText((ctx.base ?? '') + p.hash)}"}{\\fldrslt {\\ul\\cf1\\b ${rtfText(p.title)}}}} {\\i (${rtfText(p.def?.name ?? 'Document')})}\\par}`);
      for (const l of (p.def?.outline(p.body) ?? []).filter((l) => l !== p.title).slice(0, 4)) out.push(`{\\pard\\li720\\sa40\\fs20 ${rtfText(l)}\\par}`);
    } else if (blk.k === 'title') out.push(`{\\pard\\sa240\\b\\fs64 ${runs}\\par}`);
    else if (blk.k === 'h1') out.push(`{\\pard\\sb240\\sa160\\b\\fs40 ${runs}\\par}`);
    else if (blk.k === 'h2') out.push(`{\\pard\\sb200\\sa120\\b\\fs30 ${runs}\\par}`);
    else if (blk.k === 'ul') out.push(`{\\pard\\li${li}\\fi-360\\sa60 \\bullet\\tab ${runs}\\par}`);
    else if (blk.k === 'ol') out.push(`{\\pard\\li${li}\\fi-360\\sa60 ${n}.\\tab ${runs}\\par}`);
    else out.push(`{\\pard\\sa160 ${runs}\\par}`);
  }
  return out.join('\n') + '\n}\n';
}

/* ---------- Word ---------- */

const W_NS = 'xmlns:w="http://schemas.openxmlformats.org/wordprocessingml/2006/main" xmlns:r="http://schemas.openxmlformats.org/officeDocument/2006/relationships"';
const REL_NS = 'http://schemas.openxmlformats.org/officeDocument/2006/relationships';
/** Paper in twentieths of a point, and the margin: Letter with an inch, A4 with 25 mm. */
const TWIPS: Record<Paper, { w: number; h: number; m: number }> = { letter: { w: 12240, h: 15840, m: 1440 }, a4: { w: 11906, h: 16838, m: 1417 } };

/** A run as WordprocessingML: its marks as run properties; a link a hyperlink, through a relationship the caller gives out. */
function docxRun(r: Run, rel: (url: string) => string): string {
  if (r.ic) return '';
  const props = (r.b ? '<w:b/>' : '') + (r.i ? '<w:i/>' : '') + (r.u ? '<w:u w:val="single"/>' : '') + (r.s ? '<w:strike/>' : '') + (r.h ? '<w:highlight w:val="yellow"/>' : '');
  const run = (t: string, extra = '') => `<w:r>${props || extra ? `<w:rPr>${extra}${props}</w:rPr>` : ''}${t.split('\n').map((line) => `<w:t xml:space="preserve">${xml(line)}</w:t>`).join('<w:br/>')}</w:r>`;
  return runLinks(r)
    .map((p) => (p.url ? `<w:hyperlink r:id="${rel(p.url)}">${run(p.t, '<w:rStyle w:val="Hyperlink"/>')}</w:hyperlink>` : run(p.t)))
    .join('');
}

/**
 * The text as a Word document (.docx): the smallest WordprocessingML that
 * Word, LibreOffice and Pages all open. Paragraphs, the title and headings
 * as styles, bold, italic, underline, strike and highlight, lists bulleted
 * or numbered to three levels (each numbered list starting at 1), links,
 * alignment, the paper from the header; an embedded document a link to it;
 * a picture from the web left out.
 */
export function docToDocx(body: string, ctx: DownloadContext = { created: null }): Uint8Array {
  const rels: string[] = [];
  const rel = (url: string) => {
    const i = rels.indexOf(url);
    return `rId${(i < 0 ? rels.push(url) : i + 1) + 2}`;
  };
  // Every numbered list is a numbering instance of its own, so each starts again at 1.
  const nums: string[] = [];
  let numbered = 0;
  let prev = '';
  const paras: string[] = [];
  for (const blk of parseDoc(body)) {
    const jc = blk.a ? `<w:jc w:val="${blk.a === 'c' ? 'center' : blk.a === 'r' ? 'right' : 'both'}"/>` : '';
    const last = prev;
    prev = blk.k;
    if (blk.k === 'e') {
      const p = resolve(blk.ref!);
      const url = (ctx.base ?? '') + p.hash;
      paras.push(`<w:p><w:hyperlink r:id="${rel(url)}"><w:r><w:rPr><w:rStyle w:val="Hyperlink"/><w:b/></w:rPr><w:t xml:space="preserve">${xml(p.title)}</w:t></w:r></w:hyperlink><w:r><w:rPr><w:i/></w:rPr><w:t xml:space="preserve"> (${xml(p.def?.name ?? 'Document')})</w:t></w:r></w:p>`);
      continue;
    }
    const runs = blk.runs.map((r) => docxRun(r, rel)).join('');
    if (blk.k === 'ul' || blk.k === 'ol') {
      if (blk.k === 'ol' && last !== 'ol') nums.push(`<w:num w:numId="${(numbered = nums.length + 2)}"><w:abstractNumId w:val="1"/><w:lvlOverride w:ilvl="0"><w:startOverride w:val="1"/></w:lvlOverride></w:num>`);
      paras.push(`<w:p><w:pPr><w:pStyle w:val="ListParagraph"/><w:numPr><w:ilvl w:val="${Math.min(blk.d ?? 0, 2)}"/><w:numId w:val="${blk.k === 'ul' ? 1 : numbered}"/></w:numPr>${jc}</w:pPr>${runs}</w:p>`);
      continue;
    }
    const style = blk.k === 'title' ? 'Title' : blk.k === 'h1' ? 'Heading1' : blk.k === 'h2' ? 'Heading2' : '';
    paras.push(`<w:p>${style || jc ? `<w:pPr>${style ? `<w:pStyle w:val="${style}"/>` : ''}${jc}</w:pPr>` : ''}${runs}</w:p>`);
  }
  const paper = TWIPS[paperOf(body)];
  const sect = `<w:sectPr><w:pgSz w:w="${paper.w}" w:h="${paper.h}"/><w:pgMar w:top="${paper.m}" w:right="${paper.m}" w:bottom="${paper.m}" w:left="${paper.m}" w:header="720" w:footer="720" w:gutter="0"/></w:sectPr>`;
  const bullets = ['\u2022', '\u2013', '\u00b7'];
  const level = (i: number, kind: 'bullet' | 'decimal') =>
    `<w:lvl w:ilvl="${i}"><w:start w:val="1"/><w:numFmt w:val="${kind}"/><w:lvlText w:val="${kind === 'bullet' ? bullets[i] : `%${i + 1}.`}"/><w:lvlJc w:val="left"/><w:pPr><w:ind w:left="${720 * (i + 1)}" w:hanging="360"/></w:pPr>${kind === 'bullet' ? '<w:rPr><w:rFonts w:ascii="Arial" w:hAnsi="Arial"/></w:rPr>' : ''}</w:lvl>`;
  const levels = (kind: 'bullet' | 'decimal') => [0, 1, 2].map((i) => level(i, kind)).join('');
  const heading = (id: string, name: string, size: number, before: number) => `<w:style w:type="paragraph" w:styleId="${id}"><w:name w:val="${name}"/><w:basedOn w:val="Normal"/><w:next w:val="Normal"/><w:qFormat/><w:pPr><w:keepNext/><w:spacing w:before="${before}" w:after="120"/><w:outlineLvl w:val="${id === 'Title' ? 0 : id === 'Heading1' ? 0 : 1}"/></w:pPr><w:rPr><w:b/><w:sz w:val="${size}"/><w:szCs w:val="${size}"/></w:rPr></w:style>`;
  return zip(
    {
      '[Content_Types].xml': `${XML_HEAD}<Types xmlns="http://schemas.openxmlformats.org/package/2006/content-types"><Default Extension="rels" ContentType="application/vnd.openxmlformats-package.relationships+xml"/><Default Extension="xml" ContentType="application/xml"/><Override PartName="/word/document.xml" ContentType="application/vnd.openxmlformats-officedocument.wordprocessingml.document.main+xml"/><Override PartName="/word/styles.xml" ContentType="application/vnd.openxmlformats-officedocument.wordprocessingml.styles+xml"/><Override PartName="/word/numbering.xml" ContentType="application/vnd.openxmlformats-officedocument.wordprocessingml.numbering+xml"/></Types>`,
      '_rels/.rels': `${XML_HEAD}<Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships"><Relationship Id="rId1" Type="${REL_NS}/officeDocument" Target="word/document.xml"/></Relationships>`,
      'word/_rels/document.xml.rels': `${XML_HEAD}<Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships"><Relationship Id="rId1" Type="${REL_NS}/styles" Target="styles.xml"/><Relationship Id="rId2" Type="${REL_NS}/numbering" Target="numbering.xml"/>${rels.map((url, i) => `<Relationship Id="rId${i + 3}" Type="${REL_NS}/hyperlink" Target="${xml(url)}" TargetMode="External"/>`).join('')}</Relationships>`,
      'word/styles.xml': `${XML_HEAD}<w:styles ${W_NS}><w:docDefaults><w:rPrDefault><w:rPr><w:rFonts w:ascii="IBM Plex Sans" w:hAnsi="IBM Plex Sans" w:cs="IBM Plex Sans"/><w:sz w:val="22"/><w:szCs w:val="22"/><w:lang w:val="en-US"/></w:rPr></w:rPrDefault><w:pPrDefault><w:pPr><w:spacing w:after="160" w:line="300" w:lineRule="auto"/></w:pPr></w:pPrDefault></w:docDefaults><w:style w:type="paragraph" w:default="1" w:styleId="Normal"><w:name w:val="Normal"/><w:qFormat/></w:style>${heading('Title', 'Title', 52, 0)}${heading('Heading1', 'heading 1', 32, 360)}${heading('Heading2', 'heading 2', 26, 240)}<w:style w:type="paragraph" w:styleId="ListParagraph"><w:name w:val="List Paragraph"/><w:basedOn w:val="Normal"/><w:qFormat/><w:pPr><w:spacing w:after="60"/><w:contextualSpacing/></w:pPr></w:style><w:style w:type="character" w:styleId="Hyperlink"><w:name w:val="Hyperlink"/><w:rPr><w:color w:val="4F46E5"/><w:u w:val="single"/></w:rPr></w:style></w:styles>`,
      'word/numbering.xml': `${XML_HEAD}<w:numbering ${W_NS}><w:abstractNum w:abstractNumId="0"><w:multiLevelType w:val="hybridMultilevel"/>${levels('bullet')}</w:abstractNum><w:abstractNum w:abstractNumId="1"><w:multiLevelType w:val="hybridMultilevel"/>${levels('decimal')}</w:abstractNum><w:num w:numId="1"><w:abstractNumId w:val="0"/></w:num>${nums.join('')}</w:numbering>`,
      'word/document.xml': `${XML_HEAD}<w:document ${W_NS}><w:body>${paras.join('')}${sect}</w:body></w:document>`,
    },
    ctx.created,
  );
}

/**
 * A run's words as HTML, with their marks and links. The editor names bold
 * and italic as the browser's own commands write them, <b> and <i>.
 */
export function markedHtml(r: Run, bold = 'strong', italic = 'em'): string {
  let s = runLinks(r)
    .map((p) => (p.url ? `<a href="${xml(p.url)}">${xml(p.t)}</a>` : xml(p.t)))
    .join('');
  if (r.h) s = `<mark>${s}</mark>`;
  if (r.s) s = `<s>${s}</s>`;
  if (r.u) s = `<u>${s}</u>`;
  if (r.i) s = `<${italic}>${s}</${italic}>`;
  if (r.b) s = `<${bold}>${s}</${bold}>`;
  return s;
}

function htmlRun(r: Run): string {
  if (r.ic) return ICON_SVG[r.ic] ? `<svg class="ic" viewBox="0 0 24 24" width="1em" height="1em" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" role="img" aria-label="${xml(r.ic)}">${ICON_SVG[r.ic]}</svg>` : '';
  return markedHtml(r);
}

/**
 * Blocks as pieces of HTML, the list items properly nested: item(blk) is
 * what a list item holds, other(blk) the whole of any other block.
 */
export function blocksHtml(blocks: Block[], item: (blk: Block) => string, other: (blk: Block) => string): string[] {
  const out: string[] = [];
  const open: string[] = []; // the lists we are inside, outermost first
  const closeTo = (depth: number) => {
    while (open.length > depth) out.push(`</li></${open.pop()}>`);
  };
  for (const blk of blocks) {
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
      out.push(`<li${blk.a ? ` style="text-align:${ALIGN_NAMES[blk.a]}"` : ''}>${item(blk)}`);
      continue;
    }
    closeTo(0);
    out.push(other(blk));
  }
  closeTo(0);
  return out;
}

/** The text as HTML: headings, paragraphs, properly nested lists, and embedded documents as figures. */
export function docToHtml(body: string, ctx: DownloadContext = { created: null }): string {
  const inner = (blk: Block) => blk.runs.map(htmlRun).join('');
  return blocksHtml(parseDoc(body), inner, (blk) => {
    if (blk.k === 'e' && blk.ref!.startsWith('web\n')) {
      const { url, alt, embed } = parseWeb(refFence(blk.ref!).body);
      const page = refPage(blk.ref!);
      return `<figure class="embed"><a href="${xml(url)}" rel="noopener">${pageSvg(page, `role="img" aria-label="${xml(alt || embed?.title || url)}"`)}</a><figcaption>${xml(embed ? `${embed.provider}: ${alt || embed.title}` : url)}</figcaption></figure>`;
    }
    if (blk.k === 'e') {
      const p = resolve(blk.ref!);
      const page = refPage(blk.ref!);
      return `<figure class="embed">${pageSvg(page, `role="img" aria-label="${xml(p.title)}"`)}<figcaption><a href="${xml((ctx.base ?? '') + p.hash)}">${xml(p.title)}</a> <small>${xml(p.def?.name ?? 'Document')}</small></figcaption></figure>`;
    }
    // The title is the page's own first heading, set large.
    const tag = blk.k === 'title' ? 'h1' : blk.k;
    const style = [blk.k === 'title' ? 'font-size:2.8em;line-height:1.1;letter-spacing:-0.02em' : '', blk.a ? `text-align:${ALIGN_NAMES[blk.a]}` : ''].filter(Boolean).join(';');
    return `<${tag}${blk.k === 'title' ? ' class="title"' : ''}${style ? ` style="${style}"` : ''}>${inner(blk) || '<br>'}</${tag}>`;
  }).join('\n');
}

/**
 * Markdown as anyone writes it, made a text: what a text cannot hold is
 * kept as words, and a TinyLittleOffice link alone on a line (bare, as an
 * image or as a link) becomes the document it holds.
 */
export function readText(md: string): string {
  const doc = parse(md);
  doc.blocks = doc.blocks.map((b) => {
    const ref = b.k === 'img' ? linkToRef(b.url) : b.k === 'p' ? linkToRef(b.text.replace(/^\[[^\]]*\]\((.*)\)$/, '$1')) : null;
    return ref ? refFence(ref) : b;
  });
  return serializeDoc(parseDoc(write({ head: {}, blocks: doc.blocks })));
}

const title = (body: string) => {
  // A title, if it has one; else its first words.
  const blocks = parseDoc(body);
  const first = blocks.find((b) => b.k === 'title' && docText([b]).trim()) ?? blocks.find((b) => docText([b]).trim());
  return first ? docText([first]).trim() : '';
};

/** The paper a text prints on: its size in px (96 to the inch) and its margin, an inch or 25 mm. */
export const PAPERS = { letter: { name: 'Letter', w: 816, h: 1056, m: 96, size: 'letter', margin: '1in' }, a4: { name: 'A4', w: 794, h: 1123, m: 94, size: 'A4', margin: '25mm' } } as const;
export type Paper = keyof typeof PAPERS;
/** The paper where the reader is: letter in North America, A4 nearly everywhere else (and where there is no reader: a program). */
export const defaultPaper = (): Paper => (typeof navigator === 'undefined' || /-(US|CA|MX|PR|PH|CL|CO|VE|GT|CR|PA|DO)$/i.test(navigator.language) ? 'letter' : 'a4');
/** The paper the text says, in its header ("paper: a4"), or the reader's. */
export const paperOf = (body: string): Paper => {
  const [head] = takeHead(body, ['paper']);
  return head.paper && head.paper in PAPERS ? (head.paper as Paper) : defaultPaper();
};

/** The text laid out on pages of its paper. A text that fits on one page is exactly as tall as it needs to be. */
export function pages(body: string): Page[] {
  const { w: W, h: PAGE_H, m: M } = PAPERS[paperOf(body)];
  // Each block as a strip: its height, how to draw it at a y, whether it must stay with the strip after it (a heading), and its first line's height.
  const bits: { h: number; svg: (y: number) => string; keep?: boolean; first: number }[] = [];
  const number = listNumbers();
  for (const blk of parseDoc(body)) {
    const d = blk.d ?? 0;
    const n = number(blk);
    if (blk.k === 'e') {
      const page = refPage(blk.ref!);
      const h = Math.min(360, (page.h * (W - 2 * M)) / page.w);
      bits.push({ h: h + 24, first: h + 24, svg: (y) => `<rect x="${M}" y="${y}" width="${W - 2 * M}" height="${h}" fill="#fff" stroke="#d4d4d8" rx="6"/>` + place(page, M, y, W - 2 * M, h) });
      continue;
    }
    const [px, bold, gap] = blk.k === 'title' ? [48, true, 24] : blk.k === 'h1' ? [30, true, 18] : blk.k === 'h2' ? [22, true, 14] : [16, false, blk.k === 'p' ? 12 : 5];
    const list = blk.k === 'ul' || blk.k === 'ol';
    const left = M + (list ? 26 * (d + 1) : 0);
    const spans: Span[] = blk.runs.flatMap((run) => (run.href ? [run] : linkify(run.t).map((p) => ({ ...run, t: p.t, link: !!p.url }))));
    const lines = wrap(spans.length ? spans : [{ t: '' }], W - M - left, px, bold);
    const lh = px * 1.45;
    const mark = blk.k === 'ul' ? '•' : blk.k === 'ol' ? `${n}.` : '';
    // Centred or right-aligned lines sit against the other edge (justified is drawn as left).
    const [tx, anchor] = blk.a === 'c' ? [(left + W - M) / 2, 'middle' as const] : blk.a === 'r' ? [W - M, 'end' as const] : [left, 'start' as const];
    bits.push({
      h: lines.length * lh + gap,
      first: lh + gap,
      keep: blk.k === 'title' || blk.k === 'h1' || blk.k === 'h2',
      svg: (y) => (mark ? text(left - 8, y + px, mark, { px, anchor: 'end' }) : '') + lines.map((l, i) => text(tx, y + px + i * lh, l, { px, bold, anchor })).join(''),
    });
  }
  const total = bits.reduce((a, b) => a + b.h, 0) + 2 * M;
  const out: Page[] = [];
  let svg = '';
  let y = M;
  bits.forEach((b, i) => {
    // A heading goes to the next page rather than sit alone at the foot of this one.
    const need = b.keep ? b.h + (bits[i + 1]?.first ?? 0) : b.h;
    if (y + need > PAGE_H - M && y > M) {
      out.push({ w: W, h: PAGE_H, svg });
      svg = '';
      y = M;
    }
    svg += b.svg(y);
    y += b.h;
  });
  out.push({ w: W, h: total <= PAGE_H ? Math.max(160, total) : PAGE_H, svg });
  // More than one page: each numbered at its foot, in the margin.
  return out.length > 1 ? out.map((p, i) => ({ ...p, svg: p.svg + text(W / 2, PAGE_H - M / 2 + 4, String(i + 1), { px: 11, fill: MUTED, anchor: 'middle' }) })) : out;
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
  read: readText,
  prose: true,
  paper: (body) => ({ size: PAPERS[paperOf(body)].size, margin: PAPERS[paperOf(body)].margin }),
  downloads: [
    { ext: 'docx', label: 'Word', mime: 'application/vnd.openxmlformats-officedocument.wordprocessingml.document', build: docToDocx },
    { ext: 'rtf', label: 'Rich Text', mime: 'application/rtf', build: (b, ctx) => utf8(docToRtf(b, ctx)) },
  ],
  shortcuts: [
    { keys: 'Mod+B / Mod+I / Mod+U / Mod+Shift+H', does: 'Bold, italic, underline, highlight' },
    { keys: 'Mod+K', does: 'Link the selected words, or change the link the caret is in' },
    { keys: 'Mod+click', does: 'Follow a link (a click shows where it goes)' },
    { keys: 'Mod+1 / Mod+2 / Mod+0', does: 'Heading, subheading, paragraph' },
    { keys: 'Tab / Shift+Tab', does: 'Indent a list item, or bring it back out' },
    { keys: 'Backspace / Delete', does: 'Remove the selected embedded document' },
  ],
});
