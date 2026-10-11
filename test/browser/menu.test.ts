// Menus on the Popover API: open, walk with the arrows, choose, and Escape returns focus to the button; the keys every
// menu and the templates list keep (roving focus, wrapping arrows, type-ahead), stray modifiers or not.
import { test, expect } from 'vitest';
import { userEvent } from 'vitest/browser';
import { render, html } from 'lit';
import '../../src/kit/insert.ts';
import type { ToInsert } from '../../src/kit/insert.ts';
import type { ToMenu } from '../../src/kit/menu.ts';
import '../../src/kit/menu.ts';
import '../../src/kit/home.ts';
import type { ToTemplates } from '../../src/kit/home.ts';
import { UI } from '../../src/kit/icons.ts';
import { until } from './helpers.ts';
import '../../src/styles.css';

async function insert(): Promise<ToInsert> {
  document.body.innerHTML = '<div id="box"></div>';
  const chosen: string[] = [];
  render(
    html`<to-insert .items=${[
      { label: 'Heading', icon: UI.heading, does: () => chosen.push('heading') },
      { label: 'List', icon: UI.list, does: () => chosen.push('list') },
      { label: 'Table', icon: UI.table, group: 'Data', does: () => chosen.push('table') },
    ]}></to-insert>`,
    document.querySelector('#box')!,
  );
  const el = document.querySelector<ToInsert>('to-insert')!;
  await el.updateComplete;
  (el as ToInsert & { chosen: string[] }).chosen = chosen;
  return el;
}

test('Insert ▾ opens a menu, the arrows walk it, Enter chooses, focus returns', async () => {
  const el = await insert();
  const button = el.button;
  expect(button.textContent!.trim()).toBe('Insert');
  expect(button.getAttribute('aria-haspopup')).toBe('menu');
  button.focus();
  button.click();
  await until(() => button.getAttribute('aria-expanded') === 'true');
  expect(el.isOpen).toBe(true);
  const items = [...el.querySelectorAll<HTMLElement>('[role=menuitem]')];
  expect(items.map((i) => i.textContent!.trim())).toEqual(['Heading', 'List', 'Table']);
  expect(el.querySelector('[role=group]')!.getAttribute('aria-label')).toBe('Data');
  await until(() => document.activeElement === items[0]);
  items[0].dispatchEvent(new KeyboardEvent('keydown', { key: 'ArrowDown', bubbles: true }));
  expect(document.activeElement).toBe(items[1]);
  items[1].dispatchEvent(new KeyboardEvent('keydown', { key: 'ArrowUp', bubbles: true }));
  items[0].dispatchEvent(new KeyboardEvent('keydown', { key: 'ArrowUp', bubbles: true }));
  expect(document.activeElement).toBe(items[2]);
  items[2].dispatchEvent(new KeyboardEvent('keydown', { key: 'End', bubbles: true }));
  (document.activeElement as HTMLElement).click();
  await until(() => button.getAttribute('aria-expanded') === 'false');
  expect(el.isOpen).toBe(false);
  expect((el as ToInsert & { chosen: string[] }).chosen).toEqual(['table']);
  expect(document.activeElement).toBe(button);
});

test('Escape closes the menu and puts focus back on the button', async () => {
  const el = await insert();
  el.button.focus();
  el.open();
  await until(() => el.isOpen);
  // The menu sits inside the visual viewport.
  const r = el.menu.getBoundingClientRect();
  expect(r.left).toBeGreaterThanOrEqual(0);
  expect(r.bottom).toBeLessThanOrEqual(window.innerHeight);
  // Escape is the browser's own light dismiss of a popover; here the same close, from the keyboard handler's point of view.
  el.close();
  await until(() => !el.isOpen);
  expect(document.activeElement).toBe(el.button);
});

test('opened by a key while something else had the focus, Escape puts the focus on the button, not back where the browser kept it', async () => {
  // The drawer's Download: Mod+Shift+D opens the drawer, whose search box takes the focus, then opens the menu. The
  // browser's light dismiss hands the focus back to the search box; the person expects the button the key stood for.
  const el = await insert();
  const other = document.createElement('input');
  document.body.append(other);
  other.focus();
  el.open();
  await until(() => el.isOpen);
  el.menu.querySelector<HTMLElement>('[role=menuitem]')!.focus();
  el.menu.dispatchEvent(new KeyboardEvent('keydown', { key: 'Escape', bubbles: true, cancelable: true }));
  await until(() => !el.isOpen);
  await until(() => document.activeElement === el.button);
  expect(document.activeElement).toBe(el.button);
  other.remove();
});

test('a keep menu, opened and chosen from by a pointer, never takes the focus from the editor it acts on', async () => {
  document.body.innerHTML = '<div id="box"></div>';
  const chosen: string[] = [];
  render(
    html`<div contenteditable="true" id="words">words</div>
      <to-menu keep label="Align" .items=${[{ label: 'Centre', does: () => chosen.push('centre') }]}></to-menu>`,
    document.querySelector('#box')!,
  );
  const words = document.querySelector<HTMLElement>('#words')!;
  const el = document.querySelector<ToMenu>('to-menu')!;
  await el.updateComplete;
  words.focus();
  const down = (target: HTMLElement) => target.dispatchEvent(new MouseEvent('mousedown', { bubbles: true, cancelable: true }));
  expect(down(el.button)).toBe(false);
  el.button.click();
  await until(() => el.isOpen);
  expect(document.activeElement).toBe(words);
  const item = el.querySelector<HTMLElement>('[role=menuitem]')!;
  expect(down(item)).toBe(false);
  item.click();
  await until(() => !el.isOpen);
  expect(chosen).toEqual(['centre']);
  expect(document.activeElement).toBe(words);
  // From the keyboard it is an ordinary menu: the items take the focus to be walked.
  el.button.focus();
  el.open();
  await until(() => document.activeElement === el.querySelector('[role=menuitem]'));
  el.close();
});

const press = (k: string, o: KeyboardEventInit = {}) => {
  const e = new KeyboardEvent('keydown', { key: k, bubbles: true, cancelable: true, ...o });
  (document.activeElement as HTMLElement).dispatchEvent(e);
  return e;
};
const named = () => (document.activeElement as HTMLElement).querySelector('.to-menu-words > span')?.textContent ?? (document.activeElement as HTMLElement).className;

async function four(): Promise<{ el: ToMenu; chosen: string[] }> {
  document.body.innerHTML = '<div id="box"></div>';
  const chosen: string[] = [];
  render(
    html`<to-menu label="Things" .items=${[
      { label: 'Heading', does: () => chosen.push('heading') },
      { label: 'List', does: () => chosen.push('list') },
      { label: 'Off', disabled: true, does: () => chosen.push('off') },
      { label: 'Table', group: 'Data', does: () => chosen.push('table') },
      { label: 'Tally', group: 'Data', does: () => chosen.push('tally') },
    ]}></to-menu>`,
    document.querySelector('#box')!,
  );
  const el = document.querySelector<ToMenu>('to-menu')!;
  await el.updateComplete;
  return { el, chosen };
}
/** Opened from the keyboard: the button focused, Enter on it (the browser's own click). */
async function openByKey(el: ToMenu) {
  el.button.focus();
  press('Enter');
  el.button.click();
  await until(() => el.isOpen);
}

test('a menu is a roving-focus menu: the arrows wrap, Home and End, letters find, Enter and Space choose; stray modifiers change nothing', async () => {
  const { el, chosen } = await four();
  await openByKey(el);
  // Opened by a key, the first item has the focus.
  await until(() => named() === 'Heading');
  const walk: [string, KeyboardEventInit, string][] = [
    ['ArrowDown', {}, 'List'],
    ['ArrowDown', { shiftKey: true }, 'Table'],
    ['ArrowDown', { ctrlKey: true }, 'Tally'],
    ['ArrowDown', { metaKey: true }, 'Heading'],
    ['ArrowUp', { altKey: true }, 'Tally'],
    ['ArrowUp', {}, 'Table'],
    ['Home', { shiftKey: true }, 'Heading'],
    ['End', { altKey: true }, 'Tally'],
    ['PageUp', {}, 'Heading'],
    ['t', {}, 'Table'],
    ['t', { shiftKey: true }, 'Tally'],
    ['l', {}, 'List'],
    ['h', { altKey: true }, 'Heading'],
  ];
  for (const [k, o, want] of walk) {
    const e = press(k, o);
    expect(e.defaultPrevented, `${k} ${JSON.stringify(o)}`).toBe(true);
    expect(named(), `${k} ${JSON.stringify(o)}`).toBe(want);
  }
  // Letters typed together find a longer name.
  press('t');
  press('a');
  press('l');
  expect(named()).toBe('Tally');
  // Enter (with Shift too) chooses; the menu closes to its button.
  press('Enter', { shiftKey: true });
  await until(() => !el.isOpen);
  expect(chosen).toEqual(['tally']);
  expect(document.activeElement).toBe(el.button);
  // Space chooses, Escape closes; neither goes on to the page.
  await openByKey(el);
  await until(() => named() === 'Heading');
  press('ArrowDown');
  const space = press(' ');
  expect(space.defaultPrevented).toBe(true);
  await until(() => !el.isOpen);
  expect(chosen).toEqual(['tally', 'list']);
  await openByKey(el);
  await until(() => named() === 'Heading');
  let heard = 0;
  const count = () => heard++;
  document.addEventListener('keydown', count);
  press('Escape', { shiftKey: true });
  document.removeEventListener('keydown', count);
  expect(heard).toBe(0);
  await until(() => !el.isOpen);
  expect(document.activeElement).toBe(el.button);
});

test('opened by a pointer, the menu itself has the focus and the first arrow goes in; a mouse over an item takes the focus; Tab closes to the opener', async () => {
  const { el } = await four();
  el.button.dispatchEvent(new PointerEvent('pointerdown', { bubbles: true, pointerType: 'mouse' }));
  el.button.click();
  await until(() => el.isOpen);
  await until(() => document.activeElement === el.menu);
  press('ArrowUp');
  expect(named()).toBe('Tally');
  el.button.dispatchEvent(new PointerEvent('pointerdown', { bubbles: true, pointerType: 'mouse' }));
  el.close();
  await until(() => !el.isOpen);
  el.button.click();
  await until(() => document.activeElement === el.menu);
  press('ArrowDown');
  expect(named()).toBe('Heading');
  // The mouse over List: the focus goes there, and the arrows go on from it.
  const list = [...el.querySelectorAll<HTMLElement>('[role=menuitem]')].find((x) => x.textContent!.includes('List'))!;
  list.dispatchEvent(new PointerEvent('pointermove', { bubbles: true, pointerType: 'mouse' }));
  expect(document.activeElement).toBe(list);
  press('ArrowDown');
  expect(named()).toBe('Table');
  // The disabled item is never in hand.
  press('ArrowUp');
  expect(named()).toBe('List');
  // Tab closes, and the focus is back on the opener (here another button, as a sheet's column head opens its menu).
  const opener = document.createElement('button');
  document.body.append(opener);
  el.close();
  await until(() => !el.isOpen);
  opener.focus();
  press('Enter');
  el.openAt(opener);
  await until(() => named() === 'Heading');
  press('Tab', { shiftKey: true });
  await until(() => !el.isOpen);
  expect(document.activeElement).toBe(opener);
});

test('the templates list keeps the same keys: the arrows wrap, letters find, Enter chooses, Escape closes to its button', async () => {
  document.body.innerHTML = '<div id="box"></div>';
  const page = { w: 10, h: 10, svg: '' };
  const app = {
    id: 'demo',
    name: 'Demo',
    noun: 'demo',
    group: '',
    icon: UI.plus,
    blurb: '',
    blank: () => '',
    templates: async () => ['Budget', 'Brief', 'Log'].map((name) => ({ id: name.toLowerCase(), name, blurb: '', doc: name })),
    editor: async () => ({ tag: 'x' }),
    title: () => '',
    retitle: (d: string) => d,
    view: () => [page],
  };
  render(html`<to-templates .app=${app}></to-templates>`, document.querySelector('#box')!);
  const el = document.querySelector<ToTemplates>('to-templates')!;
  await el.updateComplete;
  const before = location.hash;
  el.button.focus();
  press('Enter');
  el.button.click();
  await until(() => (document.activeElement as HTMLElement).getAttribute('role') === 'option');
  const word = () => (document.activeElement as HTMLElement).querySelector('.to-option-words > span')!.textContent;
  expect(word()).toBe('Blank');
  for (const [k, o, want] of [
    ['ArrowUp', { shiftKey: true }, 'Log'],
    ['ArrowDown', { ctrlKey: true }, 'Blank'],
    ['b', {}, 'Budget'],
    ['b', {}, 'Brief'],
    ['End', {}, 'Log'],
    ['Home', { metaKey: true }, 'Blank'],
  ] as [string, KeyboardEventInit, string][]) {
    press(k, o);
    expect(word(), k).toBe(want);
  }
  press('Escape');
  await until(() => !el.listbox.matches(':popover-open'));
  expect(document.activeElement).toBe(el.button);
  el.button.click();
  await until(() => (document.activeElement as HTMLElement).getAttribute('role') === 'option');
  press('l');
  press('Enter');
  await until(() => location.hash !== before);
  expect(location.hash).toContain('demo');
  history.replaceState(null, '', location.pathname);
});

test("an item's keys are written at its end as the device writes them, and type-ahead reads its name alone", async () => {
  document.body.innerHTML = '<div id="box"></div>';
  render(
    html`<to-menu label="Align" .items=${[
      { label: 'Align left', keys: 'Mod+Shift+L', checked: true, does: () => {} },
      { label: 'Centre', keys: 'Mod+Shift+E', checked: false, does: () => {} },
    ]}></to-menu>`,
    document.querySelector('#box')!,
  );
  const el = document.querySelector<ToMenu>('to-menu')!;
  await el.updateComplete;
  await openByKey(el);
  const mac = /Mac|iPhone|iPad/.test(navigator.platform);
  const kbds = [...document.querySelectorAll('.to-menu-item kbd.to-menu-keys')].map((k) => k.textContent);
  expect(kbds).toEqual(mac ? ['⌘⇧L', '⌘⇧E'] : ['Ctrl+Shift+L', 'Ctrl+Shift+E']);
  // "c" finds Centre by its name, never "Ctrl" in a key.
  await until(() => named() === 'Align left');
  press('c');
  expect(named()).toBe('Centre');
});

test('opened by a pointer from a button that never takes the focus (a row’s bullet), Escape gives the focus back to the words that had it, not to the button', async () => {
  const el = await insert();
  const words = document.createElement('div');
  words.contentEditable = 'true';
  words.textContent = 'Pricing';
  const bullet = document.createElement('button');
  bullet.textContent = '•';
  bullet.tabIndex = -1;
  // As the Outliner's bullet: a press never moves the focus, and the click opens the menu beside it.
  bullet.addEventListener('mousedown', (e) => e.preventDefault());
  bullet.addEventListener('click', () => el.openAt(bullet));
  document.body.append(words, bullet);
  words.focus();
  await userEvent.click(bullet);
  await until(() => el.isOpen);
  await userEvent.keyboard('{Escape}');
  await until(() => !el.isOpen);
  await new Promise((r) => requestAnimationFrame(r));
  expect(document.activeElement).toBe(words);
  words.remove();
  bullet.remove();
});
