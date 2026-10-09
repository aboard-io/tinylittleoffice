// The Website editor in a real browser: the page drawn in its sandboxed frame, whose own scripts run and
// talk back; the words of the section in hand typed beside it as ops on the right blocks; a tap in the page
// picks a section, its "+" adds what the section can take, its handles move and remove parts (real clicks
// inside the frame); a stale or foreign message is ignored; the look and the shape from the menu; a shop's
// grid and settings; Insert; undo; and at phone width the bar one row, the page never wider than the screen.
import { expect, test } from 'vitest';
import { page } from 'vitest/browser';
import '../../../styles.css';
import '../../../kit/apps.ts';
import '../editor.ts';
import type { ToSiteEditor } from '../editor.ts';
import { templates } from '../templates.ts';
import type { ToText } from '../../../kit/text.ts';
import { tick, until } from '../../../../test/browser/helpers.ts';

const CAFE = templates().find((t) => t.id === 'cafe')!.doc;
const SHOP = templates().find((t) => t.id === 'shop')!.doc;

async function editor(value = CAFE) {
  document.body.innerHTML = '';
  const main = document.createElement('main');
  main.className = 'to-main';
  document.body.append(main);
  const el = document.createElement('to-site-editor') as ToSiteEditor;
  el.value = value;
  const changes: string[] = [];
  el.addEventListener('docchange', (e) => changes.push((e as CustomEvent<string>).detail));
  main.append(el);
  await el.updateComplete;
  return { el, changes, last: () => changes.at(-1) ?? '' };
}
const settle = async (el: ToSiteEditor) => {
  await el.updateComplete;
  await tick(20);
  await el.updateComplete;
};
const textOf = (el: HTMLElement) => el.querySelector<ToText>('to-text.site-text')!;
const shownWords = (el: HTMLElement) => [...textOf(el).tx.children].map((c) => c.textContent!.trim());
const part = (el: HTMLElement) => el.querySelector<HTMLSelectElement>('select.site-part')!;
const frame = (el: HTMLElement) => el.querySelector<HTMLIFrameElement>('iframe.site-frame')!;
/** The stamp the frame's page carries now. */
const stamp = (el: HTMLElement) => Number(/"stamp":(\d+)/.exec(frame(el).srcdoc)![1]);
/** A message as the frame would send it. */
const say = (el: HTMLElement, data: object, source: MessageEventSource | null = frame(el).contentWindow) => window.dispatchEvent(new MessageEvent('message', { data: { site: stamp(el), ...data }, source }));
const input = (x: ToText, inputType: string, data: string | null = null) => x.tx.dispatchEvent(new InputEvent('beforeinput', { inputType, data, bubbles: true, cancelable: true, composed: true }));
async function pick(el: ToSiteEditor, opener: HTMLElement, label: string) {
  opener.click();
  await until(() => !!document.querySelector('[popover]:popover-open'));
  const items = [...document.querySelectorAll<HTMLElement>('[popover]:popover-open [role^=menuitem]')];
  const item = items.find((x) => x.textContent!.trim() === label) ?? items.find((x) => x.textContent!.includes(label));
  if (!item) throw new Error(`no item ${label} among ${items.map((x) => x.textContent!.trim()).join(' | ')}`);
  item.click();
  await settle(el);
}
const inFrame = (el: HTMLElement) => page.frameLocator(page.elementLocator(frame(el)));

test('the page in its frame, its scripts running; the parts to edit; the home page’s words beside it', async () => {
  const { el } = await editor();
  expect(frame(el).getAttribute('sandbox')).toBe('allow-scripts allow-popups allow-popups-to-escape-sandbox');
  expect(frame(el).srcdoc).toContain('<h1>Harbor Coffee</h1>');
  // The frame's own script says it is there: the scripts run, sandboxed.
  const ready = new Promise<boolean>((done) => window.addEventListener('message', (e) => e.source === frame(el).contentWindow && (e.data as { do?: string }).do === 'ready' && done(true)));
  expect(await ready).toBe(true);
  expect([...part(el).options].map((o) => o.textContent!.trim())).toEqual(['Harbor Coffee', 'Menu', '— Coffee', '— Pastry', 'Find us']);
  expect(shownWords(el)).toEqual(['Harbor Coffee', 'Small-batch coffee, roasted on the quay every morning.', 'See the menu | #menuFind us | #find-us', 'Roasted daily | Never more than a week old', 'Fair trade | From farms we have visited', 'Delivered | By bike, on the day']);
});

test('typing in the section in hand is ops on its own blocks; undo takes it back', async () => {
  const { el, last } = await editor();
  part(el).value = '2';
  part(el).dispatchEvent(new Event('change'));
  await settle(el);
  expect(shownWords(el)).toEqual(['Coffee', 'Espresso | 3.00', 'Flat white | 4.20', 'Filter, by the cup | 3.50']);
  const x = textOf(el);
  x.sel = { anchor: { block: 1, offset: 8 }, focus: { block: 1, offset: 8 } };
  await tick();
  for (const ch of ' doppio') {
    input(x, 'insertText', ch);
    await settle(el);
  }
  expect(last()).toContain('- Espresso doppio | 3.00\n');
  expect(last()).toContain('## Coffee\n');
  // The page in the frame is drawn again once the typing settles.
  await until(() => frame(el).srcdoc.includes('Espresso doppio'));
  el.dispatchEvent(new CustomEvent('docundo', { cancelable: true }));
  await settle(el);
  expect(last()).toBe(CAFE);
});

test('the frame’s messages: a tap picks, "+" adds, handles move and remove; stale or foreign ones are ignored', async () => {
  const { el, last } = await editor();
  await tick(50);
  say(el, { do: 'pick', s: 3 });
  await settle(el);
  expect(part(el).value).toBe('3');
  expect(shownWords(el)[0]).toBe('Pastry');
  // A message from elsewhere, or from a drawing of the page that is gone, changes nothing.
  say(el, { do: 'pick', s: 1 }, window);
  window.dispatchEvent(new MessageEvent('message', { data: { site: stamp(el) - 1, do: 'pick', s: 1 }, source: frame(el).contentWindow }));
  await settle(el);
  expect(part(el).value).toBe('3');
  // "+" with a card: at the end of Coffee, its words selected to type over.
  say(el, { do: 'add', s: 2, kind: 'card' });
  await settle(el);
  await tick(30);
  expect(last()).toContain('- Filter, by the cup | 3.50\n- Heading | A line about it\n');
  expect(part(el).value).toBe('2');
  expect(textOf(el).sel).toEqual({ anchor: { block: 4, offset: 0 }, focus: { block: 4, offset: 25 } });
  // Find us moved earlier goes before Menu, and stays the part in hand.
  say(el, { do: 'pick', s: 4 });
  await settle(el);
  say(el, { do: 'up', s: 4 });
  await settle(el);
  expect(last().indexOf('# Find us')).toBeLessThan(last().indexOf('# Menu'));
  expect(part(el).selectedOptions[0].textContent!.trim()).toBe('Find us');
  // Pastry removed.
  say(el, { do: 'remove', s: 4 });
  await settle(el);
  expect(last()).not.toContain('## Pastry');
  // Undo and redo from the frame's keys.
  say(el, { do: 'undo' });
  await settle(el);
  expect(last()).toContain('## Pastry');
});

test('real taps inside the frame: the "+" chooser adds, the handles move', async () => {
  const { el, last } = await editor();
  const f = inFrame(el);
  await f.getByRole('heading', { name: 'Harbor Coffee', level: 1 }).click();
  await f.getByRole('button', { name: 'Add to Harbor Coffee' }).click();
  await f.getByRole('menuitem', { name: 'Button' }).click();
  await until(() => last().includes('> Label | https://'));
  expect(last()).toContain('- :bike: Delivered | By bike, on the day\n\n> Label | https://\n');
});

test('the look: a theme, light or dark, the type, and the shape, each a head field', async () => {
  const { el, last } = await editor();
  const look = el.querySelector<HTMLElement>('to-menu.site-look button')!;
  await pick(el, look, 'Forest');
  expect(last()).toMatch(/^---\ntheme: forest\n---\n/);
  await pick(el, look, 'Dark');
  expect(last()).toMatch(/^---\ntheme: forest dark\n---\n/);
  await pick(el, look, 'Monospace');
  expect(last()).toMatch(/^---\ntheme: forest mono dark\n---\n/);
  await pick(el, look, 'Quick links: one column');
  expect(last()).toContain('look: links');
  await settle(el);
  // A links page offers small links rather than cards and pages.
  const ins = el.querySelector<HTMLElement>('to-insert button')!;
  ins.click();
  await until(() => !!document.querySelector('[popover]:popover-open'));
  const items = [...document.querySelectorAll<HTMLElement>('[popover]:popover-open [role^=menuitem]')].map((x) => x.textContent!.trim());
  expect(items).toContain('Small link');
  expect(items).not.toContain('Page');
  document.body.click();
});

test('Insert puts a section after the one in hand, its heading selected; a shop’s grid types into cells, its settings into the head', async () => {
  const { el, last } = await editor(SHOP);
  await pick(el, el.querySelector<HTMLElement>('to-insert button')!, 'Section');
  await tick(30);
  expect(last()).toContain('> Classes | #classes\n\n## New section\n\n# Shop');
  expect(shownWords(el)[0]).toBe('New section');
  part(el).value = [...part(el).options].find((o) => o.textContent!.trim() === 'Shop')!.value;
  part(el).dispatchEvent(new Event('change'));
  await settle(el);
  const cell = el.querySelector<HTMLInputElement>('to-write-table input[data-r="0"][data-c="1"]')!;
  expect(cell.value).toContain('24');
  cell.focus();
  cell.value = '26';
  cell.dispatchEvent(new Event('input', { bubbles: true }));
  await settle(el);
  expect(last()).toContain('Harbour mug | 26 |');
  const orders = el.querySelector<HTMLInputElement>('.site-shop input[type=email]')!;
  orders.value = 'shop@quay.example';
  orders.dispatchEvent(new Event('change'));
  await settle(el);
  expect(last()).toContain('orders: shop@quay.example');
});

test('a phone: the bar one row, the page above the words, nothing wider than the screen', async () => {
  await page.viewport(390, 844);
  const { el } = await editor();
  await settle(el);
  const bar = el.querySelector<HTMLElement>('to-bar')!;
  expect(bar.getBoundingClientRect().height).toBeLessThanOrEqual(60);
  const f = frame(el).getBoundingClientRect();
  const panel = el.querySelector<HTMLElement>('.site-panel')!.getBoundingClientRect();
  expect(f.width).toBeLessThanOrEqual(390);
  expect(panel.top).toBeGreaterThanOrEqual(f.bottom);
  expect(document.documentElement.scrollWidth).toBeLessThanOrEqual(390);
  expect(Number.parseFloat(getComputedStyle(part(el)).fontSize)).toBeGreaterThanOrEqual(16);
  await page.viewport(1100, 800);
});

// ---- the editing standard (docs/editing.md): the section in hand, its bar and keys, undo, the words' keys ----

const key = (target: EventTarget, k: string, o: KeyboardEventInit = {}) => {
  const e = new KeyboardEvent('keydown', { key: k, bubbles: true, cancelable: true, composed: true, ...o });
  target.dispatchEvent(e);
  return e;
};
const box = (el: HTMLElement) => el.querySelector<HTMLElement>('.site-preview')!;
const ctxItems = (el: HTMLElement) => [...el.querySelectorAll<HTMLButtonElement>('to-context.site-context .to-context button')];
const ctxOpen = (el: HTMLElement) => !!el.querySelector('to-context.site-context .to-context:popover-open');
const ctxButton = (el: HTMLElement, label: string) => ctxItems(el).find((b) => b.getAttribute('aria-label') === label)!;
/** Section `s` tapped in the frame, where the frame says it is. */
async function hold(el: ToSiteEditor, s: number) {
  await tick(30);
  say(el, { do: 'pick', s, r: [0, 40, 600, 300] });
  await settle(el);
}
const clip = (el: HTMLElement, type: 'copy' | 'cut' | 'paste', data?: { text: string; html: string }) => {
  const dt = new DataTransfer();
  if (data) dt.setData('text/plain', data.text), dt.setData('text/html', data.html);
  box(el).dispatchEvent(new ClipboardEvent(type, { clipboardData: dt, bubbles: true, cancelable: true }));
  return dt;
};

test('a tap in the frame takes the section in hand: the focus on the box, the bar under it in §8’s order; Escape lets go to the frame', async () => {
  const { el } = await editor();
  await hold(el, 2);
  expect(document.activeElement).toBe(box(el));
  expect(part(el).value).toBe('2');
  await until(() => ctxOpen(el));
  expect(ctxItems(el).map((b) => b.getAttribute('aria-label'))).toEqual(['Edit', 'Move up', 'Move down', 'Duplicate', 'Delete']);
  // Coffee is the first section of its page: it cannot go up; the bar's buttons never take the focus.
  expect(ctxButton(el, 'Move up').disabled).toBe(true);
  const down = new MouseEvent('mousedown', { bubbles: true, cancelable: true });
  ctxButton(el, 'Move down').dispatchEvent(down);
  expect(down.defaultPrevented).toBe(true);
  // The bar hangs under the section as the frame says it is.
  const bar = el.querySelector<HTMLElement>('to-context.site-context .to-context')!.getBoundingClientRect();
  const f = frame(el).getBoundingClientRect();
  expect(bar.top).toBeGreaterThanOrEqual(f.top + 340 - 1);
  // The frame says the section scrolled: the bar follows.
  say(el, { do: 'at', s: 2, r: [0, 10, 600, 200] });
  await tick(40);
  expect(el.querySelector<HTMLElement>('to-context.site-context .to-context')!.getBoundingClientRect().top).toBeLessThan(bar.top);
  // Escape: the section let go, the bar gone, the focus back on the frame.
  expect(key(box(el), 'Escape').defaultPrevented).toBe(true);
  await settle(el);
  expect(ctxOpen(el)).toBe(false);
  expect(document.activeElement).toBe(frame(el));
  // The home page has nothing to move, duplicate or delete; Edit is there.
  await hold(el, 0);
  await until(() => ctxOpen(el));
  expect(ctxItems(el).filter((b) => b.disabled).map((b) => b.getAttribute('aria-label'))).toEqual(['Move up', 'Move down', 'Duplicate', 'Delete']);
  // The focus gone elsewhere (the panel's picker) lets it go; the app's own bar does not.
  el.querySelector<HTMLButtonElement>('to-bar button[aria-label="Bold"]')!.focus();
  await settle(el);
  expect(ctxOpen(el)).toBe(true);
  part(el).focus();
  await settle(el);
  expect(ctxOpen(el)).toBe(false);
});

test('the section in hand by key: Alt+Down moves it, Mod+D duplicates it, Delete removes it, Up/Down take the next; undo puts each back in hand', async () => {
  const { el, last } = await editor();
  await hold(el, 2);
  // Alt+Down: Coffee past Pastry, still in hand.
  expect(key(box(el), 'ArrowDown', { altKey: true }).defaultPrevented).toBe(true);
  await settle(el);
  expect(last().indexOf('## Pastry')).toBeLessThan(last().indexOf('## Coffee'));
  expect(part(el).selectedOptions[0].textContent!.trim()).toBe('— Coffee');
  expect(document.activeElement).toBe(box(el));
  // Undo: Coffee back first, and in hand.
  el.dispatchEvent(new CustomEvent('docundo', { cancelable: true }));
  await settle(el);
  expect(last()).toBe(CAFE);
  expect(part(el).selectedOptions[0].textContent!.trim()).toBe('— Coffee');
  expect(document.activeElement).toBe(box(el));
  // Mod+D: a copy right after it, the copy in hand.
  expect(key(box(el), 'd', { ctrlKey: true }).defaultPrevented).toBe(true);
  await settle(el);
  expect(last().match(/## Coffee/g)!.length).toBe(2);
  expect(part(el).value).toBe('3');
  el.dispatchEvent(new CustomEvent('docundo', { cancelable: true }));
  await settle(el);
  expect(last()).toBe(CAFE);
  expect(part(el).value).toBe('2');
  // Down takes Pastry; Delete removes it; undo brings it back, in hand.
  key(box(el), 'ArrowDown');
  await settle(el);
  expect(part(el).value).toBe('3');
  key(box(el), 'Delete');
  await settle(el);
  expect(last()).not.toContain('## Pastry');
  el.dispatchEvent(new CustomEvent('docundo', { cancelable: true }));
  await settle(el);
  expect(last()).toBe(CAFE);
  expect(part(el).value).toBe('3');
  expect(document.activeElement).toBe(box(el));
  await until(() => ctxOpen(el));
  // Backspace too; and redo takes it away again.
  key(box(el), 'Backspace');
  await settle(el);
  expect(last()).not.toContain('## Pastry');
  el.dispatchEvent(new CustomEvent('docundo', { cancelable: true }));
  await settle(el);
  el.dispatchEvent(new CustomEvent('docredo', { cancelable: true }));
  await settle(el);
  expect(last()).not.toContain('## Pastry');
  // Mod+A never selects the page.
  expect(key(box(el), 'a', { ctrlKey: true }).defaultPrevented).toBe(true);
});

test('the section in hand: its bar’s Delete, Duplicate and Move by a tap; keys from a bar button or the words never act on it', async () => {
  const { el, last } = await editor();
  await hold(el, 3);
  await until(() => ctxOpen(el));
  ctxButton(el, 'Move up').click();
  await settle(el);
  expect(last().indexOf('## Pastry')).toBeLessThan(last().indexOf('## Coffee'));
  ctxButton(el, 'Duplicate').click();
  await settle(el);
  expect(last().match(/## Pastry/g)!.length).toBe(2);
  ctxButton(el, 'Delete').click();
  await settle(el);
  expect(last().match(/## Pastry/g)!.length).toBe(1);
  // Delete pressed on a bar button, or in the words, removes no section.
  const before = last();
  const bold = el.querySelector<HTMLButtonElement>('to-bar button[aria-label="Bold"]')!;
  key(bold, 'Delete');
  key(textOf(el).tx, 'd', { ctrlKey: true });
  await settle(el);
  expect(last()).toBe(before);
});

test('Enter on the section in hand edits its words in the panel, the caret at the end of its heading; Escape in the words takes it back in hand', async () => {
  const { el } = await editor();
  await hold(el, 4);
  key(box(el), 'Enter');
  await settle(el);
  const x = textOf(el);
  expect(x.contains(document.activeElement)).toBe(true);
  expect(x.sel).toEqual({ anchor: { block: 0, offset: 7 }, focus: { block: 0, offset: 7 } });
  expect(ctxOpen(el)).toBe(false);
  // Escape with nothing to close and a caret: the section in hand again.
  key(x.tx, 'Escape');
  await settle(el);
  expect(document.activeElement).toBe(box(el));
  expect(part(el).value).toBe('4');
  await until(() => ctxOpen(el));
  // The bar's Edit does the same as Enter.
  ctxButton(el, 'Edit').click();
  await settle(el);
  expect(x.contains(document.activeElement)).toBe(true);
});

test('Mod+C, Mod+X, Mod+V on the section in hand: TLO text and our marked HTML out, pasted after the part in hand', async () => {
  const { el, last } = await editor();
  await hold(el, 3);
  const copied = clip(el, 'copy');
  expect(copied.getData('text/plain')).toBe('## Pastry\n\n- Cardamom bun | 3.50\n- Sourdough toast, butter and jam | 4.00\n');
  expect(copied.getData('text/html')).toContain('<meta name="generator" content="TinyLittleOffice">');
  expect(copied.getData('text/html')).toContain('<h2>Pastry</h2>');
  expect(last()).toBe('');
  // Pasted while Find us is in hand: after Find us, and the pasted section in hand.
  await hold(el, 4);
  clip(el, 'paste', { text: copied.getData('text/plain'), html: copied.getData('text/html') });
  await settle(el);
  expect(last().trimEnd().endsWith('## Pastry\n\n- Cardamom bun | 3.50\n- Sourdough toast, butter and jam | 4.00')).toBe(true);
  expect(part(el).value).toBe('5');
  // Cut: on the clipboard and gone; undo brings it back in hand.
  const cut = clip(el, 'cut');
  await settle(el);
  expect(cut.getData('text/plain')).toContain('## Pastry');
  expect(last().match(/## Pastry/g)!.length).toBe(1);
  el.dispatchEvent(new CustomEvent('docundo', { cancelable: true }));
  await settle(el);
  expect(last().match(/## Pastry/g)!.length).toBe(2);
  expect(part(el).value).toBe('5');
  // With the words in hand, a copy is the words' own (to-text's), not the section's.
  key(box(el), 'Enter');
  await settle(el);
  const dt = new DataTransfer();
  const e = new ClipboardEvent('copy', { clipboardData: dt, bubbles: true, cancelable: true });
  document.dispatchEvent(e);
  expect(dt.getData('text/plain')).toBe('');
});

test('undo brings the words’ caret back to the section it was typed in, wherever the editor is now', async () => {
  const { el, last } = await editor();
  part(el).value = '2';
  part(el).dispatchEvent(new Event('change'));
  await settle(el);
  const x = textOf(el);
  x.sel = { anchor: { block: 2, offset: 10 }, focus: { block: 2, offset: 10 } };
  await tick();
  input(x, 'insertText', '!');
  await settle(el);
  expect(last()).toContain('- Flat white! | 4.20');
  // Elsewhere now: the Find us page.
  part(el).value = '4';
  part(el).dispatchEvent(new Event('change'));
  await settle(el);
  el.dispatchEvent(new CustomEvent('docundo', { cancelable: true }));
  await settle(el);
  expect(last()).toBe(CAFE);
  expect(part(el).value).toBe('2');
  expect(textOf(el).sel).toEqual({ anchor: { block: 2, offset: 10 }, focus: { block: 2, offset: 10 } });
  expect(textOf(el).contains(document.activeElement)).toBe(true);
});

test('Insert puts a thing under the caret’s block, not at the end of the section; with a section in hand, at its end', async () => {
  const { el, last } = await editor();
  part(el).value = '2';
  part(el).dispatchEvent(new Event('change'));
  await settle(el);
  const x = textOf(el);
  x.focus();
  x.sel = { anchor: { block: 1, offset: 3 }, focus: { block: 1, offset: 3 } };
  x.dispatchEvent(new CustomEvent('text-select', { detail: x.sel, bubbles: true }));
  await settle(el);
  await pick(el, el.querySelector<HTMLElement>('to-insert button')!, 'Card');
  await tick(30);
  expect(last()).toContain('- Espresso | 3.00\n- Heading | A line about it\n- Flat white');
  expect(textOf(el).sel).toEqual({ anchor: { block: 2, offset: 0 }, focus: { block: 2, offset: 25 } });
  await hold(el, 2);
  await pick(el, el.querySelector<HTMLElement>('to-insert button')!, 'Button');
  await tick(30);
  expect(last()).toContain('- Filter, by the cup | 3.50\n\n> Label | https://\n');
});

test('the words’ keys: Alt+Up moves a card item past its neighbour; Enter on a card opens its menu, which copies, cuts and removes', async () => {
  const { el, last } = await editor('# Site\n\nWords.\n\n![A cup](https://x.example/cup.png)\n\n- One | first\n- Two | second\n');
  await settle(el);
  const x = textOf(el);
  x.focus();
  x.sel = { anchor: { block: 4, offset: 1 }, focus: { block: 4, offset: 1 } };
  await tick();
  expect(key(x.tx, 'ArrowUp', { altKey: true }).defaultPrevented).toBe(true);
  await settle(el);
  expect(last()).toContain('- Two | second\n- One | first');
  // A card focused, Enter: its menu opens beside it.
  const card = x.tx.children[2] as HTMLElement;
  expect(card.classList.contains('tx-card')).toBe(true);
  card.focus();
  expect(key(card, 'Enter').defaultPrevented).toBe(true);
  await until(() => !!document.querySelector('to-menu.site-cardmenu [popover]:popover-open'));
  const labels = [...document.querySelectorAll<HTMLElement>('to-menu.site-cardmenu [popover]:popover-open [role^=menuitem]')].map((b) => b.textContent!.trim());
  expect(labels).toEqual(['Change the address…', 'Copy', 'Cut', 'Remove']);
  [...document.querySelectorAll<HTMLElement>('to-menu.site-cardmenu [popover]:popover-open [role^=menuitem]')].find((b) => b.textContent!.trim() === 'Cut')!.click();
  await settle(el);
  expect(last()).not.toContain('cup.png');
});

test('the bar: the marks, Undo and Redo last and never taking the focus; the ask dialog’s field and the words keep a phone from zooming', async () => {
  const { el } = await editor(SHOP);
  const tools = [...el.querySelectorAll<HTMLButtonElement>('to-bar.site-bar > button, to-bar.site-bar > to-insert, to-bar.site-bar > to-menu')];
  const names = tools.map((b) => b.getAttribute('aria-label') ?? b.tagName.toLowerCase());
  expect(names.slice(-2)).toEqual(['Undo', 'Redo']);
  expect(names).toEqual(expect.arrayContaining(['Bold', 'Italic', 'Underline', 'Strikethrough', 'Highlight', 'Link']));
  for (const label of ['Underline', 'Undo']) {
    const down = new MouseEvent('mousedown', { bubbles: true, cancelable: true });
    el.querySelector<HTMLButtonElement>(`to-bar button[aria-label="${label}"]`)!.dispatchEvent(down);
    expect(down.defaultPrevented).toBe(true);
  }
  expect(getComputedStyle(textOf(el).tx).touchAction).toBe('manipulation');
  expect(frame(el).srcdoc).toMatch(/\[data-s\]\{cursor:pointer;touch-action:manipulation\}/);
  await pick(el, el.querySelector<HTMLElement>('to-insert button')!, 'Picture');
  await until(() => !!document.querySelector('.to-ask-picture .to-ask-url'));
  expect(Number.parseFloat(getComputedStyle(document.querySelector('.to-ask-picture .to-ask-url')!).fontSize)).toBeGreaterThanOrEqual(16);
  document.querySelector<HTMLDialogElement>('.to-ask-picture dialog')?.close();
});

test('the preview’s own script: a tap says where the section is; the "+" chooser walks by arrows and Escape puts the focus back on the "+"; Select All never takes the page', async () => {
  // The page drawn for the preview, run same-origin here so its document can be reached.
  const { sitePage } = await import('../view.ts');
  const { parse } = await import('../../../doc/index.ts');
  document.body.innerHTML = '';
  const f = document.createElement('iframe');
  f.style.width = '800px';
  f.style.height = '600px';
  const said: { do: string; s?: number; r?: number[] }[] = [];
  window.addEventListener('message', (e) => e.source === f.contentWindow && said.push(e.data));
  f.srcdoc = sitePage(parse(CAFE), { edit: { cur: 2, stamp: 7, held: true } });
  document.body.append(f);
  await until(() => said.some((m) => m.do === 'ready'));
  // Drawn with a section in hand: it says where that section is.
  await until(() => said.some((m) => m.do === 'at' && m.s === 2));
  const d = f.contentDocument!;
  const w = f.contentWindow! as Window & typeof globalThis;
  const pastry = d.querySelector<HTMLElement>('[data-s="3"] p, [data-s="3"] li')!;
  pastry.click();
  await until(() => said.some((m) => m.do === 'pick'));
  const pick = said.find((m) => m.do === 'pick')!;
  expect(pick.s).toBe(3);
  expect(pick.r).toHaveLength(4);
  const plus = d.querySelector<HTMLButtonElement>('[data-site-add="3"]')!;
  plus.click();
  const items = [...d.querySelectorAll<HTMLButtonElement>('.site-menu [role=menuitem]')];
  expect(d.activeElement).toBe(items[0]);
  items[0].dispatchEvent(new w.KeyboardEvent('keydown', { key: 'ArrowRight', bubbles: true, cancelable: true }));
  expect(d.activeElement).toBe(items[1]);
  items[1].dispatchEvent(new w.KeyboardEvent('keydown', { key: 'ArrowLeft', bubbles: true, cancelable: true }));
  items[0].dispatchEvent(new w.KeyboardEvent('keydown', { key: 'ArrowLeft', bubbles: true, cancelable: true }));
  expect(d.activeElement).toBe(items.at(-1));
  d.activeElement!.dispatchEvent(new w.KeyboardEvent('keydown', { key: 'Escape', bubbles: true, cancelable: true }));
  expect(d.querySelector('.site-menu')).toBeNull();
  expect(d.activeElement).toBe(plus);
  const all = new w.KeyboardEvent('keydown', { key: 'a', ctrlKey: true, bubbles: true, cancelable: true });
  d.body.dispatchEvent(all);
  expect(all.defaultPrevented).toBe(true);
  f.remove();
});
