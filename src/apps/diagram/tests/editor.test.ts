// The Diagram editor in a real browser: the picture from the document, a tap on a thing opens its words where they are
// drawn, a <to-text> laid over them (the thing drawn blank meanwhile, no box apart from the picture), and typing there is
// text ops on its line (a person's dotted lines follow a new name); Shift+Enter a second line; Enter makes the next; a
// tap on empty space makes a new thing there with its words offered and chosen, gone again on Escape; the buttons under
// the words add, join and take away; a drag puts one thing under another; the kind menu; undo; and at phone width the
// bar is one row, the page never wider, the words on the thing.
import { expect, test } from 'vitest';
import { page, userEvent } from 'vitest/browser';
import '../../../styles.css';
import '../editor.ts';
import type { ToDiagramEditor } from '../editor.ts';
import { withIcon } from '../model.ts';
import type { ToText } from '../../../kit/text/text.ts';
import { tick, until } from '../../../../test/browser/helpers.ts';
import { BASE, remScale } from '../../../kit/ui/zoom.ts';

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
/** The things of the picture, and connections: not a tree's lines to the ones above, its branches. */
const things = (el: HTMLElement) => [...el.querySelectorAll<SVGGElement>('.dg-pic g.dg-thing:not(.branch)')];
const thing = (el: HTMLElement, words: string) => things(el).find((g) => g.getAttribute('aria-label')!.startsWith(words))!;
const line = (el: HTMLElement) => el.querySelector<ToText>('to-text.dg-words')!;
const isOpen = (el: HTMLElement) => !line(el).hidden;
/** The words over the thing, as they hold them (a line break is "\n"). */
const held = (el: HTMLElement) =>
  line(el)
    .blocks.map((b) => ('runs' in b ? b.runs.map((r) => r.t).join('') : ''))
    .join('\n');
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

test('Enter on a thing there was is done with it; after a new one, Enter offers the next as a ghost, real if it is tapped next, else gone (Paul, 2026-10-18)', async () => {
  const { el, last } = await editor(ORG);
  const n = things(el).length;
  const ghost = () => el.querySelector<SVGGElement>('.dg-pic g.dg-thing.ghost');
  // A thing there was: Enter closes its words, nothing added, nothing offered.
  await tap(el, thing(el, 'Eve Marsh'));
  await key(el, 'Enter');
  expect(isOpen(el)).toBe(false);
  expect(last()).toBe(ORG);
  expect(ghost()).toBeNull();
  // A new one (Add below), its words typed, then Enter: the next offered as a ghost, drawn but not in the document.
  await tap(el, thing(el, 'Eve Marsh'));
  action(el, 'Add below').click();
  await settle(el);
  await type(el, 'Flo');
  await key(el, 'Enter');
  expect(isOpen(el)).toBe(false);
  expect(last()).toContain('  - Eve Marsh | Design\n    - Flo\n');
  expect(ghost()).not.toBeNull();
  expect(ghost()!.getAttribute('aria-label')).toBe('Name');
  expect(last().match(/- Name/)).toBeNull();
  // Tapped: real, its words open and chosen.
  await tap(el, ghost()!);
  expect(isOpen(el)).toBe(true);
  expect(held(el)).toBe('Name');
  expect(ghost()).toBeNull();
  await type(el, 'Gus');
  expect(last()).toContain('    - Flo\n    - Gus\n');
  // Enter again offers another; a tap anywhere else lets it go, the document as it was.
  await key(el, 'Enter');
  expect(ghost()).not.toBeNull();
  const kept = last();
  await tap(el, thing(el, 'Ada Diaz'));
  expect(ghost()).toBeNull();
  expect(last()).toBe(kept);
  await key(el, 'Escape');
  if (isOpen(el)) await key(el, 'Escape');
  const shown = await editor(ORG);
  expect(things(shown.el)).toHaveLength(n);
  // Empty space: a new thing, in the picture at once, its words over it; Escape takes it away.
  const pic = shown.el.querySelector<SVGSVGElement>('.dg-pic')!;
  const r = pic.getBoundingClientRect();
  await tap(shown.el, pic, { clientX: r.left + 6, clientY: r.bottom - 6 });
  expect(isOpen(shown.el)).toBe(true);
  expect(things(shown.el)).toHaveLength(n + 1);
  // The first Escape lets go of the words chosen, the next takes the new thing away.
  await key(shown.el, 'Escape');
  expect(isOpen(shown.el)).toBe(true);
  await key(shown.el, 'Escape');
  expect(isOpen(shown.el)).toBe(false);
  expect(shown.last()).toBe(ORG);
  expect(things(shown.el)).toHaveLength(n);
});

test('the buttons under the words: one under it, a picture, take it away', async () => {
  const { el, last } = await editor(ORG);
  await tap(el, thing(el, 'Eve Marsh'));
  action(el, 'Add below').click();
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
  expect(el.querySelector('.dg-hint')!.textContent).toContain('connect Web to');
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

test('a tap in the margin above the first lane, or beside the lanes, adds to the lane beside it, not to a lane of no name', async () => {
  const { el, last } = await editor('---\nkind: lanes\n---\n- Desk:\n- Lab:\n');
  const pic = el.querySelector<SVGSVGElement>('.dg-pic')!;
  const desk = thing(el, 'Desk').getBoundingClientRect();
  const r = pic.getBoundingClientRect();
  await tap(el, pic, { clientX: r.left + r.width / 2, clientY: r.top + 2 });
  expect(last()).toBe('---\nkind: lanes\n---\n- Desk:\n- Lab:\n- Desk: Step\n');
  await key(el, 'Escape');
  await tap(el, pic, { clientX: r.right - 2, clientY: desk.top + desk.height / 2 });
  expect(last()).toBe('---\nkind: lanes\n---\n- Desk:\n- Lab:\n- Desk: Step\n');
});

test('wide swimlanes scrolled across keep their lanes’ names at the left, over the steps, their words opening there', async () => {
  const steps = Array.from({ length: 12 }, (_, i) => `- ${i % 2 ? 'Lab' : 'Desk'}: Step ${i + 1}\n`).join('');
  const { el } = await editor(`---\nkind: lanes\n---\n${steps}`);
  const wrap = el.querySelector<HTMLElement>('.dg-wrap')!;
  expect(wrap.scrollWidth).toBeGreaterThan(wrap.clientWidth);
  const left = () => thing(el, 'Lab').getBoundingClientRect().left - wrap.getBoundingClientRect().left;
  const before = left();
  wrap.scrollLeft = wrap.scrollWidth;
  wrap.dispatchEvent(new Event('scroll'));
  await settle(el);
  expect(Math.abs(left() - before)).toBeLessThan(2);
  // Drawn after the steps, so over them.
  const all = [...el.querySelectorAll('.dg-pic g.dg-thing')];
  expect(all.indexOf(thing(el, 'Lab'))).toBeGreaterThan(all.indexOf(thing(el, 'Step 12')));
  await tap(el, thing(el, 'Lab'));
  const [w, n] = [line(el).getBoundingClientRect(), thing(el, 'Lab').getBoundingClientRect()];
  expect(Math.abs(w.left - n.left)).toBeLessThan(12);
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

test('a step dragged goes where it is let go: its lane and its place; a press that does not move is a tap; under the last lane is a new one (#28)', async () => {
  const { el, last } = await editor('---\nkind: lanes\n---\n- Asks\n- Answers\n- Thanks\n');
  const pic = el.querySelector<SVGSVGElement>('.dg-pic')!;
  // Dragged by the step itself (Paul, 2026-10-18: "Tap to edit, drag to move. The handles are redundant").
  const drag = async (from: Element, to: { clientX: number; clientY: number }) => {
    from.dispatchEvent(new PointerEvent('pointerdown', { ...center(from), button: 0, pointerId: 9, bubbles: true }));
    from.dispatchEvent(new PointerEvent('pointermove', { ...to, pointerId: 9, bubbles: true }));
    from.dispatchEvent(new PointerEvent('pointerup', { ...to, pointerId: 9, bubbles: true }));
    await settle(el);
  };
  const box = (words: string) => thing(el, words).getBoundingClientRect();
  // A press that does not move: nothing moves, and the tap after it opens the words.
  await drag(thing(el, 'Thanks'), center(thing(el, 'Thanks')));
  expect(last()).toBe('---\nkind: lanes\n---\n- Asks\n- Answers\n- Thanks\n');
  await tap(el, thing(el, 'Thanks'));
  expect(isOpen(el)).toBe(true);
  await key(el, 'Escape');
  if (isOpen(el)) await key(el, 'Escape');
  // To before the first step: first, the others where they were.
  await drag(thing(el, 'Thanks'), { clientX: box('Asks').left - 4, clientY: box('Asks').top + box('Asks').height / 2 });
  expect(last()).toBe('---\nkind: lanes\n---\n- Thanks\n- Asks\n- Answers\n');
  // Under the last lane, in its own column: a new lane, its place kept.
  const a = box('Asks');
  const to = { clientX: a.left + a.width / 2, clientY: a.bottom + a.height * 1.5 };
  expect(to.clientY).toBeLessThan(pic.getBoundingClientRect().bottom);
  await drag(thing(el, 'Asks'), to);
  expect(last()).toBe('---\nkind: lanes\n---\n- Lane 1: Thanks\n- Lane 2: Asks\n- Lane 1: Answers\n');

  // Four steps, the fourth into a new lane, then the second into another: that lane is made at the bottom, the second
  // in it, every other step where it was (Paul, 2026-10-18).
  const four = await editor('---\nkind: lanes\n---\n- One\n- Two\n- Three\n- Four\n');
  const at = (words: string) => thing(four.el, words).getBoundingClientRect();
  // In the step's column, level with the "+" of the band for a new lane.
  const under = (words: string) => {
    const plus = [...four.el.querySelectorAll('.dg-pic text')].find((x) => x.textContent === '+')!.getBoundingClientRect();
    return { clientX: at(words).left + at(words).width / 2, clientY: plus.top + plus.height / 2 };
  };
  const carry = async (words: string, to: { clientX: number; clientY: number }) => {
    const g = thing(four.el, words);
    g.dispatchEvent(new PointerEvent('pointerdown', { ...center(g), button: 0, pointerId: 8, bubbles: true }));
    g.dispatchEvent(new PointerEvent('pointermove', { ...to, pointerId: 8, bubbles: true }));
    g.dispatchEvent(new PointerEvent('pointerup', { ...to, pointerId: 8, bubbles: true }));
    await settle(four.el);
  };
  await carry('Four', under('Four'));
  await carry('Two', under('Two'));
  expect(four.last()).toContain('- Lane 1: One\n- Lane 3: Two\n- Lane 1: Three\n- Lane 2: Four\n');
  expect(at('One').top).toBe(at('Three').top);
  expect(at('Four').top).toBeGreaterThan(at('One').top);
  expect(at('Two').top).toBeGreaterThan(at('Four').top);
  expect(at('One').left < at('Two').left && at('Two').left < at('Three').left && at('Three').left < at('Four').left).toBe(true);

  // A tap in the band under the one lane: a step in a new lane, after the steps there are.
  const tapped = await editor('---\nkind: lanes\n---\n- Asks\n- Answers\n');
  const b = thing(tapped.el, 'Answers').getBoundingClientRect();
  await tap(tapped.el, tapped.el.querySelector('.dg-pic')!, { clientX: b.left + b.width / 2, clientY: b.bottom + b.height * 1.5 });
  expect(held(tapped.el)).toBe('Step');
  expect(tapped.last()).toBe('---\nkind: lanes\n---\n- Asks\n- Answers\n- Lane 2: Step\n');
});

test('swimlanes: Join branches from a step, its words a label; two steps with the same words are joined by their lanes too', async () => {
  const { el, last } = await editor('---\nkind: lanes\n---\n- Desk: Ready?\n- Desk: Ship it\n- Lab: Ship it\n');
  await tap(el, thing(el, 'Ready?'));
  action(el, 'Join').click();
  await settle(el);
  await tap(el, things(el).filter((g) => g.getAttribute('aria-label') === 'Ship it')[1]);
  expect(last()).toContain('~ Ready? -> Lab: Ship it');
  // Drawn at right angles, it opens to its words where it is tapped (the connection, drawn after the flow's lines:
  // Desk's "Ship it" still leads on to Lab's, a line into a step taking none away).
  const edge = [...el.querySelectorAll<SVGGElement>('.dg-pic g.dg-thing.edge')].at(-1)!;
  const lineOf = edge.querySelector('polyline, path')!;
  const r = lineOf.getBoundingClientRect();
  await tap(el, edge, { clientX: r.left + 2, clientY: r.top + 1 });
  expect(isOpen(el)).toBe(true);
  await type(el, 'No');
  expect(last()).toContain('~ Ready? -> Lab: Ship it: No');
});

test('an icon put on a thing whose words are open is drawn at once, beside them (Paul, 2026-10-18)', async () => {
  const { el, last } = await editor('---\nkind: lanes\n---\n- Sales: Calls\n- Shop: Sells\n');
  await tap(el, thing(el, 'Calls'));
  expect(isOpen(el)).toBe(true);
  const hit = { k: 'line', at: 0, part: 'words' } as const;
  el.change(withIcon(el.doc, hit, 'rocket'), hit);
  await settle(el);
  expect(last()).toContain('- Sales: :rocket: Calls');
  // Still open on it, and drawn on it: the icon's strokes, its words hidden under the open ones.
  expect(isOpen(el)).toBe(true);
  const g = thing(el, 'Calls');
  expect(g.classList.contains('on')).toBe(true);
  expect(g.querySelector('g[stroke-linecap="round"]')).not.toBeNull();
  expect(getComputedStyle(g.querySelector('text')!).visibility).toBe('hidden');
  // The words open sit where Draw sets them beside the icon: their middle right of the thing's.
  const [box, open] = [g.getBoundingClientRect(), line(el).getBoundingClientRect()];
  expect(open.left + open.width / 2).toBeGreaterThan(box.left + box.width / 2 + 5);
});

test('a swimlane step branches as a mind map’s idea does (Tab, Add a branch), and any thing that is a box takes a shape from its row (Paul, 2026-10-18)', async () => {
  const { el, last } = await editor('---\nkind: lanes\n---\n- Desk: Ready?\n- Desk: Ship it\n- Desk: Done\n');
  const labels = () => [...ctx(el).querySelectorAll('button')].map((b) => b.getAttribute('aria-label'));
  await tap(el, thing(el, 'Ship it'));
  expect(labels()).toEqual(expect.arrayContaining(['Add after', 'Add a branch', 'Icon', 'Shape', 'Join', 'Indent', 'Outdent']));
  // Tab: a branch of the step before it, in its lane; the flow goes from the question to it and on to Done.
  action(el, 'Indent').click();
  await settle(el);
  expect(last()).toContain('- Desk: Ready?\n  - Desk: Ship it\n- Desk: Done\n');
  await key(el, 'Escape');
  // Add a branch: another, beside it, in the question's lane.
  await tap(el, thing(el, 'Ready?'));
  if (!isOpen(el)) await tap(el, thing(el, 'Ready?')); // the first tap closes Ship it's words, still open
  action(el, 'Add a branch').click();
  await settle(el);
  await type(el, 'Wait');
  await key(el, 'Enter', { ctrlKey: true });
  expect(last()).toContain('- Desk: Ready?\n  - Desk: Ship it\n  - Desk: Wait\n- Desk: Done\n');
  // Shape: the row becomes the shapes, each drawn, side by side, the one it has pressed (Paul, 2026-10-18); one
  // chosen, the line carries it, the thing is drawn so, and the row is its things to do again.
  await tap(el, thing(el, 'Done'));
  if (!isOpen(el)) await tap(el, thing(el, 'Done'));
  action(el, 'Shape').click();
  await settle(el);
  expect(labels()).toEqual(['Back', 'Its usual shape', 'Rectangle', 'Rounded box', 'Ellipse', 'Diamond', 'Hexagon', 'Parallelogram', 'Cylinder', 'Note']);
  expect(action(el, 'Its usual shape').getAttribute('aria-pressed')).toBe('true');
  const tops = [...ctx(el).querySelectorAll('button')].map((b) => Math.round(b.getBoundingClientRect().top));
  expect(new Set(tops).size).toBe(1);
  expect([...ctx(el).querySelectorAll('button svg')]).toHaveLength(10);
  action(el, 'Cylinder').click();
  await settle(el);
  expect(last()).toContain('- Desk: Done {.cylinder}\n');
  expect(thing(el, 'Done').querySelector('path, ellipse')).not.toBeNull();
  expect(labels()).toContain('Shape');
  // Back, and the row is as it was, nothing changed.
  action(el, 'Shape').click();
  await settle(el);
  expect(action(el, 'Cylinder').getAttribute('aria-pressed')).toBe('true');
  action(el, 'Back').click();
  await settle(el);
  expect(labels()).toContain('Shape');
  expect(last()).toContain('- Desk: Done {.cylinder}\n');
});

test('a connection chosen has a halo, and its words open once, over where they are drawn (Paul, 2026-10-18)', async () => {
  for (const doc of ['---\nkind: lanes\n---\n- Desk: Ready?\n- Lab: Ship it\n\n~ Ready? -> Ship it: Yes\n', '---\nkind: mind\n---\n- Plan\n  - Ask\n  - Do\n\n~ Ask -> Do: then\n']) {
    const { el } = await editor(doc);
    const parts = () => [...el.querySelectorAll<SVGGElement>('.dg-pic g.dg-thing.edge:not(.branch)')];
    const words = parts().find((g) => g.querySelector('text'))!;
    const label = words.querySelector('text')!.textContent!;
    await tap(el, words);
    expect(isOpen(el)).toBe(true);
    expect(held(el)).toBe(label);
    // Every part of it is the thing open: its drawn words hidden under the open ones, its line in a band of the accent.
    expect(parts().every((g) => g.classList.contains('on'))).toBe(true);
    const shown = [...el.querySelectorAll('.dg-pic text')].filter((x) => x.textContent === label && getComputedStyle(x).visibility !== 'hidden');
    expect(shown).toEqual([]);
    const band = el.querySelector<SVGElement>('.dg-pic g.dg-thing.edge.on [stroke="transparent"]')!;
    expect(getComputedStyle(band).stroke).not.toBe('transparent');
    expect(Number(getComputedStyle(band).strokeOpacity)).toBeGreaterThan(0);
    // The open words sit over the drawn ones.
    const [w, at] = [line(el).getBoundingClientRect(), words.getBoundingClientRect()];
    expect(Math.abs(w.top + w.height / 2 - (at.top + at.height / 2))).toBeLessThan(12);
    await key(el, 'Escape');
    if (isOpen(el)) await key(el, 'Escape');
    expect(parts().some((g) => g.classList.contains('on'))).toBe(false);
  }
});

test('swimlanes wider than the column keep a readable size and scroll across; a narrow one fits (Paul, 2026-10-18)', async () => {
  const steps = Array.from({ length: 8 }, (_, i) => `- ${i % 2 ? 'Lab' : 'Desk'}: Step ${i + 1}`).join('\n');
  const wide = await editor(`---\nkind: lanes\n---\n${steps}\n`);
  const wrap = wide.el.querySelector<HTMLElement>('.dg-wrap')!;
  const pic = wide.el.querySelector<SVGSVGElement>('.dg-pic')!;
  const natural = Number(pic.getAttribute('viewBox')!.split(' ')[2]) * remScale();
  expect(pic.getBoundingClientRect().width).toBeGreaterThanOrEqual(natural * 0.6 - 1);
  expect(wrap.scrollWidth).toBeGreaterThan(wrap.clientWidth);
  // A step's words at that size: no smaller than 9 pixels.
  const text = thing(wide.el, 'Step 1').querySelector('text')!;
  expect(text.getBoundingClientRect().height).toBeGreaterThanOrEqual(9);
  const narrow = await editor('---\nkind: lanes\n---\n- Desk: One\n');
  const w2 = narrow.el.querySelector<HTMLElement>('.dg-wrap')!;
  expect(w2.scrollWidth).toBeLessThanOrEqual(w2.clientWidth + 1);
  // Other kinds fit the column as before.
  const mind = await editor(`---\nkind: mind\n---\n- Root\n${Array.from({ length: 6 }, (_, i) => `  - Idea ${i}\n    - More ${i}`).join('\n')}\n`);
  const w3 = mind.el.querySelector<HTMLElement>('.dg-wrap')!;
  expect(w3.scrollWidth).toBeLessThanOrEqual(w3.clientWidth + 1);
});

test('stacked, a step let go just before one of the steps side by side goes before that one, its sibling, in the lane let go in (Paul, 2026-10-18)', async () => {
  const { el, last } = await editor('---\nkind: lanes\n---\n- Desk: Ask?\n  - Lab: Yes\n  - Ops: No\n- Desk: Done\n');
  const box = (w: string) => thing(el, w).getBoundingClientRect();
  // Yes and No stand in one column.
  expect(Math.round(box('Yes').left)).toBe(Math.round(box('No').left));
  const g = thing(el, 'Done');
  const to = { clientX: box('No').left - 4, clientY: box('No').top + box('No').height / 2 };
  g.dispatchEvent(new PointerEvent('pointerdown', { ...center(g), button: 0, pointerId: 6, bubbles: true }));
  g.dispatchEvent(new PointerEvent('pointermove', { ...to, pointerId: 6, bubbles: true }));
  // The line that shows where sits in the gap before No, along No's lane.
  const slot = el.querySelector<SVGLineElement>('.dg-slot')!;
  expect(slot.hasAttribute('hidden')).toBe(false);
  const r = slot.getBoundingClientRect();
  expect(r.left).toBeLessThan(box('No').left);
  expect(r.top).toBeLessThanOrEqual(box('No').top);
  g.dispatchEvent(new PointerEvent('pointerup', { ...to, pointerId: 6, bubbles: true }));
  await settle(el);
  expect(last()).toBe('---\nkind: lanes\n---\n- Desk: Ask?\n  - Lab: Yes\n  - Ops: Done\n  - Ops: No\n');
});

test('a swimlane’s own line between two steps is tapped like a connection: words typed make it one, none leave it as it was (Paul, 2026-10-18)', async () => {
  const doc = '---\nkind: lanes\n---\n- Desk: Ready?\n- Lab: Ship it\n';
  const { el, last } = await editor(doc);
  const flow = () => el.querySelector<SVGGElement>('.dg-pic g.dg-thing.edge')!;
  const mid = () => {
    const p = flow().querySelector('polyline')!.getBoundingClientRect();
    return { clientX: p.left + 2, clientY: p.top + 1 };
  };
  // Tapped and left: no step made, the document as it was.
  await tap(el, flow(), mid());
  expect(isOpen(el)).toBe(true);
  expect(held(el)).toBe('');
  await tap(el, el.querySelector('.dg-pic')!, { clientX: 2, clientY: 2 });
  expect(isOpen(el)).toBe(false);
  expect(last()).toBe(doc);
  // Tapped and Escape: as it was.
  await tap(el, flow(), mid());
  await key(el, 'Escape');
  expect(last()).toBe(doc);
  // Tapped and given words: a connection, the line drawn once with them.
  await tap(el, flow(), mid());
  await type(el, 'Yes');
  expect(last()).toBe(doc + '\n~ Ready? -> Ship it: Yes\n');
  await key(el, 'Enter');
  expect(last()).toBe(doc + '\n~ Ready? -> Ship it: Yes\n');
  expect(el.querySelectorAll('.dg-pic polyline:not([stroke="transparent"])')).toHaveLength(1);
});

test('swimlanes: after a new step, Enter offers the next in its lane as a ghost; tapped, it is real', async () => {
  const { el, last } = await editor('---\nkind: lanes\n---\n- Desk: Ready?\n');
  await tap(el, thing(el, 'Ready?'));
  action(el, 'Add after').click();
  await settle(el);
  await type(el, 'Ship');
  await key(el, 'Enter');
  const ghost = el.querySelector<SVGGElement>('.dg-pic g.dg-thing.ghost')!;
  expect(ghost.getAttribute('aria-label')).toBe('Step');
  expect(last()).toBe('---\nkind: lanes\n---\n- Desk: Ready?\n- Desk: Ship\n');
  // In the lane, right of the step before it.
  const [g, s] = [ghost.getBoundingClientRect(), thing(el, 'Ship').getBoundingClientRect()];
  expect(Math.round(g.top)).toBe(Math.round(s.top));
  expect(g.left).toBeGreaterThan(s.right);
  await tap(el, ghost);
  await type(el, 'Done');
  expect(last()).toBe('---\nkind: lanes\n---\n- Desk: Ready?\n- Desk: Ship\n- Desk: Done\n');
});

test('a tree’s line to the one above, and a swimlane’s to a branch, is tapped for its words and its arrow, written as the Outliner writes them (Paul, 2026-10-18)', async () => {
  const { el, last } = await editor('---\nkind: mind\n---\n- Plan\n  - Ask\n');
  const line = () => el.querySelector<SVGGElement>('.dg-pic g.dg-thing.branch')!;
  const mid = (g: Element) => {
    const r = g.querySelector('line:not([stroke="transparent"])')!.getBoundingClientRect();
    return { clientX: r.left + r.width / 2, clientY: r.top + r.height / 2 };
  };
  await tap(el, line(), mid(line()));
  expect(isOpen(el)).toBe(true);
  await type(el, 'first');
  expect(last()).toBe('---\nkind: mind\n---\n- Plan\n  - Ask {label=first}\n');
  action(el, 'Arrow').click();
  await settle(el);
  expect(last()).toBe('---\nkind: mind\n---\n- Plan\n  - Ask {.from label=first}\n');
  await key(el, 'Enter');
  expect(line().querySelector('line[marker-end]')).not.toBeNull();
  // A swimlane's branch: its words on its line, the same way.
  const lanes = await editor('---\nkind: lanes\n---\n- Desk: Ready?\n  - Lab: Fix it\n');
  const branch = lanes.el.querySelector<SVGGElement>('.dg-pic g.dg-thing.branch')!;
  const p = branch.querySelector('polyline:not([stroke="transparent"])')!.getBoundingClientRect();
  await tap(lanes.el, branch, { clientX: p.left + 2, clientY: p.top + 1 });
  await type(lanes.el, 'No');
  expect(lanes.last()).toBe('---\nkind: lanes\n---\n- Desk: Ready?\n  - Lab: Fix it {label=No}\n');
});

test('a Venn: a tap where two circles cross adds to what they share; a seat dragged to another table moves there', async () => {
  const { el, last } = await editor('---\nkind: venn\n---\n- Fast: espresso\n- Cheap: walking\n');
  const pic = el.querySelector<SVGSVGElement>('.dg-pic')!;
  const [fast, cheap] = [thing(el, 'Fast'), thing(el, 'Cheap')].map((g) => g.getBoundingClientRect());
  const r = pic.getBoundingClientRect();
  // Between the two names, halfway down the circles: inside both.
  await tap(el, pic, { clientX: (fast.right + cheap.left) / 2, clientY: r.top + r.height / 2 });
  expect(held(el)).toBe('Item');
  expect(last()).toContain('- Fast & Cheap: Item\n');
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
  expect(labels).toEqual(['Move up', 'Move down', 'Add another', 'Icon', 'Duplicate', '|', 'Copy', 'Cut', 'Paste', '|', 'Delete']);
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

test("§5 a tree thing's bar has Indent and Bring out after its own items, disabled where the move cannot be; another kind has neither", async () => {
  const { el, last } = await editor('---\nkind: org\n---\n- Ada\n  - Ben\n    - Cy\n  - Eve\n');
  const labels = () => [...ctx(el).querySelectorAll('button, .to-context-sep')].map((b) => (b.classList.contains('to-context-sep') ? '|' : b.getAttribute('aria-label')));
  await tap(el, thing(el, 'Ben'));
  expect(labels()).toEqual(['Move up', 'Move down', 'Add below', 'Icon', 'Shape', 'Join', 'Indent', 'Outdent', 'Duplicate', '|', 'Copy', 'Cut', 'Paste', '|', 'Delete']);
  expect(action(el, 'Indent').disabled).toBe(true);
  expect(action(el, 'Outdent').disabled).toBe(true);
  await tap(el, thing(el, 'Cy')); // the first tap closes Ben's words
  await tap(el, thing(el, 'Cy'));
  expect(action(el, 'Indent').disabled).toBe(true);
  expect(action(el, 'Outdent').disabled).toBe(false);
  action(el, 'Outdent').click();
  await settle(el);
  expect(last()).toContain('- Ada\n  - Ben\n  - Cy\n  - Eve\n');
  expect(isOpen(el)).toBe(true);
  expect(action(el, 'Indent').disabled).toBe(false);
  expect(action(el, 'Outdent').disabled).toBe(true);
  action(el, 'Indent').click();
  await settle(el);
  expect(last()).toContain('- Ada\n  - Ben\n    - Cy\n  - Eve\n');
  const net = await editor(NET);
  await tap(net.el, thing(net.el, 'API'));
  expect(action(net.el, 'Indent')).toBeUndefined();
  expect(action(net.el, 'Outdent')).toBeUndefined();
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

test("§1 Mod+B/I/U/K and §2 the bubble: the words are plain, no bubble, the marks' keys do nothing", async () => {
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
  // One finger pans the frame; two are the picture's own zoom (kit/ui/pinch.ts), never the browser's.
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
    // A thing's words, then Enter: done with them, the focus on the thing.
    const first = kind === 'lanes' ? thing(el, 'Calls') : things(el).find((g) => !g.classList.contains('edge'))!;
    tapNow(first);
    expect(focusedNow(el), `${kind}: a tap on a thing`).toBe(true);
    await settle(el);
    input(line(el), 'insertParagraph');
    await settle(el);
    expect(isOpen(el), `${kind}: Enter is done`).toBe(false);
    expect(document.activeElement?.closest('g.dg-thing'), `${kind}: Enter, the focus on it`).not.toBeNull();
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

test('the words closed take the caret with them, so a Backspace on the picture never reaches what draws them (Safari; Paul, 2026-10-18)', async () => {
  const { el } = await editor('---\nkind: lanes\n---\n- Sales: Calls\n- Shop: Sells\n');
  await tap(el, thing(el, 'Calls'));
  expect(line(el).contains(getSelection()!.anchorNode)).toBe(true);
  await key(el, 'Enter');
  expect(isOpen(el)).toBe(false);
  expect(line(el).contains(getSelection()?.anchorNode ?? null)).toBe(false);
});

test('a letter typed on the ghost makes it real, and its words take the letter (Paul, 2026-10-18)', async () => {
  const { el, last } = await editor(ORG);
  tapNow(thing(el, 'Eve Marsh'));
  await settle(el);
  action(el, 'Add below').click();
  await settle(el);
  await type(el, 'Flo');
  input(line(el), 'insertParagraph');
  await settle(el);
  expect(document.activeElement).toBe(el.querySelector('.dg-pic g.dg-thing.ghost'));
  await userEvent.keyboard('Gus');
  await settle(el);
  expect(el.querySelector('.dg-pic g.dg-thing.ghost')).toBeNull();
  expect(held(el)).toBe('Gus');
  expect(last()).toContain('    - Flo\n    - Gus\n');
});

test('Enter and the Add items open the next thing focused, its words offered and chosen; a table is offered by name, chosen whole so typing replaces it', async () => {
  const { el, last } = await editor(ORG);
  // After a new thing, Enter offers the next as a ghost with the focus; Enter on it makes it real, focused, its words chosen.
  tapNow(thing(el, 'Eve Marsh'));
  await settle(el);
  action(el, 'Add below').click();
  await settle(el);
  await type(el, 'Flo');
  input(line(el), 'insertParagraph');
  await settle(el);
  const ghost = el.querySelector<SVGGElement>('.dg-pic g.dg-thing.ghost')!;
  expect(document.activeElement).toBe(ghost);
  await press(el, ghost, 'Enter');
  expect(focusedNow(el)).toBe(true);
  expect(held(el)).toBe('Name');
  expect(line(el).sel).toEqual({ anchor: { block: 0, offset: 0 }, focus: { block: 0, offset: 4 } });
  await key(el, 'Escape');
  await key(el, 'Escape');
  tapNow(thing(el, 'Ada Diaz'));
  await settle(el);
  action(el, 'Add below').click();
  expect(focusedNow(el)).toBe(true);
  await settle(el);
  expect(line(el).placeholder).toBe('Name');
  await type(el, 'Gus');
  expect(last()).toContain('  - Eve Marsh | Design\n    - Flo\n  - Gus\n');
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
  expect(el.querySelector('.dg-hint')!.textContent).toContain('connect Web to');
  await tap(el, thing(el, 'API'));
  expect(last()).toContain('~ Web -> API');
  expect(join().getAttribute('aria-pressed')).toBe('false');
  // From a thing focused (chosen by the keys): Escape disarms, nothing joined.
  thing(el, 'Database').focus();
  join().click();
  await settle(el);
  expect(el.querySelector('.dg-hint')!.textContent).toContain('connect Database to');
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
  expect(el.querySelector('.dg-hint')!.textContent).toContain('Tap the first item, then the other');
  await tap(el, thing(el, 'Database'));
  expect(el.querySelector('.dg-hint')!.textContent).toContain('connect Database to');
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
  expect(el.querySelector('.dg-hint')!.textContent).toContain('connect Pricing to');
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
  const edge = el.querySelector<SVGGElement>('.dg-pic g.dg-thing.edge:not(.branch)')!;
  const curve = edge.querySelector('polyline[stroke-dasharray]')!;
  expect(curve).not.toBeNull();
  expect(edge.getAttribute('aria-label')).toBe('a connection');
  // Its tap: its words open, typed in; its row has the kind of line and Delete.
  const pts = curve
    .getAttribute('points')!
    .split(' ')
    .map((p) => p.split(',').map(Number));
  const [mx, my] = pts[Math.floor(pts.length / 2)];
  const m = (curve as SVGGraphicsElement).getScreenCTM()!;
  const at = new DOMPoint(mx, my).matrixTransform(m);
  await tap(el, edge, { clientX: at.x, clientY: at.y });
  expect(isOpen(el)).toBe(true);
  await type(el, 'feeds');
  expect(last()).toContain('~ Pricing -- Press: feeds');
  action(el, 'Arrow').click();
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
    // (Its words hidden, not taken away: an icon on it stays drawn.)
    expect([...at.querySelectorAll('text')].filter((x) => getComputedStyle(x).visibility !== 'hidden').length, `${kind}: blank while typed on`).toBe(0);
    const [w, b] = [line(el).getBoundingClientRect(), at.getBoundingClientRect()];
    const [cx, cy] = [w.left + w.width / 2, w.top + w.height / 2];
    expect(cx > b.left - 4 && cx < b.right + 4 && cy > b.top - 4 && cy < b.bottom + 4, `${kind}: over ${label}`).toBe(true);
    // The things to do to it sit under the words.
    expect(ctx(el).matches(':popover-open'), kind).toBe(true);
    await type(el, 'Zz');
    expect(last(), kind).toContain('Zz');
    await key(el, 'Enter', { ctrlKey: true });
    expect(isOpen(el), kind).toBe(false);
    expect(
      things(el).some((x) => x.getAttribute('aria-label')!.includes('Zz') && x.querySelector('text')),
      kind,
    ).toBe(true);
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

test("a lane's name, a table's name and a set's name are typed on the picture too, and every line that names them follows", async () => {
  const lanes = await editor('---\nkind: lanes\n---\n- Sales: Calls\n- Shop: Sells\n- Shop: Packs\n');
  const name = things(lanes.el).find((g) => g.getAttribute('aria-label') === 'Shop')!;
  await tap(lanes.el, name);
  expect(held(lanes.el)).toBe('Shop');
  expect(line(lanes.el).classList.contains('left')).toBe(true);
  await type(lanes.el, 'Store');
  expect(lanes.last()).toBe('---\nkind: lanes\n---\n- Sales: Calls\n- Store: Sells\n- Store: Packs\n');
  // Enter is done with the name: no step comes of it (Paul, 2026-10-18).
  await key(lanes.el, 'Enter');
  expect(isOpen(lanes.el)).toBe(false);
  expect(lanes.last()).toBe('---\nkind: lanes\n---\n- Sales: Calls\n- Store: Sells\n- Store: Packs\n');
  // The lane with no name ("—") is named on its first step, and its steps all with it.
  const unnamed = await editor('---\nkind: lanes\n---\n- Asks\n- Answers\n');
  await tap(unnamed.el, thing(unnamed.el, '—'));
  await key(unnamed.el, 'Backspace');
  await type(unnamed.el, 'Desk');
  await key(unnamed.el, 'Enter');
  expect(unnamed.last()).toBe('---\nkind: lanes\n---\n- Desk: Asks\n- Answers\n');

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

test("a plus ending a family's name starts the partner's; inside the words it is a plus", async () => {
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

test('at the normal size (a rem kit/ui/zoom.ts BASE × 16px) the words sit on the thing on the screen, not a scale away from it', async () => {
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
