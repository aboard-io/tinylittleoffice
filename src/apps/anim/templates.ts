/**
 * Motion's templates: Blank is the app's own page; these are the rest, each a real motion written by the
 * kernel (so each is canonical and round-trips byte for byte): the shapes as Draw writes them, the keys as
 * the editor does. Each starts on a moment worth seeing, because the home page's preview is the first frame.
 * templates.md says what each is for.
 */
import type { Template } from '../../kit/app.ts';
import { t } from '../../kit/i18n.ts';
import { column, write, type Block, type Doc } from '../../doc/index.ts';

const COLS = ['Kind', 'X', 'Y', 'W', 'H', 'Style', 'Label'];
const table = (cols: string[], rows: string[][]): Block => ({ k: 'table', cols: cols.map(column), rows: rows.map((r) => cols.map((_, c) => r[c] ?? '')) });
/** A motion: its head, its shapes (rows of Draw's table), and the keys of each shape that moves, by number. */
const motion = (head: Doc['head'], shapes: string[][], keys: Record<number, string>, cols = COLS): string =>
  write({ head, blocks: [table(cols, shapes), table(['Shape', 'Keys'], Object.entries(keys).map(([i, k]) => [i, k]))] });

/**
 * The loading spinner's ring: eight dots round a centre, clockwise from the top, and the keys that swell each
 * in turn and let it shrink back over six frames, so a bright dot runs round the ring once in 16 frames.
 */
const RING = 8;
const ringDots = Array.from({ length: RING }, (_, i) => {
  const a = (i * 2 * Math.PI) / RING;
  return ['e', String(39 + Math.round(10 * Math.sin(a))), String(19 - Math.round(10 * Math.cos(a))), '2', '2', '2b', ''];
});
const ringKeys = Object.fromEntries(
  Array.from({ length: RING }, (_, i) => {
    const peak = 2 * i;
    const size = (f: number) => {
      const d = (f - peak + 16) % 16;
      return d < 6 ? Math.round((1.8 - (0.8 * d) / 6) * 10) / 10 : 1;
    };
    const at = [...new Set([0, peak, (peak + 6) % 16, (peak + 15) % 16, 15])].sort((p, q) => p - q);
    return [i, at.map((f) => `${f},0,0,0,${size(f)},0`).join('; ')];
  }),
);

export const templates = (): Template[] => [
  {
    id: 'liftoff',
    name: t('Lift off'),
    blurb: t('A rocket climbs away with its shadow as the words rise: two shapes, two keys each.'),
    doc: motion(
      { title: 'Lift off', frames: '24', fps: '8', alt: 'A rocket lifts off and flies up and away to the right, under the words Lift off.' },
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
    blurb: t('A ball falls faster and faster to the floor as its shadow grows under it; played forward and back, it bounces for ever.'),
    doc: motion(
      { title: 'Bouncing ball', frames: '12', fps: '12', loop: 'bounce', alt: 'A red ball falls to the floor, gathering speed, and bounces back up, its shadow growing as it nears the ground.' },
      [
        ['l', '4', '46', '72', '0', '0', ''],
        ['e', '34', '44', '12', '2', '1', ''],
        ['e', '36', '4', '8', '8', '2r', ''],
      ],
      {
        1: '0,0,0,0,0.4,0; 7,0,0,0,0.7,0; 11,0,0,0,1.2,0',
        2: '0,0,0,0,1,0; 3,0,20,0,1,0; 5,0,56,0,1,0; 7,0,110,0,1,0; 9,0,182,0,1,0; 10,0,225,0,1,0; 11,0,272,0,1,0',
      },
    ),
  },
  {
    id: 'spinner',
    name: t('Loading spinner'),
    blurb: t('Eight dots in a ring, each swelling in turn, so a bright spot runs round while a page saves.'),
    doc: motion(
      { title: 'Saving', frames: '16', fps: '16', alt: 'A ring of eight blue dots, each growing and shrinking in turn so the largest runs round clockwise, over the words Saving your changes.' },
      [...ringDots, ['t', '28', '36', '48', '4', '03', 'Saving your changes']],
      ringKeys,
    ),
  },
  {
    id: 'curtain',
    name: t('Title card'),
    blurb: t('Red curtains part on opening night and the festival’s name comes forward: played once, it rests on the title.'),
    doc: motion(
      { title: 'Harbour Lights opening night', frames: '30', fps: '12', loop: 'once', alt: 'Red curtains reading Opening night part to show the title Harbour Lights Film Festival, Halifax waterfront, 14 to 18 October 2026.' },
      [
        ['o', '12', '14', '56', '20', '1b4', 'Harbour Lights Film Festival | Halifax waterfront · 14 to 18 October 2026'],
        ['r', '0', '0', '40', '50', '2r4', 'Opening'],
        ['r', '40', '0', '40', '50', '2r4', 'night'],
      ],
      {
        0: '0,0,0,-120,0.8,0; 12,0,0,-120,0.8,0; 22,0,0,0,1.1,0; 29,0,0,0,1.1,0,d',
        1: '0,0,0,0,1,0; 6,0,0,0,1,0; 10,-60,0,0,1,0; 14,-180,0,0,1,0; 18,-330,0,0,1,0',
        2: '0,0,0,0,1,0; 6,0,0,0,1,0; 10,60,0,0,1,0; 14,180,0,0,1,0; 18,330,0,0,1,0',
      },
    ),
  },
  {
    id: 'birthday',
    name: t('Birthday card'),
    blurb: t('A present hops, stars and hearts sway round it, and the greeting shines in rainbow letters.'),
    doc: motion(
      { title: 'Happy birthday, Maya', frames: '16', fps: '8', alt: 'A birthday card: the words Happy birthday, Maya in rainbow colours over a red present that hops, with stars and hearts swaying round it.' },
      [
        ['t', '4', '4', '72', '8', '0p4', 'Happy birthday, Maya!'],
        ['i', '34', '18', '12', '12', '0r', 'gift'],
        ['i', '14', '16', '6', '6', '0o', 'star'],
        ['i', '60', '14', '6', '6', '0r', 'heart'],
        ['i', '20', '32', '5', '5', '0p', 'heart'],
        ['i', '56', '30', '5', '5', '0b', 'star'],
        ['t', '4', '42', '72', '4', '0', 'With love from everyone on the fourth floor · 12 November 2026'],
      ],
      {
        0: '0,0,0,0,1,0,g',
        1: '0,0,0,0,1,0; 3,0,-40,0,1,-8; 6,0,0,0,1,0; 8,0,0,0,1,0; 11,0,-40,0,1,8; 14,0,0,0,1,0',
        2: '0,0,0,0,1,-15; 8,0,-12,0,1.2,15; 15,0,-2,0,1,-11',
        3: '0,0,-12,0,1.2,10; 8,0,0,0,1,-10; 15,0,-10,0,1.2,8',
        4: '0,0,0,0,1,10; 8,0,-12,0,1.2,-10; 15,0,-2,0,1,8',
        5: '0,0,-12,0,1,-15; 8,0,0,0,1.2,15; 15,0,-10,0,1,-11',
      },
    ),
  },
  {
    id: 'standup',
    name: t('Quick standup'),
    blurb: t('A meme with a caption above and one below, and a clock that spins and wobbles in between.'),
    doc: motion(
      { title: 'Just a quick standup', frames: '16', fps: '12', alt: 'A meme: the words Just a quick standup above a clock that spins wildly, and 47 minutes later below it.' },
      [
        ['t', '2', '3', '76', '6', '04', 'Just a quick standup'],
        ['i', '32', '17', '16', '16', '0', 'clock'],
        ['t', '2', '40', '76', '6', '04', '47 minutes later'],
      ],
      { 0: '0,0,0,0,1,0,i', 1: '0,0,0,0,1,0,w; 15,0,0,0,1,675,w', 2: '0,0,0,0,1,0,i' },
    ),
  },
  {
    id: 'green',
    name: t('Build is green'),
    blurb: t('A meme in two lines of impact type, and a trophy that spins in, lands and glows.'),
    doc: motion(
      { title: 'When the build is green', frames: '24', fps: '8', alt: 'A meme: the words When the build is green, and a trophy that spins in, grows, and glows.' },
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
    id: 'flip',
    name: t('Flash card'),
    blurb: t('A card shows a Spanish word, turns over to give the English, and turns back: a turn about its upright axis.'),
    doc: motion(
      { title: 'Spanish, week 6: la biblioteca', frames: '24', fps: '8', alt: 'A flash card reading la biblioteca turns over to show the library, then turns back.' },
      [
        ['o', '16', '8', '48', '28', '1b4', 'la biblioteca | say it aloud before it turns'],
        ['o', '16', '8', '48', '28', '2b4', 'the library | a place to borrow books'],
        ['t', '4', '41', '72', '4', '0', 'Spanish, week 6 · card 3 of 20'],
      ],
      {
        0: '0,0,0,0,1,0; 8,0,0,0,1,0; 11,0,0,0,1,0,,u90; 20,0,0,0,1,0,,u90; 23,0,0,0,1,0',
        1: '0,0,0,0,1,0,,u90; 11,0,0,0,1,0,,u90; 14,0,0,0,1,0; 17,0,0,0,1,0; 20,0,0,0,1,0,,u90; 23,0,0,0,1,0,,u90',
      },
    ),
  },
  {
    id: 'weather',
    name: t('Weather this week'),
    blurb: t('Four days of weather in Lisbon, each icon alive: the sun turns, the cloud drifts, the lightning jolts.'),
    doc: motion(
      { title: 'Lisbon this week', frames: '16', fps: '8', alt: 'A forecast for Lisbon: Monday sunny and 24 degrees, Tuesday cloudy and 21, Wednesday storms and 19, Thursday sunny and 23, each icon moving.' },
      [
        ['t', '4', '2', '72', '6', '04', 'Lisbon this week'],
        ['i', '6', '13', '8', '8', '0o', 'sun'],
        ['i', '26', '13', '8', '8', '0b', 'cloud'],
        ['i', '46', '13', '8', '8', '0p', 'zap'],
        ['i', '66', '13', '8', '8', '0o', 'sun'],
        ['t', '1', '24', '18', '7', '03', 'Mon 12 | Sunny, 24°'],
        ['t', '21', '24', '18', '7', '03', 'Tue 13 | Cloudy, 21°'],
        ['t', '41', '24', '18', '7', '03', 'Wed 14 | Storms, 19°'],
        ['t', '61', '24', '18', '7', '03', 'Thu 15 | Sunny, 23°'],
        ['t', '4', '42', '72', '4', '0', 'Afternoon highs for Lisbon, Monday 12 to Thursday 15 October 2026'],
      ],
      {
        1: '0,0,0,0,1,0; 15,0,0,0,1,42',
        2: '0,0,0,0,1,0; 8,14,0,0,1,0; 15,2,0,0,1,0',
        3: '0,0,0,0,1,0,w; 3,0,0,0,1.3,0,w; 5,0,0,0,1,0; 9,0,0,0,1,0; 10,0,0,0,1.3,0,w; 12,0,0,0,1,0; 15,0,0,0,1,0',
        4: '0,0,0,0,1,22; 15,0,0,0,1,64',
      },
    ),
  },
  {
    id: 'countdown',
    name: t('New Year countdown'),
    blurb: t('Three, two, one, a second each, then the new year arrives in rainbow letters: played once, it rests on the greeting.'),
    doc: motion(
      { title: 'New Year’s Eve at the Boathouse', frames: '24', fps: '4', loop: 'once', alt: 'A countdown at the Boathouse: a large 3, then 2, then 1, then Happy 2027! in rainbow letters, with stars spinning out beside it.' },
      [
        ['t', '4', '3', '72', '4', '03', 'New Year’s Eve at the Boathouse'],
        ['t', '32', '20', '16', '8', '0r4', '3'],
        ['t', '32', '20', '16', '8', '0o4', '2'],
        ['t', '32', '20', '16', '8', '0g4', '1'],
        ['t', '4', '20', '72', '8', '0p4', 'Happy 2027!'],
        ['i', '10', '34', '6', '6', '0o', 'star'],
        ['i', '64', '34', '6', '6', '0b', 'star'],
        ['t', '4', '44', '72', '3', '0', 'Thursday 31 December 2026 · doors at nine'],
      ],
      {
        1: '0,0,0,0,3,0; 3,0,0,0,3.4,0; 4,0,-600,0,3,0',
        2: '0,0,-600,0,3,0; 3,0,-600,0,3,0; 4,0,0,0,3,0; 7,0,0,0,3.4,0; 8,0,-600,0,3,0',
        3: '0,0,-600,0,3,0; 7,0,-600,0,3,0; 8,0,0,0,3,0; 11,0,0,0,3.4,0; 12,0,-600,0,3,0',
        4: '0,0,-600,0,0.5,0; 11,0,-600,0,0.5,0; 12,0,0,0,0.5,0,g; 14,0,0,0,1.3,0,gd; 15,0,0,0,1.1,0,gd; 23,0,0,0,1.1,0,gd',
        5: '0,0,0,0,0.6,0; 12,0,0,0,0.6,0; 14,-40,-40,0,1.4,90; 23,-40,-40,0,1.2,180,d',
        6: '0,0,0,0,0.6,0; 12,0,0,0,0.6,0; 14,40,-40,0,1.4,-90; 23,40,-40,0,1.2,-180,d',
      },
    ),
  },
  {
    id: 'flight',
    name: t('Flight path'),
    blurb: t('A plane crosses a dotted route from London to Lisbon, climbing as it goes, with the flight’s times above.'),
    doc: motion(
      { title: 'London to Lisbon, 24 October', frames: '24', fps: '8', alt: 'A plane flies along a dotted line from a pin at London to a pin at Lisbon, growing as it climbs and shrinking as it lands.' },
      [
        ['t', '4', '2', '72', '6', '03', 'Saturday 24 October 2026 | Heathrow 09:05, Lisbon 11:45'],
        ['l', '11', '24', '56', '12', '1', ''],
        ['i', '8', '16', '6', '6', '0r', 'map-pin'],
        ['i', '64', '28', '6', '6', '0r', 'map-pin'],
        ['t', '3', '25', '16', '3', '0', 'London'],
        ['t', '59', '37', '16', '3', '0', 'Lisbon'],
        ['i', '7', '20', '8', '8', '0b', 'plane'],
      ],
      { 6: '0,0,0,0,0.8,57; 3,56,12,0,1,57; 12,224,48,0,1.4,57; 21,392,84,0,1,57; 23,448,96,0,0.8,57' },
    ),
  },
  {
    id: 'neon',
    name: t('Neon sign'),
    blurb: t('A café’s sign at night: the name flickers, the hours stand out below, and the cup glows and swells.'),
    doc: motion(
      { title: 'Kafé Lindqvist sign', frames: '16', fps: '8', alt: 'A sign for Kafé Lindqvist whose name flickers, with the words open till midnight below and a glowing coffee cup that swells.' },
      [
        ['t', '4', '9', '72', '8', '0p4', 'Kafé Lindqvist'],
        ['t', '4', '19', '72', '5', '0o3', 'open till midnight'],
        ['i', '36', '27', '8', '8', '0o', 'coffee'],
        ['t', '4', '42', '72', '3', '0', 'Linnégatan 14, Göteborg · cardamom buns from seven'],
      ],
      {
        0: '0,0,0,0,1,0,d; 5,0,0,0,1,0,d; 6,0,0,-200,1,0; 7,0,0,0,1,0,d; 8,0,0,-200,1,0; 9,0,0,0,1,0,d; 15,0,0,0,1,0,d',
        1: '0,0,0,0,1,0,d',
        2: '0,0,0,0,1,0,n; 8,0,-4,0,1.2,0,n; 15,0,0,0,1,0,n',
      },
    ),
  },
  {
    id: 'sunrise',
    name: t('Sunrise'),
    blurb: t('The sun comes up from behind the hills and the morning slides in: depth, size and a pen-drawn skyline.'),
    doc: motion(
      { title: 'Good morning', frames: '36', fps: '12', alt: 'The sun rises from behind green hills and grows larger, and the words Good morning slide in from the left.' },
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
