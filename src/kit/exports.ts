/**
 * Every document as a file, by one mechanism: a format is one object (app.ts Export) that says what it is (its
 * extension, type and words), whether the browser shows it, whether it is drawn still, and how it builds its bytes
 * from the document alone. formatsOf(def) is the one list: the kit's five (KIT_FORMATS: the pages as a PDF, a picture
 * and a web page through pdfOf, picture and htmlOf; Markdown; the text) less any the app makes its own way, then the
 * app's own. The Download table, the ".<ext>" route, exportAs and the share sheet read that list and nothing else, so
 * nothing here asks which extension it holds. (It replaced special cases in exportAs beside placeholder builders that
 * returned empty bytes, with a second place deciding what the browser shows and a third what gets a link.)
 *
 * Print is not a format: the browser's dialog, through a hidden srcdoc frame with @page at the page's size, which
 * saves a PDF too. A file is handed over by showSaveFilePicker where there is one, the share sheet on a phone, and
 * <a download> everywhere else. (The ideas of the old tree's kit/core.ts printHtml and kit/browser.ts.)
 */
import type { AppDef, Doc, Export, ExportContext, Page } from './app.ts';
import { INK, MUTED, FONT, pageSvg, stack, fileName, slug, xml } from './draw.ts';
const r = (n: number) => String(Math.round(n * 100) / 100);
import type { MenuItem } from './menu.ts';
import { appOf } from './apps.ts';
import { encodeDoc } from './codec.ts';
import { go, parseHash, routeHash } from './route.ts';
import { parse, referenceNotes, write } from '../doc/index.ts';
import { pdf } from './pdf.ts';
import { tloText } from './plain.ts';
import { copyText } from './share.ts';
import { ensureIcons, iconNames, UI } from './icons.ts';
import { t } from './i18n.ts';
import { toast } from './toast.ts';

export { xml, PAPER, INK, MUTED, FONT, pageSvg, stack, slug, fileName, utf8 } from './draw.ts';
export { raster } from './raster.ts';
import { drawn, jpeg, raster } from './raster.ts';

/* ---------- handing a file over ---------- */

const phone = () => /iPhone|iPad|Android/i.test(navigator.userAgent);
type Picker = (o: { suggestedName: string; types: { accept: Record<string, string[]> }[] }) => Promise<{ createWritable(): Promise<{ write(d: Blob): Promise<void>; close(): Promise<void> }> }>;

/**
 * Hand a file to the person: the browser's own "save as" where it has one (the File System Access API),
 * the share sheet on a phone (which has Save to Files) unless `share` is false (the Download menu has a Share of
 * its own beside it), and a download everywhere else or when refused.
 */
export async function saveFile(name: string, mime: string, data: Uint8Array | string, share = true) {
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
  if (share && phone() && navigator.canShare?.({ files: [file] })) {
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
<meta property="og:title" content="${xml(title)}">${link ? `\n<link rel="alternate" href="${xml(link)}" title="${xml(t('Open in Tiny Little Office'))}">` : ''}
<style>body{font:17px/1.6 ${FONT};color:${INK};max-width:46em;margin:2em auto;padding:0 1em}figure{margin:1em 0}figure svg{display:block;max-width:100%;height:auto;border:1px solid #d4d4d8;border-radius:8px}footer{color:${MUTED};font-size:.85em}</style>
</head>
<body>
<main>
<h1>${xml(title)}</h1>
${pages.map((p) => `<figure>${pageSvg(p.alt ? p : { ...p, alt: title })}</figure>`).join('\n')}
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
${pages.map((p) => `<figure>${pageSvg(p.alt ? p : { ...p, alt: title })}</figure>`).join('\n')}
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
  // The frame takes the focus to print; when it goes, the focus comes back where it was, not to nothing.
  const was = document.activeElement instanceof HTMLElement && document.activeElement !== document.body ? document.activeElement : null;
  const done = () => {
    const had = frame.isConnected && (document.activeElement === frame || document.activeElement === document.body);
    frame.remove();
    if (had && was?.isConnected) was.focus({ preventScroll: true });
  };
  win?.addEventListener('afterprint', done, { once: true });
  setTimeout(done, 120_000);
  win?.focus();
  win?.print();
}

/* ---------- the formats ---------- */

/** The document in hand: what every format builds from. */
export interface Current {
  doc: Doc;
  ctx: ExportContext;
}

/** Paper, a PDF and a PNG cannot move: an animation in them is drawn still (ViewOpts.still). A web page moves, so the HTML is drawn as the browser shows it. */
const STILL = { still: true } as const;

/** The document's name, or what one of the app's documents is called when untitled: a file's title. */
const titleOf = (doc: Doc, { def, title }: ExportContext) => title || def.title(doc) || t('Untitled {noun}', { noun: def.noun });

/** The pages, drawn still where the format says so. */
const pagesOf = (doc: Doc, ctx: ExportContext, still?: boolean) => ctx.def.view(doc, still ? STILL : undefined);

/**
 * The formats every app has: the .pdf file, a picture, a web page, Markdown, the text. Each builds its own bytes
 * through the pages (pdfOf, picture, htmlOf). Markdown is the document's own text (TLO is Markdown), its footnotes in
 * the reference form other readers know; a .tlo carries its app (kit/plain.ts).
 */
export const KIT_FORMATS: readonly Export[] = [
  { ext: 'pdf', label: () => t('PDF file'), mime: 'application/pdf', shows: 'own', still: true, build: async (doc, ctx) => drawn(await pdfOf(pagesOf(doc, ctx, true), titleOf(doc, ctx))) },
  { ext: 'png', label: () => t('Picture (PNG)'), mime: 'image/png', shows: 'own', still: true, build: async (doc, ctx) => drawn(await picture(pagesOf(doc, ctx, true))) },
  { ext: 'html', label: () => t('Web page (HTML)'), mime: 'text/html', shows: 'own', build: async (doc, ctx) => htmlOf(pagesOf(doc, ctx), titleOf(doc, ctx), ctx.link) },
  { ext: 'md', label: () => t('Markdown'), mime: 'text/markdown;charset=utf-8', shows: 'text', build: (doc) => write(referenceNotes(parse(doc))) },
  { ext: 'tlo', label: () => t('Text (TLO)'), mime: 'text/plain;charset=utf-8', shows: 'text', build: (doc, { def }) => tloText(def.id, doc) },
];

/**
 * The one list of what a document of this app can become: the kit's formats less the ones the app makes its own way
 * (write's HTML is the words, not pictures of its pages), then the app's own. The Download table, the ".<ext>" route,
 * exportAs and the share sheet all read it; nothing anywhere asks which extension it is holding.
 */
export function formatsOf(def: AppDef): Export[] {
  const own = def.exports ?? [];
  const theirs = new Set(own.map((f) => f.ext));
  return [...KIT_FORMATS.filter((f) => !theirs.has(f.ext)), ...own];
}

/** The app's format with this extension, if it has one. */
export const formatOf = (def: AppDef, ext: string): Export | undefined => new Map(formatsOf(def).map((f) => [f.ext, f])).get(ext);

/** A document made into a file: its name, its type and its bytes. */
export interface Made {
  name: string;
  mime: string;
  data: Uint8Array | string;
}

/** The document built as a file of this format: every icon it names drawn first. */
export async function fileOf(format: Export, { doc, ctx }: Current): Promise<Made> {
  const { def } = ctx;
  // Every icon the document names is drawn: one outside the starter set waits for the rest of Lucide.
  await ensureIcons(iconNames(doc));
  const data = await format.build(doc, ctx);
  return { name: fileName(ctx.title || def.title(doc), slug(def.noun) || def.id, format.ext), mime: format.mime, data };
}

/** Save the document as one of its app's formats: find it, build it, hand it over. The file's name, or null when the app has no such format. */
export async function exportAs(ext: string, current: Current, share = true): Promise<string | null> {
  const format = formatOf(current.ctx.def, ext);
  if (!format) return null;
  const made = await fileOf(format, current);
  await saveFile(made.name, made.mime, made.data, share);
  return made.name;
}

/**
 * A ".<ext>" link's view, once the document is up: the file in one of its app's formats (formatsOf) downloads; ".print"
 * prints. Any other extension does nothing (the document opens plainly).
 */
export async function viewAs(view: string, current: () => Current): Promise<void> {
  const format = formatOf(current().ctx.def, view);
  if (!format && view !== 'print') return;
  try {
    if (!format) return void (await printDoc(current()));
    const name = await exportAs(format.ext, current());
    if (name) toast(t('Downloaded {name}', { name }));
  } catch {
    toast(t('Download failed'));
  }
}

/** Print the document (not a format: the browser's dialog, which saves a PDF too), drawn still. */
export async function printDoc({ doc, ctx }: Current): Promise<void> {
  await ensureIcons(iconNames(doc));
  await printPages(pagesOf(doc, ctx, true), titleOf(doc, ctx));
}

/* ---------- a file shown, or shared ---------- */

/** The type a file of this format is shown in the browser as: its own, plain text, or null where the browser shows nothing. */
export const shownAs = (format: Export): string | null => (format.shows === 'own' ? format.mime.split(';')[0] : format.shows === 'text' ? 'text/plain;charset=utf-8' : null);

/** Whether this device's share sheet takes a file of this format (asked of an empty one, before any is made). */
export function sharesFile(format: Export): boolean {
  try {
    return typeof navigator.share === 'function' && !!navigator.canShare?.({ files: [new File([''], `file.${format.ext}`, { type: format.mime.split(';')[0] })] });
  } catch {
    return false;
  }
}

/**
 * The file opened in a new tab, from a blob URL. The tab is opened now, while the click that asked is still the
 * browser's reason to allow it, and sent to the file once the file is made. (A blob's page is this site's, under
 * this site's Content-Security-Policy: no script the site did not write runs in it.)
 */
export async function viewFile(format: Export, current: Current) {
  const tab = window.open('', '_blank');
  if (tab) tab.opener = null;
  try {
    const shown = shownAs(format);
    if (!shown) throw new Error('nothing to show');
    const made = await fileOf(format, current);
    const url = URL.createObjectURL(new Blob([typeof made.data === 'string' ? made.data : (made.data as BlobPart)], { type: shown }));
    setTimeout(() => URL.revokeObjectURL(url), 300_000);
    if (tab) tab.location.href = url;
    else if (!window.open(url, '_blank', 'noopener')) toast(t('Could not show the .{ext}', { ext: format.ext }));
  } catch {
    tab?.close();
    toast(t('Could not show the .{ext}', { ext: format.ext }));
  }
}

/** The file to the device's share sheet. */
export async function shareFile(format: Export, current: Current) {
  try {
    const made = await fileOf(format, current);
    const file = new File([typeof made.data === 'string' ? made.data : (made.data as BlobPart)], made.name, { type: made.mime.split(';')[0] });
    await navigator.share({ files: [file], title: made.name });
  } catch (err) {
    if (!(err instanceof DOMException && err.name === 'AbortError')) toast(t('Could not share the .{ext}', { ext: format.ext }));
  }
}

/* ---------- the Download menu ---------- */

/**
 * The Download menu's items: Print first; then a row per format in formatsOf, its words the format's label, each with
 * View (where the format `shows`), Share (where the device's share sheet takes it),
 * Download, and Copy link (the link that downloads it as it opens, "#/v1/<app>.<ext>/<payload>"); then the
 * hand-offs to apps that exist.
 */
export function exportItems(current: () => Current): MenuItem[] {
  const run = async (does: () => Promise<string | null | void>) => {
    try {
      const name = await does();
      if (name) toast(t('Downloaded {name}', { name }));
    } catch {
      toast(t('Download failed'));
    }
  };
  const { def } = current().ctx;
  const linkTo = (ext: string) => {
    const u = new URL(current().ctx.link);
    u.hash = routeHash(def.id, parseHash(u.hash).payload, ext);
    return u.href;
  };
  const row = (f: Export): MenuItem => ({
    label: f.label(),
    actions: [
      ...(f.shows ? [{ icon: UI.view, label: t('View the .{ext}', { ext: f.ext }), does: () => void viewFile(f, current()) }] : []),
      ...(sharesFile(f) ? [{ icon: UI.share, label: t('Share the .{ext}…', { ext: f.ext }), does: () => void shareFile(f, current()) }] : []),
      { icon: UI.download, label: t('Download the .{ext}', { ext: f.ext }), does: () => void run(() => exportAs(f.ext, current(), false)) },
      { icon: UI.link, label: t('Copy a link that downloads the .{ext}', { ext: f.ext }), does: () => void copyText(linkTo(f.ext)) },
    ],
    does: () => {},
  });
  return [
    { label: t('Print, or save as PDF'), icon: UI.print, keys: 'Mod+P', does: () => void run(() => printDoc(current())) },
    ...formatsOf(def).map(row),
    ...(def.handoffs ?? [])
      .filter((h) => appOf(h.to))
      .map((h) => ({ label: h.label(), icon: appOf(h.to)!.icon, group: t('Open in'), does: () => go(routeHash(h.to, encodeDoc(h.convert(current().doc)))) })),
  ];
}
