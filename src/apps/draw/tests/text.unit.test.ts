// A drawing as text (def.text): what it shows in words (its alt), and each shape's label, nothing more.
import { expect, test } from 'vitest';
import draw from '../def.ts';
import anim from '../../anim/def.ts';

const table =
  'Kind | X | Y | W | H | Style | Label\n--- | --- | --- | --- | --- | --- | ---\nr | 0 | 0 | 10 | 5 | 0 | Start \\| here\ni | 0 | 9 | 4 | 4 | 0 | rocket\nk | 0 | 1 | 0 | 0 | 0 | next\nt | 9 | 9 | 9 | 2 | 0 | :star: The end\n';

test('the alt, then each shape’s label in order; a join and an icon alone are not things', () => {
  expect(draw.text!(`---\nalt: A rocket and two words.\n---\n${table}`)).toStrictEqual([
    { k: 'p', runs: [{ t: 'A rocket and two words.' }] },
    { k: 'list', ord: false, items: [{ runs: [{ t: 'Start here' }] }, { runs: [{ t: 'The end' }] }] },
  ]);
  // With no alt, the drawing is described from its shapes.
  expect(draw.text!(table)[0]).toMatchObject({ k: 'p' });
  expect(draw.text!('')).toEqual([]);
});

test('Motion reads the same: its alt and each layer’s label', async () => {
  const tp = (await anim.templates()).find((x) => x.id === 'liftoff')!;
  expect(anim.text!(tp.doc)).toStrictEqual([
    { k: 'p', runs: [{ t: 'A rocket lifts off and flies up and away to the right, under the words Lift off.' }] },
    { k: 'list', ord: false, items: [{ runs: [{ t: 'Lift off' }] }] },
  ]);
});
