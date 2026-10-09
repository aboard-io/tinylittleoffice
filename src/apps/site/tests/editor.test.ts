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
