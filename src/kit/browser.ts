/**
 * The parts of the kit that need a browser: measuring text, turning a
 * document into picture, PDF or file, showing one document inside another,
 * and opening an editor for a document that lives inside another.
 */
import { html, render } from 'lit';
import { unsafeSVG } from 'lit/directives/unsafe-svg.js';
import { COMMON, MOVING, FONT, History, apps, byGroup, docHtml, extOf, fileName, pageSvg, printHtml, setMeasurer, stack, utf8, type AppDef, type DownloadContext, type Page } from './core.ts';
import { SELF, makeRef, refPage, resolve } from './embed.ts';
import { pdf, type PdfPage } from './pdf.ts';
import { embedOf, withAccount, type Embed } from '../lib/embeds.ts';
import { toMarkdown } from '../lib/markdown.ts';
import { envelopeText } from '../lib/envelope.ts';
import { withHead } from '../lib/tlo.ts';
import { encodeGif } from '../lib/gif.ts';
import { icon, UI } from '../lib/icons.ts';
import type { SlDialog } from '../lib/shoelace.ts';
import plex400 from '@fontsource/ibm-plex-sans/files/ibm-plex-sans-latin-400-normal.woff2?url';
import plex700 from '@fontsource/ibm-plex-sans/files/ibm-plex-sans-latin-700-normal.woff2?url';

/** Fired on window when something every picture depends on has arrived (the fonts, the full icon set). */
export const REFRESH = 'to-refresh';

// Lay documents out with the real widths of the words in them.
const pen = document.createElement('canvas').getContext('2d');
if (pen)
  setMeasurer((text, px, bold) => {
    pen.font = `${bold ? 700 : 400} ${px}px ${FONT}`;
    return pen.measureText(text).width;
  });

// Text is measured in IBM Plex once it has loaded; until then, in whatever stands in for it.
void Promise.all([document.fonts.load("400 16px 'IBM Plex Sans'"), document.fonts.load("700 16px 'IBM Plex Sans'")]).then(() => window.dispatchEvent(new Event(REFRESH)));

/**
 * A picture drawn from SVG cannot see the page's fonts, so the fonts go
 * inside the SVG. Fetched once, the first time a picture is made.
 */
let fontCss: Promise<string> | null = null;
export function fontsForPictures(): Promise<string> {
  return (fontCss ??= Promise.all(
    ([[400, plex400], [700, plex700]] as const).map(async ([weight, url]) => {
      const bytes = new Uint8Array(await (await fetch(url)).arrayBuffer());
      let bin = '';
      for (let i = 0; i < bytes.length; i += 0x8000) bin += String.fromCharCode(...bytes.subarray(i, i + 0x8000));
      return `@font-face{font-family:'IBM Plex Sans';font-weight:${weight};src:url(data:font/woff2;base64,${btoa(bin)}) format('woff2')}`;
    }),
  ).then((faces) => faces.join(''), () => ''));
}

/** A page of its own (a site, a zine to read) with the fonts inside it, so it looks the same anywhere, with no connection. */
export async function withFonts(page: string): Promise<string> {
  const faces = await fontsForPictures();
  return faces ? page.replace('<head>', `<head>\n<style>${faces}</style>`) : page;
}

/** Draw SVG markup as a PNG or JPEG. `scale` trades sharpness for size. */
export async function raster(svg: string, w: number, h: number, type: 'image/png' | 'image/jpeg' = 'image/png', scale = 1): Promise<Uint8Array | null> {
  // A picture drawn from SVG cannot fetch anything, so images it refers to (map tiles) are put inside it first.
  const refs = [...new Set([...svg.matchAll(/<image href="(https:[^"]+)"/g)].map((m) => m[1]))].slice(0, 60);
  const inlined = await Promise.all(
    refs.map(async (url) => {
      try {
        const blob = await (await fetch(url)).blob();
        return await new Promise<string>((done, fail) => {
          const reader = new FileReader();
          reader.onload = () => done(reader.result as string);
          reader.onerror = fail;
          reader.readAsDataURL(blob);
        });
      } catch {
        return '';
      }
    }),
  );
  refs.forEach((url, i) => (svg = svg.split(`href="${url}"`).join(`href="${inlined[i]}"`)));
  try {
    const img = await svgImage(svg);
    const canvas = document.createElement('canvas');
    canvas.width = Math.round(w * scale);
    canvas.height = Math.round(h * scale);
    const g = canvas.getContext('2d')!;
    g.fillStyle = '#fff';
    g.fillRect(0, 0, canvas.width, canvas.height);
    g.drawImage(img, 0, 0, canvas.width, canvas.height);
    const blob = await new Promise<Blob | null>((done) => canvas.toBlob(done, type, 0.92));
    return blob ? new Uint8Array(await blob.arrayBuffer()) : null;
  } catch {
    return null;
  }
}

/** SVG markup as an image a canvas can draw, with the fonts inside it. Rejects if it cannot be drawn. */
async function svgImage(svg: string): Promise<HTMLImageElement> {
  const fonts = await fontsForPictures();
  const img = new Image();
  img.src = 'data:image/svg+xml;charset=utf-8,' + encodeURIComponent(fonts ? svg.replace(/<svg[^>]*>/, (open) => `${open}<style>${fonts}</style>`) : svg);
  await img.decode();
  return img;
}

/** Sharp, but never an image so large a phone cannot hold it. */
const sharp = (p: Page) => Math.max(1, Math.min(2, 4096 / Math.max(p.w, p.h)));

/** The whole document as one picture. */
export function picture(def: AppDef, body: string): Promise<Uint8Array | null> {
  const page = stack(def.view(body));
  return raster(pageSvg(page), page.w, page.h, 'image/png', sharp(page));
}

/**
 * Hand a file to the person. On a phone it opens in a tab of its own, to be
 * looked at (a phone shows a PDF, a picture, a PowerPoint or a spreadsheet,
 * and its viewer has its own share button); if the tab is refused, it goes
 * through the share sheet, which has Save to Files. Elsewhere, a browser
 * that asks where to save (the File System Access API) asks; the rest, and
 * anything refused, is a download.
 */
export async function saveFile(name: string, mime: string, data: Uint8Array) {
  const file = new File([data as BlobPart], name, { type: mime });
  const nav = navigator as Navigator & { canShare?(d: { files: File[] }): boolean };
  const phone = /iPhone|iPad|Android/i.test(navigator.userAgent);
  const picker = (window as Window & { showSaveFilePicker?(o: { suggestedName: string; types: { accept: Record<string, string[]> }[] }): Promise<{ createWritable(): Promise<{ write(d: Blob): Promise<void>; close(): Promise<void> }> }> }).showSaveFilePicker;
  if (!phone && picker && window.isSecureContext) {
    try {
      const handle = await picker.call(window, { suggestedName: name, types: [{ accept: { [mime.split(';')[0]]: [name.slice(name.lastIndexOf('.'))] } }] });
      const out = await handle.createWritable();
      await out.write(file);
      await out.close();
      return;
    } catch (err) {
      // Cancelled: nothing to do. Refused (a gesture too long ago, a frame that may not ask): a download instead.
      if (err instanceof DOMException && err.name === 'AbortError') return;
    }
  }
  if (phone) {
    const url = URL.createObjectURL(file);
    // Kept a while: the tab reads it after it opens, and may be reloaded.
    if (window.open(url, '_blank')) return void setTimeout(() => URL.revokeObjectURL(url), 300_000);
    URL.revokeObjectURL(url);
  }
  if (phone && nav.canShare?.({ files: [file] })) {
    try {
      await navigator.share({ files: [file], title: name });
      return;
    } catch (err) {
      // Dismissed: nothing to do. Refused (a gesture too long ago, say): fall through to a download.
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

/** The app's own formats first (the first is what Ctrl+S saves), then the ones every app has, once each. */
export const formatsOf = (def: AppDef) => {
  const own = (def.downloads ?? []).map((d) => ({ ext: d.ext, label: d.label }));
  return [...own, ...(def.frames ? [MOVING] : []), ...COMMON.filter((c) => !own.some((o) => o.ext === c.ext))];
};

/**
 * The document as an animated GIF: each frame rasterised, cross-faded into
 * the next when asked, quantised and encoded (lib/gif.ts). Sized so a
 * phone can hold it: at most 640 wide.
 */
export async function movie(def: AppDef, body: string): Promise<Uint8Array | null> {
  if (!def.frames) return null;
  const { pages, delayMs, fade } = def.frames(body);
  if (!pages.length) return null;
  const scale = Math.min(1, 640 / pages[0].w);
  const w = Math.round(pages[0].w * scale);
  const h = Math.round(pages[0].h * scale);
  const canvas = document.createElement('canvas');
  canvas.width = w;
  canvas.height = h;
  const g = canvas.getContext('2d', { willReadFrequently: true })!;
  const images: HTMLImageElement[] = [];
  try {
    for (const p of pages) images.push(await svgImage(pageSvg(p)));
  } catch {
    return null;
  }
  const frames: { data: Uint8ClampedArray; delayMs: number }[] = [];
  const shot = (delay: number) => frames.push({ data: g.getImageData(0, 0, w, h).data, delayMs: delay });
  const paint = (img: HTMLImageElement, alpha = 1) => {
    g.globalAlpha = alpha;
    g.drawImage(img, 0, 0, w, h);
    g.globalAlpha = 1;
  };
  images.forEach((img, i) => {
    g.fillStyle = '#fff';
    g.fillRect(0, 0, w, h);
    paint(img);
    shot(delayMs);
    const next = images[i + 1];
    if (fade && next) {
      // A short cross-fade: the next page over this one, a little more each frame.
      for (let k = 1; k <= 4; k++) {
        g.fillStyle = '#fff';
        g.fillRect(0, 0, w, h);
        paint(img);
        paint(next, k / 5);
        shot(60);
      }
    }
  });
  return encodeGif(w, h, frames, { loop: 0 });
}

/** Pages as a PDF: each drawn as a JPEG, as sharp as the page size allows. */
async function pdfOf(pages: Page[], title: string): Promise<Uint8Array | null> {
  const drawn: PdfPage[] = [];
  for (const p of pages) {
    const k = sharp(p);
    const jpeg = await raster(pageSvg(p), p.w, p.h, 'image/jpeg', k);
    if (jpeg) drawn.push({ w: p.w, h: p.h, pw: Math.round(p.w * k), ph: Math.round(p.h * k), jpeg });
  }
  return drawn.length ? pdf(drawn, title) : null;
}

/**
 * Save a document as a file of the given kind. Returns the file's name, or
 * null if the app has no such format.
 */
export async function download(def: AppDef, body: string, wanted: string, ctx: DownloadContext, link = '', title = ''): Promise<string | null> {
  const ext = extOf(wanted);
  const name = fileName(def, body, ext, title);
  const own = def.downloads?.find((d) => d.ext === ext);
  let data: Uint8Array | null = null;
  let mime = '';
  if (own?.pages) {
    data = await pdfOf(own.pages(body), title || def.title(body) || def.name);
    mime = own.mime;
  } else if (own?.build) {
    const png: Record<string, Uint8Array> = {};
    for (const [key, pic] of Object.entries(own.needs?.(body) ?? {})) {
      const drawn = await raster(pic.svg, pic.w, pic.h);
      if (drawn) png[key] = drawn;
    }
    data = own.build(body, { ...ctx, png, title: title || undefined });
    mime = own.mime;
  } else if (ext === 'png') {
    data = await picture(def, body);
    mime = 'image/png';
  } else if (ext === 'gif' && def.frames) {
    data = await movie(def, body);
    mime = 'image/gif';
  } else if (ext === 'pdf') {
    data = await pdfOf(def.view(body), title || def.title(body) || def.name);
    mime = 'application/pdf';
  } else if (ext === 'tlo') {
    // The document exactly as its link holds it, with the app that opens it in its header.
    data = utf8(envelopeText({ created: ctx.created, title: title || undefined, body: withHead(body, { app: def.id }) }));
    mime = 'text/markdown;charset=utf-8';
  } else if (ext === 'md') {
    data = utf8(toMarkdown(body, title));
    mime = 'text/markdown;charset=utf-8';
  } else if (ext === 'html') {
    data = utf8(def.document ? await withFonts(def.document(body, ctx)) : docHtml({ def, body, title }, ctx, link));
    mime = 'text/html;charset=utf-8';
  } else return null;
  if (!data) throw new Error('Could not draw the document');
  await saveFile(name, mime, data);
  return name;
}

/**
 * Print the document, or save it as a PDF from the browser's print dialog:
 * the browser's own text engine and every font on the device do the work,
 * so a text in any script comes out as text. The page to print
 * (core.ts printHtml) is loaded in a frame of its own, off the screen, so
 * the editor around the document is never on the paper; the frame goes
 * when the dialog closes.
 */
export async function printDoc(def: AppDef, body: string, ctx: DownloadContext, title = ''): Promise<void> {
  document.querySelector('.to-print')?.remove();
  const frame = document.createElement('iframe');
  frame.className = 'to-print';
  frame.title = 'Print';
  frame.setAttribute('aria-hidden', 'true');
  frame.style.cssText = 'position:fixed;right:0;bottom:0;width:0;height:0;border:0;visibility:hidden';
  frame.srcdoc = await withFonts(printHtml({ def, body, title: title || undefined }, ctx));
  await new Promise<void>((loaded) => {
    frame.addEventListener('load', () => loaded(), { once: true });
    document.body.append(frame);
  });
  const win = frame.contentWindow;
  const done = () => frame.remove();
  win?.addEventListener('afterprint', done, { once: true });
  // A browser that never says the dialog closed: the frame goes anyway, after the fonts and pictures have had their moment.
  setTimeout(done, 120_000);
  win?.focus();
  win?.print();
}

/* ---------- one document inside another ---------- */

/**
 * <to-embed ref="app/payload">: a document shown inside another. It draws
 * itself in a shadow root, so the text around it cannot reach in and edit
 * it: it is one thing, to open, change or remove.
 *   step      how much to reveal (documents that build up)
 *   fill      it takes the height of where it is (a slide), its picture
 *             scaled to fit
 *   controls  it can be changed here: the picture itself and an Edit button
 *             open its editor ("embed-edit"), Remove takes it away
 *             ("embed-remove"). Without controls its title links to it.
 */
/** What Wikipedia says of an article, on the tap: enough for the card. */
interface Summary {
  title: string;
  extract: string;
  thumb: string;
}
export class ToEmbed extends HTMLElement {
  static observedAttributes = ['ref', 'step', 'controls'];
  /** A thing from the web, loaded: the reader asked for it by tapping its card. */
  private loaded = false;
  /** The lookup's answer, once asked: who a Bluesky handle is, or Wikipedia's summary; '' when it did not say. */
  private answer: string | Summary | null = null;
  constructor() {
    super();
    this.attachShadow({ mode: 'open' });
  }
  private redraw = () => this.draw();
  connectedCallback() {
    window.addEventListener(REFRESH, this.redraw);
    this.draw();
  }
  disconnectedCallback() {
    window.removeEventListener(REFRESH, this.redraw);
  }
  attributeChangedCallback(name: string) {
    if (name === 'ref') (this.loaded = false), (this.answer = null);
    this.draw();
  }
  /**
   * The card tapped: the thing itself. Bluesky is first asked who the
   * handle is (its embed wants the account's id); Wikipedia is asked for
   * the article's summary, which is what the card then shows. If the
   * provider does not answer, the card offers the thing there instead.
   */
  private async load(web: Embed) {
    this.loaded = true;
    this.draw();
    if (!web.lookup) return;
    try {
      const r = await fetch(web.lookup, { referrerPolicy: 'no-referrer' });
      const got = r.ok ? ((await r.json()) as { did?: string; title?: string; extract?: string; thumbnail?: { source: string } }) : {};
      this.answer = web.kind === 'article' ? (got.extract ? { title: got.title ?? web.title, extract: got.extract, thumb: got.thumbnail?.source ?? '' } : '') : (got.did ?? '');
    } catch {
      this.answer = '';
    }
    this.draw();
  }
  private fire(name: string) {
    this.dispatchEvent(new CustomEvent(name, { bubbles: true, composed: true, detail: this.getAttribute('ref') }));
  }
  private draw() {
    const ref = this.getAttribute('ref');
    if (!ref || !this.isConnected) return;
    const d = resolve(ref);
    const step = this.getAttribute('step');
    const page = refPage(ref, { preview: true, ...(step === null ? {} : { step: Number(step) }) });
    const kind = d.def?.name ?? 'Document';
    const editable = this.hasAttribute('controls') && !d.locked;
    // From the web: the card until it is tapped; then the thing itself, in a frame that can reach nothing here, or by the browser's own element.
    const asked = d.def?.id === 'web' ? embedOf(d.body.split('\n').find((l) => /^https?:/.test(l.trim()))?.trim() ?? '') : null;
    const web = asked && typeof this.answer === 'string' && this.answer && asked.kind !== 'article' ? withAccount(asked, this.answer) : asked;
    const summary = web?.kind === 'article' && typeof this.answer === 'object' ? this.answer : null;
    const live = web && this.loaded && (!web.lookup || summary);
    const plays = web && (web.kind === 'video' || web.kind === 'audio' || web.kind === 'music');
    // Nothing to load: the card is the way there (the provider embeds nothing without its script, or did not answer).
    const out = web && (web.kind === 'link' || this.answer === '');
    render(
      html`<style>
          /* (white-space: inside a text being written the page keeps its spaces, which would draw this markup's own line breaks as blank lines.) */
          :host { display: block; margin: 0.8em 0; user-select: none; white-space: normal; }
          /* fill: it has the height of where it is (a slide), the picture shrinking to fit above the caption. */
          :host([fill]) { margin: 0; height: 100%; }
          :host([fill]) figure { height: 100%; display: flex; flex-direction: column; box-sizing: border-box; }
          :host([fill]) .pic { flex: 1; min-height: 0; display: grid; place-items: center; }
          :host([fill]) .pic > svg { max-height: 100%; height: 100%; }
          figure { margin: 0; border: 1px solid var(--to-border, #d4d4d8); border-radius: 10px; overflow: hidden; background: #fff; }
          .pic > svg { display: block; width: 100%; height: auto; max-height: 60vh; margin: 0 auto; }
          /* (Never drawn larger than its own size: a small table is not blown up to fill the width.) */
          figcaption { display: flex; align-items: center; gap: 8px; padding: 6px 8px 6px 12px; border-top: 1px solid var(--to-border, #d4d4d8); background: var(--to-surface-2, #f4f4f5); color: var(--to-ink, #18181b); font: 13.5px system-ui, sans-serif; }
          a { color: inherit; font-weight: 600; text-decoration: none; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
          a:hover { text-decoration: underline; }
          b { overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
          small { color: var(--to-ink-3, #71717a); flex: 1; }
          .pic { position: relative; padding: 10px; }
          .pic.edit { cursor: pointer; }
          .pic.web { padding: 0; }
          .pic .load { position: absolute; left: 50%; bottom: 14px; transform: translateX(-50%); padding: 8px 14px; border: 0; border-radius: 999px; background: var(--to-accent, #4f46e5); color: #fff; font: 600 13px system-ui, sans-serif; text-decoration: none; cursor: pointer; display: inline-flex; align-items: center; gap: 6px; white-space: nowrap; }
          .pic .load:hover { filter: brightness(1.1); }
          iframe { display: block; width: 100%; border: 0; background: #fff; }
          iframe.video { aspect-ratio: 16 / 9; }
          iframe.map { aspect-ratio: 4 / 3; }
          iframe.post { height: 520px; }
          iframe.music { height: 352px; }
          iframe.code { height: 400px; }
          iframe.pdf, iframe.page { height: 70vh; }
          :host([fill]) iframe { height: 100%; aspect-ratio: auto; }
          img { display: block; max-width: 100%; max-height: 70vh; height: auto; margin: 0 auto; }
          :host([fill]) img { max-height: 100%; height: 100%; object-fit: contain; }
          video { display: block; width: 100%; max-height: 70vh; background: #000; }
          :host([fill]) video { height: 100%; }
          audio { display: block; width: 100%; box-sizing: border-box; padding: 18px 14px; }
          .summary { display: flex; gap: 16px; padding: 16px; font: 15px/1.5 system-ui, sans-serif; color: var(--to-ink, #18181b); text-align: left; }
          .summary img { flex-shrink: 0; width: 120px; height: 120px; object-fit: cover; border-radius: 8px; margin: 0; }
          .summary p { margin: 4px 0 8px; }
          .summary a { font-weight: 600; color: var(--to-accent, #4f46e5); white-space: normal; }
          .pic .hint { position: absolute; right: 10px; top: 10px; padding: 4px 10px; border-radius: 999px; background: var(--to-accent, #4f46e5); color: #fff; font: 600 12.5px system-ui, sans-serif; opacity: 0.92; pointer-events: none; }
          button { display: inline-flex; align-items: center; gap: 4px; white-space: nowrap; flex-shrink: 0; border: 1px solid var(--to-border, #d4d4d8); border-radius: 6px; background: var(--to-surface, #fff); color: inherit; font: inherit; padding: 3px 8px; cursor: pointer; }
          button:hover { border-color: var(--to-accent, #4f46e5); }
          button:focus-visible, a:focus-visible { outline: 2px solid var(--to-accent, #4f46e5); outline-offset: 1px; }
        </style>
        <figure>
          <div class="pic ${editable && !web ? 'edit' : ''} ${web ? 'web' : ''}" @click=${editable && !web ? () => this.fire('embed-edit') : null}>
            ${live
              ? summary
                ? html`<div class="summary">
                    ${summary.thumb ? html`<img src=${summary.thumb} alt="" referrerpolicy="no-referrer" loading="lazy" />` : ''}
                    <div><b>${summary.title}</b><p>${summary.extract}</p><a href=${web.url} target="_blank" rel="noopener noreferrer">Read on Wikipedia</a></div>
                  </div>`
                : web.kind === 'image'
                  ? html`<img src=${web.src} alt=${d.title} referrerpolicy="no-referrer" loading="lazy" />`
                  : // (The site answers every request with Referrer-Policy: no-referrer, so a sound or a film carries none either.)
                    web.kind === 'audio'
                    ? html`<audio controls preload="none" src=${web.src} title=${d.title}></audio>`
                    : web.file && web.kind === 'video'
                      ? html`<video controls preload="none" playsinline src=${web.src} title=${d.title}></video>`
                      : html`<iframe class=${web.kind} src=${web.src} title=${d.title} style=${web.h ? `height:${web.h}px` : ''} sandbox="allow-scripts allow-same-origin allow-popups allow-popups-to-escape-sandbox allow-presentation" allow="autoplay; fullscreen; picture-in-picture" referrerpolicy="no-referrer" loading="lazy"></iframe>`
              : html`<svg viewBox="0 0 ${page.w} ${page.h}" style="width:min(100%, ${page.w}px)" role="img" aria-label="${d.title}">${unsafeSVG(page.svg)}</svg>`}
            ${editable && !web ? html`<span class="hint" aria-hidden="true">Tap to edit</span>` : ''}
            ${web && !live
              ? out
                ? html`<a class="load" href=${web.url} target="_blank" rel="noopener noreferrer">${icon(UI.globe, 14)} Open on ${web.provider}</a>`
                : html`<button type="button" class="load" ?disabled=${this.loaded} @click=${() => this.load(web)}>${icon(plays ? UI.play : UI.globe, 14)} ${plays ? 'Play' : 'Show'} (loads it from ${web.provider})</button>`
              : ''}
          </div>
          <figcaption>
            ${editable
              ? html`<b>${d.title}</b>`
              : web
                ? html`<a href=${web.url} target="_blank" rel="noopener noreferrer" data-tip="Open on ${web.provider}">${d.title}</a>`
                : html`<a href=${d.hash} data-tip="Open this ${kind.toLowerCase()}">${d.title}</a>`}<small>${d.title === kind ? '' : kind}</small>
            ${editable
              ? html`<button type="button" @click=${() => this.fire('embed-edit')}>${icon(UI.pen, 13)} Edit</button><button type="button" aria-label="Remove this ${kind.toLowerCase()}" @click=${() => this.fire('embed-remove')}>${icon(UI.close, 13)} Remove</button>`
              : ''}
          </figcaption>
        </figure>`,
      this.shadowRoot!,
    );
  }
}
if (!customElements.get('to-embed')) customElements.define('to-embed', ToEmbed);

/** The apps that can go inside another, as options for a combobox, in the menu's order and clusters. */
/** What an Insert choice makes: a new document of that app (a chart is a sheet that asks to be drawn as one), or the document's own QR code. */
export const insertedRef = (what: string) => (what === 'qr-self' ? SELF : what === 'chart' ? makeRef('sheet', withHead('', { chart: 'bar' })) : makeRef(what, ''));

export function insertOptions(host: string, skip: (a: AppDef) => boolean = () => false): { value: string; label: string; group?: string; icon?: keyof typeof UI }[] {
  const all = embeddable(host).filter((a) => !skip(a));
  const groups = [...new Set(all.filter((a) => !a.under).map((a) => a.group ?? ''))].sort(byGroup);
  const name = (a: AppDef) => (a.id === 'sheet' ? 'Table' : a.id === 'trip' ? 'Map' : a.id === 'draw' ? 'Drawing' : a.name);
  const out: { value: string; label: string; group?: string; icon?: keyof typeof UI }[] = [
    { value: 'qr-self', label: 'QR code of this document', group: '', icon: 'qr' },
    { value: 'web', label: 'From the web: a video, a post, a song, a place, a picture, a file', group: '', icon: 'globe' },
  ];
  const ic = (a: AppDef) => (a.icon in UI ? (a.icon as keyof typeof UI) : undefined);
  for (const g of groups)
    for (const a of all.filter((x) => !x.under && (x.group ?? '') === g)) {
      out.push({ value: a.id, label: name(a), group: g, icon: ic(a) });
      if (a.id === 'sheet') out.push({ value: 'chart', label: 'Chart', group: g, icon: 'chart' });
      for (const c of all.filter((x) => x.under === a.id)) out.push({ value: c.id, label: name(c), group: g, icon: ic(c) });
    }
  return out;
}

const embeddable = (host: string) => apps().filter((a) => !a.hidden && a.id !== host && a.id !== 'write' && a.id !== 'deck');

/**
 * Open an editor for a document that lives inside another one. Resolves
 * with the document's new "<app>/<payload>" when the dialog is closed.
 */
export async function editRef(ref: string): Promise<string> {
  const d = resolve(ref);
  if (!d.def || d.locked) return ref;
  const editor = document.createElement(`to-${d.def.id}`) as HTMLElement & { value: string };
  editor.value = d.body;
  let body = d.body;
  const history = new History();
  editor.addEventListener('docchange', (e) => {
    e.stopPropagation();
    history.record(body);
    // Hand the editor its own text back, as the shell does: then `value` is always the document, and setting it undoes.
    editor.value = body = (e as CustomEvent<string>).detail;
  });
  const dialog = document.createElement('sl-dialog') as SlDialog;
  dialog.label = d.def.name;
  dialog.className = 'to-sub';
  dialog.append(editor);
  const done = Object.assign(document.createElement('sl-button'), { slot: 'footer', variant: 'primary', textContent: 'Done' });
  done.addEventListener('click', () => dialog.hide());
  dialog.append(done);
  // Undo and redo work in here too, on this document alone.
  dialog.addEventListener('keydown', (e) => {
    const k = e.key.toLowerCase();
    if (!(e.ctrlKey || e.metaKey) || e.altKey || (k !== 'z' && k !== 'y')) return;
    e.preventDefault();
    const to = k === 'z' && !e.shiftKey ? history.undo(body) : history.redo(body);
    if (to !== null) editor.value = body = to;
  });
  document.body.append(dialog);
  return new Promise((finish) => {
    // Things inside the editor (menus, tooltips) hide too; only the dialog's own hiding ends the edit.
    dialog.addEventListener('sl-after-hide', (e) => {
      if (e.target !== dialog) return;
      dialog.remove();
      finish(makeRef(d.def!.id, body));
    });
    void customElements.whenDefined('sl-dialog').then(() => dialog.show());
  });
}
