/**
 * The envelope: what a document carries besides its own words, in the head of its text beside the app's own
 * settings (docs/kernel.md §1):
 *
 *   ---
 *   title: Q3 budget             the document's name
 *   by: Paul                     who made it, in the maker's own word
 *   created: 2026-10-05T14:32Z   when it was first written, to the minute
 *   chart: bar                   (the app's own settings stay where they are)
 *   ---
 */
import { takeHead } from '../doc/tlo.ts';

/** The head keys that belong to the document rather than its app. */
export const SHELL_KEYS = ['title', 'by', 'created'];
/** Those the shell writes itself (the title is the editor's): what an edit cannot drop. */
export const ENVELOPE_KEYS = ['by', 'created'];

export interface Envelope {
  /** When it was first written, ms since the epoch at minute precision; null when never set. */
  created: number | null;
  title?: string;
  by?: string;
  /** The text without the envelope's keys: the app's head and the blocks. */
  body: string;
}

/** The instant as it will read back: to the minute. */
export const quantizeCreated = (ms: number): number => Math.round(ms / 60000) * 60000;

/** When, as the head writes it: "2026-10-05T14:32Z". */
export const isoMinute = (ms: number): string => new Date(quantizeCreated(ms)).toISOString().slice(0, 16) + 'Z';

/** A document's text read into its envelope. */
export function readEnvelope(text: string): Envelope {
  const [head, body] = takeHead(text, SHELL_KEYS);
  const env: Envelope = { created: null, body };
  if (head.created) {
    const ms = Date.parse(head.created);
    if (Number.isFinite(ms)) env.created = quantizeCreated(ms);
  }
  if (head.title) env.title = head.title;
  if (head.by) env.by = head.by;
  return env;
}
