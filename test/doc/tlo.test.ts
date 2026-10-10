// TLO, the one format: Markdown read into blocks and written back, the same blocks every time (the old tree's
// tlo.test, its literals as runs and columns).
import { expect, test } from 'vitest';
import { rng } from './helpers.ts';
import { column, noteRuns, pages, parse, parseInline, parseLines, plainText, sections, splitAttrs, write, writeInline, type Block, type Doc, type Run } from '../../src/doc/index.ts';

const t = (s: string): Run[] => [{ t: s }];

test('tlo: a document as a person or a model writes it', () => {
  const doc = parse(`---
app: invoice
title: Invoice 0042
tax: 8%
---
# Invoice 0042 {#top}

Thank you for the work.
Second line of it.

What | Qty:number | Price:money
--- | --- | ---
Design | 12 | 150
Build \\| test | 20 | 140

- one
  - under one
    - deeper
- [x] done
- [ ] not done
1. first
2. second

> a note

---

\`\`\`sheet {chart=bar}
Q | Sales
--- | ---
Q1 | 120
\`\`\`

~ Web -> API: requests
~ API <-> Cache

![The plan](https://tinylittleoffice.com/#/v0/deck/abc)
`);
  expect(doc.head).toStrictEqual({ app: 'invoice', title: 'Invoice 0042', tax: '8%' });
  expect(doc.blocks.map((b) => b.k)).toStrictEqual(['h', 'p', 'table', 'li', 'li', 'li', 'li', 'li', 'li', 'li', 'quote', 'hr', 'fence', 'edge', 'edge', 'img']);
  expect(doc.blocks[0]).toStrictEqual({ k: 'h', level: 1, runs: t('Invoice 0042'), a: { id: 'top' } });
  expect(doc.blocks[1]).toStrictEqual({ k: 'p', runs: t('Thank you for the work.\nSecond line of it.') });
  expect(doc.blocks[2]).toStrictEqual({
    k: 'table',
    cols: [{ name: 'What', type: 'text' }, { name: 'Qty', type: 'number' }, { name: 'Price', type: 'money' }],
    rows: [['Design', '12', '150'], ['Build | test', '20', '140']],
  });
  expect(doc.blocks.filter((b) => b.k === 'li').map((b) => [b.depth, b.runs[0].t, b.done, b.ord])).toStrictEqual([
    [0, 'one', undefined, undefined],
    [1, 'under one', undefined, undefined],
    [2, 'deeper', undefined, undefined],
    [0, 'done', true, undefined],
    [0, 'not done', false, undefined],
    [0, 'first', undefined, true],
    [0, 'second', undefined, true],
  ]);
  expect(doc.blocks[12]).toStrictEqual({ k: 'fence', lang: 'sheet', body: 'Q | Sales\n--- | ---\nQ1 | 120', a: { kv: { chart: 'bar' } } });
  expect(doc.blocks[13]).toStrictEqual({ k: 'edge', from: 'Web', to: 'API', dir: '->', label: 'requests' });
  expect(doc.blocks[15]).toStrictEqual({ k: 'img', alt: 'The plan', url: 'https://tinylittleoffice.com/#/v0/deck/abc' });
  expect(column('Price:money')).toStrictEqual({ name: 'Price', type: 'money' });
  expect(column('Time: 10am')).toStrictEqual({ name: 'Time: 10am', type: 'text' });
  expect(parse(write(doc))).toStrictEqual(doc);
});

test('tlo: lists nest however far a model indents them', () => {
  const four = parse('- a\n    - b\n        - c\n    - d\n- e');
  expect(four.blocks.map((b) => (b.k === 'li' ? b.depth : -1))).toStrictEqual([0, 1, 2, 1, 0]);
  expect(parse('* a\n+ b\n1) c').blocks.map((b) => b.k === 'li' && [b.runs[0].t, !!b.ord])).toStrictEqual([['a', false], ['b', false], ['c', true]]);
});

test('tlo: words that look like syntax are written so they read back as words', () => {
  const tricky = ['# not a heading', '- not an item', '1. not a number', '> not a quote', '---', '~ a -> b', '| a | b', '```', '![x](y)', 'ends {#like-attrs}', '[ ] not a task', '2026. A year'];
  for (const text of tricky) {
    const doc: Doc = { head: {}, blocks: [{ k: 'p', runs: t(text) }, { k: 'li', depth: 0, runs: t(text) }, { k: 'h', level: 2, runs: t(text + ' h') }] };
    expect(parse(write(doc)), text).toStrictEqual(doc);
  }
});

test('tlo: inline marks both ways', () => {
  expect(parseInline('a **b** *i* ++u++ ~~s~~ ==h== :rocket: [w *x*](https://x.y)')).toStrictEqual([
    { t: 'a ' },
    { t: 'b', b: true },
    { t: ' ' },
    { t: 'i', i: true },
    { t: ' ' },
    { t: 'u', u: true },
    { t: ' ' },
    { t: 's', s: true },
    { t: ' ' },
    { t: 'h', h: true },
    { t: ' ' },
    { t: '', ic: 'rocket' },
    { t: ' ' },
    { t: 'w ', href: 'https://x.y' },
    { t: 'x', i: true, href: 'https://x.y' },
  ]);
  // What a model writes loosely stays words.
  expect(parseInline('5 * 3 * 2 and snake_case_name and 2*3')).toStrictEqual([{ t: '5 * 3 * 2 and snake_case_name and 2*3' }]);
  expect(parseInline('__bold__ _it_ <u>under</u> `code`')).toStrictEqual([{ t: 'bold', b: true }, { t: ' ' }, { t: 'it', i: true }, { t: ' ' }, { t: 'under', u: true }, { t: ' code' }]);
});

test('tlo: any runs survive being written and read', () => {
  const r = rng(7);
  const pick = <T,>(xs: T[]) => xs[Math.floor(r() * xs.length)];
  const words = ['plain', 'a b', ' lead', 'trail ', '*', '_x_', '~~', '==', '++', '\\', '[x](y)', ':rocket:', 'snake_case', '`', '<u>', 'mid*dle', '5 * 3', '#', 'x', 'see https://e.com/a_b', 'https://e.com/q?a=1', '^[n]', 'a ] b'];
  const norm = (runs: Run[]) => parseInline(writeInline(runs));
  for (let n = 0; n < 2000; n++) {
    const runs: Run[] = [];
    for (let k = 0; k < 1 + r() * 4; k++) {
      const run: Run = r() < 0.08 ? { t: '', ic: 'star' } : r() < 0.05 ? { t: '', fn: pick(words) } : { t: pick(words) };
      if (!run.ic && run.fn === undefined) for (const f of ['b', 'i', 'u', 's', 'h'] as const) if (r() < 0.25) run[f] = true;
      if (r() < 0.1) run.href = 'https://example.com/a';
      runs.push(run);
    }
    const once = norm(runs);
    // The words are kept exactly, and so is every mark on every letter; a note's words are kept as the words they read as.
    const letters = (rs: Run[]) => rs.flatMap((x) => (x.ic ? [`:${x.ic}`] : x.fn !== undefined ? [`^[${plainText(noteRuns(x.fn))}`] : [...x.t].map((ch) => ch + ['b', 'i', 'u', 's', 'h'].filter((f) => x[f as keyof Run] && ch.trim()).join('') + (x.href ?? ''))));
    expect(letters(once), JSON.stringify(runs) + ' → ' + writeInline(runs)).toStrictEqual(letters(runs));
    // And what is written once is written the same again: the writer is idempotent on its own output.
    expect(writeInline(once)).toBe(writeInline(runs));
  }
});

test('tlo: any blocks survive being written and read', () => {
  const r = rng(11);
  const pick = <T,>(xs: T[]) => xs[Math.floor(r() * xs.length)];
  const text = () => pick(['Words', 'Two\nlines', '# hash', '- dash', '1. one', 'a | pipe', 'x {#y}', '**bold**', 'trailing  ', '> gt', 'Q1: 120', 'x^[note] y']).trim();
  for (let n = 0; n < 500; n++) {
    const blocks: Block[] = [];
    for (let k = 0; k < 1 + r() * 6; k++) {
      const kind = pick(['h', 'p', 'li', 'quote', 'hr', 'table', 'fence', 'edge', 'img']);
      const a = r() < 0.2 ? { id: 'n' + k } : undefined;
      // The words as inline Markdown reads them (a model's loose text goes through the parser first).
      const words = (s: string) => parseLines(s);
      if (kind === 'h') blocks.push({ k: 'h', level: (1 + Math.floor(r() * 3)) as 1 | 2 | 3, runs: words(text().replace(/\n/g, ' ')), ...(a ? { a } : {}) });
      if (kind === 'p' && blocks[blocks.length - 1]?.k !== 'p') blocks.push({ k: 'p', runs: words(text()), ...(a ? { a } : {}) });
      if (kind === 'li') {
        const prev = blocks[blocks.length - 1];
        const depth = prev?.k === 'li' ? Math.min(prev.depth + 1, Math.floor(r() * 3)) : 0;
        blocks.push({ k: 'li', depth, runs: words(text().replace(/\n/g, ' ')), ...(r() < 0.3 ? { done: r() < 0.5 } : {}), ...(a ? { a } : {}) });
      }
      if (kind === 'quote' && blocks[blocks.length - 1]?.k !== 'quote') blocks.push({ k: 'quote', runs: words(text()) });
      if (kind === 'hr') blocks.push({ k: 'hr' });
      if (kind === 'table') blocks.push({ k: 'table', cols: [{ name: 'A', type: 'text' }, { name: 'B', type: 'number' }], rows: [[text(), '1'], ['', '2']] });
      if (kind === 'fence') blocks.push({ k: 'fence', lang: 'sheet', body: '```\ninner\n```\nA | B' });
      if (kind === 'edge') blocks.push({ k: 'edge', from: 'A', to: 'B c', dir: pick(['->', '<-', '<->', '--'] as const), ...(r() < 0.5 ? { label: 'says' } : {}) });
      if (kind === 'img') blocks.push({ k: 'img', alt: 'A [b]', url: 'https://x.y/#/v0/deck/Zab' });
    }
    const doc: Doc = { head: r() < 0.5 ? { app: 'deck', title: 'T: x' } : {}, blocks };
    const back = parse(write(doc));
    // Cells come back trimmed, as Markdown has them.
    const trim = (d: Doc) => JSON.parse(JSON.stringify(d, (k, v) => (typeof v === 'string' && k !== 'body' ? v.trim() : v)));
    expect(trim(back), write(doc)).toStrictEqual(trim(doc));
    expect(write(back)).toBe(write(doc));
  }
});

test('tlo: attributes, pages and sections', () => {
  expect(splitAttrs('Slide {#s1 .title layout=two note="a b"}')).toStrictEqual(['Slide', { id: 's1', cls: ['title'], kv: { layout: 'two', note: 'a b' } }]);
  expect(splitAttrs('just {braces} here')).toStrictEqual(['just {braces} here', undefined]);
  const doc = parse('# A\nx\n## B\ny\n---\n# C');
  expect(pages(doc.blocks).length).toBe(2);
  expect(sections(doc.blocks, 1).map(([h, bs]) => [h?.runs[0].t, bs.length])).toStrictEqual([['A', 4], ['C', 0]]);
});

test('tlo: a web address is read whole, marks and all', () => {
  expect(parseInline('see https://x.com/a_b?q=1&r=_2_ now.')).toStrictEqual([{ t: 'see https://x.com/a_b?q=1&r=_2_ now.' }]);
  expect(writeInline([{ t: 'go to https://x.com/a_b?q=1 or *not*' }])).toBe('go to https://x.com/a_b?q=1 or \\*not\\*');
});

test('tlo: tables of one column, first words like a heading, and backslashes keep their shape', () => {
  for (const b of [
    { k: 'table', cols: [{ name: 'Words', type: 'text' }], rows: [['a'], ['b \\ c']] },
    { k: 'table', cols: [{ name: '# of units', type: 'text' }, { name: 'Cost', type: 'text' }], rows: [['3', 'x\\|y']] },
  ] as Block[]) {
    const doc: Doc = { head: {}, blocks: [b] };
    expect(parse(write(doc)), write(doc)).toStrictEqual(doc);
    expect(write(parse(write(doc)))).toBe(write(doc));
  }
});

test('tlo: numbers count ordered items only, across deeper ones; spaces end the marks they lack', () => {
  const li = (depth: number, ord: boolean, s: string): Block => ({ k: 'li', depth, ...(ord ? { ord: true } : {}), runs: t(s) });
  expect(write({ head: {}, blocks: [li(0, false, 'a'), li(1, false, 'b'), li(0, true, 'c')] })).toBe('- a\n  - b\n1. c\n');
  expect(write({ head: {}, blocks: [li(0, true, 'a'), li(1, false, 'x'), li(0, true, 'b')] })).toBe('1. a\n  - x\n2. b\n');
  expect(writeInline([{ t: 'bold', b: true }, { t: ' ' }, { t: 'u', u: true }, { t: ' ' }, { t: 'v', u: true }])).toBe('**bold** ++u++ ++v++');
});

test('tlo: lines of a paragraph are runs with a line break among the words; marks do not cross a line', () => {
  expect(parse('**a**\n**b** c\n').blocks[0]).toStrictEqual({ k: 'p', runs: [{ t: 'a', b: true }, { t: '\n' }, { t: 'b', b: true }, { t: ' c' }] });
  expect(parse('one\ntwo\n').blocks[0]).toStrictEqual({ k: 'p', runs: [{ t: 'one\ntwo' }] });
  expect(write({ head: {}, blocks: [{ k: 'p', runs: [{ t: 'a\nb', b: true }] }] })).toBe('**a**\n**b**\n');
  expect(write({ head: {}, blocks: [{ k: 'li', depth: 1, runs: [{ t: 'one\ntwo' }], a: { id: 'x' } }] })).toBe('  - one\n    two {#x}\n');
});

test('an empty paragraph is written <br> and read back empty, so a blank line typed between two others survives the link', () => {
  const d = parse('a\n\n<br>\n\nb\n');
  expect(d.blocks).toStrictEqual([{ k: 'p', runs: [{ t: 'a' }] }, { k: 'p', runs: [] }, { k: 'p', runs: [{ t: 'b' }] }]);
  expect(write(d)).toBe('a\n\n<br>\n\nb\n');
  expect(write({ head: {}, blocks: [{ k: 'p', runs: [] }] })).toBe('<br>\n');
});

test('tlo: a NUL never enters a document: the reader drops it, in the head and the words alike', () => {
  const doc = parse('---\ntitle: Q3\u0000 budget\n---\n# Bud\u0000get\n\nWe \u0000agree.\n');
  expect(doc.head).toEqual({ title: 'Q3 budget' });
  expect(write(doc)).toBe('---\ntitle: Q3 budget\n---\n# Budget\n\nWe agree.\n');
  expect(write(doc)).not.toContain('\u0000');
});
