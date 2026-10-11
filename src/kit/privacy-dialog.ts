/**
 * <to-privacy>: a document's privacy, and the Privacy dialog. The shell's (with `doc`) holds everything about a
 * document's password, for every app: the unlock dialog a sealed link opens with (nothing of the document, its
 * title included, until the password is given); the Password dialog (set, change, take off: the document sealed
 * again at once); the Password part of the Share dialog (renderProtect, drawn there by <to-share>); the lock beside
 * the title while there is a password (trustButton, drawn in the header); and the Privacy dialog, opened from that
 * lock and from the menu: this document's password; what this device holds, item by item, each with Forget, the
 * browser's own history last (every document opened here, and not ours to clear), and Forget everything; and
 * Download everything, every document kept here in one zip. The drawer's (no `doc`) is the Privacy dialog alone.
 *
 * It gets the document's state through properties (`sealed`, `protected`) and does the work through
 * kit/privacy.ts; what changes the document goes back to the shell as events: `to-unlock` (detail: the text and
 * its locker, the password given), `to-lock` (detail: the new locker, or null for none) and `to-share-open`.
 * (Until round eight all of this was the shell's own.)
 */
import { LitElement, html, nothing, type TemplateResult } from 'lit';
import { t } from './i18n.ts';
import { icon, UI } from './icons.ts';
import { toast } from './toast.ts';
import { copyText } from './share.ts';
import { saveFile } from './exports.ts';
import { zip } from './zip.ts';
import { everything, forgetDocuments, forgetEverything, forgetLinks, forgetPrefs, holdings, keeping, lockWith, onPrivacy, remember, unlock, type Holdings } from './privacy.ts';
import type { Locker } from './crypt.ts';
import { generatePassword, guessable } from './passwords.ts';
import { unlockForm } from './locked-doc.ts';
import type { ToDialog } from './dialog.ts';
import './dialog.ts';

/**
 * The lock beside the title, while the document has a password: locked (a sealed link not opened yet: the unlock
 * dialog) or protected (opened: the Privacy dialog). Nothing while it has none: there is nothing to say.
 */
export function trustButton(sealed: boolean, locked: boolean, open: () => void): TemplateResult | typeof nothing {
  if (!sealed && !locked) return nothing;
  const words = sealed ? t('Locked') : t('Protected by a password');
  const tip = `${words} · ${keeping() ? t('Saved on this device') : t('Private')}`;
  return html`<button type="button" class="to-btn to-trust ${sealed ? 'locked' : 'quiet'}" aria-haspopup="dialog" aria-label=${tip} title=${tip} @click=${open}>
    ${icon(UI.lock, 18)}<span class="to-trust-words">${words}</span>
  </button>`;
}

export class ToPrivacy extends LitElement {
  static properties = {
    doc: { type: Boolean },
    sealed: { attribute: false },
    protected: { type: Boolean },
    held: { state: true },
    wrong: { state: true },
    busy: { state: true },
  };
  /** The shell's: a document's, with its dialogs; else the Privacy dialog alone (the drawer's). */
  declare doc: boolean;
  /** The sealed payload waiting for its password; '' once opened, or when the link has none. */
  declare sealed: string;
  /** The document has a password. */
  declare protected: boolean;
  declare held: Holdings | null;
  /** The unlock dialog's last try was not the password. */
  declare wrong: boolean;
  /** A password being tried, or set: the slow part. */
  declare busy: boolean;
  private off = () => {};

  constructor() {
    super();
    this.doc = false;
    this.sealed = '';
    this.protected = false;
    this.wrong = false;
    this.busy = false;
    this.held = null;
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
  /** Password…, from the Share dialog: Share hands over to it and comes back when it closes (one modal at a time). */
  private passwordFrom(button: HTMLElement) {
    const next = this.dialogOf('to-password-dialog');
    const over = button.closest<ToDialog>('to-dialog');
    if (next) void (over ? over.handOver(next, button) : next.show());
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

  /* ---------- the device ---------- */

  private async forgetAll() {
    if (!confirm(t('Forget everything this site keeps here, and keep nothing from now on? The documents themselves live in their links.'))) return;
    await forgetEverything();
    toast(t('Private: nothing saved'));
  }
  private async download() {
    const files = await everything(`${location.origin}${location.pathname}`);
    if (!Object.keys(files).length) return toast(t('There is nothing here to download.'));
    await saveFile('tiny-little-office.zip', 'application/zip', zip(files));
  }

  /* ---------- drawn ---------- */

  private renderDoc() {
    return html`<section class="to-privacy-section to-privacy-doc" aria-labelledby="to-privacy-doc-h">
      <h3 id="to-privacy-doc-h">${t('This document')}</h3>
      <p class="to-trust-line quiet">${icon(this.protected ? UI.lock : UI.unlock, 18)}<span>${this.protected ? t('Protected by a password') : t('No password')}</span></p>
      <button type="button" class="to-btn to-privacy-share" @click=${() => (this.close(), this.say('to-share-open', null))}>${icon(UI.share, 16)}<span>${t('Set a password, in Share')}</span></button>
    </section>`;
  }

  private renderDevice(held: Holdings) {
    const row = (cls: string, what: string, about: string, now: string, forget: (() => void) | null) =>
      html`<li class=${cls}><span class="to-held-words"><b>${what}</b><small>${about}</small></span><span class="to-held-now">${now}</span>${forget ? html`<button type="button" class="to-btn to-held-forget" @click=${forget}>${t('Forget')}</button>` : nothing}</li>`;
    return html`<section class="to-privacy-section to-privacy-device" aria-labelledby="to-privacy-device-h">
      <h3 id="to-privacy-device-h">${t('What this device holds')}</h3>
      <p class="to-trust-line quiet">${icon(keeping() ? UI.device : UI.private, 18)}<span>${keeping() ? t('Saved on this device') : t('Private: nothing is written to this device. What is listed lasts for this visit.')}</span></p>
      <ul class="to-held">
        ${row('to-held-prefs', t('Preferences'), t('Theme, the lifetime of short links.'), held.prefs ? t('{n} set', { n: held.prefs }) : t('None'), held.prefs ? () => forgetPrefs() : null)}
        ${row('to-held-docs', t('Your documents'), t('Their names and links, for the home page.'), t('{n|# document|# documents}', { n: held.documents }), held.documents ? () => forgetDocuments() : null)}
        ${row('to-held-links', t('Short links'), t('The short links made here, until they expire.'), t('{n|# link|# links}', { n: held.links }), held.links ? () => forgetLinks() : null)}
        ${row('to-held-history', t('Your browser’s history'), t('Every document opened here, in full, unless it has a password.'), t('Not ours to clear'), null)}
      </ul>
      <button type="button" class="to-btn to-forget-all" @click=${() => void this.forgetAll()}>${icon(UI.trash, 16)}<span>${t('Forget everything')}</span></button>
    </section>
    <section class="to-privacy-section to-privacy-zip" aria-labelledby="to-privacy-zip-h">
      <h3 id="to-privacy-zip-h">${t('Download everything')}</h3>
      <p class="to-hint">${t('Every document kept here, as its text, in one zip.')}</p>
      <button type="button" class="to-btn to-download-all" ?disabled=${!held.documents} @click=${() => void this.download()}>${icon(UI.download, 16)}<span>${t('Download everything (.zip)')}</span></button>
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
      const cost = this.querySelector<HTMLElement>('.to-password-cost');
      if (cost) cost.textContent = a && guessable(a) ? t('Someone with the link can guess this offline. Use Generate, or four or more random words.') : '';
    };
    // A guessable password is the author's to choose, asked once: the warning above says why.
    const submit = (e: Event) => {
      e.preventDefault();
      const [a, b] = fields().map((f) => f.value);
      if (!a || a !== b) return;
      if (guessable(a) && !confirm(t('This password can be guessed by anyone with the link. Set it anyway?'))) return;
      void this.setPassword(a);
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
      <p class="to-password-cost to-hint" role="status"></p>
      <div class="to-row">
        <button type="button" class="to-btn to-password-generate" @click=${generate}>${icon(UI.key, 16)}<span>${t('Generate a strong password')}</span></button>
        <button type="button" class="to-btn to-password-copy" @click=${copyMade}>${icon(UI.copy, 16)}<span>${t('Copy')}</span></button>
      </div>
      <p class="to-password-made to-hint" role="status" hidden>${t('Twenty characters, made on this device and never sent anywhere. Copy it somewhere safe before you set it: there is no way to get it back.')}</p>
      <div class="to-row">
        <button type="submit" class="to-btn primary to-password-set" disabled>${icon(UI.lock, 16)}<span>${this.busy ? t('Sealing…') : has ? t('Change password') : t('Set password')}</span></button>
        ${has ? html`<button type="button" class="to-btn to-password-remove" ?disabled=${this.busy} @click=${() => void this.setPassword('')}>${icon(UI.unlock, 16)}<span>${t('Remove password')}</span></button>` : nothing}
      </div>
      <p class="to-password-send to-hint">${t('Send the password another way than the link.')}</p>
    </form>`;
  }

  /**
   * The Share dialog's Password…: whether the document has one, and the button that sets, changes or takes it off.
   * `has` is the shell's word, given as it draws: this element's own `protected` is set in the same pass, after.
   */
  renderProtect(has = this.protected): TemplateResult {
    return html`<section class="to-share-section to-share-protect" aria-labelledby="to-share-protect-h">
      <h3 id="to-share-protect-h">${t('Password')}</h3>
      <div class="to-share-protect-row">
        <p class="to-trust-line quiet">${icon(has ? UI.lock : UI.unlock, 18)}<span>${has ? t('Protected by a password') : t('No password')}</span></p>
        <button type="button" class="to-btn to-password-open" aria-haspopup="dialog" @click=${(e: Event) => void this.passwordFrom(e.currentTarget as HTMLElement)}>${icon(UI.lock, 16)}<span>${t('Password…')}</span></button>
      </div>
    </section>`;
  }

  render() {
    const held = this.held;
    const privacy = html`<to-dialog class="to-privacy-dialog" heading=${t('Privacy')} .body=${held ? html`${this.doc ? this.renderDoc() : nothing}${this.renderDevice(held)}` : nothing}></to-dialog>`;
    if (!this.doc) return privacy;
    const unlocking = unlockForm({ wrong: this.wrong, busy: this.busy, submit: (e) => void this.tryPassword(e), input: () => (this.wrong = false) });
    return html`${privacy}<to-dialog class="to-unlock-dialog" heading=${t('This document is locked')} .body=${unlocking}></to-dialog>
      <to-dialog class="to-password-dialog" heading=${t('Password')} .body=${this.renderPassword()}></to-dialog>`;
  }
}
customElements.define('to-privacy', ToPrivacy);
