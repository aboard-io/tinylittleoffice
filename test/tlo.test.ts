// TLO, the one format: Markdown read into blocks and written back, the same blocks every time.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { parse, write, parseInline, writeInline, splitAttrs, column, pages, sections, type Block, type Tlo } from '../src/lib/tlo.ts';
import type { Run } from '../src/lib/richtext.ts';

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
  assert.deepEqual(doc.head, { app: 'invoice', title: 'Invoice 0042', tax: '8%' });
  assert.deepEqual(
    doc.blocks.map((b) => b.k),
    ['h', 'p', 'table', 'li', 'li', 'li', 'li', 'li', 'li', 'li', 'quote', 'hr', 'fence', 'edge', 'edge', 'img'],
  );
  assert.deepEqual(doc.blocks[0], { k: 'h', level: 1, text: 'Invoice 0042', a: { id: 'top' } });
  assert.deepEqual(doc.blocks[1], { k: 'p', text: 'Thank you for the work.\nSecond line of it.' });
  assert.deepEqual(doc.blocks[2], { k: 'table', head: ['What', 'Qty:number', 'Price:money'], rows: [['Design', '12', '150'], ['Build | test', '20', '140']] });
  assert.deepEqual(
    doc.blocks.filter((b) => b.k === 'li').map((b) => [b.depth, b.text, b.done, b.ord]),
    [
      [0, 'one', undefined, undefined],
      [1, 'under one', undefined, undefined],
      [2, 'deeper', undefined, undefined],
      [0, 'done', true, undefined],
      [0, 'not done', false, undefined],
      [0, 'first', undefined, true],
      [0, 'second', undefined, true],
    ],
  );
  assert.deepEqual(doc.blocks[12], { k: 'fence', lang: 'sheet', body: 'Q | Sales\n--- | ---\nQ1 | 120', a: { kv: { chart: 'bar' } } });
  assert.deepEqual(doc.blocks[13], { k: 'edge', from: 'Web', to: 'API', dir: '->', label: 'requests' });
  assert.deepEqual(doc.blocks[15], { k: 'img', alt: 'The plan', url: 'https://tinylittleoffice.com/#/v0/deck/abc' });
  assert.deepEqual(column('Price:money'), { name: 'Price', type: 'money' });
  assert.deepEqual(column('Time: 10am'), { name: 'Time: 10am', type: 'text' });
  // And it reads back the same once written.
  assert.deepEqual(parse(write(doc)), doc);
});

test('tlo: lists nest however far a model indents them', () => {
  const four = parse('- a\n    - b\n        - c\n    - d\n- e');
  assert.deepEqual(
    four.blocks.map((b) => (b.k === 'li' ? b.depth : -1)),
    [0, 1, 2, 1, 0],
  );
  assert.deepEqual(parse('* a\n+ b\n1) c').blocks.map((b) => b.k === 'li' && [b.text, !!b.ord]), [['a', false], ['b', false], ['c', true]]);
});

test('tlo: words that look like syntax are written so they read back as words', () => {
  const tricky = ['# not a heading', '- not an item', '1. not a number', '> not a quote', '---', '~ a -> b', '| a | b', '```', '![x](y)', 'ends {#like-attrs}', '[ ] not a task', '2026. A year'];
  for (const text of tricky) {
    const doc: Tlo = { head: {}, blocks: [{ k: 'p', text }, { k: 'li', depth: 0, text }, { k: 'h', level: 2, text: text + ' h' }] };
    assert.deepEqual(parse(write(doc)), doc, text);
  }
});

test('tlo: inline marks both ways', () => {
  assert.deepEqual(parseInline('a **b** *i* ++u++ ~~s~~ ==h== :rocket: [w *x*](https://x.y)'), [
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
  assert.deepEqual(parseInline('5 * 3 * 2 and snake_case_name and 2*3'), [{ t: '5 * 3 * 2 and snake_case_name and 2*3' }]);
  assert.deepEqual(parseInline('__bold__ _it_ <u>under</u> `code`'), [{ t: 'bold', b: true }, { t: ' ' }, { t: 'it', i: true }, { t: ' ' }, { t: 'under', u: true }, { t: ' code' }]);
});

/** A small random generator, the same every run. */
function rng(seed: number) {
  return () => ((seed = (seed * 1103515245 + 12345) & 0x7fffffff), seed / 0x7fffffff);
}

test('tlo: any runs survive being written and read', () => {
  const r = rng(7);
  const pick = <T>(xs: T[]) => xs[Math.floor(r() * xs.length)];
  const words = ['plain', 'a b', ' lead', 'trail ', '*', '_x_', '~~', '==', '++', '\\', '[x](y)', ':rocket:', 'snake_case', '`', '<u>', 'mid*dle', '5 * 3', '#', 'x', 'see https://e.com/a_b', 'https://e.com/q?a=1'];
  const norm = (runs: Run[]) => parseInline(writeInline(runs));
  for (let n = 0; n < 2000; n++) {
    const runs: Run[] = [];
    for (let k = 0; k < 1 + r() * 4; k++) {
      const run: Run = r() < 0.08 ? { t: '', ic: 'star' } : { t: pick(words) };
      if (!run.ic) for (const f of ['b', 'i', 'u', 's', 'h'] as const) if (r() < 0.25) run[f] = true;
      if (r() < 0.1) run.href = 'https://example.com/a';
      runs.push(run);
    }
    const once = norm(runs);
    // The words are kept exactly, and so is every mark on every letter.
    const letters = (rs: Run[]) => rs.flatMap((x) => (x.ic ? [`:${x.ic}`] : [...x.t].map((ch) => ch + ['b', 'i', 'u', 's', 'h'].filter((f) => x[f as keyof Run] && ch.trim()).join('') + (x.href ?? ''))));
    assert.deepEqual(letters(once), letters(runs), JSON.stringify(runs) + ' → ' + writeInline(runs));
  }
});

test('tlo: any blocks survive being written and read', () => {
  const r = rng(11);
  const pick = <T>(xs: T[]) => xs[Math.floor(r() * xs.length)];
  const text = () => pick(['Words', 'Two\nlines', '# hash', '- dash', '1. one', 'a | pipe', 'x {#y}', '**bold**', 'trailing  ', '> gt', 'Q1: 120']).trim();
  for (let n = 0; n < 500; n++) {
    const blocks: Block[] = [];
    for (let k = 0; k < 1 + r() * 6; k++) {
      const kind = pick(['h', 'p', 'li', 'quote', 'hr', 'table', 'fence', 'edge', 'img']);
      const a = r() < 0.2 ? { id: 'n' + k } : undefined;
      if (kind === 'h') blocks.push({ k: 'h', level: 1 + Math.floor(r() * 3), text: text().replace(/\n/g, ' '), ...(a ? { a } : {}) });
      if (kind === 'p' && blocks[blocks.length - 1]?.k !== 'p') blocks.push({ k: 'p', text: text(), ...(a ? { a } : {}) });
      if (kind === 'li') {
        const prev = blocks[blocks.length - 1];
        const depth = prev?.k === 'li' ? Math.min(prev.depth + 1, Math.floor(r() * 3)) : 0;
        blocks.push({ k: 'li', depth, text: text().replace(/\n/g, ' '), ...(r() < 0.3 ? { done: r() < 0.5 } : {}), ...(a ? { a } : {}) });
      }
      if (kind === 'quote' && blocks[blocks.length - 1]?.k !== 'quote') blocks.push({ k: 'quote', text: text() });
      if (kind === 'hr') blocks.push({ k: 'hr' });
      if (kind === 'table') blocks.push({ k: 'table', head: ['A', 'B:number'], rows: [[text(), '1'], ['', '2']] });
      if (kind === 'fence') blocks.push({ k: 'fence', lang: 'sheet', body: '```\ninner\n```\nA | B' });
      if (kind === 'edge') blocks.push({ k: 'edge', from: 'A', to: 'B c', dir: pick(['->', '<-', '<->', '--'] as const), ...(r() < 0.5 ? { label: 'says' } : {}) });
      if (kind === 'img') blocks.push({ k: 'img', alt: 'A [b]', url: 'https://x.y/#/v0/deck/Zab' });
    }
    const doc: Tlo = { head: r() < 0.5 ? { app: 'deck', title: 'T: x' } : {}, blocks };
    const back = parse(write(doc));
    // Cells come back trimmed, as Markdown has them.
    const trim = (d: Tlo) => JSON.parse(JSON.stringify(d, (k, v) => (typeof v === 'string' && k !== 'body' ? v.trim() : v)));
    assert.deepEqual(trim(back), trim(doc), write(doc));
  }
});

test('tlo: attributes, pages and sections', () => {
  assert.deepEqual(splitAttrs('Slide {#s1 .title layout=two note="a b"}'), ['Slide', { id: 's1', cls: ['title'], kv: { layout: 'two', note: 'a b' } }]);
  assert.deepEqual(splitAttrs('just {braces} here'), ['just {braces} here', undefined]);
  const doc = parse('# A\nx\n## B\ny\n---\n# C');
  assert.equal(pages(doc.blocks).length, 2);
  assert.deepEqual(sections(doc.blocks, 1).map(([h, bs]) => [h?.text, bs.length]), [['A', 4], ['C', 0]]);
});

test('tlo: a web address is read whole, marks and all', () => {
  assert.deepEqual(parseInline('see https://x.com/a_b?q=1&r=_2_ now.'), [{ t: 'see https://x.com/a_b?q=1&r=_2_ now.' }]);
  assert.equal(writeInline([{ t: 'go to https://x.com/a_b?q=1 or *not*' }]), 'go to https://x.com/a_b?q=1 or \\*not\\*');
});

test('tlo: tables of one column, first words like a heading, and backslashes keep their shape', () => {
  for (const b of [
    { k: 'table', head: ['Words'], rows: [['a'], ['b \\ c']] },
    { k: 'table', head: ['# of units', 'Cost'], rows: [['3', 'x\\|y']] },
  ] as Block[]) {
    const doc: Tlo = { head: {}, blocks: [b] };
    assert.deepEqual(parse(write(doc)), doc, write(doc));
    assert.equal(write(parse(write(doc))), write(doc));
  }
});

test('tlo: numbers count ordered items only, across deeper ones; spaces end the marks they lack', () => {
  const li = (depth: number, ord: boolean, text: string): Block => ({ k: 'li', depth, ...(ord ? { ord: true } : {}), text });
  assert.equal(write({ head: {}, blocks: [li(0, false, 'a'), li(1, false, 'b'), li(0, true, 'c')] }), '- a\n  - b\n1. c\n');
  assert.equal(write({ head: {}, blocks: [li(0, true, 'a'), li(1, false, 'x'), li(0, true, 'b')] }), '1. a\n  - x\n2. b\n');
  assert.equal(writeInline([{ t: 'bold', b: true }, { t: ' ' }, { t: 'u', u: true }, { t: ' ' }, { t: 'v', u: true }]), '**bold** ++u++ ++v++');
});
