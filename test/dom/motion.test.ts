// Motion: a drawing that moves between the moments you set, worked with its controls (ported from e2e/apps.spec.ts;
// drawing on the stage and dragging a shape are placed by where the pointer is on the screen, and stay there).
import { test, expect } from 'vitest';
import { mount, settle, type, button, type Editor } from './helpers.ts';

/** A rectangle drawn at 8,5 (in grid units) labelled Go, moved 300 by 200 pixels between the first moment and the last. */
const MOVED = '!o\nr,8,5,16,10,0,Go\n@0\t0,0,0,0,a,0;n,8c,5k,0,a,0';

/** Where the shape is: its centre, and its spin (to within a pixel, as a finger is). */
function at(el: Editor, x: number, y: number, spin = 0) {
  const t = el.querySelector('.motion-stage g.hit')!.getAttribute('transform')!;
  const m = /^translate\(([\d.-]+) ([\d.-]+)\) rotate\(([\d.-]+)\) scale\(1 1\) translate\(-128 -80\)$/.exec(t);
  expect(m, t).toBeTruthy();
  expect(Math.abs(+m![1] - x) <= 1 && Math.abs(+m![2] - y) <= 1 && +m![3] === spin, `${t} near ${x} ${y} ${spin}`).toBe(true);
}
async function seek(el: Editor, frame: number) {
  type(el.querySelector('input[type="range"][aria-label="Time"]'), String(frame));
  await settle(el);
}

test('motion: halfway through it is halfway there; turned and shouting when the controls say so', async () => {
  const { el, last } = await mount('anim', MOVED);
  // A drawing opens in Move.
  expect(el.querySelector('sl-radio-group')!.getAttribute('value')).toBe('move');
  expect(el.querySelectorAll('.motion-stage g.hit')).toHaveLength(1);
  at(el, 128, 80);
  await seek(el, 23);
  expect(el.querySelector('.motion-clock')!.textContent).toBe('2.9 s / 2.9 s');
  at(el, 428, 280);
  await seek(el, 12);
  at(el, 284.5, 184.3);
  // Tapped, the shape is picked, and its controls key it at this moment.
  const hit = el.querySelector('.motion-stage g.hit')!;
  hit.dispatchEvent(new PointerEvent('pointerdown', { bubbles: true, button: 0, pointerId: 1 }));
  hit.dispatchEvent(new PointerEvent('pointerup', { bubbles: true, button: 0, pointerId: 1 }));
  await settle(el);
  expect(el.querySelector('.motion-stage g.hit')!.classList.contains('sel')).toBe(true);
  // Its moments are marked on the timeline.
  expect(el.querySelectorAll('.motion-keys .key')).toHaveLength(2);
  type(el.querySelector('input[type="range"][aria-label="Spin"]'), '45');
  await settle(el);
  button(el.querySelector('.motion-fx')!, 'Impact').click();
  await settle(el);
  expect(last()).toMatch(/;c,4[cd],2[wx],0,a,19,i;/);
  expect(el.querySelector('.motion-stage text')!.textContent).toBe('GO');
  // Opened again, it is all there.
  const again = await mount('anim', last());
  await seek(again.el, 12);
  at(again.el, 284.5, 184.3, 45);
  // It plays, and pauses.
  button(again.el, /Play/).click();
  await new Promise((r) => setTimeout(r, 120));
  await settle(again.el);
  button(again.el, /Pause/).click();
  await settle(again.el);
  expect(again.el.querySelector('.motion-clock')!.textContent).not.toBe('1.5 s / 2.9 s');
});
