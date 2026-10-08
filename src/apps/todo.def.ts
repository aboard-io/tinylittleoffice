/** Todo: what the shell knows about task lists. Format: lib/todomodel.ts. */
import { toMarkdown } from '../lib/markdown.ts';
import { defineApp, appOf, utf8, xml, text, wrapText, rect, MUTED, ACCENT, FAINT, type Page } from '../kit/core.ts';
import { parseTodos, readTodos } from '../lib/todomodel.ts';
import { isoDay } from '../lib/calmodel.ts';

/** The list as a page `w` wide; `upTo` tasks of it while it builds. Long tasks wrap. */
function page(body: string, upTo = Infinity, w = 720): Page {
  const all = parseTodos(body);
  const narrow = w < 500;
  const left = narrow ? 8 : 40;
  let y = narrow ? 8 : 28;
  let svg = '';
  all.forEach((t, i) => {
    const due = t.due !== null ? isoDay(t.due) : '';
    // On a narrow page the date goes under the task rather than beside it.
    const lines = wrapText((t.star ? '★ ' : '') + t.text, w - left * 2 - 36 - (due && !narrow ? 110 : 0), 17, t.star);
    const top = y;
    y += Math.max(1, lines.length) * 24 + (due && narrow ? 20 : 0) + 12;
    if (i >= upTo) return;
    svg += rect(left, top, 20, 20, t.done ? ACCENT : 'none', `rx="4" stroke="${t.done ? ACCENT : FAINT}" stroke-width="1.5"`);
    if (t.done) svg += `<path d="M${left + 5} ${top + 10}l4 4 7-8" fill="none" stroke="#fff" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"/>`;
    lines.forEach((l, n) => (svg += text(left + 36, top + 16 + n * 24, [{ t: l, b: t.star, s: t.done }], { px: 17, fill: t.done ? MUTED : undefined })));
    if (due) svg += narrow ? text(left + 36, top + 14 + lines.length * 24, due, { px: 13, fill: MUTED }) : text(w - 40, top + 16, due, { px: 14, fill: MUTED, anchor: 'end' });
  });
  if (!all.length) svg = text(w / 2, 70, 'Nothing to do', { px: 16, fill: MUTED, anchor: 'middle' });
  // (The page is as tall as the whole list from the start, so nothing moves as it fills in.)
  return { w, h: Math.max(narrow ? 60 : 120, y + 8), svg };
}

export default defineApp({
  id: 'todo',
  group: 'Plan',
  name: 'Todo',
  icon: 'todo',
  blurb: 'Tasks to tick off, with stars and due dates.',
  title: () => '',
  outline: (body) => parseTodos(body).map((t) => (t.done ? '☑  ' : '☐  ') + t.text),
  view: (body, opts = {}) => [page(body, opts.step, opts.w)],
  // On a slide, tasks appear one at a time.
  steps: (body) => parseTodos(body).length,
  read: readTodos,
  html: (body) =>
    `<h1>Todo</h1>\n<ul class="check">\n${parseTodos(body)
      .map((t) => `<li><input type="checkbox" disabled${t.done ? ' checked' : ''}> ${t.star ? `<strong>${xml(t.text)}</strong>` : xml(t.text)}${t.due !== null ? ` <small><time datetime="${isoDay(t.due)}">due ${isoDay(t.due)}</time></small>` : ''}</li>`)
      .join('\n')}\n</ul>`,
  // A list's own file is Markdown: what Ctrl+S saves.
  downloads: [{ ext: 'md', label: 'Markdown', mime: 'text/markdown;charset=utf-8', build: (b) => utf8(toMarkdown(appOf('todo')!, b)) }],
  shortcuts: [
    { keys: 'Enter', does: 'Add the task being typed' },
    { keys: 'Alt+Up / Alt+Down', does: 'Move the task' },
    { keys: 'Mod+Enter', does: 'Tick or untick the task' },
  ],
});
