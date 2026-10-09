/**
 * Undo as an op log (docs/kernel.md §8, decision 2). Every change is a list
 * of operations; recorded with the document it was made on, its inverse is
 * worked out by the kernel's `invertAll` and kept beside it, with the
 * selection before and after, so an undo puts the caret back where the
 * change was. Typing is recorded a letter at a time: entries with the same
 * key within 700 ms are folded into one, and a composition lands as one op
 * anyway. The head's fields (the title) are `head` ops like any other.
 */
import { invertAll, type Doc, type Op } from '../doc/index.ts';
import type { Sel } from './textops.ts';

export interface Entry {
  ops: Op[];
  inverse: Op[];
  before: Sel | null;
  after: Sel | null;
  /** Entries with the same key, close in time, fold into one: 'type' for letters typed. */
  key?: string;
  time: number;
}
/** What an undo or a redo asks the host to apply, and where to put the caret. */
export interface Step {
  ops: Op[];
  sel: Sel | null;
}

export class History {
  private past: Entry[] = [];
  private future: Entry[] = [];
  /** The clock, and how long a burst of typing stays one entry. */
  constructor(
    private now: () => number = Date.now,
    public within = 700,
  ) {}

  get canUndo(): boolean {
    return this.past.length > 0;
  }
  get canRedo(): boolean {
    return this.future.length > 0;
  }
  /** How many entries there are to undo. */
  get length(): number {
    return this.past.length;
  }
  clear() {
    this.past = [];
    this.future = [];
  }

  /** A change made on `doc` (the document before it). Anything redoable is gone. */
  record(doc: Doc, ops: Op[], before: Sel | null, after: Sel | null, key?: string) {
    if (!ops.length) return;
    this.future = [];
    const inverse = invertAll(doc, ops);
    const time = this.now();
    const last = this.past[this.past.length - 1];
    if (key && last?.key === key && time - last.time <= this.within) {
      last.ops = [...last.ops, ...ops];
      last.inverse = [...inverse, ...last.inverse];
      last.after = after;
      last.time = time;
      return;
    }
    this.past.push({ ops, inverse, before, after, key, time });
  }
  /** The next undo: its inverse ops, and the selection from before the change. Null with nothing to undo. */
  undo(): Step | null {
    const e = this.past.pop();
    if (!e) return null;
    this.future.push(e);
    delete e.key;
    return { ops: e.inverse, sel: e.before };
  }
  /** The next redo: the change's own ops, and the selection from after it. */
  redo(): Step | null {
    const e = this.future.pop();
    if (!e) return null;
    this.past.push(e);
    return { ops: e.ops, sel: e.after };
  }
}
