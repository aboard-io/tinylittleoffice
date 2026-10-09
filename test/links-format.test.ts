// Linked words: "[words](address)" in every text that takes marks, carried into Markdown, pictures and downloads.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { linkable, parseDoc, parseInline, plainInline, serializeDoc, serializeInline } from '../src/lib/richtext.ts';
import { fromMarkdown, toMarkdown } from '../src/lib/markdown.ts';
import { appOf, text } from '../src/kit/core.ts';
import '../src/apps/index.ts';
import { fullAddress } from '../src/widgets/link-dialog.ts';

test('linked words are read with their marks, and written back the same', () => {
  const line = 'See [our **big** report](https://ex.com/a_b?x=1) now';
  const runs = parseInline(line);
  assert.deepEqual(runs.map((r) => [r.t, r.href ?? '', !!r.b]), [['See ', '', false], ['our ', 'https://ex.com/a_b?x=1', false], ['big', 'https://ex.com/a_b?x=1', true], [' report', 'https://ex.com/a_b?x=1', false], [' now', '', false]]);
  assert.equal(serializeInline(runs), line);
  assert.equal(plainInline(line), 'See our big report now');
  // Marks around a link stay round it.
  assert.equal(serializeInline(parseInline(serializeInline(parseInline('**bold [link](https://a.co) more**')))), serializeInline(parseInline('**bold [link](https://a.co) more**')));
  assert.ok(parseInline('**bold [link](https://a.co) more**').every((r) => r.b));
});

test('only a web, mail or phone address, or a place in the document, is a link; brackets otherwise are words', () => {
  for (const t of ['[x](javascript:alert(1))', '[x](data:text/html,hi)', 'a [note] b', '[x] (https://a.co)']) assert.ok(parseInline(t).every((r) => !r.href), t);
  for (const u of ['https://a.co', 'mailto:a@b.co', 'tel:+1555', '#section']) assert.equal(parseInline(`[x](${u})`)[0].href, u);
  assert.equal(linkable('javascript:alert(1)'), false);
  // Words that only look like a link are escaped, and stay words.
  const runs = [{ t: 'literal [a](https://b.co)' }];
  assert.deepEqual(parseInline(serializeInline(runs)), runs);
  // An address with spaces or brackets is kept whole.
  assert.equal(parseInline(serializeInline([{ t: 'w', href: 'https://a.co/x (1) y' }]))[0].href, 'https://a.co/x%20%281%29%20y');
});

test('a document keeps links through its blocks', () => {
  const doc = '# [Title](https://a.co)\n\n- an [item](#part)\n\nPlain https://bare.co too';
  assert.equal(serializeDoc(parseDoc(doc)), doc);
});

test('Markdown links come in as links and go out as them; one to nowhere safe keeps its words and address', () => {
  const write = appOf('write')!;
  const body = fromMarkdown(write, 'Read [our **report**](https://ex.com/r) and [mail](mailto:a@b.co).\n\n- [x](javascript:1)');
  assert.equal(body, 'Read [our **report**](https://ex.com/r) and [mail](mailto:a@b.co).\n\n- \\[x](javascript:1)');
  assert.ok(toMarkdown(body).includes('Read [our **report**](https://ex.com/r) and [mail](mailto:a@b.co).'));
  // A deck's bullets and an outline's items take links the same way.
  const deck = appOf('deck')!;
  assert.ok(toMarkdown('Plan\nSee [the doc](https://a.co)').includes('[the doc](https://a.co)'));
});

test('drawn, linked words are a link: on a slide, in a page, in the web page download', () => {
  assert.ok(text(0, 0, parseInline('go [here](https://a.co)')).includes('<a href="https://a.co"><tspan fill="'));
  const deck = appOf('deck')!;
  assert.ok(deck.view('Plan\nSee [the doc](https://a.co)')[0].svg.includes('<a href="https://a.co">'));
  const write = appOf('write')!;
  const web = write.html!('Read [this](https://a.co).', { created: null, base: '' } as never);
  assert.ok(web.includes('<a href="https://a.co">this</a>'), web.slice(0, 400));
});

test('an address typed in the dialog gets its start', () => {
  assert.equal(fullAddress('example.com/x'), 'https://example.com/x');
  assert.equal(fullAddress('ada@example.com'), 'mailto:ada@example.com');
  assert.equal(fullAddress('+1 (555) 010-2000'), 'tel:+15550102000');
  assert.equal(fullAddress('https://a.co'), 'https://a.co');
  assert.equal(fullAddress('javascript:alert(1)'), '');
  assert.equal(fullAddress('just words'), '');
});
