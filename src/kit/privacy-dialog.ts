/**
 * <to-privacy>: a document's privacy, and the Privacy dialog. The shell's (with `doc`) holds everything about a
 * document's password and signature, for every app: the unlock dialog a sealed link opens with (nothing of the
 * document, its title included, until the password is given); the Password dialog (set, change, take off: the
 * document sealed again at once); the Password and signature part of the Share dialog (renderProtect, drawn there by
 * <to-share>); the signed state beside the title (trustButton, drawn in the header); and the Privacy dialog, opened
 * from that state and from the menu: this document's signature and password; this device's signing key, with Export
 * (a file, and the text to copy), Import and Forget; what this device holds, item by item, each with Forget, and
 * Forget everything; and Download everything, every document kept here in one zip. The drawer's (no `doc`) is the
 * Privacy dialog alone.
 *
 * It gets the document's state through properties (`app`, `sealed`, `signature`, `protected`, `by`, `signed`, and
 * `signable`, the text to sign with the envelope's keys put in) and does the work through kit/privacy.ts; what
 * changes the document goes back to the shell as events: `to-unlock` (detail: the text and its locker, the password
 * given), `to-lock` (detail: the new locker, or null for none), `to-signed` (detail: the envelope's keys, emptied
 * to take the signature off) and `to-share-open`. (Until round eight all of this was the shell's own.)
 */
import { LitElement, html, nothing, type TemplateResult } from 'lit';
import { t } from './i18n.ts';
import { icon, UI } from './icons.ts';
import { toast } from './toast.ts';
import { copyText } from './share.ts';
import { saveFile } from './exports.ts';
import { zip } from './zip.ts';
import { everything, exportKey, forgetDocuments, forgetEverything, forgetKey, forgetLinks, forgetOffline, forgetPrefs, holdings, importKey, keeping, lockWith, onPrivacy, remember, signerName, signText, unlock, type Holdings, type Signature } from './privacy.ts';
import type { Locker } from './crypt.ts';
import { generatePassword } from './passwords.ts';
import { unlockForm } from './locked-doc.ts';
import type { ToDialog } from './dialog.ts';
import './dialog.ts';

/** The words for a signature's state, and for the state pill (kit/shell.ts) too. */
export function signatureWords(sig: Signature, sealed = false): string {
  if (sealed) return t('Locked');
  if (sig.state === 'valid') return sig.by ? t('Signed by {name}', { name: sig.by }) : t('Signed');
  if (sig.state === 'stale') return t('Changed since signed');
  if (sig.state === 'invalid') return t('Signature does not match');
  if (sig.state === 'unchecked') return t('Cannot check here');
  return t('Unsigned');
}

/** How a signature's state is drawn: green when it holds, red when it was checked and does not, grey otherwise. */
export const signatureTone = (sig: Signature): string =>
  sig.state === 'valid' ? 'signed' : sig.state === 'none' || sig.state === 'unchecked' ? 'quiet' : 'mismatch';
export const signatureIcon = (sig: Signature) =>
  sig.state === 'valid' ? UI.shield : sig.state === 'none' ? UI.unsigned : sig.state === 'unchecked' ? UI.unchecked : UI.mismatch;
/** Why a signature could not be checked, said beside it. */
export const uncheckedHint = () => t('This browser cannot check this kind of signature');

/**
 * The state beside the title: unsigned (quiet), signed by a name (green, the key's fingerprint on hover), changed
 * since signed or not matching (red), cannot check here (quiet, the reason on hover: a browser without Ed25519),
 * locked (a lock). A lock rides beside the state while the document has a password. `open` is the Privacy dialog,
 * or for a locked document the unlock dialog.
 */
export function trustButton(sig: Signature, sealed: boolean, locked: boolean, open: () => void): TemplateResult {
  const tone = sealed ? 'locked' : signatureTone(sig);
  const words = signatureWords(sig, sealed);
  const where = keeping() ? t('Saved on this device') : t('Private');
  const tip = [words, sig.state === 'unchecked' && !sealed ? uncheckedHint() : '', sig.fingerprint && !sealed ? t('Key {fp}', { fp: sig.fingerprint }) : '', locked ? t('Protected by a password') : '', where].filter(Boolean).join(' · ');
  return html`<button type="button" class="to-btn to-trust ${tone}" aria-haspopup="dialog" aria-label=${tip} title=${tip} @click=${open}>
    ${locked && !sealed ? icon(UI.lock, 16, 'to-trust-lock') : nothing}${icon(sealed ? UI.lock : signatureIcon(sig), 18)}<span class="to-trust-words">${words}</span>
  </button>`;
}

export class ToPrivacy extends LitElement {
  static properties = {
    doc: { type: Boolean },
    app: { attribute: false },
    sealed: { attribute: false },
    signature: { attribute: false },
    protected: { type: Boolean },
    by: { attribute: false },
    signed: { type: Boolean },
    held: { state: true },
    keyText: { state: true },
    keyMode: { state: true },
    withKey: { state: true },
    wrong: { state: true },
    busy: { state: true },
  };
  /** The shell's: a document's, with its dialogs; else the Privacy dialog alone (the drawer's). */
  declare doc: boolean;
  declare app: string;
  /** The sealed payload waiting for its password; '' once opened, or when the link has none. */
  declare sealed: string;
  declare signature: Signature;
  /** The document has a password. */
  declare protected: boolean;
  /** The name in the envelope, and whether it holds a signature. */
  declare by: string;
  declare signed: boolean;
  /** The document as it would be signed: the envelope's keys put in (the shell stamps `created` with the first). */
  signable: () => string = () => '';
  declare held: Holdings | null;
  declare keyText: string;
  declare keyMode: '' | 'export' | 'import';
  declare withKey: boolean;
  /** The unlock dialog's last try was not the password. */
  declare wrong: boolean;
  /** A password being tried, or set: the slow part. */
  declare busy: boolean;
  private signing = false;
  private off = () => {};

  constructor() {
    super();
    this.doc = false;
    this.app = '';
    this.sealed = '';
    this.signature = { state: 'none' };
    this.protected = false;
    this.by = '';
    this.signed = false;
    this.wrong = false;
    this.busy = false;
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
    return this.querySelector<ToDialog>('to-dialog.to-privacy-dialog')!;
  }
  private dialogOf = (cls: string) => this.querySelector<ToDialog>(`to-dialog.${cls}`);
  private say(name: string, detail: unknown) {
    this.dispatchEvent(new CustomEvent(name, { bubbles: true, detail }));
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

  /* ---------- the password ---------- */

  /** The unlock dialog, open, its field focused. */
  async askPassword() {
    this.wrong = false;
    await this.updateComplete;
    await this.dialogOf('to-unlock-dialog')?.show();
    this.querySelector<HTMLInputElement>('.to-unlock-field')?.focus();
  }
  private async tryPassword(e: Event) {
    e.preventDefault();
    const field = this.querySelector<HTMLInputElement>('.to-unlock-field');
    const payload = this.sealed;
    if (!field || !payload || this.busy) return;
    this.busy = true;
    try {
      const r = await unlock(field.value, payload);
      if (payload !== this.sealed) return;
      if (!r) {
        this.wrong = true;
        field.select();
        return;
      }
      this.dialogOf('to-unlock-dialog')?.close();
      this.say('to-unlock', r);
    } finally {
      this.busy = false;
    }
  }
  /** A password set or changed (the document sealed again at once), or taken off (`password` empty). */
  private async setPassword(password: string) {
    if (this.busy) return;
    this.busy = true;
    try {
      const locker: Locker | null = password ? await lockWith(password) : null;
      if (locker) remember(locker);
      this.say('to-lock', locker);
      toast(password ? t('Password set: the link holds only ciphertext') : t('Password removed'));
      this.dialogOf('to-password-dialog')?.close();
    } finally {
      this.busy = false;
    }
  }

  /* ---------- the signature ---------- */

  /** Signed with this device's key under `name`: the envelope takes the name, the time, the key and the signature. */
  private async sign(name: string) {
    if (!this.app || this.signing) return;
    this.signing = true;
    try {
      this.say('to-signed', await signText(this.app, this.signable(), name));
      toast(t('Signed'));
    } catch {
      toast(t('Could not sign'));
    } finally {
      this.signing = false;
    }
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
    const tone = signatureTone(sig);
    return html`<section class="to-privacy-section to-privacy-doc" aria-labelledby="to-privacy-doc-h">
      <h3 id="to-privacy-doc-h">${t('This document')}</h3>
      <p class="to-trust-line ${tone}">${icon(signatureIcon(sig), 18)}<span>${signatureWords(sig)}</span></p>
      ${sig.fingerprint ? html`<p class="to-hint to-privacy-signer">${t('Key {fp}', { fp: sig.fingerprint })}${sig.mine ? html` · ${t('yours')}` : nothing}</p>` : nothing}
      ${sig.state === 'invalid' ? html`<p class="to-hint">${t('The words, the title, the name or the time are not what was signed: someone changed it, or signed something else.')}</p>` : nothing}
      ${sig.state === 'unchecked' ? html`<p class="to-hint to-unchecked-hint">${uncheckedHint()}</p>` : nothing}
      ${sig.state === 'stale' ? html`<p class="to-hint">${t('You signed it, and it has changed since. Sign it again, in Share, to vouch for it as it is.')}</p>` : nothing}
      <p class="to-trust-line quiet">${icon(this.protected ? UI.lock : UI.unlock, 18)}<span>${this.protected ? t('Protected by a password') : t('No password')}</span></p>
      <button type="button" class="to-btn to-privacy-share" @click=${() => (this.close(), this.say('to-share-open', null))}>${icon(UI.share, 16)}<span>${t('Sign, or set a password, in Share')}</span></button>
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

  /** Set a password, change it, or take it off. Twice, so a slip of the finger does not lock the author out. */
  private renderPassword() {
    const has = this.protected;
    const fields = () => [...this.querySelectorAll<HTMLInputElement>('.to-password-new')];
    const check = () => {
      const [a, b] = fields().map((f) => f.value);
      const go = this.querySelector<HTMLButtonElement>('.to-password-set');
      if (go) go.disabled = !a || a !== b;
      const differ = this.querySelector<HTMLElement>('.to-password-differ');
      if (differ) differ.textContent = b && a !== b ? t('The two passwords differ') : '';
    };
    const submit = (e: Event) => {
      e.preventDefault();
      const [a, b] = fields().map((f) => f.value);
      if (a && a === b) void this.setPassword(a);
    };
    // Generate: a strong password made here, shown in both fields so it can be read and copied before it is set.
    const generate = () => {
      const made = generatePassword();
      for (const f of fields()) {
        f.type = 'text';
        f.value = made;
      }
      this.querySelector<HTMLElement>('.to-password-made')?.toggleAttribute('hidden', false);
      check();
    };
    const copyMade = () => void copyText(fields()[0]?.value ?? '', t('Password copied'));
    return html`<form class="to-password" @submit=${submit}>
      <p>${has ? t('This document has a password. The link, and any short link made from it, holds only ciphertext.') : t('Anyone with the link will need the password to open it. Nobody can reset it: lose it and the document is gone.')}</p>
      <label class="to-password-label"><span>${has ? t('New password') : t('Password')}</span><input type="password" class="to-password-new" autocomplete="new-password" @input=${check} /></label>
      <label class="to-password-label"><span>${t('Again')}</span><input type="password" class="to-password-new" autocomplete="new-password" @input=${check} /></label>
      <p class="to-password-differ to-hint" role="status"></p>
      <div class="to-row">
        <button type="button" class="to-btn to-password-generate" @click=${generate}>${icon(UI.key, 16)}<span>${t('Generate a strong password')}</span></button>
        <button type="button" class="to-btn to-password-copy" @click=${copyMade}>${icon(UI.copy, 16)}<span>${t('Copy')}</span></button>
      </div>
      <p class="to-password-made to-hint" role="status" hidden>${t('Twenty characters, made on this device and never sent anywhere. Copy it somewhere safe before you set it: there is no way to get it back.')}</p>
      <div class="to-row">
        <button type="submit" class="to-btn primary to-password-set" disabled>${icon(UI.lock, 16)}<span>${this.busy ? t('Sealing…') : has ? t('Change password') : t('Set password')}</span></button>
        ${has ? html`<button type="button" class="to-btn to-password-remove" ?disabled=${this.busy} @click=${() => void this.setPassword('')}>${icon(UI.unlock, 16)}<span>${t('Remove password')}</span></button>` : nothing}
      </div>
    </form>`;
  }

  /** The Share dialog's Password… and signature: the state, the name to sign under, Sign (or Sign again), Remove the signature. */
  renderProtect(): TemplateResult {
    const sig = this.signature;
    // Drawn in the Share dialog, not here: the name is read from the form it is in.
    const name = (e: Event) => (e.currentTarget as HTMLFormElement).querySelector<HTMLInputElement>('.to-sign-name')?.value ?? '';
    return html`<section class="to-share-section to-share-protect" aria-labelledby="to-share-protect-h">
      <h3 id="to-share-protect-h">${t('Password and signature')}</h3>
      <div class="to-share-protect-row">
        <p class="to-trust-line quiet">${icon(this.protected ? UI.lock : UI.unlock, 18)}<span>${this.protected ? t('Protected by a password') : t('No password')}</span></p>
        <button type="button" class="to-btn to-password-open" aria-haspopup="dialog" @click=${() => void this.dialogOf('to-password-dialog')?.show()}>${icon(UI.lock, 16)}<span>${t('Password…')}</span></button>
      </div>
      <p class="to-trust-line ${signatureTone(sig)}">${icon(signatureIcon(sig), 18)}<span>${signatureWords(sig)}</span>${sig.fingerprint ? html`<small>${t('Key {fp}', { fp: sig.fingerprint })}</small>` : nothing}</p>
      ${sig.state === 'unchecked' ? html`<p class="to-hint to-unchecked-hint">${uncheckedHint()}</p>` : nothing}
      <form class="to-sign" @submit=${(e: Event) => (e.preventDefault(), void this.sign(name(e)))}>
        <label class="to-sign-label"><span>${t('Sign as')}</span><input type="text" class="to-sign-name" autocomplete="name" placeholder=${t('Your name')} .value=${this.by || signerName()} /></label>
        <div class="to-row">
          <button type="submit" class="to-btn primary to-sign-go">${icon(UI.sign, 16)}<span>${this.signed ? t('Sign again') : t('Sign')}</span></button>
          ${this.signed ? html`<button type="button" class="to-btn to-unsign" @click=${() => this.say('to-signed', { key: '', sig: '' })}>${icon(UI.close, 16)}<span>${t('Remove signature')}</span></button>` : nothing}
        </div>
      </form>
      <p class="to-hint">${keeping() ? t('Signed with this device’s key: anyone can check that the document is exactly what you signed.') : t('Private: your signing key lasts for this visit. Turn on Saved in the menu to keep it.')}</p>
    </section>`;
  }

  render() {
    const held = this.held;
    const privacy = html`<to-dialog class="to-privacy-dialog" heading=${t('Privacy')} .body=${held ? html`${this.doc ? this.renderDoc() : nothing}${this.renderKey(held)}${this.renderDevice(held)}` : nothing}></to-dialog>`;
    if (!this.doc) return privacy;
    const unlocking = unlockForm({ wrong: this.wrong, busy: this.busy, submit: (e) => void this.tryPassword(e), input: () => (this.wrong = false) });
    return html`${privacy}<to-dialog class="to-unlock-dialog" heading=${t('This document is locked')} .body=${unlocking}></to-dialog>
      <to-dialog class="to-password-dialog" heading=${t('Password')} .body=${this.renderPassword()}></to-dialog>`;
  }
}
customElements.define('to-privacy', ToPrivacy);
