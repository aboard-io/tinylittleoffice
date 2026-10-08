/**
 * Todo document model. The list is a TLO task list (lib/tlo.ts), one task
 * an item, a star and a due date as its attributes:
 *
 *   - [ ] Renew passport {.star due=2027-03-01}
 *   - [x] Book the venue
 */
import { parse, write, attr, hasClass, type Block } from './tlo.ts';
import { EPOCH_DAY, isoDay } from './calmodel.ts';
import { ymdToDay } from './tz.ts';

export interface Task {
  text: string;
  done: boolean;
  star: boolean;
  /** Days since 2020-01-01, or null. */
  due: number | null;
}

/** "2027-03-01" as days since 2020-01-01, or null when it is not a date. */
export function dayOf(iso: string | undefined): number | null {
  const m = /^(\d{4})-(\d\d)-(\d\d)$/.exec(iso?.trim() ?? '');
  return m ? ymdToDay(+m[1], +m[2], +m[3]) - EPOCH_DAY : null;
}

export function parseTodos(text: string): Task[] {
  return parse(text)
    .blocks.filter((b) => b.k === 'li')
    .map((b) => ({ text: b.text.replace(/\n/g, ' '), done: !!b.done, star: hasClass(b, 'star'), due: dayOf(attr(b, 'due')) }));
}

export function serializeTodos(tasks: Task[]): string {
  const blocks: Block[] = tasks.map((t) => {
    const a = { ...(t.star ? { cls: ['star'] } : {}), ...(t.due !== null ? { kv: { due: isoDay(Math.max(0, Math.round(t.due))) } } : {}) };
    return { k: 'li', depth: 0, done: t.done, text: t.text.replace(/\n/g, ' '), ...(t.star || t.due !== null ? { a } : {}) };
  });
  return write({ head: {}, blocks }).trimEnd();
}

/**
 * A list as a person or a model writes it, made canonical: any bullet or
 * none, a checkbox or not, a task in **bold** (or after a ★) for a star,
 * and a due date written after it, "(due 2027-03-01)". Headings and tables
 * are left out.
 */
export function readTodos(text: string): string {
  const tasks: Task[] = [];
  for (const b of parse(text).blocks) {
    const lines: { text: string; done?: boolean; a?: Block['a'] }[] = b.k === 'li' ? [b] : b.k === 'p' ? b.text.split('\n').map((t) => ({ text: t.trim() })) : [];
    for (const l of lines) {
      let words = l.text.replace(/\n/g, ' ');
      // (An item that is a task already keeps its words as they are.)
      const box = l.done === undefined ? /^\[( |x|X)\]\s*(.*)$/.exec(words) : null;
      if (box) words = box[2];
      const due = /\s*\(?\bdue:?\s+(\d{4}-\d\d-\d\d)\)?\s*$/i.exec(words);
      if (due) words = words.slice(0, due.index);
      words = words.trim();
      if (!words && l.done === undefined) continue;
      const star = /^\*\*(.+)\*\*$/.exec(words) ?? /^★\s*(?:\*\*(.+)\*\*|(.+))$/.exec(words);
      tasks.push({
        text: star ? (star[1] ?? star[2]).trim() : words,
        done: !!l.done || (!!box && box[1] !== ' '),
        star: !!star || hasClass(l, 'star'),
        due: dayOf(attr(l, 'due')) ?? dayOf(due?.[1]),
      });
    }
  }
  return serializeTodos(tasks);
}
