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
 * Privacy (kit/privacy.ts) is the shell's too, for every app. A sealed link ("E…", kit/crypt.ts) opens with
 * the unlock dialog and nothing of the document, its title included, until the password is given; while a
 * password is set every change is sealed again before it reaches the address bar, so the link, the library
 * and a short link only ever hold ciphertext. The envelope's keys (kit/envelope.ts: by, created, key, sig)
 * are the shell's: `created` is stamped with the first change, and every change the editor makes keeps them.
 * The state beside the title says whether the document is signed, by whom, whether it still matches, and
 * whether it is locked; it opens the Privacy dialog. Share holds Password… and Sign.
 *
 * A new document is named at once, "New Spreadsheet 2026-10-09 #1" (the first number that day's documents
 * of the app in the library leave free): the name is shown in the title box and goes into the head with the
 * first change, so a blank page left alone writes nothing (Paul, 2026-10-09).
 *
 * A plain-parameter link ("#title=…&doc=…", kit/plain.ts) becomes the packed link on arrival; "#/compare/…"
 * is the compare view (kit/compare.ts); a file dropped on the page opens (kit/open.ts); "…?show" opens a deck
 * presenting; the ".embed" view is the pages alone, for another site's frame. Share also posts the link to a
 * service's compose box (through the link guard) and copies the embed code.
 */
import { LitElement, html, nothing } from 'lit';
import { html as staticHtml, unsafeStatic } from 'lit/static-html.js';
import { unsafeSVG } from 'lit/directives/unsafe-svg.js';
import { unsafeHTML } from 'lit/directives/unsafe-html.js';
import type { AppDef, Doc, DocChange, Editor } from './app.ts';
import { appOf } from './apps.ts';
import { budgetFor, decodeDoc, encodeDoc } from './codec.ts';
import { withHead, takeHead } from '../doc/tlo.ts';
import type { Head } from '../doc/model.ts';
import type { Locker } from './crypt.ts';
import { ENVELOPE_KEYS, isoMinute, readEnvelope } from './envelope.ts';
import { icon, UI } from './icons.ts';
import { onLanguage, t } from './i18n.ts';
import { exportAs, exportItems, picture, raster, saveFile, slug, utf8 } from './exports.ts';
import { parseHash, routeHash, type Owned } from './route.ts';
import { fitLine } from './limits.ts';
import { DEFAULT_TTL, EXPIRIES, expiresLine, expiresSentence, forget, ownerLink, shorten, shortLink, timeLeft, update, type Shortened } from './short.ts';
import { dropKept, isKept, keepLink, keptLinks } from './links.ts';
import { checkSignature, keeping, lockWith, onPrivacy, pack, remember, reopen, signerName, signText, unlock, type Signature } from './privacy.ts';
import { signatureWords, type ToPrivacy } from './privacy-dialog.ts';
import { store } from './store.ts';
import { firstFree, firstWords, keep, library, localDay, type Kept } from './library.ts';
import { pageSvg } from './draw.ts';
import { QR_MAX_BYTES, qrSvg } from './qr.ts';
import { canShareNative, copyText, embedCode, mastodonHost, SERVICE_NAMES, SERVICES, shareNative, shareUrl, type Service } from './share.ts';
import { readPlain } from './plain.ts';
import { openFile } from './open.ts';
import { parseCompare, type Side } from './compare.ts';
import { openLink } from './link-guard.ts';
import { toast } from './toast.ts';
import { installLinkGuard } from './link-guard.ts';
import { gateHtml, gateSvg, installPictures, onPictures, setPictureDoc } from './pictures.ts';
import { mark } from './mark.ts';
import type { ToDialog } from './dialog.ts';
import type { ToDrawer } from './drawer.ts';
import './toast.ts';
import './menu.ts';
import './dialog.ts';
import './drawer.ts';
import './home.ts';
import './privacy-dialog.ts';
import './compare.ts';

/** The Mastodon server a link is posted to, asked once and remembered (under Saved; for the visit under Private). */
const MASTODON_KEY = 'tinyoffice.mastodon';

/** Where the lifetime chosen for short links is remembered (under Saved; for the visit under Private). */
const TTL_KEY = 'tinyoffice.shortTtl';
const savedTtl = () => {
  const n = Number(store.get(TTL_KEY));
  return EXPIRIES.some((x) => x.seconds === n) ? n : DEFAULT_TTL;
};

/** Where the site is served from: the page's folder, less an app's own page ("/sheet/") or the embed page's. */
function siteDir(): string {
  const dir = location.pathname.replace(/[^/]*$/, '');
  const last = dir.split('/').slice(-2)[0];
  return last && (appOf(last) || last === 'embed') ? dir.slice(0, -(last.length + 1)) : dir;
}

export class ToShell extends LitElement {
  static properties = { app: { state: true }, doc: { state: true }, tag: { state: true }, unreadable: { state: true }, short: { state: true }, shortTtl: { state: true }, busy: { state: true }, owned: { state: true }, changed: { state: true }, display: { state: true }, fresh: { state: true }, qrDisplay: { state: true }, shortDisplay: { state: true }, sharing: { state: true }, expires: { state: true }, arrived: { state: true }, scrolled: { state: true }, sealed: { state: true }, locker: { state: true }, signature: { state: true }, wrong: { state: true }, busyLock: { state: true }, signing: { state: true }, comparing: { state: true }, embed: { state: true }, askMastodon: { state: true } };
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
  /** The sealed payload waiting for its password; '' once opened, or when the link has none. */
  declare sealed: string;
  /** The password's key while this document has one: every change is sealed with it. Memory only. */
  declare locker: Locker | null;
  /** The signature, as last checked against the document. */
  declare signature: Signature;
  /** The unlock dialog's last try was not the password. */
  declare wrong: boolean;
  /** A password being tried, or set: the slow part. */
  declare busyLock: boolean;
  declare signing: boolean;
  /** The envelope's keys as the shell holds them (an empty value: taken out), put into every change. */
  private envelope: Head = {};
  /** The newest seal and check under way: an older one finishing late is dropped. */
  private sealRun = 0;
  private checkRun = 0;
  private offPrivacy = () => {};
  /** "#/compare/…": the two sides being compared, or null. */
  declare comparing: [Side | null, Side | null] | null;
  /** The embed view: the pages alone, for another site's frame. */
  declare embed: boolean;
  /** Mastodon asked for with no server known: the field for one shows. */
  declare askMastodon: boolean;
  /** A deck's show link: presenting starts once the editor is up. */
  private presentSoon = false;
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
    this.sealed = '';
    this.locker = null;
    this.signature = { state: 'none' };
    this.wrong = false;
    this.busyLock = false;
    this.signing = false;
    this.comparing = null;
    this.embed = false;
    this.askMastodon = false;
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
    window.addEventListener('dragover', this.onDragOver);
    window.addEventListener('drop', this.onDrop);
    this.offLanguage = onLanguage(() => this.requestUpdate());
    this.offPictures = onPictures(() => this.requestUpdate());
    // A key imported or forgotten changes whose signature this is.
    this.offPrivacy = onPrivacy(() => void this.checkSignature());
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
    window.removeEventListener('dragover', this.onDragOver);
    window.removeEventListener('drop', this.onDrop);
    this.flushKeep();
    this.offLanguage();
    this.offPictures();
    this.offPrivacy();
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

  /** A plain-parameter link, made the packed link it stands for (the address replaced: Back does not return to it). */
  private unplain() {
    const plain = readPlain(location.hash, this.pageApp(), (id) => !!appOf(id));
    if (!plain) return;
    const def = appOf(plain.app)!;
    const doc = plain.title ? def.retitle(plain.text, plain.title) : plain.text;
    const view = plain.view === 'show' ? '' : plain.view;
    history.replaceState(null, '', routeHash(def.id, encodeDoc(doc), view) + (plain.view === 'show' ? '?show' : ''));
  }

  private onHash = () => {
    this.flushKeep();
    this.unplain();
    this.comparing = parseCompare(location.hash);
    const { app, payload, view: asked, owned, display, arrived, sealed, show } = parseHash(location.hash);
    const view = asked === 'embed' ? '' : asked;
    const id = app ?? (!location.hash && appOf(this.pageApp()) ? this.pageApp() : null);
    const def = id ? appOf(id) : undefined;
    this.app = def ? id : null;
    this.pendingView = view;
    this.owned = def ? owned : null;
    this.changed = false;
    this.payloadLength = payload.length;
    this.sealed = def && sealed ? payload : '';
    this.locker = null;
    this.wrong = false;
    this.unreadable = !!payload && !sealed && !decodeDoc(payload);
    this.doc = def ? (sealed ? '' : payload ? decodeDoc(payload) : def.blank()) : '';
    this.edited = this.doc;
    this.envelope = takeHead(this.doc, ENVELOPE_KEYS)[0];
    this.signature = { state: 'none' };
    // Show pictures from the web is remembered for this document, as it arrived, for the visit.
    setPictureDoc(def ? routeHash(def.id, payload) : '');
    this.display = !!def && display && !!payload;
    this.embed = !!def && asked === 'embed' && !!payload;
    this.presentSoon = !!def && !!show && !display && !this.embed;
    // The owner of a short link that opens the pages arrives with "?d": the short link goes on opening them.
    if (owned && display) this.shortDisplay = true;
    this.expires = def && arrived ? arrived.expires : 0;
    this.arrived = !!def && !!arrived;
    this.fresh = def && !payload ? this.newName(def) : '';
    const state = history.state as { kept?: unknown } | null;
    const hash = def && payload ? routeHash(def.id, payload) : '';
    this.keptId = typeof state?.kept === 'string' ? state.kept : hash ? (library().find((k) => k.hash === hash)?.id ?? null) : null;
    this.setTitle();
    if (def && this.tag !== `to-${def.id}-editor`) {
      this.tag = '';
      void def.editor().then(({ tag }) => {
        if (this.app === def.id) this.tag = tag;
      });
    }
    if (this.sealed) void this.reopen(this.sealed);
    else {
      void this.checkSignature();
      if (def && view) void this.updateComplete.then(() => this.doView());
    }
  };

  /* ---------- the password ---------- */

  /** A sealed link: opened by a password already given this visit, or the unlock dialog. */
  private async reopen(payload: string) {
    const r = await reopen(payload);
    if (payload !== this.sealed) return;
    if (r) this.opened(r.text, r.locker);
    else void this.askPassword();
  }
  private get unlockDialog(): ToDialog | null {
    return this.querySelector<ToDialog>('to-dialog.to-unlock-dialog');
  }
  async askPassword() {
    await this.updateComplete;
    await this.unlockDialog?.show();
    this.querySelector<HTMLInputElement>('.to-unlock-field')?.focus();
  }
  private async tryPassword(e: Event) {
    e.preventDefault();
    const field = this.querySelector<HTMLInputElement>('.to-unlock-field');
    const payload = this.sealed;
    if (!field || !payload || this.busyLock) return;
    this.busyLock = true;
    try {
      const r = await unlock(field.value, payload);
      if (payload !== this.sealed) return;
      if (!r) {
        this.wrong = true;
        field.select();
        return;
      }
      this.unlockDialog?.close();
      this.opened(r.text, r.locker);
    } finally {
      this.busyLock = false;
    }
  }
  /** The document behind the password, open: shown, checked, and a view asked for in the link done. */
  private opened(text: string, locker: Locker) {
    this.sealed = '';
    this.wrong = false;
    this.locker = locker;
    this.doc = text;
    this.edited = text;
    this.envelope = takeHead(text, ENVELOPE_KEYS)[0];
    this.setTitle();
    void this.checkSignature();
    if (this.pendingView) void this.updateComplete.then(() => this.doView());
  }
  /** A password set or changed (the document sealed again at once), or taken off (`password` empty). */
  private async setPassword(password: string) {
    if (this.busyLock) return;
    this.busyLock = true;
    try {
      this.locker = password ? await lockWith(password) : null;
      if (this.locker) remember(this.locker);
      this.change(this.doc);
      toast(password ? t('Password set: the link holds only ciphertext') : t('Password removed'));
      this.querySelector<ToDialog>('to-dialog.to-password-dialog')?.close();
    } finally {
      this.busyLock = false;
    }
  }

  /* ---------- the signature ---------- */

  /** The signature checked against the document as it is now. */
  private async checkSignature() {
    const run = ++this.checkRun;
    const sig: Signature = this.app && !this.sealed ? await checkSignature(this.app, this.doc) : { state: 'none' };
    if (run === this.checkRun) this.signature = sig;
  }
  /** Signed with this device's key under `name`: the envelope takes the name, the time, the key and the signature. */
  private async sign(name: string) {
    if (!this.app || this.signing) return;
    this.signing = true;
    try {
      const keys = await signText(this.app, this.envelopeOn(this.doc), name);
      this.envelope = { ...this.envelope, ...keys };
      this.change(this.doc);
      toast(t('Signed'));
    } catch {
      toast(t('Could not sign'));
    } finally {
      this.signing = false;
    }
  }
  private unsign() {
    this.envelope = { ...this.envelope, key: '', sig: '' };
    this.change(this.doc);
  }
  /** A text with the envelope's keys put in its head: the time it was first written, stamped now if it has none. */
  private envelopeOn(doc: Doc): Doc {
    if (!this.envelope.created) this.envelope = { ...this.envelope, created: isoMinute(Date.now()) };
    return withHead(doc, this.envelope);
  }

  private async doView() {
    const view = this.pendingView;
    this.pendingView = '';
    if (!view || !this.def) return;
    history.replaceState(this.state(), '', routeHash(this.def.id, parseHash(location.hash).payload, '', this.owned, false, this.tie));
    try {
      const name = await exportAs(view, this.current());
      if (name) toast(t('Downloaded {name}', { name }));
      else if (view !== 'print' && view !== 'pdf') toast(t('No .{ext} view here', { ext: view }));
    } catch {
      toast(t('Download failed'));
    }
  }

  /** Once the editor is up, a show link starts presenting (an app with nothing to present ignores it). */
  protected updated() {
    const editor = this.editor as (Editor & { present?: (fromLink?: boolean) => void }) | null;
    if (!this.presentSoon || !editor) return;
    this.presentSoon = false;
    void (editor as unknown as { updateComplete?: Promise<unknown> }).updateComplete?.then(() => editor.present?.(true));
  }

  /* ---------- a file dropped on the page ---------- */

  private onDragOver = (e: DragEvent) => {
    if (!e.dataTransfer?.types.includes('Files')) return;
    e.preventDefault();
    e.dataTransfer.dropEffect = 'copy';
  };
  private onDrop = (e: DragEvent) => {
    const file = e.dataTransfer?.files[0];
    if (!file) return;
    e.preventDefault();
    void openFile(file, this.app ?? this.pageApp());
  };

  /**
   * The document is now `doc`: the envelope's keys put in (a blank page, still blank, is left as it is), into
   * the link with it, sealed first while it has a password, and its signature checked again.
   */
  private change(doc: Doc) {
    const app = this.app;
    if (!app || this.sealed) return;
    const blank = doc === this.def!.blank() && !this.envelope.sig;
    this.doc = blank ? doc : this.envelopeOn(doc);
    this.changed = true;
    this.setTitle();
    void this.checkSignature();
    const run = ++this.sealRun;
    if (!this.locker) return this.writeLink(app, encodeDoc(this.doc));
    void pack(this.doc, this.locker).then((payload) => run === this.sealRun && app === this.app && this.writeLink(app, payload));
  }
  private writeLink(app: string, payload: string) {
    this.payloadLength = payload.length;
    this.keepSoon(payload);
    history.replaceState(this.state(), '', routeHash(app, payload, '', this.owned, false, this.tie));
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
    // Under a password the library keeps the ciphertext alone: no name, no first words.
    const title = this.locker ? '' : def.title(this.doc) || firstWords(this.doc);
    this.pending = { id: this.keptId, app: def.id, title, hash: routeHash(def.id, payload), at: Date.now() };
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

  private setTitle() {
    const def = this.def;
    document.title = def ? `${this.docTitle} · Tiny Little Office` : 'Tiny Little Office';
  }
  /** What the document is called: the name it was given, a new one's name, or "Untitled presentation" (a link that came with none). */
  private get docTitle(): string {
    const def = this.def;
    if (def && this.sealed) return t('Locked document');
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
    if (!def || this.sealed) return;
    // A copy is a new document: not signed, not yet written.
    const doc = withHead(def.retitle(this.doc, t('Copy of {title}', { title: this.docTitle })), { by: '', created: '', key: '', sig: '' });
    const open = (payload: string) => {
      const u = new URL(location.href);
      u.hash = routeHash(def.id, payload);
      window.open(u.href, '_blank', 'noopener');
      toast(t('A copy opened in a new tab'));
    };
    // Under a password, the copy is sealed with it too; a plain one opens at once, inside the tap.
    if (this.locker) void pack(doc, this.locker).then(open);
    else open(encodeDoc(doc));
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
    if (!def) return html`<header class="to-header" aria-label="Tiny Little Office">${burger}<a class="to-brand" href="#/">Tiny Little Office</a></header>`;
    if (this.sealed)
      return html`<header class="to-header" aria-label="Tiny Little Office">
        ${burger}
        <a class="to-here" href=${routeHash(def.id)} title=${t('New {noun}', { noun: def.noun })} aria-label=${t('New {noun}', { noun: def.noun })}>${icon(def.icon, 24)}</a>
        <h1 class="to-title to-title-locked">${this.docTitle}</h1>
        ${this.renderTrust()}
      </header>`;
    const title = def.title(this.doc);
    const prefix = `${location.origin}${location.pathname}${routeHash(def.id)}/`;
    const { available } = budgetFor(prefix);
    const left = available - this.payloadLength;
    const pct = Math.min(1, this.payloadLength / Math.max(1, available));
    const r = 9;
    const c = 2 * Math.PI * r;
    return html`<header class="to-header" aria-label="Tiny Little Office">
      ${burger}
      <a class="to-here" href=${routeHash(def.id)} title=${t('New {noun}', { noun: def.noun })} aria-label=${t('New {noun}', { noun: def.noun })}>${icon(def.icon, 24)}</a>
      <h1 class="sr-only">${this.docTitle}</h1>
      <input class="to-title" type="text" placeholder=${t('Untitled {noun}', { noun: def.noun })} aria-label=${t('Title')} autocomplete="off" .value=${title || this.fresh} @focus=${(e: Event) => this.fresh && !title && (e.target as HTMLInputElement).select()} @change=${(e: Event) => this.retitle(def, (e.target as HTMLInputElement).value.trim())} />
      ${this.renderTrust()}
      <button type="button" class="to-btn to-tool to-meter ${left < 0 ? 'over' : pct > 0.85 ? 'warn' : ''}" aria-label=${left < 0 ? t('{n} characters over the link limit', { n: -left }) : t('{n} of {max} link characters left', { n: left, max: available })} title=${left < 0 ? t('{n} characters over the link limit', { n: -left }) : t('{n} of {max} link characters left', { n: left, max: available })} @click=${() => void this.openShare()}>
        <svg width="24" height="24" viewBox="0 0 24 24" aria-hidden="true"><circle cx="12" cy="12" r=${r} fill="none" stroke="currentColor" stroke-opacity="0.25" stroke-width="3"/><circle cx="12" cy="12" r=${r} fill="none" stroke="currentColor" stroke-width="3" stroke-dasharray=${`${c * pct} ${c}`} transform="rotate(-90 12 12)"/></svg>
      </button>
      <button type="button" class="to-btn to-tool to-share" aria-label=${t('Share')} title=${t('Share')} aria-haspopup="dialog" @click=${() => void this.openShare()}>${icon(UI.share, 22)}</button>
      <to-menu class="to-download" icon-only .label=${t('Download')} .icon=${UI.download} .items=${exportItems(this.current)}></to-menu>
    </header>`;
  }

  /**
   * The state beside the title: unsigned (quiet), signed by a name (green, the key's fingerprint on hover),
   * changed since signed or not matching (red), locked (a lock). A lock rides beside the state while the
   * document has a password. It opens the Privacy dialog; a locked one, the unlock dialog.
   */
  private renderTrust() {
    const sig = this.signature;
    const tone = this.sealed ? 'locked' : sig.state === 'valid' ? 'signed' : sig.state === 'none' ? 'quiet' : 'mismatch';
    const words = signatureWords(sig, !!this.sealed);
    const where = keeping() ? t('Saved on this device') : t('Private');
    const tip = [words, sig.fingerprint && !this.sealed ? t('Key {fp}', { fp: sig.fingerprint }) : '', this.locker ? t('Protected by a password') : '', where].filter(Boolean).join(' · ');
    const ico = this.sealed ? UI.lock : sig.state === 'valid' ? UI.shield : sig.state === 'none' ? UI.unsigned : UI.mismatch;
    const open = () => (this.sealed ? void this.askPassword() : void this.querySelector<ToPrivacy>('to-privacy[doc]')?.show());
    return html`<button type="button" class="to-btn to-trust ${tone}" aria-haspopup="dialog" aria-label=${tip} title=${tip} @click=${open}>
      ${this.locker && !this.sealed ? icon(UI.lock, 16, 'to-trust-lock') : nothing}${icon(ico, 18)}<span class="to-trust-words">${words}</span>
    </button>`;
  }

  /** The title box: the name given, in the head (and to the editor); a new document's own name is spent. */
  private retitle(def: AppDef, title: string) {
    const doc = def.retitle(this.doc, title);
    this.fresh = '';
    this.edited = doc;
    this.change(doc);
  }

  private renderDialogs() {
    if (!this.def) return nothing;
    return html`${this.display && !this.sealed ? nothing : html`<to-dialog class="to-share-dialog" heading=${this.docTitle} @to-close=${() => ((this.short = null), (this.sharing = false))} .body=${this.sharing ? this.renderShare() : nothing}></to-dialog>`}
      <to-dialog class="to-unlock-dialog" heading=${t('This document is locked')} .body=${this.renderUnlock()}></to-dialog>
      <to-dialog class="to-password-dialog" heading=${t('Password')} .body=${this.renderPassword()}></to-dialog>
      <to-privacy doc .signature=${this.signature} ?protected=${!!this.locker} @to-open-share=${() => void this.openShare()}></to-privacy>`;
  }

  /** The password asked for: one field, Unlock; a wrong one is said so, and the field stays to try again. */
  private renderUnlock() {
    return html`<form class="to-unlock" @submit=${(e: Event) => void this.tryPassword(e)}>
      <p>${t('Enter the password to open this document.')}</p>
      <div class="to-ask-row">
        <input type="password" class="to-unlock-field" aria-label=${t('Password')} autocomplete="current-password" aria-invalid=${String(this.wrong)} aria-describedby="to-unlock-wrong" @input=${() => (this.wrong = false)} />
        <button type="submit" class="to-btn primary to-unlock-go" ?disabled=${this.busyLock}>${icon(UI.unlock, 16)}<span>${this.busyLock ? t('Opening…') : t('Unlock')}</span></button>
      </div>
      <p id="to-unlock-wrong" class="to-unlock-wrong" role="alert">${this.wrong ? t('Wrong password') : ''}</p>
    </form>`;
  }

  /** Set a password, change it, or take it off. Twice, so a slip of the finger does not lock the author out. */
  private renderPassword() {
    const has = !!this.locker;
    const check = () => {
      const [a, b] = [...this.querySelectorAll<HTMLInputElement>('.to-password-new')].map((f) => f.value);
      const go = this.querySelector<HTMLButtonElement>('.to-password-set');
      if (go) go.disabled = !a || a !== b;
      const differ = this.querySelector<HTMLElement>('.to-password-differ');
      if (differ) differ.textContent = b && a !== b ? t('The two passwords differ') : '';
    };
    const submit = (e: Event) => {
      e.preventDefault();
      const [a, b] = [...this.querySelectorAll<HTMLInputElement>('.to-password-new')].map((f) => f.value);
      if (a && a === b) void this.setPassword(a);
    };
    return html`<form class="to-password" @submit=${submit}>
      <p>${has ? t('This document has a password. The link, and any short link made from it, holds only ciphertext.') : t('Anyone with the link will need the password to open it. Nobody can reset it: lose it and the document is gone.')}</p>
      <label class="to-password-label"><span>${has ? t('New password') : t('Password')}</span><input type="password" class="to-password-new" autocomplete="new-password" @input=${check} /></label>
      <label class="to-password-label"><span>${t('Again')}</span><input type="password" class="to-password-new" autocomplete="new-password" @input=${check} /></label>
      <p class="to-password-differ to-hint" role="status"></p>
      <div class="to-row">
        <button type="submit" class="to-btn primary to-password-set" disabled>${icon(UI.lock, 16)}<span>${this.busyLock ? t('Sealing…') : has ? t('Change password') : t('Set password')}</span></button>
        ${has ? html`<button type="button" class="to-btn to-password-remove" ?disabled=${this.busyLock} @click=${() => void this.setPassword('')}>${icon(UI.unlock, 16)}<span>${t('Remove password')}</span></button>` : nothing}
      </div>
    </form>`;
  }

  /** When the document was first written, and by whom: "Created 9 Oct 2026, 14:03 · by Paul". */
  private madeLine(): string {
    const env = readEnvelope(this.doc);
    const lang = document.documentElement.lang || undefined;
    const when = env.created === null ? '' : t('Created {date}', { date: new Intl.DateTimeFormat(lang, { day: 'numeric', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' }).format(env.created) });
    const by = env.by ? (this.signature.state === 'valid' ? t('by {name}', { name: env.by }) : t('by {name} (unsigned)', { name: env.by })) : '';
    return [when, by].filter(Boolean).join(' · ');
  }

  /** Password… and the signature: the state, the name to sign under, Sign (or Sign again), Remove the signature. */
  private renderProtect() {
    const sig = this.signature;
    const signed = !!this.envelope.sig;
    const tone = sig.state === 'valid' ? 'signed' : sig.state === 'none' ? 'quiet' : 'mismatch';
    const name = () => this.querySelector<HTMLInputElement>('.to-sign-name')?.value ?? '';
    return html`<section class="to-share-section to-share-protect" aria-labelledby="to-share-protect-h">
      <h3 id="to-share-protect-h">${t('Password and signature')}</h3>
      <div class="to-share-protect-row">
        <p class="to-trust-line quiet">${icon(this.locker ? UI.lock : UI.unlock, 18)}<span>${this.locker ? t('Protected by a password') : t('No password')}</span></p>
        <button type="button" class="to-btn to-password-open" aria-haspopup="dialog" @click=${() => void this.querySelector<ToDialog>('to-dialog.to-password-dialog')?.show()}>${icon(UI.lock, 16)}<span>${t('Password…')}</span></button>
      </div>
      <p class="to-trust-line ${tone}">${icon(sig.state === 'valid' ? UI.shield : sig.state === 'none' ? UI.unsigned : UI.mismatch, 18)}<span>${signatureWords(sig)}</span>${sig.fingerprint ? html`<small>${t('Key {fp}', { fp: sig.fingerprint })}</small>` : nothing}</p>
      <form class="to-sign" @submit=${(e: Event) => (e.preventDefault(), void this.sign(name()))}>
        <label class="to-sign-label"><span>${t('Sign as')}</span><input type="text" class="to-sign-name" autocomplete="name" placeholder=${t('Your name')} .value=${readEnvelope(this.doc).by ?? signerName()} /></label>
        <div class="to-row">
          <button type="submit" class="to-btn primary to-sign-go" ?disabled=${this.signing}>${icon(UI.sign, 16)}<span>${signed ? t('Sign again') : t('Sign')}</span></button>
          ${signed ? html`<button type="button" class="to-btn to-unsign" @click=${() => this.unsign()}>${icon(UI.close, 16)}<span>${t('Remove signature')}</span></button>` : nothing}
        </div>
      </form>
      <p class="to-hint">${keeping() ? t('Signed with this device’s key: anyone can check that the document is exactly what you signed.') : t('Private: your signing key lasts for this visit. Turn on Saved in the menu to keep it.')}</p>
    </section>`;
  }

  /** The one Share dialog: where the link fits, the two copies, the short link, the QR code, the short links kept here. */
  private renderShare() {
    const def = this.def!;
    const share = async () => shareNative(this.docTitle, this.link, await picture(def.view(this.doc)));
    const made = this.madeLine();
    return html`${made ? html`<p class="to-share-made">${made}</p>` : nothing}<p class="to-share-fit">${fitLine(this.link)}</p>
      <div class="to-share-links">
        <button type="button" class="to-btn to-share-copy to-copy-link" @click=${() => void copyText(this.link)}><span>${icon(UI.link, 18)}${t('Copy link')}</span><small>${t('Opens in the editor')}</small></button>
        <button type="button" class="to-btn to-share-copy to-copy-display" @click=${() => void copyText(this.displayLink)}><span>${icon(UI.view, 18)}${t('Copy display link')}</span><small>${t('Opens as pages to read')}</small></button>
        ${canShareNative() ? html`<button type="button" class="to-btn to-share-native" @click=${() => void share()}>${icon(UI.share, 18)}<span>${t('Share…')}</span></button>` : nothing}
      </div>
      ${this.renderProtect()}
      <section class="to-share-section to-share-short" aria-labelledby="to-share-short-h">
        <h3 id="to-share-short-h">${t('Short link that expires')}</h3>
        ${this.short ? this.renderMade(this.short) : this.owned ? this.renderOwned(this.owned) : this.renderMaker()}
      </section>
      ${this.renderPost()}
      ${this.renderQr()}
      ${this.renderEmbedCode()}
      ${this.renderKept()}`;
  }

  /** A deck's show link: the same deck, opening already presenting. */
  get showLink(): string {
    return `${this.link}?show`;
  }

  /** The link to a service's compose box: Bluesky, Mastodon (its server asked once), X, LinkedIn, Email; each opened through the link guard. */
  private post(service: Service) {
    const server = mastodonHost(store.get(MASTODON_KEY) ?? '');
    if (service === 'mastodon' && !server) {
      this.askMastodon = true;
      void this.updateComplete.then(() => this.querySelector<HTMLInputElement>('.to-mastodon-server')?.focus());
      return;
    }
    openLink(shareUrl(service, this.docTitle, this.link, server));
  }
  private setMastodon(e: Event) {
    e.preventDefault();
    const box = this.querySelector<HTMLInputElement>('.to-mastodon-server')!;
    const host = mastodonHost(box.value);
    box.setCustomValidity(host ? '' : t('A Mastodon server, like mastodon.social'));
    if (!box.reportValidity()) return;
    store.set(MASTODON_KEY, host);
    this.askMastodon = false;
    this.post('mastodon');
  }
  private renderPost() {
    const server = mastodonHost(store.get(MASTODON_KEY) ?? '');
    return html`<section class="to-share-section to-share-post" aria-labelledby="to-share-post-h">
      <h3 id="to-share-post-h">${t('Post the link')}</h3>
      <div class="to-post">${SERVICES.map(
        (s) => html`<button type="button" class="to-btn to-post-${s}" @click=${() => this.post(s)}>${icon(s === 'email' ? UI.mail : UI.post, 16)}<span>${SERVICE_NAMES[s]}</span></button>`,
      )}</div>
      ${this.askMastodon || server
        ? html`<form class="to-share-field to-mastodon" @submit=${(e: Event) => this.setMastodon(e)}>
            <input type="text" class="to-mastodon-server" inputmode="url" autocomplete="off" autocapitalize="off" spellcheck="false" aria-label=${t('Your Mastodon server')} placeholder="mastodon.social" .value=${server} />
            <button type="submit" class="to-btn">${server ? t('Change') : t('Post')}</button>
          </form>`
        : nothing}
      ${this.app === 'deck' ? html`<button type="button" class="to-btn to-copy-show" @click=${() => void copyText(this.showLink)}>${icon(UI.play, 16)}<span>${t('Copy show link')}</span></button><p class="to-hint">${t('Opens the deck already presenting.')}</p>` : nothing}
    </section>`;
  }
  /** The embed code: the document's pages in another site's page, in a frame. */
  get embedLink(): string {
    const u = new URL(location.href);
    u.pathname = `${siteDir()}embed/`;
    u.search = '';
    u.hash = routeHash(this.app!, parseHash(location.hash).payload, 'embed');
    return u.href;
  }
  private renderEmbedCode() {
    return html`<section class="to-share-section to-share-embed" aria-labelledby="to-share-embed-h">
      <h3 id="to-share-embed-h">${t('Embed')}</h3>
      <p class="to-hint">${t('The pages, in a frame on another site, with a link to open them here.')}</p>
      <button type="button" class="to-btn to-copy-embed" @click=${() => void copyText(embedCode(this.embedLink, this.docTitle), t('Embed code copied'))}>${icon(UI.code, 16)}<span>${t('Copy embed code')}</span></button>
    </section>`;
  }

  /** The embed view: the pages alone, one under another, with the title and Open in Tiny Little Office over them. */
  private renderEmbed(def: AppDef) {
    const { payload } = parseHash(location.hash);
    const u = new URL(location.href);
    u.pathname = siteDir();
    u.hash = routeHash(def.id, payload);
    return html`<header class="to-embed-head">
        <span class="to-embed-title">${this.docTitle}</span>
        <a class="to-btn to-embed-open" href=${u.href} target="_blank" rel="noopener">${icon(UI.open, 16)}<span>${t('Open in Tiny Little Office')}</span></a>
      </header>
      <main class="to-display to-embed">${def.view(this.doc).map((p, i) => html`<div class="to-display-page" aria-label=${t('Page {n}', { n: i + 1 })} role="group">${unsafeSVG(gateSvg(pageSvg(p)))}</div>`)}</main>`;
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

  /** The Display Link: the pages one under another, to read or print (a website: the site itself, as a visitor has it); a line with the title and Edit above them. */
  private renderDisplay(def: AppDef) {
    const { payload } = parseHash(location.hash);
    return html`<header class="to-display-head">
        <h1 class="to-display-title">${this.docTitle}</h1>
        ${this.renderTrust()}
        <a class="to-btn primary to-display-edit" href=${routeHash(def.id, payload, '', this.owned, false, this.arrived && this.expires ? { id: parseHash(location.hash).arrived?.id ?? '', expires: this.expires } : null)}>${icon(UI.pen, 16)}<span>${t('Edit')}</span></a>
      </header>
      ${this.renderArrival()}
      <main class="to-display">${def.page
        ? html`<iframe class="to-display-site" sandbox="allow-scripts allow-popups allow-popups-to-escape-sandbox" title=${this.docTitle} .srcdoc=${gateHtml(def.page(this.doc, `${location.origin}${location.pathname}`)).html}></iframe>`
        : def.view(this.doc).map((p, i) => html`<div class="to-display-page" aria-label=${t('Page {n}', { n: i + 1 })} role="group">${unsafeSVG(gateSvg(pageSvg(p)))}</div>`)}</main>
      <to-toast></to-toast>${this.renderDialogs()}`;
  }

  render() {
    const def = this.def;
    if (def && this.embed && !this.unreadable) return this.renderEmbed(def);
    if (def && this.display && !this.unreadable && !this.sealed) return this.renderDisplay(def);
    let main;
    if (this.comparing) main = html`<to-compare .a=${this.comparing[0]} .b=${this.comparing[1]}></to-compare>`;
    else if (!def) main = html`<to-home></to-home>`;
    else if (this.sealed) main = html`<div class="to-empty to-locked">${icon(UI.lock, 32)}<p>${t('This document is locked with a password.')}</p><button type="button" class="to-btn primary to-unlock-open" @click=${() => void this.askPassword()}>${icon(UI.unlock, 16)}<span>${t('Unlock…')}</span></button></div>`;
    else if (this.unreadable) main = html`<div class="to-empty"><p>${t('This link holds something that cannot be read. It may have been cut short when it was copied.')}</p><a class="to-btn primary" href=${routeHash(def.id)}>${t('New {noun}', { noun: def.noun })}</a></div>`;
    else if (!this.tag) main = html`<div class="to-empty to-loading" aria-busy="true">${t('Loading…')}</div>`;
    else {
      const tag = unsafeStatic(this.tag);
      main = staticHtml`<${tag} class="to-editor" .value=${this.edited} @docchange=${this.onDocChange}></${tag}>`;
    }
    return html`${this.renderHeader()}${this.renderArrival()}<main class="to-main" aria-label=${this.def?.name ?? nothing}>${main}</main><to-drawer></to-drawer><to-toast></to-toast>${this.renderDialogs()}`;
  }
}
customElements.define('to-shell', ToShell);
