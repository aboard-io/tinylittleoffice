/**
 * Todo document model.
 * Format: one task per line: a state character ("-" open, "x" done), an
 * optional "!" for starred, an optional "@<due>" (days since 2020-01-01,
 * base 36), a space, then the text.
 */
export interface Task {
  text: string;
  done: boolean;
  star: boolean;
  /** Days since 2020-01-01, or null. */
  due: number | null;
}

export function parseTodos(text: string): Task[] {
  const out: Task[] = [];
  if (!text) return out;
  for (const line of text.split('\n')) {
    const m = /^([-x])(!?)(?:@([0-9a-z]+))? (.*)$/.exec(line);
    if (!m) continue;
    const due = m[3] ? parseInt(m[3], 36) : null;
    out.push({ done: m[1] === 'x', star: m[2] === '!', due: due !== null && Number.isFinite(due) ? due : null, text: m[4] });
  }
  return out;
}

export function serializeTodos(tasks: Task[]): string {
  return tasks.map((t) => `${t.done ? 'x' : '-'}${t.star ? '!' : ''}${t.due !== null ? '@' + Math.max(0, Math.round(t.due)).toString(36) : ''} ${t.text.replace(/\n/g, ' ')}`).join('\n');
}
