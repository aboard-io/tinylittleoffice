/**
 * The mini forms, for what a thing has that is not words (its words are typed in the page, frame.ts): a
 * <to-dialog> hung near the thing (at the top of the screen on a phone, above its keyboard), holding exactly those
 * fields and a Done. Where a thing goes is an address field offering the site's own pages and sections, an icon a
 * button that opens the kit's picker. Nothing typed is a marker or a separator: the code writes the line. Done (or
 * Enter) resolves what the fields hold; Escape, the Close button or a tap outside resolves null, and nothing is
 * written. A form about a thing in the page has the thing's own bar under it (`lend`), inside the modal dialog, so
 * its moves are a tap away.
 *
 *   askPlace()  a button's, a big link's or a small link's: where it goes, its icon (the URL chip on its bar).
 *   askShop()   the shop: its currency, where orders go, and its products, edited in the Spreadsheet.
 */
import { html, nothing, type TemplateResult } from 'lit';
import { write, type Block, type TableBlock } from '../../doc/index.ts';
import type { ToDialog } from '../../kit/dialog.ts';
import { editTable } from '../../kit/doc-dialog.ts';
import { icon, iconNamed, UI } from '../../kit/icons.ts';
import { t } from '../../kit/i18n.ts';
import '../../kit/dialog.ts';

interface Form<T> {
  draw: () => void;
  finish: (v: T) => void;
  /** Done: the form's own answer. */
  submit: () => void;
}

/** Where a form hangs from: the thing's rect on the screen. */
export type Anchor = DOMRect | null;
/**
 * What the editor lends a form about a thing already in the page: given the open <dialog>, it puts the thing's bar
 * inside it (outside a modal dialog the page is inert, and Move, Duplicate and Delete stay a tap away so), and gives
 * back what takes the bar home again when the form closes.
 */
export type Lend = (d: HTMLDialogElement) => () => void;

/** A form on the page's body, hung under (or over) the anchor where the screen is wide; resolves what `done` gives, or null. */
function form<T>(heading: string, cls: string, anchor: Anchor, done: () => T | null, body: (f: Form<T>) => TemplateResult, lend?: Lend): Promise<T | null> {
  return new Promise((resolve) => {
    const dialog = document.createElement('to-dialog') as ToDialog;
    dialog.heading = heading;
    dialog.className = `site-form-dialog ${cls}`;
    let answer: T | null = null;
    let back: (() => void) | null = null;
    const f: Form<T> = {
      draw: () => (dialog.body = frame(f, body(f))),
      finish: (v) => {
        answer = v;
        dialog.close();
      },
      submit: () => {
        const v = done();
        if (v !== null) f.finish(v);
      },
    };
    f.draw();
    dialog.addEventListener('to-close', () => {
      back?.();
      dialog.remove();
      resolve(answer);
    });
    document.body.append(dialog);
    void dialog.show().then(() => {
      place(dialog.dialog, anchor);
      if (lend && dialog.dialog.open) back = lend(dialog.dialog);
      const first = dialog.querySelector<HTMLElement>('[data-first] .tx, input[data-first], button[data-first]');
      first?.focus({ preventScroll: true });
    });
  });
}
const frame = <T>(f: Form<T>, inner: TemplateResult) =>
  html`<form class="site-form" novalidate @submit=${(e: Event) => (e.preventDefault(), f.submit())}>
    ${inner}
    <div class="site-form-foot"><button type="submit" class="to-btn primary site-form-done">${icon(UI.check, 16)}<span>${t('Done')}</span></button></div>
  </form>`;

/** The dialog beside the thing where there is room (a wide screen); on a phone it keeps its place at the top, above the keyboard. */
function place(d: HTMLDialogElement, a: Anchor) {
  if (!a || window.innerWidth <= 760) return;
  const r = d.getBoundingClientRect();
  const gap = 8;
  const below = a.bottom + gap;
  const top = below + r.height <= window.innerHeight - 16 ? below : Math.max(16, a.top - gap - r.height);
  const left = Math.max(16, Math.min(a.left, window.innerWidth - r.width - 16));
  d.style.marginTop = `${Math.round(Math.max(16, top))}px`;
  d.style.marginLeft = `${Math.round(left)}px`;
}

/* ---------- the fields ---------- */

/** One line of plain words. */
const wordsField = (o: { label: string; value: string; placeholder?: string; first?: boolean; cls?: string; type?: string; list?: string; mode?: string; input: (v: string) => void }) =>
  html`<label class="site-form-field ${o.cls ?? ''}"><span class="site-form-label">${o.label}</span><input type=${o.type ?? 'text'} inputmode=${o.mode ?? nothing} list=${o.list ?? nothing} ?data-first=${o.first} .value=${o.value} placeholder=${o.placeholder ?? ''} autocomplete="off" enterkeyhint="done" @input=${(e: Event) => o.input((e.target as HTMLInputElement).value)} /></label>`;

let lists = 0;
/** Where a thing goes: any address, or one of the site's own pages and sections, offered as the field is typed in. */
function urlField(o: { value: string; anchors: [string, string][]; first?: boolean; input: (v: string) => void }): TemplateResult {
  const id = `site-form-places-${++lists}`;
  return html`${wordsField({ label: t('Goes to'), value: o.value, placeholder: t('https://…, or a page of the site'), type: 'text', mode: 'url', list: id, cls: 'site-form-url', first: o.first, input: o.input })}
    <datalist id=${id}>${o.anchors.map(([href, name]) => html`<option value=${href}>${name}</option>`)}</datalist>`;
}

/** The icon: a button showing it that opens the kit's picker ("No icon" among its choices). */
function iconField(o: { value: string; draw: () => void; set: (v: string) => void }): TemplateResult {
  const node = o.value ? iconNamed(o.value) : null;
  const pick = async () => {
    const { chooseIcon } = await import('../../kit/icons-picker.ts');
    const got = await chooseIcon({ current: o.value, none: true });
    if (got === null) return;
    o.set(got);
    o.draw();
  };
  return html`<div class="site-form-field site-form-icon">
    <span class="site-form-label" aria-hidden="true">${t('Icon')}</span>
    <button type="button" class="to-btn" aria-label=${o.value ? t('Icon: {name}', { name: o.value }) : t('Icon: none')} @click=${pick}>${node ? icon(node, 20) : nothing}<span>${o.value ? o.value : t('No icon')}</span></button>
  </div>`;
}

/* ---------- the forms ---------- */

/** Where a thing goes and its icon: what a button, a big link or a small link has besides its words. */
export interface Place {
  url: string;
  icon: string;
}
export function askPlace(o: { heading: string; value: Place; anchors: [string, string][]; anchor: Anchor; lend?: Lend }): Promise<Place | null> {
  const v = { ...o.value };
  return form<Place>(o.heading, 'site-form-place', o.anchor, () => v, (f) =>
    html`${urlField({ value: v.url, anchors: o.anchors, first: true, input: (x) => (v.url = x) })}
    ${iconField({ value: v.icon, draw: f.draw, set: (x) => (v.icon = x) })}`, o.lend,
  );
}

export interface Shop {
  currency: string;
  orders: string;
  table: TableBlock;
}
/** The shop: its currency, where orders go, and its products, edited in the Spreadsheet in a dialog of its own. */
export function askShop(o: { value: Shop; anchor: Anchor; lend?: Lend }): Promise<Shop | null> {
  const v = { ...o.value };
  const edit = async (f: Form<Shop>) => {
    const got = await editTable(v.table);
    if (got) (v.table = got), f.draw();
  };
  return form<Shop>(t('Products'), 'site-form-shop', o.anchor, () => v, (f) => {
    const n = v.table.rows.filter((r) => r.some((c) => c.trim())).length;
    return html`<div class="site-form-field site-form-products">
        <span class="site-form-label">${t('{n|one thing|# things} for sale', { n })}</span>
        <button type="button" class="to-btn" data-first @click=${() => void edit(f)}>${icon(UI.table, 18)}<span>${t('Edit the products…')}</span></button>
      </div>
      ${wordsField({ label: t('Currency'), value: v.currency, placeholder: '$', cls: 'site-form-currency', input: (x) => (v.currency = x) })}
      ${wordsField({ label: t('Orders go to'), value: v.orders, placeholder: t('you@example.com, or orders are copied'), type: 'email', mode: 'email', input: (x) => (v.orders = x) })}`;
  }, o.lend);
}

/** Whether two blocks are written alike (a form's Done that changed nothing writes nothing). */
export const same = (a: Block, b: Block) => write({ head: {}, blocks: [a] }) === write({ head: {}, blocks: [b] });
