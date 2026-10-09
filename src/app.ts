/**
 * <to-app>: the shell. Owns the URL. Routes "#/v0/<app>/<payload>" to a mini
 * app, hands it the decoded document body, and writes every change back into
 * the URL via history.replaceState. Also owns the envelope around the body
 * (creation time, optional signature) and optional password encryption.
 *
 * "#/v0/<app>.<ext>/<payload>" is a download view: arriving at it saves the
 * document as that kind of file (see lib/exports.ts).
 */
import { keep, library, saving } from './lib/library.ts';
import { LitElement, nothing } from 'lit';
import { html, unsafeStatic } from 'lit/static-html.js';
import { customElement, state } from 'lit/decorators.js';
import { budgetFor, decodeDoc } from './lib/codec.ts';
import { DOC_KEYS, encodeEnvelope, decodeEnvelope, quantizeCreated, type Envelope } from './lib/envelope.ts';
import { privacy, isSealed } from './lib/privacy.ts';
import { store, keeping, setKeeping } from './lib/store.ts';
import { fromMarkdown, readPlainLink } from './lib/markdown.ts';
import { takeHead } from './lib/tlo.ts';
import { compareHash, parseCompare, sideOf, type Side } from './widgets/compare.ts';
import { convert, hashOf, setSelfLink } from './kit/embed.ts';
import { EXPIRIES, shorten } from './lib/short.ts';
import './widgets/drive.ts';
import './widgets/privacy.ts';
import { installLinkGuard } from './widgets/link-guard.ts';
import { icon, UI } from './lib/icons.ts';
import './apps/index.ts';
import './apps/editors.ts';
import { History, LINK, LINK_VERSION, apps, appOf, byGroup, clamp, docHtml, extOf, fmtDate, fmtUtc, pageSvg, xml, type AppDef, type Shortcut } from './kit/core.ts';
import { unsafeHTML } from 'lit/directives/unsafe-html.js';
import { REFRESH, download, formatsOf, picture, printDoc, saveFile, withFonts } from './kit/browser.ts';
import { zip } from './kit/zip.ts';
import { roomFor } from './lib/limits.ts';
import { roomsTable } from './widgets/meter.ts';
import { ToQrDialog } from './widgets/qr-dialog.ts';
import type { SlDialog, SlDrawer, SlInput } from './lib/shoelace.ts';
import { btn, errorText, keyLabel, stepper, tool } from './kit.ts';

/** An app's icon, or a kept document's (by its app's id). */
const iconOf = (d: AppDef | undefined) => UI[(d?.icon ?? 'write') as keyof typeof UI];

/**
 * The apps as the menu shows them (src/apps/index.ts has their order):
 * under their group's heading, each app followed by the apps that are
 * kinds of it, the apps with no group first, on their own.
 */
function grouped(): { group: string; apps: AppDef[] }[] {
  const out: { group: string; apps: AppDef[] }[] = [];
  for (const d of apps()) {
    if (d.under || d.hidden) continue;
    const group = d.group ?? 'More';
    let at = out.find((g) => g.group === group);
    if (!at) out.push((at = { group, apps: [] }));
    at.apps.push(...apps().filter((a) => !a.hidden && (a.id === d.id || a.under === d.id)));
  }
  return out.sort((a, b) => byGroup(a.group, b.group));
}

/** Shortcuts that work in every app. "Mod" is Ctrl, or Command on a Mac. */
const GLOBAL_KEYS: Shortcut[] = [
  { keys: 'Mod+Z', does: 'Undo' },
  { keys: 'Mod+Shift+Z / Mod+Y', does: 'Redo' },
  { keys: 'Mod+/', does: 'Show these shortcuts' },
  { keys: 'Mod+K', does: 'Open the menu of apps (in text: link the selected words)' },
  { keys: 'Mod+S', does: 'Download (the first format in the Download menu)' },
  { keys: 'Mod+P', does: 'Print, or save as a PDF' },
  { keys: 'Mod+Shift+C', does: 'Copy the link' },
  { keys: 'Mod+Shift+L', does: 'Light, dark, or match the device' },
];

const q = encodeURIComponent;
/** The places Share opens a compose box in, with the document's title and link already written. */
const SERVICES: { id: string; name: string; compose(title: string, url: string): string }[] = [
  { id: 'bluesky', name: 'Bluesky', compose: (title, url) => `https://bsky.app/intent/compose?text=${q(`${title} ${url}`)}` },
  { id: 'mastodon', name: 'Mastodon', compose: (title, url) => `https://mastodonshare.com/?text=${q(title)}&url=${q(url)}` },
  { id: 'x', name: 'X', compose: (title, url) => `https://twitter.com/intent/tweet?text=${q(title)}&url=${q(url)}` },
  { id: 'linkedin', name: 'LinkedIn', compose: (_, url) => `https://www.linkedin.com/sharing/share-offsite/?url=${q(url)}` },
  { id: 'email', name: 'Email', compose: (title, url) => `mailto:?subject=${q(title)}&body=${q(url)}` },
];

type Theme = 'auto' | 'light' | 'dark';
const THEMES: Theme[] = ['auto', 'light', 'dark'];
const THEME_NAMES: Record<Theme, string> = { auto: 'Match the device', light: 'Light', dark: 'Dark' };

function storedTheme(): Theme {
  const t = store.get('to-theme');
  return t === 'light' || t === 'dark' ? t : 'auto';
}

/** Light or dark, as chosen; "auto" follows the device (index.html keeps watching it). */
function applyTheme(theme: Theme) {
  if (theme === 'auto') store.remove('to-theme');
  else store.set('to-theme', theme);
  const dark = theme === 'dark' || (theme === 'auto' && matchMedia('(prefers-color-scheme: dark)').matches);
  document.documentElement.classList.toggle('sl-theme-dark', dark);
}

/** The app whose own page this is ("/deck/"), if any. */
/** The rows that scroll sideways: the header's, and the bar of every app. */
const BARS = '.to-header-inner, .to-toolbar';
const pageApp = () => location.pathname.split('/').slice(-2)[0];

export interface Route {
  app: string | null;
  payload: string;
  version: number;
  /** Extension of a download view, '' for the editor. */
  ext: string;
}

// (An extension may have a dot in it: "seating.cards.pdf" is the chart's place cards.)
const ROUTE = new RegExp(`^#/v(\\d+)/(${apps().map((a) => a.id).join('|')})(?:\\.([A-Za-z0-9.]+))?(?:/(.*))?$`);

export function parseHash(hash: string): Route {
  const m = ROUTE.exec(hash);
  if (!m) return { app: null, payload: '', version: LINK_VERSION, ext: '' };
  return { app: m[2], payload: m[4] ?? '', version: parseInt(m[1], 10), ext: m[3] ?? '' };
}

/** The fragment for a document, optionally as a download view. */
export function routeHash(app: string, payload = '', ext = ''): string {
  return `${LINK}${app}${ext ? '.' + ext : ''}${payload ? '/' + payload : ''}`;
}

@customElement('to-app')
export class ToApp extends LitElement {
  @state() private app: string | null = null;
  @state() private env: Envelope = { created: null, body: '' };
  @state() private payloadLength = 0;
  @state() private toast = '';
  /** Everything that protects a document or touches what the device keeps: one object, one widget. */
  private privacy = privacy;
  private offPrivacy = () => {};
  /** A payload waiting for its password; '' when the document is open. */
  @state() private sealed = '';
  @state() private version = LINK_VERSION;
  @state() private theme: Theme = storedTheme();
  private history = new History();
  /** Opened from a "show" link: the editor is presenting, until the viewer asks to edit. */
  @state() private presenting = false;
  /** What is typed into the menu's search box: only apps whose names match are listed. */
  @state() private find = '';
  /** How big everything is drawn, as a factor; remembered. Browser zoom works too; this is for a tap. */
  @state() private size = clamp(parseFloat(store.get('tinyoffice.size') ?? '1') || 1, 0.8, 2);
  private resize(by: number) {
    this.size = Math.round(clamp(this.size + by, 0.8, 2) * 20) / 20;
    if (this.size === 1) store.remove('tinyoffice.size');
    else store.set('tinyoffice.size', String(this.size));
    this.applySize();
  }
  private applySize() {
    document.documentElement.style.setProperty('zoom', this.size === 1 ? '' : String(this.size));
  }
  /** The menu's clusters that are folded shut. Remembered. */
  @state() private shut: string[] = (() => {
    try {
      return JSON.parse(store.get('tinyoffice.nav') ?? 'null') ?? [];
    } catch {
      return [];
    }
  })();
  private fold(group: string, open: boolean) {
    this.shut = open ? this.shut.filter((g) => g !== group) : [...new Set([...this.shut, group])];
    store.set('tinyoffice.nav', JSON.stringify(this.shut));
  }
  /** Opened from an "embed" link: just the document, for showing inside another page. */
  @state() private embedded = false;
  @state() private embedPage = 0;
  /** A download view waiting for its document (it may need a password first). */
  private pendingExt = '';
  private toastTimer = 0;
  private writeRun = 0;

  createRenderRoot() {
    return this;
  }

  /**
   * Scrolled past the header: it has gone up with the page, and the app's
   * own bar has stuck to the top, making room for the menu button, which
   * stays at the top left. Said as an attribute, so styles alone move
   * things; nothing is drawn again.
   *
   * "The top" is the top of what can be seen. When a phone's keyboard comes
   * up, iOS slides the page up under the screen rather than making it
   * shorter, and what is fixed to the page's top goes with it; so the top
   * of the visible part is followed (--to-vv-top), and the header is gone
   * when it is above that.
   */
  private viewportFrame = 0;
  private onViewport = () => {
    if (this.viewportFrame) return;
    this.viewportFrame = requestAnimationFrame(() => {
      this.viewportFrame = 0;
      const top = Math.max(0, window.visualViewport?.offsetTop ?? 0);
      this.style.setProperty('--to-vv-top', `${top}px`);
      const header = this.querySelector('.to-header')?.getBoundingClientRect();
      if (header?.height) this.toggleAttribute('scrolled', header.bottom <= top);
    });
  };
  /** The app's bar, measured: an opaque strip as tall as it fills the screen's width behind it once it is stuck (--to-stuck-h). */
  private barWatch: ResizeObserver | null = null;
  private bar: Element | null = null;
  private watchBar() {
    const bar = this.querySelector('.to-panel > div > * > .to-toolbar:first-child');
    if (bar !== this.bar && typeof ResizeObserver !== 'undefined') {
      this.barWatch ??= new ResizeObserver(([e]) => {
        this.style.setProperty('--to-stuck-h', `${(e.target as HTMLElement).offsetHeight}px`);
        this.fadeEdges();
      });
      if (this.bar) this.barWatch.unobserve(this.bar);
      if (bar) this.barWatch.observe(bar);
      this.bar = bar;
    }
  }

  connectedCallback() {
    super.connectedCallback();
    // No link in a document opens without showing where it goes and asking.
    installLinkGuard();
    this.applySize();
    window.addEventListener('resize', this.fadeEdges);
    this.addEventListener('scroll', this.fadeEdges, { capture: true, passive: true });
    this.barsChanged.observe(this, { subtree: true, childList: true, attributes: true, attributeFilter: ['disabled', 'hidden', 'class', 'style'] });
    window.addEventListener('scroll', this.onViewport, { passive: true });
    window.visualViewport?.addEventListener('scroll', this.onViewport);
    window.visualViewport?.addEventListener('resize', this.onViewport);
    window.addEventListener('hashchange', this.onHash);
    window.addEventListener('keydown', this.onGlobalKey);
    window.addEventListener(REFRESH, this.onRefresh);
    window.addEventListener('to-toast', this.onToast);
    this.offPrivacy = this.privacy.on(() => this.requestUpdate());
    this.onHash();
  }
  disconnectedCallback() {
    super.disconnectedCallback();
    window.removeEventListener('scroll', this.onViewport);
    window.visualViewport?.removeEventListener('scroll', this.onViewport);
    window.visualViewport?.removeEventListener('resize', this.onViewport);
    cancelAnimationFrame(this.viewportFrame);
    this.viewportFrame = 0;
    this.barWatch?.disconnect();
    this.barWatch = null;
    this.bar = null;
    window.removeEventListener('resize', this.fadeEdges);
    this.removeEventListener('scroll', this.fadeEdges, { capture: true });
    this.barsChanged.disconnect();
    window.removeEventListener('hashchange', this.onHash);
    window.removeEventListener('keydown', this.onGlobalKey);
    window.removeEventListener(REFRESH, this.onRefresh);
    window.removeEventListener('to-toast', this.onToast);
    this.offPrivacy();
  }

  /** The fonts or the full icon set have arrived: draw again with them. */
  private onRefresh = () => {
    this.requestUpdate();
    (this.querySelector(`to-${this.app}`) as (HTMLElement & { requestUpdate?: () => void }) | null)?.requestUpdate?.();
  };

  /** Shortcuts that work in every app. Listed in GLOBAL_KEYS; shown by Mod+/. */
  private onGlobalKey = (e: KeyboardEvent) => {
    // A key a text box has used (Mod+K there makes a link) is not the page's as well.
    if (!(e.ctrlKey || e.metaKey) || e.altKey || e.defaultPrevented) return;
    const k = e.key.toLowerCase();
    // A document being edited inside another has its own undo (see editRef).
    if ((k === 'z' || k === 'y') && this.def && !this.sealed && !document.querySelector('sl-dialog.to-sub[open]')) {
      e.preventDefault();
      this.step(k === 'z' && !e.shiftKey);
      return;
    }
    const act: (() => void) | undefined =
      k === '/' || k === '?'
        ? () => this.dialog('keys-dialog')?.show()
        : k === 'k' && !e.shiftKey
          ? () => this.drawer()?.show()
          : k === 's' && !e.shiftKey && this.def
            ? () => this.download(formatsOf(this.def!)[0].ext)
            : k === 'p' && !e.shiftKey && this.def
              ? () => this.download('print')
              : k === 'c' && e.shiftKey && this.def
                ? () => this.share('copy')
                : k === 'l' && e.shiftKey
                  ? () => this.cycleTheme()
                  : undefined;
    if (!act) return;
    e.preventDefault();
    act();
  };

  /**
   * A link written with ordinary parameters instead of a packed document
   * (/deck/#title=Plan&doc=%23+Launch%0A-+Build+it, read by lib/markdown.ts)
   * is turned into the usual link on arrival, so what is shared afterwards
   * is compact.
   *
   * Only after "#": that part of an address stays in the browser. The same
   * parameters after "?" would be sent to the server (and into its logs), so
   * they are deliberately not understood.
   */
  private readPlainLink() {
    if (location.hash.length < 2 || location.hash.startsWith('#/')) return;
    const q = new URLSearchParams(location.hash.slice(1));
    if (!q.has('doc') && !q.has('md') && !q.has('title') && !q.has('app')) return;
    const plain = readPlainLink(q, pageApp());
    if (!plain) return;
    const { def, body, title, by, view } = plain;
    const payload = encodeEnvelope({ created: body || title ? quantizeCreated(Date.now()) : null, title, by, body });
    history.replaceState(null, '', `${this.root}${location.protocol === 'file:' ? '' : def.id + '/'}${routeHash(def.id, payload, view)}`);
  }

  /** Two documents side by side, at #/compare: not an app, a page of the shell. */
  @state() private comparing: [Side | null, Side | null] | null = null;
  /** Drive, at #/drive[/folder]: the documents saved on this device. */
  @state() private driving: string | null = null;
  /** The link holds something that cannot be read (cut short when it was copied, most often): said so, and left as it is. */
  @state() private unreadable = false;

  private onHash = () => {
    this.readPlainLink();
    this.comparing = parseCompare(location.hash);
    this.driving = /^#\/drive(\/|$)/.test(location.hash) ? decodeURIComponent(location.hash.replace(/^#\/drive\/?/, '')) : null;
    const { app, payload, version, ext } = parseHash(location.hash);
    // An app's own page (".../deck/") with nothing after it opens a new document there.
    this.app = app ?? (!location.hash && appOf(pageApp()) ? pageApp() : null);
    // A different link is a different document: its history starts here, and a write of the last one
    // still under way (a locked document being sealed) must not land on top of it.
    this.history.clear();
    this.writeRun++;
    this.presenting = false;
    this.embedded = ext === 'embed';
    this.version = version;
    this.pendingExt = ext;
    this.privacy.reset();
    this.payloadLength = payload.length;
    if (isSealed(payload)) {
      this.sealed = payload;
      this.env = { created: null, body: '' };
      // (The prompt puts the caret in its own box once that box is drawn: widgets/privacy.ts.)
      return;
    }
    this.sealed = '';
    this.unreadable = !!payload && !decodeDoc(payload);
    this.env = decodeEnvelope(payload);
    if (this.unreadable) return;
    this.remember();
    void this.privacy.check(this.env, this.app);
    this.downloadPending();
  };

  private get urlPrefix(): string {
    return `${location.origin}${location.pathname}${location.search}${routeHash(this.app!)}/`;
  }

  private async writeUrl() {
    if (!this.app) return;
    const run = ++this.writeRun;
    const from = location.hash;
    const empty = !this.env.body && this.env.created === null && !this.env.key && !this.env.title;
    let payload = '';
    if (!empty) {
      payload = await this.privacy.pack(this.env);
      // A later write, or another link followed meanwhile (the address changed under us): this one is stale.
      if (run !== this.writeRun || location.hash !== from) return;
    }
    this.payloadLength = payload.length;
    this.version = LINK_VERSION;
    history.replaceState(null, '', routeHash(this.app, payload) + (payload ? '' : '/'));
    this.remember();
  }

  /** The switch: keep things on this device, or leave nothing. Keeping is the choice remembered; private writes nothing. */
  private toggleKeeping = async () => {
    if (keeping() && !confirm('Save nothing on this device from now on? Your documents list, signing key, preferences and the offline copy are forgotten (the documents themselves live in their links).')) return;
    await setKeeping(!keeping());
    this.requestUpdate();
    this.showToast(keeping() ? 'Saved on this device from now on' : 'Private: nothing saved');
  };

  /** Everything, in one file: the app (it runs from a folder) and every document kept here as a page of its own. */
  private async downloadAll() {
    const files: Record<string, string | Uint8Array> = {};
    try {
      const list: string[] = await (await fetch(new URL('files.json', this.root))).json();
      for (const f of list) files[f === '' ? 'index.html' : f.endsWith('/') ? f + 'index.html' : f] = new Uint8Array(await (await fetch(new URL(f, this.root))).arrayBuffer());
    } catch {
      // (Not built with a file list: the documents alone, then.)
    }
    const kept = library();
    files['library.json'] = JSON.stringify(kept, null, 2);
    // (Characters no file system allows in a name.)
    const safe = (name: string) => name.replace(/[\\/:*?"<>|]+/g, '-');
    for (const k of kept) {
      const def = appOf(k.app);
      const env = decodeEnvelope(parseHash(k.hash).payload);
      if (!def) continue;
      const name = safe(k.title || def.title(env.body) || def.name).slice(0, 80);
      files[`library/${safe(k.folder || def.name)}/${name}.html`] = await withFonts(def.document ? def.document(env.body, { created: env.created }) : docHtml({ def, body: env.body, title: k.title }, { created: env.created }, `${this.root}${k.app}/${k.hash}`));
    }
    files['README.txt'] = 'TinyLittleOffice, and your documents.\n\nlibrary/: each document as a web page of its own; open it in any browser. Its link (the whole document) is inside.\nlibrary.json: the same list, as data.\n\nThe app itself is the rest. Open index.html in Firefox or Safari, or serve the folder (for example: python3 -m http.server) and open http://localhost:8000/ in any browser.\n';
    await saveFile('tinylittleoffice.zip', 'application/zip', zip(files, Date.now()));
    this.showToast('Downloaded tinylittleoffice.zip');
  }

  /** A preference was forgotten, or the lot: the shell's own copies follow. */
  private onDevice = () => {
    if (this.privacy.prefsKept() === 0) {
      this.theme = 'auto';
      this.shut = [];
      this.size = 1;
      this.applySize();
    }
    this.requestUpdate();
  };

  /** Keep this document in the browser's own library, in a folder named for its app unless it has been moved. */
  private remember() {
    if (!this.app || !this.def || this.embedded || this.env.created === null || !location.hash.includes('/v')) return;
    keep({ id: `${this.app}:${this.env.created}`, app: this.app, title: this.docTitle, hash: location.hash.replace(/\/v(\d+)\/([a-z]+)\.[a-z0-9]+\//, '/v$1/$2/') }, this.def.name);
  }

  /* ---------- download views ---------- */

  private downloadPending() {
    const ext = this.pendingExt;
    this.pendingExt = '';
    // "<app>.show" is not a file: it opens the document presenting.
    if (ext === 'embed') return;
    if (ext === 'show' && this.def?.presents) this.presenting = true;
    else if (ext) this.download(ext);
  }

  private get def(): AppDef | undefined {
    return this.app ? appOf(this.app) : undefined;
  }

  /** The site's own address, whichever app page we were opened from. */
  private get root(): string {
    return new URL(/\/[a-z]+\/$/.test(location.pathname) && appOf(pageApp()) ? '..' : '.', location.origin + location.pathname).href;
  }

  /** The link to this document, to edit it (see linkTo). */
  private get link(): string {
    return this.linkTo('');
  }

  /**
   * The link to this document, from its app's own page so it previews as
   * that app. `view` is '' for the editor, 'show' to open presenting, or a
   * file extension to download.
   */
  private linkTo(view: string): string {
    if (!this.app) return location.href;
    const { payload } = parseHash(location.hash);
    return `${this.root}${location.protocol === 'file:' ? '' : this.app + '/'}${routeHash(this.app, payload, view)}`;
  }

  private async download(ext: string) {
    const def = this.def;
    if (!def) return;
    try {
      // Print is the browser's: its dialog saves a PDF too (a link "<app>.print/..." prints on arrival).
      if (ext === 'print') return await printDoc(def, this.env.body, { created: this.env.created, base: this.root }, this.env.title);
      const name = await download(def, this.env.body, ext, { created: this.env.created, base: this.root }, this.link, this.env.title);
      this.showToast(name ? `Downloaded ${name}` : `No .${extOf(ext)} view here`);
    } catch (err) {
      this.showToast(errorText(err, 'Download failed'));
    }
  }

  /* ---------- sharing ---------- */

  /** What the document is called: the name it was given, or one read out of it, or "Untitled Sheet". */
  private get docTitle(): string {
    return this.env.title || this.def?.title(this.env.body) || (this.def ? `Untitled ${this.def.name}` : 'TinyLittleOffice');
  }

  private setTitle(title: string) {
    const named = title.trim() ? title.replace(/\n/g, ' ') : undefined;
    if (named !== this.env.title) this.history.record(this.state());
    this.change({ ...this.env, created: this.env.created ?? (title ? quantizeCreated(Date.now()) : null), title: named });
  }

  /** The document is now `env`: into the link with it, and its signature checked against it. */
  private change(env: Envelope) {
    this.env = env;
    void this.writeUrl();
    void this.privacy.check(this.env, this.app);
  }

  /**
   * Sharing without a server. The document is in the fragment, which no
   * crawler ever sees, so a link preview can only be the site's own card.
   * What we can do from here: hand the link (and a picture of the document)
   * to the device's share sheet, or open a service's compose box with the
   * link already in it.
   */
  private async share(how: string) {
    const url = this.link;
    const title = this.docTitle;
    if (how === 'native') {
      const data: ShareData = { title, text: title, url };
      const png = this.def ? await picture(this.def, this.env.body) : null;
      if (png) {
        const file = new File([png as BlobPart], `${this.def!.id}.png`, { type: 'image/png' });
        if (navigator.canShare?.({ files: [file] })) data.files = [file];
      }
      try {
        await navigator.share(data);
      } catch {
        /* dismissed */
      }
      return;
    }
    if (how === 'copy' || how === 'copy-show') {
      await this.copy(how === 'copy' ? url : this.linkTo('show'), 'Link copied');
      return;
    }
    if (how === 'png') return void this.download('png');
    if (how === 'qr') return void this.querySelector<ToQrDialog>('to-qr-dialog')?.show();
    if (how === 'shorten') return void this.dialog('short-dialog')?.show();
    if (how === 'compare') {
      // This document as the first; the other is pasted on the compare page (or comes from the clipboard, when allowed).
      const me = sideOf(url);
      if (!me) return;
      const other = sideOf(await navigator.clipboard.readText().catch(() => ''));
      location.hash = other && other.payload !== me.payload ? compareHash(me, other) : `#/compare/${me.app}/${me.payload}`;
      return;
    }
    if (how === 'embed') {
      await this.copy(this.embedCode(), 'Embed code copied');
      return;
    }
    const service = SERVICES.find((s) => s.id === how);
    if (service) window.open(service.compose(title, url), '_blank', 'noopener');
  }

  /**
   * The snippet that shows this document on another page. The usual good
   * manners of an embed: it has a title, loads only when scrolled to, keeps
   * its shape at any width, and sends no referrer.
   */
  private embedCode(): string {
    const page = this.def!.view(this.env.body)[0];
    return `<iframe src="${xml(this.linkTo('embed'))}" title="${xml(this.docTitle)}" loading="lazy" referrerpolicy="no-referrer" allowfullscreen style="width:100%;max-width:${page.w}px;aspect-ratio:${page.w}/${page.h + 44};border:1px solid #d4d4d8;border-radius:8px"></iframe>`;
  }

  private cycleTheme() {
    this.theme = THEMES[(THEMES.indexOf(this.theme) + 1) % THEMES.length];
    applyTheme(this.theme);
    this.showToast(THEME_NAMES[this.theme]);
  }

  private lastSelf = '';
  /**
   * The header and every app's bar are one row that scrolls sideways when
   * it is too long for the screen; an edge fades where there is more past
   * it. Marked on every bar after a render, and on the one that scrolled.
   */
  private fadeEdges = (e?: Event) => {
    const bars = e?.target instanceof HTMLElement && e.target.matches(BARS) ? [e.target] : [...this.querySelectorAll<HTMLElement>(BARS)];
    for (const bar of bars) {
      const more = bar.scrollWidth - bar.clientWidth - bar.scrollLeft;
      bar.toggleAttribute('data-fade-start', bar.scrollLeft > 1);
      bar.toggleAttribute('data-fade-end', more > 1);
    }
  };
  /** An app's bar fills as the app draws it, after the shell has: whatever changes on the page, the edges are looked at again, once a frame. */
  private fadeSoon = 0;
  private barsChanged = new MutationObserver(() => {
    if (this.fadeSoon) return;
    this.fadeSoon = requestAnimationFrame(() => {
      this.fadeSoon = 0;
      this.fadeEdges();
    });
  });

  protected updated() {
    this.watchBar();
    this.onViewport();
    this.fadeEdges();
    // The kit knows this document's link (a QR code of it may be drawn inside it); embeds redraw when it changes.
    if (this.app && !this.sealed && this.link !== this.lastSelf) {
      this.lastSelf = this.link;
      setSelfLink(this.link);
      window.dispatchEvent(new Event(REFRESH));
    }
    const title = this.app ? `${this.docTitle} · TinyLittleOffice` : this.driving !== null ? `Drive${this.driving ? ': ' + this.driving : ''} · TinyLittleOffice` : this.comparing ? 'Compare · TinyLittleOffice' : 'TinyLittleOffice';
    if (document.title !== title) document.title = title;
  }

  private onDocChange(e: CustomEvent<string>) {
    if (!this.app) return;
    const body = e.detail;
    if (body !== this.env.body) this.history.record(this.state());
    this.change({ ...this.env, created: this.env.created ?? (body ? quantizeCreated(Date.now()) : null), body });
  }

  /* ---------- undo ---------- */

  /** What undo goes back through: the document's title and its body, together, so a title typed is undone like any other change. */
  private state() {
    return JSON.stringify([this.env.title ?? '', this.env.body]);
  }
  /** Step the document back or forward. Works the same in every app: the editor is simply handed the earlier text. */
  private step(back: boolean) {
    const was = back ? this.history.undo(this.state()) : this.history.redo(this.state());
    if (was === null || !this.app) return;
    const [title, body] = JSON.parse(was) as [string, string];
    this.change({ ...this.env, title: title || undefined, body });
  }

  /** The privacy widget unlocked, signed or unsigned the document. */
  private onPrivacyEnv = (e: CustomEvent<Envelope>) => {
    if (this.sealed) {
      // Opened: a download its link asked for can go ahead now.
      this.env = e.detail;
      this.sealed = '';
      this.downloadPending();
    }
    this.change(e.detail);
  };

  private showToast(msg: string) {
    this.toast = msg;
    clearTimeout(this.toastTimer);
    this.toastTimer = window.setTimeout(() => (this.toast = ''), 2000);
  }
  /** Anything on the page can ask for a toast (kit toast()). */
  private onToast = (e: Event) => this.showToast((e as CustomEvent<string>).detail);

  /** Put text on the clipboard and say so. */
  private copy(text: string, said = 'Copied') {
    return navigator.clipboard.writeText(text).then(
      () => this.showToast(said),
      () => this.showToast('Copy failed'),
    );
  }

  /** One of the shell's dialogs, by id: the document's own unless another is named. */
  private dialog(id = 'doc-dialog'): SlDialog | null {
    return this.querySelector<SlDialog>(`#${id}`);
  }
  private drawer(): SlDrawer | null {
    return this.querySelector<SlDrawer>('#nav-drawer');
  }

  /** The document and nothing else: what an <iframe> on another site shows. */
  private renderEmbedded(def: AppDef) {
    if (this.sealed) return html`<main class="to-embedded"><p class="to-embed-note">${icon(UI.lock, 16)} This ${def.name.toLowerCase()} is locked. <a href=${this.linkTo('')} target="_blank" rel="noopener">Open it in TinyLittleOffice</a> to enter the password.</p></main>`;
    const pages = def.view(this.env.body);
    const at = Math.min(this.embedPage, pages.length - 1);
    const go = (d: number) => (this.embedPage = Math.max(0, Math.min(pages.length - 1, at + d)));
    return html`<main class="to-embedded" @keydown=${(e: KeyboardEvent) => (e.key === 'ArrowRight' ? go(1) : e.key === 'ArrowLeft' ? go(-1) : null)}>
      <div class="pic" role="img" aria-label=${this.docTitle} tabindex=${pages.length > 1 ? 0 : -1} @click=${() => pages.length > 1 && go(at === pages.length - 1 ? -at : 1)}>${unsafeHTML(pageSvg(pages[at]))}</div>
      <footer>
        <span class="t">${this.docTitle}</span>
        ${pages.length > 1
          ? html`<button aria-label="Previous page" ?disabled=${at === 0} @click=${() => go(-1)}>${icon(UI.left, 14)}</button><span class="n">${at + 1} / ${pages.length}</span><button aria-label="Next page" ?disabled=${at === pages.length - 1} @click=${() => go(1)}>${icon(UI.right, 14)}</button>`
          : nothing}
        <a href=${this.link} target="_blank" rel="noopener">Open in TinyLittleOffice</a>
      </footer>
    </main>`;
  }

  render() {
    if (this.embedded && this.def) return this.renderEmbedded(this.def);
    const current = this.def;
    const { available } = budgetFor(this.urlPrefix);
    return html`
      <button class="to-skip" @click=${() => this.querySelector<HTMLElement>('main')?.focus()}>Skip to the document</button>
      <!-- The menu, always at the very top left, wherever the page is scrolled to: outside the header, which goes up with the page. -->
      <sl-button class="to-burger icon" variant="text" size="medium" aria-label="Menu" @click=${() => this.drawer()?.show()}>${icon(UI.menu, 33)}<span class="sr-only">Menu</span></sl-button>
      <header class="to-header">
        <!-- One row: room for the menu, then what this is (the document: its app and its title), then everything to do with it; the row scrolls sideways when it is too long, and goes up with the page. -->
        <div class="to-header-inner">
          ${current ? this.renderTitleLine(current) : html`<a class="to-brand" href="#/" aria-label="TinyLittleOffice home"><span class="mark">${icon(UI.sparkles, 24)}</span><span>TinyLittleOffice</span></a>`}
          <span class="to-spacer"></span>
          <button class="to-keep ${keeping() ? 'on' : ''}" data-tip=${keeping() ? 'Saved on this device: your documents, in folders, and your settings. Tap to save nothing and forget all of it.' : 'Private: nothing is saved on this device, no cookies, no trace. Tap to save your documents here, in folders.'} aria-pressed=${keeping() ? 'true' : 'false'} aria-label=${keeping() ? 'Saved on this device' : 'Private: nothing saved on this device'} @click=${this.toggleKeeping}>${icon(keeping() ? UI.folder : UI.shield, 24)}<span aria-hidden="true">${keeping() ? 'Saved' : 'Private'}</span></button>
          ${current ? this.renderDocHead() : nothing}
          ${current
            ? html`
                <to-meter .used=${this.payloadLength} .available=${available} .href=${this.link} .rooms=${roomFor(this.link)} @to-info=${() => this.dialog()?.show()} @to-copy=${() => this.share('copy')}></to-meter>
                ${this.sealed
                  ? nothing
                  : html`<div class="to-doc-actions">
                      <sl-dropdown hoist placement="bottom-end" @sl-select=${(e: CustomEvent) => (e.detail.item.value === 'import' ? this.dialog('import-dialog')?.show() : e.detail.item.value === 'open-as' ? this.openAs() : this.download(e.detail.item.value))}>
                        <sl-button slot="trigger" class="icon" size="small" aria-label="Download" data-tip="Download">${icon(UI.download, 24)}<span class="sr-only">Download</span></sl-button>
                        <sl-menu>
                          <sl-menu-label>Download</sl-menu-label>
                          ${formatsOf(current).map((f) => html`<sl-menu-item value=${f.ext}>${f.label}<code slot="suffix">.${f.ext}</code></sl-menu-item>`)}
                          <sl-divider></sl-divider>
                          <sl-menu-item value="print">${icon(UI.printer, 14, 'pre')} Print, or save as PDF…</sl-menu-item>
                          <sl-menu-item value="import">${icon(UI.insert, 14, 'pre')} Import Markdown or CSV…</sl-menu-item>
                          <sl-menu-item value="open-as">${icon(UI.compare, 14, 'pre')} Open as another app…</sl-menu-item>
                        </sl-menu>
                      </sl-dropdown>
                      <sl-dropdown hoist placement="bottom-end" @sl-select=${(e: CustomEvent) => this.share(e.detail.item.value)}>
                        <sl-button slot="trigger" class="icon" size="small" aria-label="Share" data-tip="Share">${icon(UI.share, 24)}<span class="sr-only">Share</span></sl-button>
                        <sl-menu>
                          <sl-menu-label>Share</sl-menu-label>
                          ${'share' in navigator ? html`<sl-menu-item value="native">Share…</sl-menu-item>` : nothing}
                          <sl-menu-item value="copy">Copy link</sl-menu-item>
                          ${current.presents ? html`<sl-menu-item value="copy-show">${icon(UI.play, 14, 'pre')} Copy link (opens presenting)</sl-menu-item>` : nothing}
                          <sl-menu-item value="png">Save a picture</sl-menu-item>
                          <sl-menu-item value="embed">Copy embed code</sl-menu-item>
                          <sl-menu-item value="qr">QR code</sl-menu-item>
                          <sl-menu-item value="compare">Compare with another link…</sl-menu-item>
                          <sl-menu-item value="shorten">${icon(UI.link, 14, 'pre')} Shorter link that expires…</sl-menu-item>
                          <sl-divider></sl-divider>
                          ${SERVICES.map((s) => html`<sl-menu-item value=${s.id}>${s.name}</sl-menu-item>`)}
                        </sl-menu>
                      </sl-dropdown>
                      ${tool('QR code', 'qr', () => this.share('qr'), { cls: 'to-qr-btn', size: 24 })}
                      <sl-dropdown hoist placement="bottom-end" @sl-select=${() => this.dialog()?.show()}>
                        ${this.renderTrust()}
                        <sl-menu>
                          <sl-menu-label>Privacy</sl-menu-label>
                          <sl-menu-item value="password">${icon(UI.lock, 14, 'pre')} Password<span slot="suffix" class="to-hint">${this.privacy.locker ? 'Locked' : 'None'}</span></sl-menu-item>
                          <sl-menu-item value="signature">${icon(UI.shield, 14, 'pre')} Signature<span slot="suffix" class="to-hint">${this.privacy.sig === 'valid' ? 'Signed' : this.privacy.sig === 'invalid' ? 'Mismatch' : 'None'}</span></sl-menu-item>
                        </sl-menu>
                      </sl-dropdown>
                    </div>`}
                ${tool(`New ${current.name}, in a new tab`, 'plus', () => {}, { href: routeHash(current.id), target: '_blank', cls: 'to-new', size: 24 })}
              `
            : nothing}
        </div>
      </header>
      <sl-drawer id="nav-drawer" label="TinyLittleOffice" placement="start" style="--size: 280px" @click=${(e: Event) => (e.target as HTMLElement).closest('a') && this.drawer()?.hide()}>
        <nav class="to-drawer-nav" aria-label="Apps">
          <input class="to-find" type="search" placeholder="Find an app" aria-label="Find an app" autocomplete="off" .value=${this.find} @input=${(e: Event) => (this.find = (e.target as HTMLInputElement).value)} @keydown=${(e: KeyboardEvent) => e.key === 'Enter' && this.querySelector<HTMLElement>('.to-drawer-nav a[href]:not([hidden])')?.click()} />
          <a href="#/" aria-current=${this.app === null && this.driving === null ? 'page' : nothing} ?hidden=${!!this.find.trim()}>${icon(UI.home, 20)}<span>Home</span></a>
          <a href="#/drive" aria-current=${this.driving !== null ? 'page' : nothing} ?hidden=${!!this.find.trim() && !'drive'.includes(this.find.trim().toLowerCase())}>${icon(UI.drive, 20)}<span>Drive</span>${saving() ? html`<small>${library().length}</small>` : nothing}</a>
          ${grouped().map((g) => {
            const want = this.find.trim().toLowerCase();
            const apps = want ? g.apps.filter((a) => a.name.toLowerCase().includes(want) || g.group.toLowerCase().includes(want)) : g.apps;
            if (!apps.length) return nothing;
            const links = apps.map((a) => html`<a class=${a.under && !want ? 'sub' : ''} href=${routeHash(a.id)} target="_blank" aria-current=${a.id === this.app ? 'page' : nothing}>${icon(iconOf(a), a.under ? 17 : 20)}<span>${a.name}</span></a>`);
            // The first few apps stand on their own; the rest are clusters that fold, open where you are.
            if (!g.group) return links;
            const here = apps.some((a) => a.id === this.app);
            return html`<details class="to-cluster" ?open=${!!want || here || !this.shut.includes(g.group)} @toggle=${(e: Event) => !want && this.fold(g.group, (e.target as HTMLDetailsElement).open)}>
              <summary><h2>${g.group}</h2><span>${apps.length}</span></summary>
              ${links}
            </details>`;
          })}
        </nav>
        <sl-button slot="footer" class="to-keys" @click=${() => { this.drawer()?.hide(); this.dialog('keys-dialog')?.show(); }}>${icon(UI.keys, 16)} Keyboard shortcuts</sl-button>
        <div slot="footer" class="to-size">
          ${stepper('Size of everything', `${Math.round(this.size * 100)}%`, { less: 'Everything a little smaller', more: 'Everything a little larger', onLess: () => this.resize(-0.1), onMore: () => this.resize(0.1), canLess: this.size > 0.8, canMore: this.size < 2, reset: 'Back to the normal size', onReset: () => this.resize(1 - this.size) })}
        </div>
        <sl-button slot="footer" class="to-theme" @click=${this.cycleTheme}>${icon(this.theme === 'auto' ? UI.auto : this.theme === 'dark' ? UI.moon : UI.sun, 16)} Theme: ${THEME_NAMES[this.theme]}</sl-button>
      </sl-drawer>
      <main class="to-main" tabindex="-1">${current ? this.renderPanel(current) : this.comparing ? html`<to-compare .a=${this.comparing[0]} .b=${this.comparing[1]}></to-compare>` : this.driving !== null ? html`<to-drive .folder=${this.driving} @drive-zip=${this.downloadAll} @drive-change=${() => this.requestUpdate()}></to-drive>` : this.renderHome()}</main>
      ${this.renderDialog(available)}
      <to-privacy-prompt .privacy=${this.privacy} .env=${this.env} .app=${this.app} .sealed=${this.sealed} @privacy-env=${this.onPrivacyEnv}></to-privacy-prompt>
      ${current ? html`${this.renderImport()}${this.renderOpenAs()}${this.renderShort()}<to-qr-dialog .link=${this.link} .name=${this.docTitle}></to-qr-dialog>` : nothing}
      <sl-dialog id="keys-dialog" label="Keyboard shortcuts">
        ${[
          ['Everywhere', GLOBAL_KEYS] as const,
          ...(this.def?.shortcuts?.length ? [[`In ${this.def.name}`, this.def.shortcuts] as const] : []),
        ].map(
          ([heading, keys]) => html`<h3 class="to-keys-head">${heading}</h3>
            <dl class="to-keys-list">
              ${keys.map((k) => html`<dt>${keyLabel(k.keys).split(' / ').map((combo, i) => html`${i ? ' / ' : ''}<kbd>${combo}</kbd>`)}</dt><dd>${k.does}</dd>`)}
            </dl>`,
        )}
        <sl-button slot="footer" variant="primary" @click=${() => this.dialog('keys-dialog')?.hide()}>Done</sl-button>
      </sl-dialog>
      ${this.toast ? html`<div class="to-toast" role="status">${this.toast}</div>` : nothing}
    `;
  }

  /**
   * The Privacy button says at a glance whether to trust the document:
   * red and unlocked when nobody has signed it, green when its signature
   * holds, red again when the words changed after signing, and the
   * accent's lock when a password seals it.
   */
  private renderTrust() {
    const { locker, sig, signer } = this.privacy;
    const [variant, glyph, tip] = locker
      ? (['primary', UI.lock, 'Locked with a password'] as const)
      : sig === 'invalid'
        ? (['danger', UI.shieldOff, 'Signature mismatch: the words changed after it was signed, or the link was altered'] as const)
        : sig === 'valid'
          ? (['success', UI.shield, `Signed; key ${signer ?? ''}. The words are as the signer left them.`] as const)
          : (['danger', UI.unlock, 'Unsigned: anyone could have written this. Sign it from here.'] as const);
    return html`<sl-button slot="trigger" class="icon to-trust" size="small" aria-label="Privacy" data-tip=${tip} variant=${variant} outline>${icon(glyph, 24)}<span class="sr-only">Privacy</span></sl-button>`;
  }

  /** In the header after the document's name: undo and redo. */
  private renderDocHead() {
    return this.sealed
      ? nothing
      : html`<sl-button-group class="to-undo" label="Undo and redo">
          ${tool('Undo', 'undo', () => this.step(true), { disabled: !this.history.canUndo, key: 'Mod+Z', size: 24 })}
          ${tool('Redo', 'redo', () => this.step(false), { disabled: !this.history.canRedo, key: 'Mod+Shift+Z', size: 24 })}
        </sl-button-group>`;
  }

  /** The start of the header: what kind of document this is, its title, when it was made, and its state. */
  private renderTitleLine(current: AppDef) {
    const over = this.payloadLength > budgetFor(this.urlPrefix).available;
    return html`<a class="to-here" href=${routeHash(current.id)} data-tip="New ${current.name}" aria-label="${current.name}: new document">${icon(iconOf(current), 24)}</a>
      <input class="to-title" aria-label="Title" autocomplete="off" spellcheck="false" .value=${this.env.title ?? ''} placeholder=${current.title(this.env.body) || `Untitled ${current.name}`} ?disabled=${!!this.sealed || this.unreadable} @input=${(e: Event) => this.setTitle((e.target as HTMLInputElement).value)} @keydown=${(e: KeyboardEvent) => e.key === 'Enter' && (e.target as HTMLElement).blur()} />
      <span class="meta">
        ${this.env.created !== null ? html`<span class="when">${icon(UI.clock, 12)} ${fmtDate(this.env.created)}</span>` : nothing}
        ${this.privacy.locker || this.sealed ? html`<sl-tag size="small" pill>${icon(UI.lock, 12)} locked</sl-tag>` : nothing}
        ${this.privacy.sig === 'valid' ? html`<sl-tag size="small" variant="success" pill>${icon(UI.shield, 12)} signed</sl-tag>` : nothing}
        ${this.privacy.sig === 'invalid' ? html`<sl-tag size="small" variant="danger" pill>${icon(UI.shieldOff, 12)} signature mismatch</sl-tag>` : nothing}
        ${over ? html`<sl-tag size="small" variant="danger" pill>over limit</sl-tag>` : nothing}
        ${this.version > LINK_VERSION ? html`<sl-tag size="small" variant="warning" pill>made by a newer TinyLittleOffice (v${this.version})</sl-tag>` : nothing}
      </span>`;
  }

  private renderPanel(current: AppDef) {
    return html`<section class="to-panel" aria-label=${current.name}>
      <h1 class="sr-only">${current.name}: ${this.docTitle}</h1>
      <div @docchange=${this.onDocChange}>${this.sealed ? nothing : this.unreadable ? this.renderUnreadable(current) : this.renderApp()}</div>
    </section>`;
  }

  /** A link that cannot be read: no editor (it would write a blank document over the link), but what happened, and a way on. */
  private renderUnreadable(current: AppDef) {
    return html`<div class="to-unreadable" role="alert">
      <h2>This link can't be opened</h2>
      <p>Part of it is missing or changed, most often because it was cut short when it was copied. The whole document lives in the link, so it needs every character. Ask whoever sent it for the whole link.</p>
      <sl-button variant="primary" href=${routeHash(current.id)}>${icon(UI.plus, 16)} New ${current.name}</sl-button>
    </div>`;
  }

  /** The viewer of a "show" link wants the editor: from here on the link is an ordinary one. */
  private onPresentEnd() {
    this.presenting = false;
    const { app, payload } = parseHash(location.hash);
    if (app) history.replaceState(null, '', routeHash(app, payload));
  }

  private renderApp() {
    if (!this.app) return nothing;
    const tag = unsafeStatic(`to-${this.app}`);
    // An editor with a download button of its own (a PDF, from the Print group) asks for it this way.
    return html`<${tag} .value=${this.env.body} .present=${this.presenting} @present-end=${this.onPresentEnd} @to-download=${(e: CustomEvent<string>) => this.download(e.detail)}></${tag}>`;
  }

  private renderHome() {
    return html`<section class="to-home">
      <h1 class="sr-only">TinyLittleOffice</h1>
      ${this.renderLibrary()}
      ${grouped().map(
        (g, n) => html`${g.group ? html`<h2 class="to-group">${g.group}</h2>` : nothing}
          <div class="to-launcher">
            ${n === 0 && saving() ? html`<a href="#/drive" class="drive-tile"><span class="ic">${icon(UI.drive, 22)}</span><b>Drive</b></a>` : nothing}
            ${g.apps.map((a) => html`<a class=${a.under ? 'sub' : ''} href=${routeHash(a.id)}><span class="ic">${icon(iconOf(a), 22)}</span><b>${a.name}</b></a>`)}
          </div>`,
      )}
    </section>`;
  }

  /** The home page's glimpse of Drive: the last few documents, and the way to all of them. */
  private renderLibrary() {
    if (!saving()) return nothing;
    const all = library().sort((a, b) => b.at - a.at);
    if (!all.length) return nothing;
    return html`<section class="to-library" aria-labelledby="library-h">
      <h2 class="to-group" id="library-h">Recent <a href="#/drive" class="to-more">${icon(UI.drive, 14)} Drive, all ${all.length}</a></h2>
      <ul>
        ${all.slice(0, 6).map((k) => html`<li><a href=${k.hash}>${icon(iconOf(appOf(k.app)), 16)}<b>${k.title || `Untitled ${appOf(k.app)?.name ?? k.app}`}</b><small>${k.folder} · ${fmtDate(k.at)}</small></a></li>`)}
      </ul>
    </section>`;
  }

  /** A shorter link that expires, from tinier: the document encrypted with a key only the short link carries. */
  @state() private shortTtl = 7 * 86400;
  @state() private short: { short: string; expires: number } | null = null;
  @state() private shortBusy = false;
  private renderShort() {
    const make = async () => {
      this.shortBusy = true;
      try {
        this.short = await shorten(this.link, this.shortTtl);
        await this.copy(this.short.short, 'Short link copied');
      } catch (err) {
        this.showToast(errorText(err, 'Could not shorten the link'));
      } finally {
        this.shortBusy = false;
      }
    };
    return html`<sl-dialog id="short-dialog" label="A shorter link that expires" @sl-after-hide=${() => (this.short = null)}>
      <p class="to-hint">The document is encrypted here, with a key only the short link carries (after its #). tinier.tinylittleoffice.com keeps the ciphertext until the time you choose, then forgets it. It learns nothing but that a link was made. The long link stays yours and never expires.</p>
      <sl-radio-group label="Expires in" value=${String(this.shortTtl)} @sl-change=${(e: Event) => (this.shortTtl = +(e.target as HTMLInputElement).value)}>
        ${EXPIRIES.map((x) => html`<sl-radio-button value=${String(x.seconds)}>${x.name}</sl-radio-button>`)}
      </sl-radio-group>
      ${this.short
        ? html`<div class="to-short"><code>${this.short.short}</code><sl-button size="small" @click=${() => this.copy(this.short!.short)}>${icon(UI.copy, 14)} Copy</sl-button></div>
            <p class="to-hint">Expires ${fmtDate(this.short.expires)}. ${this.short.short.length} characters, against ${this.link.length}.</p>`
        : nothing}
      <sl-button slot="footer" variant="primary" ?loading=${this.shortBusy} @click=${make}>${icon(UI.link, 14)} Make the short link</sl-button>
    </sl-dialog>`;
  }

  /** The same document read by another app, each a link to open it in a new tab; this one stays as it is. Worked out only while the dialog is open. */
  @state() private openingAs = false;
  @state() private asFilter = '';
  private openAs() {
    this.asFilter = '';
    this.openingAs = true;
    void this.updateComplete.then(() => this.querySelector<SlDialog>('#open-as')?.show());
  }
  private renderOpenAs() {
    const from = this.def;
    const q = this.asFilter.trim().toLowerCase();
    const choices = from && this.openingAs ? apps().filter((d) => d.id !== from.id && !d.hidden && (!q || d.name.toLowerCase().includes(q))).flatMap((d) => {
      const body = convert(from, this.env.body, d);
      return body.trim() ? [html`<li><a href=${hashOf(d.id, body, this.env.title)} target="_blank" rel="noopener">${icon(iconOf(d), 18)}<span>${d.name}</span></a></li>`] : [];
    }) : [];
    return html`<sl-dialog id="open-as" label="Open as another app" class="to-open-as" @sl-after-hide=${(e: Event) => e.target === e.currentTarget && (this.openingAs = false)}>
      <p class="to-hint">The same words, read by another app, open in a new tab: an outline as slides, a list as a board. This document stays as it is.</p>
      <sl-input size="small" placeholder="Find an app" aria-label="Find an app" clearable .value=${this.asFilter} @sl-input=${(e: Event) => (this.asFilter = (e.target as HTMLInputElement).value)}></sl-input>
      <ul>${choices}</ul>
    </sl-dialog>`;
  }

  /** Paste Markdown (or pick a .md file) and it becomes this document, read the way this kind of document reads. */
  @state() private importText = '';
  private renderImport() {
    const apply = () => {
      if (!this.def || !this.importText.trim()) return;
      // A .tlo file says which app it is, and what it is called.
      const [head, rest] = takeHead(this.importText, DOC_KEYS);
      const other = head.app && head.app !== this.def.id ? appOf(head.app) : undefined;
      this.importText = '';
      this.dialog('import-dialog')?.hide();
      if (other) {
        location.hash = hashOf(other.id, fromMarkdown(other, rest), head.title);
        return;
      }
      if (head.title) this.env = { ...this.env, title: head.title };
      this.history.record(this.state());
      this.change({ ...this.env, created: this.env.created ?? quantizeCreated(Date.now()), body: fromMarkdown(this.def, rest) });
      this.showToast('Imported');
    };
    const pick = async (e: Event) => {
      const file = (e.target as HTMLInputElement).files?.[0];
      if (file) this.importText = await file.text();
    };
    return html`<sl-dialog id="import-dialog" label="Import Markdown or CSV" class="to-import">
      <p class="to-hint">Paste Markdown or CSV, or choose a file (a .tlo file opens as the document it is). Headings, lists, tables, checkboxes and rows of cells are read the way this kind of document reads them; it replaces what is here (undo brings it back).</p>
      <textarea aria-label="Markdown or CSV" placeholder="# Title&#10;&#10;- one thing&#10;- another&#10;&#10;or: Item, Cost&#10;Rent, 1200" .value=${this.importText} @input=${(e: Event) => (this.importText = (e.target as HTMLTextAreaElement).value)}></textarea>
      <div class="row">
        <input type="file" accept=".tlo,.md,.markdown,.txt,.csv,.tsv,text/markdown,text/plain,text/csv,text/tab-separated-values" aria-label="A Markdown or CSV file" @change=${pick} />
        <span class="to-spacer"></span>
        <sl-button variant="primary" ?disabled=${!this.importText.trim()} @click=${apply}>${icon(UI.insert, 14)} Import</sl-button>
      </div>
    </sl-dialog>`;
  }

  private renderDialog(available: number) {
    const left = available - this.payloadLength;
    const created = this.env.created;
    return html`<sl-dialog id="doc-dialog" label="This document" class="to-doc">
      <h3>${icon(UI.info, 14)} About</h3>
      <dl>
        <dt>Made</dt>
        <dd>${created !== null ? html`${fmtDate(created)} <span class="to-hint">${fmtUtc(created)}</span>` : '—'}</dd>
        <dt>By</dt>
        <dd>
          <div class="row">
            <sl-input class="sr-label to-by" size="small" label="Who made it" placeholder="A name, or an agent's" .value=${this.env.by ?? ''} @sl-change=${(e: Event) => this.change({ ...this.env, by: (e.target as SlInput).value.trim() || undefined })}></sl-input>
            ${this.env.by && this.privacy.sig === 'valid' ? html`<sl-tag size="small" variant="success" pill>${icon(UI.shield, 12)} signed</sl-tag>` : this.env.by ? html`<span class="to-hint">unsigned: a claim, not proof</span>` : nothing}
          </div>
        </dd>
        <dt>Link</dt>
        <dd>${this.payloadLength.toLocaleString()} / ${available.toLocaleString()} <span class="to-hint">v${this.version}</span> ${left < 0 ? html`<sl-tag size="small" variant="danger" pill>${(-left).toLocaleString()} over</sl-tag>` : nothing}</dd>
        <dt>Download</dt>
        <dd>
          <div class="row">
            ${this.def
              ? formatsOf(this.def).map(
                  (f) => html`<span class="to-dl">
                    <sl-button size="small" @click=${() => this.download(f.ext)}>.${f.ext}</sl-button>
                    ${btn(`Copy a link that downloads the .${f.ext}`, 'copy', () => this.copy(this.linkTo(f.ext), 'Link copied'), { cls: 'to-copy' })}
                  </span>`,
                )
              : nothing}
          </div>
        </dd>
      </dl>
      <h3>${icon(UI.send, 14)} Where the link fits</h3>
      ${roomsTable(roomFor(this.link))}
      <to-privacy .privacy=${this.privacy} .env=${this.env} .app=${this.app} .sealed=${this.sealed} @privacy-env=${this.onPrivacyEnv} @privacy-lock=${() => this.writeUrl()} @privacy-device=${this.onDevice} @privacy-zip=${this.downloadAll}></to-privacy>
      <sl-button slot="footer" variant="primary" @click=${() => this.dialog()?.hide()}>Done</sl-button>
    </sl-dialog>`;
  }
}

declare global {
  interface HTMLElementTagNameMap {
    'to-app': ToApp;
  }
}
