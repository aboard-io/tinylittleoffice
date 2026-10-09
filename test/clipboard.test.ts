// The clipboard without a browser: copy writes TLO and marked HTML; paste picks its route (our own HTML, a
// TinyLittleOffice link, a web address, pasted Markdown, plain words) and fits what it finds to the editor's shape.
// (htmlToBlocks needs a DOM parser; it is tested in test/browser/text.test.ts.)
import { expect, test } from 'vitest';
import { parse } from '../src/doc/index.ts';
import { copyData, docToHtml, fitBlocks, linkToFence, pasteFrom, runsToHtml } from '../src/kit/clipboard.ts';
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
  expect(html).toContain('<img src="https://p.q/r.png" alt="pic">');
  expect(runsToHtml([{ t: 'a<b', b: true, i: true, u: true, s: true, h: true }, { t: 'x\ny' }])).toBe('<b><i><u><s><mark>a&lt;b</mark></s></u></i></b>x<br>y');
});

test('paste, in order: our HTML → the TLO; a TinyLittleOffice link → a fence; an address → a card; lines → TLO; words → words', () => {
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
  expect(pasteFrom({ text: '# H\n\n- i\n', html: '' }, 'lines')).toEqual({ blocks: [{ k: 'p', runs: [{ t: 'H' }] }, { k: 'li', depth: 0, runs: [{ t: 'i' }] }] });
  expect(pasteFrom({ text: '', html: '' }, 'doc')).toBeNull();
});

test('fitting: lines keeps items and paragraphs (a heading becomes a paragraph); a line joins every word with spaces', () => {
  expect(fitBlocks(B, 'doc')).toEqual({ blocks: B });
  const lines = fitBlocks(B, 'lines');
  expect('blocks' in lines && lines.blocks.map((b) => b.k)).toEqual(['p', 'p', 'li', 'li']);
  const line = fitBlocks(parse('# A\n\nb\nc\n\n- d\n').blocks, 'line');
  expect(line).toEqual({ runs: [{ t: 'A b c d' }] });
  expect(caret(0, 0)).toEqual({ anchor: { block: 0, offset: 0 }, focus: { block: 0, offset: 0 } });
});
