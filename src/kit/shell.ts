/**
 * <to-shell>: owns the URL. Routes "#/v1/<app>/<payload>" to an app, hands its editor the document's text,
 * and writes every change back into the link with history.replaceState, so the address bar is always the
 * document and nothing is ever sent anywhere. The header holds the title, the room left in the link,
 * Share and Download; the hamburger opens <to-drawer>; the home page is <to-home>. A Display Link ("?d",
 * kit/route.ts) shows the document's pages instead, to read or print, with an Edit button.
 *
 * Share opens one dialog (Paul, 2026-10-09: "The short link function modal needs to be redesigned"): the
 * title and where the link fits in one line; Copy link and Copy display link; a short link that expires (the
 * lifetimes as one row, Make, then the link with Copy; its owner's Update, Extend and Forget); the QR code;
 * the short links kept here. Arriving by a short link ("?s=…&x=…"), a banner above the bar says how long the
 * link has left, coloured by how soon, with Copy into a new document, and Extend for the owner.
 *
 * Around the document: a skip link to it; Find in this document (Mod+F, kit/find.ts); the keyboard
 * shortcuts (Mod+/, kit/keys.ts); Mod+S keeps it on the device; and, opened from a link while the library
 * holds another version of the same document (same app and name, another link), a quiet banner offering
 * that one. The Share dialog's head line says where the link fits, with Copy, and opens a table of the
 * rooms it fits in (kit/limits.ts) on a hover or a tap; red past the link's limit.
 *
 * A new document is named at once, "New Spreadsheet 2026-10-09 #1" (the first number that day's documents
 * of the app in the library leave free): the name is shown in the title box and goes into the head with the
 * first change, so a blank page left alone writes nothing (Paul, 2026-10-09).
 */
import { LitElement, html, nothing } from 'lit';
import { html as staticHtml, unsafeStatic } from 'lit/static-html.js';
import { unsafeSVG } from 'lit/directives/unsafe-svg.js';
import { unsafeHTML } from 'lit/directives/unsafe-html.js';
import type { AppDef, Doc, DocChange, Editor } from './app.ts';
import { appOf } from './apps.ts';
import { budgetFor, decodeDoc, encodeDoc } from './codec.ts';
import { icon, UI } from './icons.ts';
import { onLanguage, t } from './i18n.ts';
import { exportAs, exportItems, picture, raster, saveFile, slug, utf8 } from './exports.ts';
import { LINK_VERSION, parseHash, routeHash, type Owned } from './route.ts';
import { fitLine, roomFor } from './limits.ts';
import { DEFAULT_TTL, EXPIRIES, expiresLine, expiresSentence, forget, ownerLink, shorten, shortLink, timeLeft, update, type Shortened } from './short.ts';
import { dropKept, isKept, keepLink, keptLinks } from './links.ts';
import { keeping } from './privacy.ts';
import { store } from './store.ts';
import { ago, firstFree, firstWords, keep, library, localDay, type Kept } from './library.ts';
import { pageSvg } from './draw.ts';
import { QR_MAX_BYTES, qrSvg } from './qr.ts';
import { canShareNative, copyText, shareNative } from './share.ts';
import { toast } from './toast.ts';
import { installLinkGuard } from './link-guard.ts';
import { gateHtml, gateSvg, installPictures, onPictures, setPictureDoc } from './pictures.ts';
import { mark } from './mark.ts';
import { setSelfLink } from './qr-picture.ts';
import type { ToDialog } from './dialog.ts';
import type { ToDrawer } from './drawer.ts';
import type { ToFind } from './find.ts';
import { renderShortcuts } from './keys.ts';
import './find.ts';
import './toast.ts';
import { place } from './menu.ts';
import './dialog.ts';
import './drawer.ts';
import './home.ts';

/** Where the lifetime chosen for short links is remembered (under Saved; for the visit under Private). */
const TTL_KEY = 'tinyoffice.shortTtl';
const savedTtl = () => {
  const n = Number(store.get(TTL_KEY));
  return EXPIRIES.some((x) => x.seconds === n) ? n : DEFAULT_TTL;
};

export class ToShell extends LitElement {
  static properties = { app: { state: true }, doc: { state: true }, tag: { state: true }, unreadable: { state: true }, short: { state: true }, shortTtl: { state: true }, busy: { state: true }, owned: { state: true }, changed: { state: true }, display: { state: true }, fresh: { state: true }, qrDisplay: { state: true }, shortDisplay: { state: true }, sharing: { state: true }, expires: { state: true }, arrived: { state: true }, scrolled: { state: true }, other: { state: true }, newer: { state: true } };
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
  /** Shown as its pages (the Display Link), not in the editor. */
  declare display: boolean;
  /** A new document's name, until it is given one or another: "New Spreadsheet 2026-10-09 #1"; '' otherwise. */
  declare fresh: string;
  /** Which link the QR code holds, and which a short link opens: the Display Link, or the editing one. */
  declare qrDisplay: boolean;
  declare shortDisplay: boolean;
  /** The Share dialog is open: what it shows (the QR code above all) is drawn only then. */
  declare sharing: boolean;
  /** When the short link this document is tied to expires (arrived by, or made here), ms since the epoch; 0 when none is known. */
  declare expires: number;
  /** Arrived by a short link this visit, its banner not closed. */
  declare arrived: boolean;
  /** The page scrolled past the top: the banner goes small. */
  declare scrolled: boolean;
  /** Opened from a link while the library holds another version of this document (the same app and name, another link): offered in a banner. */
  declare other: Kept | null;
  /** The link was made by a newer Tiny Little Office (its format's version is past this one's). */
  declare newer: boolean;
  /** What the editor was last given or gave: the document without the new name the link carries for it. */
  private edited: Doc = '';
  private offLanguage = () => {};
  private offPictures = () => {};
  /** A view asked for in the link ("text.png/…"): done once the editor is up. */
  private pendingView = '';
  private payloadLength = 0;
  /** This document's entry in the library (kit/library.ts): adopted by its hash on load, made at the first keep, carried in history.state. */
  private keptId: string | null = null;
  /** The keep waiting out the debounce, and its timer. */
  private pending: Kept | null = null;
  private keepTimer = 0;

  constructor() {
    super();
    this.app = null;
    this.doc = '';
    this.tag = '';
    this.unreadable = false;
    this.short = null;
    this.shortTtl = savedTtl();
    this.busy = false;
    this.owned = null;
    this.changed = false;
    this.display = false;
    this.fresh = '';
    this.qrDisplay = false;
    this.shortDisplay = false;
    this.sharing = false;
    this.expires = 0;
    this.arrived = false;
    this.scrolled = false;
    this.other = null;
    this.newer = false;
  }
  createRenderRoot() {
    return this;
  }
  connectedCallback() {
    super.connectedCallback();
    window.addEventListener('hashchange', this.onHash);
    window.addEventListener('keydown', this.onKey);
    window.addEventListener('pagehide', this.flushKeep);
    window.addEventListener('scroll', this.onScroll, { passive: true });
    this.addEventListener('to-keys', this.showKeys);
    this.offLanguage = onLanguage(() => this.requestUpdate());
    this.offPictures = onPictures(() => this.requestUpdate());
    // Every link that leaves the site asks first; every web picture drawn in a page asks before it is fetched.
    installLinkGuard();
    installPictures();
    this.onHash();
  }
  disconnectedCallback() {
    super.disconnectedCallback();
    window.removeEventListener('hashchange', this.onHash);
    window.removeEventListener('keydown', this.onKey);
    window.removeEventListener('pagehide', this.flushKeep);
    window.removeEventListener('scroll', this.onScroll);
    this.removeEventListener('to-keys', this.showKeys);
    this.flushKeep();
    this.offLanguage();
    this.offPictures();
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
    this.flushKeep();
    const { app, payload, view, owned, display, arrived, version } = parseHash(location.hash);
    this.querySelector<ToFind>('to-find')?.close();
    const id = app ?? (!location.hash && appOf(this.pageApp()) ? this.pageApp() : null);
    const def = id ? appOf(id) : undefined;
    this.app = def ? id : null;
    this.pendingView = view;
    this.owned = def ? owned : null;
    this.changed = false;
    this.payloadLength = payload.length;
    this.unreadable = !!payload && !decodeDoc(payload);
    this.doc = def ? (payload ? decodeDoc(payload) : def.blank()) : '';
    this.edited = this.doc;
    // Show pictures from the web is remembered for this document, as it arrived, for the visit.
    setPictureDoc(def ? routeHash(def.id, payload) : '');
    this.display = !!def && display && !!payload;
    // The owner of a short link that opens the pages arrives with "?d": the short link goes on opening them.
    if (owned && display) this.shortDisplay = true;
    this.expires = def && arrived ? arrived.expires : 0;
    this.arrived = !!def && !!arrived;
    this.fresh = def && !payload ? this.newName(def) : '';
    const state = history.state as { kept?: unknown } | null;
    const hash = def && payload ? routeHash(def.id, payload) : '';
    this.keptId = typeof state?.kept === 'string' ? state.kept : hash ? (library().find((k) => k.hash === hash)?.id ?? null) : null;
    this.newer = !!def && version > LINK_VERSION;
    this.other = def && hash && !this.keptId && !this.unreadable ? this.otherVersion(def, hash) : null;
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
    history.replaceState(this.state(), '', routeHash(this.def.id, encodeDoc(this.doc), '', this.owned, false, this.tie));
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
    this.keepSoon(payload);
    history.replaceState(this.state(), '', routeHash(this.app, payload, '', this.owned, false, this.tie));
    this.changed = true;
    this.setTitle();
  }
  /** The editor's change; a new document takes its name with the first one (and not while it is blank again). */
  private onDocChange = (e: Event) => {
    const doc = (e as DocChange).detail;
    const def = this.def;
    this.edited = doc;
    this.change(def && this.fresh && doc !== def.blank() && !def.title(doc) ? def.retitle(doc, this.fresh) : doc);
  };
  /** "New Spreadsheet 2026-10-09 #2": the app's noun, today, and the first number the library leaves free. */
  private newName(def: AppDef): string {
    const lang = document.documentElement.lang || undefined;
    const noun = def.noun.charAt(0).toLocaleUpperCase(lang) + def.noun.slice(1);
    const name = t('New {noun} {date} #{n}', { noun, date: localDay() });
    const n = firstFree(library().filter((k) => k.app === def.id).map((k) => k.title), name);
    return name.replace('{n}', String(n));
  }

  /* ---------- the library ---------- */

  /** What the tab carries in history.state: the library entry this document is. */
  private state = () => (this.keptId ? { kept: this.keptId } : null);
  /**
   * Into the library, 800 ms after the last change, while the device is Saved. A document empty again (or
   * blank) is not kept anew. The id is made here the first time; change() writes it into the tab's
   * history.state with the link, so the next change, and a reload, are the same entry.
   */
  private keepSoon(payload: string) {
    const def = this.def;
    if (!def || !keeping() || !this.doc.trim() || this.doc === def.blank() || this.edited === def.blank()) return;
    this.keptId ??= crypto.randomUUID();
    this.pending = { id: this.keptId, app: def.id, title: def.title(this.doc) || firstWords(this.doc), hash: routeHash(def.id, payload), at: Date.now() };
    clearTimeout(this.keepTimer);
    this.keepTimer = window.setTimeout(this.flushKeep, 800);
  }
  /** The waiting keep, now (leaving the document, or the page). */
  private flushKeep = () => {
    clearTimeout(this.keepTimer);
    const entry = this.pending;
    this.pending = null;
    if (entry) keep({ ...entry, at: Date.now() });
  };

  /** Another version of this document the library holds: the newest of the same app and the same name, at another link. */
  private otherVersion(def: AppDef, hash: string): Kept | null {
    const title = def.title(this.doc);
    return title ? (library().find((k) => k.app === def.id && k.hash !== hash && k.title === title) ?? null) : null;
  }
  /** Mod+S: kept on the device now, under Saved; else said why not. */
  keepNow() {
    const def = this.def;
    if (!def) return;
    if (!keeping()) return void toast(t('Private: nothing is kept on this device. Turn on Saved in the menu to keep your documents here.'));
    if (!this.doc.trim() || this.doc === def.blank()) return void toast(t('Nothing to keep yet'));
    this.keptId ??= crypto.randomUUID();
    const payload = parseHash(location.hash).payload || encodeDoc(this.doc);
    this.pending = { id: this.keptId, app: def.id, title: def.title(this.doc) || this.fresh || firstWords(this.doc), hash: routeHash(def.id, payload), at: Date.now() };
    this.flushKeep();
    history.replaceState(this.state(), '', location.href);
    this.other = null;
    toast(t('Kept on this device'));
  }
  /** The shortcuts dialog, open. */
  showKeys = () => void this.querySelector<ToDialog>('to-dialog.to-keys-dialog')?.show();
  /** Find in this document, open (or its words chosen again). */
  showFind() {
    const find = this.querySelector<ToFind>('to-find');
    if (!find || !this.editor) return;
    find.target = this.editor;
    void find.show();
  }

  private setTitle() {
    const def = this.def;
    // A QR code the document holds of itself is drawn from its link as it now is.
    setSelfLink(def ? this.link : '');
    document.title = def ? `${this.docTitle} · Tiny Little Office` : 'Tiny Little Office';
  }
  /** What the document is called: the name it was given, a new one's name, or "Untitled presentation" (a link that came with none). */
  private get docTitle(): string {
    const def = this.def;
    return def ? def.title(this.doc) || this.fresh || t('Untitled {noun}', { noun: def.noun }) : 'Tiny Little Office';
  }
  /** The link to share, the editing one: the address without the owner's query (that stays in the address bar alone) or the display flag. */
  get link(): string {
    return this.linkTo(false);
  }
  /** The Display Link: the same document, opened as its pages to read. */
  get displayLink(): string {
    return this.linkTo(true);
  }
  private linkTo(display: boolean): string {
    if (!this.app) return location.href;
    const u = new URL(location.href);
    u.hash = routeHash(this.app, parseHash(location.hash).payload, '', null, display);
    return u.href;
  }
  /** The short link this document owns and its expiry, as the address carries them beside the owner's query; null unless both are known. */
  private get tie() {
    return this.owned && this.expires ? { id: this.owned.id, expires: this.expires } : null;
  }
  /** What a short link opens. */
  private get shortTarget() {
    return this.shortDisplay ? this.displayLink : this.link;
  }
  private current = () => ({ def: this.def!, doc: this.doc, ctx: { title: this.def!.title(this.doc) || this.fresh, link: this.link } });

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
    // The page's own keys (kit/keys.ts PAGE): the shortcuts, find, keep.
    if (k === '/' || k === '?') {
      e.preventDefault();
      this.showKeys();
      return;
    }
    if (k === 'f' && !e.shiftKey && this.def && !this.display && this.editor) {
      e.preventDefault();
      this.showFind();
      return;
    }
    if (k === 's' && !e.shiftKey && this.def && !this.display) {
      e.preventDefault();
      this.keepNow();
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

  private get shareDialog(): ToDialog | null {
    return this.querySelector<ToDialog>('to-dialog.to-share-dialog');
  }
  /** The Share dialog, open; `short` scrolls it to the short link's section (the banner's Extend). */
  async openShare(short = false) {
    this.sharing = true;
    await this.updateComplete;
    await this.shareDialog?.show();
    if (!short) return;
    const section = this.querySelector<HTMLElement>('.to-share-short');
    section?.scrollIntoView({ block: 'start' });
    section?.querySelector<HTMLInputElement>('input[type=radio]:checked')?.focus({ preventScroll: true });
  }
  private onScroll = () => {
    const past = window.scrollY > 24;
    if (past !== this.scrolled) this.scrolled = past;
  };
  /** The lifetime chosen, remembered. */
  private setTtl(seconds: number) {
    this.shortTtl = seconds;
    store.set(TTL_KEY, String(seconds));
  }
  /** This document, as a fresh plain link in a new tab: "Copy of …", no owner, nothing tying it to the short link. */
  copyIntoNew = () => {
    const def = this.def;
    if (!def) return;
    const doc = def.retitle(this.doc, t('Copy of {title}', { title: this.docTitle }));
    const u = new URL(location.href);
    u.hash = routeHash(def.id, encodeDoc(doc));
    window.open(u.href, '_blank', 'noopener');
    toast(t('A copy opened in a new tab'));
  };
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
      this.short = await shorten(this.shortTarget, this.shortTtl);
      this.owned = this.short.owned;
      this.expires = this.short.expires;
      this.changed = false;
      if (this.app) history.replaceState(this.state(), '', routeHash(this.app, parseHash(location.hash).payload, '', this.owned, false, this.tie));
    });
  /** The short link given this version; with `seconds`, a longer life too. */
  private updateShort = (seconds?: number) =>
    this.shortDo(async () => {
      const owned = this.owned!;
      const { ver, expires } = await update(owned, this.shortTarget, seconds);
      this.changed = false;
      this.expires = expires;
      if (this.app) history.replaceState(this.state(), '', routeHash(this.app, parseHash(location.hash).payload, '', this.owned, false, this.tie));
      toast(seconds ? expiresLine(expires, Date.now(), document.documentElement.lang) : t('Updated · version {n}', { n: ver }));
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
      this.expires = 0;
      this.arrived = false;
      if (this.app) history.replaceState(this.state(), '', routeHash(this.app, parseHash(location.hash).payload));
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
    // The Office mark is the menu: a button with a border, so it reads as something to press.
    const burger = html`<button type="button" class="to-btn to-tool to-burger" aria-label=${t('Menu')} title=${t('Tiny Little Office menu')} aria-haspopup="dialog" @click=${drawer}>${unsafeHTML(mark(26))}</button>`;
    if (!def) return html`<header class="to-header">${burger}<a class="to-brand" href="#/">Tiny Little Office</a></header>`;
    const title = def.title(this.doc);
    const prefix = `${location.origin}${location.pathname}${routeHash(def.id)}/`;
    const { available } = budgetFor(prefix);
    const left = available - this.payloadLength;
    const pct = Math.min(1, this.payloadLength / Math.max(1, available));
    const r = 9;
    const c = 2 * Math.PI * r;
    return html`<header class="to-header">
      ${burger}
      <a class="to-here" href=${routeHash(def.id)} title=${t('New {noun}', { noun: def.noun })} aria-label=${t('New {noun}', { noun: def.noun })}>${icon(def.icon, 24)}</a>
      <h1 class="sr-only">${this.docTitle}</h1>
      <input class="to-title" type="text" placeholder=${t('Untitled {noun}', { noun: def.noun })} aria-label=${t('Title')} autocomplete="off" .value=${title || this.fresh} @focus=${(e: Event) => this.fresh && !title && (e.target as HTMLInputElement).select()} @change=${(e: Event) => this.retitle(def, (e.target as HTMLInputElement).value.trim())} />
      <button type="button" class="to-btn to-tool to-meter ${left < 0 ? 'over' : pct > 0.85 ? 'warn' : ''}" aria-label=${left < 0 ? t('{n} characters over the link limit', { n: -left }) : t('{n} of {max} link characters left', { n: left, max: available })} title=${left < 0 ? t('{n} characters over the link limit', { n: -left }) : t('{n} of {max} link characters left', { n: left, max: available })} @click=${() => void this.openShare()}>
        <svg width="24" height="24" viewBox="0 0 24 24" aria-hidden="true"><circle cx="12" cy="12" r=${r} fill="none" stroke="currentColor" stroke-opacity="0.25" stroke-width="3"/><circle cx="12" cy="12" r=${r} fill="none" stroke="currentColor" stroke-width="3" stroke-dasharray=${`${c * pct} ${c}`} transform="rotate(-90 12 12)"/></svg>
      </button>
      <button type="button" class="to-btn to-tool to-share" aria-label=${t('Share')} title=${t('Share')} aria-haspopup="dialog" @click=${() => void this.openShare()}>${icon(UI.share, 22)}</button>
      <to-menu class="to-download" icon-only .label=${t('Download')} .icon=${UI.download} .items=${exportItems(this.current)}></to-menu>
    </header>`;
  }

  /** The title box: the name given, in the head (and to the editor); a new document's own name is spent. */
  private retitle(def: AppDef, title: string) {
    const doc = def.retitle(this.doc, title);
    this.fresh = '';
    this.edited = doc;
    this.change(doc);
  }

  private renderDialogs() {
    if (!this.def || this.display) return nothing;
    return html`<to-dialog class="to-share-dialog" heading=${this.docTitle} @to-close=${() => ((this.short = null), (this.sharing = false))} .body=${this.sharing ? this.renderShare() : nothing}></to-dialog>`;
  }

  /** The one Share dialog: where the link fits, the two copies, the short link, the QR code, the short links kept here. */
  private renderShare() {
    const def = this.def!;
    const share = async () => shareNative(this.docTitle, this.link, await picture(def.view(this.doc)));
    return html`${this.renderFit()}
      <div class="to-share-links">
        <button type="button" class="to-btn to-share-copy to-copy-link" @click=${() => void copyText(this.link)}><span>${icon(UI.link, 18)}${t('Copy link')}</span><small>${t('Opens in the editor')}</small></button>
        <button type="button" class="to-btn to-share-copy to-copy-display" @click=${() => void copyText(this.displayLink)}><span>${icon(UI.view, 18)}${t('Copy display link')}</span><small>${t('Opens as pages to read')}</small></button>
        ${canShareNative() ? html`<button type="button" class="to-btn to-share-native" @click=${() => void share()}>${icon(UI.share, 18)}<span>${t('Share…')}</span></button>` : nothing}
      </div>
      <section class="to-share-section to-share-short" aria-labelledby="to-share-short-h">
        <h3 id="to-share-short-h">${t('Short link that expires')}</h3>
        ${this.short ? this.renderMade(this.short) : this.owned ? this.renderOwned(this.owned) : this.renderMaker()}
      </section>
      ${this.renderQr()}
      ${this.renderKept()}`;
  }

  /**
   * The head line: where the link fits, red once it is past the link's limit, with Copy; a hover or a tap on
   * the words opens the rooms it fits in, a small table in a popover (kit/limits.ts).
   */
  private renderFit() {
    const def = this.def!;
    const { available } = budgetFor(`${location.origin}${location.pathname}${routeHash(def.id)}/`);
    const over = this.payloadLength - available;
    const hover = (show: boolean) => (e: PointerEvent) => {
      if (e.pointerType !== 'mouse') return;
      const pop = this.querySelector<HTMLElement>('.to-rooms');
      const btn = e.currentTarget as HTMLElement;
      if (show && !pop?.matches(':popover-open')) (pop?.showPopover(), pop && place(pop, btn));
      else if (!show && !pop?.matches(':hover')) pop?.hidePopover();
    };
    const lang = document.documentElement.lang || undefined;
    const n = (x: number) => x.toLocaleString(lang);
    return html`<div class="to-share-fit ${over > 0 ? 'over' : ''}">
      <button type="button" class="to-btn to-fit-words" popovertarget="to-rooms" aria-haspopup="dialog" @pointerenter=${hover(true)} @pointerleave=${hover(false)} @click=${(e: Event) => {
        const btn = e.currentTarget as HTMLElement;
        requestAnimationFrame(() => this.querySelector<HTMLElement>('.to-rooms:popover-open') && place(this.querySelector<HTMLElement>('.to-rooms')!, btn));
      }}>${over > 0 ? t('{n} characters over the link limit', { n: n(over) }) : fitLine(this.link)}</button>
      <button type="button" class="to-btn to-tool to-fit-copy" aria-label=${t('Copy link')} title=${t('Copy link')} @click=${() => void copyText(this.link)}>${icon(UI.copy, 18)}</button>
      <div id="to-rooms" class="to-rooms to-menu" popover="auto" role="dialog" aria-label=${t('Where the link fits')} @pointerleave=${(e: PointerEvent) => e.pointerType === 'mouse' && (e.currentTarget as HTMLElement).hidePopover()}>
        <table>
          <thead><tr><th scope="col">${t('Where')}</th><th scope="col">${t('Uses')}</th><th scope="col">${t('Left')}</th></tr></thead>
          <tbody>${roomFor(this.link).map(
            (r) => html`<tr class=${r.left < 0 ? 'over' : ''}><th scope="row">${r.target.where()}</th><td>${n(r.used)} / ${n(r.target.max)}</td><td>${r.target.flat ? t('any length') : r.left < 0 ? t('{n} over', { n: n(-r.left) }) : n(r.left)}</td></tr>`,
          )}</tbody>
        </table>
      </div>
    </div>`;
  }

  /** Link or Display Link: a pair of buttons, the one chosen pressed. */
  private renderWhich(display: boolean, choose: (display: boolean) => void) {
    return html`<div class="to-seg to-which" role="group" aria-label=${t('Opens')}>
      <button type="button" class="to-btn" aria-pressed=${String(!display)} @click=${() => choose(false)}>${icon(UI.link, 16)}<span>${t('Link')}</span></button>
      <button type="button" class="to-btn" aria-pressed=${String(display)} @click=${() => choose(true)}>${icon(UI.view, 16)}<span>${t('Display Link')}</span></button>
    </div>`;
  }
  /** The lifetimes, one row of segments (a radio group) writing shortTtl. */
  private renderTtl() {
    return html`<fieldset class="to-seg to-ttl"><legend class="sr-only">${t('Expires after')}</legend>${EXPIRIES.map(
      (x) => html`<label><input type="radio" name="to-ttl" value=${x.seconds} .checked=${x.seconds === this.shortTtl} @change=${() => this.setTtl(x.seconds)} /><span>${x.name()}</span></label>`,
    )}</fieldset>`;
  }
  /** A link to copy: big, read-only, Copy at its right. */
  private renderField(link: string, cls: string, label: string, primary = true) {
    return html`<div class="to-share-field">
      <input type="text" class=${cls} readonly .value=${link} aria-label=${label} @focus=${(e: Event) => (e.target as HTMLInputElement).select()} />
      <button type="button" class="to-btn ${primary ? 'primary' : ''}" @click=${() => void copyText(link)}>${icon(UI.copy, 16)}<span>${t('Copy')}</span></button>
    </div>`;
  }
  private renderMaker() {
    return html`${this.renderTtl()}
      ${this.renderWhich(this.shortDisplay, (d) => (this.shortDisplay = d))}
      <p class="to-hint">${t('Encrypted here: the service holds only ciphertext, and only until then.')}</p>
      <button type="button" class="to-btn primary to-make" ?disabled=${this.busy} @click=${() => void this.makeShort()}>${icon(UI.link, 16)}<span>${this.busy ? t('Making…') : t('Make a short link')}</span></button>`;
  }
  /** Just made: the public link to share, big, and the owner's folded away. */
  private renderMade(short: Shortened) {
    const kept = isKept(short.owner);
    return html`${this.renderField(short.short, 'to-short-field', t('Short link'))}
      <p class="to-hint to-short-expires">${expiresLine(short.expires, Date.now(), document.documentElement.lang)}</p>
      <details class="to-owner">
        <summary>${t('Keep the owner link, to update it later')}</summary>
        ${this.renderField(short.owner, 'to-owner-field', t('Owner link'), false)}
        ${keeping()
          ? html`<button type="button" class="to-btn to-keep" ?disabled=${kept} @click=${() => this.keepShort(short)}>${icon(UI.check, 16)}<span>${kept ? t('Kept') : t('Keep on this device')}</span></button>`
          : html`<p class="to-hint">${t('Turn on Saved on this device, in the menu, to keep owner links here.')}</p>`}
      </details>`;
  }
  /** Opened from an owner link (or made here): the link, Update, the lifetimes with Extend, Forget. */
  private renderOwned(owned: Owned) {
    const link = shortLink(owned);
    return html`<p class="to-share-own">${t('You own this short link')}</p>
      ${this.renderField(link, 'to-short-field', t('Short link'), false)}
      ${this.expires ? html`<p class="to-hint to-short-expires">${expiresLine(this.expires, Date.now(), document.documentElement.lang)}</p>` : nothing}
      <button type="button" class="to-btn primary to-update" ?disabled=${this.busy || !this.changed} @click=${() => void this.updateShort()}>${icon(UI.link, 16)}<span>${this.busy ? t('Updating…') : this.changed ? t('Update') : t('Up to date')}</span></button>
      <div class="to-share-extend">
        ${this.renderTtl()}
        <button type="button" class="to-btn to-extend" ?disabled=${this.busy} @click=${() => void this.updateShort(this.shortTtl)}>${icon(UI.calendar, 16)}<span>${t('Extend')}</span></button>
      </div>
      <button type="button" class="to-btn to-forget" ?disabled=${this.busy} @click=${() => void this.forgetShort()}>${icon(UI.trash, 16)}<span>${t('Forget')}</span></button>`;
  }
  /** The QR code, drawn here when the link fits in one; else why not, in a sentence. */
  private renderQr() {
    const bytes = new TextEncoder().encode(this.qrDisplay ? this.displayLink : this.link);
    const fits = bytes.length <= QR_MAX_BYTES;
    const qr = fits ? qrSvg(bytes, 4) : '';
    return html`<section class="to-share-section to-share-qr" aria-labelledby="to-share-qr-h">
      <h3 id="to-share-qr-h">${t('QR code')}</h3>
      ${fits
        ? html`${this.renderWhich(this.qrDisplay, (d) => (this.qrDisplay = d))}
            <div class="to-qr-code" role="img" aria-label=${t('QR code of this document')}>${unsafeSVG(qr)}</div>
            <div class="to-row">
              <button type="button" class="to-btn" @click=${() => void this.saveQr(qr, 'png')}>${icon(UI.download, 16)}<span>PNG</span></button>
              <button type="button" class="to-btn" @click=${() => void this.saveQr(qr, 'svg')}>${icon(UI.download, 16)}<span>SVG</span></button>
            </div>`
        : html`<p class="to-hint to-qr-why">${t('This document is {n} bytes; the largest QR code holds {max}. Shorten it by {over} bytes and it will fit.', { n: bytes.length, max: QR_MAX_BYTES, over: bytes.length - QR_MAX_BYTES })}</p>`}
    </section>`;
  }
  /** The owner links kept on this device, folded: "2 short links kept here". */
  private renderKept() {
    const kept = keptLinks();
    if (!kept.length) return nothing;
    const lang = document.documentElement.lang;
    return html`<details class="to-share-section to-kept-list">
      <summary>${t('{n|# short link kept here|# short links kept here}', { n: kept.length })}</summary>
      <ul class="to-kept">${kept.map(
        (l) => html`<li><a href=${l.owner} class="to-short-link">${l.title || l.owner}</a><small>${expiresLine(l.expires, Date.now(), lang)}</small><button type="button" class="to-btn to-tool" aria-label=${t('Remove')} title=${t('Remove')} @click=${() => (dropKept(l.owner), this.requestUpdate())}>${icon(UI.close, 16)}</button></li>`,
      )}</ul>
    </details>`;
  }

  /** Arrived by a short link: how long it has left, big and coloured by how soon, sticky under the header and small once scrolled. */
  private renderArrival() {
    if (!this.arrived || !this.expires) return nothing;
    const { urgency } = timeLeft(this.expires);
    return html`<div class="to-arrival ${urgency} ${this.scrolled ? 'small' : ''} ${this.display ? 'in-display' : ''}" role="region" aria-label=${t('Short link')}>
      <p class="to-arrival-words">${expiresSentence(this.expires)}</p>
      <div class="to-arrival-acts">
        <button type="button" class="to-btn to-arrival-copy" @click=${this.copyIntoNew}>${icon(UI.copy, 16)}<span>${t('Copy into a new document')}</span></button>
        ${this.owned && !this.display ? html`<button type="button" class="to-btn to-arrival-extend" @click=${() => void this.openShare(true)}>${icon(UI.calendar, 16)}<span>${t('Extend')}</span></button>` : nothing}
      </div>
      <button type="button" class="to-btn to-tool to-arrival-close" aria-label=${t('Close')} title=${t('Close')} @click=${() => (this.arrived = false)}>${icon(UI.close, 20)}</button>
    </div>`;
  }

  /** Another version of this document is kept on this device (or the link is from a newer Tiny Little Office): a quiet line above the bar. */
  private renderOther() {
    if (this.newer) return this.unreadable ? nothing : html`<div class="to-other" role="status"><p>${t('This link was made by a newer Tiny Little Office. Reload the page to get it.')}</p></div>`;
    const k = this.other;
    if (!k) return nothing;
    return html`<div class="to-other" role="region" aria-label=${t('Another version')}>
      <p>${t('This device keeps another version of “{title}”, from {when}.', { title: k.title, when: ago(k.at, document.documentElement.lang) })}</p>
      <a class="to-btn to-other-open" href=${k.hash}>${t('Open it')}</a>
      <button type="button" class="to-btn to-tool" aria-label=${t('Close')} title=${t('Close')} @click=${() => (this.other = null)}>${icon(UI.close, 18)}</button>
    </div>`;
  }

  /** The Display Link: the pages one under another at their paper's width (scaled down only to fit), to read or print (a website: the site itself, as a visitor has it); a line with the title and Edit above them. */
  private renderDisplay(def: AppDef) {
    const { payload } = parseHash(location.hash);
    return html`<header class="to-display-head">
        <h1 class="to-display-title">${this.docTitle}</h1>
        <a class="to-btn primary to-display-edit" href=${routeHash(def.id, payload, '', this.owned, false, this.arrived && this.expires ? { id: parseHash(location.hash).arrived?.id ?? '', expires: this.expires } : null)}>${icon(UI.pen, 16)}<span>${t('Edit')}</span></a>
      </header>
      ${this.renderArrival()}
      <main class="to-display">${def.page
        ? html`<iframe class="to-display-site" sandbox="allow-scripts allow-popups allow-popups-to-escape-sandbox" title=${this.docTitle} .srcdoc=${gateHtml(def.page(this.doc, `${location.origin}${location.pathname}`)).html}></iframe>`
        : def.view(this.doc).map((p, i) => html`<div class="to-display-page" style="--page-w:${p.w}px" aria-label=${t('Page {n}', { n: i + 1 })} role="group">${unsafeSVG(gateSvg(pageSvg(p)))}</div>`)}</main>
      <to-toast></to-toast>`;
  }

  render() {
    const def = this.def;
    if (def && this.display && !this.unreadable) return this.renderDisplay(def);
    let main;
    if (!def) main = html`<to-home></to-home>`;
    else if (this.unreadable) main = html`<div class="to-empty"><p>${this.newer ? t('This link was made by a newer Tiny Little Office. Reload the page to get it.') : t('This link holds something that cannot be read. It may have been cut short when it was copied.')}</p><a class="to-btn primary" href=${routeHash(def.id)}>${t('New {noun}', { noun: def.noun })}</a></div>`;
    else if (!this.tag) main = html`<div class="to-empty to-loading" aria-busy="true">${t('Loading…')}</div>`;
    else {
      const tag = unsafeStatic(this.tag);
      main = staticHtml`<${tag} class="to-editor" .value=${this.edited} @docchange=${this.onDocChange}></${tag}>`;
    }
    const skip = () => {
      // The first place to type or act in the document itself, past the app's bar; else the page's main part.
      const inDoc = [...(this.editor?.querySelectorAll<HTMLElement>('to-text, [contenteditable=true], input, textarea, [tabindex="0"], svg[tabindex], button') ?? [])].find((el) => !el.closest('to-bar'));
      const to = inDoc ?? this.querySelector<HTMLElement>('.to-main');
      to?.focus();
    };
    return html`<button type="button" class="to-btn to-skip" @click=${skip}>${def ? t('Skip to the document') : t('Skip to the apps')}</button>${this.renderHeader()}${this.renderArrival()}${this.renderOther()}<main class="to-main" tabindex="-1">${main}</main><to-find></to-find><to-drawer></to-drawer><to-toast></to-toast>${this.renderDialogs()}<to-dialog class="to-keys-dialog" heading=${t('Keyboard shortcuts')} .body=${renderShortcuts(def)}></to-dialog>`;
  }
}
customElements.define('to-shell', ToShell);
