/**
 * <to-app>: the shell. Owns the URL. Routes "#/<app>/<payload>" to a mini
 * app, hands it the decoded document body, and writes every change back into
 * the URL via history.replaceState. Also owns the envelope around the body:
 * creation time and an optional signature.
 */
import { LitElement, html, nothing } from 'lit';
import { customElement, state } from 'lit/decorators.js';
import { budgetFor, URL_LIMIT } from './lib/codec.ts';
import { encodeEnvelope, decodeEnvelope, signingMessage, quantizeCreated, type Envelope } from './lib/envelope.ts';
import { createSigner, localStorageStore, verify, fingerprintOf, type Signer } from './lib/sign.ts';
import { icon, UI } from './lib/icons.ts';
import type { SlDialog, SlDrawer } from './lib/shoelace.ts';

export type AppId = 'sheet' | 'write' | 'deck' | 'draw' | 'cal';

export const APPS: { id: AppId; name: string; blurb: string; icon: keyof typeof UI }[] = [
  { id: 'sheet', name: 'Sheet', blurb: '20 rows, 3 columns, formulas.', icon: 'sheet' },
  { id: 'write', name: 'Write', blurb: 'A rich-text page.', icon: 'write' },
  { id: 'deck', name: 'Deck', blurb: 'Up to ten slides with icons.', icon: 'deck' },
  { id: 'draw', name: 'Draw', blurb: 'Boxes, arrows and labels.', icon: 'draw' },
  { id: 'cal', name: 'Calendar', blurb: 'Spans of time, in any zone.', icon: 'cal' },
];

type SigState = 'none' | 'checking' | 'valid' | 'invalid';

export function parseHash(hash: string): { app: AppId | null; payload: string } {
  const m = /^#\/(sheet|write|deck|draw|cal)(?:\/(.*))?$/.exec(hash);
  if (!m) return { app: null, payload: '' };
  return { app: m[1] as AppId, payload: m[2] ?? '' };
}

const fmtDate = (ms: number) => new Intl.DateTimeFormat(undefined, { dateStyle: 'medium', timeStyle: 'short' }).format(ms);
const fmtUtc = (ms: number) => new Date(ms).toISOString().slice(0, 16).replace('T', ' ') + ' UTC';

@customElement('to-app')
export class ToApp extends LitElement {
  @state() private app: AppId | null = null;
  @state() private env: Envelope = { created: null, body: '' };
  @state() private payloadLength = 0;
  @state() private sig: SigState = 'none';
  @state() private signer: string | null = null; // fingerprint of the signing key in the URL
  @state() private myKey: string | null = null; // fingerprint of this browser's key
  @state() private keyText = '';
  @state() private keyMode: 'none' | 'export' | 'import' = 'none';
  @state() private toast = '';
  @state() private busy = false;
  private toastTimer = 0;
  private signerApi: Signer = createSigner(localStorageStore());
  private verifyRun = 0;

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
    const { app, payload } = parseHash(location.hash);
    this.app = app;
    this.env = decodeEnvelope(payload);
    this.payloadLength = payload.length;
    this.checkSignature();
  };

  private get urlPrefix(): string {
    return `${location.origin}${location.pathname}${location.search}#/${this.app}/`;
  }

  private writeUrl() {
    if (!this.app) return;
    const payload = encodeEnvelope(this.env);
    this.payloadLength = payload.length;
    history.replaceState(null, '', `#/${this.app}/${payload}`);
  }

  private onDocChange(e: CustomEvent<string>) {
    if (!this.app) return;
    const body = e.detail;
    const created = this.env.created ?? (body ? quantizeCreated(Date.now()) : null);
    this.env = { ...this.env, created, body };
    this.writeUrl();
    this.checkSignature();
  }

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
      this.writeUrl();
      await this.checkSignature();
      this.showToast('Signed. The signature travels in the link.');
    } catch (err) {
      this.showToast('Signing failed: ' + (err instanceof Error ? err.message : String(err)));
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
      this.showToast('Key copied to the clipboard. Keep it private.');
    } catch {
      /* the textarea shows it anyway */
    }
  }

  private async importKey() {
    try {
      this.myKey = await this.signerApi.importKey(this.keyText.trim());
      this.keyMode = 'none';
      this.keyText = '';
      this.showToast('Key imported.');
    } catch (err) {
      this.showToast(err instanceof Error ? err.message : 'Could not import that key.');
    }
  }

  private forgetKey() {
    if (!confirm('Forget this browser’s signing key? Documents it signed stay valid, but you will not be able to sign as it again unless you import the exported key.')) return;
    this.signerApi.forget();
    this.myKey = null;
    this.keyMode = 'none';
    this.keyText = '';
  }

  private showToast(msg: string) {
    this.toast = msg;
    clearTimeout(this.toastTimer);
    this.toastTimer = window.setTimeout(() => (this.toast = ''), 2600);
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
          <nav class="to-nav" aria-label="Apps">
            ${APPS.map((a) => html`<a href="#/${a.id}" aria-current=${a.id === this.app ? 'page' : nothing}>${icon(UI[a.icon], 15)} ${a.name}</a>`)}
          </nav>
          <span class="to-spacer"></span>
          ${current
            ? html`
                <to-meter .used=${this.payloadLength} .available=${available} .href=${location.href} @to-info=${() => this.dialog()?.show()}></to-meter>
                <sl-tooltip content="Start a blank ${current.name}" hoist>
                  <sl-button class="icon" size="small" href="#/${current.id}" aria-label="New ${current.name}">${icon(UI.plus, 16)}<span class="sr-only">New ${current.name}</span></sl-button>
                </sl-tooltip>
              `
            : nothing}
        </div>
      </header>
      <sl-drawer id="nav-drawer" label="TinyOffice" placement="start" style="--size: 300px" @click=${(e: Event) => (e.target as HTMLElement).closest('a') && this.drawer()?.hide()}>
        <nav class="to-drawer-nav" aria-label="Apps">
          <a href="#/" aria-current=${this.app === null ? 'page' : nothing}>${icon(UI.home, 20)}<span>Home<small>All apps</small></span></a>
          ${APPS.map((a) => html`<a href="#/${a.id}" aria-current=${a.id === this.app ? 'page' : nothing}>${icon(UI[a.icon], 20)}<span>${a.name}<small>${a.blurb}</small></span></a>`)}
        </nav>
      </sl-drawer>
      <main class="to-main">${current ? this.renderPanel(current) : this.renderHome()}</main>
      ${this.renderDialog(available)}
      ${this.toast ? html`<div class="to-toast" role="status">${this.toast}</div>` : nothing}
    `;
  }

  private renderPanel(current: (typeof APPS)[number]) {
    const over = this.payloadLength > budgetFor(this.urlPrefix).available;
    return html`<section class="to-panel" aria-label=${current.name}>
      <div class="to-panel-head">
        <h1>${icon(UI[current.icon], 16)} ${current.name}</h1>
        <span class="meta">
          ${this.env.created !== null ? html`Created ${fmtDate(this.env.created)}` : 'Untitled, not yet saved to the link'}
          ${this.sig === 'valid' ? html` · <sl-tag size="small" variant="success" pill>${icon(UI.shield, 12)} signed</sl-tag>` : nothing}
          ${this.sig === 'invalid' ? html` · <sl-tag size="small" variant="danger" pill>${icon(UI.shieldOff, 12)} signature mismatch</sl-tag>` : nothing}
          ${over ? html` · <sl-tag size="small" variant="danger" pill>over the ${URL_LIMIT} character limit</sl-tag>` : nothing}
        </span>
      </div>
      <div @docchange=${this.onDocChange}>${this.renderApp()}</div>
    </section>`;
  }

  private renderApp() {
    switch (this.app) {
      case 'sheet':
        return html`<to-sheet .value=${this.env.body}></to-sheet>`;
      case 'write':
        return html`<to-write .value=${this.env.body}></to-write>`;
      case 'deck':
        return html`<to-deck .value=${this.env.body}></to-deck>`;
      case 'draw':
        return html`<to-draw .value=${this.env.body}></to-draw>`;
      case 'cal':
        return html`<to-cal .value=${this.env.body}></to-cal>`;
    }
    return nothing;
  }

  private renderHome() {
    return html`<section class="to-home">
      <h1>TinyOffice</h1>
      <p class="lede">Five tiny apps. No server, no accounts. Every document lives entirely in its link, under ${URL_LIMIT.toLocaleString()} characters.</p>
      <div class="to-launcher">
        ${APPS.map((a) => html`<a href="#/${a.id}"><span class="ic">${icon(UI[a.icon], 22)}</span><b>${a.name}</b><span>${a.blurb}</span></a>`)}
      </div>
      <p class="to-fine">There is nothing to save: the address bar is the file. Text is compressed before it goes into the link, so you'll fit more than you'd think. Documents remember when they were created and can be signed with a key that lives in your browser.</p>
    </section>`;
  }

  private renderDialog(available: number) {
    const left = available - this.payloadLength;
    const created = this.env.created;
    return html`<sl-dialog id="doc-dialog" label="This document" class="to-doc">
      <dl>
        <dt>Created</dt>
        <dd>${created !== null ? html`${fmtDate(created)}<br /><span class="to-hint">${fmtUtc(created)}</span>` : 'Not yet. The time is set on the first edit.'}</dd>
        <dt>Link size</dt>
        <dd>${this.payloadLength.toLocaleString()} of ${available.toLocaleString()} characters used, ${left >= 0 ? `${left.toLocaleString()} left` : html`<b style="color:var(--to-danger)">${(-left).toLocaleString()} over</b>`}.</dd>
        <dt>Signature</dt>
        <dd>
          ${this.sig === 'none' ? 'Not signed.' : nothing}
          ${this.sig === 'checking' ? 'Checking…' : nothing}
          ${this.sig === 'valid' ? html`Valid. Signed by key <code>${this.signer}</code>${this.signer && this.signer === this.myKey ? ' (this browser)' : ''}.` : nothing}
          ${this.sig === 'invalid' ? html`Does not match the current content. Key <code>${this.signer}</code> signed a different version, or the link was altered.` : nothing}
        </dd>
      </dl>
      <div class="row">
        ${this.sig !== 'valid'
          ? html`<sl-button size="small" variant="primary" ?loading=${this.busy} ?disabled=${!this.env.body} @click=${this.sign}>${icon(UI.shield, 14)} ${this.sig === 'invalid' ? 'Re-sign with my key' : 'Sign with my key'}</sl-button>`
          : nothing}
        ${this.env.sig ? html`<sl-button size="small" @click=${this.unsign}>Remove signature</sl-button>` : nothing}
      </div>
      <p class="small">
        Signing adds about 130 characters to the link. It proves that whoever holds the key vouched for exactly this content and creation time.
        The time itself is reported by the signer, not by a clock anyone else controls.
      </p>
      <sl-divider></sl-divider>
      <dl>
        <dt>Your key</dt>
        <dd>${this.myKey ? html`<code>${this.myKey}</code>, kept in this browser.` : 'None yet. One is made the first time you sign.'}</dd>
      </dl>
      <div class="row">
        <sl-button size="small" @click=${this.exportKey}>${icon(UI.key, 14)} Export</sl-button>
        <sl-button size="small" @click=${() => { this.keyMode = 'import'; this.keyText = ''; }}>Import</sl-button>
        ${this.myKey ? html`<sl-button size="small" variant="text" @click=${this.forgetKey}>Forget</sl-button>` : nothing}
      </div>
      ${this.keyMode !== 'none'
        ? html`<p class="small">${this.keyMode === 'export' ? 'This is your private key. Paste it into Import on another device to sign as the same key there.' : 'Paste an exported key.'}</p>
            <textarea aria-label="Key" .value=${this.keyText} ?readonly=${this.keyMode === 'export'} @input=${(e: Event) => (this.keyText = (e.target as HTMLTextAreaElement).value)}></textarea>
            ${this.keyMode === 'import' ? html`<div class="row" style="margin-top:8px"><sl-button size="small" variant="primary" @click=${this.importKey}>Use this key</sl-button></div>` : nothing}`
        : nothing}
      <sl-button slot="footer" variant="primary" @click=${() => this.dialog()?.hide()}>Done</sl-button>
    </sl-dialog>`;
  }
}

declare global {
  interface HTMLElementTagNameMap {
    'to-app': ToApp;
  }
}
