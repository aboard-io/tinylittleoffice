import { test } from 'node:test';
import assert from 'node:assert/strict';
import { parseDoc, serializeDoc, type Block } from '../src/lib/richtext.ts';

test('round trip with formatting', () => {
  const doc: Block[] = [
    { k: 'h1', runs: [{ t: 'Title' }] },
    { k: 'p', runs: [{ t: 'plain ' }, { t: 'bold', b: true }, { t: ' and ' }, { t: 'both', b: true, i: true }, { t: '.' }] },
    { k: 'ul', runs: [{ t: 'item ' }, { t: 'one', u: true }] },
    { k: 'ol', runs: [{ t: 'step' }] },
    { k: 'p', runs: [] },
    { k: 'h2', runs: [{ t: 'struck', s: true }] },
  ];
  const s = serializeDoc(doc);
  assert.equal(s, '# Title\nplain *bold* and *_both*_.\n- item ^one^\n+ step\n\n## ~struck~');
  assert.deepEqual(parseDoc(s), doc);
});

test('escapes special chars and prefixes', () => {
  const doc: Block[] = [
    { k: 'p', runs: [{ t: '# not a heading' }] },
    { k: 'p', runs: [{ t: '- not a bullet' }] },
    { k: 'p', runs: [{ t: 'a*b_c^d~e\\f' }] },
  ];
  assert.deepEqual(parseDoc(serializeDoc(doc)), doc);
});

test('adjacent runs with same format merge on parse', () => {
  const doc: Block[] = [{ k: 'p', runs: [{ t: 'ab', b: true }, { t: 'cd', b: true }]}];
  assert.deepEqual(parseDoc(serializeDoc(doc)), [{ k: 'p', runs: [{ t: 'abcd', b: true }] }]);
});

test('empty doc', () => {
  assert.deepEqual(parseDoc(''), [{ k: 'p', runs: [] }]);
  assert.equal(serializeDoc([{ k: 'p', runs: [] }]), '');
});

test('web addresses in text are links, without being stored as anything but text', async () => {
  const { linkify } = await import('../src/lib/richtext.ts');
  const { docToHtml, docToRtf } = await import('../src/apps/write.def.ts');
  assert.deepEqual(linkify('See https://example.com/a?b=1, then (http://x.org/y). Done'), [{ t: 'See ' }, { t: 'https://example.com/a?b=1', url: 'https://example.com/a?b=1' }, { t: ', then (' }, { t: 'http://x.org/y', url: 'http://x.org/y' }, { t: '). Done' }]);
  assert.deepEqual(linkify('no links here: example.com'), [{ t: 'no links here: example.com' }]);
  assert.deepEqual(linkify(''), []);
  assert.ok(docToHtml('Read *https://example.com/x* now').includes('<strong><a href="https://example.com/x">https://example.com/x</a></strong> now'));
  assert.ok(docToRtf('Read https://example.com/x now').includes('HYPERLINK "https://example.com/x"'));
});
