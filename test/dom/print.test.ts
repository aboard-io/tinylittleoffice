// The print apps (zine, booklet, brochure, poster, badges, recipes, comic, menu, résumé) worked in happy-dom (ported from e2e/more.spec.ts).
import { test, expect, beforeEach } from 'vitest';
import { mount, settle, button, setSl } from './helpers.ts';
import { prefs, box, typeRich, settleAll, editSub, insert, pickIcon, pdfText } from './helpers-more.ts';
import { appOf } from '../../src/kit/core.ts';

beforeEach(() => prefs());

const thumbs = (root: ParentNode) => [...root.querySelectorAll('.deck-thumb')];
const current = (root: ParentNode) => root.querySelector('.deck-thumb[aria-current="true"] > svg')!;
const headline = (root: ParentNode, words: string) => typeRich(box(root, 'Headline'), words);
const words = (root: ParentNode, text: string, label = 'Words') => typeRich(box(root, label), text);
/** The PDF the app would print, as text: its pages as the app draws them, written as the app writes a PDF. */
const pdfOf = (app: string, body: string) => pdfText(appOf(app)!.view(body));
const pageCount = (pdf: string) => pdf.match(/\/Type \/Page\b/g)!.length;

test('zine: eight pages, typed on as slides, a sheet to print either way', async () => {
  let m = await mount('zine');
  const zine = () => m.el;
  expect(thumbs(zine())).toHaveLength(8);
  // The page is typed on as a slide is, in its own shape: a cover, centred.
  expect(zine().querySelector('.deck-slide.print.cover')).toBeTruthy();
  headline(zine(), 'Small Joys');
  await settleAll(2);
  // Enter in the headline goes on to the words.
  box(zine(), 'Headline').dispatchEvent(new KeyboardEvent('keydown', { key: 'Enter', bubbles: true, cancelable: true }));
  expect(document.activeElement?.getAttribute('aria-label')).toBe('Words');
  words(zine(), 'Issue one');
  await settleAll(2);
  button(zine(), 'Page 2').click();
  await settleAll(2);
  headline(zine(), 'Coffee');
  await settleAll(2);
  // However much is written, it stays on its page: the type shrinks. (Whether it fits on the page is measured in e2e.)
  // (The rail draws the page as it will print. The last text on it is its number; the one before it is the last line of the words.)
  const size = () => Number([...current(zine()).querySelectorAll('text')].at(-2)!.getAttribute('font-size'));
  expect(zine().querySelector('.deck-slide.print.prose')).toBeTruthy();
  words(zine(), 'Short.');
  await settleAll(2);
  const big = size();
  words(zine(), 'The first cup of the day, before anyone else is up. '.repeat(14));
  await settleAll(2);
  expect(size()).toBeLessThan(big);
  // A page can hold another document.
  button(zine(), 'Page 3').click();
  await settleAll(2);
  await insert(zine(), 'Insert', 'poll');
  await editSub('Poll, as text', '# Rain on the roof?\n- Fresh bread\n- Soup');
  expect(current(zine()).textContent).toContain('Fresh bread');
  expect(zine().querySelectorAll('.deck-slide to-embed')).toHaveLength(1);
  // Pages move as slides do.
  button(zine(), 'Move page up').click();
  await settleAll(2);
  expect(thumbs(zine())[1].textContent).toContain('Fresh bread');
  button(zine(), 'Move page down').click();
  await settleAll(2);
  expect(thumbs(zine())[1].textContent).toContain('Coffee');
  // Opened again from what it saved: the zine goes by its cover's title.
  m = await mount('zine', m.last()!);
  expect(thumbs(zine())[0].textContent).toContain('Small Joys');
  expect(appOf('zine')!.title(zine().value)).toBe('Small Joys');

  // One-sided: one sheet, eight pages, the top row upside down.
  button(zine(), 'See the sheet to print').click();
  await settleAll(2);
  expect(zine().querySelectorAll('.zine-sheet')).toHaveLength(1);
  expect(zine().querySelectorAll('.zine-sheet svg g[transform^="rotate(180"]')).toHaveLength(4);
  // Its PDF: letter paper, on its side (11 by 8.5 inches), one page.
  let pdf = pdfOf('zine', zine().value);
  expect(pdf).toContain('/MediaBox [0 0 792 612]');
  expect(pageCount(pdf)).toBe(1);
  // Two-sided: two sides, upright.
  setSl(zine().querySelector('sl-select.zine-sides'), 'two');
  await settleAll(2);
  expect(zine().querySelectorAll('.zine-sheet')).toHaveLength(2);
  expect(zine().querySelectorAll('.zine-sheet svg g[transform^="rotate(180"]')).toHaveLength(0);
  pdf = pdfOf('zine', zine().value);
  expect(pdf).toContain('/MediaBox [0 0 612 792]');
  expect(pageCount(pdf)).toBe(2);
  m = await mount('zine', m.last()!);
  expect((zine().querySelector('sl-select.zine-sides') as unknown as { value: string }).value).toBe('two');
  // The web page is the zine to read, a page at a time (turning it is e2e's: its script must run).
  const page = new DOMParser().parseFromString(appOf('zine')!.document!(zine().value, { created: null }), 'text/html');
  expect(page.querySelectorAll('section')).toHaveLength(8);
  expect(page.querySelector('section')!.getAttribute('aria-label')).toBe('Front cover');
});

test('paper that folds: a booklet grows, a brochure prints in order', async () => {
  const { el, last } = await mount('booklet');
  expect(thumbs(el)).toHaveLength(8);
  headline(el, 'Field Notes');
  await settle(el);
  button(el, 'Four more pages').click();
  await settle(el);
  expect(thumbs(el)).toHaveLength(12);
  button(el, 'Page 11').click();
  await settle(el);
  headline(el, 'Nearly the end');
  await settle(el);
  const again = await mount('booklet', last()!);
  expect(thumbs(again.el)).toHaveLength(12);
  // Pages with something on them are not taken away.
  expect(button(again.el, 'Four fewer pages').hasAttribute('disabled')).toBe(true);
  button(again.el, 'See the sheet to print').click();
  await settle(again.el);
  // Three sheets, both sides of each.
  expect(again.el.querySelectorAll('.zine-sheet')).toHaveLength(6);
  expect(again.el.querySelector('.zine-sheet')!.textContent).toContain('Field Notes');
  const pdf = pdfOf('booklet', last()!);
  expect(pdf).toContain('/MediaBox [0 0 792 612]');
  expect(pageCount(pdf)).toBe(6);

  const brochure = await mount('brochure');
  expect(thumbs(brochure.el)).toHaveLength(6);
  headline(brochure.el, 'Visit the quay');
  await settle(brochure.el);
  button(brochure.el, 'See the sheet to print').click();
  await settle(brochure.el);
  expect(brochure.el.querySelectorAll('.zine-sheet')).toHaveLength(2);
});

test('things to print: write a few lines, get the sheets', async () => {
  for (const [app, name, has] of [
    ['menu', 'Menu', 'Flat white'],
    ['resume', 'Résumé', 'Ada Lovelace'],
    ['wordsearch', 'Word search', 'espresso'],
  ] as const) {
    const { el } = await mount(app);
    button(el, 'Start from an example').click();
    await settle(el);
    expect(el.querySelector(`[role="img"][aria-label="${name}, sheet 1"]`)?.textContent, app).toContain(has);
  }
  // A poster is a page typed into directly, laid out like a slide; its page type is a template.
  const poster = await mount('poster');
  headline(poster.el, 'Yard sale');
  words(poster.el, 'Saturday 9am');
  await settle(poster.el);
  expect(current(poster.el).textContent).toContain('Saturday 9am');
  expect(appOf('poster')!.title(poster.last()!)).toBe('Yard sale');
  setSl(poster.el.querySelector('sl-select.zine-layout'), '2');
  await settle(poster.el);
  words(poster.el, 'Books\nLamps', 'Right column');
  await settle(poster.el);
  expect(current(poster.el).textContent).toContain('Lamps');
  // Printed on letter paper, upright.
  expect(pdfOf('poster', poster.last()!)).toContain('/MediaBox [0 0 612 792]');
  // Badges and recipe cards: a page per person or dish, added one at a time, tiled on the sheets.
  const { el } = await mount('badges');
  headline(el, 'Grace Hopper');
  words(el, 'Compilers');
  await settle(el);
  button(el, 'Another badge').click();
  await settle(el);
  expect(thumbs(el)).toHaveLength(3);
  // The new badge goes in after the one being written, and can go again.
  expect(thumbs(el)[1].getAttribute('aria-current')).toBe('true');
  button(el, 'Remove this badge').click();
  await settle(el);
  expect(thumbs(el)).toHaveLength(2);
  button(el, 'See the sheet to print').click();
  await settle(el);
  expect(el.querySelectorAll('.zine-sheet')).toHaveLength(1);
  expect(el.querySelector('.zine-sheet')!.textContent).toContain('Grace Hopper');
  // The PDF is a button away, in the Print group: it asks the shell for one.
  const asked: string[] = [];
  el.addEventListener('to-download', (e) => asked.push((e as CustomEvent<string>).detail));
  button(el, /^PDF/).click();
  expect(asked).toEqual(['pdf']);
  const recipes = await mount('recipes');
  headline(recipes.el, 'Cardamom buns');
  await settle(recipes.el);
  button(recipes.el, 'Another card').click();
  await settle(recipes.el);
  expect(thumbs(recipes.el)).toHaveLength(3);
});

test('comic: pages like a zine, each built from panels', async () => {
  const { el, last } = await mount('comic');
  expect(thumbs(el)).toHaveLength(8);
  headline(el, 'Biscuit Goes Out');
  await settle(el);
  button(el, 'Page 2').click();
  await settle(el);
  // A panel: a picture, what is said, a caption, typed into on the page.
  button(el, 'Add a panel').click();
  await settle(el);
  expect(el.querySelectorAll('.deck-slide.comic .comic-panels li')).toHaveLength(1);
  const field = (label: string) => box(el, label);
  const fill = async (label: string, v: string) => {
    field(label).value = v;
    field(label).dispatchEvent(new Event('input', { bubbles: true }));
    await settle(el);
  };
  await fill('What is said, panel 1', 'Walk?');
  await fill('Caption, panel 1', 'Monday, noon.');
  button(el, 'Picture, panel 1').click();
  await pickIcon('dog', 'dog');
  await settle(el);
  button(el, 'Add a panel').click();
  await settle(el);
  await fill('What is said, panel 2', 'WALK!');
  expect(current(el).textContent).toContain('Walk?');
  expect(current(el).textContent).toContain('Monday, noon.');
  expect(current(el).querySelectorAll('rect[stroke-width="1.5"]')).toHaveLength(2);
  const again = await mount('comic', last()!);
  expect(again.last()).toBeUndefined();
  expect(thumbs(again.el)[0].textContent).toContain('Biscuit');
  expect(last()).toMatch(/^- :dog: Walk\? \| Monday, noon\.$/m);
  button(again.el, 'Page 2').click();
  await settle(again.el);
  expect(box(again.el, 'What is said, panel 2').value).toBe('WALK!');
  button(again.el, 'Remove panel 1').click();
  await settle(again.el);
  expect(current(again.el).querySelectorAll('rect[stroke-width="1.5"]')).toHaveLength(1);
  expect(box(again.el, 'What is said, panel 1').value).toBe('WALK!');
  button(again.el, 'See the sheet to print').click();
  await settle(again.el);
  expect(again.el.querySelectorAll('.zine-sheet')).toHaveLength(1);
  expect(again.el.querySelector('.zine-sheet')!.textContent).toContain('WALK!');
});
