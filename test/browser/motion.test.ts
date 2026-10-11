// An animation placed on a slide plays when its slide comes on, from the beginning, and is paused while it is not
// shown; with reduced motion it rests where it ends (kit/motion.ts). In a real Chromium: the deck's slideshow page,
// the deck editor's show, and motion() itself.
import { afterEach, expect, test } from 'vitest';
import '../../src/styles.css';
import '../../src/kit/apps.ts';
import { appOf } from '../../src/kit/apps.ts';
import { deckToHtml } from '../../src/apps/deck/view.ts';
import '../../src/apps/deck/editor.ts';
import type { ToDeckEditor } from '../../src/apps/deck/editor.ts';
import { motion, restOf } from '../../src/kit/motion.ts';
import { pageSvg } from '../../src/kit/draw.ts';
import { tick, until } from './helpers.ts';

const LIFT =
  '---\nframes: 24\nfps: 8\n---\nKind | X | Y | W | H | Style | Label\n--- | --- | --- | --- | --- | --- | ---\nt | 4 | 20 | 20 | 4 | 04 | Lift off\ni | 8 | 36 | 8 | 8 | 0b | rocket\n\nShape | Keys\n--- | ---\n0 | 0,0,0,0,1,0; 23,0,-80,0,1,0,i\n1 | 0,0,0,0,1,0; 23,200,-200,80,1,-30,d\n';
const fence = '```anim\n' + LIFT + '```\n';
/** A two-slide deck: words first, the animation on the second. */
const DECK = `## Words first\n\n---\n\n## Then it moves\n\n${fence}`;

afterEach(() => {
  document.body.innerHTML = '';
});

/** A generated page in a frame of this origin, so the test can read its clocks. */
async function framed(html: string): Promise<Document> {
  const f = document.createElement('iframe');
  f.style.cssText = 'width:800px;height:600px';
  document.body.append(f);
  const loaded = new Promise((r) => f.addEventListener('load', r, { once: true }));
  f.srcdoc = html;
  await loaded;
  return f.contentDocument!;
}
/** The outermost <svg> holding an animation in a node. */
const clockIn = (root: ParentNode) => [...root.querySelectorAll<SVGSVGElement>('svg:not(svg svg)')].find((s) => s.querySelector('animateTransform'))!;
/** Where the shapes are drawn now: each moving shape's offset, as the animation has it (not the clock: the picture). */
const drawnAt = (svg: SVGSVGElement) =>
  [...svg.querySelectorAll('animateTransform[type="translate"]')]
    .map((a) => {
      const list = (a.parentElement as unknown as SVGGraphicsElement).transform.animVal;
      return list.numberOfItems ? `${Math.round(list.getItem(0).matrix.e)},${Math.round(list.getItem(0).matrix.f)}` : '';
    })
    .join(' ');
/** The shapes move: what is drawn changes over a few frames. */
async function moves(svg: SVGSVGElement) {
  const was = drawnAt(svg);
  await until(() => drawnAt(svg) !== was);
}

test('the slideshow page: the animation on the second slide is paused until its slide comes on, then runs from 0', async () => {
  const doc = await framed(deckToHtml(DECK, 'Up'));
  const sections = doc.querySelectorAll('section');
  const svg = clockIn(sections[1]);
  expect(svg).toBeTruthy();
  expect(svg.animationsPaused()).toBe(true);
  await tick(300);
  const held = svg.getCurrentTime();
  await tick(200);
  expect(svg.getCurrentTime()).toBe(held);
  doc.getElementById('next')!.click();
  expect(sections[1].className).toContain('on');
  expect(svg.animationsPaused()).toBe(false);
  expect(svg.getCurrentTime()).toBeLessThan(0.1);
  await until(() => svg.getCurrentTime() > 0.2);
  await moves(svg);
  // Back to the first: paused again.
  doc.getElementById('back')!.click();
  expect(svg.animationsPaused()).toBe(true);
});

test('the slideshow page with reduced motion: a slide that comes on shows its animation at rest, paused', async () => {
  // The system's setting, as the page's own script reads it.
  const reduce = `<script>window.matchMedia=function(q){return{matches:q.indexOf('reduce')>=0,media:q};};</script>`;
  const doc = await framed(deckToHtml(DECK, 'Up').replace('<head>', `<head>${reduce}`));
  const svg = clockIn(doc.querySelectorAll('section')[1]);
  doc.getElementById('next')!.click();
  // The clock is set as the slide is drawn.
  await tick(100);
  expect(svg.animationsPaused()).toBe(true);
  expect(svg.getCurrentTime()).toBeCloseTo(23 / 8, 2);
});

test('the deck editor’s show: a slide that comes on starts its animation from the beginning', async () => {
  const main = document.createElement('main');
  document.body.append(main);
  const el = document.createElement('to-deck-editor') as ToDeckEditor;
  el.value = DECK;
  main.append(el);
  await el.updateComplete;
  // The rail's thumbnails stand still.
  await until(() => el.querySelectorAll('.deck-thumb svg').length >= 2);
  expect([...el.querySelectorAll('.deck-thumb svg')].some((s) => s.innerHTML.includes('<animate'))).toBe(false);
  el.present();
  await el.updateComplete;
  el.querySelector<HTMLButtonElement>('.deck-show .ctl button[aria-label="Next"]')!.click();
  await el.updateComplete;
  const svg = clockIn(el.querySelector('.deck-show .frame')!);
  expect(svg).toBeTruthy();
  expect(svg.animationsPaused()).toBe(false);
  expect(svg.getCurrentTime()).toBeLessThan(0.1);
  await until(() => svg.getCurrentTime() > 0.2);
  await moves(svg);
});

test('motion(): off pauses; on starts from 0; with reduced motion it rests where a once-through ends', async () => {
  const anim = appOf('anim')!;
  const box = document.createElement('div');
  box.innerHTML = pageSvg(anim.view(LIFT, { small: true })[0]);
  document.body.append(box);
  const svg = box.querySelector('svg')!;
  // 24 frames at 8 a second: a round is 23/8 s.
  expect(restOf(svg)).toBeCloseTo(23 / 8, 2);
  motion(box, false);
  expect(svg.animationsPaused()).toBe(true);
  motion(box, true);
  expect(svg.animationsPaused()).toBe(false);
  expect(svg.getCurrentTime()).toBeLessThan(0.1);
  const real = window.matchMedia;
  window.matchMedia = ((q: string) => ({ matches: q.includes('reduce'), media: q })) as typeof window.matchMedia;
  try {
    motion(box, true);
    expect(svg.animationsPaused()).toBe(true);
    expect(svg.getCurrentTime()).toBeCloseTo(23 / 8, 2);
  } finally {
    window.matchMedia = real;
  }
});

test('print, a PDF and a PNG ask for the document still; the web page does not', async () => {
  const { exportAs, printDoc } = await import('../../src/kit/exports.ts');
  const anim = appOf('anim')!;
  const asked: Record<string, boolean> = {};
  let ext = '';
  const def = { ...anim, exports: [], view: (doc: string, opts?: { still?: boolean }) => ((asked[ext] = !!opts?.still), anim.view(doc, opts)) };
  const w = window as Window & { showSaveFilePicker?: unknown };
  const had = w.showSaveFilePicker;
  w.showSaveFilePicker = async () => ({ createWritable: async () => ({ write: async () => {}, close: async () => {} }) });
  try {
    const current = { doc: LIFT, ctx: { def, title: 'Up', link: location.href } };
    ext = 'print';
    await printDoc(current);
    for (ext of ['pdf', 'png', 'html']) await exportAs(ext, current);
  } finally {
    w.showSaveFilePicker = had;
    document.querySelector('.to-print')?.remove();
  }
  expect(asked).toEqual({ print: true, pdf: true, png: true, html: false });
});
