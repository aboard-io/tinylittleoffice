/**
 * <to-privacy>: the one place a document is protected and the device's
 * keeping is seen to. It draws for the Privacy class (lib/privacy.ts):
 * the password, the signature, the key, and what this browser holds; and
 * the prompt for a password when a sealed link is opened. It asks for
 * nothing of its own: the shell gives it the document and the privacy
 * object, and hears "privacy-env" when the document changes (unlocked,
 * signed, unsigned) and "privacy-lock" when the password does.
 */
import { LitElement, html, nothing, icon, UI, toast, errorText, type PropertyValues } from '../kit.ts';
import type { Envelope } from '../lib/envelope.ts';
import type { Privacy } from '../lib/privacy.ts';
import type { SlInput } from '../lib/shoelace.ts';

export class ToPrivacy extends LitElement {
  static properties = { privacy: { attribute: false }, env: { attribute: false }, app: {}, sealed: {}, pw: { state: true }, busy: { state: true }, wrong: { state: true }, keyMode: { state: true }, keyText: { state: true }, note: { state: true } };
  declare privacy: Privacy;
  declare env: Envelope;
  declare app: string | null;
  /** A sealed payload waiting for its password; '' when there is none. */
  declare sealed: string;
  declare pw: string;
  declare busy: boolean;
  declare wrong: boolean;
  declare keyMode: 'none' | 'export' | 'import';
  declare keyText: string;
  declare note: string;

  constructor() {
    super();
    this.env = { created: null, body: '' };
    this.app = null;
    this.sealed = '';
    this.pw = '';
    this.busy = false;
    this.wrong = false;
    this.keyMode = 'none';
    this.keyText = '';
    this.note = '';
  }

  protected createRenderRoot() {
    return this;
  }
  disconnectedCallback() {
    super.disconnectedCallback();
    this.off?.();
    this.off = null;
  }

  private off: (() => void) | null = null;
  protected updated(changed: PropertyValues) {
    if (changed.has('privacy') && this.privacy) {
      this.off?.();
      this.off = this.privacy.on(() => this.requestUpdate());
    }
    if (changed.has('sealed') && this.sealed) void this.updateComplete.then(() => this.querySelector<SlInput>('#pw-input')?.focus());
  }

  private say(note: string) {
    this.note = note;
    toast(this, note);
  }
  /** Tell the shell: "privacy-env" with the changed document, or what else happened. */
  private emit(name: 'privacy-env' | 'privacy-lock' | 'privacy-device' | 'privacy-zip', env?: Envelope) {
    this.dispatchEvent(new CustomEvent(name, { detail: env, bubbles: true }));
  }

  /* ---------- the password ---------- */

  private async unlock() {
    if (!this.sealed || this.busy) return;
    this.busy = true;
    try {
      const env = await this.privacy.unlock(this.pw, this.sealed);
      if (!env) return void (this.wrong = true);
      this.pw = '';
      this.wrong = false;
      this.emit('privacy-env', env);
    } finally {
      this.busy = false;
    }
  }
  private async lock() {
    if (!this.pw || this.busy) return;
    this.busy = true;
    try {
      await this.privacy.lock(this.pw);
      this.pw = '';
      this.emit('privacy-lock');
    } finally {
      this.busy = false;
    }
  }

  /* ---------- the signature and the key ---------- */

  private async sign() {
    if (!this.app) return;
    this.busy = true;
    try {
      this.emit('privacy-env', await this.privacy.sign(this.env, this.app));
      this.say('Signed');
    } catch (err) {
      this.say(errorText(err, 'Could not sign'));
    } finally {
      this.busy = false;
    }
  }
  private async exportKey() {
    this.keyText = await this.privacy.exportKey();
    this.keyMode = 'export';
    try {
      await navigator.clipboard.writeText(this.keyText);
      this.say('Key copied');
    } catch {
      /* the textarea shows it anyway */
    }
  }
  private async importKey() {
    try {
      await this.privacy.importKey(this.keyText);
      this.keyMode = 'none';
      this.keyText = '';
      this.say('Key imported');
    } catch (err) {
      this.say(errorText(err, 'Invalid key'));
    }
  }
  private forgetKey() {
    if (!confirm('Forget this key?')) return;
    this.privacy.forgetKey();
    this.keyMode = 'none';
    this.keyText = '';
  }

  /* ---------- drawn ---------- */

  /** The prompt a sealed link opens with. */
  renderPrompt() {
    return html`<sl-dialog id="pw-dialog" label="Password" ?open=${!!this.sealed} @sl-request-close=${(e: Event) => this.sealed && e.preventDefault()}>
      <div class="to-doc">
        <div class="row">
          <sl-input id="pw-input" class="sr-label" type="password" label="Password" password-toggle autofocus .value=${this.pw} @sl-input=${(e: Event) => { this.pw = (e.target as SlInput).value; this.wrong = false; }} @keydown=${(e: KeyboardEvent) => e.key === 'Enter' && this.unlock()}></sl-input>
          <sl-button variant="primary" ?loading=${this.busy} @click=${this.unlock}>${icon(UI.unlock, 14)} Open</sl-button>
        </div>
        ${this.wrong ? html`<sl-tag size="small" variant="danger" pill style="margin-top:8px">Wrong password</sl-tag>` : nothing}
      </div>
    </sl-dialog>`;
  }

  /** The Protect and On-this-device sections of the document dialog. */
  render() {
    const p = this.privacy;
    return html`
      <h3>${icon(UI.lock, 14)} Protect</h3>
      <dl>
        <dt>Password</dt>
        <dd>
          ${p.locker
            ? html`<div class="row"><sl-tag size="small" variant="success" pill>Locked</sl-tag><sl-button size="small" @click=${() => { p.unlockForGood(); this.emit('privacy-lock'); }}>${icon(UI.unlock, 14)} Remove</sl-button></div>`
            : html`<div class="row">
                <sl-input class="sr-label" size="small" type="password" label="New password" placeholder="Password" password-toggle .value=${this.pw} @sl-input=${(e: Event) => (this.pw = (e.target as SlInput).value)} @keydown=${(e: KeyboardEvent) => e.key === 'Enter' && this.lock()}></sl-input>
                <sl-button size="small" ?loading=${this.busy} ?disabled=${!this.pw} @click=${this.lock}>${icon(UI.lock, 14)} Lock</sl-button>
              </div>`}
        </dd>
        <dt>Signature</dt>
        <dd>
          <div class="row">
            ${p.sig === 'none' ? html`<sl-tag size="small" pill>Unsigned</sl-tag>` : nothing}
            ${p.sig === 'checking' ? html`<sl-tag size="small" pill>…</sl-tag>` : nothing}
            ${p.sig === 'valid' ? html`<sl-tag size="small" variant="success" pill>Valid</sl-tag> <code>${p.signer}</code>${p.signer && p.signer === p.myKey ? html`<span class="to-hint">(yours)</span>` : nothing}` : nothing}
            ${p.sig === 'invalid' ? html`<sl-tag size="small" variant="danger" pill>Mismatch</sl-tag> <code>${p.signer}</code>` : nothing}
            ${p.sig !== 'valid' ? html`<sl-button size="small" variant="primary" ?loading=${this.busy} ?disabled=${!this.env.body} @click=${this.sign}>${icon(UI.shield, 14)} ${p.sig === 'invalid' ? 'Re-sign' : 'Sign'}</sl-button>` : nothing}
            ${this.env.sig ? html`<sl-button size="small" @click=${() => this.emit('privacy-env', p.unsign(this.env))}>Remove</sl-button>` : nothing}
          </div>
        </dd>
        <dt>Signing key</dt>
        <dd>
          <div class="row">
            ${p.myKey ? html`<code>${p.myKey}</code>` : html`<span class="to-hint">—</span>`}
            <sl-button size="small" @click=${this.exportKey}>Export</sl-button>
            <sl-button size="small" @click=${() => { this.keyMode = 'import'; this.keyText = ''; }}>Import</sl-button>
            ${p.myKey ? html`<sl-button size="small" variant="text" @click=${this.forgetKey}>Forget</sl-button>` : nothing}
          </div>
          ${this.keyMode !== 'none'
            ? html`<textarea aria-label="Key" placeholder="Key" .value=${this.keyText} ?readonly=${this.keyMode === 'export'} @input=${(e: Event) => (this.keyText = (e.target as HTMLTextAreaElement).value)}></textarea>
                ${this.keyMode === 'import' ? html`<div class="row" style="margin-top:8px"><sl-button size="small" variant="primary" @click=${this.importKey}>Use key</sl-button><sl-button size="small" @click=${() => (this.keyMode = 'none')}>Cancel</sl-button></div>` : nothing}`
            : nothing}
        </dd>
      </dl>
      <h3>${icon(UI.home, 14)} On this device</h3>
      ${p.keeping()
        ? html`<p class="to-hint"><b>Saved.</b> This device saves, as you asked with the switch in the header: your documents (in folders, on the home page), your signing key, your preferences and, if the menu's switch is on, a copy of the app for when there is no connection. Nothing is ever sent anywhere.</p>`
        : html`<p class="to-hint"><b>Private.</b> Nothing is written to this device: no documents, no cookies, no offline copy. Settings last for this visit, in memory. The switch in the header saves things instead.</p>`}
      <table class="to-kept">
        <thead><tr><th scope="col">What</th><th scope="col">Now</th><th scope="col"></th></tr></thead>
        <tbody>
          <tr>
            <th scope="row">Your documents<br /><small>Their titles and links, in folders, for the home page.</small></th>
            <td>${p.keeping() ? `${p.documentsKept()} saved` : 'Not saved'}</td>
            <td></td>
          </tr>
          <tr>
            <th scope="row">Your signing key<br /><small>Made the first time you sign. Says a signature is yours.</small></th>
            <td>${p.myKey ? html`<code>${p.myKey}</code>` : 'None'}</td>
            <td>${p.myKey ? html`<sl-button size="small" @click=${this.forgetKey}>Forget</sl-button>` : nothing}</td>
          </tr>
          <tr>
            <th scope="row">Preferences<br /><small>Theme, which menu clusters are open, form or text, whether links open to read or to edit, size.</small></th>
            <td>${p.prefsKept() ? `${p.prefsKept()} set${p.keeping() ? '' : ' (this visit)'}` : 'None'}</td>
            <td>${p.prefsKept() ? html`<sl-button size="small" @click=${() => { p.forgetPrefs(); this.emit('privacy-device'); }}>Forget</sl-button>` : nothing}</td>
          </tr>
          <tr>
            <th scope="row">The app itself<br /><small>A copy of TinyLittleOffice, so it opens with no connection: the switch in the menu. No documents are in it.</small></th>
            <td>${p.offlineKept() ? 'Saved' : 'Not saved'}</td>
            <td>${p.offlineKept() ? html`<sl-button size="small" @click=${() => p.dropOffline()}>Remove</sl-button>` : nothing}</td>
          </tr>
        </tbody>
      </table>
      <div class="row">
        <sl-button size="small" @click=${() => this.emit('privacy-zip')}>${icon(UI.download, 14)} Download everything (.zip)</sl-button>
        <span class="to-hint">The app, and every document kept here, in one file.</span>
        <span class="to-spacer"></span>
        ${p.keeping() ? html`<sl-button size="small" variant="danger" outline @click=${async () => { if (!confirm('Forget everything this site keeps in this browser, and keep nothing from now on?')) return; await p.leaveNothing(); this.emit('privacy-device'); }}>${icon(UI.trash, 14)} Leave nothing</sl-button>` : nothing}
      </div>
    `;
  }
}
if (!customElements.get('to-privacy')) customElements.define('to-privacy', ToPrivacy);

/** The same widget, drawing only the password prompt (a sealed link's first sight). */
if (!customElements.get('to-privacy-prompt'))
  customElements.define(
    'to-privacy-prompt',
    class extends ToPrivacy {
      render() {
        return this.renderPrompt();
      }
    },
  );
