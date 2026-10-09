/**
 * Todo's document, read and edited (docs/kernel.md §3). A task is a list item: ticked or not, a star as the
 * class `.star`, a due date as `due=2027-03-01`, its words rich text:
 *
 *   - [ ] Renew **passport** {.star due=2027-03-01}
 *   - [x] Book the venue
 *
 * `readTodo` is the view, a pure function of the document; every command gives operations (`Op[]`) for the
 * editor to apply, so undo sees primitives only. Nothing here touches the DOM.
 */
import { hasClass, plainText, type Attrs, type Block, type Doc, type Op, type Run } from '../../doc/index.ts';

export interface Task {
  /** The item's block index in the document. */
  at: number;
  block: Extract<Block, { k: 'li' }>;
  done: boolean;
  star: boolean;
  /** "2027-03-01", or '' for none (or for something that is not a date). */
  due: string;
  runs: Run[];
  /** The words, plain. */
  words: string;
}
export interface TodoView {
  tasks: Task[];
  /** How many are ticked. */
  ticked: number;
}

const DATE = /^(\d{4})-(\d\d)-(\d\d)$/;
/** A date as the document writes it, or '' when it is not one (a day that does not exist included). */
export function dueOf(s: string | undefined): string {
  const m = DATE.exec((s ?? '').trim());
  if (!m) return '';
  const d = new Date(Date.UTC(+m[1], +m[2] - 1, +m[3]));
  return d.getUTCFullYear() === +m[1] && d.getUTCMonth() === +m[2] - 1 && d.getUTCDate() === +m[3] ? m[0] : '';
}
/** Today as the document writes a date, on this device's clock. */
export function today(now = new Date()): string {
  return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-${String(now.getDate()).padStart(2, '0')}`;
}

/** The tasks of a document: its list items, in order; other blocks are left alone. */
export function readTodo(doc: Doc): TodoView {
  const tasks: Task[] = [];
  doc.blocks.forEach((b, at) => {
    if (b.k !== 'li') return;
    tasks.push({ at, block: b, done: !!b.done, star: hasClass(b, 'star'), due: dueOf(b.a?.kv?.due), runs: b.runs, words: plainText(b.runs).replace(/\n/g, ' ') });
  });
  return { tasks, ticked: tasks.filter((t) => t.done).length };
}

/** Attributes with the star and the due date set as asked, every other class and key kept; none left, none written. */
function attrsWith(a: Attrs | undefined, star: boolean, due: string): Attrs | undefined {
  const cls = [...(star ? ['star'] : []), ...(a?.cls ?? []).filter((c) => c !== 'star')];
  const kv = { ...a?.kv };
  if (due) kv.due = due;
  else delete kv.due;
  const out: Attrs = { ...(a?.id ? { id: a.id } : {}), ...(cls.length ? { cls } : {}), ...(Object.keys(kv).length ? { kv } : {}) };
  return Object.keys(out).length ? out : undefined;
}
const replace = (t: Task, b: Block): Op[] => [{ op: 'splice', at: t.at, n: 1, blocks: [b] }];
const without = (b: Task['block'], a: Attrs | undefined): Task['block'] => {
  const { a: _, ...rest } = b;
  return a ? { ...rest, a } : rest;
};

/** Tick or untick. */
export const setDone = (t: Task, done: boolean): Op[] => (t.done === done ? [] : replace(t, { ...t.block, done }));
/** Star or unstar. */
export const setStar = (t: Task, star: boolean): Op[] => (t.star === star ? [] : replace(t, without(t.block, attrsWith(t.block.a, star, t.due))));
/** A due date, or '' for none. */
export const setDue = (t: Task, due: string): Op[] => {
  const next = dueOf(due);
  return next === t.due ? [] : replace(t, without(t.block, attrsWith(t.block.a, t.star, next)));
};
/** An empty task put in right after block `at` (a task's, or -1 for the very start). */
export const addAfter = (at: number): Op[] => [{ op: 'splice', at: at + 1, n: 0, blocks: [{ k: 'li', depth: 0, done: false, runs: [] }] }];
/** A task taken out. */
export const removeTask = (t: Task): Op[] => [{ op: 'splice', at: t.at, n: 1, blocks: [] }];
/** Every ticked task taken out, last first so each index holds. */
export const clearDone = (v: TodoView): Op[] => v.tasks.filter((t) => t.done).reverse().flatMap(removeTask);
/** Task `t` moved past its neighbour `over` (the task before or after it, as shown). */
export function moveOver(t: Task, over: Task): Op[] {
  // `to` counts blocks in the document without the moved one: past a later neighbour is that neighbour's index, before an earlier one is its index too.
  return [{ op: 'move', at: t.at, n: 1, to: over.at }];
}
/** Operations from an editor over one block, moved to where that block is in the document. */
export function shifted(ops: Op[], by: number): Op[] {
  return ops.map((o) => (o.op === 'head' ? o : o.op === 'move' ? { ...o, at: o.at + by, to: o.to + by } : { ...o, at: o.at + by }));
}
