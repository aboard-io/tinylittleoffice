/**
 * <to-calc>: a calculator. Six modes along the top. The plain one has a
 * display, a keypad and a tape; the scientific one adds functions and a
 * graph of y = f(x); the money ones are a few boxes and the answer drawn
 * beside them (lib/calc.ts, calc.def.ts). The working is the document.
 */
import { DocElement, defineElement, html, nothing, state, unsafeSVG, pageSvg, icon, UI, btn } from '../kit.ts';
import { MODES, FIELDS, evaluate, inputs, parseCalc, serializeCalc, shown, withDefaults, type Calc, type Mode } from '../lib/calc.ts';
import { calcPage } from './calc.def.ts';
import './calc.css';

const KEYS = [
  ['7', '8', '9', '÷', '('],
  ['4', '5', '6', '×', ')'],
  ['1', '2', '3', '−', '^'],
  ['0', '.', '%', '+', '='],
];
const SCI = ['sin(', 'cos(', 'tan(', 'ln(', 'log(', 'sqrt(', 'π', 'e', 'x', '!'];

export class ToCalc extends DocElement<Calc> {
  /** What is being typed into the display, not yet on the tape. */
  @state() private entry = '';

  protected parse(text: string) {
    return parseCalc(text);
  }
  protected serialize(c: Calc) {
    return serializeCalc(c);
  }

  private setMode(mode: Mode) {
    this.commit({ mode, lines: mode === this.doc.mode ? this.doc.lines : [] });
    this.entry = '';
  }
  private press(k: string) {
    if (k === '=') return this.enter();
    this.entry += k;
    this.focusDisplay();
  }
  private enter() {
    const e = this.entry.trim();
    if (!e) return;
    if (this.doc.mode === 'graph') {
      // On the grapher, the tape is the functions drawn; the same expression is not drawn twice.
      if (!this.doc.lines.includes(e)) this.commit({ ...this.doc, lines: [...this.doc.lines, e].slice(-5) });
    } else this.commit({ ...this.doc, lines: [...this.doc.lines, e] });
    this.entry = '';
    this.focusDisplay();
  }
  private focusDisplay() {
    void this.updateComplete.then(() => this.querySelector<HTMLInputElement>('.calc-display')?.focus());
  }
  private setField(key: string, value: string) {
    const lines = this.doc.lines.filter((l) => !l.toLowerCase().startsWith(key.toLowerCase() + ' ='));
    this.commit({ ...this.doc, lines: value.trim() ? [...lines, `${key} = ${value.trim()}`] : lines });
  }
  private addYear() {
    const v = withDefaults('cashflow', inputs(this.doc.lines));
    const n = Object.keys(v).filter((k) => /^year \d+$/.test(k)).length;
    this.setField(`year ${n}`, '0');
  }

  private keypad(sci: boolean) {
    const live = this.entry.trim() ? shown(evaluate(this.entry, this.doc.mode === 'graph' ? 1 : NaN)) : '';
    return html`<div class="calc-pad">
      <div class="calc-row">
        <input class="calc-display" aria-label=${this.doc.mode === 'graph' ? 'y = ' : 'Expression'} placeholder=${this.doc.mode === 'graph' ? 'y = … in x, then Enter to draw it' : 'Type or tap; Enter works it out'} .value=${this.entry} @input=${(e: Event) => (this.entry = (e.target as HTMLInputElement).value)} @keydown=${(e: KeyboardEvent) => e.key === 'Enter' && (e.preventDefault(), this.enter())} />
        <span class="calc-live" aria-live="polite">${this.doc.mode === 'graph' ? (live ? `at x = 1: ${live}` : '') : live}</span>
      </div>
      ${sci ? html`<div class="calc-keys sci">${SCI.map((k) => html`<button @click=${() => this.press(k)}>${k}</button>`)}</div>` : nothing}
      <div class="calc-keys">${KEYS.flat().map((k) => html`<button class=${k === '=' ? 'eq' : /\d|\./.test(k) ? '' : 'op'} @click=${() => this.press(k)}>${k}</button>`)}</div>
      <div class="calc-row">
        <button class="to-add calc-soft" @click=${() => (this.entry = this.entry.slice(0, -1))}>${icon(UI.left, 14)} Back</button>
        <button class="to-add calc-soft" @click=${() => (this.entry = '')}>Clear</button>
        ${this.doc.lines.length ? html`<button class="to-add calc-soft" @click=${() => this.commit({ ...this.doc, lines: [] })}>${icon(UI.trash, 14)} Clear the tape</button>` : nothing}
      </div>
    </div>`;
  }

  private tape() {
    const lines = this.doc.lines.filter((l) => l.trim());
    if (!lines.length) return nothing;
    return html`<ol class="calc-tape" aria-label="Tape">
      ${lines.map((l, i) => html`<li><button class="calc-reuse" data-tip="Use it again" @click=${() => (this.entry += this.doc.mode === 'graph' ? l : shown(evaluate(l)).replace('−', '-'))}>${l}</button><b>${this.doc.mode === 'graph' ? '' : '= ' + shown(evaluate(l))}</b>${btn('Remove this line', 'close', () => this.commit({ ...this.doc, lines: this.doc.lines.filter((_, n) => n !== i) }), { cls: 'calc-x', size: 12 })}</li>`)}
    </ol>`;
  }

  private form(mode: Exclude<Mode, 'calc' | 'graph'>) {
    const v = withDefaults(mode, inputs(this.doc.lines));
    const fields = [...FIELDS[mode], ...Object.keys(v).filter((k) => /^year \d+$/.test(k) && !FIELDS[mode].some((f) => f.key === k)).map((k) => ({ key: k, name: k.replace(/^y/, 'Y'), value: 0, unit: '$' }))];
    return html`<form class="calc-form" @submit=${(e: Event) => e.preventDefault()}>
      ${fields.map((f) => html`<label><span>${f.name}</span><input type="text" inputmode="decimal" .value=${String(v[f.key])} @change=${(e: Event) => this.setField(f.key, (e.target as HTMLInputElement).value)} /><small>${f.unit ?? ''}</small></label>`)}
      ${mode === 'cashflow' ? html`<button type="button" class="to-add calc-soft" @click=${this.addYear}>${icon(UI.plus, 14)} Another year</button>` : nothing}
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
      </div>
      <div class="calc ${mode}">
        <div class="calc-left">
          ${mode === 'calc' || mode === 'graph' ? html`${this.keypad(mode === 'graph')}${this.tape()}` : this.form(mode)}
        </div>
        <div class="calc-right">
          ${mode === 'calc' && !this.doc.lines.length ? nothing : unsafeSVG(pageSvg(page, `role="img" aria-label="${MODES.find((m) => m.id === mode)!.name}, worked out"`))}
        </div>
      </div>
    `;
  }
}
defineElement('calc', ToCalc);

declare global {
  interface HTMLElementTagNameMap {
    'to-calc': ToCalc;
  }
}
