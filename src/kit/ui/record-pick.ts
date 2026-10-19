/**
 * A record picked from the host's own search, for a typed table's record cell (kit/ui/table.ts) and a record field
 * (kit/ui/field.ts) alike: a field (`role=combobox`) whose records are the column's or the field's `search(q, signal)`
 * (table-model.ts RecordSearch), asked for '' as the picker opens and then a moment after the last key, the question
 * before let go (its `signal` aborted); the records found in a popover under the field (menu.ts `place`), Down and Up
 * through them; and it says Searching…, that the search failed, or that nothing was found, as the search box does.
 * The host keeps the keys that mean something of its own (Enter, Tab, Escape, leaving) and what a choice does.
 *
 *   private pick = new RecordPicking(this);
 *   this.pick.begin(col.search);                   // opened: asked for ''
 *   this.pick.type(field.value);                   // typed: asked a moment after the last key
 *   this.pick.move(1);                             // Down (and -1, Up)
 *   const chosen = this.pick.held;                 // Enter: the record in hand, once the search has answered
 *   this.pick.end();                               // let go
 *   render: html`<input role="combobox" aria-activedescendant=${this.pick.active(uid)} …/>${this.pick.list(uid, label, choose)}`
 *   updated(): this.pick.place(field);             // the popover under the field, inside the screen
 */
import { html, nothing, type ReactiveController, type ReactiveControllerHost, type TemplateResult } from 'lit';
import { t } from '../core/i18n.ts';
import { hoverFocus, place } from './menu.ts';
import type { RecordOption, RecordSearch } from './table-model.ts';

/** A picker while it is open: the words typed, what the search answered, and the record in hand (-1, none). */
export interface Picking {
  q: string;
  options: RecordOption[];
  status: 'loading' | 'done' | 'error';
  at: number;
}

/** How long after the last key a record's search is asked, in ms (the search box's). */
const ASK_MS = 150;

export class RecordPicking implements ReactiveController {
  /** The picker's state while it is open; null, closed. */
  state: Picking | null = null;
  private search: RecordSearch | undefined;
  private asking: AbortController | null = null;
  private timer = 0;

  constructor(private host: ReactiveControllerHost & HTMLElement) {
    host.addController(this);
  }
  hostDisconnected() {
    this.end();
  }

  /** The record in hand: the option Down and Up reached, once the search has answered; null for none. */
  get held(): RecordOption | null {
    const p = this.state;
    return p && p.status === 'done' ? (p.options[p.at] ?? null) : null;
  }
  /** The option's id for the field's `aria-activedescendant`, or nothing. */
  active(uid: string): string | typeof nothing {
    const p = this.state;
    return p && p.at >= 0 ? `${uid}-o${p.at}` : nothing;
  }

  /** Opened for a search (or none: nothing to offer), and asked for '' at once. */
  begin(search: RecordSearch | undefined) {
    this.search = search;
    this.set({ q: '', options: [], status: 'loading', at: -1 });
    this.ask('', 0);
  }
  /** The words typed: asked a moment after the last key, the question before let go. */
  type(q: string) {
    if (!this.state) return;
    this.set({ ...this.state, q, status: 'loading', at: -1 });
    this.ask(q.trim(), ASK_MS);
  }
  /** The record in hand moved `by` (1 down, -1 up), round the ends; from none, Down takes the first and Up the last. */
  move(by: number) {
    const p = this.state;
    if (!p || !p.options.length) return;
    const k = p.options.length;
    this.set({ ...p, at: p.at < 0 ? (by > 0 ? 0 : k - 1) : (p.at + by + k) % k });
  }
  /** Closed: nothing more asked, the popover gone. */
  end() {
    this.stop();
    if (this.state) this.set(null);
    this.pop?.hidePopover?.();
  }
  /** The popover shown under `anchor` (the field), as wide as it at least, inside the screen: from the host's `updated()`. */
  place(anchor: HTMLElement | null) {
    const pop = this.pop;
    if (!pop || !this.state || !anchor) return;
    if (!pop.matches(':popover-open')) pop.showPopover();
    pop.style.setProperty('--to-rp-w', `${anchor.offsetWidth}px`);
    place(pop, anchor);
  }

  private get pop(): HTMLElement | null {
    return this.host.querySelector<HTMLElement>('.to-rp-pop');
  }
  private set(state: Picking | null) {
    this.state = state;
    this.host.requestUpdate();
  }
  private ask(q: string, wait: number) {
    this.stop();
    if (!this.search) {
      this.set({ q, options: [], status: 'done', at: -1 });
      return;
    }
    const asking = new AbortController();
    this.asking = asking;
    const search = this.search;
    const go = async () => {
      try {
        const options = await search(q, asking.signal);
        if (asking.signal.aborted || !this.state) return;
        this.set({ q, options, status: 'done', at: options.length ? 0 : -1 });
      } catch {
        if (asking.signal.aborted || !this.state) return;
        this.set({ q, options: [], status: 'error', at: -1 });
      }
    };
    if (wait) this.timer = window.setTimeout(() => void go(), wait);
    else void go();
  }
  private stop() {
    clearTimeout(this.timer);
    this.asking?.abort();
    this.asking = null;
  }

  /** The popover: the records found as options (`${uid}-o${i}`, the list `${uid}-pick`), and what the search says; `choose` is told the one clicked. */
  list(uid: string, label: string, choose: (option: RecordOption) => void): TemplateResult {
    const p = this.state ?? { q: '', options: [], status: 'loading' as const, at: -1 };
    const said =
      p.status === 'loading'
        ? t('search-searching')
        : p.status === 'error'
          ? t('search-failed')
          : p.options.length
            ? t('search-n-found', { n: p.options.length })
            : p.q
              ? t('search-nothing-found', { q: p.q })
              : t('table-no-records');
    const keep = (e: Event) => e.preventDefault();
    return html`<div class="to-rp-pop" popover="manual">
      <div class="to-sb-list" id="${uid}-pick" role="listbox" aria-label=${label}>
        ${p.options.map(
          (o, i) => html`<div id="${uid}-o${i}" role="option" class="to-sb-hit" aria-selected=${String(i === p.at)} @pointerdown=${keep} @pointermove=${hoverFocus} @click=${() => choose(o)}>
            <span class="to-sb-words"><span>${o.label}</span>${o.detail ? html`<small>${o.detail}</small>` : nothing}</span>
          </div>`,
        )}
      </div>
      <p class="to-sb-said ${p.status === 'done' && p.options.length ? 'to-sb-quiet' : ''}" role="status">${said}</p>
    </div>`;
  }
}
