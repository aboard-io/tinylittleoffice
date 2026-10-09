/**
 * <to-cal>: a month calendar for labelled spans of time.
 *
 * All-day spans are floating civil dates (the same in every country). Timed
 * spans are absolute instants, written as the clock reads in the zone the
 * document was last edited in and shown in whichever zone the viewer picks;
 * a reader elsewhere can flip to the author's time with one click.
 *
 * A span is made by a click or a drag across days, and edited in a dialog
 * over the grid, which never moves: the dialog works on a draft, drawn on
 * the grid as it changes, that Done keeps and Escape throws away.
 */
import { goLinks } from '../widgets/link-guard.ts';
import { DocElement, defineElement, html, nothing, state, swatches, dateNav, tool, icon, UI, type SlCheckbox, type SlInput, type SlSelect } from '../kit.ts';
import { CAL_COLORS, EVERY, clockMinutes, fromIsoDay, isoDay, occurrences, parseCalendar, repeatText, serializeCalendar, sortSpans, spanDays, spanStartMs, spanEndMs, EPOCH_DAY, MAX_LABEL, type Calendar, type Every, type Span } from '../lib/calmodel.ts';
import { allZones, clockString, dayToYmd, isValidZone, localZone, pad2, partsToUtc, utcToParts, ymdString, ymdToDay, zoneAbbr } from '../lib/tz.ts';

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

export class ToCal extends DocElement<Calendar> {
  @state() private zone = localZone();
  @state() private view = { y: 2026, m: 1 };
  /** A month at a time, or the whole year at a glance. */
  @state() private mode: 'month' | 'year' = 'month';
  /** A day picked on the year, marked once its month opens. */
  @state() private picked = -1;
  /** The span in the dialog: its index, or the spans' length for one not yet kept. */
  @state() private sel = -1;
  /** The span as the dialog has it so far; open while this is set. */
  @state() private draft: Span | null = null;
  /** The colour new spans are given: whoever is adding dates picks theirs. */
  @state() private ink = '';
  @state() private drag: { from: number; to: number; moved: boolean } | null = null;
  private zones = allZones();
  private week0 = firstWeekday();

  constructor() {
    super();
    this.showMonthOf();
    // On the element itself, so it lasts as long as the element does.
    this.addEventListener('keydown', this.onKey);
  }

  protected parse = parseCalendar;
  protected serialize = serializeCalendar;

  protected loaded() {
    this.cancel();
    this.jumpToContent();
  }

  /** The zone a repeat keeps its time of day in: the document's, or the viewer's until the document has one. */
  private get repeatZone() {
    return this.doc.zone || this.zone;
  }

  /** Open the month of the next thing still to come (a repeat's next time), else the last span, else today. */
  private jumpToContent() {
    const now = Date.now();
    const today = this.today();
    const spans = this.doc.spans;
    const next = (s: Span) => (s.repeat ? occurrences(s, today - 1, today + 400, this.repeatZone)[0] : undefined) ?? (spanEndMs(s) >= now ? s : undefined);
    const coming = spans.map(next).filter((s): s is Span => !!s);
    this.showMonthOf(coming.length ? sortSpans(coming)[0] : spans[spans.length - 1]);
  }

  /** Today in the chosen zone, as a day since 1970. */
  private today(): number {
    const p = utcToParts(Date.now(), this.zone);
    return ymdToDay(p.y, p.m, p.d);
  }

  /** Open the month a span starts in; without one, this month. */
  private showMonthOf(s?: Span) {
    const p = s?.kind === 'd' ? dayToYmd(EPOCH_DAY + s.start) : utcToParts(s ? spanStartMs(s) : Date.now(), this.zone);
    this.view = { y: p.y, m: p.m };
  }

  private save(spans: Span[]) {
    sortSpans(spans);
    this.commit({ zone: this.zone, spans, legend: this.doc.legend });
  }

  /* ---------- the dialog: a draft of one span ---------- */

  /** Edit the span at `i` in the dialog. */
  private open(i: number) {
    this.sel = i;
    this.draft = { ...this.doc.spans[i] };
  }

  /** Put a new span in the dialog; it joins the document on Done. */
  private create(span: Span) {
    this.sel = this.doc.spans.length;
    this.draft = span;
  }

  private patch(p: Partial<Span>) {
    if (this.draft) this.draft = { ...this.draft, ...p };
  }

  private done() {
    if (!this.draft) return;
    this.save(this.shown());
    this.cancel();
  }

  private cancel() {
    this.sel = -1;
    this.draft = null;
  }

  private removeSpan() {
    if (this.draft && this.sel < this.doc.spans.length) this.save(this.doc.spans.filter((_, i) => i !== this.sel));
    this.cancel();
  }

  /** The spans as drawn: the document's, with the one in the dialog as it stands there. */
  private shown(): Span[] {
    const d = this.draft;
    if (!d) return this.doc.spans;
    return this.sel < this.doc.spans.length ? this.doc.spans.map((s, i) => (i === this.sel ? d : s)) : [...this.doc.spans, d];
  }

  private shiftMonth(d: number) {
    let { y, m } = this.view;
    m += d;
    while (m < 1) { m += 12; y--; }
    while (m > 12) { m -= 12; y++; }
    this.view = { y, m };
  }

  /** From the year, open a month; a day tapped there is marked in it. */
  private openMonth(m: number, day = -1) {
    this.view = { y: this.view.y, m };
    this.picked = day;
    this.mode = 'month';
  }

  private setZone(z: string) {
    if (!isValidZone(z)) return;
    this.zone = z;
  }

  /** The time zone box takes anything typed: a zone's name, with or without underscores, or just its city. */
  private onZone(e: Event) {
    const box = e.target as HTMLInputElement;
    const typed = box.value.trim().replace(/ /g, '_').toLowerCase();
    const found = this.zones.find((z) => z.toLowerCase() === typed) ?? this.zones.find((z) => z.toLowerCase().split('/').pop() === typed) ?? (typed === 'utc' ? 'UTC' : undefined);
    if (found) this.setZone(found);
    box.value = this.zone.replace(/_/g, ' ');
  }

  /** Say what a colour stands for ("Paul", "Travel"). */
  private nameColor(key: string, name: string) {
    this.doc = { ...this.doc, legend: { ...this.doc.legend, [key]: name } };
    this.save(this.doc.spans);
  }

  private swatches(current: string, pick: (key: string) => void, label: string) {
    return swatches(label, CAL_COLORS, current, pick, { names: this.doc.legend ?? {} });
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
    this.create({ kind: 'd', start: a - EPOCH_DAY, dur: b - a + 1, label: '', ...(this.ink ? { color: this.ink } : {}) });
  }

  /** Delete or Backspace, outside a field, deletes the span in the dialog. (Escape is the dialog's own.) */
  private onKey = (e: KeyboardEvent) => {
    const t = e.composedPath()[0] as HTMLElement;
    const inField = ['INPUT', 'SELECT', 'TEXTAREA', 'SL-INPUT', 'SL-SELECT'].includes(t.tagName) || !!t.closest?.('sl-input, sl-select, sl-checkbox');
    if ((e.key === 'Delete' || e.key === 'Backspace') && !inField && this.draft) {
      this.removeSpan();
      e.preventDefault();
    }
  };

  /** Return in any field of the dialog is the same as Done; the field's change lands first. */
  private onDialogKey(e: KeyboardEvent) {
    if (e.key !== 'Enter' || e.defaultPrevented || (e.target as HTMLElement).closest('sl-select, sl-button, button')) return;
    (e.composedPath()[0] as HTMLElement).blur?.();
    this.done();
  }

  /* ---------- editing the draft in the chosen zone ---------- */

  private fields(s: Span) {
    if (s.kind === 'd') return { sd: isoDay(s.start), st: '', ed: isoDay(s.start + s.dur - 1), et: '' };
    const a = utcToParts(spanStartMs(s), this.zone);
    const b = utcToParts(spanEndMs(s), this.zone);
    return { sd: ymdString(a.y, a.m, a.d), st: clockString(a), ed: ymdString(b.y, b.m, b.d), et: clockString(b) };
  }

  /** A date field and a time field as the draft counts them: a day, or for a timed span a minute in the chosen zone. */
  private fieldsAt(date: string, time: string): number | null {
    const day = fromIsoDay(date);
    if (day === null || this.draft!.kind === 'd') return day;
    const hm = /^(\d{2}):(\d{2})/.exec(time);
    return clockMinutes(EPOCH_DAY + day, hm ? +hm[1] : 0, hm ? +hm[2] : 0, this.zone);
  }

  private setStart(date: string, time: string) {
    const at = this.fieldsAt(date, time);
    if (at !== null) this.patch({ start: at });
  }

  private setEnd(date: string, time: string) {
    const s = this.draft!;
    const at = this.fieldsAt(date, time);
    if (at !== null) this.patch({ dur: s.kind === 'd' ? Math.max(1, at - s.start + 1) : Math.max(0, at - s.start) });
  }

  private toggleAllDay(allDay: boolean) {
    const s = this.draft!;
    if (allDay && s.kind === 't') {
      const [a, b] = spanDays(s, this.zone);
      this.patch({ kind: 'd', start: a - EPOCH_DAY, dur: Math.max(1, b - a + 1) });
    } else if (!allDay && s.kind === 'd') {
      this.patch({ kind: 't', start: clockMinutes(EPOCH_DAY + s.start, 9, 0, this.zone), dur: 60 });
    }
  }

  /** How the draft repeats: every so often, for ever, so many times, or until a day (never before its first). */
  private setRepeat(every: Every | '', end: { count?: number; until?: string } = {}) {
    if (!every) return this.patch({ repeat: undefined });
    const repeat = { every, ...(this.draft!.repeat?.every === every ? this.draft!.repeat : {}) };
    if ('count' in end) {
      delete repeat.until;
      if (end.count && end.count > 0) repeat.count = Math.floor(end.count);
      else delete repeat.count;
    }
    if ('until' in end) {
      delete repeat.count;
      const until = fromIsoDay(end.until);
      const [first] = spanDays(this.draft!, this.zone);
      if (until !== null) repeat.until = Math.max(first - EPOCH_DAY, until);
      else delete repeat.until;
    }
    this.patch({ repeat });
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
    const today = this.today();
    const wdFmt = new Intl.DateTimeFormat(undefined, { weekday: 'short', timeZone: 'UTC' });
    const docZone = this.doc.zone;
    const range = this.drag ? [Math.min(this.drag.from, this.drag.to), Math.max(this.drag.from, this.drag.to)] : null;
    const spans = this.shown();
    // Every time of every span that lands on the grid (a day either side, since a repeat keeps its time of day in another zone).
    const times = spans.flatMap((s, idx) => occurrences(s, gridStart - 1, gridStart + rows * 7, this.repeatZone).map((o) => ({ s: o, idx })));

    const yearName = String(y);
    return html`
      <div class="to-toolbar" role="toolbar" aria-label="Calendar">
        ${this.mode === 'year'
          ? dateNav(yearName, { prev: 'Previous year', next: 'Next year', onPrev: () => (this.view = { y: y - 1, m }), onNext: () => (this.view = { y: y + 1, m }), onToday: () => this.showMonthOf() })
          : dateNav(monthName, { prev: 'Previous month', next: 'Next month', onPrev: () => this.shiftMonth(-1), onNext: () => this.shiftMonth(1), onToday: () => this.showMonthOf(), onLabel: () => (this.mode = 'year'), labelTip: 'See the year' })}
        <sl-button-group label="View">
          ${tool('Month', 'cal', () => (this.mode = 'month'), { text: true, pressed: this.mode === 'month' })}
          ${tool('Year', 'pixel', () => (this.mode = 'year'), { text: true, pressed: this.mode === 'year' })}
        </sl-button-group>
        ${this.renderLegend()}
        <span class="to-spacer"></span>
        <input class="cal-zone" aria-label="Time zone" list="cal-zones" autocomplete="off" spellcheck="false" .value=${this.zone.replace(/_/g, ' ')} @focus=${(e: Event) => (e.target as HTMLInputElement).select()} @change=${this.onZone} />
        <datalist id="cal-zones">${this.zones.map((z) => html`<option value=${z.replace(/_/g, ' ')}></option>`)}</datalist>
        ${docZone && docZone !== this.zone && isValidZone(docZone)
          ? html`<sl-button data-tip="Author's zone" size="small" @click=${() => this.setZone(docZone)}>${icon(UI.globe, 14)} ${docZone.split('/').pop()!.replace(/_/g, ' ')} time</sl-button>`
          : nothing}
      </div>
      ${this.mode === 'year' ? this.renderYear(spans, today) : html`
      <div class="cal-grid" role="grid" aria-label=${monthName} tabindex="0" @pointermove=${this.onGridMove} @pointerup=${this.onGridUp} @pointercancel=${this.onGridUp}>
        <div class="cal-row" role="row">${Array.from({ length: 7 }, (_, i) => html`<div class="cal-wd" role="columnheader">${wdFmt.format(Date.UTC(2023, 0, 1 + ((this.week0 + i) % 7)))}</div>`)}</div>
        ${Array.from({ length: rows }, (_, week) => html`<div class="cal-row" role="row">${Array.from({ length: 7 }, (_, weekday) => {
          const day = gridStart + week * 7 + weekday;
          const p = dayToYmd(day);
          const dayStart = partsToUtc(p.y, p.m, p.d, 0, 0, this.zone);
          const dayEnd = partsToUtc(p.y, p.m, p.d + 1, 0, 0, this.zone);
          const chips = times.filter(({ s }) =>
            s.kind === 'd'
              ? EPOCH_DAY + s.start <= day && day < EPOCH_DAY + s.start + s.dur
              : spanStartMs(s) < dayEnd && Math.max(spanEndMs(s), spanStartMs(s) + 1) > dayStart,
          );
          const cls = ['cal-cell', p.m !== m ? 'out' : '', day === today ? 'today' : '', day === this.picked ? 'picked' : '', range && day >= range[0] && day <= range[1] ? 'range' : ''].join(' ');
          return html`<div class=${cls} role="gridcell" data-day=${day} aria-label=${ymdString(p.y, p.m, p.d)} @pointerdown=${(e: PointerEvent) => this.onCellDown(e, day)}>
            <span class="n">${p.d}</span>
            ${chips.map(({ s, idx }) => {
              const startsHere = s.kind === 'd' ? EPOCH_DAY + s.start === day : spanStartMs(s) >= dayStart;
              const endsHere = s.kind === 'd' ? EPOCH_DAY + s.start + s.dur - 1 === day : Math.max(spanEndMs(s), spanStartMs(s) + 1) <= dayEnd;
              return html`<div
                class="cal-chip ${s.kind === 'd' ? 'day' : ''} ${startsHere ? '' : 'cont'} ${endsHere ? '' : 'more'} ${idx === this.sel ? 'sel' : ''} ${s.color ? 'tint' : ''}"
                style=${s.color ? `--c:${CAL_COLORS[s.color].hex}` : ''}
                role="button"
                tabindex="0"
                data-tip=${this.fmtRange(s) + (s.repeat ? `, ${repeatText(s.repeat)}` : '')}
                @click=${(e: Event) => {
                  e.stopPropagation();
                  this.open(idx);
                }}
                @keydown=${(e: KeyboardEvent) => e.key === 'Enter' && this.open(idx)}
              >
                ${startsHere && s.kind === 't' ? html`<b>${this.chipTime(s)}</b>` : nothing}${s.repeat && startsHere ? html`<i class="cal-rep">${icon(UI.repeat, 10)}</i>` : nothing}${s.label || html`<em>Untitled</em>`}
              </div>`;
            })}
          </div>`;
        })}</div>`)}
      </div>
      ${spans.length ? this.renderAgenda(spans, first, first + daysInMonth - 1) : nothing}`}
      ${this.renderDialog()}
    `;
  }

  /** The whole year: twelve small months, a day tinted in the colour of what it holds, today ringed. A month opens on its name, a day on itself. */
  private renderYear(spans: Span[], today: number) {
    const { y } = this.view;
    const from = ymdToDay(y, 1, 1);
    const to = ymdToDay(y + 1, 1, 1);
    // The colour of each day with something on it: the first span's, or the accent's.
    const tint = new Map<number, string>();
    for (const s of spans)
      for (const o of occurrences(s, from - 1, to, this.repeatZone)) {
        const [a, b] = o.kind === 'd' ? [EPOCH_DAY + o.start, EPOCH_DAY + o.start + o.dur - 1] : spanDays(o, this.zone);
        for (let d = Math.max(a, from); d <= Math.min(b, to - 1); d++) if (!tint.has(d)) tint.set(d, CAL_COLORS[o.color ?? '']?.hex ?? CAL_COLORS[''].hex);
      }
    const wdFmt = new Intl.DateTimeFormat(undefined, { weekday: 'narrow', timeZone: 'UTC' });
    const monthFmt = new Intl.DateTimeFormat(undefined, { month: 'long', timeZone: 'UTC' });
    return html`<div class="cal-year" role="grid" aria-label=${String(y)}>
      ${Array.from({ length: 12 }, (_, k) => {
        const m = k + 1;
        const first = ymdToDay(y, m, 1);
        const lead = (dayToYmd(first).wd - this.week0 + 7) % 7;
        const days = ymdToDay(y, m + 1, 1) - first;
        return html`<section class="cal-mini" role="row" aria-label=${monthFmt.format(Date.UTC(y, k, 1))}>
          <button class="cal-mini-name" @click=${() => this.openMonth(m)}>${monthFmt.format(Date.UTC(y, k, 1))}</button>
          <div class="cal-mini-days">
            ${Array.from({ length: 7 }, (_, i) => html`<span class="wd">${wdFmt.format(Date.UTC(2023, 0, 1 + ((this.week0 + i) % 7)))}</span>`)}
            ${Array.from({ length: lead }, () => html`<span></span>`)}
            ${Array.from({ length: days }, (_, i) => {
              const day = first + i;
              const c = tint.get(day);
              return html`<button role="gridcell" class="d ${c ? 'has' : ''} ${day === today ? 'today' : ''}" style=${c ? `--c:${c}` : nothing} aria-label=${ymdString(y, m, i + 1)} @click=${() => this.openMonth(m, day)}>${i + 1}</button>`;
            })}
          </div>
        </section>`;
      })}
    </div>`;
  }

  /** Whose dates are whose: pick the colour you add in, and say what it stands for. */
  private renderLegend() {
    return html`<div class="cal-legend">
      <span class="to-hint">Add in</span>
      ${this.swatches(this.ink, (key) => (this.ink = key), 'Colour for new spans')}
      <input class="who" aria-label="What this colour stands for" placeholder="Name this colour (yours, say)" maxlength="24" .value=${this.doc.legend?.[this.ink] ?? ''} @change=${(e: Event) => this.nameColor(this.ink, (e.target as HTMLInputElement).value)} />
      ${Object.entries(this.doc.legend ?? {}).filter(([key, name]) => name && this.doc.spans.some((s) => (s.color ?? '') === key)).map(([key, name]) => html`<span class="key"><i style="background:${CAL_COLORS[key].hex}"></i>${name}</span>`)}
    </div>`;
  }

  /** The dialog over the grid. Always there, so opening it is a matter of the draft. */
  private renderDialog() {
    const s = this.draft;
    const isNew = this.sel >= this.doc.spans.length;
    return html`<sl-dialog class="cal-dialog" label=${isNew ? 'New span' : 'Edit span'} ?open=${!!s} @sl-request-close=${this.cancel} @keydown=${this.onDialogKey}>
      ${s ? this.renderEditor(s) : nothing}
      ${isNew ? nothing : html`<sl-button slot="footer" size="small" variant="danger" outline @click=${this.removeSpan}>${icon(UI.trash, 14)} Delete</sl-button>`}
      <span slot="footer" class="to-spacer"></span>
      ${s ? html`<span slot="footer" class="to-hint">${this.fmtRange(s)}</span>` : nothing}
      <sl-button slot="footer" size="small" variant="primary" @click=${this.done}>${icon(UI.check, 14)} Done</sl-button>
    </sl-dialog>`;
  }

  private renderEditor(s: Span) {
    const f = this.fields(s);
    const timed = s.kind === 't';
    const r = s.repeat;
    return html`<div class="cal-editor" role="group" aria-label="Edit span">
      <span class="k">Label</span>
      <div class="row">
        <sl-input id="label" class="label sr-label" size="small" label="Label" maxlength=${MAX_LABEL} placeholder="Label" autofocus .value=${s.label} @sl-input=${(e: Event) => this.patch({ label: (e.target as SlInput).value })}></sl-input>${goLinks(s.label)}
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
      <span class="k">Colour</span>
      <div class="row">${this.swatches(s.color ?? '', (key) => { this.ink = key; this.patch({ color: key || undefined }); }, 'Colour of this span')}</div>
      <span class="k">Repeat</span>
      <div class="row">
        <sl-select class="sr-label cal-repeat" size="small" label="Repeat" hoist .value=${r?.every ?? 'never'} @sl-change=${(e: Event) => { const v = (e.target as SlSelect).value as string; this.setRepeat(v === 'never' ? '' : (v as Every)); }}>
          <sl-option value="never">Does not repeat</sl-option>
          ${(Object.keys(EVERY) as Every[]).map((k) => html`<sl-option value=${k}>Every ${EVERY[k]}</sl-option>`)}
        </sl-select>
        ${r
          ? html`<sl-input class="sr-label cal-times" type="number" min="1" max="999" size="small" label="Times" placeholder="∞" .value=${r.count ? String(r.count) : ''} @sl-change=${(e: Event) => this.setRepeat(r.every, { count: +(e.target as SlInput).value })}></sl-input>
            <span class="to-hint">times, or until</span>
            <sl-input class="sr-label" type="date" size="small" label="Until" .value=${r.until !== undefined ? isoDay(r.until) : ''} @sl-change=${(e: Event) => this.setRepeat(r.every, { until: (e.target as SlInput).value })}></sl-input>`
          : nothing}
      </div>
    </div>`;
  }

  /** Every span once, and a repeating one each time it comes round in the month on view (once, at its start, when it does not). */
  private renderAgenda(spans: Span[], monthStart: number, monthEnd: number) {
    const items = spans.flatMap((s, i) => {
      const here = s.repeat ? occurrences(s, monthStart, monthEnd, this.repeatZone) : [];
      return (here.length ? here : [s]).map((o) => ({ s: o, i }));
    });
    items.sort((a, b) => spanStartMs(a.s) - spanStartMs(b.s));
    return html`<div class="cal-agenda">
      <h2>Spans</h2>
      <ul>
        ${items.map(
          ({ s, i }) => html`<li
            class=${i === this.sel ? 'sel' : ''}
            @click=${() => {
              this.open(i);
              this.showMonthOf(s);
            }}
          >
            <span class="when">${this.fmtRange(s)}</span>
            <span class="lbl">${s.label || html`<em>Untitled</em>`}${s.repeat ? html` <span class="rep">${repeatText(s.repeat)}</span>` : nothing}</span>
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
defineElement('cal', ToCal);
