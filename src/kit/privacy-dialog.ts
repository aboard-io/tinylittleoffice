/**
 * <to-privacy>: the Privacy dialog. Opened from the signed state beside a document's title, and from the
 * menu. What it shows: this document's signature and password, when there is a document (the shell hands
 * them in); this device's signing key, with Export (a file, and the text to copy), Import and Forget; what
 * this device holds, item by item, each with Forget, and Forget everything; and Download everything, every
 * document kept here in one zip. It keeps nothing of its own: kit/privacy.ts does the work.
 */
import { LitElement, html, nothing } from 'lit';
import { t } from './i18n.ts';
import { icon, UI } from './icons.ts';
import { toast } from './toast.ts';
import { copyText } from './share.ts';
import { saveFile } from './exports.ts';
import { zip } from './zip.ts';
import { everything, exportKey, forgetDocuments, forgetEverything, forgetKey, forgetLinks, forgetOffline, forgetPrefs, holdings, importKey, keeping, onPrivacy, type Holdings, type Signature } from './privacy.ts';
import type { ToDialog } from './dialog.ts';
import './dialog.ts';

/** The words for a signature's state, and for the state pill (kit/shell.ts) too. */
export function signatureWords(sig: Signature, sealed = false): string {
  if (sealed) return t('Locked');
  if (sig.state === 'valid') return sig.by ? t('Signed by {name}', { name: sig.by }) : t('Signed');
  if (sig.state === 'stale') return t('Changed since signed');
  if (sig.state === 'invalid') return t('Signature does not match');
  return t('Unsigned');
}

export class ToPrivacy extends LitElement {
  static properties = { doc: { type: Boolean }, signature: { attribute: false }, protected: { type: Boolean }, held: { state: true }, keyText: { state: true }, keyMode: { state: true }, withKey: { state: true } };
  /** Shown for a document: its signature and whether it has a password. */
  declare doc: boolean;
  declare signature: Signature;
  declare protected: boolean;
  declare held: Holdings | null;
  declare keyText: string;
  declare keyMode: '' | 'export' | 'import';
  declare withKey: boolean;
  private off = () => {};

  constructor() {
    super();
    this.doc = false;
    this.signature = { state: 'none' };
    this.protected = false;
    this.held = null;
    this.keyText = '';
    this.keyMode = '';
    this.withKey = false;
  }
  createRenderRoot() {
    return this;
  }
  connectedCallback() {
    super.connectedCallback();
    this.off = onPrivacy(() => void this.refresh());
  }
  disconnectedCallback() {
    super.disconnectedCallback();
    this.off();
  }
  private get dialog(): ToDialog {
    return this.querySelector<ToDialog>('to-dialog')!;
  }
  async show() {
    this.keyMode = '';
    this.keyText = '';
    await this.refresh();
    await this.updateComplete;
    await this.dialog.show();
  }
  close() {
    this.dialog?.close();
  }
  private async refresh() {
    this.held = await holdings();
  }

  /* ---------- the key ---------- */

  private async exportKey() {
    this.keyText = await exportKey();
    this.keyMode = 'export';
    await saveFile('tiny-little-office-key.json', 'application/json', this.keyText);
  }
  private async importKey() {
    try {
      const fp = await importKey(this.keyText);
      this.keyMode = '';
      this.keyText = '';
      toast(t('Key imported: {fp}', { fp }));
    } catch {
      toast(t('That is not a signing key.'));
    }
  }
  private async importFile(e: Event) {
    const file = (e.target as HTMLInputElement).files?.[0];
    if (!file) return;
    this.keyText = await file.text();
    await this.importKey();
  }
  private forgetKey() {
    if (!confirm(t('Forget your signing key? Documents you signed with it will no longer verify as yours, and a new key is made the next time you sign.'))) return;
    forgetKey();
    this.keyMode = '';
    this.keyText = '';
  }

  /* ---------- the device ---------- */

  private async forgetAll() {
    if (!confirm(t('Forget everything this site keeps here, your signing key with it, and keep nothing from now on? The documents themselves live in their links.'))) return;
    await forgetEverything();
    toast(t('Private: nothing saved'));
  }
  private async download() {
    const files = await everything(this.withKey, `${location.origin}${location.pathname}`);
    if (!Object.keys(files).length) return toast(t('Nothing is kept here to download.'));
    await saveFile('tiny-little-office.zip', 'application/zip', zip(files));
  }

  /* ---------- drawn ---------- */

  private renderDoc() {
    const sig = this.signature;
    const tone = sig.state === 'valid' ? 'signed' : sig.state === 'none' ? 'quiet' : 'mismatch';
    return html`<section class="to-privacy-section to-privacy-doc" aria-labelledby="to-privacy-doc-h">
      <h3 id="to-privacy-doc-h">${t('This document')}</h3>
      <p class="to-trust-line ${tone}">${icon(sig.state === 'valid' ? UI.shield : sig.state === 'none' ? UI.unsigned : UI.mismatch, 18)}<span>${signatureWords(sig)}</span></p>
      ${sig.fingerprint ? html`<p class="to-hint to-privacy-signer">${t('Key {fp}', { fp: sig.fingerprint })}${sig.mine ? html` · ${t('yours')}` : nothing}</p>` : nothing}
      ${sig.state === 'invalid' ? html`<p class="to-hint">${t('The words, the title, the name or the time are not what was signed: someone changed it, or signed something else.')}</p>` : nothing}
      ${sig.state === 'stale' ? html`<p class="to-hint">${t('You signed it, and it has changed since. Sign it again, in Share, to vouch for it as it is.')}</p>` : nothing}
      <p class="to-trust-line quiet">${icon(this.protected ? UI.lock : UI.unlock, 18)}<span>${this.protected ? t('Protected by a password') : t('No password')}</span></p>
      <button type="button" class="to-btn to-privacy-share" @click=${() => (this.close(), this.dispatchEvent(new Event('to-open-share', { bubbles: true })))}>${icon(UI.share, 16)}<span>${t('Sign, or set a password, in Share')}</span></button>
    </section>`;
  }

  private renderKey(held: Holdings) {
    return html`<section class="to-privacy-section to-privacy-key" aria-labelledby="to-privacy-key-h">
      <h3 id="to-privacy-key-h">${t('Your signing key')}</h3>
      <p class="to-privacy-fp">${held.key ? html`${icon(UI.key, 18)}<code>${held.key}</code>` : t('None yet: one is made the first time you sign.')}</p>
      <p class="to-hint">${keeping() ? t('Saved on this device. Take it to another device with Export and Import, to sign there as the same key.') : t('Private: this key lasts for this visit only. Turn on Saved in the menu to keep it, or Export it.')}</p>
      <div class="to-row">
        <button type="button" class="to-btn to-key-export" @click=${() => void this.exportKey()}>${icon(UI.download, 16)}<span>${t('Export key')}</span></button>
        <button type="button" class="to-btn to-key-import" aria-pressed=${String(this.keyMode === 'import')} @click=${() => ((this.keyMode = this.keyMode === 'import' ? '' : 'import'), (this.keyText = ''))}>${icon(UI.upload, 16)}<span>${t('Import key')}</span></button>
        ${held.key ? html`<button type="button" class="to-btn to-key-forget" @click=${() => this.forgetKey()}>${icon(UI.trash, 16)}<span>${t('Forget key')}</span></button>` : nothing}
      </div>
      ${this.keyMode === 'export'
        ? html`<label class="to-privacy-keytext"><span>${t('Your key, as text: keep it secret, it signs as you')}</span><textarea class="to-key-text" readonly rows="4" .value=${this.keyText} @focus=${(e: Event) => (e.target as HTMLTextAreaElement).select()}></textarea></label>
            <button type="button" class="to-btn to-key-copy" @click=${() => void copyText(this.keyText, t('Key copied'))}>${icon(UI.copy, 16)}<span>${t('Copy')}</span></button>`
        : nothing}
      ${this.keyMode === 'import'
        ? html`<label class="to-privacy-keytext"><span>${t('Paste a key exported from another device')}</span><textarea class="to-key-text" rows="4" .value=${this.keyText} @input=${(e: Event) => (this.keyText = (e.target as HTMLTextAreaElement).value)}></textarea></label>
            <div class="to-row">
              <button type="button" class="to-btn primary to-key-use" ?disabled=${!this.keyText.trim()} @click=${() => void this.importKey()}>${icon(UI.key, 16)}<span>${t('Use this key')}</span></button>
              <label class="to-btn to-key-file">${icon(UI.upload, 16)}<span>${t('From a file…')}</span><input type="file" accept=".json,application/json,text/plain" class="sr-only" @change=${(e: Event) => void this.importFile(e)} /></label>
            </div>`
        : nothing}
    </section>`;
  }

  private renderDevice(held: Holdings) {
    const row = (cls: string, what: string, about: string, now: string, forget: (() => void) | null) =>
      html`<li class=${cls}><span class="to-held-words"><b>${what}</b><small>${about}</small></span><span class="to-held-now">${now}</span>${forget ? html`<button type="button" class="to-btn to-held-forget" @click=${forget}>${t('Forget')}</button>` : nothing}</li>`;
    return html`<section class="to-privacy-section to-privacy-device" aria-labelledby="to-privacy-device-h">
      <h3 id="to-privacy-device-h">${t('What this device holds')}</h3>
      <p class="to-trust-line quiet">${icon(keeping() ? UI.offline : UI.unsigned, 18)}<span>${keeping() ? t('Saved on this device') : t('Private: nothing is written to this device. What is listed lasts for this visit.')}</span></p>
      <ul class="to-held">
        ${row('to-held-prefs', t('Preferences'), t('Theme, language, the name you sign with, the lifetime of short links.'), held.prefs ? t('{n} set', { n: held.prefs }) : t('None'), held.prefs ? () => forgetPrefs() : null)}
        ${row('to-held-offline', t('The offline copy'), t('The app itself, to open with no connection. No documents are in it.'), held.offline ? t('Kept') : t('None'), held.offline ? () => void forgetOffline() : null)}
        ${row('to-held-docs', t('Your documents'), t('Their names and links, for the home page.'), t('{n|# document|# documents}', { n: held.documents }), held.documents ? () => forgetDocuments() : null)}
        ${row('to-held-links', t('Short links'), t('The owner links that update short links you made.'), t('{n|# link|# links}', { n: held.links }), held.links ? () => forgetLinks() : null)}
        ${row('to-held-key', t('Your signing key'), t('Says a signature is yours.'), held.key ?? t('None'), held.key ? () => this.forgetKey() : null)}
      </ul>
      <button type="button" class="to-btn to-forget-all" @click=${() => void this.forgetAll()}>${icon(UI.trash, 16)}<span>${t('Forget everything')}</span></button>
    </section>
    <section class="to-privacy-section to-privacy-zip" aria-labelledby="to-privacy-zip-h">
      <h3 id="to-privacy-zip-h">${t('Download everything')}</h3>
      <p class="to-hint">${t('Every document kept here, as its text, in one zip.')}</p>
      <label class="to-check"><input type="checkbox" class="to-zip-key" .checked=${this.withKey} @change=${(e: Event) => (this.withKey = (e.target as HTMLInputElement).checked)} /><span>${t('With my signing key')}</span></label>
      <button type="button" class="to-btn to-download-all" ?disabled=${!held.documents && !(this.withKey && held.key)} @click=${() => void this.download()}>${icon(UI.download, 16)}<span>${t('Download everything (.zip)')}</span></button>
    </section>`;
  }

  render() {
    const held = this.held;
    return html`<to-dialog class="to-privacy-dialog" heading=${t('Privacy')} .body=${held ? html`${this.doc ? this.renderDoc() : nothing}${this.renderKey(held)}${this.renderDevice(held)}` : nothing}></to-dialog>`;
  }
}
customElements.define('to-privacy', ToPrivacy);
