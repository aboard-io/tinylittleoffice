// <to-search> on a bare page (kit/ui/search-box.ts; docs/library.md, A search box): the page's search asked a moment
// after the last key and never for each one, the question before let go (its signal aborted, its answer never shown),
// the hits grouped by kind with their counts and the page's actions after them, walked by the keys and chosen
// ("searchpick"); what it says while the answer is coming, when it fails and when nothing is found; and the same in a
// dialog that Mod+K opens from anywhere.
import { expect, test } from 'vitest';
import { userEvent } from 'vitest/browser';
import '../../src/editors.css';
import '../../src/kit/ui/search-box.ts';
import type { SearchHit, SearchPick, ToSearch } from '../../src/kit/ui/search-box.ts';
import { UI } from '../../src/kit/draw/icons.ts';
import { until } from './wait.ts';

const HITS: SearchHit[] = [
  { kind: 'company', id: 'c1', title: 'Clear Channel Outdoor', subtitle: 'Media' },
  { kind: 'person', id: 'p1', title: 'Clea Duvall', subtitle: 'Clear Channel', href: '#person-p1' },
  { kind: 'project', id: 'j1', title: 'Clear Channel Digital Strategy' },
  { kind: 'person', id: 'p2', title: 'Cleo Park' },
];

/** A search box whose page's search is recorded: each question, whether it was let go, and the answers it gives. */
async function box(opts: Partial<ToSearch> = {}, answer: (q: string) => Promise<SearchHit[]> = async (q) => HITS.filter((h) => h.title.toLowerCase().includes(q.toLowerCase()))) {
  document.body.innerHTML = '<button id="before">before</button>';
  const asked: { q: string; signal: AbortSignal }[] = [];
  const el = document.createElement('to-search') as ToSearch;
  Object.assign(el, {
    kinds: { person: { label: 'People', icon: UI.text }, company: { label: 'Companies' }, project: { label: 'Projects' } },
    search: (q: string, signal: AbortSignal) => {
      asked.push({ q, signal });
      return answer(q);
    },
    create: (q: string) => [{ id: 'company', label: `Add “${q}” as a company` }],
    ...opts,
  });
  document.body.append(el);
  await el.updateComplete;
  const picks: SearchPick[] = [];
  el.addEventListener('searchpick', (e) => {
    picks.push((e as CustomEvent<SearchPick>).detail);
    e.preventDefault();
  });
  return { el, asked, picks };
}
const type = async (el: ToSearch, words: string) => {
  el.input!.focus();
  await userEvent.keyboard(words);
};
const said = (el: ToSearch) => el.querySelector('.to-sb-said')!.textContent!.trim();

test('asked once, a moment after the last key; each question before it let go and its answer never shown', async () => {
  let answers: ((hits: SearchHit[]) => void)[] = [];
  const { el, asked } = await box({ delay: 400 }, () => new Promise((ok) => answers.push(ok)));
  await type(el, 'Clea');
  await until(() => asked.length === 1, 'never asked');
  expect(asked[0].q).toBe('Clea');
  expect(said(el)).toBe('Searching…');
  expect(el.querySelector('input')!.getAttribute('aria-expanded')).toBe('true');
  // A newer question lets the first go: its answer, when it comes, is not shown.
  await userEvent.keyboard('r');
  await until(() => asked.length === 2, 'the second question was never asked');
  expect(asked[0].signal.aborted).toBe(true);
  expect(asked[1].signal.aborted).toBe(false);
  answers[0]([HITS[3]]);
  answers[1]([HITS[0], HITS[2]]);
  await until(() => el.querySelectorAll('[role=option]').length === 3, 'the answer was not drawn');
  expect([...el.querySelectorAll('.to-sb-hit .to-sb-words > span')].map((s) => s.textContent)).toStrictEqual(['Clear Channel Outdoor', 'Clear Channel Digital Strategy', 'Add “Clear” as a company']);
  answers = [];
});

test('the hits grouped by kind in the order the page names the kinds, with their counts, then the page’s actions', async () => {
  const { el } = await box();
  await type(el, 'cle');
  await until(() => el.status === 'done');
  await el.updateComplete;
  const groups = [...el.querySelectorAll('.to-sb-group')].map((g) => [
    g.querySelector('.to-sb-head span')!.textContent,
    g.querySelector('.to-sb-head small')!.textContent,
    g.querySelectorAll('[role=option]').length,
  ]);
  expect(groups).toStrictEqual([
    ['People', '2', 2],
    ['Companies', '1', 1],
    ['Projects', '1', 1],
  ]);
  expect(el.querySelector('.to-sb-create')!.textContent).toContain('Add “cle” as a company');
  expect(said(el)).toBe('4 found');
  expect(el.querySelector('.to-sb-said')!.classList.contains('to-sb-quiet')).toBe(true);
  expect(el.querySelector('.to-sb-pop')!.matches(':popover-open')).toBe(true);
});

test('Down and Up walk the rows round the ends, Enter chooses; Escape closes, then clears', async () => {
  const { el, picks } = await box();
  await type(el, 'clea');
  await until(() => el.status === 'done');
  const input = el.querySelector('input')!;
  await userEvent.keyboard('{ArrowDown}{ArrowDown}');
  await el.updateComplete;
  const active = () => el.querySelector(`#${input.getAttribute('aria-activedescendant')}`)?.textContent ?? '';
  expect(active()).toContain('Clear Channel Outdoor');
  await userEvent.keyboard('{ArrowUp}{ArrowUp}');
  await el.updateComplete;
  expect(active()).toContain('Add “clea”');
  await userEvent.keyboard('{Enter}');
  expect(picks.at(-1)).toStrictEqual({ query: 'clea', action: { id: 'company', label: 'Add “clea” as a company' } });
  expect(input.value).toBe('');
  await type(el, 'cleo');
  await until(() => el.status === 'done');
  await userEvent.keyboard('{Enter}');
  expect(picks.at(-1)).toStrictEqual({ query: 'cleo', hit: HITS[3] });
  await type(el, 'clea');
  await until(() => el.status === 'done');
  await userEvent.keyboard('{Escape}');
  await el.updateComplete;
  expect(el.querySelector('.to-sb-pop')!.matches(':popover-open')).toBe(false);
  expect(input.value).toBe('clea');
  await userEvent.keyboard('{Escape}');
  await el.updateComplete;
  expect(input.value).toBe('');
});

test('a hit with an address is a link, followed unless the page prevents it', async () => {
  document.body.innerHTML = '';
  const { el } = await box();
  // This page lets it go: the listener added by box() prevents, so a second box listens without.
  el.remove();
  const own = document.createElement('to-search') as ToSearch;
  own.search = async () => [HITS[1]];
  document.body.append(own);
  await own.updateComplete;
  await type(own, 'clea');
  await until(() => own.status === 'done');
  await own.updateComplete;
  expect(own.querySelector('a.to-sb-hit')!.getAttribute('href')).toBe('#person-p1');
  await userEvent.keyboard('{Enter}');
  await until(() => location.hash === '#person-p1', 'the link was not followed');
  history.replaceState(null, '', location.pathname + location.search);
});

test('it says so when the search fails, and when nothing is found', async () => {
  const failing = await box({}, async () => {
    throw new Error('down');
  });
  await type(failing.el, 'clea');
  await until(() => failing.el.status === 'error');
  await failing.el.updateComplete;
  expect(said(failing.el)).toBe('The search didn’t work. Try again.');
  const none = await box({ create: null }, async () => []);
  await type(none.el, 'zzz');
  await until(() => none.el.status === 'done');
  await none.el.updateComplete;
  expect(said(none.el)).toBe('Nothing found for “zzz”');
  expect(none.el.querySelectorAll('[role=option]').length).toBe(0);
});

test('as a dialog: a button that opens it, Mod+K from anywhere, Escape closes it and the focus goes back', async () => {
  const { el, picks } = await box({ dialog: true, hotkey: true });
  const before = document.querySelector<HTMLButtonElement>('#before')!;
  before.focus();
  await userEvent.keyboard('{Control>}k{/Control}');
  await until(() => !!el.querySelector('dialog')?.open, 'Mod+K did not open it');
  await until(() => document.activeElement === el.input);
  await userEvent.keyboard('clear');
  await until(() => el.status === 'done');
  await userEvent.keyboard('{ArrowDown}{Enter}');
  expect(picks.at(-1)?.hit?.id).toBe('c1');
  await until(() => !el.querySelector('dialog')!.open, 'the dialog stayed open');
  expect(document.activeElement).toBe(before);
  el.querySelector<HTMLButtonElement>('.to-sb-open')!.click();
  await until(() => !!el.querySelector('dialog')?.open);
  await userEvent.keyboard('{Escape}');
  await until(() => !el.querySelector('dialog')!.open, 'Escape did not close it');
});

test('a hit listed but not chosen (disabled): drawn quiet, passed over by the keys, a click on it nothing', async () => {
  const hits: SearchHit[] = [
    { kind: 'company', id: 'c1', title: 'Clear Channel Outdoor', disabled: true },
    { kind: 'person', id: 'p1', title: 'Clea Duvall' },
    { kind: 'person', id: 'p2', title: 'Cleo Park', disabled: true },
  ];
  const { el, picks } = await box({ create: null }, async () => hits);
  await type(el, 'Cle');
  await until(() => el.querySelectorAll('[role=option]').length === 3, 'the hits never came');
  const off = [...el.querySelectorAll<HTMLElement>('[role=option][aria-disabled=true]')].map((o) => o.textContent!.trim());
  expect(off).toStrictEqual(['Cleo Park', 'Clear Channel Outdoor']);
  expect(getComputedStyle(el.querySelector('.to-sb-off')!).color).not.toBe(getComputedStyle(el.querySelector('.to-sb-hit:not(.to-sb-off)')!).color);
  // Enter with nothing in hand chooses the first that can be; Down and Up go round the others.
  const active = () => el.querySelector(`#${el.input!.getAttribute('aria-activedescendant')}`)?.textContent?.trim();
  await userEvent.keyboard('{ArrowDown}');
  await until(() => active() === 'Clea Duvall');
  await userEvent.keyboard('{ArrowDown}');
  expect(active()).toBe('Clea Duvall');
  await userEvent.keyboard('{ArrowUp}');
  expect(active()).toBe('Clea Duvall');
  el.querySelector<HTMLElement>('.to-sb-off')!.click();
  expect(picks).toStrictEqual([]);
  await userEvent.keyboard('{Enter}');
  expect(picks.map((p) => p.hit?.id)).toStrictEqual(['p1']);
  // Every hit disabled: Enter chooses nothing.
  const none = await box({ create: null }, async () => hits.filter((h) => h.disabled));
  await type(none.el, 'Cle');
  await until(() => none.el.querySelectorAll('[role=option]').length === 2);
  await userEvent.keyboard('{Enter}{ArrowDown}{Enter}');
  expect(none.picks).toStrictEqual([]);
});
