/**
 * <to-shell>: owns the URL. Routes "#/v1/<app>/<payload>" to an app, hands its editor the document's text,
 * and writes every change back into the link with history.replaceState, so the address bar is always the
 * document and nothing is ever sent anywhere. The header holds the title, the room left in the link,
 * Share and Download; the hamburger opens <to-drawer>; the home page is <to-home>.
 */
import { LitElement, html, nothing } from 'lit';
import { html as staticHtml, unsafeStatic } from 'lit/static-html.js';
import { unsafeSVG } from 'lit/directives/unsafe-svg.js';
import type { AppDef, Doc, DocChange, Editor } from './app.ts';
import { appOf } from './apps.ts';
import { budgetFor, decodeDoc, encodeDoc } from './codec.ts';
import { icon, UI } from './icons.ts';
import { onLanguage, t } from './i18n.ts';
import { exportAs, exportItems, picture, raster, saveFile, slug, utf8 } from './exports.ts';
import { parseHash, routeHash, type Owned } from './route.ts';
import { roomFor, roomRows, shortLinkLength } from './limits.ts';
import { EXPIRIES, forget, ownerLink, shorten, shortLink, update, type Shortened } from './short.ts';
import { dropKept, isKept, keepLink, keptLinks } from './links.ts';
import { keeping } from './privacy.ts';
import { QR_MAX_BYTES, qrSvg } from './qr.ts';
import { canShareNative, copyText, shareNative } from './share.ts';
import { toast } from './toast.ts';
import type { ToDialog } from './dialog.ts';
import type { ToDrawer } from './drawer.ts';
import type { MenuItem } from './menu.ts';
import './toast.ts';
import './menu.ts';
import './dialog.ts';
import './drawer.ts';
import './home.ts';

type Which = 'doc' | 'qr' | 'short';

export class ToShell extends LitElement {
  static properties = { app: { state: true }, doc: { state: true }, tag: { state: true }, unreadable: { state: true }, short: { state: true }, shortTtl: { state: true }, busy: { state: true }, owned: { state: true }, changed: { state: true } };
  declare app: string | null;
  declare doc: Doc;
  /** The editor element's tag, once its chunk has arrived. */
  declare tag: string;
  /** The link holds something that cannot be read (cut short when it was copied, most often): said so, and left as it is. */
  declare unreadable: boolean;
  declare short: Shortened | null;
  declare shortTtl: number;
  declare busy: boolean;
  /** The short link this document may update: arrived from its owner link, or made here. Rides in the hash (kit/route.ts), never in a shared link. */
  declare owned: Owned | null;
  /** Edited since the short link last had this document. */
  declare changed: boolean;
  private offLanguage = () => {};
  /** A view asked for in the link ("text.png/…"): done once the editor is up. */
  private pendingView = '';
  private payloadLength = 0;

  constructor() {
    super();
    this.app = null;
    this.doc = '';
    this.tag = '';
    this.unreadable = false;
    this.short = null;
    this.shortTtl = EXPIRIES[1].seconds;
    this.busy = false;
    this.owned = null;
    this.changed = false;
  }
  createRenderRoot() {
    return this;
  }
  connectedCallback() {
    super.connectedCallback();
    window.addEventListener('hashchange', this.onHash);
    window.addEventListener('keydown', this.onKey);
    this.offLanguage = onLanguage(() => this.requestUpdate());
    this.onHash();
  }
  disconnectedCallback() {
    super.disconnectedCallback();
    window.removeEventListener('hashchange', this.onHash);
    window.removeEventListener('keydown', this.onKey);
    this.offLanguage();
  }

  get def(): AppDef | undefined {
    return this.app ? appOf(this.app) : undefined;
  }
  get editor(): Editor | null {
    return this.tag ? this.querySelector<Editor>(this.tag) : null;
  }

  /* ---------- the link ---------- */

  /** The app whose own page this is ("/text/"), if any. */
  private pageApp = () => location.pathname.split('/').slice(-2)[0];

  private onHash = () => {
    const { app, payload, view, owned } = parseHash(location.hash);
    const id = app ?? (!location.hash && appOf(this.pageApp()) ? this.pageApp() : null);
    const def = id ? appOf(id) : undefined;
    this.app = def ? id : null;
    this.pendingView = view;
    this.owned = def ? owned : null;
    this.changed = false;
    this.payloadLength = payload.length;
    this.unreadable = !!payload && !decodeDoc(payload);
    this.doc = def ? (payload ? decodeDoc(payload) : def.blank()) : '';
    this.setTitle();
    if (def && this.tag !== `to-${def.id}-editor`) {
      this.tag = '';
      void def.editor().then(({ tag }) => {
        if (this.app === def.id) this.tag = tag;
      });
    }
    if (def && view) void this.updateComplete.then(() => this.doView());
  };

  private async doView() {
    const view = this.pendingView;
    this.pendingView = '';
    if (!view || !this.def) return;
    history.replaceState(null, '', routeHash(this.def.id, encodeDoc(this.doc), '', this.owned));
    try {
      const name = await exportAs(view, this.current());
      if (name) toast(t('Downloaded {name}', { name }));
      else if (view !== 'print' && view !== 'pdf') toast(t('No .{ext} view here', { ext: view }));
    } catch {
      toast(t('Download failed'));
    }
  }

  /** The document is now `doc`: into the link with it. */
  private change(doc: Doc) {
    if (!this.app) return;
    this.doc = doc;
    const payload = encodeDoc(doc);
    this.payloadLength = payload.length;
    history.replaceState(null, '', routeHash(this.app, payload, '', this.owned));
    this.changed = true;
    this.setTitle();
  }
  private onDocChange = (e: Event) => this.change((e as DocChange).detail);

  private setTitle() {
    const def = this.def;
    document.title = def ? `${this.docTitle} · TinyLittleOffice` : 'TinyLittleOffice';
  }
  /** What the document is called: the name it was given, or "Untitled Text". */
  private get docTitle(): string {
    const def = this.def;
    return def ? def.title(this.doc) || t('Untitled {app}', { app: def.name }) : 'TinyLittleOffice';
  }
  /** The link to share: the address, without the owner's query when there is one (that stays in the address bar alone). */
  get link(): string {
    if (!this.owned || !this.app) return location.href;
    const u = new URL(location.href);
    u.hash = routeHash(this.app, parseHash(location.hash).payload);
    return u.href;
  }
  private current = () => ({ def: this.def!, doc: this.doc, ctx: { title: this.def!.title(this.doc), link: this.link } });

  /* ---------- keys ---------- */

  /**
   * Undo and redo are the editor's (the kernel's history): the keys are only passed on, and only from the
   * editor itself (or from nowhere, the page's body). Typed in a dialog, a popover, the header, the link or
   * note box, or a field of the kit's own, Mod+Z is that place's own; during an IME composition it is the
   * IME's. Mod+P prints.
   */
  private onKey = (e: KeyboardEvent) => {
    if (!(e.metaKey || e.ctrlKey) || e.altKey || e.isComposing) return;
    const k = e.key.toLowerCase();
    if (k === 'p' && this.def) {
      e.preventDefault();
      void exportAs('print', this.current());
      return;
    }
    const editor = this.editor;
    if (!editor || !this.fromEditor(e, editor)) return;
    const which = k === 'z' && !e.shiftKey ? 'docundo' : (k === 'z' && e.shiftKey) || k === 'y' ? 'docredo' : '';
    if (which && !editor.dispatchEvent(new CustomEvent(which, { cancelable: true, bubbles: true }))) e.preventDefault();
  };

  /** Whether a key is the editor's: typed inside it, outside every dialog, popover, box and field of the kit's own (or with nothing focused). */
  private fromEditor(e: KeyboardEvent, editor: Element): boolean {
    const at = e.target as Element | null;
    if (!at || at === document.body || at === document.documentElement) return true;
    if (!(at instanceof Element) || !editor.contains(at)) return false;
    // An app's own fields (a sheet's cells) are the app's to answer; the kit's (class to-…) keep their own undo.
    return !at.closest('dialog, [popover], to-dialog, to-drawer, to-link-pop, to-note-pop, .to-header') && !at.matches('input[class*="to-"], textarea[class*="to-"]');
  }

  /* ---------- sharing ---------- */

  private dialog(which: Which): ToDialog | null {
    return this.querySelector<ToDialog>(`to-dialog.to-${which}`);
  }
  private shareItems(): MenuItem[] {
    const def = this.def!;
    const title = this.docTitle;
    return [
      { label: t('Copy link'), icon: UI.link, does: () => void copyText(this.link) },
      ...(canShareNative() ? [{ label: t('Share…'), icon: UI.share, does: async () => shareNative(title, this.link, await picture(def.view(this.doc))) }] : []),
      { label: t('QR code'), icon: UI.qr, does: () => void this.dialog('qr')?.show() },
      ...(this.owned
        ? [
            ...(this.changed ? [{ label: t('Update the short link'), icon: UI.link, does: () => void this.updateShort() }] : []),
            { label: t('Extend the short link…'), icon: UI.link, does: () => void this.dialog('short')?.show() },
            { label: t('Forget this link'), icon: UI.close, does: () => void this.forgetShort() },
          ]
        : [{ label: t('Shorter link that expires…'), icon: UI.link, does: () => void this.dialog('short')?.show() }]),
    ];
  }
  /** A short link made, updated or forgotten: one request, the outcome said, errors said too. */
  private async shortDo(work: () => Promise<void>) {
    this.busy = true;
    try {
      await work();
    } catch (err) {
      toast(err instanceof Error ? err.message : t('Could not shorten the link.'));
    } finally {
      this.busy = false;
    }
  }
  /** A new short link; from here on this document owns it, and edits can be sent to it. */
  private makeShort = () =>
    this.shortDo(async () => {
      this.short = await shorten(this.link, this.shortTtl);
      this.owned = this.short.owned;
      this.changed = false;
      if (this.app) history.replaceState(null, '', routeHash(this.app, parseHash(location.hash).payload, '', this.owned));
    });
  /** The short link given this version; with `seconds`, a longer life too. */
  private updateShort = (seconds?: number) =>
    this.shortDo(async () => {
      const owned = this.owned!;
      const { ver, expires } = await update(owned, this.link, seconds);
      this.changed = false;
      toast(seconds ? t('Expires {when}', { when: new Date(expires).toLocaleString(document.documentElement.lang) }) : t('Updated · version {n}', { n: ver }));
      if (isKept(ownerLink(owned))) keepLink({ owner: ownerLink(owned), title: this.docTitle, made: Date.now(), expires });
    });
  private forgetShort = () => {
    if (!confirm(t('Forget this short link? Anyone who has it will find nothing there.'))) return;
    return this.shortDo(async () => {
      const owned = this.owned!;
      await forget(owned);
      dropKept(ownerLink(owned));
      this.owned = null;
      this.short = null;
      if (this.app) history.replaceState(null, '', routeHash(this.app, parseHash(location.hash).payload));
      this.dialog('short')?.close();
      toast(t('Forgotten'));
    });
  };
  private keepShort(short: Shortened) {
    keepLink({ owner: short.owner, title: this.docTitle, made: Date.now(), expires: short.expires });
    this.requestUpdate();
  }
  private async saveQr(svg: string, ext: 'png' | 'svg') {
    const file = `${slug(this.docTitle) || 'document'}-qr.${ext}`;
    if (ext === 'svg') return saveFile(file, 'image/svg+xml', utf8(svg));
    const side = 1024;
    const png = await raster(svg.replace(/width="\d+" height="\d+"/, `width="${side}" height="${side}"`), side, side);
    if (png) await saveFile(file, 'image/png', png);
  }

  /* ---------- drawing ---------- */

  private renderHeader() {
    const def = this.def;
    const drawer = () => void this.querySelector<ToDrawer>('to-drawer')?.show();
    const burger = html`<button type="button" class="to-btn to-tool to-burger" aria-label=${t('Menu')} title=${t('Menu')} aria-haspopup="dialog" @click=${drawer}>${icon(UI.menu, 26)}</button>`;
    if (!def) return html`<header class="to-header">${burger}<a class="to-brand" href="#/">TinyLittleOffice</a></header>`;
    const title = def.title(this.doc);
    const prefix = `${location.origin}${location.pathname}${routeHash(def.id)}/`;
    const { available } = budgetFor(prefix);
    const left = available - this.payloadLength;
    const pct = Math.min(1, this.payloadLength / Math.max(1, available));
    const r = 9;
    const c = 2 * Math.PI * r;
    return html`<header class="to-header">
      ${burger}
      <a class="to-here" href=${routeHash(def.id)} title=${t('New {app}', { app: def.name })} aria-label=${t('New {app}', { app: def.name })}>${icon(def.icon, 24)}</a>
      <h1 class="sr-only">${this.docTitle}</h1>
      <input class="to-title" type="text" placeholder=${t('Untitled {app}', { app: def.name })} aria-label=${t('Title')} autocomplete="off" .value=${title} @change=${(e: Event) => this.change(def.retitle(this.doc, (e.target as HTMLInputElement).value.trim()))} />
      <button type="button" class="to-btn to-tool to-meter ${left < 0 ? 'over' : pct > 0.85 ? 'warn' : ''}" aria-label=${left < 0 ? t('{n} characters over the link limit', { n: -left }) : t('{n} of {max} link characters left', { n: left, max: available })} title=${left < 0 ? t('{n} characters over the link limit', { n: -left }) : t('{n} of {max} link characters left', { n: left, max: available })} @click=${() => void this.dialog('doc')?.show()}>
        <svg width="24" height="24" viewBox="0 0 24 24" aria-hidden="true"><circle cx="12" cy="12" r=${r} fill="none" stroke="currentColor" stroke-opacity="0.25" stroke-width="3"/><circle cx="12" cy="12" r=${r} fill="none" stroke="currentColor" stroke-width="3" stroke-dasharray=${`${c * pct} ${c}`} transform="rotate(-90 12 12)"/></svg>
      </button>
      <to-menu class="to-share" icon-only .label=${t('Share')} .icon=${UI.share} .items=${this.shareItems()}></to-menu>
      <to-menu class="to-download" icon-only .label=${t('Download')} .icon=${UI.download} .items=${exportItems(this.current)}></to-menu>
    </header>`;
  }

  private renderDialogs() {
    const def = this.def;
    if (!def) return nothing;
    const bytes = new TextEncoder().encode(this.link);
    const fits = bytes.length <= QR_MAX_BYTES;
    const qr = fits ? qrSvg(bytes, 4) : '';
    const rooms = roomRows(roomFor(this.link), document.documentElement.lang);
    return html`<to-dialog class="to-doc" heading=${t('This document')} .body=${html`
        <dl class="to-facts">
          <dt>${t('Title')}</dt><dd>${this.docTitle}</dd>
          <dt>${t('Link')}</dt><dd>${t('{n} characters', { n: this.link.length })}</dd>
          <dt>${t('Short link')}</dt><dd>${t('{n} characters', { n: shortLinkLength() })}</dd>
        </dl>
        <table class="to-rooms">
          <caption>${t('Where the link fits')}</caption>
          <thead><tr><th scope="col">${t('Where')}</th><th scope="col">${t('Limit')}</th><th scope="col">${t('This link')}</th><th scope="col">${t('Left')}</th></tr></thead>
          <tbody>${rooms.map((r) => html`<tr class=${r.over ? 'over' : ''}><th scope="row">${r.name}<small>${r.note}</small></th><td>${r.max}</td><td>${r.used}</td><td>${r.left}</td></tr>`)}</tbody>
        </table>`}></to-dialog>
      <to-dialog class="to-qr" heading=${t('QR code')} .body=${fits
        ? html`<div class="to-qr-code" role="img" aria-label=${t('QR code of this document')}>${unsafeSVG(qr)}</div>
            <p class="to-hint">${t('The whole document, {n} bytes, as one code. Anyone who scans it has it.', { n: bytes.length })}</p>
            <div class="to-row">
              <button type="button" class="to-btn primary" @click=${() => void this.saveQr(qr, 'png')}>${icon(UI.download, 16)}<span>PNG</span></button>
              <button type="button" class="to-btn" @click=${() => void this.saveQr(qr, 'svg')}>${icon(UI.download, 16)}<span>SVG</span></button>
            </div>`
        : html`<p>${t('This document is {n} bytes; the largest QR code holds {max}. Shorten it by {over} bytes and it will fit.', { n: bytes.length, max: QR_MAX_BYTES, over: bytes.length - QR_MAX_BYTES })}</p>`}></to-dialog>
      <to-dialog class="to-short" heading=${t('A shorter link that expires')} @to-close=${() => (this.short = null)} .body=${html`
        <p class="to-hint">${t('The link is encrypted here; the key stays in the short link, which browsers never send. The service holds only the ciphertext, until the time you choose.')}</p>
        ${this.short ? this.renderMade(this.short) : this.owned ? this.renderOwned(this.owned) : this.renderMaker()}
        ${this.renderKept()}`}></to-dialog>`;
  }

  /** The lifetimes, as a select writing shortTtl. */
  private renderTtl() {
    return html`<select @change=${(e: Event) => (this.shortTtl = Number((e.target as HTMLSelectElement).value))}>${EXPIRIES.map((x) => html`<option value=${x.seconds} ?selected=${x.seconds === this.shortTtl}>${x.name()}</option>`)}</select>`;
  }
  private renderMaker() {
    return html`<label class="to-field"><span>${t('Expires after')}</span>${this.renderTtl()}</label>
      <button type="button" class="to-btn primary" ?disabled=${this.busy} @click=${() => void this.makeShort()}>${icon(UI.link, 16)}<span>${this.busy ? t('Making…') : t('Make a short link')}</span></button>`;
  }
  /** Just made: the public link to share, and the owner's to keep. */
  private renderMade(short: Shortened) {
    const kept = isKept(short.owner);
    return html`<p class="to-hint">${t('Expires {when}', { when: new Date(short.expires).toLocaleString(document.documentElement.lang) })}</p>
      <p><b>${t('Share this one')}</b><br /><a href=${short.short} class="to-short-link">${short.short}</a></p>
      <div class="to-row"><button type="button" class="to-btn primary" @click=${() => void copyText(short.short)}>${icon(UI.copy, 16)}<span>${t('Copy short link')}</span></button></div>
      <p><b>${t('Keep this one to update it later')}</b><br /><a href=${short.owner} class="to-short-link to-owner-link">${short.owner}</a></p>
      <div class="to-row">
        <button type="button" class="to-btn" @click=${() => void copyText(short.owner)}>${icon(UI.copy, 16)}<span>${t('Copy owner link')}</span></button>
        ${keeping() ? html`<button type="button" class="to-btn to-keep" ?disabled=${kept} @click=${() => this.keepShort(short)}>${icon(UI.check, 16)}<span>${kept ? t('Kept') : t('Keep on this device')}</span></button>` : nothing}
      </div>
      ${keeping() ? nothing : html`<p class="to-hint">${t('Turn on Saved on this device, in the menu, to keep owner links here.')}</p>`}`;
  }
  /** Opened from an owner link (or made here): update, extend, forget. */
  private renderOwned(owned: Owned) {
    const link = shortLink(owned);
    return html`<p class="to-hint">${t('You opened this document from its owner link: the short link below can be given this version, a longer life, or forgotten.')}</p>
      <p><a href=${link} class="to-short-link">${link}</a></p>
      <div class="to-row">
        <button type="button" class="to-btn primary to-update" ?disabled=${this.busy || !this.changed} @click=${() => void this.updateShort()}>${icon(UI.link, 16)}<span>${this.busy ? t('Updating…') : t('Update the short link')}</span></button>
        <button type="button" class="to-btn" @click=${() => void copyText(link)}>${icon(UI.copy, 16)}<span>${t('Copy short link')}</span></button>
      </div>
      ${this.changed ? nothing : html`<p class="to-hint">${t('The short link has this version.')}</p>`}
      <label class="to-field"><span>${t('Expires after')}</span>${this.renderTtl()}</label>
      <div class="to-row">
        <button type="button" class="to-btn to-extend" ?disabled=${this.busy} @click=${() => void this.updateShort(this.shortTtl)}>${icon(UI.link, 16)}<span>${t('Extend')}</span></button>
        <button type="button" class="to-btn to-forget" ?disabled=${this.busy} @click=${() => void this.forgetShort()}>${icon(UI.close, 16)}<span>${t('Forget this link')}</span></button>
      </div>`;
  }
  /** The owner links kept on this device, if any. */
  private renderKept() {
    const kept = keptLinks();
    if (!kept.length) return nothing;
    const lang = document.documentElement.lang;
    return html`<h3 class="to-kept-head">${t('Kept on this device')}</h3>
      <ul class="to-kept">${kept.map((l) => html`<li><a href=${l.owner} class="to-short-link">${l.title || l.owner}</a><small>${t('Expires {when}', { when: new Date(l.expires).toLocaleString(lang) })}</small><button type="button" class="to-btn to-tool" aria-label=${t('Remove')} title=${t('Remove')} @click=${() => (dropKept(l.owner), this.requestUpdate())}>${icon(UI.close, 16)}</button></li>`)}</ul>`;
  }

  render() {
    const def = this.def;
    let main;
    if (!def) main = html`<to-home></to-home>`;
    else if (this.unreadable) main = html`<div class="to-empty"><p>${t('This link holds something that cannot be read. It may have been cut short when it was copied.')}</p><a class="to-btn primary" href=${routeHash(def.id)}>${t('New {app}', { app: def.name })}</a></div>`;
    else if (!this.tag) main = html`<div class="to-empty to-loading" aria-busy="true">${t('Loading…')}</div>`;
    else {
      const tag = unsafeStatic(this.tag);
      main = staticHtml`<${tag} class="to-editor" .value=${this.doc} @docchange=${this.onDocChange}></${tag}>`;
    }
    return html`${this.renderHeader()}<main class="to-main">${main}</main><to-drawer></to-drawer><to-toast></to-toast>${this.renderDialogs()}`;
  }
}
customElements.define('to-shell', ToShell);
