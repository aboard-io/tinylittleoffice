/**
 * Every document as a file, by one mechanism: the app's view() gives pages (SVG), and the kit turns them
 * into what the browser can make of them. Print (the browser's dialog, which saves a PDF too) through a
 * hidden srcdoc frame with @page at the page's size; a picture through a canvas; a web page; the text
 * itself. A file is handed over by showSaveFilePicker where there is one, the share sheet on a phone,
 * and <a download> everywhere else. (The ideas of the old tree's kit/core.ts printHtml and kit/browser.ts.)
 */
import type { AppDef, Doc, Export, ExportContext, Page } from './app.ts';
import { INK, MUTED, FONT, pageSvg, stack, fileName, slug, xml } from './draw.ts';
const r = (n: number) => String(Math.round(n * 100) / 100);
import type { MenuItem } from './menu.ts';
import { appOf } from './apps.ts';
import { encodeDoc } from './codec.ts';
import { parseHash, routeHash } from './route.ts';
import { parse, referenceNotes, write } from '../doc/index.ts';
import { pdf } from './pdf.ts';
import { tloText } from './plain.ts';
import { copyText } from './share.ts';
import { ensureIcons, iconNames, UI } from './icons.ts';
import { t } from './i18n.ts';
import { toast } from './toast.ts';
import { embedPictures } from './media.ts';

export { xml, PAPER, INK, MUTED, FONT, pageSvg, stack, slug, fileName, utf8 } from './draw.ts';
export { raster } from './raster.ts';
import { jpeg, raster } from './raster.ts';

/* ---------- handing a file over ---------- */

const phone = () => /iPhone|iPad|Android/i.test(navigator.userAgent);
type Picker = (o: { suggestedName: string; types: { accept: Record<string, string[]> }[] }) => Promise<{ createWritable(): Promise<{ write(d: Blob): Promise<void>; close(): Promise<void> }> }>;

/**
 * Hand a file to the person: the browser's own "save as" where it has one (the File System Access API),
 * the share sheet on a phone (which has Save to Files), and a download everywhere else or when refused.
 */
export async function saveFile(name: string, mime: string, data: Uint8Array | string) {
  const file = new File([typeof data === 'string' ? data : (data as BlobPart)], name, { type: mime });
  const picker = (window as Window & { showSaveFilePicker?: Picker }).showSaveFilePicker;
  if (!phone() && picker && window.isSecureContext) {
    try {
      const handle = await picker.call(window, { suggestedName: name, types: [{ accept: { [mime.split(';')[0]]: [name.slice(name.lastIndexOf('.'))] } }] });
      const out = await handle.createWritable();
      await out.write(file);
      await out.close();
      return;
    } catch (err) {
      if (err instanceof DOMException && err.name === 'AbortError') return;
    }
  }
  if (phone() && navigator.canShare?.({ files: [file] })) {
    try {
      await navigator.share({ files: [file], title: name });
      return;
    } catch (err) {
      if (err instanceof DOMException && err.name === 'AbortError') return;
    }
  }
  const url = URL.createObjectURL(file);
  const a = document.createElement('a');
  a.href = url;
  a.download = name;
  document.body.append(a);
  a.click();
  a.remove();
  setTimeout(() => URL.revokeObjectURL(url), 10_000);
}

/* ---------- the kit's own formats ---------- */

/** Sharp, but never an image so large a phone cannot hold it. */
const sharp = (p: Page) => Math.max(1, Math.min(2, 4096 / Math.max(p.w, p.h)));

/** The whole document as one picture. */
export function picture(pages: Page[]): Promise<Uint8Array | null> {
  const page = stack(pages);
  return raster(pageSvg(page), page.w, page.h, sharp(page));
}

/** The pages as a .pdf file: each drawn as a JPEG, as sharp as the page size allows (kit/pdf.ts says why raster). */
export async function pdfOf(pages: Page[], title: string): Promise<Uint8Array | null> {
  const drawn = [];
  for (const p of pages) {
    const k = sharp(p);
    const bytes = await jpeg(pageSvg(p), p.w, p.h, k);
    if (bytes) drawn.push({ w: p.w, h: p.h, pw: Math.round(p.w * k), ph: Math.round(p.h * k), jpeg: bytes });
  }
  return drawn.length ? pdf(drawn, title) : null;
}

/** A document as a standalone web page: its pages as pictures, with the tags link previews read. */
export function htmlOf(pages: Page[], title: string, link = ''): string {
  return `<!doctype html>
<html lang="${document.documentElement.lang || 'en'}">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<title>${xml(title)}</title>
<meta name="generator" content="TinyLittleOffice">
<meta property="og:title" content="${xml(title)}">${link ? `\n<link rel="alternate" href="${xml(link)}" title="Open in Tiny Little Office">` : ''}
<style>body{font:17px/1.6 ${FONT};color:${INK};max-width:46em;margin:2em auto;padding:0 1em}figure{margin:1em 0}figure svg{display:block;max-width:100%;height:auto;border:1px solid #d4d4d8;border-radius:8px}footer{color:${MUTED};font-size:.85em}</style>
</head>
<body>
<main>
<h1>${xml(title)}</h1>
${pages.map((p) => `<figure>${pageSvg(p, `role="img" aria-label="${xml(title)}"`)}</figure>`).join('\n')}
</main>${link ? `\n<footer><p><a href="${xml(link)}">${xml(t('Open in Tiny Little Office'))}</a></p></footer>` : ''}
</body>
</html>
`;
}

/**
 * A document as a page for the browser to print, which is also how it becomes a PDF: a page per picture,
 * each at its own size with no margin (@page), the text in the SVG still text.
 */
export function printHtml(pages: Page[], title: string): string {
  const paper = `${r(pages[0].w / 96)}in ${r(pages[0].h / 96)}in`;
  return `<!doctype html>
<html lang="${document.documentElement.lang || 'en'}">
<head>
<meta charset="utf-8">
<title>${xml(title)}</title>
<style>@page{size:${paper};margin:0}body{margin:0}figure{margin:0;break-after:page}figure:last-child{break-after:auto}figure svg{display:block;width:100%;height:auto}</style>
</head>
<body>
${pages.map((p) => `<figure>${pageSvg(p, `role="img" aria-label="${xml(title)}"`)}</figure>`).join('\n')}
</body>
</html>
`;
}

/** Print the pages: a hidden frame holds them, and the browser's dialog does the rest (it saves a PDF too). */
export async function printPages(pages: Page[], title: string): Promise<void> {
  document.querySelector('.to-print')?.remove();
  const frame = document.createElement('iframe');
  frame.className = 'to-print';
  frame.title = t('Print');
  frame.setAttribute('aria-hidden', 'true');
  frame.style.cssText = 'position:fixed;right:0;bottom:0;width:0;height:0;border:0;visibility:hidden';
  frame.srcdoc = printHtml(pages, title);
  await new Promise<void>((loaded) => {
    frame.addEventListener('load', () => loaded(), { once: true });
    document.body.append(frame);
  });
  const win = frame.contentWindow;
  const done = () => frame.remove();
  win?.addEventListener('afterprint', done, { once: true });
  setTimeout(done, 120_000);
  win?.focus();
  win?.print();
}

/** Pages with every web picture's bytes inside them, fetched through the proxy: a file never asks a picture's site anything. */
export const withPictures = (pages: Page[]): Promise<Page[]> => Promise.all(pages.map(async (p) => (p.svg.includes('<image') ? { ...p, svg: await embedPictures(p.svg) } : p)));

/* ---------- the Download menu ---------- */

export interface Current {
  def: AppDef;
  doc: Doc;
  ctx: ExportContext;
}

/**
 * The formats every app has, after its own: the .pdf file, a picture, a web page, Markdown, the text. (The
 * drawn ones are made in exportAs, which has the pages; a .tlo carries its app, which only exportAs knows.)
 * Markdown is the document's own text (TLO is Markdown), its footnotes in the reference form other readers know.
 */
export function kitExports(): Export[] {
  return [
    { ext: 'pdf', label: () => t('PDF file'), mime: 'application/pdf', build: () => new Uint8Array() },
    { ext: 'png', label: () => t('Picture (PNG)'), mime: 'image/png', build: () => new Uint8Array() },
    { ext: 'html', label: () => t('Web page (HTML)'), mime: 'text/html', build: () => '' },
    { ext: 'md', label: () => t('Markdown'), mime: 'text/markdown;charset=utf-8', build: (doc) => write(referenceNotes(parse(doc))) },
    { ext: 'tlo', label: () => t('Text (TLO)'), mime: 'text/plain;charset=utf-8', build: (doc) => doc },
  ];
}

/** Paper, a PDF and a PNG cannot move: an animation in them is drawn still (ViewOpts.still). A web page moves, so the HTML is drawn as the browser shows it. */
const STILL = { still: true } as const;

/** Save the document as a kind of file; the file's name, or null when there is no such kind. */
export async function exportAs(ext: string, { def, doc, ctx }: Current): Promise<string | null> {
  const given = ctx.title || def.title(doc);
  const title = given || t('Untitled {noun}', { noun: def.noun });
  const name = fileName(given, slug(def.noun) || def.id, ext);
  // Every icon the document names is drawn: one outside the starter set waits for the rest of Lucide.
  await ensureIcons(iconNames(doc));
  if (ext === 'print') {
    await printPages(await withPictures(def.view(doc, STILL)), title);
    return null;
  }
  // An app's own version of a kit format (a text as a real web page rather than pictures of its pages) comes first.
  const theirs = def.exports?.find((x) => x.ext === ext);
  if (theirs) {
    const built = await theirs.build(doc, ctx);
    // An app's own web page holds its pictures' bytes too.
    await saveFile(name, theirs.mime, typeof built === 'string' && theirs.mime.startsWith('text/html') ? await embedPictures(built) : built);
    return name;
  }
  if (ext === 'pdf') {
    const file = await pdfOf(await withPictures(def.view(doc, STILL)), title);
    if (!file) return null;
    await saveFile(name, 'application/pdf', file);
    return name;
  }
  if (ext === 'tlo') {
    await saveFile(name, 'text/plain;charset=utf-8', tloText(def.id, doc));
    return name;
  }
  if (ext === 'png') {
    const png = await picture(await withPictures(def.view(doc, STILL)));
    if (!png) return null;
    await saveFile(name, 'image/png', png);
    return name;
  }
  if (ext === 'html') {
    await saveFile(name, 'text/html', htmlOf(await withPictures(def.view(doc)), title, ctx.link));
    return name;
  }
  const own = kitExports().find((x) => x.ext === ext);
  if (!own) return null;
  await saveFile(name, own.mime, await own.build(doc, ctx));
  return name;
}

/** The Download menu's items for a document: the kit's formats, then the app's own, then its hand-offs to apps that exist. */
export function exportItems(current: () => Current): MenuItem[] {
  const run = async (ext: string) => {
    try {
      const name = await exportAs(ext, current());
      if (name) toast(t('Downloaded {name}', { name }));
    } catch {
      toast(t('Download failed'));
    }
  };
  const { def } = current();
  const theirs = new Set((def.exports ?? []).map((x) => x.ext));
  // A link that downloads the file as it opens ("#/v1/<app>.<ext>/<payload>"): for the .pdf and the app's own formats.
  const linkTo = (ext: string) => {
    const u = new URL(current().ctx.link);
    u.hash = routeHash(def.id, parseHash(u.hash).payload, ext);
    return u.href;
  };
  const linked = [...new Set(['pdf', ...theirs])];
  return [
    { label: t('Print, or save as PDF'), icon: UI.print, hint: keysHint('Mod+P'), does: () => void run('print') },
    // The kit's formats, less any the app makes in its own way (listed among its own below).
    ...kitExports().filter((x) => !theirs.has(x.ext)).map((x) => ({ label: x.label(), icon: x.ext === 'png' ? UI.image : x.ext === 'html' ? UI.globe : UI.text, does: () => void run(x.ext) })),
    ...(def.exports ?? []).map((x) => ({ label: x.label(), icon: UI.download, does: () => void run(x.ext) })),
    ...linked.map((ext) => ({ label: t('Link to the .{ext}', { ext }), icon: UI.link, group: t('Copy a link that downloads'), does: () => void copyText(linkTo(ext)) })),
    ...(def.handoffs ?? []).filter((h) => appOf(h.to)).map((h) => ({ label: h.label(), icon: appOf(h.to)!.icon, group: t('Open in'), does: () => void (location.hash = routeHash(h.to, encodeDoc(h.convert(current().doc)))) })),
  ];
}

const keysHint = (keys: string) => (typeof navigator !== 'undefined' && /Mac|iPhone|iPad/.test(navigator.platform) ? keys.replace('Mod+', '⌘') : keys.replace('Mod+', 'Ctrl+'));
