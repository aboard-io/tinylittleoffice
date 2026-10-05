/**
 * Gantt document model.
 * Format: one task per line: "<start>,<days>,<done>,<label>". Start is days
 * since 2020-01-01, days is the length (at least 1), done is a percentage;
 * the numbers are base 36.
 */
export interface GanttTask {
  start: number;
  days: number;
  /** 0 to 100. */
  done: number;
  label: string;
}

export const MAX_TASKS = 40;

export function parseGantt(text: string): GanttTask[] {
  const out: GanttTask[] = [];
  if (!text) return out;
  for (const line of text.split('\n')) {
    const parts = line.split(',');
    if (parts.length < 3) continue;
    const [start, days, done] = parts.slice(0, 3).map((p) => parseInt(p, 36));
    if (![start, days, done].every(Number.isFinite)) continue;
    out.push({ start: Math.max(0, start), days: Math.max(1, days), done: Math.min(100, Math.max(0, done)), label: parts.slice(3).join(',') });
  }
  return out;
}

export function serializeGantt(tasks: GanttTask[]): string {
  const b = (n: number) => Math.max(0, Math.round(n)).toString(36);
  return tasks.map((t) => `${b(t.start)},${b(Math.max(1, t.days))},${b(Math.min(100, t.done))}${t.label ? ',' + t.label.replace(/\n/g, ' ') : ','}`).join('\n');
}

/** First day and one-past-last day covered by the tasks, or null when there are none. */
export function ganttRange(tasks: GanttTask[]): { from: number; to: number } | null {
  if (!tasks.length) return null;
  return { from: Math.min(...tasks.map((t) => t.start)), to: Math.max(...tasks.map((t) => t.start + t.days)) };
}
