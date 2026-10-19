// The shell: the home page, the route to an app, the link following every edit, the title in the head, a new
// document's name, the Link and the Display Link, and the documents kept on the device (Saved only) listed
// under their apps on the home page.
import { test, expect, afterEach, vi } from 'vitest';
import { page } from 'vitest/browser';
import { link, mount, openShare, tick, until } from './helpers.ts';
import { apps } from '../../src/kit/core/apps.ts';
import { decodeDoc } from '../../src/kit/core/codec.ts';
import { forgetAll, keep, library, localDay } from '../../src/kit/share/library.ts';
import { encodeDoc } from '../../src/kit/core/codec.ts';
import { keeping, setKeeping, store } from '../../src/kit/core/store.ts';
import { lockWith, pack } from '../../src/kit/share/privacy.ts';
import { setLanguage } from '../../src/kit/core/i18n.ts';
import { currentHash } from '../../src/kit/core/route.ts';
import type { ToShell } from '../../src/kit/core/shell.ts';
import type { ToText } from '../../src/kit/text/text.ts';

/** Words typed into Write's editor at the caret's place, `at` (the end of what is there). */
async function type(shell: ToShell, words: string, at = 0) {
  await until(() => !!shell.querySelector('to-write-editor to-text .tx'));
  const text = shell.querySelector<ToText>('to-text')!;
  await text.updateComplete;
  text.focus();
  text.sel = { anchor: { block: 0, offset: at }, focus: { block: 0, offset: at } };
  for (const ch of words) {
    text.tx.dispatchEvent(new InputEvent('beforeinput', { inputType: 'insertText', data: ch, bubbles: true, cancelable: true }));
    await text.updateComplete;
  }
  await shell.updateComplete;
}
/** Saved on this device for the length of `body`, then Private again (which forgets it all). */
async function saved(body: () => Promise<void>) {
  setKeeping(true);
  try {
    await body();
  } finally {
    setKeeping(false);
  }
}

afterEach(() => (history.replaceState(null, '', location.pathname), afterEachRemove()));
/** The documents told they are copies, forgotten: a test that opens a link sees the line afresh. */
const afterEachRemove = () => store.remove('tinyoffice.copiesSaid');

/** A document's text without the time the shell stamps it with at its first change (kit/core/envelope.ts), which it must carry. */
function unstamped(text: string): string {
  expect(text).toMatch(/\ncreated: \d{4}-\d\d-\d\dT\d\d:\d\dZ\n/);
  return text.replace(/\ncreated: [^\n]*\n/, '\n');
}

/** What a new document of Write is called today: "New Document 2026-10-09 #1". */
const fresh = (n = 1) => `New Document ${localDay()} #${n}`;

test('the home page lists the apps as rows, each with its templates', async () => {
  const shell = await mount('');
  const tile = shell.querySelector('.to-app')!;
  expect(tile.querySelector('.to-app-name')!.textContent).toBe('Word Processor');
  expect(tile.querySelector<HTMLAnchorElement>('.to-app-open')!.getAttribute('href')).toBe('#/v1/write');
  const picker = tile.querySelector<HTMLButtonElement>('.to-templates-btn')!;
  // The button is the affordance alone, to the right of the name: no "Blank" written on every tile.
  expect(picker.textContent!.trim()).toBe('');
  expect(picker.getAttribute('aria-label')).toBe('Templates for Word Processor');
  expect(tile.querySelector('.to-app-head')!.contains(picker)).toBe(true);
  expect(picker.getBoundingClientRect().left).toBeGreaterThan(tile.querySelector('.to-app-open')!.getBoundingClientRect().right - 1);
  picker.click();
  // Blank at once; the templates, a file of their own, when they arrive.
  await until(() => tile.querySelectorAll('[role=option] svg').length >= 26);
  const options = [...tile.querySelectorAll('[role=option]')];
  const names = options.map((o) => o.querySelector('.to-option-words span')!.textContent);
  expect(names.slice(0, 5)).toEqual(['Blank', 'A letter', 'Cover letter', 'Memo', 'Meeting notes']);
  expect(names.length).toBeGreaterThanOrEqual(26);
  expect(options[0].getAttribute('aria-selected')).toBe('true');
  // Choosing a template opens the app with that document.
  (options[4] as HTMLElement).click();
  await until(() => location.hash.startsWith('#/v1/write/'));
  expect(decodeDoc(location.hash.slice('#/v1/write/'.length))).toContain('# Meeting {.title}');
});

test('the Diagram Maker lists a blank page a kind and no Blank of its own, its first kind chosen; the Word Processor still starts with Blank', async () => {
  const shell = await mount('');
  const tile = [...shell.querySelectorAll<HTMLElement>('.to-app')].find((x) => x.querySelector('.to-app-open .to-app-name')!.textContent === 'Diagram Maker')!;
  expect(tile.querySelector<HTMLAnchorElement>('.to-app-open')!.getAttribute('href')).toBe('#/v1/diagram');
  tile.querySelector<HTMLButtonElement>('.to-templates-btn')!.click();
  await until(() => !!tile.querySelector('[role=option] svg'));
  const options = [...tile.querySelectorAll('[role=option]')];
  const names = options.map((o) => o.querySelector('.to-option-words span')!.textContent!);
  expect(names).not.toContain('Blank');
  for (const name of names) expect(name).not.toMatch(/blank/i);
  expect(names[0]).toBe('Mind map');
  expect(options[0].getAttribute('aria-selected')).toBe('true');
  expect(options.filter((o) => o.getAttribute('aria-selected') === 'true').length).toBe(1);
  (options[0] as HTMLElement).click();
  await until(() => location.hash.startsWith('#/v1/diagram/'));
  expect(decodeDoc(location.hash.slice('#/v1/diagram/'.length))).toContain('kind: mind');
  // The Word Processor, beside it, keeps its Blank first.
  const home = await mount('');
  const write = home.querySelector<HTMLElement>('.to-app')!;
  write.querySelector<HTMLButtonElement>('.to-templates-btn')!.click();
  await until(() => !!write.querySelector('[role=option] svg'));
  expect(write.querySelector('[role=option] .to-option-words span')!.textContent).toBe('Blank');
});

test('the way home, followed from the keys, leaves the focus in the page’s column, not on nothing (walks: site at a phone, seed -557055075)', async () => {
  const shell = await mount(`#/v1/write/${encodeDoc('---\ntitle: Plans\n---\nWords.\n')}`);
  await until(() => !!shell.querySelector('to-write-editor to-text .tx'));
  const home = shell.querySelector<HTMLAnchorElement>('a.to-here')!;
  home.focus();
  home.click();
  await until(() => !!shell.querySelector('to-home'));
  await shell.updateComplete;
  await tick(50);
  expect(document.activeElement).toBe(shell.querySelector('main.to-main'));
});

test('the home page has no copy: every app, in order, its icon, its name and its templates; no lede, no blurbs, no headings but the hidden one', async () => {
  const shell = await mount('');
  const h1 = shell.querySelector('to-home h1')!;
  expect(h1.textContent).toBe('Tiny Little Office');
  expect(h1.classList.contains('sr-only')).toBe(true);
  // (A templates dialog's own heading is not the page's copy, and the foot, who made it and where its source is, comes
  // after everything: test/browser/home.test.ts.)
  expect(shell.querySelector('to-home p:not(.to-home-foot p), to-home h2:not(.to-dialog h2), .to-app-open small')).toBeNull();
  for (const a of apps()) expect(shell.textContent).not.toContain(a.blurb);
  const tiles = [...shell.querySelectorAll('.to-app')];
  expect(tiles.map((t) => t.querySelector('.to-app-open .to-app-name')!.textContent)).toEqual(apps().map((a) => a.name));
  for (const tile of tiles) {
    expect(tile.querySelector('.to-app-open svg')!.getAttribute('width')).toBe('20');
    expect(tile.querySelector('.to-app-open')!.textContent!.trim()).toBe(tile.querySelector('.to-app-name')!.textContent);
    expect(tile.querySelector('to-templates .to-templates-btn')).not.toBeNull();
  }
});

test('the page’s first text, there before any script (index.html, scripts/seo.ts), goes as the shell starts: the shell draws what it said', async () => {
  document.body.innerHTML = '<header id="to-first"><h1>Tiny Little Office</h1><ul><li><a href="write/">Word Processor</a></li></ul></header>';
  history.replaceState(null, '', location.pathname);
  const shell = document.createElement('to-shell') as ToShell;
  document.body.append(shell);
  await shell.updateComplete;
  expect(document.getElementById('to-first')).toBeNull();
  expect(document.querySelectorAll('h1')).toHaveLength(1);
  expect(shell.querySelector('.to-app-name')?.textContent).toBe('Word Processor');
});

test('under Private an edit keeps nothing, and the home page shows no documents', async () => {
  expect(keeping()).toBe(false);
  const shell = await mount('#/v1/write');
  await type(shell, 'Not kept');
  await tick(1000);
  expect(library()).toEqual([]);
  expect(Object.keys(localStorage).filter((k) => k.startsWith('tinyoffice.'))).toEqual([]);
  const home = await mount('');
  expect(home.querySelector('.to-drive')).toBeNull();
});

test('under Saved a document typed in Write is kept, listed under Write, opened again, updated in place, forgotten', () =>
  saved(async () => {
    // Opened blank, nothing is kept until something is typed.
    let shell = await mount('#/v1/write');
    await tick(1000);
    expect(library()).toEqual([]);
    await type(shell, 'Launch notes');
    // The link read (as Share or leaving the page reads it), and the keep follows it.
    link();
    await until(() => library().length === 1);
    const first = library()[0];
    // A new document is named at once, and kept by that name.
    expect(first).toMatchObject({ app: 'write', title: fresh(), hash: location.hash });
    expect(history.state).toEqual({ kept: first.id });
    // The home page lists it under Write, with its time.
    shell = await mount('');
    const write = shell.querySelector('.to-app')!;
    const rows = write.querySelectorAll('.to-drive li');
    expect(rows).toHaveLength(1);
    expect(rows[0].querySelector('.to-drive-words > span')!.textContent).toBe(fresh());
    expect(rows[0].querySelector('.to-drive-words small')!.textContent).toBe('now');
    expect(shell.querySelectorAll('.to-drive')).toHaveLength(1);
    // Opened from there, it is the document; a second edit is the same entry.
    rows[0].querySelector<HTMLAnchorElement>('.to-drive-open')!.click();
    await until(() => shell.querySelector('to-text .tx p')?.textContent === 'Launch notes');
    await type(shell, ', again', 'Launch notes'.length);
    link();
    await until(() => decodeDoc(library()[0].hash.split('/')[3]).includes('Launch notes, again'));
    expect(library()[0].title).toBe(fresh());
    expect(library()).toHaveLength(1);
    expect(library()[0].id).toBe(first.id);
    shell = await mount('');
    expect(shell.querySelectorAll('.to-drive li')).toHaveLength(1);
    // Forget takes it away, and with nothing kept nothing shows.
    shell.querySelector<HTMLButtonElement>('.to-drive li button')!.click();
    await shell.updateComplete;
    await shell.querySelector<ToShell>('to-home')!.updateComplete;
    expect(library()).toEqual([]);
    expect(shell.querySelector('.to-drive')).toBeNull();
  }));

test('more than five documents under an app: five, then "n more" unfolds the rest', () =>
  saved(async () => {
    for (let i = 0; i < 8; i++) keep({ id: `d${i}`, app: 'write', title: i ? `Doc ${i}` : '', hash: `#/v1/write/y${i}`, at: Date.now() - i * 3600e3 });
    const shell = await mount('');
    const write = shell.querySelector('.to-app')!;
    expect([...write.querySelectorAll('.to-drive-words > span')].map((s) => s.textContent)).toEqual(['Untitled', 'Doc 1', 'Doc 2', 'Doc 3', 'Doc 4']);
    expect(write.querySelectorAll('.to-drive-words small')[2].textContent).toBe('2 hours ago');
    const more = write.querySelector<HTMLButtonElement>('.to-drive-more')!;
    expect(more.textContent).toBe('3 more');
    more.click();
    await shell.querySelector<ToShell>('to-home')!.updateComplete;
    expect(write.querySelectorAll('.to-drive li')).toHaveLength(8);
    expect(write.querySelector('.to-drive-more')).toBeNull();
  }));

test('at 390px: one column, nothing wider than the screen, every tap target 44px', async () => {
  await page.viewport(390, 844);
  try {
    await saved(async () => {
      keep({ id: 'long', app: 'write', title: 'A document with a name far too long to fit on one line of a phone', hash: '#/v1/write/ylong', at: Date.now() });
      const shell = await mount('');
      await tick(50);
      expect(document.documentElement.scrollWidth).toBeLessThanOrEqual(document.documentElement.clientWidth);
      const lefts = new Set([...shell.querySelectorAll('.to-app')].map((t) => Math.round(t.getBoundingClientRect().left)));
      expect(lefts.size).toBe(1);
      for (const el of shell.querySelectorAll<HTMLElement>('.to-app-open, .to-templates-btn, .to-drive-open, .to-drive button')) {
        const r = el.getBoundingClientRect();
        expect(r.height).toBeGreaterThanOrEqual(44);
        expect(r.right).toBeLessThanOrEqual(390);
      }
    });
  } finally {
    await page.viewport(1100, 800);
  }
});

test('a link opens its app, and every edit goes into the link', async () => {
  const shell = await mount('#/v1/write');
  await until(() => !!shell.querySelector('to-write-editor to-text .tx'));
  // A new document is named at once: shown in the title box and the tab, written nowhere until a change.
  expect(document.title).toBe(`${fresh()} · Tiny Little Office`);
  expect(shell.querySelector<HTMLInputElement>('.to-title')!.value).toBe(fresh());
  expect(location.hash).toBe('#/v1/write');
  expect(shell.querySelector('.to-here')!.getAttribute('aria-label')).toBe('Home');
  const text = shell.querySelector<ToText>('to-text')!;
  await text.updateComplete;
  text.focus();
  text.sel = { anchor: { block: 0, offset: 0 }, focus: { block: 0, offset: 0 } };
  for (const ch of 'Hello, link.') {
    text.tx.dispatchEvent(new InputEvent('beforeinput', { inputType: 'insertText', data: ch, bubbles: true, cancelable: true }));
    await text.updateComplete;
  }
  // The link follows once typing pauses, and at once when it is read.
  await until(() => /^#\/v1\/write\/[ryz]/.test(link()), 'the link never followed the typing');
  await shell.updateComplete;
  expect(location.hash).toMatch(/^#\/v1\/write\/[ryz]/);
  // The first change carries the name into the head, and the time it was first written (the editor's own document is left as it was typed).
  expect(unstamped(decodeDoc(location.hash.split('/')[3]))).toBe(`---\ntitle: ${fresh()}\n---\nHello, link.\n`);
  expect(shell.editor!.value).toBe('Hello, link.\n');
  // The title field writes the head, and the tab's name follows.
  const title = shell.querySelector<HTMLInputElement>('.to-title')!;
  title.value = 'A note';
  title.dispatchEvent(new Event('change', { bubbles: true }));
  await shell.updateComplete;
  expect(unstamped(decodeDoc(location.hash.split('/')[3]))).toBe('---\ntitle: A note\n---\nHello, link.\n');
  expect(document.title).toBe('A note · Tiny Little Office');
  // The same link, opened again, is the same document.
  const again = await mount(location.hash);
  await until(() => !!again.querySelector('to-text .tx p'));
  expect(again.querySelector('to-text .tx p')!.textContent).toBe('Hello, link.');
  expect(again.querySelector<HTMLInputElement>('.to-title')!.value).toBe('A note');
});

// The address is what the browser's history and its sync record: it is written when typing stops for fifteen seconds,
// not at every gap between keys, and at once whenever it is read or the page is hidden (kit/core/shell.ts PAUSE).
test('the link is written fifteen seconds after the typing stops, once; at once on the window’s blur, the page hidden, or a read', async () => {
  const shell = await mount('#/v1/write');
  await until(() => !!shell.querySelector('to-write-editor to-text .tx'));
  const text = shell.querySelector<ToText>('to-text')!;
  await text.updateComplete;
  text.focus();
  text.sel = { anchor: { block: 0, offset: 0 }, focus: { block: 0, offset: 0 } };
  const key = async (ch: string) => {
    text.tx.dispatchEvent(new InputEvent('beforeinput', { inputType: 'insertText', data: ch, bubbles: true, cancelable: true }));
    await text.updateComplete;
    await shell.updateComplete;
  };
  const body = () => unstamped(decodeDoc(location.hash.split('/')[3] ?? '')).replace(/^---\n[^]*?\n---\n/, '');
  const written = vi.spyOn(history, 'replaceState');
  vi.useFakeTimers({ toFake: ['setTimeout', 'clearTimeout'] });
  try {
    // Two keys ten seconds apart: nothing in the address until fifteen seconds after the second, then once.
    await key('a');
    vi.advanceTimersByTime(10000);
    await key('b');
    vi.advanceTimersByTime(14999);
    expect(location.hash).toBe('#/v1/write');
    expect(written).not.toHaveBeenCalled();
    vi.advanceTimersByTime(1);
    expect(body()).toBe('ab\n');
    expect(written).toHaveBeenCalledTimes(1);
    // A key, then the window's blur: at once.
    await key('c');
    expect(body()).toBe('ab\n');
    window.dispatchEvent(new Event('blur'));
    expect(body()).toBe('abc\n');
    // A key, then the page hidden (a phone's Home button): at once.
    await key('d');
    Object.defineProperty(document, 'visibilityState', { configurable: true, get: () => 'hidden' });
    try {
      document.dispatchEvent(new Event('visibilitychange'));
    } finally {
      delete (document as { visibilityState?: string }).visibilityState;
    }
    expect(body()).toBe('abcd\n');
    // A key, then the link read: the typed document, without waiting.
    await key('e');
    expect(body()).toBe('abcd\n');
    expect(decodeDoc(currentHash().split('/')[3])).toMatch(/\nabcde\n$/);
    expect(written).toHaveBeenCalledTimes(4);
  } finally {
    vi.useRealTimers();
    written.mockRestore();
  }
});

// A diagram's kind is chosen once, never typed: it is written at once, so a reload straight after keeps it (Paul,
// 2026-10-18: "I switch to swimlanes. It works. I reload the URL, it's back to family tree").
test('a diagram’s kind chosen is in the link at once, with no pause and no read', async () => {
  const shell = await mount(`#/v1/diagram/${encodeDoc('---\nkind: family\n---\n- Ada + Charles\n  - Byron\n')}`);
  await until(() => !!shell.querySelector('to-diagram-editor .dg-kind > button'));
  const written = vi.spyOn(history, 'replaceState');
  vi.useFakeTimers({ toFake: ['setTimeout', 'clearTimeout'] });
  try {
    shell.querySelector<HTMLButtonElement>('to-diagram-editor .dg-kind > button')!.click();
    vi.useRealTimers();
    await until(() => !!document.querySelector('[popover]:popover-open [role^=menuitem]'));
    vi.useFakeTimers({ toFake: ['setTimeout', 'clearTimeout'] });
    [...document.querySelectorAll<HTMLElement>('[popover]:popover-open [role^=menuitem]')].find((x) => x.textContent!.includes('Swimlanes'))!.click();
    expect(decodeDoc(location.hash.split('/')[3] ?? '')).toMatch(/kind: lanes/);
  } finally {
    vi.useRealTimers();
    written.mockRestore();
  }
});

// A link shared with a network carries its preview card's id (?c=, kit/share/card.ts) for the network's fetcher alone.
test('a link with ?c= opens its document, routed by the hash alone, and the address loses the card at once', async () => {
  /** The shell started at an address with a query, as a network's reader arrives. */
  const arrive = async (address: string) => {
    document.body.innerHTML = '';
    history.replaceState(null, '', `${location.pathname}${address}`);
    const shell = document.createElement('to-shell') as ToShell;
    document.body.append(shell);
    await shell.updateComplete;
    return shell;
  };
  const doc = '---\ntitle: Shared\n---\nFrom a post.\n';
  const shell = await arrive(`?c=k8hwicw#/v1/write/${encodeDoc(doc)}`);
  await until(() => !!shell.querySelector('to-write-editor to-text .tx p'));
  expect(shell.querySelector('to-text .tx p')!.textContent).toBe('From a post.');
  expect(location.search).toBe('');
  expect(location.hash).toBe(`#/v1/write/${encodeDoc(doc)}`);
  // A link copied afterwards carries no stale card.
  expect(new URL(shell.link).search).toBe('');
  // The routing never reads the query: a card's id with no document is the home page; another query is left alone.
  const home = await arrive('?c=k8hwicw&keep=1');
  expect(home.querySelector('to-home')).not.toBeNull();
  expect(location.search).toBe('?keep=1');
});

// Since 2026-10-15 the card's id is in the link's path, /c/<id>, the one page the site's Worker serves (with the card's
// tags); the shell moves the address to the app's own page, the hash naming the app, so a link copied carries no card.
test('a link at /c/<id> opens its document and the address becomes the app’s page; with no app in the hash, the site’s root', async () => {
  const path = location.pathname;
  const dir = path.replace(/[^/]*$/, '');
  const arrive = async (address: string) => {
    document.body.innerHTML = '';
    history.replaceState(null, '', address);
    const shell = document.createElement('to-shell') as ToShell;
    document.body.append(shell);
    await shell.updateComplete;
    return shell;
  };
  try {
    const doc = '---\ntitle: Shared\n---\nFrom a post.\n';
    const shell = await arrive(`${dir}c/k8hwicw#/v1/write/${encodeDoc(doc)}`);
    await until(() => !!shell.querySelector('to-write-editor to-text .tx p'));
    expect(shell.querySelector('to-text .tx p')!.textContent).toBe('From a post.');
    expect(location.pathname).toBe(`${dir}write/`);
    expect(location.hash).toBe(`#/v1/write/${encodeDoc(doc)}`);
    expect(new URL(shell.link).pathname).toBe(`${dir}write/`);
    const home = await arrive(`${dir}c/k8hwicw`);
    expect(home.querySelector('to-home')).not.toBeNull();
    expect(location.pathname).toBe(dir);
  } finally {
    document.body.innerHTML = '';
    history.replaceState(null, '', path);
  }
});

test('an unreadable link is said so, not thrown', async () => {
  const shell = await mount('#/v1/write/yNOTREALLY');
  await shell.updateComplete;
  expect(shell.querySelector('.to-empty')!.textContent).toContain('can’t be read');
  expect(shell.querySelector('.to-empty a')!.getAttribute('href')).toBe('#/v1/write');
});

test('an unknown app is the home page', async () => {
  const shell = await mount('#/v1/nothing/abc');
  expect(shell.querySelector('to-home')).not.toBeNull();
});

test("Mod+Z is the editor's only from the editor: typed in a dialog's field, the header's title or the note box, it leaves the document alone", async () => {
  const shell = await mount('#/v1/write');
  await until(() => !!shell.querySelector('to-write-editor to-text .tx'));
  const text = shell.querySelector<ToText>('to-text')!;
  await text.updateComplete;
  text.focus();
  text.sel = { anchor: { block: 0, offset: 0 }, focus: { block: 0, offset: 0 } };
  for (const ch of 'abc') {
    text.tx.dispatchEvent(new InputEvent('beforeinput', { inputType: 'insertText', data: ch, bubbles: true, cancelable: true }));
    await text.updateComplete;
  }
  // The link follows once typing pauses, and at once when it is read.
  await until(() => /^#\/v1\/write\/./.test(link()), 'the link never followed the typing');
  await shell.updateComplete;
  const doc = () => decodeDoc(link().split('/')[3] ?? '');
  expect(unstamped(doc())).toBe(`---\ntitle: ${fresh()}\n---\nabc\n`);
  const z = (target: EventTarget, init: KeyboardEventInit = {}) => {
    const ev = new KeyboardEvent('keydown', { key: 'z', ctrlKey: true, bubbles: true, cancelable: true, ...init });
    target.dispatchEvent(ev);
    return ev;
  };
  // A dialog inside the editor, with a field: its own undo.
  const dialog = document.createElement('dialog');
  const field = document.createElement('input');
  dialog.append(field);
  shell.editor!.append(dialog);
  dialog.show();
  field.focus();
  expect(z(field).defaultPrevented).toBe(false);
  dialog.remove();
  // The header's title, and an IME composing in the words.
  expect(z(shell.querySelector('.to-title')!).defaultPrevented).toBe(false);
  expect(z(text.tx, { isComposing: true }).defaultPrevented).toBe(false);
  await shell.updateComplete;
  expect(unstamped(doc())).toBe(`---\ntitle: ${fresh()}\n---\nabc\n`);
  // In the words, the document's undo; blank again, it is not named either.
  expect(z(text.tx).defaultPrevented).toBe(true);
  await text.updateComplete;
  await until(() => doc() === '', 'the link never followed the undo');
  await shell.updateComplete;
  expect(doc()).toBe('');
});

test('a document that arrives with no name is "Untitled"; a new one is numbered past the names the library holds for today', () =>
  saved(async () => {
    let shell = await mount(`#/v1/write/${encodeDoc('Old words\n')}`);
    await until(() => !!shell.querySelector('to-write-editor to-text .tx p'));
    expect(document.title).toBe('Untitled document · Tiny Little Office');
    expect(shell.querySelector<HTMLInputElement>('.to-title')!.value).toBe('');
    expect(shell.querySelector<HTMLInputElement>('.to-title')!.placeholder).toBe('Untitled document');
    keep({ id: 'a', app: 'write', title: fresh(1), hash: '#/v1/write/ya', at: Date.now() });
    keep({ id: 'b', app: 'write', title: fresh(3), hash: '#/v1/write/yb', at: Date.now() });
    keep({ id: 'c', app: 'sheet', title: `New Spreadsheet ${localDay()} #2`, hash: '#/v1/sheet/yc', at: Date.now() });
    shell = await mount('#/v1/write');
    const box = shell.querySelector<HTMLInputElement>('.to-title')!;
    expect(box.value).toBe(fresh(2));
    // Edited, the name is chosen whole, to be typed over.
    box.focus();
    expect([box.selectionStart, box.selectionEnd]).toEqual([0, fresh(2).length]);
    shell = await mount('#/v1/sheet');
    expect(shell.querySelector<HTMLInputElement>('.to-title')!.value).toBe(`New Spreadsheet ${localDay()} #1`);
  }));

test('the Link and the Display Link; the Display Link shows the pages, no editor and no bar, and Edit goes back', async () => {
  const payload = encodeDoc('---\ntitle: Notes\n---\nFirst words.\n');
  const shell = await mount(`#/v1/write/${payload}`);
  await until(() => !!shell.querySelector('to-write-editor'));
  const base = `${location.origin}${location.pathname}#/v1/write/${payload}`;
  expect(shell.link).toBe(base);
  expect(shell.displayLink).toBe(`${base}?d`);

  // Opened as the Display Link: the pages, the title, Edit; no header, no bar, no editor.
  const display = await mount(`#/v1/write/${payload}?d`);
  await until(() => !!display.querySelector('.to-display-page svg'));
  expect(display.querySelector('.to-header, to-bar, to-write-editor, to-drawer')).toBeNull();
  expect(display.querySelector('.to-display-title')!.textContent).toBe('Notes');
  expect(display.querySelector('.to-display')!.textContent).toContain('First words.');
  expect(document.title).toBe('Notes · Tiny Little Office');
  const edit = display.querySelector<HTMLAnchorElement>('.to-display-edit')!;
  expect(edit.getAttribute('href')).toBe(`#/v1/write/${payload}`);
  edit.click();
  await until(() => !!display.querySelector('to-write-editor to-text .tx p'));
  expect(display.querySelector('.to-display')).toBeNull();
  expect(display.querySelector('to-write-editor to-text .tx p')!.textContent).toBe('First words.');
});

test('a Display Link at 390px: the pages fit the screen', async () => {
  await page.viewport(390, 844);
  try {
    const shell = await mount(`#/v1/write/${encodeDoc('Words on a phone.\n')}?d`);
    await until(() => !!shell.querySelector('.to-display-page svg'));
    await tick(50);
    expect(document.documentElement.scrollWidth).toBeLessThanOrEqual(document.documentElement.clientWidth);
    const svg = shell.querySelector('.to-display-page svg')!.getBoundingClientRect();
    expect(svg.width).toBeGreaterThan(300);
    expect(svg.right).toBeLessThanOrEqual(390);
    expect(shell.querySelector<HTMLElement>('.to-display-edit')!.getBoundingClientRect().height).toBeGreaterThanOrEqual(44);
  } finally {
    await page.viewport(1100, 800);
  }
});

test('home rows at 1100 and at 390: one column of full-width rows, the same shape, no cards', () =>
  saved(async () => {
    keep({ id: 'x', app: 'write', title: 'Kept here', hash: '#/v1/write/yx', at: Date.now() });
    const shapes: { lefts: number; widths: number[]; border: string; shadow: string }[] = [];
    for (const [w, h] of [
      [1100, 800],
      [390, 844],
    ] as const) {
      await page.viewport(w, h);
      const shell = await mount('');
      await tick(50);
      expect(document.documentElement.scrollWidth).toBeLessThanOrEqual(document.documentElement.clientWidth);
      const rows = [...shell.querySelectorAll<HTMLElement>('.to-app')];
      const main = shell.querySelector('.to-home')!.getBoundingClientRect();
      for (const r of rows) expect(Math.round(r.getBoundingClientRect().width)).toBe(Math.round(main.width));
      const css = getComputedStyle(rows[0]);
      shapes.push({ lefts: new Set(rows.map((r) => Math.round(r.getBoundingClientRect().left))).size, widths: [], border: css.borderTopWidth + css.borderLeftWidth, shadow: css.boxShadow });
      // The documents sit under their app, a preview's edge on its icon's (Paul, 2026-10-12: "They're indented very much
      // to the right"; home.test.ts measures the rest).
      const preview = rows[0].querySelector('.to-drive-open to-preview')!.getBoundingClientRect();
      expect(Math.abs(preview.left - rows[0].querySelector('.to-app-open > .to-icon')!.getBoundingClientRect().left)).toBeLessThan(1);
      // A thin rule between rows: a pixel, or the one device pixel the browser snaps it to under the size of everything.
      expect(parseFloat(css.borderBottomWidth)).toBeGreaterThan(0.5);
      expect(parseFloat(css.borderBottomWidth)).toBeLessThanOrEqual(1);
    }
    expect(shapes[0]).toEqual(shapes[1]);
    expect(shapes[0]).toEqual({ lefts: 1, widths: [], border: '0px0px', shadow: 'none' });
    await page.viewport(1100, 800);
  }));

test('the templates list has a Close at its top that dismisses it', async () => {
  const shell = await mount('');
  const tile = shell.querySelector('.to-app, .to-tile')!;
  const picker = tile.querySelector<HTMLButtonElement>('.to-templates-btn')!;
  picker.click();
  await until(() => !!tile.querySelector('dialog[open] .to-listbox'));
  const close = tile.querySelector<HTMLButtonElement>('.to-listbox-close')!;
  expect(close.getAttribute('aria-label')).toBe('Close');
  // The head is the dialog's, above the list, which scrolls under it.
  expect(tile.querySelector('.to-listbox-head')!.getBoundingClientRect().bottom).toBeLessThanOrEqual(tile.querySelector('.to-listbox')!.getBoundingClientRect().top + 1);
  close.click();
  await until(() => !tile.querySelector('dialog[open] .to-listbox'));
});

test('§1 a document opens with the focus where a person starts: a new one, an opened one, from home and from the address; never the title box or the body', async () => {
  const typing = (shell: ToShell) => shell.querySelector<ToText>('to-write-editor to-text.write-text');
  const shell = await mount('#/v1/write');
  await until(() => !!typing(shell)?.hasFocus());
  expect(document.activeElement).not.toBe(shell.querySelector('.to-title'));
  expect(typing(shell)!.sel?.focus).toEqual({ block: 0, offset: 0 });
  expect(document.scrollingElement!.scrollTop).toBe(0);
  // Another document in the same editor, from a link: its first words.
  location.hash = `#/v1/write/${encodeDoc('# Plans\n\nWords.\n')}`;
  await until(() => typing(shell)?.querySelector('h1')?.textContent === 'Plans');
  typing(shell)!.sel = { anchor: { block: 1, offset: 2 }, focus: { block: 1, offset: 2 } };
  location.hash = `#/v1/write/${encodeDoc('# Other\n\nMore.\n')}`;
  await until(() => typing(shell)?.querySelector('h1')?.textContent === 'Other' && typing(shell)!.sel?.focus.block === 0);
  expect(typing(shell)!.hasFocus()).toBe(true);
  // From the home page: the Spreadsheet's A1.
  location.hash = '';
  await until(() => !!shell.querySelector('to-home'));
  shell.querySelector<HTMLAnchorElement>('.to-app-open[href="#/v1/sheet"]')!.click();
  await until(() => document.activeElement?.getAttribute('aria-label') === 'A1');
});

test('§1 display mode and a locked document focus nothing; unlocked, the document takes the focus', async () => {
  const payload = encodeDoc('---\ntitle: Notes\n---\nFirst words.\n');
  const display = await mount(`#/v1/write/${payload}?d`);
  await until(() => !!display.querySelector('.to-display-page svg'));
  await tick(100);
  expect(document.activeElement).toBe(document.body);
  const shell = await mount(`#/v1/write/${await pack('Secret words.\n', await lockWith('pw'))}`);
  await until(() => !!document.querySelector('to-dialog.to-unlock-dialog dialog[open]'));
  await until(() => document.activeElement === shell.querySelector('.to-unlock-field'), 'the unlock field never took the focus');
  const field = shell.querySelector<HTMLInputElement>('.to-unlock-field')!;
  expect(document.activeElement).toBe(field);
  field.value = 'pw';
  field.dispatchEvent(new Event('input', { bubbles: true }));
  shell.querySelector<HTMLButtonElement>('.to-unlock-go')!.click();
  await until(() => !!shell.querySelector<ToText>('to-write-editor to-text')?.hasFocus());
});

// A deck's reader can present it (Paul, 2026-10-10: on a phone there was no way to play a deck from its link without editing).
test('a deck’s Display Link has Present beside Edit, the same link with ?show; a text’s has Edit alone', async () => {
  const deck = await mount(`#/v1/deck/${encodeDoc('## One\n\n- a\n\n---\n\n## Two\n\n- b\n')}?d`);
  await until(() => !!deck.querySelector('.to-display-edit'));
  const present = deck.querySelector<HTMLAnchorElement>('.to-display-present')!;
  expect(present).not.toBeNull();
  expect(present.getAttribute('href')).toBe(`${deck.querySelector<HTMLAnchorElement>('.to-display-edit')!.getAttribute('href')}?show`);
  const text = await mount(`#/v1/write/${encodeDoc('Words\n')}?d`);
  await until(() => !!text.querySelector('.to-display-edit'));
  expect(text.querySelector('.to-display-present')).toBeNull();
});

// A link is a copy, said once to someone who arrived by one: a quiet line under the Display Link's header,
// once a document, closed by its ×; a document made here, opened as its pages, has none.
test('a Display Link that arrived says once that it is a copy; one made here does not', async () => {
  afterEachRemove();
  const words = 'Arrived words.\n';
  const line = (s: ToShell) => s.querySelector<HTMLElement>('.to-copies');
  let display = await mount(`#/v1/write/${encodeDoc(words)}?d`);
  await until(() => !!display.querySelector('.to-display-page svg'));
  expect(line(display)!.textContent).toContain('Anyone who opens this link gets their own copy.');
  // Under the header, above the pages; a line, not a dialog.
  expect(line(display)!.previousElementSibling!.matches('.to-display-head')).toBe(true);
  expect(line(display)!.closest('dialog')).toBeNull();
  line(display)!.querySelector<HTMLButtonElement>('.to-copies-close')!.click();
  await display.updateComplete;
  expect(line(display)).toBeNull();
  // Once a document: the same link again says nothing.
  display = await mount(`#/v1/write/${encodeDoc(words)}?d`);
  await until(() => !!display.querySelector('.to-display-page svg'));
  expect(line(display)).toBeNull();
  // Made here and then shown as its pages: nothing to say.
  const shell = await mount('#/v1/write');
  await type(shell, 'Made here.');
  location.hash = new URL(shell.displayLink).hash;
  await until(() => !!shell.querySelector('.to-display-page svg'));
  expect(line(shell)).toBeNull();
});

// A document in the library is the reader's own: its Display Link says nothing about copies.
test('a Display Link of a document kept in the library has no line about copies', async () => {
  afterEachRemove();
  await saved(async () => {
    const hash = `#/v1/write/${encodeDoc('Kept words.\n')}`;
    keep({ id: 'kept-copy', app: 'write', title: 'Kept words.', hash, at: Date.now() });
    const display = await mount(`${hash}?d`);
    await until(() => !!display.querySelector('.to-display-page svg'));
    expect(display.querySelector('.to-copies')).toBeNull();
  });
});

// A document changed here is counted as told by its name (its app and `created` stamp), not only by the links this
// page wrote: after a reload, which forgets those links, its Display Link stays quiet. Another link of the same
// document, one this page never wrote, stands in for the reload; the library is emptied so it is not what keeps it quiet.
test('a document made here stays quiet after a reload: told by its created stamp, kept under Saved', async () => {
  afterEachRemove();
  await saved(async () => {
    const shell = await mount('#/v1/write');
    await type(shell, 'Made here.');
    const made = new URL(shell.displayLink).hash.match(/^#\/v1\/write\/([^?]+)/)![1];
    const text = decodeDoc(made);
    expect(text).toMatch(/\ncreated: /);
    expect(localStorage.getItem('tinyoffice.copiesSaid')).not.toBeNull();
    forgetAll();
    const display = await mount(`#/v1/write/${encodeDoc(text.replace('Made here.', 'Made here, then reloaded.'))}?d`);
    await until(() => !!display.querySelector('.to-display-page svg'));
    expect(display.querySelector('.to-copies')).toBeNull();
  });
});

// In each language's own voice: the line and Share's sentence are the language's, so a missing translation fails here.
test('the copies line and Share’s sentence follow the language: Haitian Creole', async () => {
  afterEachRemove();
  // Haitian Creole in this page alone: the choice never touches the origin's storage, which other test files share as they run.
  const set = vi.spyOn(Storage.prototype, 'setItem').mockImplementation(() => {});
  const remove = vi.spyOn(Storage.prototype, 'removeItem').mockImplementation(() => {});
  await setLanguage('ht');
  try {
    const ht = 'Nenpòt moun ki louvri lyen sa a jwenn pwòp kopi pa l. Chanjman yo p ap parèt nan pa w. Mande yo voye lyen pa yo ba ou.';
    const display = await mount(`#/v1/write/${encodeDoc('Mo ki rive.\n')}?d`);
    await until(() => !!display.querySelector('.to-display-page svg'));
    expect(display.querySelector('.to-copies p')!.textContent).toBe(ht);
    const shell = await mount(`#/v1/write/${encodeDoc('Bonjou\n')}`);
    await until(() => !!shell.querySelector('to-write-editor'));
    await openShare(shell);
    await until(() => !!shell.querySelector('.to-share-copies'));
    expect(shell.querySelector('.to-share-copies')!.textContent).toBe(ht);
  } finally {
    await setLanguage(null);
    set.mockRestore();
    remove.mockRestore();
  }
});
