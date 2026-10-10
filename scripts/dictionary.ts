/**
 * The link codec's deflate dictionary, measured (dev only; nothing here ships).
 *
 *   node scripts/dictionary.ts [--size 1578] [--generated 200] [--json]
 *
 * Trains a dictionary the way zlib's users and zstd's trainer do it: the
 * substrings most documents share, chosen greedily by how many documents
 * hold each of their 8-byte pieces not yet covered, the most valuable put
 * last (deflate reaches back from the document, so the nearest bytes cost
 * the least to name). The corpus is the old tree's templates, the guide's
 * and the skill's examples, the apps' examples (test/doc/corpus) and two
 * hundred documents generated from the grammar (test/doc/tlo-grammar.ts).
 *
 * Then it reports, for every template of every app on this tree, the link's
 * payload under today's DICTIONARY (kit/codec.ts) and under the trained one,
 * each the shortest of the three encodings as packDoc chooses. The rule for
 * changing it (directive r9-grammar): every template shorter or equal, and
 * the largest template's link 5% shorter or more. A second dictionary would
 * be told apart by a new flag letter beside "y" (the codec reads each flag
 * with the dictionary it was written with); none is added unless the rule
 * is met.
 */
import { readdirSync, readFileSync } from 'node:fs';
import { join } from 'node:path';
import fc from 'fast-check';
import { deflateSync, strToU8 } from 'fflate';
import { DICTIONARY, toBase64Url } from '../src/kit/codec.ts';
import { apps } from '../src/kit/apps.ts';
import { arbitraryText } from '../test/doc/tlo-grammar.ts';

const args = process.argv.slice(2);
const SIZE = Number(args[args.indexOf('--size') + 1]) || DICTIONARY.length;
const K = 8;
const SEGMENT = 48;
/** How many generated documents join the corpus (--generated N). */
const GENERATED = args.includes('--generated') ? Number(args[args.indexOf('--generated') + 1]) : 200;

/** A payload's length with a dictionary: the shortest of raw, deflated, and deflated against the dictionary, as packDoc picks. */
export function linkLength(text: string, dictionary: Uint8Array): number {
  const raw = strToU8(text);
  const best = Math.min(raw.length, deflateSync(raw, { level: 9, mem: 12 }).length, deflateSync(raw, { level: 9, mem: 12, dictionary }).length);
  // base64url of n bytes, and the flag.
  return 1 + toBase64Url(new Uint8Array(best)).length;
}

/** The training corpus: what people start from and what the format's guides show, and the generated documents. */
export function corpus(): string[] {
  const dir = join(import.meta.dirname, '../test/doc/corpus');
  const files = [...readdirSync(dir).filter((f) => f.endsWith('.json')), ...readdirSync(join(dir, 'apps')).map((f) => `apps/${f}`)];
  const docs = files.flatMap((f) => (JSON.parse(readFileSync(join(dir, f), 'utf8')) as { docs: { text: string }[] }).docs.map((d) => d.text));
  return [...docs, ...(GENERATED ? fc.sample(arbitraryText(6), { numRuns: GENERATED, seed: 9 }) : [])];
}

/** A dictionary of `size` bytes trained on `docs`. */
export function train(docs: string[], size: number): Uint8Array {
  const bytes = docs.map((d) => strToU8(d));
  const key = (b: Uint8Array, i: number) => String.fromCharCode(...b.subarray(i, i + K));
  // In how many documents each piece appears.
  const freq = new Map<string, number>();
  for (const b of bytes) {
    const seen = new Set<string>();
    for (let i = 0; i + K <= b.length; i++) seen.add(key(b, i));
    for (const k of seen) freq.set(k, (freq.get(k) ?? 0) + 1);
  }
  const covered = new Set<string>();
  const chosen: { seg: Uint8Array; score: number }[] = [];
  let used = 0;
  while (used < size) {
    let best: { seg: Uint8Array; score: number; keys: string[] } | null = null;
    for (const b of bytes)
      for (let i = 0; i + SEGMENT <= b.length; i += 4) {
        const keys: string[] = [];
        let score = 0;
        for (let j = i; j + K <= i + SEGMENT; j++) {
          const k = key(b, j);
          if (covered.has(k) || keys.includes(k)) continue;
          const f = freq.get(k)!;
          if (f < 2) continue;
          keys.push(k);
          score += f;
        }
        if (!best || score > best.score) best = { seg: b.subarray(i, i + SEGMENT), score, keys };
      }
    if (!best || best.score === 0) break;
    best.keys.forEach((k) => covered.add(k));
    chosen.push(best);
    used += best.seg.length;
  }
  // The most valuable last, nearest the document.
  const out = chosen.sort((a, b) => a.score - b.score).flatMap((c) => [...c.seg]);
  return new Uint8Array(out.slice(Math.max(0, out.length - size)));
}

/** Today's dictionary against a trained one over every template: the numbers, and whether the rule is met. */
export function report(trained: Uint8Array) {
  const rows = apps().flatMap((a) => a.templates.map((t) => ({ name: `${a.id}/${t.id}`, chars: t.doc.length, today: linkLength(t.doc, DICTIONARY), trained: linkLength(t.doc, trained) })));
  const largest = rows.reduce((a, b) => (b.chars > a.chars ? b : a));
  const longer = rows.filter((r) => r.trained > r.today);
  const sum = (k: 'today' | 'trained') => rows.reduce((n, r) => n + r[k], 0);
  const win = (r: { today: number; trained: number }) => 1 - r.trained / r.today;
  const best = rows.reduce((a, b) => (win(b) > win(a) ? b : a));
  return { rows, largest, longer, best, totals: { today: sum('today'), trained: sum('trained') }, meets: !longer.length && win(largest) >= 0.05, win };
}

if (import.meta.main) {
  const trained = train(corpus(), SIZE);
  const r = report(trained);
  const pct = (x: number) => `${(100 * x).toFixed(1)}%`;
  if (args.includes('--json')) console.log(JSON.stringify({ size: trained.length, ...r, win: undefined }, null, 1));
  else {
    console.log(`Dictionary today: ${DICTIONARY.length} bytes; trained: ${trained.length} bytes, on ${corpus().length} documents.`);
    console.log(`Templates: ${r.rows.length}. Link characters in all: ${r.totals.today} today, ${r.totals.trained} trained (${pct(1 - r.totals.trained / r.totals.today)} shorter).`);
    console.log(`Largest template: ${r.largest.name}, ${r.largest.chars} characters: ${r.largest.today} today, ${r.largest.trained} trained (${pct(r.win(r.largest))}).`);
    console.log(`Best win: ${r.best.name}, ${r.best.today} → ${r.best.trained} (${pct(r.win(r.best))}).`);
    console.log(
      `Longer with the trained one: ${r.longer.length} templates${r.longer.length ? ` (worst: ${r.longer.sort((a, b) => b.trained - b.today - (a.trained - a.today))[0].name}, ${r.longer[0].today} → ${r.longer[0].trained})` : ''}.`,
    );
    console.log(r.meets ? 'The rule is met: every template shorter or equal, the largest 5% shorter or more.' : 'The rule is not met: the dictionary stays as it is.');
  }
}
