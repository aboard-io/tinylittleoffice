// A trip as text (def.text): its stops in order, each with its note.
import { expect, test } from 'vitest';
import trip from '../def.ts';

test('the stops in order, each with its note', () => {
  expect(trip.text!('Place | Lat:number | Lon:number | Note\n--- | --- | --- | ---\nNyhavn | 55.6798 | 12.5907 | Friday 18:00: dinner on the quay\nTivoli | 55.6737 | 12.5681 | \n')).toStrictEqual([
    {
      k: 'list',
      ord: true,
      items: [{ runs: [{ t: 'Nyhavn', b: true }, { t: ': Friday 18:00: dinner on the quay' }] }, { runs: [{ t: 'Tivoli', b: true }] }],
    },
  ]);
});

test('every template has its stops', () => {
  for (const tp of trip.templates) expect((trip.text!(tp.doc)[0] as { items: unknown[] }).items.length, tp.id).toBeGreaterThan(1);
});
