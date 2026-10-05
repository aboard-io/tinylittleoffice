/**
 * <to-app>: the shell. Owns the URL. Routes "#/<app>/<payload>" to a mini
 * app, hands it the decoded document body, and writes every change back into
 * the URL via history.replaceState. Also owns the envelope around the body
 * (creation time, optional signature) and optional password encryption.
 */
import { LitElement, html, nothing } from 'lit';
import { customElement, state } from 'lit/decorators.js';
import { budgetFor, toBase64Url, fromBase64Url } from './lib/codec.ts';
import { packEnvelope, unpackEnvelope, signingMessage, quantizeCreated, type Envelope } from './lib/envelope.ts';
import { createSigner, localStorageStore, verify, fingerprintOf, type Signer } from './lib/sign.ts';
import { isSealed, newLocker, seal, unseal, type Locker } from './lib/crypt.ts';
import { icon, UI } from './lib/icons.ts';
import type { SlDialog, SlDrawer, SlInput } from './lib/shoelace.ts';

export type AppId = 'sheet' | 'write' | 'deck' | 'draw' | 'cal';

export const APPS: { id: AppId; name: string; icon: keyof typeof UI }[] = [
  { id: 'sheet', name: 'Sheet', icon: 'sheet' },
  { id: 'write', name: 'Write', icon: 'write' },
  { id: 'deck', name: 'Deck', icon: 'deck' },
  { id: 'draw', name: 'Draw', icon: 'draw' },
  { id: 'cal', name: 'Calendar', icon: 'cal' },
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
    const { app, payload } = parseHash(location.hash);
    this.app = app;
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
    return `${location.origin}${location.pathname}${location.search}#/${this.app}/`;
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
          <sl-button class="to-burger icon" variant="text" size="medium" @click=${() => this.drawer()?.show()}>${icon(UI.menu, 22)}<span class="sr-only">Menu</span></sl-button>
          <a class="to-brand" href="#/"><span class="mark">${icon(UI.sparkles, 16)}</span><span>TinyOffice</span></a>
          <nav class="to-nav" aria-label="Apps">
            ${APPS.map((a) => html`<a href="#/${a.id}" aria-current=${a.id === this.app ? 'page' : nothing}>${icon(UI[a.icon], 15)} ${a.name}</a>`)}
          </nav>
          <span class="to-spacer"></span>
          ${current
            ? html`
                <to-meter .used=${this.payloadLength} .available=${available} .href=${location.href} @to-info=${() => this.dialog()?.show()}></to-meter>
                <sl-tooltip content="New ${current.name}" hoist>
                  <sl-button class="icon" size="small" href="#/${current.id}">${icon(UI.plus, 16)}<span class="sr-only">New ${current.name}</span></sl-button>
                </sl-tooltip>
              `
            : nothing}
        </div>
      </header>
      <sl-drawer id="nav-drawer" label="TinyOffice" placement="start" style="--size: 280px" @click=${(e: Event) => (e.target as HTMLElement).closest('a') && this.drawer()?.hide()}>
        <nav class="to-drawer-nav" aria-label="Apps">
          <a href="#/" aria-current=${this.app === null ? 'page' : nothing}>${icon(UI.home, 20)}<span>Home</span></a>
          ${APPS.map((a) => html`<a href="#/${a.id}" aria-current=${a.id === this.app ? 'page' : nothing}>${icon(UI[a.icon], 20)}<span>${a.name}</span></a>`)}
        </nav>
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
          ${this.env.created !== null ? html`${icon(UI.clock, 12)} ${fmtDate(this.env.created)}` : nothing}
          ${this.locker || this.sealed ? html`<sl-tag size="small" pill>${icon(UI.lock, 12)} locked</sl-tag>` : nothing}
          ${this.sig === 'valid' ? html`<sl-tag size="small" variant="success" pill>${icon(UI.shield, 12)} signed</sl-tag>` : nothing}
          ${this.sig === 'invalid' ? html`<sl-tag size="small" variant="danger" pill>${icon(UI.shieldOff, 12)} signature mismatch</sl-tag>` : nothing}
          ${over ? html`<sl-tag size="small" variant="danger" pill>over limit</sl-tag>` : nothing}
        </span>
      </div>
      <div @docchange=${this.onDocChange}>${this.sealed ? nothing : this.renderApp()}</div>
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
      <div class="to-launcher">
        ${APPS.map((a) => html`<a href="#/${a.id}"><span class="ic">${icon(UI[a.icon], 22)}</span><b>${a.name}</b></a>`)}
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
        <dt>${icon(UI.clock, 14)}</dt>
        <dd>${created !== null ? html`${fmtDate(created)} <span class="to-hint">${fmtUtc(created)}</span>` : '—'}</dd>
        <dt>${icon(UI.link, 14)}</dt>
        <dd>${this.payloadLength.toLocaleString()} / ${available.toLocaleString()} ${left < 0 ? html`<sl-tag size="small" variant="danger" pill>${(-left).toLocaleString()} over</sl-tag>` : nothing}</dd>
        <dt>${icon(UI.lock, 14)}</dt>
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
        <dt>${icon(UI.shield, 14)}</dt>
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
        <dt>${icon(UI.key, 14)}</dt>
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
