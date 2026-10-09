/**
 * Calendar's document, read and edited (docs/kernel.md §3). A span of time is a list item: when it is, then
 * what, the words rich text (ported from the old tree's lib/calmodel.ts and lib/ganttmodel.ts):
 *
 *   ---
 *   zone: Europe/London
 *   green: Sam
 *   ---
 *   - 2027-03-01: Launch                                a day: a floating date, the same everywhere
 *   - 2027-03-01 to 2027-03-03: Offsite {color=green}   several days
 *   - 2027-03-10 09:00-10:30: Retro {every=week}        a time, in the head's zone (UTC without one)
 *   - 2027-03-10 22:00 to 2027-03-11 01:00: Party       a time that runs past midnight
 *
 * A timed span is an instant: written as the clock reads in the document's zone, read back to the same
 * instant, shown in whichever zone the viewer picks. A span may have a colour (`color=green`; the head says
 * what a colour stands for, "green: Sam", "indigo: Paul" for the default) and may repeat: `every=day`,
 * `week`, `month` or `year`, with `times=9` or `until=2027-06-01`, else for ever. A timed repeat keeps its
 * time of day in the document's zone across a clock change.
 *
 * The same items are a schedule (`view: gantt` in the head): an item's depth nests it under the task above,
 * `{done=40%}` says how far along it is and `- [x]` that it is done; a task with parts under it spans them.
 *
 * `readCal` is the view, a pure function of the document; every command gives operations (`Op[]`), so undo
 * sees primitives only. Days are counted from 1970-01-01, as the kernel counts them; a timed span's start is
 * minutes since 1970 UTC. Nothing here touches the DOM.
 */
import { attr, dayToYmd, family, isAtomic, normalRuns, plainText, removeItem, runLength, sliceRuns, ymdString, ymdToDay, type Attrs, type Block, type Doc, type Op, type Run } from '../../doc/index.ts';
import { ACCENT } from '../../kit/draw.ts';
import { t } from '../../kit/i18n.ts';
import { clockString, dayString, isValidZone, partsToUtc, utcToParts } from './tz.ts';

export type Li = Extract<Block, { k: 'li' }>;
export type Every = 'd' | 'w' | 'm' | 'y';

export interface Repeat {
  every: Every;
  /** How many times in all, the first included. */
  count?: number;
  /** The last day a time of it may start on. Neither this nor `count`: for ever. */
  until?: number;
}

export interface Span {
  kind: 'd' | 't';
  /** 'd': a day counted from 1970. 't': minutes since 1970 UTC. */
  start: number;
  /** 'd': whole days, at least 1. 't': minutes, at least 0. */
  dur: number;
  /** A key of CAL_COLORS; '' for the default. */
  color: string;
  repeat?: Repeat;
}

/** A span as the dialog holds it: what an item is made of. */
export interface Draft extends Span {
  label: Run[];
  /** How far along, 0 to 100. */
  done: number;
}

export interface Item extends Draft {
  /** The item's block index in the document. */
  at: number;
  block: Li;
  depth: number;
  /** The label in plain words. */
  words: string;
}

export interface CalView {
  /** The document's zone, '' when it has none (its times are then UTC). */
  zone: string;
  /** What each colour stands for, by key. */
  legend: Record<string, string>;
  items: Item[];
  /** Drawn as a schedule: `view: gantt`. */
  gantt: boolean;
}

/** The colours a span may take: the key a span carries in the view, the word the document writes. */
export const CAL_COLORS: Record<string, { word: string; name: () => string; hex: string }> = {
  '': { word: 'indigo', name: () => t('Indigo'), hex: ACCENT },
  r: { word: 'red', name: () => t('Red'), hex: '#b3261e' },
  o: { word: 'orange', name: () => t('Orange'), hex: '#d55e00' },
  g: { word: 'green', name: () => t('Green'), hex: '#009e73' },
  b: { word: 'blue', name: () => t('Blue'), hex: '#0072b2' },
  p: { word: 'purple', name: () => t('Purple'), hex: '#a05ca8' },
};

/** Each repeat as the document writes it. */
export const EVERY: Record<Every, string> = { d: 'day', w: 'week', m: 'month', y: 'year' };
const EVERY_WORDS: Record<Every, () => string> = { d: () => t('Every day'), w: () => t('Every week'), m: () => t('Every month'), y: () => t('Every year') };
export const everyText = (e: Every) => EVERY_WORDS[e]();

/** A repeat in words: "Every week", "Every week, 9 times", "Every week until 2027-06-01". */
export function repeatText(r: Repeat): string {
  const every = everyText(r.every);
  return r.count ? t('{every}, {n} times', { every, n: r.count }) : r.until !== undefined ? t('{every} until {date}', { every, date: dayString(r.until) }) : every;
}

/** The deepest a task nests in a schedule. */
export const MAX_DEPTH = 3;
const MANAGED = ['color', 'every', 'times', 'until', 'done'];
const DAY_MS = 86400000;

/** A colour's key from its word ("green") or its letter ("g"); undefined for one that is not a calendar colour. */
function colorKey(v: string | undefined): string | undefined {
  const s = v?.trim().toLowerCase() ?? '';
  if (!s) return undefined;
  return Object.keys(CAL_COLORS).find((k) => (k && k === s) || CAL_COLORS[k].word === s);
}
/** "2027-03-01" as a day counted from 1970, or null. */
export function dayOf(s: string | undefined): number | null {
  const m = /^(\d{4})-(\d\d?)-(\d\d?)$/.exec(s?.trim() ?? '');
  return m ? ymdToDay(+m[1], +m[2], +m[3]) : null;
}
/** The minute (since 1970 UTC) a clock in `zone` reads h:min on a day. */
export function clockMinutes(day: number, h: number, min: number, zone: string): number {
  const { y, m, d } = dayToYmd(day);
  return Math.round(partsToUtc(y, m, d, h, min, zone) / 60000);
}
export const spanStartMs = (s: Span): number => (s.kind === 'd' ? s.start * DAY_MS : s.start * 60000);
export const spanEndMs = (s: Span): number => (s.kind === 'd' ? (s.start + s.dur) * DAY_MS : (s.start + s.dur) * 60000);

/** The first and last civil days a span covers; a timed span's are taken in `zone`. */
export function spanDays(s: Span, zone: string): [number, number] {
  if (s.kind === 'd') return [s.start, s.start + s.dur - 1];
  const a = utcToParts(spanStartMs(s), zone);
  const b = utcToParts(Math.max(spanStartMs(s), spanEndMs(s) - 1), zone);
  return [ymdToDay(a.y, a.m, a.d), ymdToDay(b.y, b.m, b.d)];
}

/**
 * When a span is, as written at the start of its item, and how many characters that took (the ": " after it
 * included): "2027-03-01", "2027-03-01 to 2027-03-03", "2027-03-10 09:00", "2027-03-10 09:00-10:30",
 * "2027-03-10 22:00 to 2027-03-11 01:00". A time that ends before it starts ends the next day.
 */
export function readWhen(text: string, zone: string): { kind: 'd' | 't'; start: number; dur: number; used: number } | null {
  const date = /^(\d{4})-(\d\d?)-(\d\d?)/.exec(text);
  if (!date) return null;
  const a = ymdToDay(+date[1], +date[2], +date[3]);
  let rest = text.slice(date[0].length);
  const t0 = /^\s+(\d\d?):(\d\d)/.exec(rest);
  if (t0) rest = rest.slice(t0[0].length);
  // The end: "to" or a dash, then a day, a time, or both.
  const end = /^\s*(?:to|–|-)\s*(?:(\d{4})-(\d\d?)-(\d\d?)(?:\s+(\d\d?):(\d\d))?|(\d\d?):(\d\d))/.exec(rest);
  if (end) rest = rest.slice(end[0].length);
  const sep = /^\s*:?\s*/.exec(rest)![0];
  const used = text.length - rest.length + sep.length;
  const b = end?.[1] ? ymdToDay(+end[1], +end[2], +end[3]) : a;
  if (!t0) return { kind: 'd', start: a, dur: Math.max(1, b - a + 1), used };
  const from = clockMinutes(a, +t0[1], +t0[2], zone);
  const [h, min] = end?.[6] ? [+end[6], +end[7]] : end?.[4] ? [+end[4], +end[5]] : [+t0[1], +t0[2]];
  let to = clockMinutes(b, h, min, zone);
  if (end?.[6] && to < from) to = clockMinutes(b + 1, h, min, zone);
  return { kind: 't', start: from, dur: Math.max(0, to - from), used };
}

/** When a span is, as its item starts: dates as they are, times as the clock reads in `zone`. */
export function whenText(s: Span, zone: string): string {
  if (s.kind === 'd') return dayString(s.start) + (s.dur > 1 ? ` to ${dayString(s.start + s.dur - 1)}` : '');
  const a = utcToParts(spanStartMs(s), zone);
  const b = utcToParts(spanEndMs(s), zone);
  const [da, db] = [ymdString(a.y, a.m, a.d), ymdString(b.y, b.m, b.d)];
  const [ta, tb] = [clockString(a), clockString(b)];
  return !s.dur ? `${da} ${ta}` : da === db ? `${da} ${ta}-${tb}` : `${da} ${ta} to ${db} ${tb}`;
}

/** The words at an item's start, up to the first icon or footnote: where its "when" is written. */
function leadOf(runs: Run[]): string {
  let s = '';
  for (const r of runs) {
    if (isAtomic(r)) break;
    s += r.t;
  }
  return s.split('\n')[0];
}

function readItem(b: Li, at: number, zone: string): Item | null {
  const when = readWhen(leadOf(b.runs), zone);
  if (!when) return null;
  const label = sliceRuns(b.runs, when.used, runLength(b.runs));
  const every = (Object.keys(EVERY) as Every[]).find((k) => k === attr(b, 'every') || EVERY[k] === attr(b, 'every')?.toLowerCase());
  let repeat: Repeat | undefined;
  if (every) {
    repeat = { every };
    const times = parseInt(attr(b, 'times') ?? '', 10);
    const until = dayOf(attr(b, 'until'));
    if (times > 0) repeat.count = times;
    else if (until !== null) repeat.until = until;
  }
  const done = b.done ? 100 : Math.round(Math.min(100, Math.max(0, parseFloat((attr(b, 'done') ?? '').replace('%', '')) || 0)));
  const { used: _, ...span } = when;
  return { ...span, color: colorKey(attr(b, 'color')) ?? '', ...(repeat ? { repeat } : {}), label, done, at, block: b, depth: b.depth, words: plainText(label).replace(/\n/g, ' ').trim() };
}

/** The spans of a document: its list items that start with a date, in order; every other block is left alone. */
export function readCal(doc: Doc): CalView {
  const named = doc.head.zone?.trim() ?? '';
  const zone = isValidZone(named) ? named : '';
  const legend: Record<string, string> = {};
  for (const [k, c] of Object.entries(CAL_COLORS)) {
    const name = doc.head[c.word]?.trim();
    if (name) legend[k] = name;
  }
  const items: Item[] = [];
  doc.blocks.forEach((b, at) => {
    if (b.k !== 'li') return;
    const item = readItem(b, at, zone || 'UTC');
    if (item) items.push(item);
  });
  return { zone, legend, items, gantt: doc.head.view?.trim().toLowerCase() === 'gantt' };
}

/* ---------- repeats ---------- */

/**
 * Every time a span happens between two days (both included): the span itself, or, when it repeats, the
 * copies its rule makes, each starting on its own day. A timed span repeats at the same time of day in `zone`.
 */
export function occurrences<S extends Span>(s: S, fromDay: number, toDay: number, zone: string): S[] {
  const r = s.repeat;
  const [a, b] = spanDays(s, zone);
  if (!r) return b >= fromDay && a <= toDay ? [s] : [];
  const out: S[] = [];
  const clock = s.kind === 't' ? utcToParts(spanStartMs(s), zone) : null;
  const p = clock ?? dayToYmd(a);
  const step = r.every === 'd' ? 1 : r.every === 'w' ? 7 : 0;
  // Days and weeks are regular, so the times over before `fromDay` are skipped unvisited. Months and years are
  // walked from the start: a 31st skips the short months, and only the times that happen count.
  let n = step ? Math.max(0, Math.floor((fromDay - b) / step)) : 0;
  for (let seen = n; r.count === undefined || seen < r.count; n++) {
    const day = step ? a + n * step : ymdToDay(r.every === 'y' ? p.y + n : p.y, r.every === 'm' ? p.m + n : p.m, p.d);
    if (day > toDay || (r.until !== undefined && day > r.until)) break;
    if (!step && dayToYmd(day).d !== p.d) continue;
    seen++;
    if (day + b - a < fromDay) continue;
    out.push({ ...s, start: clock ? clockMinutes(day, clock.h, clock.min, zone) : day });
  }
  return out;
}

/** Today by this device's clock, as a day counted from 1970. */
export function today(now = new Date()): number {
  return ymdToDay(now.getFullYear(), now.getMonth() + 1, now.getDate());
}

/** The day whose month a calendar opens on: the next thing still to come (a repeat's next time), else the last, else today. */
export function openingDay(v: CalView, zone: string, nowMs = Date.now()): number {
  const now = utcToParts(nowMs, zone);
  const day = ymdToDay(now.y, now.m, now.d);
  const next = v.items.flatMap((s) => (s.repeat ? occurrences(s, day - 1, day + 400, zone).slice(0, 1) : spanEndMs(s) >= nowMs ? [s] : [])).sort((a, b) => spanStartMs(a) - spanStartMs(b))[0];
  const s = next ?? [...v.items].sort((a, b) => spanStartMs(a) - spanStartMs(b)).at(-1);
  return s ? spanDays(s, zone)[0] : day;
}

/* ---------- commands, as operations ---------- */

/** The zone an edit writes its times in: the document's; else, when nothing in it is timed yet, the viewer's (and the head says so). */
export function writeZone(v: CalView, viewer: string, except?: Item): { zone: string; ops: Op[] } {
  if (v.zone) return { zone: v.zone, ops: [] };
  const timed = v.items.some((i) => i !== except && i.kind === 't');
  if (timed || !isValidZone(viewer) || viewer === 'UTC') return { zone: 'UTC', ops: [] };
  return { zone: viewer, ops: [{ op: 'head', key: 'zone', value: viewer }] };
}

/** An item's block from a draft: the "when" first, then the label; the attributes this app does not own kept. */
export function itemBlock(d: Draft, zone: string, base?: Li, depth = base?.depth ?? 0): Li {
  const kv: Record<string, string> = {};
  if (d.color && CAL_COLORS[d.color]) kv.color = CAL_COLORS[d.color].word;
  if (d.repeat) {
    kv.every = EVERY[d.repeat.every];
    if (d.repeat.count) kv.times = String(d.repeat.count);
    else if (d.repeat.until !== undefined) kv.until = dayString(d.repeat.until);
  }
  if (d.done > 0 && d.done < 100) kv.done = `${Math.round(d.done)}%`;
  for (const [k, v] of Object.entries(base?.a?.kv ?? {})) if (!MANAGED.includes(k)) kv[k] = v;
  const a: Attrs = { ...(base?.a?.id ? { id: base.a.id } : {}), ...(base?.a?.cls?.length ? { cls: base.a.cls } : {}), ...(Object.keys(kv).length ? { kv } : {}) };
  const label = d.label.filter((r) => r.t !== '\n');
  const li: Li = { k: 'li', depth: Math.max(0, Math.min(MAX_DEPTH, depth)), runs: normalRuns([{ t: `${whenText(d, zone)}:${runLength(label) ? ' ' : ''}` }, ...label]) };
  if (base?.ord) li.ord = true;
  if (d.done >= 100) li.done = true;
  else if (base?.done === false) li.done = false;
  if (Object.keys(a).length) li.a = a;
  return li;
}

/** The draft an item is, for the dialog. */
export const draftOf = (i: Item): Draft => ({ kind: i.kind, start: i.start, dur: i.dur, color: i.color, ...(i.repeat ? { repeat: { ...i.repeat } } : {}), label: i.label, done: i.done });

/** A new span over some days, in a colour. */
export const newDraft = (from: number, to = from, color = ''): Draft => ({ kind: 'd', start: Math.min(from, to), dur: Math.abs(to - from) + 1, color, label: [], done: 0 });

/** Where a new item goes: on a calendar, in date order among the items at the top level; else at the end. */
function placeOf(doc: Doc, v: CalView, d: Draft): number {
  const later = v.items.find((i) => i.depth === 0 && spanStartMs(i) > spanStartMs(d));
  return later ? later.at : doc.blocks.length;
}

/**
 * The draft written into the document: over `item`, or as a new item — after the family of `after` (a
 * schedule's task added under another), else in date order.
 */
export function putItem(doc: Doc, v: CalView, item: Item | null, d: Draft, viewer: string, after?: Item): Op[] {
  const w = writeZone(v, viewer, item ?? undefined);
  if (item) return [...w.ops, { op: 'splice', at: item.at, n: 1, blocks: [itemBlock(d, w.zone, item.block)] }];
  const at = after ? family(doc, after.at) : placeOf(doc, v, d);
  return [...w.ops, { op: 'splice', at, n: 0, blocks: [itemBlock(d, w.zone, undefined, after?.depth ?? 0)] }];
}

/** A span moved by whole days; a timed one keeps its clock in the zone it is written in. */
export function shiftDraft(i: Draft, days: number, zone: string): Draft {
  if (!days) return i;
  if (i.kind === 'd') return { ...i, start: i.start + days };
  const p = utcToParts(spanStartMs(i), zone);
  return { ...i, start: clockMinutes(ymdToDay(p.y, p.m, p.d) + days, p.h, p.min, zone) };
}
/** A span of days made so many days long. */
export const resizeDraft = (i: Draft, days: number): Draft => (i.kind === 'd' ? { ...i, dur: Math.max(1, Math.round(days)) } : i);

/** An item moved by days (dragged on the schedule), or made a number of days long. */
export function moveItem(v: CalView, i: Item, days: number): Op[] {
  if (!days) return [];
  const zone = v.zone || 'UTC';
  return [{ op: 'splice', at: i.at, n: 1, blocks: [itemBlock(shiftDraft(draftOf(i), days, zone), zone, i.block)] }];
}
export function resizeItem(v: CalView, i: Item, days: number): Op[] {
  if (i.kind !== 'd' || Math.max(1, Math.round(days)) === i.dur) return [];
  return [{ op: 'splice', at: i.at, n: 1, blocks: [itemBlock(resizeDraft(draftOf(i), days), v.zone || 'UTC', i.block)] }];
}

/** An item taken out; the parts under it (on a schedule) come out a level. */
export const removeSpan = (doc: Doc, i: Item): Op[] => removeItem(doc, i.at);

/** Say what a colour stands for ("Sam"), or nothing. */
export const nameColor = (key: string, name: string): Op[] => (CAL_COLORS[key] ? [{ op: 'head', key: CAL_COLORS[key].word, value: name.replace(/\n/g, ' ').trim() || undefined }] : []);

/** Drawn as a schedule, or as a calendar. */
export const setGantt = (v: CalView, on: boolean): Op[] => (v.gantt === on ? [] : [{ op: 'head', key: 'view', value: on ? 'gantt' : undefined }]);

/* ---------- the schedule ---------- */

export interface Bar {
  item: Item;
  /** The first day it covers, counted from 1970. */
  start: number;
  days: number;
  done: number;
  /** Has parts under it: spans them, and is as done as they are. */
  parent: boolean;
}

/** Each task's bar as drawn: a task with parts under it covers them all, and counts as done as far as they are. */
export function ganttBars(v: CalView): Bar[] {
  const zone = v.zone || 'UTC';
  const own = v.items.map((i) => {
    const [a, b] = spanDays(i, zone);
    return { start: a, days: b - a + 1 };
  });
  return v.items.map((item, k) => {
    const kids: number[] = [];
    for (let j = k + 1; j < v.items.length && v.items[j].depth > item.depth; j++) kids.push(j);
    if (!kids.length) return { item, ...own[k], done: item.done, parent: false };
    const start = Math.min(...kids.map((j) => own[j].start));
    const end = Math.max(...kids.map((j) => own[j].start + own[j].days));
    const total = kids.reduce((n, j) => n + own[j].days, 0);
    return { item, start, days: end - start, done: Math.round(kids.reduce((n, j) => n + own[j].days * v.items[j].done, 0) / total), parent: true };
  });
}

/** The first day and one past the last that the bars cover, or null when there are none. */
export function ganttRange(bars: Bar[]): { from: number; to: number } | null {
  if (!bars.length) return null;
  return { from: Math.min(...bars.map((b) => b.start)), to: Math.max(...bars.map((b) => b.start + b.days)) };
}
