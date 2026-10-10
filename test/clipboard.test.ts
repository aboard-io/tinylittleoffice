// The clipboard without a browser: copy writes TLO and marked HTML; paste picks its route (our own HTML, a
// Tiny Little Office link, a web address, pasted Markdown, plain words) and fits what it finds to the editor's shape.
// (htmlToBlocks needs a DOM parser; it is tested in test/browser/text.test.ts.)
import { expect, test } from 'vitest';
import { parse, write } from '../src/doc/index.ts';
import { copyData, docToHtml, fitBlocks, linkToFence, pasteFrom, runsToHtml, type Pasted } from '../src/kit/clipboard.ts';
import { lookup } from '../src/kit/app.ts';
import { encodeDoc } from '../src/kit/codec.ts';
import { caret } from '../src/kit/textops.ts';

const B = parse('# Head\n\nSome **bold** [words](https://x.y) :star: and^[a note] more.\n\n- a\n  1. b\n\n---\n\n![pic](https://p.q/r.png)\n').blocks;

test('copy: the selected blocks as TLO, the first and last cut at the selection, and as HTML with our marker', () => {
  const { text, html } = copyData(B, { anchor: { block: 0, offset: 2 }, focus: { block: 1, offset: 9 } });
  expect(text).toBe('# ad\n\nSome **bold**\n');
  expect(html.startsWith('<meta name="generator" content="TinyLittleOffice">')).toBe(true);
  expect(html).toContain('<h1>ad</h1>');
  expect(html).toContain('<p>Some <b>bold</b></p>');
});

test('docToHtml: lists nest by depth, chips and links and pictures come through', () => {
  const html = docToHtml(B);
  expect(html).toContain('<ul>\n<li>a</li>\n<ol>\n<li>b</li>\n</ol>\n</ul>');
  expect(html).toContain('<a href="https://x.y">words</a>');
  expect(html).toContain('<span data-icon="star">:star:</span>');
  expect(html).toContain('<sup data-fn="a note">*</sup>');
  expect(html).toContain('<hr>');
  expect(html).toContain('<img src="https://p.q/r.png" alt="pic" referrerpolicy="no-referrer">');
  expect(runsToHtml([{ t: 'a<b', b: true, i: true, u: true, s: true, h: true }, { t: 'x\ny' }])).toBe('<b><i><u><s><mark>a&lt;b</mark></s></u></i></b>x<br>y');
});

test('paste, in order: our HTML → the TLO; a Tiny Little Office link → a fence; an address → a card; lines → TLO; words → words', () => {
  const own = pasteFrom({ text: '# T\n\n- i\n', html: '<meta name="generator" content="TinyLittleOffice"><h1>T</h1>' }, 'doc');
  expect(own).toEqual({ blocks: parse('# T\n\n- i\n').blocks });
  const link = `https://tinylittleoffice.com/#/v1/sheet/${encodeDoc('A | B\n--- | ---\n1 | 2\n')}`;
  expect(linkToFence(link)).toMatchObject({ k: 'fence', lang: 'sheet', body: 'A | B\n--- | ---\n1 | 2\n' });
  expect(linkToFence('https://example.com/#/v1/sheet')).toBeNull();
  expect(pasteFrom({ text: ` ${link} `, html: '' }, 'doc')).toMatchObject({ blocks: [{ k: 'fence', lang: 'sheet' }] });
  expect(pasteFrom({ text: 'https://example.com/a', html: '' }, 'doc')).toEqual({ blocks: [{ k: 'p', runs: [{ t: 'https://example.com/a' }] }] });
  // Not a document shape: an address is words.
  expect(pasteFrom({ text: 'https://example.com/a', html: '' }, 'line')).toEqual({ runs: [{ t: 'https://example.com/a' }] });
  expect(pasteFrom({ text: '## Two\n\n- one\n- two\n', html: '' }, 'doc')).toEqual({ blocks: parse('## Two\n\n- one\n- two\n').blocks });
  expect(pasteFrom({ text: 'just words', html: '' }, 'doc')).toEqual({ runs: [{ t: 'just words' }] });
  expect(pasteFrom({ text: 'two\r\nlines', html: '' }, 'line')).toEqual({ runs: [{ t: 'two lines' }] });
  expect(pasteFrom({ text: 'two\nlines', html: '' }, 'lines')).toEqual({ blocks: [{ k: 'p', runs: [{ t: 'two\nlines' }] }] });
  expect(pasteFrom({ text: '# H\n\n- i\n', html: '' }, 'lines')).toEqual({
    blocks: [
      { k: 'p', runs: [{ t: 'H' }] },
      { k: 'li', depth: 0, runs: [{ t: 'i' }] },
    ],
  });
  expect(pasteFrom({ text: '', html: '' }, 'doc')).toBeNull();
});

test('fitting: lines keeps items and paragraphs (a heading becomes a paragraph, a picture its description); a line joins every word with spaces', () => {
  expect(fitBlocks(B, 'doc')).toEqual({ blocks: B });
  const lines = fitBlocks(B, 'lines');
  expect('blocks' in lines && lines.blocks.map((b) => b.k)).toEqual(['p', 'p', 'li', 'li', 'p']);
  const line = fitBlocks(parse('# A\n\nb\nc\n\n- d\n').blocks, 'line');
  expect(line).toEqual({ runs: [{ t: 'A b c d' }] });
  expect(caret(0, 0)).toEqual({ anchor: { block: 0, offset: 0 }, focus: { block: 0, offset: 0 } });
});

/** What a paste of plain text alone makes, as TLO (blocks) or as the runs it puts among the words. */
const plain = (text: string, shape: 'doc' | 'lines' | 'line' = 'doc') => {
  const got: Pasted | null = pasteFrom({ text, html: '' }, shape);
  return got && 'blocks' in got ? write({ head: {}, blocks: got.blocks }) : got?.runs;
};

test('plain text: bullet glyphs, dashes, stars and numbers are items, nesting by tab or spaces; one line is read too', () => {
  expect(plain('• one\n• two')).toBe('- one\n- two\n');
  expect(plain('- one\n- two')).toBe('- one\n- two\n');
  expect(plain('1. one\n2. two')).toBe('1. one\n2. two\n');
  expect(plain('1) one\n2) two')).toBe('1. one\n2. two\n');
  expect(plain('• a\n\t◦ b\n\t\t▪ c\n• d')).toBe('- a\n  - b\n    - c\n- d\n');
  expect(plain('• a\n    ◦ b')).toBe('- a\n  - b\n');
  expect(plain('– en\n— em\n·\tWord')).toBe('- en\n- em\n- Word\n');
  // Apple Notes writes a list's lines with a tab before the glyph and after it.
  expect(plain('Shopping\n\t•\tEggs\n\t•\tMilk')).toBe('Shopping\n\n- Eggs\n- Milk\n');
  // One line alone.
  expect(plain('* one')).toBe('- one\n');
  expect(plain('• single bullet')).toBe('- single bullet\n');
  expect(plain('1) one')).toBe('1. one\n');
  expect(plain('# Title')).toBe('# Title\n');
  expect(plain('**bold** and *it*')).toEqual([{ t: 'bold', b: true }, { t: ' and ' }, { t: 'it', i: true }]);
  expect(plain('[a link](https://x.y) here')).toEqual([{ t: 'a link', href: 'https://x.y' }, { t: ' here' }]);
  // Words with no syntax stay as they were, spaces and all; a lone dash or star is words; zero-width spaces go.
  expect(plain(' 5 * 3 = 15 ')).toEqual([{ t: ' 5 * 3 = 15 ' }]);
  expect(plain('-')).toEqual([{ t: '-' }]);
  expect(plain('a\u200bb')).toEqual([{ t: 'ab' }]);
  // A year is not an item; ":name:" is an icon only standing apart from other words.
  expect(plain('2026. A year')).toEqual([{ t: '2026. A year' }]);
  expect(plain('ratio a:b:c and :star: here, x:y:')).toEqual([{ t: 'ratio a:b:c and ' }, { t: '', ic: 'star' }, { t: ' here, x:y:' }]);
  // In a slide's words and in a label.
  expect(plain('• one\n• two', 'lines')).toBe('- one\n- two\n');
  expect(plain('• one\n• two', 'line')).toEqual([{ t: 'one two' }]);
  expect(plain('# Title', 'line')).toEqual([{ t: 'Title' }]);
});

test('fitting what a host cannot show: a connection and a fence of no app are words; a table is its rows in lines', () => {
  const was = lookup.appOf;
  lookup.appOf = (id) => (id === 'sheet' ? ({ id } as ReturnType<typeof was>) : undefined);
  try {
    expect(plain('~ A -> B: likes\n\nafter')).toBe('A → B: likes\n\nafter\n');
    expect(plain('```js\nlet x = 1;\n```\n\nafter')).toBe('let x = 1;\n\nafter\n');
    expect(plain('```sheet\nA | B\n```\n\nafter')).toBe('```sheet\nA | B\n```\n\nafter\n');
    expect(plain('A | B\n--- | ---\n1 | 2\n', 'lines')).toBe('A\tB\n\n1\t2\n');
    expect(plain('A | B\n--- | ---\n1 | 2\n\n---\n\n```sheet\nA\n```\n', 'line')).toEqual([{ t: 'A\tB 1\t2' }]);
    // Our own copy pastes into a document as it was.
    const own = pasteFrom({ text: '~ A -> B\n', html: '<meta name="generator" content="TinyLittleOffice"><p>A -> B</p>' }, 'doc');
    expect(own).toMatchObject({ blocks: [{ k: 'edge' }] });
  } finally {
    lookup.appOf = was;
  }
});
