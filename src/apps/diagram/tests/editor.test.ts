// The Diagram editor in a real browser: the picture from the document, a tap on a thing opens its words where they are
// drawn, a <to-text> laid over them (the thing drawn blank meanwhile, no box apart from the picture), and typing there is
// text ops on its line (a person's dotted lines follow a new name); Shift+Enter a second line; Enter makes the next; a
// tap on empty space makes a new thing there with its words offered and chosen, gone again on Escape; the buttons under
// the words add, join and take away; a drag puts one thing under another; the kind menu; undo; and at phone width the
// bar is one row, the page never wider, the words on the thing.
import { expect, test } from 'vitest';
import { page } from 'vitest/browser';
import '../../../styles.css';
import '../editor.ts';
import type { ToDiagramEditor } from '../editor.ts';
import type { ToText } from '../../../kit/text.ts';
import { tick, until } from '../../../../test/browser/helpers.ts';
import { BASE, remScale } from '../../../kit/zoom.ts';

const ORG = '---\nkind: org\n---\n- Ada Diaz | Chief executive\n  - Ben Okoro | Engineering\n  - Eve Marsh | Design\n\n~ Ben Okoro -- Eve Marsh: design partner\n';
const NET = '---\nkind: net\n---\n- Web\n- API\n- Database\n';

async function editor(value: string): Promise<{ el: ToDiagramEditor; last: () => string }> {
  document.body.innerHTML = '';
  // At the top, whatever a test before left scrolled (the page is the size of everything's taller).
  window.scrollTo(0, 0);
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
const line = (el: HTMLElement) => el.querySelector<ToText>('to-text.dg-words')!;
const isOpen = (el: HTMLElement) => !line(el).hidden;
/** The words over the thing, as they hold them (a line break is "\n"). */
const held = (el: HTMLElement) => line(el).blocks.map((b) => ('runs' in b ? b.runs.map((r) => r.t).join('') : '')).join('\n');
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
async function key(el: ToDiagramEditor, k: string, mods: KeyboardEventInit = {}) {
  if (k === 'Enter' && !mods.ctrlKey) {
    input(line(el), 'insertParagraph');
    return settle(el);
  }
  const e = new KeyboardEvent('keydown', { key: k, bubbles: true, cancelable: true, composed: true, ...mods });
  line(el).tx.dispatchEvent(e);
  await settle(el);
  return e;
}
/** A key pressed on a thing that has the focus. */
async function press(el: ToDiagramEditor, g: Element, k: string, mods: KeyboardEventInit = {}) {
  (g as SVGGElement).focus();
  const e = new KeyboardEvent('keydown', { key: k, bubbles: true, cancelable: true, composed: true, ...mods });
  g.dispatchEvent(e);
  await settle(el);
  return e;
}
async function clip(el: ToDiagramEditor, g: Element, type: 'copy' | 'cut' | 'paste', data?: { text: string; html?: string }) {
  (g as HTMLElement).focus();
  const dt = new DataTransfer();
  if (data) {
    dt.setData('text/plain', data.text);
    if (data.html) dt.setData('text/html', data.html);
  }
  const e = new ClipboardEvent(type, { clipboardData: dt, bubbles: true, cancelable: true });
  g.dispatchEvent(e);
  await settle(el);
  return { e, text: dt.getData('text/plain'), html: dt.getData('text/html') };
}
const undo = async (el: ToDiagramEditor) => {
  el.dispatchEvent(new CustomEvent('docundo', { cancelable: true }));
  await settle(el);
};
const ctx = (el: HTMLElement) => el.querySelector<HTMLElement>('to-context.dg-context .to-context')!;
const action = (el: HTMLElement, label: string) => [...ctx(el).querySelectorAll<HTMLButtonElement>('button')].find((b) => (b.getAttribute('aria-label') ?? b.textContent!.trim()) === label)!;

test('the picture from the document: a thing per person, each a button with its words; the kind in the bar', async () => {
  const { el } = await editor(ORG);
  expect(things(el).map((g) => g.getAttribute('aria-label'))).toEqual(['Ada Diaz | Chief executive', 'Ben Okoro | Engineering', 'Eve Marsh | Design', 'design partner']);
  expect(el.querySelector('.dg-kind > button')!.textContent).toContain('Org chart');
  expect(el.querySelector('.dg-hint')!.textContent).toContain('Shift+Enter for their role');
  expect(isOpen(el)).toBe(false);
  // No box for words apart from the picture: the words are typed on it.
  expect(el.querySelector('.dg-pop, [popover] to-text, dialog to-text')).toBeNull();
});

test('a tap opens the words over the thing; typing is text ops on its line, and the dotted line follows the new name; undo takes it back', async () => {
  const { el, last } = await editor(ORG);
  await tap(el, thing(el, 'Ben Okoro'));
  expect(isOpen(el)).toBe(true);
  // The role is the second line, as the thing draws it.
  expect(held(el)).toBe('Ben Okoro\nEngineering');
  // The words tapped are selected: typing replaces them; Shift+Enter is the line break, " | " in the line.
  await type(el, 'Bea Okoro');
  input(line(el), 'insertLineBreak');
  await settle(el);
  await type(el, 'Engineering');
  expect(last()).toContain('  - Bea Okoro | Engineering\n');
  expect(last()).toContain('~ Bea Okoro -- Eve Marsh: design partner');
  expect(thing(el, 'Bea Okoro')).toBeTruthy();
  // Enter-like Mod+Enter keeps it; one undo takes the burst of typing back, and the focus goes to the thing.
  await key(el, 'Enter', { ctrlKey: true });
  expect(isOpen(el)).toBe(false);
  expect(last()).toContain('Bea Okoro');
  el.dispatchEvent(new CustomEvent('docundo', { cancelable: true }));
  await settle(el);
  expect(last()).toBe(ORG);
  expect(document.activeElement).toBe(thing(el, 'Ben Okoro'));
});

test('Enter makes the next one, its words offered and chosen; a tap on empty space a new one, gone again on Escape', async () => {
  const { el, last } = await editor(ORG);
  await tap(el, thing(el, 'Eve Marsh'));
  await key(el, 'Enter');
  expect(isOpen(el)).toBe(true);
  expect(held(el)).toBe('Name');
  expect(last()).toContain('  - Eve Marsh | Design\n  - Name\n');
  await type(el, 'Flo');
  expect(last()).toContain('  - Eve Marsh | Design\n  - Flo\n');
  await key(el, 'Escape');
  expect(last()).toBe(ORG);
  const n = things(el).length;
  // Empty space: a new thing, in the picture at once, its words over it; Escape takes it away.
  const pic = el.querySelector<SVGSVGElement>('.dg-pic')!;
  const r = pic.getBoundingClientRect();
  await tap(el, pic, { clientX: r.left + 6, clientY: r.bottom - 6 });
  expect(isOpen(el)).toBe(true);
  expect(things(el)).toHaveLength(n + 1);
  // The first Escape lets go of the words chosen, the next takes the new thing away.
  await key(el, 'Escape');
  expect(isOpen(el)).toBe(true);
  await key(el, 'Escape');
  expect(isOpen(el)).toBe(false);
  expect(last()).toBe(ORG);
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
  expect(held(el)).toBe('Step');
  expect(last()).toBe('---\nkind: lanes\n---\n- Sales: Calls\n- Shop: Sells\n- Shop: Step\n');
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
    const p = line(el).getBoundingClientRect();
    const g = thing(el, 'Social').getBoundingClientRect();
    expect(p.left).toBeGreaterThanOrEqual(0);
    expect(p.right).toBeLessThanOrEqual(390);
    // On the thing itself, not beside it; 16px or more to iOS, scaled to the picture's size.
    expect(Math.abs(p.top + p.height / 2 - (g.top + g.height / 2))).toBeLessThan(g.height / 2);
    expect(parseFloat(getComputedStyle(line(el)).fontSize)).toBeGreaterThanOrEqual(16);
    expect(ctx(el).matches(':popover-open')).toBe(true);
    const c = ctx(el).getBoundingClientRect();
    expect(c.left).toBeGreaterThanOrEqual(0);
    expect(c.right).toBeLessThanOrEqual(390);
    // 36px to a mouse; 44px under a finger (kit.css, proved on the iPhone in e2e/diagram.spec.ts).
    for (const b of ctx(el).querySelectorAll<HTMLElement>('button')) expect(b.getBoundingClientRect().height).toBeGreaterThanOrEqual(36);
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
  expect(held(el)).toBe('Thing');
  expect(last()).toContain('- Fast & Cheap: Thing\n');
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

/* ---------- docs/editing.md, path by path ---------- */

test('§1 undo: the bar ends with Undo and Redo; a thing deleted by its key comes back with the focus on it', async () => {
  const { el, last } = await editor(ORG);
  const tools = [...el.querySelectorAll<HTMLButtonElement>('to-bar > button, to-bar > * > button')].slice(-2).map((b) => b.getAttribute('aria-label') ?? b.title);
  expect(tools.join(' ')).toMatch(/Undo.*Redo/);
  const e = await press(el, thing(el, 'Eve Marsh'), 'Delete');
  expect(e.defaultPrevented).toBe(true);
  expect(last()).not.toContain('Eve Marsh');
  expect(document.activeElement).toBe(el.querySelector('.dg-wrap'));
  await undo(el);
  expect(last()).toBe(ORG);
  expect(document.activeElement).toBe(thing(el, 'Eve Marsh'));
});

test('§1 Mod+C/X/V on a thing: TLO and our HTML out; cut takes it away; paste puts it after the thing in hand', async () => {
  const { el, last } = await editor('---\nkind: mind\n---\n- Root\n  - A\n    - A1\n  - B\n');
  const c = await clip(el, thing(el, 'A'), 'copy');
  expect(c.e.defaultPrevented).toBe(true);
  expect(c.text).toBe('- A\n  - A1\n');
  expect(c.html).toContain('content="TinyLittleOffice"');
  const x = await clip(el, thing(el, 'B'), 'cut');
  expect(x.text).toBe('- B\n');
  expect(last()).not.toContain('- B');
  await clip(el, thing(el, 'Root'), 'paste', { text: c.text, html: c.html });
  expect(last()).toContain('- Root\n  - A\n    - A1\n  - A\n    - A1\n');
  // Words from elsewhere are things too, and the focus is on the first one pasted.
  await clip(el, thing(el, 'A1'), 'paste', { text: 'Plain words' });
  expect(last()).toContain('    - A1\n    - Plain words\n');
  expect(document.activeElement).toBe(thing(el, 'Plain words'));
});

test('§1 Mod+C/X/V by finger, §5 the context bar: in the standard order under the words, and its Copy, Paste and Duplicate act on the thing', async () => {
  const { el, last } = await editor('---\nkind: seating\n---\n- Top table: Jo, Sam\n');
  await tap(el, thing(el, 'Jo'));
  const labels = [...ctx(el).querySelectorAll('button, .to-context-sep')].map((b) => (b.classList.contains('to-context-sep') ? '|' : b.getAttribute('aria-label')));
  expect(labels).toEqual(['Move up', 'Move down', 'Add one more', 'Icon', 'Duplicate', '|', 'Copy', 'Cut', 'Paste', '|', 'Delete']);
  expect(action(el, 'Move up').disabled).toBe(true);
  action(el, 'Duplicate').click();
  await settle(el);
  expect(last()).toContain('- Top table: Jo, Jo, Sam');
  await undo(el);
  await tap(el, thing(el, 'Sam'));
  action(el, 'Copy').click();
  await settle(el);
  action(el, 'Paste').click();
  await until(() => last().includes('Sam, Sam'));
  expect(last()).toContain('- Top table: Jo, Sam, Sam');
});

test('§1 Mod+A: on the picture it selects no page words; in the words, pressed again, the line stays whole and open', async () => {
  const { el } = await editor(ORG);
  const e = await press(el, thing(el, 'Ada Diaz'), 'a', { ctrlKey: true });
  expect(e.defaultPrevented).toBe(true);
  await tap(el, thing(el, 'Ben Okoro'));
  let heard = false;
  document.addEventListener('text-selectall', () => (heard = true), { once: true });
  const k = await key(el, 'a', { ctrlKey: true });
  expect(k!.defaultPrevented).toBe(true);
  expect(heard).toBe(false);
  expect(isOpen(el)).toBe(true);
});

test('§1 Escape: the first press collapses the words chosen, the next puts the words back as they were and the focus on the thing', async () => {
  const { el, last } = await editor(ORG);
  await tap(el, thing(el, 'Ben Okoro'));
  await key(el, 'Escape');
  expect(isOpen(el)).toBe(true);
  await type(el, ' Jr');
  expect(last()).toContain('Engineering Jr');
  await key(el, 'Escape');
  expect(isOpen(el)).toBe(false);
  expect(last()).toBe(ORG);
  expect(document.activeElement).toBe(thing(el, 'Ben Okoro'));
  // A draft abandoned leaves nothing; the focus goes to the picture.
  const pic = el.querySelector<SVGSVGElement>('.dg-pic')!;
  const r = pic.getBoundingClientRect();
  await tap(el, pic, { clientX: r.left + 6, clientY: r.bottom - 6 });
  await type(el, 'Zed');
  await key(el, 'Escape');
  expect(last()).toBe(ORG);
  expect(document.activeElement).toBe(el.querySelector('.dg-wrap'));
  // While joining, Escape on the picture stops the join.
  await tap(el, thing(el, 'Eve Marsh'));
  action(el, 'Join').click();
  await settle(el);
  const wrap = el.querySelector<HTMLElement>('.dg-wrap')!;
  wrap.focus();
  wrap.dispatchEvent(new KeyboardEvent('keydown', { key: 'Escape', bubbles: true, cancelable: true }));
  await settle(el);
  expect(el.querySelector('.dg-hint')!.textContent).not.toContain('join');
});

test('§1 Escape by pointer: a press outside the picture and the words closes them, keeping what was typed', async () => {
  const { el, last } = await editor(ORG);
  await tap(el, thing(el, 'Eve Marsh'));
  await type(el, 'Eva');
  const out = document.createElement('button');
  out.textContent = 'elsewhere';
  document.body.append(out);
  out.dispatchEvent(new PointerEvent('pointerdown', { bubbles: true, button: 0 }));
  await settle(el);
  expect(isOpen(el)).toBe(false);
  expect(last()).toContain('  - Eva\n');
  // A press in the context bar under the words does not.
  await tap(el, thing(el, 'Eva'));
  action(el, 'Copy').dispatchEvent(new PointerEvent('pointerdown', { bubbles: true, button: 0 }));
  await settle(el);
  expect(isOpen(el)).toBe(true);
});

test('§1 Arrows: from a thing to the nearest one that way; from the picture to the first', async () => {
  const { el } = await editor('---\nkind: mind\n---\n- Root\n  - A\n  - B\n');
  const wrap = el.querySelector<HTMLElement>('.dg-wrap')!;
  await press(el, wrap, 'ArrowDown');
  expect(document.activeElement).toBe(thing(el, 'Root'));
  const e = await press(el, thing(el, 'Root'), 'ArrowRight');
  expect(e.defaultPrevented).toBe(true);
  expect(['A', 'B']).toContain(document.activeElement!.getAttribute('aria-label'));
  await press(el, thing(el, 'A'), 'ArrowDown');
  expect(document.activeElement).toBe(thing(el, 'B'));
  await press(el, thing(el, 'B'), 'ArrowLeft');
  expect(document.activeElement).toBe(thing(el, 'Root'));
});

test('§1 Alt+Up/Down and §6 Move up/down: a thing past its sibling, from the focus or in its words; undo puts it and the focus back', async () => {
  const { el, last } = await editor('---\nkind: mind\n---\n- Root\n  - A\n    - A1\n  - B\n');
  await press(el, thing(el, 'A'), 'ArrowDown', { altKey: true });
  expect(last()).toContain('- Root\n  - B\n  - A\n    - A1\n');
  expect(document.activeElement).toBe(thing(el, 'A'));
  await undo(el);
  expect(last()).toContain('- Root\n  - A\n    - A1\n  - B\n');
  expect(document.activeElement).toBe(thing(el, 'A'));
  // In the words: the thing moves and the words stay open on it.
  await tap(el, thing(el, 'B'));
  await key(el, 'ArrowUp', { altKey: true });
  expect(last()).toContain('- Root\n  - B\n  - A\n');
  expect(isOpen(el)).toBe(true);
  expect(line(el).tx.textContent).toBe('B');
  action(el, 'Move down').click();
  await settle(el);
  expect(last()).toContain('- Root\n  - A\n    - A1\n  - B\n');
  expect(isOpen(el)).toBe(true);
});

test('§1 Tab/Shift+Tab in a tree: a thing with its children in under the thing before it and out to its grandparent; in its words they stay open on it; undo is one step', async () => {
  const { el, last } = await editor('---\nkind: mind\n---\n- Root\n  - A\n    - A1\n      - A1a\n    - A2\n  - B\n');
  // In the words of a child: Shift+Tab brings it out under its grandparent, its child with it, the words still open on it.
  await tap(el, thing(el, 'A1'));
  await type(el, 'x');
  line(el).sel = { anchor: { block: 0, offset: 1 }, focus: { block: 0, offset: 1 } };
  const e = await key(el, 'Tab', { shiftKey: true });
  expect((e as KeyboardEvent).defaultPrevented).toBe(true);
  expect(last()).toContain('- Root\n  - A\n    - A2\n  - x\n    - A1a\n  - B\n');
  expect(isOpen(el)).toBe(true);
  expect(held(el)).toBe('x');
  expect(line(el).sel?.focus.offset).toBe(1);
  expect(el.querySelector('.dg-pic g.dg-thing.on')?.getAttribute('aria-label')).toBe('x');
  // Tab takes it back in, under the thing before it (A), as its last child.
  await key(el, 'Tab');
  expect(last()).toContain('- Root\n  - A\n    - A2\n    - x\n      - A1a\n  - B\n');
  expect(isOpen(el)).toBe(true);
  // Undo: one step back for the indent, one for the bringing out.
  await undo(el);
  expect(last()).toContain('- Root\n  - A\n    - A2\n  - x\n    - A1a\n  - B\n');
  await undo(el);
  expect(last()).toContain('- Root\n  - A\n    - x\n      - A1a\n    - A2\n  - B\n');
  // On a focused thing: Tab puts B under A; the focus stays on B.
  await press(el, thing(el, 'B'), 'Tab');
  expect(last()).toContain('    - A2\n    - B\n');
  expect(document.activeElement).toBe(thing(el, 'B'));
  await press(el, thing(el, 'B'), 'Tab', { shiftKey: true });
  expect(last()).toContain('    - A2\n  - B\n');
  // Where it cannot go (a root's child out, a first child in) Tab is not taken: the focus moves on.
  expect((await press(el, thing(el, 'B'), 'Tab', { shiftKey: true })).defaultPrevented).toBe(false);
  expect((await press(el, thing(el, 'A'), 'Tab')).defaultPrevented).toBe(false);
});

test('§5 a tree thing\'s bar has Indent and Bring out after its own items, disabled where the move cannot be; another kind has neither', async () => {
  const { el, last } = await editor('---\nkind: org\n---\n- Ada\n  - Ben\n    - Cy\n  - Eve\n');
  const labels = () => [...ctx(el).querySelectorAll('button, .to-context-sep')].map((b) => (b.classList.contains('to-context-sep') ? '|' : b.getAttribute('aria-label')));
  await tap(el, thing(el, 'Ben'));
  expect(labels()).toEqual(['Move up', 'Move down', 'Add under it', 'Icon', 'Join', 'Indent', 'Bring out', 'Duplicate', '|', 'Copy', 'Cut', 'Paste', '|', 'Delete']);
  expect(action(el, 'Indent').disabled).toBe(true);
  expect(action(el, 'Bring out').disabled).toBe(true);
  await tap(el, thing(el, 'Cy')); // the first tap closes Ben's words
  await tap(el, thing(el, 'Cy'));
  expect(action(el, 'Indent').disabled).toBe(true);
  expect(action(el, 'Bring out').disabled).toBe(false);
  action(el, 'Bring out').click();
  await settle(el);
  expect(last()).toContain('- Ada\n  - Ben\n  - Cy\n  - Eve\n');
  expect(isOpen(el)).toBe(true);
  expect(action(el, 'Indent').disabled).toBe(false);
  expect(action(el, 'Bring out').disabled).toBe(true);
  action(el, 'Indent').click();
  await settle(el);
  expect(last()).toContain('- Ada\n  - Ben\n    - Cy\n  - Eve\n');
  const net = await editor(NET);
  await tap(net.el, thing(net.el, 'API'));
  expect(action(net.el, 'Indent')).toBeUndefined();
  expect(action(net.el, 'Bring out')).toBeUndefined();
});

test('§1 Mod+Alt+Left/Right: a step into the next lane', async () => {
  const { el, last } = await editor('---\nkind: lanes\n---\n- Sales: Calls\n- Shop: Sells\n');
  await press(el, thing(el, 'Calls'), 'ArrowRight', { altKey: true, ctrlKey: true });
  expect(last()).toBe('---\nkind: lanes\n---\n- Shop: Calls\n- Shop: Sells\n');
});

test('§1 Mod+D: a copy of the focused thing right after it, the focus on the copy; in the words too', async () => {
  const { el, last } = await editor('---\nkind: timeline\n---\n- 1990: Web\n- 2000: Phones\n');
  const e = await press(el, thing(el, '1990'), 'd', { ctrlKey: true });
  expect(e.defaultPrevented).toBe(true);
  expect(last()).toBe('---\nkind: timeline\n---\n- 1990: Web\n- 1990: Web\n- 2000: Phones\n');
  expect(document.activeElement!.getAttribute('aria-label')).toContain('Web');
  expect(document.activeElement).not.toBe(thing(el, '1990'));
  await tap(el, thing(el, '2000'));
  await key(el, 'd', { ctrlKey: true });
  expect(last()).toContain('- 2000: Phones\n- 2000: Phones\n');
});

test('§1 Mod+B/I/U/K and §2 the bubble: the words are plain, no bubble, the marks\' keys do nothing', async () => {
  const { el, last } = await editor(ORG);
  await tap(el, thing(el, 'Ben Okoro'));
  expect(line(el).noBubble).toBe(true);
  for (const k of ['b', 'i', 'u', 'k']) expect((await key(el, k, { ctrlKey: true }))!.defaultPrevented).toBe(true);
  expect(last()).toBe(ORG);
  expect(document.querySelector('.tx-bubble .to-context:popover-open')).toBeNull();
});

test('§1 Mod+Enter in the words: done, the words kept, the focus on the thing (never the next thing)', async () => {
  const { el, last } = await editor(ORG);
  await tap(el, thing(el, 'Eve Marsh'));
  await type(el, 'Eve');
  const e = await key(el, 'Enter', { ctrlKey: true });
  expect(e!.defaultPrevented).toBe(true);
  expect(isOpen(el)).toBe(false);
  expect(last()).toContain('  - Eve\n');
  expect(things(el)).toHaveLength(4);
  expect(document.activeElement).toBe(thing(el, 'Eve'));
});

test('§5 Mod+wheel zooms the picture; the wheel alone does not', async () => {
  const { el } = await editor(ORG);
  const wrap = el.querySelector<HTMLElement>('.dg-wrap')!;
  const pic = el.querySelector<SVGSVGElement>('.dg-pic')!;
  const w = pic.getBoundingClientRect().width;
  wrap.dispatchEvent(new WheelEvent('wheel', { deltaY: 100, bubbles: true, cancelable: true }));
  await settle(el);
  expect(pic.getBoundingClientRect().width).toBe(w);
  const e = new WheelEvent('wheel', { deltaY: -100, ctrlKey: true, bubbles: true, cancelable: true });
  wrap.dispatchEvent(e);
  await settle(el);
  expect(e.defaultPrevented).toBe(true);
  expect(pic.getBoundingClientRect().width).toBeGreaterThan(w);
  // One finger pans the frame; two are the picture's own zoom (kit/pinch.ts), never the browser's.
  expect(getComputedStyle(pic).touchAction).toBe('pan-x pan-y');
  expect(wrap.hasAttribute('data-spatial')).toBe(true);
});

/** Whether the line editor holds the focus right now, in the very handler that opened it (iOS raises its keyboard only so). */
const focusedNow = (el: HTMLElement) => isOpen(el) && document.activeElement === line(el).tx;
/** A click dispatched, and the focus read before anything else runs. */
function tapNow(target: Element, at: { clientX: number; clientY: number } = center(target)): void {
  target.dispatchEvent(new MouseEvent('click', { ...at, bubbles: true, composed: true }));
}
const SAMPLES: Record<string, string> = {
  mind: '---\nkind: mind\n---\n- Root\n  - A\n',
  org: ORG,
  family: '---\nkind: family\n---\n- Ada + Charles | 1815\n  - Byron\n',
  lanes: '---\nkind: lanes\n---\n- Sales: Calls\n- Shop: Sells\n',
  timeline: '---\nkind: timeline\n---\n- 1990: Began\n- 2000: Grew\n',
  venn: '---\nkind: venn\n---\n- Fast: cars\n- Cheap: bikes\n',
  seating: '---\nkind: seating\n---\n- Top table: Jo, Sam\n',
  net: NET,
};

test('a new thing starts with its words in hand, on every kind: a tap on empty space, Insert, Enter and the Add item focus them at once', async () => {
  for (const [kind, doc] of Object.entries(SAMPLES)) {
    const { el, last } = await editor(doc);
    // A tap on empty space (in a lane: beside its name; in a Venn: outside the circles still makes a thing).
    const pic = el.querySelector<SVGSVGElement>('.dg-pic')!;
    const r = pic.getBoundingClientRect();
    const shop = kind === 'lanes' ? thing(el, 'Shop').getBoundingClientRect() : null;
    const at = shop ? { clientX: shop.right + 5, clientY: shop.top + shop.height / 2 } : { clientX: r.left + 6, clientY: r.bottom - 6 };
    tapNow(pic, at);
    expect(focusedNow(el), `${kind}: a tap`).toBe(true);
    await settle(el);
    await type(el, 'Q');
    expect(last(), `${kind}: typed`).toContain('Q');
    await key(el, 'Escape');
    await key(el, 'Escape');
    await settle(el);
    // Insert ▾ and its one item.
    el.querySelector<HTMLButtonElement>('to-insert button')!.click();
    await until(() => !!document.querySelector('[popover]:popover-open [role^=menuitem]'));
    document.querySelector<HTMLElement>('[popover]:popover-open [role^=menuitem]')!.click();
    expect(focusedNow(el), `${kind}: Insert`).toBe(true);
    await settle(el);
    expect(focusedNow(el), `${kind}: Insert, drawn`).toBe(true);
    // The first Escape lets go of words chosen (a table's offered name), the next closes them.
    await key(el, 'Escape');
    if (isOpen(el)) await key(el, 'Escape');
    expect(isOpen(el)).toBe(false);
    // A thing's words, then Enter: the next one, focused.
    const first = things(el).find((g) => !g.classList.contains('edge'))!;
    tapNow(first);
    expect(focusedNow(el), `${kind}: a tap on a thing`).toBe(true);
    await settle(el);
    input(line(el), 'insertParagraph');
    expect(focusedNow(el), `${kind}: Enter`).toBe(true);
    await settle(el);
    expect(focusedNow(el), `${kind}: Enter, drawn`).toBe(true);
    await key(el, 'Escape');
    if (isOpen(el)) await key(el, 'Escape');
    // The Add item under a thing's words: one under it, one more, one after it.
    tapNow(things(el).find((g) => !g.classList.contains('edge'))!);
    await settle(el);
    const add = [...ctx(el).querySelectorAll<HTMLButtonElement>('button')].find((b) => /^Add /.test(b.getAttribute('aria-label') ?? ''));
    if (add) {
      add.click();
      expect(focusedNow(el), `${kind}: ${add.getAttribute('aria-label')}`).toBe(true);
      await settle(el);
    }
    await key(el, 'Escape');
    if (isOpen(el)) await key(el, 'Escape');
  }
});

test('Enter and the Add items open the next thing focused, its words offered and chosen; a table is offered by name, chosen whole so typing replaces it', async () => {
  const { el, last } = await editor(ORG);
  tapNow(thing(el, 'Eve Marsh'));
  await settle(el);
  input(line(el), 'insertParagraph');
  expect(focusedNow(el)).toBe(true);
  await settle(el);
  expect(held(el)).toBe('Name');
  expect(line(el).sel).toEqual({ anchor: { block: 0, offset: 0 }, focus: { block: 0, offset: 4 } });
  await key(el, 'Escape');
  await key(el, 'Escape');
  tapNow(thing(el, 'Ada Diaz'));
  await settle(el);
  action(el, 'Add under it').click();
  expect(focusedNow(el)).toBe(true);
  await settle(el);
  expect(line(el).placeholder).toBe('Name');
  await type(el, 'Gus');
  expect(last()).toContain('  - Eve Marsh | Design\n  - Gus\n');
  await key(el, 'Escape');
  // Seating: a new table's name is chosen whole: the first letter typed replaces it, the ": " stays.
  const seats = await editor(SAMPLES.seating);
  const pic = seats.el.querySelector<SVGSVGElement>('.dg-pic')!;
  const r = pic.getBoundingClientRect();
  tapNow(pic, { clientX: r.left + 6, clientY: r.bottom - 6 });
  expect(focusedNow(seats.el)).toBe(true);
  await settle(seats.el);
  expect(held(seats.el)).toBe('Table 2');
  expect(line(seats.el).sel).toEqual({ anchor: { block: 0, offset: 0 }, focus: { block: 0, offset: 7 } });
  await type(seats.el, 'Head');
  // (The ": " after a table's name waits for its guests, and the link keeps its space: "\ ".)
  expect(seats.last()).toBe('---\nkind: seating\n---\n- Top table: Jo, Sam\n- Head:\\ \n');
});

test('Join in the bar: with a thing open or focused it arms joining from it, the next tap makes the connection; Escape or a second press disarms; with nothing in hand the next two tapped are joined', async () => {
  const { el, last } = await editor(NET);
  const join = () => el.querySelector<HTMLButtonElement>('to-bar button[aria-label="Join"]')!;
  expect(join()).not.toBeNull();
  expect(join().getAttribute('aria-pressed')).toBe('false');
  // From a thing open: the words close, the bar's Join is pressed, a tap on another joins them.
  await tap(el, thing(el, 'Web'));
  join().click();
  await settle(el);
  expect(isOpen(el)).toBe(false);
  expect(join().getAttribute('aria-pressed')).toBe('true');
  expect(el.querySelector('.dg-wrap')!.classList.contains('joining')).toBe(true);
  expect(el.querySelector('.dg-hint')!.textContent).toContain('join Web to');
  await tap(el, thing(el, 'API'));
  expect(last()).toContain('~ Web -> API');
  expect(join().getAttribute('aria-pressed')).toBe('false');
  // From a thing focused (chosen by the keys): Escape disarms, nothing joined.
  thing(el, 'Database').focus();
  join().click();
  await settle(el);
  expect(el.querySelector('.dg-hint')!.textContent).toContain('join Database to');
  const n = last();
  document.activeElement!.dispatchEvent(new KeyboardEvent('keydown', { key: 'Escape', bubbles: true, cancelable: true }));
  await settle(el);
  expect(join().getAttribute('aria-pressed')).toBe('false');
  await tap(el, thing(el, 'Web'));
  expect(last()).toBe(n);
  await key(el, 'Escape');
  // Pressed twice: off again.
  join().click();
  await settle(el);
  join().click();
  await settle(el);
  expect(join().getAttribute('aria-pressed')).toBe('false');
  // With nothing in hand: the first tap takes one end, the second the other.
  (document.activeElement as HTMLElement | null)?.blur();
  join().click();
  await settle(el);
  expect(el.querySelector('.dg-hint')!.textContent).toContain('Tap the first thing to join');
  await tap(el, thing(el, 'Database'));
  expect(el.querySelector('.dg-hint')!.textContent).toContain('join Database to');
  await tap(el, thing(el, 'Web'));
  expect(last()).toContain('~ Database -> Web');
  // The old way stays: the thing's own Join, then a tap.
  await tap(el, thing(el, 'API'));
  action(el, 'Join').click();
  await settle(el);
  await tap(el, thing(el, 'Database'));
  expect(last()).toContain('~ API -> Database');
  // Every tree has it too (an org chart's or a family's dotted line, a mind map's cross-link); a timeline does not.
  for (const k of ['org', 'family', 'mind']) expect((await editor(SAMPLES[k])).el.querySelector('to-bar button[aria-label="Join"]')).not.toBeNull();
  expect((await editor(SAMPLES.timeline)).el.querySelector('to-bar button[aria-label="Join"]')).toBeNull();
});

test('a mind map joins: Join from an idea, a tap on another across the tree makes a cross-link, drawn as a dashed curve; its tap opens its words, its kind of line and Delete; Escape disarms', async () => {
  const { el, last } = await editor('---\nkind: mind\n---\n- Launch\n  - Product\n    - Pricing\n  - Marketing\n    - Press\n');
  const join = () => el.querySelector<HTMLButtonElement>('to-bar button[aria-label="Join"]')!;
  // The idea's own row has Join; Escape on the picture disarms it, nothing joined.
  await tap(el, thing(el, 'Pricing'));
  action(el, 'Join').click();
  await settle(el);
  expect(join().getAttribute('aria-pressed')).toBe('true');
  expect(el.querySelector('.dg-hint')!.textContent).toContain('join Pricing to');
  const before = last();
  document.activeElement!.dispatchEvent(new KeyboardEvent('keydown', { key: 'Escape', bubbles: true, cancelable: true }));
  await settle(el);
  expect(join().getAttribute('aria-pressed')).toBe('false');
  expect(last()).toBe(before);
  // Armed again, then the other idea: one edge block, a dashed curve on the picture.
  await tap(el, thing(el, 'Pricing'));
  action(el, 'Join').click();
  await settle(el);
  await tap(el, thing(el, 'Press'));
  expect(last()).toBe('---\nkind: mind\n---\n- Launch\n  - Product\n    - Pricing\n  - Marketing\n    - Press\n\n~ Pricing -- Press\n');
  const edge = el.querySelector<SVGGElement>('.dg-pic g.dg-thing.edge')!;
  const curve = edge.querySelector('polyline[stroke-dasharray]')!;
  expect(curve).not.toBeNull();
  expect(edge.getAttribute('aria-label')).toBe('a connection');
  // Its tap: its words open, typed in; its row has the kind of line and Delete.
  const pts = curve.getAttribute('points')!.split(' ').map((p) => p.split(',').map(Number));
  const [mx, my] = pts[Math.floor(pts.length / 2)];
  const m = (curve as SVGGraphicsElement).getScreenCTM()!;
  const at = new DOMPoint(mx, my).matrixTransform(m);
  await tap(el, edge, { clientX: at.x, clientY: at.y });
  expect(isOpen(el)).toBe(true);
  await type(el, 'feeds');
  expect(last()).toContain('~ Pricing -- Press: feeds');
  action(el, 'Make it an arrow').click();
  await settle(el);
  expect(last()).toContain('~ Pricing -> Press: feeds');
  expect(el.querySelectorAll('.dg-pic polygon').length).toBe(1);
  // Enter keeps the words; the words drawn beside the curve open it again.
  await key(el, 'Enter');
  expect(isOpen(el)).toBe(false);
  expect(last()).toContain('~ Pricing -> Press: feeds');
  const words = things(el).find((g) => g.getAttribute('aria-label') === 'feeds')!;
  expect(words.getAttribute('tabindex')).toBe('-1');
  await tap(el, words);
  expect(isOpen(el)).toBe(true);
  action(el, 'Delete').click();
  await settle(el);
  expect(last()).not.toContain('~ ');
});

/* ---------- the words typed where they are drawn ---------- */

test('every kind: a tap lays the words over the thing (drawn blank meanwhile), and the thing is drawn again with what was typed', async () => {
  for (const [kind, doc] of Object.entries(SAMPLES)) {
    const { el, last } = await editor(doc);
    const g = things(el).find((x) => !x.classList.contains('edge'))!;
    const label = g.getAttribute('aria-label')!;
    expect(g.querySelectorAll('text').length, `${kind}: drawn`).toBeGreaterThan(0);
    await tap(el, g);
    expect(isOpen(el), kind).toBe(true);
    const at = el.querySelector<SVGGElement>(`.dg-pic g[data-i="${g.dataset.i}"]`)!;
    expect(at.querySelectorAll('text').length, `${kind}: blank while typed on`).toBe(0);
    const [w, b] = [line(el).getBoundingClientRect(), at.getBoundingClientRect()];
    const [cx, cy] = [w.left + w.width / 2, w.top + w.height / 2];
    expect(cx > b.left - 4 && cx < b.right + 4 && cy > b.top - 4 && cy < b.bottom + 4, `${kind}: over ${label}`).toBe(true);
    // The things to do to it sit under the words.
    expect(ctx(el).matches(':popover-open'), kind).toBe(true);
    await type(el, 'Zz');
    expect(last(), kind).toContain('Zz');
    await key(el, 'Enter', { ctrlKey: true });
    expect(isOpen(el), kind).toBe(false);
    expect(things(el).some((x) => x.getAttribute('aria-label')!.includes('Zz') && x.querySelector('text')), kind).toBe(true);
  }
});

test('a timeline: the date is the first line and what happened the second; Shift+Enter writes the ": " between them', async () => {
  const { el, last } = await editor(SAMPLES.timeline);
  await tap(el, thing(el, '1990'));
  expect(held(el)).toBe('1990\nBegan');
  await type(el, '1991');
  expect(last()).toContain('- 1991\n');
  input(line(el), 'insertLineBreak');
  await settle(el);
  await type(el, 'Started');
  expect(last()).toBe('---\nkind: timeline\n---\n- 1991: Started\n- 2000: Grew\n');
});

test('a lane\'s name, a table\'s name and a set\'s name are typed on the picture too, and every line that names them follows', async () => {
  const lanes = await editor('---\nkind: lanes\n---\n- Sales: Calls\n- Shop: Sells\n- Shop: Packs\n');
  const name = things(lanes.el).find((g) => g.getAttribute('aria-label') === 'Shop')!;
  await tap(lanes.el, name);
  expect(held(lanes.el)).toBe('Shop');
  expect(line(lanes.el).classList.contains('left')).toBe(true);
  await type(lanes.el, 'Store');
  expect(lanes.last()).toBe('---\nkind: lanes\n---\n- Sales: Calls\n- Store: Sells\n- Store: Packs\n');

  const seats = await editor(SAMPLES.seating);
  await tap(seats.el, thing(seats.el, 'Top table'));
  expect(held(seats.el)).toBe('Top table');
  await type(seats.el, 'Head');
  expect(seats.last()).toBe('---\nkind: seating\n---\n- Head: Jo, Sam\n');

  const venn = await editor(SAMPLES.venn);
  await tap(venn.el, thing(venn.el, 'Fast'));
  await type(venn.el, 'Quick');
  expect(venn.last()).toBe('---\nkind: venn\n---\n- Quick: cars\n- Cheap: bikes\n');
});

test('an icon in front stays on the thing: the words after it are what is typed', async () => {
  const { el, last } = await editor('---\nkind: mind\n---\n- :rocket: Launch\n  - A\n');
  await tap(el, thing(el, 'Launch'));
  expect(held(el)).toBe('Launch');
  await type(el, 'Go');
  expect(last()).toBe('---\nkind: mind\n---\n- :rocket: Go\n  - A\n');
});

test('Tab out of the words keeps them and closes them', async () => {
  const { el, last } = await editor(SAMPLES.mind);
  await tap(el, thing(el, 'A'));
  await type(el, 'Bee');
  const out = document.createElement('button');
  document.body.append(out);
  out.focus();
  await settle(el);
  expect(isOpen(el)).toBe(false);
  expect(last()).toContain('  - Bee\n');
});

test('§1 opens with the focus on the picture, nothing being edited; the page not scrolled', async () => {
  const { el } = await editor(ORG);
  await el.focusFirst();
  expect(document.activeElement).toBe(el.querySelector('.dg-wrap'));
  expect(isOpen(el)).toBe(false);
  expect(document.scrollingElement!.scrollTop).toBe(0);
});

test('the separators are never typed: a comma ending a guest is the next guest, inside the words a comma; a colon, a bar in a name are plain', async () => {
  const { el, last } = await editor(SAMPLES.seating);
  await tap(el, thing(el, 'Sam'));
  await type(el, 'Smith,');
  // The comma at the end made the next guest, its words offered and chosen, as Enter does.
  expect(isOpen(el)).toBe(true);
  expect(held(el)).toBe('Guest');
  expect(last()).toBe('---\nkind: seating\n---\n- Top table: Jo, Smith, Guest\n');
  await type(el, 'Jones');
  await key(el, 'Enter', { ctrlKey: true });
  expect(last()).toBe('---\nkind: seating\n---\n- Top table: Jo, Smith, Jones\n');
  // Inside the words a comma is a comma: one guest, written escaped, drawn plain.
  await tap(el, thing(el, 'Smith'));
  await type(el, 'Smith Jr');
  line(el).sel = { anchor: { block: 0, offset: 5 }, focus: { block: 0, offset: 5 } };
  await type(el, ',');
  expect(held(el)).toBe('Smith, Jr');
  expect(last()).toBe('---\nkind: seating\n---\n- Top table: Jo, Smith\\\\, Jr, Jones\n');
  await key(el, 'Enter', { ctrlKey: true });
  expect(things(el).map((g) => g.getAttribute('aria-label'))).toEqual(['Top table', 'Jo', 'Smith, Jr', 'Jones']);
  // Opened again, the words are the plain ones.
  await tap(el, thing(el, 'Smith, Jr'));
  expect(held(el)).toBe('Smith, Jr');
  await key(el, 'Escape');
  await key(el, 'Escape');
  // A table's name with a colon in it stays the table's.
  await tap(el, thing(el, 'Top table'));
  await type(el, 'Sales: west');
  await key(el, 'Enter', { ctrlKey: true });
  expect(last()).toBe('---\nkind: seating\n---\n- Sales\\\\: west: Jo, Smith\\\\, Jr, Jones\n');
  expect(things(el).map((g) => g.getAttribute('aria-label'))).toEqual(['Sales: west', 'Jo', 'Smith, Jr', 'Jones']);

  // A role with a bar in it: the bar is the role's, the second line still Shift+Enter's.
  const org = await editor(ORG);
  await tap(org.el, thing(org.el, 'Eve Marsh'));
  await type(org.el, 'Eve Marsh');
  input(line(org.el), 'insertLineBreak');
  await settle(org.el);
  await type(org.el, 'Design | Brand');
  expect(org.last()).toContain('  - Eve Marsh | Design \\\\| Brand\n');
  expect(org.last()).toContain('~ Ben Okoro -- Eve Marsh: design partner');
});

test('a plus ending a family\'s name starts the partner\'s; inside the words it is a plus', async () => {
  const { el, last } = await editor('---\nkind: family\n---\n- Rose | m. 1948\n  - Helen\n');
  await tap(el, thing(el, 'Rose'));
  expect(held(el)).toBe('Rose\nm. 1948');
  line(el).sel = { anchor: { block: 0, offset: 4 }, focus: { block: 0, offset: 4 } };
  await type(el, '+');
  expect(held(el)).toBe('Rose + \nm. 1948');
  await type(el, 'Albert');
  expect(last()).toBe('---\nkind: family\n---\n- Rose + Albert | m. 1948\n  - Helen\n');
  await key(el, 'Enter', { ctrlKey: true });
  // Inside the name, a plus is a plus; at the end of the years too.
  await tap(el, thing(el, 'Helen'));
  line(el).sel = { anchor: { block: 0, offset: 1 }, focus: { block: 0, offset: 1 } };
  await type(el, '+');
  expect(held(el)).toBe('H+elen');
  expect(last()).toContain('  - H+elen\n');
});

test('at the normal size (a rem kit/zoom.ts BASE × 16px) the words sit on the thing on the screen, not a scale away from it', async () => {
  const { el } = await editor(ORG);
  expect(remScale()).toBe(BASE);
  const g = thing(el, 'Eve Marsh');
  await tap(el, g);
  expect(isOpen(el)).toBe(true);
  // The thing's own outline (its words drawn blank meanwhile), and the words laid over it: centred on it within 2px.
  const shape = el.querySelector<SVGGElement>(`.dg-pic g[data-i="${g.dataset.i}"]`)!.querySelector<SVGGraphicsElement>('rect, path, circle, ellipse, polygon')!;
  const [w, b] = [line(el).getBoundingClientRect(), shape.getBoundingClientRect()];
  expect(Math.abs(w.left + w.width / 2 - (b.left + b.width / 2))).toBeLessThan(2);
  expect(Math.abs(w.top + w.height / 2 - (b.top + b.height / 2))).toBeLessThan(2);
  expect(w.width).toBeLessThanOrEqual(b.width + 2);
});

test('a second finger is a pinch: the picture zooms about the fingers, and the drag the first finger began on a thing is let go', async () => {
  const { el, last } = await editor(ORG);
  const before = last();
  const pic = el.querySelector<SVGSVGElement>('.dg-pic')!;
  const w = pic.getBoundingClientRect().width;
  const eve = center(thing(el, 'Eve'));
  const fire = (type: string, id: number, x: number, y: number, on: Element = document.elementFromPoint(x, y) ?? pic) =>
    on.dispatchEvent(new PointerEvent(type, { pointerId: id, pointerType: 'touch', clientX: x, clientY: y, button: 0, buttons: type === 'pointerup' ? 0 : 1, bubbles: true, cancelable: true }));
  const [x, y] = [eve.clientX, eve.clientY];
  fire('pointerdown', 1, x, y);
  fire('pointermove', 1, x + 20, y);
  fire('pointerdown', 2, x + 60, y);
  fire('pointermove', 2, x + 120, y);
  await new Promise(requestAnimationFrame);
  await settle(el);
  fire('pointerup', 2, x + 120, y);
  fire('pointerup', 1, x + 20, y);
  pic.dispatchEvent(new MouseEvent('click', { clientX: x + 20, clientY: y, bubbles: true }));
  await settle(el);
  expect(pic.getBoundingClientRect().width).toBeGreaterThan(w * 1.4);
  expect(el.zoom % 0.25).toBe(0);
  expect(last()).toBe(before);
  expect(isOpen(el)).toBe(false);
  expect(el.querySelector('.dg-pic g.dragging')).toBeNull();
});
