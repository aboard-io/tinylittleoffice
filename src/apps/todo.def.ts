/** Todo: what the shell knows about task lists. Format: lib/todomodel.ts. */
import { defineApp, utf8, xml, text, clip, rect, MUTED, ACCENT, FAINT, type Page } from '../kit/core.ts';
import { parseTodos, serializeTodos } from '../lib/todomodel.ts';
import { EPOCH_DAY, isoDay } from '../lib/calmodel.ts';
import { ymdToDay } from '../lib/tz.ts';

export function todosToMarkdown(body: string): string {
  return parseTodos(body)
    .map((t) => `- [${t.done ? 'x' : ' '}] ${t.star ? '**' + t.text + '**' : t.text}${t.due !== null ? ` (due ${isoDay(t.due)})` : ''}`)
    .join('\n') + '\n';
}

/**
 * A list written plainly, one task per line: "- Buy milk", "x Done already",
 * "-! Starred", and a due date as "@2027-03-01" before the text. Markdown
 * checkboxes ("- [ ] task", "- [x] task") work too.
 */
export function readTodos(text: string): string {
  return serializeTodos(
    text.split('\n').flatMap((line) => {
      const m = /^\s*(?:[-*]\s*\[( |x|X)\]|([-x])(!?))\s*(?:@(\d{4})-(\d\d)-(\d\d)\s+)?(.*)$/.exec(line);
      if (!m || (m[1] === undefined && m[2] === undefined)) return line.trim() ? [{ text: line.trim(), done: false, star: false, due: null }] : [];
      // A due date already counted in days ("@1jk") is the app's own format: leave the line to it.
      if (/^[-x]!?@[0-9a-z]+ /.test(line) && !m[4]) return parseTodos(line);
      return [{ text: m[7], done: (m[1] ?? m[2]).toLowerCase() === 'x', star: m[3] === '!', due: m[4] ? ymdToDay(+m[4], +m[5], +m[6]) - EPOCH_DAY : null }];
    }),
  );
}

/** The list as a page; `upTo` tasks of it while it builds. */
function page(body: string, upTo = Infinity): Page {
  const all = parseTodos(body);
  const tasks = all.slice(0, upTo);
  const w = 720;
  let y = 28;
  let svg = '';
  for (const t of tasks) {
    svg += rect(40, y, 20, 20, t.done ? ACCENT : 'none', `rx="4" stroke="${t.done ? ACCENT : FAINT}" stroke-width="1.5"`);
    if (t.done) svg += `<path d="M45 ${y + 10}l4 4 7-8" fill="none" stroke="#fff" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"/>`;
    const due = t.due !== null ? isoDay(t.due) : '';
    svg += text(76, y + 16, [{ t: (t.star ? '★ ' : '') + clip(t.text, w - 250, 17, t.star), b: t.star, s: t.done }], { px: 17, fill: t.done ? MUTED : undefined });
    if (due) svg += text(w - 40, y + 16, due, { px: 14, fill: MUTED, anchor: 'end' });
    y += 36;
  }
  if (!all.length) svg = text(w / 2, 70, 'Nothing to do', { px: 16, fill: MUTED, anchor: 'middle' });
  // (The page is as tall as the whole list from the start, so nothing moves as it fills in.)
  return { w, h: Math.max(120, 28 + all.length * 36 + 20), svg };
}

export default defineApp({
  id: 'todo',
  group: 'Time management',
  name: 'Todo',
  icon: 'todo',
  blurb: 'Tasks to tick off, with stars and due dates.',
  title: () => '',
  outline: (body) => parseTodos(body).map((t) => (t.done ? '☑  ' : '☐  ') + t.text),
  view: (body, opts = {}) => [page(body, opts.step)],
  // On a slide, tasks appear one at a time.
  steps: (body) => parseTodos(body).length,
  read: readTodos,
  html: (body) =>
    `<h1>Todo</h1>\n<ul class="check">\n${parseTodos(body)
      .map((t) => `<li><input type="checkbox" disabled${t.done ? ' checked' : ''}> ${t.star ? `<strong>${xml(t.text)}</strong>` : xml(t.text)}${t.due !== null ? ` <small><time datetime="${isoDay(t.due)}">due ${isoDay(t.due)}</time></small>` : ''}</li>`)
      .join('\n')}\n</ul>`,
  downloads: [{ ext: 'md', label: 'Markdown checklist', mime: 'text/markdown;charset=utf-8', build: (b) => utf8(todosToMarkdown(b)) }],
  shortcuts: [
    { keys: 'Enter', does: 'Add the task being typed' },
    { keys: 'Alt+Up / Alt+Down', does: 'Move the task' },
    { keys: 'Mod+Enter', does: 'Tick or untick the task' },
  ],
});
