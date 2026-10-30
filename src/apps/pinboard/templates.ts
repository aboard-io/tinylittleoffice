/**
 * The Pinboard's templates: Blank is the app's own (the board's empty table); these are the rest, each a real board
 * with real sample content, written by the kernel so each is canonical and round-trips byte for byte. templates.md
 * says what each is for. Their names and blurbs are the reader's language; their notes are English, as the suite's
 * templates are. No template holds a picture: the site keeps none, and a template is the site's as much as a host's.
 */
import type { Template } from '../../kit/core/app.ts';
import { t } from '../../kit/core/i18n.ts';
import { write, type Doc } from '../../doc/index.ts';
import { emptyTable } from './model.ts';

/** A row: Id, Kind, X, Y, W, H, Color, Words (a join's X and Y are the ids it joins, its W and H blank). */
type Row = [id: string, kind: string, x: number | string, y: number | string, w: number | '', h: number | '', color: string, words: string];
const board = (head: Doc['head'], ...rows: Row[]): string => write({ head, blocks: [{ ...emptyTable(), rows: rows.map((r) => r.map(String)) }] });
const join = (id: string, from: string, to: string, words = '', kind = 'arrow', color = ''): Row => [id, kind, from, to, '', '', color, words];

/** A seminar's board on Rear Window: the acts in frames, what happens on notes, the motifs, and what leads to what. */
const FILM = board(
  { title: 'Rear Window (1954): what Jeff sees' },
  ['act1', 'frame', 0, 0, 680, 400, 'blue', 'Act one: the courtyard'],
  ['act2', 'frame', 720, 0, 680, 400, 'purple', 'Act two: Thorwald'],
  ['motifs', 'frame', 0, 440, 680, 360, 'green', 'Motifs: windows and lenses'],
  ['ask', 'frame', 720, 440, 680, 360, '', 'For Thursday’s seminar'],
  ['n1', 'note', 24, 56, 200, 150, '', 'Jeff, leg in a cast, **watches the windows** across the courtyard'],
  ['n2', 'note', 248, 56, 200, 150, '', 'Each window is a little film: Miss Torso, Miss Lonelyhearts, the newlyweds'],
  ['n3', 'note', 472, 56, 184, 150, 'pink', 'Lisa: *“Tell me everything you saw, and what you think it means”*'],
  ['n4', 'note', 24, 228, 200, 150, '', 'A night of rain; a scream; a man goes out with his case, three times'],
  ['n5', 'note', 744, 56, 200, 150, '', 'The wife’s bed is empty; the flower bed is dug up and replanted'],
  ['n6', 'note', 968, 56, 200, 150, 'orange', 'The dog that dug there is found dead'],
  ['n7', 'note', 1192, 56, 184, 150, 'pink', 'Lisa crosses into Thorwald’s room: **the watcher’s space is broken**'],
  ['n8', 'note', 968, 228, 200, 150, '', 'Thorwald looks back across the courtyard, straight at us'],
  ['m1', 'note', 24, 496, 200, 140, 'blue', 'The telephoto lens as a weapon, and as a cinema'],
  ['m2', 'note', 248, 496, 200, 140, 'blue', 'Blinds raised at the start, lowered at the end'],
  ['m3', 'note', 472, 496, 184, 140, 'blue', 'Flash bulbs: light that blinds instead of shows'],
  ['q1', 'text', 744, 496, 620, 52, '', 'Is Jeff a stand-in for **us**, the audience in our seats?'],
  ['q2', 'text', 744, 572, 620, 52, '', 'What does the film say about marriage, window by window?'],
  ['q3', 'text', 744, 648, 620, 52, '', 'Why does Hitchcock never leave the apartment until the end?'],
  ['s1', 'pen', 260, 664, 380, 96, 'green', '0:60;12:20;26:70;40:15;55:75;70:25;84:80;100:40'],
  join('a1', 'n1', 'n2', 'frames'),
  join('a2', 'n4', 'n5', 'suspicion'),
  join('a3', 'n5', 'n6'),
  join('a4', 'n6', 'n7', 'proof'),
  join('a5', 'n7', 'n8', 'and then'),
  join('l1', 'n1', 'm1', '', 'line', 'blue'),
);

/** A mood board for a student short: its palette, its light, its sound and its places. */
const MOOD = board(
  { title: 'Fourth Floor Walk-up: mood' },
  ['pal', 'frame', 0, 0, 560, 300, 'orange', 'Palette'],
  ['lit', 'frame', 600, 0, 560, 300, 'yellow', 'Light'],
  ['snd', 'frame', 0, 340, 560, 300, 'purple', 'Sound'],
  ['plc', 'frame', 600, 340, 560, 300, 'green', 'Places'],
  ['c1', 'note', 24, 56, 160, 100, 'orange', 'Rust brick'],
  ['c2', 'note', 200, 56, 160, 100, 'yellow', 'Streetlamp sodium'],
  ['c3', 'note', 376, 56, 160, 100, 'blue', 'Laundromat blue'],
  ['c4', 'text', 24, 180, 512, 52, '', 'Warm inside, cold outside: every window a lit box at dusk'],
  ['l1', 'note', 624, 56, 240, 130, 'yellow', 'Practical lights only: lamps, a fridge, the TV'],
  ['l2', 'note', 896, 56, 240, 130, '', '**Golden hour** on the fire escape, shot east to west'],
  ['l3', 'text', 624, 212, 512, 52, '', 'Night scenes lit from the street, never from above'],
  ['s1', 'note', 24, 396, 240, 130, 'purple', 'The radiator’s knock as a clock'],
  ['s2', 'note', 296, 396, 240, 130, 'pink', 'A neighbor’s piano through the wall, always the same scale'],
  ['s3', 'pen', 40, 560, 480, 56, 'purple', '0:50;8:10;16:90;25:20;33:80;42:30;50:70;58:10;67:90;75:30;83:70;92:20;100:50'],
  ['p1', 'note', 624, 396, 240, 130, 'green', 'The stairwell on Bergen Street: four flights, one window'],
  ['p2', 'note', 896, 396, 240, 130, 'green', 'The corner bodega at 2 a.m.'],
  ['p3', 'text', 624, 552, 512, 52, '', 'Scout with Dani on Saturday, permits by the 20th'],
  join('k1', 'c2', 'l2', 'same warmth'),
  join('k2', 's2', 'p1', 'heard from here'),
);

/** A crew's retro after a shoot: what went well, what did not, what to try next. */
const RETRO = board(
  { title: 'Retro: the subway shoot' },
  ['well', 'frame', 0, 0, 440, 560, 'green', 'Went well'],
  ['not', 'frame', 480, 0, 440, 560, 'pink', 'Didn’t go well'],
  ['next', 'frame', 960, 0, 440, 560, 'blue', 'Try next'],
  ['w1', 'note', 24, 56, 184, 140, 'green', 'Call sheet out two days early'],
  ['w2', 'note', 232, 56, 184, 140, 'green', 'Sound was clean even on the platform'],
  ['w3', 'note', 24, 216, 184, 140, 'green', 'Everyone fed by noon'],
  ['d1', 'note', 504, 56, 184, 140, 'pink', 'Lost an hour finding the permit'],
  ['d2', 'note', 712, 56, 184, 140, 'pink', 'Batteries died in the second setup'],
  ['d3', 'note', 504, 216, 184, 140, 'pink', 'Too many takes of the wide shot'],
  ['t1', 'note', 984, 56, 184, 140, 'blue', 'One folder for permits, shared with everyone'],
  ['t2', 'note', 1192, 56, 184, 140, 'blue', 'A battery check on the call sheet'],
  ['t3', 'note', 984, 216, 184, 140, 'blue', 'Three takes of the wide, then move on'],
  ['who', 'text', 24, 400, 392, 52, '', 'Owners: Ana (permits), Kofi (batteries)'],
  join('r1', 'd1', 't1'),
  join('r2', 'd2', 't2'),
  join('r3', 'd3', 't3'),
);

export const templates = (): Template[] => [
  { id: 'film', name: t('pinboard-film-board'), blurb: t('pinboard-film-board-blurb'), doc: FILM },
  { id: 'mood', name: t('pinboard-mood-board'), blurb: t('pinboard-mood-board-blurb'), doc: MOOD },
  { id: 'retro', name: t('pinboard-retro'), blurb: t('pinboard-retro-blurb'), doc: RETRO },
];
