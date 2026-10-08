/**
 * Making a link: the dialog behind Mod+K and every Link button. It asks
 * for the address (and the words, when nothing was selected to link) and
 * answers with what was chosen; the text box it came from does the rest.
 * An address typed without its start gets one: "example.com" is a web
 * address, "ada@example.com" an email's.
 */
import { LitElement, html, nothing } from 'lit';
import { icon, UI } from '../lib/icons.ts';
import { linkable, linkTarget } from '../lib/richtext.ts';
import type { SlDialog, SlInput } from '../lib/shoelace.ts';

export type LinkAnswer = { url: string; text: string } | { remove: true } | null;

/** "example.com" as a web address, "a@b.co" as an email's; anything already whole as it is. '' when it cannot be a link. */
export function fullAddress(typed: string): string {
  const t = typed.trim();
  if (!t) return '';
  if (/^[a-z][a-z0-9+.-]*:/i.test(t) || t.startsWith('#')) return linkable(t) ? linkTarget(t) : '';
  if (/^[^\s@/]+@[^\s@/]+\.[^\s@/]+$/.test(t)) return 'mailto:' + t;
  if (/^\+?[\d\s().-]{6,}$/.test(t)) return 'tel:' + t.replace(/[^\d+]/g, '');
  if (/^[^\s/]+\.[a-z]{2,}(?:[/?#]\S*)?$/i.test(t)) return 'https://' + t;
  return '';
}

export class ToLinkDialog extends LitElement {
  static properties = { url: { state: true }, text: { state: true }, askText: { state: true }, editing: { state: true }, tried: { state: true } };
  declare url: string;
  declare text: string;
  declare askText: boolean;
  declare editing: boolean;
  declare tried: boolean;
  private answer: (a: LinkAnswer) => void = () => {};

  constructor() {
    super();
    this.url = '';
    this.text = '';
    this.askText = false;
    this.editing = false;
    this.tried = false;
  }
  protected createRenderRoot() {
    return this;
  }

  async ask(o: { url: string; text: string; askText: boolean }): Promise<LinkAnswer> {
    this.url = o.url;
    this.text = o.text;
    this.askText = o.askText;
    this.editing = !!o.url;
    this.tried = false;
    await this.updateComplete;
    const dialog = this.querySelector<SlDialog>('sl-dialog')!;
    void dialog.show();
    void this.updateComplete.then(() => setTimeout(() => this.querySelector<SlInput>('.ld-url')?.focus(), 0));
    return new Promise((done) => (this.answer = done));
  }

  private finish(a: LinkAnswer) {
    const done = this.answer;
    this.answer = () => {};
    void this.querySelector<SlDialog>('sl-dialog')?.hide();
    done(a);
  }
  private submit = () => {
    const url = fullAddress(this.url);
    this.tried = true;
    if (!url || (this.askText && !this.text.trim())) return;
    this.finish({ url, text: this.text });
  };

  render() {
    const bad = this.tried && !fullAddress(this.url);
    return html`<sl-dialog class="to-link-dialog" label=${this.editing ? 'Edit link' : 'Add a link'} @sl-request-close=${(e: Event) => e.target === e.currentTarget && this.finish(null)}>
      <form @submit=${(e: Event) => (e.preventDefault(), this.submit())}>
        ${this.askText
          ? html`<sl-input class="ld-text" label="Words" placeholder="What the link says" ?data-invalid=${this.tried && !this.text.trim()} help-text=${this.tried && !this.text.trim() ? 'Write the words the link shows.' : ''} .value=${this.text} @sl-input=${(e: Event) => (this.text = (e.target as SlInput).value)} @keydown=${(e: KeyboardEvent) => e.key === 'Enter' && (e.preventDefault(), this.submit())}></sl-input>`
          : html`<p class="ld-words">Linking <b>${this.text}</b></p>`}
        <sl-input class="ld-url" label="Address" placeholder="https://example.com" inputmode="url" autocomplete="url" spellcheck="false"
          help-text=${bad ? 'That is not a web, email or phone address.' : 'A web address, an email address, or a phone number.'}
          ?data-invalid=${bad}
          .value=${this.url}
          @sl-input=${(e: Event) => (this.url = (e.target as SlInput).value)}
          @keydown=${(e: KeyboardEvent) => e.key === 'Enter' && (e.preventDefault(), this.submit())}></sl-input>
        <button type="submit" hidden></button>
      </form>
      ${this.editing ? html`<sl-button slot="footer" class="ld-remove" size="small" variant="danger" outline @click=${() => this.finish({ remove: true })}>${icon(UI.trash, 14)} Remove link</sl-button>` : nothing}
      <span slot="footer" class="to-spacer"></span>
      <sl-button slot="footer" size="small" @click=${() => this.finish(null)}>Cancel</sl-button>
      <sl-button slot="footer" class="ld-ok" size="small" variant="primary" @click=${this.submit}>${icon(UI.link, 14)} ${this.editing ? 'Save' : 'Link'}</sl-button>
    </sl-dialog>`;
  }
}
if (!customElements.get('to-link-dialog')) customElements.define('to-link-dialog', ToLinkDialog);

let one: ToLinkDialog | null = null;
/** Ask for a link. */
export function askLink(o: { url: string; text: string; askText: boolean }): Promise<LinkAnswer> {
  if (!one || !one.isConnected) {
    one = document.createElement('to-link-dialog') as ToLinkDialog;
    document.body.append(one);
  }
  return one.ask(o);
}
