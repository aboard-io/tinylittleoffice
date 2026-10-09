/**
 * Motion's templates: Blank is the app's own page; these are the rest, each a real motion written by the
 * kernel (so each is canonical and round-trips byte for byte): the shapes as Draw writes them, the keys as
 * the editor does.
 */
import type { Template } from '../../kit/app.ts';
import { t } from '../../kit/i18n.ts';
import { column, write, type Block, type Doc } from '../../doc/index.ts';

const COLS = ['Kind', 'X', 'Y', 'W', 'H', 'Style', 'Label'];
const table = (cols: string[], rows: string[][]): Block => ({ k: 'table', cols: cols.map(column), rows: rows.map((r) => cols.map((_, c) => r[c] ?? '')) });
/** A motion: its head, its shapes (rows of Draw's table), and the keys of each shape that moves, by number. */
const motion = (head: Doc['head'], shapes: string[][], keys: Record<number, string>, cols = COLS): string =>
  write({ head, blocks: [table(cols, shapes), table(['Shape', 'Keys'], Object.entries(keys).map(([i, k]) => [i, k]))] });

export const templates = (): Template[] => [
  {
    id: 'liftoff',
    name: t('Lift off'),
    blurb: t('A rocket climbs away with its shadow as the words rise: two shapes, two keys each.'),
    doc: motion(
      { frames: '24', fps: '8', alt: 'A rocket lifts off and flies up and away to the right, under the words Lift off.' },
      [
        ['t', '4', '20', '20', '4', '04', 'Lift off'],
        ['i', '8', '36', '8', '8', '0b', 'rocket'],
      ],
      { 0: '0,0,0,0,1,0; 23,0,-80,0,1,0,i', 1: '0,0,0,0,1,0; 23,200,-200,80,1,-30,d' },
    ),
  },
  {
    id: 'bounce',
    name: t('Bouncing ball'),
    blurb: t('A ball drops, bounces and comes back up while its shadow grows and shrinks: the keys spaced to look like gravity.'),
    doc: motion(
      { frames: '24', fps: '12', alt: 'A red ball falls to the ground, bounces and rises again, its shadow growing as it nears the floor.' },
      [
        ['l', '4', '46', '72', '0', '0', ''],
        ['e', '36', '44', '6', '1', '1', ''],
        ['e', '36', '2', '6', '6', '2r', ''],
      ],
      {
        1: '0,0,0,0,0.4,0; 10,0,0,0,1.2,0; 23,0,0,0,0.4,0',
        2: '0,0,0,0,1,0; 4,0,60,0,1,0; 7,0,170,0,1,0; 9,0,260,0,1,0; 10,0,304,0,1,0; 12,0,230,0,1,0; 14,0,140,0,1,0; 17,0,60,0,1,0; 20,0,15,0,1,0; 23,0,0,0,1,0',
      },
    ),
  },
  {
    id: 'green',
    name: t('Build is green'),
    blurb: t('A meme in two lines of impact type, and a trophy that spins in, lands and glows.'),
    doc: motion(
      { frames: '24', fps: '8', alt: 'A meme: the words When the build is green, and a trophy that spins in, grows, and glows.' },
      [
        ['t', '6', '3', '68', '6', '04', 'When the build'],
        ['t', '14', '40', '52', '6', '04', 'is green'],
        ['i', '34', '17', '12', '12', '0o', 'trophy'],
      ],
      {
        0: '0,0,0,0,1,0,i',
        1: '0,0,0,0,1,0,i',
        2: '0,0,0,0,0.2,-180; 8,0,0,0,1.3,15; 10,0,0,0,1,0; 12,0,0,0,1,0,n; 23,0,0,0,1,0,nw',
      },
    ),
  },
  {
    id: 'sunrise',
    name: t('Sunrise'),
    blurb: t('The sun comes up from behind the hills and the morning slides in: depth, size and a pen-drawn skyline.'),
    doc: motion(
      { frames: '36', fps: '12', alt: 'The sun rises from behind green hills and grows larger, and the words Good morning slide in from the left.' },
      [
        ['i', '35', '30', '10', '10', '0o', 'sun', ''],
        ['v', '0', '30', '80', '20', '2g', '', '0:100;0:40;18:10;36:45;55:5;78:40;100:20;100:100'],
        ['t', '4', '4', '36', '5', '03', 'Good morning', ''],
      ],
      { 0: '0,0,0,-60,1,0; 35,0,-180,-60,1.6,0', 2: '0,-400,0,0,1,0; 12,-400,0,0,1,0; 20,0,0,0,1,0' },
      [...COLS, 'Points'],
    ),
  },
];
