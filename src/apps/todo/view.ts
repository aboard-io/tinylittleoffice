/**
 * Todo drawn and written out, with no DOM: the page for print, PDF, PNG and thumbnails, the Markdown a list
 * is as a file, and the to-dos a calendar app reads (iCalendar, RFC 5545: a VTODO each).
 */
import { writeInline, type Doc } from '../../doc/index.ts';
import type { Page } from '../../kit/app.ts';
import { ACCENT, FAINT, INK, MUTED, rect, text, textWidth, wrapText } from '../../kit/draw.ts';
import { readTodo, type Task } from './model.ts';

/** The list as a page `w` wide; the first `max` tasks of it. Long tasks wrap. */
export function todoPage(doc: Doc, max = Infinity, w = 720): Page {
  const all = readTodo(doc).tasks.slice(0, max);
  let y = 28;
  let svg = '';
  const left = 40;
  for (const t of all) {
    const lines = wrapText((t.star ? '★ ' : '') + t.words, w - left * 2 - 36 - (t.due ? 110 : 0), 17, t.star);
    const top = y;
    y += Math.max(1, lines.length) * 24 + 12;
    svg += rect(left, top, 20, 20, t.done ? ACCENT : 'none', `rx="4" stroke="${t.done ? ACCENT : FAINT}" stroke-width="1.5"`);
    if (t.done) svg += `<path d="M${left + 5} ${top + 10}l4 4 7-8" fill="none" stroke="#fff" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"/>`;
    lines.forEach((l, n) => {
      const baseline = top + 16 + n * 24;
      svg += text(left + 36, baseline, l, { px: 17, bold: t.star, fill: t.done ? MUTED : INK });
      if (t.done) svg += `<path d="M${left + 36} ${baseline - 6}h${Math.round(textWidth(l, 17, t.star))}" stroke="${MUTED}" stroke-width="1.2"/>`;
    });
    if (t.due) svg += text(w - 40, top + 16, t.due, { px: 14, fill: MUTED, anchor: 'end' });
  }
  if (!all.length) svg = text(w / 2, 70, '–', { px: 16, fill: MUTED, anchor: 'middle' });
  const done = all.filter((t) => t.done).length;
  return { w, h: Math.max(120, y + 8), svg, alt: all.length ? `${done} of ${all.length}: ${all.map((t) => (t.done ? '☑ ' : '☐ ') + t.words).join('; ')}` : undefined };
}

/** The list as Markdown a person can read anywhere: a task list, a star as bold, a due date after the words. */
export function todoToMarkdown(doc: Doc): string {
  const line = (t: Task) => {
    const words = writeInline(t.runs).replace(/\n/g, ' ');
    return `- [${t.done ? 'x' : ' '}] ${t.star && words ? `**${words}**` : words}${t.due ? ` (due ${t.due})` : ''}`.trimEnd();
  };
  const tasks = readTodo(doc).tasks;
  return tasks.length ? tasks.map(line).join('\n') + '\n' : '';
}

/* ---------- iCalendar ---------- */

const icsText = (s: string) => s.replace(/\\/g, '\\\\').replace(/;/g, '\\;').replace(/,/g, '\\,').replace(/\r?\n/g, '\\n');
const icsStamp = (ms: number) => new Date(ms).toISOString().replace(/[-:]/g, '').slice(0, 15) + 'Z';
/** Content lines may not exceed 75 octets; a longer one continues on a line starting with a space, never splitting a character. */
function fold(line: string): string {
  const enc = new TextEncoder();
  let out = '';
  let width = 0;
  for (const ch of line) {
    const n = enc.encode(ch).length;
    if (width + n > 73) {
      out += '\r\n ';
      width = 1;
    }
    out += ch;
    width += n;
  }
  return out;
}

/** The list as a calendar's to-dos: each a VTODO, done or not, due on its day, a star the first priority. */
export function todoToIcs(doc: Doc, created: number): string {
  const stamp = icsStamp(created);
  const todos = readTodo(doc).tasks.map((t, i) => [
    'BEGIN:VTODO',
    `UID:t${i}-${t.due.replace(/-/g, '')}@tinylittleoffice`,
    `DTSTAMP:${stamp}`,
    `SUMMARY:${icsText(t.words || '–')}`,
    `STATUS:${t.done ? 'COMPLETED' : 'NEEDS-ACTION'}`,
    ...(t.due ? [`DUE;VALUE=DATE:${t.due.replace(/-/g, '')}`] : []),
    ...(t.star ? ['PRIORITY:1'] : []),
    'END:VTODO',
  ]);
  const lines = ['BEGIN:VCALENDAR', 'VERSION:2.0', 'PRODID:-//TinyLittleOffice//To-Do List//EN', 'CALSCALE:GREGORIAN', 'METHOD:PUBLISH', ...todos.flat(), 'END:VCALENDAR'];
  return lines.map(fold).join('\r\n') + '\r\n';
}
