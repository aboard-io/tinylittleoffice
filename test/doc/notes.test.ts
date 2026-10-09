// Footnotes in rich text (written inline as ^[the note], read in Markdown's reference form too, numbered as they
// come), numbered lists, and links in plain words: the pure parts of the old footnotes and richtext tests.
import { expect, test } from 'vitest';
import { linkify, listNumbers, markNotes, noteNumbers, noteRuns, notesOf, parse, parseInline, referenceNotes, runLinks, write, writeInline, type Block } from '../../src/doc/index.ts';

test('inline footnotes read as a run of their own and write back as they were', () => {
  const line = 'Words^[a note with *italics* and a [link](https://x.org/)] here.';
  expect(parseInline(line)).toStrictEqual([{ t: 'Words' }, { t: '', fn: 'a note with *italics* and a [link](https://x.org/)' }, { t: ' here.' }]);
  expect(writeInline(parseInline(line))).toBe(line);
  // The note's words are rich text themselves.
  expect(noteRuns('a note with *italics* and a [link](https://x.org/)')).toStrictEqual([{ t: 'a note with ' }, { t: 'italics', i: true }, { t: ' and a ' }, { t: 'link', href: 'https://x.org/' }]);
  // Brackets inside balance; an escaped one is a bracket; what never closes is words.
  expect(writeInline(parseInline('See^[balanced [1] inside] and^[escaped \\] bracket] end'))).toBe('See^[balanced [1] inside] and^[escaped \\] bracket] end');
  expect(parseInline('Not a note ^[ unclosed')).toStrictEqual([{ t: 'Not a note ^[ unclosed' }]);
  expect(parseInline('Escaped \\^[not a note]')).toStrictEqual([{ t: 'Escaped ^[not a note]' }]);
  // A note set by the editor with stray brackets in it is written so it reads back whole.
  const stray = writeInline([{ t: 'x' }, { t: '', fn: 'a ] b [ c' }]);
  expect(stray).toBe('x^[a \\] b \\[ c]');
  expect(noteRuns(parseInline(stray)[1].fn!)).toStrictEqual([{ t: 'a ] b [ c' }]);
  // Two marks side by side stay two; a mark never merges into the words around it.
  expect(parseInline('Two^[one]^[two].')).toStrictEqual([{ t: 'Two' }, { t: '', fn: 'one' }, { t: '', fn: 'two' }, { t: '.' }]);
  // Words that would read as a note are escaped on the way out.
  expect(writeInline([{ t: 'see ^[this]' }])).toBe('see \\^[this]');
});

test('a document round-trips its notes; the reference form is read and folded into the inline form, in any app', () => {
  const blocks: Block[] = [
    { k: 'h', level: 1, runs: [{ t: 'Title' }, { t: '', fn: 'On the title' }] },
    { k: 'p', runs: [{ t: 'Plain' }, { t: '', fn: 'First' }, { t: ' and ' }, { t: 'bold', b: true }, { t: '', fn: 'Second, **bold** inside' }, { t: '.' }] },
    { k: 'li', depth: 0, runs: [{ t: 'item' }, { t: '', fn: 'Third' }] },
  ];
  const text = write({ head: {}, blocks });
  expect(text).toBe('# Title^[On the title]\n\nPlain^[First] and **bold**^[Second, **bold** inside].\n\n- item^[Third]\n');
  expect(parse(text).blocks).toStrictEqual(blocks);
  expect(notesOf(blocks)).toStrictEqual(['On the title', 'First', 'Second, **bold** inside', 'Third']);
  // Markdown's reference form, as a model or a person writes it: the definitions anywhere, folded in on read; written back inline.
  const ref = '[^b]: Second, with **bold**\n\nHello[^a] world[^b].\n\nMore words, and [^none] stays.\n\n[^a]: First note\n  carried on';
  expect(parse(ref).blocks).toStrictEqual([
    { k: 'p', runs: [{ t: 'Hello' }, { t: '', fn: 'First note carried on' }, { t: ' world' }, { t: '', fn: 'Second, with **bold**' }, { t: '.' }] },
    { k: 'p', runs: [{ t: 'More words, and [^none] stays.' }] },
  ]);
  expect(write(parse(ref))).toBe('Hello^[First note carried on] world^[Second, with **bold**].\n\nMore words, and [^none] stays.\n');
  // The reference form reads in a deck's slide and an outline's item too: the kernel folds for every app.
  expect(write(parse('## A slide[^x]\n\n- Point[^y]\n\n[^x]: On the head\n[^y]: On the point'))).toBe('## A slide^[On the head]\n\n- Point^[On the point]\n');
});

test('referenceNotes writes the notes in the reference form, numbered as they come, defined at the end', () => {
  const body = '# Title^[On the title]\n\nPlain^[First] and **bold**^[Second, **bold** inside].\n\n- item^[Third]\n';
  const out = referenceNotes(parse(body));
  expect(write(out)).toBe('# Title[^1]\n\nPlain[^2] and **bold**[^3].\n\n- item[^4]\n\n[^1]: On the title\n\n[^2]: First\n\n[^3]: Second, **bold** inside\n\n[^4]: Third\n');
  // What comes back reads as the same document.
  expect(write(parse(write(out)))).toBe(body);
  // A document with no notes is itself, the same object.
  const plain = parse('a | b\n--- | ---\n1 | 2\n');
  expect(referenceNotes(plain)).toBe(plain);
});

test('a note is numbered as it comes, and its mark is raised', () => {
  const next = noteNumbers();
  const runs = markNotes(parseInline('A^[one] b^[two]'), next);
  expect(runs).toStrictEqual([{ t: 'A' }, { t: '1', sup: true }, { t: ' b' }, { t: '2', sup: true }]);
  expect(markNotes(parseInline('c^[three]'), next)[1]).toStrictEqual({ t: '3', sup: true });
  expect(noteNumbers(5)()).toBe(6);
});

test('numbered lists count as they come: an ordered item at its depth, a bullet ends the deeper lists, anything else ends them all', () => {
  const doc = parse('1. a\n2. b\n  1. b1\n  2. b2\n3. c\n- d\n1. e\n\nWords\n\n1. f\n');
  const n = listNumbers();
  expect(doc.blocks.map(n)).toStrictEqual([1, 2, 1, 2, 3, undefined, 1, undefined, 1]);
});

test('web addresses in text are links, without being stored as anything but text', () => {
  expect(linkify('See https://example.com/a?b=1, then (http://x.org/y). Done')).toStrictEqual([{ t: 'See ' }, { t: 'https://example.com/a?b=1', url: 'https://example.com/a?b=1' }, { t: ', then (' }, { t: 'http://x.org/y', url: 'http://x.org/y' }, { t: '). Done' }]);
  expect(linkify('no links here: example.com')).toStrictEqual([{ t: 'no links here: example.com' }]);
  expect(linkify('')).toStrictEqual([]);
  expect(runLinks({ t: 'words', href: 'https://x.y/' })).toStrictEqual([{ t: 'words', url: 'https://x.y/' }]);
  expect(runLinks({ t: 'go to https://x.y/page now' })).toStrictEqual([{ t: 'go to ' }, { t: 'https://x.y/page', url: 'https://x.y/page' }, { t: ' now' }]);
});
