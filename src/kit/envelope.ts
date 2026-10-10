/**
 * The envelope: what a document carries besides its own words, in the head of its text beside the app's own
 * settings (docs/kernel.md §1):
 *
 *   ---
 *   title: Q3 budget             the document's name
 *   by: Paul                     who made it, as the signer gave it; proven only by a signature
 *   created: 2026-10-05T14:32Z   when it was first written, to the minute
 *   key: <public key>            base64url, with a signature
 *   sig: <signature>
 *   chart: bar                   (the app's own settings stay where they are)
 *   ---
 *
 * A signature covers the app, the creation time, the text without these five keys, the title and the name:
 * the message below, exactly as the old tree's src/lib/envelope.ts wrote it, so its signed documents verify.
 */
import { takeHead } from '../doc/tlo.ts';

export const CREATED_EPOCH_MS = Date.UTC(2020, 0, 1);

/** The head keys that belong to the document rather than its app. */
export const SHELL_KEYS = ['title', 'by', 'created', 'key', 'sig'];
/** Those the shell writes itself (the title is the editor's): what an edit cannot drop. */
export const ENVELOPE_KEYS = ['by', 'created', 'key', 'sig'];

export interface Envelope {
  /** When it was first written, ms since the epoch at minute precision; null when never set. */
  created: number | null;
  title?: string;
  by?: string;
  key?: string;
  sig?: string;
  /** The text without the envelope's keys: the app's head and the blocks. */
  body: string;
}

/** Minutes since 2020, base 36: how the signed message names the creation time. */
export function encodeCreated(ms: number): string {
  return Math.max(0, Math.round((ms - CREATED_EPOCH_MS) / 60000)).toString(36);
}

export function decodeCreated(s: string): number | null {
  const n = parseInt(s, 36);
  return Number.isFinite(n) && n >= 0 && /^[0-9a-z]+$/.test(s) ? CREATED_EPOCH_MS + n * 60000 : null;
}

/** The instant as it will read back: to the minute. */
export function quantizeCreated(ms: number): number {
  return decodeCreated(encodeCreated(ms)) ?? CREATED_EPOCH_MS;
}

/** When, as the head writes it: "2026-10-05T14:32Z". */
export const isoMinute = (ms: number): string => new Date(quantizeCreated(ms)).toISOString().slice(0, 16) + 'Z';

/** A document's text read into its envelope. A key without a signature is no signature. */
export function readEnvelope(text: string): Envelope {
  const [head, body] = takeHead(text, SHELL_KEYS);
  const env: Envelope = { created: null, body };
  if (head.created) {
    const ms = Date.parse(head.created);
    if (Number.isFinite(ms)) env.created = quantizeCreated(ms);
  }
  if (head.title) env.title = head.title;
  if (head.by) env.by = head.by;
  if (head.key && head.sig) ((env.key = head.key), (env.sig = head.sig));
  return env;
}

/** The bytes a signature covers: the app, the creation time, the body, and the title and the name, empty or not. */
export function signingMessage(app: string, created: number | null, body: string, title = '', by = ''): string {
  return `tinyoffice\n${app}\n${created === null ? '' : encodeCreated(created)}\n${body}\u0000${title}\u0000${by}`;
}

/** The message a document of this app signs, read from its text. */
export function messageOf(app: string, text: string): string {
  const env = readEnvelope(text);
  return signingMessage(app, env.created, env.body, env.title, env.by);
}
