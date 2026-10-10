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
 */
import { LitElement, type PropertyDeclarations, type PropertyValues, type TemplateResult } from 'lit';
import { applyAll, invertAll, parse, write, type Doc, type Op } from '../doc/index.ts';
import { tool } from './bar.ts';
import { t } from './i18n.ts';
import { UI } from './icons.ts';
import { onPictures } from './pictures.ts';

/** A change, as the shell and a host hear it: the text in `detail`, and the edit's burst key (none for an undo, a redo or an edit that stands alone), so a host that holds this editor inside it (the Animator holds the Drawing Tool) keeps the same bursts in its own log. */
export type DocChange = CustomEvent<string> & { key?: string };

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

export abstract class DocElement<V> extends LitElement {
  static properties: PropertyDeclarations = { value: {} };
  declare value: string;
  protected doc: Doc = { head: {}, blocks: [] };
  protected view!: V;
  /** The text as last read or written: a `value` that is this text is ours, not a new document. */
  private seen: string | null = null;
  private undo: Entry[] = [];
  private redo: Entry[] = [];

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
    // Pictures from the web shown (or the switch turned): drawn again, as they now are (kit/pictures.ts).
    this.offPictures = onPictures(() => this.requestUpdate());
  }
  disconnectedCallback() {
    super.disconnectedCallback();
    this.removeEventListener('docundo', this.onUndo);
    this.removeEventListener('docredo', this.onRedo);
    this.offPictures();
  }
  private offPictures = () => {};

  /** The pure function from the document to what the app draws. */
  protected abstract read(doc: Doc): V;
  /** The focus where a person starts in this document (the first words, A1, the canvas): the shell calls it after the first draw. */
  focusFirst(): void | Promise<void> {}
  /** After an undo or a redo: a chance to move the selection to what changed. */
  protected undone(_entry: Entry, _redo: boolean): void {}

  /**
   * Whether `text` is this editor's own, the text it last read or wrote: the shell's echo of a change, which a host
   * compares by identity and never parses again (a keystroke costs what it changed, not the whole document).
   */
  protected ours(text: string): boolean {
    return text === this.seen;
  }

  protected willUpdate(changed: PropertyValues) {
    super.willUpdate(changed);
    if (this.seen === null || (changed.has('value') && this.value !== this.seen)) {
      // A new document from the shell: read afresh, and the history starts over.
      this.doc = parse(this.value);
      this.view = this.read(this.doc);
      this.seen = this.value;
      this.undo = [];
      this.redo = [];
    }
  }

  /** The document with these operations applied; the shell is told. `key` names a burst of typing that undoes as one; `mark` is handed back to `undone()`. */
  protected edit(ops: Op[], key?: string, mark?: unknown) {
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
    this.emit(key);
  }
  /** The view read again and the text written out; the shell hears of the change. */
  private emit(key?: string) {
    this.view = this.read(this.doc);
    const text = write(this.doc);
    this.seen = text;
    this.value = text;
    this.requestUpdate();
    const change = new CustomEvent<string>('docchange', { detail: text, bubbles: true }) as DocChange;
    change.key = key;
    this.dispatchEvent(change);
  }
  private onUndo = (e: Event) => {
    const entry = this.undo.pop();
    if (!entry) return;
    e.preventDefault();
    this.doc = applyAll(this.doc, entry.inverse);
    this.redo.push(entry);
    this.emit();
    this.undone(entry, false);
  };
  private onRedo = (e: Event) => {
    const entry = this.redo.pop();
    if (!entry) return;
    e.preventDefault();
    this.doc = applyAll(this.doc, entry.ops);
    this.undo.push(entry);
    this.emit();
    this.undone(entry, true);
  };
  get canUndo(): boolean {
    return this.undo.length > 0;
  }
  get canRedo(): boolean {
    return this.redo.length > 0;
  }
  /** Undo and Redo, the last two tools of every app's bar: they never take the focus, and are off with nothing to do. */
  protected undoTools(): TemplateResult[] {
    const fire = (which: 'docundo' | 'docredo') => () => this.dispatchEvent(new CustomEvent(which, { cancelable: true }));
    return [
      tool({ label: t('Undo'), icon: UI.undo, keys: 'Mod+Z', keep: true, disabled: !this.canUndo, does: fire('docundo') }),
      tool({ label: t('Redo'), icon: UI.redo, keys: 'Mod+Shift+Z', keep: true, disabled: !this.canRedo, does: fire('docredo') }),
    ];
  }
}
