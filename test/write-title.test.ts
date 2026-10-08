// Write's title (big, "# Words {.title}"), and a table in a text drawn as the spreadsheet it is.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import '../src/apps/index.ts';
import { appOf } from '../src/kit/core.ts';
import { parseDoc, serializeDoc } from '../src/lib/richtext.ts';
import { toMarkdown } from '../src/lib/markdown.ts';
import { makeRef, refPage } from '../src/kit/embed.ts';
import { sayDate } from '../src/widgets/date-dialog.ts';

test('a title is "# Words {.title}", read back as a title, and names the document', () => {
  const doc = '# Annual report {.title}\n\n# Summary\n\nWords';
  assert.deepEqual(parseDoc(doc).map((b) => b.k), ['title', 'h1', 'p']);
  assert.equal(serializeDoc(parseDoc(doc)), doc);
  assert.equal(appOf('write')!.title('Intro words\n\n# The name {.title}'), 'The name');
  // Centred, it says so beside the title.
  assert.equal(serializeDoc([{ k: 'title', runs: [{ t: 'Big' }], a: 'c' }]), '# Big {.title .center}');
});

test('the title goes out large: the text itself as Markdown, set big in the web page, the PDF and RTF', () => {
  const write = appOf('write')!;
  assert.equal(toMarkdown(write, '# Annual report {.title}\n\nWords'), '# Annual report {.title}\n\nWords\n');
  assert.match(write.html!('# Annual report {.title}', { created: null }), /<h1 class="title" style="font-size:2\.8em[^"]*">Annual report<\/h1>/);
  assert.ok(write.view('# Annual report {.title}')[0].svg.includes('font-size="48"'));
  const rtf = new TextDecoder().decode(write.downloads!.find((d) => d.ext === 'rtf')!.build!('# Annual report {.title}', { created: null }));
  assert.ok(rtf.includes('\\fs64 Annual report'));
});

test('a Markdown table in a text is an embedded sheet, and is written back as the table', () => {
  const doc = 'Costs:\n\nItem | Cost:money\n--- | ---\nRent | 1200';
  const blocks = parseDoc(doc);
  assert.deepEqual(blocks.map((b) => b.k), ['p', 'e']);
  assert.equal(blocks[1].ref, 'sheet\nItem | Cost:money\n--- | ---\nRent | 1200');
  assert.equal(serializeDoc(blocks), doc);
  // A sheet with more to it than a table (a chart) is a fence.
  assert.equal(serializeDoc([{ k: 'e', runs: [], ref: 'sheet\n---\nchart: bar\n---\nA | B\n--- | ---\n1 | 2' }]), '```sheet\n---\nchart: bar\n---\nA | B\n--- | ---\n1 | 2\n```');
});

test('a table shown in a text is a spreadsheet: letters along the top, numbers down the side, at an ordinary size', () => {
  const ref = makeRef('sheet', 'Item | Cost:money\n--- | ---\nRent | 1200\nFood | 450');
  const page = refPage(ref, { preview: true });
  const words = [...page.svg.matchAll(/<text[^>]*font-size="(\d+)"[^>]*>([^<]*)<\/text>/g)].map((m) => [m[2], +m[1]]);
  for (const w of ['A', 'B', '1', '2', '3']) assert.ok(words.some(([t]) => t === w), `${w} in the strips`);
  assert.ok(words.filter(([t]) => t === 'Rent').every(([, px]) => px === 13));
  assert.ok(page.w < 400 && page.h < 120, `${page.w} x ${page.h}`);
  // On a slide it is still the plain table, set large.
  assert.ok(!refPage(ref).svg.includes('>A</text>'));
});

test('a date is written out as chosen', () => {
  assert.equal(sayDate('2027-03-01'), 'March 1, 2027');
  assert.equal(sayDate('2027-03-01', 'day'), 'Monday, March 1, 2027');
  assert.equal(sayDate('2027-03-01', 'iso'), '2027-03-01');
});
