// The Website editor in a real browser, edited in the page: the site drawn in its sandboxed frame the whole width
// of the editor, whose own script (frame.ts, loaded from the site) runs and talks back. One tap on a thing takes it
// in hand (its bar beside it in the standard's order, with a URL chip for what links); the same tap on its words
// opens them where they are drawn, typed in the page: each change one op, the page not drawn again until done; Enter
// in a heading or a paragraph goes on into a new paragraph; Escape puts the words back; a tap elsewhere keeps them.
// What is not words is a form (the URL chip's: where it goes, its icon; the shop's) or the kit's dialogs, its bar
// under it, inside it. Insert at the top left makes each kind after the thing in hand, words offered; the quick
// actions and the keys; Preview on and off; copy, cut and paste; undo puts the thing back in hand; the frame's own
// script, run same-origin so its page can be read; and at phone width the bar one row, the form inside the screen.
import { beforeEach, expect, test } from 'vitest';
import { page, userEvent } from 'vitest/browser';
import { apps } from '../../../kit/apps.ts';
import '../../../styles.css';
import '../../../kit/apps.ts';
import '../editor.ts';
import type { ToSiteEditor } from '../editor.ts';
import { templates } from '../templates.ts';
import type { ToText } from '../../../kit/text.ts';
import { tick, until } from '../../../../test/browser/helpers.ts';
import { BASE, remScale } from '../../../kit/zoom.ts';

const CAFE = templates().find((t) => t.id === 'cafe')!.doc;
const SHOP = templates().find((t) => t.id === 'shop')!.doc;
const MAKER = templates().find((t) => t.id === 'links-maker')!.doc;

/** What the frames have said, with who said it. */
const heard: { from: MessageEventSource | null; data: { do?: string; site?: number; o?: string | null; words?: boolean } }[] = [];
window.addEventListener('message', (e) => heard.push({ from: e.source, data: e.data }));

beforeEach(async () => {
  await page.viewport(1100, 800);
});

async function editor(value = CAFE) {
  document.body.innerHTML = '';
  window.scrollTo(0, 0);
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
const frame = (el: HTMLElement) => el.querySelector<HTMLIFrameElement>('iframe.site-frame')!;
/** The stamp the frame's page carries now. */
const stamp = (el: HTMLElement) => Number(/"stamp":(\d+)/.exec(frame(el).srcdoc)![1]);
/** The page in the frame drawn and its script running (it says so). */
const ready = (el: HTMLElement) => until(() => heard.some((m) => m.from === frame(el).contentWindow && m.data?.do === 'ready' && m.data.site === stamp(el)), 15000);
/** A message as the frame would send it. */
const say = (el: HTMLElement, data: object, source: MessageEventSource | null = frame(el).contentWindow) =>
  window.dispatchEvent(new MessageEvent('message', { data: { site: stamp(el), ...data }, source }));
const key = (target: EventTarget, k: string, o: KeyboardEventInit = {}) => {
  const e = new KeyboardEvent('keydown', { key: k, bubbles: true, cancelable: true, composed: true, ...o });
  target.dispatchEvent(e);
  return e;
};
const box = (el: HTMLElement) => el.querySelector<HTMLElement>('.site-page')!;
const ctxItems = (el: HTMLElement) => [...el.querySelectorAll<HTMLButtonElement>('to-context.site-context .to-context button')];
const ctxOpen = (el: HTMLElement) => !!el.querySelector('to-context.site-context .to-context:popover-open');
const ctxButton = (el: HTMLElement, label: string) => ctxItems(el).find((b) => b.getAttribute('aria-label') === label)!;
const labels = (el: HTMLElement) => ctxItems(el).map((b) => b.getAttribute('aria-label'));
/**
 * Thing `o` in hand, as a tap takes it: a tap on its words (`words`: they open in the page, and here the box is given
 * the focus the keys of the thing in hand want), or on a thing that is not words, whose dialog is closed again.
 */
async function hold(el: ToSiteEditor, o: string, words = true) {
  await tick(30);
  say(el, { do: 'pick', o, r: [20, 40, 300, 60], y: 0, ...(words ? { words: true } : {}) });
  await settle(el);
  if (!words) {
    await until(() => !!document.querySelector('dialog[open]'));
    for (const d of document.querySelectorAll<HTMLDialogElement>('dialog[open]')) d.close();
    await until(() => !document.querySelector('dialog[open]'));
    await settle(el);
  }
  box(el).focus();
}
/** The form open now, once it is. */
async function form(): Promise<HTMLElement> {
  await until(() => !!document.querySelector('.site-form-dialog dialog[open]'));
  await tick(20);
  return document.querySelector<HTMLElement>('.site-form-dialog')!;
}
const done = (f: HTMLElement) => f.querySelector<HTMLButtonElement>('.site-form-done')!.click();
const field = (f: HTMLElement, label: string) =>
  [...f.querySelectorAll<HTMLLabelElement>('label.site-form-field')].find((l) => l.querySelector('.site-form-label')!.textContent === label)!.querySelector('input')!;
const typeIn = (input: HTMLInputElement, value: string) => {
  input.value = value;
  input.dispatchEvent(new Event('input', { bubbles: true }));
};
async function insert(el: ToSiteEditor, label: string) {
  el.querySelector<HTMLElement>('to-insert button')!.click();
  await until(() => !!document.querySelector('[popover]:popover-open [role^=menuitem]'));
  const items = [...document.querySelectorAll<HTMLElement>('[popover]:popover-open [role^=menuitem]')];
  const item = items.find((x) => x.textContent!.trim() === label);
  if (!item) throw new Error(`no item ${label} among ${items.map((x) => x.textContent!.trim()).join(' | ')}`);
  item.click();
  await settle(el);
}
const insertLabels = async (el: ToSiteEditor) => {
  el.querySelector<HTMLElement>('to-insert button')!.click();
  await until(() => !!document.querySelector('[popover]:popover-open [role^=menuitem]'));
  const out = [...document.querySelectorAll<HTMLElement>('[popover]:popover-open [role^=menuitem]')].map((x) => x.textContent!.trim());
  key(document.querySelector('[popover]:popover-open [role^=menuitem]')!, 'Escape');
  await settle(el);
  return out;
};
const inFrame = (el: HTMLElement) => page.frameLocator(page.elementLocator(frame(el)));
/** Words typed by the keyboard, into what has the focus (in the frame), a key at a time. */
const typeKeys = async (keys: string) => {
  await userEvent.keyboard(keys);
  await tick(60);
};

test('the page in its frame the whole width, its script running; no panel beside it; the bar: Insert first, the look, Preview, Undo, Redo', async () => {
  const { el } = await editor();
  // No escape from the sandbox: a link out of the page comes to the editor, which asks first (r16).
  expect(frame(el).getAttribute('sandbox')).toBe('allow-scripts allow-popups');
  expect(frame(el).srcdoc).toContain('<h1 data-o="0" data-w="0:0">Harbor Coffee</h1>');
  // The frame's script is the site's own file, named by the page: never inline.
  expect(frame(el).srcdoc).toContain(`<script src="${location.origin}/site-frame.js"></script>`);
  await ready(el);
  expect(el.querySelector('.site-panel, to-text, select')).toBeNull();
  expect(Math.round(frame(el).getBoundingClientRect().width)).toBe(Math.round(el.getBoundingClientRect().width));
  const bar = [...el.querySelectorAll<HTMLElement>('to-bar.site-bar > *')].map((b) => b.getAttribute('aria-label') ?? b.textContent!.trim());
  expect(el.querySelector('to-bar.site-bar > :first-child')!.tagName).toBe('TO-INSERT');
  expect(bar.slice(-3)).toEqual(['Preview', 'Undo', 'Redo']);
  // What a website can take; a Quick Links page takes less.
  expect(await insertLabels(el)).toEqual([
    'Page',
    'Section',
    'Heading',
    'Paragraph',
    'Button',
    'Big link',
    'Web Picture',
    'Big icon',
    'Web Embed',
    'Tiny Little Office Doc',
    'Products',
    'QR code of this document',
    ...apps()
      .filter((a) => a.id !== 'site')
      .map((a) => a.name),
  ]);
  const links = await editor(MAKER);
  expect(await insertLabels(links.el)).toEqual(['Paragraph', 'Button', 'Small link', 'Web Picture', 'Big icon', 'Web Embed', 'QR code of this document']);
});

test('a tap takes a thing in hand, its bar beside it in the standard’s order: a button has its URL chip and left and right; stale or foreign messages change nothing', async () => {
  const { el } = await editor();
  await hold(el, '2.1');
  expect(el.held).toBe('2.1');
  await until(() => ctxOpen(el));
  expect(labels(el)).toEqual(['Edit', 'Goes to #find-us', 'Move up', 'Move down', 'Move left', 'Move right', 'Duplicate', 'Delete']);
  // The chip shows where it goes, in words.
  expect(ctxButton(el, 'Goes to #find-us').textContent!.trim()).toBe('find-us');
  expect(ctxButton(el, 'Move right').disabled).toBe(true);
  expect(ctxButton(el, 'Move left').disabled).toBe(false);
  // Its buttons never take the focus; it hangs by the thing as the frame says it is.
  const down = new MouseEvent('mousedown', { bubbles: true, cancelable: true });
  ctxButton(el, 'Move left').dispatchEvent(down);
  expect(down.defaultPrevented).toBe(true);
  const f = frame(el).getBoundingClientRect();
  const bar = el.querySelector<HTMLElement>('to-context.site-context .to-context')!.getBoundingClientRect();
  expect(bar.top).toBeGreaterThanOrEqual(f.top + 100 - 1);
  // A paragraph has no chip and no left or right; the home page's name can only be edited.
  await hold(el, '1');
  expect(labels(el)).toEqual(['Edit', 'Move up', 'Move down', 'Duplicate', 'Delete']);
  await hold(el, '0');
  expect(
    ctxItems(el)
      .filter((b) => b.disabled)
      .map((b) => b.getAttribute('aria-label')),
  ).toEqual(['Move up', 'Move down', 'Duplicate', 'Delete']);
  // A tap on its words leaves the focus in the page, where they are typed; nothing is asked of a form.
  (document.activeElement as HTMLElement).blur();
  say(el, { do: 'pick', o: '1', r: [0, 0, 10, 10], words: true });
  await settle(el);
  expect(el.held).toBe('1');
  expect(document.activeElement).not.toBe(box(el));
  expect(document.querySelector('dialog[open]')).toBeNull();
  box(el).focus();
  // From elsewhere, or from a page drawn before: nothing.
  say(el, { do: 'pick', o: '3', r: [0, 0, 1, 1] }, window);
  window.dispatchEvent(new MessageEvent('message', { data: { site: stamp(el) - 1, do: 'pick', o: '3' }, source: frame(el).contentWindow }));
  await settle(el);
  expect(el.held).toBe('1');
  // Escape lets go: the bar gone, the focus back on the frame.
  expect(key(box(el), 'Escape').defaultPrevented).toBe(true);
  await settle(el);
  expect(el.held).toBeNull();
  expect(ctxOpen(el)).toBe(false);
  expect(document.activeElement).toBe(frame(el));
});

test('words typed in the page: a tap on a heading opens it there, each letter one op and the page left as it is; Enter goes on into a new paragraph; a tap on the empty room keeps them and draws the page again', async () => {
  const { el, changes, last } = await editor();
  await ready(el);
  const f = inFrame(el);
  const drawn = stamp(el);
  await f.getByRole('heading', { name: 'Harbor Coffee', level: 1 }).click();
  await until(() => el.held === '0' && heard.some((m) => m.data?.do === 'pick' && m.data.o === '0' && m.data.words));
  expect(document.querySelector('dialog[open]')).toBeNull();
  await typeKeys('{End}');
  await typeKeys(' & Co');
  await until(() => last().includes('# Harbor Coffee & Co\n'));
  expect(changes.length).toBe(5);
  // The page was not drawn again under the words being typed.
  expect(stamp(el)).toBe(drawn);
  // Enter: a new paragraph after the heading, typed on.
  await typeKeys('{Enter}');
  await until(() => el.held === '1');
  await typeKeys('Since 1998.');
  await until(() => last().includes('# Harbor Coffee & Co\n\nSince 1998.\n\nSmall-batch coffee'));
  expect(stamp(el)).toBe(drawn);
  // Shift+Enter in a paragraph is a line break in it.
  await typeKeys('{Shift>}{Enter}{/Shift}');
  await typeKeys('Daily.');
  await until(() => last().includes('Since 1998.\nDaily.\n\nSmall-batch'));
  // A tap on the page's empty room (its foot): the words kept, the thing let go, the page drawn again.
  await f.getByRole('contentinfo').click();
  await until(() => el.held === null && stamp(el) > drawn);
  expect(last()).toContain('# Harbor Coffee & Co\n\nSince 1998.\nDaily.\n\nSmall-batch');
  await ready(el);
  expect(frame(el).srcdoc).toContain('<p data-o="1" data-w="1:0" data-empty="Words for the page">Since 1998.<br>Daily.</p>');
  // Undo takes the typing back, a burst at a time.
  for (let i = 0; i < 20 && last() !== CAFE; i++) {
    el.dispatchEvent(new CustomEvent('docundo', { cancelable: true }));
    await settle(el);
  }
  expect(last()).toBe(CAFE);
});

test('Escape in the words puts them back as they were and is done, the thing still in hand; another thing’s words tapped are typed next', async () => {
  const { el, last } = await editor();
  await ready(el);
  const f = inFrame(el);
  await f.getByText('Small-batch coffee, roasted on the quay every morning.').click();
  await until(() => el.held === '1');
  await typeKeys('{End}');
  await typeKeys(' Fresh');
  await until(() => last().includes('every morning. Fresh\n'));
  const drawn = stamp(el);
  await typeKeys('{Escape}');
  await until(() => last() === CAFE && stamp(el) > drawn);
  expect(el.held).toBe('1');
  await ready(el);
  // From one thing's words to another's in one tap: the first kept, the second open.
  await f.getByText('Small-batch coffee, roasted on the quay every morning.').click();
  await until(() => heard.filter((m) => m.data?.do === 'pick' && m.data.o === '1' && m.data.site === stamp(el)).length > 0);
  await typeKeys('{End}');
  await typeKeys('!');
  await until(() => last().includes('every morning.!\n'));
  // (The heading, above: the paragraph's bar hangs under the paragraph.)
  await f.getByRole('heading', { name: 'Harbor Coffee', level: 1 }).click();
  await until(() => el.held === '0');
  await typeKeys('{End}');
  await typeKeys(' Co');
  await until(() => last().includes('# Harbor Coffee Co\n\nSmall-batch coffee, roasted on the quay every morning.!\n'));
});

test('the words of each kind, as the page sends them: a paragraph rich, a button’s words with where it goes kept, a big link’s two lines, a small link, the site’s name put in; Enter’s new paragraph; an empty paragraph goes when done', async () => {
  const { el, last } = await editor();
  await ready(el);
  say(el, { do: 'pick', o: '1', r: [0, 0, 10, 10], words: true });
  say(el, { do: 'words', o: '1', part: '0', runs: [{ t: 'Fresh', b: true }, { t: ' daily.\nOn the quay.' }] });
  await settle(el);
  expect(last()).toContain('# Harbor Coffee\n\n**Fresh** daily.\nOn the quay.\n\n> See the menu');
  say(el, { do: 'words', o: '2.1', part: 'label', runs: [{ t: 'Where | when', b: true }] });
  await settle(el);
  expect(last()).toContain('> See the menu | #menu\n> Where ¦ when | #find-us\n');
  say(el, { do: 'words', o: '3', part: 'head', runs: [{ t: 'Roasted ', i: true }, { t: 'fresh' }] });
  say(el, { do: 'words', o: '3', part: 'detail', runs: [{ t: 'This week' }] });
  await settle(el);
  expect(last()).toContain('- :coffee: *Roasted* fresh | This week\n');
  // Enter in the paragraph: a new one after it, in hand.
  say(el, { do: 'split', o: '1', before: [{ t: 'Fresh daily.' }], after: [] });
  await settle(el);
  expect(el.held).toBe('2');
  expect(last()).toContain('# Harbor Coffee\n\nFresh daily.\n\n<br>\n\n> See the menu');
  // Done with it empty: it goes, the thing before in hand, the page drawn again.
  const drawn = stamp(el);
  say(el, { do: 'end', o: '2' });
  await settle(el);
  expect(el.held).toBe('1');
  expect(stamp(el)).toBeGreaterThan(drawn);
  // A small link on a Quick Links page; the site's name where there is none.
  const links = await editor(MAKER);
  await ready(links.el);
  say(links.el, { do: 'words', o: '4', part: 'label', runs: [{ t: 'Insta' }] });
  await settle(links.el);
  expect(links.last()).toContain('- :camera: Insta | https://instagram.com/ada\n');
  const blank = await editor('Words.\n');
  await ready(blank.el);
  say(blank.el, { do: 'pick', o: '-1', r: [0, 0, 10, 10], words: true });
  say(blank.el, { do: 'words', o: '-1', part: '0', runs: [{ t: 'H' }] });
  await settle(blank.el);
  expect(blank.last()).toBe('# H\n\nWords.\n');
  expect(blank.el.held).toBe('0');
  say(blank.el, { do: 'words', o: '0', part: '0', runs: [{ t: 'Harbor' }] });
  await settle(blank.el);
  expect(blank.last()).toBe('# Harbor\n\nWords.\n');
});

test('the URL chip: where a button goes and its icon, in a small form under the thing with its bar inside; a move from the bar closes it unwritten; Escape leaves it in hand', async () => {
  const { el, changes, last } = await editor();
  await hold(el, '2.1');
  await until(() => ctxOpen(el));
  ctxButton(el, 'Goes to #find-us').click();
  let f = await form();
  expect(f.querySelector('h2')!.textContent).toBe('Button');
  const url = field(f, 'Goes to');
  expect(url.value).toBe('#find-us');
  expect(document.activeElement).toBe(url);
  expect([...f.querySelectorAll('datalist option')].map((o) => (o as HTMLOptionElement).value)).toEqual(['#home', '#menu', '#coffee', '#pastry', '#find-us']);
  expect(f.querySelector('.site-form-icon button')!.textContent).toContain('No icon');
  // No words in it: they are typed in the page.
  expect(f.querySelector('to-text')).toBeNull();
  expect([...f.querySelectorAll('.site-form-label')].map((x) => x.textContent)).toEqual(['Goes to', 'Icon']);
  // The bar, lent to the modal form (outside it the page is inert), under the form.
  const bar = () => document.querySelector<HTMLElement>('to-context.site-context .to-context')!;
  await until(() => !!bar()?.matches(':popover-open'));
  const dialog = f.querySelector('dialog')!;
  expect(dialog.contains(bar())).toBe(true);
  expect(bar().getBoundingClientRect().top).toBeGreaterThanOrEqual(dialog.getBoundingClientRect().bottom - 1);
  typeIn(url, 'https://maps.example/quay');
  done(f);
  await settle(el);
  expect(last()).toContain('> See the menu | #menu\n> Find us | https://maps.example/quay\n');
  expect(el.held).toBe('2.1');
  expect(changes.length).toBe(1);
  // Again; an address typed, then Move left from the bar: the form closes unwritten, the button moves, still in hand.
  await until(() => ctxOpen(el));
  ctxButton(el, 'Goes to https://maps.example/quay').click();
  f = await form();
  typeIn(field(f, 'Goes to'), 'https://lost.example');
  [...bar().querySelectorAll<HTMLButtonElement>('button')].find((b) => b.getAttribute('aria-label') === 'Move left')!.click();
  await until(() => !document.querySelector('.site-form-dialog'));
  await settle(el);
  expect(last()).toContain('> Find us | https://maps.example/quay\n> See the menu | #menu\n');
  expect(last()).not.toContain('lost.example');
  expect(el.held).toBe('2.0');
  // Escape: nothing written, the thing in hand, the focus on the box, its bar beside it.
  await until(() => ctxOpen(el));
  ctxButton(el, 'Goes to https://maps.example/quay').click();
  await form();
  await userEvent.keyboard('{Escape}');
  await until(() => !document.querySelector('.site-form-dialog'));
  await settle(el);
  expect(changes.length).toBe(2);
  expect(el.held).toBe('2.0');
  expect(document.activeElement).toBe(box(el));
  await until(() => ctxOpen(el));
  // A big link's chip: its link round its words.
  await hold(el, '3');
  await until(() => ctxOpen(el));
  ctxButton(el, 'Where it goes').click();
  f = await form();
  expect(f.querySelector('h2')!.textContent).toBe('Big link');
  typeIn(field(f, 'Goes to'), '#menu');
  done(f);
  await settle(el);
  expect(last()).toContain('- :coffee: [Roasted daily](#menu) | Never more than a week old\n');
});

test('a picture’s form is the kit’s Web Picture, a thing from the web’s its Web Embed, opened by the tap; the shop’s form holds its currency and where orders go', async () => {
  const { el, last } = await editor('# Site\n\n![A cup](https://x.example/cup.png)\n\nhttps://youtu.be/dQw4w9WgXcQ\n');
  await hold(el, '1', false);
  key(box(el), 'Enter');
  await until(() => !!document.querySelector('.to-ask-picture dialog[open]'));
  const url = document.querySelector<HTMLInputElement>('.to-ask-picture .to-ask-url')!;
  expect(url.value).toBe('https://x.example/cup.png');
  typeIn(url, 'https://x.example/mug.png');
  document.querySelector<HTMLFormElement>('.to-ask-picture form')!.requestSubmit();
  await settle(el);
  expect(last()).toContain('![A cup](https://x.example/mug.png)\n');
  await hold(el, '2', false);
  key(box(el), 'Enter');
  await until(() => !!document.querySelector('.to-ask-embed dialog[open]'));
  expect(document.querySelector<HTMLInputElement>('.to-ask-embed .to-ask-url')!.value).toBe('https://youtu.be/dQw4w9WgXcQ');
  document.querySelector<HTMLDialogElement>('.to-ask-embed dialog')!.close();
  await settle(el);
  // The shop.
  const shop = await editor(SHOP);
  const at = frame(shop.el).srcdoc.match(/<div class="shop" data-o="(\d+)"/)![1];
  await hold(shop.el, at, false);
  key(box(shop.el), 'Enter');
  const f = await form();
  expect(f.querySelector('.site-form-products .site-form-label')!.textContent).toBe('3 things for sale');
  expect(field(f, 'Currency').value).toBe('£');
  typeIn(field(f, 'Currency'), '€');
  typeIn(field(f, 'Orders go to'), '');
  done(f);
  await settle(shop.el);
  expect(shop.last()).toMatch(/^---\ntheme: teal serif\ncurrency: €\n---\n/);
});

test('Insert at the top left: words put in after the thing in hand with their words offered, in hand; the rest through its dialog, nothing when it is closed', async () => {
  const { el, changes, last } = await editor();
  await ready(el);
  // A paragraph after the site's line.
  await hold(el, '1');
  await insert(el, 'Paragraph');
  expect(last()).toContain('every morning.\n\nNew paragraph\n\n> See the menu');
  expect(el.held).toBe('2');
  // A button after a button: in its row.
  await hold(el, '3.0');
  await insert(el, 'Button');
  expect(last()).toContain('> See the menu | #menu\n> Button\n> Find us | #find-us\n');
  expect(el.held).toBe('3.1');
  // A big link, a section, a heading, a page: each after the thing in hand (a page after its page).
  await insert(el, 'Big link');
  expect(last()).toContain('> Find us | #find-us\n\n- Big link\n- :coffee:');
  await hold(el, '9');
  await insert(el, 'Section');
  expect(last()).toContain('# Menu\n\nWhat we pour, and what we bake.\n\n## New section\n\n## Coffee');
  await insert(el, 'Heading');
  expect(last()).toContain('## New section\n\n### Heading\n\n## Coffee');
  await insert(el, 'Page');
  expect(last()).toContain('- Sourdough toast, butter and jam | 4.00\n\n# New page\n\n# Find us');
  // The new thing's words are typed in the page (they open there once it is drawn, chosen).
  await ready(el);
  say(el, { do: 'words', o: el.held!, part: '0', runs: [{ t: 'Hours' }] });
  await settle(el);
  expect(last()).toContain('\n\n# Hours\n\n# Find us');
  // Closed without Done: nothing.
  const before = changes.length;
  await insert(el, 'Web Picture');
  await until(() => !!document.querySelector('.to-ask-picture dialog[open]'));
  document.querySelector<HTMLDialogElement>('.to-ask-picture dialog')!.close();
  await settle(el);
  expect(changes.length).toBe(before);
  // With nothing in hand: at the end of the section on view.
  box(el).focus();
  key(box(el), 'Escape');
  await settle(el);
  expect(el.held).toBeNull();
  say(el, { do: 'page', id: 'find-us' });
  await insert(el, 'Paragraph');
  expect(last().trimEnd().endsWith('> Email us | mailto:hello@harborcoffee.example\n\nNew paragraph')).toBe(true);
  // A small link on a Quick Links page.
  const links = await editor(MAKER);
  await hold(links.el, '4');
  await insert(links.el, 'Small link');
  expect(links.last()).toContain('- :camera: Instagram | https://instagram.com/ada\n- :globe: Small link\n');
});

test('the quick actions and their keys: Enter opens the words, move up, down, left and right, duplicate, delete, Up and Down; undo puts the thing back in hand', async () => {
  const { el, last } = await editor();
  await hold(el, '3');
  // Mod+Alt+Right: the big link past its neighbour, still in hand.
  expect(key(box(el), 'ArrowRight', { altKey: true, ctrlKey: true }).defaultPrevented).toBe(true);
  await settle(el);
  expect(last()).toContain('- :leaf: Fair trade | From farms we have visited\n- :coffee: Roasted daily');
  expect(el.held).toBe('4');
  expect(frame(el).srcdoc).toContain('"held":"4"');
  // Alt+Up: its row past the buttons.
  key(box(el), 'ArrowUp', { altKey: true });
  await settle(el);
  expect(last()).toContain('every morning.\n\n- :leaf: Fair trade');
  expect(el.held).toBe('3');
  // Undo twice: the text as it was, the thing in hand where it was.
  el.dispatchEvent(new CustomEvent('docundo', { cancelable: true }));
  el.dispatchEvent(new CustomEvent('docundo', { cancelable: true }));
  await settle(el);
  expect(last()).toBe(CAFE);
  expect(el.held).toBe('3');
  expect(document.activeElement).toBe(box(el));
  // Mod+D: a copy after it, in hand; Delete: gone, the thing before in hand.
  key(box(el), 'd', { ctrlKey: true });
  await settle(el);
  expect(last().match(/Roasted daily/g)!.length).toBe(2);
  expect(el.held).toBe('4');
  key(box(el), 'Delete');
  await settle(el);
  expect(last()).toBe(CAFE);
  expect(el.held).toBe('3');
  // Down and Up: the next thing and the one before on the page.
  key(box(el), 'ArrowDown');
  await settle(el);
  expect(el.held).toBe('4');
  key(box(el), 'ArrowUp');
  key(box(el), 'ArrowUp');
  await settle(el);
  expect(el.held).toBe('2.1');
  // Enter opens the thing's words in the page: no form.
  await ready(el);
  key(box(el), 'Enter');
  await settle(el);
  expect(document.querySelector('dialog[open]')).toBeNull();
  box(el).focus();
  // The bar's buttons do the same by a tap.
  await until(() => ctxOpen(el));
  ctxButton(el, 'Move left').click();
  await settle(el);
  expect(last()).toContain('> Find us | #find-us\n> See the menu | #menu\n');
  expect(el.held).toBe('2.0');
  ctxButton(el, 'Delete').click();
  await settle(el);
  expect(last()).not.toContain('Find us | #find-us');
  // A section moves with what is in it; Mod+A never selects the page; keys from a bar button never act on the thing.
  await hold(el, '12');
  key(box(el), 'ArrowUp', { altKey: true });
  await settle(el);
  expect(last()).toContain('## Pastry\n\n- Cardamom bun | 3.50\n- Sourdough toast, butter and jam | 4.00\n\n## Coffee');
  expect(key(box(el), 'a', { ctrlKey: true }).defaultPrevented).toBe(true);
  const before = last();
  key(el.querySelector<HTMLButtonElement>('to-bar button[aria-label="Undo"]')!, 'Delete');
  await settle(el);
  expect(last()).toBe(before);
});

test('Mod+C, Mod+X, Mod+V on the thing in hand: TLO text and our marked HTML out, pasted after it, the pasted thing in hand', async () => {
  const { el, last } = await editor();
  await hold(el, '2.1');
  const clip = (type: 'copy' | 'cut' | 'paste', data?: DataTransfer) => {
    const dt = data ?? new DataTransfer();
    box(el).dispatchEvent(new ClipboardEvent(type, { clipboardData: dt, bubbles: true, cancelable: true }));
    return dt;
  };
  const copied = clip('copy');
  expect(copied.getData('text/plain')).toBe('> Find us | #find-us\n');
  expect(copied.getData('text/html')).toContain('<meta name="generator"');
  await hold(el, '17', false);
  clip('paste', copied);
  await settle(el);
  expect(last()).toContain('#map=17/43.6567/-70.2484\n\n> Find us | #find-us\n\n> Email us');
  expect(el.held).toBe('18.0');
  const cut = clip('cut');
  await settle(el);
  expect(cut.getData('text/plain')).toBe('> Find us | #find-us\n');
  expect(last()).toBe(CAFE);
});

test('real taps inside the frame: a button’s words typed where they are, the button in hand with its bar; the nav still goes from page to page', async () => {
  const { el, last } = await editor();
  await ready(el);
  const f = inFrame(el);
  await f.getByRole('link', { name: 'See the menu' }).click();
  await until(() => el.held === '2.0');
  expect(document.querySelector('dialog[open]')).toBeNull();
  await until(() => ctxOpen(el));
  await typeKeys('{End}');
  await typeKeys('!');
  await until(() => last().includes('> See the menu! | #menu\n'));
  // The nav: to the menu page, the thing on the page left let go.
  await f.getByRole('navigation', { name: 'Pages' }).getByRole('link', { name: 'Menu' }).click();
  await until(() => el.cur === 1);
  await until(() => el.held === null);
});

test('Preview: the page as a visitor has it, the bar one Edit button; Edit, Escape, or Escape in the page come back', async () => {
  const { el } = await editor();
  await hold(el, '1');
  el.querySelector<HTMLButtonElement>('.site-preview-btn')!.click();
  await settle(el);
  expect(el.preview).toBe(true);
  expect(el.hasAttribute('preview')).toBe(true);
  expect(el.held).toBeNull();
  expect(frame(el).srcdoc).not.toContain('data-o=');
  expect(frame(el).srcdoc).not.toContain('site-frame.js');
  expect(frame(el).srcdoc).toContain('id="site-peek"');
  expect([...el.querySelectorAll('to-bar.site-bar > *')].map((b) => b.textContent!.trim())).toEqual(['Edit']);
  expect(document.activeElement).toBe(el.querySelector('.site-edit'));
  el.querySelector<HTMLButtonElement>('.site-edit')!.click();
  await settle(el);
  expect(el.preview).toBe(false);
  expect(frame(el).srcdoc).toContain('data-o=');
  // Escape outside the page; the page's own Escape, as its script says it.
  el.startPreview();
  await settle(el);
  key(el.querySelector('.site-edit')!, 'Escape');
  await settle(el);
  expect(el.preview).toBe(false);
  el.startPreview();
  await settle(el);
  await tick(50);
  say(el, { do: 'leave' });
  await settle(el);
  expect(el.preview).toBe(false);
});

test('Preview: a link out of the site goes through the link guard, naming where it goes; a link to another page of it stays', async () => {
  const { el } = await editor('# Harbor Coffee\n\nOn the quay.\n\n> Pay now | http://pay.example/now\n');
  el.startPreview();
  await settle(el);
  await inFrame(el).getByRole('link', { name: 'Pay now' }).click();
  await until(() => !!document.querySelector('to-dialog.to-link-guard dialog[open] .lg-host'));
  const g = document.querySelector('to-dialog.to-link-guard')!;
  expect(g.querySelector('.lg-host')!.textContent).toBe('pay.example');
  expect(g.querySelector('.lg-url')!.textContent).toBe('http://pay.example/now');
  expect(g.querySelector('.lg-warn')).not.toBeNull();
  g.querySelector<HTMLButtonElement>('.lg-cancel')!.click();
  await until(() => !document.querySelector('to-dialog.to-link-guard dialog[open]'));
  // A message from elsewhere, or from a page drawn before, opens nothing.
  say(el, { do: 'link', href: 'https://elsewhere.example/' }, window);
  window.dispatchEvent(new MessageEvent('message', { data: { site: stamp(el) - 1, do: 'link', href: 'https://elsewhere.example/' }, source: frame(el).contentWindow }));
  await tick(50);
  expect(document.querySelector('to-dialog.to-link-guard dialog[open]')).toBeNull();
});

test("on a wide screen at the normal size the form sits beside the thing in hand: its left at the thing's, its top just under it", async () => {
  // 1100 wide (beforeEach), at the normal size (a rem kit/zoom.ts BASE × 16px): the page's frame is its own document, its lengths the screen's.
  expect(remScale()).toBe(BASE);
  const { el } = await editor();
  await settle(el);
  await hold(el, '3');
  await until(() => ctxOpen(el));
  ctxButton(el, 'Where it goes').click();
  const f = await form();
  // The thing, as the page said it ([20, 40, 300, 60] in the page's own lengths, the screen's).
  const fr = frame(el).getBoundingClientRect();
  const [left, top, bottom] = [fr.left + 20, fr.top + 40, fr.top + 100];
  const r = f.querySelector('dialog')!.getBoundingClientRect();
  expect(Math.abs(r.left - left), `the form's left (${r.left}) at the thing's (${left})`).toBeLessThan(3);
  // Under it where there is room, else above it: 8px from it either way.
  const below = Math.abs(r.top - (bottom + 8)) < 3;
  const above = Math.abs(r.bottom - (top - 8)) < 3;
  expect(below || above, `the form (${r.top}–${r.bottom}) beside the thing (${top}–${bottom})`).toBe(true);
  f.querySelector<HTMLDialogElement>('dialog')!.close();
});

test('a phone: the bar one row, the page the width of the screen, the URL chip’s form at the top inside the screen, its type 16px', async () => {
  await page.viewport(390, 844);
  const { el } = await editor();
  await settle(el);
  expect(el.querySelector<HTMLElement>('to-bar')!.getBoundingClientRect().height / remScale()).toBeLessThanOrEqual(60);
  expect(frame(el).getBoundingClientRect().width).toBeLessThanOrEqual(390);
  expect(document.documentElement.scrollWidth).toBeLessThanOrEqual(390);
  await hold(el, '3');
  await until(() => ctxOpen(el));
  // The bar goes by the thing as the page draws it: [20, 40, 300, 60] in the page's own lengths, the screen's.
  {
    const fr = frame(el).getBoundingClientRect();
    const [top, bottom] = [fr.top + 40, fr.top + 100];
    const c = el.querySelector('to-context.site-context .to-context')!.getBoundingClientRect();
    expect(Math.abs(c.top - bottom) < 10 || Math.abs(c.bottom - top) < 10, `the bar (${c.top}–${c.bottom}) by the thing (${top}–${bottom})`).toBe(true);
  }
  ctxButton(el, 'Where it goes').click();
  const f = await form();
  const r = f.querySelector('dialog')!.getBoundingClientRect();
  expect(r.top).toBeLessThanOrEqual(16);
  expect(r.left).toBeGreaterThanOrEqual(0);
  expect(r.right).toBeLessThanOrEqual(390);
  expect(Number.parseFloat(getComputedStyle(field(f, 'Goes to')).fontSize)).toBeGreaterThanOrEqual(16);
  f.querySelector<HTMLDialogElement>('dialog')!.close();
});

test('the frame’s own script: a tap takes a thing and outlines it and opens its words there, typed as the kernel’s runs; Enter goes on into a new paragraph and the ids move on; Escape puts them back; the editor’s word moves the outline or opens words chosen; Select All never takes the page', async () => {
  // The page drawn for the editor, run same-origin here so its document can be reached.
  const { sitePage } = await import('../view.ts');
  const { parse } = await import('../../../doc/index.ts');
  document.body.innerHTML = '';
  const f = document.createElement('iframe');
  f.style.width = '800px';
  f.style.height = '600px';
  const said: { do: string; o?: string | null; r?: number[]; part?: string; runs?: unknown; before?: unknown; after?: unknown; words?: boolean }[] = [];
  window.addEventListener('message', (e) => e.source === f.contentWindow && said.push(e.data));
  f.srcdoc = sitePage(parse(CAFE), { cur: 0, edit: { stamp: 7, held: '1' } });
  document.body.append(f);
  await until(() => said.some((m) => m.do === 'ready'), 15000);
  // Drawn with a thing in hand: outlined, and it says where it is.
  await until(() => said.some((m) => m.do === 'at' && m.o === '1' && !!m.r));
  const d = f.contentDocument!;
  const w = f.contentWindow! as Window & typeof globalThis;
  expect(d.querySelector('[data-o="1"]')!.classList.contains('site-cur')).toBe(true);
  const picks = () => said.filter((m) => m.do === 'pick');
  /** What the page last said of this kind, once it has (a message comes a moment after). */
  const lastSaid = async (what: string, like: object) => {
    await until(() => {
      const m = said.filter((x) => x.do === what).at(-1);
      return !!m && Object.entries(like).every(([k, v]) => JSON.stringify((m as Record<string, unknown>)[k]) === JSON.stringify(v));
    });
  };
  // A tap on a button: in hand, its words open in it, focused; not followed.
  const btn = d.querySelector<HTMLElement>('[data-o="2.0"]')!;
  btn.querySelector<HTMLElement>('[data-w]')!.click();
  await until(() => picks().length === 1);
  expect(picks()[0]).toMatchObject({ o: '2.0', words: true });
  expect(btn.classList.contains('site-cur')).toBe(true);
  expect(d.querySelector('[data-o="1"]')!.classList.contains('site-cur')).toBe(false);
  expect(w.location.hash).toBe('');
  const words = () => d.querySelector<ToText>('to-text')!;
  await until(() => btn.contains(words()) && !words().hidden);
  expect(d.activeElement).toBe(words().tx);
  // Plain words: no bubble; a letter typed is the button's words as runs.
  expect(words().noBubble).toBe(true);
  const type = async (s: string) => {
    for (const ch of s) {
      words().tx.dispatchEvent(new w.InputEvent('beforeinput', { inputType: 'insertText', data: ch, bubbles: true, cancelable: true }));
      await words().updateComplete;
    }
  };
  words().sel = { anchor: { block: 0, offset: 12 }, focus: { block: 0, offset: 12 } };
  await tick(20);
  await type('!');
  await lastSaid('words', { o: '2.0', part: 'label', runs: [{ t: 'See the menu!' }] });
  // A tap on the paragraph: the button's words kept, drawn as they are; the paragraph's open, rich (its bubble).
  d.querySelector<HTMLElement>('[data-o="1"]')!.click();
  await until(() => picks().length === 2);
  expect(btn.textContent).toBe('See the menu!');
  const p = d.querySelector<HTMLElement>('[data-o="1"]')!;
  await until(() => p.contains(words()));
  expect(words().noBubble).toBe(false);
  // Enter at the end: a new paragraph after it, the ids after it one on, the words typed on there.
  const len = 'Small-batch coffee, roasted on the quay every morning.'.length;
  words().sel = { anchor: { block: 0, offset: len }, focus: { block: 0, offset: len } };
  await tick(20);
  words().tx.dispatchEvent(new w.InputEvent('beforeinput', { inputType: 'insertParagraph', bubbles: true, cancelable: true }));
  await lastSaid('split', { o: '1', after: [] });
  const fresh = d.querySelector<HTMLElement>('[data-o="2"]')!;
  expect(fresh.tagName).toBe('P');
  expect(fresh.contains(words())).toBe(true);
  expect(d.querySelector('[data-o="3.0"]')!.textContent).toBe('See the menu!');
  expect(d.querySelector('[data-w="4:head"]')!.textContent).toBe('Roasted daily');
  await type('New');
  await lastSaid('words', { o: '2', part: '0', runs: [{ t: 'New' }] });
  // Escape: the words as they were when opened (none), and done.
  words().tx.dispatchEvent(new w.KeyboardEvent('keydown', { key: 'Escape', bubbles: true, cancelable: true }));
  await lastSaid('words', { o: '2', runs: [] });
  await lastSaid('end', { o: '2' });
  expect(words().hidden).toBe(true);
  // The room of a section, away from its things: let go, the outline gone; again, nothing more said.
  d.querySelector<HTMLElement>('#home > .part')!.click();
  await until(() => picks().length === 3);
  expect(picks()[2]).toMatchObject({ o: null });
  d.querySelector<HTMLElement>('#home > .part')!.click();
  await tick(30);
  expect(picks().length).toBe(3);
  // A thing that is not words (the map, on its page): in hand, no words opened.
  w.location.hash = 'find-us';
  await tick(30);
  d.querySelector<HTMLElement>('figure[data-o]')!.click();
  await until(() => picks().length === 4);
  expect(picks()[3].words).toBeUndefined();
  w.location.hash = '';
  await tick(30);
  // The editor says another is in hand: the outline moves; a word from a page drawn before is not heard.
  w.postMessage({ site: 7, held: '4' }, '*');
  await until(() => d.querySelector('[data-o="4"]')!.classList.contains('site-cur'));
  w.postMessage({ site: 6, held: '5' }, '*');
  await tick(30);
  expect(d.querySelector('[data-o="5"]')!.classList.contains('site-cur')).toBe(false);
  // The editor asks for a thing's words, chosen (a thing just put in): open, every word chosen.
  w.postMessage({ site: 7, edit: '0', all: true }, '*');
  await until(() => d.querySelector('[data-o="0"]')!.contains(words()));
  await until(() => !!words().sel && words().sel!.focus.offset === 'Harbor Coffee'.length && words().sel!.anchor.offset === 0);
  // Select All in the words is theirs (the first press the browser's); anywhere else in the page it takes nothing.
  words().sel = { anchor: { block: 0, offset: 0 }, focus: { block: 0, offset: 0 } };
  await tick(20);
  const inWords = new w.KeyboardEvent('keydown', { key: 'a', ctrlKey: true, bubbles: true, cancelable: true });
  words().tx.dispatchEvent(inWords);
  expect(inWords.defaultPrevented).toBe(false);
  const all = new w.KeyboardEvent('keydown', { key: 'a', ctrlKey: true, bubbles: true, cancelable: true });
  d.body.dispatchEvent(all);
  expect(all.defaultPrevented).toBe(true);
  // The undo keys go to the editor, even from the words.
  const z = new w.KeyboardEvent('keydown', { key: 'z', ctrlKey: true, bubbles: true, cancelable: true });
  words().tx.dispatchEvent(z);
  expect(z.defaultPrevented).toBe(true);
  await until(() => said.some((m) => m.do === 'undo'));
  f.remove();
});

test("§1 opens with the site's name in hand, its words open in the page with the caret at their end; before the page is ready too", async () => {
  const { el, last } = await editor();
  await ready(el);
  await el.focusFirst();
  await until(() => el.held === '0' && document.activeElement === frame(el));
  await tick(60);
  await typeKeys(' & Co');
  await until(() => last().includes('# Harbor Coffee & Co\n'));
  expect(document.scrollingElement!.scrollTop).toBe(0);
  // Asked before the page has said it is ready: opened once it does.
  const blank = await editor('');
  await blank.el.focusFirst();
  expect(blank.el.held).toBe('-1');
  await ready(blank.el);
  await until(() => document.activeElement === frame(blank.el));
  await tick(60);
  await typeKeys('Harbor');
  await until(() => blank.last().startsWith('# Harbor'));
});

test("the cart counts in each thing's own currency: a Price column of GBP through Intl, the head's € before the price, the total the same", async () => {
  const { sitePage } = await import('../view.ts');
  const { parse } = await import('../../../doc/index.ts');
  const cart = async (text: string, picks: number[]) => {
    document.body.innerHTML = '';
    const frame = document.createElement('iframe');
    frame.srcdoc = sitePage(parse(text), {});
    document.body.append(frame);
    await until(() => !!frame.contentDocument?.getElementById('total')?.textContent);
    const d = frame.contentDocument!;
    for (const k of picks) d.querySelector<HTMLButtonElement>(`[data-add="${k}"]`)!.click();
    return { total: d.getElementById('total')!.textContent, lines: [...d.querySelectorAll('#lines .sum')].map((x) => x.textContent) };
  };
  const pounds = new Intl.NumberFormat(undefined, { style: 'currency', currency: 'GBP' });
  const gbp = await cart('---\ncurrency: €\n---\n# Shop\n\nName | Price:money(GBP) | About | Image\n--- | --- | --- | ---\nMug | 12 |  |\nJug | 1200 |  |\n', [0, 0, 1]);
  expect(gbp).toEqual({ total: pounds.format(1224), lines: [pounds.format(24), pounds.format(1200)] });
  const eur = await cart('---\ncurrency: €\n---\n# Shop\n\nName | Price:money | About | Image\n--- | --- | --- | ---\nTea | 3 |  |\n', [0, 0]);
  expect(eur).toEqual({ total: '€6.00', lines: ['€6.00'] });
});

test('the site’s name opened in the page as it first opens waits for nothing: a menu opened before the page is ready keeps the focus (walks: site at a desktop, seed 86719297)', async () => {
  const { el } = await editor();
  void el.focusFirst();
  const look = [...el.querySelectorAll<HTMLElement>('to-bar to-menu > button')].find((b) => /^Look/.test(b.getAttribute('aria-label') ?? ''))!;
  await userEvent.click(look);
  const menu = look.parentElement!.querySelector<HTMLElement>('[popover]')!;
  await until(() => menu.matches(':popover-open'));
  await ready(el);
  await tick(200);
  expect(menu.matches(':popover-open')).toBe(true);
  expect(menu.contains(document.activeElement)).toBe(true);
});
