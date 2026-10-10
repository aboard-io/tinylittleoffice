/**
 * The deck as PowerPoint: a slide for each, the headline and the words as real text in the theme's
 * colours, the icons, the theme's decoration and any document on a slide as pictures drawn in the browser
 * first (raster), each placed where the layout puts it. Keynote is stricter than PowerPoint about what a
 * presentation holds, so the parts PowerPoint always writes are written too. No DOM but the pictures,
 * which are asked for and may be none (under node they are). (Ported from the old tree's deck.def.ts.)
 */
import type { ExportContext } from '../../kit/app.ts';
import { pageSvg, xml } from '../../kit/draw.ts';
import { glyphNamed } from '../../kit/icons.ts';
import { raster } from '../../kit/raster.ts';
import { XML_HEAD, zip } from '../../kit/zip.ts';
import { markNotes, noteNumbers, noteRuns, parse, plainText, type Doc, type Run } from '../../doc/index.ts';
import { settingsOf, slideNotes, slidesOf, type Item, type Slide } from './model.ts';
import { themeOf, type DeckTheme } from './theme.ts';
import { layoutSlide, lookOf, SH, subPage, SW, type Look } from './view.ts';

const x = xml;
const SLIDE_W = 12192000;
const SLIDE_H = 7620000; // 16:10, the shape of a slide in the editor
const MARGIN = 838200;
const ICON = 1143000;
const P_NS = 'xmlns:a="http://schemas.openxmlformats.org/drawingml/2006/main" xmlns:r="http://schemas.openxmlformats.org/officeDocument/2006/relationships" xmlns:p="http://schemas.openxmlformats.org/presentationml/2006/main"';
const REL = 'http://schemas.openxmlformats.org/officeDocument/2006/relationships';
const rels = (items: [string, string, string][]) => `${XML_HEAD}<Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships">${items.map(([id, type, target]) => `<Relationship Id="${id}" Type="${REL}/${type}" Target="${target}"/>`).join('')}</Relationships>`;
const GROUP = '<p:nvGrpSpPr><p:cNvPr id="1" name=""/><p:cNvGrpSpPr/><p:nvPr/></p:nvGrpSpPr><p:grpSpPr><a:xfrm><a:off x="0" y="0"/><a:ext cx="0" cy="0"/><a:chOff x="0" y="0"/><a:chExt cx="0" cy="0"/></a:xfrm></p:grpSpPr>';
const xfrm = (px: number, py: number, cx: number, cy: number) => `<a:xfrm><a:off x="${Math.round(px)}" y="${Math.round(py)}"/><a:ext cx="${Math.round(cx)}" cy="${Math.round(cy)}"/></a:xfrm>`;
const RECT = '<a:prstGeom prst="rect"><a:avLst/></a:prstGeom>';

/** A title or body placeholder. `frame` positions it; without one it inherits from the master. */
function placeholder(id: number, kind: 'title' | 'body', paragraphs: string, frame = ''): string {
  const ph = kind === 'title' ? '<p:ph type="title"/>' : '<p:ph type="body" idx="1"/>';
  return `<p:sp><p:nvSpPr><p:cNvPr id="${id}" name="${kind === 'title' ? 'Title' : 'Content'}"/><p:cNvSpPr><a:spLocks noGrp="1"/></p:cNvSpPr><p:nvPr>${ph}</p:nvPr></p:nvSpPr><p:spPr>${frame ? frame + RECT : ''}</p:spPr><p:txBody><a:bodyPr${kind === 'title' ? ' anchor="ctr"' : ''}><a:normAutofit/></a:bodyPr><a:lstStyle/>${paragraphs}</p:txBody></p:sp>`;
}
/** A paragraph of runs: their marks as PowerPoint's, a footnote's mark raised. */
const para = (runs: Run[], pPr = '', size = 0, next = noteNumbers()) => {
  const rPr = `lang="en-US"${size ? ` sz="${size}"` : ''} dirty="0"`;
  const marked = markNotes(runs, next).filter((ru) => ru.t || ru.ic);
  return marked.length
    ? `<a:p>${pPr}${marked.map((ru) => `<a:r><a:rPr ${rPr}${ru.b ? ' b="1"' : ''}${ru.i ? ' i="1"' : ''}${ru.u ? ' u="sng"' : ''}${ru.s ? ' strike="sngStrike"' : ''}${ru.sup ? ' baseline="30000"' : ''}/><a:t>${x(ru.ic ? ' ' : ru.t.replace(/\n/g, ' '))}</a:t></a:r>`).join('')}</a:p>`
    : `<a:p>${pPr}<a:endParaRPr ${rPr}/></a:p>`;
};
const words = (s: string) => [{ t: s }];

/** The deck's theme as PowerPoint's: its paper is the background (lt1), its ink the words (dk1), its accent the first accent. */
const pptTheme = (T: DeckTheme) => `${XML_HEAD}<a:theme xmlns:a="http://schemas.openxmlformats.org/drawingml/2006/main" name="Tiny Little Office"><a:themeElements><a:clrScheme name="Tiny Little Office"><a:dk1><a:srgbClr val="${T.ink.slice(1).toUpperCase()}"/></a:dk1><a:lt1><a:srgbClr val="${T.paper.slice(1).toUpperCase()}"/></a:lt1><a:dk2><a:srgbClr val="3F3F46"/></a:dk2><a:lt2><a:srgbClr val="F4F4F5"/></a:lt2><a:accent1><a:srgbClr val="${T.accent.slice(1).toUpperCase()}"/></a:accent1><a:accent2><a:srgbClr val="0EA5E9"/></a:accent2><a:accent3><a:srgbClr val="16A34A"/></a:accent3><a:accent4><a:srgbClr val="D97706"/></a:accent4><a:accent5><a:srgbClr val="DC2626"/></a:accent5><a:accent6><a:srgbClr val="9333EA"/></a:accent6><a:hlink><a:srgbClr val="${(T.link ?? T.accent).slice(1).toUpperCase()}"/></a:hlink><a:folHlink><a:srgbClr val="7C3AED"/></a:folHlink></a:clrScheme><a:fontScheme name="Tiny Little Office"><a:majorFont><a:latin typeface="Calibri"/><a:ea typeface=""/><a:cs typeface=""/></a:majorFont><a:minorFont><a:latin typeface="Calibri"/><a:ea typeface=""/><a:cs typeface=""/></a:minorFont></a:fontScheme><a:fmtScheme name="Tiny Little Office"><a:fillStyleLst>${'<a:solidFill><a:schemeClr val="phClr"/></a:solidFill>'.repeat(3)}</a:fillStyleLst><a:lnStyleLst>${'<a:ln w="9525"><a:solidFill><a:schemeClr val="phClr"/></a:solidFill></a:ln>'.repeat(3)}</a:lnStyleLst><a:effectStyleLst>${'<a:effectStyle><a:effectLst/></a:effectStyle>'.repeat(3)}</a:effectStyleLst><a:bgFillStyleLst>${'<a:solidFill><a:schemeClr val="phClr"/></a:solidFill>'.repeat(3)}</a:bgFillStyleLst></a:fmtScheme></a:themeElements></a:theme>`;

const TITLE_FRAME = xfrm(MARGIN, 685800, SLIDE_W - 2 * MARGIN, ICON);
const BODY_FRAME = xfrm(MARGIN, 2133600, SLIDE_W - 2 * MARGIN, SLIDE_H - 2133600 - 685800);
const textColor = '<a:solidFill><a:schemeClr val="tx1"/></a:solidFill><a:latin typeface="+mn-lt"/>';

const MASTER = `${XML_HEAD}<p:sldMaster ${P_NS}><p:cSld><p:bg><p:bgPr><a:solidFill><a:schemeClr val="bg1"/></a:solidFill><a:effectLst/></p:bgPr></p:bg><p:spTree>${GROUP}${placeholder(2, 'title', para(words('Headline')), TITLE_FRAME)}${placeholder(3, 'body', para(words('Bullets')), BODY_FRAME)}</p:spTree></p:cSld><p:clrMap bg1="lt1" tx1="dk1" bg2="lt2" tx2="dk2" accent1="accent1" accent2="accent2" accent3="accent3" accent4="accent4" accent5="accent5" accent6="accent6" hlink="hlink" folHlink="folHlink"/><p:sldLayoutIdLst><p:sldLayoutId id="2147483649" r:id="rId1"/></p:sldLayoutIdLst><p:txStyles><p:titleStyle><a:lvl1pPr algn="l"><a:lnSpc><a:spcPct val="90000"/></a:lnSpc><a:buNone/><a:defRPr sz="4400" b="1">${textColor.replace('+mn-lt', '+mj-lt')}</a:defRPr></a:lvl1pPr></p:titleStyle><p:bodyStyle><a:lvl1pPr marL="342900" indent="-342900"><a:spcBef><a:spcPts val="1000"/></a:spcBef><a:buClr><a:schemeClr val="accent1"/></a:buClr><a:buFont typeface="Arial"/><a:buChar char="&#8226;"/><a:defRPr sz="2800">${textColor}</a:defRPr></a:lvl1pPr></p:bodyStyle><p:otherStyle><a:lvl1pPr><a:defRPr sz="1800">${textColor}</a:defRPr></a:lvl1pPr></p:otherStyle></p:txStyles></p:sldMaster>`;

const LAYOUT = `${XML_HEAD}<p:sldLayout ${P_NS} type="obj" preserve="1"><p:cSld name="Title and Content"><p:spTree>${GROUP}${placeholder(2, 'title', para(words('Headline')))}${placeholder(3, 'body', para(words('Bullets')))}</p:spTree></p:cSld><p:clrMapOvr><a:masterClrMapping/></p:clrMapOvr></p:sldLayout>`;

const pic = (id: number, rel: string, name: string, frame: string) => `<p:pic><p:nvPicPr><p:cNvPr id="${id}" name="${x(name)}" descr="${x(name)}"/><p:cNvPicPr><a:picLocks noChangeAspect="1"/></p:cNvPicPr><p:nvPr/></p:nvPicPr><p:blipFill><a:blip r:embed="${rel}"/><a:stretch><a:fillRect/></a:stretch></p:blipFill><p:spPr>${frame}${RECT}</p:spPr></p:pic>`;

/** The pictures PowerPoint needs drawn: the theme's decoration, each icon used, and each document shown on a slide. */
export function pictures(doc: Doc, slides: Slide[], look: Look): Record<string, { svg: string; w: number; h: number }> {
  const out: Record<string, { svg: string; w: number; h: number }> = {};
  const deco = look.themed ? look.theme.deco : '';
  if (deco) out.theme = { w: SW * 2, h: SH * 2, svg: `<svg xmlns="http://www.w3.org/2000/svg" width="${SW * 2}" height="${SH * 2}" viewBox="0 0 ${SW} ${SH}"><rect width="${SW}" height="${SH}" fill="${look.theme.paper}"/>${deco}</svg>` };
  slides.forEach((s, i) => {
    const glyph = s.icon ? glyphNamed(s.icon, 0, 0, 256, look.icon) : '';
    if (glyph) out[`icon-${s.icon}`] = { w: 256, h: 256, svg: `<svg xmlns="http://www.w3.org/2000/svg" width="256" height="256" viewBox="0 0 256 256">${glyph}</svg>` };
    const sub = subPage(doc, s, undefined, false, true);
    if (sub) out[`sub-${i + 1}`] = { w: sub.w * 2, h: sub.h * 2, svg: pageSvg(sub) };
  });
  return out;
}

/** Every picture drawn as a PNG in the browser; none where there is no browser (the file is still a presentation). */
export async function drawPictures(doc: Doc, slides: Slide[], look: Look): Promise<Record<string, Uint8Array>> {
  const out: Record<string, Uint8Array> = {};
  if (typeof document === 'undefined') return out;
  for (const [key, p] of Object.entries(pictures(doc, slides, look))) {
    const png = await raster(p.svg, p.w, p.h, 1, key === 'theme' ? look.theme.paper : null);
    if (png) out[key] = png;
  }
  return out;
}

/** The deck as a .pptx. `png` holds the pictures by key (drawPictures); the slides' words are text either way. */
export function deckToPptx(text: string, ctx: ExportContext, png: Record<string, Uint8Array> = {}): Uint8Array {
  const doc = parse(text);
  const settings = settingsOf(doc);
  const slides = slidesOf(doc);
  const files: Record<string, string | Uint8Array> = {};
  const slideRels: [string, string, string][] = [];
  let types = '';
  const E = (px: number) => Math.round((px / SW) * SLIDE_W); // slide px to EMU

  slides.forEach((s, i) => {
    const n = i + 1;
    const L = layoutSlide(s);
    const cover = s.layout === 't' && s.sub < 0;
    const links: [string, string, string][] = [['rId1', 'slideLayout', '../slideLayouts/slideLayout1.xml']];
    let pics = '';
    const addPicture = (key: string, box: { x: number; y: number; w: number; h: number }, name: string) => {
      if (!png[key]) return;
      files[`ppt/media/${key}.png`] = png[key];
      const rel = `rId${links.length + 1}`;
      links.push([rel, 'image', `../media/${key}.png`]);
      pics += pic(3 + links.length, rel, name, xfrm(E(box.x), E(box.y), E(box.w), E(box.h)));
    };
    // The theme's decoration is a picture behind each slide (pictures go under the words).
    addPicture('theme', { x: 0, y: 0, w: SW, h: SH }, '');
    if (L.icon) addPicture(`icon-${s.icon}`, L.icon, s.icon);
    const sub = L.sub ? subPage(doc, s, undefined, false, true) : null;
    if (L.sub && sub) {
      // Keep the picture's own shape inside the space the slide gives it.
      const k = Math.min(L.sub.w / sub.w, L.sub.h / sub.h);
      addPicture(`sub-${n}`, { x: L.sub.x + (L.sub.w - sub.w * k) / 2, y: L.sub.y + (L.sub.h - sub.h * k) / 2, w: sub.w * k, h: sub.h * k }, sub.alt ?? '');
    }
    const items: Item[] = s.sub >= 0 ? [] : [...s.items, ...(s.layout === '2' ? s.right : [])];
    const centre = cover ? '<a:pPr marL="0" indent="0" algn="ctr"><a:buNone/></a:pPr>' : '';
    // Footnotes are numbered as on the slide: the headline's first, then the words'; the notes follow the words, small.
    const next = noteNumbers();
    const headline = para(s.title, cover ? '<a:pPr algn="ctr"/>' : '', Math.round((L.titlePx || 20) * 75), next);
    const notes = slideNotes(s).map((fn, k) => para([{ t: `${k + 1} ` }, ...noteRuns(fn)], '<a:pPr marL="0" indent="0"><a:buNone/></a:pPr>', Math.round((L.notes?.px ?? 15) * 75)));
    const level = (it: Item) => (it.para ? '<a:pPr marL="0" indent="0"><a:buNone/></a:pPr>' : it.depth ? `<a:pPr lvl="${it.depth}" marL="${342900 * (it.depth + 1)}" indent="-342900"/>` : '');
    const paras = [...(items.length ? items : [{ runs: [], depth: 0 } as Item]).map((it) => para(it.runs, centre || level(it), Math.round((L.bodyPx || 20) * 75), next)), ...notes].join('');
    // (A slide given over to a document keeps an empty body placeholder, tucked along the bottom edge.)
    const col = L.cols[0] ?? { x: 64, y: SH - 40, w: SW - 2 * 64, h: 20 };
    const bodyW = L.cols.length > 1 ? L.cols[1].x + L.cols[1].w - col.x : col.w;
    const titleBox = s.sub >= 0 && !L.title.lines.length ? col : L.title;
    const titleFrame = xfrm(E(titleBox.x), E(titleBox.y), E(titleBox.w), E(Math.max(titleBox.h, 60)));
    const bodyFrame = xfrm(E(col.x), E(col.y), E(bodyW), E(Math.max(col.h, 80)));
    files[`ppt/slides/slide${n}.xml`] = `${XML_HEAD}<p:sld ${P_NS}><p:cSld><p:spTree>${GROUP}${pics}${placeholder(2, 'title', headline, titleFrame)}${placeholder(3, 'body', paras, bodyFrame)}</p:spTree></p:cSld><p:clrMapOvr><a:masterClrMapping/></p:clrMapOvr></p:sld>`;
    files[`ppt/slides/_rels/slide${n}.xml.rels`] = rels(links);
    slideRels.push([`rId${n + 2}`, 'slide', `slides/slide${n}.xml`]);
    types += `<Override PartName="/ppt/slides/slide${n}.xml" ContentType="application/vnd.openxmlformats-officedocument.presentationml.slide+xml"/>`;
  });

  const ct = 'application/vnd.openxmlformats-officedocument';
  const when = '2020-01-01T00:00:00Z';
  const title = x(ctx.title || plainText(slides.find((s) => plainText(s.title).trim())?.title ?? []));
  return zip({
    '[Content_Types].xml': `${XML_HEAD}<Types xmlns="http://schemas.openxmlformats.org/package/2006/content-types"><Default Extension="rels" ContentType="application/vnd.openxmlformats-package.relationships+xml"/><Default Extension="xml" ContentType="application/xml"/><Default Extension="png" ContentType="image/png"/><Override PartName="/ppt/presentation.xml" ContentType="${ct}.presentationml.presentation.main+xml"/><Override PartName="/ppt/slideMasters/slideMaster1.xml" ContentType="${ct}.presentationml.slideMaster+xml"/><Override PartName="/ppt/slideLayouts/slideLayout1.xml" ContentType="${ct}.presentationml.slideLayout+xml"/><Override PartName="/ppt/theme/theme1.xml" ContentType="${ct}.theme+xml"/><Override PartName="/ppt/presProps.xml" ContentType="${ct}.presentationml.presProps+xml"/><Override PartName="/ppt/viewProps.xml" ContentType="${ct}.presentationml.viewProps+xml"/><Override PartName="/ppt/tableStyles.xml" ContentType="${ct}.presentationml.tableStyles+xml"/><Override PartName="/docProps/core.xml" ContentType="application/vnd.openxmlformats-package.core-properties+xml"/><Override PartName="/docProps/app.xml" ContentType="${ct}.extended-properties+xml"/>${types}</Types>`,
    '_rels/.rels': `${XML_HEAD}<Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships"><Relationship Id="rId1" Type="${REL}/officeDocument" Target="ppt/presentation.xml"/><Relationship Id="rId2" Type="http://schemas.openxmlformats.org/package/2006/relationships/metadata/core-properties" Target="docProps/core.xml"/><Relationship Id="rId3" Type="${REL}/extended-properties" Target="docProps/app.xml"/></Relationships>`,
    'docProps/core.xml': `${XML_HEAD}<cp:coreProperties xmlns:cp="http://schemas.openxmlformats.org/package/2006/metadata/core-properties" xmlns:dc="http://purl.org/dc/elements/1.1/" xmlns:dcterms="http://purl.org/dc/terms/" xmlns:xsi="http://www.w3.org/2001/XMLSchema-instance"><dc:title>${title}</dc:title><dc:creator>Tiny Little Office</dc:creator><dcterms:created xsi:type="dcterms:W3CDTF">${when}</dcterms:created><dcterms:modified xsi:type="dcterms:W3CDTF">${when}</dcterms:modified></cp:coreProperties>`,
    'docProps/app.xml': `${XML_HEAD}<Properties xmlns="http://schemas.openxmlformats.org/officeDocument/2006/extended-properties"><Application>Tiny Little Office</Application><Slides>${slides.length}</Slides></Properties>`,
    'ppt/presProps.xml': `${XML_HEAD}<p:presentationPr ${P_NS}/>`,
    'ppt/viewProps.xml': `${XML_HEAD}<p:viewPr ${P_NS}><p:normalViewPr><p:restoredLeft sz="15620"/><p:restoredTop sz="94660"/></p:normalViewPr><p:gridSpacing cx="76200" cy="76200"/></p:viewPr>`,
    'ppt/tableStyles.xml': `${XML_HEAD}<a:tblStyleLst xmlns:a="http://schemas.openxmlformats.org/drawingml/2006/main" def="{5C22544A-7EE6-4342-B048-85BDC9FD1C3A}"/>`,
    'ppt/presentation.xml': `${XML_HEAD}<p:presentation ${P_NS}><p:sldMasterIdLst><p:sldMasterId id="2147483648" r:id="rId1"/></p:sldMasterIdLst><p:sldIdLst>${slides.map((_, i) => `<p:sldId id="${256 + i}" r:id="rId${i + 3}"/>`).join('')}</p:sldIdLst><p:sldSz cx="${SLIDE_W}" cy="${SLIDE_H}"/><p:notesSz cx="6858000" cy="9144000"/></p:presentation>`,
    'ppt/_rels/presentation.xml.rels': rels([['rId1', 'slideMaster', 'slideMasters/slideMaster1.xml'], ['rId2', 'theme', 'theme/theme1.xml'], ...slideRels, ['rIdP', 'presProps', 'presProps.xml'], ['rIdV', 'viewProps', 'viewProps.xml'], ['rIdT', 'tableStyles', 'tableStyles.xml']]),
    'ppt/slideMasters/slideMaster1.xml': MASTER,
    'ppt/slideMasters/_rels/slideMaster1.xml.rels': rels([['rId1', 'slideLayout', '../slideLayouts/slideLayout1.xml'], ['rId2', 'theme', '../theme/theme1.xml']]),
    'ppt/slideLayouts/slideLayout1.xml': LAYOUT,
    'ppt/slideLayouts/_rels/slideLayout1.xml.rels': rels([['rId1', 'slideMaster', '../slideMasters/slideMaster1.xml']]),
    'ppt/theme/theme1.xml': pptTheme(themeOf(settings.theme)),
    ...files,
  });
}

/** The deck as a .pptx with its pictures drawn first (in a browser), as the Download menu asks. */
export async function buildPptx(text: string, ctx: ExportContext): Promise<Uint8Array> {
  const doc = parse(text);
  const look = lookOf(settingsOf(doc));
  return deckToPptx(text, ctx, await drawPictures(doc, slidesOf(doc), look));
}
