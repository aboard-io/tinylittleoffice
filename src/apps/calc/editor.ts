/**
 * <to-calc-editor>: the Calculator. A line to type into, with what it comes to under it as it is typed; the
 * tape above it, every line worked out, each a box of its own to change where it stands (the lines after it
 * follow); the keys below. On a graph the lines are curves y = f(x), drawn above the tape. A key never takes
 * the focus, so a phone's keyboard stays where it was. Every change is operations on the tape's paragraph
 * (model.ts): a line put in, changed or taken away is a `text` op, the tape's birth and end a `splice`, the
 * mode a `head` op. Units, conversions and algebra come from math.ts, a chunk fetched when the editor opens.
 *
 * The tape's lines are rows (kit/rows.ts): a tap on a line's grip, or Shift+Up/Down or Escape in it, chooses it
 * whole, with the bar under it (Edit, Move up, Move down, Duplicate | Copy, Cut, Paste | Delete) and the keys a
 * chosen thing has; a drag by the grip carries it. In a line's box: Alt+Up/Down move it, Mod+D copies it under
 * itself, Up and Down go to the line above and below, Enter is done (the caret to the line being typed),
 * Escape puts back what it said, Backspace on an empty line takes it away, and a paste of several lines makes
 * several. The line being typed is not the document (docs/editing.md §8): Up/Down with no modifier recall the
 * tape into it, Escape and C clear it, and Mod+Z in it is its own while it holds words. An undo puts the focus
 * back where it was before the change: the chosen lines, the line's box, or the line being typed.
 */
import { html, nothing, type PropertyDeclarations } from 'lit';
import { unsafeSVG } from 'lit/directives/unsafe-svg.js';
import { GripVertical } from 'lucide';
import { applyAll, write, type Doc, type Op } from '../../doc/index.ts';
import { cmdTool, tool } from '../../kit/bar.ts';
import { drawnIn, runKey } from '../../kit/commands.ts';
import COMMANDS, { ENTRY, LINE } from './commands.ts';
import { docToHtml, GENERATOR, pasteFrom } from '../../kit/clipboard.ts';
import { DocElement, firstAt, type Entry } from '../../kit/element.ts';
import { pageSvg, SERIES } from '../../kit/draw.ts';
import { icon, UI } from '../../kit/icons.ts';
import { t } from '../../kit/i18n.ts';
import { Rows, type Clip, type RowRange, type RowSpan } from '../../kit/rows.ts';
import { addLine, clearTape, curves, dropLine, hasEngine, isNote, live, moveLines, pastedLines, readCalc, removeLine, replaceLines, setEngine, setLine, setMode, tape, tapeBlock, tidy, type CalcView, type Mode } from './model.ts';
import { graphPage } from './view.ts';
import '../../kit/bar.ts';
import '../../kit/insert.ts';
import './style.css';

export const tag = 'to-calc-editor';

/** The keys: what each shows. */
const KEYS = ['C', '⌫', 'ans', 'π', '√', '7', '8', '9', '÷', '(', '4', '5', '6', '×', ')', '1', '2', '3', '−', '^', '0', '.', '%', '+', '='];
/** What a key types, where it is not what it shows. */
const TYPES: Record<string, string> = { '√': 'sqrt(' };

/** Where the focus was when an edit began, for its undo: chosen lines, a line's box (and its caret), or the line being typed. */
type Mark = { range: RowRange<number> } | { line: number; offset: number } | { entry: true };

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
  /** Where the caret goes after a key, until the line is drawn with what the key typed (keys come faster than frames). */
  private caret: number | null = null;
  /** Line boxes put on the tape by a key already: the change their blur brings is not theirs to make again (until they are focused anew). */
  private settled = new WeakSet<HTMLInputElement>();
  /** Lines chosen whole: the kit's one implementation (keys, the bar under them, the clipboard, a drag by the grip). */
  readonly rows = new Rows<number>(this, {
    // The lines the document has (drawn or about to be: a range kept after an edit is drawn in the render that edit asks for).
    rows: () => {
      const els = this.querySelectorAll<HTMLElement>('.calc-row');
      return this.view.lines.map((_, i) => ({ id: i, el: els[i] ?? document.createElement('li'), span: { from: i, to: i + 1 } }));
    },
    box: () => this.querySelector<HTMLElement>('.calc-tape'),
    handle: '.calc-grip',
    label: t('Chosen lines'),
    current: () => this.lineIndex(document.activeElement),
    edit: (i, offset) => this.focusLine(i, offset),
    remove: (s) => this.removeSpan(s),
    canMove: (s, by) => (by < 0 ? s.from > 0 : s.to < this.view.lines.length),
    move: (s, by) => this.moveSpan(s, by),
    duplicate: (s) => this.duplicateSpan(s),
    copy: (s) => this.clip(s),
    paste: (data, s) => this.pasteLines(data, s),
    drop: (i, to) => this.run((v) => dropLine(v, i, to)),
  });

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

  /** Commands over the tape, each on the tape the one before left, as one edit: the document made a tape first if an undo left it loose. */
  private run(...fs: ((v: CalcView) => Op[])[]) {
    const ops = tidy(this.doc);
    let doc = ops.length ? applyAll(this.doc, ops) : this.doc;
    for (const f of fs) {
      const more = f(doc === this.doc ? this.view : readCalc(doc));
      ops.push(...more);
      if (more.length) doc = applyAll(doc, more);
    }
    this.edit(ops);
  }

  /* ---------- undo: the focus comes back ---------- */

  /** Every edit keeps where the focus was before it, for its undo. */
  edit(ops: Op[], key?: string, mark?: unknown) {
    super.edit(ops, key, mark ?? this.where());
  }
  private where(): Mark | undefined {
    const r = this.rows.range;
    if (r) return { range: { ...r } };
    const a = document.activeElement;
    if (a && a === this.display) return { entry: true };
    const i = this.lineIndex(a);
    if (i === null) return undefined;
    return { line: i, offset: a instanceof HTMLInputElement && a.classList.contains('calc-line') ? (a.selectionStart ?? a.value.length) : -1 };
  }
  /** After an undo the focus is where it was before the change; after a redo (or with nothing kept), on the line the change began at. */
  protected undone(entry: Entry, redo: boolean) {
    this.rows.release();
    const mark = entry.mark as Mark | undefined;
    const at = this.lineAt(entry);
    void this.updateComplete.then(() => {
      const n = this.view.lines.length;
      if (!redo && mark && 'range' in mark) {
        if (mark.range.anchor < n && mark.range.focus < n) return this.rows.select(mark.range);
      } else if (!redo && mark && 'line' in mark && mark.line < n) return this.focusLine(mark.line, mark.offset < 0 ? 'end' : mark.offset);
      else if (!redo && mark && 'entry' in mark) return this.display?.focus();
      if (at >= 0 && at < n) this.focusLine(at, 'end');
      else this.display?.focus();
    });
  }
  /** The line an entry's change begins at, on the tape as it is now; -1 when it touched no line. */
  private lineAt(entry: Entry): number {
    if (firstAt(entry) < 0) return -1;
    const op = entry.ops.find((o) => o.op === 'text');
    if (!op || op.op !== 'text') return 0;
    // A line taken from the end begins at the line break before it: the line is the one after that break.
    const text = this.view.lines.join('\n');
    return text.slice(0, text[op.from] === '\n' ? op.from + 1 : op.from).split('\n').length - 1;
  }

  /* ---------- the tape's lines ---------- */

  /** Which tape line an element is in, or null. */
  private lineIndex(el: Element | null): number | null {
    const row = el?.closest?.('.calc-row');
    if (!row || !this.contains(row)) return null;
    const i = [...this.querySelectorAll('.calc-row')].indexOf(row);
    return i < 0 ? null : i;
  }
  private lineBox(i: number) {
    return this.querySelectorAll<HTMLInputElement>('.calc-line')[i] ?? null;
  }
  /** Where a person starts: the entry line, the caret at its end. */
  async focusFirst() {
    await this.updateComplete;
    const d = this.display;
    if (!d) return;
    d.focus({ preventScroll: true });
    d.setSelectionRange(d.value.length, d.value.length);
  }
  /** The caret into line i's box, once it is drawn. */
  private focusLine(i: number, offset: number | 'end') {
    void this.updateComplete.then(() => {
      const el = this.lineBox(i);
      if (!el) return this.display?.focus();
      this.settled.delete(el);
      el.focus();
      const at = offset === 'end' ? el.value.length : Math.min(offset, el.value.length);
      el.setSelectionRange(at, at);
    });
  }
  /**
   * What a line's box says, put on the tape where it differs (an input's change comes only on blur), with the
   * commands after it, as one edit. A box drawn again after the edit says what its line says, so the change that
   * comes with the blur finds nothing to put.
   */
  private runLine(i: number, box: HTMLInputElement, ...fs: ((v: CalcView) => Op[])[]) {
    this.settled.add(box);
    this.run(...(box.value !== this.view.lines[i] ? [(v: CalcView) => setLine(v, i, box.value)] : []), ...fs);
  }
  private onLineChange(e: Event, i: number) {
    const box = e.target as HTMLInputElement;
    if (this.settled.has(box)) return;
    if (box.value !== this.view.lines[i]) this.run((w) => setLine(w, i, box.value));
  }
  /** The tape line a key is typed in, while its commands answer it (commands.ts). */
  private here: { i: number; box: HTMLInputElement; offset: number } | null = null;
  private onLineKey(e: KeyboardEvent, i: number) {
    if (e.isComposing || e.keyCode === 229) return;
    const box = e.target as HTMLInputElement;
    const mod = e.metaKey || e.ctrlKey;
    if (mod && !e.altKey && /^[zy]$/i.test(e.key)) {
      // Words typed and not yet on the tape: the box's own undo takes them back first.
      if (box.value !== this.view.lines[i]) e.stopPropagation();
      return;
    }
    this.here = { i, box, offset: box.selectionStart ?? box.value.length };
    try {
      runKey(e, LINE, this);
    } finally {
      this.here = null;
    }
  }
  /** Enter on a line: done, the line put on the tape, the caret to the line being typed (the tape grows at its end). */
  lineDone() {
    const h = this.here!;
    this.runLine(h.i, h.box);
    this.display?.focus();
  }
  /** Escape on a line: what it said, back (the step out of an edit not put down); said already, the line chosen. */
  lineBack() {
    const { i, box } = this.here!;
    if (box.value !== this.view.lines[i]) {
      box.value = this.view.lines[i];
      box.setSelectionRange(box.value.length, box.value.length);
    } else this.rows.choose(i);
  }
  /** Alt+Up/Down: the line past its neighbour, the caret with it. */
  lineMove(by: -1 | 1) {
    const { i, box, offset } = this.here!;
    if (!box.value.trim() || (by < 0 ? i === 0 : i >= this.view.lines.length - 1)) return;
    this.runLine(i, box, (v) => moveLines(v, i, i + 1, by));
    this.focusLine(i + by, offset);
  }
  /** Shift+Up/Down: the line chosen whole. */
  lineChoose() {
    this.rows.choose(this.here!.i);
  }
  /** Up and Down: the line before or after (after the last, the line being typed). */
  lineStep(by: -1 | 1): boolean {
    const { i, box, offset } = this.here!;
    const to = i + by;
    if (to < 0) return false;
    if (box.value.trim()) this.runLine(i, box);
    if (to >= this.view.lines.length) this.display?.focus();
    else this.focusLine(to, offset);
    return true;
  }
  /** Mod+D: the line again under it. */
  lineDuplicate() {
    const { i, box, offset } = this.here!;
    if (!box.value.trim()) return;
    this.runLine(i, box, (v) => replaceLines(v, i + 1, i + 1, [v.lines[i]]));
    this.focusLine(i + 1, offset);
  }
  /** Backspace in an empty line: the line taken away, the caret to the end of the one before. */
  lineRemove(): boolean {
    const { i, box } = this.here!;
    if (box.value !== '') return false;
    const lines = this.view.lines;
    this.settled.add(box);
    this.run((v) => removeLine(v, i));
    if (i > 0) this.focusLine(i - 1, 'end');
    else if (lines.length > 1) this.focusLine(0, 0);
    else void this.updateComplete.then(() => this.display?.focus());
    return true;
  }
  /** Mod+A with the box's words all selected (or none): the whole tape. False while the box has words to select first. */
  allKey(e?: Event): boolean {
    const box = e?.target as HTMLInputElement | null;
    if (!box || !this.whole(box)) return false;
    this.rows.selectAll();
    return true;
  }
  /** A box whose words are all selected (or that has none): Select All pressed again takes the whole tape. */
  private whole(box: HTMLInputElement): boolean {
    return this.view.lines.length > 0 && (box.selectionStart ?? 0) === 0 && (box.selectionEnd ?? 0) === box.value.length;
  }

  /* ---------- lines chosen whole (kit/rows.ts) ---------- */

  private removeSpan(s: RowSpan) {
    this.run((v) => replaceLines(v, s.from, s.to, []));
    if (s.from > 0) this.focusLine(s.from - 1, 'end');
    else if (this.view.lines.length) this.focusLine(0, 'end');
    else void this.updateComplete.then(() => this.display?.focus());
  }
  private moveSpan(s: RowSpan, by: 1 | -1): RowRange<number> | null {
    const r = this.rows.range;
    this.run((v) => moveLines(v, s.from, s.to, by));
    return r && { anchor: r.anchor + by, focus: r.focus + by };
  }
  /** The chosen lines again, right under them; the copies are chosen. */
  private duplicateSpan(s: RowSpan): RowRange<number> | null {
    const r = this.rows.range;
    this.run((v) => replaceLines(v, s.to, s.to, v.lines.slice(s.from, s.to)));
    const n = s.to - s.from;
    return r && { anchor: r.anchor + n, focus: r.focus + n };
  }
  /** Chosen lines on the clipboard: a tape of them as TLO, and as HTML with our mark. */
  private clip(s: RowSpan): Clip {
    const blocks = [tapeBlock(this.view.lines.slice(s.from, s.to))];
    return { text: write({ head: {}, blocks }), html: docToHtml(blocks) };
  }
  /** What a paste's data says, as tape lines. */
  private linesOf(data: Clip): string[] {
    const got = pasteFrom(data, 'lines');
    if (!got) return [];
    return pastedLines('blocks' in got ? got.blocks : [{ k: 'p', runs: got.runs }], this.view.mode);
  }
  /** Lines pasted in place of the chosen ones (at the tape's end with none); the caret to the last. */
  private pasteLines(data: Clip, s: RowSpan | null) {
    const ls = this.linesOf(data);
    if (!ls.length) return;
    const n = this.view.lines.length;
    const from = s ? s.from : n;
    this.run((v) => replaceLines(v, from, s ? s.to : n, ls));
    this.focusLine(from + ls.length - 1, 'end');
  }
  /**
   * A paste into a box: several lines (a column of sums) go on the tape a line each, in one edit, the words around
   * the caret kept at their ends; our own copy is read as the TLO it is. Words alone are the box's own.
   */
  private onBoxPaste(e: ClipboardEvent, i: number | null) {
    const dt = e.clipboardData;
    if (!dt) return;
    const data = { text: dt.getData('text/plain'), html: dt.getData('text/html') };
    const ours = data.html.includes(GENERATOR);
    if (!ours && !/\n/.test(data.text.trim())) return;
    const ls = this.linesOf(data);
    if (!ls.length) return;
    e.preventDefault();
    const box = e.target as HTMLInputElement;
    const a = box.selectionStart ?? box.value.length;
    const b = box.selectionEnd ?? a;
    if (ls.length === 1) {
      if (i === null) return this.put(ls[0]);
      box.setRangeText(ls[0], a, b, 'end');
      return;
    }
    const all = [...ls];
    all[0] = box.value.slice(0, a) + all[0];
    all[all.length - 1] += box.value.slice(b);
    if (i === null) {
      this.run((v) => replaceLines(v, v.lines.length, v.lines.length, all));
      this.setEntry('');
      this.recall = 0;
    } else {
      this.settled.add(box);
      this.run((v) => replaceLines(v, i, i + 1, all));
      this.focusLine(i + all.length - 1, 'end');
    }
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
    const drawn = el && el.value === this.entry;
    const a = drawn ? (el.selectionStart ?? n) : (this.caret ?? n);
    const b = drawn ? (el.selectionEnd ?? n) : (this.caret ?? n);
    const from = back && a === b ? Math.max(0, a - 1) : a;
    this.entry = this.entry.slice(0, from) + typed + this.entry.slice(b);
    const caret = (this.caret = from + typed.length);
    void this.updateComplete.then(() => this.display?.setSelectionRange(caret, caret));
  }
  private press(k: string) {
    if (k === '=') return this.enter();
    if (k === 'C') return this.setEntry('');
    if (k === '⌫') return this.put('', true);
    this.put(k === 'ans' && this.view.mode === 'graph' ? 'x' : (TYPES[k] ?? k));
  }

  /** The line given words of its own: the caret at their end. */
  setEntry(s: string) {
    this.entry = s;
    this.caret = null;
  }

  /** Enter: the line goes on the tape, worked out; on a graph, it is drawn. */
  enter() {
    if (!this.entry.trim()) return;
    this.run((v) => addLine(v, this.entry));
    this.setEntry('');
    this.recall = 0;
  }
  /** Keys in the line being typed (commands.ts). Up and Down recall the tape only with no modifier: Shift+Up is the box's own selection. */
  private onKey = (e: KeyboardEvent) => {
    if (e.isComposing || e.keyCode === 229) return;
    const box = e.target as HTMLInputElement;
    if ((e.metaKey || e.ctrlKey) && !e.altKey && /^[zy]$/i.test(e.key)) {
      // Words being typed are not the document: the box's own undo takes them back, not the tape's.
      if (box.value) e.stopPropagation();
      return;
    }
    runKey(e, ENTRY, this);
  };
  /** Up (1) and Down (-1) in the line being typed: the tape's lines again, last first, and back to an empty line. */
  recallKey(by: 1 | -1): boolean {
    const lines = this.view.lines;
    if (by > 0 && this.recall < lines.length) this.setEntry(lines[lines.length - 1 - this.recall++]);
    else if (by < 0 && this.recall > 0) this.setEntry(--this.recall ? lines[lines.length - this.recall] : '');
    else return false;
    return true;
  }
  /** Insert ▾: words typed into the line where its caret is. */
  typeIn(words: string) {
    this.put(words);
    this.display?.focus();
  }
  clearTape() {
    this.run(clearTape);
  }

  /* ---------- the bar ---------- */

  mode(m: Mode) {
    this.rows.release();
    this.run((v) => setMode(v, m));
    this.setEntry('');
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
    return html`<ol class="calc-tape" tabindex="-1" aria-label=${t('Tape')}>
      ${v.lines.map((l, i) => {
        const n = i + 1;
        const colour = graph ? exprs.indexOf(l) : -1;
        const ranged = this.rows.has(i);
        const note = !graph && isNote(l, texts[i]);
        return html`<li class="calc-row ${note ? 'calc-note' : ''} ${ranged ? 'ranged' : ''} ${this.rows.drag?.id === i ? 'dragging' : ''}">
          <button type="button" class="calc-grip to-rows-handle" aria-pressed=${String(ranged)} aria-label=${t('Choose line {n}: drag it to move it', { n })} title=${t('Drag to move; tap to choose')}>${icon(GripVertical, 16)}</button>
          ${graph && colour >= 0 ? html`<span class="calc-swatch" style=${`--c:${SERIES[colour % SERIES.length]}`} aria-hidden="true"></span>` : nothing}
          <input class="calc-line" aria-label=${t('Line {n}', { n })} .value=${l} autocomplete="off" autocapitalize="off" spellcheck="false" enterkeyhint="done"
            @focus=${(e: Event) => this.settled.delete(e.target as HTMLInputElement)} @change=${(e: Event) => this.onLineChange(e, i)} @keydown=${(e: KeyboardEvent) => this.onLineKey(e, i)} @paste=${(e: ClipboardEvent) => this.onBoxPaste(e, i)} />
          ${graph || note ? nothing : html`<button type="button" class="calc-ans" aria-label=${texts[i] ? t('Put {answer} in the line', { answer: texts[i] }) : t('No answer')} ?disabled=${!texts[i]} @mousedown=${keep} @click=${() => this.put(texts[i].replace(/−/g, '-'))}>= ${texts[i] || '?'}</button>`}
          ${tool({ label: t('Take away line {n}', { n }), icon: UI.close, cls: 'calc-drop', does: () => this.run((w) => removeLine(w, i)) })}
        </li>`;
      })}
    </ol>`;
  }

  render() {
    const v = this.view;
    const graph = v.mode === 'graph';
    const answer = live(this.entry, v.lines, v.mode);
    const own = (id: string) => COMMANDS.find((c) => c.id === `calc.${id}`)!;
    return html`<to-bar class="calc-bar">
        ${cmdTool(own('calc'), this, { keep: false })} ${cmdTool(own('graph'), this, { keep: false })}
        <to-insert .items=${drawnIn(COMMANDS, 'menu:insert', this)}></to-insert>
        ${cmdTool(own('clear'), this, { keep: false })}
        ${this.undoTools()}
      </to-bar>
      <div class="calc ${graph ? 'calc-graphing' : ''}">
        ${graph ? html`<figure class="calc-graph">${unsafeSVG(pageSvg(graphPage(v.lines), 'class="calc-plot"'))}</figure>` : nothing}
        <div class="calc-paper">${this.tapeRows(v)}</div>
        <div class="calc-pad">
          <div class="calc-entry">
            <input class="calc-display" aria-label=${graph ? t('y =') : t('Sum')} placeholder=${graph ? t('y = …') : t('Type or tap')} autocomplete="off" autocapitalize="off" spellcheck="false" enterkeyhint="done"
              .value=${this.entry} @input=${(e: Event) => this.setEntry((e.target as HTMLInputElement).value)} @keydown=${this.onKey} @paste=${(e: ClipboardEvent) => this.onBoxPaste(e, null)} />
            <output class="calc-live" aria-live="polite">${answer ? (graph ? t('at x = 1: {answer}', { answer }) : `= ${answer}`) : ''}</output>
          </div>
          ${this.keys()}
        </div>
      </div>
      ${this.rows.renderContext()}`;
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
