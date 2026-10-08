/** Deck: what the shell knows about slides. Format: lib/deckmodel.ts. */
import { LINK, defineApp, xml, pageSvg, ACCENT, type DownloadContext, type Page } from '../kit/core.ts';
import { SW, SH, depthOf, layoutSlide, slidePage, slideSteps, live } from '../lib/slide.ts';
import { parseInline, plainInline } from '../lib/richtext.ts';
import { zip, XML_HEAD } from '../kit/zip.ts';
import { makeRef, refPage, resolve } from '../kit/embed.ts';
import { encodeEnvelope } from '../lib/envelope.ts';
import { QR_MAX_BYTES } from '../lib/qr.ts';
import { ICON_SVG } from '../lib/icons.ts';
import { ICON_COLORS, deckIconColor, parseDeck, type Slide, deckEndsWithQr } from '../lib/deckmodel.ts';

const x = xml;

export { SW, SH, depthOf, layoutSlide, slidePage, slideSteps, type SlideLayout, type SlideSize } from '../lib/slide.ts';

/* ---------- PowerPoint ---------- */

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
const para = (line: string, pPr = '', size = 0) => {
  const rPr = `lang="en-US"${size ? ` sz="${size}"` : ''} dirty="0"`;
  const runs = parseInline(line);
  return runs.length ? `<a:p>${pPr}${runs.map((ru) => `<a:r><a:rPr ${rPr}${ru.b ? ' b="1"' : ''}${ru.i ? ' i="1"' : ''}${ru.u ? ' u="sng"' : ''}${ru.s ? ' strike="sngStrike"' : ''}/><a:t>${x(ru.t)}</a:t></a:r>`).join('')}</a:p>` : `<a:p>${pPr}<a:endParaRPr ${rPr}/></a:p>`;
};

const THEME = `${XML_HEAD}<a:theme xmlns:a="http://schemas.openxmlformats.org/drawingml/2006/main" name="TinyLittleOffice"><a:themeElements><a:clrScheme name="TinyLittleOffice"><a:dk1><a:srgbClr val="18181B"/></a:dk1><a:lt1><a:srgbClr val="FFFFFF"/></a:lt1><a:dk2><a:srgbClr val="3F3F46"/></a:dk2><a:lt2><a:srgbClr val="F4F4F5"/></a:lt2><a:accent1><a:srgbClr val="4F46E5"/></a:accent1><a:accent2><a:srgbClr val="0EA5E9"/></a:accent2><a:accent3><a:srgbClr val="16A34A"/></a:accent3><a:accent4><a:srgbClr val="D97706"/></a:accent4><a:accent5><a:srgbClr val="DC2626"/></a:accent5><a:accent6><a:srgbClr val="9333EA"/></a:accent6><a:hlink><a:srgbClr val="4F46E5"/></a:hlink><a:folHlink><a:srgbClr val="7C3AED"/></a:folHlink></a:clrScheme><a:fontScheme name="TinyLittleOffice"><a:majorFont><a:latin typeface="IBM Plex Sans"/><a:ea typeface=""/><a:cs typeface=""/></a:majorFont><a:minorFont><a:latin typeface="IBM Plex Sans"/><a:ea typeface=""/><a:cs typeface=""/></a:minorFont></a:fontScheme><a:fmtScheme name="TinyLittleOffice"><a:fillStyleLst>${'<a:solidFill><a:schemeClr val="phClr"/></a:solidFill>'.repeat(3)}</a:fillStyleLst><a:lnStyleLst>${'<a:ln w="9525"><a:solidFill><a:schemeClr val="phClr"/></a:solidFill></a:ln>'.repeat(3)}</a:lnStyleLst><a:effectStyleLst>${'<a:effectStyle><a:effectLst/></a:effectStyle>'.repeat(3)}</a:effectStyleLst><a:bgFillStyleLst>${'<a:solidFill><a:schemeClr val="phClr"/></a:solidFill>'.repeat(3)}</a:bgFillStyleLst></a:fmtScheme></a:themeElements></a:theme>`;

const TITLE_FRAME = xfrm(MARGIN, 685800, SLIDE_W - 2 * MARGIN, ICON);
const BODY_FRAME = xfrm(MARGIN, 2133600, SLIDE_W - 2 * MARGIN, SLIDE_H - 2133600 - 685800);
const textColor = '<a:solidFill><a:schemeClr val="tx1"/></a:solidFill><a:latin typeface="+mn-lt"/>';

const MASTER = `${XML_HEAD}<p:sldMaster ${P_NS}><p:cSld><p:bg><p:bgPr><a:solidFill><a:schemeClr val="bg1"/></a:solidFill><a:effectLst/></p:bgPr></p:bg><p:spTree>${GROUP}${placeholder(2, 'title', para('Headline'), TITLE_FRAME)}${placeholder(3, 'body', para('Bullets'), BODY_FRAME)}</p:spTree></p:cSld><p:clrMap bg1="lt1" tx1="dk1" bg2="lt2" tx2="dk2" accent1="accent1" accent2="accent2" accent3="accent3" accent4="accent4" accent5="accent5" accent6="accent6" hlink="hlink" folHlink="folHlink"/><p:sldLayoutIdLst><p:sldLayoutId id="2147483649" r:id="rId1"/></p:sldLayoutIdLst><p:txStyles><p:titleStyle><a:lvl1pPr algn="l"><a:lnSpc><a:spcPct val="90000"/></a:lnSpc><a:buNone/><a:defRPr sz="4400" b="1">${textColor.replace('+mn-lt', '+mj-lt')}</a:defRPr></a:lvl1pPr></p:titleStyle><p:bodyStyle><a:lvl1pPr marL="342900" indent="-342900"><a:spcBef><a:spcPts val="1000"/></a:spcBef><a:buClr><a:schemeClr val="accent1"/></a:buClr><a:buFont typeface="Arial"/><a:buChar char="&#8226;"/><a:defRPr sz="2800">${textColor}</a:defRPr></a:lvl1pPr></p:bodyStyle><p:otherStyle><a:lvl1pPr><a:defRPr sz="1800">${textColor}</a:defRPr></a:lvl1pPr></p:otherStyle></p:txStyles></p:sldMaster>`;

const LAYOUT = `${XML_HEAD}<p:sldLayout ${P_NS} type="obj" preserve="1"><p:cSld name="Title and Content"><p:spTree>${GROUP}${placeholder(2, 'title', para('Headline'))}${placeholder(3, 'body', para('Bullets'))}</p:spTree></p:cSld><p:clrMapOvr><a:masterClrMapping/></p:clrMapOvr></p:sldLayout>`;

const pic = (id: number, rel: string, name: string, frame: string) =>
  `<p:pic><p:nvPicPr><p:cNvPr id="${id}" name="${x(name)}" descr="${x(name)}"/><p:cNvPicPr><a:picLocks noChangeAspect="1"/></p:cNvPicPr><p:nvPr/></p:nvPicPr><p:blipFill><a:blip r:embed="${rel}"/><a:stretch><a:fillRect/></a:stretch></p:blipFill><p:spPr>${frame}${RECT}</p:spPr></p:pic>`;

/** The pictures PowerPoint needs drawn: each icon used, and each embedded document. */
function pictures(body: string): Record<string, { svg: string; w: number; h: number }> {
  const out: Record<string, { svg: string; w: number; h: number }> = {};
  slidesWith(body).forEach((s, i) => {
    if (s.icon && ICON_SVG[s.icon]) out[`icon-${s.icon}`] = { w: 256, h: 256, svg: `<svg xmlns="http://www.w3.org/2000/svg" width="256" height="256" viewBox="0 0 24 24" fill="none" stroke="${ICON_COLORS[deckIconColor(body)]?.hex ?? ACCENT}" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">${ICON_SVG[s.icon]}</svg>` };
    if (s.sub) {
      const p = refPage(s.sub);
      out[`sub-${i + 1}`] = { w: p.w * 2, h: p.h * 2, svg: pageSvg(p) };
    }
  });
  return out;
}

export function deckToPptx(body: string, ctx: DownloadContext): Uint8Array {
  const slides = slidesWith(body);
  const png = ctx.png ?? {};
  const files: Record<string, string | Uint8Array> = {};
  const slideRels: [string, string, string][] = [];
  let types = '';
  const E = (px: number) => Math.round((px / SW) * SLIDE_W); // slide px to EMU

  slides.forEach((s, i) => {
    const n = i + 1;
    const L = layoutSlide(s);
    const cover = s.layout === 't';
    const links: [string, string, string][] = [['rId1', 'slideLayout', '../slideLayouts/slideLayout1.xml']];
    let pics = '';
    const addPicture = (key: string, box: { x: number; y: number; w: number; h: number }, name: string) => {
      if (!png[key]) return;
      files[`ppt/media/${key}.png`] = png[key];
      const rel = `rId${links.length + 1}`;
      links.push([rel, 'image', `../media/${key}.png`]);
      pics += pic(3 + links.length, rel, name, xfrm(E(box.x), E(box.y), E(box.w), E(box.h)));
    };
    if (L.icon) addPicture(`icon-${s.icon}`, L.icon, s.icon);
    if (L.sub && s.sub) {
      // Keep the picture's own shape inside the space the slide gives it.
      const p = refPage(s.sub);
      const k = Math.min(L.sub.w / p.w, L.sub.h / p.h);
      addPicture(`sub-${n}`, { x: L.sub.x + (L.sub.w - p.w * k) / 2, y: L.sub.y + (L.sub.h - p.h * k) / 2, w: p.w * k, h: p.h * k }, resolve(s.sub).title);
    }
    const lines = s.sub ? [] : [...live(s.bullets), ...(s.layout === '2' ? live(s.right) : [])];
    const centre = cover ? '<a:pPr marL="0" indent="0" algn="ctr"><a:buNone/></a:pPr>' : '';
    const paras = (lines.length ? lines : ['']).map((b) => para(b.trim(), centre || (depthOf(b) ? `<a:pPr lvl="${depthOf(b)}" marL="${342900 * (depthOf(b) + 1)}" indent="-342900"/>` : ''), Math.round((L.bodyPx || 20) * 75))).join('');
    // (A slide given over to a document keeps empty placeholders, tucked along the bottom edge.)
    const col = L.cols[0] ?? { x: 64, y: SH - 40, w: SW - 2 * 64, h: 20 };
    const bodyW = L.cols.length > 1 ? L.cols[1].x + L.cols[1].w - col.x : col.w;
    const titleBox = s.sub ? col : L.title;
    const titleFrame = xfrm(E(titleBox.x), E(titleBox.y), E(titleBox.w), E(Math.max(titleBox.h, 60)));
    const bodyFrame = xfrm(E(col.x), E(col.y), E(bodyW), E(Math.max(col.h, 80)));
    files[`ppt/slides/slide${n}.xml`] =
      `${XML_HEAD}<p:sld ${P_NS}><p:cSld><p:spTree>${GROUP}${placeholder(2, 'title', para(s.sub ? '' : s.title, cover ? '<a:pPr algn="ctr"/>' : '', Math.round((L.titlePx || 20) * 75)), titleFrame)}${placeholder(3, 'body', paras, bodyFrame)}${pics}</p:spTree></p:cSld><p:clrMapOvr><a:masterClrMapping/></p:clrMapOvr></p:sld>`;
    files[`ppt/slides/_rels/slide${n}.xml.rels`] = rels(links);
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

/**
 * The deck ends with a slide that is a QR code of the whole deck, its
 * title beneath: whoever is in the room can take it home. (A deck too long
 * for a code ends as it is.) The slide is made, not written: it shows
 * another document, a QR code of this deck's own link.
 */
export function closingSlide(body: string): Slide | null {
  if (!deckEndsWithQr(body)) return null;
  const site = (import.meta.env?.VITE_SITE_URL as string | undefined) ?? '';
  const link = `${site}deck/${LINK}deck/${encodeEnvelope({ created: null, body, title: title(body) || undefined }, 'deck')}`;
  if (new TextEncoder().encode(link).length > QR_MAX_BYTES || !body.trim()) return null;
  return { icon: '', title: '', bullets: [], sub: makeRef('qr', link) };
}
/** The slides as shown and printed: what was written, then the closing code. */
export const slidesWith = (body: string): Slide[] => {
  const slides = parseDeck(body);
  const end = closingSlide(body);
  return end ? [...slides, end] : slides;
};

const title = (body: string) => plainInline(parseDeck(body).find((s) => s.title.trim())?.title.trim() ?? '');

/**
 * A deck written plainly may carry a chart or a table on a slide as the
 * sheet's own rows: a slide whose body starts with a sheet settings line
 * ("!bar", "!pie|tn$") or holds tab-separated rows becomes a slide showing
 * that sheet. The compact form keeps it as "@@sheet/<document>".
 */
export function readDeck(text: string): string {
  if (!text.includes('\t') && !/^!(bar|line|pie)?(\|[tn$%d]*)?$/m.test(text)) return text;
  return text
    .split('\n\n')
    .map((chunk) => {
      const lines = chunk.split('\n');
      const at = lines.findIndex((l, i) => i > 0 && (/^!(bar|line|pie)?(\|[tn$%d]*)?$/.test(l) || (l.includes('\t') && (lines[i + 1] ?? '').includes('\t'))));
      if (at < 0 || lines.some((l) => l.startsWith('@@'))) return chunk;
      // The sheet runs to the end of the slide, bar any speaker notes.
      const notes = lines.slice(at).filter((l) => l.startsWith('> '));
      const rows = lines.slice(at).filter((l) => !l.startsWith('> '));
      return [...lines.slice(0, at), '@@' + makeRef('sheet', rows.join('\n')), ...notes].join('\n');
    })
    .join('\n\n');
}

/** The deck as it plays: every slide, every reveal, the QR slide last; a cross-fade between them. */
export function deckFrames(body: string): { pages: Page[]; delayMs: number; fade: boolean } {
  const color = deckIconColor(body);
  const pages: Page[] = [];
  for (const s of slidesWith(body)) {
    const st = slideSteps(s);
    const clicks = st.bullets + st.sub;
    for (let shown = 0; shown <= clicks; shown++) pages.push(slidePage(s, shown, st.sub ? shown : undefined, color));
  }
  return { pages, delayMs: 1400, fade: true };
}

export default defineApp({
  id: 'deck',
  read: readDeck,
  frames: deckFrames,
  group: '',
  name: 'Deck',
  icon: 'deck',
  blurb: 'Slides: titles, bullets, two columns, big icons, and other documents shown on a slide.',
  title,
  outline: (body) => parseDeck(body).flatMap((s) => [s.title, ...[...s.bullets, ...(s.right ?? [])].map((b) => (b.trim() ? '•  ' + b : ''))]).map((l) => plainInline(l.trim())).filter(Boolean),
  view: (body) => slidesWith(body).map((s) => slidePage(s, Infinity, undefined, deckIconColor(body))),
  presents: true,
  html: (body) =>
    parseDeck(body)
      .map((s, i) => {
        const tag = i === 0 ? 'h1' : 'h2';
        const marks = (b: string) => parseInline(b).map((ru) => { let h = x(ru.t); if (ru.b) h = `<b>${h}</b>`; if (ru.i) h = `<i>${h}</i>`; if (ru.u) h = `<u>${h}</u>`; if (ru.s) h = `<s>${h}</s>`; return h; }).join('');
        const list = (items: string[]) => (live(items).length ? `<ul>\n${live(items).map((b) => `<li>${marks(b)}</li>`).join('\n')}\n</ul>` : '');
        const sub = s.sub ? `<figure>${pageSvg(refPage(s.sub), `role="img" aria-label="${x(resolve(s.sub).title)}"`)}<figcaption><small>${x(resolve(s.sub).title)}</small></figcaption></figure>` : '';
        return `<section>\n<${tag}>${s.title ? marks(s.title) : x(`Slide ${i + 1}`)}</${tag}>\n${list(s.bullets)}${s.layout === '2' ? list(s.right ?? []) : ''}${sub}\n</section>`;
      })
      .join('\n'),
  downloads: [{ ext: 'pptx', label: 'PowerPoint', mime: 'application/vnd.openxmlformats-officedocument.presentationml.presentation', build: deckToPptx, needs: pictures }],
  shortcuts: [
    { keys: 'Mod+B / Mod+I / Mod+U / Mod+Shift+H', does: 'Bold, italic, underline, highlight (in a headline or bullet)' },
    { keys: 'Tab / Shift+Tab (in the bullets)', does: 'Indent the bullet, or bring it back out' },
    { keys: 'Mod+Enter', does: 'New slide' },
    { keys: 'PageUp / PageDown', does: 'Previous or next slide' },
    { keys: 'Mod+Shift+Enter', does: 'Present' },
    { keys: 'Right / Space / Click', does: 'While presenting: reveal the next thing' },
    { keys: 'Double click / End', does: 'While presenting: show the whole slide at once' },
    { keys: 'Left / Backspace', does: 'While presenting: go back' },
    { keys: 'Escape', does: 'Stop presenting' },
  ],
});
