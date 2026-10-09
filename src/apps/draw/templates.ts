/**
 * Draw's templates: Blank is the app's own page; these are the rest, each a real drawing written by the
 * kernel (so each is canonical and round-trips byte for byte). Four of shapes, two of pixels.
 */
import type { Template } from '../../kit/app.ts';
import { t } from '../../kit/i18n.ts';
import { column, write, type Block, type Doc } from '../../doc/index.ts';

const COLS = ['Kind', 'X', 'Y', 'W', 'H', 'Style', 'Label'];
const table = (rows: string[][]): Block => ({ k: 'table', cols: COLS.map(column), rows: rows.map((r) => COLS.map((_, c) => r[c] ?? '')) });
const shapes = (head: Doc['head'], ...rows: string[][]): string => write({ head, blocks: [table(rows)] });
const pixels = (grid: number, ...rows: string[]): string => write({ head: { grid: String(grid) }, blocks: [{ k: 'p', runs: [{ t: rows.join('\n') }] }] });

export const templates = (): Template[] => [
  {
    id: 'request',
    name: t('Request flow'),
    blurb: t('A browser asks a server, which reads the data: boxes joined by arrows.'),
    doc: shapes({ alt: 'A browser asks a server, which reads the data.' }, ['o', '4', '6', '16', '8', '1b', 'Browser'], ['o', '32', '6', '16', '8', '1b', 'Server'], ['c', '60', '5', '14', '10', '1g', 'Data'], ['k', '0', '1', '0', '0', '0', 'asks'], ['k', '1', '2', '0', '0', '0', 'reads']),
  },
  {
    id: 'flowchart',
    name: t('Flowchart'),
    blurb: t('Start, a question, two answers and an end: the shapes a flowchart is made of.'),
    doc: shapes(
      { alt: 'A flowchart: start, is the kettle on? Yes: make tea. No: switch it on, then make tea. Then drink.' },
      ['o', '30', '2', '20', '6', '1g', 'Start'],
      ['d', '26', '12', '28', '12', '0', 'Is the kettle on?'],
      ['r', '4', '28', '20', '8', '1o', 'Switch it on'],
      ['r', '30', '28', '20', '8', '1b', 'Make tea'],
      ['o', '30', '40', '20', '6', '2g', 'Drink'],
      ['k', '0', '1', '0', '0', '0', ''],
      ['k', '1', '3', '0', '0', '0', 'yes'],
      ['k', '1', '2', '0', '0', '0', 'no'],
      ['k', '2', '3', '0', '0', '0', ''],
      ['k', '3', '4', '0', '0', '0', ''],
    ),
  },
  {
    id: 'tiers',
    name: t('Three tiers'),
    blurb: t('Phone and laptop, an API, a database and a cache: a system drawn with icons and joins.'),
    doc: shapes(
      { alt: 'A phone and a laptop talk to an API, which reads a database and a cache.' },
      ['i', '6', '4', '8', '8', '0', 'phone2'],
      ['i', '6', '18', '8', '8', '0', 'laptop'],
      ['o', '30', '10', '20', '8', '1b', ':server API'],
      ['c', '60', '2', '14', '10', '1p', 'Postgres'],
      ['c', '60', '18', '14', '10', '1o', 'Cache'],
      ['n', '26', '30', '28', '12', '1', 'Every request is logged | with its latency and status'],
      ['k', '0', '2', '0', '0', '0', 'https'],
      ['k', '1', '2', '0', '0', '0', 'https'],
      ['k', '2', '3', '0', '0', '0', 'sql'],
      ['k', '2', '4', '0', '0', '1', 'get'],
    ),
  },
  {
    id: 'floorplan',
    name: t('Floor plan'),
    blurb: t('A one-bedroom flat from above: rooms as rectangles, labelled, with the doors as gaps.'),
    doc: shapes(
      { alt: 'The floor plan of a one-bedroom flat: a living room and kitchen on the left, a hall in the middle, a bedroom and bathroom on the right.' },
      ['r', '2', '2', '36', '26', '1', 'Living room | 5.2 × 4.1 m'],
      ['r', '2', '28', '36', '20', '1g', 'Kitchen | 5.2 × 3.2 m'],
      ['r', '38', '2', '10', '46', '0', 'Hall'],
      ['r', '48', '2', '30', '28', '1b', 'Bedroom | 4.3 × 4.4 m'],
      ['r', '48', '30', '30', '18', '1p', 'Bathroom'],
      ['l', '38', '12', '0', '6', '2', ''],
      ['l', '38', '34', '0', '6', '2', ''],
      ['l', '48', '12', '0', '6', '2', ''],
      ['l', '48', '36', '0', '6', '2', ''],
      ['t', '40', '47', '8', '3', '01', 'N ↑'],
    ),
  },
  {
    id: 'heart',
    name: t('Pixel heart'),
    blurb: t('A 16 by 16 heart in pixels, to colour in or start over from.'),
    doc: pixels(16, '....cc....cc....', '...cccc..cccc...', '..cccccccccccc..', '..chccccccccccc.', '..chccccccccccc.', '..cccccccccccc..', '...cccccccccc...', '....cccccccc....', '.....cccccc.....', '......cccc......', '.......cc.......'),
  },
  {
    id: 'tile',
    name: t('Background tile'),
    blurb: t('An 8 by 8 pattern that repeats: use it as the background of a drawing, or any page.'),
    doc: pixels(8, 'b...b', '.b.b.b', '..b', '.b.b.b', 'b...b', '.....b.b', '......b', '.....b.b'),
  },
];
