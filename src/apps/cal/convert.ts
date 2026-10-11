/**
 * A calendar opened as a to-do list (the Download menu's "Open in"): every span a task due on the day it
 * starts (in the calendar's own zone), its words kept, ticked when it is done; a schedule's tasks nested
 * under one another come out side by side.
 */
import { parse, write, type Block } from '../../doc/index.ts';
import { dayString } from './tz.ts';
import { readCal, spanDays } from './model.ts';

export function calToTodo(text: string): string {
  const doc = parse(text);
  const v = readCal(doc);
  const blocks: Block[] = v.items.map((i) => ({ k: 'li', depth: 0, done: i.done >= 100, runs: i.label, a: { kv: { due: dayString(spanDays(i, v.tz)[0]) } } }));
  return write({ head: doc.head.title ? { title: doc.head.title } : {}, blocks });
}
