/**
 * Download views: every app's document rendered as a file other software
 * opens. A view is addressed by putting its extension after the app name in
 * the URL ("#/v1/deck.pptx/<payload>"); the shell downloads it on arrival.
 *
 *   sheet  .xlsx .csv         write  .rtf  .html
 *   deck   .pptx              draw   .svg
 *   cal    .ics               todo   .md
 *   board  .md   .csv         gantt  .csv
 *   trip   .gpx  .geojson     tune   .mid
 *   anim   .svg (animated)
 *
 * Every app also has a .png view, a card for sharing; the shell draws that
 * one from cardSvg() because it needs a canvas.
 *
 * Everything here is pure (strings and bytes in, bytes out) so it runs under
 * node --test. The one thing a browser must supply is the PNG for each deck
 * icon, passed in through ExportContext.
 */
import { strToU8, zipSync, type Zippable } from 'fflate';
import { COLS, ROWS, evaluateGrid, formatValue, parseGrid, rcToRef } from './formula.ts';
import { parseDoc, docText, type Block, type Run } from './richtext.ts';
import { parseDeck } from './deckmodel.ts';
import { COLORS, paint, parseDrawing, W, H, type Shape } from './drawmodel.ts';
import { parseCalendar, EPOCH_DAY, EPOCH_MS } from './calmodel.ts';
import { dayToYmd, pad2, ymdString } from './tz.ts';
import { parseTodos } from './todomodel.ts';
import { parseBoard } from './boardmodel.ts';
import { parseGantt } from './ganttmodel.ts';
import { parseTrip, routeKm, formatKm } from './tripmodel.ts';
import { parseTune, LOW, STEPS } from './tunemodel.ts';
import { parseAnim, stateAt, FPS, W as STAGE_W, H as STAGE_H, type Item } from './animmodel.ts';
import { previewOf, svgDataUri } from './embed.ts';

export interface ExportContext {
  /** Creation time of the document in ms, if known. */
  created: number | null;
  /** PNG bytes for deck icons, keyed by icon id. Icons without one are left out. */
  icons?: Record<string, Uint8Array>;
  /** Inner SVG markup (24 by 24, stroked) for icons, keyed by icon id. */
  iconSvg?: Record<string, string>;
  /** Address of the site ("https://host/path/"), so links in a file point somewhere. */
  base?: string;
}

export interface ExportFormat {
  ext: string;
  label: string;
  mime: string;
  build(body: string, ctx: ExportContext): Uint8Array;
}

const xml = (s: string) => s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
/** XML 1.0 cannot carry most control characters at all. */
const clean = (s: string) => s.replace(/[\u0000-\u0008\u000b\u000c\u000e-\u001f]/g, '');
const x = (s: string) => xml(clean(s));
const XML_HEAD = '<?xml version="1.0" encoding="UTF-8" standalone="yes"?>\n';

function zip(files: Record<string, string | Uint8Array>, created: number | null): Uint8Array {
  const tree: Zippable = {};
  for (const [path, data] of Object.entries(files)) tree[path] = typeof data === 'string' ? strToU8(data) : data;
  // A fixed timestamp keeps the same document producing the same bytes.
  return zipSync(tree, { level: 9, mtime: new Date(created ?? Date.UTC(2020, 0, 1)) });
}

/* ---------- sheet ---------- */

/** The used part of the grid: raw text and computed values, trailing blanks dropped. */
function usedGrid(body: string) {
  const grid = parseGrid(body);
  const values = evaluateGrid(grid);
  let rows = 0;
  let cols = 0;
  for (let r = 0; r < ROWS; r++)
    for (let c = 0; c < COLS; c++)
      if (grid[r][c] !== '') {
        rows = Math.max(rows, r + 1);
        cols = Math.max(cols, c + 1);
      }
  return { grid, values, rows, cols };
}

export function sheetToCsv(body: string): string {
  const { values, rows, cols } = usedGrid(body);
  const lines: string[] = [];
  for (let r = 0; r < rows; r++) {
    const cells: string[] = [];
    for (let c = 0; c < cols; c++) {
      const s = formatValue(values[r][c]);
      cells.push(/[",\r\n]/.test(s) || s !== s.trim() ? `"${s.replace(/"/g, '""')}"` : s);
    }
    lines.push(cells.join(','));
  }
  return lines.join('\r\n') + (lines.length ? '\r\n' : '');
}

/** Our formula dialect in Excel's: the only difference is the name of AVG. */
export function toExcelFormula(raw: string): string {
  return raw.slice(1).toUpperCase().replace(/\bAVG\s*\(/g, 'AVERAGE(');
}

export function sheetToXlsx(body: string, ctx: ExportContext): Uint8Array {
  const { grid, values, rows, cols } = usedGrid(body);
  let data = '';
  for (let r = 0; r < rows; r++) {
    let cells = '';
    for (let c = 0; c < cols; c++) {
      const raw = grid[r][c];
      if (raw === '') continue;
      const ref = rcToRef(r, c);
      const v = values[r][c];
      if (raw.startsWith('=')) {
        // Excel recalculates on open; the cached value is for everything else.
        const f = `<f>${x(toExcelFormula(raw))}</f>`;
        cells += typeof v === 'number' && isFinite(v) ? `<c r="${ref}">${f}<v>${v}</v></c>` : `<c r="${ref}" t="str">${f}<v>${x(formatValue(v))}</v></c>`;
      } else if (typeof v === 'number' && isFinite(v)) {
        cells += `<c r="${ref}"><v>${v}</v></c>`;
      } else {
        cells += `<c r="${ref}" t="inlineStr"><is><t xml:space="preserve">${x(raw)}</t></is></c>`;
      }
    }
    data += `<row r="${r + 1}">${cells}</row>`;
  }
  const ns = 'http://schemas.openxmlformats.org/spreadsheetml/2006/main';
  const rel = 'http://schemas.openxmlformats.org/officeDocument/2006/relationships';
  return zip(
    {
      '[Content_Types].xml': `${XML_HEAD}<Types xmlns="http://schemas.openxmlformats.org/package/2006/content-types"><Default Extension="rels" ContentType="application/vnd.openxmlformats-package.relationships+xml"/><Default Extension="xml" ContentType="application/xml"/><Override PartName="/xl/workbook.xml" ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.sheet.main+xml"/><Override PartName="/xl/worksheets/sheet1.xml" ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.worksheet+xml"/></Types>`,
      '_rels/.rels': `${XML_HEAD}<Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships"><Relationship Id="rId1" Type="${rel}/officeDocument" Target="xl/workbook.xml"/></Relationships>`,
      'xl/workbook.xml': `${XML_HEAD}<workbook xmlns="${ns}" xmlns:r="${rel}"><sheets><sheet name="Sheet" sheetId="1" r:id="rId1"/></sheets><calcPr fullCalcOnLoad="1"/></workbook>`,
      'xl/_rels/workbook.xml.rels': `${XML_HEAD}<Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships"><Relationship Id="rId1" Type="${rel}/worksheet" Target="worksheets/sheet1.xml"/></Relationships>`,
      'xl/worksheets/sheet1.xml': `${XML_HEAD}<worksheet xmlns="${ns}"><sheetData>${data}</sheetData></worksheet>`,
    },
    ctx.created,
  );
}

/* ---------- write ---------- */

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
  return on ? `{${on} ${rtfText(r.t)}}` : rtfText(r.t);
}

export function docToRtf(body: string, ctx: ExportContext = { created: null }): string {
  const out: string[] = ['{\\rtf1\\ansi\\ansicpg1252\\deff0\\uc1{\\fonttbl{\\f0\\fswiss\\fcharset0 Helvetica;}}{\\colortbl;\\red79\\green70\\blue229;}', '\\f0\\fs24'];
  let n = 0;
  for (const blk of parseDoc(body)) {
    const runs = blk.runs.map(rtfRun).join('');
    n = blk.k === 'ol' ? n + 1 : 0;
    if (blk.k === 'e') {
      // An embedded document: a real hyperlink, then a few lines of what is in it.
      const p = previewOf(blk.ref!, ctx.iconSvg);
      out.push(`{\\pard\\sb120\\sa60\\li360 {\\field{\\*\\fldinst HYPERLINK "${rtfText((ctx.base ?? '') + p.hash)}"}{\\fldrslt {\\ul\\cf1\\b ${rtfText(p.title)}}}} {\\i (${rtfText(p.kind)})}\\par}`);
      for (const l of p.lines) out.push(`{\\pard\\li720\\sa40\\fs20 ${rtfText(l)}\\par}`);
      continue;
    }
    if (blk.k === 'h1') out.push(`{\\pard\\sb240\\sa160\\b\\fs40 ${runs}\\par}`);
    else if (blk.k === 'h2') out.push(`{\\pard\\sb200\\sa120\\b\\fs30 ${runs}\\par}`);
    else if (blk.k === 'ul') out.push(`{\\pard\\li720\\fi-360\\sa60 \\bullet\\tab ${runs}\\par}`);
    else if (blk.k === 'ol') out.push(`{\\pard\\li720\\fi-360\\sa60 ${n}.\\tab ${runs}\\par}`);
    else out.push(`{\\pard\\sa160 ${runs}\\par}`);
  }
  return out.join('\n') + '\n}\n';
}

function htmlRun(r: Run): string {
  let s = xml(r.t);
  if (r.s) s = `<s>${s}</s>`;
  if (r.u) s = `<u>${s}</u>`;
  if (r.i) s = `<em>${s}</em>`;
  if (r.b) s = `<strong>${s}</strong>`;
  return s;
}

export function docToHtml(body: string, ctx: ExportContext = { created: null }): string {
  const blocks = parseDoc(body);
  const out: string[] = [];
  let list: 'ul' | 'ol' | '' = '';
  const close = () => {
    if (list) out.push(`</${list}>`);
    list = '';
  };
  for (const blk of blocks) {
    const inner = blk.runs.map(htmlRun).join('');
    if (blk.k === 'e') {
      close();
      const p = previewOf(blk.ref!, ctx.iconSvg);
      const href = xml((ctx.base ?? '') + p.hash);
      const inside = p.svg ? `<img src="${xml(svgDataUri(p.svg))}" alt="${xml(p.title)}">` : p.lines.length ? `<ul>${p.lines.map((l) => `<li>${xml(l)}</li>`).join('')}</ul>` : '';
      out.push(`<figure class="embed"><figcaption><a href="${href}">${xml(p.title)}</a> <small>${xml(p.kind)}</small></figcaption>${inside}</figure>`);
      continue;
    }
    if (blk.k === 'ul' || blk.k === 'ol') {
      if (list !== blk.k) {
        close();
        out.push(`<${blk.k}>`);
        list = blk.k;
      }
      out.push(`<li>${inner}</li>`);
    } else {
      close();
      out.push(`<${blk.k}>${inner || '<br>'}</${blk.k}>`);
    }
  }
  close();
  const title = xml(titleOf('write', body) || 'Document');
  return `<!doctype html>\n<html lang="en">\n<head>\n<meta charset="utf-8">\n<meta name="viewport" content="width=device-width, initial-scale=1">\n<title>${title}</title>\n<style>body{font:17px/1.6 system-ui,sans-serif;max-width:40em;margin:2em auto;padding:0 1em}figure.embed{margin:1em 0;padding:.8em 1em;border:1px solid #d4d4d8;border-radius:10px}figure.embed img{display:block;max-width:100%;margin-top:.6em}figure.embed ul{margin:.4em 0 0;padding-left:1.2em;color:#52525b;font-size:.9em}figure.embed small{color:#71717a}</style>\n</head>\n<body>\n${out.join('\n')}\n</body>\n</html>\n`;
}

/* ---------- deck ---------- */

const EMU = 914400;
const SLIDE_W = 12192000;
const SLIDE_H = 7620000; // 16:10, the shape of a slide in the editor
const MARGIN = 838200;
const ICON = 1143000;
const P_NS =
  'xmlns:a="http://schemas.openxmlformats.org/drawingml/2006/main" xmlns:r="http://schemas.openxmlformats.org/officeDocument/2006/relationships" xmlns:p="http://schemas.openxmlformats.org/presentationml/2006/main"';
const REL = 'http://schemas.openxmlformats.org/officeDocument/2006/relationships';
const rels = (items: [string, string, string][]) =>
  `${XML_HEAD}<Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships">${items.map(([id, type, target]) => `<Relationship Id="${id}" Type="${REL}/${type}" Target="${target}"/>`).join('')}</Relationships>`;
const GROUP = '<p:nvGrpSpPr><p:cNvPr id="1" name=""/><p:cNvGrpSpPr/><p:nvPr/></p:nvGrpSpPr><p:grpSpPr><a:xfrm><a:off x="0" y="0"/><a:ext cx="0" cy="0"/><a:chOff x="0" y="0"/><a:chExt cx="0" cy="0"/></a:xfrm></p:grpSpPr>';
const xfrm = (px: number, py: number, cx: number, cy: number) => `<a:xfrm><a:off x="${px}" y="${py}"/><a:ext cx="${cx}" cy="${cy}"/></a:xfrm>`;
const RECT = '<a:prstGeom prst="rect"><a:avLst/></a:prstGeom>';

/** A title or body placeholder. `frame` positions it; without one it inherits from the master. */
function placeholder(id: number, kind: 'title' | 'body', paragraphs: string, frame = ''): string {
  const ph = kind === 'title' ? '<p:ph type="title"/>' : '<p:ph type="body" idx="1"/>';
  return `<p:sp><p:nvSpPr><p:cNvPr id="${id}" name="${kind === 'title' ? 'Title' : 'Content'}"/><p:cNvSpPr><a:spLocks noGrp="1"/></p:cNvSpPr><p:nvPr>${ph}</p:nvPr></p:nvSpPr><p:spPr>${frame ? frame + RECT : ''}</p:spPr><p:txBody><a:bodyPr${kind === 'title' ? ' anchor="ctr"' : ''}><a:normAutofit/></a:bodyPr><a:lstStyle/>${paragraphs}</p:txBody></p:sp>`;
}
const para = (text: string, pPr = '', size = 0) => {
  const rPr = `lang="en-US"${size ? ` sz="${size}"` : ''} dirty="0"`;
  return text ? `<a:p>${pPr}<a:r><a:rPr ${rPr}/><a:t>${x(text)}</a:t></a:r></a:p>` : `<a:p>${pPr}<a:endParaRPr ${rPr}/></a:p>`;
};

const THEME = `${XML_HEAD}<a:theme xmlns:a="http://schemas.openxmlformats.org/drawingml/2006/main" name="TinyOffice"><a:themeElements><a:clrScheme name="TinyOffice"><a:dk1><a:srgbClr val="18181B"/></a:dk1><a:lt1><a:srgbClr val="FFFFFF"/></a:lt1><a:dk2><a:srgbClr val="3F3F46"/></a:dk2><a:lt2><a:srgbClr val="F4F4F5"/></a:lt2><a:accent1><a:srgbClr val="4F46E5"/></a:accent1><a:accent2><a:srgbClr val="0EA5E9"/></a:accent2><a:accent3><a:srgbClr val="16A34A"/></a:accent3><a:accent4><a:srgbClr val="D97706"/></a:accent4><a:accent5><a:srgbClr val="DC2626"/></a:accent5><a:accent6><a:srgbClr val="9333EA"/></a:accent6><a:hlink><a:srgbClr val="4F46E5"/></a:hlink><a:folHlink><a:srgbClr val="7C3AED"/></a:folHlink></a:clrScheme><a:fontScheme name="TinyOffice"><a:majorFont><a:latin typeface="Arial"/><a:ea typeface=""/><a:cs typeface=""/></a:majorFont><a:minorFont><a:latin typeface="Arial"/><a:ea typeface=""/><a:cs typeface=""/></a:minorFont></a:fontScheme><a:fmtScheme name="TinyOffice"><a:fillStyleLst>${'<a:solidFill><a:schemeClr val="phClr"/></a:solidFill>'.repeat(3)}</a:fillStyleLst><a:lnStyleLst>${'<a:ln w="9525"><a:solidFill><a:schemeClr val="phClr"/></a:solidFill></a:ln>'.repeat(3)}</a:lnStyleLst><a:effectStyleLst>${'<a:effectStyle><a:effectLst/></a:effectStyle>'.repeat(3)}</a:effectStyleLst><a:bgFillStyleLst>${'<a:solidFill><a:schemeClr val="phClr"/></a:solidFill>'.repeat(3)}</a:bgFillStyleLst></a:fmtScheme></a:themeElements></a:theme>`;

const TITLE_FRAME = xfrm(MARGIN, 685800, SLIDE_W - 2 * MARGIN, ICON);
const BODY_FRAME = xfrm(MARGIN, 2133600, SLIDE_W - 2 * MARGIN, SLIDE_H - 2133600 - 685800);
const textColor = '<a:solidFill><a:schemeClr val="tx1"/></a:solidFill><a:latin typeface="+mn-lt"/>';

const MASTER = `${XML_HEAD}<p:sldMaster ${P_NS}><p:cSld><p:bg><p:bgPr><a:solidFill><a:schemeClr val="bg1"/></a:solidFill><a:effectLst/></p:bgPr></p:bg><p:spTree>${GROUP}${placeholder(2, 'title', para('Headline'), TITLE_FRAME)}${placeholder(3, 'body', para('Bullets'), BODY_FRAME)}</p:spTree></p:cSld><p:clrMap bg1="lt1" tx1="dk1" bg2="lt2" tx2="dk2" accent1="accent1" accent2="accent2" accent3="accent3" accent4="accent4" accent5="accent5" accent6="accent6" hlink="hlink" folHlink="folHlink"/><p:sldLayoutIdLst><p:sldLayoutId id="2147483649" r:id="rId1"/></p:sldLayoutIdLst><p:txStyles><p:titleStyle><a:lvl1pPr algn="l"><a:lnSpc><a:spcPct val="90000"/></a:lnSpc><a:buNone/><a:defRPr sz="4400" b="1">${textColor.replace('+mn-lt', '+mj-lt')}</a:defRPr></a:lvl1pPr></p:titleStyle><p:bodyStyle><a:lvl1pPr marL="342900" indent="-342900"><a:spcBef><a:spcPts val="1000"/></a:spcBef><a:buClr><a:schemeClr val="accent1"/></a:buClr><a:buFont typeface="Arial"/><a:buChar char="&#8226;"/><a:defRPr sz="2800">${textColor}</a:defRPr></a:lvl1pPr></p:bodyStyle><p:otherStyle><a:lvl1pPr><a:defRPr sz="1800">${textColor}</a:defRPr></a:lvl1pPr></p:otherStyle></p:txStyles></p:sldMaster>`;

const LAYOUT = `${XML_HEAD}<p:sldLayout ${P_NS} type="obj" preserve="1"><p:cSld name="Title and Content"><p:spTree>${GROUP}${placeholder(2, 'title', para('Headline'))}${placeholder(3, 'body', para('Bullets'))}</p:spTree></p:cSld><p:clrMapOvr><a:masterClrMapping/></p:clrMapOvr></p:sldLayout>`;

export function deckToPptx(body: string, ctx: ExportContext): Uint8Array {
  const slides = parseDeck(body);
  const icons = ctx.icons ?? {};
  const files: Record<string, string | Uint8Array> = {};
  const slideRels: [string, string, string][] = [];
  let types = '';

  slides.forEach((s, i) => {
    const n = i + 1;
    const png = s.icon ? icons[s.icon] : undefined;
    const bullets = s.bullets.filter((b) => b.trim() !== '');
    let pic = '';
    let titleFrame = '';
    if (png) {
      // The icon always sits in the same place; the headline moves over to make room.
      files[`ppt/media/${s.icon}.png`] = png;
      pic = `<p:pic><p:nvPicPr><p:cNvPr id="4" name="Icon" descr="${x(s.icon)}"/><p:cNvPicPr><a:picLocks noChangeAspect="1"/></p:cNvPicPr><p:nvPr/></p:nvPicPr><p:blipFill><a:blip r:embed="rId2"/><a:stretch><a:fillRect/></a:stretch></p:blipFill><p:spPr>${xfrm(MARGIN, 685800, ICON, ICON)}${RECT}</p:spPr></p:pic>`;
      const left = MARGIN + ICON + EMU / 3;
      titleFrame = xfrm(left, 685800, SLIDE_W - MARGIN - left, ICON);
    }
let bodyFrame = '';
    const lines = bullets.length ? bullets : [''];
    let paras = lines.map((b) => para(b)).join('');
    let titlePara = para(s.title);
    if (s.cover) {
      // Title slide: icon, headline and subtitle stacked in the middle, no bullets.
      const top = png ? 1600200 : 2209800;
      const below = top + (png ? ICON + EMU / 4 : 0);
      if (png) pic = pic.replace(xfrm(MARGIN, 685800, ICON, ICON), xfrm((SLIDE_W - ICON) / 2, top, ICON, ICON));
      titleFrame = xfrm(MARGIN, below, SLIDE_W - 2 * MARGIN, 1371600);
      bodyFrame = xfrm(MARGIN, below + 1371600, SLIDE_W - 2 * MARGIN, 1600200);
      titlePara = para(s.title, '<a:pPr algn="ctr"/>', 6000);
      paras = lines.map((b) => para(b, '<a:pPr marL="0" indent="0" algn="ctr"><a:buNone/></a:pPr>')).join('');
    }
    files[`ppt/slides/slide${n}.xml`] =
      `${XML_HEAD}<p:sld ${P_NS}><p:cSld><p:spTree>${GROUP}${placeholder(2, 'title', titlePara, titleFrame)}${placeholder(3, 'body', paras, bodyFrame)}${pic}</p:spTree></p:cSld><p:clrMapOvr><a:masterClrMapping/></p:clrMapOvr></p:sld>`;
    files[`ppt/slides/_rels/slide${n}.xml.rels`] = rels([['rId1', 'slideLayout', '../slideLayouts/slideLayout1.xml'], ...(png ? [['rId2', 'image', `../media/${s.icon}.png`] as [string, string, string]] : [])]);
    slideRels.push([`rId${n + 2}`, 'slide', `slides/slide${n}.xml`]);
    types += `<Override PartName="/ppt/slides/slide${n}.xml" ContentType="application/vnd.openxmlformats-officedocument.presentationml.slide+xml"/>`;
  });

  const ct = 'application/vnd.openxmlformats-officedocument';
  return zip(
    {
      '[Content_Types].xml': `${XML_HEAD}<Types xmlns="http://schemas.openxmlformats.org/package/2006/content-types"><Default Extension="rels" ContentType="application/vnd.openxmlformats-package.relationships+xml"/><Default Extension="xml" ContentType="application/xml"/><Default Extension="png" ContentType="image/png"/><Override PartName="/ppt/presentation.xml" ContentType="${ct}.presentationml.presentation.main+xml"/><Override PartName="/ppt/slideMasters/slideMaster1.xml" ContentType="${ct}.presentationml.slideMaster+xml"/><Override PartName="/ppt/slideLayouts/slideLayout1.xml" ContentType="${ct}.presentationml.slideLayout+xml"/><Override PartName="/ppt/theme/theme1.xml" ContentType="${ct}.theme+xml"/>${types}</Types>`,
      '_rels/.rels': rels([['rId1', 'officeDocument', 'ppt/presentation.xml']]),
      'ppt/presentation.xml': `${XML_HEAD}<p:presentation ${P_NS}><p:sldMasterIdLst><p:sldMasterId id="2147483648" r:id="rId1"/></p:sldMasterIdLst><p:sldIdLst>${slides.map((_, i) => `<p:sldId id="${256 + i}" r:id="rId${i + 3}"/>`).join('')}</p:sldIdLst><p:sldSz cx="${SLIDE_W}" cy="${SLIDE_H}"/><p:notesSz cx="6858000" cy="9144000"/></p:presentation>`,
      'ppt/_rels/presentation.xml.rels': rels([['rId1', 'slideMaster', 'slideMasters/slideMaster1.xml'], ['rId2', 'theme', 'theme/theme1.xml'], ...slideRels]),
      'ppt/slideMasters/slideMaster1.xml': MASTER,
      'ppt/slideMasters/_rels/slideMaster1.xml.rels': rels([['rId1', 'slideLayout', '../slideLayouts/slideLayout1.xml'], ['rId2', 'theme', '../theme/theme1.xml']]),
      'ppt/slideLayouts/slideLayout1.xml': LAYOUT,
      'ppt/slideLayouts/_rels/slideLayout1.xml.rels': rels([['rId1', 'slideMaster', '../slideMasters/slideMaster1.xml']]),
      'ppt/theme/theme1.xml': THEME,
      ...files,
    },
    ctx.created,
  );
}

/* ---------- draw ---------- */

const INK = '#18181b';
const PAPER = '#ffffff';
const SHADE = '#f4f4f5';

function shapeSvg(s: Shape): string {
  const p = paint(s, INK, PAPER, SHADE);
  const isLine = s.k === 'l' || s.k === 'a';
  const look = `fill="${p.fill}"${p.fillOpacity < 1 ? ` fill-opacity="${p.fillOpacity}"` : ''} stroke="${p.stroke}" stroke-width="2"`;
  let body = '';
  if (s.k === 'r') body = `<rect x="${s.x}" y="${s.y}" width="${s.w}" height="${s.h}" rx="2" ${look}/>`;
  else if (s.k === 'e') body = `<ellipse cx="${s.x + s.w / 2}" cy="${s.y + s.h / 2}" rx="${s.w / 2}" ry="${s.h / 2}" ${look}/>`;
  else if (s.k === 'd') body = `<polygon points="${s.x + s.w / 2},${s.y} ${s.x + s.w},${s.y + s.h / 2} ${s.x + s.w / 2},${s.y + s.h} ${s.x},${s.y + s.h / 2}" ${look} stroke-linejoin="round"/>`;
  else if (isLine) {
    const dash = s.f === 1 ? ' stroke-dasharray="6 4"' : s.f === 2 ? ' stroke-dasharray="2 3"' : '';
    body = `<line x1="${s.x}" y1="${s.y}" x2="${s.x + s.w}" y2="${s.y + s.h}" stroke="${p.stroke}" stroke-width="2"${dash}${s.k === 'a' ? ` marker-end="url(#${p.marker})"` : ''}/>`;
  }
  if (!s.text) return body;
  const halo = isLine ? ` stroke="${PAPER}" stroke-width="4" paint-order="stroke"` : '';
  const at = s.k === 't' ? `x="${s.x + 4}" text-anchor="start"` : `x="${s.x + s.w / 2}" text-anchor="middle"`;
  return `${body}<text ${at} y="${s.y + s.h / 2}" dominant-baseline="middle"${p.px !== 14 ? ` font-size="${p.px}"` : ''} fill="${p.text}"${halo}>${x(s.text)}</text>`;
}

const ARROWS = [['arrow', INK], ...Object.entries(COLORS).map(([c, v]) => [`arrow-${c}`, v.hex])]
  .map(([id, fill]) => `<marker id="${id}" viewBox="0 0 10 10" refX="9" refY="5" markerWidth="7" markerHeight="7" orient="auto-start-reverse"><path d="M 0 0 L 10 5 L 0 10 z" fill="${fill}"/></marker>`)
  .join('');

export function drawingToSvg(body: string): string {
  const shapes = parseDrawing(body).map(shapeSvg).join('\n  ');
  return `<?xml version="1.0" encoding="UTF-8"?>\n<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${W} ${H}" width="${W}" height="${H}" font-family="system-ui, -apple-system, 'Segoe UI', Helvetica, Arial, sans-serif" font-size="14">\n  <defs>${ARROWS}</defs>\n  <rect width="${W}" height="${H}" fill="${PAPER}"/>\n  ${shapes}\n</svg>\n`;
}

/* ---------- calendar ---------- */

const icsText = (s: string) => s.replace(/\\/g, '\\\\').replace(/;/g, '\\;').replace(/,/g, '\\,').replace(/\r?\n/g, '\\n');
const icsDate = (day: number) => {
  const { y, m, d } = dayToYmd(day);
  return `${y}${pad2(m)}${pad2(d)}`;
};
const icsStamp = (ms: number) => new Date(ms).toISOString().replace(/[-:]/g, '').slice(0, 15) + 'Z';

/** Content lines may not exceed 75 octets; longer ones continue on a line starting with a space. */
function icsFold(line: string): string {
  const enc = new TextEncoder();
  let out = '';
  let width = 0;
  for (const ch of line) {
    const n = enc.encode(ch).length;
    if (width + n > 73) {
      out += '\r\n ';
      width = 1;
    }
    out += ch;
    width += n;
  }
  return out;
}

export function calendarToIcs(body: string, ctx: ExportContext): string {
  const cal = parseCalendar(body);
  const stamp = icsStamp(ctx.created ?? EPOCH_MS);
  const lines = ['BEGIN:VCALENDAR', 'VERSION:2.0', 'PRODID:-//TinyOffice//Calendar//EN', 'CALSCALE:GREGORIAN', 'METHOD:PUBLISH'];
  cal.spans.forEach((s, i) => {
    lines.push('BEGIN:VEVENT', `UID:${s.kind}${s.start.toString(36)}-${s.dur.toString(36)}-${i}@tinyoffice`, `DTSTAMP:${stamp}`);
    if (s.kind === 'd') {
      // All-day spans are floating dates; DTEND is exclusive.
      lines.push(`DTSTART;VALUE=DATE:${icsDate(EPOCH_DAY + s.start)}`, `DTEND;VALUE=DATE:${icsDate(EPOCH_DAY + s.start + s.dur)}`);
    } else {
      lines.push(`DTSTART:${icsStamp(EPOCH_MS + s.start * 60000)}`, `DTEND:${icsStamp(EPOCH_MS + (s.start + s.dur) * 60000)}`);
    }
    lines.push(`SUMMARY:${icsText(s.label || 'Untitled')}`, 'END:VEVENT');
  });
  lines.push('END:VCALENDAR');
  return lines.map(icsFold).join('\r\n') + '\r\n';
}

/* ---------- todo, board, gantt ---------- */

const csvCell = (s: string) => (/[",\r\n]/.test(s) || s !== s.trim() ? `"${s.replace(/"/g, '""')}"` : s);
const csv = (rows: (string | number)[][]) => rows.map((r) => r.map((c) => csvCell(String(c))).join(',')).join('\r\n') + '\r\n';
const isoDay = (day: number) => {
  const { y, m, d } = dayToYmd(EPOCH_DAY + day);
  return ymdString(y, m, d);
};

export function todosToMarkdown(body: string): string {
  return parseTodos(body)
    .map((t) => `- [${t.done ? 'x' : ' '}] ${t.star ? '**' + t.text + '**' : t.text}${t.due !== null ? ` (due ${isoDay(t.due)})` : ''}`)
    .join('\n') + '\n';
}

export function boardToMarkdown(body: string): string {
  return parseBoard(body)
    .map((s) => `## ${s.name}${s.limit ? ` (limit ${s.limit})` : ''}\n\n${s.cards.map((c) => `- ${c}`).join('\n')}${s.cards.length ? '\n' : ''}`)
    .join('\n');
}

export function boardToCsv(body: string): string {
  return csv([['Stage', 'Card'], ...parseBoard(body).flatMap((s) => s.cards.map((c) => [s.name, c]))]);
}

export function ganttToCsv(body: string): string {
  return csv([['Task', 'Start', 'End', 'Days', 'Done %'], ...parseGantt(body).map((t) => [t.label, isoDay(t.start), isoDay(t.start + t.days - 1), t.days, t.done])]);
}

/* ---------- trip ---------- */

export function tripToGpx(body: string): string {
  const stops = parseTrip(body);
  const pt = (tag: string, s: (typeof stops)[number], i: number) =>
    `<${tag} lat="${s.lat.toFixed(5)}" lon="${s.lon.toFixed(5)}"><name>${x(s.name || `Stop ${i + 1}`)}</name>${s.note ? `<desc>${x(s.note)}</desc>` : ''}</${tag}>`;
  return `<?xml version="1.0" encoding="UTF-8"?>\n<gpx version="1.1" creator="TinyOffice" xmlns="http://www.topografix.com/GPX/1/1">\n${stops.map((s, i) => pt('wpt', s, i)).join('\n')}\n<rte><name>${x(titleOf('trip', body) || 'Trip')}</name>\n${stops.map((s, i) => pt('rtept', s, i)).join('\n')}\n</rte>\n</gpx>\n`;
}

export function tripToGeoJson(body: string): string {
  const stops = parseTrip(body);
  const features: unknown[] = stops.map((s, i) => ({ type: 'Feature', geometry: { type: 'Point', coordinates: [s.lon, s.lat] }, properties: { name: s.name || `Stop ${i + 1}`, note: s.note, order: i + 1 } }));
  if (stops.length > 1) features.unshift({ type: 'Feature', geometry: { type: 'LineString', coordinates: stops.map((s) => [s.lon, s.lat]) }, properties: { name: titleOf('trip', body), km: Math.round(routeKm(stops) * 10) / 10 } });
  return JSON.stringify({ type: 'FeatureCollection', features }, null, 1) + '\n';
}

/* ---------- tune ---------- */

/** A standard MIDI file (format 0): one track, 480 ticks to the quarter note. */
export function tuneToMidi(body: string): Uint8Array {
  const tune = parseTune(body);
  const TICKS = 120; // per sixteenth-note step
  const events: [number, number, number][] = []; // tick, order (offs first), pitch
  for (const n of tune.notes) {
    events.push([n.step * TICKS, 1, LOW + n.pitch]);
    events.push([Math.min(STEPS, n.step + n.len) * TICKS, 0, LOW + n.pitch]);
  }
  events.sort((a, b) => a[0] - b[0] || a[1] - b[1] || a[2] - b[2]);
  const varlen = (n: number) => {
    const out = [n & 127];
    while ((n >>= 7)) out.unshift((n & 127) | 128);
    return out;
  };
  const us = Math.round(60_000_000 / tune.bpm);
  const track: number[] = [0, 0xff, 0x51, 3, (us >> 16) & 255, (us >> 8) & 255, us & 255];
  let at = 0;
  for (const [tick, on, pitch] of events) {
    track.push(...varlen(tick - at), on ? 0x90 : 0x80, pitch, on ? 96 : 0);
    at = tick;
  }
  track.push(...varlen(STEPS * TICKS - at), 0xff, 0x2f, 0);
  const u32 = (n: number) => [(n >>> 24) & 255, (n >>> 16) & 255, (n >>> 8) & 255, n & 255];
  return new Uint8Array([0x4d, 0x54, 0x68, 0x64, ...u32(6), 0, 0, 0, 1, 0x01, 0xe0, 0x4d, 0x54, 0x72, 0x6b, ...u32(track.length), ...track]);
}

/* ---------- motion ---------- */

/** One item drawn about the origin, as the editor and the SVG view both show it. */
export function animItemSvg(item: Item, iconSvg: Record<string, string> = {}): string {
  if (item.kind === 't') return `<text text-anchor="middle" dominant-baseline="central" font-size="28" font-weight="600" fill="${INK}">${x(item.value)}</text>`;
  return `<g transform="translate(-24 -24) scale(2)" fill="none" stroke="#4f46e5" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">${iconSvg[item.value] ?? '<circle cx="12" cy="12" r="9"/>'}</g>`;
}

export function animToSvg(body: string, ctx: ExportContext): string {
  const anim = parseAnim(body);
  const last = anim.frames - 1;
  const dur = (last / FPS).toFixed(2);
  const n = (v: number) => String(Math.round(v * 100) / 100);
  const items = anim.items.map((it) => {
    const frames = [...new Set([0, ...it.keys.map((k) => k.t), last])].sort((a, b) => a - b);
    const states = frames.map((f) => stateAt(it, f));
    const first = states[0];
    const shape = animItemSvg(it, ctx.iconSvg);
    if (it.keys.length < 2) return `<g transform="translate(${n(first.x)} ${n(first.y)}) scale(${n(first.s)})">${shape}</g>`;
    const times = frames.map((f) => n(f / last)).join(';');
    const tween = (type: string, values: string) => `<animateTransform attributeName="transform" type="${type}" values="${values}" keyTimes="${times}" dur="${dur}s" repeatCount="indefinite"/>`;
    return `<g transform="translate(${n(first.x)} ${n(first.y)})">${tween('translate', states.map((k) => `${n(k.x)} ${n(k.y)}`).join(';'))}<g transform="scale(${n(first.s)})">${tween('scale', states.map((k) => n(k.s)).join(';'))}${shape}</g></g>`;
  });
  return `<?xml version="1.0" encoding="UTF-8"?>\n<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${STAGE_W} ${STAGE_H}" width="${STAGE_W}" height="${STAGE_H}" font-family="system-ui, -apple-system, 'Segoe UI', Helvetica, Arial, sans-serif">\n  <rect width="${STAGE_W}" height="${STAGE_H}" fill="${PAPER}"/>\n  ${items.join('\n  ')}\n</svg>\n`;
}

/* ---------- share card ---------- */

export const APP_NAMES: Record<string, string> = {
  sheet: 'Sheet', write: 'Write', deck: 'Deck', draw: 'Draw', cal: 'Calendar', todo: 'Todo', board: 'Board', gantt: 'Gantt', trip: 'Trip', tune: 'Tune', anim: 'Motion',
};

/** A document as a few lines of plain text: what a preview card can show. */
export function outlineOf(app: string, body: string): string[] {
  const keep = (lines: string[]) => lines.map((l) => l.trim()).filter(Boolean);
  switch (app) {
    case 'sheet': {
      const { values, rows, cols } = usedGrid(body);
      return keep(Array.from({ length: rows }, (_, r) => Array.from({ length: cols }, (_, c) => formatValue(values[r][c])).filter(Boolean).join('  ·  ')));
    }
    case 'write':
      return keep(parseDoc(body).map((b) => (b.k === 'e' ? `↗  ${previewOf(b.ref!).title}` : docText([b]))));
    case 'deck':
      return keep(parseDeck(body).flatMap((s) => [s.title, ...s.bullets.map((b) => (b.trim() ? '•  ' + b : ''))]));
    case 'draw':
      return keep(parseDrawing(body).map((s) => s.text));
    case 'cal':
      return keep(parseCalendar(body).spans.map((s) => s.label));
    case 'todo':
      return keep(parseTodos(body).map((t) => (t.done ? '☑  ' : '☐  ') + t.text));
    case 'board':
      return parseBoard(body).map((s) => `${s.name}  ·  ${s.cards.length}`);
    case 'gantt':
      return keep(parseGantt(body).map((t) => `${t.label}  ·  ${t.days}d`));
    case 'trip': {
      const stops = parseTrip(body);
      return keep([...stops.map((s, i) => `${i + 1}.  ${s.name || 'Stop'}`), stops.length > 1 ? formatKm(routeKm(stops)) : '']);
    }
    case 'tune': {
      const t = parseTune(body);
      return [`${t.notes.length} notes  ·  ${t.bpm} bpm`];
    }
    case 'anim':
      return keep(parseAnim(body).items.map((it) => it.value));
  }
  return [];
}

/** A 1200 by 630 card (the size link previews use) describing a document. */
export function cardSvg(app: string, body: string): string {
  const clip = (s: string, n: number) => (s.length > n ? s.slice(0, n - 1).trimEnd() + '…' : s);
  let lines = outlineOf(app, body);
  const title = clip(titleOf(app, body) || APP_NAMES[app] || 'TinyOffice', 34);
  if (lines[0] && lines[0].replace(/^•\s+/, '') === titleOf(app, body)) lines = lines.slice(1);
  const more = lines.length > 6 ? lines.length - 5 : 0;
  const shown = (more ? lines.slice(0, 5) : lines.slice(0, 6)).map((l) => clip(l, 58));
  if (more) shown.push(`+ ${more} more`);
  const picture = app === 'draw' ? `<svg x="640" y="150" width="496" height="310" viewBox="0 0 ${W} ${H}" font-size="14"><defs>${ARROWS}</defs><rect width="${W}" height="${H}" fill="${SHADE}" rx="8"/>${parseDrawing(body).map(shapeSvg).join('')}</svg>` : '';
  const text = app === 'draw' ? shown.slice(0, 5).map((l) => clip(l, 28)) : shown;
  return `<svg xmlns="http://www.w3.org/2000/svg" width="1200" height="630" viewBox="0 0 1200 630" font-family="system-ui, -apple-system, 'Segoe UI', Helvetica, Arial, sans-serif">
<rect width="1200" height="630" fill="${PAPER}"/><rect width="1200" height="14" fill="#4f46e5"/>
<rect x="64" y="64" width="56" height="56" rx="14" fill="#4f46e5"/><path d="M79 82h26M79 92h26M79 102h15" stroke="#fff" stroke-width="5" stroke-linecap="round"/>
<text x="140" y="102" font-size="30" font-weight="600" fill="#52525b">${x(APP_NAMES[app] ?? app)}</text>
<text x="64" y="212" font-size="64" font-weight="700" fill="${INK}" letter-spacing="-1.5">${x(title)}</text>
${text.map((l, i) => `<text x="64" y="${288 + i * 48}" font-size="32" fill="#3f3f46">${x(l)}</text>`).join('\n')}
${picture}
<text x="64" y="584" font-size="26" fill="#71717a">TinyOffice  ·  the link is the document</text>
</svg>`;
}

/* ---------- registry ---------- */

const text = (s: string) => strToU8(s);

export const EXPORTS: Record<string, ExportFormat[]> = {
  sheet: [
    { ext: 'xlsx', label: 'Excel', mime: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet', build: sheetToXlsx },
    // The byte order mark is how Excel knows a CSV is UTF-8.
    { ext: 'csv', label: 'CSV', mime: 'text/csv;charset=utf-8', build: (b) => text('\ufeff' + sheetToCsv(b)) },
  ],
  write: [
    { ext: 'rtf', label: 'Rich Text', mime: 'application/rtf', build: (b, ctx) => text(docToRtf(b, ctx)) },
    { ext: 'html', label: 'Web page', mime: 'text/html;charset=utf-8', build: (b, ctx) => text(docToHtml(b, ctx)) },
  ],
  deck: [{ ext: 'pptx', label: 'PowerPoint', mime: 'application/vnd.openxmlformats-officedocument.presentationml.presentation', build: deckToPptx }],
  draw: [{ ext: 'svg', label: 'SVG image', mime: 'image/svg+xml', build: (b) => text(drawingToSvg(b)) }],
  cal: [{ ext: 'ics', label: 'iCalendar', mime: 'text/calendar;charset=utf-8', build: (b, ctx) => text(calendarToIcs(b, ctx)) }],
  todo: [{ ext: 'md', label: 'Markdown checklist', mime: 'text/markdown;charset=utf-8', build: (b) => text(todosToMarkdown(b)) }],
  board: [
    { ext: 'md', label: 'Markdown', mime: 'text/markdown;charset=utf-8', build: (b) => text(boardToMarkdown(b)) },
    { ext: 'csv', label: 'CSV', mime: 'text/csv;charset=utf-8', build: (b) => text('\ufeff' + boardToCsv(b)) },
  ],
  gantt: [{ ext: 'csv', label: 'CSV', mime: 'text/csv;charset=utf-8', build: (b) => text('\ufeff' + ganttToCsv(b)) }],
  trip: [
    { ext: 'gpx', label: 'GPX route', mime: 'application/gpx+xml', build: (b) => text(tripToGpx(b)) },
    { ext: 'geojson', label: 'GeoJSON', mime: 'application/geo+json', build: (b) => text(tripToGeoJson(b)) },
  ],
  tune: [{ ext: 'mid', label: 'MIDI', mime: 'audio/midi', build: tuneToMidi }],
  anim: [{ ext: 'svg', label: 'Animated SVG', mime: 'image/svg+xml', build: (b, ctx) => text(animToSvg(b, ctx)) }],
};

/** Other names people reach for. */
const ALIASES: Record<string, string> = { ppt: 'pptx', xls: 'xlsx', ical: 'ics', icalendar: 'ics', htm: 'html', midi: 'mid', markdown: 'md', json: 'geojson' };

export function findExport(app: string, ext: string): ExportFormat | null {
  const want = ALIASES[ext.toLowerCase()] ?? ext.toLowerCase();
  return EXPORTS[app]?.find((f) => f.ext === want) ?? null;
}

/** The document's own title, where it has one: a deck's first headline, a text's first line. */
export function titleOf(app: string, body: string): string {
  if (app === 'deck') return parseDeck(body).find((s) => s.title.trim())?.title.trim() ?? '';
  if (app === 'write') {
    const blocks: Block[] = parseDoc(body);
    const first = blocks.find((b) => docText([b]).trim());
    return first ? docText([first]).trim() : '';
  }
  if (app === 'trip') {
    const named = parseTrip(body).filter((s) => s.name.trim());
    if (named.length > 1) return `${named[0].name.trim()} to ${named[named.length - 1].name.trim()}`;
    return named[0]?.name.trim() ?? '';
  }
  return '';
}

/** A file name for a download: the title if there is one, otherwise the app's name. */
export function exportName(app: string, body: string, ext: string): string {
  const slug = titleOf(app, body)
    .normalize('NFKD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 48)
    .replace(/-+$/, '');
  const names: Record<string, string> = { sheet: 'sheet', write: 'document', deck: 'deck', draw: 'drawing', cal: 'calendar', todo: 'todo', board: 'board', gantt: 'gantt', trip: 'trip', tune: 'tune', anim: 'motion' };
  return `${slug || names[app] || app}.${ext}`;
}
