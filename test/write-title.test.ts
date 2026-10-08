// Write's title (big, "#! "), and a table in a text drawn as the spreadsheet it is.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import '../src/apps/index.ts';
import { appOf } from '../src/kit/core.ts';
import { parseDoc, serializeDoc } from '../src/lib/richtext.ts';
import { toMarkdown } from '../src/lib/markdown.ts';
import { refPage } from '../src/kit/embed.ts';
import * as T from '../src/api.ts';
import { sayDate } from '../src/widgets/date-dialog.ts';

test('a title is "#! ", read back as a title, and names the document', () => {
  const doc = '#! Annual report\n# Summary\nWords';
  assert.deepEqual(parseDoc(doc).map((b) => b.k), ['title', 'h1', 'p']);
  assert.equal(serializeDoc(parseDoc(doc)), doc);
  assert.equal(appOf('write')!.title('Intro words\n#! The name'), 'The name');
});

test('the title goes out large: a top heading in Markdown, set big in the web page, the PDF and RTF', () => {
  const write = appOf('write')!;
  assert.ok(toMarkdown(write, '#! Annual report\nWords').startsWith('# Annual report'));
  assert.match(write.html!('#! Annual report', { created: null }), /<h1 class="title" style="font-size:2\.8em[^"]*">Annual report<\/h1>/);
  assert.ok(write.view('#! Annual report')[0].svg.includes('font-size="48"'));
  const rtf = new TextDecoder().decode(write.downloads!.find((d) => d.ext === 'rtf')!.build!('#! Annual report', { created: null }));
  assert.ok(rtf.includes('\\fs64 Annual report'));
});

test('a table shown in a text is a spreadsheet: letters along the top, numbers down the side, at an ordinary size', () => {
  const ref = T.link('sheet', 'Item\tCost\nRent\t1200\nFood\t450').split('#/v0/')[1];
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
