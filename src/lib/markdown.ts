/**
 * Markdown in and out. Every document is TLO (lib/tlo.ts), which is
 * Markdown, so a document's Markdown is its own text, with its name in the
 * header; and Markdown (or a CSV) brought in is read the way the app reads
 * anything written loosely, by its `read`.
 */
import { appOf, type AppDef } from '../kit/core.ts';
import { DOC_KEYS } from './envelope.ts';
import { takeHead, withHead, write as writeTlo } from './tlo.ts';

/** The document as Markdown: its text, named in its header when it has a name. */
export function toMarkdown(_def: AppDef, body: string, title = ''): string {
  const text = title ? withHead(body, { title }) : body;
  return text.trim() ? text.trimEnd() + '\n' : '';
}

export function parseCsv(text: string): string[][] {
  const sep = text.split('\n')[0]?.includes('\t') ? '\t' : ',';
  const rows: string[][] = [];
  let row: string[] = [];
  let cell = '';
  let quoted = false;
  for (let i = 0; i < text.length; i++) {
    const c = text[i];
    if (quoted) {
      if (c === '"' && text[i + 1] === '"') (cell += '"'), i++;
      else if (c === '"') quoted = false;
      else cell += c;
    } else if (c === '"') quoted = true;
    else if (c === sep) row.push(cell), (cell = '');
    else if (c === '\n' || c === '\r') {
      if (c === '\r' && text[i + 1] === '\n') i++;
      row.push(cell);
      if (row.some((v) => v.trim())) rows.push(row);
      row = [];
      cell = '';
    } else cell += c;
  }
  row.push(cell);
  if (row.some((v) => v.trim())) rows.push(row);
  return rows;
}

/** Does this look like CSV rather than Markdown: no headings, lists or tables, and a separator on every line. */
export function looksLikeCsv(text: string): boolean {
  const lines = text.replace(/\r\n?/g, '\n').trim().split('\n');
  if (lines.length < 2 || lines.some((l) => /^(#|\s*[-*+]\s|\s*\d+[.)]\s|\||---)/.test(l))) return false;
  const sep = lines[0].includes('\t') ? '\t' : ',';
  const n = parseCsv(lines[0])[0]?.length ?? 0;
  return n >= 2 && lines.every((l) => l.includes(sep));
}

/** CSV as a Markdown table, its first row the names over the columns: the table a sheet is, and the way a table reads into any app. */
export function csvToMd(text: string): string {
  const rows = parseCsv(text.replace(/^﻿/, ''));
  if (!rows.length) return '';
  const w = Math.max(...rows.map((r) => r.length));
  const [head, ...rest] = rows.map((r) => Array.from({ length: w }, (_, i) => (r[i] ?? '').trim()));
  return writeTlo({ head: {}, blocks: [{ k: 'table', head, rows: rest }] }).trimEnd();
}

/**
 * Markdown as a model hands it over, unwrapped: Windows line ends, a code
 * fence around the whole of it ("```markdown"), spaces at the ends of
 * lines. The header stays: it is the document's.
 */
export function unwrapMarkdown(md: string): string {
  let t = md.replace(/\r\n?/g, '\n').replace(/[ \t]+$/gm, '').trim();
  const fence = /^```(?:markdown|md|tlo|text)?\n([\s\S]*?)\n?```$/i.exec(t);
  if (fence) t = fence[1].trim();
  return t;
}

/** Markdown or CSV as the document, read the way this kind of document reads anything written loosely. The envelope's keys (a name, an author) are the shell's, and are left out. */
export function fromMarkdown(def: AppDef, md: string): string {
  let text = unwrapMarkdown(md);
  if (looksLikeCsv(text)) text = csvToMd(text);
  [, text] = takeHead(text, DOC_KEYS);
  return def.read ? def.read(text) : text;
}

/**
 * A link written with ordinary parameters instead of a packed document
 * ("#title=Plan&doc=%23+Launch"): the document ("doc", or "md": the same) is
 * TLO read leniently, and its header may name the app, the title and the
 * author, as may the parameters. `pageApp` is the app whose page the link
 * is on, for when nothing else names one. Null when no app is named.
 */
export function readPlainLink(q: URLSearchParams, pageApp = ''): { def: AppDef; body: string; title?: string; by?: string; view: string } | null {
  const [head, text] = takeHead((q.get('doc') ?? q.get('md') ?? '').replace(/\r\n?/g, '\n'), DOC_KEYS);
  const def = appOf(q.get('app') ?? head.app ?? '') ?? appOf(pageApp);
  if (!def) return null;
  return { def, body: fromMarkdown(def, text), title: q.get('title')?.trim() || head.title || undefined, by: q.get('by')?.trim() || head.by || undefined, view: q.get('view') ?? '' };
}
