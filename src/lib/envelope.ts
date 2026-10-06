/**
 * The envelope wraps an app's document body with metadata that every app
 * shares: when the document was created and, optionally, a signature.
 *
 * Inside the compressed text:
 *   c<created>      minutes since 2020-01-01T00:00Z, base 36
 *   t<title>        the document's name, optional
 *   b<by>           who made it (a person, or an agent's name), optional
 *   k<public key>   base64url, optional
 *   s<signature>    base64url, optional
 *   <blank line>
 *   <body>
 *
 * Payloads carrying an envelope use the codec's flags in capitals: "W", "Y"
 * (deflated against the dictionary), "Z" (deflated) and "R" (raw). The
 * lowercase flags from before envelopes existed decode as a bare body.
 */
import { packDoc, unpackDoc, toBase64Url, fromBase64Url } from './codec.ts';

export const CREATED_EPOCH_MS = Date.UTC(2020, 0, 1);

export interface Envelope {
  /** Creation time in ms since the Unix epoch, null for legacy links. */
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

/** Envelope as a one-character flag plus bytes; the flag is uppercase when an envelope is present. */
export function packEnvelope(env: Envelope, app?: string): { flag: string; bytes: Uint8Array } {
  if (env.created === null && !env.key && !env.sig && !env.title && !env.by) return packDoc(env.body, app);
  const head: string[] = [];
  if (env.created !== null) head.push('c' + encodeCreated(env.created));
  if (env.title) head.push('t' + env.title.replace(/\n/g, ' '));
  if (env.by) head.push('b' + env.by.replace(/\n/g, ' '));
  if (env.key && env.sig) head.push('k' + env.key, 's' + env.sig);
  const { flag, bytes } = packDoc(head.join('\n') + '\n\n' + env.body, app);
  return { flag: flag.toUpperCase(), bytes };
}

export function encodeEnvelope(env: Envelope, app?: string): string {
  if (!env.body && env.created === null && !env.key && !env.title && !env.by) return '';
  const { flag, bytes } = packEnvelope(env, app);
  return flag + toBase64Url(bytes);
}

export function unpackEnvelope(flag: string, bytes: Uint8Array, app?: string): Envelope {
  if (flag !== 'W' && flag !== 'Y' && flag !== 'Z' && flag !== 'R') {
    try {
      return { created: null, body: unpackDoc(flag, bytes, app) };
    } catch {
      return { created: null, body: '' };
    }
  }
  let text: string;
  try {
    text = unpackDoc(flag.toLowerCase(), bytes, app);
  } catch {
    return { created: null, body: '' };
  }
  const split = text.indexOf('\n\n');
  if (split < 0) return { created: null, body: '' };
  const env: Envelope = { created: null, body: text.slice(split + 2) };
  for (const line of text.slice(0, split).split('\n')) {
    const v = line.slice(1);
    if (line[0] === 'c') env.created = decodeCreated(v);
    else if (line[0] === 't' && v) env.title = v;
    else if (line[0] === 'b' && v) env.by = v;
    else if (line[0] === 'k') env.key = v;
    else if (line[0] === 's') env.sig = v;
  }
  if (!env.key || !env.sig) delete env.key, delete env.sig;
  return env;
}

export function decodeEnvelope(payload: string, app?: string): Envelope {
  if (!payload) return { created: null, body: '' };
  try {
    return unpackEnvelope(payload[0], fromBase64Url(payload.slice(1)), app);
  } catch {
    return { created: null, body: '' };
  }
}

/** The bytes a signature covers: the app, the creation time, the body, and the title and author when there are any. */
export function signingMessage(app: string, created: number | null, body: string, title = '', by = ''): string {
  // (A title and author are signed when there are any; documents signed before they existed still verify.)
  return `tinyoffice\n${app}\n${created === null ? '' : encodeCreated(created)}\n${body}${title || by ? '\u0000' + title : ''}${by ? '\u0000' + by : ''}`;
}
