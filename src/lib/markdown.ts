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
import { parseDeck, serializeDeck, type Slide } from './deckmodel.ts';
import { parseGrid, serializeGrid, chartOf, typesOf } from './formula.ts';
import { parseTodos, serializeTodos } from './todomodel.ts';
import { parseBoard, serializeBoard } from './boardmodel.ts';
import { parseGantt } from './ganttmodel.ts';
import { parseTrip } from './tripmodel.ts';
import { parseCalendar, repeatText, EPOCH_DAY, EPOCH_MS, isoDay, type Span as CalSpan } from './calmodel.ts';
import { altOf, parseDrawing, serializeDrawing, withAlt, type Shape } from './drawmodel.ts';
import { parseAnim, serializeAnim, restKey, DEFAULT_FRAMES, W, H } from './animmodel.ts';
import { specOf } from './diagram.ts';
import { fieldsOf, kindsOf, readLines, writeLines, type Row } from './lines.ts';
import { dayToYmd, ymdString, ymdToDay, utcToParts, pad2 } from './tz.ts';
import { formatOf, parseFold, serializeFold } from './fold.ts';
import { mdToSite, siteToMd } from './sitemodel.ts';
import { FIELDS, MODES, evaluate, inputs, parseCalc, serializeCalc, shown, withDefaults } from './calc.ts';

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
const mdLine = (line: string) => serializeInline(mdToRuns(line));

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

/* ---------- slides and pages ---------- */

function slidesToMd(slides: Slide[], title: string): string {
  const out: string[] = title ? [`# ${title}`, ''] : [];
  slides.forEach((s, i) => {
    out.push(`## ${s.title.trim() ? runsToMd(parseInline(s.title)) : `Slide ${i + 1}`}${s.icon ? ` :${s.icon}:` : ''}`, '');
    for (const b of [...s.bullets, ...(s.right ?? [])]) {
      if (!b.trim()) continue;
      const depth = Math.min(3, Math.floor(/^[ \t]*/.exec(b)![0].replace(/\t/g, '  ').length / 2));
      out.push(`${'  '.repeat(depth)}- ${runsToMd(parseInline(b.trim()))}`);
    }
    if (s.sub) out.push('', `[${resolve(s.sub).title}](${resolve(s.sub).hash})`);
    out.push('');
  });
  return out.join('\n').replace(/\n{3,}/g, '\n\n').trim() + '\n';
}

function mdToSlides(md: string): Slide[] {
  const slides: Slide[] = [];
  let cur: Slide | null = null;
  let first = true;
  for (const raw of md.split('\n')) {
    const line = raw.replace(/\s+$/, '');
    const h = /^(#{1,6})\s+(.*)$/.exec(line);
    const li = /^(\s*)[-*+]\s+(.*)$/.exec(line) ?? /^(\s*)\d+[.)]\s+(.*)$/.exec(line);
    const ref = linkToRef(line.replace(/^\[.*\]\((.*)\)$/, '$1'));
    if (h) {
      // A lone top heading before any slide is the deck's title slide.
      const words = h[2].replace(/\s+:([a-z0-9-]+):\s*$/, (_, ic) => ((cur = cur), (pendingIcon = ic), ''));
      cur = { icon: pendingIcon, title: mdLine(words), bullets: [] };
      pendingIcon = '';
      if (first && h[1].length === 1) cur.layout = 't';
      first = false;
      slides.push(cur);
    } else if (ref && cur) cur.sub = ref;
    else if (li) {
      if (!cur) slides.push((cur = { icon: '', title: '', bullets: [] }));
      cur.bullets.push('  '.repeat(Math.min(3, Math.floor(li[1].replace(/\t/g, '  ').length / 2))) + mdLine(li[2]));
    } else if (line.trim()) {
      if (!cur) slides.push((cur = { icon: '', title: '', bullets: [] }));
      cur.bullets.push(mdLine(line.trim()));
    }
  }
  return slides.length ? slides : [{ icon: '', title: '', bullets: [] }];
}
let pendingIcon = '';

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
/** A quoted line ("> ..."): a picture's alt text, in Markdown. */
const QUOTE = /^>\s?.*$/gm;
const quoted = (md: string) => (/^>\s?(.*)$/m.exec(md)?.[1] ?? '').trim();
const items = (md: string) => md.split('\n').map((l) => /^\s*(?:[-*+]|\d+[.)])\s+(.*)$/.exec(l)?.[1] ?? (l.trim() && !/^#/.test(l.trim()) && !/^\|/.test(l.trim()) ? l.trim() : null)).filter((l): l is string => !!l);

/** The document as Markdown, as a reader of that kind of document would want it. */
export function toMarkdown(def: AppDef, body: string, title = ''): string {
  const name = title || def.title(body);
  switch (def.id) {
    case 'calc': {
      // The mode as a heading; then each value by its name, each expression with what it comes to, or each curve.
      const c = parseCalc(body);
      const head = `## ${MODES.find((m) => m.id === c.mode)!.name}\n\n`;
      const lines = c.lines.filter((l) => l.trim());
      if (c.mode === 'calc') return head + lines.map((l) => `- ${l} = ${shown(evaluate(l))}`).join('\n') + '\n';
      if (c.mode === 'graph') return head + lines.map((l) => `- y = ${l}`).join('\n') + '\n';
      const v = withDefaults(c.mode, inputs(c.lines));
      const years = Object.keys(v).filter((k) => /^year \d+$/.test(k));
      return head + [...FIELDS[c.mode].map((f) => `- ${f.name}: ${v[f.key]}${f.unit ? ' ' + f.unit : ''}`), ...years.map((k) => `- ${k[0].toUpperCase() + k.slice(1)}: ${v[k]}`)].join('\n') + '\n';
    }
    case 'write':
      return docToMd(body);
    case 'outline':
    case 'mind':
    case 'org':
    case 'family':
      // A tree is a nested list already: its text is its Markdown.
      return body.trimEnd() + '\n';
    case 'deck':
      return slidesToMd(parseDeck(body), '');
    case 'sheet': {
      const grid = parseGrid(body).map((r) => r.slice());
      while (grid.length && grid[grid.length - 1].every((v) => !v)) grid.pop();
      if (!grid.length) return '';
      const w = Math.max(1, ...grid.map((r) => r.reduce((n, v, i) => (v ? i + 1 : n), 0)));
      const [head, ...rest] = grid.map((r) => Array.from({ length: w }, (_, i) => r[i] ?? ''));
      return (name ? `# ${name}\n\n` : '') + tableMd(head, rest);
    }
    case 'todo':
      return parseTodos(body).map((t) => `- [${t.done ? 'x' : ' '}] ${t.star ? '**' + t.text + '**' : t.text}${t.due !== null ? ` (due ${isoDay(t.due)})` : ''}`).join('\n') + '\n';
    case 'board':
      return parseBoard(body).map((s) => `## ${s.name}${s.limit ? ` (limit ${s.limit})` : ''}\n\n${s.cards.map((c) => `- ${c}`).join('\n')}\n`).join('\n');
    case 'gantt':
      return tableMd(['Task', 'Start', 'Days', 'Done'], parseGantt(body).map((t) => [`${'  '.repeat(t.depth ?? 0)}${t.label}`, ymdString(...(({ y, m, d }) => [y, m, d] as [number, number, number])(dayToYmd(EPOCH_DAY + t.start))), String(t.days), `${t.done}%`]));
    case 'trip':
      return parseTrip(body).map((s, i) => `${i + 1}. ${s.name || `Stop ${i + 1}`} (${s.lat.toFixed(4)}, ${s.lon.toFixed(4)})${s.note ? `  \n   ${s.note}` : ''}`).join('\n') + '\n';
    case 'cal': {
      const cal = parseCalendar(body);
      // A repeat goes after the label, the way the calendar reads it back ("Standup every week, 9 times").
      const label = (s: CalSpan) => s.label + (s.repeat ? ` ${repeatText(s.repeat)}` : '');
      // Times in the document's own zone (named at the top), the way the calendar reads them back.
      const zone = cal.zone || 'UTC';
      const clock = (min: number) => {
        const p = utcToParts(EPOCH_MS + min * 60000, zone);
        return { day: ymdString(p.y, p.m, p.d), time: `${pad2(p.h)}:${pad2(p.min)}` };
      };
      const timed = cal.spans.some((s) => s.kind === 't');
      return (cal.zone || timed ? `Time zone: ${zone}\n\n` : '') + cal.spans.map((s) => {
        if (s.kind === 'd') return `- ${isoDay(s.start)}${s.dur > 1 ? ` to ${isoDay(s.start + s.dur - 1)}` : ''}: ${label(s)}`;
        const [a, b] = [clock(s.start), clock(s.start + s.dur)];
        return `- ${a.day} ${a.time}-${b.time}: ${label(s)}`;
      }).join('\n') + '\n';
    }
    case 'draw':
      // The alt text goes first, quoted; then the labels.
      return (altOf(body) ? `> ${altOf(body)}\n\n` : '') + parseDrawing(body).filter((s) => s.text).map((s) => `- ${s.text}`).join('\n') + '\n';
    case 'pixel':
      return '```\n' + body + '\n```\n';
    case 'anim':
      return (parseAnim(body).alt ? `> ${parseAnim(body).alt}\n\n` : '') + parseAnim(body).shapes.filter((s) => s.text).map((s) => `- ${s.k === 'i' ? `:${s.text}:` : s.text}`).join('\n') + '\n';
    case 'qr':
      return body.trim() + '\n';
    case 'site':
      return siteToMd(body);
  }
  if (formatOf(def.id)) {
    const f = formatOf(def.id)!;
    return slidesToMd(parseFold(body, f).pages, '');
  }
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

/** CSV as a Markdown table, so it reads the way a table reads into any app. */
export function csvToMd(text: string): string {
  const rows = parseCsv(text.replace(/^﻿/, ''));
  if (!rows.length) return '';
  const w = Math.max(...rows.map((r) => r.length));
  const [head, ...rest] = rows.map((r) => Array.from({ length: w }, (_, i) => (r[i] ?? '').trim()));
  return tableMd(head, rest);
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

export function fromMarkdown(def: AppDef, md: string): string {
  const plain = unwrapMarkdown(md);
  const text = (looksLikeCsv(plain) ? csvToMd(plain) : plain).trim();
  switch (def.id) {
    case 'calc': {
      // A heading names the mode; list items are "Name: value" for the money modes, "expression = result" or "y = curve" otherwise.
      const heading = /^#+\s*(.+)$/m.exec(text)?.[1].trim().toLowerCase();
      const mode = MODES.find((m) => m.name.toLowerCase() === heading || m.id === heading)?.id ?? 'calc';
      const lines = items(text);
      if (mode === 'calc') return serializeCalc({ mode, lines: lines.map((l) => l.replace(/\s*=\s*[^=]*$/, '')) });
      if (mode === 'graph') return serializeCalc({ mode, lines: lines.map((l) => l.replace(/^y\s*=\s*/i, '')) });
      const fields = FIELDS[mode];
      return serializeCalc({
        mode,
        lines: lines.flatMap((l) => {
          const m = /^([^:=]+?)\s*[:=]\s*(-?[\d.,]+)/.exec(l);
          if (!m) return [];
          const key = fields.find((f) => f.name.toLowerCase() === m[1].trim().toLowerCase() || f.key === m[1].trim().toLowerCase())?.key ?? (/^year \d+$/i.test(m[1].trim()) ? m[1].trim().toLowerCase() : '');
          return key ? [`${key} = ${m[2].replace(/,/g, '')}`] : [];
        }),
      });
    }
    case 'write':
      return mdToDoc(text);
    case 'outline':
    case 'mind':
    case 'org':
    case 'family':
      return def.read!(text);
    case 'deck':
      return serializeDeck(mdToSlides(text));
    case 'sheet': {
      const rows = tableRows(text);
      const grid = rows.length ? rows : text.split('\n').filter((l) => l.trim()).map((l) => l.split(/\t|,\s*/));
      return serializeGrid(grid, chartOf(''), typesOf(''));
    }
    case 'todo':
      return serializeTodos(
        items(text).map((l) => {
          const m = /^\[( |x|X)\]\s*(.*)$/.exec(l);
          const due = /\(due (\d{4}-\d\d-\d\d)\)\s*$/.exec(m?.[2] ?? l);
          const words = (m?.[2] ?? l).replace(/\(due \d{4}-\d\d-\d\d\)\s*$/, '').trim();
          const star = /^\*\*(.*)\*\*$/.exec(words);
          return { text: star ? star[1] : words, done: !!m && m[1] !== ' ', star: !!star, due: due ? Math.round((Date.UTC(+due[1].slice(0, 4), +due[1].slice(5, 7) - 1, +due[1].slice(8, 10)) - Date.UTC(2020, 0, 1)) / 864e5) : null };
        }),
      );
    case 'board': {
      const stages: { name: string; limit: number; cards: string[] }[] = [];
      for (const raw of text.split('\n')) {
        const h = /^#{1,6}\s+(.*?)(?:\s*\(limit (\d+)\))?\s*$/.exec(raw);
        const li = /^\s*(?:[-*+]|\d+[.)])\s+(.*)$/.exec(raw);
        if (h) stages.push({ name: h[1], limit: +(h[2] ?? 0), cards: [] });
        else if (li) (stages[stages.length - 1] ?? (stages.push({ name: 'To do', limit: 0, cards: [] }), stages[0])).cards.push(li[1]);
      }
      return serializeBoard(stages.length ? stages : parseBoard(''));
    }
    case 'gantt':
      // Rows of "task | start | days | done" become the plain form the app already reads.
      return def.read!(tableRows(text).map((r) => `${/^\s/.test(r[0]) ? '>' : ''}${r[1]}, ${r[2]}, ${(r[3] ?? '0').replace('%', '')}%, ${r[0].trim()}`).join('\n'));
    case 'trip':
      return def.read!(items(text).map((l) => l.replace(/^(.*?)\s*\((-?[\d.]+),\s*(-?[\d.]+)\)(?:\s*\\?\s*(.*))?$/, '$2, $3, $1\t$4').replace(/\t$/, '')).join('\n'));
    case 'cal': {
      // "Time zone: X" and lines of "date[ to date| (N days)][ HH:MM-HH:MM]: label", as written above or by hand, made into what the calendar reads.
      const zone = /^\s*time ?zone:\s*(\S+)/im.exec(text)?.[1];
      const lines = items(text).map((l) =>
        l.replace(/^(\d{4})-(\d\d)-(\d\d)(?:\s+to\s+(\d{4}-\d\d-\d\d))?(?:\s*\((\d+) days?\))?(?:\s+(\d\d?:\d\d)\s*[-–]\s*(\d\d?:\d\d))?\s*:?\s*(.*)$/, (_, y, m, d, to, n, t0, t1, label) => {
          const end = to ?? (n && +n > 1 ? (({ y: Y, m: M, d: D }) => ymdString(Y, M, D))(dayToYmd(ymdToDay(+y, +m, +d) + +n - 1)) : '');
          return `${y}-${m}-${d}${end ? ` to ${end}` : ''}${t0 ? ` ${t0}-${t1}` : ''} ${label}`;
        }),
      );
      return def.read!([...(zone ? [`@${zone}`] : []), ...lines].join('\n'));
    }
    case 'draw': {
      const labels = items(text.replace(QUOTE, ''));
      const shapes: Shape[] = labels.map((t, i) => ({ k: 'r', x: 2 + (i % 4) * 14, y: 2 + Math.floor(i / 4) * 8, w: 12, h: 6, f: 1, text: t }));
      return withAlt(serializeDrawing(shapes), quoted(text));
    }
    case 'pixel':
      return (/```\n?([\s\S]*?)```/.exec(text)?.[1] ?? text).trim();
    case 'anim': {
      // Each line is a thing on the stage, one above the next, that drifts from left to right.
      const list = items(text.replace(QUOTE, ''));
      const anim = parseAnim('');
      anim.shapes = list.map((l, i) => {
        const ic = /^:([a-z][a-z0-9-]*):$/.exec(l);
        const y = Math.round((H * (i + 1)) / (list.length + 1) / 8) * 8 - 16;
        return ic ? { k: 'i', x: 80, y, w: 48, h: 48, f: 0, text: ic[1] } : { k: 't', x: 80, y, w: 160, h: 32, f: 0, text: l, z: 3 };
      });
      anim.keys = anim.shapes.map(() => [restKey(0), { ...restKey(DEFAULT_FRAMES - 1), dx: Math.round(W * 0.6) }]);
      if (quoted(text)) anim.alt = quoted(text);
      return serializeAnim(anim);
    }
    case 'qr':
      return items(text)[0] ?? text.split('\n')[0] ?? '';
    case 'site':
      return mdToSite(text);
  }
  if (formatOf(def.id)) return serializeFold({ two: false, pages: mdToSlides(text) }, formatOf(def.id)!);
  const lines = mdToLines(def.id, text);
  if (lines !== null) return lines;
  return def.read ? def.read(items(text).join('\n')) : text;
}
export { appOf, makeRef };
