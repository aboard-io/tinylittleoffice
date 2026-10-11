/**
 * <to-shell>: owns the URL. Routes "#/v1/<app>/<payload>" to an app, hands its editor the document's text, and writes
 * every change back into the link with history.replaceState, so the address bar is the document and nothing is ever
 * sent anywhere. A keystroke costs only what it changed: the link is projected when typing pauses (PAUSE), and flushed
 * at once before anything reads it (flushLink; kit/route.ts currentHash outside). It keeps the route, the document and
 * its projection to the link, the library's keep (kit/library.ts Keeper), the title and the editor's mounting, and
 * draws round them elements that take their state as properties and speak back by events: <to-chrome> (kit/chrome.ts:
 * the header, the menu button, the banners, the column that scrolls and the bar's place in it), <to-share>
 * (kit/share-dialog.ts), <to-privacy> (kit/privacy-dialog.ts: unlock, the password, the signature), and the editor,
 * <to-drawer>, <to-find>, <to-toast> and the shortcuts dialog. (Until round eight all of it was this one element,
 * 1,400 lines, the window scrolled and the bar measured into place over a phone's keyboard: kit/chrome.ts says why.)
 *
 * A sealed link ("E…", kit/crypt.ts) shows nothing of the document, its title included, until the password is given;
 * while a password is set every change is sealed again before it reaches the address bar, so the link, the library
 * and a short link only ever hold ciphertext. The envelope's keys (kit/envelope.ts: by, created, key, sig) are the
 * shell's: `created` is stamped with the first change, and every change keeps them. A new document is named at once
 * (library.ts newName), shown in the title box and written with the first change, so a blank page left alone writes
 * nothing. A Display Link ("?d") shows the pages, to read or print, with Edit; ".embed" the pages alone, for another
 * site's frame; "…?show" opens a deck presenting; ".<ext>" downloads (exports.ts viewAs); a plain-parameter link
 * (kit/plain.ts) becomes the packed link on arrival; "#/compare/…" is the compare view; a file dropped on the page
 * opens (kit/open.ts). Mod+F finds, Mod+/ the shortcuts, Mod+S keeps, Mod+K the command palette (kit/keys.ts, the page's
 * commands; kit/palette.ts).
 *
 * A document that lives nowhere but its link (Private, changed since it was opened or begun, the link not copied
 * since) is asked about once before the shell leaves it (Paul, 2026-10-10: "if I've entered data it should tell me
 * that I need to copy the link if I don't want to lose data"): a link to another place in the site that a person
 * follows (the header's icon home, a drawer row, a kept document) and the kit's go() (a template, a file opened, a
 * hand-off) open one dialog, Copy the link and go, Turn on Saved and keep it here (the toast then says Saved is on, and
 * where it is turned off), Go without; Escape stays. The browser's
 * Back is not asked about: it is how the link comes back. Closing the tab in that state gets the browser's own warning
 * (beforeunload), and only then. A link copied through Share lives somewhere now: neither the dialog nor the warning
 * comes again until the document changes. Under Saved the library has it, and an unchanged document is in the link
 * that brought it.
 */
import { LitElement, html, nothing } from 'lit';
import { html as staticHtml, unsafeStatic } from 'lit/static-html.js';
import { unsafeSVG } from 'lit/directives/unsafe-svg.js';
import type { AppDef, Doc, DocChange, Editor } from './app.ts';
import { appOf } from './apps.ts';
import { decodeDoc, encodeDoc } from './codec.ts';
import { withHead, takeHead } from '../doc/tlo.ts';
import type { Head } from '../doc/model.ts';
import type { Locker } from './crypt.ts';
import { ENVELOPE_KEYS, isoMinute } from './envelope.ts';
import { ensureIcons, icon, iconNames, onIcons, UI } from './icons.ts';
import { onLanguage, t } from './i18n.ts';
import { exportItems, printDoc, viewAs } from './exports.ts';
import { LINK_VERSION, onFlush, parseHash, routeHash, type Owned } from './route.ts';
import { checkSignature, keeping, onPrivacy, pack, reopen, setPrivate, type Signature } from './privacy.ts';
import { copyText } from './share.ts';
import { trustButton, type ToPrivacy } from './privacy-dialog.ts';
import { openCopy, siteDir, type ToShare } from './share-dialog.ts';
import { firstWords, Keeper, library, newName, type Kept } from './library.ts';
import { pageSvg } from './draw.ts';
import { opensDropped, unplain } from './open.ts';
import { parseCompare, type Side } from './compare.ts';
import { toast } from './toast.ts';
import { installLinkGuard } from './link-guard.ts';
import { gateSvg, installPictures, onPictures, setPictureDoc } from './pictures.ts';
import { motion, reducedMotion } from './motion.ts';
import { setSelfLink } from './qr-picture.ts';
import { lockedCard } from './locked.ts';
import type { ToDialog } from './dialog.ts';
import type { ToDrawer } from './drawer.ts';
import type { ToMenu } from './menu.ts';
import type { ToFind } from './find.ts';
import { KIT_COMMANDS, PALETTE, pageKey, renderShortcuts, type Page } from './keys.ts';
import { inScope, live, register } from './commands.ts';
import { TEXT_COMMANDS } from './text-commands.ts';
import type { ToText } from './text.ts';
import type { Offer, ToPalette } from './palette.ts';
import './palette.ts';
import { installPlainCopy } from './clipboard.ts';
import { pinchSizes, pinchZoom } from './pinch.ts';
import { applySize } from './zoom.ts';
import './chrome.ts';
import './share-dialog.ts';
import './privacy-dialog.ts';
import './find.ts';
import './toast.ts';
import './dialog.ts';
import './drawer.ts';
import './home.ts';
import './compare.ts';

/** How long typing pauses before the document is projected into the link (flushLink). */
const PAUSE = 150;

export class ToShell extends LitElement {
  static properties = {
    app: { state: true },
    doc: { state: true },
    tag: { state: true },
    unreadable: { state: true },
    owned: { state: true },
    changed: { state: true },
    display: { state: true },
    fresh: { state: true },
    expires: { state: true },
    arrived: { state: true },
    sealed: { state: true },
    locker: { state: true },
    signature: { state: true },
    comparing: { state: true },
    embed: { state: true },
    other: { state: true },
    newer: { state: true },
  };
  declare app: string | null;
  declare doc: Doc;
  declare tag: string; // the editor element's tag, once its chunk has arrived
  declare unreadable: boolean; // the link holds something that cannot be read (cut short when copied, most often)
  declare owned: Owned | null; // the short link this document may update; rides in the hash (kit/route.ts), never in a shared link
  declare changed: boolean; // edited since the short link last had this document
  declare display: boolean; // shown as its pages (the Display Link), not in the editor
  declare fresh: string; // a new document's name, until it is given one: "New Spreadsheet 2026-10-09 #1"
  declare expires: number; // when the short link this document is tied to expires, ms since the epoch; 0 when none is known
  declare arrived: boolean; // arrived by a short link this visit, its banner not closed
  declare sealed: string; // the sealed payload waiting for its password; '' once opened, or with none
  declare locker: Locker | null; // the password's key while this document has one; memory only
  declare signature: Signature; // as last checked against the document
  declare comparing: [Side | null, Side | null] | null; // "#/compare/…": the two sides
  declare embed: boolean; // the pages alone, for another site's frame
  declare other: Kept | null; // another version of this document kept here (the same app and name, another link)
  declare newer: boolean; // the link was made by a newer Tiny Little Office
  private envelope: Head = {}; // the envelope's keys (an empty value: taken out), put into every change
  private sealRun = 0; // the newest seal and check under way: an older one finishing late is dropped
  private checkRun = 0;
  private presentSoon = false; // a deck's show link: presenting starts once the editor is up
  private focusSoon = false; // just opened for editing: once drawn, the focus goes where a person starts
  /** The reader's pages zoomed in place by a pinch: their width over the column's, 1 to 4. */
  private viewZoom = 1;
  private unpinch = () => {};
  private refocus = false; // the address changed under the focus: a page with no editor puts it in its column once drawn
  private displayOwner = false; // a short link's owner arrived with "?d": the short link goes on opening the pages
  private edited: Doc = ''; // what the editor was last given or gave: without the new name the link carries for it
  private offs: (() => void)[] = [];
  private pendingView = ''; // a view asked for in the link ("text.png/…"): done once the editor is up
  private payloadLength = 0;
  private kept = new Keeper(); // this document's entry in the library
  private staged: Doc | null = null; // what the editor last gave, not yet in the link (null: the link is the document)
  private projectTimer = 0;
  private copied = false; // the link copied (Share, or the leaving dialog) since the last change: it lives somewhere else now
  private guarded = false; // the beforeunload warning is registered
  private leaving = ''; // where the person was going when asked: the leaving dialog's

  constructor() {
    super();
    Object.assign(this, {
      app: null,
      doc: '',
      tag: '',
      unreadable: false,
      owned: null,
      changed: false,
      display: false,
      fresh: '',
      expires: 0,
      arrived: false,
      sealed: '',
      locker: null,
      signature: { state: 'none' },
      comparing: null,
      embed: false,
      other: null,
      newer: false,
    });
  }
  createRenderRoot() {
    return this;
  }
  /** Done when the elements it draws are done too: what a test or a caller reads next is in the page. */
  protected async getUpdateComplete(): Promise<boolean> {
    const done = await super.getUpdateComplete();
    await Promise.all(['to-chrome', 'to-share', 'to-privacy[doc]'].map((s) => (this.querySelector(s) as LitElement | null)?.updateComplete));
    return done;
  }
  connectedCallback() {
    super.connectedCallback();
    const on = <K extends string>(target: EventTarget, type: K, fn: EventListener) => {
      target.addEventListener(type, fn);
      this.offs.push(() => target.removeEventListener(type, fn));
    };
    on(window, 'hashchange', this.onHash);
    on(window, 'keydown', this.onKey as EventListener);
    on(window, 'pagehide', this.onLeave);
    on(window, 'blur', this.flushLink);
    on(document, 'visibilitychange', this.onVisibility);
    on(this, 'focusout', this.flushLink);
    on(this, 'to-keys', this.showKeys);
    on(this, 'to-share-open', ((e: CustomEvent<{ short?: boolean } | null>) => void this.openShare(!!e.detail?.short)) as EventListener);
    on(this, 'to-link-copied', () => ((this.copied = true), this.guard()));
    on(this, 'click', this.onFollow as EventListener);
    on(window, 'to-leave', this.onGo);
    onFlush(this.flushLink);
    this.offs.push(
      () => onFlush(() => {}),
      opensDropped(this.flushLink, () => this.app ?? this.pageApp()),
    );
    // The size of everything (kit/zoom.ts), and a pinch on a touch screen sets it outside the spatial canvases (kit/pinch.ts).
    applySize();
    pinchSizes();
    // The reader's pages (the Display Link, the embed) are a picture: two fingers zoom them in place about the fingers, as
    // in a spatial canvas, never the size of everything (Paul, 2026-10-11: "I should be able to pinch zoom where
    // appropriate in view modes too"). The zoom is the pages' width, one to four times the column's, kept in quarters.
    this.unpinch = pinchZoom(this, {
      frame: () => this.querySelector<HTMLElement>('main.to-display[data-spatial]'),
      picture: () => this.querySelector('main.to-display > .to-display-pages'),
      zoom: () => this.viewZoom,
      set: (z) => {
        this.viewZoom = Math.min(4, Math.max(1, z));
        this.querySelector<HTMLElement>('main.to-display > .to-display-pages')?.style.setProperty('--to-view-zoom', String(this.viewZoom));
      },
      end: (z) => {
        this.viewZoom = Math.min(4, Math.max(1, Math.round(z * 4) / 4));
        this.querySelector<HTMLElement>('main.to-display > .to-display-pages')?.style.setProperty('--to-view-zoom', String(this.viewZoom));
      },
    });
    // The rest of Lucide joined (an icon outside the starter set): the editor is drawn again; a key imported or
    // forgotten changes whose signature this is.
    const redraw = () => this.requestUpdate();
    this.offs.push(
      onLanguage(() => (this.setTitle(), redraw())),
      onPictures(redraw),
      onIcons(() => (redraw(), (this.editor as (Editor & { requestUpdate?: () => void }) | null)?.requestUpdate?.())),
      onPrivacy(() => (void this.checkSignature(), this.guard())),
    );
    // Every link that leaves the site asks first; every web picture drawn in a page asks before it is fetched.
    installLinkGuard();
    installPictures();
    installPlainCopy();
    this.onHash();
  }
  disconnectedCallback() {
    super.disconnectedCallback();
    this.unpinch();
    this.onLeave();
    for (const off of this.offs.splice(0)) off();
    if (this.guarded) window.removeEventListener('beforeunload', this.onUnload);
    this.guarded = false;
  }

  get def(): AppDef | undefined {
    return this.app ? appOf(this.app) : undefined;
  }
  get editor(): Editor | null {
    return this.tag ? this.querySelector<Editor>(this.tag) : null;
  }
  private get privacy() {
    return this.querySelector<ToPrivacy>('to-privacy[doc]');
  }

  /* ---------- the link ---------- */

  /** The app whose own page this is ("/text/"), if any. */
  private pageApp = () => location.pathname.split('/').slice(-2)[0];

  private onHash = () => {
    // The address has already moved: what was typed in the last pause went into the link when the focus left the
    // words (a link followed, the menu opened, a key with Alt or Mod), so nothing is left to put in the old one.
    clearTimeout(this.projectTimer);
    this.staged = null;
    this.kept.flush();
    // Something of the page had the focus (the way home, a link, a field): what replaces it is given the focus once drawn.
    this.refocus = !!document.activeElement && document.activeElement !== document.body && this.contains(document.activeElement);
    unplain(this.pageApp());
    this.comparing = parseCompare(location.hash);
    const { app, payload, view: asked, owned, display, arrived, sealed, show, version } = parseHash(location.hash);
    const view = asked === 'embed' ? '' : asked;
    this.querySelector<ToFind>('to-find')?.close();
    const id = app ?? (!location.hash && appOf(this.pageApp()) ? this.pageApp() : null);
    const def = id ? appOf(id) : undefined;
    this.app = def ? id : null;
    this.pendingView = view;
    this.owned = def ? owned : null;
    this.changed = false;
    this.copied = false;
    this.payloadLength = payload.length;
    this.sealed = def && sealed ? payload : '';
    this.locker = null;
    this.unreadable = !!payload && !sealed && !decodeDoc(payload);
    this.doc = def ? (sealed ? '' : payload ? decodeDoc(payload) : def.blank()) : '';
    this.edited = this.doc;
    this.envelope = takeHead(this.doc, ENVELOPE_KEYS)[0];
    this.signature = { state: 'none' };
    // An icon the starter set lacks: the rest of Lucide is fetched, and everything is drawn again when it joins (onIcons).
    void ensureIcons(iconNames(this.doc));
    // Show pictures from the web is remembered for this document, as it arrived, for the visit.
    setPictureDoc(def ? routeHash(def.id, payload) : '');
    this.display = !!def && display && !!payload;
    this.embed = !!def && asked === 'embed' && !!payload;
    this.presentSoon = !!def && !!show && !display && !this.embed;
    this.focusSoon = !!def && !this.display && !this.embed && !this.presentSoon && !this.unreadable && !this.sealed && !view;
    // The owner of a short link that opens the pages arrives with "?d": the short link goes on opening them.
    this.displayOwner = !!owned && display;
    this.expires = def && arrived ? arrived.expires : 0;
    this.arrived = !!def && !!arrived;
    this.fresh = def && !payload ? newName(def) : '';
    const hash = def && payload ? routeHash(def.id, payload) : '';
    this.kept.adopt(hash);
    this.newer = !!def && version > LINK_VERSION;
    // Another version of this document the library holds: the newest of the same app and the same name, at another link.
    const title = def && hash && !this.kept.id && !this.unreadable ? def.title(this.doc) : '';
    this.other = title ? (library().find((k) => k.app === def!.id && k.hash !== hash && k.title === title) ?? null) : null;
    this.setTitle();
    if (def && this.tag !== `to-${def.id}-editor`) {
      this.tag = '';
      // The app's commands with it (kit/commands.ts): the shortcuts dialog, the palette and the drawer read them.
      void Promise.all([def.editor(), def.commands?.()]).then(([{ tag }, cmds]) => {
        if (cmds) register(cmds.default);
        if (this.app === def.id) this.tag = tag;
      });
    }
    if (this.sealed) void this.reopen(this.sealed);
    else {
      void this.checkSignature();
      if (def && view) void this.updateComplete.then(() => this.doView());
    }
  };

  /* ---------- the password and the signature (the work is <to-privacy>'s) ---------- */

  /** A sealed link: opened by a password already given this visit, or the unlock dialog. */
  private async reopen(payload: string) {
    const r = await reopen(payload);
    if (payload !== this.sealed) return;
    if (r) this.opened(r.text, r.locker);
    // Framed on another site (the embed view), the locked card's Unlock asks; nothing opens over the page unasked.
    else if (!this.embed) void this.askPassword();
  }
  askPassword = async () => {
    await this.updateComplete;
    await this.privacy?.askPassword();
  };
  /** The document behind the password, open: shown, checked, and a view asked for in the link done. */
  private opened(text: string, locker: Locker) {
    this.sealed = '';
    this.locker = locker;
    this.doc = text;
    this.edited = text;
    void ensureIcons(iconNames(text));
    this.envelope = takeHead(text, ENVELOPE_KEYS)[0];
    this.setTitle();
    void this.checkSignature();
    this.focusSoon = !this.display && !this.pendingView;
    if (this.pendingView) void this.updateComplete.then(() => this.doView());
  }
  /** The signature checked against the document as it is now. */
  private async checkSignature() {
    const run = ++this.checkRun;
    const sig: Signature = this.app && !this.sealed ? await checkSignature(this.app, this.doc) : { state: 'none' };
    if (run === this.checkRun) this.signature = sig;
  }
  /** A text with the envelope's keys put in its head: the time it was first written, stamped now if it has none. */
  private envelopeOn(doc: Doc): Doc {
    if (!this.envelope.created) this.envelope = { ...this.envelope, created: isoMinute(Date.now()) };
    return withHead(doc, this.envelope);
  }
  /** What <to-privacy> says back: the document opened, a password set or taken off, signed or the signature taken off. */
  private onUnlock = (e: CustomEvent<{ text: string; locker: Locker }>) => this.opened(e.detail.text, e.detail.locker);
  private onLock = (e: CustomEvent<Locker | null>) => (this.flushLink(), (this.locker = e.detail), this.change(this.doc));
  private onSigned = (e: CustomEvent<Head>) => (this.flushLink(), (this.envelope = { ...this.envelope, ...e.detail }), this.change(this.doc));
  private signable = () => (this.flushLink(), this.envelopeOn(this.doc));

  /** A ".<ext>" link: the document shown behind, at its own link, and the file downloaded or printed (exports.ts viewAs). */
  private async doView() {
    const [view, def] = [this.pendingView, this.def];
    this.pendingView = '';
    if (!view || !def) return;
    history.replaceState(this.state(), '', routeHash(def.id, parseHash(location.hash).payload, '', this.owned, false, this.tie));
    await viewAs(view, this.current);
  }

  /** Once the editor is up, the focus goes where a person starts, or a show link starts presenting (an app with nothing to present ignores it). */
  protected updated() {
    this.guard();
    void (this.querySelector('to-chrome') as LitElement | null)?.updateComplete.then(this.drawn);
  }
  /** What <to-chrome> drew this time is in the page. */
  private drawn = () => {
    // The Display Link and the embed show the pages as they move; with reduced motion, each animation rests where it ends (kit/motion.ts).
    const shown = (this.display || this.embed) && reducedMotion() ? this.querySelector('main.to-display') : null;
    if (shown) motion(shown, true);
    const editor = this.editor as (Editor & { present?: (fromLink?: boolean) => void; updateComplete?: Promise<unknown> }) | null;
    const drawn = editor?.updateComplete ?? Promise.resolve();
    // Not when the person has gone elsewhere meanwhile: another document, or a dialog open.
    if (this.focusSoon && editor && !this.sealed) void drawn.then(() => this.editor === editor && !document.activeElement?.closest('dialog[open]') && editor.focusFirst?.());
    if (this.presentSoon && editor) void drawn.then(() => editor.present?.(true));
    if (editor) this.focusSoon = this.presentSoon = false;
    // The home page (or a link that holds no editor) arrived from the keys: the focus goes to its column, not to nothing.
    if (this.refocus && !this.def && (!document.activeElement || document.activeElement === document.body)) this.querySelector<HTMLElement>('main.to-main')?.focus({ preventScroll: true });
    if (!this.def || editor) this.refocus = false;
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
    this.copied = false;
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
    this.setTitle();
  }
  /** The editor's change: the text kept, the link left until typing pauses (one timer a burst); nothing drawn (`edited` is not reactive). */
  private onDocChange = (e: Event) => {
    this.edited = (e as DocChange).detail;
    this.staged = this.edited;
    clearTimeout(this.projectTimer);
    this.projectTimer = window.setTimeout(this.flushLink, PAUSE);
    this.copied = false;
    this.guard();
  };
  /**
   * The document as the editor last gave it, into the link now: when typing pauses, and before anything reads the link
   * (the window's blur, the focus leaving the words, leaving the page, Share and every copy, Display, print, the exports,
   * a short link, the keep, the password, the title). A new document takes its name with the first one (not while blank).
   */
  flushLink = () => {
    clearTimeout(this.projectTimer);
    const doc = this.staged;
    if (doc === null) return;
    this.staged = null;
    const def = this.def;
    this.change(def && this.fresh && doc !== def.blank() && !def.title(doc) ? def.retitle(doc, this.fresh) : doc);
  };
  /** Leaving the page (or the shell): the link, then the library, brought up to date. */
  private onLeave = () => (this.flushLink(), this.kept.flush());
  private onVisibility = () => document.visibilityState === 'hidden' && this.onLeave();

  /* ---------- leaving a document that lives only in its link ---------- */

  /**
   * Private, the document changed (or being typed) and its link not copied since: leaving it loses it. (A sealed link
   * before its password, a Display Link and an embed cannot be changed, so they never get here.)
   */
  private get onlyInLink(): boolean {
    return !!this.def && !keeping() && (this.changed || this.staged !== null) && !this.copied;
  }
  /** The browser's own warning on closing the tab, registered exactly while the document lives only in its link. */
  private guard() {
    const want = this.isConnected && this.onlyInLink;
    if (want === this.guarded) return;
    this.guarded = want;
    if (want) window.addEventListener('beforeunload', this.onUnload);
    else window.removeEventListener('beforeunload', this.onUnload);
  }
  private onUnload = (e: Event) => e.preventDefault();
  /** A link to another place in the site, followed: asked about first while the document lives only in its link. */
  private onFollow = (e: MouseEvent) => {
    const a = (e.target as Element | null)?.closest?.('a[href^="#/"]') as HTMLAnchorElement | null;
    if (!a || e.defaultPrevented || e.button || e.metaKey || e.ctrlKey || e.shiftKey || e.altKey || (a.target && a.target !== '_self') || !this.onlyInLink) return;
    e.preventDefault();
    void this.ask(a.getAttribute('href')!);
  };
  /** The kit's go() (kit/route.ts): asked about the same way. */
  private onGo = (e: Event) => {
    if (!this.onlyInLink) return;
    e.preventDefault();
    void this.ask((e as CustomEvent<string>).detail);
  };
  private get leaveDialog() {
    return this.querySelector<ToDialog>('to-dialog.to-leave-dialog');
  }
  private async ask(hash: string) {
    this.flushLink();
    this.leaving = hash;
    // Asked from the drawer (a template chosen there): the drawer closes first, so one modal is open at a time.
    this.querySelector<ToDrawer>('to-drawer')?.close();
    await this.updateComplete;
    await this.leaveDialog?.show();
  }
  /** The person's answer: the link copied (and only then gone), kept on this device, or neither; then where they were going. */
  private async leave(how: 'copy' | 'keep' | 'go') {
    const to = this.leaving;
    if (how === 'copy' && !(await copyText(this.link))) return;
    if (how === 'keep') {
      await setPrivate(false);
      this.keepNow(t('Saved is on: this device keeps the documents you open. Turn it off in the menu.'));
    }
    this.leaveDialog?.close();
    this.leaving = '';
    location.hash = to;
  }
  private renderLeave() {
    return html`<p>${t('Nothing is saved on this device. Copy the link to keep it, or keep it on this device; Back brings it too.')}</p>
      <div class="to-leave-acts">
        <button type="button" class="to-btn primary to-leave-copy" @click=${() => void this.leave('copy')}>${icon(UI.copy, 16)}<span>${t('Copy the link and go')}</span></button>
        <button type="button" class="to-btn to-leave-keep" @click=${() => void this.leave('keep')}>${icon(UI.device, 16)}<span>${t('Turn on Saved and keep it here')}</span></button>
        <button type="button" class="to-btn to-leave-go" @click=${() => void this.leave('go')}><span>${t('Go without')}</span></button>
      </div>`;
  }

  /* ---------- the library ---------- */

  /** What the tab carries in history.state: the library entry this document is. */
  private state = this.kept.state;
  /** Into the library, 800 ms after the last change, while the device is Saved; a document empty again (or blank) is not kept anew. */
  private keepSoon(payload: string) {
    const def = this.def;
    if (!def || !keeping() || !this.doc.trim() || this.doc === def.blank() || this.edited === def.blank()) return;
    // Under a password the library keeps the ciphertext alone: no name, no first words.
    this.kept.soon({ app: def.id, title: this.locker ? '' : def.title(this.doc) || firstWords(this.doc), hash: routeHash(def.id, payload) });
  }
  /** Mod+S: kept on the device now, under Saved; else said why not. `said`: what the toast says once it is kept. */
  keepNow(said = t('Kept on this device')) {
    const def = this.def;
    if (!def) return;
    this.flushLink();
    if (!keeping()) return void toast(t('Private: this site keeps no documents on this device. Turn on Saved in the menu to keep them here.'));
    if (!this.doc.trim() || this.doc === def.blank()) return void toast(t('Nothing to keep yet'));
    const payload = parseHash(location.hash).payload || encodeDoc(this.doc);
    this.kept.soon({ app: def.id, title: this.locker ? '' : def.title(this.doc) || this.fresh || firstWords(this.doc), hash: routeHash(def.id, payload) });
    this.kept.flush();
    history.replaceState(this.state(), '', location.href);
    this.other = null;
    toast(said);
  }
  /** The shortcuts dialog, open. */
  showKeys = () => void this.querySelector<ToDialog>('to-dialog.to-keys-dialog')?.show();
  /** Find in this document, open (or its words chosen again). */
  showFind() {
    const find = this.querySelector<ToFind>('to-find');
    if (find && this.editor) void ((find.target = this.editor), find.show());
  }

  private setTitle() {
    const def = this.def;
    // A QR code the document holds of itself is drawn from its link as it now is.
    setSelfLink(def ? this.link : '');
    document.title = def ? `${this.outerTitle} · ${t('Tiny Little Office')}` : t('Tiny Little Office');
  }
  /** What the document is called: the name it was given, a new one's name, or "Untitled presentation" (a link that came with none). */
  private get docTitle(): string {
    const def = this.def;
    if (def && this.sealed) return t('Locked document');
    return def ? def.title(this.doc) || this.fresh || t('Untitled {noun}', { noun: def.noun }) : t('Tiny Little Office');
  }
  /** What the world outside the page is told the document is called (the tab, history, the share sheet): nothing of a locked one. */
  private get outerTitle(): string {
    return this.def && (this.locker || this.sealed) ? t('Locked document') : this.docTitle;
  }
  /** The link to share, the editing one: the address without the owner's query (that stays in the address bar alone) or the display flag. */
  get link(): string {
    return this.linkTo(false);
  }
  /** The Display Link: the same document, opened as its pages to read. */
  get displayLink(): string {
    return this.linkTo(true);
  }
  private linkTo = (display: boolean): string => {
    this.flushLink();
    if (!this.app) return location.href;
    const u = new URL(location.href);
    u.hash = routeHash(this.app, parseHash(location.hash).payload, '', null, display);
    return u.href;
  };
  /** The short link this document owns and its expiry, as the address carries them beside the owner's query; null unless both are known. */
  private get tie() {
    return this.owned && this.expires ? { id: this.owned.id, expires: this.expires } : null;
  }
  private current = () => (this.flushLink(), { doc: this.doc, ctx: { def: this.def!, title: this.def!.title(this.doc) || this.fresh, link: this.link } });

  /** What the page's commands act on (kit/keys.ts): print, the shortcuts, find, keep, share, download, the palette, and undo passed to the editor. */
  get page(): Page {
    const shell = this;
    return {
      flush: this.flushLink,
      print: () => void printDoc(this.current()),
      shortcuts: this.showKeys,
      find: () => this.showFind(),
      keep: () => this.keepNow(),
      share: () => void (!this.sealed && this.openShare()),
      download: () => void this.openDownload(),
      palette: () => void this.showPalette(),
      doc: !!this.def,
      editing: !!this.def && !this.display,
      // Asked when needed: the drawer holds this from a draw that came before the editor it acts on was up.
      get editor() {
        return shell.editor;
      },
    };
  }
  /** The page's keys (kit/keys.ts pageKey), answered after the words' and the app's. */
  private onKey = (e: KeyboardEvent) => pageKey(e, this.page);

  /**
   * The commands in force where the person is, for the palette and the drawer: the words' when a <to-text> of the
   * document has the focus (or `text`), the open app's with its editor, the page's.
   */
  offers(text: ToText | null = (document.activeElement?.closest('to-text') as ToText | null) ?? null): Offer[] {
    const page = this.page;
    const editor = this.editor;
    const def = this.def;
    const out: Offer[] = [];
    if (text && editor?.contains(text)) out.push(...TEXT_COMMANDS.filter((c) => live(c, text)).map((cmd) => ({ cmd, c: text })));
    if (editor && def)
      out.push(
        ...inScope(def.id)
          .filter((c) => !c.menu && live(c, editor))
          .map((cmd) => ({ cmd, c: editor as unknown })),
      );
    out.push(...KIT_COMMANDS.filter((c) => c !== PALETTE && live(c, page)).map((cmd) => ({ cmd, c: page as unknown })));
    return out;
  }
  /** The command palette (Mod+K, the button at a bar's end). */
  async showPalette() {
    const pal = this.querySelector<ToPalette>('to-palette');
    if (!pal || pal.isOpen) return;
    this.flushLink();
    await pal.show(this.offers());
  }
  /** The open app's commands that need nothing in hand, for the drawer's This document on a phone (the bar is away while reading). */
  private docCommands = (): Offer[] => {
    const editor = this.editor;
    const def = this.def;
    if (!editor || !def) return [];
    return inScope(def.id)
      .filter((c) => c.document && c.where.includes('bar') && (!c.when || c.when(editor)))
      .map((cmd) => ({ cmd, c: editor as unknown }));
  };

  /* ---------- sharing (the dialog is <to-share>'s) ---------- */

  /** The Share dialog, open; `short` scrolls it to the short link's section (the banner's Extend). */
  async openShare(short = false) {
    this.flushLink();
    // Drawn again first, so the dialog has <to-privacy>'s part as it is now.
    this.requestUpdate();
    await this.updateComplete;
    await this.querySelector<ToShare>('to-share')?.show(short);
  }
  /** Download, by its key: the drawer, its table open (the drawer's This document holds it, the header being the title). */
  private async openDownload() {
    const drawer = this.querySelector<ToDrawer>('to-drawer');
    if (!drawer?.downloads) return;
    await drawer.show();
    drawer.querySelector<ToMenu>('to-menu.to-drawer-download')?.open();
  }
  /** A short link made, updated or forgotten: the address carries the owner's tie to it, or no longer. */
  private onOwned = (e: CustomEvent<{ owned: Owned | null; expires: number }>) => {
    Object.assign(this, { ...e.detail, changed: false, arrived: this.arrived && !!e.detail.owned });
    if (this.app) history.replaceState(this.state(), '', routeHash(this.app, parseHash(location.hash).payload, '', this.owned, false, this.tie));
  };
  /** This document, as a fresh plain link in a new tab (share-dialog.ts openCopy). */
  copyIntoNew = () => void (this.def && !this.sealed && (this.flushLink(), openCopy(this.def, this.doc, this.docTitle, this.locker)));
  /** The title box: the name given, in the head (and to the editor); a new document's own name is spent. */
  private retitle(def: AppDef, title: string) {
    this.flushLink();
    const doc = def.retitle(this.doc, title);
    this.fresh = '';
    this.edited = doc;
    this.change(doc);
  }

  /* ---------- drawing ---------- */

  private trust = () => trustButton(this.signature, !!this.sealed, !!this.locker, () => (this.sealed ? void this.askPassword() : void this.privacy?.show()));

  /** The pages one under another at their paper's width (scaled down only to fit), each with the web's pictures asked for first. */
  private pages = (def: AppDef) =>
    html`<div class="to-display-pages">${def
      .view(this.doc)
      .map((p, i) => html`<div class="to-display-page" style="--page-w:${p.w / 16}rem" aria-label=${t('Page {n}', { n: i + 1 })} role="group">${unsafeSVG(gateSvg(pageSvg(p)))}</div>`)}</div>`;

  /**
   * The Display Link: the pages, to read or print, with Edit. The
   * embed: the pages alone, for another site's frame, with Open in Tiny Little Office; locked, the locked card with Unlock.
   */
  private renderPlain(def: AppDef) {
    const { payload, arrived } = parseHash(location.hash);
    if (this.embed) {
      const u = new URL(location.href);
      u.pathname = siteDir();
      u.hash = routeHash(def.id, payload);
      const main = this.sealed
        ? html`<div class="to-display-page" role="group" aria-label=${t('Locked document')}>${unsafeSVG(pageSvg(lockedCard(def)))}</div><button type="button" class="to-btn primary to-unlock-open" @click=${this.askPassword}>${icon(UI.unlock, 16)}<span>${t('Unlock…')}</span></button>`
        : this.pages(def);
      return html`<to-chrome .plain=${{ kind: 'embed', title: this.docTitle, href: u.href, locked: !!this.sealed }} .main=${main}></to-chrome>`;
    }
    const href = routeHash(def.id, payload, '', this.owned, false, this.arrived && this.expires ? { id: arrived?.id ?? '', expires: this.expires } : null);
    const main = this.pages(def);
    // A deck's reader can present it: the same link with "?show" (kit/route.ts), which opens the editor presenting.
    const present = def.id === 'deck' && !this.sealed ? `${href}${href.includes('?') ? '&' : '?'}show` : undefined;
    return html`<to-chrome in-display .plain=${{ kind: 'display', title: this.docTitle, href, present, trust: this.trust() }} .main=${main} .expires=${this.arrived ? this.expires : 0} @to-copy-new=${this.copyIntoNew} @to-arrival-close=${() => (this.arrived = false)}></to-chrome>`;
  }

  /** The editor in the column, or the home page, the compare view, a locked or unreadable link, or Loading. */
  private renderMain(def: AppDef | undefined) {
    if (this.comparing) return html`<to-compare .a=${this.comparing[0]} .b=${this.comparing[1]}></to-compare>`;
    if (!def) return html`<to-home></to-home>`;
    if (this.sealed)
      return html`<div class="to-empty to-locked">${icon(UI.lock, 32)}<p>${t('This document is locked with a password.')}</p><button type="button" class="to-btn primary to-unlock-open" @click=${this.askPassword}>${icon(UI.unlock, 16)}<span>${t('Unlock…')}</span></button></div>`;
    if (this.unreadable)
      return html`<div class="to-empty"><p>${this.newer ? t('This link was made by a newer Tiny Little Office. Reload the page to get it.') : t('This link holds something that cannot be read. It may have been cut short when it was copied.')}</p><a class="to-btn primary" href=${routeHash(def.id)}>${t('New {noun}', { noun: def.noun })}</a></div>`;
    if (!this.tag) return html`<div class="to-empty to-loading" aria-busy="true">${t('Loading…')}</div>`;
    const tag = unsafeStatic(this.tag);
    return staticHtml`<${tag} class="to-editor" .value=${this.edited} @docchange=${this.onDocChange}></${tag}>`;
  }

  /** Skip to the document: the first place to type or act in it, past the app's bar; else the column. */
  private skip = () => {
    const inDoc = [...(this.editor?.querySelectorAll<HTMLElement>('to-text, [contenteditable=true], input, textarea, [tabindex="0"], svg[tabindex], button') ?? [])].find(
      (el) => !el.closest('to-bar'),
    );
    (inDoc ?? this.querySelector<HTMLElement>('.to-main'))?.focus();
  };

  render() {
    const def = this.def;
    const plain = def && !this.unreadable && (this.embed || (this.display && !this.sealed));
    const downloads = def && !this.sealed && !plain ? exportItems(this.current) : null;
    const editing = !!def && !this.sealed && !this.unreadable && !!this.tag && !this.comparing;
    const page = plain
      ? this.renderPlain(def)
      : html`<button type="button" class="to-btn to-skip" @click=${this.skip}>${def ? t('Skip to the document') : t('Skip to the apps')}</button>
          <to-chrome .doc=${def ? { def, title: this.docTitle, value: def.title(this.doc) || this.fresh, locked: !!this.sealed, trust: this.trust(), used: this.payloadLength } : null} .main=${this.renderMain(def)} .mainClass=${`to-main ${editing ? 'to-wide' : ''}`} .label=${def?.name ?? ''} ?barred=${editing} .fresh=${this.fresh && !def?.title(this.doc) ? this.fresh : ''}
            .expires=${this.arrived ? this.expires : 0} ?extend=${!!this.owned} .other=${this.other} ?newer=${this.newer && !this.unreadable}
            @to-drawer-open=${() => void this.querySelector<ToDrawer>('to-drawer')?.show()} @to-palette-open=${() => void this.showPalette()} @to-retitle=${(e: CustomEvent<string>) => this.retitle(def!, e.detail)} @to-copy-new=${this.copyIntoNew} @to-arrival-close=${() => (this.arrived = false)} @to-other-close=${() => (this.other = null)}></to-chrome>`;
    return html`${page}${plain ? nothing : html`<to-find></to-find><to-drawer .downloads=${this.unreadable ? null : downloads} .page=${this.page} .commands=${this.docCommands} .def=${def ?? null}></to-drawer><to-palette></to-palette>`}<to-toast></to-toast>
      ${
        def
          ? html`<to-share .app=${def.id} .doc=${this.doc} .heading=${this.outerTitle} .locked=${!!this.locker} .owned=${this.owned} .expires=${this.expires} .changed=${this.changed} .payloadLength=${this.payloadLength} .signature=${this.signature} .protect=${this.privacy?.renderProtect() ?? nothing} .displayOwner=${this.displayOwner} .linkTo=${this.linkTo} @to-owned=${this.onOwned}></to-share>
            <to-privacy doc .app=${def.id} .sealed=${this.sealed} .signature=${this.signature} ?protected=${!!this.locker} .by=${this.envelope.by ?? ''} ?signed=${!!this.envelope.sig} .signable=${this.signable} @to-unlock=${this.onUnlock} @to-lock=${this.onLock} @to-signed=${this.onSigned}></to-privacy>`
          : nothing
      }
      <to-dialog class="to-keys-dialog" heading=${t('Keyboard shortcuts')} .body=${renderShortcuts(def)}></to-dialog>
      ${def && !plain ? html`<to-dialog class="to-leave-dialog" heading=${t('This document lives in its link')} .body=${this.renderLeave()}></to-dialog>` : nothing}`;
  }
}
customElements.define('to-shell', ToShell);
