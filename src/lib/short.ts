/**
 * A shorter link, from tinier.tinylittleoffice.com, that expires. The long
 * link is encrypted here with a key kept in the short link's fragment, which
 * browsers never send; the server holds only the ciphertext, and only until
 * the time chosen. The one thing it learns is that a link was made.
 */
import { toBase64Url, fromBase64Url } from './codec.ts';

// The dev server sets VITE_TINIER (.env.development) to its own /tinier/, which it hands on to `npm run tinier:dev`.
const local = import.meta.env?.VITE_TINIER as string | undefined;
export const TINIER = local ? new URL(local, location.href).href : 'https://tinier.tinylittleoffice.com/';
export const EXPIRIES: { seconds: number; name: string }[] = [
  { seconds: 3600, name: 'An hour' },
  { seconds: 86400, name: 'A day' },
  { seconds: 7 * 86400, name: 'A week' },
  { seconds: 30 * 86400, name: 'A month' },
];

export async function shorten(link: string, seconds: number, at = TINIER): Promise<{ short: string; expires: number }> {
  const raw = crypto.getRandomValues(new Uint8Array(32)); // AES-256
  const iv = crypto.getRandomValues(new Uint8Array(12));
  const key = await crypto.subtle.importKey('raw', raw, 'AES-GCM', false, ['encrypt']);
  const c = new Uint8Array(await crypto.subtle.encrypt({ name: 'AES-GCM', iv }, key, new TextEncoder().encode(link)));
  const res = await fetch(at + 'api', { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify({ c: toBase64Url(c), iv: toBase64Url(iv), ttl: seconds }) });
  if (!res.ok) throw new Error(res.status === 429 ? 'Too many short links from here this hour.' : 'Could not shorten the link.');
  const { id, exp } = (await res.json()) as { id: string; exp: number };
  return { short: `${at}${id}#${toBase64Url(raw)}`, expires: exp };
}

/** For tests and the page: open a short link's ciphertext with its key. */
export async function unshorten(c: string, iv: string, key: string): Promise<string> {
  const buf = (s: string) => Uint8Array.from(fromBase64Url(s)) as Uint8Array<ArrayBuffer>;
  const k = await crypto.subtle.importKey('raw', buf(key), 'AES-GCM', false, ['decrypt']);
  return new TextDecoder().decode(await crypto.subtle.decrypt({ name: 'AES-GCM', iv: buf(iv) }, k, buf(c)));
}
