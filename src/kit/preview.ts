/**
 * <to-preview hash="#/v1/write/…">: a kept document's first page, small (about 56px tall, the page's own
 * shape, a landscape one up to twice as wide as tall: thumbRatio in kit/draw.ts), beside its name on the home
 * page and in the menu's results. Drawn from the link alone: the payload decoded, the app's view(doc, { small:
 * true, thumb: true }), the first page; a document whose link no longer reads is a blank page. Drawn only once the row scrolls into sight (one IntersectionObserver for every
 * preview on the page), and kept by its link in memory, so a long list costs nothing until it is seen and
 * nothing twice. A web picture in a preview is a grey box, never fetched (kit/pictures.ts).
 */
import { appOf } from './apps.ts';
import { decodeDoc } from './codec.ts';
import { pageSvg, thumbRatio } from './draw.ts';
import { gateSvg } from './pictures.ts';
import { parseHash } from './route.ts';

/** A page with nothing on it, the shape of a sheet of paper. */
const BLANK = pageSvg({ w: 85, h: 110, svg: '' });
const drawn = new Map<string, string>();

/** The preview of the document at this link, drawn once. */
export function previewOf(hash: string): string {
  const had = drawn.get(hash);
  if (had !== undefined) return had;
  let svg = BLANK;
  let shape = thumbRatio({ w: 85, h: 110 });
  try {
    const { app, payload } = parseHash(hash);
    const def = app ? appOf(app) : undefined;
    const doc = payload ? decodeDoc(payload) : '';
    const page = def && doc ? def.view(doc, { small: true, thumb: true })[0] : undefined;
    if (page) [svg, shape] = [gateSvg(pageSvg(page), true), thumbRatio(page)];
  } catch {
    [svg, shape] = [BLANK, thumbRatio({ w: 85, h: 110 })];
  }
  // The height is the box's (CSS), the width the page's shape (a landscape page to twice its height); the drawing keeps its shape inside it.
  svg = svg.replace(/^<svg([^>]*?) width="[^"]*" height="[^"]*"/, `<svg$1 aria-hidden="true" style="aspect-ratio:${+shape.toFixed(4)}"`);
  drawn.set(hash, svg);
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
  }
}
if (!customElements.get('to-preview')) customElements.define('to-preview', ToPreview);
