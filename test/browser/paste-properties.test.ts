// Paste, fuzzed from the grammar (test/doc/tlo-grammar.ts): a generated document copied as our HTML (docToHtml) and
// read back as HTML from elsewhere (htmlToBlocks, the path a paste from another editor takes) is a document the
// writer keeps, and a second trip changes nothing; words, marks, links, lists and their depths come through whole.
// (htmlToBlocks needs the browser's DOMParser, so this runs in Chromium.)
import fc from 'fast-check';
import { expect, test } from 'vitest';
import { normalRuns, parse, write, type Block, type Doc, type Run } from '../../src/doc/index.ts';
import { docToHtml, htmlToBlocks } from '../../src/kit/clipboard.ts';
import { arbitraryDoc, RUNS } from '../doc/tlo-grammar.ts';

function holds<T>(name: string, arb: fc.Arbitrary<T>, pred: (x: T) => void): void {
  const out = fc.check(fc.property(arb, (x) => (pred(x), true)), { numRuns: RUNS });
  if (out.failed) throw new Error(`${name} fails for ${fc.stringify(out.counterexample?.[0])}\n(seed ${out.seed})\n${out.errorInstance instanceof Error ? out.errorInstance.message : String(out.errorInstance)}`);
}

const pasted = (blocks: Block[]): Block[] => htmlToBlocks(docToHtml(blocks));
const text = (blocks: Block[]) => write({ head: {}, blocks });

test('property: a document pasted as HTML is one the writer keeps, written again it reads the same', () => {
  holds('write(parse(write(paste(d)))) = write(paste(d))', arbitraryDoc(), (d) => {
    const once = text(pasted(d.blocks));
    expect(write(parse(once)), once).toBe(once);
  });
}, 60_000);

test('property: pasting what was pasted changes nothing', () => {
  holds('paste(paste(d)) = paste(d)', arbitraryDoc(), (d) => {
    const once = pasted(d.blocks);
    expect(text(pasted(once))).toBe(text(once));
  });
}, 60_000);

/**
 * The words alone of a document of paragraphs and items: what HTML from elsewhere can carry of it exactly. A link
 * to a place in this document ("#top") means nothing pasted from another page, so htmlToBlocks keeps http(s),
 * mailto and tel links only, and those are the links kept here. Empty paragraphs and items are left out too.
 */
const wordsOnly = (d: Doc): Block[] =>
  d.blocks.map((b) => ('runs' in b ? { ...b, runs: b.runs.map(({ href, ...r }) => (href && !href.startsWith('#') ? { ...r, href } : r)) } : b)).flatMap((b): Block[] => {
    if (b.k === 'p' && b.runs.length) return [{ k: 'p', runs: b.runs }];
    // (An item with no words is no one's words in HTML; paste leaves it out, as it does an empty paragraph.)
    if (b.k === 'li' && b.runs.length) return [{ k: 'li', depth: Math.min(b.depth, 3), ...(b.ord ? { ord: true as const } : {}), runs: b.runs }];
    return [];
  });

/**
 * What HTML from elsewhere carries of a document's words: it draws no space at a line's ends and no empty line (a
 * trailing <br> draws nothing, two draw one), so those are the markup's there, and a block left with no words is none.
 * (Our own paste reads our TLO, which says them: test/browser/paste-spaces.test.ts.)
 */
function asHtml(blocks: Block[]): Block[] {
  const loose = (r: Run | undefined): r is Run => !!r && !r.ic && r.fn === undefined;
  const lines = (runs: Run[]): Run[] => {
    const out: Run[][] = [[]];
    for (const r of runs) (loose(r) ? r.t.split('\n') : [null]).forEach((t, i) => (i && out.push([]), out[out.length - 1].push(t === null ? r : { ...r, t })));
    const trimmed = out.map((l) => {
      let rs = normalRuns(l);
      while (loose(rs[0]) && !rs[0].t.trim()) rs = rs.slice(1);
      while (loose(rs[rs.length - 1]) && !rs[rs.length - 1].t.trim()) rs = rs.slice(0, -1);
      if (loose(rs[0])) rs = [{ ...rs[0], t: rs[0].t.trimStart() }, ...rs.slice(1)];
      if (loose(rs[rs.length - 1])) rs = [...rs.slice(0, -1), { ...rs[rs.length - 1], t: rs[rs.length - 1].t.trimEnd() }];
      return normalRuns(rs);
    });
    return normalRuns(trimmed.filter((l) => l.length).flatMap((l, i) => (i ? [{ t: '\n' }, ...l] : l)));
  };
  return parse(text(blocks.flatMap((b): Block[] => ('runs' in b ? ((runs) => (runs.length ? [{ ...b, runs }] : []))(lines(b.runs)) : [b])))).blocks;
}

test('property: paragraphs and items pasted as HTML come back as they were: words, marks, links, icons, notes, depths', () => {
  holds('paste(words) = words', arbitraryDoc().map(wordsOnly), (blocks) => {
    // (Lists are drawn nested, so an item's depth is what the items before it allow, as when it is written.)
    const want = asHtml(parse(text(blocks)).blocks);
    // (HTML shows two spaces as one, so a run of spaces comes back as one.)
    const spaces = (s: string) => s.replace(/ {2,}/g, ' ');
    expect(spaces(text(pasted(want)))).toBe(spaces(text(want)));
  });
}, 60_000);
