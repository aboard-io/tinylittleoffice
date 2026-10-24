// A page that is not the site holds an editor (docs/library.md): src/editors.ts mounts one with the page's own host, typing
// is the document the page is told, undo is answered inside it, and where a placed document opens is the host's answer,
// never the address, and the page's own commands are declared, drawn and answered as the kit's are. A page that shares
// the document hears each change as its ops, and hands another's in. No shell is on the page: this file imports none of
// it. A page that only shows a document mounts it read-only and hears an item activated in it; a page's toast can offer
// an action.
import { html, render } from 'lit';
import { expect, test } from 'vitest';
import {
  apps,
  cmdTool,
  command,
  editDoc,
  editorTag,
  find,
  host,
  inScope,
  keepSize,
  keepSizeAt,
  keepThemeAt,
  mount,
  register,
  setTheme,
  setup,
  theme,
  toast,
  type DocPick,
  type DocRemote,
  type Picked,
  type ToFind,
  UI,
} from '../../src/editors.ts';
import type { ToOutlineEditor } from '../../src/apps/outline/editor.ts';
import type { ToWriteEditor } from '../../src/apps/write/editor.ts';
import { apply, applyAll, invertAll, parse, plainText, rebase, transform, write, type Op } from '../../src/doc/index.ts';
import { tick, until } from './wait.ts';

/** The page's own host: its documents open at its own addresses, and only its links name a document. */
const links: string[] = [];
Object.assign(host, {
  link: (lang: string, body: string, opts?: { display?: boolean }) => (links.push(`${lang}:${body.trim()}`), `https://host.test/open/${lang}?n=${links.length}${opts?.display ? '&display' : ''}`),
  read: (words: string) => (words.startsWith('host:') ? { lang: words.slice(5, words.indexOf('/')), body: words.slice(words.indexOf('/') + 1) } : null),
});

const words = (el: Element) => el.querySelector<HTMLElement>('[contenteditable=true]')!;
const type = async (el: Element, s: string) => {
  words(el).focus();
  for (const ch of s) {
    words(el).dispatchEvent(new InputEvent('beforeinput', { inputType: 'insertText', data: ch, bubbles: true, cancelable: true, composed: true }));
    await tick();
  }
};
const said = (text: string) => parse(text).blocks.map((b) => (b.k === 'p' ? plainText(b.runs) : b.k));

test('a Write editor on a bare page: typing is the text the page is told, with no shell and no link', async () => {
  document.body.innerHTML = '<main class="to-main"></main>';
  const changes: string[] = [];
  const { editor } = await mount('write', '', document.querySelector('main')!, (t) => changes.push(t));
  expect(editor.tagName.toLowerCase()).toBe('to-write-editor');
  expect(document.querySelectorAll('to-shell, to-chrome')).toHaveLength(0);
  await type(editor, 'Hi');
  await until(() => changes.length > 0);
  expect(said(changes.at(-1)!)).toStrictEqual(['Hi']);
  expect(location.hash).toBe('');
});

test('Mod+Z inside the editor undoes, as the site’s page answers it', async () => {
  document.body.innerHTML = '<main class="to-main"></main>';
  const changes: string[] = [];
  const { editor } = await mount('write', '', document.querySelector('main')!, (t) => changes.push(t));
  await type(editor, 'ab');
  await until(() => said(changes.at(-1) ?? '').join('') === 'ab');
  // One burst of typing is one history entry (kit/core/element.ts): one undo takes both letters.
  words(editor).dispatchEvent(new KeyboardEvent('keydown', { key: 'z', ctrlKey: true, bubbles: true, cancelable: true }));
  await until(() => changes.at(-1)!.trim() === '', 'the undo never reached the editor');
});

/** What a page sharing the document hears from an editor, in order: each change's ops, then its text. */
type Heard = { ops: Op[]; base: number } | string;
/** A Write editor mounted over `text` on a bare page, the caret put at `block`, `offset`, and what the page hears. */
async function shared(text: string, block: number, offset: number) {
  document.body.innerHTML = '<main class="to-main"></main>';
  const heard: Heard[] = [];
  const m = await mount('write', text, document.querySelector('main')!, (t) => heard.push(t), { onOps: (ops, base) => heard.push({ ops, base }) });
  const editor = m.editor as unknown as ToWriteEditor;
  words(editor).focus();
  editor.text.sel = { anchor: { block, offset }, focus: { block, offset } };
  await editor.text.updateComplete;
  return { ...m, editor, heard };
}
/** Each change's ops, applied to the page's own document, give the text the change that follows them carries, and each `base` is the count applied before; the document at the end. */
function replay(start: string, heard: Heard[]): string {
  let doc = parse(start);
  let n = 0;
  heard.forEach((h, i) => {
    if (typeof h === 'string') return void expect(heard[i - 1], 'a change with no ops before it').not.toBeTypeOf('string');
    expect(h.base).toBe(n);
    doc = applyAll(doc, h.ops);
    n += h.ops.length;
    expect(heard[i + 1]).toBe(write(doc));
  });
  return write(doc);
}
const undoKey = (el: Element) => words(el).dispatchEvent(new KeyboardEvent('keydown', { key: 'z', ctrlKey: true, bubbles: true, cancelable: true }));

test('every change is told as its ops: applied to the text before it they give the next docchange’s text, an undo’s too', async () => {
  const start = 'Hello.\n';
  const { editor, heard } = await shared(start, 0, 6);
  // docops is the element's own: an editor held inside another says nothing of the document around it.
  const bubbled: Event[] = [];
  document.addEventListener('docops', (e) => bubbled.push(e));
  await type(editor, ' Hi');
  words(editor).dispatchEvent(new InputEvent('beforeinput', { inputType: 'insertParagraph', bubbles: true, cancelable: true, composed: true }));
  await until(() => (heard.at(-1) as string).startsWith('Hello. Hi\n\n'), 'the Enter never reached the page');
  // The paragraph split, the new one empty (written as a line break of its own).
  const split = heard.at(-1);
  await type(editor, 'Yo');
  await until(() => heard.at(-1) === 'Hello. Hi\n\nYo\n', 'the typing never reached the page');
  expect(replay(start, heard)).toBe('Hello. Hi\n\nYo\n');
  // The undo takes the last burst back, and its ops (the inverse) do the same to the page's document.
  const before = heard.length;
  undoKey(editor);
  await until(() => heard.length > before, 'the undo was never told');
  expect(heard.at(-1)).toBe(split);
  expect(replay(start, heard)).toBe(split);
  expect(bubbled).toStrictEqual([]);
});

test('another’s ops land with nothing told, the caret carried past them, and an undo here takes back only what was typed here', async () => {
  const start = 'One.\n\nTwo.\n';
  const { editor, applyRemote, heard } = await shared(start, 1, 3);
  await type(editor, 'X');
  await until(() => heard.at(-1) === 'One.\n\nTwoX.\n', 'the typing never reached the page');
  const local = heard.flatMap((h) => (typeof h === 'string' ? [] : h.ops));
  // Another client put a paragraph in at the top: the page hands it in, as its server ordered it after the letter.
  const remote: Op[] = [{ op: 'splice', at: 0, n: 0, blocks: [{ k: 'p', runs: [{ t: 'Zero.' }] }] }];
  const told = heard.length;
  applyRemote(remote);
  await editor.updateComplete;
  await editor.text.updateComplete;
  expect(heard.length).toBe(told);
  expect(editor.value).toBe('Zero.\n\nOne.\n\nTwoX.\n');
  expect(editor.text.sel).toStrictEqual({ anchor: { block: 2, offset: 4 }, focus: { block: 2, offset: 4 } });
  // The page's document: what it was told, and the other client's op after it.
  const page = applyAll(parse(replay(start, heard)), remote);
  // The undo's ops are the letter's inverse rebased over the other's op, as the page would work them out.
  undoKey(editor);
  await until(() => heard.length > told, 'the undo was never told');
  const undo = heard[told] as { ops: Op[]; base: number };
  expect(undo.ops).toStrictEqual(rebase(invertAll(parse(start), local), remote));
  expect(undo.base).toBe(local.length + remote.length);
  expect(write(applyAll(page, undo.ops))).toBe('Zero.\n\nOne.\n\nTwo.\n');
  expect(heard.at(-1)).toBe('Zero.\n\nOne.\n\nTwo.\n');
  // The caret where the letter was typed, carried past the other's paragraph.
  const back = { anchor: { block: 2, offset: 3 }, focus: { block: 2, offset: 3 } };
  await until(() => JSON.stringify(editor.text.sel) === JSON.stringify(back), 'the caret never came back to where the letter was');
  // An op that takes away the block the caret is in leaves it within the document.
  applyRemote([{ op: 'splice', at: 1, n: 2, blocks: [] }]);
  await editor.updateComplete;
  await editor.text.updateComplete;
  expect(editor.value).toBe('Zero.\n');
  expect(editor.text.sel!.focus.block).toBe(0);
  expect(editor.text.sel!.focus.offset).toBeLessThanOrEqual(5);
});

test('another’s op that leaves a mark on a space at its edge lands as the text says it: the editor holds the server’s words', async () => {
  // "a b c" bold. Here "c" is taken out (settled: the space before it let go of the bold); at once another takes out
  // "b", which alone leaves the bold inside "a  c". The server orders ours first and the other's after it, unchanged:
  // together they leave a bold space after "a" with a plain one after it, which the text writes "**a**  ".
  const start = '**a b c**\n';
  const { editor, applyRemote, heard } = await shared(start, 0, 5);
  words(editor).dispatchEvent(new InputEvent('beforeinput', { inputType: 'deleteContentBackward', bubbles: true, cancelable: true, composed: true }));
  await until(() => heard.length >= 2, 'the deletion was never told');
  const local = heard.flatMap((h) => (typeof h === 'string' ? [] : h.ops));
  const theirs: Op = { op: 'text', at: 0, from: 2, to: 3, runs: [] };
  const over = transform(theirs, local[0], 'right')!;
  // The server keeps the text: each op applied to what its text reads back as.
  const server = write(apply(parse(write(applyAll(parse(start), local))), over));
  applyRemote([over]);
  await editor.updateComplete;
  await editor.text.updateComplete;
  expect(editor.value).toBe(server);
  expect(editor.text.blocks).toStrictEqual(parse(server).blocks);
  // An undo here still applies, and leaves the words as the text says them.
  undoKey(editor);
  await until(() => heard.length > 2, 'the undo was never told');
  expect(editor.text.blocks).toStrictEqual(parse(editor.value).blocks);
});

test('a deck written loosely is loosened as it arrives: told as ops like any change, and nothing to undo', async () => {
  document.body.innerHTML = '<main class="to-main"></main>';
  const start = '# Plan\n\nShip it.\n\n# Budget\n\nSmall.\n';
  const heard: Heard[] = [];
  const { editor } = await mount('deck', start, document.querySelector('main')!, (t) => heard.push(t), { onOps: (ops, base) => heard.push({ ops, base }) });
  expect(heard).toHaveLength(2);
  expect(replay(start, heard)).toContain('\n---\n');
  expect((editor as unknown as { canUndo: boolean }).canUndo).toBe(false);
});

test('where a placed document opens is the host’s answer, and a pasted link is the host’s to read', async () => {
  await setup();
  const tag = await editorTag('outline');
  document.body.innerHTML = '<main class="to-main"></main>';
  const el = document.createElement(tag) as ToOutlineEditor;
  const changes: string[] = [];
  el.addEventListener('docchange', (e) => changes.push((e as CustomEvent<string>).detail));
  el.value = '# Plan\n\n- Budget\n  ```sheet\n  Item | Cost:money\n  --- | ---\n  Rent | 1200\n  ```\n';
  document.querySelector('main')!.append(el);
  await el.updateComplete;
  await until(() => !!el.querySelector('.ol-doc a'), 'the placed sheet was never drawn');
  const a = el.querySelector<HTMLAnchorElement>('.ol-doc a')!;
  expect(a.href).toMatch(/^https:\/\/host\.test\/open\/sheet\?n=\d+$/);
  // The sheet as the item holds it, its lines indented under the item: the host is given the text as the document has it.
  expect(links.at(-1)!.replace(/\n\s+/g, '\n')).toBe('sheet:Item | Cost:money\n--- | ---\nRent | 1200');
  // The page's own link to the same kind of document, pasted over the card: the host reads it, and the document under
  // the item is the one it names (the way an edit made in its own app comes back).
  const paste = new ClipboardEvent('paste', { bubbles: true, cancelable: true, clipboardData: new DataTransfer() });
  paste.clipboardData!.setData('text/plain', 'host:sheet/Item | Cost:money\n--- | ---\nRent | 1500\n');
  el.querySelector('.ol-doc')!.dispatchEvent(paste);
  await until(() => changes.some((c) => c.includes('1500')), 'the pasted link never became the item’s document');
  expect(changes.at(-1)).not.toContain('1200');
});

test('a page’s own commands: declared as the kit’s, drawn by its bar, and a key typed in the words that no scope inside takes is the page’s', async () => {
  // The page's scope is this test's, not the site's: test/browser/setup.ts keeps its runs out of the map the registry's
  // lint reads (test/commands-covered.json), which holds the site's commands to a test.
  /** The page's context: a host's board, with a record in hand. */
  const board = { record: 'r1', done: [] as string[] };
  type Board = typeof board;
  // Words of the page's own, not messages of en.ftl: a function of the context.
  const open = command<Board>({
    id: 'host.open',
    scope: 'host',
    label: (b) => `Open ${b?.record ?? 'record'}`,
    keys: 'Mod+Shift+9',
    where: ['bar'],
    does: (b) => void b.done.push(`open ${b.record}`),
  });
  // Bound to a key the words take: the inner scope wins, and this never runs from inside them.
  const bolder = command<Board>({ id: 'host.bolder', scope: 'host', label: () => 'Bolder', keys: 'Mod+B', where: ['keys-only'], does: (b) => void b.done.push('bolder') });
  register([open, bolder]);
  document.body.innerHTML = '<main></main><div class="page-bar"></div>';
  const { editor } = await mount('write', '', document.querySelector('main')!, () => {}, { commands: inScope('host'), context: board });
  words(editor).focus();
  const press = (init: KeyboardEventInit) => {
    const e = new KeyboardEvent('keydown', { ctrlKey: true, bubbles: true, cancelable: true, ...init });
    words(editor).dispatchEvent(e);
    return e;
  };
  expect(press({ key: '(', code: 'Digit9', shiftKey: true }).defaultPrevented).toBe(true);
  expect(board.done).toStrictEqual(['open r1']);
  // Mod+B is the words' (bold): taken inside, it never reaches the page's scope.
  expect(press({ key: 'b', code: 'KeyB' }).defaultPrevented).toBe(true);
  expect(board.done).toStrictEqual(['open r1']);
  // Mod+S is the site's Keep, which a bare page has nothing for: the kit passes it on, and it stays the browser's.
  expect(press({ key: 's', code: 'KeyS' }).defaultPrevented).toBe(false);

  // The page's bar, drawn by the kit's cmdTool: the command's words in this context, and a click runs it.
  board.record = 'r2';
  render(html`<to-bar>${cmdTool(open, board)}</to-bar>`, document.querySelector<HTMLElement>('.page-bar')!);
  const button = document.querySelector<HTMLButtonElement>('.page-bar button.cmd-host-open')!;
  expect(button.getAttribute('aria-label')).toBe('Open r2');
  button.click();
  expect(board.done).toStrictEqual(['open r1', 'open r2']);
});

/**
 * A selector that names the page's root or body, or the site's shell and the chrome's header, menu button and Share:
 * what the editors' stylesheet never names.
 */
const PAGE = /(^|[\s>+~(,])(html|body|to-shell|to-chrome)(?=$|[\s.#:[>+~),])|\.to-(header|burger|share-btn)(?![\w-])/;
/** Every style rule's selector in a list of rules, inside layers, media and nested rules alike. */
const selectors = (rules: CSSRuleList): string[] =>
  [...rules].flatMap((r) => [...(r instanceof CSSStyleRule ? [r.selectorText] : []), ...('cssRules' in r ? selectors((r as CSSGroupingRule).cssRules) : [])]);
/** The library's stylesheets on the page: the ones the dev server put there from the source (src/editors.css, each app's). */
const library = () => [...document.styleSheets].filter((s) => (s.ownerNode as HTMLElement | null)?.dataset?.viteDevId?.includes('/src/'));

test('the page keeps its own body and the editors keep their look: the stylesheet names nothing of the page or the site’s chrome', async () => {
  // Every app's editor loaded, so every app's own sheet is on the page too.
  await Promise.all(apps().map((a) => editorTag(a.id)));
  document.body.innerHTML = '<main></main>';
  const { editor } = await mount('write', '', document.querySelector('main')!, () => {});
  const ours = library();
  expect(ours.map((s) => (s.ownerNode as HTMLElement).dataset.viteDevId!.replace(/^.*\/src\//, ''))).toEqual(
    expect.arrayContaining(['editors.css', 'apps/write/style.css', 'apps/sheet/style.css', 'apps/deck/style.css']),
  );
  const all = ours.flatMap((s) => selectors(s.cssRules));
  expect(all.length).toBeGreaterThan(500);
  expect(all.filter((s) => PAGE.test(s))).toStrictEqual([]);

  // The page's own rules for its body, as weak as rules can be: in a layer before every one of the library's, of no
  // specificity, so any rule of the library's for the body would outweigh them. The test runner's own page (whose
  // sheets set the body's margin outside any layer) is set aside while the body is read.
  const own = document.createElement('style');
  own.textContent = '@layer page { :where(body) { margin: 7px; background: rgb(250, 240, 230); font-family: Georgia, serif; } }';
  document.head.prepend(own);
  const runner = [...document.styleSheets].filter((s) => s !== own.sheet && !ours.includes(s));
  runner.forEach((s) => (s.disabled = true));
  try {
    const body = getComputedStyle(document.body);
    expect([body.marginTop, body.marginLeft, body.backgroundColor, body.fontFamily]).toStrictEqual(['7px', '7px', 'rgb(250, 240, 230)', 'Georgia, serif']);
    // The editor is the kit's: its bar a row on the tokens' ground (var(--to-bg) resolved, not the page's showing
    // through) in the nav's scale, its words in the tokens' type rather than the page's.
    const bar = getComputedStyle(editor.querySelector('to-bar')!);
    expect(bar.display).toBe('flex');
    expect(bar.getPropertyValue('--to-nav-font')).not.toBe('');
    expect(bar.backgroundColor).not.toMatch(/^rgba\(0, 0, 0, 0\)$|^transparent$/);
    expect(getComputedStyle(editor).fontFamily).toContain('IBM Plex Sans');
  } finally {
    runner.forEach((s) => (s.disabled = false));
    own.remove();
  }
});

test('a page’s commands given to mount with where bar are drawn in the editor’s bar, a group of their own after the editor’s tools and before Undo and Redo: an icon, a menu of its items, nothing for one not in force', async () => {
  const record = { name: 'Lee', shared: false, done: [] as string[] };
  type Rec = typeof record;
  const changes = command<Rec>({ id: 'host.changes', scope: 'host-doc', label: () => 'Changes', icon: UI.pen, where: ['bar'], does: (r) => void r.done.push('changes') });
  const share = command<Rec>({ id: 'host.share', scope: 'host-doc', label: () => 'Share', icon: UI.share, menu: 'share', where: ['bar'], does: () => undefined });
  const link = command<Rec>({ id: 'host.share.link', scope: 'host-doc', label: () => 'Copy link', where: ['menu:share'], does: (r) => void r.done.push('link') });
  const unshare = command<Rec>({ id: 'host.unshare', scope: 'host-doc', label: () => 'Stop sharing', icon: UI.close, where: ['bar'], when: (r) => r.shared, does: () => undefined });
  const keyOnly = command<Rec>({ id: 'host.export', scope: 'host-doc', label: () => 'Export', where: ['keys-only'], keys: 'Mod+Shift+8', does: () => undefined });
  register([changes, share, link, unshare, keyOnly]);
  document.body.innerHTML = '<main></main>';
  const { editor } = await mount('write', '# Plans\n', document.querySelector('main')!, () => {}, { commands: inScope('host-doc'), context: record });
  const bar = editor.querySelector('to-bar')!;
  const own = bar.querySelector('.to-bar-own')!;
  expect([...own.querySelectorAll(':scope > button, :scope > to-menu')].map((b) => b.getAttribute('aria-label') ?? (b as HTMLElement & { label: string }).label)).toStrictEqual(['Changes', 'Share']);
  // After the editor's own tools, before Undo and Redo.
  const stops = [...bar.querySelectorAll<HTMLElement>('button')].filter((b) => !b.closest('[popover]'));
  const at = (el: Element) => stops.findIndex((b) => b === el || el.contains(b));
  expect(at(own)).toBeGreaterThan(at(bar.querySelector('.write-paper')!));
  expect(at(own)).toBeLessThan(at(bar.querySelector('.cmd-kit-undo')!));
  own.querySelector<HTMLButtonElement>('.cmd-host-changes')!.click();
  const menu = own.querySelector<HTMLElement & { items: { label: string; does(): void }[] }>('to-menu.cmd-host-share')!;
  expect(menu.items.map((i) => i.label)).toStrictEqual(['Copy link']);
  menu.items[0].does();
  expect(record.done).toStrictEqual(['changes', 'link']);
  // A command come into force is drawn when the editor draws again.
  record.shared = true;
  const lit = editor as typeof editor & { requestUpdate(): void; updateComplete: Promise<boolean> };
  lit.requestUpdate();
  await lit.updateComplete;
  expect(bar.querySelector('.to-bar-own .cmd-host-unshare')).not.toBeNull();
});

test('a calendar mounted read-only keeps back, on and Today, and a page’s commands join its bar: one bar, no tools of its own beside them', async () => {
  const page = { done: [] as string[] };
  const add = command<typeof page>({ id: 'host.cal.add', scope: 'host-cal', label: () => 'New event', icon: UI.plus, where: ['bar'], does: (p) => void p.done.push('add') });
  register([add]);
  document.body.innerHTML = '<main></main>';
  const { editor } = await mount('cal', '- 2026-10-20 09:00-10:00: Standup\n', document.querySelector('main')!, () => {}, { readOnly: true, commands: [add], context: page });
  expect(editor.querySelectorAll('to-bar')).toHaveLength(1);
  const bar = editor.querySelector('to-bar')!;
  expect(bar.querySelector('.to-datenav')).not.toBeNull();
  expect(bar.querySelector('.cmd-kit-undo, to-insert')).toBeNull();
  bar.querySelector<HTMLButtonElement>('.to-bar-own .cmd-host-cal-add')!.click();
  expect(page.done).toStrictEqual(['add']);
});

/** An editor of `app` mounted read-only over `text` on a bare page, what the page was told, and the picks it heard. */
async function shown(app: string, text: string) {
  document.body.innerHTML = '<main class="to-main"></main>';
  const changes: string[] = [];
  const { editor } = await mount(app, text, document.querySelector('main')!, (t) => changes.push(t), { readOnly: true });
  const picks: Picked[] = [];
  editor.addEventListener('docpick', (e) => picks.push((e as DocPick).detail));
  return { editor: editor as typeof editor & { updateComplete: Promise<boolean> }, changes, picks };
}
const key = (el: Element, key: string, init: KeyboardEventInit = {}) => el.dispatchEvent(new KeyboardEvent('keydown', { key, bubbles: true, cancelable: true, ...init }));

test('an outline mounted to fill a host’s box keeps to its start: no centred measure, no handles, a gutter for the fold arrow alone', async () => {
  document.body.innerHTML = '<main class="to-main" style="width: 1200px"></main>';
  const main = document.querySelector('main')!;
  const { editor } = await mount('outline', '- One\n  - Under one\n- Two\n', main, () => {}, { readOnly: true, fill: true });
  await (editor as typeof editor & { updateComplete: Promise<boolean> }).updateComplete;
  expect(editor.hasAttribute('data-fill')).toBe(true);
  const ol = editor.querySelector<HTMLElement>('.ol')!;
  // To the box's end, not an 820px measure centred in it; its gutter hangs in the margin, so its first row begins at the box's start.
  expect(Math.abs(ol.getBoundingClientRect().right - main.getBoundingClientRect().right)).toBeLessThan(1);
  const row = editor.querySelector<HTMLElement>('.ol-row')!;
  expect(Math.abs(row.getBoundingClientRect().left - main.getBoundingClientRect().left)).toBeLessThan(1);
  expect([...editor.querySelectorAll<HTMLElement>('.ol-handle')].every((h) => h.getClientRects().length === 0)).toBe(true);
});

test('a calendar mounted read-only: no tools, an event clicked or entered is picked with its block, day and time, and nothing edits it', async () => {
  const now = new Date();
  const day = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-${String(now.getDate()).padStart(2, '0')}`;
  const text = `- ${day} 09:00-10:00: Standup\n`;
  const { editor, changes, picks } = await shown('cal', text);
  expect(editor.hasAttribute('readonly')).toBe(true);
  // Where you are is still moved through; nothing that makes or colours is drawn, and no undo.
  expect(editor.querySelector('to-bar .to-datenav')).not.toBeNull();
  expect(editor.querySelectorAll('to-insert, .cal-view, .cal-ink, .cal-zone, .cmd-kit-undo, .cmd-kit-redo')).toHaveLength(0);
  const chip = editor.querySelector<HTMLElement>('.cal-chip')!;
  chip.click();
  expect(picks).toStrictEqual([{ at: 0, date: day, time: '09:00' }]);
  // Picked, not opened: the dialog the one who edits gets is never shown.
  expect(editor.querySelector('dialog[open]')).toBeNull();
  // Enter on the event picks it too; a day tapped makes nothing.
  chip.focus();
  key(chip, 'Enter');
  expect(picks).toHaveLength(2);
  editor.querySelector<HTMLElement>('.cal-cell:not(.out) .cal-n')!.click();
  await editor.updateComplete;
  expect(editor.querySelector('dialog[open]')).toBeNull();
  // What would edit it changes nothing: a letter typed, Delete and Mod+D on the event, a paste, Mod+Z.
  chip.dispatchEvent(new InputEvent('beforeinput', { inputType: 'insertText', data: 'x', bubbles: true, cancelable: true }));
  key(chip, 'Delete');
  key(chip, 'd', { ctrlKey: true });
  key(chip, 'z', { ctrlKey: true });
  await editor.updateComplete;
  expect(changes).toStrictEqual([]);
  expect(editor.value).toBe(text);
  expect(picks).toHaveLength(2);
});

test('words mounted read-only are shown, not edited: no bar, not editable, still in the focus order, and typing changes nothing', async () => {
  const { editor, changes } = await shown('write', 'Hello.\n');
  expect(editor.querySelector('to-bar')).toBeNull();
  expect(editor.querySelector('[contenteditable=true]')).toBeNull();
  const box = editor.querySelector<HTMLElement>('to-text .tx')!;
  expect([box.getAttribute('contenteditable'), box.getAttribute('aria-readonly'), box.tabIndex]).toStrictEqual(['false', 'true', 0]);
  box.focus();
  expect(document.activeElement).toBe(box);
  const typed = new InputEvent('beforeinput', { inputType: 'insertText', data: 'x', bubbles: true, cancelable: true, composed: true });
  box.dispatchEvent(typed);
  expect(typed.defaultPrevented).toBe(true);
  key(box, 'Enter');
  key(box, 'z', { ctrlKey: true });
  await editor.updateComplete;
  expect(changes).toStrictEqual([]);
  // Set editable again, the words are typed in as ever.
  editor.readOnly = false;
  await editor.updateComplete;
  await until(() => !!editor.querySelector('to-bar') && !!editor.querySelector('[contenteditable=true]'), 'the editor never came back editable');
});

test('an outline mounted read-only: its fold arrow folds and opens the item in the view alone, writing nothing, and its pick says it was the arrow; a row picked is a pick', async () => {
  const outline = '- Plan\n  - Book the room\n- Ship\n';
  const { editor, changes, picks } = await shown('outline', outline);
  const fold = () => editor.querySelector<HTMLButtonElement>('.ol-fold')!;
  const rows = () => [...editor.querySelectorAll<HTMLElement>('.ol-row[data-at]')].map((r) => r.textContent!.trim());
  expect(fold().getAttribute('aria-expanded')).toBe('true');
  fold().click();
  await editor.updateComplete;
  expect(fold().getAttribute('aria-expanded')).toBe('false');
  expect(rows().some((r) => r.includes('Book the room'))).toBe(false);
  // Enter on the arrow opens it again.
  key(fold(), 'Enter');
  await editor.updateComplete;
  expect(fold().getAttribute('aria-expanded')).toBe('true');
  expect(rows().some((r) => r.includes('Book the room'))).toBe(true);
  editor.querySelectorAll<HTMLElement>('.ol-row[data-at]')[2].click();
  await editor.updateComplete;
  expect(picks).toStrictEqual([
    { at: 0, item: 0, part: 'fold', shut: 1 },
    { at: 0, item: 0, part: 'fold', shut: 0 },
    { at: 2, item: 2 },
  ]);
  // A fold is the view's: the document, and the page, never hear of it.
  expect(changes).toStrictEqual([]);
  expect(editor.value).toBe(outline);
  // A new document is read with its own folds alone.
  fold().click();
  await editor.updateComplete;
  editor.value = '- Plan\n  - Book the room\n';
  await editor.updateComplete;
  expect(fold().getAttribute('aria-expanded')).toBe('true');
});

test('a bare page’s toast offers an action: a button after the words, named by its label, held while it has the focus, and pressed it runs', async () => {
  document.body.innerHTML = '<main class="to-main"></main><to-toast></to-toast>';
  await mount('write', '', document.querySelector('main')!, () => {});
  let undone = 0;
  toast('Moved to Won.', { action: { label: 'Undo', does: () => undone++ } });
  const button = () => document.querySelector<HTMLButtonElement>('.to-toast.shown button');
  await until(() => !!button(), 'the action was never drawn');
  expect(button()!.getAttribute('aria-label')).toBe('Undo');
  expect(button()!.textContent).toBe('Undo');
  expect(document.querySelector('.to-toast')!.textContent).toBe('Moved to Won.Undo');
  // The words are said, by the status region, as any toast's are.
  await until(() => document.querySelector('to-toast [role=status]')!.textContent === 'Moved to Won.', 'the words were never said');
  button()!.focus();
  expect(document.activeElement).toBe(button());
  button()!.click();
  expect(undone).toBe(1);
  await until(() => !document.querySelector('.to-toast.shown'), 'the toast never went');
  // A toast with nothing to do draws no button, and is seen and not heard, as ever.
  toast('Link copied');
  await until(() => !!document.querySelector('.to-toast.shown'));
  expect(document.querySelector('.to-toast button')).toBeNull();
  expect(document.querySelector('.to-toast')!.getAttribute('aria-hidden')).toBe('true');
});

test('Compare on a page with a host of its own: each side’s link and its Open are the host’s, never the address', async () => {
  const { encodeDoc } = await import('../../src/kit/core/codec.ts');
  await import('../../src/kit/ui/compare.ts');
  await setup();
  document.body.innerHTML = '<to-compare></to-compare>';
  const cmp = document.querySelector('to-compare') as HTMLElement & { a: unknown; b: unknown; updateComplete: Promise<unknown> };
  cmp.a = { app: 'write', payload: encodeDoc('Was.\n') };
  cmp.b = { app: 'write', payload: encodeDoc('Is.\n') };
  await cmp.updateComplete;
  const first = cmp.querySelector<HTMLInputElement>('.cmp-a')!;
  expect(first.value).toMatch(/^https:\/\/host\.test\/open\/write\?n=\d+$/);
  expect([...cmp.querySelectorAll<HTMLAnchorElement>('.cmp-meta a')].map((a) => a.href)).toEqual([
    expect.stringMatching(/^https:\/\/host\.test\/open\/write/),
    expect.stringMatching(/^https:\/\/host\.test\/open\/write/),
  ]);
  expect(links.slice(-2).some((l) => l === 'write:Was.')).toBe(true);
});

test('another’s ops that land say so in "docremote", once each, and a change made here never does', async () => {
  const { editor, applyRemote, heard } = await shared('One.\n', 0, 4);
  const remote: DocRemote['detail'][] = [];
  editor.addEventListener('docremote', (e) => remote.push((e as DocRemote).detail));
  const ops: Op[] = [{ op: 'splice', at: 0, n: 0, blocks: [{ k: 'p', runs: [{ t: 'Zero.' }] }] }];
  const told = heard.length;
  applyRemote(ops);
  expect(remote).toStrictEqual([{ ops }]);
  // Neither of the editor's own events: the page knows of these ops already.
  expect(heard.length).toBe(told);
  await type(editor, 'X');
  await until(() => heard.length > told, 'the typing was never told');
  expect(remote.length).toBe(1);
  applyRemote([]);
  expect(remote.length).toBe(1);
});

test('a page with no <to-toast> of its own still says a toast: one is put on the page the first time, and only one', async () => {
  document.body.innerHTML = '<main></main>';
  await setup();
  toast('Saved.');
  await until(() => document.querySelector('.to-toast.shown')?.textContent === 'Saved.', 'the toast was never shown');
  toast('Saved again.');
  await until(() => document.querySelector('.to-toast.shown')?.textContent === 'Saved again.');
  expect(document.querySelectorAll('to-toast').length).toBe(1);
});

test('a placed document is edited in a dialog put where the page says, not always in its body', async () => {
  document.body.innerHTML = '<section class="host-themed"></section>';
  const into = document.querySelector('section')!;
  await setup();
  const done = editDoc({ app: 'write', text: 'Hello.\n', into });
  await until(() => !!into.querySelector('to-doc-dialog dialog[open]'), 'the dialog never opened in the page’s element');
  into.querySelector<HTMLButtonElement>('.to-doc-dialog-cancel')!.click();
  expect(await done).toBeNull();
  expect(into.querySelector('to-doc-dialog')).toBeNull();
});

test('a page keeps the theme and the size under keys of its own, or nowhere, and the site’s keys are left alone', async () => {
  const keys = ['to-theme', 'tinyoffice.size', 'host.theme', 'host.size'];
  for (const k of keys) localStorage.removeItem(k);
  try {
    keepThemeAt('host.theme');
    keepSizeAt('host.size');
    setTheme('dark');
    keepSize(1.5);
    expect([localStorage.getItem('host.theme'), localStorage.getItem('host.size')]).toStrictEqual(['dark', '1.5']);
    expect([localStorage.getItem('to-theme'), localStorage.getItem('tinyoffice.size')]).toStrictEqual([null, null]);
    // Nowhere: chosen for the visit, written nowhere.
    keepThemeAt(null);
    keepSizeAt(null);
    expect(theme()).toBe('auto');
    setTheme('light');
    keepSize(1.2);
    expect(theme()).toBe('light');
    expect(document.documentElement.dataset.theme).toBe('light');
    expect(localStorage.getItem('host.theme')).toBe('dark');
    expect(localStorage.getItem('host.size')).toBe('1.5');
  } finally {
    keepThemeAt('to-theme');
    keepSizeAt('tinyoffice.size');
    setTheme('auto');
    keepSize(1);
    for (const k of keys) localStorage.removeItem(k);
  }
});

test('Find over an editor a page mounted: placed by the editor, under its bar and at its right edge, never by the site’s', async () => {
  document.body.innerHTML = '<div style="height: 120px"></div><div class="box" style="width: 600px; margin-left: 40px"></div>';
  const { editor } = await mount('write', 'Pay the rent. Pay the bills.\n', document.querySelector('.box')!, () => {});
  const bar: ToFind = await find(editor);
  expect(bar.open).toBe(true);
  expect(bar.dataset.near).toBe('');
  const tools = editor.querySelector('to-bar')!.getBoundingClientRect();
  const box = editor.getBoundingClientRect();
  const at = bar.getBoundingClientRect();
  expect(at.top).toBeGreaterThanOrEqual(tools.bottom);
  expect(Math.round(at.right)).toBeLessThanOrEqual(Math.round(box.right));
  bar.input!.value = 'pay';
  bar.input!.dispatchEvent(new Event('input'));
  await until(() => bar.count === 2, 'the words were never found');
  // Asked again, the same bar.
  expect(await find(editor)).toBe(bar);
  expect(document.querySelectorAll('to-find').length).toBe(1);
  bar.close();
});
