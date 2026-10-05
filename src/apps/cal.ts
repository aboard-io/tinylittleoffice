/**
 * <to-cal>: a month calendar for labelled spans of time.
 *
 * All-day spans are floating civil dates (the same in every country). Timed
 * spans are absolute instants stored in UTC and shown in whichever zone the
 * viewer picks; the document remembers the zone it was last edited in so a
 * reader elsewhere can flip to the author's time with one click.
 */
import { LitElement, html, css, nothing, type PropertyValues } from 'lit';
import { customElement, property, state } from 'lit/decorators.js';
import { retro } from '../lib/styles.ts';
import { icon, UI } from '../lib/icons.ts';
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
  static styles = [
    retro,
    css`
      .toolbar .month {
        font-weight: bold;
        min-width: 150px;
        text-align: center;
      }
      .toolbar select {
        max-width: 200px;
      }
      .layout {
        display: grid;
        grid-template-columns: 1fr;
      }
      .grid {
        display: grid;
        grid-template-columns: repeat(7, 1fr);
        border-left: 1px solid var(--ink);
        user-select: none;
        touch-action: none;
      }
      .grid .wd {
        text-align: center;
        font-size: 11px;
        padding: 3px 0;
        background: var(--paper-dim);
        border-right: 1px solid var(--ink);
        border-bottom: 1px solid var(--ink);
      }
      .cell {
        min-height: 72px;
        border-right: 1px solid var(--ink);
        border-bottom: 1px solid var(--ink);
        padding: 2px;
        display: flex;
        flex-direction: column;
        gap: 2px;
        cursor: cell;
        position: relative;
      }
      .cell.out {
        background: var(--paper-dim);
        color: #777;
      }
      .cell.today .n {
        background: var(--ink);
        color: var(--paper);
        border-radius: 50%;
      }
      .cell.range {
        background: #ddd;
      }
      .cell .n {
        font-size: 11px;
        width: 18px;
        height: 18px;
        display: inline-flex;
        align-items: center;
        justify-content: center;
        align-self: flex-end;
      }
      .chip {
        font-size: 11px;
        line-height: 1.2;
        padding: 1px 4px;
        border: 1px solid var(--ink);
        background: var(--paper);
        white-space: nowrap;
        overflow: hidden;
        text-overflow: ellipsis;
        cursor: pointer;
        border-radius: 3px;
      }
      .chip.cont {
        border-left-style: dotted;
        border-top-left-radius: 0;
        border-bottom-left-radius: 0;
        margin-left: -3px;
      }
      .chip.more {
        border-right-style: dotted;
        border-top-right-radius: 0;
        border-bottom-right-radius: 0;
        margin-right: -3px;
      }
      .chip.day {
        background: #e4e4e4;
      }
      .chip.sel {
        background: var(--ink);
        color: var(--paper);
      }
      .chip b {
        font-weight: normal;
        opacity: 0.75;
        margin-right: 3px;
      }
      .editor {
        border-bottom: 1px solid var(--ink);
        padding: 8px 10px;
        display: grid;
        grid-template-columns: auto 1fr;
        gap: 6px 10px;
        align-items: center;
        background: #f6f6f6;
      }
      .editor label.k {
        font-size: 11px;
        text-align: right;
      }
      .editor .row {
        display: flex;
        gap: 6px;
        flex-wrap: wrap;
        align-items: center;
      }
      .editor input[type='text'] {
        width: 100%;
        max-width: 420px;
      }
      .editor .actions {
        grid-column: 1 / -1;
        display: flex;
        gap: 6px;
        align-items: center;
      }
      .agenda {
        padding: 6px 10px 10px;
        border-top: 1px solid var(--ink);
      }
      .agenda h3 {
        font-size: 11px;
        margin: 0 0 4px;
        text-transform: uppercase;
        letter-spacing: 0.05em;
        opacity: 0.7;
      }
      .agenda ul {
        margin: 0;
        padding: 0;
        list-style: none;
        display: flex;
        flex-direction: column;
        gap: 2px;
      }
      .agenda li {
        display: flex;
        gap: 10px;
        align-items: baseline;
        cursor: pointer;
        padding: 1px 4px;
        border-radius: 3px;
      }
      .agenda li:hover {
        background: var(--paper-dim);
      }
      .agenda li.sel {
        background: var(--ink);
        color: var(--paper);
      }
      .agenda .when {
        font-size: 11px;
        font-variant-numeric: tabular-nums;
        white-space: nowrap;
        opacity: 0.8;
        min-width: 200px;
      }
      .agenda .lbl {
        overflow: hidden;
        text-overflow: ellipsis;
        white-space: nowrap;
      }
      .foot {
        padding: 4px 8px;
        border-top: 1px solid var(--ink);
      }
    `,
  ];

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
    const root = this.shadowRoot ?? document;
    const el = root.elementFromPoint(e.clientX, e.clientY);
    const cell = el?.closest<HTMLElement>('.cell');
    return cell ? parseInt(cell.dataset.day!, 10) : null;
  }

  private onCellDown(e: PointerEvent, day: number) {
    if (e.button !== 0 || (e.target as Element).closest('.chip')) return;
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
    this.updateComplete.then(() => this.renderRoot.querySelector<HTMLInputElement>('#label')?.focus());
  }

  private onKey = (e: KeyboardEvent) => {
    const t = e.composedPath()[0] as HTMLElement;
    const inField = ['INPUT', 'SELECT', 'TEXTAREA'].includes(t.tagName);
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
      <div class="toolbar">
        <button class="icon" @click=${() => this.shiftMonth(-1)} aria-label="Previous month">${icon(UI.left, 14)}</button>
        <span class="month" aria-live="polite">${monthName}</span>
        <button class="icon" @click=${() => this.shiftMonth(1)} aria-label="Next month">${icon(UI.right, 14)}</button>
        <button @click=${this.today}>Today</button>
        <span class="spacer"></span>
        <label class="hint">Times in
          <select aria-label="Time zone" .value=${this.zone} @change=${(e: Event) => this.setZone((e.target as HTMLSelectElement).value)}>
            ${this.zones.map((z) => html`<option value=${z} ?selected=${z === this.zone}>${z.replace(/_/g, ' ')}</option>`)}
          </select>
        </label>
        ${docZone && docZone !== this.zone && isValidZone(docZone)
          ? html`<button @click=${() => this.setZone(docZone)} title="Show times the way the author saw them">${icon(UI.globe, 14)} ${docZone.split('/').pop()!.replace(/_/g, ' ')} time</button>`
          : nothing}
      </div>
      ${sel ? this.renderEditor(sel) : nothing}
      <div class="grid" role="grid" aria-label=${monthName} @pointermove=${this.onGridMove} @pointerup=${this.onGridUp} @pointercancel=${this.onGridUp}>
        ${Array.from({ length: 7 }, (_, i) => html`<div class="wd" role="columnheader">${wdFmt.format(Date.UTC(2023, 0, 1 + ((this.week0 + i) % 7)))}</div>`)}
        ${Array.from({ length: rows * 7 }, (_, i) => {
          const day = gridStart + i;
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
          const cls = ['cell', p.m !== m ? 'out' : '', day === today ? 'today' : '', range && day >= range[0] && day <= range[1] ? 'range' : ''].join(' ');
          return html`<div
            class=${cls}
            role="gridcell"
            data-day=${day}
            aria-label=${ymdString(p.y, p.m, p.d)}
            @pointerdown=${(e: PointerEvent) => this.onCellDown(e, day)}
          >
            <span class="n">${p.d}</span>
            ${chips.map(({ s, idx }) => {
              const startsHere = s.kind === 'd' ? EPOCH_DAY + s.start === day : spanStartMs(s) >= dayStart;
              const endsHere = s.kind === 'd' ? EPOCH_DAY + s.start + s.dur - 1 === day : Math.max(spanEndMs(s), spanStartMs(s) + 1) <= dayEnd;
              return html`<div
                class="chip ${s.kind === 'd' ? 'day' : ''} ${startsHere ? '' : 'cont'} ${endsHere ? '' : 'more'} ${idx === this.sel ? 'sel' : ''}"
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
        })}
      </div>
      ${this.cal.spans.length ? this.renderAgenda() : nothing}
      <div class="foot hint">
        Click a day to add a span, or drag across days. All-day spans are the same date everywhere; timed spans are one instant
        shown in the zone you pick, so a link reads correctly in any country.
      </div>
    `;
  }

  private renderEditor(s: Span) {
    const f = this.fields(s);
    const timed = s.kind === 't';
    return html`<div class="editor" role="group" aria-label="Edit span">
      <label class="k" for="label">Label</label>
      <div class="row">
        <input id="label" type="text" maxlength=${MAX_LABEL} placeholder="What is happening?" .value=${s.label} @input=${(e: Event) => this.patch({ label: (e.target as HTMLInputElement).value })} />
        <label><input type="checkbox" .checked=${!timed} @change=${(e: Event) => this.toggleAllDay((e.target as HTMLInputElement).checked)} /> All day</label>
      </div>
      <label class="k">From</label>
      <div class="row">
        <input type="date" aria-label="Start date" .value=${f.sd} @change=${(e: Event) => this.setStart((e.target as HTMLInputElement).value, f.st)} />
        ${timed ? html`<input type="time" aria-label="Start time" .value=${f.st} @change=${(e: Event) => this.setStart(f.sd, (e.target as HTMLInputElement).value)} />` : nothing}
      </div>
      <label class="k">To</label>
      <div class="row">
        <input type="date" aria-label="End date" .value=${f.ed} @change=${(e: Event) => this.setEnd((e.target as HTMLInputElement).value, f.et)} />
        ${timed ? html`<input type="time" aria-label="End time" .value=${f.et} @change=${(e: Event) => this.setEnd(f.ed, (e.target as HTMLInputElement).value)} />` : nothing}
        <span class="hint">${timed ? `${this.zone.replace(/_/g, ' ')} (${zoneAbbr(spanStartMs(s), this.zone)})` : 'same date in every zone'}</span>
      </div>
      <div class="actions">
        <button @click=${this.removeSel} title="Delete (Del)">${icon(UI.trash, 14)} Delete</button>
        <span class="spacer"></span>
        <span class="hint">${this.fmtRange(s)}</span>
        <button @click=${() => (this.sel = -1)}>${icon(UI.check, 14)} Done</button>
      </div>
    </div>`;
  }

  private renderAgenda() {
    return html`<div class="agenda">
      <h3>All spans</h3>
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
