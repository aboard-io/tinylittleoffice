/**
 * Pictures from the web, asked for first. A picture held by its address on another site is fetched from
 * that site by whoever reads the document, and so tells it who read it and when: a tracking pixel. So a web
 * picture is drawn as a quiet card (its site, its words, and "Show pictures from the web") until the reader
 * asks; one tap shows every web picture of this document for the rest of the visit (in memory, by the
 * document the shell has open: setPictureDoc). A picture inserted in this visit is the author's own choice
 * and shows at once (authored). Saved on this device, a switch in the menu shows them always. data: and
 * blob: pictures, and this site's own, are not from the web and always show. A picture from a host on the
 * whitelist (kit/media.ts TRUSTED) shows at once. Every web picture shown is asked of the proxy
 * (kit/media.ts pictureSrc), never of its own site. Exports (PDF, PNG, HTML) draw the document as it is,
 * the person exporting chose to, with each picture's bytes inside the file (kit/media.ts embedPictures).
 *
 * picture() is an <img> or the card, for an editor; gateSvg() and gateHtml() do the same to drawn pages
 * (an SVG <image>) and to a generated web page (an <img>); with `quiet` (a preview, a thumbnail) a web
 * picture is a grey box and never fetched. A card drawn inside an SVG carries data-webpic, and the one
 * catcher installPictures() puts on the document answers its tap (and Enter) for every page at once, and
 * hides a picture's card once the picture has come (or the picture, when it cannot be fetched).
 * Every <img> drawn sends no referrer.
 */
import { scrollerOf } from './scroll.ts';
import { html, type TemplateResult } from 'lit';
import { icon, UI } from './icons.ts';
import { t } from './i18n.ts';
import { xml } from './draw.ts';
import { keeping, store } from './store.ts';
import { hostOf, pictureSrc, trusted, webPicture } from './media.ts';

/** The per-device switch, kept only while Saved. */
const ALWAYS = 'tinyoffice.pictures';
export const PICTURES = 'to-pictures';

let current = '';
const shown = new Set<string>();
const mine = new Set<string>();

export { hostOf, webPicture } from './media.ts';

const say = () => typeof window !== 'undefined' && window.dispatchEvent(new Event(PICTURES));
/** Called when what shows changes (a tap on Show, the switch); returns the way to stop. */
export function onPictures(cb: () => void): () => void {
  window.addEventListener(PICTURES, cb);
  return () => window.removeEventListener(PICTURES, cb);
}

/** The document the shell has open (its link as it arrived); Show is remembered for it. */
export function setPictureDoc(key: string) {
  current = key;
}
/** Every web picture of the open document, shown for the rest of the visit. */
export function showPictures(key = current) {
  shown.add(key);
  say();
}
/** A picture this visit put into a document: the author's own, shown without asking. */
export function authored(url: string) {
  mine.add(url);
}
/** The switch in the menu (Saved only): web pictures always shown on this device. */
export const alwaysPictures = (): boolean => keeping() && store.get(ALWAYS) === '1';
export function setAlwaysPictures(on: boolean) {
  if (on) store.set(ALWAYS, '1');
  else store.remove(ALWAYS);
  say();
}
/** Whether this picture may be fetched now. */
export const mayShow = (url: string): boolean => !webPicture(url) || trusted(url) || mine.has(url) || shown.has(current) || alwaysPictures();
/** For the tests: a visit begun again. */
export function forgetPictures() {
  shown.clear();
  mine.clear();
  current = '';
}

/** A picture in an editor: the <img> (no referrer), or, from the web and not yet asked for, the card. */
export function picture(url: string, alt: string, cls = ''): TemplateResult {
  if (mayShow(url)) return html`<img class=${cls} src=${pictureSrc(url)} alt=${alt} referrerpolicy="no-referrer" />`;
  return html`<span class="to-webpic ${cls}" role="group" aria-label=${t('A picture from {host}', { host: hostOf(url) })}>
    ${icon(UI.image, 22)}
    <span class="to-webpic-words"><b>${hostOf(url)}</b>${alt ? html`<small>${alt}</small>` : ''}</span>
    <button type="button" class="to-btn to-webpic-show" @click=${(e: Event) => (e.stopPropagation(), showPictures())}>${t('Show pictures from the web')}</button>
  </span>`;
}

const attr = (tag: string, name: string): string | null => new RegExp(`\\s${name}="([^"]*)"`).exec(tag)?.[1] ?? null;
const unxml = (s: string) =>
  s
    .replace(/&quot;/g, '"')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&amp;/g, '&');

/** The card that stands for a web picture on a drawn page, in its box. */
function svgCard(tag: string, url: string, quiet: boolean): string {
  const n = (k: string, d: number) => Number(attr(tag, k) ?? d) || d;
  const x = n('x', 0),
    y = n('y', 0),
    w = n('width', 100),
    h = n('height', 100);
  const box = `<rect x="${x}" y="${y}" width="${w}" height="${h}" fill="#e4e4e7" rx="6"/>`;
  if (quiet) return box;
  const px = Math.max(10, Math.min(18, h / 8, w / 16));
  const mid = x + w / 2;
  const words = (dy: number, s: string, extra = '') => `<text x="${mid}" y="${y + h / 2 + dy}" text-anchor="middle" font-size="${px}" fill="#3f3f46"${extra}>${xml(s)}</text>`;
  return `<g class="to-webpic-svg" data-webpic="" role="button" tabindex="0" aria-label="${xml(t('Show pictures from the web'))}" style="cursor:pointer">${box}${words(-px * 0.4, hostOf(url), ' font-weight="700"')}${words(px * 1.2, t('Show pictures from the web'), ' text-decoration="underline"')}</g>`;
}

/** Drawn pages with every web picture not yet asked for as its card; `quiet`, every web picture a grey box. */
export function gateSvg(svg: string, quiet = false): string {
  if (!svg.includes('<image')) return svg;
  return svg.replace(/<image\b[^>]*?(?:\/>|>\s*<\/image>)/g, (tag) => {
    const url = unxml(attr(tag, 'href') ?? attr(tag, 'xlink:href') ?? '');
    if (!webPicture(url)) return tag;
    // Shown: fetched only as it nears the screen (watchPictures), the address held in data-src until then.
    if (!quiet && mayShow(url)) return tag.replace(/(\s(?:xlink:)?href=")[^"]*"/, () => ` data-src="${xml(pictureSrc(url))}" href="${BLANK}"`);
    return svgCard(tag, url, quiet);
  });
}

/** A grey picture with the site's name, as a data: address: what an <img> of a generated page shows instead. */
const placeholder = (url: string) =>
  `data:image/svg+xml,${encodeURIComponent(`<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 320 200" width="320" height="200"><rect width="320" height="200" fill="#e4e4e7"/><text x="160" y="106" text-anchor="middle" font-family="system-ui,sans-serif" font-size="16" fill="#3f3f46">${xml(hostOf(url))}</text></svg>`)}`;

/** A generated web page with every web picture not yet asked for drawn grey, and every <img> sending no referrer. */
export function gateHtml(page: string): { html: string; hidden: number } {
  let hidden = 0;
  const out = page.replace(/<img\b[^>]*>/g, (tag) => {
    const url = unxml(attr(tag, 'src') ?? '');
    let next = /\sreferrerpolicy=/.test(tag) ? tag : tag.replace(/^<img\b/, '<img referrerpolicy="no-referrer"');
    if (webPicture(url) && !mayShow(url)) {
      hidden++;
      next = next.replace(/\ssrc="[^"]*"/, ` src="${placeholder(url)}"`);
    } else if (webPicture(url)) next = next.replace(/\ssrc="[^"]*"/, ` src="${xml(pictureSrc(url))}"`);
    return next;
  });
  // A picture in a card the page loads on a tap (an embed) is asked of the proxy too.
  const boxed = out.replace(/<div class="web-pic" data-as="img"[^>]*>/g, (tag) => {
    const url = unxml(attr(tag, 'data-src') ?? '');
    return webPicture(url) ? tag.replace(/\sdata-src="[^"]*"/, ` data-src="${xml(pictureSrc(url))}"`) : tag;
  });
  return { html: boxed, hidden };
}

/** Whether drawn pages hold a web picture not yet asked for. */
export const hidesPictures = (svg: string): boolean => gateSvg(svg).includes('data-webpic=""');

/** A picture's stand-in until it nears the screen: one transparent pixel. */
export const BLANK = 'data:image/gif;base64,R0lGODlhAQABAIAAAAAAAP///yH5BAEAAAAALAAAAAABAAEAAAIBRAA7';

/**
 * Web pictures are fetched only as they near the screen (Paul, 2026-10-11: "It shouldn't fetch images until right
 * before they are in viewport"): gateSvg holds each one's address in data-src, and an IntersectionObserver with a
 * margin of a screen and a half hands it to href as the picture approaches; a MutationObserver catches the pictures
 * of pages drawn later. The browser's own loading="lazy" is for <img>, not an SVG <image>, hence the observer.
 */
export function watchPictures(root: Document = document) {
  if (typeof IntersectionObserver === 'undefined') return;
  // One observer per box that scrolls (the reader's main, the editor's column, the page itself): a margin on the
  // viewport is clipped by a scrolling ancestor, so the box the picture scrolls in is the observer's root.
  const observers = new Map<Element | null, IntersectionObserver>();
  const observerFor = (box: Element | null) => {
    let io = observers.get(box);
    if (!io) {
      io = new IntersectionObserver(
        (entries) => {
          for (const e of entries) {
            if (!e.isIntersecting) continue;
            const el = e.target;
            const src = el.getAttribute('data-src');
            if (src) {
              el.setAttribute('href', src);
              el.removeAttribute('data-src');
            }
            io!.unobserve(el);
          }
        },
        { root: box, rootMargin: '150% 0px' },
      );
      observers.set(box, io);
    }
    return io;
  };
  const watch = (from: ParentNode) => {
    for (const el of from.querySelectorAll('image[data-src]')) {
      const sc = scrollerOf(el.parentElement);
      observerFor(sc === root.scrollingElement || sc === root.documentElement ? null : sc).observe(el);
    }
  };
  watch(root);
  new MutationObserver((muts) => {
    for (const m of muts) for (const n of m.addedNodes) if (n instanceof Element) watch(n);
  }).observe(root.body ?? root, { childList: true, subtree: true });
}

/**
 * A picture drawn over its card (`<g data-pic>`, the card a `<g data-pic-card>` beneath the `<image>`, as the deck
 * draws one): once it has come the card is hidden, so nothing shows round it; if it never comes, the picture is,
 * so the card shows and never the browser's broken glyph.
 */
function onPicture(e: Event) {
  const img = e.target;
  if (!(img instanceof SVGImageElement)) return;
  const group = img.parentElement?.closest('[data-pic]');
  if (!group) return;
  const card = group.querySelector('[data-pic-card]');
  // (The stand-in pixel of a picture not yet near the screen, watchPictures, is not the picture.)
  if (e.type === 'load' && !img.hasAttribute('data-src')) card?.setAttribute('visibility', 'hidden');
  if (e.type === 'error') {
    img.setAttribute('visibility', 'hidden');
    card?.removeAttribute('visibility');
  }
}

const caught = new WeakSet<Document>();
/** One catcher for the cards drawn inside pages: a tap, or Enter or Space on one, shows the document's web pictures; a picture over its card is answered as it comes or fails (onPicture). */
export function installPictures(root: Document = document) {
  if (caught.has(root)) return;
  caught.add(root);
  watchPictures(root);
  root.addEventListener('load', onPicture, true);
  root.addEventListener('error', onPicture, true);
  const card = (e: Event) => e.composedPath().some((n) => n instanceof Element && n.hasAttribute('data-webpic'));
  root.addEventListener('click', (e) => card(e) && (e.preventDefault(), e.stopPropagation(), showPictures()), true);
  root.addEventListener('keydown', (e) => (e.key === 'Enter' || e.key === ' ') && card(e) && (e.preventDefault(), showPictures()), true);
}
