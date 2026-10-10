/**
 * The currency a money column names, asked for when Money is picked in a column's menu (and picked again): one
 * field, Currency, offering the common symbols and codes, and OK at its right. Empty is none: the column's money
 * is in the document's currency (its head's `currency:`), else "$". A person types a symbol or a code, never the
 * column head's syntax; the code writes `money(£)` or `money(GBP)`. Resolves the currency ('' for none), or null
 * when closed without OK.
 */
import { html } from 'lit';
import { currencyOf } from '../../doc/index.ts';
import type { ToDialog } from '../../kit/dialog.ts';
import { t } from '../../kit/i18n.ts';
import '../../kit/dialog.ts';

/** The ones offered as the field is typed in. */
export const CURRENCIES = ['$', '£', '€', '¥', '₹', 'USD', 'EUR', 'GBP', 'JPY', 'INR', 'CNY', 'BRL', 'CAD', 'AUD', 'CHF'];

let n = 0;

export function askCurrency(now = ''): Promise<string | null> {
  return new Promise((done) => {
    const dialog = document.createElement('to-dialog') as ToDialog;
    const list = `sheet-currencies-${++n}`;
    dialog.heading = t('Money');
    dialog.className = 'to-ask-dialog sheet-currency-dialog';
    let value = now;
    let answer: string | null = null;
    const ok = () => !value.trim() || currencyOf(value) !== null;
    const draw = () =>
      (dialog.body = html`<form
        class="to-ask sheet-currency"
        novalidate
        @submit=${(e: Event) => {
          e.preventDefault();
          if (!ok()) return;
          answer = value.trim() ? currencyOf(value)! : '';
          dialog.close();
        }}
      >
        <label class="sheet-currency-label" for=${`${list}-field`}>${t('Currency')}</label>
        <div class="to-ask-row">
          <input id=${`${list}-field`} class="to-ask-url sheet-currency-field" type="text" list=${list} .value=${value} placeholder="$" aria-invalid=${ok() ? 'false' : 'true'} autocomplete="off" autocapitalize="characters" spellcheck="false" enterkeyhint="done" @input=${(e: Event) => ((value = (e.target as HTMLInputElement).value), draw())} />
          <button type="submit" class="to-btn primary to-ask-ok" ?disabled=${!ok()}>${t('OK')}</button>
        </div>
        <datalist id=${list}>${CURRENCIES.map((c) => html`<option value=${c}></option>`)}</datalist>
        ${ok() ? html`<p class="to-hint">${t('A symbol, like £, or a code, like GBP. Empty is the document’s own.')}</p>` : html`<p class="to-hint" role="alert">${t('A symbol of up to three characters, or a code of three letters.')}</p>`}
      </form>`);
    draw();
    dialog.addEventListener('to-close', () => {
      dialog.remove();
      done(answer);
    });
    document.body.append(dialog);
    void dialog.show().then(() => dialog.querySelector<HTMLInputElement>('.sheet-currency-field')?.focus());
  });
}
