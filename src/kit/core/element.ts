/**
 * DocElement: what every app's editor extends (docs/kernel.md §3). The shell hands it the document's text
 * as `value`; it parses once, keeps the kernel's Doc, and draws a view of it (`read`, pure). Every edit is
 * a list of the kernel's operations through `edit()`: applied, re-read, written back as text in a
 * "docchange" event. Undo is an op log (§8, decision 2): each entry holds the ops and their inverses, a
 * burst of typing into one place within 700 ms is one entry, and the shell's "docundo"/"docredo" events
 * are answered here. An edit may carry a `mark` (the host's selection, whatever shape it has), handed back
 * with the entry to `undone()` so the selection comes back with the change; `firstAt()` says where the
 * change begins when there is no mark. `undoTools()` is the bar's last two buttons, the same in every app.
 * `focusFirst()` is where a person starts (docs/editing.md §1): the shell calls it once a document is first
 * drawn, and each app puts the focus in its own place with its own helper, never scrolling the page.
 *
 * For a page that shares editing (docs/kernel.md §12, docs/library.md) every change is also told as its operations, in
 * a "docops" event before the "docchange", and `applyRemote()` takes another's operations in: applied with no step
 * of the history and nothing told, the history carried over them by the kernel's transform, so an undo here takes
 * back only what was done here.
 */
import { LitElement, type PropertyDeclarations, type PropertyValues } from 'lit';
import { applyAll, invertAll, parse, transform, write, type Doc, type Op } from '../../doc/index.ts';
import { cmdTool } from '../ui/bar.ts';
import { REDO, UNDO } from './keys.ts';

/** A change, as the shell and a host hear it: the text in `detail`, and the edit's burst key (none for an undo, a redo or an edit that stands alone), so a host that holds this editor inside it (the Animator holds the Drawing Tool) keeps the same bursts in its own log. */
export type DocChange = CustomEvent<string> & { key?: string };

/**
 * A change as a page that shares editing hears it: the operations applied (an edit's own, an undo's inverse), and
 * `base`, how many this element had applied before them since it was given its value, which a page maps to its own
 * version. Fired on the element alone, never bubbling: an editor held inside another (the Animator's Drawing Tool, a
 * dialog's) says nothing of the document around it.
 */
export type DocOps = CustomEvent<{ ops: Op[]; base: number }>;

export interface Entry {
  ops: Op[];
  inverse: Op[];
  /** What the edit was, for coalescing ("cell:2:3"); undefined edits stand alone. */
  key?: string;
  at: number;
  /** The host's own note of where the selection was when the edit began (a burst keeps its first). */
  mark?: unknown;
}

/** The lowest block index an entry's ops touch (a move's either end); -1 when they touch only the head. */
export function firstAt(entry: Pick<Entry, 'ops'>): number {
  let low = Infinity;
  for (const op of entry.ops) {
    if (op.op === 'head') continue;
    low = Math.min(low, op.at, op.op === 'move' ? op.to : Infinity);
  }
  return low === Infinity ? -1 : low;
}

const BURST = 700;

/**
 * Ops made one after another on a document (an entry's), and others made on the same document (another's): each of
 * the first as it applies after the others, as the kernel's `rebase` gives it, and the others as they apply after the
 * first, to be carried on past the entry below. Throws the kernel's Conflict where two spans cross.
 */
function cross(mine: Op[], theirs: Op[]): [Op[], Op[]] {
  const passed: Op[] = [];
  for (const op of theirs) {
    let t: Op | null = op;
    const next: Op[] = [];
    for (const p of mine) {
      if (!t) {
        next.push(p);
        continue;
      }
      const moved = transform(p, t, 'right');
      t = transform(t, p, 'left');
      if (moved) next.push(moved);
    }
    mine = next;
    if (t) passed.push(t);
  }
  return [mine, passed];
}

export abstract class DocElement<V> extends LitElement {
  static properties: PropertyDeclarations = { value: {} };
  declare value: string;
  /** The document as the kernel reads it (public: an app's commands read it, kit/core/commands.ts). */
  doc: Doc = { head: {}, blocks: [] };
  view!: V;
  /** The text as last read or written: a `value` that is this text is ours, not a new document. */
  private seen: string | null = null;
  private undo: Entry[] = [];
  private redo: Entry[] = [];
  /** How many ops this element has applied since it was given its value: a "docops" event's `base`. */
  private applied = 0;
  /** Entries carried over another's ops: the side not carried (an undo's ops, a redo's inverse) is worked out again when it is wanted. */
  private carried = new WeakSet<Entry>();

  constructor() {
    super();
    this.value = '';
  }
  createRenderRoot() {
    return this;
  }
  connectedCallback() {
    super.connectedCallback();
    this.addEventListener('docundo', this.onUndo);
    this.addEventListener('docredo', this.onRedo);
  }
  disconnectedCallback() {
    super.disconnectedCallback();
    this.removeEventListener('docundo', this.onUndo);
    this.removeEventListener('docredo', this.onRedo);
  }

  /** The pure function from the document to what the app draws. */
  protected abstract read(doc: Doc): V;
  /** The focus where a person starts in this document (the first words, A1, the canvas): the shell calls it after the first draw. */
  focusFirst(): void | Promise<void> {}
  /** After an undo or a redo: a chance to move the selection to what changed. */
  protected undone(_entry: Entry, _redo: boolean): void {}
  /** After another's ops (`applyRemote`): a chance to carry the selection over them. It is held within the document as drawn in any case. */
  protected followed(_ops: Op[]): void {}
  /** An entry's mark carried in place over another's ops: what was before the edit over `before`, what was after it over `after`. */
  protected carryMark(_mark: unknown, _before: Op[], _after: Op[]): void {}

  /**
   * Whether `text` is this editor's own, the text it last read or wrote: the shell's echo of a change, which a host
   * compares by identity and never parses again (a keystroke costs what it changed, not the whole document).
   */
  protected ours(text: string): boolean {
    return text === this.seen;
  }

  /**
   * Whether what the bar shows of the selection, as one key (the box, the block's kind, the marks at the caret), has
   * changed since a host last asked. A <to-text> says where its selection is after every draw; a host draws again for
   * that only when its bar would show something else, so a letter typed draws the words and not the bar twice.
   */
  protected selectionMoved(key: string): boolean {
    if (key === this.barSel) return false;
    this.barSel = key;
    return true;
  }
  private barSel = '';

  protected willUpdate(changed: PropertyValues) {
    super.willUpdate(changed);
    if (this.seen === null || (changed.has('value') && this.value !== this.seen)) {
      // A new document from the shell: read afresh, and the history starts over.
      this.doc = parse(this.value);
      this.view = this.read(this.doc);
      this.seen = this.value;
      this.undo = [];
      this.redo = [];
      this.applied = 0;
    }
  }

  /** The document with these operations applied; the shell is told. `key` names a burst of typing that undoes as one; `mark` is handed back to `undone()`. */
  edit(ops: Op[], key?: string, mark?: unknown) {
    if (!ops.length) return;
    const inverse = invertAll(this.doc, ops);
    this.doc = applyAll(this.doc, ops);
    const now = Date.now();
    const last = this.undo[this.undo.length - 1];
    if (key && last && last.key === key && now - last.at < BURST) {
      last.ops = [...last.ops, ...ops];
      last.inverse = [...inverse, ...last.inverse];
      last.at = now;
    } else this.undo.push({ ops, inverse, key, at: now, ...(mark === undefined ? {} : { mark }) });
    if (this.undo.length > 500) this.undo.shift();
    this.redo = [];
    this.emit(ops, key);
  }
  /** Ops the editor makes of a document as it arrives (a deck written loosely, loosened): applied and told as an edit is, with no step in the history, since nobody did anything. */
  protected arrive(ops: Op[]) {
    if (!ops.length) return;
    this.doc = applyAll(this.doc, ops);
    this.emit(ops);
  }
  /**
   * Another's ops (a page's shared document: docs/kernel.md §12), made on the document as it is here: applied, the view
   * drawn again, with no step of the history and nothing told (the page knows). The history is carried over them, each
   * entry as the kernel's rebase gives it, so an undo takes back only what was done here; where they cross an entry
   * (the kernel's Conflict) the history is let go. Ops that do not apply throw, and nothing changes.
   */
  applyRemote(ops: Op[]) {
    if (!ops.length) return;
    this.doc = applyAll(this.doc, ops);
    this.applied += ops.length;
    try {
      this.carryStack(this.undo, 'inverse', ops);
      this.carryStack(this.redo, 'ops', ops);
    } catch {
      this.undo = [];
      this.redo = [];
    }
    this.rewrite();
    this.followed(ops);
  }
  /**
   * A stack's entries carried over another's ops, the top first: each entry's `side` applies to the document as the
   * entries above it leave it, and the ops passed on apply where it has. Its mark goes with it (`carryMark`).
   */
  private carryStack(stack: Entry[], side: 'inverse' | 'ops', ops: Op[]) {
    let theirs = ops;
    for (let i = stack.length - 1; i >= 0 && theirs.length; i--) {
      const e = stack[i];
      const [mine, passed] = cross(e[side], theirs);
      // An undo's inverse applies after the edit and its ops before; a redo's the other way about.
      if (e.mark !== undefined) {
        if (side === 'inverse') this.carryMark(e.mark, passed, theirs);
        else this.carryMark(e.mark, theirs, passed);
      }
      e[side] = mine;
      this.carried.add(e);
      theirs = passed;
    }
  }
  /** The view read again and the text written out. */
  private rewrite(): string {
    this.view = this.read(this.doc);
    const text = write(this.doc);
    this.seen = text;
    this.value = text;
    this.requestUpdate();
    return text;
  }
  /** The view read again and the text written out; a page hears of the ops, and the shell of the change. */
  private emit(ops: Op[], key?: string) {
    const text = this.rewrite();
    const base = this.applied;
    this.applied += ops.length;
    if (ops.length) this.dispatchEvent(new CustomEvent('docops', { detail: { ops, base } }) as DocOps);
    const change = new CustomEvent<string>('docchange', { detail: text, bubbles: true }) as DocChange;
    change.key = key;
    this.dispatchEvent(change);
  }
  private onUndo = (e: Event) => {
    const entry = this.undo.pop();
    if (!entry) return;
    e.preventDefault();
    if (this.carried.delete(entry)) entry.ops = invertAll(this.doc, entry.inverse);
    this.doc = applyAll(this.doc, entry.inverse);
    this.redo.push(entry);
    this.emit(entry.inverse);
    this.undone(entry, false);
  };
  private onRedo = (e: Event) => {
    const entry = this.redo.pop();
    if (!entry) return;
    e.preventDefault();
    if (this.carried.delete(entry)) entry.inverse = invertAll(this.doc, entry.ops);
    this.doc = applyAll(this.doc, entry.ops);
    this.undo.push(entry);
    this.emit(entry.ops);
    this.undone(entry, true);
  };
  get canUndo(): boolean {
    return this.undo.length > 0;
  }
  get canRedo(): boolean {
    return this.redo.length > 0;
  }
  /** Undo and Redo, the last two tools of every app's bar (the page's commands, kit/core/keys.ts): they never take the focus, are off with nothing to do, and under a finger are pinned at the bar's end, always on screen (bar.ts, responsive.css). */
  protected undoTools(): unknown[] {
    const here = { editor: this };
    return [cmdTool(UNDO, here, { disabled: !this.canUndo }), cmdTool(REDO, here, { disabled: !this.canRedo })];
  }
}
