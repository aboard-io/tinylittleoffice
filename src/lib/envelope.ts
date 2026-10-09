/**
 * The envelope: what every document carries besides its own words, kept in
 * the header of its TLO text (lib/tlo.ts), beside the app's own settings:
 *
 *   ---
 *   title: Q3 budget          the document's name, optional
 *   by: forecast-agent        who made it (a person, or an agent's name), optional
 *   created: 2026-10-05T14:32Z  when, to the minute, optional
 *   key: <public key>         base64url, with a signature, optional
 *   sig: <signature>
 *   chart: bar                (the app's own settings stay where they are)
 *   ---
 *   <the document>
 *
 * The payload is the codec's flag (see lib/codec.ts) and the packed text.
 * A document with none of these is its text alone.
 */
import { decodeDoc, encodeDoc, packDoc, unpackDoc } from './codec.ts';
import { splitHead, takeHead, writeHead } from './tlo.ts';

export const CREATED_EPOCH_MS = Date.UTC(2020, 0, 1);

export interface Envelope {
  /** Creation time in ms since the Unix epoch, null when it was never set (a document from a program, say). */
  created: number | null;
  key?: string;
  sig?: string;
  /** The name its author gave the document. */
  title?: string;
  /** Who made it: a name, for provenance when agents and people pass documents about. Proven only by a signature. */
  by?: string;
  body: string;
}

export function encodeCreated(ms: number): string {
  return Math.max(0, Math.round((ms - CREATED_EPOCH_MS) / 60000)).toString(36);
}

/** The instant as it will read back from the URL: minute precision. */
export function quantizeCreated(ms: number): number {
  return decodeCreated(encodeCreated(ms)) ?? CREATED_EPOCH_MS;
}

export function decodeCreated(s: string): number | null {
  const n = parseInt(s, 36);
  return Number.isFinite(n) && n >= 0 ? CREATED_EPOCH_MS + n * 60000 : null;
}

const SHELL = ['title', 'by', 'created', 'key', 'sig'];
/** The header keys that belong to the document rather than its app: which app opens it, and the envelope's. */
export const DOC_KEYS = ['app', ...SHELL];

/** When, as the header writes it: "2026-10-05T14:32Z". */
const isoMinute = (ms: number) => new Date(quantizeCreated(ms)).toISOString().slice(0, 16) + 'Z';

/** The whole text of a document: its envelope's keys in its header, then its own text. */
export function envelopeText(env: Envelope): string {
  const keys: Record<string, string> = {};
  if (env.title) keys.title = env.title.replace(/\n/g, ' ');
  if (env.by) keys.by = env.by.replace(/\n/g, ' ');
  if (env.created !== null) keys.created = isoMinute(env.created);
  if (env.key && env.sig) (keys.key = env.key), (keys.sig = env.sig);
  if (!Object.keys(keys).length) return env.body;
  // The envelope's keys go first, the app's own settings after them.
  const [own, rest] = splitHead(env.body);
  return writeHead({ ...keys, ...own }) + rest;
}

/** A document's text read into its envelope: the header's envelope keys taken out, everything else its own. */
export function readEnvelope(text: string): Envelope {
  const [head, body] = takeHead(text, SHELL);
  const env: Envelope = { created: null, body };
  if (head.created) {
    const ms = Date.parse(head.created);
    if (Number.isFinite(ms)) env.created = quantizeCreated(ms);
  }
  if (head.title) env.title = head.title;
  if (head.by) env.by = head.by;
  if (head.key && head.sig) (env.key = head.key), (env.sig = head.sig);
  return env;
}

export function packEnvelope(env: Envelope): { flag: string; bytes: Uint8Array } {
  return packDoc(envelopeText(env));
}

export function unpackEnvelope(flag: string, bytes: Uint8Array): Envelope {
  try {
    return readEnvelope(unpackDoc(flag, bytes));
  } catch {
    return { created: null, body: '' };
  }
}

// (A link is read the same whatever its app; some callers still name it.)
export const encodeEnvelope = (env: Envelope): string => encodeDoc(envelopeText(env));
/** A payload's document; an empty one for anything unreadable. */
export const decodeEnvelope = (payload: string): Envelope => readEnvelope(decodeDoc(payload));

/** The bytes a signature covers: the app, the creation time, the body, and the title and author when there are any. */
export function signingMessage(app: string, created: number | null, body: string, title = '', by = ''): string {
  return `tinyoffice\n${app}\n${created === null ? '' : encodeCreated(created)}\n${body}\u0000${title}\u0000${by}`;
}
