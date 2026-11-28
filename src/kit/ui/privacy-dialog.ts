/**
 * <to-privacy>: a document's privacy, and the Privacy dialog. The shell's (with `doc`) holds everything about a
 * document's password, for every app: the unlock dialog a sealed link opens with (nothing of the document, its
 * title included, until the password is given); the Share dialog's Password switch (set, change, take off: the
 * document sealed again at once; renderProtect, drawn there by <to-share>); the lock beside
 * the title while there is a password (trustButton, drawn in the header); and the Privacy dialog, opened from that
 * lock: this document's password; what this device holds, item by item, each with Forget, the
 * browser's own history last (every document opened here, and not ours to clear), and Forget everything; and what our
 * server holds by a person's choice, a preview sent with a link to a network (kit/share/card.ts). (Without
 * `doc`, the Privacy dialog alone.)
 *
 * It gets the document's state through properties (`sealed`, `protected`) and does the work through
 * kit/share/privacy.ts; what changes the document goes back to the shell as events: `to-unlock` (detail: the text and
 * its locker, the password given), `to-lock` (detail: the new locker, or null for none) and `to-share-open`.
 */
import { LitElement, html, nothing, type TemplateResult } from 'lit';
import { onLanguage, t } from '../core/i18n.ts';
import { icon, UI } from '../draw/icons.ts';
import { toast } from '../core/say.ts';
import { copyText } from '../share/share.ts';
import { forgetDocuments, forgetEverything, forgetLinks, forgetPrefs, holdings, keeping, lockWith, onPrivacy, remember, unlock, type Holdings } from '../share/privacy.ts';
import type { Locker } from '../share/crypt.ts';
import { generatePassword } from '../share/passwords.ts';
import { unlockForm } from './locked-doc.ts';
import { infoTip, marked } from './info-tip.ts';
import type { ToDialog } from './dialog.ts';
import './dialog.ts';

/**
 * The lock beside the title, while the document has a password: locked (a sealed link not opened yet: the unlock
 * dialog) or protected (opened: the Privacy dialog). Nothing while it has none: there is nothing to say.
 */
export function trustButton(sealed: boolean, locked: boolean, open: () => void): TemplateResult | typeof nothing {
  if (!sealed && !locked) return nothing;
  const words = sealed ? t('privacy-locked') : t('privacy-protected-by-password');
  const tip = `${words} · ${keeping() ? t('common-saving-in-this-browser') : t('common-nothing-saved-in-this-browser')}`;
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
    made: { state: true },
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
  /** A password being tried, or set. */
  declare busy: boolean;
  /**
   * The password Share shows under its switch: made here (at the switch, and at Regenerate) or given to open the
   * link, and '' while it is not known (a document whose password was set before this visit, which holds only its key).
   */
  declare made: string;
  private off = () => {};
  private offLang: () => void = () => {};

  constructor() {
    super();
    this.doc = false;
    this.sealed = '';
    this.protected = false;
    this.wrong = false;
    this.busy = false;
    this.held = null;
    this.made = '';
  }
  createRenderRoot() {
    return this;
  }
  connectedCallback() {
    super.connectedCallback();
    this.off = onPrivacy(() => void this.refresh());
    // The dialogs are drawn before a language other than English has loaded; drawn again when it has (their headings read in English otherwise).
    this.offLang = onLanguage(() => this.requestUpdate());
  }
  disconnectedCallback() {
    super.disconnectedCallback();
    this.off();
    this.offLang();
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
      this.made = field.value;
      this.say('to-unlock', r);
    } finally {
      this.busy = false;
    }
  }
  /**
   * A password set or changed (the document sealed again at once), or taken off (`password` empty). `made` is set
   * before the shell hears: Share's part is drawn by the shell, again as it takes the new locker.
   */
  private async setPassword(password: string) {
    if (this.busy) return;
    this.busy = true;
    try {
      const locker: Locker | null = password ? await lockWith(password) : null;
      if (locker) remember(locker);
      this.made = password;
      this.say('to-lock', locker);
      toast(password ? t('privacy-password-set-link-holds-only') : t('privacy-password-removed'));
    } finally {
      this.busy = false;
    }
  }

  /* ---------- the device ---------- */

  private async forgetAll() {
    if (!confirm(t('privacy-forget-everything-this-site-keeps'))) return;
    await forgetEverything();
    toast(t('common-nothing-saved-in-this-browser'));
  }

  /* ---------- drawn ---------- */

  private renderDoc() {
    return html`<section class="to-privacy-section to-privacy-doc" aria-labelledby="to-privacy-doc-h">
      <h3 id="to-privacy-doc-h">${t('common-this-document')}</h3>
      <p class="to-trust-line quiet">${icon(this.protected ? UI.lock : UI.unlock, 18)}<span>${this.protected ? t('privacy-protected-by-password') : t('privacy-no-password')}</span></p>
      <button type="button" class="to-btn to-privacy-share" @click=${() => (this.close(), this.say('to-share-open', null))}>${icon(UI.share, 16)}<span>${t('privacy-set-password-in-share')}</span></button>
    </section>`;
  }

  private renderDevice(held: Holdings) {
    const row = (cls: string, what: string, about: string, now: string, forget: (() => void) | null) =>
      html`<li class=${cls}><span class="to-held-words"><b>${what}</b><small>${about}</small></span><span class="to-held-now">${now}</span>${forget ? html`<button type="button" class="to-btn to-held-forget" @click=${forget}>${t('common-forget')}</button>` : nothing}</li>`;
    return html`<section class="to-privacy-section to-privacy-device" aria-labelledby="to-privacy-device-h">
      <h3 id="to-privacy-device-h">${t('privacy-what-this-device-holds')}</h3>
      <p class="to-trust-line quiet">${icon(keeping() ? UI.device : UI.private, 18)}<span>${keeping() ? t('common-saving-in-this-browser') : t('privacy-nothing-saved-in-this-browser')}</span></p>
      <ul class="to-held">
        ${row('to-held-prefs', t('privacy-preferences'), t('privacy-theme-lifetime-of-short-links'), held.prefs ? t('privacy-n-set', { n: held.prefs }) : t('privacy-none'), held.prefs ? () => forgetPrefs() : null)}
        ${row('to-held-docs', t('privacy-your-documents'), t('privacy-their-names-and-links-for'), t('common-n-documents', { n: held.documents }), held.documents ? () => forgetDocuments() : null)}
        ${row('to-held-links', t('privacy-short-links'), t('privacy-short-links-made-here-until'), t('privacy-n-links', { n: held.links }), held.links ? () => forgetLinks() : null)}
        ${row('to-held-history', t('privacy-your-browsers-history'), t('privacy-every-document-opened-here-in'), t('privacy-not-ours-to-clear'), null)}
      </ul>
      <button type="button" class="to-btn to-forget-all" @click=${() => void this.forgetAll()}>${icon(UI.trash, 16)}<span>${t('privacy-forget-everything')}</span></button>
      <p class="to-hint to-privacy-cards">${t('privacy-preview-sent-with-link-to')}</p>
    </section>`;
  }

  /**
   * Share's Password: a switch (issue #61), on while the document has one, its words behind an info button. Turned on,
   * it seals the document with a password the app makes (Paul, 2026-10-11: "Only you can generate passwords for users.
   * That keeps them secure"), shown under it on one line: the password, read-only, joined to its Copy, and Regenerate,
   * which seals it again with a new one. Turned off, it takes the password off. `has` is the shell's word, given as it
   * draws: this element's own `protected` is set in the same pass, after.
   */
  renderProtect(has = this.protected): TemplateResult {
    const made = has ? this.made : '';
    return html`<div class="to-share-option to-share-protect">
      <div class="to-share-option-head">
        <label class="to-switch">
          <input type="checkbox" role="switch" class="to-password-switch" .checked=${has} @change=${(e: Event) => void this.setPassword((e.target as HTMLInputElement).checked ? generatePassword() : '')} />
          <span class="to-switch-words"><b>${t('common-password')}</b></span>
        </label>
        ${infoTip('to-tip-password', t('share-about', { option: t('common-password') }), html`<p>${t('privacy-anyone-with-link-will-need')}</p><p>${marked(t('privacy-if-you-lose-it'))}</p>`)}
      </div>
      ${
        has
          ? html`<div class="to-password-shown">
            ${
              made
                ? html`<div class="to-password-pill">
                  <input type="text" class="to-password-made" readonly .value=${made} aria-label=${t('common-password')} autocomplete="off" spellcheck="false" autocapitalize="off" @focus=${(e: Event) => (e.target as HTMLInputElement).select()} />
                  <button type="button" class="to-btn to-password-copy" aria-label=${t('common-copy')} title=${t('common-copy')} @click=${() => void copyText(made, t('privacy-password-copied'))}>${icon(UI.copy, 18)}</button>
                </div>`
                : html`<p class="to-trust-line quiet">${icon(UI.lock, 18)}<span>${t('privacy-protected-by-password')}</span></p>`
            }
            <button type="button" class="to-btn to-password-another" aria-label=${t('privacy-make-another')} @click=${() => void this.setPassword(generatePassword())}>${icon(UI.refresh, 16)}<span>${t('privacy-make-another')}</span></button>
          </div>`
          : nothing
      }
    </div>`;
  }

  render() {
    const held = this.held;
    const privacy = html`<to-dialog class="to-privacy-dialog" heading=${t('privacy-privacy')} .body=${held ? html`${this.doc ? this.renderDoc() : nothing}${this.renderDevice(held)}` : nothing}></to-dialog>`;
    if (!this.doc) return privacy;
    const unlocking = unlockForm({ wrong: this.wrong, busy: this.busy, submit: (e) => void this.tryPassword(e), input: () => (this.wrong = false) });
    return html`${privacy}<to-dialog class="to-unlock-dialog" heading=${t('common-this-document-is-locked')} .body=${unlocking}></to-dialog>`;
  }
}
customElements.define('to-privacy', ToPrivacy);
