/**
 * <to-calc-editor>: the Calculator. A line to type into, with what it comes to under it as it is typed; the
 * tape above it, every line worked out, each a box of its own to change where it stands (the lines after it
 * follow); the keys below. On a graph the lines are curves y = f(x), drawn above the tape. A key never takes
 * the focus, so a phone's keyboard stays where it was. Every change is operations on the tape's paragraph
 * (model.ts): a line put in, changed or taken away is a `text` op, the tape's birth and end a `splice`, the
 * mode a `head` op. Units, conversions and algebra come from math.ts, a chunk fetched when the editor opens.
 */
import { html, nothing, type PropertyDeclarations } from 'lit';
import { unsafeSVG } from 'lit/directives/unsafe-svg.js';
import { Calculator, ChartSpline } from 'lucide';
import { applyAll, type Doc, type Op } from '../../doc/index.ts';
import { tool } from '../../kit/bar.ts';
import { DocElement } from '../../kit/element.ts';
import { pageSvg, SERIES } from '../../kit/draw.ts';
import { UI } from '../../kit/icons.ts';
import { t } from '../../kit/i18n.ts';
import type { MenuItem } from '../../kit/menu.ts';
import { addLine, clearTape, curves, hasEngine, live, readCalc, removeLine, setEngine, setLine, setMode, tape, tidy, type CalcView, type Mode } from './model.ts';
import { graphPage } from './view.ts';
import '../../kit/bar.ts';
import '../../kit/insert.ts';
import './style.css';

export const tag = 'to-calc-editor';

/** The keys: what each shows. */
const KEYS = ['C', '⌫', 'ans', 'π', '√', '7', '8', '9', '÷', '(', '4', '5', '6', '×', ')', '1', '2', '3', '−', '^', '0', '.', '%', '+', '='];
/** What a key types, where it is not what it shows. */
const TYPES: Record<string, string> = { '√': 'sqrt(' };

/** The engine, fetched once for every calculator on the page. */
let engine: Promise<void> | null = null;
const loadEngine = () => (engine ??= import('./math.ts').then((m) => setEngine(m.engine)));

export class ToCalcEditor extends DocElement<CalcView> {
  static properties: PropertyDeclarations = { entry: { state: true }, ready: { state: true } };
  /** What is being typed into the line, not yet on the tape. */
  declare entry: string;
  /** The engine has come: answers in units and algebra can be shown. */
  declare ready: boolean;
  /** Up and Down walk the tape back into the line: how far back. */
  private recall = 0;

  constructor() {
    super();
    this.entry = '';
    this.ready = hasEngine();
  }
  connectedCallback() {
    super.connectedCallback();
    if (!this.ready) void loadEngine().then(() => (this.ready = true));
  }

  protected read(doc: Doc): CalcView {
    return readCalc(doc);
  }
  protected willUpdate(changed: Map<string, unknown>) {
    super.willUpdate(changed);
    // A loosely written document arriving is made a tape: one edit, undoable like any other.
    if (changed.has('value') && this.view.loose && !this.canUndo && !this.canRedo) this.edit(tidy(this.doc));
  }

  /** A command over the tape: the document made a tape first if an undo left it loose. */
  private run(f: (v: CalcView) => Op[]) {
    const first = tidy(this.doc);
    this.edit([...first, ...f(first.length ? readCalc(applyAll(this.doc, first)) : this.view)]);
  }

  private get display() {
    return this.querySelector<HTMLInputElement>('.calc-display');
  }

  /**
   * Words typed into the line where its caret is (an input keeps its caret when it has not the focus), or
   * a key: ⌫ takes the letter before the caret, C the whole line, = works it out.
   */
  private put(typed: string, back = false) {
    const el = this.display;
    const n = this.entry.length;
    const a = el?.selectionStart ?? n;
    const b = el?.selectionEnd ?? n;
    const from = back && a === b ? Math.max(0, a - 1) : a;
    this.entry = this.entry.slice(0, from) + typed + this.entry.slice(b);
    const caret = from + typed.length;
    void this.updateComplete.then(() => this.display?.setSelectionRange(caret, caret));
  }
  private press(k: string) {
    if (k === '=') return this.enter();
    if (k === 'C') return void (this.entry = '');
    if (k === '⌫') return this.put('', true);
    this.put(k === 'ans' && this.view.mode === 'graph' ? 'x' : (TYPES[k] ?? k));
  }

  /** Enter: the line goes on the tape, worked out; on a graph, it is drawn. */
  private enter() {
    if (!this.entry.trim()) return;
    this.run((v) => addLine(v, this.entry));
    this.entry = '';
    this.recall = 0;
  }
  private onKey = (e: KeyboardEvent) => {
    const lines = this.view.lines;
    if (e.key === 'Enter') {
      e.preventDefault();
      this.enter();
    } else if (e.key === 'ArrowUp' && this.recall < lines.length) {
      e.preventDefault();
      this.entry = lines[lines.length - 1 - this.recall++];
    } else if (e.key === 'ArrowDown' && this.recall > 0) {
      e.preventDefault();
      this.entry = --this.recall ? lines[lines.length - this.recall] : '';
    } else if (e.key === 'Escape' && this.entry) {
      e.preventDefault();
      this.entry = '';
    }
  };

  /* ---------- the bar ---------- */

  private mode(m: Mode) {
    this.run((v) => setMode(v, m));
    this.entry = '';
  }
  private inserts(): MenuItem[] {
    const f = (label: string, typed: string, group: string): MenuItem => ({ label, hint: typed, group, does: () => (this.put(typed), this.display?.focus()) });
    const fns = t('Functions');
    const more = t('Units and algebra');
    return [
      f(t('Sine'), 'sin(', fns),
      f(t('Cosine'), 'cos(', fns),
      f(t('Tangent'), 'tan(', fns),
      f(t('Natural log'), 'ln(', fns),
      f(t('Log base ten'), 'log(', fns),
      f(t('Square root'), 'sqrt(', fns),
      f(t('Absolute value'), 'abs(', fns),
      f(t('Factorial'), '!', fns),
      f(t('e, the number'), 'e', fns),
      f(t('x, for a graph'), 'x', fns),
      f(t('Convert to'), ' to ', more),
      f(t('Derivative'), 'derivative("x^2", "x")', more),
      f(t('Simplify'), 'simplify("2x + 3x")', more),
    ];
  }

  /* ---------- drawing ---------- */

  private keys() {
    const graph = this.view.mode === 'graph';
    const name = (k: string) => ({ '⌫': t('Backspace'), C: t('Clear the line'), '√': t('Square root'), ans: graph ? 'x' : t('The answer before') })[k] ?? k;
    return html`<div class="calc-keys" role="group" aria-label=${t('Keys')}>
      ${KEYS.map((k) => {
        const shownKey = k === 'ans' && graph ? 'x' : k;
        return html`<button type="button" class="calc-key ${k === '=' ? 'eq' : /^[\d.]$/.test(k) ? 'digit' : 'op'}" aria-label=${name(k)} @mousedown=${keep} @click=${() => this.press(k)}>${shownKey}</button>`;
      })}
    </div>`;
  }
  private tapeRows(v: CalcView) {
    if (!v.lines.length) return html`<p class="to-hint calc-empty">${v.mode === 'graph' ? t('Type a curve in x, such as x^2 or sin(x), and press Enter to draw it.') : t('Type a sum, or 3 inch to cm, and press Enter. a = 12 keeps an answer by name.')}</p>`;
    const graph = v.mode === 'graph';
    const texts = graph ? [] : tape(v.lines).texts;
    const exprs = graph ? curves(v.lines).exprs : [];
    return html`<ol class="calc-tape" aria-label=${t('Tape')}>
      ${v.lines.map((l, i) => {
        const n = i + 1;
        const colour = graph ? exprs.indexOf(l) : -1;
        return html`<li class="calc-row">
          ${graph && colour >= 0 ? html`<span class="calc-swatch" style=${`--c:${SERIES[colour % SERIES.length]}`} aria-hidden="true"></span>` : nothing}
          <input class="calc-line" aria-label=${t('Line {n}', { n })} .value=${l} autocomplete="off" autocapitalize="off" spellcheck="false" enterkeyhint="done"
            @change=${(e: Event) => this.run((w) => setLine(w, i, (e.target as HTMLInputElement).value))}
            @keydown=${(e: KeyboardEvent) => e.key === 'Enter' && (e.target as HTMLInputElement).blur()} />
          ${graph ? nothing : html`<button type="button" class="calc-ans" aria-label=${texts[i] ? t('Put {answer} in the line', { answer: texts[i] }) : t('No answer')} ?disabled=${!texts[i]} @mousedown=${keep} @click=${() => this.put(texts[i].replace(/−/g, '-'))}>= ${texts[i] || '?'}</button>`}
          ${tool({ label: t('Take away line {n}', { n }), icon: UI.close, cls: 'calc-drop', does: () => this.run((w) => removeLine(w, i)) })}
        </li>`;
      })}
    </ol>`;
  }

  render() {
    const v = this.view;
    const graph = v.mode === 'graph';
    const answer = live(this.entry, v.lines, v.mode);
    return html`<to-bar class="calc-bar">
        ${tool({ label: t('Calculator'), icon: Calculator, pressed: !graph, does: () => this.mode('calc') })}
        ${tool({ label: t('Graph'), icon: ChartSpline, pressed: graph, does: () => this.mode('graph') })}
        <to-insert .items=${this.inserts()}></to-insert>
        ${tool({ label: graph ? t('Clear the graph') : t('Clear the tape'), icon: UI.trash, disabled: !v.lines.length, does: () => this.run(clearTape) })}
        ${tool({ label: t('Undo'), icon: UI.undo, keys: 'Mod+Z', keep: true, disabled: !this.canUndo, does: () => this.dispatchEvent(new CustomEvent('docundo', { cancelable: true })) })}
        ${tool({ label: t('Redo'), icon: UI.redo, keys: 'Mod+Shift+Z', keep: true, disabled: !this.canRedo, does: () => this.dispatchEvent(new CustomEvent('docredo', { cancelable: true })) })}
      </to-bar>
      <div class="calc ${graph ? 'calc-graphing' : ''}">
        ${graph ? html`<figure class="calc-graph">${unsafeSVG(pageSvg(graphPage(v.lines), 'class="calc-plot"'))}</figure>` : nothing}
        <div class="calc-paper">${this.tapeRows(v)}</div>
        <div class="calc-pad">
          <div class="calc-entry">
            <input class="calc-display" aria-label=${graph ? t('y =') : t('Sum')} placeholder=${graph ? t('y = …') : t('Type or tap')} autocomplete="off" autocapitalize="off" spellcheck="false" enterkeyhint="done"
              .value=${this.entry} @input=${(e: Event) => (this.entry = (e.target as HTMLInputElement).value)} @keydown=${this.onKey} />
            <output class="calc-live" aria-live="polite">${answer ? (graph ? t('at x = 1: {answer}', { answer }) : `= ${answer}`) : ''}</output>
          </div>
          ${this.keys()}
        </div>
      </div>`;
  }
}
/** A key is pressed without taking the focus from the line. */
const keep = (e: Event) => e.preventDefault();

if (!customElements.get(tag)) customElements.define(tag, ToCalcEditor);

declare global {
  interface HTMLElementTagNameMap {
    'to-calc-editor': ToCalcEditor;
  }
}
