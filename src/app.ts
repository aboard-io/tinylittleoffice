/**
 * <to-app>: the shell. Owns the URL. Routes "#/v1/<app>/<payload>" to a mini
 * app, hands it the decoded document body, and writes every change back into
 * the URL via history.replaceState. Also owns the envelope around the body
 * (creation time, optional signature) and optional password encryption.
 *
 * "#/v1/<app>.<ext>/<payload>" is a download view: arriving at it saves the
 * document as that kind of file (see lib/exports.ts).
 */
import { LitElement, html, nothing } from 'lit';
import { customElement, state } from 'lit/decorators.js';
import { budgetFor, toBase64Url, fromBase64Url } from './lib/codec.ts';
import { packEnvelope, unpackEnvelope, signingMessage, quantizeCreated, type Envelope } from './lib/envelope.ts';
import { createSigner, localStorageStore, verify, fingerprintOf, type Signer } from './lib/sign.ts';
import { isSealed, newLocker, seal, unseal, type Locker } from './lib/crypt.ts';
import { icon, iconInner, LIBRARY, UI } from './lib/icons.ts';
import { EXPORTS, cardSvg, exportName, findExport, titleOf, type ExportContext } from './lib/exports.ts';
import { roomFor } from './lib/limits.ts';
import { ICON_SVG } from './apps/anim.ts';
import { parseDeck } from './lib/deckmodel.ts';
import type { SlDialog, SlDrawer, SlInput } from './lib/shoelace.ts';

export type AppId = 'sheet' | 'write' | 'deck' | 'draw' | 'cal' | 'todo' | 'board' | 'gantt' | 'trip' | 'tune' | 'anim';

export const APPS: { id: AppId; name: string; icon: keyof typeof UI }[] = [
  { id: 'sheet', name: 'Sheet', icon: 'sheet' },
  { id: 'write', name: 'Write', icon: 'write' },
  { id: 'deck', name: 'Deck', icon: 'deck' },
  { id: 'draw', name: 'Draw', icon: 'draw' },
  { id: 'cal', name: 'Calendar', icon: 'cal' },
  { id: 'todo', name: 'Todo', icon: 'todo' },
  { id: 'board', name: 'Board', icon: 'board' },
  { id: 'gantt', name: 'Gantt', icon: 'gantt' },
  { id: 'trip', name: 'Trip', icon: 'trip' },
  { id: 'tune', name: 'Tune', icon: 'tune' },
  { id: 'anim', name: 'Motion', icon: 'anim' },
];

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

/** Rasterise SVG markup, for file formats and share sheets that cannot take SVG. */
async function svgToPng(src: string, width: number, height: number): Promise<Uint8Array | null> {
  const img = new Image();
  img.src = 'data:image/svg+xml;charset=utf-8,' + encodeURIComponent(src);
  try {
    await img.decode();
    const canvas = document.createElement('canvas');
    canvas.width = width;
    canvas.height = height;
    canvas.getContext('2d')!.drawImage(img, 0, 0, width, height);
    const blob = await new Promise<Blob | null>((done) => canvas.toBlob(done, 'image/png'));
    return blob ? new Uint8Array(await blob.arrayBuffer()) : null;
  } catch {
    return null;
  }
}

function iconPng(name: string, size = 256, color = '#4f46e5'): Promise<Uint8Array | null> {
  const node = LIBRARY[name];
  if (!node) return Promise.resolve(null);
  return svgToPng(`<svg xmlns="http://www.w3.org/2000/svg" width="${size}" height="${size}" viewBox="0 0 24 24" fill="none" stroke="${color}" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">${iconInner(node)}</svg>`, size, size);
}

function saveFile(name: string, mime: string, data: Uint8Array) {
  const url = URL.createObjectURL(new Blob([data as BlobPart], { type: mime }));
  const a = document.createElement('a');
  a.href = url;
  a.download = name;
  document.body.append(a);
  a.click();
  a.remove();
  setTimeout(() => URL.revokeObjectURL(url), 10_000);
}

const fmtDate = (ms: number) => new Intl.DateTimeFormat(undefined, { dateStyle: 'medium', timeStyle: 'short' }).format(ms);
const fmtUtc = (ms: number) => new Date(ms).toISOString().slice(0, 16).replace('T', ' ') + ' UTC';

@customElement('to-app')
export class ToApp extends LitElement {
  @state() private app: AppId | null = null;
  @state() private env: Envelope = { created: null, body: '' };
  @state() private payloadLength = 0;
  @state() private sig: SigState = 'none';
  @state() private signer: string | null = null;
  @state() private myKey: string | null = null;
  @state() private keyText = '';
  @state() private keyMode: 'none' | 'export' | 'import' = 'none';
  @state() private toast = '';
  @state() private busy = false;
  // Password protection: `sealed` holds a payload waiting for its password.
  @state() private locker: Locker | null = null;
  @state() private sealed = '';
  @state() private pw = '';
  @state() private pwError = false;
  @state() private pwBusy = false;
  @state() private version = URL_VERSION;
  @state() private theme: Theme = storedTheme();
  /** A download view waiting for its document (it may need a password first). */
  private pendingExt = '';
  private toastTimer = 0;
  private signerApi: Signer = createSigner(localStorageStore());
  private verifyRun = 0;
  private writeRun = 0;

  createRenderRoot() {
    return this;
  }

  connectedCallback() {
    super.connectedCallback();
    window.addEventListener('hashchange', this.onHash);
    this.onHash();
    this.signerApi.fingerprint().then((f) => (this.myKey = f));
  }
  disconnectedCallback() {
    super.disconnectedCallback();
    window.removeEventListener('hashchange', this.onHash);
  }

  private onHash = () => {
    const { app, payload, version, ext } = parseHash(location.hash);
    this.app = app;
    this.version = version;
    this.pendingExt = ext;
    this.locker = null;
    this.pw = '';
    this.pwError = false;
    this.payloadLength = payload.length;
    if (isSealed(payload)) {
      this.sealed = payload;
      this.env = { created: null, body: '' };
      this.sig = 'none';
      this.updateComplete.then(() => this.querySelector<SlInput>('#pw-input')?.focus());
      return;
    }
    this.sealed = '';
    this.env = this.decode(payload);
    this.checkSignature();
    this.downloadPending();
  };

  private decode(payload: string): Envelope {
    if (!payload) return { created: null, body: '' };
    try {
      return unpackEnvelope(payload[0], fromBase64Url(payload.slice(1)));
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
    const empty = !this.env.body && this.env.created === null && !this.env.key;
    let payload = '';
    if (!empty) {
      const { flag, bytes } = packEnvelope(this.env);
      payload = this.locker ? await seal(this.locker, flag, bytes) : flag + toBase64Url(bytes);
      if (run !== this.writeRun) return;
    }
    this.payloadLength = payload.length;
    this.version = URL_VERSION;
    history.replaceState(null, '', routeHash(this.app, payload) + (payload ? '' : '/'));
  }

  /* ---------- download views ---------- */

  private downloadPending() {
    const ext = this.pendingExt;
    this.pendingExt = '';
    if (ext) this.download(ext);
  }

  /** The link that downloads this document as `ext` when opened. */
  private downloadUrl(ext: string): string {
    const { payload } = parseHash(location.hash);
    return `${location.origin}${location.pathname}${location.search}${routeHash(this.app!, payload, ext)}`;
  }

  private async download(ext: string) {
    const app = this.app;
    if (!app) return;
    const body = this.env.body;
    if (ext.toLowerCase() === 'png') {
      // Every app has a picture view: the card a link preview would show.
      const png = await svgToPng(cardSvg(app, body), 1200, 630);
      if (!png) return this.showToast('Could not draw the picture');
      const name = exportName(app, body, 'png');
      saveFile(name, 'image/png', png);
      return this.showToast(`Downloaded ${name}`);
    }
    const fmt = findExport(app, ext);
    if (!fmt) return this.showToast(`No .${ext} view here`);
    const ctx: ExportContext = { created: this.env.created, icons: {}, iconSvg: ICON_SVG, base: `${location.origin}${location.pathname}` };
    if (app === 'deck') {
      for (const name of new Set(parseDeck(body).map((s) => s.icon))) {
        const png = name ? await iconPng(name) : null;
        if (png) ctx.icons![name] = png;
      }
    }
    const name = exportName(app, body, fmt.ext);
    saveFile(name, fmt.mime, fmt.build(body, ctx));
    this.showToast(`Downloaded ${name}`);
  }

  /* ---------- sharing ---------- */

  private get docTitle(): string {
    const name = APPS.find((a) => a.id === this.app)?.name ?? 'TinyOffice';
    return (this.app && titleOf(this.app, this.env.body)) || name;
  }

  /**
   * Sharing without a server. The document is in the fragment, which no
   * crawler ever sees, so a link preview can only be the site's own card.
   * What we can do from here: hand the link (and a picture of the document)
   * to the device's share sheet, or open a service's compose box with the
   * link already in it.
   */
  private async share(how: string) {
    const url = location.href;
    const title = this.docTitle;
    const q = encodeURIComponent;
    if (how === 'native') {
      const data: ShareData = { title, text: title, url };
      const png = this.app ? await svgToPng(cardSvg(this.app, this.env.body), 1200, 630) : null;
      if (png) {
        const file = new File([png as BlobPart], exportName(this.app!, this.env.body, 'png'), { type: 'image/png' });
        if (navigator.canShare?.({ files: [file] })) data.files = [file];
      }
      try {
        await navigator.share(data);
      } catch {
        /* dismissed */
      }
      return;
    }
    if (how === 'copy') {
      await navigator.clipboard.writeText(url).then(() => this.showToast('Link copied'), () => this.showToast('Copy failed'));
      return;
    }
    if (how === 'png') return void this.download('png');
    const to: Record<string, string> = {
      bluesky: `https://bsky.app/intent/compose?text=${q(`${title} ${url}`)}`,
      mastodon: `https://mastodonshare.com/?text=${q(title)}&url=${q(url)}`,
      x: `https://twitter.com/intent/tweet?text=${q(title)}&url=${q(url)}`,
      linkedin: `https://www.linkedin.com/sharing/share-offsite/?url=${q(url)}`,
      email: `mailto:?subject=${q(title)}&body=${q(url)}`,
    };
    if (to[how]) window.open(to[how], '_blank', 'noopener');
  }

  private cycleTheme() {
    this.theme = THEMES[(THEMES.indexOf(this.theme) + 1) % THEMES.length];
    applyTheme(this.theme);
    this.showToast(THEME_NAMES[this.theme]);
  }

  protected updated() {
    const title = this.app ? `${this.docTitle} · TinyOffice` : 'TinyOffice';
    if (document.title !== title) document.title = title;
  }

  private onDocChange(e: CustomEvent<string>) {
    if (!this.app) return;
    const body = e.detail;
    const created = this.env.created ?? (body ? quantizeCreated(Date.now()) : null);
    this.env = { ...this.env, created, body };
    this.writeUrl();
    this.checkSignature();
  }

  /* ---------- password ---------- */

  private async unlock() {
    if (!this.sealed || this.pwBusy) return;
    this.pwBusy = true;
    try {
      const r = await unseal(this.pw, this.sealed);
      if (!r) {
        this.pwError = true;
        return;
      }
      this.locker = r.locker;
      this.env = unpackEnvelope(r.flag, r.bytes);
      this.sealed = '';
      this.pw = '';
      this.pwError = false;
      this.checkSignature();
      this.downloadPending();
    } finally {
      this.pwBusy = false;
    }
  }

  private async setPassword() {
    if (!this.pw || this.pwBusy) return;
    this.pwBusy = true;
    try {
      this.locker = await newLocker(this.pw);
      this.pw = '';
      await this.writeUrl();
    } finally {
      this.pwBusy = false;
    }
  }

  private removePassword() {
    this.locker = null;
    this.writeUrl();
  }

  /* ---------- signing ---------- */

  private async checkSignature() {
    const run = ++this.verifyRun;
    const { key, sig } = this.env;
    if (!key || !sig || !this.app) {
      this.sig = 'none';
      this.signer = null;
      return;
    }
    this.sig = 'checking';
    const [ok, fp] = await Promise.all([verify(key, sig, signingMessage(this.app, this.env.created, this.env.body)), fingerprintOf(key)]);
    if (run !== this.verifyRun) return;
    this.sig = ok ? 'valid' : 'invalid';
    this.signer = fp;
  }

  private async sign() {
    if (!this.app) return;
    this.busy = true;
    try {
      const created = this.env.created ?? quantizeCreated(Date.now());
      const { key, sig } = await this.signerApi.sign(signingMessage(this.app, created, this.env.body));
      this.env = { ...this.env, created, key, sig };
      this.myKey = await this.signerApi.fingerprint();
      await this.writeUrl();
      await this.checkSignature();
      this.showToast('Signed');
    } catch (err) {
      this.showToast(err instanceof Error ? err.message : String(err));
    } finally {
      this.busy = false;
    }
  }

  private unsign() {
    const { key: _k, sig: _s, ...rest } = this.env;
    this.env = rest;
    this.writeUrl();
    this.checkSignature();
  }

  private async exportKey() {
    this.keyText = await this.signerApi.exportKey();
    this.keyMode = 'export';
    this.myKey = await this.signerApi.fingerprint();
    try {
      await navigator.clipboard.writeText(this.keyText);
      this.showToast('Key copied');
    } catch {
      /* the textarea shows it anyway */
    }
  }

  private async importKey() {
    try {
      this.myKey = await this.signerApi.importKey(this.keyText.trim());
      this.keyMode = 'none';
      this.keyText = '';
      this.showToast('Key imported');
    } catch (err) {
      this.showToast(err instanceof Error ? err.message : 'Invalid key');
    }
  }

  private forgetKey() {
    if (!confirm('Forget this key?')) return;
    this.signerApi.forget();
    this.myKey = null;
    this.keyMode = 'none';
    this.keyText = '';
  }

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

  render() {
    const current = APPS.find((a) => a.id === this.app);
    const { available } = budgetFor(this.urlPrefix);
    return html`
      <header class="to-header">
        <div class="to-header-inner">
          <sl-button class="to-burger icon" variant="text" size="medium" aria-label="Menu" @click=${() => this.drawer()?.show()}>${icon(UI.menu, 22)}<span class="sr-only">Menu</span></sl-button>
          <a class="to-brand" href="#/"><span class="mark">${icon(UI.sparkles, 16)}</span><span>TinyOffice</span></a>
          ${current ? html`<a class="to-here" href=${routeHash(current.id)} title="New ${current.name}">${icon(UI[current.icon], 15)}<span>${current.name}</span></a>` : nothing}
          <span class="to-spacer"></span>
          ${current
            ? html`
                <to-meter .used=${this.payloadLength} .available=${available} .href=${location.href} .rooms=${roomFor(location.href)} @to-info=${() => this.dialog()?.show()}></to-meter>
                ${this.sealed
                  ? nothing
                  : html`<div class="to-doc-actions">
                      <sl-dropdown hoist placement="bottom-end" @sl-select=${(e: CustomEvent) => this.download(e.detail.item.value)}>
                        <sl-button slot="trigger" class="icon" size="small" aria-label="Download" title="Download">${icon(UI.download, 16)}<span class="sr-only">Download</span></sl-button>
                        <sl-menu>
                          <sl-menu-label>Download</sl-menu-label>
                          ${EXPORTS[current.id].map((f) => html`<sl-menu-item value=${f.ext}>${f.label}<code slot="suffix">.${f.ext}</code></sl-menu-item>`)}
                          <sl-menu-item value="png">Picture<code slot="suffix">.png</code></sl-menu-item>
                        </sl-menu>
                      </sl-dropdown>
                      <sl-dropdown hoist placement="bottom-end" @sl-select=${(e: CustomEvent) => this.share(e.detail.item.value)}>
                        <sl-button slot="trigger" class="icon" size="small" aria-label="Share" title="Share">${icon(UI.share, 16)}<span class="sr-only">Share</span></sl-button>
                        <sl-menu>
                          <sl-menu-label>Share</sl-menu-label>
                          ${'share' in navigator ? html`<sl-menu-item value="native">Share…</sl-menu-item>` : nothing}
                          <sl-menu-item value="copy">Copy link</sl-menu-item>
                          <sl-menu-item value="png">Save a picture</sl-menu-item>
                          <sl-divider></sl-divider>
                          <sl-menu-item value="bluesky">Bluesky</sl-menu-item>
                          <sl-menu-item value="mastodon">Mastodon</sl-menu-item>
                          <sl-menu-item value="x">X</sl-menu-item>
                          <sl-menu-item value="linkedin">LinkedIn</sl-menu-item>
                          <sl-menu-item value="email">Email</sl-menu-item>
                        </sl-menu>
                      </sl-dropdown>
                      <sl-dropdown hoist placement="bottom-end" @sl-select=${() => this.dialog()?.show()}>
                        <sl-button slot="trigger" class="icon" size="small" aria-label="Privacy" title="Privacy" variant=${this.locker || this.sig === 'valid' ? 'primary' : this.sig === 'invalid' ? 'danger' : 'default'} outline>${icon(this.locker ? UI.lock : this.sig === 'invalid' ? UI.shieldOff : this.sig === 'valid' ? UI.shield : UI.unlock, 16)}<span class="sr-only">Privacy</span></sl-button>
                        <sl-menu>
                          <sl-menu-label>Privacy</sl-menu-label>
                          <sl-menu-item value="password">${icon(UI.lock, 14, 'pre')} Password<span slot="suffix" class="to-hint">${this.locker ? 'Locked' : 'None'}</span></sl-menu-item>
                          <sl-menu-item value="signature">${icon(UI.shield, 14, 'pre')} Signature<span slot="suffix" class="to-hint">${this.sig === 'valid' ? 'Signed' : this.sig === 'invalid' ? 'Mismatch' : 'None'}</span></sl-menu-item>
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
      <sl-drawer id="nav-drawer" label="TinyOffice" placement="start" style="--size: 280px" @click=${(e: Event) => (e.target as HTMLElement).closest('a') && this.drawer()?.hide()}>
        <nav class="to-drawer-nav" aria-label="Apps">
          <a href="#/" aria-current=${this.app === null ? 'page' : nothing}>${icon(UI.home, 20)}<span>Home</span></a>
          ${APPS.map((a) => html`<a href=${routeHash(a.id)} aria-current=${a.id === this.app ? 'page' : nothing}>${icon(UI[a.icon], 20)}<span>${a.name}</span></a>`)}
        </nav>
        <sl-button slot="footer" class="to-theme" @click=${this.cycleTheme}>${icon(this.theme === 'auto' ? UI.auto : this.theme === 'dark' ? UI.moon : UI.sun, 16)} Theme: ${THEME_NAMES[this.theme]}</sl-button>
      </sl-drawer>
      <main class="to-main">${current ? this.renderPanel(current) : this.renderHome()}</main>
      ${this.renderDialog(available)}
      ${this.renderPasswordPrompt()}
      ${this.toast ? html`<div class="to-toast" role="status">${this.toast}</div>` : nothing}
    `;
  }

  private renderPanel(current: (typeof APPS)[number]) {
    const over = this.payloadLength > budgetFor(this.urlPrefix).available;
    return html`<section class="to-panel" aria-label=${current.name}>
      <div class="to-panel-head">
        <h1>${icon(UI[current.icon], 16)} ${current.name}</h1>
        <span class="meta">
          ${this.env.created !== null ? html`<span class="when">${icon(UI.clock, 12)} ${fmtDate(this.env.created)}</span>` : nothing}
          ${this.locker || this.sealed ? html`<sl-tag size="small" pill>${icon(UI.lock, 12)} locked</sl-tag>` : nothing}
          ${this.sig === 'valid' ? html`<sl-tag size="small" variant="success" pill>${icon(UI.shield, 12)} signed</sl-tag>` : nothing}
          ${this.sig === 'invalid' ? html`<sl-tag size="small" variant="danger" pill>${icon(UI.shieldOff, 12)} signature mismatch</sl-tag>` : nothing}
          ${over ? html`<sl-tag size="small" variant="danger" pill>over limit</sl-tag>` : nothing}
          ${this.version > URL_VERSION ? html`<sl-tag size="small" variant="warning" pill>made by a newer TinyOffice (v${this.version})</sl-tag>` : nothing}
        </span>
      </div>
      <div @docchange=${this.onDocChange}>${this.sealed ? nothing : this.renderApp()}</div>
    </section>`;
  }

  private renderApp() {
    const v = this.env.body;
    switch (this.app) {
      case 'sheet':
        return html`<to-sheet .value=${v}></to-sheet>`;
      case 'write':
        return html`<to-write .value=${v}></to-write>`;
      case 'deck':
        return html`<to-deck .value=${v}></to-deck>`;
      case 'draw':
        return html`<to-draw .value=${v}></to-draw>`;
      case 'cal':
        return html`<to-cal .value=${v}></to-cal>`;
      case 'todo':
        return html`<to-todo .value=${v}></to-todo>`;
      case 'board':
        return html`<to-board .value=${v}></to-board>`;
      case 'gantt':
        return html`<to-gantt .value=${v}></to-gantt>`;
      case 'trip':
        // The map library is big and only this app needs it, so it loads on demand.
        void import('./apps/trip.ts');
        return html`<to-trip .value=${v}></to-trip>`;
      case 'tune':
        return html`<to-tune .value=${v}></to-tune>`;
      case 'anim':
        return html`<to-anim .value=${v}></to-anim>`;
    }
    return nothing;
  }

  private renderHome() {
    return html`<section class="to-home">
      <h1 class="sr-only">TinyOffice</h1>
      <div class="to-launcher">
        ${APPS.map((a) => html`<a href=${routeHash(a.id)}><span class="ic">${icon(UI[a.icon], 22)}</span><b>${a.name}</b></a>`)}
      </div>
    </section>`;
  }

  private renderPasswordPrompt() {
    return html`<sl-dialog id="pw-dialog" label="Password" ?open=${!!this.sealed} @sl-request-close=${(e: Event) => this.sealed && e.preventDefault()}>
      <div class="to-doc">
        <div class="row">
          <sl-input
            id="pw-input"
            class="sr-label"
            type="password"
            label="Password"
            password-toggle
            autofocus
            .value=${this.pw}
            @sl-input=${(e: Event) => {
              this.pw = (e.target as SlInput).value;
              this.pwError = false;
            }}
            @keydown=${(e: KeyboardEvent) => e.key === 'Enter' && this.unlock()}
          ></sl-input>
          <sl-button variant="primary" ?loading=${this.pwBusy} @click=${this.unlock}>${icon(UI.unlock, 14)} Open</sl-button>
        </div>
        ${this.pwError ? html`<sl-tag size="small" variant="danger" pill style="margin-top:8px">Wrong password</sl-tag>` : nothing}
      </div>
    </sl-dialog>`;
  }

  private renderDialog(available: number) {
    const left = available - this.payloadLength;
    const created = this.env.created;
    return html`<sl-dialog id="doc-dialog" label="Document" class="to-doc">
      <dl>
        <dt title="Created">${icon(UI.clock, 14)}</dt>
        <dd>${created !== null ? html`${fmtDate(created)} <span class="to-hint">${fmtUtc(created)}</span>` : '—'}</dd>
        <dt title="URL space">${icon(UI.link, 14)}</dt>
        <dd>${this.payloadLength.toLocaleString()} / ${available.toLocaleString()} <span class="to-hint">v${this.version}</span> ${left < 0 ? html`<sl-tag size="small" variant="danger" pill>${(-left).toLocaleString()} over</sl-tag>` : nothing}</dd>
        <dt title="Download">${icon(UI.download, 14)}</dt>
        <dd>
          <div class="row">
            ${this.app
              ? EXPORTS[this.app].map(
                  (f) => html`<span class="to-dl">
                    <sl-button size="small" @click=${() => this.download(f.ext)}>.${f.ext}</sl-button>
                    <sl-copy-button value=${this.downloadUrl(f.ext)} copy-label="Copy a link that downloads the .${f.ext}" success-label="Copied" hoist></sl-copy-button>
                  </span>`,
                )
              : nothing}
          </div>
        </dd>
        <dt title="Room for this link">${icon(UI.send, 14)}</dt>
        <dd>
          <table class="to-rooms">
            ${roomFor(location.href).map((r) => html`<tr class=${r.left < 0 ? 'over' : ''}><th>${r.target.name}</th><td>${r.left < 0 ? `${(-r.left).toLocaleString()} over` : `${r.left.toLocaleString()} left`}</td><td class="to-hint">of ${r.target.max.toLocaleString()} · ${r.target.note}</td></tr>`)}
          </table>
        </dd>
        <dt title="Password">${icon(UI.lock, 14)}</dt>
        <dd>
          ${this.locker
            ? html`<div class="row"><sl-tag size="small" variant="success" pill>Locked</sl-tag><sl-button size="small" @click=${this.removePassword}>${icon(UI.unlock, 14)} Remove</sl-button></div>`
            : html`<div class="row">
                <sl-input
                  class="sr-label"
                  size="small"
                  type="password"
                  label="New password"
                  placeholder="Password"
                  password-toggle
                  .value=${this.pw}
                  @sl-input=${(e: Event) => (this.pw = (e.target as SlInput).value)}
                  @keydown=${(e: KeyboardEvent) => e.key === 'Enter' && this.setPassword()}
                ></sl-input>
                <sl-button size="small" ?loading=${this.pwBusy} ?disabled=${!this.pw} @click=${this.setPassword}>${icon(UI.lock, 14)} Lock</sl-button>
              </div>`}
        </dd>
        <dt title="Signature">${icon(UI.shield, 14)}</dt>
        <dd>
          <div class="row">
            ${this.sig === 'none' ? html`<sl-tag size="small" pill>Unsigned</sl-tag>` : nothing}
            ${this.sig === 'checking' ? html`<sl-tag size="small" pill>…</sl-tag>` : nothing}
            ${this.sig === 'valid' ? html`<sl-tag size="small" variant="success" pill>Valid</sl-tag> <code>${this.signer}</code>${this.signer && this.signer === this.myKey ? html` <sl-tag size="small" pill>this browser</sl-tag>` : nothing}` : nothing}
            ${this.sig === 'invalid' ? html`<sl-tag size="small" variant="danger" pill>Mismatch</sl-tag> <code>${this.signer}</code>` : nothing}
            ${this.sig !== 'valid'
              ? html`<sl-button size="small" variant="primary" ?loading=${this.busy} ?disabled=${!this.env.body} @click=${this.sign}>${icon(UI.shield, 14)} ${this.sig === 'invalid' ? 'Re-sign' : 'Sign'}</sl-button>`
              : nothing}
            ${this.env.sig ? html`<sl-button size="small" @click=${this.unsign}>Remove</sl-button>` : nothing}
          </div>
        </dd>
        <dt title="Signing key">${icon(UI.key, 14)}</dt>
        <dd>
          <div class="row">
            ${this.myKey ? html`<code>${this.myKey}</code>` : html`<span class="to-hint">—</span>`}
            <sl-button size="small" @click=${this.exportKey}>Export</sl-button>
            <sl-button size="small" @click=${() => { this.keyMode = 'import'; this.keyText = ''; }}>Import</sl-button>
            ${this.myKey ? html`<sl-button size="small" variant="text" @click=${this.forgetKey}>Forget</sl-button>` : nothing}
          </div>
          ${this.keyMode !== 'none'
            ? html`<textarea aria-label="Key" placeholder="Key" .value=${this.keyText} ?readonly=${this.keyMode === 'export'} @input=${(e: Event) => (this.keyText = (e.target as HTMLTextAreaElement).value)}></textarea>
                ${this.keyMode === 'import' ? html`<div class="row" style="margin-top:8px"><sl-button size="small" variant="primary" @click=${this.importKey}>Use key</sl-button></div>` : nothing}`
            : nothing}
        </dd>
      </dl>
      <sl-button slot="footer" variant="primary" @click=${() => this.dialog()?.hide()}>Done</sl-button>
    </sl-dialog>`;
  }
}

declare global {
  interface HTMLElementTagNameMap {
    'to-app': ToApp;
  }
}
