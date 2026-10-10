// Presenting a step at a time: each app counts the steps its document builds up in, and draws a part of it on
// the page the whole makes; a slide that shows a document builds as that document does.
import { test, expect } from 'vitest';
import { appOf } from '../src/kit/apps.ts';
import { parse } from '../src/doc/index.ts';
import { slidesOf } from '../src/apps/deck/model.ts';
import { deckFrames, slideSteps } from '../src/apps/deck/view.ts';

const def = (id: string) => appOf(id)!;
const texts = (svg: string) => [...svg.matchAll(/<text[^>]*>([^<]*)<\/text>/g)].map((m) => m[1]);

test('a to-do list builds a task a step, on the page the whole list makes', () => {
  const doc = '- [ ] One\n- [x] Two\n- [ ] Three\n';
  const todo = def('todo');
  expect(todo.steps!(doc)).toBe(3);
  const whole = todo.view(doc, { small: true })[0];
  const two = todo.view(doc, { small: true, upTo: 2 })[0];
  expect([two.w, two.h]).toEqual([whole.w, whole.h]);
  expect(texts(two.svg)).toEqual(['One', 'Two']);
  expect(texts(todo.view(doc, { small: true, upTo: 0 })[0].svg)).not.toContain('One');
  // Drawn small, a slide shows eight: eight steps at most.
  expect(todo.steps!(Array.from({ length: 12 }, (_, i) => `- [ ] Task ${i}\n`).join(''))).toBe(8);
});

test('a board builds a card a step, in the order the document holds them, each in its stage', () => {
  const doc = '## To do\n\n- Alpha\n  - [ ] part\n- Beta\n\n## Done\n\n- Gamma\n';
  const board = def('board');
  expect(board.steps!(doc)).toBe(3);
  const one = board.view(doc, { small: true, upTo: 1 })[0];
  expect(texts(one.svg).join(' ')).toContain('Alpha');
  expect(texts(one.svg).join(' ')).not.toContain('Beta');
  expect(texts(one.svg).join(' ')).toContain('Done');
  expect(one.h).toBe(board.view(doc, { small: true })[0].h);
});

test('an outline builds an item a step, from the top', () => {
  const doc = '- Launch\n  - Product\n  - Marketing\n';
  const outline = def('outline');
  expect(outline.steps!(doc)).toBe(3);
  const two = outline.view(doc, { small: true, upTo: 2 })[0];
  expect(two.svg).toContain('Product');
  expect(two.svg).not.toContain('Marketing');
  expect(two.h).toBe(outline.view(doc, { small: true })[0].h);
});

test('a trip builds a stop a step on the map that fits them all; a drawing a shape a step', () => {
  const trip = '| Place | Lat:number | Lon:number | Note |\n|---|---|---|---|\n| Lisbon | 38.7223 | -9.1393 | |\n| Porto | 41.1579 | -8.6291 | |\n| Madrid | 40.4168 | -3.7038 | |\n';
  expect(def('trip').steps!(trip)).toBe(3);
  const one = def('trip').view(trip, { small: true, upTo: 1 })[0].svg;
  const all = def('trip').view(trip, { small: true })[0].svg;
  expect(texts(one)).toEqual(['1', 'Lisbon']);
  expect(one).not.toContain('<polyline');
  // The first pin is where it is when all three are drawn.
  expect(/<circle cx="[^"]+" cy="[^"]+"/.exec(one)![0]).toBe(/<circle cx="[^"]+" cy="[^"]+"/.exec(all)![0]);
  const drawing = '| Kind | X | Y | W | H | Style | Label |\n|---|---|---|---|---|---|---|\n| r | 20 | 20 | 100 | 60 | | A |\n| e | 200 | 20 | 100 | 60 | | B |\n';
  expect(def('draw').steps!(drawing)).toBe(2);
  expect(texts(def('draw').view(drawing, { upTo: 1 })[0].svg)).toEqual(['A']);
});

test('a slide that shows a document builds as the document does; the deck’s frames take every step', () => {
  const deck = '## Our week\n\n```todo\n- [ ] One\n- [ ] Two\n```\n\n---\n\n## Words\n\n- a\n- b\n';
  const doc = parse(deck);
  const [withList, words] = slidesOf(doc);
  expect(slideSteps(withList, doc)).toBe(2);
  expect(slideSteps(withList)).toBe(0);
  expect(slideSteps(words, doc)).toBe(2);
  // 0, 1, 2 for each slide, then the closing code.
  const frames = deckFrames(deck);
  expect(frames.length).toBe(3 + 3 + 1);
  expect(texts(frames[1].svg)).toContain('One');
  expect(texts(frames[1].svg)).not.toContain('Two');
  expect(texts(frames[2].svg)).toContain('Two');
});
