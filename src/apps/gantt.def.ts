/** Gantt: what the shell knows about schedules. Format: lib/ganttmodel.ts. */
import { defineApp, csv, utf8, text, rect, clip, r, ACCENT, INK, LINE, MUTED, SHADE, type Page } from '../kit/core.ts';
import { ganttRange, ganttSpans, parseGantt, serializeGantt, type GanttTask } from '../lib/ganttmodel.ts';
import { EPOCH_DAY, isoDay } from '../lib/calmodel.ts';
import { ymdToDay } from '../lib/tz.ts';

export function ganttToCsv(body: string): string {
  const tasks = parseGantt(body);
  const spans = ganttSpans(tasks);
  return csv([['Task', 'Level', 'Start', 'End', 'Days', 'Done %'], ...tasks.map((t, i) => [t.label, (t.depth ?? 0) + 1, isoDay(spans[i].start), isoDay(spans[i].start + spans[i].days - 1), spans[i].days, spans[i].done])]);
}

/**
 * A schedule written plainly, one task per line:
 *   2027-03-01, 5, Design            start, days, name
 *   > 2027-03-01, 2, 50%, Sketch     ">" nests it under the task above; "50%" is how far along it is
 */
export function readGantt(text: string): string {
  const tasks: GanttTask[] = [];
  let plain = false;
  for (const line of text.split('\n')) {
    const m = /^\s*(>*)\s*(\d{4})-(\d\d)-(\d\d)\s*,\s*(\d+)\s*,\s*(?:(\d+)%\s*,\s*)?(.*)$/.exec(line);
    if (!m) continue;
    plain = true;
    const task: GanttTask = { start: Math.max(0, ymdToDay(+m[2], +m[3], +m[4]) - EPOCH_DAY), days: Math.max(1, +m[5]), done: Math.min(100, +(m[6] ?? 0)), label: m[7].trim() };
    if (m[1]) task.depth = m[1].length;
    tasks.push(task);
  }
  return plain ? serializeGantt(tasks) : text;
}

/** The schedule as a page; `upTo` tasks of it while it builds. */
function page(body: string, upTo = Infinity): Page {
  const tasks = parseGantt(body);
  const range = ganttRange(tasks);
  if (!range) return { w: 480, h: 120, svg: text(240, 66, 'No tasks yet', { px: 16, fill: MUTED, anchor: 'middle' }) };
  const spans = ganttSpans(tasks);
  const NAMES = 220;
  const ROW = 32;
  const days = range.to - range.from;
  const z = Math.max(4, Math.min(28, 640 / days));
  const w = NAMES + days * z + 48;
  let svg = rect(24 + NAMES, 24, days * z, tasks.length * ROW + 28, SHADE);
  for (let d = 0; d <= days; d += Math.ceil(7 / Math.max(1, z / 12))) svg += `<line x1="${r(24 + NAMES + d * z)}" y1="24" x2="${r(24 + NAMES + d * z)}" y2="${52 + tasks.length * ROW}" stroke="${LINE}"/>` + text(24 + NAMES + d * z + 4, 42, isoDay(range.from + d).slice(5), { px: 11, fill: MUTED });
  tasks.forEach((t, i) => {
    if (i >= upTo) return;
    const s = spans[i];
    const y = 52 + i * ROW;
    const left = 24 + NAMES + (s.start - range.from) * z;
    svg += text(24 + (t.depth ?? 0) * 16, y + 21, clip(t.label || 'Task', NAMES - 12 - (t.depth ?? 0) * 16, 14, s.parent), { px: 14, bold: s.parent });
    if (s.parent) svg += rect(left, y + 10, s.days * z, 6, INK) + `<path d="M${r(left)} ${y + 10}v12l6-6zM${r(left + s.days * z)} ${y + 10}v12l-6-6z" fill="${INK}"/>`;
    else svg += rect(left, y + 6, s.days * z, ROW - 12, '#e0e7ff', `rx="4" stroke="${ACCENT}"`) + (s.done ? rect(left, y + 6, (s.days * z * s.done) / 100, ROW - 12, ACCENT, 'rx="4"') : '');
  });
  return { w, h: 76 + tasks.length * ROW, svg };
}

export default defineApp({
  id: 'gantt',
  group: 'Plan',
  name: 'Gantt',
  icon: 'gantt',
  blurb: 'Tasks as bars on a calendar, with tasks nested under the ones they are part of.',
  title: () => '',
  outline: (body) => parseGantt(body).map((t) => `${'    '.repeat(t.depth ?? 0)}${t.label}  ·  ${t.days}d`).filter((l) => l.trim()),
  view: (body, opts = {}) => [page(body, opts.step)],
  // On a slide, the calendar is there and tasks arrive one at a time.
  steps: (body) => parseGantt(body).length,
  read: readGantt,
  downloads: [{ ext: 'csv', label: 'CSV', mime: 'text/csv;charset=utf-8', build: (b) => utf8('\ufeff' + ganttToCsv(b)) }],
  shortcuts: [
    { keys: 'Tab / Shift+Tab', does: 'Indent the task under the one above, or bring it back out' },
    { keys: 'Alt+Up / Alt+Down', does: 'Move the task' },
    { keys: 'Enter', does: 'Add a task below this one' },
  ],
});
