/**
 * <to-search>: one search across everything a host keeps (docs/library.md, A search box): its people, its companies,
 * its projects, its documents, whatever it calls a kind. The page gives the search, `search(q, signal)`, an async
 * function that answers with hits (SearchHit: a kind, an id, a title, and a subtitle, an icon and an address where it
 * has them); the box asks it as the person types, a moment after the last key (`delay`, 150ms), and lets go of a
 * question the next one replaces (its `signal` aborted, its answer never shown). The hits are drawn grouped by kind,
 * the kinds in the order `kinds` names them (each its words and its icon) with how many each has, then the actions the
 * page offers for what was typed (`create(q)`: "Add “Clea” as a company", the host's offer to make what it does not
 * know). While the answer is coming it says so, and an answer that fails says that.
 *
 * It is a combobox (ARIA's): the words in the field, Down and Up through the hits and the actions (round the ends),
 * Enter to choose, Escape to close the list and then to clear the field. A hit or an action chosen is told in
 * `searchpick`, cancelable, `{ query, hit }` or `{ query, action }` (SearchPick); a hit with an address is a link,
 * opened as a link is unless the page prevents it.
 *
 * Inline (the default) it is a field with the hits under it, for a page's header; `dialog` makes it a button that
 * looks like the field and opens the search in a dialog over the page. `hotkey` opens it (or puts the focus in the
 * field) from anywhere on the page with Mod+K; a page with one box sets it on that one.
 */
import { LitElement, html, nothing, type TemplateResult } from 'lit';
import { live } from 'lit/directives/live.js';
import { CornerDownLeft } from 'lucide';
import { icon, UI, type IconNode } from '../draw/icons.ts';
import { keysText } from '../core/commands.ts';
import { t } from '../core/i18n.ts';
import { hoverFocus, place } from './menu.ts';
import { focusBack } from './dialog.ts';
import { reveal } from './scroll.ts';

/** A thing found: its kind (a key of the box's `kinds`), its id, its words, and where it opens. */
export interface SearchHit {
  kind: string;
  id: string;
  title: string;
  subtitle?: string;
  /** An icon (Lucide's), or a few letters or an emoji; else its kind's. */
  icon?: IconNode | string;
  href?: string;
}

/** A kind of thing: its name as a group's heading ("People"), and its icon. */
export interface SearchKind {
  label: string;
  icon?: IconNode;
}

/** An action offered for what was typed ("Add “Clea” as a company"): its words, an id the page knows it by, an icon. */
export interface SearchAction {
  id: string;
  label: string;
  icon?: IconNode;
}

/** What was chosen: a hit, or an action, and the words typed. */
export type SearchPick = { query: string; hit: SearchHit; action?: undefined } | { query: string; action: SearchAction; hit?: undefined };

/** The page's search: the hits for the words, as a promise; `signal` aborted when a newer search replaces it. */
export type Searcher = (q: string, signal: AbortSignal) => Promise<SearchHit[]>;

type Row = { hit: SearchHit; action?: undefined } | { action: SearchAction; hit?: undefined };

let n = 0;

export class ToSearch extends LitElement {
  static properties = {
    search: { attribute: false },
    kinds: { attribute: false },
    create: { attribute: false },
    placeholder: {},
    label: {},
    delay: { type: Number },
    min: { type: Number },
    dialog: { type: Boolean },
    hotkey: { type: Boolean },
    query: { state: true },
    hits: { state: true },
    status: { state: true },
    at: { state: true },
    open: { state: true },
  };
  declare search: Searcher | null;
  declare kinds: Record<string, SearchKind>;
  declare create: ((q: string) => SearchAction[]) | null;
  /** The words in the empty field ("Search people, companies, projects"); else Search. */
  declare placeholder: string;
  /** The field's name, for a screen reader; else Search. */
  declare label: string;
  /** How long after the last key the page is asked, in ms. */
  declare delay: number;
  /** The fewest letters that are asked about. */
  declare min: number;
  declare dialog: boolean;
  declare hotkey: boolean;
  declare query: string;
  declare hits: SearchHit[];
  /** Where the answer is: nothing asked, coming, come, or failed. */
  declare status: 'idle' | 'loading' | 'done' | 'error';
  /** The row in hand (an index into the hits and then the actions), -1 for none. */
  declare at: number;
  /** The results are shown (inline: the list under the field). */
  declare open: boolean;

  readonly uid = `to-search-${++n}`;
  private timer = 0;
  private asking: AbortController | null = null;
  /** What had the focus as the dialog opened. */
  private from: HTMLElement | null = null;

  constructor() {
    super();
    this.search = null;
    this.kinds = {};
    this.create = null;
    this.placeholder = '';
    this.label = '';
    this.delay = 150;
    this.min = 1;
    this.dialog = false;
    this.hotkey = false;
    this.query = '';
    this.hits = [];
    this.status = 'idle';
    this.at = -1;
    this.open = false;
  }
  createRenderRoot() {
    return this;
  }
  connectedCallback() {
    super.connectedCallback();
    document.addEventListener('keydown', this.onPageKey);
  }
  disconnectedCallback() {
    super.disconnectedCallback();
    document.removeEventListener('keydown', this.onPageKey);
    this.stop();
  }
  get input(): HTMLInputElement | null {
    return this.querySelector<HTMLInputElement>('.to-sb-field input');
  }
  private get pop(): HTMLElement | null {
    return this.querySelector<HTMLElement>('.to-sb-pop');
  }
  private get modal(): HTMLDialogElement | null {
    return this.querySelector<HTMLDialogElement>('dialog.to-sb-dialog');
  }

  /** The hits by kind: the kinds `kinds` names, in its order, then any other in the order they came. */
  groups(): { kind: string; hits: SearchHit[] }[] {
    const order = [...Object.keys(this.kinds), ...this.hits.map((h) => h.kind)].filter((k, i, all) => all.indexOf(k) === i);
    return order.map((kind) => ({ kind, hits: this.hits.filter((h) => h.kind === kind) })).filter((g) => g.hits.length);
  }
  /** The actions offered for the words typed. */
  private actions(): SearchAction[] {
    const q = this.query.trim();
    return q && this.create ? this.create(q) : [];
  }
  /** Every row that can be chosen, in the order drawn: the hits, kind by kind, then the actions. */
  private rows(): Row[] {
    return [...this.groups().flatMap((g) => g.hits.map((hit) => ({ hit }))), ...this.actions().map((action) => ({ action }))];
  }

  /** The search opened: the dialog shown, or the focus put in the field. */
  async show() {
    if (this.dialog) {
      const at = document.activeElement;
      this.from = at instanceof HTMLElement && at !== document.body ? at : null;
      this.open = true;
      await this.updateComplete;
      if (!this.modal!.open) this.modal!.showModal();
    }
    this.input?.focus();
    this.input?.select();
  }
  /** The list closed (the dialog with it); the words kept. */
  close() {
    this.open = false;
    this.at = -1;
    if (this.modal?.open) this.modal.close();
    else this.pop?.hidePopover?.();
  }
  /** The words, the hits and the question on its way, all let go. */
  clear() {
    this.stop();
    this.query = '';
    this.hits = [];
    this.status = 'idle';
    this.at = -1;
  }
  private stop() {
    clearTimeout(this.timer);
    this.asking?.abort();
    this.asking = null;
  }

  /** The words changed: the question asked a moment after the last key, the one before it let go. */
  private onInput = (e: Event) => {
    this.query = (e.currentTarget as HTMLInputElement).value;
    this.stop();
    this.at = -1;
    this.open = true;
    const q = this.query.trim();
    if (q.length < this.min || !this.search) {
      this.hits = [];
      this.status = 'idle';
      return;
    }
    this.status = 'loading';
    this.timer = window.setTimeout(() => void this.ask(q), this.delay);
  };
  private async ask(q: string) {
    const asking = new AbortController();
    this.asking = asking;
    try {
      const hits = await this.search!(q, asking.signal);
      if (asking.signal.aborted) return;
      this.hits = hits;
      this.status = 'done';
    } catch {
      if (asking.signal.aborted) return;
      this.hits = [];
      this.status = 'error';
    } finally {
      if (this.asking === asking) this.asking = null;
    }
  }

  /** A row chosen: told to the page, and a hit with an address opened as a link is, unless the page prevented it. */
  private choose(row: Row, e?: Event, at = this.at) {
    const detail: SearchPick = row.hit ? { query: this.query, hit: row.hit } : { query: this.query, action: row.action! };
    const go = this.dispatchEvent(new CustomEvent<SearchPick>('searchpick', { detail, bubbles: true, composed: true, cancelable: true }));
    if (!go) e?.preventDefault();
    else if (!e && row.hit?.href) this.querySelector<HTMLAnchorElement>(`#${this.uid}-o${at}`)?.click();
    this.clear();
    this.close();
  }
  private onKey = (e: KeyboardEvent) => {
    if (e.isComposing) return;
    const rows = this.rows();
    const k = rows.length;
    switch (e.key) {
      case 'ArrowDown':
        if (!k) return;
        this.open = true;
        this.at = this.at < 0 ? 0 : (this.at + 1) % k;
        break;
      case 'ArrowUp':
        if (!k) return;
        this.open = true;
        this.at = this.at < 0 ? k - 1 : (this.at - 1 + k) % k;
        break;
      case 'Enter': {
        const at = this.at >= 0 ? this.at : this.status === 'done' ? 0 : -1;
        if (!rows[at]) return;
        this.choose(rows[at], undefined, at);
        break;
      }
      case 'Escape':
        if (this.open && this.query && !this.dialog) this.close();
        else if (this.query) this.clear();
        else if (this.dialog) this.close();
        else return;
        break;
      default:
        return;
    }
    e.preventDefault();
    e.stopPropagation();
    void this.updateComplete.then(() => reveal(this.querySelector(`#${this.uid}-o${this.at}`)));
  };
  /** Mod+K, from anywhere on the page: the search opened. */
  private onPageKey = (e: KeyboardEvent) => {
    if (!this.hotkey || e.defaultPrevented || e.altKey || e.shiftKey || !(e.metaKey || e.ctrlKey) || e.key.toLowerCase() !== 'k') return;
    e.preventDefault();
    void this.show();
  };
  private onFocusOut = (e: FocusEvent) => {
    if (this.dialog || (e.relatedTarget instanceof Node && this.contains(e.relatedTarget))) return;
    this.close();
  };

  protected updated() {
    // Inline, the list is a popover beside the field while there is something to say.
    const pop = this.pop;
    if (!pop || this.dialog) return;
    const show = this.open && !!this.query.trim();
    const shown = pop.matches(':popover-open');
    if (show && !shown) pop.showPopover();
    if (!show && shown) pop.hidePopover();
    if (show) {
      const field = this.querySelector<HTMLElement>('.to-sb-field')!;
      pop.style.setProperty('--to-sb-w', `${field.offsetWidth}px`);
      place(pop, field);
    }
  }

  // ---- drawing ----

  private mark(hit: SearchHit): TemplateResult | string {
    const own = hit.icon ?? this.kinds[hit.kind]?.icon;
    if (!own) return '';
    return typeof own === 'string' ? own : icon(own, 18);
  }
  private option(row: Row, i: number): TemplateResult {
    const id = `${this.uid}-o${i}`;
    const on = i === this.at;
    const keep = (e: Event) => e.preventDefault();
    if (row.action)
      return html`<div id=${id} role="option" class="to-sb-hit to-sb-create" aria-selected=${String(on)} @pointerdown=${keep} @pointermove=${hoverFocus} @click=${() => this.choose(row)}>
        <span class="to-sb-mark" aria-hidden="true">${icon(row.action.icon ?? UI.plus, 18)}</span><span class="to-sb-words"><span>${row.action.label}</span></span>
      </div>`;
    const hit = row.hit;
    const words = html`<span class="to-sb-mark" aria-hidden="true">${this.mark(hit)}</span>
      <span class="to-sb-words"><span>${hit.title}</span>${hit.subtitle ? html`<small>${hit.subtitle}</small>` : nothing}</span>
      ${on ? html`<span class="to-sb-mark" aria-hidden="true">${icon(CornerDownLeft, 14)}</span>` : nothing}`;
    return hit.href
      ? html`<a id=${id} role="option" class="to-sb-hit" href=${hit.href} tabindex="-1" aria-selected=${String(on)} @pointerdown=${keep} @click=${(e: Event) => this.choose(row, e)}>${words}</a>`
      : html`<div id=${id} role="option" class="to-sb-hit" aria-selected=${String(on)} @pointerdown=${keep} @click=${() => this.choose(row)}>${words}</div>`;
  }
  /** What the list says beside its rows: coming, failed, nothing found, or how many were. */
  private said(): string {
    if (!this.query.trim()) return '';
    if (this.status === 'loading') return t('search-searching');
    if (this.status === 'error') return t('search-failed');
    if (this.status === 'done') return this.hits.length ? t('search-n-found', { n: this.hits.length }) : t('search-nothing-found', { q: this.query.trim() });
    return '';
  }
  private list(): TemplateResult {
    let i = 0;
    const said = this.said();
    // How many were found is for a screen reader; that nothing was, or that the search failed, is shown too.
    const quiet = this.status === 'done' && this.hits.length > 0;
    return html`<div class="to-sb-list" id="${this.uid}-list" role="listbox" aria-label=${this.label || t('search-label')}>
        ${this.groups().map(
          (g) => html`<div class="to-sb-group" role="group" aria-labelledby="${this.uid}-g-${g.kind}">
            <p class="to-sb-head" id="${this.uid}-g-${g.kind}"><span>${this.kinds[g.kind]?.label ?? g.kind}</span><small>${g.hits.length}</small></p>
            ${g.hits.map((hit) => this.option({ hit }, i++))}
          </div>`,
        )}
        ${this.actions().map((action) => this.option({ action }, i++))}
      </div>
      <p class="to-sb-said ${quiet ? 'to-sb-quiet' : ''}" role="status">${said}</p>`;
  }
  private field(): TemplateResult {
    const expanded = this.open && !!this.query.trim();
    return html`<label class="to-sb-field">
      ${icon(UI.search, 18)}
      <input
        type="search"
        role="combobox"
        autocomplete="off"
        spellcheck="false"
        aria-label=${this.label || t('search-label')}
        aria-expanded=${String(expanded)}
        aria-controls="${this.uid}-list"
        aria-autocomplete="list"
        aria-activedescendant=${this.at >= 0 ? `${this.uid}-o${this.at}` : nothing}
        aria-keyshortcuts=${this.hotkey ? 'Meta+K Control+K' : nothing}
        placeholder=${this.placeholder || t('search-label')}
        .value=${live(this.query)}
        @input=${this.onInput}
        @keydown=${this.onKey}
        @focus=${() => (this.open = true)}
      />
    </label>`;
  }
  render() {
    if (!this.dialog)
      return html`<div class="to-sb" @focusout=${this.onFocusOut}>
        ${this.field()}
        <div class="to-sb-pop" popover="manual">${this.list()}</div>
      </div>`;
    return html`<button type="button" class="to-sb-open" aria-haspopup="dialog" aria-keyshortcuts=${this.hotkey ? 'Meta+K Control+K' : nothing} @click=${() => void this.show()}>
        ${icon(UI.search, 18)}<span>${this.placeholder || t('search-label')}</span>${this.hotkey ? html`<kbd aria-hidden="true">${keysText('Mod+K')}</kbd>` : nothing}
      </button>
      <dialog
        class="to-dialog to-sb-dialog"
        aria-label=${this.label || t('search-label')}
        @close=${() => {
          this.open = false;
          focusBack(this.from);
        }}
        @click=${(e: Event) => e.target === e.currentTarget && this.close()}
      >
        <div class="to-dialog-inner">${this.open ? html`${this.field()}${this.list()}` : nothing}</div>
      </dialog>`;
  }
}
customElements.define('to-search', ToSearch);
