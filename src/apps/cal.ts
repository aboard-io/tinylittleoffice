/**
 * <to-cal>: a month calendar for labelled spans of time.
 *
 * All-day spans are floating civil dates (the same in every country). Timed
 * spans are absolute instants stored in UTC and shown in whichever zone the
 * viewer picks; the document remembers the zone it was last edited in so a
 * reader elsewhere can flip to the author's time with one click.
 */
import { LitElement, html, nothing, type PropertyValues } from 'lit';
import { customElement, property, state } from 'lit/decorators.js';
import { icon, UI } from '../lib/icons.ts';
import type { SlCheckbox, SlInput, SlSelect } from '../lib/shoelace.ts';
import { parseCalendar, serializeCalendar, sortSpans, spanStartMs, spanEndMs, EPOCH_DAY, EPOCH_MS, MAX_LABEL, type Calendar, type Span } from '../lib/calmodel.ts';
import { allZones, dayToYmd, isValidZone, localZone, pad2, partsToUtc, utcToParts, ymdString, ymdToDay, zoneAbbr } from '../lib/tz.ts';

const DAY_MS = 86400000;

function firstWeekday(): number {
  try {
    const info = (new Intl.Locale(navigator.language) as unknown as { getWeekInfo?: () => { firstDay: number } }).getWeekInfo?.();
    if (info) return info.firstDay % 7; // Intl: 1=Mon..7=Sun -> 0=Sun
  } catch {
    /* fall through */
  }
  return 0;
}

@customElement('to-cal')
export class ToCal extends LitElement {
  createRenderRoot() {
    return this;
  }

  @property() value = '';
  @state() private cal: Calendar = { zone: '', spans: [] };
  @state() private zone = localZone();
  @state() private view = { y: 2026, m: 1 };
  @state() private sel = -1;
  @state() private drag: { from: number; to: number; moved: boolean } | null = null;
  private lastEmitted = '';
  private zones = allZones();
  private week0 = firstWeekday();

  constructor() {
    super();
    const now = utcToParts(Date.now(), this.zone);
    this.view = { y: now.y, m: now.m };
  }

  willUpdate(changed: PropertyValues) {
    if (changed.has('value') && this.value !== this.lastEmitted) {
      this.cal = parseCalendar(this.value);
      this.lastEmitted = this.value;
      this.sel = -1;
      this.jumpToContent();
    }
  }

  connectedCallback() {
    super.connectedCallback();
    this.addEventListener('keydown', this.onKey);
  }
  disconnectedCallback() {
    super.disconnectedCallback();
    this.removeEventListener('keydown', this.onKey);
  }

  /** Open the month of the first span still in the future, else the last span, else today. */
  private jumpToContent() {
    const now = Date.now();
    const spans = this.cal.spans;
    const target = spans.find((s) => spanEndMs(s) >= now) ?? spans[spans.length - 1];
    const ms = target ? spanStartMs(target) : now;
    const p = target?.kind === 'd' ? { ...dayToYmd(EPOCH_DAY + target.start) } : utcToParts(ms, this.zone);
    this.view = { y: p.y, m: p.m };
  }

  private commit(spans: Span[], keep?: Span) {
    sortSpans(spans);
    this.cal = { zone: this.zone, spans };
    this.sel = keep ? spans.indexOf(keep) : -1;
    this.lastEmitted = serializeCalendar(this.cal);
    this.dispatchEvent(new CustomEvent('docchange', { detail: this.lastEmitted, bubbles: true, composed: true }));
  }

  private patch(p: Partial<Span>) {
    if (this.sel < 0) return;
    const next = { ...this.cal.spans[this.sel], ...p };
    this.commit(this.cal.spans.map((s, i) => (i === this.sel ? next : s)), next);
  }

  private removeSel() {
    if (this.sel < 0) return;
    this.commit(this.cal.spans.filter((_, i) => i !== this.sel));
  }

  private shiftMonth(d: number) {
    let { y, m } = this.view;
    m += d;
    while (m < 1) { m += 12; y--; }
    while (m > 12) { m -= 12; y++; }
    this.view = { y, m };
  }

  private today() {
    const p = utcToParts(Date.now(), this.zone);
    this.view = { y: p.y, m: p.m };
  }

  private setZone(z: string) {
    if (!isValidZone(z)) return;
    this.zone = z;
  }

  /* ---------- creating spans by click or drag across days ---------- */

  private dayAt(e: PointerEvent): number | null {
    const el = document.elementFromPoint(e.clientX, e.clientY);
    const cell = el?.closest<HTMLElement>('.cal-cell');
    return cell ? parseInt(cell.dataset.day!, 10) : null;
  }

  private onCellDown(e: PointerEvent, day: number) {
    if (e.button !== 0 || (e.target as Element).closest('.cal-chip')) return;
    (e.currentTarget as HTMLElement).setPointerCapture(e.pointerId);
    this.drag = { from: day, to: day, moved: false };
  }
  private onGridMove(e: PointerEvent) {
    if (!this.drag) return;
    const day = this.dayAt(e);
    if (day !== null && day !== this.drag.to) this.drag = { ...this.drag, to: day, moved: true };
  }
  private onGridUp() {
    const d = this.drag;
    this.drag = null;
    if (!d) return;
    const a = Math.min(d.from, d.to);
    const b = Math.max(d.from, d.to);
    const span: Span = { kind: 'd', start: a - EPOCH_DAY, dur: b - a + 1, label: '' };
    this.commit([...this.cal.spans, span], span);
    this.updateComplete.then(() => this.querySelector<SlInput>('#label')?.focus());
  }

  private onKey = (e: KeyboardEvent) => {
    const t = e.composedPath()[0] as HTMLElement;
    const inField = ['INPUT', 'SELECT', 'TEXTAREA', 'SL-INPUT', 'SL-SELECT'].includes(t.tagName) || !!t.closest?.('sl-input, sl-select, sl-checkbox');
    if (e.key === 'Escape') {
      if (inField) t.blur();
      else this.sel = -1;
    } else if ((e.key === 'Delete' || e.key === 'Backspace') && !inField && this.sel >= 0) {
      this.removeSel();
      e.preventDefault();
    }
  };

  /* ---------- editing the selected span in the chosen zone ---------- */

  private fields(s: Span) {
    if (s.kind === 'd') {
      const a = dayToYmd(EPOCH_DAY + s.start);
      const b = dayToYmd(EPOCH_DAY + s.start + s.dur - 1);
      return { sd: ymdString(a.y, a.m, a.d), st: '', ed: ymdString(b.y, b.m, b.d), et: '' };
    }
    const a = utcToParts(spanStartMs(s), this.zone);
    const b = utcToParts(spanEndMs(s), this.zone);
    return { sd: ymdString(a.y, a.m, a.d), st: `${pad2(a.h)}:${pad2(a.min)}`, ed: ymdString(b.y, b.m, b.d), et: `${pad2(b.h)}:${pad2(b.min)}` };
  }

  private parseYmd(v: string): [number, number, number] | null {
    const m = /^(\d{4})-(\d{2})-(\d{2})$/.exec(v);
    return m ? [+m[1], +m[2], +m[3]] : null;
  }
  private parseHm(v: string): [number, number] | null {
    const m = /^(\d{2}):(\d{2})/.exec(v);
    return m ? [+m[1], +m[2]] : null;
  }

  private setStart(date: string, time: string) {
    const s = this.cal.spans[this.sel];
    const ymd = this.parseYmd(date);
    if (!ymd) return;
    if (s.kind === 'd') {
      this.patch({ start: ymdToDay(...ymd) - EPOCH_DAY });
    } else {
      const hm = this.parseHm(time) ?? [0, 0];
      const ms = partsToUtc(ymd[0], ymd[1], ymd[2], hm[0], hm[1], this.zone);
      this.patch({ start: Math.round((ms - EPOCH_MS) / 60000) });
    }
  }

  private setEnd(date: string, time: string) {
    const s = this.cal.spans[this.sel];
    const ymd = this.parseYmd(date);
    if (!ymd) return;
    if (s.kind === 'd') {
      const end = ymdToDay(...ymd) - EPOCH_DAY;
      this.patch({ dur: Math.max(1, end - s.start + 1) });
    } else {
      const hm = this.parseHm(time) ?? [0, 0];
      const ms = partsToUtc(ymd[0], ymd[1], ymd[2], hm[0], hm[1], this.zone);
      this.patch({ dur: Math.max(0, Math.round((ms - spanStartMs(s)) / 60000)) });
    }
  }

  private toggleAllDay(allDay: boolean) {
    const s = this.cal.spans[this.sel];
    if (allDay && s.kind === 't') {
      const a = utcToParts(spanStartMs(s), this.zone);
      const b = utcToParts(Math.max(spanStartMs(s), spanEndMs(s) - 1), this.zone);
      const start = ymdToDay(a.y, a.m, a.d);
      this.patch({ kind: 'd', start: start - EPOCH_DAY, dur: Math.max(1, ymdToDay(b.y, b.m, b.d) - start + 1) });
    } else if (!allDay && s.kind === 'd') {
      const a = dayToYmd(EPOCH_DAY + s.start);
      const ms = partsToUtc(a.y, a.m, a.d, 9, 0, this.zone);
      this.patch({ kind: 't', start: Math.round((ms - EPOCH_MS) / 60000), dur: 60 });
    }
  }

  /* ---------- rendering ---------- */

  private fmtRange(s: Span): string {
    try {
      if (s.kind === 'd') {
        const f = new Intl.DateTimeFormat(undefined, { timeZone: 'UTC', month: 'short', day: 'numeric', year: 'numeric' });
        const a = new Date((EPOCH_DAY + s.start) * DAY_MS);
        const b = new Date((EPOCH_DAY + s.start + s.dur - 1) * DAY_MS);
        return s.dur > 1 ? f.formatRange(a, b) : f.format(a);
      }
      const f = new Intl.DateTimeFormat(undefined, { timeZone: this.zone, month: 'short', day: 'numeric', year: 'numeric', hour: 'numeric', minute: '2-digit' });
      const a = new Date(spanStartMs(s));
      const b = new Date(spanEndMs(s));
      return (s.dur > 0 ? f.formatRange(a, b) : f.format(a)) + ' ' + zoneAbbr(a.getTime(), this.zone);
    } catch {
      return '';
    }
  }

  private chipTime(s: Span): string {
    const p = utcToParts(spanStartMs(s), this.zone);
    return `${p.h}:${pad2(p.min)}`;
  }

  render() {
    const { y, m } = this.view;
    const monthName = new Intl.DateTimeFormat(undefined, { month: 'long', year: 'numeric', timeZone: 'UTC' }).format(Date.UTC(y, m - 1, 1));
    const first = ymdToDay(y, m, 1);
    const lead = (dayToYmd(first).wd - this.week0 + 7) % 7;
    const gridStart = first - lead;
    const daysInMonth = ymdToDay(y, m + 1, 1) - first;
    const rows = Math.ceil((lead + daysInMonth) / 7);
    const todayP = utcToParts(Date.now(), this.zone);
    const today = ymdToDay(todayP.y, todayP.m, todayP.d);
    const wdFmt = new Intl.DateTimeFormat(undefined, { weekday: 'short', timeZone: 'UTC' });
    const sel = this.sel >= 0 ? this.cal.spans[this.sel] : null;
    const docZone = this.cal.zone;
    const range = this.drag ? [Math.min(this.drag.from, this.drag.to), Math.max(this.drag.from, this.drag.to)] : null;

    return html`
      <div class="to-toolbar">
        <sl-button-group label="Month">
          <sl-button class="icon" size="small" aria-label="Previous month" @click=${() => this.shiftMonth(-1)}>${icon(UI.left, 16)}<span class="sr-only">Previous month</span></sl-button>
          <sl-button class="icon" size="small" aria-label="Next month" @click=${() => this.shiftMonth(1)}>${icon(UI.right, 16)}<span class="sr-only">Next month</span></sl-button>
        </sl-button-group>
        <span class="cal-month" aria-live="polite">${monthName}</span>
        <sl-button size="small" @click=${this.today}>Today</sl-button>
        <span class="to-spacer"></span>
        <sl-select class="cal-zone sr-label" size="small" label="Time zone" .value=${this.zone} hoist @sl-change=${(e: Event) => this.setZone((e.target as SlSelect).value as string)}>
                    ${this.zones.map((z) => html`<sl-option value=${z}>${z.replace(/_/g, ' ')}</sl-option>`)}
        </sl-select>
        ${docZone && docZone !== this.zone && isValidZone(docZone)
          ? html`<sl-tooltip content="Author's zone" hoist>
              <sl-button size="small" @click=${() => this.setZone(docZone)}>${icon(UI.globe, 14)} ${docZone.split('/').pop()!.replace(/_/g, ' ')} time</sl-button>
            </sl-tooltip>`
          : nothing}
      </div>
      ${sel ? this.renderEditor(sel) : nothing}
      <div class="cal-grid" role="grid" aria-label=${monthName} tabindex="0" @pointermove=${this.onGridMove} @pointerup=${this.onGridUp} @pointercancel=${this.onGridUp}>
        <div class="cal-row" role="row">${Array.from({ length: 7 }, (_, i) => html`<div class="cal-wd" role="columnheader">${wdFmt.format(Date.UTC(2023, 0, 1 + ((this.week0 + i) % 7)))}</div>`)}</div>
        ${Array.from({ length: rows }, (_, week) => html`<div class="cal-row" role="row">${Array.from({ length: 7 }, (_, weekday) => {
          const day = gridStart + week * 7 + weekday;
          const p = dayToYmd(day);
          const dayStart = partsToUtc(p.y, p.m, p.d, 0, 0, this.zone);
          const dayEnd = partsToUtc(p.y, p.m, p.d + 1, 0, 0, this.zone);
          const chips = this.cal.spans
            .map((s, idx) => ({ s, idx }))
            .filter(({ s }) =>
              s.kind === 'd'
                ? EPOCH_DAY + s.start <= day && day < EPOCH_DAY + s.start + s.dur
                : spanStartMs(s) < dayEnd && Math.max(spanEndMs(s), spanStartMs(s) + 1) > dayStart,
            );
          const cls = ['cal-cell', p.m !== m ? 'out' : '', day === today ? 'today' : '', range && day >= range[0] && day <= range[1] ? 'range' : ''].join(' ');
          return html`<div class=${cls} role="gridcell" data-day=${day} aria-label=${ymdString(p.y, p.m, p.d)} @pointerdown=${(e: PointerEvent) => this.onCellDown(e, day)}>
            <span class="n">${p.d}</span>
            ${chips.map(({ s, idx }) => {
              const startsHere = s.kind === 'd' ? EPOCH_DAY + s.start === day : spanStartMs(s) >= dayStart;
              const endsHere = s.kind === 'd' ? EPOCH_DAY + s.start + s.dur - 1 === day : Math.max(spanEndMs(s), spanStartMs(s) + 1) <= dayEnd;
              return html`<div
                class="cal-chip ${s.kind === 'd' ? 'day' : ''} ${startsHere ? '' : 'cont'} ${endsHere ? '' : 'more'} ${idx === this.sel ? 'sel' : ''}"
                role="button"
                tabindex="0"
                title=${this.fmtRange(s)}
                @click=${(e: Event) => {
                  e.stopPropagation();
                  this.sel = idx;
                }}
                @keydown=${(e: KeyboardEvent) => e.key === 'Enter' && (this.sel = idx)}
              >
                ${startsHere && s.kind === 't' ? html`<b>${this.chipTime(s)}</b>` : nothing}${s.label || html`<em>Untitled</em>`}
              </div>`;
            })}
          </div>`;
        })}</div>`)}
      </div>
      ${this.cal.spans.length ? this.renderAgenda() : nothing}
    `;
  }

  private renderEditor(s: Span) {
    const f = this.fields(s);
    const timed = s.kind === 't';
    // Return in any field is the same as Done.
    return html`<div class="cal-editor" role="group" aria-label="Edit span" @keydown=${(e: KeyboardEvent) => e.key === 'Enter' && !e.defaultPrevented && !(e.target as HTMLElement).closest('sl-select, sl-button, button') && (this.sel = -1)}>
      <span class="k">Label</span>
      <div class="row">
        <sl-input id="label" class="label sr-label" size="small" label="Label" maxlength=${MAX_LABEL} placeholder="Label" .value=${s.label} @sl-input=${(e: Event) => this.patch({ label: (e.target as SlInput).value })}></sl-input>
        <sl-checkbox size="small" ?checked=${!timed} @sl-change=${(e: Event) => this.toggleAllDay((e.target as SlCheckbox).checked)}>All day</sl-checkbox>
      </div>
      <span class="k">From</span>
      <div class="row">
        <sl-input class="sr-label" type="date" size="small" label="Start date" .value=${f.sd} @sl-change=${(e: Event) => this.setStart((e.target as SlInput).value, f.st)}></sl-input>
        ${timed ? html`<sl-input class="sr-label" type="time" size="small" label="Start time" .value=${f.st} @sl-change=${(e: Event) => this.setStart(f.sd, (e.target as SlInput).value)}></sl-input>` : nothing}
      </div>
      <span class="k">To</span>
      <div class="row">
        <sl-input class="sr-label" type="date" size="small" label="End date" .value=${f.ed} @sl-change=${(e: Event) => this.setEnd((e.target as SlInput).value, f.et)}></sl-input>
        ${timed ? html`<sl-input class="sr-label" type="time" size="small" label="End time" .value=${f.et} @sl-change=${(e: Event) => this.setEnd(f.ed, (e.target as SlInput).value)}></sl-input>` : nothing}
        ${timed ? html`<span class="to-hint">${zoneAbbr(spanStartMs(s), this.zone)}</span>` : nothing}
      </div>
      <div class="actions">
        <sl-button size="small" variant="danger" outline @click=${this.removeSel}>${icon(UI.trash, 14)} Delete</sl-button>
        <span class="to-spacer"></span>
        <span class="to-hint">${this.fmtRange(s)}</span>
        <sl-button size="small" variant="primary" @click=${() => (this.sel = -1)}>${icon(UI.check, 14)} Done</sl-button>
      </div>
    </div>`;
  }

  private renderAgenda() {
    return html`<div class="cal-agenda">
      <h2>Spans</h2>
      <ul>
        ${this.cal.spans.map(
          (s, i) => html`<li
            class=${i === this.sel ? 'sel' : ''}
            @click=${() => {
              this.sel = i;
              const p = s.kind === 'd' ? dayToYmd(EPOCH_DAY + s.start) : utcToParts(spanStartMs(s), this.zone);
              this.view = { y: p.y, m: p.m };
            }}
          >
            <span class="when">${this.fmtRange(s)}</span>
            <span class="lbl">${s.label || html`<em>Untitled</em>`}</span>
          </li>`,
        )}
      </ul>
    </div>`;
  }
}

declare global {
  interface HTMLElementTagNameMap {
    'to-cal': ToCal;
  }
}
