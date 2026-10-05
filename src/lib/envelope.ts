/**
 * The envelope wraps an app's document body with metadata that every app
 * shares: when the document was created and, optionally, a signature.
 *
 * Inside the compressed text:
 *   c<created>      minutes since 2020-01-01T00:00Z, base 36
 *   k<public key>   base64url, optional
 *   s<signature>    base64url, optional
 *   <blank line>
 *   <body>
 *
 * Payloads carrying an envelope use the flags "Z" (deflated) and "R" (raw);
 * the lowercase flags from before envelopes existed decode as a bare body.
 */
import { packDoc, unpackDoc, toBase64Url, fromBase64Url } from './codec.ts';

export const CREATED_EPOCH_MS = Date.UTC(2020, 0, 1);

export interface Envelope {
  /** Creation time in ms since the Unix epoch, null for legacy links. */
  created: number | null;
  key?: string;
  sig?: string;
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
export function packEnvelope(env: Envelope): { flag: string; bytes: Uint8Array } {
  if (env.created === null && !env.key && !env.sig) return packDoc(env.body);
  const head: string[] = [];
  if (env.created !== null) head.push('c' + encodeCreated(env.created));
  if (env.key && env.sig) head.push('k' + env.key, 's' + env.sig);
  const { flag, bytes } = packDoc(head.join('\n') + '\n\n' + env.body);
  return { flag: flag.toUpperCase(), bytes };
}

export function encodeEnvelope(env: Envelope): string {
  if (!env.body && env.created === null && !env.key) return '';
  const { flag, bytes } = packEnvelope(env);
  return flag + toBase64Url(bytes);
}

export function unpackEnvelope(flag: string, bytes: Uint8Array): Envelope {
  if (flag !== 'Z' && flag !== 'R') {
    try {
      return { created: null, body: unpackDoc(flag, bytes) };
    } catch {
      return { created: null, body: '' };
    }
  }
  let text: string;
  try {
    text = unpackDoc(flag.toLowerCase(), bytes);
  } catch {
    return { created: null, body: '' };
  }
  const split = text.indexOf('\n\n');
  if (split < 0) return { created: null, body: '' };
  const env: Envelope = { created: null, body: text.slice(split + 2) };
  for (const line of text.slice(0, split).split('\n')) {
    const v = line.slice(1);
    if (line[0] === 'c') env.created = decodeCreated(v);
    else if (line[0] === 'k') env.key = v;
    else if (line[0] === 's') env.sig = v;
  }
  if (!env.key || !env.sig) delete env.key, delete env.sig;
  return env;
}

export function decodeEnvelope(payload: string): Envelope {
  if (!payload) return { created: null, body: '' };
  try {
    return unpackEnvelope(payload[0], fromBase64Url(payload.slice(1)));
  } catch {
    return { created: null, body: '' };
  }
}

/** The bytes a signature covers: the app, the creation time and the body. */
export function signingMessage(app: string, created: number | null, body: string): string {
  return `tinyoffice\n${app}\n${created === null ? '' : encodeCreated(created)}\n${body}`;
}
