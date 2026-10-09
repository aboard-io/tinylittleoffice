// The grammar the kernel must preserve (docs/kernel.md §2), a test a bullet: each shape reads as its block and is
// written back byte for byte where it is canonical, and canonically where it is not.
import { expect, test } from 'vitest';
import { parse, write, type Block, type Doc } from '../../src/doc/index.ts';

const same = (text: string) => expect(write(parse(text))).toBe(text);
const li = (depth: number, t: string, more: Partial<Extract<Block, { k: 'li' }>> = {}): Block => ({ k: 'li', depth, runs: t ? [{ t }] : [], ...more });

test('header: --- first, key: value lines (keys lowercased, quotes unquoted), closed by --- or ...; written when non-empty, empty values dropped, newlines spaced', () => {
  const doc = parse('---\nTitle: "Hello there"\nchart: bar\n...\nWords\n');
  expect(doc.head).toStrictEqual({ title: 'Hello there', chart: 'bar' });
  same('---\ntitle: Hello there\nchart: bar\n---\nWords\n');
  expect(write({ head: {}, blocks: [{ k: 'p', runs: [{ t: 'Words' }] }] })).toBe('Words\n');
  expect(write({ head: { a: '', b: 'two\nlines' }, blocks: [] })).toBe('---\nb: two lines\n---\n');
  // Not a header: a line that is not key: value.
  expect(parse('---\nnot a header\n---\n').blocks.map((b) => b.k)).toStrictEqual(['hr', 'p', 'hr']);
});

test('attributes: {#id .cls key=value key="a b"} at the end of a block; on a table alone on the line after; on a fence after the language; classes before values; \\{ keeps braces', () => {
  const doc = parse('# Head {#top .big note="a b" x=1}\n\na | b\n--- | ---\n1 | 2\n{chart=bar}\n\n```sheet {#s .wide}\nx\n```\n\nliteral \\{#braces}\n');
  expect(doc.blocks[0].a).toStrictEqual({ id: 'top', cls: ['big'], kv: { note: 'a b', x: '1' } });
  expect(doc.blocks[1].a).toStrictEqual({ kv: { chart: 'bar' } });
  expect(doc.blocks[2].a).toStrictEqual({ id: 's', cls: ['wide'] });
  expect(doc.blocks[3]).toStrictEqual({ k: 'p', runs: [{ t: 'literal {#braces}' }] });
  same('# Head {#top .big note="a b" x=1}\n\na | b\n--- | ---\n1 | 2\n{chart=bar}\n\n```sheet {#s .wide}\nx\n```\n\nliteral \\{#braces}\n');
  // Braces that do not read as attributes need no escape.
  same('just {braces} here\n');
  same('- [ ] Renew passport {.star due=2027-03-01}\n');
  // Values before classes are written classes first.
  expect(write({ head: {}, blocks: [li(0, 'x', { a: { kv: { due: '1' }, cls: ['star'] } })] })).toBe('- x {.star due=1}\n');
});

test('headings: #{1,6}, optional closing #s; # Words {.title} is the title', () => {
  const doc = parse('# One #\n## Two\n###### Six ###\n# Title {.title}\n');
  expect(doc.blocks.map((b) => b.k === 'h' && [b.level, b.runs[0]?.t])).toStrictEqual([[1, 'One'], [2, 'Two'], [6, 'Six'], [1, 'Title']]);
  expect(doc.blocks[3].a).toStrictEqual({ cls: ['title'] });
  same('# One\n\n## Two\n\n###### Six\n\n# Title {.title}\n');
});

test('lists: -, *, +, 1., 1); nesting by any indent; [ ]/[x] tasks; an indented line continues the item; ordered items count on across deeper ones; a bullet resets', () => {
  const doc = parse('- a\n    * b\n        + c\n1. one\n2) two\n- [x] done\n- [ ] not\n- first line\n  second line\n');
  expect(doc.blocks.map((b) => b.k === 'li' && [b.depth, b.runs.map((r) => r.t).join(''), b.ord, b.done])).toStrictEqual([
    [0, 'a', undefined, undefined],
    [1, 'b', undefined, undefined],
    [2, 'c', undefined, undefined],
    [0, 'one', true, undefined],
    [0, 'two', true, undefined],
    [0, 'done', undefined, true],
    [0, 'not', undefined, false],
    [0, 'first line\nsecond line', undefined, undefined],
  ]);
  same('- a\n  - b\n    - c\n1. one\n2. two\n- [x] done\n- [ ] not\n- first line\n  second line\n');
  expect(write({ head: {}, blocks: [li(0, 'a', { ord: true }), li(1, 'x'), li(0, 'b', { ord: true }), li(0, 'c'), li(0, 'd', { ord: true })] })).toBe('1. a\n  - x\n2. b\n- c\n1. d\n');
});

test('rules: three or more -, * or _ with optional spaces → ---; a rule ends the list nesting', () => {
  const doc = parse('- a\n  - b\n* * *\n  - c\n___\n');
  expect(doc.blocks.map((b) => (b.k === 'li' ? b.depth : b.k))).toStrictEqual([0, 1, 'hr', 0, 'hr']);
  same('- a\n  - b\n\n---\n\n- c\n\n---\n');
});

test('tables: header, separator, optional outer pipes, \\| and \\\\ escapes, <br> a newline, rows padded; edged when one column, when the first heading reads as a block, or when a row starts empty', () => {
  const doc = parse('| What | Qty:number |\n| :--- | ---: |\n| a \\| b | 1<br>2 |\n| short |\n');
  expect(doc.blocks[0]).toStrictEqual({ k: 'table', cols: [{ name: 'What', type: 'text' }, { name: 'Qty', type: 'number' }], rows: [['a | b', '1\n2'], ['short', '']] });
  same('What | Qty:number\n--- | ---\na \\| b | 1<br>2\nshort |\n');
  same('| Words |\n| --- |\n| a |\n| b \\\\ c |\n');
  same('| # of units | Cost |\n| --- | --- |\n| 3 | x\\|y |\n');
  same('From | To\n--- | ---\n| | x\na | b\n');
  // Lenient column types are written canonically.
  expect(write(parse('Price: money | Time: 10am\n--- | ---\n1 | 2\n'))).toBe('Price:money | Time: 10am\n--- | ---\n1 | 2\n');
});

test('fences: ``` or ~~~, three or more, the closer at least as long; written with one more backtick than the longest run inside; lang lowercased', () => {
  const doc = parse('~~~Sheet\na | b\n~~~\n\n````\n```\ninner\n```\n````\n');
  expect(doc.blocks[0]).toStrictEqual({ k: 'fence', lang: 'sheet', body: 'a | b' });
  expect(doc.blocks[1]).toStrictEqual({ k: 'fence', lang: '', body: '```\ninner\n```' });
  expect(write(doc)).toBe('```sheet\na | b\n```\n\n````\n```\ninner\n```\n````\n');
  same('```sheet {chart=bar}\nQ | Sales\n--- | ---\nQ1 | 120\n```\n');
  same('```\n```\n');
});

test('edges: ~ A -> B: label with ->, <-, <->, --; consecutive edges on consecutive lines', () => {
  const doc = parse('~ Web -> API: requests\n~ API <-> Cache\n~ A <- B\n~ Ops -- Product\n');
  expect(doc.blocks.map((b) => b.k === 'edge' && [b.from, b.dir, b.to, b.label])).toStrictEqual([
    ['Web', '->', 'API', 'requests'],
    ['API', '<->', 'Cache', undefined],
    ['A', '<-', 'B', undefined],
    ['Ops', '--', 'Product', undefined],
  ]);
  same('~ Web -> API: requests\n~ API <-> Cache\n~ A <- B\n~ Ops -- Product\n');
  same('~ A -> B\n\nWords\n\n~ C -> D\n');
});

test('images: ![alt](url) alone on a line, <url> accepted, \\] in alt', () => {
  const doc = parse('![A \\] b](<https://x.y/p.png>)\n');
  expect(doc.blocks[0]).toStrictEqual({ k: 'img', alt: 'A ] b', url: 'https://x.y/p.png' });
  expect(write(doc)).toBe('![A \\] b](https://x.y/p.png)\n');
  same('![The plan](https://tinylittleoffice.com/#/v0/deck/abc)\n');
  same('![](https://images.unsplash.com/photo?w=400)\n');
});

test('quotes: > lines merge into one block, written a line each', () => {
  const doc = parse('> one\n> two\n>three\n');
  expect(doc.blocks).toStrictEqual([{ k: 'quote', runs: [{ t: 'one\ntwo\nthree' }] }]);
  same('> one\n> two\n> three\n');
  same('> :cart: The shop | https://example.com/shop\n> :mail: Email me | mailto:ada@example.com\n');
});

test('paragraphs: consecutive lines merge, a blank separates, a line that reads as a block is guarded with \\, a lone | is itself, Write\'s empty paragraph is <br>', () => {
  const doc = parse('one\ntwo\n\nthree\n');
  expect(doc.blocks).toStrictEqual([{ k: 'p', runs: [{ t: 'one\ntwo' }] }, { k: 'p', runs: [{ t: 'three' }] }]);
  same('one\ntwo\n\nthree\n');
  for (const t of ['# not a heading', '- not an item', '1. not a number', '> not a quote', '---', '~ a -> b', '| a | b', '```', '![x](y)', '[ ] not a task', '2026. A year']) {
    const d: Doc = { head: {}, blocks: [{ k: 'p', runs: [{ t }] }] };
    expect(parse(write(d))).toStrictEqual(d);
  }
  same('\\# not a heading\n');
  same('Left\n|\nRight\n');
  same('<br>\n');
  // The model holds the empty paragraph itself (the editor draws and edits it); the text keeps the <br>.
  expect(parse('<br>\n').blocks).toStrictEqual([{ k: 'p', runs: [] }]);
});

test('inline: the marks, no space just inside, backticks as plain words, links, icons, notes, escapes, a web address whole, marks close before trailing spaces', () => {
  same('a **b** *i* ++u++ ~~s~~ ==h== :rocket: [w *x*](https://x.y)\n');
  const doc = parse('__bold__ _it_ <u>under</u> `code` ** not** [x](y) 5 * 3 snake_case\n');
  expect(doc.blocks[0]).toStrictEqual({ k: 'p', runs: [{ t: 'bold', b: true }, { t: ' ' }, { t: 'it', i: true }, { t: ' ' }, { t: 'under', u: true }, { t: ' code ** not** [x](y) 5 * 3 snake_case' }] });
  // Written back with the least escaping that reads the same: "** not**" and "5 * 3" are words as they stand.
  expect(write(doc)).toBe('**bold** *it* ++under++ code ** not** [x](y) 5 * 3 snake_case\n');
  expect(write({ head: {}, blocks: [{ k: 'p', runs: [{ t: 'a *b* c' }] }] })).toBe('a \\*b\\* c\n');
  expect(write({ head: {}, blocks: [{ k: 'p', runs: [{ t: '```' }] }] })).toBe('\\`\\`\\`\n');
  same('5 * 3 * 2 and snake_case and 2*3\n');
  same('[a link with spaces](https://x.y/a%20b) and [mail](mailto:a@b.c) and [tel](tel:+1) and [here](#top)\n');
  expect(parse('[sp ace](https://x.y/a b)\n').blocks[0]).toStrictEqual({ k: 'p', runs: [{ t: '[sp ace](https://x.y/a b)' }] });
  same('Words^[a note with *italics* and a [link](https://x.org/)] here.\n');
  same('see https://x.com/a_b?q=1&r=_2_ now.\n');
  same('a \\* b \\_ c \\\\ d \\^[x] \\:icon: \\<u>\n');
  expect(write({ head: {}, blocks: [{ k: 'p', runs: [{ t: 'bold ', b: true }, { t: 'then' }] }] })).toBe('**bold** then\n');
  expect(write({ head: {}, blocks: [{ k: 'p', runs: [{ t: 'see ^[this]' }] }] })).toBe('see \\^[this]\n');
});
