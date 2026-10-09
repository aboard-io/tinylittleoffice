// The Website editor in a real browser, edited in the page: the site drawn in its sandboxed frame the whole width
// of the editor, whose own script runs and talks back; a tap on a thing takes it in hand (the box focused, its bar
// beside it in the standard's order), a tap on it again opens its mini form, whose Done writes one op and whose
// Escape writes nothing; Insert at the top left makes each kind after the thing in hand through its form; the
// quick actions and the keys; Preview on and off; copy, cut and paste; undo puts the thing back in hand; the
// frame's own script; and at phone width the bar one row, the form inside the screen.
import { beforeEach, expect, test } from 'vitest';
import { page, userEvent } from 'vitest/browser';
import '../../../styles.css';
import '../../../kit/apps.ts';
import '../editor.ts';
import type { ToSiteEditor } from '../editor.ts';
import { templates } from '../templates.ts';
import type { ToText } from '../../../kit/text.ts';
import { tick, until } from '../../../../test/browser/helpers.ts';

const CAFE = templates().find((t) => t.id === 'cafe')!.doc;
const SHOP = templates().find((t) => t.id === 'shop')!.doc;
const MAKER = templates().find((t) => t.id === 'links-maker')!.doc;

beforeEach(async () => {
  await page.viewport(1100, 800);
});

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
const frame = (el: HTMLElement) => el.querySelector<HTMLIFrameElement>('iframe.site-frame')!;
/** The stamp the frame's page carries now. */
const stamp = (el: HTMLElement) => Number(/"stamp":(\d+)/.exec(frame(el).srcdoc)![1]);
/** A message as the frame would send it. */
const say = (el: HTMLElement, data: object, source: MessageEventSource | null = frame(el).contentWindow) => window.dispatchEvent(new MessageEvent('message', { data: { site: stamp(el), ...data }, source }));
const key = (target: EventTarget, k: string, o: KeyboardEventInit = {}) => {
  const e = new KeyboardEvent('keydown', { key: k, bubbles: true, cancelable: true, composed: true, ...o });
  target.dispatchEvent(e);
  return e;
};
const box = (el: HTMLElement) => el.querySelector<HTMLElement>('.site-page')!;
const ctxItems = (el: HTMLElement) => [...el.querySelectorAll<HTMLButtonElement>('to-context.site-context .to-context button')];
const ctxOpen = (el: HTMLElement) => !!el.querySelector('to-context.site-context .to-context:popover-open');
const ctxButton = (el: HTMLElement, label: string) => ctxItems(el).find((b) => b.getAttribute('aria-label') === label)!;
/** Thing `o` tapped in the frame, where the frame says it is. */
async function hold(el: ToSiteEditor, o: string) {
  await tick(30);
  say(el, { do: 'pick', o, r: [20, 40, 300, 60], y: 0 });
  await settle(el);
}
/** The form open now, once it is. */
async function form(): Promise<HTMLElement> {
  await until(() => !!document.querySelector('.site-form-dialog dialog[open]'));
  await tick(20);
  return document.querySelector<HTMLElement>('.site-form-dialog')!;
}
const done = (f: HTMLElement) => f.querySelector<HTMLButtonElement>('.site-form-done')!.click();
const field = (f: HTMLElement, label: string) => [...f.querySelectorAll<HTMLLabelElement>('label.site-form-field')].find((l) => l.querySelector('.site-form-label')!.textContent === label)!.querySelector('input')!;
const typeIn = (input: HTMLInputElement, value: string) => {
  input.value = value;
  input.dispatchEvent(new Event('input', { bubbles: true }));
};
const lengthOf = (x: ToText) => (x.blocks[0] && 'runs' in x.blocks[0] ? x.blocks[0].runs.reduce((a, r) => a + (r.ic || r.fn !== undefined ? 1 : r.t.length), 0) : 0);
/** Words typed into a <to-text> at its end, as the browser would: one beforeinput a letter. */
async function typeRich(x: ToText, words: string) {
  const n = lengthOf(x);
  x.sel = { anchor: { block: 0, offset: n }, focus: { block: 0, offset: n } };
  await tick();
  for (const ch of words) {
    x.tx.dispatchEvent(new InputEvent('beforeinput', { inputType: 'insertText', data: ch, bubbles: true, cancelable: true, composed: true }));
    await tick();
  }
}
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

test('the page in its frame the whole width, its script running; no panel beside it; the bar: Insert first, the look, Preview, Undo, Redo', async () => {
  const { el } = await editor();
  expect(frame(el).getAttribute('sandbox')).toBe('allow-scripts allow-popups allow-popups-to-escape-sandbox');
  expect(frame(el).srcdoc).toContain('<h1 data-o="0">Harbor Coffee</h1>');
  const ready = new Promise<boolean>((ok) => window.addEventListener('message', (e) => e.source === frame(el).contentWindow && (e.data as { do?: string }).do === 'ready' && ok(true)));
  expect(await ready).toBe(true);
  expect(el.querySelector('.site-panel, to-text, select')).toBeNull();
  expect(Math.round(frame(el).getBoundingClientRect().width)).toBe(Math.round(el.getBoundingClientRect().width));
  const bar = [...el.querySelectorAll<HTMLElement>('to-bar.site-bar > *')].map((b) => b.getAttribute('aria-label') ?? b.textContent!.trim());
  expect(el.querySelector('to-bar.site-bar > :first-child')!.tagName).toBe('TO-INSERT');
  expect(bar.slice(-3)).toEqual(['Preview', 'Undo', 'Redo']);
  // What a website can take; a Quick Links page takes less.
  expect(await insertLabels(el)).toEqual(['Page', 'Section', 'Heading', 'Paragraph', 'Button', 'Big link', 'Web Picture', 'Big icon', 'Web Embed', 'Tiny Little Office Doc', 'Products']);
  const links = await editor(MAKER);
  expect(await insertLabels(links.el)).toEqual(['Paragraph', 'Button', 'Small link', 'Web Picture', 'Big icon', 'Web Embed']);
});

test('a tap takes a thing in hand: the box focused, its bar beside it in the standard’s order; a button has left and right; stale or foreign messages change nothing', async () => {
  const { el } = await editor();
  await hold(el, '2.1');
  expect(el.held).toBe('2.1');
  expect(document.activeElement).toBe(box(el));
  await until(() => ctxOpen(el));
  expect(ctxItems(el).map((b) => b.getAttribute('aria-label'))).toEqual(['Edit', 'Move up', 'Move down', 'Move left', 'Move right', 'Duplicate', 'Delete']);
  expect(ctxButton(el, 'Move right').disabled).toBe(true);
  expect(ctxButton(el, 'Move left').disabled).toBe(false);
  // Its buttons never take the focus; it hangs by the thing as the frame says it is.
  const down = new MouseEvent('mousedown', { bubbles: true, cancelable: true });
  ctxButton(el, 'Move left').dispatchEvent(down);
  expect(down.defaultPrevented).toBe(true);
  const f = frame(el).getBoundingClientRect();
  const bar = el.querySelector<HTMLElement>('to-context.site-context .to-context')!.getBoundingClientRect();
  expect(bar.top).toBeGreaterThanOrEqual(f.top + 100 - 1);
  // A paragraph has no left or right; the home page's name can only be edited.
  await hold(el, '1');
  expect(ctxItems(el).map((b) => b.getAttribute('aria-label'))).toEqual(['Edit', 'Move up', 'Move down', 'Duplicate', 'Delete']);
  await hold(el, '0');
  expect(ctxItems(el).filter((b) => b.disabled).map((b) => b.getAttribute('aria-label'))).toEqual(['Move up', 'Move down', 'Duplicate', 'Delete']);
  // From elsewhere, or from a page drawn before: nothing.
  say(el, { do: 'pick', o: '3', r: [0, 0, 1, 1] }, window);
  window.dispatchEvent(new MessageEvent('message', { data: { site: stamp(el) - 1, do: 'pick', o: '3' }, source: frame(el).contentWindow }));
  await settle(el);
  expect(el.held).toBe('0');
  // Escape lets go: the bar gone, the focus back on the frame.
  expect(key(box(el), 'Escape').defaultPrevented).toBe(true);
  await settle(el);
  expect(el.held).toBeNull();
  expect(ctxOpen(el)).toBe(false);
  expect(document.activeElement).toBe(frame(el));
});

test('a heading’s form: a tap on the thing in hand opens it near the thing; Done writes the words as one op; Escape writes nothing; Done unchanged writes nothing', async () => {
  const { el, changes, last } = await editor();
  await hold(el, '8');
  say(el, { do: 'edit', o: '8' });
  let f = await form();
  expect(f.querySelector('h2')!.textContent).toBe('Section');
  const words = field(f, 'Words');
  expect(words.value).toBe('Coffee');
  expect(document.activeElement).toBe(words);
  expect(Number.parseFloat(getComputedStyle(words).fontSize)).toBeGreaterThanOrEqual(16);
  // Hung under the thing on a wide screen.
  expect(f.querySelector('dialog')!.getBoundingClientRect().top).toBeGreaterThanOrEqual(frame(el).getBoundingClientRect().top + 100);
  // Done unchanged: nothing written.
  done(f);
  await settle(el);
  expect(changes).toEqual([]);
  // Escape: nothing.
  say(el, { do: 'edit', o: '8' });
  f = await form();
  typeIn(field(f, 'Words'), 'Tea');
  await userEvent.keyboard('{Escape}');
  await until(() => !document.querySelector('.site-form-dialog'));
  expect(changes).toEqual([]);
  // Enter's form, and its Done: the heading's words, plain; the thing still in hand; one undo takes it back.
  key(box(el), 'Enter');
  f = await form();
  typeIn(field(f, 'Words'), 'Hot **drinks**');
  f.querySelector('form')!.requestSubmit();
  await settle(el);
  expect(last()).toContain('## Hot \\*\\*drinks\\*\\*\n');
  expect(changes.length).toBe(1);
  expect(el.held).toBe('8');
  el.dispatchEvent(new CustomEvent('docundo', { cancelable: true }));
  await settle(el);
  expect(last()).toBe(CAFE);
});

test('a paragraph’s form is rich words: marks, a line break; a button’s and a small link’s are words, where it goes, an icon; a big link’s words link where it goes', async () => {
  const { el, last } = await editor();
  // The paragraph.
  await hold(el, '1');
  key(box(el), 'Enter');
  let f = await form();
  const x = f.querySelector<ToText>('to-text')!;
  expect(x.getAttribute('shape')).toBe('line');
  expect(x.contains(document.activeElement)).toBe(true);
  await typeRich(x, ' Fresh');
  const n = lengthOf(x);
  x.sel = { anchor: { block: 0, offset: n - 5 }, focus: { block: 0, offset: n } };
  x.exec('b');
  await tick();
  x.sel = { anchor: { block: 0, offset: n }, focus: { block: 0, offset: n } };
  x.dispatchEvent(new CustomEvent('text-enter', { detail: { shift: true }, bubbles: true }));
  await typeRich(x, 'Daily.');
  done(f);
  await settle(el);
  expect(last()).toContain('Small-batch coffee, roasted on the quay every morning. **Fresh**\nDaily.\n\n> See the menu');
  // A button: its words, where it goes (the site's pages offered), its icon.
  await hold(el, '2.1');
  key(box(el), 'Enter');
  f = await form();
  expect(field(f, 'Words').value).toBe('Find us');
  const url = field(f, 'Goes to');
  expect(url.value).toBe('#find-us');
  expect([...f.querySelectorAll('datalist option')].map((o) => (o as HTMLOptionElement).value)).toEqual(['#home', '#menu', '#coffee', '#pastry', '#find-us']);
  expect(f.querySelector('.site-form-icon button')!.textContent).toContain('No icon');
  typeIn(field(f, 'Words'), 'Where | when');
  typeIn(url, 'https://maps.example/quay');
  done(f);
  await settle(el);
  expect(last()).toContain('> See the menu | #menu\n> Where ¦ when | https://maps.example/quay\n');
  // A big link: its words rich (marks alone), a line under them, where it goes.
  await hold(el, '3');
  key(box(el), 'Enter');
  f = await form();
  const [head, detail] = [...f.querySelectorAll<ToText>('to-text')];
  expect(head.marksOnly).toBe(true);
  await typeRich(head, '!');
  await typeRich(detail, ' (really)');
  typeIn(field(f, 'Goes to'), '#menu');
  done(f);
  await settle(el);
  expect(last()).toContain('- :coffee: [Roasted daily!](#menu) | Never more than a week old (really)\n');
  // A small link on a Quick Links page.
  const links = await editor(MAKER);
  await hold(links.el, '4');
  key(box(links.el), 'Enter');
  f = await form();
  expect(f.querySelector('h2')!.textContent).toBe('Small link');
  expect(field(f, 'Words').value).toBe('Instagram');
  typeIn(field(f, 'Goes to'), 'https://instagram.com/ada.diaz');
  done(f);
  await settle(links.el);
  expect(links.last()).toContain('- :camera: Instagram | https://instagram.com/ada.diaz\n');
});

test('a picture’s form is the kit’s Web Picture, a thing from the web’s its Web Embed; the shop’s form holds its currency and where orders go', async () => {
  const { el, last } = await editor('# Site\n\n![A cup](https://x.example/cup.png)\n\nhttps://youtu.be/dQw4w9WgXcQ\n');
  await hold(el, '1');
  key(box(el), 'Enter');
  await until(() => !!document.querySelector('.to-ask-picture dialog[open]'));
  const url = document.querySelector<HTMLInputElement>('.to-ask-picture .to-ask-url')!;
  expect(url.value).toBe('https://x.example/cup.png');
  typeIn(url, 'https://x.example/mug.png');
  document.querySelector<HTMLFormElement>('.to-ask-picture form')!.requestSubmit();
  await settle(el);
  expect(last()).toContain('![A cup](https://x.example/mug.png)\n');
  await hold(el, '2');
  key(box(el), 'Enter');
  await until(() => !!document.querySelector('.to-ask-embed dialog[open]'));
  expect(document.querySelector<HTMLInputElement>('.to-ask-embed .to-ask-url')!.value).toBe('https://youtu.be/dQw4w9WgXcQ');
  document.querySelector<HTMLDialogElement>('.to-ask-embed dialog')!.close();
  await settle(el);
  // The shop.
  const shop = await editor(SHOP);
  const at = frame(shop.el).srcdoc.match(/<div class="shop" data-o="(\d+)"/)![1];
  await hold(shop.el, at);
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

test('Insert at the top left: each kind’s form at once, put in after the thing in hand when Done, nothing when it is closed', async () => {
  const { el, changes, last } = await editor();
  // A paragraph after the site's line.
  await hold(el, '1');
  await insert(el, 'Paragraph');
  let f = await form();
  await typeRich(f.querySelector<ToText>('to-text')!, 'Open every day.');
  done(f);
  await settle(el);
  expect(last()).toContain('every morning.\n\nOpen every day.\n\n> See the menu');
  expect(el.held).toBe('2');
  // A button after a button: in its row.
  await hold(el, '3.0');
  await insert(el, 'Button');
  f = await form();
  typeIn(field(f, 'Words'), 'Call');
  typeIn(field(f, 'Goes to'), 'tel:+12075550134');
  done(f);
  await settle(el);
  expect(last()).toContain('> See the menu | #menu\n> Call | tel:+12075550134\n> Find us | #find-us\n');
  expect(el.held).toBe('3.1');
  // A big link, a section, a heading, a page: each its form, each after the thing in hand (a page after its page).
  await insert(el, 'Big link');
  f = await form();
  await typeRich(f.querySelectorAll<ToText>('to-text')[0], 'Gift cards');
  done(f);
  await settle(el);
  expect(last()).toContain('> Find us | #find-us\n\n- Gift cards\n- :coffee:');
  await hold(el, '9');
  await insert(el, 'Section');
  f = await form();
  typeIn(field(f, 'Words'), 'Tea');
  done(f);
  await settle(el);
  expect(last()).toContain('# Menu\n\nWhat we pour, and what we bake.\n\n## Tea\n\n## Coffee');
  await insert(el, 'Heading');
  f = await form();
  done(f);
  await settle(el);
  expect(last()).toContain('## Tea\n\n### Heading\n\n## Coffee');
  await insert(el, 'Page');
  f = await form();
  typeIn(field(f, 'Words'), 'Hours');
  done(f);
  await settle(el);
  expect(last()).toContain('- Sourdough toast, butter and jam | 4.00\n\n# Hours\n\n# Find us');
  // Closed without Done: nothing.
  const before = changes.length;
  await insert(el, 'Paragraph');
  f = await form();
  f.querySelector<HTMLDialogElement>('dialog')!.close();
  await settle(el);
  await insert(el, 'Web Picture');
  await until(() => !!document.querySelector('.to-ask-picture dialog[open]'));
  document.querySelector<HTMLDialogElement>('.to-ask-picture dialog')!.close();
  await settle(el);
  expect(changes.length).toBe(before);
  // With nothing in hand: at the end of the section on view.
  key(box(el), 'Escape');
  await settle(el);
  expect(el.held).toBeNull();
  say(el, { do: 'page', id: 'find-us' });
  await insert(el, 'Paragraph');
  f = await form();
  await typeRich(f.querySelector<ToText>('to-text')!, 'See you.');
  done(f);
  await settle(el);
  expect(last().trimEnd().endsWith('> Email us | mailto:hello@harborcoffee.example\n\nSee you.')).toBe(true);
});

test('the quick actions and their keys: move up, down, left and right, duplicate, delete, Up and Down; undo puts the thing back in hand', async () => {
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
  await hold(el, '17');
  clip('paste', copied);
  await settle(el);
  expect(last()).toContain('#map=17/43.6567/-70.2484\n\n> Find us | #find-us\n\n> Email us');
  expect(el.held).toBe('18.0');
  const cut = clip('cut');
  await settle(el);
  expect(cut.getData('text/plain')).toBe('> Find us | #find-us\n');
  expect(last()).toBe(CAFE);
});

test('real taps inside the frame: a tap takes a button in hand, a tap on it again opens its form; the nav still goes from page to page', async () => {
  const { el } = await editor();
  const f = inFrame(el);
  await f.getByRole('link', { name: 'See the menu' }).click();
  await until(() => el.held === '2.0');
  await until(() => ctxOpen(el));
  await f.getByRole('link', { name: 'See the menu' }).click();
  const opened = await form();
  expect(field(opened, 'Words').value).toBe('See the menu');
  opened.querySelector<HTMLDialogElement>('dialog')!.close();
  await settle(el);
  await f.getByRole('navigation', { name: 'Pages' }).getByRole('link', { name: 'Menu' }).click();
  await until(() => el.cur === 1);
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

test('a phone: the bar one row, the page the width of the screen, a form at the top inside the screen, its type 16px', async () => {
  await page.viewport(390, 844);
  const { el } = await editor();
  await settle(el);
  expect(el.querySelector<HTMLElement>('to-bar')!.getBoundingClientRect().height).toBeLessThanOrEqual(60);
  expect(frame(el).getBoundingClientRect().width).toBeLessThanOrEqual(390);
  expect(document.documentElement.scrollWidth).toBeLessThanOrEqual(390);
  await hold(el, '3');
  key(box(el), 'Enter');
  const f = await form();
  const r = f.querySelector('dialog')!.getBoundingClientRect();
  expect(r.top).toBeLessThanOrEqual(16);
  expect(r.left).toBeGreaterThanOrEqual(0);
  expect(r.right).toBeLessThanOrEqual(390);
  expect(Number.parseFloat(getComputedStyle(field(f, 'Goes to')).fontSize)).toBeGreaterThanOrEqual(16);
  expect(Number.parseFloat(getComputedStyle(f.querySelector<HTMLElement>('to-text .tx')!).fontSize)).toBeGreaterThanOrEqual(16);
  f.querySelector<HTMLDialogElement>('dialog')!.close();
});

test('the frame’s own script: a tap takes a thing and outlines it, a tap again asks for its form, a section’s room takes its heading; the editor’s word moves the outline; Select All never takes the page', async () => {
  // The page drawn for the editor, run same-origin here so its document can be reached.
  const { sitePage } = await import('../view.ts');
  const { parse } = await import('../../../doc/index.ts');
  document.body.innerHTML = '';
  const f = document.createElement('iframe');
  f.style.width = '800px';
  f.style.height = '600px';
  const said: { do: string; o?: string | null; r?: number[] }[] = [];
  window.addEventListener('message', (e) => e.source === f.contentWindow && said.push(e.data));
  f.srcdoc = sitePage(parse(CAFE), { cur: 0, edit: { stamp: 7, held: '1' } });
  document.body.append(f);
  await until(() => said.some((m) => m.do === 'ready'));
  // Drawn with a thing in hand: outlined, and it says where it is.
  await until(() => said.some((m) => m.do === 'at' && m.o === '1' && !!m.r));
  const d = f.contentDocument!;
  const w = f.contentWindow! as Window & typeof globalThis;
  expect(d.querySelector('[data-o="1"]')!.classList.contains('site-cur')).toBe(true);
  const btn = d.querySelector<HTMLElement>('[data-o="2.0"]')!;
  btn.click();
  await until(() => said.some((m) => m.do === 'pick'));
  expect(said.find((m) => m.do === 'pick')).toMatchObject({ o: '2.0' });
  expect(btn.classList.contains('site-cur')).toBe(true);
  expect(d.querySelector('[data-o="1"]')!.classList.contains('site-cur')).toBe(false);
  // Not followed: the page shown is the same.
  expect(w.location.hash).toBe('');
  btn.click();
  await until(() => said.some((m) => m.do === 'edit'));
  expect(said.find((m) => m.do === 'edit')).toMatchObject({ o: '2.0' });
  // The room of a section, away from its things: its heading.
  d.querySelector<HTMLElement>('#home > .part')!.click();
  await until(() => said.filter((m) => m.do === 'pick').length === 2);
  expect(said.filter((m) => m.do === 'pick')[1]).toMatchObject({ o: '0' });
  // The editor says another is in hand: the outline moves; a word from a page drawn before is not heard.
  w.postMessage({ site: 7, held: '3' }, '*');
  await until(() => d.querySelector('[data-o="3"]')!.classList.contains('site-cur'));
  w.postMessage({ site: 6, held: '4' }, '*');
  await tick(30);
  expect(d.querySelector('[data-o="4"]')!.classList.contains('site-cur')).toBe(false);
  const all = new w.KeyboardEvent('keydown', { key: 'a', ctrlKey: true, bubbles: true, cancelable: true });
  d.body.dispatchEvent(all);
  expect(all.defaultPrevented).toBe(true);
  f.remove();
});
