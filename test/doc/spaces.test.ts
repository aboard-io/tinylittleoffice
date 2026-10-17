// Every space a person typed is in the link (Paul, 2026-10-10: "we cannot ever lose spaces if they're there"): a space
// at a line's end or start is written "\ ", an empty line of a block "\", and both read back as they were typed.
import { expect, test } from 'vitest';
import { parse, sayableRuns, write, type Block, type Doc, type Run } from '../../src/doc/index.ts';

const doc = (...blocks: Block[]): Doc => ({ head: {}, blocks });
const p = (t: string, more: Partial<Extract<Block, { k: 'p' }>> = {}): Block => ({ k: 'p', runs: [{ t }], ...more });
/** The document comes back as it was, and its writing is the writing given. */
const keeps = (d: Doc, text: string) => {
  expect(write(d)).toBe(text);
  expect(parse(text)).toStrictEqual(d);
  expect(write(parse(text))).toBe(text);
};

test("a space at a line's end or start is written escaped, and kept", () => {
  keeps(doc(p('One. ')), 'One.\\ \n');
  keeps(doc(p('One. One. One. ')), 'One. One. One.\\ \n');
  keeps(doc(p(' One.')), '\\ One.\n');
  keeps(doc(p('  two  ')), '\\  two \\ \n');
  keeps(doc(p(' ')), '\\ \n');
  keeps(doc(p('  ')), '\\ \\ \n');
  // Before attributes: "Portland,  {.right}" (the walks' replay).
  keeps(doc(p('Portland, ', { a: { cls: ['right'] } })), 'Portland,\\  {.right}\n');
  keeps(doc(p(' ', { a: { id: 'x' } })), '\\  {#x}\n');
  // Each line of a paragraph keeps its own.
  keeps(doc(p('a \n b')), 'a\\ \n\\ b\n');
});

test("a line break at a block's end, and an empty line inside one, are a line of one backslash", () => {
  keeps(doc(p('a\n')), 'a\n\\\n');
  keeps(doc(p('a\n\nb')), 'a\n\\\nb\n');
  keeps(doc(p('a\n\n')), 'a\n\\\n\\\n');
  keeps(doc(p('\na')), '\\\na\n');
  keeps(doc(p('a\n', { a: { cls: ['right'] } })), 'a\n\\ {.right}\n');
  keeps(doc(p('a\n '), p('b')), 'a\n\\ \n\nb\n');
});

test('a heading, an item, a quote and a table cell keep the spaces at their ends', () => {
  keeps(doc({ k: 'h', level: 2, runs: [{ t: 'Title  ' }] }), '## Title \\ \n');
  keeps(doc({ k: 'h', level: 1, runs: [{ t: ' ' }], a: { cls: ['title'] } }), '# \\  {.title}\n');
  keeps(doc({ k: 'li', depth: 0, runs: [{ t: ' ' }] }), '- \\ \n');
  keeps(doc({ k: 'li', depth: 0, done: false, runs: [{ t: ' a ' }] }, { k: 'li', depth: 1, runs: [{ t: 'b\n' }] }), '- [ ] \\ a\\ \n  - b\n    \\\n');
  keeps(doc({ k: 'quote', runs: [{ t: 'a ' }] }), '> a\\ \n');
  keeps(doc({ k: 'quote', runs: [{ t: 'a\n' }], a: { id: 'q' } }), '> a\n> \\ {#q}\n');
  // A quote's empty line between two is ">" as it always was.
  keeps(doc({ k: 'quote', runs: [{ t: 'a\n\nb' }] }), '> a\n>\n> b\n');
  keeps(
    doc({
      k: 'table',
      cols: [
        { name: 'A', type: 'text' },
        { name: 'B', type: 'text' },
      ],
      rows: [
        [' ', 'x '],
        [' y', ''],
      ],
    }),
    'A | B\n--- | ---\n\\  | x\\ \n\\ y |\n',
  );
});

test("the space after an escape is the only one kept: plain spaces at a line's end are trimmed as ever", () => {
  expect(parse('a  \n').blocks[0]).toStrictEqual(p('a'));
  expect(parse('a\\\\ \n').blocks[0]).toStrictEqual(p('a\\'));
  expect(parse('a \\  \n').blocks[0]).toStrictEqual(p('a  '));
  // Written by hand, "\ " is a space anywhere, as "\*" is a star.
  expect(parse('a\\ b\n').blocks[0]).toStrictEqual(p('a b'));
  // Marks on the spaces alone are let go; the spaces stay.
  const marked: Run[] = [{ t: 'a' }, { t: ' ', b: true }];
  expect(parse(write(doc({ k: 'p', runs: marked })))).toStrictEqual(doc(p('a ')));
  const linked: Run[] = [{ t: 'a ', href: 'https://x.y/' }];
  expect(parse(write(doc({ k: 'p', runs: linked })))).toStrictEqual(doc({ k: 'p', runs: [{ t: 'a', href: 'https://x.y/' }, { t: ' ' }] }));
});

test("a document with no space at a line's end writes exactly as it did", () => {
  for (const text of ['Words\n', '# Title {.title}\n\nOne\ntwo\n', '- a\n  - b\n', '> a\n>\n> b\n', 'A | B\n--- | ---\n1 | 2\n', '<br>\n', '#\n', '-\n']) expect(write(parse(text))).toBe(text);
});

// Atlas, 2026-10-17: its server keeps the text and its editors the model, and they disagreed on which spaces were bold.
// A mark ends before the spaces after it and begins after the ones before it, as Markdown has it ("**a **" is no bold);
// the format writes a run "a " in bold before "b" as "**a** b", so a model holding the bold space does not come back.
// The editor keeps its words as the format does (kit/text/textops.ts settle, test/textops.test.ts); sayableRuns says how.
test("a space at a mark's edge is written outside the mark: a model holding it comes back without it, as sayableRuns has it", () => {
  const X = 'https://x.y/';
  const cases: [Run[], string, Run[]][] = [
    [[{ t: 'a ', b: true }, { t: 'b' }], '**a** b', [{ t: 'a', b: true }, { t: ' b' }]],
    [[{ t: 'a ', i: true }, { t: 'b' }], '*a* b', [{ t: 'a', i: true }, { t: ' b' }]],
    [[{ t: 'a ', u: true }, { t: 'b' }], '++a++ b', [{ t: 'a', u: true }, { t: ' b' }]],
    [[{ t: 'a ', s: true }, { t: 'b' }], '~~a~~ b', [{ t: 'a', s: true }, { t: ' b' }]],
    [[{ t: 'a ', h: true }, { t: 'b' }], '==a== b', [{ t: 'a', h: true }, { t: ' b' }]],
    [[{ t: 'a ', c: true }, { t: 'b' }], '`a` b', [{ t: 'a', c: true }, { t: ' b' }]],
    // Before words: the mark begins after the space.
    [[{ t: 'a' }, { t: ' b', b: true }], 'a **b**', [{ t: 'a ' }, { t: 'b', b: true }]],
    // At a line's end the space is written escaped, and unmarked.
    [[{ t: 'a ', b: true }], '**a**\\ ', [{ t: 'a', b: true }, { t: ' ' }]],
    // A mark on spaces alone is no mark; a line break carries none.
    [[{ t: 'a' }, { t: ' ', i: true }, { t: 'b' }], 'a b', [{ t: 'a b' }]],
    [[{ t: 'a\nb', b: true }], '**a**\n**b**', [{ t: 'a', b: true }, { t: '\n' }, { t: 'b', b: true }]],
    // A link keeps a space inside a line, and lets one go at the line's end.
    [[{ t: 'a ', href: X }, { t: 'b' }], `[a ](${X})b`, [{ t: 'a ', href: X }, { t: 'b' }]],
    [[{ t: 'a ', href: X }], `[a](${X})\\ `, [{ t: 'a', href: X }, { t: ' ' }]],
  ];
  for (const [runs, text, back] of cases) {
    const d = doc({ k: 'p', runs });
    expect(write(d)).toBe(`${text}\n`);
    expect(parse(write(d)).blocks[0], text).toStrictEqual({ k: 'p', runs: back });
    // What the format keeps is what reading the text gives, and it reads back as itself.
    expect(sayableRuns(runs), text).toStrictEqual(back);
    expect(parse(write(doc({ k: 'p', runs: back })))).toStrictEqual(doc({ k: 'p', runs: back }));
    expect(sayableRuns(back)).toBe(back);
  }
  // Between two marked words a space keeps the mark, and so does the text.
  const inside: Run[] = [{ t: 'a b', b: true }, { t: ' c' }];
  expect(write(doc({ k: 'p', runs: inside }))).toBe('**a b** c\n');
  expect(sayableRuns(inside)).toBe(inside);
  // A quote's line keeps a link's space at its start, as its reader does.
  const quote: Run[] = [{ t: ' a', href: X }];
  expect(sayableRuns(quote, true)).toBe(quote);
  expect(sayableRuns(quote)).toStrictEqual([{ t: ' ' }, { t: 'a', href: X }]);
  // Markdown has no edge space in a mark, and neither does the reader: "**a **" and "**a\\ **" are words.
  expect(parse('**a **b\n').blocks[0]).toStrictEqual(p('**a **b'));
  expect(parse('**a\\ **b\n').blocks[0]).toStrictEqual(p('**a **b'));
});
