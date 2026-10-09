// Deck and Draw worked as a person would: slides, icons, layouts, documents on slides, presenting; shapes chosen and changed (ported from e2e/suite.spec.ts).
import { test, expect } from 'vitest';
import { mount, setSl } from './helpers.ts';
import { insert } from './helpers-more.ts';
import { idle, until, $, $$, text, tap, fill, key, focused, button, press, poke, write } from './helpers-shell.ts';
import { deckTheme, parseDeck } from '../../src/lib/deckmodel.ts';
import { parseDrawing } from '../../src/lib/drawmodel.ts';

const thumbs = () => $$('.deck-rail .deck-thumb');
const show = () => document.querySelector<HTMLElement>('.deck-show');
const slide = () => $('.deck-show .frame > svg');
const shows = (words: string) => text(slide()).includes(words);
/** Choose from the deck's Insert menu, by typing a few letters and Return. */
const addSlide = (what: string) => insert(document, 'Insert', what);

test('deck: slides, icons and presenting', async () => {
  const { last } = await mount('deck');
  // A new deck opens on a title slide: big centred title, subtitle, no bullets.
  expect($$('.deck-slide.lay-t')).toHaveLength(1);
  write('Headline', 'Spring launch');
  write('Bullets', 'What we are shipping');
  await idle();
  // The toolbar's Icon button opens the same picker as the box on the slide.
  await press('Icon');
  const picker = () => document.querySelector('#icon-picker');
  expect(picker()?.hasAttribute('open')).toBe(true);
  const library = () => $('[role="group"][aria-label="Favourites"]');
  button('star', library()).click();
  await until(() => !picker(), 'the picker to close');
  expect($$('.deck-slide .pick svg')).toHaveLength(1);

  // A second slide with bullets; the slide's own words recommend icons.
  await press('Slide');
  expect($$('.deck-slide.lay-b')).toHaveLength(1);
  write('Headline', 'Launch plan');
  write('Bullets', 'Build it\nShip it\nTell people');
  await idle();
  expect(button('Use rocket icon')).toBeTruthy();
  await press('Slide icon');
  expect(button('rocket', $('[role="group"][aria-label="Suggested"]'))).toBeTruthy();
  const search = $('#icon-picker sl-input');
  fill(search, 'zzz');
  await idle();
  expect($$('.deck-picker-none')).toHaveLength(1);
  fill(search, 'rock');
  await idle();
  // Searched, the library is one section of matches.
  button('rocket', $('[role="group"][aria-label="Icons"]')).click();
  await until(() => !picker(), 'the picker to close');
  expect($$('.deck-suggest')).toHaveLength(0);
  expect(text($$('.to-toolbar .to-hint').at(-1))).toBe('2 slides');
  expect(parseDeck(last()!).map((s) => [s.icon, s.title, s.bullets])).toEqual([
    ['star', 'Spring launch', ['What we are shipping']],
    ['rocket', 'Launch plan', ['Build it', 'Ship it', 'Tell people']],
  ]);

  // Opened again from what it saved.
  await mount('deck', last());
  expect(thumbs()).toHaveLength(2);
  expect(text(thumbs()[1])).toContain('Launch plan');
  thumbs()[1].click();
  await idle();
  expect($$('[aria-label="Bullets"] p').map(text)).toEqual(['Build it', 'Ship it', 'Tell people']);

  // Presenting: the title slide appears whole; the next builds a bullet per step.
  thumbs()[0].click();
  await idle();
  await press('Present');
  expect(shows('Spring launch')).toBe(true);
  expect(shows('What we are shipping')).toBe(true);
  await key('ArrowRight');
  expect(shows('Launch plan')).toBe(true);
  expect(shows('Build it')).toBe(false);
  await key('ArrowRight');
  expect(shows('Build it')).toBe(true);
  expect(shows('Ship it')).toBe(false);
  await key('ArrowLeft');
  expect(shows('Build it')).toBe(false);
  // A fast double click shows the whole slide at once.
  show()!.click();
  show()!.click();
  await idle();
  expect(shows('Tell people')).toBe(true);
  // Once everything is out, the next step is the closing QR code of the deck; the one after leaves the show.
  await key('ArrowRight');
  expect(slide().querySelectorAll('path[shape-rendering="crispEdges"]')).toHaveLength(1);
  await key('ArrowRight');
  expect(show()).toBeNull();

  // No cap on slides: the link's length is the only limit.
  const before = thumbs().length;
  for (let i = 0; i < 12; i++) button('Slide').click();
  await idle();
  expect(thumbs()).toHaveLength(before + 12);
  expect(button('Slide').hasAttribute('disabled')).toBe(false);
});

test('deck: layouts, a transition, and other documents on a slide', async () => {
  const draw = '```draw\nKind | X | Y | W | H | Style | Label\n--- | --- | --- | --- | --- | --- | ---\nr | 2 | 1 | 12 | 6 | 1 | One\ne | 20 | 10 | 10 | 8 | 0 | Two\na | 14 | 4 | 8 | 8 | 0 |\n```';
  const sheet = '```sheet\nItem | Cost\n--- | ---\nRent | 1200\nFood | 600\n```';
  // (Without the closing QR code: it is tested above, and it is the deck's whole link worked out again at every step.)
  const body = '---\nqr: no\n---\n' + ['## Two columns {.two}\n\n- left\n\n|\n\n- right', '## :star: Big icon {.icon}\n\n- why', `## Drawing\n\n- first\n\n${draw}`, `## Table\n\n${sheet}`].join('\n\n---\n\n');
  const { last } = await mount('deck', body);
  expect(thumbs()).toHaveLength(4);
  expect(($('sl-select.deck-transition') as HTMLElement & { value: string }).value).toBe('fade');

  // Two columns: each is its own list.
  expect($$('.deck-slide.lay-2')).toHaveLength(1);
  write('Right column', 'right\nand more');
  await idle();
  expect(parseDeck(last()!)[0].right).toEqual(['right', 'and more']);
  // Big icon: bullets on the left, the icon large on the right.
  thumbs()[1].click();
  await idle();
  expect($$('.deck-slide.lay-i .big svg')).toHaveLength(1);
  // Slide type says what this slide is, and adds a slide of whatever is chosen: the slide you are on is left alone.
  const kind = () => text($('.deck-kind'));
  expect(kind()).toContain('Big icon');
  // The Insert menu: a tap drops the whole list down, in the menu's groups; typing narrows it.
  tap($('.deck-add sl-button'));
  await idle();
  const list = () => $('.deck-add [role="listbox"]');
  const options = $$('[role="option"]', list()).map(text);
  for (const name of ['Bullets slide', 'Title slide', 'Two columns slide', 'Big icon slide', 'Motion', 'Drawing', 'Table', 'Chart', 'Map', 'Org chart', 'Spinner']) expect(options).toContain(name);
  expect(text($('li.group', list()))).toBe('Layouts');
  const narrow = $<HTMLInputElement>('.deck-add .to-insert-list input');
  fill(narrow, 'two col');
  await idle();
  expect($$('[role="option"]', list())).toHaveLength(1);
  await key('Enter', {}, narrow);
  expect(thumbs()).toHaveLength(5);
  expect($$('.deck-slide.lay-2')).toHaveLength(1);
  expect(kind()).toContain('Two columns');
  expect(focused().getAttribute('aria-label')).toBe('Headline');
  // Return in the headline goes on to the bullets.
  await key('Enter');
  expect(focused().getAttribute('aria-label')).toBe('Bullets');
  thumbs()[1].click();
  await idle();
  expect($$('.deck-slide.lay-i .big svg')).toHaveLength(1);

  // A slide can show another document; choosing one adds a slide for it and opens it for editing.
  const drawing = () => thumbs().find((t) => text(t).includes('One'))!;
  drawing().click();
  await idle();
  expect($$('.deck-slide to-embed')).toHaveLength(1);
  expect(kind()).toContain('Drawing');
  await addSlide('Chart');
  const sub = await until(() => document.querySelector<HTMLElement>('sl-dialog.to-sub[open]'), 'the chart to open for editing');
  for (const [ref, v] of [['A1', 'Q1'], ['B1', '10'], ['A2', 'Q2'], ['B2', '30']]) {
    const c = $<HTMLInputElement>(`input[aria-label="${ref}"]`, sub);
    tap(c);
    fill(c, v);
    await idle();
  }
  await press('Done', sub);
  await until(() => !document.querySelector('sl-dialog.to-sub'), 'the editor to close');
  await idle();
  expect(thumbs()).toHaveLength(6);
  const embedded = () => $('.deck-slide to-embed').shadowRoot!;
  expect(embedded().querySelectorAll('svg[role="img"] rect[rx="2"]')).toHaveLength(2);
  expect(kind()).toContain('Table');
  // The drawing's slide is as it was.
  expect(thumbs().filter((t) => text(t).includes('One'))).toHaveLength(1);
  await mount('deck', last());
  expect(thumbs()).toHaveLength(6);
  drawing().click();
  await idle();
  // What is inserted has the slide to itself: no headline, no bullets beside it.
  expect($$('.deck-slide.has-sub [aria-label="Headline"]')).toHaveLength(0);

  // Presenting it: the whole slide is the document, and it appears a piece per click.
  await mount('deck', body);
  thumbs()[2].click();
  await idle();
  await press('Present');
  expect($('.deck-show .frame').classList.contains('tr-fade')).toBe(true);
  expect(slide().querySelectorAll('rect, ellipse, line')).toHaveLength(0);
  expect(shows('Drawing')).toBe(false);
  expect(shows('first')).toBe(false);
  await key('ArrowRight');
  expect(shows('One')).toBe(true);
  expect(shows('Two')).toBe(false);
  // It fills the slide.
  expect(Number(slide().querySelector('svg')!.getAttribute('height')) / 600).toBeGreaterThan(0.85);
  await key('ArrowRight');
  expect(shows('Two')).toBe(true);
  expect(slide().querySelectorAll('line')).toHaveLength(0);
  await key('End');
  expect(slide().querySelectorAll('line')).toHaveLength(1);
  // A table fills in a cell per click, across each row and down, under the names of its columns.
  await key('ArrowRight');
  expect(slide().querySelectorAll('rect')).toHaveLength(6);
  expect(shows('Item') && shows('Cost')).toBe(true);
  expect(shows('Rent')).toBe(false);
  for (const [now, next] of [['Rent', '1200'], ['1200', 'Food'], ['Food', '600']]) {
    await key('ArrowRight');
    expect(shows(now), now).toBe(true);
    expect(shows(next), next).toBe(false);
  }
  await key('ArrowRight');
  expect(shows('600')).toBe(true);
  await key('Escape');
  expect(show()).toBeNull();
});

test('draw: a shape chosen takes a colour and a text size, kept in what is saved; deleted and duplicated', async () => {
  // (Drawing the shapes with the mouse, and the size the text is drawn at, are e2e's.)
  const { last } = await mount('draw', 'Kind | X | Y | W | H | Style | Label\n--- | --- | --- | --- | --- | --- | ---\nr | 2 | 1 | 12 | 6 | 0 | Start\ne | 20 | 10 | 10 | 8 | 2 | End\na | 14 | 4 | 8 | 8 | 0 |');
  const shapes = () => $$('g.shape');
  expect(shapes()).toHaveLength(3);
  await poke(shapes()[0]);
  button('Blue').click();
  await idle();
  const size = $('sl-select[label="Text size"]') as HTMLElement & { value: string };
  size.value = '4';
  size.dispatchEvent(new CustomEvent('sl-change', { bubbles: true, composed: true }));
  await idle();
  expect($$('rect[stroke="#0072b2"]')).toHaveLength(1);
  expect(parseDrawing(last()!)[0]).toMatchObject({ k: 'r', text: 'Start', c: expect.any(String), z: 4 });
  await mount('draw', last());
  expect($$('rect[stroke="#0072b2"]')).toHaveLength(1);
  expect($$('text').map(text)).toEqual(['Start', 'End']);
  await poke(shapes()[0]);
  expect(button('Blue').getAttribute('aria-checked')).toBe('true');
  await key('Delete', {}, $('.draw-wrap'));
  expect(shapes()).toHaveLength(2);
  // Ctrl+D duplicates the shape chosen.
  await poke(shapes()[0]);
  await key('d', { ctrl: true }, $('.draw-wrap'));
  expect(shapes()).toHaveLength(3);
});

test('deck: a theme, chosen from the toolbar, dresses the slide and is written in the header', async () => {
  const { last } = await mount('deck', '---\nqr: no\n---\n## Hello\n\n- one');
  const menu = $('sl-select.deck-theme') as HTMLElement & { value: string };
  expect(menu.value).toBe('plain');
  // Plain first, then the professional themes, then the fun ones.
  expect([...menu.querySelectorAll('small')].map((s) => s.textContent)).toEqual(['Professional', 'Fun']);
  setSl(menu, 'confetti');
  await idle();
  expect(deckTheme(last()!)).toBe('confetti');
  const slide = $('.deck-slide') as HTMLElement;
  expect(slide.classList.contains('themed')).toBe(true);
  expect(slide.getAttribute('style')).toContain('--slide-paper:#fffdf7');
  // The thumbnail is drawn on the theme's paper too.
  expect(thumbs()[0].innerHTML).toContain('fill="#fffdf7"');
  // Back to plain: nothing about it is written.
  setSl(menu, 'plain');
  await idle();
  expect(last()).not.toContain('theme:');
  expect(slide.classList.contains('themed')).toBe(false);
});
