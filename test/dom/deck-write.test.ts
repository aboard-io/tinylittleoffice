// Deck and Write in happy-dom: icons, nesting, documents shown inside a text and on slides (ported from e2e/more.spec.ts).
import { test, expect, beforeEach } from 'vitest';
import { mount, settle, button, type Editor } from './helpers.ts';
import { prefs, box, typeRich, settleAll, until, pickIcon } from './helpers-more.ts';
import { parseDeck } from '../../src/lib/deckmodel.ts';

beforeEach(() => prefs());

/** The deck being presented: its slide, and a key pressed. */
const presenting = (el: Editor) => ({
  slide: () => el.querySelector('.deck-show .frame > svg')!,
  key: async (k: string) => {
    window.dispatchEvent(new KeyboardEvent('keydown', { key: k, bubbles: true }));
    await settle(el);
  },
});

test('deck: any Lucide icon, in one colour for the whole deck', async () => {
  const { el, last } = await mount('deck');
  typeRich(box(el, 'Headline'), 'Open to all');
  await settle(el);
  const iconButton = () => [...el.querySelectorAll<HTMLElement>('.to-toolbar sl-button')].find((b) => b.textContent!.trim() === 'Icon')!;
  iconButton().click();
  const picker = await until(() => document.querySelector('#icon-picker')!);
  await until(() => expect(picker.textContent).toMatch(/to find any of 1,\d{3} icons/));
  // An icon that was never in the starter set.
  await pickIcon('accessib', 'accessibility');
  await settle(el);
  expect(el.querySelector('.deck-slide .pick svg')).toBeTruthy();
  // One colour for every icon in the deck.
  iconButton().click();
  const again = await until(() => document.querySelector('#icon-picker')!);
  await settleAll();
  again.querySelector<HTMLElement>('[role="radiogroup"] [role="radio"][aria-label="Red"]')!.click();
  await settleAll();
  await (again as unknown as { hide(): Promise<void> }).hide();
  await settleAll();
  expect(parseDeck(last()!)[0].icon).toBe('accessibility');
  const thumb = () => el.querySelector('.deck-rail .deck-thumb')!;
  expect(thumb().querySelectorAll('g[stroke="#b3261e"]')).toHaveLength(1);
  // Opened again from what it saved.
  const deck = await mount('deck', last()!);
  expect(deck.el.querySelector('.deck-rail .deck-thumb')!.querySelectorAll('g[stroke="#b3261e"]')).toHaveLength(1);
  button(deck.el, /Present/).click();
  await settle(deck.el);
  expect(presenting(deck.el).slide().querySelector('g[stroke="#b3261e"] path')).toBeTruthy();
});

test('slides: bullets nest from the keyboard and the toolbar', async () => {
  const { el, last } = await mount('deck');
  typeRich(box(el, 'Headline'), 'Spring launch');
  const bullets = box<HTMLElement>(el, 'Bullets');
  typeRich(bullets, 'Ship the beta\nTell everyone');
  await settle(el);
  expect(parseDeck(last()!)[0].bullets).toEqual(['Ship the beta', 'Tell everyone']);
  // The caret in the second bullet (the toolbar works on the box last typed in).
  const caretIn = (line: number) => {
    bullets.dispatchEvent(new FocusEvent('focusin', { bubbles: true }));
    const text = box<HTMLElement>(el, 'Bullets').children[line].firstChild!;
    getSelection()!.collapse(text, (text as Text).data.length);
  };
  const tab = (shift = false) => box<HTMLElement>(el, 'Bullets').dispatchEvent(new KeyboardEvent('keydown', { key: 'Tab', shiftKey: shift, bubbles: true, cancelable: true }));
  const second = () => parseDeck(last()!)[0].bullets[1];
  caretIn(1);
  // Tab steps a bullet in; Shift+Tab brings it out; so do the buttons.
  tab();
  await settle(el);
  expect(second()).toBe('  Tell everyone');
  caretIn(1);
  tab();
  await settle(el);
  // (Saved, a bullet is at most one in from the one above, as Markdown nests.)
  expect(second()).toBe('  Tell everyone');
  expect(box<HTMLElement>(el, 'Bullets').children[1].textContent).toBe('    Tell everyone');
  caretIn(1);
  tab(true);
  await settle(el);
  caretIn(1);
  button(el, 'Bring the bullet out').click();
  await settle(el);
  expect(second()).toBe('Tell everyone');
  caretIn(1);
  button(el, 'Indent the bullet').click();
  await settle(el);
  expect(second()).toBe('  Tell everyone');
  // The slide itself (in the rail) shows the words.
  expect(el.querySelector('.deck-rail .deck-thumb svg')!.textContent).toContain('Spring launch');
});

test('write: an icon in the line, and marks, alignment and icons come back from the text', async () => {
  const { el, last } = await mount('write');
  const doc = box<HTMLElement>(el, 'Document');
  typeRich(doc, 'Ship it today');
  await settle(el);
  // The caret at the end of the line, then an icon from the picker.
  doc.focus();
  getSelection()!.collapse(doc.querySelector('p')!.firstChild!, 'Ship it today'.length);
  button(el, 'Icon').click();
  await pickIcon('rocket', 'rocket');
  await settle(el);
  expect(doc.querySelector('.ic[data-icon="rocket"] svg')).toBeTruthy();
  expect(last()).toMatch(/^Ship it today\s?:rocket:/);
  // A highlight, centred, with an icon: written as marks in the text, drawn again from them.
  const back = await mount('write', '==Ship it today== :rocket: {.center}');
  const page = box<HTMLElement>(back.el, 'Document');
  expect(page.querySelector('mark')!.textContent).toBe('Ship it today');
  expect(page.querySelectorAll('.ic[data-icon="rocket"]')).toHaveLength(1);
  expect(page.querySelector('p')!.getAttribute('style')).toMatch(/center/);
});

test('previews are the real thing: a month, a map, a list that fills in', async () => {
  const cal = '```cal\n---\ngreen: Sam\n---\n- 2020-01-03 to 2020-01-04: Offsite {color=green}\n- 2020-01-12: Launch\n```';
  const trip = '```trip\nPlace | Lat:number | Lon:number | Note\n--- | --- | --- | ---\nLisbon | 38.7223 | -9.1393 | Start here\nCoimbra | 40.2033 | -8.4103 |\n```';
  const todo = '```todo\n- [ ] Book flights\n- [x] Renew passport\n- [ ] Pack\n```';
  // In a text they show whole: the calendar as a month, the trip on its map, every task.
  const { el } = await mount('write', `Plans\n\n${cal}\n\n${trip}\n\n${todo}`);
  const embeds = [...el.querySelectorAll('to-embed')].map((e) => e.shadowRoot!.querySelector('svg[role="img"]')!);
  expect(embeds).toHaveLength(3);
  expect(embeds[0].textContent).toContain('January 2020');
  expect(embeds[0].textContent).toContain('Offsite');
  expect(embeds[0].textContent).toContain('Sam');
  expect(embeds[1].querySelectorAll('image').length).toBeGreaterThan(3);
  expect(embeds[1].textContent).toContain('Coimbra');
  expect(embeds[1].textContent).toContain('OpenStreetMap');
  expect(embeds[2].textContent).toContain('Pack');
});

test('on slides, the documents arrive a piece at a time', async () => {
  const deck = await mount('deck', `## A\n\n\`\`\`todo\n- [ ] Book flights\n- [x] Renew passport\n- [ ] Pack\n\`\`\`\n\n---\n\n## B\n\n\`\`\`cal\n---\ngreen: Sam\n---\n- 2020-01-03 to 2020-01-04: Offsite {color=green}\n- 2020-01-12: Launch\n\`\`\``);
  button(deck.el, /Present/).click();
  await settle(deck.el);
  const { slide, key } = presenting(deck.el);
  expect(slide().textContent).not.toContain('Book flights');
  await key('ArrowRight');
  expect(slide().textContent).toContain('Book flights');
  expect(slide().textContent).not.toContain('Renew passport');
  await key('ArrowRight');
  await key('ArrowRight');
  expect(slide().textContent).toContain('Pack');
  // Then the calendar: the month is there, and what happens in it arrives.
  await key('ArrowRight');
  expect(slide().textContent).toContain('January 2020');
  expect(slide().textContent).not.toContain('Offsite');
  await key('ArrowRight');
  expect(slide().textContent).toContain('Offsite');
  expect(slide().textContent).not.toContain('Launch');
});
