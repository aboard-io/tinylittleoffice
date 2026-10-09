/**
 * A trip opened as a calendar (the Download menu's "Open in"): a day a stop, in the route's order, from
 * the day after `today`; each day named for its stop, the note after it.
 */
import { parse, write, type Block } from '../../doc/index.ts';
import { itemBlock, newDraft, today as calToday } from '../cal/model.ts';
import { readTrip } from './model.ts';

export function tripToCal(text: string, today = calToday()): string {
  const doc = parse(text);
  const blocks: Block[] = readTrip(doc).stops.map((s, i) => itemBlock({ ...newDraft(today + 1 + i), label: [{ t: [s.name || `${s.lat}, ${s.lon}`, s.note].filter(Boolean).join(' · ') }] }, 'UTC'));
  return write({ head: doc.head.title ? { title: doc.head.title } : {}, blocks });
}
