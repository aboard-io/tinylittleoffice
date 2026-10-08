/**
 * Markdown, both ways, for every app. Export is what a reader expects of
 * the kind of document: a text as a text, a deck as a heading a slide, a
 * table as a table, tasks as checkboxes, and for the apps written as lines
 * of a kind, a tidy mix of headings, lists and tables. Import is the same
 * read backwards, forgivingly.
 */
import { appOf, type AppDef } from '../kit/core.ts';
import { linkToRef, makeRef, resolve } from '../kit/embed.ts';
import { linkable, linkTarget, parseDoc, parseInline, serializeDoc, serializeInline, type Block, type Run } from './richtext.ts';
import { write as writeTlo } from './tlo.ts';

import { specOf } from './diagram.ts';
import { fieldsOf, kindsOf, readLines, writeLines, type Row } from './lines.ts';
import { formatOf } from './fold.ts';
import { mdToSite, siteToMd } from './sitemodel.ts';
import { takeHead, withHead } from './tlo.ts';

/* ---------- inline marks ---------- */

/** Runs as Markdown: **bold**, *italic*, ~~strike~~, ==highlight==, <u>underline</u>, :icon:. */
export function runsToMd(runs: Run[]): string {
  // Linked words: "[words](address)", their marks inside.
  if (runs.some((r) => r.href)) {
    let out = '';
    for (let i = 0; i < runs.length; ) {
      const href = runs[i].href;
      let j = i + 1;
      while (j < runs.length && runs[j].href === href) j++;
      const part = runs.slice(i, j).map(({ href: _, ...r }) => r);
      out += href ? `[${runsToMd(part)}](${linkTarget(href)})` : runsToMd(part);
      i = j;
    }
    return out;
  }
  return runs
    .map((r) => {
      if (r.ic) return `:${r.ic}:`;
      let t = r.t.replace(/([*_~=\\`])/g, '\\$1');
      if (r.b) t = `**${t}**`;
      if (r.i) t = `*${t}*`;
      if (r.s) t = `~~${t}~~`;
      if (r.h) t = `==${t}==`;
      if (r.u) t = `<u>${t}</u>`;
      return t;
    })
    .join('');
}

/** A line of Markdown as runs: the marks above, links as their words and address, code as plain words. */
export function mdToRuns(line: string): Run[] {
  const text = line
    .replace(/!\[([^\]]*)\]\([^)]*\)/g, '$1')
    // A link to somewhere a link may go stays one; any other keeps its words and address side by side.
    .replace(/\[([^\]]+)\]\(([^)\s]+)\)/g, (_, t, u) => (t.trim() === u.trim() ? u : linkable(u) ? `[${t}](${linkTarget(u)})` : `${t} ${u}`))
    .replace(/`([^`]+)`/g, '$1')
    .replace(/<u>(.*?)<\/u>/g, '^$1^')
    .replace(/~~(.+?)~~/g, '~$1~')
    .replace(/==(.+?)==/g, '=$1=')
    .replace(/\*\*(.+?)\*\*/g, '\u0001$1\u0001')
    .replace(/__(.+?)__/g, '\u0001$1\u0001')
    .replace(/(^|[\s(])\*(?!\s)(.+?)\*(?=[\s).,;:!?]|$)/g, '$1_$2_')
    .replace(/\u0001/g, '*');
  return parseInline(text);
}

/* ---------- a text ---------- */

export function docToMd(body: string): string {
  const out: string[] = [];
  const n: number[] = [];
  for (const b of parseDoc(body)) {
    const d = b.d ?? 0;
    if (b.k === 'ol') n[d] = (n[d] ?? 0) + 1;
    n.length = b.k === 'ol' ? d + 1 : b.k === 'ul' ? Math.min(n.length, d + 1) : 0;
    const words = runsToMd(b.runs);
    // (Markdown has one size of top heading: the title is it, and so is a heading.)
    if (b.k === 'title' || b.k === 'h1') out.push(`# ${words}`, '');
    else if (b.k === 'h2') out.push(`## ${words}`, '');
    else if (b.k === 'ul') out.push(`${'  '.repeat(d)}- ${words}`);
    else if (b.k === 'ol') out.push(`${'  '.repeat(d)}${n[d]}. ${words}`);
    else if (b.k === 'e') out.push('', `[${resolve(b.ref!).title}](${resolve(b.ref!).hash})`, '');
    else out.push(words, '');
  }
  return out.join('\n').replace(/\n{3,}/g, '\n\n').trim() + '\n';
}

export function mdToDoc(md: string): string {
  const blocks: Block[] = [];
  let para: string[] = [];
  const flush = () => {
    if (para.length) blocks.push({ k: 'p', runs: mdToRuns(para.join(' ')) });
    para = [];
  };
  for (const raw of md.split('\n')) {
    const line = raw.replace(/\s+$/, '');
    const h = /^(#{1,6})\s+(.*)$/.exec(line);
    const li = /^(\s*)([-*+]|\d+[.)])\s+(.*)$/.exec(line);
    const ref = linkToRef(line.replace(/^\[.*\]\((.*)\)$/, '$1'));
    if (!line.trim() || /^(-{3,}|\*{3,}|_{3,})$/.test(line.trim())) flush();
    else if (ref) {
      flush();
      blocks.push({ k: 'e', runs: [], ref });
    } else if (h) {
      flush();
      blocks.push({ k: h[1].length === 1 ? 'h1' : 'h2', runs: mdToRuns(h[2]) });
    } else if (li) {
      flush();
      const d = Math.min(3, Math.floor(li[1].replace(/\t/g, '  ').length / 2));
      const task = /^\[( |x|X)\]\s+(.*)$/.exec(li[3]);
      const b: Block = { k: /\d/.test(li[2]) ? 'ol' : 'ul', runs: mdToRuns(task ? `${task[1] === ' ' ? '☐ ' : '☑ '}${task[2]}` : li[3]) };
      if (d) b.d = d;
      blocks.push(b);
    } else para.push(line.replace(/^>\s?/, '').trim());
  }
  flush();
  return serializeDoc(blocks);
}

/* ---------- lines of a kind ---------- */

function linesToMd(id: string, body: string): string | null {
  const form = specOf(id)?.form;
  if (!form) return null;
  const rows = readLines(body, form);
  const { kinds } = kindsOf(form);
  const out: string[] = [];
  let i = 0;
  while (i < rows.length) {
    const r = rows[i];
    const k = kinds[r.kind];
    const fields = fieldsOf(form, r.kind);
    if (k.is.startsWith('# ')) out.push(`# ${r.values[0]}`, '');
    else if (k.is.startsWith('## ') || k.head) out.push(`## ${r.values[0]}`, '');
    else if (k.once) out.push(`**${k.name}:** ${r.values.filter(Boolean).join(' ')}`, '');
    else if (k.is === '') out.push('---', '');
    else if (fields.length === 1 && fields[0].type === 'icon') out.push(r.values[0] ? `:${r.values[0]}:` : '', '');
    else if (fields.length <= 1 || k.indent) out.push(`${'  '.repeat(r.depth)}- ${r.values.map((v, n) => (fields[n]?.type === 'icon' && v ? `:${v}:` : v)).filter(Boolean).join(' | ')}`);
    else {
      // Rows of the same kind in a run become one table, its columns the fields.
      let j = i;
      while (j < rows.length && rows[j].kind === r.kind) j++;
      const cell = (v: string) => v.replace(/\|/g, '\\|');
      out.push(`| ${fields.map((f) => f.name).join(' | ')} |`, `| ${fields.map(() => '---').join(' | ')} |`);
      for (const row of rows.slice(i, j)) out.push(`| ${fields.map((f, n) => cell(f.type === 'icon' && row.values[n] ? `:${row.values[n]}:` : (row.values[n] ?? ''))).join(' | ')} |`);
      out.push('');
      i = j;
      continue;
    }
    i++;
  }
  return out.join('\n').replace(/\n{3,}/g, '\n\n').trim() + '\n';
}

function mdToLines(id: string, md: string): string | null {
  const form = specOf(id)?.form;
  if (!form) return null;
  const { kinds } = kindsOf(form);
  const find = (test: (k: (typeof kinds)[number], n: number) => boolean) => kinds.findIndex((k, n) => n < form.length && test(k, n));
  const titleKind = find((k) => k.is.startsWith('# '));
  const sectionKind = find((k) => k.is.startsWith('## ') || !!k.head);
  const divider = find((k) => k.is === '');
  const plain = (k: (typeof kinds)[number]) => !k.once && k.is !== '' && !k.is.startsWith('#') && !k.head;
  const iconKind = find((k, n) => plain(k) && fieldsOf(form, n).length === 1 && fieldsOf(form, n)[0].type === 'icon');
  const bulletKind = find((k, n) => plain(k) && fieldsOf(form, n).some((f) => f.type !== 'icon') && (fieldsOf(form, n).filter((f) => f.type !== 'icon').length <= 1 || !!k.indent));
  const rows: Row[] = [];
  const lines = md.split('\n');
  for (let i = 0; i < lines.length; i++) {
    const line = lines[i].replace(/\s+$/, '');
    const h = /^(#{1,6})\s+(.*)$/.exec(line);
    const li = /^(\s*)[-*+]\s+(.*)$/.exec(line);
    const set = /^\*\*([^*]+):\*\*\s*(.*)$/.exec(line);
    if (!line.trim()) continue;
    if (/^\|.*\|$/.test(line) && /^\|[\s:|-]+\|$/.test(lines[i + 1] ?? '')) {
      // A table: the kind whose fields the header names, else the one with as many fields.
      const heads = line.slice(1, -1).split('|').map((c) => c.trim().toLowerCase());
      let kind = find((_, n) => fieldsOf(form, n).map((f) => f.name.toLowerCase()).join('|') === heads.join('|'));
      if (kind < 0) kind = find((k, n) => !k.once && fieldsOf(form, n).length === heads.length);
      i += 2;
      for (; i < lines.length && /^\|.*\|$/.test(lines[i]); i++) {
        if (kind < 0) continue;
        const cells = lines[i].slice(1, -1).split(/(?<!\\)\|/).map((c) => c.trim().replace(/\\\|/g, '|'));
        const fields = fieldsOf(form, kind);
        rows.push({ kind, values: fields.map((f, n) => (f.type === 'icon' ? (cells[n] ?? '').replace(/^:|:$/g, '') : (cells[n] ?? ''))), depth: kinds[kind].at ?? 0 });
      }
      i--;
    } else if (h && h[1].length === 1 && titleKind >= 0) rows.push({ kind: titleKind, values: [h[2]], depth: 0 });
    else if (h && sectionKind >= 0) rows.push({ kind: sectionKind, values: [h[2]], depth: 0 });
    else if (h && titleKind >= 0 && !rows.some((r) => r.kind === titleKind)) rows.push({ kind: titleKind, values: [h[2]], depth: 0 });
    else if (set && find((k) => !!k.once && k.name.toLowerCase() === set[1].trim().toLowerCase()) >= 0) {
      const kind = find((k) => !!k.once && k.name.toLowerCase() === set[1].trim().toLowerCase());
      rows.push({ kind, values: fieldsOf(form, kind).map((_, n) => (n === 0 ? set[2] : '')), depth: 0 });
    } else if (/^(-{3,}|\*{3,})$/.test(line.trim()) && divider >= 0) rows.push({ kind: divider, values: [], depth: 0 });
    else if (iconKind >= 0 && /^:([a-z][a-z0-9-]*):$/.test((li ? li[2] : line).trim())) rows.push({ kind: iconKind, values: [(li ? li[2] : line).trim().slice(1, -1)], depth: 0 });
    else if (bulletKind >= 0) {
      const words = li ? li[2] : line.trim();
      const depth = li ? Math.min(6, Math.floor(li[1].replace(/\t/g, '  ').length / 2)) : 0;
      const fields = fieldsOf(form, bulletKind);
      const parts = words.split(' | ').map((p) => p.trim());
      const icon = /^:([a-z][a-z0-9-]*):$/.exec(parts[0] ?? '');
      if (icon) parts.shift();
      const values = fields.map((f) => (f.type === 'icon' ? (icon?.[1] ?? '') : f.type === 'choice' ? f.options[0] : (parts.shift() ?? '')));
      rows.push({ kind: bulletKind, values, depth: kinds[bulletKind].indent ? depth : (kinds[bulletKind].at ?? 0) });
    }
  }
  return writeLines(rows, form);
}

/* ---------- the rest ---------- */

const tableMd = (head: string[], body: string[][]) => [`| ${head.join(' | ')} |`, `| ${head.map(() => '---').join(' | ')} |`, ...body.map((r) => `| ${r.map((c) => c.replace(/\|/g, '\\|')).join(' | ')} |`)].join('\n') + '\n';
const tableRows = (md: string): string[][] => {
  const rows = md.split('\n').filter((l) => /^\|.*\|$/.test(l.trim()) && !/^\|[\s:|-]+\|$/.test(l.trim()));
  return rows.map((l) => l.trim().slice(1, -1).split(/(?<!\\)\|/).map((c) => c.trim().replace(/\\\|/g, '|')));
};
const items = (md: string) => md.split('\n').map((l) => /^\s*(?:[-*+]|\d+[.)])\s+(.*)$/.exec(l)?.[1] ?? (l.trim() && !/^#/.test(l.trim()) && !/^\|/.test(l.trim()) ? l.trim() : null)).filter((l): l is string => !!l);

/** The document as Markdown, as a reader of that kind of document would want it. */
export function toMarkdown(def: AppDef, body: string, title = ''): string {
  const name = title || def.title(body);
  switch (def.id) {
    // The document is Markdown already (TLO).
    case 'calc':
    case 'flow':
    case 'adventure':
    case 'hunt':
    case 'trivia':
    case 'madlibs':
    case 'spinner':
    case 'flashcards':
    case 'poll':
    case 'santa':
    case 'split':
    case 'log':
      return body.trimEnd() + '\n';
    case 'write':
      return docToMd(body);
    case 'outline':
    case 'mind':
    case 'org':
    case 'family':
      // A tree is a nested list already: its text is its Markdown.
      return body.trimEnd() + '\n';
    // A sheet and a picture in pixels are already Markdown: a table, and lines of letters.
    case 'sheet':
    case 'pixel':
      return body.trim() ? body.trimEnd() + '\n' : '';
    case 'todo':
    case 'board':
    case 'gantt':
    case 'trip':
    case 'cal':
      // Written as TLO, which is Markdown: the document as it stands.
      return body ? body.trimEnd() + '\n' : '';
    case 'draw':
    case 'anim':
    case 'lanes':
    case 'venn':
    case 'net':
    case 'floor':
    case 'seating':
    case 'timeline':
    case 'db':
      // The document is Markdown already (TLO): its text is its Markdown.
      return body.trimEnd() + '\n';
    case 'qr':
      return body.trim() + '\n';
    case 'site':
      return siteToMd(body);
  }
  // A deck and the printed things are Markdown as they stand.
  if (def.id === 'deck' || formatOf(def.id)) return body;
  return linesToMd(def.id, body) ?? `# ${name}\n\n${def.outline(body).map((l) => `- ${l}`).join('\n')}\n`;
}

/** CSV (quoted fields, commas or tabs) as rows of cells. */
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
  if (lines.length < 2 || lines.some((l) => /^(#|\s*[-*+]\s|\s*\d+[.)]\s|\|)/.test(l))) return false;
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
  return writeTlo({ head: {}, blocks: [{ k: 'table', head, rows: rest }] });
}

/** Markdown as the document, read forgivingly: what fits the kind of document is kept, the rest becomes words. */
/**
 * Markdown as a model hands it over, unwrapped: Windows line ends, a code
 * fence around the whole of it ("```markdown"), front matter, spaces at the
 * ends of lines. What is left is what was meant.
 */
export function unwrapMarkdown(md: string): string {
  let t = md.replace(/\r\n?/g, '\n').replace(/[ \t]+$/gm, '').trim();
  const fence = /^```(?:markdown|md|text)?\n([\s\S]*?)\n?```$/i.exec(t);
  if (fence) t = fence[1].trim();
  const front = /^---\n[\s\S]*?\n---\n/.exec(t);
  if (front) t = t.slice(front[0].length).trim();
  return t;
}

/** The header at the top of Markdown as a model hands it over, inside a fence or not; '' without one. */
const frontMatter = (md: string) => /^(?:```\w*\n)?(---\n[\s\S]*?\n---\n)/.exec(md.replace(/\r\n?/g, '\n').replace(/[ \t]+$/gm, '').trim())?.[1] ?? '';

export function fromMarkdown(def: AppDef, md: string): string {
  // A deck and the printed things read Markdown themselves, their header (the settings) and all.
  if (def.id === 'deck' || formatOf(def.id)) return def.read!(md.replace(/\r\n?/g, '\n').trim().replace(/^```(?:markdown|md|text)?\n([\s\S]*?)\n?```$/i, '$1'));
  const plain = unwrapMarkdown(md);
  const text = (looksLikeCsv(plain) ? csvToMd(plain) : plain).trim();
  switch (def.id) {
    case 'calc':
      // (Unwrapping took the header off, and with it the mode.)
      return def.read!(withHead(text, takeHead(md.replace(/\r\n?/g, '\n').trim(), ['mode'])[0]));
    case 'flow':
    case 'adventure':
    case 'hunt':
    case 'trivia':
    case 'madlibs':
    case 'spinner':
    case 'flashcards':
    case 'poll':
    case 'santa':
    case 'split':
    case 'log':
      return def.read!(text);
    case 'write':
      return mdToDoc(text);
    case 'outline':
    case 'mind':
    case 'org':
    case 'family':
      return def.read!(text);
    case 'sheet':
      // As written, header and all: the sheet's chart is in it.
      return def.read!(md);
    case 'todo':
    case 'board':
    case 'gantt':
    case 'trip':
    case 'cal':
      // The app's own read makes what was written canonical, with the header (a zone, the units) that unwrapping took off.
      return def.read!(frontMatter(md) + text);
    case 'draw':
    case 'anim':
    case 'lanes':
    case 'venn':
    case 'net':
    case 'floor':
    case 'seating':
    case 'timeline':
    case 'db':
      // (Unwrapping takes front matter off; here it is the document's header, its alt text and settings, and stays.)
      return def.read!((/^---\n[\s\S]*?\n---\n/.exec(md.replace(/\r\n?/g, '\n').trim())?.[0] ?? '') + text);
    case 'pixel':
      return def.read!(text);
    case 'qr':
      return items(text)[0] ?? text.split('\n')[0] ?? '';
    case 'site':
      return mdToSite(text);
  }
  const lines = mdToLines(def.id, text);
  if (lines !== null) return lines;
  return def.read ? def.read(items(text).join('\n')) : text;
}
export { appOf, makeRef };
