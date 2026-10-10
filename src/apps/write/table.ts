/**
 * <to-write-table>: a table block inside a text, as a small grid of <input>s over the sheet's view of it
 * (model.ts tableView): the names over the columns, the values worked out in place, the cell being typed
 * in showing its raw formula, a locked cell left be, and one blank row under the last to type the next
 * line into. It keeps a grid's ways (docs/editing.md §4): the arrows go from cell to cell (sideways from
 * either end of the words), Enter commits and goes down and Shift+Enter up, Escape puts back what the cell
 * held (and, pressed again, steps out to the table in hand), Mod+Enter goes back to the words; Shift+arrows,
 * Shift+click and a drag stretch a range, which Delete clears and the clipboard carries as tab-separated
 * text with our table HTML; the handle at its corner fills; a tap on a cell while a formula wants a value
 * puts in its reference. A column's head and a row's number choose the column or the row and open what can
 * be done to it (what the column holds, the Spreadsheet's types from the kit's columns.ts, Money asking its currency; put one in,
 * take it out, name it: its name typed where it is shown, in the head; an Option column's cells offer the words it holds), the + puts a column in at the end; a row is never added
 * by a key alone. The handle in the corner takes the table itself in hand (moved, copied, taken out).
 *
 * Every change is an event the host turns into ops: wt-cell (r, c, raw), wt-do (a command, and the cell to
 * focus after it; the host calls preventDefault), wt-exit (back to the words). A host that does not take
 * commands (`commands` unset) gets the grid without the heads' menus, and a range written cell by cell.
 */
import { LitElement, html, nothing } from 'lit';
import { ArrowDown, ArrowLeft, ArrowRight, ArrowUp, GripVertical, Pencil, Trash2 } from 'lucide';
import { COL_NAMES, MAX_COLS, clearCells, copyCells, fillCells, formatCell, isLocked, pasteCells, rangeOf, rcToRef, type Cells, type ColType, type Column, type Range } from '../../doc/index.ts';
import { docToHtml, htmlToBlocks } from '../../kit/clipboard.ts';
import { choicesOf, kindItems } from '../../kit/columns.ts';
import { icon, UI } from '../../kit/icons.ts';
import { t } from '../../kit/i18n.ts';
import type { MenuItem, ToMenu } from '../../kit/menu.ts';
import type { SheetView } from '../sheet/model.ts';
import { currencyAt, isLetterName } from '../sheet/model.ts';
import '../../kit/menu.ts';

export const TABLE_TAG = 'to-write-table';

/** What the grid asks its host to do; `focus` is the cell to be in afterwards (and `end` the range's far corner). */
export type TableCmd = ({ cmd: 'put'; cells: Cells } | { cmd: 'rowsIn'; r: number; n: number } | { cmd: 'rowsOut'; r0: number; r1: number } | { cmd: 'colIn'; c: number } | { cmd: 'colOut'; c: number } | { cmd: 'rename'; c: number; name: string } | { cmd: 'type'; c: number; type: ColType; currency?: string }) & { focus?: [number, number]; end?: [number, number] | null };

/** A reference fits wherever the formula is waiting for a value. */
const WANTS_REF = /[=+\-*/^(,:]\s*$/;
const ARROWS: Record<string, [number, number]> = { ArrowUp: [-1, 0], ArrowDown: [1, 0], ArrowLeft: [0, -1], ArrowRight: [0, 1] };
const clamp = (n: number, lo: number, hi: number) => Math.max(lo, Math.min(hi, n));
let tables = 0;

/** Follow a pointer that `el` has captured: `move` as it goes, then `done` once it lifts. */
function follow(el: HTMLElement, move: (e: PointerEvent) => void, done = () => {}) {
  const up = () => {
    el.removeEventListener('pointermove', move);
    el.removeEventListener('pointerup', up);
    el.removeEventListener('pointercancel', up);
    done();
  };
  el.addEventListener('pointermove', move);
  el.addEventListener('pointerup', up);
  el.addEventListener('pointercancel', up);
}

export class ToWriteTable extends LitElement {
  static properties = { view: { attribute: false }, commands: { type: Boolean }, focused: { state: true }, end: { state: true }, fillTo: { state: true }, menuRow: { state: true }, menuCol: { state: true }, naming: { state: true } };
  declare view: SheetView | null;
  /** The host answers wt-do: the heads open menus, the corner holds the table's handle, the + adds a column. */
  declare commands: boolean;
  /** The cell being typed in, if any. */
  declare focused: [number, number] | null;
  /** The far corner of a range; the focused cell is the corner it was started from. */
  declare end: [number, number] | null;
  /** While the fill handle is dragged: the cells it would fill. */
  declare fillTo: Range | null;
  declare menuRow: number;
  declare menuCol: number;
  /** The column whose name is being typed in its head, or -1. */
  declare naming: number;
  /** The cell the range is anchored at (the last focused, kept while a menu has the focus). */
  private anchor: [number, number] = [0, 0];
  /** What the cell held when it took the focus, for Escape. */
  private orig = '';
  private dragging = false;
  /** Whether the cell had the focus when the pointer went down (a first tap chooses the cell, a second edits it). */
  private hadFocus = false;
  /** What we last put on the clipboard, so pasting it back moves formulas' references. */
  private clip: { text: string; r: number; c: number; cut: boolean } | null = null;
  /** Names this grid's lists of an Option column's words apart from another's. */
  private uid = `wt${++tables}`;

  constructor() {
    super();
    this.view = null;
    this.commands = false;
    this.focused = null;
    this.end = null;
    this.fillTo = null;
    this.menuRow = 0;
    this.menuCol = 0;
    this.naming = -1;
  }
  createRenderRoot() {
    return this;
  }

  /* ---------- where things are ---------- */

  private get cols(): Column[] {
    return this.view?.cols ?? [];
  }
  /** Rows drawn: the table's, and the blank one under them. */
  private get drawn(): number {
    return (this.view?.table.rows.length ?? 0) + 1;
  }
  private raw(r: number, c: number): string {
    return this.view?.table.rows[r]?.[c] ?? '';
  }
  private input(r: number, c: number): HTMLInputElement | null {
    return this.querySelector<HTMLInputElement>(`input[data-r="${r}"][data-c="${c}"]`);
  }
  private onGrid(r: number, c: number): [number, number] {
    return [clamp(r, 0, this.drawn - 1), clamp(c, 0, Math.max(0, this.cols.length - 1))];
  }
  /** The range chosen: one cell unless a far corner has been set. */
  get range(): Range {
    return rangeOf(this.anchor, this.end ?? this.anchor);
  }
  /** Whether more than one cell is chosen. */
  get many(): boolean {
    return !!this.end && (this.end[0] !== this.anchor[0] || this.end[1] !== this.anchor[1]);
  }
  private cellAt(x: number, y: number): [number, number] | null {
    const td = (document.elementFromPoint(x, y) as HTMLElement | null)?.closest<HTMLElement>('td[data-r]');
    return td && this.contains(td) ? [Number(td.dataset.r), Number(td.dataset.c)] : null;
  }
  private do(cmd: TableCmd) {
    const ev = new CustomEvent<TableCmd>('wt-do', { detail: cmd, bubbles: true, cancelable: true });
    this.dispatchEvent(ev);
    // A host that takes no commands still gets a range written: a cell at a time.
    if (!ev.defaultPrevented && cmd.cmd === 'put') cmd.cells.values.forEach((row, i) => row.forEach((raw, j) => this.raw(cmd.cells.r + i, cmd.cells.c + j) !== raw && this.setCell(cmd.cells.r + i, cmd.cells.c + j, raw)));
  }
  private setCell(r: number, c: number, raw: string) {
    this.dispatchEvent(new CustomEvent<{ r: number; c: number; raw: string }>('wt-cell', { detail: { r, c, raw }, bubbles: true }));
  }

  /* ---------- focus ---------- */

  /** Put the caret in a cell once it is drawn, its words chosen (typing replaces them); `end` keeps a range from it. */
  async focusCell(r: number, c: number, end: [number, number] | null = null) {
    await this.updateComplete;
    [r, c] = this.onGrid(r, c);
    const el = this.input(r, c);
    this.anchor = [r, c];
    this.end = end;
    el?.focus({ preventScroll: true });
    el?.select();
  }
  /** The table itself in hand: its card takes the focus (the host shows what can be done to it). */
  private hand() {
    this.closest<HTMLElement>('.tx-card')?.focus({ preventScroll: true });
  }
  private onFocus(r: number, c: number) {
    if (r !== this.anchor[0] || c !== this.anchor[1]) this.end = null;
    this.anchor = [r, c];
    this.focused = [r, c];
    this.orig = this.raw(r, c);
  }

  /* ---------- the pointer ---------- */

  private onCellDown(e: PointerEvent, r: number, c: number) {
    const ed = document.activeElement;
    this.hadFocus = ed === this.input(r, c);
    if (ed instanceof HTMLInputElement && this.contains(ed) && this.focused && this.point(ed, r, c)) return e.preventDefault();
    if (e.shiftKey && this.focused) {
      // Shift+click stretches the range to here; the cell it started from keeps the focus.
      e.preventDefault();
      this.end = [r, c];
      return;
    }
    this.end = null;
    if (e.pointerType !== 'mouse') return;
    this.dragging = true;
    window.addEventListener('pointerup', () => (this.dragging = false), { once: true });
  }
  /** Dragging across cells with the mouse chooses a range. */
  private onCellOver(e: PointerEvent, r: number, c: number) {
    if (!this.dragging || e.buttons !== 1) return;
    if (r === this.anchor[0] && c === this.anchor[1] && !this.end) return;
    this.end = [r, c];
    getSelection()?.removeAllRanges();
  }
  /** A first tap on a cell chooses it whole, so typing replaces it; a tap on the cell being typed in puts the caret there. */
  private onCellClick(r: number, c: number) {
    if (this.hadFocus || this.many) return;
    this.input(r, c)?.select();
  }

  /** While a formula is typed and waits for a value, a cell tapped puts its reference in at the caret. */
  private point(ed: HTMLInputElement, r: number, c: number): boolean {
    const [sr, sc] = this.focused!;
    const val = ed.value;
    if (!val.startsWith('=') || (r === sr && c === sc)) return false;
    const start = ed.selectionStart ?? val.length;
    const end = ed.selectionEnd ?? start;
    if (!WANTS_REF.test(val.slice(0, start))) return false;
    const ref = rcToRef(r, c);
    const next = val.slice(0, start) + ref + val.slice(end);
    ed.value = next;
    ed.setSelectionRange(start + ref.length, start + ref.length);
    this.setCell(sr, sc, next);
    return true;
  }

  private onFillDown = (e: PointerEvent) => {
    e.preventDefault();
    e.stopPropagation();
    const handle = e.currentTarget as HTMLElement;
    const src = this.range;
    try {
      handle.setPointerCapture(e.pointerId);
    } catch {
      /* the pointer has already gone; the listeners below still see what follows */
    }
    const move = (ev: PointerEvent) => {
      const at = this.cellAt(ev.clientX, ev.clientY);
      if (!at) return;
      // A fill goes one way: whichever of down/up or across the pointer has gone furthest.
      const dr = at[0] > src.r1 ? at[0] - src.r1 : at[0] < src.r0 ? at[0] - src.r0 : 0;
      const dc = at[1] > src.c1 ? at[1] - src.c1 : at[1] < src.c0 ? at[1] - src.c0 : 0;
      this.fillTo = !dr && !dc ? null : Math.abs(dr) >= Math.abs(dc) ? { ...src, r0: Math.min(src.r0, at[0]), r1: Math.max(src.r1, at[0]) } : { ...src, c0: Math.min(src.c0, at[1]), c1: Math.max(src.c1, at[1]) };
    };
    follow(handle, move, () => {
      const dest = this.fillTo;
      this.fillTo = null;
      if (!dest || !this.view) return;
      this.do({ cmd: 'put', cells: fillCells(this.view.table, src, dest), focus: [dest.r0, dest.c0], end: [dest.r1, dest.c1] });
    });
  };

  /* ---------- the clipboard ---------- */

  private onCopy = (e: ClipboardEvent) => {
    const input = e.target as HTMLInputElement;
    if (!(input instanceof HTMLInputElement) || !this.view) return;
    const some = input.selectionStart !== input.selectionEnd && !(input.selectionStart === 0 && input.selectionEnd === input.value.length);
    // Some of a cell's words, picked out, are ordinary words; otherwise it is the cell (or the range) that is copied.
    if (!this.many && some) return;
    const g = this.range;
    const text = copyCells(this.view.table, g);
    const cols = this.cols.slice(g.c0, g.c1 + 1);
    const rows = Array.from({ length: g.r1 - g.r0 + 1 }, (_, i) => cols.map((_, j) => this.raw(g.r0 + i, g.c0 + j)));
    e.clipboardData?.setData('text/plain', text);
    e.clipboardData?.setData('text/html', docToHtml([{ k: 'table', cols, rows }]));
    e.preventDefault();
    this.clip = { text, r: g.r0, c: g.c0, cut: e.type === 'cut' };
    if (e.type === 'cut') this.do({ cmd: 'put', cells: clearCells(g), focus: this.anchor, end: this.end });
  };
  /** Tab-separated text, or a table in HTML (ours or anyone's) when the text is not that. */
  private pastedText(dt: DataTransfer): string {
    const text = dt.getData('text/plain').replace(/\r\n?/g, '\n');
    if (/[\t\n]/.test(text.replace(/\n$/, ''))) return text;
    const htm = dt.getData('text/html');
    if (!/<table/i.test(htm)) return text;
    const table = htmlToBlocks(htm).find((b) => b.k === 'table');
    if (table?.k !== 'table') return text;
    const head = table.cols.map((c) => c.name);
    const named = head.some((n) => n && !isLetterName(n));
    return [...(named ? [head] : []), ...table.rows].map((row) => row.join('\t')).join('\n');
  }
  private onPaste = (e: ClipboardEvent) => {
    const dt = e.clipboardData;
    if (!dt || !this.view) return;
    const text = this.pastedText(dt);
    const ours = this.clip && this.clip.text === text.replace(/\n$/, '') ? this.clip : null;
    const block = /[\t\n]/.test(text.replace(/\n$/, ''));
    // One value into one cell being typed in: the browser pastes the words.
    if (!block && !ours && !this.many) return;
    e.preventDefault();
    const g = this.range;
    // A copy moves its formulas' references by how far it travelled; a cut keeps them as they were.
    const moved = ours && !ours.cut ? { dr: g.r0 - ours.r, dc: g.c0 - ours.c } : undefined;
    // A block wider than the table widens it, up to the last letter.
    const widest = Math.max(...text.replace(/\n$/, '').split('\n').map((line) => line.split('\t').length));
    const cols = [...this.cols];
    while (block && cols.length < Math.min(MAX_COLS, g.c0 + widest)) cols.push({ name: `Col${COL_NAMES[cols.length]}`, type: 'text' });
    const done = pasteCells({ cols }, g.r0, g.c0, text, moved, this.many ? g : undefined);
    this.do({ cmd: 'put', cells: done, focus: [done.range.r0, done.range.c0], end: [done.range.r1, done.range.c1] });
  };

  /* ---------- keys ---------- */

  private onKey(e: KeyboardEvent, r: number, c: number) {
    if (e.isComposing) return;
    const input = e.target as HTMLInputElement;
    const mod = e.metaKey || e.ctrlKey;
    const atStart = input.selectionStart === 0 && input.selectionEnd === 0;
    const atEnd = input.selectionStart === input.value.length && input.selectionEnd === input.value.length;
    const all = input.selectionStart === 0 && input.selectionEnd === input.value.length;
    const arrow = ARROWS[e.key];
    if (e.shiftKey && !mod && !e.altKey && arrow && (arrow[0] !== 0 || all || this.many)) {
      // Shift+arrows stretch the range (sideways only when no words inside the cell are being chosen).
      e.preventDefault();
      const [fr, fc] = this.end ?? this.anchor;
      this.end = this.onGrid(fr + arrow[0], fc + arrow[1]);
      return;
    }
    if (this.many && (e.key === 'Delete' || e.key === 'Backspace') && !mod) {
      e.preventDefault();
      return this.do({ cmd: 'put', cells: clearCells(this.range), focus: this.anchor, end: this.end });
    }
    if (e.key === 'Escape') {
      // One step a press: the range let go; else what the cell held put back; else the table itself in hand.
      e.preventDefault();
      e.stopPropagation();
      if (this.many) return void (this.end = null);
      if (input.value !== this.orig && this.raw(r, c) !== this.orig) {
        this.setCell(r, c, this.orig);
        input.value = this.orig;
        input.select();
        return;
      }
      return this.hand();
    }
    if (e.key === 'Enter') {
      e.preventDefault();
      // Mod+Enter: done with the table, back to the words after it. Enter goes down, Shift+Enter up; never a row put in.
      if (mod) return void this.dispatchEvent(new CustomEvent('wt-exit', { bubbles: true }));
      return void this.focusCell(e.shiftKey ? r - 1 : r + 1, c);
    }
    if (e.key === 'F2') {
      e.preventDefault();
      input.setSelectionRange(input.value.length, input.value.length);
      return;
    }
    if (mod || e.altKey || e.shiftKey) return;
    let move: [number, number] | null = null;
    if (e.key === 'ArrowDown') move = [r + 1, c];
    else if (e.key === 'ArrowUp') move = [r - 1, c];
    else if (e.key === 'ArrowLeft' && atStart && c > 0) move = [r, c - 1];
    else if (e.key === 'ArrowRight' && atEnd && c < this.cols.length - 1) move = [r, c + 1];
    if (move) {
      e.preventDefault();
      void this.focusCell(...move);
    }
  }

  /* ---------- the menus of a row and a column ---------- */

  /** The rows a row command works on: the chosen ones, when they take in row r; else r alone. */
  private rowsFor(r: number): [number, number] {
    const g = this.range;
    return this.many && r >= g.r0 && r <= g.r1 ? [g.r0, g.r1] : [r, r];
  }
  private async openRowMenu(r: number, from: HTMLElement) {
    const [r0, r1] = this.rowsFor(r);
    // The row is chosen (its first cell has the focus), and what can be done to it opens beside its number.
    if (r0 === r1) await this.focusCell(r, 0, [r, this.cols.length - 1]);
    this.menuRow = r;
    await this.updateComplete;
    const menu = this.querySelector<ToMenu>('to-menu.wt-rowmenu')!;
    await menu.updateComplete;
    menu.openAt(from);
  }
  private rowItems(): MenuItem[] {
    const [r0, r1] = this.rowsFor(this.menuRow);
    const n = r1 - r0 + 1;
    const held = this.view?.table.rows.length ?? 0;
    const which = n === 1 ? t('row {n}', { n: r0 + 1 }) : t('rows {a}–{b}', { a: r0 + 1, b: r1 + 1 });
    const c = this.anchor[1];
    return [
      { label: t('Insert {n|a row|# rows} above', { n }), icon: ArrowUp, disabled: r0 >= held, does: () => this.do({ cmd: 'rowsIn', r: r0, n, focus: [r0, c] }) },
      { label: t('Insert {n|a row|# rows} below', { n }), icon: ArrowDown, disabled: r1 >= held - 1, does: () => this.do({ cmd: 'rowsIn', r: r1 + 1, n, focus: [r1 + 1, c] }) },
      { label: t('Delete {which}', { which }), icon: Trash2, disabled: r0 >= held, does: () => this.do({ cmd: 'rowsOut', r0, r1, focus: [r0, c] }) },
    ];
  }
  private async openColMenu(c: number, from: HTMLElement) {
    const last = Math.max(0, this.drawn - 2);
    await this.focusCell(0, c, [last, c]);
    this.menuCol = c;
    await this.updateComplete;
    const menu = this.querySelector<ToMenu>('to-menu.wt-colmenu')!;
    await menu.updateComplete;
    menu.openAt(from);
  }
  private colItems(): MenuItem[] {
    const c = this.menuCol;
    const n = this.cols.length;
    const r = this.anchor[0];
    const cols = t('Columns');
    return [
      ...kindItems(this.cols[c], t('Column {c} holds', { c: COL_NAMES[c] ?? '' }), (type, currency) => this.do({ cmd: 'type', c, type, currency, focus: [r, c] })),
      { group: cols, label: t('Name this column'), icon: Pencil, does: () => this.nameColumn(c) },
      { group: cols, label: t('Add a column before'), icon: ArrowLeft, disabled: n >= MAX_COLS, does: () => this.do({ cmd: 'colIn', c, focus: [r, c] }) },
      { group: cols, label: t('Add a column after'), icon: ArrowRight, disabled: n >= MAX_COLS, does: () => this.do({ cmd: 'colIn', c: c + 1, focus: [r, c + 1] }) },
      { group: cols, label: t('Remove this column'), icon: Trash2, disabled: n < 2, does: () => this.do({ cmd: 'colOut', c, focus: [r, Math.max(0, c - 1)] }) },
    ];
  }

  /**
   * The column's name typed where it is shown: its head becomes a field, drawn and focused at once, in the menu's
   * own handler (iOS raises its keyboard only so). Enter or a tap elsewhere keeps it; Escape leaves the name be.
   */
  private nameColumn(c: number) {
    this.naming = c;
    this.performUpdate();
    const box = this.querySelector<HTMLInputElement>('input.wt-cn');
    box?.focus({ preventScroll: true });
    box?.select();
  }
  private named(keep: boolean, value: string) {
    const c = this.naming;
    if (c < 0) return;
    this.naming = -1;
    const r = this.anchor[0];
    if (keep) this.do({ cmd: 'rename', c, name: value.replace(/\s+/g, ' ').trim(), focus: [r, c] });
    else void this.focusCell(r, c);
  }

  /* ---------- drawing ---------- */

  render() {
    const v = this.view;
    if (!v) return nothing;
    const cols = v.cols;
    const rows = this.drawn;
    const f = this.focused;
    const g = this.range;
    const many = this.many;
    const fill = this.fillTo;
    const name = (col: Column, c: number) => (isLetterName(col.name) ? COL_NAMES[c] : col.name);
    return html`<table class="wt ${many ? 'selecting' : ''}" aria-label=${t('Table')} @copy=${this.onCopy} @cut=${this.onCopy} @paste=${this.onPaste}>
        <thead>
          <tr>
            ${this.commands ? this.renderHeads(cols) : cols.map((col, c) => html`<th scope="col" class=${isLetterName(col.name) ? 'letter' : ''}>${name(col, c)}</th>`)}
          </tr>
        </thead>
        <tbody>
          ${Array.from({ length: rows }, (_, r) => {
            return html`<tr>
              ${this.commands ? html`<th scope="row" class="wt-row"><button type="button" class="wt-num" aria-haspopup="menu" aria-expanded="false" aria-label=${t('Row {n}: insert or delete rows', { n: r + 1 })} @click=${(e: Event) => void this.openRowMenu(r, e.currentTarget as HTMLElement)}>${r + 1}</button></th>` : nothing}
              ${cols.map((col, c) => {
                const raw = v.table.rows[r]?.[c] ?? '';
                const val = v.values[r]?.[c] ?? null;
                const here = !!f && f[0] === r && f[1] === c;
                const locked = isLocked(v.table.lock, r, c);
                const num = typeof val === 'number' && col.type !== 'check';
                const inRange = many && r >= g.r0 && r <= g.r1 && c >= g.c0 && c <= g.c1;
                const inFill = !!fill && r >= fill.r0 && r <= fill.r1 && c >= fill.c0 && c <= fill.c1;
                return html`<td data-r=${r} data-c=${c} class="${inRange ? 'in' : ''} ${inFill ? 'filling' : ''}" @pointerdown=${(e: PointerEvent) => this.onCellDown(e, r, c)} @pointerover=${(e: PointerEvent) => this.onCellOver(e, r, c)} @click=${() => this.onCellClick(r, c)}>
                  <input
                    data-r=${r}
                    data-c=${c}
                    class="${num ? 'num' : ''} ${locked ? 'locked' : ''} ${typeof val === 'string' && val.startsWith('#') ? 'err' : ''}"
                    aria-label=${rcToRef(r, c)}
                    list=${col.type === 'option' ? `${this.uid}-o${c}` : nothing}
                    .value=${here ? raw : formatCell(val, col.type, currencyAt(v, c))}
                    title=${locked ? t('Locked: worked out for you') : raw.startsWith('=') ? raw : nothing}
                    ?readonly=${locked}
                    autocomplete="off"
                    @focus=${() => this.onFocus(r, c)}
                    @blur=${() => (this.focused = null)}
                    @input=${(e: Event) => this.setCell(r, c, (e.target as HTMLInputElement).value)}
                    @keydown=${(e: KeyboardEvent) => this.onKey(e, r, c)}
                  />
                  ${f && r === g.r1 && c === g.c1 ? html`<span class="wt-fill" role="button" aria-label=${t('Fill: drag to carry these cells on')} title=${t('Drag to fill')} @pointerdown=${this.onFillDown}></span>` : nothing}
                </td>`;
              })}
              ${this.commands ? html`<td class="wt-pad"></td>` : nothing}
            </tr>`;
          })}
        </tbody>
      </table>
      ${cols.map((col, c) => (col.type === 'option' ? html`<datalist id="${this.uid}-o${c}">${choicesOf(v.table.rows, c).map((x) => html`<option value=${x}></option>`)}</datalist>` : nothing))}
      ${this.commands
        ? html`<to-menu class="wt-rowmenu" .label=${t('Row {n}', { n: this.menuRow + 1 })} .items=${this.rowItems()}></to-menu>
            <to-menu class="wt-colmenu" .label=${t('Column {c}', { c: COL_NAMES[this.menuCol] ?? '' })} .items=${this.colItems()}></to-menu>`
        : nothing}`;
  }
  /** The heads when the host takes commands: the table's handle, a button for each column, the + for one more. */
  private renderHeads(cols: Column[]) {
    const name = (col: Column, c: number) => (isLetterName(col.name) ? COL_NAMES[c] : col.name);
    return html`<td class="wt-corner">
        <button type="button" class="wt-hand" aria-label=${t('The table: move, copy or take it out')} title=${t('The table: move, copy or take it out')} @click=${() => this.hand()}>${icon(GripVertical, 14)}</button>
      </td>
      ${cols.map(
        (col, c) => html`<th scope="col" class=${isLetterName(col.name) ? 'letter' : ''}>
          ${this.naming === c
            ? html`<input class="wt-cn" aria-label=${t('Name of column {c}', { c: COL_NAMES[c] })} placeholder=${COL_NAMES[c]} .value=${isLetterName(col.name) ? '' : col.name} autocomplete="off" spellcheck="false"
                @keydown=${(e: KeyboardEvent) => {
                  e.stopPropagation();
                  if (e.isComposing || (e.key !== 'Enter' && e.key !== 'Escape')) return;
                  e.preventDefault();
                  this.named(e.key === 'Enter', (e.target as HTMLInputElement).value);
                }}
                @blur=${(e: FocusEvent) => this.named(true, (e.target as HTMLInputElement).value)} />`
            : html`<button type="button" class="wt-col" aria-haspopup="menu" aria-expanded="false" aria-label=${t('Column {c}: what it holds, name it, add or remove a column', { c: name(col, c) })} @click=${(e: Event) => void this.openColMenu(c, e.currentTarget as HTMLElement)}>${name(col, c)}</button>`}
        </th>`,
      )}
      <td class="wt-add">
        <button type="button" class="wt-add-col" aria-label=${t('Add a column')} title=${t('Add a column')} ?disabled=${cols.length >= MAX_COLS} @click=${() => this.do({ cmd: 'colIn', c: cols.length, focus: [this.anchor[0], cols.length] })}>${icon(UI.plus, 14)}</button>
      </td>`;
  }
}
if (!customElements.get(TABLE_TAG)) customElements.define(TABLE_TAG, ToWriteTable);
