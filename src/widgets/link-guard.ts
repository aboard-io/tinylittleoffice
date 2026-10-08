/**
 * Links in documents, and the question before one is followed. Anyone can
 * write any address into a document and pass the link round, so no link
 * in a document opens without first showing, in full, where it goes and
 * asking: a red Cancel (the default) and a green Go. One guard on the page
 * catches every click on a link that leaves the site, in every app; a link
 * to something other than a web page, an email or a phone number does not
 * open at all.
 *
 * goLinks(text) is how an address in a plain text box (a task, a card, a
 * label) becomes something to follow: a small open-link button beside the
 * box for each address in it.
 */
import { LitElement, html, nothing, type TemplateResult } from 'lit';
import { icon, UI } from '../lib/icons.ts';
import { linkify } from '../lib/richtext.ts';
import type { SlDialog } from '../lib/shoelace.ts';

const OPENS = ['http:', 'https:', 'mailto:', 'tel:'];

/** Where a link really goes, or null for a link that stays on this site. */
export function leaving(href: string, base = location.href): URL | 'refused' | null {
  let url: URL;
  try {
    url = new URL(href, base);
  } catch {
    return 'refused';
  }
  if ((url.protocol === 'http:' || url.protocol === 'https:') && url.origin === new URL(base).origin) return null;
  // A file this page made itself (a download) is this page's own.
  if (url.protocol === 'blob:' && url.origin === new URL(base).origin) return null;
  if (!OPENS.includes(url.protocol)) return 'refused';
  return url;
}

export class ToLinkGuard extends LitElement {
  static properties = { url: { state: true } };
  declare url: URL | null;

  constructor() {
    super();
    this.url = null;
  }
  protected createRenderRoot() {
    return this;
  }

  /** Ask before going to this address. */
  async ask(url: URL) {
    this.url = url;
    await this.updateComplete;
    void this.querySelector<SlDialog>('sl-dialog')?.show();
  }

  private close = () => void this.querySelector<SlDialog>('sl-dialog')?.hide();
  private go = () => {
    const url = this.url;
    this.close();
    if (url) window.open(url.href, '_blank', 'noopener,noreferrer');
  };

  render() {
    const u = this.url;
    const web = !!u && (u.protocol === 'http:' || u.protocol === 'https:');
    // The host as the browser will reach it: a look-alike letter shows as its xn-- spelling.
    const where = !u ? '' : web ? u.hostname : u.protocol === 'mailto:' ? decodeURIComponent(u.pathname) : decodeURIComponent(u.pathname);
    const what = !u ? '' : web ? 'This link goes to' : u.protocol === 'mailto:' ? 'This link writes an email to' : 'This link calls';
    return html`<sl-dialog class="to-link-guard" label="Do you trust this link?" @sl-after-hide=${(e: Event) => e.target === e.currentTarget && (this.url = null)}>
      ${u
        ? html`<p class="lg-what">${what}</p>
            <p class="lg-host">${where}</p>
            ${u.protocol === 'http:' ? html`<p class="lg-warn">${icon(UI.unlock, 14)} Not a secure address: what you send there can be read on the way.</p>` : nothing}
            <p class="lg-label">The whole address:</p>
            <code class="lg-url">${u.href}</code>
            <p class="lg-note">Someone wrote this link into the document. Anyone can put any address in a document, and the words shown for a link need not match where it goes. Only go if you trust where it leads.</p>`
        : nothing}
      <div slot="footer" class="lg-buttons">
        <sl-button class="lg-cancel" variant="danger" size="large" autofocus @click=${this.close}>${icon(UI.close, 18)} Cancel</sl-button>
        <sl-button class="lg-go" variant="success" size="large" @click=${this.go}>Go ${icon(UI.arrow, 18)}</sl-button>
      </div>
    </sl-dialog>`;
  }
}
if (!customElements.get('to-link-guard')) customElements.define('to-link-guard', ToLinkGuard);

let guard: ToLinkGuard | null = null;
/** The page's one guard, made when first wanted. */
function theGuard(): ToLinkGuard {
  if (!guard || !guard.isConnected) {
    guard = document.createElement('to-link-guard') as ToLinkGuard;
    document.body.append(guard);
  }
  return guard;
}

/** Follow a link the way every link in a document is followed: by asking first. */
export function openLink(href: string) {
  const url = leaving(href);
  if (url === 'refused') return;
  if (url === null) return void (location.href = new URL(href, location.href).href);
  void theGuard().ask(url);
}

/** The address an anchor (in HTML or SVG) points at, as written. */
const hrefOf = (a: Element) => a.getAttribute('href') ?? a.getAttributeNS('http://www.w3.org/1999/xlink', 'href') ?? '';

/** Every click on a link that leaves the site, anywhere on the page, asks first. Links the site itself draws carry data-trusted. */
const guarded = new WeakSet<Document>();
export function installLinkGuard(root: Document = document) {
  if (guarded.has(root)) return;
  guarded.add(root);
  const catchIt = (e: MouseEvent) => {
    if (e.type === 'auxclick' && e.button !== 1) return;
    // (An SVG link may carry its address as xlink:href.)
    const a = (e.composedPath().find((n) => n instanceof Element && n.localName === 'a' && !!hrefOf(n)) as Element | undefined) ?? null;
    if (!a || a.hasAttribute('data-trusted') || a.closest('to-link-guard')) return;
    // In text being written, a click puts the caret in the link (the text box shows where it goes); Mod+click follows it.
    if (a.closest('[contenteditable="true"]') && !(e.metaKey || e.ctrlKey) && e.type === 'click') return void e.preventDefault();
    // A download the page is saving is not a link out.
    if (a.hasAttribute('download') && /^(blob|data):/.test(hrefOf(a))) return;
    const url = leaving(hrefOf(a));
    if (url === null) return;
    e.preventDefault();
    e.stopImmediatePropagation();
    if (url !== 'refused') void theGuard().ask(url);
  };
  root.addEventListener('click', catchIt, true);
  root.addEventListener('auxclick', catchIt, true);
}

/** For a plain text box: a small button to follow each address written in it, nothing when there is none. */
export function goLinks(text: string): TemplateResult | typeof nothing {
  const urls = linkify(text ?? '').filter((p) => p.url).map((p) => p.url!);
  if (!urls.length) return nothing;
  return html`${urls.map((u) => html`<a class="to-go" href=${u} aria-label=${`Open ${u}`} data-tip=${u}>${icon(UI.link, 13)}</a>`)}`;
}
