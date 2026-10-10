// What a file of a type begins with: the check that a format built bytes of the type it says (test/formats.test.ts,
// test/browser/formats.test.ts).
const head = (b: Uint8Array, n: number) => String.fromCharCode(...b.slice(0, n));

export function looksLike(mime: string, out: Uint8Array | string): boolean {
  const bytes = typeof out === 'string' ? new TextEncoder().encode(out) : out;
  const base = mime.split(';')[0];
  // A blank document's text may be no words at all; every other file has a beginning of its kind.
  if (!bytes.length) return /^text\/(plain|markdown|csv)$/.test(base);
  const text = new TextDecoder().decode(bytes).replace(/^﻿/, '');
  if (base === 'application/pdf') return head(bytes, 5) === '%PDF-';
  if (base === 'image/png') return head(bytes, 4) === '\x89PNG';
  if (base === 'image/gif') return head(bytes, 4) === 'GIF8';
  if (base === 'application/zip' || base.startsWith('application/vnd.openxmlformats')) return head(bytes, 2) === 'PK';
  if (base === 'image/svg+xml') return /<svg[\s>]/.test(text);
  if (base === 'text/html') return /^<!doctype html>/i.test(text.trimStart());
  if (base === 'application/rtf') return text.startsWith('{\\rtf');
  if (base === 'text/calendar') return text.startsWith('BEGIN:VCALENDAR');
  if (base === 'application/geo+json') return !!JSON.parse(text);
  if (/xml/.test(base)) return text.trimStart().startsWith('<?xml');
  // A text: words, and no stray decoding.
  return base.startsWith('text/') && !text.includes('�');
}
