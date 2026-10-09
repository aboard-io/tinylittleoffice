/**
 * <to-invoice>: an invoice as a form laid out like the paper it will be:
 * who it is from and for, its number and dates, the lines of work with
 * their sums done as they are typed, and the notes at the foot. Enter in a
 * line's last box starts the next line, with the cursor in it. Document
 * format: invoice.def.ts (the settings in the header, the items a table).
 */
import { DocElement, defineElement, html, nothing, tool, btn, icon, UI } from '../kit.ts';
import { readLines, writeLines, type Row } from '../lib/lines.ts';
import { amountOf } from '../lib/tlo.ts';
import { FORM, ITEM, parseInvoice, spec } from './invoice.def.ts';
import '../widgets/insert-box.ts';
import './invoice.css';

interface Item {
  what: string;
  qty: string;
  unit: string;
  price: string;
}
interface Doc {
  /** The settings, by the key they are written under: from, to, number, date, due, tax, currency, terms. */
  fields: Record<string, string>;
  items: Item[];
  notes: string[];
}

const SETTINGS = FORM.filter((k) => k.once);
const NOTE = FORM.length - 1;
const FIELDS: (keyof Item)[] = ['what', 'qty', 'unit', 'price'];
const ISO = /^\d{4}-\d\d-\d\d$/;

export class ToInvoice extends DocElement<Doc> {
  protected parse(text: string): Doc {
    const doc: Doc = { fields: {}, items: [], notes: [] };
    for (const r of readLines(text, FORM)) {
      const [a = '', b = '', c = '', d = ''] = r.values;
      if (r.kind < ITEM) doc.fields[FORM[r.kind].key!] = a;
      else if (r.kind === ITEM) doc.items.push({ what: a, qty: b, unit: c, price: d });
      else doc.notes.push(a);
    }
    return doc;
  }
  protected serialize(doc: Doc): string {
    const rows: Row[] = [];
    for (const k of SETTINGS) if (doc.fields[k.key!]?.trim()) rows.push({ kind: FORM.indexOf(k), values: [doc.fields[k.key!].trim()], depth: 0 });
    for (const it of doc.items) rows.push({ kind: ITEM, values: FIELDS.map((f) => it[f].trim()), depth: 0 });
    for (const n of doc.notes) if (n.trim()) rows.push({ kind: NOTE, values: [n.trim()], depth: 0 });
    return writeLines(rows, FORM);
  }

  private setField(key: string, value: string) {
    this.commit({ ...this.doc, fields: { ...this.doc.fields, [key]: value } });
  }
  /** An address is lines joined by " | "; a line typed into is set, and trailing empty ones are not kept. */
  private setLine(key: string, n: number, value: string) {
    const lines = (this.doc.fields[key] ?? '').split(' | ');
    while (lines.length <= n) lines.push('');
    lines[n] = value.replace(/ \| /g, ' ');
    while (lines.length && !lines[lines.length - 1].trim()) lines.pop();
    this.setField(key, lines.join(' | '));
  }
  private patchItem(i: number, p: Partial<Item>) {
    this.commit({ ...this.doc, items: this.doc.items.map((it, j) => (j === i ? { ...it, ...p } : it)) });
  }
  /** A new line after line `after` (the last, by default), with the cursor in it. */
  private addItem(after = this.doc.items.length - 1) {
    const items = [...this.doc.items];
    items.splice(after + 1, 0, { what: '', qty: '', unit: '', price: '' });
    this.commit({ ...this.doc, items });
    this.focusSoon(`input[aria-label="What, line ${after + 2}"]`);
  }
  private removeItem(i: number) {
    this.commit({ ...this.doc, items: this.doc.items.filter((_, j) => j !== i) });
  }

  /** Enter moves on to the next box, and from the last starts the next line; Backspace in an empty line takes it away. */
  private onItemKey(e: KeyboardEvent, i: number, f: number) {
    const it = this.doc.items[i];
    if (e.key === 'Enter') {
      e.preventDefault();
      if (f < FIELDS.length - 1) this.focusSoon(`input[aria-label="${label(FIELDS[f + 1], i)}"]`);
      else this.addItem(i);
    } else if (e.key === 'Backspace' && FIELDS.every((k) => !it[k]) && this.doc.items.length > 1) {
      e.preventDefault();
      this.removeItem(i);
      const to = Math.max(0, i - 1);
      this.focusSoon(`input[aria-label="${label(i ? 'price' : 'what', to)}"]`);
    } else if (e.key === 'Escape') (e.target as HTMLElement).blur();
  }

  private insert(what: string) {
    if (what === 'item') this.addItem();
    else this.focusSoon('.inv-notes');
  }

  private address(key: string, legend: string, hints: [string, string]) {
    const lines = (this.doc.fields[key] ?? '').split(' | ');
    const n = Math.max(2, lines.length + (lines[lines.length - 1]?.trim() ? 1 : 0));
    return html`<fieldset class="inv-party">
      <legend>${legend}</legend>
      ${Array.from({ length: n }, (_, i) => html`<input class=${i ? '' : 'strong'} aria-label="${legend}, line ${i + 1}" placeholder=${hints[i] ?? 'Another line'} .value=${lines[i] ?? ''} @input=${(e: Event) => this.setLine(key, i, (e.target as HTMLInputElement).value)} />`)}
    </fieldset>`;
  }
  private field(key: string, name: string, hint: string, cls = '') {
    return html`<label class="inv-field ${cls}"><span>${name}</span><input aria-label=${name} placeholder=${hint} .value=${this.doc.fields[key] ?? ''} @input=${(e: Event) => this.setField(key, (e.target as HTMLInputElement).value)} /></label>`;
  }
  /** A date is picked from the browser's own date box; one written another way ("1 March") is shown as typed. */
  private day(key: string, name: string) {
    const v = this.doc.fields[key] ?? '';
    return html`<label class="inv-field"><span>${name}</span><input type=${!v || ISO.test(v) ? 'date' : 'text'} aria-label=${name} .value=${v} @input=${(e: Event) => this.setField(key, (e.target as HTMLInputElement).value)} @change=${(e: Event) => this.setField(key, (e.target as HTMLInputElement).value)} /></label>`;
  }

  render() {
    const doc = this.doc;
    const inv = parseInvoice(this.serialize(doc));
    const amount = (it: Item) => (it.qty.trim() ? amountOf(it.qty) || 0 : 1) * (amountOf(it.price) || 0);
    const blank = this.serialize(doc) === '';
    return html`
      <div class="to-toolbar" role="toolbar" aria-label="Invoice">
        <to-insert label="Insert" .options=${[{ value: 'item', label: 'A line', icon: 'plus' as const }, { value: 'note', label: 'A note at the foot', icon: 'text' as const }]} @pick=${(e: CustomEvent<string>) => this.insert(e.detail)}></to-insert>
        ${blank ? tool('Start from an example', 'sparkles', () => this.commit(this.parse(spec.example)), { text: true }) : nothing}
        <span class="to-spacer"></span>
        <span class="to-hint inv-total-hint">Total <b>${inv.money(inv.total)}</b></span>
        ${tool('PDF', 'download', () => this.dispatchEvent(new CustomEvent('to-download', { detail: 'pdf', bubbles: true, composed: true })), { text: true, key: 'Mod+P' })}
      </div>
      <form class="inv" @submit=${(e: Event) => e.preventDefault()}>
        <div class="inv-head">
          <h2>Invoice</h2>
          ${this.field('number', 'Number', 'Invoice number', 'inv-number')}
        </div>
        <div class="inv-parties">
          ${this.address('from', 'From', ['Your name', 'Your address'])}
          ${this.address('to', 'To', ['Who this is for', 'Their address'])}
        </div>
        <div class="inv-meta">
          ${this.day('date', 'Date')}
          ${this.day('due', 'Due')}
          ${this.field('terms', 'Terms', 'Payment terms')}
          ${this.field('tax', 'Tax rate', '8%')}
          ${this.field('currency', 'Currency', '$, £ or €')}
        </div>
        <table class="inv-items">
          <thead>
            <tr><th scope="col">Description</th><th scope="col" class="n">Qty</th><th scope="col">Units</th><th scope="col" class="n">Price</th><th scope="col" class="n">Amount</th><th scope="col"><span class="sr-only">Remove</span></th></tr>
          </thead>
          <tbody>
            ${doc.items.map(
              (it, i) => html`<tr>
                ${FIELDS.map((f, n) => html`<td class=${f === 'qty' || f === 'price' ? 'n' : f} data-th=${['Description', 'Qty', 'Units', 'Price'][n]}><input class=${f} inputmode=${f === 'qty' || f === 'price' ? 'decimal' : nothing} aria-label=${label(f, i)} placeholder=${['What was done', '1', 'hours', '0.00'][n]} .value=${it[f]} @input=${(e: Event) => this.patchItem(i, { [f]: (e.target as HTMLInputElement).value })} @keydown=${(e: KeyboardEvent) => this.onItemKey(e, i, n)} /></td>`)}
                <td class="n amount" data-th="Amount">${inv.money(amount(it))}</td>
                <td class="x">${btn(`Remove line ${i + 1}`, 'close', () => this.removeItem(i), { size: 14 })}</td>
              </tr>`,
            )}
            ${doc.items.length ? nothing : html`<tr class="inv-empty"><td colspan="6"><button type="button" class="inv-first" @click=${() => this.addItem()}>${icon(UI.plus, 14)} The first line: what was done, how much, at what price</button></td></tr>`}
          </tbody>
          <tfoot>
            ${inv.tax ? html`<tr><td colspan="4" class="n">Subtotal</td><td class="n" data-inv="subtotal">${inv.money(inv.subtotal)}</td><td></td></tr>
              <tr><td colspan="4" class="n">Tax (${doc.fields.tax})</td><td class="n" data-inv="taxed">${inv.money(inv.tax)}</td><td></td></tr>` : nothing}
            <tr class="total"><td colspan="4" class="n">Total</td><td class="n" data-inv="total">${inv.money(inv.total)}</td><td></td></tr>
          </tfoot>
        </table>
        <textarea class="inv-notes" aria-label="Notes" rows="2" placeholder="Notes at the foot: thanks, how to pay" .value=${doc.notes.join('\n')} @input=${(e: Event) => this.commit({ ...doc, notes: (e.target as HTMLTextAreaElement).value.split('\n') })}></textarea>
      </form>
    `;
  }
}
/** What a line's box is called: "Qty, line 3". */
const label = (f: keyof Item, i: number) => `${{ what: 'What', qty: 'Qty', unit: 'Units', price: 'Price' }[f]}, line ${i + 1}`;

defineElement('invoice', ToInvoice);

declare global {
  interface HTMLElementTagNameMap {
    'to-invoice': ToInvoice;
  }
}
