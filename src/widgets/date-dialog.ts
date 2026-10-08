/**
 * Putting a date in a text: the browser's own date picker, today to start
 * with, and the date written out in one of a few plain ways, each shown as
 * it will read. Answers with the words to put in, or null.
 */
import { LitElement, html } from 'lit';
import { icon, UI } from '../lib/icons.ts';
import { store } from '../lib/store.ts';
import type { SlDialog, SlInput } from '../lib/shoelace.ts';

const FORMATS: { id: string; say: (d: Date) => string }[] = [
  { id: 'long', say: (d) => d.toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' }) },
  { id: 'day', say: (d) => d.toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric', year: 'numeric' }) },
  { id: 'iso', say: (d) => `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}` },
];
const today = () => FORMATS[2].say(new Date());
/** A "YYYY-MM-DD" as a date at noon where the reader is (so no time zone moves it to another day). */
const dayOf = (iso: string) => {
  const [y, m, d] = iso.split('-').map(Number);
  return new Date(y, m - 1, d, 12);
};
export const sayDate = (iso: string, format = 'long') => (FORMATS.find((f) => f.id === format) ?? FORMATS[0]).say(dayOf(iso));

export class ToDateDialog extends LitElement {
  static properties = { day: { state: true }, format: { state: true } };
  declare day: string;
  declare format: string;
  private answer: (s: string | null) => void = () => {};
  constructor() {
    super();
    this.day = today();
    this.format = store.get('tinyoffice.dateformat') ?? 'long';
  }
  protected createRenderRoot() {
    return this;
  }
  async ask(): Promise<string | null> {
    this.day = today();
    await this.updateComplete;
    void this.querySelector<SlDialog>('sl-dialog')!.show();
    return new Promise((done) => (this.answer = done));
  }
  private finish(v: string | null) {
    const done = this.answer;
    this.answer = () => {};
    void this.querySelector<SlDialog>('sl-dialog')?.hide();
    if (v !== null) store.set('tinyoffice.dateformat', this.format);
    done(v);
  }
  render() {
    const ok = /^\d{4}-\d\d-\d\d$/.test(this.day);
    return html`<sl-dialog class="to-date-dialog" label="Insert a date" @sl-request-close=${(e: Event) => e.target === e.currentTarget && this.finish(null)}>
      <sl-input type="date" label="Date" .value=${this.day} @sl-input=${(e: Event) => (this.day = (e.target as SlInput).value)} @sl-change=${(e: Event) => (this.day = (e.target as SlInput).value)}></sl-input>
      <fieldset class="dd-formats">
        <legend>Written as</legend>
        ${FORMATS.map((f) => html`<label><input type="radio" name="dd-format" .value=${f.id} .checked=${this.format === f.id} @change=${() => (this.format = f.id)} /> ${ok ? f.say(dayOf(this.day)) : f.id}</label>`)}
      </fieldset>
      <span slot="footer" class="to-spacer"></span>
      <sl-button slot="footer" size="small" @click=${() => this.finish(null)}>Cancel</sl-button>
      <sl-button slot="footer" class="dd-ok" size="small" variant="primary" ?disabled=${!ok} @click=${() => this.finish(sayDate(this.day, this.format))}>${icon(UI.cal, 14)} Insert</sl-button>
    </sl-dialog>`;
  }
}
if (!customElements.get('to-date-dialog')) customElements.define('to-date-dialog', ToDateDialog);

let one: ToDateDialog | null = null;
export function askDate(): Promise<string | null> {
  if (!one || !one.isConnected) {
    one = document.createElement('to-date-dialog') as ToDateDialog;
    document.body.append(one);
  }
  return one.ask();
}
