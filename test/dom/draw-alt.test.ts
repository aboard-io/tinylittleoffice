// Alt text in the drawing editor: the ALT button asks for it, the dialog writes it, the drawing keeps it.
import { test, expect } from 'vitest';
import { mount, settle, setSl, button, type Editor } from './helpers.ts';
import { altOf } from '../../src/lib/drawmodel.ts';

const DRAWING = 'o,4,6,16,8,1b,Browser\no,32,6,16,8,1b,Server\nk,0,1,0,0,0,asks';

const dialog = (el: Editor) => el.querySelector('.draw-alt-dialog') as HTMLElement & { open: boolean };
const box = (el: Editor) => dialog(el).querySelector('sl-textarea')!;

test('the ALT button asks for alt text until there is some, and the dialog saves it only on Done', async () => {
  const { el, docs, last } = await mount('draw', DRAWING);
  const alt = el.querySelector('.draw-alt') as HTMLElement;
  expect(alt.getAttribute('aria-label')).toMatch(/^Add alt text/);
  expect(alt.classList.contains('has')).toBe(false);

  alt.click();
  await settle(el);
  expect(dialog(el).open).toBe(true);
  // The suggestion is offered, from the shapes.
  expect(box(el).getAttribute('placeholder')).toBe('A drawing of Browser, Server. Browser leads to Server (asks).');
  setSl(box(el), 'A browser asks a server for a page.', 'sl-input');
  await settle(el);
  expect(docs.length).toBe(0);

  button(dialog(el), /Done/).click();
  await settle(el);
  expect(dialog(el).open).toBe(false);
  expect(altOf(last()!)).toBe('A browser asks a server for a page.');
  expect(last()!.split('\n').slice(1).join('\n')).toBe(DRAWING);
  expect((el.querySelector('.draw-alt') as HTMLElement).getAttribute('aria-label')).toBe('Alt text: A browser asks a server for a page.');
});

test('“Describe from the shapes” fills in the description, and the canvas keeps the alt text through edits', async () => {
  const { el, last } = await mount('draw', DRAWING);
  (el.querySelector('.draw-alt') as HTMLElement).click();
  await settle(el);
  button(dialog(el), /Describe from the shapes/).click();
  await settle(el);
  button(dialog(el), /Done/).click();
  await settle(el);
  expect(altOf(last()!)).toBe('A drawing of Browser, Server. Browser leads to Server (asks).');

  // Clearing it takes the line out.
  (el.querySelector('.draw-alt') as HTMLElement).click();
  await settle(el);
  setSl(box(el), '', 'sl-input');
  button(dialog(el), /Done/).click();
  await settle(el);
  expect(last()).toBe(DRAWING);
});

test('an animation’s drawing mode keeps the alt text', async () => {
  const { el, last } = await mount('anim', '!o\n# Rocket lifts off\nt,4,20,20,4,04,Lift off');
  // It opens on moving, since it has shapes; choose drawing.
  setSl(el.querySelector('sl-radio-group'), 'draw');
  await settle(el);
  const inner = el.querySelector('to-draw') as Editor;
  await settle(inner);
  expect((inner.querySelector('.draw-alt') as HTMLElement).getAttribute('aria-label')).toBe('Alt text: Rocket lifts off');
  (inner.querySelector('.draw-alt') as HTMLElement).click();
  await settle(inner);
  setSl(box(inner), 'A rocket lifts off and spins away.', 'sl-input');
  button(dialog(inner), /Done/).click();
  await settle(el);
  expect(last()!.split('\n').slice(0, 2)).toEqual(['!o', '# A rocket lifts off and spins away.']);
});
