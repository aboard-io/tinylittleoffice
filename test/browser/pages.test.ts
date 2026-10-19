// A host's page's parts on a bare page (docs/library.md, The kit's small pieces): <to-section>, a heading with its
// count and its actions over the page's own things, saying its empty words where there are none; <to-tabs>, a page's
// views as links, one current, each told ("tabpick", which a page that routes itself prevents); and <to-avatar>, a
// person's initials in a disc of their own hue, their name for a screen reader.
import { expect, test } from 'vitest';
import '../../src/editors.css';
import '../../src/kit/ui/section.ts';
import '../../src/kit/ui/tabs.ts';
import '../../src/kit/ui/avatar.ts';
import type { ToSection } from '../../src/kit/ui/section.ts';
import type { Tab, ToTabs } from '../../src/kit/ui/tabs.ts';
import type { ToAvatar } from '../../src/kit/ui/avatar.ts';
import { hueOf } from '../../src/kit/ui/initials.ts';
import { until } from './wait.ts';

test('a section: its heading and count over the page’s own things, its actions in their slot, a region named by its heading', async () => {
  document.body.innerHTML =
    '<to-section heading="Meetings" count="2" empty="No meetings yet"><button slot="actions" id="add">Add</button><ul id="rows"><li>Kickoff</li><li>Review</li></ul></to-section>';
  const el = document.querySelector<ToSection>('to-section')!;
  await el.updateComplete;
  const title = el.querySelector('[role=heading]')!;
  expect(title.getAttribute('aria-level')).toBe('2');
  expect(title.querySelector('.to-sec-words')!.textContent).toBe('Meetings');
  expect(title.querySelector('.to-sec-count')!.textContent).toBe('2');
  expect(el.getAttribute('role')).toBe('region');
  expect(el.getAttribute('aria-labelledby')).toBe(title.id);
  expect(el.querySelector('#add')!.parentElement!.className).toBe('to-sec-actions');
  // The heading is drawn before the page's things, which stay where the page put them.
  expect([...el.children].map((c) => c.tagName.toLowerCase())).toStrictEqual(['header', 'ul']);
  expect(el.querySelector('.to-sec-empty')).toBeNull();
  // Counted empty, it says so; no count said and nothing of the page's in it, the same; something put in, the words go.
  el.count = 0;
  await el.updateComplete;
  expect(el.querySelector('.to-sec-empty')!.textContent).toBe('No meetings yet');
  el.count = null;
  await el.updateComplete;
  expect(el.querySelector('.to-sec-empty')).toBeNull();
  expect(el.querySelector('.to-sec-count')).toBeNull();
  el.querySelector('#rows')!.remove();
  await until(() => !!el.querySelector('.to-sec-empty'), 'the empty words never came');
  el.append(Object.assign(document.createElement('p'), { textContent: 'A meeting' }));
  await until(() => !el.querySelector('.to-sec-empty'), 'the empty words never went');
  expect(el.querySelector('header + p')).not.toBeNull();
  el.level = 3;
  await el.updateComplete;
  expect(title.getAttribute('aria-level')).toBe('3');
});

const VIEWS: Tab[] = [
  { value: 'overview', label: 'Overview', href: '#overview' },
  { value: 'model', label: 'Model', href: '#model', count: 12 },
  { value: 'documents', label: 'Documents', href: '#documents' },
];

test('tabs: links along a row, the current one aria-current, a count after its words; a tab taken is told and shown current, and a page that routes itself prevents the link', async () => {
  document.body.innerHTML = '<to-tabs label="Views"></to-tabs>';
  const el = document.querySelector<ToTabs>('to-tabs')!;
  el.tabs = VIEWS;
  el.value = 'overview';
  await el.updateComplete;
  expect(el.querySelector('nav')!.getAttribute('aria-label')).toBe('Views');
  const links = () => [...el.querySelectorAll<HTMLAnchorElement>('a.to-tab')];
  expect(links().map((a) => a.getAttribute('href'))).toStrictEqual(['#overview', '#model', '#documents']);
  expect(links().map((a) => a.getAttribute('aria-current'))).toStrictEqual(['page', null, null]);
  expect(links()[1].querySelector('.to-tab-count')!.textContent).toBe('12');
  expect(links()[0].querySelector('.to-tab-count')).toBeNull();
  const told: string[] = [];
  el.addEventListener('tabpick', (e) => {
    told.push((e as CustomEvent).detail.value);
    e.preventDefault();
  });
  links()[1].click();
  await el.updateComplete;
  expect(told).toStrictEqual(['model']);
  expect(location.hash).not.toBe('#model');
  expect(links().map((a) => a.getAttribute('aria-current'))).toStrictEqual([null, 'page', null]);
  // The page's value is the truth.
  el.value = 'documents';
  await el.updateComplete;
  expect(links().map((a) => a.getAttribute('aria-current'))).toStrictEqual([null, null, 'page']);
  // With no address, buttons, the current one aria-current="true".
  el.tabs = VIEWS.map(({ href: _href, ...tab }) => tab);
  await el.updateComplete;
  expect(el.querySelectorAll('a.to-tab').length).toBe(0);
  const buttons = [...el.querySelectorAll<HTMLButtonElement>('button.to-tab')];
  expect(buttons.map((b) => b.getAttribute('aria-current'))).toStrictEqual([null, null, 'true']);
  buttons[0].click();
  await el.updateComplete;
  expect(told).toStrictEqual(['model', 'overview']);
  expect(el.value).toBe('overview');
});

test('an avatar: initials in a disc of the name’s hue, the name for a screen reader and as its title, a link where it has an address, its size', async () => {
  document.body.innerHTML = '<to-avatar name="Maya Patel"></to-avatar>';
  const el = document.querySelector<ToAvatar>('to-avatar')!;
  await el.updateComplete;
  const disc = () => el.querySelector<HTMLElement>('.to-av')!;
  expect(disc().tagName).toBe('SPAN');
  expect(disc().querySelector('[aria-hidden=true]')!.textContent).toBe('MP');
  expect(disc().querySelector('.sr-only')!.textContent).toBe('Maya Patel');
  expect(disc().title).toBe('Maya Patel');
  expect(disc().style.getPropertyValue('--to-av-hue')).toBe(String(hueOf('Maya Patel')));
  expect(getComputedStyle(disc()).borderRadius).toBe('50%');
  const rem = parseFloat(getComputedStyle(document.documentElement).fontSize);
  expect(disc().offsetWidth).toBeCloseTo(1.75 * rem, 0);
  el.href = '#/people/m1';
  el.size = 's';
  await el.updateComplete;
  expect(disc().tagName).toBe('A');
  expect(disc().getAttribute('href')).toBe('#/people/m1');
  expect(el.getAttribute('size')).toBe('s');
  expect(disc().offsetWidth).toBeCloseTo(1.5 * rem, 0);
  // Two people, two hues; the same person twice, one.
  document.body.innerHTML = '<span class="to-avatars"><to-avatar name="Maya Patel"></to-avatar><to-avatar name="Leo"></to-avatar><to-avatar name="maya patel"></to-avatar></span>';
  const all = [...document.querySelectorAll<ToAvatar>('to-avatar')];
  await Promise.all(all.map((a) => a.updateComplete));
  const hues = all.map((a) => a.querySelector<HTMLElement>('.to-av')!.style.getPropertyValue('--to-av-hue'));
  expect(hues[0]).toBe(hues[2]);
  expect(all[1].querySelector('[aria-hidden=true]')!.textContent).toBe('L');
  // In a row, each overlaps the one before it.
  const [first, second] = all.map((a) => a.getBoundingClientRect());
  expect(second.left).toBeLessThan(first.right);
});
