/**
 * <to-preview hash="#/v1/write/…">: a kept document's first page, small, in the one 4:3 box every preview has
 * (the page scaled to cover it and cropped: CROPPED in kit/draw.ts), beside its name on the home
 * page and in the menu's results. Drawn from the link alone: the payload decoded, the app's view(doc, { small:
 * true, thumb: true }), the first page; a document whose link no longer reads is a blank page. Drawn only once the row scrolls into sight (one IntersectionObserver for every
 * preview on the page), and kept by its link in memory, so a long list costs nothing until it is seen and
 * nothing twice.
 */
import { appOf } from './apps.ts';
import { decodeDoc } from './codec.ts';
import { CROPPED, pageSvg } from './draw.ts';
import { iconNamed, iconNames, iconsComplete, loadIcons } from './icons.ts';
import { parseHash } from './route.ts';

/** A page with nothing on it, the shape of a sheet of paper. */
const BLANK = pageSvg({ w: 85, h: 110, svg: '' }, CROPPED);
const drawn = new Map<string, string>();

/** Links whose documents name an icon the starter set lacks, drawn before the rest of Lucide joined: drawn again, not kept. */
const waiting = new Set<string>();

/** The preview of the document at this link, drawn once (again once the rest of Lucide has joined, when it names an icon from there). */
export function previewOf(hash: string): string {
  const had = drawn.get(hash);
  if (had !== undefined) return had;
  let svg = BLANK;
  try {
    const { app, payload } = parseHash(hash);
    const def = app ? appOf(app) : undefined;
    const doc = payload ? decodeDoc(payload) : '';
    if (doc && !iconsComplete() && iconNames(doc).some((n) => !iconNamed(n))) waiting.add(hash);
    const page = def && doc ? def.view(doc, { small: true, thumb: true })[0] : undefined;
    if (page) svg = pageSvg(page, CROPPED);
  } catch {
    svg = BLANK;
  }
  // The box is the stylesheet's, one shape for every preview; the drawing covers it and is cropped (CROPPED, kit/draw.ts).
  svg = svg.replace(/^<svg([^>]*?) width="[^"]*" height="[^"]*"/, '<svg$1 aria-hidden="true"');
  if (!waiting.has(hash)) drawn.set(hash, svg);
  return svg;
}

let seen: IntersectionObserver | null = null;
const watcher = () =>
  (seen ??= new IntersectionObserver(
    (entries) => {
      for (const e of entries) {
        if (!e.isIntersecting) continue;
        seen!.unobserve(e.target);
        (e.target as ToPreview).draw();
      }
    },
    { rootMargin: '200px 0px' },
  ));

export class ToPreview extends HTMLElement {
  static observedAttributes = ['hash'];
  connectedCallback() {
    this.setAttribute('aria-hidden', 'true');
    watcher().observe(this);
  }
  disconnectedCallback() {
    seen?.unobserve(this);
  }
  attributeChangedCallback() {
    if (!this.isConnected) return;
    this.replaceChildren();
    watcher().observe(this);
  }
  /** Drawn now (it has come into sight). */
  draw() {
    const hash = this.getAttribute('hash') ?? '';
    const box = document.createElement('template');
    box.innerHTML = previewOf(hash);
    this.replaceChildren(box.content);
    if (waiting.delete(hash)) void loadIcons().then(() => iconsComplete() && this.isConnected && this.getAttribute('hash') === hash && this.draw());
  }
}
if (!customElements.get('to-preview')) customElements.define('to-preview', ToPreview);
