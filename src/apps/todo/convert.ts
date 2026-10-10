/**
 * A to-do list opened as another app (the Download menu's "Open in"): pure functions from this document's
 * text to the other app's. As a board, the tasks still to do in one stage and the done ones in the last,
 * each card keeping its words, its star and its date; as a calendar, every task with a date on its day,
 * ticked as it was.
 */
import { parse, write, type Block, type Head } from '../../doc/index.ts';
import { t } from '../../kit/i18n.ts';
import { dayOf, itemBlock, newDraft } from '../cal/model.ts';
import { readTodo } from './model.ts';

const titled = (head: Head): Head => (head.title ? { title: head.title } : {});

/** The tasks as cards: "To do", then "Done". */
export function todoToBoard(text: string): string {
  const doc = parse(text);
  const { tasks } = readTodo(doc);
  const card = (b: Extract<Block, { k: 'li' }>): Block => ({ k: 'li', depth: 0, runs: b.runs, ...(b.a ? { a: b.a } : {}) });
  const stage = (name: string, done: boolean): Block[] => [{ k: 'h', level: 2, runs: [{ t: name }] }, ...tasks.filter((x) => x.done === done).map((x) => card(x.block))];
  return write({ head: titled(doc.head), blocks: [...stage(t('To do'), false), ...stage(t('Done'), true)] });
}

/** The tasks with a date, each a day on a calendar; a ticked one done. */
export function todoToCal(text: string): string {
  const doc = parse(text);
  const blocks = readTodo(doc)
    .tasks.filter((x) => x.due)
    .sort((a, b) => a.due.localeCompare(b.due))
    .map((x) => itemBlock({ ...newDraft(dayOf(x.due)!), label: x.runs, done: x.done ? 100 : 0 }, 'UTC'));
  return write({ head: titled(doc.head), blocks });
}
