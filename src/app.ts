/**
 * <to-app>: the shell. Owns the URL. Routes "#/v1/<app>/<payload>" to a mini
 * app, hands it the decoded document body, and writes every change back into
 * the URL via history.replaceState. Also owns the envelope around the body
 * (creation time, optional signature) and optional password encryption.
 *
 * "#/v1/<app>.<ext>/<payload>" is a download view: arriving at it saves the
 * document as that kind of file (see lib/exports.ts).
 */
import { folders, forget, forgetAll, keep, moveTo, saving, type Kept } from './lib/library.ts';
import { LitElement, nothing } from 'lit';
import { html, unsafeStatic } from 'lit/static-html.js';
import { customElement, state } from 'lit/decorators.js';
import { budgetFor, fromBase64Url } from './lib/codec.ts';
import { encodeEnvelope, unpackEnvelope, quantizeCreated, type Envelope } from './lib/envelope.ts';
import { Privacy, isSealed } from './lib/privacy.ts';
import { fromMarkdown } from './lib/markdown.ts';
import './widgets/privacy.ts';
import { icon, UI } from './lib/icons.ts';
import './apps/index.ts';
import { fontsForPictures } from './kit/browser.ts';
import { History, apps, appOf, extOf, pageSvg, xml, type AppDef, type Shortcut } from './kit/core.ts';
import { unsafeHTML } from 'lit/directives/unsafe-html.js';
import { REFRESH, download, formatsOf, loadEditor, picture } from './kit/browser.ts';
import './lib/icons.ts';
import { roomFor } from './lib/limits.ts';
import { roomsTable } from './widgets/meter.ts';
import { ToQrDialog } from './widgets/qr-dialog.ts';
import type { SlDialog, SlDrawer, SlInput } from './lib/shoelace.ts';

export type AppId = string;

/** The apps, in menu order, straight from their definitions (src/apps/index.ts). */
export const APPS: { id: AppId; name: string; icon: keyof typeof UI; under?: string }[] = apps().map((d) => ({ id: d.id, name: d.name, icon: d.icon as keyof typeof UI, under: d.under }));

/**
 * The apps as the menu shows them: under their group's heading, each app
 * followed by the apps that are kinds of it.
 */
function grouped(): { group: string; apps: typeof APPS }[] {
  const out: { group: string; apps: typeof APPS }[] = [];
  for (const d of apps()) {
    if (d.under) continue;
    const group = d.group ?? 'More';
    // (The apps with no group come first, on their own.)
    let at = out.find((g) => g.group === group);
    if (!at) out.push((at = { group, apps: [] }));
    at.apps.push(...APPS.filter((a) => a.id === d.id || a.under === d.id));
  }
  // In the order the menu shows them: the apps on their own first, then the clusters.
  const ORDER = ['', 'Plan', 'Create', 'Collaborate', 'Play', 'Design', 'Print', 'Track'];
  return out.sort((a, b) => (ORDER.indexOf(a.group) + 1 || 99) - (ORDER.indexOf(b.group) + 1 || 99));
}

/** Shortcuts that work in every app. "Mod" is Ctrl, or Command on a Mac. */
const GLOBAL_KEYS: Shortcut[] = [
  { keys: 'Mod+Z', does: 'Undo' },
  { keys: 'Mod+Shift+Z / Mod+Y', does: 'Redo' },
  { keys: 'Mod+/', does: 'Show these shortcuts' },
  { keys: 'Mod+K', does: 'Open the menu of apps' },
  { keys: 'Mod+S', does: 'Download (the first format in the Download menu)' },
  { keys: 'Mod+P', does: 'Download as PDF' },
  { keys: 'Mod+Shift+C', does: 'Copy the link' },
  { keys: 'Mod+Shift+L', does: 'Light, dark, or match the device' },
];
const MAC = /Mac|iPhone|iPad/.test(navigator.platform);
/** A shortcut the way this keyboard writes it. */
const keyLabel = (keys: string) => keys.replace(/Mod/g, MAC ? '⌘' : 'Ctrl').replace(/Alt/g, MAC ? '⌥' : 'Alt');

type Theme = 'auto' | 'light' | 'dark';
const THEMES: Theme[] = ['auto', 'light', 'dark'];
const THEME_NAMES: Record<Theme, string> = { auto: 'Match the device', light: 'Light', dark: 'Dark' };

function storedTheme(): Theme {
  try {
    const t = localStorage.getItem('to-theme');
    return t === 'light' || t === 'dark' ? t : 'auto';
  } catch {
    return 'auto';
  }
}

/** Light or dark, as chosen; "auto" follows the device (index.html keeps watching it). */
function applyTheme(theme: Theme) {
  try {
    if (theme === 'auto') localStorage.removeItem('to-theme');
    else localStorage.setItem('to-theme', theme);
  } catch {
    /* private mode: the choice lasts for this visit */
  }
  const dark = theme === 'dark' || (theme === 'auto' && matchMedia('(prefers-color-scheme: dark)').matches);
  document.documentElement.classList.toggle('sl-theme-dark', dark);
}

type SigState = 'none' | 'checking' | 'valid' | 'invalid';

/**
 * The version of the URL format, written as "v2" at the front of every link.
 * Version 2 added dictionary compression (see lib/codec.ts); it reads
 * everything version 1 wrote. Links from before versions existed
 * ("#/sheet/...") are read as version 1.
 */
export const URL_VERSION = 2;

export interface Route {
  app: AppId | null;
  payload: string;
  version: number;
  /** Extension of a download view, '' for the editor. */
  ext: string;
}

const ROUTE = new RegExp(`^#/(?:v(\\d+)/)?(${APPS.map((a) => a.id).join('|')})(?:\\.([A-Za-z0-9]+))?(?:/(.*))?$`);

export function parseHash(hash: string): Route {
  const m = ROUTE.exec(hash);
  if (!m) return { app: null, payload: '', version: URL_VERSION, ext: '' };
  return { app: m[2] as AppId, payload: m[4] ?? '', version: m[1] ? parseInt(m[1], 10) : URL_VERSION, ext: m[3] ?? '' };
}

/** The fragment for a document, optionally as a download view. */
export function routeHash(app: AppId, payload = '', ext = ''): string {
  return `#/v${URL_VERSION}/${app}${ext ? '.' + ext : ''}${payload ? '/' + payload : ''}`;
}

const fmtDate = (ms: number) => new Intl.DateTimeFormat(undefined, { dateStyle: 'medium', timeStyle: 'short' }).format(ms);
const fmtUtc = (ms: number) => new Date(ms).toISOString().slice(0, 16).replace('T', ' ') + ' UTC';

@customElement('to-app')
export class ToApp extends LitElement {
  @state() private app: AppId | null = null;
  @state() private env: Envelope = { created: null, body: '' };
  @state() private payloadLength = 0;
  @state() private sig: SigState = 'none';
  @state() private toast = '';
  // Password protection: `sealed` holds a payload waiting for its password.
  /** Everything that protects a document or touches what the device keeps: one object, one widget. */
  private privacy = new Privacy(() => this.requestUpdate());
  @state() private sealed = '';
  @state() private version = URL_VERSION;
  @state() private theme: Theme = storedTheme();
  private history = new History();
  /** Opened from a "show" link: the editor is presenting, until the viewer asks to edit. */
  @state() private presenting = false;
  /** A link was opened: it is shown as the document it is, with editing a button away. */
  @state() private viewing = false;
  /** What is typed into the menu's search box: only apps whose names match are listed. */
  @state() private find = '';
  /** How big everything is drawn, as a factor; remembered. Browser zoom works too; this is for a tap. */
  @state() private size = (() => {
    try {
      return Math.min(2, Math.max(0.8, parseFloat(localStorage.getItem('tinyoffice.size') ?? '1') || 1));
    } catch {
      return 1;
    }
  })();
  private resize(by: number) {
    this.size = Math.round(Math.min(2, Math.max(0.8, this.size + by)) * 20) / 20;
    try {
      if (this.size === 1) localStorage.removeItem('tinyoffice.size');
      else localStorage.setItem('tinyoffice.size', String(this.size));
    } catch {
      // (Not remembered, then.)
    }
    this.applySize();
  }
  private applySize() {
    document.documentElement.style.setProperty('zoom', this.size === 1 ? '' : String(this.size));
  }
  /** The menu's clusters that are folded shut. Remembered. */
  @state() private shut: string[] = (() => {
    try {
      return JSON.parse(localStorage.getItem('tinyoffice.nav') ?? 'null') ?? [];
    } catch {
      return [];
    }
  })();
  private fold(group: string, open: boolean) {
    this.shut = open ? this.shut.filter((g) => g !== group) : [...new Set([...this.shut, group])];
    try {
      localStorage.setItem('tinyoffice.nav', JSON.stringify(this.shut));
    } catch {
      // (Not remembered, then.)
    }
  }
  /** The fonts, as CSS, for pages shown in a frame of their own. */
  @state() private faces = '';
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

  connectedCallback() {
    super.connectedCallback();
    this.applySize();
    window.addEventListener('hashchange', this.onHash);
    window.addEventListener('keydown', this.onGlobalKey);
    window.addEventListener(REFRESH, this.onRefresh);
    this.onHash();
  }
  disconnectedCallback() {
    super.disconnectedCallback();
    window.removeEventListener('hashchange', this.onHash);
    window.removeEventListener('keydown', this.onGlobalKey);
    window.removeEventListener(REFRESH, this.onRefresh);
  }

  /** The fonts or the full icon set have arrived: draw again with them. */
  private onRefresh = () => {
    this.requestUpdate();
    (this.querySelector(`to-${this.app}`) as (HTMLElement & { requestUpdate?: () => void }) | null)?.requestUpdate?.();
  };

  /** Shortcuts that work in every app. Listed in GLOBAL_KEYS; shown by Mod+/. */
  private onGlobalKey = (e: KeyboardEvent) => {
    if (!(e.ctrlKey || e.metaKey) || e.altKey) return;
    const k = e.key.toLowerCase();
    // A document being edited inside another has its own undo (see editRef).
    if ((k === 'z' || k === 'y') && this.def && !this.sealed && !document.querySelector('sl-dialog.to-sub[open]')) {
      e.preventDefault();
      this.step(k === 'z' && !e.shiftKey);
      return;
    }
    const act: (() => void) | undefined =
      k === '/' || k === '?'
        ? () => this.querySelector<SlDialog>('#keys-dialog')?.show()
        : k === 'k' && !e.shiftKey
          ? () => this.drawer()?.show()
          : k === 's' && !e.shiftKey && this.def
            ? () => this.download(formatsOf(this.def!)[0].ext)
            : k === 'p' && !e.shiftKey && this.def
              ? () => this.download('pdf')
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
   * A link written with ordinary parameters instead of a packed document:
   *   /deck/#title=Plan&doc=Launch%0ABuild+it
   * app (when not on an app's own page), doc, title and view. It is turned
   * into the usual link on arrival, so what is shared afterwards is compact.
   *
   * Only after "#": that part of an address stays in the browser. The same
   * parameters after "?" would be sent to the server (and into its logs), so
   * they are deliberately not understood.
   */
  private readPlainLink(): boolean {
    if (location.hash.length < 2 || location.hash.startsWith('#/')) return false;
    const q = new URLSearchParams(location.hash.slice(1));
    if (!q.has('doc') && !q.has('title') && !q.has('app')) return false;
    const def = appOf(q.get('app') ?? '') ?? appOf(location.pathname.split('/').slice(-2)[0]);
    if (!def) return false;
    const text = (q.get('doc') ?? '').replace(/\r\n?/g, '\n');
    const body = def.read ? def.read(text) : text;
    const title = q.get('title')?.trim() || undefined;
    const payload = encodeEnvelope({ created: body || title ? quantizeCreated(Date.now()) : null, title, body }, def.id);
    history.replaceState(null, '', `${this.root}${location.protocol === 'file:' ? '' : def.id + '/'}${routeHash(def.id, payload, q.get('view') ?? '')}`);
    return true;
  }

  private onHash = () => {
    this.readPlainLink();
    const { app, payload, version, ext } = parseHash(location.hash);
    // An app's own page (".../deck/") with nothing after it opens a new document there.
    const page = location.pathname.split('/').slice(-2)[0];
    this.app = app ?? (!location.hash && appOf(page) ? page : null);
    // A different link is a different document: its history starts here.
    this.history.clear();
    this.presenting = false;
    this.viewing = false;
    this.embedded = ext === 'embed';
    this.version = version;
    this.pendingExt = ext;
    this.privacy.reset();
    this.payloadLength = payload.length;
    if (isSealed(payload)) {
      this.sealed = payload;
      this.env = { created: null, body: '' };
      this.updateComplete.then(() => this.querySelector<SlInput>('#pw-input')?.focus());
      return;
    }
    this.sealed = '';
    this.env = this.decode(payload);
    this.arrive(ext);
    this.remember();
    void this.privacy.check(this.env, this.app);
    this.downloadPending();
  };

  private decode(payload: string): Envelope {
    if (!payload) return { created: null, body: '' };
    try {
      return unpackEnvelope(payload[0], fromBase64Url(payload.slice(1)), this.app ?? undefined);
    } catch {
      return { created: null, body: '' };
    }
  }

  private get urlPrefix(): string {
    return `${location.origin}${location.pathname}${location.search}${routeHash(this.app!)}/`;
  }

  private async writeUrl() {
    if (!this.app) return;
    const run = ++this.writeRun;
    const empty = !this.env.body && this.env.created === null && !this.env.key && !this.env.title;
    let payload = '';
    if (!empty) {
      payload = await this.privacy.pack(this.env, this.app);
      if (run !== this.writeRun) return;
    }
    this.payloadLength = payload.length;
    this.version = URL_VERSION;
    history.replaceState(null, '', routeHash(this.app, payload) + (payload ? '' : '/'));
    this.remember();
  }

  /**
   * A document has arrived by its link. It opens as a document to read (a
   * deck opens presenting); the editor is one button away. (Whoever sets
   * "tinyoffice.open" to "edit" in this browser's storage always gets the editor.)
   */
  private arrive(ext: string) {
    let editor = false;
    try {
      editor = localStorage.getItem('tinyoffice.open') === 'edit';
    } catch {
      // (Storage is off: the default, then.)
    }
    if (editor || ext || this.embedded || !this.env.body || !this.def) return;
    if (this.def.presents) this.presenting = true;
    else this.viewing = true;
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
    return new URL(/\/[a-z]+\/$/.test(location.pathname) && appOf(location.pathname.split('/').slice(-2)[0]) ? '..' : '.', location.origin + location.pathname).href;
  }

  /** The link to this document: from its app's own page, so it previews as that app. */
  private get link(): string {
    return this.linkTo(this.def?.presents ? 'show' : '');
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
      const name = await download(def, this.env.body, ext, { created: this.env.created, base: this.root }, this.link, this.env.title);
      this.showToast(name ? `Downloaded ${name}` : `No .${extOf(ext)} view here`);
    } catch (err) {
      this.showToast(err instanceof Error ? err.message : 'Download failed');
    }
  }

  /* ---------- sharing ---------- */

  /** What the document is called: the name it was given, or one read out of it, or "Untitled Sheet". */
  private get docTitle(): string {
    return this.env.title || this.def?.title(this.env.body) || (this.def ? `Untitled ${this.def.name}` : 'TinyLittleOffice');
  }

  private setTitle(title: string) {
    const created = this.env.created ?? (title ? quantizeCreated(Date.now()) : null);
    this.env = { ...this.env, created, title: title.trim() ? title.replace(/\n/g, ' ') : undefined };
    this.writeUrl();
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
    const q = encodeURIComponent;
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
    if (how === 'copy' || how === 'copy-edit') {
      await navigator.clipboard.writeText(how === 'copy' ? url : this.linkTo('')).then(() => this.showToast('Link copied'), () => this.showToast('Copy failed'));
      return;
    }
    if (how === 'png') return void this.download('png');
    if (how === 'qr') return void this.querySelector<ToQrDialog>('to-qr-dialog')?.show();
    if (how === 'embed') {
      await navigator.clipboard.writeText(this.embedCode()).then(() => this.showToast('Embed code copied'), () => this.showToast('Copy failed'));
      return;
    }
    const to: Record<string, string> = {
      bluesky: `https://bsky.app/intent/compose?text=${q(`${title} ${url}`)}`,
      mastodon: `https://mastodonshare.com/?text=${q(title)}&url=${q(url)}`,
      x: `https://twitter.com/intent/tweet?text=${q(title)}&url=${q(url)}`,
      linkedin: `https://www.linkedin.com/sharing/share-offsite/?url=${q(url)}`,
      email: `mailto:?subject=${q(title)}&body=${q(url)}`,
    };
    if (to[how]) window.open(to[how], '_blank', 'noopener');
  }

  /**
   * The snippet that shows this document on another page. The usual good
   * manners of an embed: it has a title, loads only when scrolled to, keeps
   * its shape at any width, and sends no referrer.
   */
  private embedCode(): string {
    const page = this.def!.view(this.env.body)[0];
    const esc = (t: string) => t.replace(/&/g, '&amp;').replace(/"/g, '&quot;').replace(/</g, '&lt;');
    return `<iframe src="${esc(this.linkTo('embed'))}" title="${esc(this.docTitle)}" loading="lazy" referrerpolicy="no-referrer" allowfullscreen style="width:100%;max-width:${page.w}px;aspect-ratio:${page.w}/${page.h + 44};border:1px solid #d4d4d8;border-radius:8px"></iframe>`;
  }

  private cycleTheme() {
    this.theme = THEMES[(THEMES.indexOf(this.theme) + 1) % THEMES.length];
    applyTheme(this.theme);
    this.showToast(THEME_NAMES[this.theme]);
  }

  protected updated() {
    const title = this.app ? `${this.docTitle} · TinyLittleOffice` : 'TinyLittleOffice';
    if (document.title !== title) document.title = title;
  }

  private onDocChange(e: CustomEvent<string>) {
    if (!this.app) return;
    const body = e.detail;
    if (body !== this.env.body) this.history.record(this.env.body);
    const created = this.env.created ?? (body ? quantizeCreated(Date.now()) : null);
    this.env = { ...this.env, created, body };
    this.writeUrl();
    void this.privacy.check(this.env, this.app);
  }

  /* ---------- undo ---------- */

  /** Step the document back or forward. Works the same in every app: the editor is simply handed the earlier text. */
  private step(back: boolean) {
    const body = back ? this.history.undo(this.env.body) : this.history.redo(this.env.body);
    if (body === null || !this.app) return;
    this.env = { ...this.env, body };
    this.writeUrl();
    void this.privacy.check(this.env, this.app);
    this.requestUpdate();
  }

  /** The privacy widget unlocked, signed or unsigned the document. */
  private onPrivacyEnv = (e: CustomEvent<Envelope>) => {
    const wasSealed = !!this.sealed;
    this.env = e.detail;
    if (wasSealed) {
      this.sealed = '';
      this.arrive(this.pendingExt);
      this.downloadPending();
    }
    void this.writeUrl();
    void this.privacy.check(this.env, this.app);
  };

  private showToast(msg: string) {
    this.toast = msg;
    clearTimeout(this.toastTimer);
    this.toastTimer = window.setTimeout(() => (this.toast = ''), 2000);
  }

  private dialog(): SlDialog | null {
    return this.querySelector<SlDialog>('#doc-dialog');
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
    const current = APPS.find((a) => a.id === this.app);
    const { available } = budgetFor(this.urlPrefix);
    return html`
      <button class="to-skip" @click=${() => this.querySelector<HTMLElement>('main')?.focus()}>Skip to the document</button>
      <header class="to-header">
        <div class="to-header-inner">
          <sl-button class="to-burger icon" variant="text" size="medium" aria-label="Menu" @click=${() => this.drawer()?.show()}>${icon(UI.menu, 22)}<span class="sr-only">Menu</span></sl-button>
          <a class="to-brand" href="#/" aria-label="TinyLittleOffice home"><span class="mark">${icon(UI.sparkles, 16)}</span><span>TinyLittleOffice</span></a>
          ${current ? html`<a class="to-here" href=${routeHash(current.id)} title="New ${current.name}">${icon(UI[current.icon], 15)}<span>${current.name}</span></a>` : nothing}
          <span class="to-spacer"></span>
          ${current
            ? html`
                <to-meter .used=${this.payloadLength} .available=${available} .href=${this.link} .rooms=${roomFor(this.link)} @to-info=${() => this.dialog()?.show()} @to-copy=${() => this.share('copy')}></to-meter>
                ${this.sealed
                  ? nothing
                  : html`<div class="to-doc-actions">
                      <sl-dropdown hoist placement="bottom-end" @sl-select=${(e: CustomEvent) => (e.detail.item.value === 'import' ? this.querySelector<SlDialog>('#import-dialog')?.show() : this.download(e.detail.item.value))}>
                        <sl-button slot="trigger" class="icon" size="small" aria-label="Download" title="Download">${icon(UI.download, 16)}<span class="sr-only">Download</span></sl-button>
                        <sl-menu>
                          <sl-menu-label>Download</sl-menu-label>
                          ${formatsOf(appOf(current.id)!).map((f) => html`<sl-menu-item value=${f.ext}>${f.label}<code slot="suffix">.${f.ext}</code></sl-menu-item>`)}
                          <sl-divider></sl-divider>
                          <sl-menu-item value="import">${icon(UI.insert, 14, 'pre')} Import Markdown or CSV…</sl-menu-item>
                        </sl-menu>
                      </sl-dropdown>
                      <sl-dropdown hoist placement="bottom-end" @sl-select=${(e: CustomEvent) => this.share(e.detail.item.value)}>
                        <sl-button slot="trigger" class="icon" size="small" aria-label="Share" title="Share">${icon(UI.share, 16)}<span class="sr-only">Share</span></sl-button>
                        <sl-menu>
                          <sl-menu-label>Share</sl-menu-label>
                          ${'share' in navigator ? html`<sl-menu-item value="native">Share…</sl-menu-item>` : nothing}
                          <sl-menu-item value="copy">${this.def?.presents ? 'Copy link (opens presenting)' : 'Copy link'}</sl-menu-item>
                          ${this.def?.presents ? html`<sl-menu-item value="copy-edit">Copy link (opens for editing)</sl-menu-item>` : nothing}
                          <sl-menu-item value="png">Save a picture</sl-menu-item>
                          <sl-menu-item value="embed">Copy embed code</sl-menu-item>
                          <sl-menu-item value="qr">QR code</sl-menu-item>
                          <sl-divider></sl-divider>
                          <sl-menu-item value="bluesky">Bluesky</sl-menu-item>
                          <sl-menu-item value="mastodon">Mastodon</sl-menu-item>
                          <sl-menu-item value="x">X</sl-menu-item>
                          <sl-menu-item value="linkedin">LinkedIn</sl-menu-item>
                          <sl-menu-item value="email">Email</sl-menu-item>
                        </sl-menu>
                      </sl-dropdown>
                      <sl-button class="icon to-qr-btn" size="small" aria-label="QR code" title="The whole document as a QR code" @click=${() => this.querySelector<ToQrDialog>('to-qr-dialog')?.show()}>${icon(UI.qr, 16)}<span class="sr-only">QR code</span></sl-button>
                      <sl-dropdown hoist placement="bottom-end" @sl-select=${() => this.dialog()?.show()}>
                        <sl-button slot="trigger" class="icon" size="small" aria-label="Privacy" title="Privacy" variant=${this.privacy.locker || this.privacy.sig === 'valid' ? 'primary' : this.sig === 'invalid' ? 'danger' : 'default'} outline>${icon(this.privacy.locker ? UI.lock : this.privacy.sig === 'invalid' ? UI.shieldOff : this.privacy.sig === 'valid' ? UI.shield : UI.unlock, 16)}<span class="sr-only">Privacy</span></sl-button>
                        <sl-menu>
                          <sl-menu-label>Privacy</sl-menu-label>
                          <sl-menu-item value="password">${icon(UI.lock, 14, 'pre')} Password<span slot="suffix" class="to-hint">${this.privacy.locker ? 'Locked' : 'None'}</span></sl-menu-item>
                          <sl-menu-item value="signature">${icon(UI.shield, 14, 'pre')} Signature<span slot="suffix" class="to-hint">${this.privacy.sig === 'valid' ? 'Signed' : this.sig === 'invalid' ? 'Mismatch' : 'None'}</span></sl-menu-item>
                        </sl-menu>
                      </sl-dropdown>
                    </div>`}
                <sl-tooltip content="New ${current.name}" hoist>
                  <sl-button class="icon" size="small" href=${routeHash(current.id)}>${icon(UI.plus, 16)}<span class="sr-only">New ${current.name}</span></sl-button>
                </sl-tooltip>
              `
            : nothing}
        </div>
      </header>
      <sl-drawer id="nav-drawer" label="TinyLittleOffice" placement="start" style="--size: 280px" @click=${(e: Event) => (e.target as HTMLElement).closest('a') && this.drawer()?.hide()}>
        <nav class="to-drawer-nav" aria-label="Apps">
          <input class="to-find" type="search" placeholder="Find an app" aria-label="Find an app" autocomplete="off" .value=${this.find} @input=${(e: Event) => (this.find = (e.target as HTMLInputElement).value)} @keydown=${(e: KeyboardEvent) => e.key === 'Enter' && this.querySelector<HTMLElement>('.to-drawer-nav a[href]:not([hidden])')?.click()} />
          <a href="#/" aria-current=${this.app === null ? 'page' : nothing} ?hidden=${!!this.find.trim()}>${icon(UI.home, 20)}<span>Home</span></a>
          ${grouped().map((g) => {
            const want = this.find.trim().toLowerCase();
            const apps = want ? g.apps.filter((a) => a.name.toLowerCase().includes(want) || g.group.toLowerCase().includes(want)) : g.apps;
            if (!apps.length) return nothing;
            const links = apps.map((a) => html`<a class=${a.under && !want ? 'sub' : ''} href=${routeHash(a.id)} aria-current=${a.id === this.app ? 'page' : nothing}>${icon(UI[a.icon], a.under ? 17 : 20)}<span>${a.name}</span></a>`);
            // The first few apps stand on their own; the rest are clusters that fold, open where you are.
            if (!g.group) return links;
            const here = apps.some((a) => a.id === this.app);
            return html`<details class="to-cluster" ?open=${!!want || here || !this.shut.includes(g.group)} @toggle=${(e: Event) => !want && this.fold(g.group, (e.target as HTMLDetailsElement).open)}>
              <summary><h2>${g.group}</h2><span>${apps.length}</span></summary>
              ${links}
            </details>`;
          })}
        </nav>
        <sl-button slot="footer" class="to-keys" @click=${() => { this.drawer()?.hide(); this.querySelector<SlDialog>('#keys-dialog')?.show(); }}>${icon(UI.keys, 16)} Keyboard shortcuts</sl-button>
        <sl-button-group slot="footer" class="to-size" label="Size of everything">
          <sl-button title="Everything a little smaller" ?disabled=${this.size <= 0.8} @click=${() => this.resize(-0.1)}><span aria-hidden="true">A−</span><span class="sr-only">Smaller</span></sl-button>
          <sl-button title="Back to the normal size" @click=${() => this.resize(1 - this.size)}><span class="sr-only">Size: </span>${Math.round(this.size * 100)}%<span class="sr-only">. Back to normal</span></sl-button>
          <sl-button title="Everything a little larger" ?disabled=${this.size >= 2} @click=${() => this.resize(0.1)}><span aria-hidden="true">A+</span><span class="sr-only">Larger</span></sl-button>
        </sl-button-group>
        <sl-button slot="footer" class="to-theme" @click=${this.cycleTheme}>${icon(this.theme === 'auto' ? UI.auto : this.theme === 'dark' ? UI.moon : UI.sun, 16)} Theme: ${THEME_NAMES[this.theme]}</sl-button>
      </sl-drawer>
      <main class="to-main" tabindex="-1">${current ? this.renderPanel(current) : this.renderHome()}</main>
      ${this.renderDialog(available)}
      ${this.renderPrivacyPrompt()}
      ${current ? this.renderImport() : nothing}
      ${current ? html`<to-qr-dialog .link=${this.link} .name=${this.docTitle}></to-qr-dialog>` : nothing}
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
        <sl-button slot="footer" variant="primary" @click=${() => this.querySelector<SlDialog>('#keys-dialog')?.hide()}>Done</sl-button>
      </sl-dialog>
      ${this.toast ? html`<div class="to-toast" role="status">${this.toast}</div>` : nothing}
    `;
  }

  private renderPanel(current: (typeof APPS)[number]) {
    const over = this.payloadLength > budgetFor(this.urlPrefix).available;
    return html`<section class="to-panel" aria-label=${current.name}>
      <div class="to-panel-head">
        <h1 class="sr-only">${current.name}: ${this.docTitle}</h1>
        <span class="to-doc-ico" title=${current.name}>${icon(UI[current.icon], 16)}</span>
        <input class="to-title" aria-label="Title" autocomplete="off" spellcheck="false" .value=${this.env.title ?? ''} placeholder=${this.def?.title(this.env.body) || `Untitled ${current.name}`} ?disabled=${!!this.sealed} ?readonly=${this.viewing} @input=${(e: Event) => this.setTitle((e.target as HTMLInputElement).value)} @keydown=${(e: KeyboardEvent) => e.key === 'Enter' && (e.target as HTMLElement).blur()} />
        <span class="meta">
          ${this.env.created !== null ? html`<span class="when">${icon(UI.clock, 12)} ${fmtDate(this.env.created)}</span>` : nothing}
          ${this.privacy.locker || this.sealed ? html`<sl-tag size="small" pill>${icon(UI.lock, 12)} locked</sl-tag>` : nothing}
          ${this.privacy.sig === 'valid' ? html`<sl-tag size="small" variant="success" pill>${icon(UI.shield, 12)} signed</sl-tag>` : nothing}
          ${this.privacy.sig === 'invalid' ? html`<sl-tag size="small" variant="danger" pill>${icon(UI.shieldOff, 12)} signature mismatch</sl-tag>` : nothing}
          ${over ? html`<sl-tag size="small" variant="danger" pill>over limit</sl-tag>` : nothing}
          ${this.version > URL_VERSION ? html`<sl-tag size="small" variant="warning" pill>made by a newer TinyLittleOffice (v${this.version})</sl-tag>` : nothing}
        </span>
        <span class="to-spacer"></span>
        ${this.viewing ? html`<sl-button class="to-edit" size="small" variant="primary" @click=${() => (this.viewing = false)}>${icon(UI.pen, 14)} Edit</sl-button>` : nothing}
        ${this.sealed || this.viewing
          ? nothing
          : html`<sl-button-group label="Undo and redo">
              <sl-tooltip content="Undo" hoist><sl-button class="icon" size="small" aria-label="Undo" ?disabled=${!this.history.canUndo} @click=${() => this.step(true)}>${icon(UI.undo, 14)}<span class="sr-only">Undo</span></sl-button></sl-tooltip>
              <sl-tooltip content="Redo" hoist><sl-button class="icon" size="small" aria-label="Redo" ?disabled=${!this.history.canRedo} @click=${() => this.step(false)}>${icon(UI.redo, 14)}<span class="sr-only">Redo</span></sl-button></sl-tooltip>
            </sl-button-group>`}
      </div>
      <div @docchange=${this.onDocChange}>${this.sealed ? nothing : this.viewing ? this.renderView() : this.renderApp()}</div>
    </section>`;
  }

  /** The viewer of a "show" link wants the editor: from here on the link is an ordinary one. */
  private onPresentEnd() {
    this.presenting = false;
    const { app, payload } = parseHash(location.hash);
    if (app) history.replaceState(null, '', routeHash(app, payload));
  }

  /** The document as something to read: its own page if it is one, its words if it is prose, its pages otherwise. */
  private renderView() {
    const def = this.def!;
    const ctx = { created: this.env.created, base: this.root };
    if (def.document) {
      if (!this.faces) void fontsForPictures().then((faces) => (this.faces = faces || ' '));
      return html`<iframe class="to-view page" title=${this.docTitle} sandbox="allow-scripts allow-popups allow-forms" srcdoc=${def.document(this.env.body, ctx).replace('<head>', `<head><style>${this.faces}</style>`)}></iframe>`;
    }
    if (def.prose && def.html) return html`<article class="to-view prose">${unsafeHTML(def.html(this.env.body, ctx))}</article>`;
    return html`<div class="to-view pages">${def.view(this.env.body).map((p, i, all) => html`<div class="sheet">${unsafeHTML(pageSvg(p, `role="img" aria-label="${xml(this.docTitle)}${all.length > 1 ? `, page ${i + 1}` : ''}"`))}</div>`)}</div>`;
  }

  private renderApp() {
    if (!this.app) return nothing;
    // Editors load when first wanted; the element upgrades in place once its code arrives.
    void loadEditor(this.app);
    const tag = unsafeStatic(`to-${this.app}`);
    return html`<${tag} .value=${this.env.body} .present=${this.presenting} @present-end=${this.onPresentEnd}></${tag}>`;
  }

  private renderHome() {
    return html`<section class="to-home">
      <h1 class="sr-only">TinyLittleOffice</h1>
      ${this.renderLibrary()}
      ${grouped().map(
        (g) => html`${g.group ? html`<h2 class="to-group">${g.group}</h2>` : nothing}
          <div class="to-launcher">
            ${g.apps.map((a) => html`<a class=${a.under ? 'sub' : ''} href=${routeHash(a.id)}><span class="ic">${icon(UI[a.icon], 22)}</span><b>${a.name}</b></a>`)}
          </div>`,
      )}
    </section>`;
  }

  /** What this browser has kept, by folder. */
  private renderLibrary() {
    const all = folders();
    if (!saving()) return nothing;
    if (!all.length) return nothing;
    const move = (k: Kept) => {
      const to = prompt(`Folder for “${k.title}”`, k.folder);
      if (to === null) return;
      moveTo(k.id, to);
      this.requestUpdate();
    };
    return html`<section class="to-library" aria-labelledby="library-h">
      <h2 class="to-group" id="library-h">Your documents</h2>
      ${all.map(
        (f) => html`<details open>
          <summary>${icon(UI.folder, 16)} ${f.folder} <span>${f.docs.length}</span></summary>
          <ul>
            ${f.docs.map(
              (k) => html`<li>
                <a href=${k.hash}>${icon(UI[(appOf(k.app)?.icon ?? 'write') as keyof typeof UI], 16)}<b>${k.title}</b><small>${fmtDate(k.at)}</small></a>
                <button aria-label="Move ${k.title} to another folder" title="Move to a folder" @click=${() => move(k)}>${icon(UI.folder, 15)}</button>
                <button aria-label="Remove ${k.title} from this device" title="Remove from this device" @click=${() => { forget(k.id); this.requestUpdate(); }}>${icon(UI.trash, 15)}</button>
              </li>`,
            )}
          </ul>
        </details>`,
      )}
      <p class="to-hint">These are saved only on this device, in this browser. They are not on any server and will not be on your other devices; a link is the only way to carry one across. Once opened, TinyLittleOffice works without a connection.</p>
      <sl-button size="small" variant="danger" outline @click=${() => { if (confirm('Erase every document kept on this device? Any you have the link for can be opened again.')) { forgetAll(); this.requestUpdate(); } }}>${icon(UI.trash, 14)} Erase all</sl-button>
    </section>`;
  }

  /** Paste Markdown (or pick a .md file) and it becomes this document, read the way this kind of document reads. */
  @state() private importText = '';
  private renderImport() {
    const apply = () => {
      if (!this.def || !this.importText.trim()) return;
      const body = fromMarkdown(this.def, this.importText);
      this.history.record(this.env.body);
      this.env = { ...this.env, created: this.env.created ?? quantizeCreated(Date.now()), body };
      this.importText = '';
      void this.writeUrl();
      this.querySelector<SlDialog>('#import-dialog')?.hide();
      this.showToast('Imported');
    };
    const pick = async (e: Event) => {
      const file = (e.target as HTMLInputElement).files?.[0];
      if (file) this.importText = await file.text();
    };
    return html`<sl-dialog id="import-dialog" label="Import Markdown or CSV" class="to-import">
      <p class="to-hint">Paste Markdown or CSV, or choose a file. Headings, lists, tables, checkboxes and rows of cells are read the way this kind of document reads them; it replaces what is here (undo brings it back).</p>
      <textarea aria-label="Markdown or CSV" placeholder="# Title&#10;&#10;- one thing&#10;- another&#10;&#10;or: Item, Cost&#10;Rent, 1200" .value=${this.importText} @input=${(e: Event) => (this.importText = (e.target as HTMLTextAreaElement).value)}></textarea>
      <div class="row">
        <input type="file" accept=".md,.markdown,.txt,.csv,.tsv,text/markdown,text/plain,text/csv,text/tab-separated-values" aria-label="A Markdown or CSV file" @change=${pick} />
        <span class="to-spacer"></span>
        <sl-button variant="primary" ?disabled=${!this.importText.trim()} @click=${apply}>${icon(UI.insert, 14)} Import</sl-button>
      </div>
    </sl-dialog>`;
  }

  /** The privacy widget: one element, drawn in the dialog; its prompt for a sealed link drawn beside the dialogs. */
  private renderPrivacy() {
    return html`<to-privacy .privacy=${this.privacy} .env=${this.env} .app=${this.app} .sealed=${this.sealed} @privacy-env=${this.onPrivacyEnv} @privacy-lock=${() => this.writeUrl()} @privacy-device=${this.onDevice} @privacy-note=${(e: CustomEvent<string>) => this.showToast(e.detail)}></to-privacy>`;
  }
  private renderPrivacyPrompt() {
    return html`<to-privacy-prompt .privacy=${this.privacy} .env=${this.env} .app=${this.app} .sealed=${this.sealed} @privacy-env=${this.onPrivacyEnv}></to-privacy-prompt>`;
  }

  private renderDialog(available: number) {
    const left = available - this.payloadLength;
    const created = this.env.created;
    return html`<sl-dialog id="doc-dialog" label="This document" class="to-doc">
      <h3>${icon(UI.info, 14)} About</h3>
      <dl>
        <dt>Made</dt>
        <dd>${created !== null ? html`${fmtDate(created)} <span class="to-hint">${fmtUtc(created)}</span>` : '—'}</dd>
        <dt>Link</dt>
        <dd>${this.payloadLength.toLocaleString()} / ${available.toLocaleString()} <span class="to-hint">v${this.version}</span> ${left < 0 ? html`<sl-tag size="small" variant="danger" pill>${(-left).toLocaleString()} over</sl-tag>` : nothing}</dd>
        <dt>Download</dt>
        <dd>
          <div class="row">
            ${this.def
              ? formatsOf(this.def).map(
                  (f) => html`<span class="to-dl">
                    <sl-button size="small" @click=${() => this.download(f.ext)}>.${f.ext}</sl-button>
                    <button class="to-copy" type="button" aria-label="Copy a link that downloads the .${f.ext}" title="Copy a link that downloads the .${f.ext}" @click=${() => navigator.clipboard.writeText(this.linkTo(f.ext)).then(() => this.showToast('Link copied'), () => this.showToast('Copy failed'))}>${icon(UI.copy, 14)}</button>
                  </span>`,
                )
              : nothing}
          </div>
        </dd>
      </dl>
      <h3>${icon(UI.send, 14)} Where the link fits</h3>
      ${roomsTable(roomFor(this.link))}
      ${this.renderPrivacy()}
      <sl-button slot="footer" variant="primary" @click=${() => this.dialog()?.hide()}>Done</sl-button>
    </sl-dialog>`;
  }
}

declare global {
  interface HTMLElementTagNameMap {
    'to-app': ToApp;
  }
}
