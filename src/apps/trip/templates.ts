/**
 * Trip's templates: Blank is the app's own page (an empty map to tap); these are the rest, each a real route
 * written by the kernel, so each is canonical and round-trips byte for byte (the corpus test holds every one).
 * One in each way of measuring: kilometres, miles, hours of driving, and places that are dots, not a route.
 */
import type { Template } from '../../kit/app.ts';
import { t } from '../../kit/i18n.ts';
import { column, write, type Head } from '../../doc/index.ts';
import { TRIP_HEAD } from './model.ts';

const trip = (head: Head, ...rows: string[][]) => write({ head, blocks: [{ k: 'table', cols: TRIP_HEAD.map(column), rows }] });

const PORTUGAL = trip(
  { units: 'km' },
  ['Lisbon', '38.7223', '-9.1393', 'Pastéis de nata in Belém, then the 28 tram up to Graça'],
  ['Sintra', '38.8029', '-9.3817', 'Pena Palace first thing, before the coaches'],
  ['Óbidos', '39.3606', '-9.1571', 'Walk the town walls; ginjinha in a chocolate cup'],
  ['Coimbra', '40.2033', '-8.4103', 'The Joanina Library: book the 10:00 slot'],
  ['Porto', '41.1579', '-8.6291', 'Port cellars across the river in Gaia'],
);

const COAST = trip(
  { units: 'miles' },
  ['San Francisco', '37.7749', '-122.4194', 'Pick up the car on Saturday morning'],
  ['Santa Cruz', '36.9741', '-122.0308', 'Lunch on the wharf'],
  ['Monterey', '36.6002', '-121.8947', 'The aquarium opens at 9:30'],
  ['Big Sur', '36.2704', '-121.8081', 'Fill up in Carmel: no gas for sixty miles'],
  ['San Simeon', '35.6852', '-121.1682', 'Elephant seals at Piedras Blancas'],
  ['Santa Barbara', '34.4208', '-119.6982', 'Two nights at the Agave Inn'],
  ['Los Angeles', '34.0522', '-118.2437', 'Car back at LAX by noon on Friday'],
);

const HIGHLANDS = trip(
  {},
  ['Edinburgh', '55.9533', '-3.1883', 'Collect the hire car on Leith Walk'],
  ['Pitlochry', '56.7024', '-3.7349', 'The salmon ladder and a dram at Blair Athol'],
  ['Inverness', '57.4778', '-4.2247', 'Two nights; Loch Ness cruise on day two'],
  ['Portree', '57.4125', '-6.1964', 'Old Man of Storr at sunrise'],
  ['Fort William', '56.8198', '-5.1052', 'The Jacobite steam train, booked for 10:15'],
  ['Glencoe', '56.6826', '-5.1023', 'The Lost Valley walk, three hours'],
  ['Glasgow', '55.8642', '-4.2518', 'Drop the car at the airport'],
);

const ROME = trip(
  { route: 'dots' },
  ['Colosseum', '41.8902', '12.4922', 'Timed tickets include the Forum and the Palatine'],
  ['Pantheon', '41.8986', '12.4769', 'Free on the first Sunday; go when it rains'],
  ['Trevi Fountain', '41.9009', '12.4833', 'Before eight in the morning, or not at all'],
  ['Vatican Museums', '41.9065', '12.4536', 'Closed on Sundays; the Sistine Chapel is last'],
  ['Santa Maria in Trastevere', '41.8894', '12.4703', 'Dinner nearby at Da Enzo; no bookings, queue at seven'],
);

export const templates = (): Template[] => [
  { id: 'portugal', name: t('A week in Portugal'), blurb: t('Lisbon to Porto by car, in kilometres, a tip at every stop.'), doc: PORTUGAL },
  { id: 'coast', name: t('Down the Pacific coast'), blurb: t('San Francisco to Los Angeles on Highway 1, in miles.'), doc: COAST },
  { id: 'highlands', name: t('The Scottish Highlands'), blurb: t('A loop from Edinburgh, each leg in hours of driving.'), doc: HIGHLANDS },
  { id: 'rome', name: t('Rome, the places to see'), blurb: t('Places as dots, not a route: what to see and when to go.'), doc: ROME },
];
