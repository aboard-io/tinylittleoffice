/**
 * A card's fields as the editor draws them, in the reader's language (model.ts says which, and how: `cardFieldsOf`):
 * an amount short (whole amounts without their cents, as a pipeline is read: $12,000), a day short (Dec 15, and the
 * year only when it is not this one), a person as their initials and a hue of their own, the same for the same name on
 * every card (and everywhere else the kit draws them: kit/ui/initials.ts). The model's words (`shown`) stay the Spreadsheet's, for a page, a print and a screen reader; these are
 * the card's face. No DOM: the editor's tests and a host's page use them alike.
 */
import { serialToIso } from '../../doc/index.ts';
import { language } from '../../kit/core/i18n.ts';

/** An amount in a currency (a code, USD, or a symbol, $), its cents shown only where it has some. */
export function moneyShort(v: number, currency = '$', lang: string = language()): string {
  const digits = Math.round(v * 100) % 100 === 0 ? 0 : 2;
  if (/^[A-Z]{3}$/.test(currency))
    try {
      return new Intl.NumberFormat(lang, { style: 'currency', currency, minimumFractionDigits: digits, maximumFractionDigits: digits }).format(v);
    } catch {
      // Not a currency the browser knows: written as a symbol.
    }
  return (v < 0 ? '-' : '') + currency + new Intl.NumberFormat(lang, { minimumFractionDigits: digits, maximumFractionDigits: digits }).format(Math.abs(v));
}

/** A day (a serial day, as a table works one out, or "2026-12-15") short: its month and day, its year where it is not `now`'s. Null where it is no day. */
export function dayShort(v: unknown, lang: string = language(), now = new Date()): string | null {
  const iso = typeof v === 'number' && isFinite(v) ? serialToIso(v) : typeof v === 'string' ? v.trim() : '';
  const m = /^(\d{4})-(\d{2})-(\d{2})$/.exec(iso);
  if (!m) return null;
  const day = new Date(Number(m[1]), Number(m[2]) - 1, Number(m[3]));
  const opts: Intl.DateTimeFormatOptions = { month: 'short', day: 'numeric', ...(day.getFullYear() === now.getFullYear() ? {} : { year: 'numeric' }) };
  try {
    return new Intl.DateTimeFormat(lang, opts).format(day);
  } catch {
    return new Intl.DateTimeFormat('en', opts).format(day);
  }
}

/**
 * A person's initials and a hue of their own are the kit's (kit/ui/initials.ts), the same on a card, in a typed table's
 * person cell and in a page's <to-avatar>: served here under the Board's names.
 */
export { hueOf, initial as initials } from '../../kit/ui/initials.ts';
