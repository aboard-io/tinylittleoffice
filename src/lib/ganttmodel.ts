/**
 * Gantt document model. The schedule is a TLO table (lib/tlo.ts), a task a
 * row: its name, the day it starts, how many days it takes and how far
 * along it is. A task that is part of the one above it starts its name
 * with "- ", one for each level in; a task with parts under it is drawn as
 * a bracket around them.
 *
 *   Task | Start:date | Days:number | Done:percent
 *   --- | --- | --- | ---
 *   Design | 2027-03-01 | 5 | 50%
 *   - Sketch | 2027-03-01 | 2 | 100%
 */
import { parse, write, columnsOf } from './tlo.ts';
import { EPOCH_DAY, fromIsoDay, isoDay } from './calmodel.ts';
import { ymdToDay } from './tz.ts';

export interface GanttTask {
  /** Days since 2020-01-01. */
  start: number;
  days: number;
  /** 0 to 100. */
  done: number;
  label: string;
  /** How far in: 0 (absent) for a top-level task. */
  depth?: number;
}

export const MAX_INDENT = 3;

export const MAX_TASKS = 40;

const GANTT_HEAD = ['Task', 'Start:date', 'Days:number', 'Done:percent'];

/** A day as written in a table: "2027-03-01", or "3/1/2027". */
function dayOf(s: string): number | null {
  const us = /^(\d\d?)\/(\d\d?)\/(\d{4})$/.exec(s.trim());
  return us ? ymdToDay(+us[3], +us[1], +us[2]) - EPOCH_DAY : fromIsoDay(s);
}
const num = (s: string | undefined) => parseFloat((s ?? '').replace(/[%\s]/g, ''));

/**
 * The tasks of every row of the first table that has a start, its columns
 * found by name in any order: Task (or Name), Start, Days (or an End),
 * Done, and a Level (1 for the top) where nesting is not written in the name.
 */
export function parseGantt(text: string): GanttTask[] {
  const out: GanttTask[] = [];
  for (const b of parse(text).blocks) {
    if (b.k !== 'table') continue;
    const [name, start, days, end, done, level] = columnsOf(b, /^(task|name|what)$/, /^(start|starts|from|date)$/, /^(days|duration|length)$/, /^(end|ends|to|until)$/, /^(done|progress|complete)( ?%)?$/, /^(level|depth)$/);
    if (start < 0) continue;
    for (const r of b.rows) {
      const from = dayOf(r[start]);
      if (from === null) continue;
      const lead = /^(?:-(?:\s+|$))*/.exec(r[name] ?? '')![0];
      const depth = Math.min(MAX_INDENT, lead ? lead.split('-').length - 1 : Math.max(0, (num(r[level]) || 1) - 1));
      const last = end >= 0 ? dayOf(r[end]) : null;
      const length = days >= 0 && num(r[days]) > 0 ? Math.round(num(r[days])) : last !== null ? last - from + 1 : 1;
      const task: GanttTask = { start: Math.max(0, from), days: Math.max(1, length), done: Math.round(Math.min(100, Math.max(0, num(r[done]) || 0))), label: (r[name] ?? '').slice(lead.length).trim() };
      if (depth) task.depth = depth;
      out.push(task);
    }
    break;
  }
  return out;
}

export function serializeGantt(tasks: GanttTask[]): string {
  if (!tasks.length) return '';
  const rows = tasks.map((t) => ['- '.repeat(t.depth ?? 0) + t.label.replace(/\n/g, ' '), isoDay(Math.max(0, Math.round(t.start))), String(Math.max(1, Math.round(t.days))), `${Math.round(Math.min(100, Math.max(0, t.done)))}%`]);
  return write({ head: {}, blocks: [{ k: 'table', head: GANTT_HEAD, rows }] }).trimEnd();
}

/**
 * A schedule as a person or a model writes it, made canonical: a table
 * whose columns are in another order or named a little differently, an End
 * in place of Days, a CSV of it (the app's own CSV, with its Level, comes
 * back as it went).
 */
export const readGantt = (text: string): string => serializeGantt(parseGantt(text));

/** First day and one-past-last day covered by the tasks, or null when there are none. */
export function ganttRange(tasks: GanttTask[]): { from: number; to: number } | null {
  if (!tasks.length) return null;
  const spans = ganttSpans(tasks);
  return { from: Math.min(...spans.map((t) => t.start)), to: Math.max(...spans.map((t) => t.start + t.days)) };
}

/**
 * Each task's span as drawn: a task with parts under it covers them all,
 * and counts as done as far as they are.
 */
export function ganttSpans(tasks: GanttTask[]): { start: number; days: number; done: number; parent: boolean }[] {
  return tasks.map((t, i) => {
    const depth = t.depth ?? 0;
    const kids: GanttTask[] = [];
    for (let j = i + 1; j < tasks.length && (tasks[j].depth ?? 0) > depth; j++) kids.push(tasks[j]);
    if (!kids.length) return { start: t.start, days: t.days, done: t.done, parent: false };
    const start = Math.min(...kids.map((k) => k.start));
    const end = Math.max(...kids.map((k) => k.start + k.days));
    const total = kids.reduce((a, k) => a + k.days, 0);
    return { start, days: end - start, done: Math.round(kids.reduce((a, k) => a + k.days * k.done, 0) / total), parent: true };
  });
}
