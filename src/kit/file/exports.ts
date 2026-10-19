/**
 * Every document as a file, by one mechanism: a format is one object (app.ts Export) that says what it is (its
 * extension, type and words), whether the browser shows it, whether it is drawn still, and how it builds its bytes
 * from the document alone. formatsOf(def) is the one list: the kit's six (KIT_FORMATS: the pages as a PDF, a picture
 * and a web page through pdfOf, picture and htmlOf, the web page its text layer first; Markdown; the text; the
 * kernel's document as JSON) less any the app makes its own way, then the app's own. The Download table, the
 * ".<ext>" route, exportAs and the share sheet read that list and nothing else, so nothing here asks which extension
 * it holds. (It replaced special cases in exportAs beside placeholder builders that
 * returned empty bytes, with a second place deciding what the browser shows and a third what gets a link.)
 *
 * Print is not a format: the browser's dialog, through a hidden srcdoc frame with @page at the page's size, which
 * saves a PDF too. A file is handed over by showSaveFilePicker where there is one, the share sheet on a phone, and
 * <a download> everywhere else.
 */
import type { AppDef, Doc, Export, ExportContext, Page } from '../core/app.ts';
import { INK, MUTED, FONT, pageSvg, stack, fileName, slug, xml } from '../draw/draw.ts';
const r = (n: number) => String(Math.round(n * 100) / 100);
import type { MenuItem } from '../ui/menu.ts';
import { appOf } from '../core/apps.ts';
import { encodeDoc } from '../core/codec.ts';
import { go, parseHash, routeHash } from '../core/route.ts';
import { parse, referenceNotes, write } from '../../doc/index.ts';
import { pdf } from './pdf.ts';
import { tloText } from '../core/plain.ts';
import { copyText } from '../share/share.ts';
import { ensureIcons, iconNames, UI } from '../draw/icons.ts';
import { readyImages } from '../draw/image-picture.ts';
import { t } from '../core/i18n.ts';
import { toast } from '../core/say.ts';
import { textLayer } from '../text/text-layer.ts';
import { textHtml } from '../text/text-view.ts';

export { slug, utf8 } from '../draw/draw.ts';
export { raster } from '../draw/raster.ts';
import { drawn, jpeg, raster } from '../draw/raster.ts';

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

/** The pages as a .pdf file: each drawn as a JPEG, as sharp as the page size allows (kit/file/pdf.ts says why raster). */
async function pdfOf(pages: Page[], title: string): Promise<Uint8Array | null> {
  const drawn = [];
  for (const p of pages) {
    const k = sharp(p);
    const bytes = await jpeg(pageSvg(p), p.w, p.h, k);
    if (bytes) drawn.push({ w: p.w, h: p.h, pw: Math.round(p.w * k), ph: Math.round(p.h * k), jpeg: bytes });
  }
  return drawn.length ? pdf(drawn, title) : null;
}

/** The page's language and direction, for a file made of it ('en' and left to right where there is no page). */
const langOf = () => (typeof document === 'undefined' ? 'en' : document.documentElement.lang || 'en');
const dirOf = () => (typeof document === 'undefined' ? '' : document.documentElement.dir);

/**
 * A document as a standalone web page, with the tags link previews read: its text layer first (kit/text/text-view.ts
 * textHtml, `text`), for a screen reader, then its pages as pictures, hidden from one, as the Display Link has them.
 */
export function htmlOf(pages: Page[], title: string, link = '', text = ''): string {
  const dir = dirOf();
  return `<!doctype html>
<html lang="${langOf()}"${dir ? ` dir="${xml(dir)}"` : ''}>
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<title>${xml(title)}</title>
<meta name="generator" content="TinyLittleOffice">
<meta property="og:title" content="${xml(title)}">${link ? `\n<link rel="alternate" href="${xml(link)}" title="${xml(t('common-open-in-tiny-little-office'))}">` : ''}
<style>body{font:17px/1.6 ${FONT};color:${INK};max-width:46em;margin:2em auto;padding:0 1em}figure{margin:1em 0}figure svg{display:block;max-width:100%;height:auto;border:1px solid #d4d4d8;border-radius:8px}footer{color:${MUTED};font-size:.85em}.sr-only{position:absolute;width:1px;height:1px;overflow:hidden;clip:rect(0 0 0 0);white-space:nowrap}</style>
</head>
<body>
<main>
<h1>${xml(title)}</h1>
<article class="to-text sr-only">${text}</article>
<div class="pages" aria-hidden="true">
${pages.map((p) => `<figure>${pageSvg(p.alt ? p : { ...p, alt: title })}</figure>`).join('\n')}
</div>
</main>${link ? `\n<footer><p><a href="${xml(link)}">${xml(t('common-open-in-tiny-little-office'))}</a></p></footer>` : ''}
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
<html lang="${langOf()}">
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
  frame.title = t('download-print');
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
const titleOf = (doc: Doc, { def, title }: ExportContext) => title || def.title(doc) || t('common-untitled-noun', { noun: def.noun });

/** The pages, drawn still where the format says so. */
const pagesOf = (doc: Doc, ctx: ExportContext, still?: boolean) => ctx.def.view(doc, still ? STILL : undefined);

/**
 * The formats every app has: the .pdf file, a picture, a web page, Markdown, the text, the JSON. Each builds its own bytes
 * through the pages (pdfOf, picture, htmlOf). Markdown is the document's own text (TLO is Markdown), its footnotes in
 * the reference form other readers know; a .tlo carries its app (kit/core/plain.ts), and so does a .json, the kernel's
 * document as JSON (src/doc/json.ts; its schema is packages/doc/schema/tlo.schema.json).
 */
export const KIT_FORMATS: readonly Export[] = [
  { ext: 'pdf', label: () => t('export-pdf-file'), mime: 'application/pdf', shows: 'own', still: true, build: async (doc, ctx) => drawn(await pdfOf(pagesOf(doc, ctx, true), titleOf(doc, ctx))) },
  { ext: 'png', label: () => t('download-picture-png'), mime: 'image/png', shows: 'own', still: true, build: async (doc, ctx) => drawn(await picture(pagesOf(doc, ctx, true))) },
  {
    ext: 'html',
    label: () => t('common-web-page-html'),
    mime: 'text/html',
    shows: 'own',
    build: async (doc, ctx) => htmlOf(pagesOf(doc, ctx), titleOf(doc, ctx), ctx.link, textHtml(textLayer(ctx.def, doc))),
  },
  { ext: 'md', label: () => t('common-markdown'), mime: 'text/markdown;charset=utf-8', shows: 'text', build: (doc) => write(referenceNotes(parse(doc))) },
  { ext: 'tlo', label: () => t('download-text-tlo'), mime: 'text/plain;charset=utf-8', shows: 'text', build: (doc, { def }) => tloText(def.id, doc) },
  {
    ext: 'json',
    label: () => t('download-data-json'),
    mime: 'application/json',
    shows: 'text',
    build: async (doc, { def }) => (await import('../../doc/json.ts')).docJson(parse(tloText(def.id, doc))),
  },
];

/**
 * The one list of what a document of this app can become: the kit's formats less the ones the app makes its own way
 * (write's HTML is the words, not pictures of its pages), then the app's own. The Download table, the ".<ext>" route,
 * exportAs and the share sheet all read it; nothing anywhere asks which extension it is holding.
 */
export function formatsOf(def: AppDef): Export[] {
  const own = (def.exports ?? []).filter((f) => !f.available || can.get(f) === true);
  const theirs = new Set(own.map((f) => f.ext));
  return [...KIT_FORMATS.filter((f) => !theirs.has(f.ext)), ...own];
}

/** What each format with an `available` check said, once a session; until it has said, the format is not listed. */
const can = new Map<Export, boolean>();
const asking = new Map<Export, Promise<void>>();

/**
 * The app's formats that ask whether this browser can make them (a WebM wants its encoder), asked: once a session
 * each, so formatsOf lists those that can. The shell asks as an app opens and draws the Download table again after.
 */
export function formatsReady(def: AppDef): Promise<void> {
  const ask = (f: Export) => {
    if (!asking.has(f))
      asking.set(
        f,
        f.available!().then(
          (ok) => void can.set(f, ok),
          () => void can.set(f, false),
        ),
      );
    return asking.get(f)!;
  };
  return Promise.all((def.exports ?? []).filter((f) => f.available).map(ask)).then(() => {});
}

/** The app's format with this extension, if it has one. */
export const formatOf = (def: AppDef, ext: string): Export | undefined => new Map(formatsOf(def).map((f) => [f.ext, f])).get(ext);

/** A document made into a file: its name, its type and its bytes. */
export interface Made {
  name: string;
  mime: string;
  data: Uint8Array | string;
}

/** The document built as a file of this format: every icon it names drawn first, and every host-kept picture's bytes in hand. */
export async function fileOf(format: Export, { doc, ctx }: Current): Promise<Made> {
  const { def } = ctx;
  // Every icon the document names is drawn: one outside the starter set waits for the rest of Lucide. A picture the
  // host keeps is fetched now, since a page drawn still cannot fetch (kit/draw/image-picture.ts readyImages).
  await Promise.all([ensureIcons(iconNames(doc)), readyImages(doc)]);
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
  await formatsReady(current().ctx.def);
  const format = formatOf(current().ctx.def, view);
  if (!format && view !== 'print') return;
  try {
    if (!format) return void (await printDoc(current()));
    const name = await exportAs(format.ext, current());
    if (name) toast(t('download-downloaded-name', { name }));
  } catch {
    toast(t('download-failed'));
  }
}

/** Print the document (not a format: the browser's dialog, which saves a PDF too), drawn still. */
export async function printDoc({ doc, ctx }: Current): Promise<void> {
  await Promise.all([ensureIcons(iconNames(doc)), readyImages(doc)]);
  await printPages(pagesOf(doc, ctx, true), titleOf(doc, ctx));
}

/* ---------- a file shown, or shared ---------- */

/** The type a file of this format is shown in the browser as: its own, plain text, or null where the browser shows nothing. */
const shownAs = (format: Export): string | null => (format.shows === 'own' ? format.mime.split(';')[0] : format.shows === 'text' ? 'text/plain;charset=utf-8' : null);

/** Whether this device's share sheet takes a file of this format (asked of an empty one, before any is made). */
function sharesFile(format: Export): boolean {
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
async function viewFile(format: Export, current: Current) {
  const tab = window.open('', '_blank');
  if (tab) tab.opener = null;
  try {
    const shown = shownAs(format);
    if (!shown) throw new Error('nothing to show');
    const made = await fileOf(format, current);
    const url = URL.createObjectURL(new Blob([typeof made.data === 'string' ? made.data : (made.data as BlobPart)], { type: shown }));
    setTimeout(() => URL.revokeObjectURL(url), 300_000);
    if (tab) tab.location.href = url;
    else if (!window.open(url, '_blank', 'noopener')) toast(t('export-could-not-show-ext', { ext: format.ext }));
  } catch {
    tab?.close();
    toast(t('export-could-not-show-ext', { ext: format.ext }));
  }
}

/** The file to the device's share sheet. */
async function shareFile(format: Export, current: Current) {
  try {
    const made = await fileOf(format, current);
    const file = new File([typeof made.data === 'string' ? made.data : (made.data as BlobPart)], made.name, { type: made.mime.split(';')[0] });
    await navigator.share({ files: [file], title: made.name });
  } catch (err) {
    if (!(err instanceof DOMException && err.name === 'AbortError')) toast(t('export-could-not-share-ext', { ext: format.ext }));
  }
}

/* ---------- the Download menu ---------- */

/**
 * The Download menu's items: Print first; then a row per format in formatsOf, its words the format's label, each with
 * View (where the format `shows`), Share (where the device's share sheet takes it),
 * Download, and Copy link (the link that downloads it as it opens, "#/v1/<app>.<ext>/<payload>"); then the
 * hand-offs to apps that exist. `def` is the app's, so drawing the menu reads nothing; `current` (which brings the
 * link up to the document, kit/core/shell.ts flushLink) is read only when an item is chosen.
 */
export function exportItems(def: AppDef, current: () => Current): MenuItem[] {
  const run = async (does: () => Promise<string | null | void>) => {
    try {
      const name = await does();
      if (name) toast(t('download-downloaded-name', { name }));
    } catch {
      toast(t('download-failed'));
    }
  };
  const linkTo = (ext: string) => {
    const u = new URL(current().ctx.link);
    u.hash = routeHash(def.id, parseHash(u.hash).payload, ext);
    return u.href;
  };
  const row = (f: Export): MenuItem => ({
    label: f.label(),
    actions: [
      ...(f.shows ? [{ icon: UI.view, label: t('export-view-ext', { ext: f.ext }), does: () => void viewFile(f, current()) }] : []),
      ...(sharesFile(f) ? [{ icon: UI.share, label: t('export-share-ext', { ext: f.ext }), does: () => void shareFile(f, current()) }] : []),
      { icon: UI.download, label: t('export-download-ext', { ext: f.ext }), does: () => void run(() => exportAs(f.ext, current(), false)) },
      { icon: UI.link, label: t('export-copy-link-that-downloads-ext', { ext: f.ext }), does: () => void copyText(linkTo(f.ext)) },
    ],
    does: () => {},
  });
  return [
    { label: t('common-print-or-save-as-pdf'), icon: UI.print, keys: 'Mod+P', does: () => void run(() => printDoc(current())) },
    ...formatsOf(def).map(row),
    ...(def.handoffs ?? [])
      .filter((h) => appOf(h.to))
      .map((h) => ({ label: h.label(), icon: appOf(h.to)!.icon, group: t('export-open-in'), does: () => go(routeHash(h.to, encodeDoc(h.convert(current().doc)))) })),
  ];
}
