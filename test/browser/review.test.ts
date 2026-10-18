// Who did what and what was said about it, as components a host puts beside a mounted Word Processor (docs/library.md,
// Tracked changes and comments for a host), on a bare page with the kit alone: the redraw that awaits the ghosts before
// it paints (drawChanges), each person's color past the six, the selection as a quote and a comment pinned by where it
// was taken from (quoteAt, pinComments), the review panel's Accept and Reject (<to-review-panel>), and the margin
// (<to-comments>): its notes beside the words they quote, never meeting, placed again as the words move, here or by
// another's ops, a thread opened, a reply and a new thread sent to the host, and on a phone a sheet.
import { expect, test } from 'vitest';
import { page } from 'vitest/browser';
import '../../src/editors.css';
import {
  changesOf,
  colorOf,
  drawChanges,
  mount,
  PREFIX,
  quoteAt,
  track,
  unpaint,
  unpin,
  wordsOf,
  type Comment,
  type CommentSend,
  type Drawing,
  type Person,
  type Quote,
  type ReviewAsk,
  type Step,
  type ToComments,
  type ToReviewPanel,
  type ToText,
} from '../../src/kit.ts';
import { until } from './wait.ts';

const A = 'alice@x.co';
const B = 'bob@x.co';
const PEOPLE: Person[] = [
  { id: A, name: 'Alice Adams' },
  { id: B, name: 'Bob Brown' },
];
const ORDER = PEOPLE.map((p) => p.id);
const drawing: Drawing = {
  color: (who) => colorOf(who, ORDER),
  initials: (who) => who[0].toUpperCase(),
  name: (who) => PEOPLE.find((p) => p.id === who)?.name ?? who,
  accepted: () => false,
  takenOutBy: (name) => `Taken out by ${name}`,
  cardChanged: 'changed',
  rejected: 'rejected',
  restored: 'restored',
};

/** A Word Processor holding `text` beside a column for a component, on a bare page; its words. */
async function mounted(text: string, readOnly = false) {
  document.body.innerHTML = '<div class="row" style="display:grid;grid-template-columns:minmax(0,1fr) 18rem;gap:1rem;align-items:start"><main></main><aside></aside></div>';
  const main = document.querySelector('main')!;
  const m = await mount('write', text, main, () => {}, { readOnly });
  const words = wordsOf(m.editor)!;
  await words.updateComplete;
  return { ...m, words, aside: document.querySelector('aside')! };
}
const painted = (name: string) => [...(CSS.highlights.get(name) ?? [])].map((r) => (r as Range).toString());

test('drawChanges: the ghosts drawn and awaited, then the paint, then "text-redline"; asked twice at once, the last asked is what is drawn', async () => {
  const v: Step[] = [
    { author: A, text: 'Due in 30 days.\n', hash: 'v0' },
    { author: B, text: 'Due in 45 days.\n', hash: 'v1' },
  ];
  const { words } = await mounted(v[1].text);
  let heard = 0;
  words.addEventListener('text-redline', () => heard++);
  const first = drawChanges(words, track(v.slice(0, 1)), { drawing, order: ORDER });
  const last = drawChanges(words, track(v), { drawing, order: ORDER });
  await Promise.all([first, last]);
  expect(words.querySelector('del.tx-out')!.textContent).toBe('30');
  expect(painted(`${PREFIX}1`).join('')).toBe('45');
  expect(heard).toBeGreaterThanOrEqual(1);
  unpaint();
});

test('past six people, each painted in a color of their own, the page given its highlight a rule in it', async () => {
  const people = Array.from({ length: 9 }, (_, i) => `p${i}@x.co`);
  let text = 'Start.\n';
  const v: Step[] = [{ author: people[0], text, hash: 'v0' }];
  people.slice(1).forEach((p, i) => v.push({ author: p, text: (text = text.replace('.\n', ` w${i}.\n`)), hash: `v${i + 1}` }));
  const { words } = await mounted(text);
  await drawChanges(words, track(v), { drawing: { ...drawing, color: (w) => colorOf(w, people) }, order: people });
  expect(painted(`${PREFIX}8`).join('')).toBe(' w7');
  expect(document.querySelector('style[data-to-by]')!.textContent).toContain(`::highlight(${PREFIX}8)`);
  // The lozenge of the ninth in their own color, readable on the paper.
  const loz = [...words.querySelectorAll<HTMLElement>('.tx-loz')].at(-1)!;
  expect(getComputedStyle(loz).borderTopColor).not.toBe(getComputedStyle([...words.querySelectorAll<HTMLElement>('.tx-loz')][0]).borderTopColor);
  unpaint();
});

test('the selection as a quote, and a comment pinned where it was taken from when its words read twice', async () => {
  const { words, aside } = await mounted('Pay the rent.\n\nThe middle.\n\nPay the rent.\n');
  words.sel = { anchor: { block: 2, offset: 4 }, focus: { block: 2, offset: 12 } };
  await words.updateComplete;
  const q = quoteAt(words)!;
  expect(q).toStrictEqual({ quote: 'the rent', block: 2, offset: 4 });
  const { pinComments } = await import('../../src/kit/text/redline.ts');
  const [plain] = pinComments(words, aside, [{ id: 'a', quote: q.quote }]);
  const [placed] = pinComments(words, aside, [{ id: 'b', ...q }]);
  const els = words.blockEls();
  const top = (i: number) => els[i].getBoundingClientRect().top - aside.getBoundingClientRect().top;
  expect(Math.abs(plain.top - top(0))).toBeLessThan(4);
  expect(Math.abs(placed.top - top(2))).toBeLessThan(4);
  // A selection across blocks: their words a line each.
  words.sel = { anchor: { block: 0, offset: 8 }, focus: { block: 1, offset: 3 } };
  expect(quoteAt(words)).toStrictEqual({ quote: 'rent.\nThe', block: 0, offset: 8 });
  unpin();
});

test('<to-review-panel>: changes by author in their colors, Accept and Reject one or all of a person’s, said and nothing changed', async () => {
  const v: Step[] = [
    { author: A, text: 'Due in 30 days.\n\nNotices by email.\n', hash: 'v0' },
    { author: B, text: 'Due in 45 days, net.\n\nNotices by post.\n', hash: 'v1' },
  ];
  document.body.innerHTML = '';
  const panel = document.createElement('to-review-panel') as ToReviewPanel;
  Object.assign(panel, { changes: changesOf(track(v)), people: PEOPLE, me: A, canReview: true });
  document.body.append(panel);
  await panel.updateComplete;
  const asked: [string, string[]][] = [];
  for (const type of ['review-accept', 'review-reject']) panel.addEventListener(type, (e) => asked.push([type, (e as CustomEvent<ReviewAsk>).detail.ids]));
  const person = panel.querySelector<HTMLElement>(`[data-person="${B}"]`)!;
  expect(person.querySelector('.to-review-who')!.textContent).toContain('Bob Brown');
  expect([...panel.querySelectorAll('.to-review-what')].map((x) => x.textContent)).toEqual(['Replaced “30” with “45”', 'Added “, net”', 'Replaced “email” with “post”']);
  expect([...panel.querySelectorAll('.to-review-state')].map((x) => x.textContent)).toEqual(['Waiting for you', 'Waiting for you', 'Waiting for you']);
  panel.querySelector<HTMLButtonElement>('[data-change="v1:0"] .to-review-accept')!.click();
  panel.querySelector<HTMLButtonElement>('.to-review-reject-all')!.click();
  expect(asked).toStrictEqual([
    ['review-accept', ['v1:0']],
    ['review-reject', ['v1:0', 'v1:1', 'v1:2']],
  ]);
  expect(panel.querySelector<HTMLButtonElement>('.to-review-accept-all')!.getAttribute('aria-label')).toBe('Accept all of Bob Brown’s changes');
  // Reviewed as the host's server keeps it: Bob's first accepted, and where it stands said; the author's own, waiting for the others.
  panel.reviews = [{ change_id: 'v1:0', by: A, verdict: 'accepted', at_seq: 1 }];
  panel.me = B;
  await panel.updateComplete;
  expect([...panel.querySelectorAll('.to-review-state')].map((x) => x.textContent)).toEqual(['Accepted', 'Yours, waiting for the others', 'Yours, waiting for the others']);
  expect(panel.querySelectorAll('.to-review-accept')).toHaveLength(0);
  // A reader who may not review: no Accept, no Reject.
  panel.canReview = false;
  await panel.updateComplete;
  expect(panel.querySelectorAll('button.to-btn')).toHaveLength(0);
});

const NOTES: Comment[] = [
  { id: 'c1', quote: 'the third line', by: A, text: 'First.', created_at: '2026-10-18T10:00:00Z' },
  { id: 'c2', quote: 'the third line', by: B, text: 'On the same words: placed under the first.', created_at: '2026-10-18T10:01:00Z' },
  { id: 'c3', parent_id: 'c1', by: B, text: 'A reply.', created_at: '2026-10-18T10:02:00Z' },
  { id: 'c4', quote: 'words since taken out', by: B, text: 'Gone.', created_at: '2026-10-18T10:03:00Z' },
];
const TEXT = 'The first line.\n\nThe second line.\n\nAnd the third line.\n\nThe last.\n';

/** The margin beside the words, given the notes and the reader, its notes placed. */
async function margin(text = TEXT, comments = NOTES) {
  const m = await mounted(text);
  const el = document.createElement('to-comments') as ToComments;
  Object.assign(el, { comments, people: PEOPLE, me: A, canComment: true, ask: { id: 'assistant', name: 'Assistant' }, words: m.words });
  m.aside.append(el);
  await until(() => el.querySelectorAll('.to-comments-notes > [data-top]').length === 2, 'the notes were never pinned');
  return { ...m, el };
}
const noteRect = (el: Element, id: string) => el.querySelector(`[data-thread="${id}"]`)!.getBoundingClientRect();

test('<to-comments>: each thread a note at its words, the second on the same words under the first, never meeting; the gone and the replies said', async () => {
  await page.viewport(1100, 800);
  const { el, words } = await margin();
  const line = words.blockEls()[2].getBoundingClientRect().top;
  const [one, two] = [noteRect(el, 'c1'), noteRect(el, 'c2')];
  expect(Math.abs(one.top - line)).toBeLessThan(6);
  expect(two.top).toBeGreaterThanOrEqual(one.bottom);
  expect(el.querySelector('[data-thread="c1"] .to-note-more')!.textContent).toBe('1 reply');
  expect(el.querySelector('.to-comments-moved [data-thread="c4"]')).not.toBeNull();
  expect(new Set(painted(`${PREFIX}comment`))).toStrictEqual(new Set(['the third line']));
  // The words move (a paragraph put in above them, by another's ops): the notes follow.
  const { editor } = { editor: words.closest('.to-editor')! as HTMLElement & { applyRemote(ops: unknown[]): void } };
  editor.applyRemote([{ op: 'splice', at: 0, n: 0, blocks: [{ k: 'p', runs: [{ t: 'A new paragraph, long enough to take a line or two of its own at this width.' }] }] }]);
  const moved = () => Math.abs(noteRect(el, 'c1').top - words.blockEls()[3].getBoundingClientRect().top) < 6;
  await until(moved, 'the notes never followed their words');
  // And the width: narrower words wrap, and the notes follow again.
  (document.querySelector('main') as HTMLElement).style.width = '280px';
  await until(moved, 'the notes never followed a new width');
  unpin();
});

test('<to-comments>: a thread opened, a reply sent to the host with its parent, resolved; a new thread from the bubble’s Comment on the words selected', async () => {
  await page.viewport(1100, 800);
  const { el, words } = await margin();
  const sent: CommentSend[] = [];
  const told: [string, unknown][] = [];
  el.addEventListener('comment-send', (e) => sent.push((e as CustomEvent<CommentSend>).detail));
  for (const type of ['comment-resolve', 'comment-delete']) el.addEventListener(type, (e) => told.push([type, (e as CustomEvent).detail]));
  el.querySelector<HTMLButtonElement>('[data-thread="c1"] .to-note-open')!.click();
  await until(() => document.activeElement?.classList.contains('to-comment-field') ?? false, 'the reply box never took the focus');
  const field = document.activeElement as HTMLTextAreaElement;
  field.value = 'Agreed, @Assistant tidy it';
  field.form!.requestSubmit(field.form!.querySelector<HTMLButtonElement>('.to-comment-send'));
  expect(sent.map((s) => [s.text, s.parent_id, s.ask, s.mentions, s.quote])).toStrictEqual([['Agreed, @Assistant tidy it', 'c3', true, ['assistant'], null]]);
  sent[0].done(true);
  await until(() => field.value === '');
  el.querySelector<HTMLButtonElement>('[data-thread="c1"] .to-thread-resolve')!.click();
  el.querySelector<HTMLButtonElement>('[data-comment="c1"] .to-comment-delete')!.click();
  expect(told).toStrictEqual([
    ['comment-resolve', { thread_id: 'c1', resolved: true }],
    ['comment-delete', { id: 'c1' }],
  ]);
  // The bubble's Comment, on words selected: the editor is marked for comments, and a box opens beside them.
  expect(words.closest('[data-comments]')).not.toBeNull();
  words.sel = { anchor: { block: 1, offset: 4 }, focus: { block: 1, offset: 10 } };
  words.dispatchEvent(new CustomEvent<Quote | null>('text-comment', { detail: quoteAt(words), bubbles: true }));
  await until(() => !!el.querySelector('.to-draft to-comment-box'), 'the box for a new thread never opened');
  expect(el.querySelector('.to-draft .to-note-quote')!.textContent).toBe('“second”');
  await until(() => document.activeElement?.closest('.to-draft') != null, 'the new box never took the focus');
  const box = document.activeElement as HTMLTextAreaElement;
  box.value = 'Which second?';
  box.form!.requestSubmit(box.form!.querySelector<HTMLButtonElement>('.to-comment-send'));
  expect(sent.at(-1)!.quote).toStrictEqual({ quote: 'second', block: 1, offset: 4 });
  expect(sent.at(-1)!.parent_id).toBeNull();
  unpin();
});

test('<to-comments> on a phone: a button counts the open threads and opens them as a sheet, in the order their words read', async () => {
  await page.viewport(390, 844);
  try {
    const { el } = await margin();
    const toggle = el.querySelector<HTMLButtonElement>('.to-comments-toggle')!;
    expect(getComputedStyle(toggle).display).not.toBe('none');
    expect(toggle.textContent!.replace(/\s+/g, ' ').trim()).toBe('Comments 3');
    expect(getComputedStyle(el.querySelector('.to-comments-in')!).display).toBe('none');
    toggle.click();
    await until(() => getComputedStyle(el.querySelector('.to-comments-in')!).display === 'block', 'the sheet never opened');
    expect(getComputedStyle(el.querySelector('.to-comments-in')!).position).toBe('fixed');
    expect([...el.querySelectorAll('.to-comments-notes > [data-thread]')].map((n) => n.getAttribute('data-thread'))).toEqual(['c1', 'c2']);
    expect(document.documentElement.scrollWidth).toBeLessThanOrEqual(390);
  } finally {
    await page.viewport(1100, 800);
    unpin();
  }
});

test('the bubble’s Comment says the words selected in "text-comment", as the margin keeps them', async () => {
  const { words } = await mounted('Pay the rent on time.\n');
  document.querySelector('main')!.dataset.comments = '';
  let heard: Quote | null = null;
  words.addEventListener('text-comment', (e) => (heard = (e as CustomEvent<Quote | null>).detail));
  const { COMMENT } = await import('../../src/kit/text/text-commands.ts');
  words.sel = { anchor: { block: 0, offset: 4 }, focus: { block: 0, offset: 12 } };
  COMMENT.does(words as ToText, undefined as never);
  expect(heard).toStrictEqual({ quote: 'the rent', block: 0, offset: 4 });
});
