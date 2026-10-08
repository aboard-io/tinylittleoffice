// Around every document, in the shell as a visitor finds it: templates, a link read before it is edited, the one
// tooltip, the title, theme, room for the link and sharing it.
import { test, expect, describe } from 'vitest';
import { shell, bodyOf, editorOf, settleAll, until, texts, reopen, choose, opened } from './helpers-apps.ts';
import { button, press, setSl, settle } from './helpers.ts';
import { parseGrid } from '../../src/lib/formula.ts';
import { parseTodos } from '../../src/lib/todomodel.ts';

// Starting from a template, in the shell as a visitor finds it (ported from e2e/templates.spec.ts).
describe('templates', () => {
  /** The template dialog, once it is open. */
  async function picker() {
    let dialog: HTMLElement | null = null;
    await until(() => {
      dialog = document.querySelector('sl-dialog.to-templates');
      expect(dialog?.hasAttribute('open')).toBe(true);
    });
    return dialog!;
  }

  /** Choose a template by name in the open dialog, and wait for it to go. */
  async function choose(name: string) {
    const dialog = await picker();
    [...dialog.querySelectorAll<HTMLElement>('.to-template')].find((c) => c.textContent?.includes(name))!.click();
    await until(() => expect(document.querySelector('sl-dialog.to-templates')).toBeNull());
    await settleAll();
  }

  /** Open the picker from the toolbar and choose a template. */
  async function startFrom(name: string) {
    [...document.querySelectorAll<HTMLElement>('.to-template-tool')].find((b) => b.textContent?.includes('Start from a template'))!.click();
    await choose(name);
  }

  const undo = async () => {
    button(document.querySelector('to-app')!, 'Undo').click();
    await settleAll();
  };

  test('an empty text starts from a template: a picture of each, one undo back to blank', async () => {
    await shell('#/v0/write');
    // Offered twice, quietly: a line on the blank page and a button in the toolbar. Never a dialog by itself.
    const line = () => document.querySelector('.to-template-line');
    expect(line()?.textContent).toContain('Start from a template');
    expect(document.querySelector('.to-template-tool')).toBeTruthy();
    expect(document.querySelector('sl-dialog.to-templates')).toBeNull();
    line()!.querySelector('button')!.click();
    const dialog = await picker();
    const cards = dialog.querySelectorAll('.to-template');
    expect(cards).toHaveLength(8);
    expect(dialog.querySelectorAll('.to-template .pic svg')).toHaveLength(8);
    expect(texts(dialog, '.to-template b').filter((t) => t === 'Business plan')).toHaveLength(1);
    await choose('Meeting notes');
    const doc = editorOf('write');
    expect(texts(doc, 'h1')).toEqual(['Meeting notes']);
    expect(texts(doc, 'h2')).toEqual(['Agenda', 'Notes', 'Decisions', 'Actions']);
    await until(() => expect(location.hash).toMatch(/#\/v0\/write\/[WYZR]/));
    expect(bodyOf()).toMatch(/^# Meeting notes\n/);
    // Once there are words, the offer is gone; one undo and the blank page is back, offer and all.
    expect(line()).toBeNull();
    expect(document.querySelector('.to-template-tool')).toBeNull();
    await undo();
    expect(doc.querySelectorAll('h1')).toHaveLength(0);
    expect(line()).toBeTruthy();
    // The plans are templates here now: the sections, each with its questions in italics.
    await startFrom('Go-to-market plan');
    expect(texts(doc, 'h1')).toEqual(['Go-to-market plan']);
    expect(texts(doc, 'h2')).toHaveLength(7);
    expect(texts(doc, 'h2')[0]).toBe('The customer');
    // (The first italic line is the subtitle; the questions follow each heading.)
    expect(doc.querySelector('h2 + p i')?.textContent).toContain('Who buys first');
  });

  test('a sheet starts from a template, sums and chart included', async () => {
    await shell('#/v0/sheet');
    const cell = (ref: string) => document.querySelector<HTMLInputElement>(`to-sheet input[aria-label="${ref}"]`)!;
    expect(document.querySelector('.to-template-line')).toBeTruthy();
    await startFrom('Budget');
    expect(cell('A1').value).toBe('Item');
    expect(cell('D8').value).toBe('$65.00');
    expect(document.querySelector('.to-template-line')).toBeNull();
    await undo();
    expect(cell('A1').value).toBe('');
    expect(bodyOf()).toBe('');
    await startFrom('Comparison');
    expect(document.querySelector('.sheet-chart svg')).toBeTruthy();
    expect(cell('A2').value).toBe('Alpha');
    expect(parseGrid(bodyOf().replace(/^!.*\n/, ''))[1][0]).toBe('Alpha');
  });

  test('a deck starts from a template: slides with icons, from the first', async () => {
    await shell('#/v0/deck');
    expect(document.querySelector('.to-template-line')).toBeTruthy();
    await startFrom('A talk');
    expect(document.querySelectorAll('.deck-thumb')).toHaveLength(6);
    expect(document.querySelector('to-rich.title .write-page')?.textContent?.trim()).toBe('Talk title');
    expect(document.querySelector('.deck-kind')?.textContent?.trim()).toBe('Title');
    expect(document.querySelector('.to-template-line')).toBeNull();
    await undo();
    expect(document.querySelectorAll('.deck-thumb')).toHaveLength(1);
    expect(document.querySelector('.to-template-line')).toBeTruthy();
  });
});

// A link as anyone opening it finds it: the document to read, with Edit a button away (ported from e2e/view.spec.ts).
describe('reading', () => {
  const visitor = { edit: null, open: null } as const;
  const edit = async () => {
    button(document.querySelector('to-app')!, 'Edit').click();
    await settleAll();
  };
  const noButton = (name: string) => expect(() => button(document.querySelector('to-app')!, name)).toThrow();

  test('a text opens as its words, and Edit is the editor on the same link', async () => {
    await shell({ app: 'write', body: '# Hello\nSee https://example.com for *more*.', title: 'A letter' }, visitor);
    // A text is its words: no toolbar, links that work.
    expect(texts(document, '.to-view.prose h1')).toEqual(['Hello']);
    expect(document.querySelector('.to-view.prose a')?.getAttribute('href')).toBe('https://example.com');
    expect(document.querySelector('[aria-label="Document"]')).toBeNull();
    noButton('Undo');
    expect(document.title).toBe('A letter · TinyLittleOffice');
    const before = location.href;
    await edit();
    expect(document.querySelector('to-write [aria-label="Document"]')?.textContent).toContain('See https://example.com');
    expect(location.href).toBe(before);
  });

  test('a game is the game, and its editor a button away', async () => {
    await shell({ app: 'adventure', body: '# Cave\n## start\nDark.\n> Light a match | lit\n## lit\nBats.' }, visitor);
    // (Playing it is the frame's own script: e2e/view.spec.ts plays it.)
    const frame = document.querySelector<HTMLIFrameElement>('iframe.to-view')!;
    expect(frame.getAttribute('srcdoc')).toContain('Light a match');
    expect(document.querySelector('to-adventure')).toBeNull();
    await edit();
    expect(document.querySelector('to-adventure iframe')).toBeTruthy();
    button(document.querySelector('to-adventure')!, 'List').click();
    await settleAll();
    expect(document.querySelector('to-adventure to-lines')).toBeTruthy();
  });

  test('anything else is its pages; a zine is its own page; a deck presents only from a .show link', async () => {
    await shell({ app: 'todo', body: '- Book flights\nx Renew passport' }, visitor);
    expect(document.querySelector('.to-view.pages svg')?.textContent).toContain('Book flights');
    expect(document.querySelector('to-todo')).toBeNull();
    await shell({ app: 'zine', body: 'Small Joys\nIssue one\n\nCoffee\nThe first cup.' }, visitor);
    expect(document.querySelector('iframe.to-view')?.getAttribute('srcdoc')).toContain('Small Joys');
    // A deck's plain link opens as its slides to read; only a ".show" link presents.
    await shell({ app: 'deck', body: 'Hello\none\ntwo' }, visitor);
    expect(document.querySelector('.deck-show')).toBeNull();
    expect(document.querySelector('.to-view.pages svg')?.textContent).toContain('Hello');
    await shell({ app: 'deck', body: 'Hello\none\ntwo', view: 'show' }, visitor);
    expect(document.querySelector('.deck-show')).toBeTruthy();
  });

  test('something new opens ready to make; so does a link written for a program to fill in', async () => {
    await shell('#/v0/write', visitor);
    expect(document.querySelector('to-write [aria-label="Document"]')).toBeTruthy();
    // A plain link on an app's own page: turned into the usual link on arrival, and opened to read.
    history.replaceState(null, '', '/menu/#doc=%23+Cafe%0AEspresso+%7C+3.00');
    await shell(location.hash, visitor);
    expect(location.hash).toMatch(/^#\/v0\/menu\/[WYZR]/);
    expect(document.querySelector('.to-view.pages .sheet > svg')?.textContent).toContain('Espresso');
    expect(button(document.querySelector('to-app')!, 'Edit')).toBeTruthy();
    history.replaceState(null, '', '/');
  });
});

// The one tooltip (src/kit/tip.ts): hover and keyboard focus on a desktop, a long press on a phone (ported from e2e/tip.spec.ts).
describe('tooltip', () => {
  const tip = () => document.getElementById('to-tip');
  const isOpen = () => !!tip()?.classList.contains('open');
  const shellEl = () => document.querySelector('to-app')!;
  const pointer = (el: Element, type: string, pointerType: string, extra: PointerEventInit = {}) =>
    el.dispatchEvent(new PointerEvent(type, { bubbles: true, composed: true, pointerType, isPrimary: true, pointerId: 1, clientX: 10, clientY: 10, ...extra }));

  test('a tip on hover and on focus, and none when the pointer leaves', async () => {
    await shell('#/v0/todo');
    const undo = button(shellEl(), 'Undo');
    pointer(undo, 'pointerover', 'mouse');
    await until(() => expect(isOpen()).toBe(true));
    expect(tip()!.textContent).toMatch(/^Undo \(/);
    pointer(undo, 'pointerout', 'mouse', { relatedTarget: document.body });
    expect(isOpen()).toBe(false);
    // A keyboard focus shows it too, Escape puts it away.
    press(document.body, 'Tab');
    button(shellEl(), 'Share').dispatchEvent(new FocusEvent('focusin', { bubbles: true, composed: true }));
    expect(isOpen()).toBe(true);
    expect(tip()!.textContent).toBe('Share');
    press(document.body, 'Escape');
    expect(isOpen()).toBe(false);
  });

  test('a long press shows the tip and is not a tap', async () => {
    await shell('#/v0/todo');
    const todo = editorOf('todo');
    const add = todo.querySelector('sl-input.todo-new')!;
    setSl(add, 'Milk', 'sl-input');
    press(add, 'Enter');
    await settle(todo);
    await settleAll();
    expect(parseTodos(todo.value).map((t) => t.text)).toEqual(['Milk']);
    const del = button(todo, 'Delete task');
    pointer(del, 'pointerdown', 'touch');
    await until(() => expect(isOpen()).toBe(true));
    expect(tip()!.textContent).toBe('Delete task');
    pointer(del, 'pointerup', 'touch');
    del.click();
    await settle(todo);
    // The press was for the tip: the task is still there.
    expect(todo.querySelectorAll('.todo-list li')).toHaveLength(1);
    // A tap, though, deletes it.
    pointer(del, 'pointerdown', 'touch');
    pointer(del, 'pointerup', 'touch');
    del.click();
    await settle(todo);
    expect(todo.querySelectorAll('.todo-list li')).toHaveLength(0);
    expect(isOpen()).toBe(false);
  });
});

// The shell around every document: its title, the theme, how much room the link has where, and sharing it
// (ported from e2e/apps.spec.ts; the picture shared as a PNG is drawn on a canvas and stays there).
describe('sharing', () => {
  test('shell: themes, page titles, share and room per service', async () => {
    await shell('#/v0/write');
    const page = editorOf('write').querySelector<HTMLElement>('[role="textbox"][aria-label="Document"]')!;
    page.textContent = 'Quarterly memo';
    page.dispatchEvent(new InputEvent('input', { bubbles: true }));
    await settleAll();
    expect(document.title).toBe('Quarterly memo · TinyLittleOffice');

    // Theme: device, then light, then dark; the choice is remembered.
    const html = document.documentElement;
    const theme = () => document.querySelector<HTMLElement>('#nav-drawer .to-theme')!;
    theme().click();
    await settleAll();
    expect(theme().textContent).toContain('Light');
    expect(html.classList.contains('sl-theme-dark')).toBe(false);
    theme().click();
    await settleAll();
    expect(theme().textContent).toContain('Dark');
    expect(html.classList.contains('sl-theme-dark')).toBe(true);
    await reopen();
    expect(theme().textContent).toContain('Dark');
    expect(localStorage.getItem('to-theme')).toBe('dark');
    theme().click();
    await settleAll();
    expect(theme().textContent).toContain('Match the device');
    expect(localStorage.getItem('to-theme')).toBeNull();

    // Room for the link, service by service: on hover, and in the document dialog.
    const ring = document.querySelector('.to-meter sl-progress-ring')!;
    ring.dispatchEvent(new PointerEvent('pointerover', { bubbles: true, composed: true, pointerType: 'mouse' }));
    await until(() => expect(document.querySelector('#to-tip .to-meter-rooms')?.textContent).toContain('Bluesky'));
    ring.dispatchEvent(new PointerEvent('pointerout', { bubbles: true, composed: true, pointerType: 'mouse', relatedTarget: document.body }));
    (ring as HTMLElement).click();
    await settleAll();
    const rooms = [...document.querySelectorAll('#doc-dialog .to-rooms tbody tr')];
    expect(rooms).toHaveLength(10);
    expect(texts(document, '#doc-dialog .to-rooms thead th')).toEqual(['Where', 'Limit', 'This link', 'Left', 'Note']);
    const room = (name: string) => rooms.find((r) => r.textContent?.includes(name))!.textContent;
    expect(room('NTAG215')).toContain('504');
    expect(room('Bluesky')).toContain('any length');
    expect(room('Mastodon')).toContain('any length');
    expect(room('Text message')).toMatch(/\d/);
    button(document.querySelector('#doc-dialog')!, /Done/).click();
    await settleAll();

    // Share: compose boxes open with the link in them.
    await choose('Share', 'Bluesky');
    await until(() => expect(opened().length).toBeGreaterThan(0));
    expect(decodeURIComponent(opened().at(-1)!)).toContain('Quarterly memo ' + location.href.replace('/#/', '/write/#/'));
  });
});
