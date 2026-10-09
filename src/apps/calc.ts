/**
 * <to-calc>: a calculator. Six modes along the bar. The plain one is a
 * line to type any expression into, with its answer under it as it is
 * typed, and the tape beneath: every line worked out, each a box of its
 * own to change (the lines after it follow), a line "a = 12" keeping its
 * answer by name for the lines after. The scientific one adds functions
 * and a graph of y = f(x); the money ones are a few boxes and the answer
 * drawn beside them (lib/calc.ts, calc.def.ts). The working is the document.
 */
import { DocElement, defineElement, html, nothing, state, unsafeSVG, pageSvg, tool, btn } from '../kit.ts';
import { MODES, FIELDS, hasEngine, inputs, isMoney, parseCalc, result, serializeCalc, setEngine, tape, withDefaults, type Calc, type Mode } from '../lib/calc.ts';
import { calcPage } from './calc.def.ts';
import './calc.css';

/** The keys: what each puts into the line (a word for the display is what it types). */
const KEYS = [
  ['C', '⌫', 'ans', 'π', '√'],
  ['7', '8', '9', '÷', '('],
  ['4', '5', '6', '×', ')'],
  ['1', '2', '3', '−', '^'],
  ['0', '.', '%', '+', '='],
];
const TYPES: Record<string, string> = { '√': 'sqrt(', ans: 'ans', π: 'π' };
const SCI = ['sin(', 'cos(', 'tan(', 'ln(', 'log(', 'e', 'x', '!', ',', 'abs('];
export class ToCalc extends DocElement<Calc> {
  /** What is being typed into the line, not yet on the tape. */
  @state() private entry = '';
  /** Up and Down walk the tape back into the line: how far back. */
  private recall = 0;

  connectedCallback() {
    super.connectedCallback();
    // Units, conversions and algebra come from a second engine, fetched the first time a calculator opens.
    if (!hasEngine()) void import('../lib/calc-math.ts').then(({ engine }) => (setEngine(engine), this.requestUpdate()));
  }

  protected parse(text: string) {
    return parseCalc(text);
  }
  protected serialize(c: Calc) {
    return serializeCalc(c);
  }
  protected loaded() {
    this.entry = '';
    this.recall = 0;
  }

  private get display() {
    return this.querySelector<HTMLInputElement>('.calc-display');
  }

  private setMode(mode: Mode) {
    this.commit({ mode, lines: mode === this.doc.mode ? this.doc.lines : [] });
    this.entry = '';
  }

  /**
   * A key: what it types goes into the line where the caret is (at the
   * end if the line is not being typed in), the caret after it. The line
   * keeps the focus it has; a tap on a key never takes it (and never
   * brings a phone's keyboard up over the keys).
   */
  private press(k: string) {
    if (k === '=') return this.enter();
    if (k === 'C') return void (this.entry = '');
    const el = this.display;
    const focused = el && document.activeElement === el;
    const [a, b] = focused ? [el.selectionStart ?? this.entry.length, el.selectionEnd ?? this.entry.length] : [this.entry.length, this.entry.length];
    const typed = k === '⌫' ? '' : (TYPES[k] ?? k);
    const from = k === '⌫' && a === b ? Math.max(0, a - 1) : a;
    this.entry = this.entry.slice(0, from) + typed + this.entry.slice(b);
    const caret = from + typed.length;
    if (focused) void this.updateComplete.then(() => el.setSelectionRange(caret, caret));
  }

  /** Enter: the line goes on the tape, worked out; on the grapher, it is drawn. */
  private enter() {
    const e = this.entry.trim();
    if (!e) return;
    if (this.doc.mode === 'graph') {
      // On the grapher, the tape is the functions drawn; the same expression is not drawn twice.
      if (!this.doc.lines.includes(e)) this.commit({ ...this.doc, lines: [...this.doc.lines, e].slice(-5) });
    } else this.commit({ ...this.doc, lines: [...this.doc.lines, e] });
    this.entry = '';
    this.recall = 0;
  }

  private onKey(e: KeyboardEvent) {
    const lines = this.doc.lines;
    if (e.key === 'Enter') (e.preventDefault(), this.enter());
    else if (e.key === 'ArrowUp' && this.recall < lines.length) (e.preventDefault(), (this.entry = lines[lines.length - 1 - this.recall++]));
    else if (e.key === 'ArrowDown' && this.recall > 0) (e.preventDefault(), (this.entry = --this.recall ? lines[lines.length - this.recall] : ''));
    else if (e.key === 'Escape') this.entry = '';
  }

  /** A line of the tape changed where it stands: the lines after it follow. An emptied line goes. */
  private setLine(i: number, value: string) {
    const lines = this.doc.lines.slice();
    if (value.trim()) lines[i] = value;
    else lines.splice(i, 1);
    this.commit({ ...this.doc, lines });
  }

  private setField(key: string, value: string) {
    const lines = this.doc.lines.filter((l) => !l.toLowerCase().startsWith(key.toLowerCase() + ' ='));
    this.commit({ ...this.doc, lines: value.trim() ? [...lines, `${key} = ${value.trim()}`] : lines });
  }
  private addYear() {
    const v = withDefaults('cashflow', inputs(this.doc.lines));
    const n = Object.keys(v).filter((k) => /^year \d+$/.test(k)).length;
    this.setField(`year ${n}`, '0');
    this.focusSoon('.calc-form label:last-of-type input', true);
  }

  private keypad(sci: boolean) {
    const graph = this.doc.mode === 'graph';
    const { scope } = tape(graph ? [] : this.doc.lines);
    const live = this.entry.trim() ? result(this.entry.replace(/^\s*[a-zπ_][a-z0-9_ ]*=/i, ''), scope, graph ? 1 : NaN).text : '';
    return html`<div class="calc-pad">
      <div class="calc-row">
        <input
          class="calc-display"
          aria-label=${graph ? 'y = ' : 'Expression'}
          placeholder=${graph ? 'y = … in x, then Enter to draw it' : 'Type or tap (3 inch to cm works too); Enter works it out'}
          autocomplete="off"
          autocapitalize="off"
          spellcheck="false"
          enterkeyhint="done"
          .value=${this.entry}
          @input=${(e: Event) => (this.entry = (e.target as HTMLInputElement).value)}
          @keydown=${this.onKey}
        />
        <span class="calc-live" aria-live="polite">${graph ? (live ? `at x = 1: ${live}` : '') : live}</span>
      </div>
      ${sci ? html`<div class="calc-keys sci">${SCI.map((k) => html`<button type="button" @mousedown=${keep} @click=${() => this.press(k)}>${k}</button>`)}</div>` : nothing}
      <div class="calc-keys">
        ${KEYS.flat().map((k) => html`<button type="button" class=${k === '=' ? 'eq' : /^[\d.]$/.test(k) ? '' : 'op'} aria-label=${k === '⌫' ? 'Backspace' : k === 'C' ? 'Clear the line' : k === '√' ? 'Square root' : k} @mousedown=${keep} @click=${() => this.press(k)}>${k}</button>`)}
      </div>
    </div>`;
  }

  /** The tape: every line a box to change, its answer beside it; an answer is a key, putting itself into the line. */
  private renderTape() {
    const lines = this.doc.lines;
    if (!lines.length) return nothing;
    const graph = this.doc.mode === 'graph';
    const { texts } = tape(graph ? [] : lines);
    return html`<ol class="calc-tape" aria-label="Tape">
      ${lines.map(
        (l, i) => html`<li>
          <input class="calc-line" aria-label=${`Line ${i + 1}`} .value=${l} @change=${(e: Event) => this.setLine(i, (e.target as HTMLInputElement).value)} @keydown=${(e: KeyboardEvent) => e.key === 'Enter' && (e.target as HTMLInputElement).blur()} />
          ${graph ? nothing : html`<button type="button" class="calc-ans" data-tip="Put this answer in the line" @mousedown=${keep} @click=${() => this.press(texts[i].replace('−', '-'))}>= ${texts[i] || '?'}</button>`}
          ${btn(`Take away line ${i + 1}`, 'close', () => this.setLine(i, ''), { size: 12 })}
        </li>`,
      )}
    </ol>`;
  }

  /** A money mode: a box for each number, the page beside following as they are typed. Enter in the last year of a cash flow adds a year. */
  private form(mode: Exclude<Mode, 'calc' | 'graph'>) {
    const v = withDefaults(mode, inputs(this.doc.lines));
    const fields = [...FIELDS[mode], ...Object.keys(v).filter((k) => /^year \d+$/.test(k) && !FIELDS[mode].some((f) => f.key === k)).map((k) => ({ key: k, name: k.replace(/^y/, 'Y'), value: 0, unit: '$' }))];
    return html`<form class="calc-form" @submit=${(e: Event) => e.preventDefault()}>
      ${fields.map(
        (f, i) =>
          html`<label><span>${f.name}</span><input type="text" inputmode="decimal" autocomplete="off" .value=${String(v[f.key])} @change=${(e: Event) => this.setField(f.key, (e.target as HTMLInputElement).value)} @keydown=${(e: KeyboardEvent) => {
            if (e.key !== 'Enter') return;
            e.preventDefault();
            (e.target as HTMLInputElement).blur();
            if (mode === 'cashflow' && i === fields.length - 1) this.addYear();
          }} /><small>${f.unit ?? ''}</small></label>`,
      )}
    </form>`;
  }

  render() {
    const mode = this.doc.mode;
    const page = calcPage(this.serialize(this.doc));
    return html`
      <div class="to-toolbar" role="toolbar" aria-label="Calculator">
        <sl-radio-group class="sr-label" size="small" label="Mode" value=${mode} @sl-change=${(e: Event) => this.setMode((e.target as HTMLInputElement).value as Mode)}>
          ${MODES.map((m) => html`<sl-radio-button value=${m.id}>${m.name}</sl-radio-button>`)}
        </sl-radio-group>
        ${mode === 'cashflow' ? tool('Another year', 'plus', () => this.addYear(), { text: true }) : nothing}
        ${!isMoney(mode) && this.doc.lines.length ? tool(mode === 'graph' ? 'Clear the graph' : 'Clear the tape', 'trash', () => this.commit({ ...this.doc, lines: [] }), { text: true }) : nothing}
      </div>
      <div class="calc ${mode}">
        <div class="calc-left">${isMoney(mode) ? this.form(mode) : html`${this.keypad(mode === 'graph')}${this.renderTape()}`}</div>
        <div class="calc-right">
          ${mode === 'calc' && !this.doc.lines.length ? nothing : unsafeSVG(pageSvg(page, `role="img" aria-label="${MODES.find((m) => m.id === mode)!.name}, worked out"`))}
        </div>
      </div>
    `;
  }
}
/** A key is pressed without taking the focus from the line. */
const keep = (e: Event) => e.preventDefault();

defineElement('calc', ToCalc);

declare global {
  interface HTMLElementTagNameMap {
    'to-calc': ToCalc;
  }
}
