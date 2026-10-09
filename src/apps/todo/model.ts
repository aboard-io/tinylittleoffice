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
import { hasClass, isText, normalRuns, parse, plainText, runLength, sliceRuns, type Attrs, type Block, type Doc, type Op, type Run } from '../../doc/index.ts';

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

/** Where the caret goes after a command: a task's block and an offset in its words. */
export interface Landing {
  ops: Op[];
  at: number;
  offset: number;
}
const blank = (): Task['block'] => ({ k: 'li', depth: 0, done: false, runs: [] });

/**
 * Enter in a task's words (docs/editing.md §3): at the start of words, an empty task goes in above and the task is
 * pushed down with the caret; at the end, an empty task after it; in the middle, the words split and the tail is a
 * new open task (no star, no date) with the caret at its start.
 */
export function enterAt(t: Task, offset: number): Landing {
  const len = runLength(t.runs);
  if (offset <= 0 && len > 0) return { ops: [{ op: 'splice', at: t.at, n: 0, blocks: [blank()] }], at: t.at + 1, offset: 0 };
  if (offset >= len) return { ops: addAfter(t.at), at: t.at + 1, offset: 0 };
  // The space where the words part goes with neither half.
  const head = sliceRuns(t.runs, 0, offset);
  const rest = sliceRuns(t.runs, offset, len);
  const last = head[head.length - 1];
  if (last && !last.ic && last.fn === undefined) head[head.length - 1] = { ...last, t: last.t.replace(/\s+$/, '') };
  if (rest[0] && !rest[0].ic && rest[0].fn === undefined) rest[0] = { ...rest[0], t: rest[0].t.replace(/^\s+/, '') };
  const tail: Task['block'] = { ...blank(), runs: normalRuns(rest) };
  return { ops: [{ op: 'splice', at: t.at, n: 1, blocks: [{ ...t.block, runs: normalRuns(head) }, tail] }], at: t.at + 1, offset: 0 };
}
/** Task `from`'s words joined onto the end of task `into` (Backspace at the start of `from`, Delete at the end of `into`); `into` keeps its tick, star and date. The caret at the join. */
export function joinTasks(into: Task, from: Task): Landing {
  const merged: Task['block'] = { ...into.block, runs: normalRuns([...into.runs, ...from.runs]) };
  const ops: Op[] =
    from.at > into.at
      ? [
          { op: 'splice', at: from.at, n: 1, blocks: [] },
          { op: 'splice', at: into.at, n: 1, blocks: [merged] },
        ]
      : [
          { op: 'splice', at: into.at, n: 1, blocks: [merged] },
          { op: 'splice', at: from.at, n: 1, blocks: [] },
        ];
  return { ops, at: from.at > into.at ? into.at : into.at - 1, offset: runLength(into.runs) };
}
/** Several tasks taken out (blocks by index), last first so each index holds. */
export const removeTasks = (ats: number[]): Op[] => [...new Set(ats)].sort((a, b) => b - a).map((at) => ({ op: 'splice', at, n: 1, blocks: [] }));
/**
 * Tasks (in document order) moved together past `over`, the task shown before the first of them (`by` -1) or after
 * the last (1); they land side by side in their order. Says where each lands, in the order given.
 */
export function moveTasks(ts: Task[], over: Task, by: 1 | -1): { ops: Op[]; ats: number[] } {
  if (by < 0) return { ops: ts.map((t, k) => ({ op: 'move', at: t.at, n: 1, to: over.at + k })), ats: ts.map((_, k) => over.at + k) };
  const n = ts.length;
  return { ops: [...ts].reverse().map((t, j) => ({ op: 'move', at: t.at, n: 1, to: over.at - j })), ats: ts.map((_, k) => over.at - n + 1 + k) };
}
/** A block's copy without its id (an id names one block). */
const copyOf = (b: Task['block']): Task['block'] => {
  if (!b.a?.id) return b;
  const { id: _, ...a } = b.a;
  return without(b, Object.keys(a).length ? a : undefined);
};
/** Tasks (in document order) again, right after the last of them; says where the first copy is. */
export function duplicateTasks(ts: Task[]): { ops: Op[]; at: number } {
  const at = ts[ts.length - 1].at + 1;
  return { ops: [{ op: 'splice', at, n: 0, blocks: ts.map((t) => copyOf(t.block)) }], at };
}
/** Blocks as tasks: list items are tasks at the margin (tick, star and date kept; a plain item an open task), words of any other kind become open tasks; what holds no words is left out. */
export function asTasks(blocks: Block[]): Task['block'][] {
  return blocks.flatMap((b): Task['block'][] => {
    if (b.k === 'li') {
      const { ord: _, ...item } = copyOf(b);
      return [{ ...item, depth: 0, done: !!b.done }];
    }
    if (!isText(b) || !plainText(b.runs).trim()) return [];
    return [{ ...blank(), runs: b.runs }];
  });
}
/** Plain text as tasks: a task a line (list markers and "[ ]"/"[x]" read as TLO reads them), blank lines skipped. */
export const textTasks = (text: string): Task['block'][] =>
  asTasks(
    text
      .replace(/\r\n?/g, '\n')
      .split('\n')
      .filter((l) => l.trim())
      .flatMap((l) => parse(l.trim()).blocks),
  );
/** Whether pasted words are tasks rather than words for the task the caret is in: several lines, or one list item. */
export function pastesAsTasks(text: string): boolean {
  const lines = text.replace(/\r\n?/g, '\n').split('\n').filter((l) => l.trim());
  return lines.length > 1 || (lines.length === 1 && /^\s*(?:[-*+]|\d+[.)])\s/.test(lines[0]));
}
/**
 * Pasted tasks put in: in place of some chosen tasks (their blocks, which a filter may leave apart: the paste goes
 * where the first was); after a task (in place of it when it is empty); or, with no target, after the last task.
 * Says where the pasted tasks sit.
 */
export function pasteTasks(v: TodoView, doc: Doc, tasks: Task['block'][], target: number[] | number | null): { ops: Op[]; from: number; to: number } | null {
  if (!tasks.length) return null;
  let at = (v.tasks.at(-1)?.at ?? doc.blocks.length - 1) + 1;
  let gone: Op[] = [];
  if (Array.isArray(target) && target.length) {
    at = Math.min(...target);
    gone = removeTasks(target);
  } else if (typeof target === 'number') {
    const t = v.tasks.find((x) => x.at === target);
    if (t) {
      const empty = !t.words.trim() && !t.runs.some((r) => r.ic || r.fn !== undefined);
      at = empty ? t.at : t.at + 1;
      if (empty) gone = removeTasks([t.at]);
    }
  }
  return { ops: [...gone, { op: 'splice', at, n: 0, blocks: tasks }], from: at, to: at + tasks.length };
}
