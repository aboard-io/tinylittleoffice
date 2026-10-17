/**
 * <to-shell>: owns the URL. Routes "#/v1/<app>/<payload>" to an app, hands its editor the document's text, and writes
 * every change back into the link with history.replaceState, so the address bar is the document and nothing is ever
 * sent anywhere. A keystroke costs only what it changed: the link is projected when typing stops for fifteen seconds (PAUSE),
 * and flushed at once before anything reads it or the page is hidden or left (flushLink; kit/core/route.ts currentHash
 * outside), so a browser whose history records every address holds a state per pause, not per keystroke. It keeps the route, the document and
 * its projection to the link, the library's keep (kit/share/library.ts Keeper), the title and the editor's mounting, and
 * draws round them elements that take their state as properties and speak back by events: <to-chrome> (kit/ui/chrome.ts:
 * the header, the menu button, the banners, the column that scrolls and the bar's place in it), <to-share>
 * (kit/ui/share-dialog.ts), <to-privacy> (kit/ui/privacy-dialog.ts: unlock, the password), and the editor,
 * <to-drawer>, <to-find>, <to-toast> and the shortcuts dialog. Nothing scrolls the window: kit/ui/chrome.ts says why.
 *
 * A sealed link ("E…", kit/share/crypt.ts) shows nothing of the document, its title included, until the password is given;
 * while a password is set every change is sealed again before it reaches the address bar, so the link, the library
 * and a short link only ever hold ciphertext. The envelope's keys (kit/core/envelope.ts: by, created) are the
 * shell's: `created` is stamped with the first change, and every change keeps them. A new document is named at once
 * (library.ts newName), shown in the title box and written with the first change, so a blank page left alone writes
 * nothing. A Display Link ("?d") shows the pages, to read or print, with Edit, and its text layer before them for a
 * screen reader (kit/text/text-view.ts), which Text shows in their place ("&text"); ".embed" the pages alone, for another
 * site's frame; "…?show" opens a deck presenting; ".<ext>" downloads (exports.ts viewAs); a plain-parameter link
 * (kit/core/plain.ts) becomes the packed link on arrival; "#/compare/…" is the compare view; a file dropped on the page
 * opens (kit/file/open.ts). Mod+F finds, Mod+/ the shortcuts, Mod+S keeps, Mod+K the drawer's search for anything (kit/core/keys.ts, the
 * page's commands; kit/ui/drawer.ts).
 *
 * A document that lives nowhere but its link (Private, changed since it was opened or begun, the link not copied
 * since) is asked about once before the shell leaves it (Paul, 2026-10-10: "if I've entered data it should tell me
 * that I need to copy the link if I don't want to lose data"): a link to another place in the site that a person
 * follows (the header's icon home, a drawer row, a kept document) and the kit's go() (a template, a file opened, a
 * hand-off) open one dialog, Copy the link and go, Turn on Save in browser and keep it here (the toast then says Save in browser is on, and
 * where it is turned off), Go without; Escape stays. The browser's
 * Back is not asked about: it is how the link comes back. Closing the tab in that state gets the browser's own warning
 * (beforeunload), and only then. A link copied through Share lives somewhere now: neither the dialog nor the warning
 * comes again until the document changes. Under Saved the library has it, and an unchanged document is in the link
 * that brought it.
 *
 * A link is a copy, never a shared document (Paul, 2026-10-11: "docs are not collaborative like Google Docs: that's
 * fine. Communicate it in all the languages"). Share says so under the link; and someone who arrives at the Display
 * Link of a document that is not their own (not in the library, not made or changed in this page) is told it once a
 * document, in a quiet line under the header that its × closes (`copies`). Which documents have been told is kept
 * as short digests under `tinyoffice.copiesSaid` (in memory under Private), never the document. A digest names a
 * document by its app and its `created` stamp (and its `by`), so every link of one document is one digest; a document
 * changed here is stamped at its first change and its digest counted as told then, so after a reload (which forgets
 * which links this page wrote) its Display Link stays quiet under Saved. One with no `created` (never changed by
 * anyone) is named by its link, so each of its links is told once.
 */
import { LitElement, html, nothing } from 'lit';
import { html as staticHtml, unsafeStatic } from 'lit/static-html.js';
import { unsafeSVG } from 'lit/directives/unsafe-svg.js';
import { unsafeHTML } from 'lit/directives/unsafe-html.js';
import type { AppDef, Doc, DocChange, Editor } from './app.ts';
import { appOf } from './apps.ts';
import { decodeDoc, encodeDoc, withBreaks } from './codec.ts';
import { withHead, takeHead } from '../../doc/tlo.ts';
import type { Head } from '../../doc/model.ts';
import { isWholeSeal, type Locker, pack } from '../share/crypt.ts';
import { ENVELOPE_KEYS, isoMinute } from './envelope.ts';
import { ensureIcons, icon, iconNames, onIcons, UI } from '../draw/icons.ts';
import { chosenLanguage, languagePending, languages, onLanguage, setLanguage, t } from './i18n.ts';
import { exportItems, formatsReady, printDoc, viewAs } from '../file/exports.ts';
import { LINK_VERSION, onFlush, parseHash, routeHash, siteOf, withLang, withText } from './route.ts';
import { keeping, onPrivacy, reopen, setPrivate } from '../share/privacy.ts';
import { copyText } from '../share/share.ts';
import { trustButton, type ToPrivacy } from '../ui/privacy-dialog.ts';
import { openCopy, siteDir, type ToShare } from '../ui/share-dialog.ts';
import { firstWords, Keeper, library, newName, type Kept } from '../share/library.ts';
import { pageSvg } from '../draw/draw.ts';
import { opensDropped, unplain } from '../file/open.ts';
import { parseCompare, type Side } from '../ui/compare.ts';
import { toast } from './say.ts';
import { installLinkGuard } from '../ui/link-guard.ts';
import { motion, reducedMotion } from '../draw/motion.ts';
import { setSelfLink } from '../draw/qr-picture.ts';
import { lockedCard } from '../share/locked.ts';
import { textLayer } from '../text/text-layer.ts';
import { textHtml } from '../text/text-view.ts';
import type { ToDialog } from '../ui/dialog.ts';
import type { Offer, ToDrawer } from '../ui/drawer.ts';
import { reveal } from '../ui/scroll.ts';
import type { ToMenu } from '../ui/menu.ts';
import type { ToFind } from '../ui/find.ts';
import { KIT_COMMANDS, SEARCH, pageKey, renderShortcuts, type Page } from './keys.ts';
import { inScope, live, register } from './commands.ts';
import { TEXT_COMMANDS } from '../text/text-commands.ts';
import type { ToText } from '../text/text.ts';
import { installPlainCopy } from '../text/clipboard.ts';
import { pinchSizes, pinchZoom } from '../ui/pinch.ts';
import { applySize } from '../ui/zoom.ts';
import { store } from './store.ts';
import '../ui/chrome.ts';
import '../ui/share-dialog.ts';
import '../ui/privacy-dialog.ts';
import '../ui/find.ts';
import '../ui/toast.ts';
import '../ui/dialog.ts';
import '../ui/drawer.ts';
import '../ui/home.ts';
import '../ui/compare.ts';

/**
 * How long typing stops before the document is projected into the link (flushLink): a pause in typing, not a gap
 * between keys. The address is what the browser's history and its sync record (a browser may keep every replaced
 * address as a visit), so it is written when the person stops, and at once whenever anything reads it or the page is
 * hidden or left (the window's blur, the focus leaving the words, visibilitychange, pagehide).
 */
const PAUSE = 15000;

/** The links this page has written (a document made or changed here): its own, so its Display Link is not someone else's copy. */
const madeHere = new Set<string>();
/** The documents told they are copies, as digests, the newest last: a few hundred at most. */
const COPIES_SAID = 'tinyoffice.copiesSaid';
/** A short digest (FNV-1a, 32 bits) of what names a document: its app and when it was first written, else its link. */
function docDigest(app: string, head: Head, hash: string): string {
  const name = head.created ? `${app}\n${head.created}\n${head.by ?? ''}` : hash;
  let h = 0x811c9dc5;
  for (let i = 0; i < name.length; i++) h = Math.imul(h ^ name.charCodeAt(i), 0x01000193);
  return (h >>> 0).toString(36);
}
/** True the first time a document is asked about, and never again (the digest is remembered). */
function firstTold(digest: string): boolean {
  let said: string[] = [];
  try {
    const kept: unknown = JSON.parse(store.get(COPIES_SAID) ?? '[]');
    if (Array.isArray(kept)) said = kept.filter((x): x is string => typeof x === 'string');
  } catch {
    said = [];
  }
  if (said.includes(digest)) return false;
  store.set(COPIES_SAID, JSON.stringify([...said, digest].slice(-300)));
  return true;
}

export class ToShell extends LitElement {
  static properties = {
    app: { state: true },
    doc: { state: true },
    tag: { state: true },
    unreadable: { state: true },
    changed: { state: true },
    display: { state: true },
    reading: { state: true },
    fresh: { state: true },
    expires: { state: true },
    arrived: { state: true },
    sealed: { state: true },
    locker: { state: true },
    comparing: { state: true },
    embed: { state: true },
    other: { state: true },
    newer: { state: true },
    wording: { state: true },
    copies: { state: true },
  };
  declare app: string | null;
  declare doc: Doc;
  declare tag: string; // the editor element's tag, once its module has arrived
  declare unreadable: boolean; // the link holds something that cannot be read (cut short when copied, most often)
  declare display: boolean; // shown as its pages (the Display Link), not in the editor
  declare reading: boolean; // the Display Link shown as its words, reflowed, not its pages ("&text")
  declare fresh: string; // a new document's name, until it is given one: "New Spreadsheet 2026-10-09 #1"
  declare changed: boolean; // edited since it was opened
  declare expires: number; // when the short link this document arrived by expires, ms since the epoch; 0 when it did not
  declare arrived: boolean; // arrived by a short link this visit, its banner not closed
  declare sealed: string; // the sealed payload waiting for its password; '' once opened, or with none
  declare locker: Locker | null; // the password's key while this document has one; memory only
  declare comparing: [Side | null, Side | null] | null; // "#/compare/…": the two sides
  declare embed: boolean; // the pages alone, for another site's frame
  declare other: Kept | null; // another version of this document kept here (the same app and name, another link)
  declare newer: boolean; // the link was made by a newer Tiny Little Office
  declare wording: boolean; // the language the link asks for is on its way: nothing is drawn until it is, so no English flashes first
  declare copies: boolean; // the Display Link of someone else's document, told it is a copy (once a document), its line not closed
  private envelope: Head = {}; // the envelope's keys (an empty value: taken out), put into every change
  private sealRun = 0; // the newest seal and check under way: an older one finishing late is dropped
  private presentSoon = false; // a deck's show link: presenting starts once the editor is up
  private focusSoon = false; // just opened for editing: once drawn, the focus goes where a person starts
  /** The reader's pages zoomed in place by a pinch: their width over the column's, 1 to 4. */
  private viewZoom = 1;
  private unpinch = () => {};
  private refocus = false; // the address changed under the focus: a page with no editor puts it in its column once drawn
  private edited: Doc = ''; // what the editor was last given or gave: without the new name the link carries for it
  private offs: (() => void)[] = [];
  private pendingView = ''; // a view asked for in the link ("text.png/…"): done once the editor is up
  /** The payload as the link carries it, its breaks counted (kit/core/codec.ts withBreaks): what the meter and Share measure against the limit. */
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
      display: false,
      reading: false,
      fresh: '',
      changed: false,
      expires: 0,
      arrived: false,
      sealed: '',
      locker: null,
      comparing: null,
      embed: false,
      other: null,
      newer: false,
      wording: false,
      copies: false,
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
    // The page's first text (index.html, written by scripts/seo.ts): what it says, the shell now draws.
    document.getElementById('to-first')?.remove();
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
    on(this, 'focusin', this.noteText);
    on(this, 'to-share-open', () => void this.openShare());
    on(this, 'to-rooms-open', () => void this.openShare(true));
    on(this, 'to-link-copied', () => ((this.copied = true), this.guard()));
    on(this, 'click', this.onFollow as EventListener);
    on(window, 'to-leave', this.onGo);
    onFlush(this.flushLink);
    this.offs.push(
      () => onFlush(() => {}),
      opensDropped(this.flushLink, () => this.app ?? this.pageApp()),
    );
    // The size of everything (kit/ui/zoom.ts), and a pinch on a touch screen sets it outside the spatial canvases (kit/ui/pinch.ts).
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
    // The rest of Lucide joined (an icon outside the starter set): the editor is drawn again.
    const redraw = () => this.requestUpdate();
    this.offs.push(
      onLanguage(() => (this.relang(this.app), this.rename(), this.setTitle(), redraw())),
      onIcons(() => (redraw(), (this.editor as (Editor & { requestUpdate?: () => void }) | null)?.requestUpdate?.())),
      onPrivacy(() => this.guard()),
    );
    // Every link that leaves the site asks first.
    installLinkGuard();
    installPlainCopy();
    // A link shared with a network carries its preview card's id for the network's fetcher alone: in its path, "/c/<id>"
    // (kit/share/card.ts; the site's Worker serves that page with the card's tags), or, before 2026-10-15, as ?c= on the
    // app's page. The document is the hash's. Gone from the address at once, so a link copied from here carries no
    // stale card: the path becomes the app's own page (the hash names the app), or the site's root.
    const here = new URL(location.href);
    const shared = /^(.*\/)c\/[a-z0-9]{7}$/.exec(here.pathname);
    if (shared) {
      const app = parseHash(here.hash).app;
      here.pathname = `${shared[1]}${app && appOf(app) ? `${app}/` : ''}`;
    }
    here.searchParams.delete('c');
    if (here.href !== location.href) history.replaceState(history.state, '', here.href);
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
    // The language: the link's, when it names one the site has; else the one this visit chose, kept in the address.
    const asks = parseHash(location.hash).lang;
    if (asks && asks !== chosenLanguage() && languages().includes(asks)) void setLanguage(asks);
    const pending = languagePending();
    if (pending && !this.wording) {
      this.wording = true;
      void pending.finally(() => (this.wording = false));
    }
    this.relang(!location.hash && appOf(this.pageApp()) ? this.pageApp() : null);
    this.comparing = parseCompare(location.hash);
    const { app, payload, view: asked, display, arrived, sealed, show, text, version } = parseHash(location.hash);
    // The embed page is the pages alone, for another site's frame, and nothing else is shown there: any other view
    // opens on the site's own page, which no frame may hold (public/_headers; a review, 2026-10-17).
    if (this.pageApp() === 'embed' && !(asked === 'embed' && payload)) return void location.replace(siteOf(location.href, (id) => !!appOf(id)) + (app ? `${app}/` : '') + location.hash);
    const view = asked === 'embed' ? '' : asked;
    this.querySelector<ToFind>('to-find')?.close();
    const id = app ?? (!location.hash && appOf(this.pageApp()) ? this.pageApp() : null);
    const def = id ? appOf(id) : undefined;
    this.app = def ? id : null;
    this.pendingView = view;
    this.changed = false;
    this.copied = false;
    this.payloadLength = withBreaks(payload).length;
    // A sealed payload cut short in a chat is said to be cut, as a plain one is, before any password is asked for.
    this.unreadable = !!payload && (sealed ? !isWholeSeal(payload) : !decodeDoc(payload));
    this.sealed = def && sealed && !this.unreadable ? payload : '';
    this.locker = null;
    this.doc = def ? (sealed ? '' : payload ? decodeDoc(payload) : def.blank()) : '';
    this.edited = this.doc;
    this.envelope = takeHead(this.doc, ENVELOPE_KEYS)[0];
    // An icon the starter set lacks: the rest of Lucide is fetched, and everything is drawn again when it joins (onIcons).
    void ensureIcons(iconNames(this.doc));
    this.display = !!def && display && !!payload;
    this.embed = !!def && asked === 'embed' && !!payload;
    this.reading = this.display && !!text;
    this.presentSoon = !!def && !!show && !display && !this.embed;
    this.focusSoon = !!def && !this.display && !this.embed && !this.presentSoon && !this.unreadable && !this.sealed && !view;
    this.expires = def && arrived ? arrived.expires : 0;
    this.arrived = !!def && !!arrived;
    this.fresh = def && !payload ? newName(def) : '';
    const hash = def && payload ? routeHash(def.id, payload) : '';
    this.kept.adopt(hash);
    this.copies = this.display && !this.kept.id && !madeHere.has(hash) && firstTold(docDigest(def!.id, this.envelope, hash));
    this.newer = !!def && version > LINK_VERSION;
    // Another version of this document the library holds: the newest of the same app and the same name, at another link.
    const title = def && hash && !this.kept.id && !this.unreadable ? def.title(this.doc) : '';
    this.other = title ? (library().find((k) => k.app === def!.id && k.hash !== hash && k.title === title) ?? null) : null;
    this.setTitle();
    if (def && this.tag !== `to-${def.id}-editor`) {
      this.tag = '';
      // The app's commands with it (kit/core/commands.ts): the shortcuts dialog and the drawer read them.
      void Promise.all([def.editor(), def.commands?.()]).then(([{ tag }, cmds]) => {
        if (cmds) register(cmds.default);
        if (this.app === def.id) this.tag = tag;
      });
      // The formats this browser may not make (a WebM wants its encoder): asked once, the Download table drawn again.
      void formatsReady(def).then(() => this.requestUpdate());
    }
    if (this.sealed) void this.reopen(this.sealed);
    else if (def && view) void this.updateComplete.then(() => this.doView());
  };

  /**
   * The address carries the language chosen (kit/core/route.ts withLang), or none when the page follows the browser's: a
   * link opened from here, the library or a template keeps the page's language. `app` is the page's own app when its
   * address is empty ("/sheet/"), so the language joins a link to it and not to the home page.
   */
  /** A new document's name was made before the language loaded; while the page is still blank it is made again in the language. */
  private rename() {
    if (this.def && this.fresh && this.doc === this.def.blank()) this.fresh = newName(this.def);
  }
  private relang(app: string | null) {
    const lang = chosenLanguage();
    const next = withLang(location.hash || (lang && app ? routeHash(app) : ''), lang);
    if (next !== location.hash) history.replaceState(history.state, '', next || location.pathname + location.search);
  }

  /* ---------- the password (the work is <to-privacy>'s) ---------- */

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
  /** The document behind the password, open: shown, and a view asked for in the link done. */
  private opened(text: string, locker: Locker) {
    this.sealed = '';
    this.locker = locker;
    this.doc = text;
    this.edited = text;
    void ensureIcons(iconNames(text));
    this.envelope = takeHead(text, ENVELOPE_KEYS)[0];
    this.setTitle();
    this.focusSoon = !this.display && !this.pendingView;
    if (this.pendingView) void this.updateComplete.then(() => this.doView());
  }
  /** A text with the envelope's keys put in its head: the time it was first written, stamped now if it has none. */
  private envelopeOn(doc: Doc): Doc {
    if (!this.envelope.created) this.envelope = { ...this.envelope, created: isoMinute(Date.now()) };
    return withHead(doc, this.envelope);
  }
  /** What <to-privacy> says back: the document opened, a password set or taken off. */
  private onUnlock = (e: CustomEvent<{ text: string; locker: Locker }>) => this.opened(e.detail.text, e.detail.locker);
  private onLock = (e: CustomEvent<Locker | null>) => (this.flushLink(), (this.locker = e.detail), this.change(this.doc));

  /** A ".<ext>" link: the document shown behind, at its own link, and the file downloaded or printed (exports.ts viewAs). */
  private async doView() {
    const [view, def] = [this.pendingView, this.def];
    this.pendingView = '';
    if (!view || !def) return;
    history.replaceState(this.state(), '', routeHash(def.id, parseHash(location.hash).payload, '', false, null, chosenLanguage()));
    await viewAs(view, this.current);
  }

  /** Once the editor is up, the focus goes where a person starts, or a show link starts presenting (an app with nothing to present ignores it). */
  protected updated() {
    this.guard();
    void (this.querySelector('to-chrome') as LitElement | null)?.updateComplete.then(this.drawn);
  }
  /** What <to-chrome> drew this time is in the page. */
  private drawn = () => {
    // The Display Link and the embed show the pages as they move; with reduced motion, each animation rests where it ends (kit/draw/motion.ts).
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
   * the link with it, sealed first while it has a password.
   */
  private change(doc: Doc) {
    const app = this.app;
    if (!app || this.sealed) return;
    const blank = doc === this.def!.blank();
    this.doc = blank ? doc : this.envelopeOn(doc);
    this.changed = true;
    this.copied = false;
    this.setTitle();
    const run = ++this.sealRun;
    if (!this.locker) return this.writeLink(app, encodeDoc(this.doc));
    void pack(this.doc, this.locker).then((payload) => run === this.sealRun && app === this.app && this.writeLink(app, payload));
  }
  private writeLink(app: string, payload: string) {
    madeHere.add(routeHash(app, payload));
    // Told already, by its name rather than its link: a reload forgets madeHere, but this digest is kept under Saved.
    // Not under a password: nothing of the document, its author and its day included, is kept but the ciphertext.
    if (!this.locker) firstTold(docDigest(app, this.envelope, routeHash(app, payload)));
    this.payloadLength = withBreaks(payload).length;
    this.keepSoon(payload);
    history.replaceState(this.state(), '', routeHash(app, payload, '', false, null, chosenLanguage()));
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
  /** The kit's go() (kit/core/route.ts): asked about the same way. */
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
      this.keepNow(t('shell-save-in-browser-is-on'));
    }
    this.leaveDialog?.close();
    this.leaving = '';
    location.hash = to;
  }
  private renderLeave() {
    return html`<p>${t('shell-nothing-is-saved-on-this')}</p>
      <div class="to-leave-acts">
        <button type="button" class="to-btn primary to-leave-copy" @click=${() => void this.leave('copy')}>${icon(UI.copy, 16)}<span>${t('shell-copy-link-and-go')}</span></button>
        <button type="button" class="to-btn to-leave-keep" @click=${() => void this.leave('keep')}>${icon(UI.device, 16)}<span>${t('shell-turn-on-save-in-browser')}</span></button>
        <button type="button" class="to-btn to-leave-go" @click=${() => void this.leave('go')}><span>${t('shell-go-without')}</span></button>
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
  keepNow(said = t('shell-kept-on-this-device')) {
    const def = this.def;
    if (!def) return;
    this.flushLink();
    if (!keeping()) return void toast(t('shell-save-in-browser-is-off'));
    if (!this.doc.trim() || this.doc === def.blank()) return void toast(t('shell-nothing-to-keep-yet'));
    const inLink = parseHash(location.hash).payload;
    // Under a password the link holds the sealed document once the seal is done: until it is, nothing is kept, never the text.
    if (!inLink && this.locker) return;
    const payload = inLink || encodeDoc(this.doc);
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
    document.title = def ? `${this.outerTitle} · ${t('common-tiny-little-office')}` : t('common-tiny-little-office');
  }
  /** What the document is called: the name it was given, a new one's name, or "Untitled presentation" (a link that came with none). */
  private get docTitle(): string {
    const def = this.def;
    if (def && this.sealed) return t('common-locked-document');
    return def ? def.title(this.doc) || this.fresh || t('common-untitled-noun', { noun: def.noun }) : t('common-tiny-little-office');
  }
  /** What the world outside the page is told the document is called (the tab, history, the share sheet): nothing of a locked one. */
  private get outerTitle(): string {
    return this.def && (this.locker || this.sealed) ? t('common-locked-document') : this.docTitle;
  }
  /** The link to share, the editing one: the address without the short link's query or the display flag; with the language chosen. */
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
    u.hash = routeHash(this.app, parseHash(location.hash).payload, '', display, null, chosenLanguage());
    return u.href;
  };
  private current = () => (this.flushLink(), { doc: this.doc, ctx: { def: this.def!, title: this.def!.title(this.doc) || this.fresh, link: this.link } });

  /** What the page's commands act on (kit/core/keys.ts): print, the shortcuts, find, keep, share, download, the search for anything, and undo passed to the editor. */
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
      search: () => void this.findAnything(),
      doc: !!this.def,
      editing: !!this.def && !this.display,
      // Asked when needed: the drawer holds this from a draw that came before the editor it acts on was up.
      get editor() {
        return shell.editor;
      },
    };
  }
  /** The page's keys (kit/core/keys.ts pageKey), answered after the words' and the app's. */
  private onKey = (e: KeyboardEvent) => pageKey(e, this.page);

  /**
   * The commands in force where the person is, for the drawer's search: the words' when a <to-text> of the
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
    out.push(...KIT_COMMANDS.filter((c) => c !== SEARCH && live(c, page)).map((cmd) => ({ cmd, c: page as unknown })));
    return out;
  }
  /** The drawer's search for anything, focused (Mod+K): its commands those in force where the person was. */
  async findAnything() {
    this.flushLink();
    await this.querySelector<ToDrawer>('to-drawer')?.show(true);
  }
  /**
   * The offers as the drawer opens (before it takes the focus): the words' while words have it, or had it until the
   * menu button was pressed (the button takes the focus from them; the bar's palette button used to keep it).
   */
  private offersNow = () => {
    const at = document.activeElement;
    const text = (at?.closest('to-text') as ToText | null) ?? (at?.closest('.to-burger') && this.lastText?.isConnected ? this.lastText : null);
    return this.offers(text);
  };
  /** The document's words that last had the focus, while nothing but the menu button has had it since. */
  private lastText: ToText | null = null;
  private noteText = (e: Event) => {
    const at = e.target as Element;
    if (at.closest?.('.to-burger')) return;
    const text = at.closest?.('to-text') as ToText | null;
    this.lastText = text && this.editor?.contains(text) ? text : null;
  };
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

  /** The Share dialog, open. */
  /** Share; or, with `rooms`, Max Link Sizes alone (the header's meter). */
  async openShare(rooms = false) {
    this.flushLink();
    // Drawn again first, so the dialog has <to-privacy>'s part as it is now.
    this.requestUpdate();
    await this.updateComplete;
    const share = this.querySelector<ToShare>('to-share');
    await (rooms ? share?.showRooms() : share?.show());
  }
  /** Download, by its key: the drawer, its table open (the drawer's This document holds it, the header being the title). */
  private async openDownload() {
    const drawer = this.querySelector<ToDrawer>('to-drawer');
    if (!drawer?.downloads) return;
    await drawer.show();
    const row = drawer.querySelector<ToMenu>('to-menu.to-drawer-download');
    // This document is below the search and the apps: its Download row is brought to the drawer's top, so the table opens under it.
    reveal(row, { block: 'start' });
    row?.open();
  }
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

  private trust = () => trustButton(!!this.sealed, !!this.locker, () => (this.sealed ? void this.askPassword() : void this.privacy?.show()));

  /**
   * The pages one under another at their paper's width (scaled down only to fit). Behind the text layer (the Display
   * Link), hidden from a screen reader, which reads the words instead; and hidden from everyone while the words are shown.
   */
  private pages = (def: AppDef, behind = false) =>
    html`<div class="to-display-pages" aria-hidden=${behind ? 'true' : nothing} ?hidden=${behind && this.reading}>${def
      .view(this.doc)
      .map((p, i) => html`<div class="to-display-page" style="--page-w:${p.w / 16}rem" aria-label=${t('common-page-n', { n: i + 1 })} role="group">${unsafeSVG(pageSvg(p))}</div>`)}</div>`;

  /**
   * The Display Link: the pages, to read or print, with Edit. The
   * embed: the pages alone, for another site's frame, with Open in Tiny Little Office; locked, the locked card with Unlock.
   */
  private renderPlain(def: AppDef) {
    const { payload, arrived } = parseHash(location.hash);
    if (this.embed) {
      const u = new URL(location.href);
      u.pathname = siteDir();
      u.hash = routeHash(def.id, payload, '', false, null, chosenLanguage());
      const main = this.sealed
        ? html`<div class="to-display-page" role="group" aria-label=${t('common-locked-document')}>${unsafeSVG(pageSvg(lockedCard(def)))}</div><button type="button" class="to-btn primary to-unlock-open" @click=${this.askPassword}>${icon(UI.unlock, 16)}<span>${t('common-unlock-ellipsis')}</span></button>`
        : this.pages(def);
      return html`<to-chrome .plain=${{ kind: 'embed', title: this.docTitle, href: u.href, locked: !!this.sealed }} .main=${main}></to-chrome>`;
    }
    const href = routeHash(def.id, payload, '', false, this.arrived && arrived ? arrived : null, chosenLanguage());
    // The text layer first (kit/text/text-view.ts): what a screen reader reads, and what Text shows, reflowed, in the pages' place.
    const root = document.documentElement;
    const words = html`<div class="to-display-text ${this.reading ? '' : 'sr-only'}" lang=${root.lang || nothing} dir=${root.dir || nothing}>${unsafeHTML(textHtml(textLayer(def, this.doc)))}</div>`;
    const main = html`${words}${this.pages(def, true)}`;
    // A deck's reader can present it: the same link with "?show" (kit/core/route.ts), which opens the editor presenting.
    const present = def.id === 'deck' && !this.sealed ? `${href}${href.includes('?') ? '&' : '?'}show` : undefined;
    return html`<to-chrome in-display .plain=${{ kind: 'display', title: this.docTitle, href, present, trust: this.trust(), copies: this.copies, reading: this.reading }} .main=${main} @to-display-text=${this.toggleReading} .expires=${this.arrived ? this.expires : 0} @to-copy-new=${this.copyIntoNew} @to-arrival-close=${() => (this.arrived = false)} @to-copies-close=${() => (this.copies = false)}></to-chrome>`;
  }

  /** Text, or Pages: the words shown in the pages' place or the pages again, and the address saying which ("&text"). */
  private toggleReading = () => {
    this.reading = !this.reading;
    history.replaceState(this.state(), '', withText(location.hash, this.reading));
  };

  /** The editor in the column, or the home page, the compare view, a locked or unreadable link, or Loading. */
  private renderMain(def: AppDef | undefined) {
    if (this.comparing) return html`<to-compare .a=${this.comparing[0]} .b=${this.comparing[1]}></to-compare>`;
    if (!def) return html`<to-home></to-home>`;
    if (this.sealed)
      return html`<div class="to-empty to-locked">${icon(UI.lock, 32)}<p>${t('privacy-this-document-is-locked-with')}</p><button type="button" class="to-btn primary to-unlock-open" @click=${this.askPassword}>${icon(UI.unlock, 16)}<span>${t('common-unlock-ellipsis')}</span></button></div>`;
    if (this.unreadable)
      return html`<div class="to-empty"><p>${this.newer ? t('shell-this-link-was-made-by') : t('shell-this-link-holds-something-that')}</p><a class="to-btn primary" href=${routeHash(def.id)}>${t('common-new-noun', { noun: def.noun })}</a></div>`;
    if (!this.tag) return html`<div class="to-empty to-loading" aria-busy="true">${t('shell-loading')}</div>`;
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
    if (this.wording) return nothing;
    const def = this.def;
    const plain = def && !this.unreadable && (this.embed || (this.display && !this.sealed));
    const downloads = def && !this.sealed && !plain ? exportItems(def, this.current) : null;
    const editing = !!def && !this.sealed && !this.unreadable && !!this.tag && !this.comparing;
    const page = plain
      ? this.renderPlain(def)
      : html`<button type="button" class="to-btn to-skip" @click=${this.skip}>${def ? t('shell-skip-to-document') : t('shell-skip-to-apps')}</button>
          <to-chrome .doc=${def ? { def, title: this.docTitle, value: def.title(this.doc) || this.fresh, locked: !!this.sealed, trust: this.trust(), used: this.payloadLength } : null} .main=${this.renderMain(def)} .mainClass=${`to-main ${editing ? 'to-wide' : ''}`} .label=${def?.name ?? ''} ?barred=${editing} .fresh=${this.fresh && !def?.title(this.doc) ? this.fresh : ''}
            .expires=${this.arrived ? this.expires : 0} .other=${this.other} ?newer=${this.newer && !this.unreadable}
            @to-drawer-open=${() => void this.querySelector<ToDrawer>('to-drawer')?.show()} @to-retitle=${(e: CustomEvent<string>) => this.retitle(def!, e.detail)} @to-copy-new=${this.copyIntoNew} @to-arrival-close=${() => (this.arrived = false)} @to-other-close=${() => (this.other = null)}></to-chrome>`;
    return html`${page}${plain ? nothing : html`<to-find></to-find><to-drawer .downloads=${this.unreadable ? null : downloads} .page=${this.page} .commands=${this.docCommands} .offers=${this.offersNow} .def=${def ?? null}></to-drawer>`}<to-toast></to-toast>
      ${
        def
          ? html`<to-share .app=${def.id} .doc=${this.doc} .heading=${this.outerTitle} .locked=${!!this.locker} .payloadLength=${this.payloadLength} .protect=${this.privacy?.renderProtect(!!this.locker) ?? nothing} .linkTo=${this.linkTo}></to-share>
            <to-privacy doc .sealed=${this.sealed} ?protected=${!!this.locker} @to-unlock=${this.onUnlock} @to-lock=${this.onLock}></to-privacy>`
          : nothing
      }
      <to-dialog class="to-keys-dialog" heading=${t('shell-keyboard-shortcuts')} .body=${renderShortcuts(def)}></to-dialog>
      ${def && !plain ? html`<to-dialog class="to-leave-dialog" heading=${t('shell-this-document-lives-in-its')} .body=${this.renderLeave()}></to-dialog>` : nothing}`;
  }
}
customElements.define('to-shell', ToShell);
