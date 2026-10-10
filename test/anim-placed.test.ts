// An animation placed in another document plays wherever the page can move, and stands still where nothing
// can (ViewOpts.still: print, a PDF, a PNG, a thumbnail). Under node: the Animator's view, and each placer
// passing `still` through to the animation it places.
import { expect, test } from 'vitest';
import { appOf } from '../src/kit/apps.ts';
import { isStill } from '../src/kit/app.ts';
import { parse } from '../src/doc/index.ts';
import { frameSvg } from '../src/apps/anim/view.ts';
import { readAnim } from '../src/apps/anim/model.ts';
import { docToHtml } from '../src/apps/write/view.ts';
import { deckToHtml } from '../src/apps/deck/view.ts';

const LIFT = '---\nframes: 24\nfps: 8\n---\nKind | X | Y | W | H | Style | Label\n--- | --- | --- | --- | --- | --- | ---\nt | 4 | 20 | 20 | 4 | 04 | Lift off\ni | 8 | 36 | 8 | 8 | 0b | rocket\n\nShape | Keys\n--- | ---\n0 | 0,0,0,0,1,0; 23,0,-80,0,1,0,i\n1 | 0,0,0,0,1,0; 23,200,-200,80,1,-30,d\n';
const looped = (loop: string) => LIFT.replace('fps: 8\n', `fps: 8\nloop: ${loop}\n`);
const fence = '```anim\n' + LIFT + '```\n';
const SMIL = /<animate/;

test('still is read in one place: thumb implies it', () => {
  expect([isStill(), isStill({}), isStill({ small: true }), isStill({ still: true }), isStill({ small: true, thumb: true })]).toEqual([false, false, false, true, true]);
});

test('the Animator: still is one frame, the resting one; a thumbnail the first moment; otherwise it plays as its loop says', () => {
  const anim = appOf('anim')!;
  const still = anim.view(LIFT, { still: true });
  expect(still).toHaveLength(1);
  expect(still[0].svg).not.toMatch(SMIL);
  expect(still[0].svg).toBe(frameSvg(readAnim(parse(LIFT)), 23));
  expect(anim.view(LIFT, { small: true, still: true })[0].svg).toBe(still[0].svg);
  const thumb = anim.view(LIFT, { small: true, thumb: true })[0].svg;
  expect(thumb).not.toMatch(SMIL);
  expect(thumb).toBe(frameSvg(readAnim(parse(LIFT)), 0));
  // Placed (small) or shown on its own, it moves, repeating as the document says.
  for (const opts of [undefined, { small: true }]) {
    expect(anim.view(LIFT, opts)[0].svg).toMatch(SMIL);
    expect(anim.view(LIFT, opts)[0].svg).toContain('repeatCount="indefinite"');
    expect(anim.view(looped('3'), opts)[0].svg).toContain('repeatCount="3" fill="freeze"');
    expect(anim.view(looped('once'), opts)[0].svg).toContain('repeatCount="1" fill="freeze"');
  }
});

test('the deck passes still through to an animation on a slide, and its own pictures stand still', () => {
  const deck = appOf('deck')!;
  const text = `## Up\n\n${fence}`;
  expect(deck.view(text).map((p) => p.svg).join('')).toMatch(SMIL);
  expect(deck.view(text, { small: true })[0].svg).toMatch(SMIL);
  expect(deck.view(text, { still: true }).map((p) => p.svg).join('')).not.toMatch(SMIL);
  expect(deck.view(text, { small: true, thumb: true })[0].svg).not.toMatch(SMIL);
  // The slideshow as a web page plays it; place() keeps every <animate…>.
  expect(deckToHtml(text, 'Up')).toMatch(/<animateTransform attributeName="transform" type="translate"/);
});

test('the site page plays a placed animation; its pictures never hold one', () => {
  const site = appOf('site')!;
  const text = `# Home\n\nWords.\n\n${fence}`;
  expect(site.page!(text, 'https://tinylittleoffice.com/')).toMatch(SMIL);
  expect(site.view(text, { still: true }).map((p) => p.svg).join('')).not.toMatch(SMIL);
});

test('a text passes still through: its pages move, its print stands still, its web page moves', () => {
  const write = appOf('write')!;
  const text = `# A text\n\nWords.\n\n${fence}`;
  expect(write.view(text).map((p) => p.svg).join('')).toMatch(SMIL);
  expect(write.view(text, { small: true })[0].svg).toMatch(SMIL);
  expect(write.view(text, { still: true }).map((p) => p.svg).join('')).not.toMatch(SMIL);
  expect(write.view(text, { small: true, thumb: true })[0].svg).not.toMatch(SMIL);
  expect(docToHtml(parse(text), { title: 'A text', link: '' })).toMatch(SMIL);
});

test('a document placed in a placed document carries still all the way down', () => {
  const write = appOf('write')!;
  const inner = `## Up\n\n${fence}`;
  const text = `Words.\n\n\`\`\`\`deck\n${inner}\`\`\`\`\n`;
  expect(write.view(text).map((p) => p.svg).join('')).toMatch(SMIL);
  expect(write.view(text, { still: true }).map((p) => p.svg).join('')).not.toMatch(SMIL);
});
