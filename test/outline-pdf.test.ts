// An outline's PDF is words, not a picture: sections (bookmarked), bullets, links, across Letter pages.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { execFileSync } from 'node:child_process';
import { existsSync, mkdtempSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import '../src/apps/index.ts';
import { appOf } from '../src/kit/core.ts';
import { outlineBlocks } from '../src/apps/outline.def.ts';
import { measure } from '../src/kit/textpdf.ts';

const DOC = '- Launch\n  - Product\n    - Pricing {.from label=sets}\n    - See [the plan](https://a.co/plan) and more\n  - Marketing\n    - Press\n      - A long line of words that goes on far past the width of a Letter page and so has to wrap onto another line\n\n~ Pricing -> Press';
const pdfOf = (body: string, title = '') => appOf('outline')!.downloads!.find((d) => d.ext === 'pdf')!.build!(body, { created: null, title });
const latin = (b: Uint8Array) => String.fromCharCode(...b);

test('a lone top item is the title, the items under it the sections, the rest bullets; joins listed at the end', () => {
  const blocks = outlineBlocks(DOC);
  assert.deepEqual(blocks.map((b) => [b.kind, b.depth ?? '', b.runs.map((r) => r.t).join('')]).slice(0, 5), [
    ['title', '', 'Launch'],
    ['h', '', 'Product'],
    ['li', 0, 'sets — Pricing'],
    ['li', 0, 'See the plan and more'],
    ['h', '', 'Marketing'],
  ]);
  assert.deepEqual(blocks.at(-2)!.runs.map((r) => r.t), ['Connections']);
  // Several top items: each a section, the document's own title above them.
  assert.deepEqual(outlineBlocks('- A\n  - a1\n- B', 'Two parts').map((b) => b.kind), ['title', 'h', 'li', 'h']);
});

test('the PDF is text: a bookmark a section, a link to click, words a reader can find', () => {
  const pdf = latin(pdfOf(DOC, 'Launch'));
  assert.ok(pdf.startsWith('%PDF-1.4'));
  assert.ok(!pdf.includes('/Subtype /Image'), 'no pictures of pages');
  assert.match(pdf, /\/Type \/Outlines \/First \d+ 0 R \/Last \d+ 0 R \/Count 3/);
  assert.ok(pdf.includes('/URI (https://a.co/plan)'));
  assert.ok(pdf.includes('(Pricing) Tj'));
  // One place to click for a link of several words.
  assert.equal((pdf.match(/\/Subtype \/Link/g) ?? []).length, 1);
});

test('a long outline goes on to more pages; a character Helvetica lacks is "?", and Latin-1 is kept', () => {
  const many = '- Top\n' + Array.from({ length: 30 }, (_, i) => `  - Section ${i}\n    - item ${i} café ★`).join('\n');
  const pdf = latin(pdfOf(many));
  assert.match(pdf, /\/Type \/Pages \/Kids \[[^\]]*\] \/Count [2-9]/);
  // (Each word is written on its own.)
  assert.ok(pdf.includes('(caf\u00e9 ) Tj'));
  assert.ok(pdf.includes('(?) Tj'));
  assert.equal(measure('Hello', 10), 22.78);
});

test('a PDF reader reads it back as the outline', { skip: !existsSync('/usr/bin/pdftotext') }, () => {
  const dir = mkdtempSync(join(tmpdir(), 'opdf-'));
  writeFileSync(join(dir, 'o.pdf'), pdfOf(DOC, 'Launch'));
  const text = execFileSync('pdftotext', ['-layout', join(dir, 'o.pdf'), '-']).toString();
  for (const want of ['Launch', 'Product', 'sets — Pricing', 'See the plan and more', 'Marketing', 'Press', 'Connections', 'Pricing to Press']) assert.ok(text.includes(want), `${want}\n${text}`);
  assert.match(execFileSync('pdfinfo', [join(dir, 'o.pdf')]).toString(), /Page size:\s+612 x 792/);
});

test('pages are numbered at their foot when there is more than one; a single page is not', { skip: !existsSync('/usr/bin/pdftotext') }, async () => {
  const { pdf } = await import('../src/kit/pdf.ts');
  const dir = mkdtempSync(join(tmpdir(), 'pnum-'));
  const many = '- Top\n' + Array.from({ length: 40 }, (_, i) => `  - Section ${i}\n    - item ${i}`).join('\n');
  writeFileSync(join(dir, 'text.pdf'), pdfOf(many));
  const text = execFileSync('pdftotext', ['-layout', join(dir, 'text.pdf'), '-']).toString();
  const pages = +/Pages:\s+(\d+)/.exec(execFileSync('pdfinfo', [join(dir, 'text.pdf')]).toString())![1];
  assert.ok(pages > 1);
  // (A reader may take the thin spaces round the slash out.)
  for (let i = 1; i <= pages; i++) assert.match(text, new RegExp(`\\b${i} ?/ ?${pages}\\b`), `page ${i}`);
  assert.ok(!latin(pdfOf('- Just\n  - one')).includes(' / 1)'));
  // The picture PDFs (every other app) are numbered the same way, and still read as a PDF.
  const jpeg = new Uint8Array([0xff, 0xd8, 0xff, 0xd9]);
  const two = pdf([{ w: 816, h: 1056, pw: 1, ph: 1, jpeg }, { w: 816, h: 1056, pw: 1, ph: 1, jpeg }], 'Two');
  writeFileSync(join(dir, 'pics.pdf'), two);
  assert.match(execFileSync('pdfinfo', [join(dir, 'pics.pdf')]).toString(), /Pages:\s+2/);
  assert.ok(latin(two).includes('(1 / 2) Tj') && latin(two).includes('(2 / 2) Tj'));
  assert.ok(!latin(pdf([{ w: 816, h: 1056, pw: 1, ph: 1, jpeg }], 'One')).includes(' Tj'));
});
