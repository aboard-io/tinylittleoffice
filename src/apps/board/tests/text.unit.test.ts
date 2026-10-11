// A board as text (the kernel's layer, kit/text-layer.ts): its columns as headings, its cards as list items with their checklists.
import { expect, test } from 'vitest';
import board from '../def.ts';
import { textLayer } from '../../../kit/text-layer.ts';

test('columns are headings, cards list items, a checklist their tasks', () => {
  expect(textLayer(board, '## To do {color=b}\n\n- Write the **About** page\n  - [x] Interview\n  - [ ] Draft\n\n## Done\n\n- Pick the name\n')).toStrictEqual([
    { k: 'h', level: 2, runs: [{ t: 'To do' }] },
    {
      k: 'list',
      ord: false,
      items: [
        {
          runs: [{ t: 'Write the ' }, { t: 'About', b: true }, { t: ' page' }],
          list: {
            k: 'list',
            ord: false,
            items: [
              { runs: [{ t: 'Interview' }], done: true },
              { runs: [{ t: 'Draft' }], done: false },
            ],
          },
        },
      ],
    },
    { k: 'h', level: 2, runs: [{ t: 'Done' }] },
    { k: 'list', ord: false, items: [{ runs: [{ t: 'Pick the name' }] }] },
  ]);
});
