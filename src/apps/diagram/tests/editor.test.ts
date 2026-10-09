// The Diagram editor in a real browser: the picture from the document, a tap on a thing opens its words over it in a
// one-line <to-text> and typing there is text ops on its line (a person's dotted lines follow a new name); Enter types
// the next; a tap on empty space types a new thing there, gone if nothing is typed; the buttons under the words add,
// join and take away; a drag puts one thing under another; the kind menu; undo; and at phone width the bar is one row,
// the page never wider, the line editor on the screen.
import { expect, test } from 'vitest';
import { page } from 'vitest/browser';
import '../../../styles.css';
import '../editor.ts';
import type { ToDiagramEditor } from '../editor.ts';
import type { ToText } from '../../../kit/text.ts';
import { tick, until } from '../../../../test/browser/helpers.ts';

const ORG = '---\nkind: org\n---\n- Ada Diaz | Chief executive\n  - Ben Okoro | Engineering\n  - Eve Marsh | Design\n\n~ Ben Okoro -- Eve Marsh: design partner\n';
const NET = '---\nkind: net\n---\n- Web\n- API\n- Database\n';

async function editor(value: string): Promise<{ el: ToDiagramEditor; last: () => string }> {
  document.body.innerHTML = '';
  const main = document.createElement('main');
  main.className = 'to-main';
  document.body.append(main);
  const el = document.createElement('to-diagram-editor') as ToDiagramEditor;
  el.value = value;
  const changes: string[] = [value];
  el.addEventListener('docchange', (e) => changes.push((e as CustomEvent<string>).detail));
  main.append(el);
  await el.updateComplete;
  return { el, last: () => changes.at(-1)! };
}
const settle = async (el: ToDiagramEditor) => {
  await el.updateComplete;
  await tick(30);
  await el.updateComplete;
};
const things = (el: HTMLElement) => [...el.querySelectorAll<SVGGElement>('.dg-pic g.dg-thing')];
const thing = (el: HTMLElement, words: string) => things(el).find((g) => g.getAttribute('aria-label')!.startsWith(words))!;
const pop = (el: HTMLElement) => el.querySelector<HTMLElement>('.dg-pop')!;
const line = (el: HTMLElement) => el.querySelector<ToText>('.dg-pop to-text')!;
const isOpen = (el: HTMLElement) => pop(el).matches(':popover-open');
const center = (g: Element) => {
  const r = g.getBoundingClientRect();
  return { clientX: r.left + r.width / 2, clientY: r.top + r.height / 2 };
};
async function tap(el: ToDiagramEditor, target: Element, at = center(target)) {
  target.dispatchEvent(new MouseEvent('click', { ...at, bubbles: true, composed: true }));
  await settle(el);
}
const input = (x: ToText, inputType: string, data: string | null = null) => x.tx.dispatchEvent(new InputEvent('beforeinput', { inputType, data, bubbles: true, cancelable: true, composed: true }));
async function type(el: ToDiagramEditor, s: string) {
  for (const ch of s) {
    input(line(el), 'insertText', ch);
    await settle(el);
  }
}
async function key(el: ToDiagramEditor, k: string) {
  if (k === 'Enter') {
    input(line(el), 'insertParagraph');
    return settle(el);
  }
  line(el).tx.dispatchEvent(new KeyboardEvent('keydown', { key: k, bubbles: true, cancelable: true, composed: true }));
  await settle(el);
}
const action = (el: HTMLElement, label: string) => [...pop(el).querySelectorAll<HTMLButtonElement>('.dg-acts button')].find((b) => (b.getAttribute('aria-label') ?? b.textContent!.trim()) === label)!;

test('the picture from the document: a thing per person, each a button with its words; the kind in the bar', async () => {
  const { el } = await editor(ORG);
  expect(things(el).map((g) => g.getAttribute('aria-label'))).toEqual(['Ada Diaz | Chief executive', 'Ben Okoro | Engineering', 'Eve Marsh | Design', 'design partner']);
  expect(el.querySelector('.dg-kind > button')!.textContent).toContain('Org chart');
  expect(el.querySelector('.dg-hint')!.textContent).toContain('Name | Role');
  expect(isOpen(el)).toBe(false);
});

test('a tap opens the words over the thing; typing is text ops on its line, and the dotted line follows the new name; undo takes it back', async () => {
  const { el, last } = await editor(ORG);
  await tap(el, thing(el, 'Ben Okoro'));
  expect(isOpen(el)).toBe(true);
  expect(line(el).tx.textContent).toBe('Ben Okoro | Engineering');
  // The words tapped are selected: typing replaces them.
  await type(el, 'Bea Okoro | Engineering');
  expect(last()).toContain('  - Bea Okoro | Engineering\n');
  expect(last()).toContain('~ Bea Okoro -- Eve Marsh: design partner');
  expect(thing(el, 'Bea Okoro')).toBeTruthy();
  // Escape closes; one undo takes the burst of typing back.
  await key(el, 'Escape');
  expect(isOpen(el)).toBe(false);
  el.dispatchEvent(new CustomEvent('docundo', { cancelable: true }));
  await settle(el);
  expect(last()).toBe(ORG);
});

test('Enter types the next one; a tap on empty space a new one, gone if nothing is typed', async () => {
  const { el, last } = await editor(ORG);
  await tap(el, thing(el, 'Eve Marsh'));
  await key(el, 'Enter');
  expect(isOpen(el)).toBe(true);
  expect(line(el).tx.textContent).toBe('');
  expect(last()).toBe(ORG);
  await type(el, 'Flo');
  expect(last()).toContain('  - Eve Marsh | Design\n  - Flo\n');
  await key(el, 'Escape');
  const n = things(el).length;
  // Empty space: a draft, nothing in the document until typed into; a second tap closes it.
  const pic = el.querySelector<SVGSVGElement>('.dg-pic')!;
  const r = pic.getBoundingClientRect();
  await tap(el, pic, { clientX: r.left + 6, clientY: r.bottom - 6 });
  expect(isOpen(el)).toBe(true);
  const before = last();
  await key(el, 'Escape');
  expect(last()).toBe(before);
  expect(things(el)).toHaveLength(n);
});

test('the buttons under the words: one under it, a picture, take it away', async () => {
  const { el, last } = await editor(ORG);
  await tap(el, thing(el, 'Eve Marsh'));
  action(el, 'Add under it').click();
  await settle(el);
  expect(isOpen(el)).toBe(true);
  await type(el, 'Gus');
  expect(last()).toContain('  - Eve Marsh | Design\n    - Gus\n');
  await key(el, 'Escape');
  await tap(el, thing(el, 'Ben Okoro'));
  action(el, 'Delete').click();
  await settle(el);
  // Ben goes, and his dotted line with him.
  expect(last()).not.toContain('Ben');
  expect(last()).not.toContain('~ ');
  expect(isOpen(el)).toBe(false);
});

test('a network: Join, then a tap on another thing, makes the connection; its words are tapped and typed too', async () => {
  const { el, last } = await editor(NET);
  await tap(el, thing(el, 'Web'));
  action(el, 'Join').click();
  await settle(el);
  expect(el.querySelector('.dg-hint')!.textContent).toContain('join Web to');
  await tap(el, thing(el, 'API'));
  expect(last()).toContain('~ Web -> API');
  const edge = el.querySelector<SVGGElement>('.dg-pic g.dg-thing.edge')!;
  await tap(el, edge, center(edge.querySelector('line')!));
  expect(isOpen(el)).toBe(true);
  await type(el, 'asks');
  expect(last()).toContain('~ Web -> API: asks');
  await key(el, 'Escape');
  // A drag of one thing onto another joins them too.
  const [db, api] = [thing(el, 'Database'), thing(el, 'API')];
  const from = center(db);
  const to = center(api);
  db.dispatchEvent(new PointerEvent('pointerdown', { ...from, button: 0, pointerId: 7, bubbles: true }));
  db.dispatchEvent(new PointerEvent('pointermove', { ...to, pointerId: 7, bubbles: true }));
  db.dispatchEvent(new PointerEvent('pointerup', { ...to, pointerId: 7, bubbles: true }));
  await settle(el);
  expect(last()).toContain('~ Database -> API');
});

test('a drag onto another thing puts it under that one; the kind menu changes the kind', async () => {
  const { el, last } = await editor('---\nkind: mind\n---\n- Root\n  - A\n  - B\n');
  const [b, a] = [thing(el, 'B'), thing(el, 'A')];
  const to = center(a);
  b.dispatchEvent(new PointerEvent('pointerdown', { ...center(b), button: 0, pointerId: 3, bubbles: true }));
  b.dispatchEvent(new PointerEvent('pointermove', { ...to, pointerId: 3, bubbles: true }));
  b.dispatchEvent(new PointerEvent('pointerup', { ...to, pointerId: 3, bubbles: true }));
  await settle(el);
  expect(last()).toContain('- Root\n  - A\n    - B\n');
  // The click after a drop is not a tap.
  await tap(el, b);
  expect(isOpen(el)).toBe(false);
  el.querySelector<HTMLButtonElement>('.dg-kind > button')!.click();
  await until(() => !!document.querySelector('[popover]:popover-open'));
  [...document.querySelectorAll<HTMLElement>('[popover]:popover-open [role^=menuitem]')].find((x) => x.textContent!.includes('Org chart'))!.click();
  await settle(el);
  expect(last()).toMatch(/^---\nkind: org\n---\n/);
  expect(el.querySelector('.dg-kind > button')!.textContent).toContain('Org chart');
});

test('a tap in a lane adds a step to it, its name already written', async () => {
  const { el, last } = await editor('---\nkind: lanes\n---\n- Sales: Calls\n- Shop: Sells\n');
  const pic = el.querySelector<SVGSVGElement>('.dg-pic')!;
  const shopName = thing(el, 'Shop');
  const s = shopName.getBoundingClientRect();
  await tap(el, pic, { clientX: s.right + 5, clientY: s.top + s.height / 2 });
  expect(line(el).tx.textContent).toBe('Shop: ');
  await type(el, 'Packs');
  expect(last()).toBe('---\nkind: lanes\n---\n- Sales: Calls\n- Shop: Sells\n- Shop: Packs\n');
});

test('at phone width: the bar one row, nothing wider than the screen, the line editor on it', async () => {
  await page.viewport(390, 844);
  try {
    const { el } = await editor('---\nkind: mind\n---\n- Launch\n  - Product\n    - Pricing\n  - Marketing\n    - Press\n    - Social\n  - Support\n');
    await settle(el);
    const bar = el.querySelector<HTMLElement>('to-bar')!;
    const tops = new Set([...bar.children].filter((x) => (x as HTMLElement).offsetWidth > 0).map((x) => Math.round(x.getBoundingClientRect().top)));
    expect(tops.size).toBe(1);
    expect(document.documentElement.scrollWidth).toBeLessThanOrEqual(390);
    await tap(el, thing(el, 'Social'));
    const p = pop(el).getBoundingClientRect();
    expect(p.left).toBeGreaterThanOrEqual(0);
    expect(p.right).toBeLessThanOrEqual(390);
    expect(parseFloat(getComputedStyle(line(el).tx).fontSize)).toBeGreaterThanOrEqual(16);
    for (const b of pop(el).querySelectorAll<HTMLElement>('.dg-acts button')) expect(b.getBoundingClientRect().height).toBeGreaterThanOrEqual(40);
    expect(document.documentElement.scrollWidth).toBeLessThanOrEqual(390);
    expect(document.scrollingElement!.scrollTop).toBe(0);
  } finally {
    await page.viewport(1100, 800);
  }
});

test('a Venn: a tap where two circles cross adds to what they share; a seat dragged to another table moves there', async () => {
  const { el, last } = await editor('---\nkind: venn\n---\n- Fast: espresso\n- Cheap: walking\n');
  const pic = el.querySelector<SVGSVGElement>('.dg-pic')!;
  const [fast, cheap] = [thing(el, 'Fast'), thing(el, 'Cheap')].map((g) => g.getBoundingClientRect());
  const r = pic.getBoundingClientRect();
  // Between the two names, halfway down the circles: inside both.
  await tap(el, pic, { clientX: (fast.right + cheap.left) / 2, clientY: r.top + r.height / 2 });
  expect(line(el).tx.textContent).toBe('Fast & Cheap: ');
  await type(el, 'toast');
  expect(last()).toContain('- Fast & Cheap: toast\n');
  await key(el, 'Escape');

  const seats = await editor('---\nkind: seating\n---\n- Top table: Jo, Sam\n- Table 2: Ann\n');
  const [sam, ann] = [thing(seats.el, 'Sam'), thing(seats.el, 'Ann')];
  const to = center(ann);
  sam.dispatchEvent(new PointerEvent('pointerdown', { ...center(sam), button: 0, pointerId: 5, bubbles: true }));
  sam.dispatchEvent(new PointerEvent('pointermove', { ...to, pointerId: 5, bubbles: true }));
  sam.dispatchEvent(new PointerEvent('pointerup', { ...to, pointerId: 5, bubbles: true }));
  await settle(seats.el);
  expect(seats.last()).toBe('---\nkind: seating\n---\n- Top table: Jo\n- Table 2: Ann, Sam\n');
});
