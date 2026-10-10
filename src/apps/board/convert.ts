/**
 * A board opened as a to-do list (the Download menu's "Open in"): every card a task, in the order of the
 * stages, ticked when it sits in the last stage (where the work is done); a card's own checklist stays
 * behind, being the card's.
 */
import { parse, write, type Block } from '../../doc/index.ts';
import { readBoard } from './model.ts';

export function boardToTodo(text: string): string {
  const doc = parse(text);
  const { stages } = readBoard(doc);
  const last = stages.length - 1;
  const blocks: Block[] = stages.flatMap((s, i) => s.cards.map((c): Block => ({ k: 'li', depth: 0, done: stages.length > 1 && i === last, runs: c.block.runs, ...(c.block.a ? { a: c.block.a } : {}) })));
  return write({ head: doc.head.title ? { title: doc.head.title } : {}, blocks });
}
