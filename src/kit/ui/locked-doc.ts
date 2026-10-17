/**
 * A locked document placed in another, opened in an editor (kit/share/locked.ts holds the fence and the card).
 *
 *   unlockForm(o)      the unlock dialog's form: one password field and Unlock, a wrong password said so.
 *                      The shell's own unlock dialog draws it too, so there is one.
 *   openPlaced(body)   a locked fence's document opened: by a password already given this visit, or the
 *                      unlock dialog; its text kept for the visit (never written into the outer document).
 *   <to-locked-doc>    the card in an editor: the locked card, a tap asks for the password; opened, the
 *                      document drawn small. With `caption`, its name and app under it.
 */
import { LitElement, html, nothing, type TemplateResult } from 'lit';
import { unsafeSVG } from 'lit/directives/unsafe-svg.js';
import { lookup } from '../core/app.ts';
import type { Locker } from '../share/crypt.ts';
import type { ToDialog } from './dialog.ts';
import { icon, UI } from '../draw/icons.ts';
import { t } from '../core/i18n.ts';
import { lockedOf, lockedPage, notOpened, openedText, setOpened } from '../share/locked.ts';
import { reopen, unlock } from '../share/privacy.ts';
import './dialog.ts';

/** Said on the window when a placed document is opened, so every card of it draws it open. */
export const OPENED_EVENT = 'to-locked-open';

/** The unlock dialog's form: the field, Unlock (Opening… while it works), and a wrong password said so. */
export function unlockForm(o: { wrong: boolean; busy: boolean; submit: (e: Event) => void; input: () => void }): TemplateResult {
  return html`<form class="to-unlock" @submit=${o.submit}>
    <p>${t('privacy-enter-password-to-open-this')}</p>
    <div class="to-ask-row">
      <input type="password" class="to-unlock-field" aria-label=${t('common-password')} autocomplete="off" aria-invalid=${String(o.wrong)} aria-describedby="to-unlock-wrong" @input=${o.input} />
      <button type="submit" class="to-btn primary to-unlock-go" ?disabled=${o.busy}>${icon(UI.unlock, 16)}<span>${o.busy ? t('privacy-opening') : t('privacy-unlock')}</span></button>
    </div>
    <p id="to-unlock-wrong" class="to-unlock-wrong" role="alert">${o.wrong ? notOpened() : ''}</p>
  </form>`;
}

type Opened = { app: string; payload: string; text: string; locker: Locker };

/** The unlock dialog on the page for a sealed payload: its text and locker, or null when closed without the password. */
function askUnlock(payload: string): Promise<{ text: string; locker: Locker } | null> {
  return new Promise((done) => {
    const d = document.createElement('to-dialog') as ToDialog;
    d.heading = t('common-this-document-is-locked');
    d.className = 'to-unlock-dialog to-locked-unlock';
    let wrong = false;
    let busy = false;
    let answer: { text: string; locker: Locker } | null = null;
    const draw = () => (d.body = unlockForm({ wrong, busy, submit, input: () => wrong && ((wrong = false), draw()) }));
    const submit = async (e: Event) => {
      e.preventDefault();
      const field = d.querySelector<HTMLInputElement>('.to-unlock-field');
      if (!field || busy) return;
      busy = true;
      draw();
      const r = await unlock(field.value, payload);
      busy = false;
      if (r) {
        answer = r;
        d.close();
        return;
      }
      wrong = true;
      draw();
      field.select();
    };
    draw();
    d.addEventListener('to-close', () => {
      d.remove();
      done(answer);
    });
    document.body.append(d);
    void d.show().then(() => d.querySelector<HTMLInputElement>('.to-unlock-field')?.focus());
  });
}

/** A locked fence's document, opened: by a password given this visit, else the unlock dialog. Null when it is not opened. */
export async function openPlaced(body: string): Promise<Opened | null> {
  const it = lockedOf(body);
  if (!it) return null;
  const r = (await reopen(it.payload)) ?? (await askUnlock(it.payload));
  if (!r) return null;
  const fresh = openedText(it.payload) === undefined;
  setOpened(it.payload, r.text);
  if (fresh) window.dispatchEvent(new Event(OPENED_EVENT));
  return { ...it, ...r };
}

/** The card of a locked document in an editor: locked, a button that asks for the password; opened, the document. */
export class ToLockedDoc extends LitElement {
  static properties = { ref: { attribute: false }, caption: { type: Boolean } };
  /** The locked fence's body: the sealed link. */
  declare ref: string;
  declare caption: boolean;
  constructor() {
    super();
    this.ref = '';
    this.caption = false;
  }
  createRenderRoot() {
    return this;
  }
  private redraw = () => this.requestUpdate();
  connectedCallback() {
    super.connectedCallback();
    window.addEventListener(OPENED_EVENT, this.redraw);
  }
  disconnectedCallback() {
    super.disconnectedCallback();
    window.removeEventListener(OPENED_EVENT, this.redraw);
  }
  render() {
    const it = lockedOf(this.ref);
    const def = it ? lookup.appOf(it.app) : undefined;
    const text = it ? openedText(it.payload) : undefined;
    const page = lockedPage(this.ref, { small: true, open: true });
    const drawn = html`<svg viewBox="0 0 ${page.w} ${page.h}" role="img" aria-label=${page.alt ?? ''}>${unsafeSVG(page.svg)}</svg>`;
    const name = text !== undefined && def ? def.title(text) || def.name : t('common-locked-document');
    const caption = this.caption && def ? html`<figcaption><b>${name}</b><small>${def.name}</small></figcaption>` : nothing;
    if (!it || text !== undefined) return html`${drawn}${caption}`;
    return html`<button type="button" class="to-locked-open" aria-label=${t('locked-with-password-unlock')} title=${t('common-unlock-ellipsis')} @click=${(e: Event) => (e.stopPropagation(), void openPlaced(this.ref))}>${drawn}</button>${caption}`;
  }
}
if (!customElements.get('to-locked-doc')) customElements.define('to-locked-doc', ToLockedDoc);

declare global {
  interface HTMLElementTagNameMap {
    'to-locked-doc': ToLockedDoc;
  }
}
