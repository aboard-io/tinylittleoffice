// Who did what, drawn for a host whose documents several people write (docs/library.md, Tracked changes and comments
// for a host), on a bare page with the kit alone: a Word Processor mounted through src/kit.ts, two versions of its
// document by two people tracked (track), and what the second changed drawn over the words as a host draws it: the
// ghosts given to the editor (ghostsOf, showGhosts), the words taken out in place, struck through, with a lozenge of
// the author's initials, and then the words they put in painted in their color (paint, the CSS Custom Highlight API).
// The caret stays where it was in the words as the ghosts are drawn again, and a letter typed goes there; a comment is
// pinned by its quote, and the bubble's Comment tells the host where it takes comments; "@" offers the host's people,
// in a list named People. And a page that gives none of it (no ghosts, no people, no element marked for comments) has
// its words drawn as ever, its bubble without Comment, "@" a letter like any other: the site's pages give none, so the
// site is as it was. (A unit test cannot say so: the unit project runs under node, with no DOM for Lit to draw in.)
import { expect, test } from 'vitest';
import '../../src/editors.css';
import {
  COLORS,
  PREFIX,
  caret,
  changesOf,
  ghostsOf,
  initialsOf,
  mount,
  paint,
  pinComments,
  track,
  trackOn,
  unpaint,
  unpin,
  wordsOf,
  type Drawing,
  type Step,
  type ToText,
  type Tracked,
} from '../../src/kit.ts';
import { tick, until } from './wait.ts';

const ALICE = 'alice@x.co';
const BOB = 'bob@x.co';
const PEOPLE = [
  { email: ALICE, name: 'Alice Adams' },
  { email: BOB, name: 'Bob Brown' },
];
const ORDER = PEOPLE.map((p) => p.email);
const V0 = 'Payment is due in 30 days.\n\nNotices go by email.\n';
const V1 = 'Payment is due in 45 days, net.\n\nNotices go by email.\n';
const VERSIONS: Step[] = [
  { author: ALICE, text: V0, hash: 'v0' },
  { author: BOB, text: V1, hash: 'v1' },
];

/** A Word Processor on a bare page holding `text`, its words (wordsOf), and the texts the page is told. */
async function mounted(text = V1) {
  document.body.innerHTML = '<main></main>';
  const changes: string[] = [];
  const main = document.querySelector('main')!;
  const { editor } = await mount('write', text, main, (next) => changes.push(next));
  const words = wordsOf(editor)!;
  await words.updateComplete;
  return { editor, words, changes, main };
}

/** How the host names and draws its people: their colors in order, their initials, their names, its own words. */
const ini = initialsOf(PEOPLE);
const drawing: Drawing = {
  color: (who) => COLORS[ORDER.indexOf(who)],
  initials: (who) => ini.get(who)!,
  name: (who) => PEOPLE.find((p) => p.email === who)!.name,
  accepted: () => false,
  takenOutBy: (name) => `Taken out by ${name}`,
  cardChanged: 'changed',
  rejected: 'rejected',
  restored: 'restored',
};

/** Who did what, drawn as a host draws it: the ghosts given and drawn first, then the words painted over them. */
async function show(words: ToText, tracked: Tracked[]) {
  const ghosts = ghostsOf(tracked, words.model, () => false, drawing);
  await words.showGhosts(ghosts.size ? (i) => ghosts.get(i) ?? [] : null);
  paint(words, tracked, ORDER);
}
/** The words a highlight covers, range by range. */
const painted = (name: string) => [...(CSS.highlights.get(name) ?? [])].map((r) => (r as Range).toString());
/** Words typed as the browser sends them: a beforeinput a letter. */
async function type(words: ToText, s: string) {
  for (const ch of s) {
    words.tx.dispatchEvent(new InputEvent('beforeinput', { inputType: 'insertText', data: ch, bubbles: true, cancelable: true, composed: true }));
    await tick();
  }
}
/** The box's drawing without Lit's markers, to compare one draw with another; a card's menus, which it fills as they open, left empty. */
const drawnHtml = (words: ToText) => words.tx.innerHTML.replace(/<!--[^]*?-->/g, '').replace(/(<to-menu[^>]*>)[^]*?(<\/to-menu>)/g, '$1$2');

test('two versions by two people: the second’s words painted in their color, the words they took out in place, struck through, with a lozenge of their initials', async () => {
  const { editor, words, changes } = await mounted();
  const tracked = track(VERSIONS);
  expect(changesOf(tracked).map((c) => [c.author, c.put, c.took])).toEqual([
    [BOB, '45', '30'],
    [BOB, ', net', ''],
  ]);
  await show(words, tracked);
  // Bob is the second person: his words are painted under the second name, and nobody's under the first.
  expect(painted(`${PREFIX}1`).join('')).toBe('45, net');
  expect(CSS.highlights.has(`${PREFIX}0`)).toBe(false);
  // The words he took out, where they were, struck through in red.
  const out = words.querySelector<HTMLElement>('del.tx-out')!;
  expect(out.textContent).toBe('30');
  expect(out.title).toBe('Taken out by Bob Brown');
  expect(getComputedStyle(out).textDecorationLine).toContain('line-through');
  // Each edit bracketed in his color, his lozenge after the opening bracket, named for the host to open.
  const lozenges = [...words.querySelectorAll<HTMLElement>('.tx-loz')];
  expect(lozenges.map((l) => [l.textContent, l.title, l.dataset.ghost])).toEqual([
    ['BB', 'Bob Brown', 'edit:v1:0'],
    ['BB', 'Bob Brown', 'edit:v1:1'],
  ]);
  expect(getComputedStyle(lozenges[0]).borderTopColor).toBe('rgb(213, 94, 0)');
  expect(words.querySelectorAll('.tx-br')).toHaveLength(4);
  // None of it is written: the document is Bob's version, and the page was told nothing.
  expect(editor.value).toBe(V1);
  expect(changes).toStrictEqual([]);
  unpaint();
  expect(CSS.highlights.has(`${PREFIX}1`)).toBe(false);
});

test('the caret stays where it was in the words as the ghosts are drawn again, and a letter typed goes there, painted as it is typed', async () => {
  const { words, changes } = await mounted();
  words.focus();
  // After "45": the ghosts drawn before it ("[", "BB", "30") are no part of the words.
  words.sel = caret(0, 20);
  await words.updateComplete;
  const tracked = track(VERSIONS);
  await show(words, tracked);
  expect(words.readSel()).toStrictEqual(caret(0, 20));
  await type(words, 'X');
  await until(() => changes.at(-1) === 'Payment is due in 45X days, net.\n\nNotices go by email.\n', 'the letter never reached the page');
  // The words being typed are a version of Bob's too (trackOn), drawn again over the words as they are now.
  await show(words, trackOn(tracked, { author: BOB, text: changes.at(-1)!, hash: 'typing' }, 2));
  expect(words.readSel()).toStrictEqual(caret(0, 21));
  expect(painted(`${PREFIX}1`).join('')).toBe('45X, net');
  expect(words.querySelector('del.tx-out')!.textContent).toBe('30');
  unpaint();
});

test('a comment is pinned by its quote wherever its words are now, and highlighted; one whose words are gone is not pinned', async () => {
  const { words, main } = await mounted();
  await show(words, track(VERSIONS));
  const pins = pinComments(words, main, [
    { id: 'c1', quote: 'email' },
    { id: 'c2', quote: 'by fax' },
  ]);
  expect(pins.map((p) => p.id)).toEqual(['c1']);
  // In the second paragraph, below the first.
  expect(pins[0].top).toBeGreaterThan(words.blockEls()[0].getBoundingClientRect().bottom - main.getBoundingClientRect().top - 1);
  expect(painted(`${PREFIX}comment`)).toEqual(['email']);
  unpin();
  expect(CSS.highlights.has(`${PREFIX}comment`)).toBe(false);
  // A host may name its highlights itself, beside another's on the same page.
  paint(words, track(VERSIONS), ORDER, () => false, 'atlas-');
  expect(painted('atlas-1').join('')).toBe('45, net');
  unpaint('atlas-');
  expect(CSS.highlights.has('atlas-1')).toBe(false);
});

test('"@" offers the host’s people and puts in the one picked by name; with no people, "@" is a letter like any other', async () => {
  const { words, changes } = await mounted('Ask\n');
  const open = () => document.querySelector<HTMLElement>('.to-complete:popover-open');
  words.focus();
  words.sel = caret(0, 3);
  await words.updateComplete;
  await type(words, ' @b');
  await until(() => changes.at(-1) === 'Ask @b\n', 'the letters never reached the page');
  await words.updateComplete;
  expect(open()).toBeNull();
  words.mentions = PEOPLE.map((p) => ({ name: p.name, detail: p.email }));
  await type(words, ' @b');
  await until(() => !!open(), 'the people were never offered');
  const rows = [...open()!.querySelectorAll<HTMLElement>('[role="option"]')];
  expect(rows.map((r) => [r.dataset.kind, r.dataset.value, r.querySelector('.to-complete-detail')?.textContent])).toEqual([['mention', 'Bob Brown', BOB]]);
  // A screen reader hears a list of people, not of icons.
  expect(open()!.getAttribute('aria-label')).toBe('People');
  words.tx.dispatchEvent(new KeyboardEvent('keydown', { key: 'Enter', bubbles: true, cancelable: true }));
  await until(() => changes.at(-1) === 'Ask @b Bob Brown\n', 'the person picked was never put in');
});

test('the bubble begins with Comment where the host marks the words for comments, and Comment tells the host; elsewhere there is none', async () => {
  const { words, main } = await mounted();
  const bubble = () => words.querySelector<HTMLElement>(':scope > to-context.tx-bubble > .to-context:popover-open');
  const labels = () => [...bubble()!.querySelectorAll<HTMLElement>('button')].map((b) => b.getAttribute('aria-label'));
  const select = async (from: number, to: number) => {
    words.focus();
    words.sel = { anchor: { block: 0, offset: from }, focus: { block: 0, offset: to } };
    await words.updateComplete;
    await until(() => !!bubble(), 'the bubble never opened');
  };
  await select(0, 7);
  expect(labels()).not.toContain('Comment');
  main.dataset.comments = '';
  const asked: string[] = [];
  main.addEventListener('text-comment', (e) => {
    const w = e.target as ToText;
    asked.push(`${w === words} ${w.sel!.anchor.offset}-${w.sel!.focus.offset}`);
  });
  await select(0, 8);
  expect(labels()[0]).toBe('Comment');
  bubble()!.querySelector<HTMLElement>('button[aria-label="Comment"]')!.click();
  expect(asked).toEqual(['true 0-8']);
  // Not inside the box the comment is written in.
  delete main.dataset.comments;
  document.body.insertAdjacentHTML('afterbegin', '<section data-comments><div data-comment-box></div></section>');
  document.querySelector('[data-comment-box]')!.append(main);
  await select(0, 7);
  expect(labels()).not.toContain('Comment');
});

/** A page with every kind of block and run the Word Processor draws, its cards among them (a rule, a table, a sheet). */
const RICH =
  'Plain :star: words with a note[^1] and **bold _it_** `code` ~~gone~~ ==hi== [link](https://x.co).\n\n- [ ] a task\n- [x] done\n  - nested\n\n1. one\n2. two\n\n> quote\n\n--- {.rule}\n\nA | B:number\n--- | ---\nx | 1\n\n```sheet\nA | B\n--- | ---\n1 | 2\n```\n\n[^1]: The note.\n';

test('with no ghosts given, the words are drawn as they were before any were: drawn and taken away, nothing is left', async () => {
  const { words } = await mounted(RICH);
  const before = drawnHtml(words);
  expect(words.ghosts).toBeNull();
  expect(words.querySelector('[data-ghost], .tx-ghost')).toBeNull();
  // A card with its own drawing holds that drawing alone, no place kept for ghosts: one marker of Lit's, as before.
  const own = [...words.querySelectorAll<HTMLElement>('.tx-card-own')];
  expect(own.length).toBeGreaterThan(1);
  const markers = () => own.map((c) => [...c.childNodes].filter((n) => n.nodeType === Node.COMMENT_NODE).length);
  expect(markers().every((n) => n === 1)).toBe(true);
  await words.showGhosts(() => [{ offset: 0, text: 'out', cls: 'tx-out' }]);
  expect(drawnHtml(words)).not.toBe(before);
  await words.showGhosts(null);
  expect(drawnHtml(words)).toBe(before);
  await show(words, track(VERSIONS));
  await words.showGhosts(null);
  unpaint();
  expect(drawnHtml(words)).toBe(before);
});
