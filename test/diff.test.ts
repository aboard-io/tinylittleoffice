// What the second of two documents changed, block by block (kit/diff.ts, ported from the old lib/diff.ts).
import { test, expect } from 'vitest';
import { blocksOf, diff, diffLines, tally } from '../src/kit/diff.ts';

test('the longest common run is kept; what is left is taken out or put in, in reading order', () => {
  expect(diffLines(['a', 'b', 'c'], ['a', 'c', 'd'])).toEqual([
    { kind: ' ', line: 'a' },
    { kind: '-', line: 'b' },
    { kind: ' ', line: 'c' },
    { kind: '+', line: 'd' },
  ]);
  expect(diffLines([], ['x'])).toEqual([{ kind: '+', line: 'x' }]);
  expect(diffLines(['x'], [])).toEqual([{ kind: '-', line: 'x' }]);
  expect(diffLines([], [])).toEqual([]);
});

test('documents compare by blocks as TLO writes them: a paragraph of two lines is one block, the head a line per field', () => {
  expect(blocksOf('---\ntitle: Plan\n---\n# Goals\n\nShip it\non Friday\n\n- one\n- two\n')).toEqual(['title: Plan', '# Goals', 'Ship it\non Friday', '- one', '- two']);
  const changes = diff('---\ntitle: Plan\n---\n# Goals\n\n- one\n- two\n', '---\ntitle: Plan, revised\n---\n# Goals\n\n- one\n- three\n');
  expect(changes).toEqual([
    { kind: '-', line: 'title: Plan' },
    { kind: '+', line: 'title: Plan, revised' },
    { kind: ' ', line: '# Goals' },
    { kind: ' ', line: '- one' },
    { kind: '-', line: '- two' },
    { kind: '+', line: '- three' },
  ]);
  expect(tally(changes)).toEqual({ removed: 2, added: 2 });
  // The same document written two ways is the same document.
  expect(tally(diff('* one\n* two\n', '- one\n- two\n'))).toEqual({ removed: 0, added: 0 });
});
