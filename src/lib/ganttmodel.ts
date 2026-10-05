/**
 * Gantt document model.
 * Format: one task per line: "<start>,<days>,<done>,<label>". Start is days
 * since 2020-01-01, days is the length (at least 1), done is a percentage;
 * the numbers are base 36. A task that is part of the one above it is
 * indented with a leading ">" per level; a task with parts under it is drawn
 * as a bracket around them.
 */
export interface GanttTask {
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

export function parseGantt(text: string): GanttTask[] {
  const out: GanttTask[] = [];
  if (!text) return out;
  for (const line of text.split('\n')) {
    const depth = /^>*/.exec(line)![0].length;
    const parts = line.slice(depth).split(',');
    if (parts.length < 3) continue;
    const [start, days, done] = parts.slice(0, 3).map((p) => parseInt(p, 36));
    if (![start, days, done].every(Number.isFinite)) continue;
    const task: GanttTask = { start: Math.max(0, start), days: Math.max(1, days), done: Math.min(100, Math.max(0, done)), label: parts.slice(3).join(',') };
    if (depth) task.depth = Math.min(MAX_INDENT, depth);
    out.push(task);
  }
  return out;
}

export function serializeGantt(tasks: GanttTask[]): string {
  const b = (n: number) => Math.max(0, Math.round(n)).toString(36);
  return tasks.map((t) => `${'>'.repeat(t.depth ?? 0)}${b(t.start)},${b(Math.max(1, t.days))},${b(Math.min(100, t.done))}${t.label ? ',' + t.label.replace(/\n/g, ' ') : ','}`).join('\n');
}

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
