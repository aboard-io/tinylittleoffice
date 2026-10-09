// <to-text> in a real Chromium: typing through beforeinput, Enter and Backspace per shape, marks, chips, cards, the
// clipboard, the selection round trip for every kind of block, an IME composition, undo and redo through the op log,
// the selection bubble, and a 390px run (no page scroll on focus; the note box and the bubble inside the visual viewport).
import { expect, test } from 'vitest';
import { page } from 'vitest/browser';
import { applyAll, parse, write, type Doc } from '../../src/doc/index.ts';
import { htmlToBlocks } from '../../src/kit/clipboard.ts';
import { encodeDoc } from '../../src/kit/codec.ts';
import { History } from '../../src/kit/history.ts';
import { caret, type Sel, type Shape } from '../../src/kit/textops.ts';
import type { TextOps, ToText } from '../../src/kit/text.ts';
import { tick, until } from './helpers.ts';
import '../../src/styles.css';
import '../../src/kit/text.ts';

/** The smallest host: applies the ops with the kernel, keeps the op log, hands the blocks back. */
class Host {
  doc: Doc;
  history = new History();
  events: string[] = [];
  el: ToText;
  constructor(tlo: string, shape: Shape) {
    this.doc = parse(tlo);
    this.el = document.createElement('to-text');
    this.el.shape = shape;
    this.el.blocks = this.doc.blocks;
    this.el.addEventListener('text-ops', (e) => {
      const { ops, sel, before, kind } = (e as CustomEvent<TextOps>).detail;
      const was = this.doc;
      this.doc = applyAll(was, ops);
      this.history.record(was, ops, before, sel, kind);
      this.el.blocks = this.doc.blocks;
    });
    for (const name of ['text-enter', 'text-exit', 'text-select', 'text-embed']) this.el.addEventListener(name, () => this.events.push(name));
  }
  get tlo() {
    return write(this.doc);
  }
  step(which: 'undo' | 'redo') {
    const s = which === 'undo' ? this.history.undo() : this.history.redo();
    if (!s) return;
    this.doc = applyAll(this.doc, s.ops);
    this.el.blocks = this.doc.blocks;
    if (s.sel) this.el.sel = s.sel;
  }
}

async function mount(tlo = '', shape: Shape = 'doc', sel: Sel | null = caret(0, 0)): Promise<Host> {
  document.body.innerHTML = '';
  const h = new Host(tlo, shape);
  document.body.append(h.el);
  await h.el.updateComplete;
  h.el.focus();
  if (sel) h.el.sel = sel;
  await h.el.updateComplete;
  await tick();
  return h;
}

const input = (el: ToText, inputType: string, data: string | null = null) => el.tx.dispatchEvent(new InputEvent('beforeinput', { inputType, data, bubbles: true, cancelable: true, composed: true }));
async function typeIn(h: Host, text: string) {
  for (const ch of text) {
    input(h.el, 'insertText', ch);
    await h.el.updateComplete;
  }
}
const KEYS: Record<string, string> = { Enter: 'insertParagraph', 'Shift+Enter': 'insertLineBreak', Backspace: 'deleteContentBackward', Delete: 'deleteContentForward' };
async function key(h: Host, which: keyof typeof KEYS) {
  input(h.el, KEYS[which]);
  await h.el.updateComplete;
}
const domSel = () => {
  const s = document.getSelection()!;
  return { node: s.anchorNode, offset: s.anchorOffset, text: s.toString() };
};
function clip(data: Record<string, string>): DataTransfer {
  const dt = new DataTransfer();
  for (const [k, v] of Object.entries(data)) dt.setData(k, v);
  return dt;
}
async function paste(h: Host, data: Record<string, string>) {
  h.el.tx.dispatchEvent(new ClipboardEvent('paste', { clipboardData: clip(data), bubbles: true, cancelable: true }));
  await h.el.updateComplete;
}

test('typing goes through beforeinput into ops: words, smart quotes, the caret after them', async () => {
  const h = await mount();
  await typeIn(h, 'Hello "there"');
  expect(h.tlo).toBe('Hello “there”\n');
  expect(h.el.sel).toEqual(caret(0, 13));
  expect(domSel().offset).toBe(13);
  expect(h.el.tx.querySelector('p')!.textContent).toBe('Hello “there”');
  // Typing at the start of an empty editor made the one paragraph first.
  expect(h.history.length).toBe(1);
});

test('the marks in force: Bold with nothing selected marks what is typed next', async () => {
  const h = await mount('ab\n', 'doc', caret(0, 2));
  h.el.exec('b');
  await typeIn(h, 'cd');
  h.el.exec('b');
  await typeIn(h, 'e');
  expect(h.tlo).toBe('ab**cd**e\n');
  expect(h.el.tx.querySelector('b')!.textContent).toBe('cd');
});

test('Enter splits per shape: doc and lines split the block, a heading leaves a paragraph, a line says text-enter', async () => {
  const h = await mount('# Head\n\nwords here\n', 'doc', caret(1, 5));
  await key(h, 'Enter');
  expect(h.tlo).toBe('# Head\n\nwords\n\n here\n');
  expect(h.el.sel).toEqual(caret(2, 0));
  h.el.sel = caret(0, 4);
  await key(h, 'Enter');
  expect(h.tlo).toBe('# Head\n\n<br>\n\nwords\n\n here\n');
  expect(h.doc.blocks[1]).toMatchObject({ k: 'p', runs: [] });
  expect(parse(h.tlo).blocks).toHaveLength(4);
  const lines = await mount('- a\n- b\n', 'lines', caret(1, 1));
  await key(lines, 'Enter');
  expect(lines.tlo).toBe('- a\n- b\n-\n');
  // Enter (or a line break) on an empty item takes it out of the list instead.
  await key(lines, 'Shift+Enter');
  expect(lines.doc.blocks).toHaveLength(3);
  expect(lines.doc.blocks[2]).toMatchObject({ k: 'p', runs: [] });
  const line = await mount('one\n', 'line', caret(0, 3));
  await key(line, 'Enter');
  expect(line.tlo).toBe('one\n');
  expect(line.events).toContain('text-enter');
  // A line break inside a paragraph is '\n' in the words, drawn as <br>.
  const p = await mount('ab\n', 'doc', caret(0, 1));
  await key(p, 'Shift+Enter');
  expect(p.tlo).toBe('a\nb\n');
  expect(p.el.tx.querySelectorAll('br[data-nl]')).toHaveLength(1);
});

test('Backspace joins blocks, unlists an item, takes an embed out, and says text-exit at the start of a lines editor', async () => {
  const h = await mount('a\n\n- b\n\n```sheet\nX\n--- \n1\n```\n\nc\n', 'doc', caret(1, 0));
  await key(h, 'Backspace');
  expect(h.doc.blocks[1]).toMatchObject({ k: 'p', runs: [{ t: 'b' }] });
  await key(h, 'Backspace');
  expect(h.tlo.startsWith('ab\n')).toBe(true);
  expect(h.el.sel).toEqual(caret(0, 1));
  // The card before c goes with one Backspace at c's start; Delete at the end before a card does the same.
  h.el.sel = caret(2, 0);
  await key(h, 'Backspace');
  expect(h.doc.blocks.map((b) => b.k)).toEqual(['p', 'p']);
  const lines = await mount('- a\n', 'lines', caret(0, 0));
  await key(lines, 'Backspace');
  expect(lines.tlo).toBe('a\n');
  await key(lines, 'Backspace');
  expect(lines.events).toContain('text-exit');
  expect(lines.tlo).toBe('a\n');
});

test('marks over a selection: one op, the <b> drawn, the selection kept on the same words', async () => {
  const h = await mount('make this bold\n', 'doc', { anchor: { block: 0, offset: 5 }, focus: { block: 0, offset: 9 } });
  expect(domSel().text).toBe('this');
  h.el.exec('b');
  await h.el.updateComplete;
  await tick();
  expect(h.tlo).toBe('make **this** bold\n');
  expect(h.el.tx.querySelector('b')!.textContent).toBe('this');
  expect(domSel().text).toBe('this');
  h.el.exec('i');
  await h.el.updateComplete;
  expect(h.tlo).toBe('make ***this*** bold\n');
  h.el.exec('link', 'https://x.y/');
  await h.el.updateComplete;
  expect(h.tlo).toBe('make [***this***](https://x.y/) bold\n');
  expect(h.el.tx.querySelector('a')!.getAttribute('href')).toBe('https://x.y/');
});

test('icon and footnote chips are atomic: one character each, skipped by the caret, taken out by one Backspace', async () => {
  const h = await mount('a :star: b^[a note] c\n', 'doc', caret(0, 3));
  expect(h.el.tx.querySelector('.ic')!.getAttribute('contenteditable')).toBe('false');
  expect(h.el.tx.querySelector('.fn')!.textContent).toBe('1');
  // The caret after the icon sits in the text after it.
  expect(domSel().node!.nodeType).toBe(Node.TEXT_NODE);
  expect(domSel().offset).toBe(0);
  await key(h, 'Backspace');
  expect(h.tlo).toBe('a  b^[a note] c\n');
  h.el.sel = caret(0, 4);
  await key(h, 'Delete');
  expect(h.tlo).toBe('a  b c\n');
  // A footnote put in opens its box; its number is drawn.
  const n = await mount('x\n', 'doc', caret(0, 1));
  n.el.exec('fn');
  await n.el.updateComplete;
  await until(() => !!document.querySelector('.to-note-pop:popover-open'));
  expect(n.tlo).toBe('x^[]\n');
  const words = document.querySelector<ToText>('.to-note-words')!;
  await words.updateComplete;
  await until(() => words.hasFocus());
  words.tx.dispatchEvent(new InputEvent('beforeinput', { inputType: 'insertText', data: 'n', bubbles: true, cancelable: true }));
  await until(() => n.tlo === 'x^[n]\n');
  document.querySelector<HTMLButtonElement>('.to-note-pop [aria-label=Done]')!.click();
  await until(() => !document.querySelector('.to-note-pop:popover-open'));
  expect(n.tlo).toBe('x^[n]\n');
});

test('cards for what is not words: drawn non-editable, skipped by the caret, a tap says text-embed', async () => {
  const h = await mount('a\n\n![pic](https://p.q/r.png)\n\n---\n\n~ A -> B\n\nb\n', 'doc', caret(0, 1));
  const cards = [...h.el.tx.querySelectorAll('.tx-card')];
  expect(cards).toHaveLength(3);
  expect(cards.every((c) => (c as HTMLElement).getAttribute('contenteditable') === 'false')).toBe(true);
  h.el.sel = caret(1, 0);
  await tick();
  expect(h.el.readSel()).toEqual(caret(4, 0));
  (cards[0] as HTMLElement).click();
  expect(h.events).toContain('text-embed');
});

test('the selection round trip: every offset of every kind of block comes back as it was set', async () => {
  const h = await mount('# Head {.title}\n\nSome **bold** [words](https://x.y) :star: and^[n] more\nline two\n\n- a\n  1. b\n\n> quoted\n\n```sheet\nA\n---\n1\n```\n\n![p](https://p.q/r.png)\n\n---\n\nA | B\n--- | ---\n1 | 2\n\n~ a -> b\n\nend\n');
  for (let i = 0; i < h.doc.blocks.length; i++) {
    const b = h.doc.blocks[i];
    if (!('runs' in b)) {
      h.el.sel = caret(i, 0);
      await tick();
      const got = h.el.readSel()!;
      expect('runs' in h.doc.blocks[got.anchor.block]).toBe(true);
      continue;
    }
    const len = b.runs.reduce((n, r) => n + (r.ic || r.fn !== undefined ? 1 : r.t.length), 0);
    for (let off = 0; off <= len; off++) {
      h.el.sel = caret(i, off);
      expect(h.el.readSel()).toEqual(caret(i, off));
    }
    // A range across the block, both ways round.
    h.el.sel = { anchor: { block: i, offset: 0 }, focus: { block: i, offset: len } };
    expect(h.el.readSel()).toEqual({ anchor: { block: i, offset: 0 }, focus: { block: i, offset: len } });
  }
  h.el.sel = { anchor: { block: 1, offset: 3 }, focus: { block: 0, offset: 1 } };
  expect(h.el.readSel()).toEqual({ anchor: { block: 1, offset: 3 }, focus: { block: 0, offset: 1 } });
  expect(domSel().text).toBe('ead\nSom');
});

test('paste, each source: our HTML, a TinyLittleOffice link, an address, HTML from elsewhere, Markdown, words', async () => {
  const h = await mount('ab\n', 'doc', caret(0, 1));
  await paste(h, { 'text/plain': '# T\n\n- i\n', 'text/html': '<meta name="generator" content="TinyLittleOffice"><h1>T</h1>' });
  expect(h.tlo).toBe('aT\n\n- ib\n');
  const link = await mount('ab\n', 'doc', caret(0, 1));
  await paste(link, { 'text/plain': `https://tinylittleoffice.com/#/v1/sheet/${encodeDoc('A | B\n--- | ---\n1 | 2\n')}` });
  expect(link.doc.blocks.map((b) => b.k)).toEqual(['p', 'fence', 'p']);
  expect(link.doc.blocks[1]).toMatchObject({ lang: 'sheet' });
  expect(link.el.tx.querySelector('.tx-card-kind')!.textContent).toBe('sheet document');
  const url = await mount('ab\n', 'doc', caret(0, 1));
  await paste(url, { 'text/plain': 'https://example.com/x' });
  expect(url.tlo).toBe('a\n\nhttps://example.com/x\n\nb\n');
  const html = await mount('', 'doc');
  await paste(html, { 'text/plain': 'x y z', 'text/html': '<b id="docs-internal-guid-1" style="font-weight:normal"><p><span style="font-weight:700">x</span> <i>y</i></p><ul><li>z</li><ul><li>deep</li></ul></ul></b>' });
  expect(html.tlo).toBe('**x** *y*\n\n- z\n  - deep\n');
  const md = await mount('', 'doc');
  await paste(md, { 'text/plain': '## Two\n\n- one\n' });
  expect(md.tlo).toBe('## Two\n\n- one\n');
  const words = await mount('ab\n', 'doc', caret(0, 1));
  await paste(words, { 'text/plain': 'just words' });
  expect(words.tlo).toBe('ajust wordsb\n');
  expect(words.el.sel).toEqual(caret(0, 11));
  const line = await mount('ab\n', 'line', caret(0, 1));
  await paste(line, { 'text/plain': '## Two\n\n- one\n' });
  expect(line.tlo).toBe('aTwo oneb\n');
});

test('htmlToBlocks reads tags, styles, lists, headings, pictures and tables', () => {
  const blocks = htmlToBlocks('<h2>Head</h2><p>Plain <strong>b</strong> <em>i</em> <u>u</u> <s>s</s> <mark>h</mark> <a href="https://x.y/">link</a> <a href="https://z.w">https://z.w</a> <span style="background-color: yellow">bg</span></p><ol><li>one</li><li>two</li></ol><img src="https://p.q/r.png" alt="pic"><table><tr><th>A</th><th>N:number</th></tr><tr><td>a</td><td>1</td></tr></table><pre>  kept   spaces</pre>');
  expect(write({ head: {}, blocks })).toBe('## Head\n\nPlain **b** *i* ++u++ ~~s~~ ==h== [link](https://x.y/) https://z.w ==bg==\n\n1. one\n2. two\n\n![pic](https://p.q/r.png)\n\nA | N:number\n--- | ---\na | 1\n\nkept   spaces\n');
  // A <br> is a line break; Google Docs' bold-that-is-not is not bold.
  expect(htmlToBlocks('<p>a<br>b</p><b style="font-weight:normal">c</b>')).toEqual([{ k: 'p', runs: [{ t: 'a\nb' }] }, { k: 'p', runs: [{ t: 'c' }] }]);
});

test('copy writes the selection as TLO and as HTML with the marker; cut takes it out too', async () => {
  const h = await mount('# Head\n\nSome **bold** words\n', 'doc', { anchor: { block: 0, offset: 2 }, focus: { block: 1, offset: 9 } });
  const dt = new DataTransfer();
  h.el.tx.dispatchEvent(new ClipboardEvent('copy', { clipboardData: dt, bubbles: true, cancelable: true }));
  expect(dt.getData('text/plain')).toBe('# ad\n\nSome **bold**\n');
  expect(dt.getData('text/html')).toContain('<meta name="generator" content="TinyLittleOffice">');
  expect(dt.getData('text/html')).toContain('<p>Some <b>bold</b></p>');
  expect(h.tlo).toBe('# Head\n\nSome **bold** words\n');
  const cut = new DataTransfer();
  h.el.tx.dispatchEvent(new ClipboardEvent('cut', { clipboardData: cut, bubbles: true, cancelable: true }));
  await h.el.updateComplete;
  expect(cut.getData('text/plain')).toBe('# ad\n\nSome **bold**\n');
  expect(h.tlo).toBe('# He words\n');
  expect(h.el.sel).toEqual(caret(0, 2));
});

test('an IME composition: the browser writes into the block, compositionend reads it back as one op', async () => {
  const h = await mount('hello world\n', 'doc', caret(0, 5));
  const p = h.el.tx.querySelector('p')!;
  const textNode = [...p.childNodes].find((n) => n.nodeType === Node.TEXT_NODE) as Text;
  p.dispatchEvent(new CompositionEvent('compositionstart', { bubbles: true }));
  // What the browser does during a composition, which we let through: the DOM changes under us.
  textNode.data = 'hello ä world';
  p.dispatchEvent(new InputEvent('beforeinput', { inputType: 'insertCompositionText', data: 'ä', bubbles: true, cancelable: true }));
  expect(h.tlo).toBe('hello world\n');
  document.getSelection()!.collapse(textNode, 7);
  p.dispatchEvent(new CompositionEvent('compositionend', { data: 'ä', bubbles: true }));
  await h.el.updateComplete;
  expect(h.tlo).toBe('hello ä world\n');
  expect(h.history.length).toBe(1);
  expect(h.el.sel).toEqual(caret(0, 7));
  expect(h.el.tx.querySelector('p')!.textContent).toBe('hello ä world');
  // Android's deleteContentBackward while composing is left to the browser too. (The block was drawn anew: a new element.)
  const p2 = h.el.tx.querySelector('p')!;
  expect(p2).not.toBe(p);
  p2.dispatchEvent(new CompositionEvent('compositionstart', { bubbles: true }));
  const ev = new InputEvent('beforeinput', { inputType: 'deleteContentBackward', isComposing: true, bubbles: true, cancelable: true });
  h.el.tx.dispatchEvent(ev);
  expect(ev.defaultPrevented).toBe(false);
  ([...p2.childNodes].find((n) => n.nodeType === Node.TEXT_NODE) as Text).data = 'hello  world';
  p2.dispatchEvent(new CompositionEvent('compositionend', { data: '', bubbles: true }));
  await h.el.updateComplete;
  expect(h.tlo).toBe('hello  world\n');
});

test('undo and redo through the op log: a typing burst is one step, the caret comes back with it', async () => {
  const h = await mount('ab\n', 'doc', caret(0, 2));
  await typeIn(h, 'cd');
  await key(h, 'Enter');
  await typeIn(h, 'ef');
  expect(h.tlo).toBe('abcd\n\nef\n');
  h.step('undo');
  await h.el.updateComplete;
  expect(h.tlo).toBe('abcd\n\n<br>\n');
  expect(h.el.sel).toEqual(caret(1, 0));
  h.step('undo');
  await h.el.updateComplete;
  expect(h.tlo).toBe('abcd\n');
  expect(h.el.sel).toEqual(caret(0, 4));
  h.step('undo');
  await h.el.updateComplete;
  expect(h.tlo).toBe('ab\n');
  expect(h.el.sel).toEqual(caret(0, 2));
  expect(domSel().offset).toBe(2);
  h.step('redo');
  await h.el.updateComplete;
  expect(h.tlo).toBe('abcd\n');
  expect(h.el.sel).toEqual(caret(0, 4));
  // The browser's own undo (historyUndo) asks the host instead.
  let asked = 0;
  h.el.addEventListener('docundo', () => asked++);
  input(h.el, 'historyUndo');
  expect(asked).toBe(1);
});

test('the bar keeps the selection: Tab indents an item, Mod+B bolds, every beforeinput is prevented', async () => {
  const h = await mount('- a\n- b\n', 'lines', caret(1, 1));
  h.el.tx.dispatchEvent(new KeyboardEvent('keydown', { key: 'Tab', bubbles: true, cancelable: true }));
  await h.el.updateComplete;
  expect(h.tlo).toBe('- a\n  - b\n');
  h.el.tx.dispatchEvent(new KeyboardEvent('keydown', { key: 'Tab', shiftKey: true, bubbles: true, cancelable: true }));
  await h.el.updateComplete;
  expect(h.tlo).toBe('- a\n- b\n');
  h.el.sel = { anchor: { block: 0, offset: 0 }, focus: { block: 0, offset: 1 } };
  h.el.tx.dispatchEvent(new KeyboardEvent('keydown', { key: 'b', ctrlKey: true, bubbles: true, cancelable: true }));
  await h.el.updateComplete;
  expect(h.tlo).toBe('- **a**\n- b\n');
  const ev = new InputEvent('beforeinput', { inputType: 'insertHorizontalRule', bubbles: true, cancelable: true });
  h.el.tx.dispatchEvent(ev);
  expect(ev.defaultPrevented).toBe(true);
  const fmt = new InputEvent('beforeinput', { inputType: 'formatItalic', bubbles: true, cancelable: true });
  h.el.tx.dispatchEvent(fmt);
  await h.el.updateComplete;
  expect(h.tlo).toBe('- ***a***\n- b\n');
});

const bubble = () => document.querySelector<HTMLElement>('.tx-bubble > .to-context')!;
const bubbleOpen = () => !!bubble()?.matches(':popover-open');
const inBubble = (label: string) => bubble().querySelector<HTMLButtonElement>(`[aria-label="${label}"]`);
const range = (block: number, from: number, to: number, end = block): Sel => ({ anchor: { block, offset: from }, focus: { block: end, offset: to } });

test('the selection bubble: up under words selected, Bold pressed from it stays up and shows pressed, gone when the selection collapses', async () => {
  const h = await mount('A word or two, then this bold\n', 'doc', range(0, 20, 24));
  await until(bubbleOpen);
  const words = document.getSelection()!.getRangeAt(0).getBoundingClientRect();
  const r = bubble().getBoundingClientRect();
  expect(r.top).toBeGreaterThanOrEqual(words.bottom);
  expect(Math.abs(r.left + r.width / 2 - (words.left + words.width / 2))).toBeLessThan(2);
  expect(inBubble('Bold')!.getAttribute('aria-pressed')).toBe('false');
  // Words in a paragraph, not the whole of it: no list toggle.
  expect(inBubble('Bulleted list')).toBeNull();
  inBubble('Bold')!.click();
  await h.el.updateComplete;
  expect(h.tlo).toBe('A word or two, then **this** bold\n');
  await until(() => inBubble('Bold')?.getAttribute('aria-pressed') === 'true');
  expect(bubbleOpen()).toBe(true);
  expect(h.el.hasFocus()).toBe(true);
  expect(domSel().text).toBe('this');
  h.el.sel = caret(0, 2);
  await until(() => !bubbleOpen());
});

test('the selection bubble: not for a range inside a card, never with no-bubble, and Link from it opens the link box in its place', async () => {
  const h = await mount('a b\n\n```sheet\nXyz\n--- \n1\n```\n\nc\n', 'doc', range(0, 0, 1));
  await until(bubbleOpen);
  const gist = h.el.tx.querySelector('.tx-card .tx-card-gist')!.firstChild!;
  document.getSelection()!.setBaseAndExtent(gist, 0, gist, 2);
  await until(() => !bubbleOpen());
  // Turned off by its host.
  const off = await mount('make this bold\n', 'doc', null);
  off.el.setAttribute('no-bubble', '');
  await off.el.updateComplete;
  off.el.sel = range(0, 5, 9);
  await tick(50);
  expect(domSel().text).toBe('this');
  expect(bubbleOpen()).toBe(false);
  // Link: the bubble goes, the link box comes; setting the address brings the bubble back with Link pressed.
  const l = await mount('make this a link\n', 'doc', range(0, 5, 9));
  await until(bubbleOpen);
  inBubble('Link')!.click();
  await until(() => !!document.querySelector('.to-link-pop:popover-open'));
  expect(bubbleOpen()).toBe(false);
  const box = document.querySelector<HTMLInputElement>('.to-link-input')!;
  box.value = 'x.y';
  box.dispatchEvent(new KeyboardEvent('keydown', { key: 'Enter', bubbles: true, cancelable: true }));
  await until(() => l.tlo === 'make [this](https://x.y) a link\n');
  await until(() => bubbleOpen() && inBubble('Link')!.getAttribute('aria-pressed') === 'true');
});

test('the selection bubble: the lists over whole blocks of a doc or lines editor, not in a line; Footnote puts the mark after the words', async () => {
  const h = await mount('one\n\ntwo\n', 'doc', range(0, 0, 3, 1));
  await until(bubbleOpen);
  expect(inBubble('Bulleted list')!.getAttribute('aria-pressed')).toBe('false');
  inBubble('Bulleted list')!.click();
  await h.el.updateComplete;
  expect(h.tlo).toBe('- one\n- two\n');
  await until(() => inBubble('Bulleted list')?.getAttribute('aria-pressed') === 'true');
  inBubble('Numbered list')!.click();
  await h.el.updateComplete;
  expect(h.tlo).toBe('1. one\n2. two\n');
  await mount('one line\n', 'line', range(0, 0, 8));
  await until(bubbleOpen);
  expect(inBubble('Bold')).not.toBeNull();
  expect(inBubble('Bulleted list')).toBeNull();
  const fn = await mount('a word here\n', 'doc', range(0, 2, 6));
  await until(bubbleOpen);
  inBubble('Footnote')!.click();
  await until(() => !!document.querySelector('.to-note-pop:popover-open'));
  expect(fn.tlo).toBe('a word^[] here\n');
  expect(bubbleOpen()).toBe(false);
});

test('at 390px: focusing scrolls nothing, nothing is wider than the screen, the note box sits inside the visual viewport', async () => {
  await page.viewport(390, 844);
  try {
    const h = await mount(`${'A long paragraph of words that wraps on a phone screen more than once. '.repeat(3)}\n\n${Array.from({ length: 30 }, (_, i) => `Line ${i}^[a note on line ${i}]`).join('\n\n')}\n`, 'doc', null);
    window.scrollTo(0, 0);
    h.el.focus();
    h.el.sel = caret(0, 10);
    await tick(50);
    expect(window.scrollY).toBe(0);
    expect(document.documentElement.scrollWidth).toBeLessThanOrEqual(390);
    expect(parseFloat(getComputedStyle(h.el.tx).fontSize)).toBeGreaterThanOrEqual(16);
    expect(h.el.tx.getAttribute('enterkeyhint')).toBe('enter');
    const chip = h.el.tx.querySelectorAll<HTMLElement>('.fn')[29];
    chip.scrollIntoView();
    chip.click();
    await until(() => !!document.querySelector('.to-note-pop:popover-open'));
    const r = document.querySelector('.to-note-pop')!.getBoundingClientRect();
    const vv = window.visualViewport!;
    expect(r.left).toBeGreaterThanOrEqual(vv.offsetLeft);
    expect(r.right).toBeLessThanOrEqual(vv.offsetLeft + vv.width + 0.5);
    expect(r.top).toBeGreaterThanOrEqual(vv.offsetTop);
    expect(r.bottom).toBeLessThanOrEqual(vv.offsetTop + vv.height + 0.5);
    expect(parseFloat(getComputedStyle(document.querySelector('.to-note-words .tx')!).fontSize)).toBeGreaterThanOrEqual(16);
    document.querySelector<HTMLButtonElement>('.to-note-pop [aria-label=Done]')!.click();
    await until(() => !document.querySelector('.to-note-pop:popover-open'));
    // The box's closing puts the caret after its mark (the toggle event comes a moment later).
    await until(() => h.el.sel?.anchor.block === 30);
    // The selection bubble under words selected: inside the visual viewport, below the words (the native callout sits above), covering none of them.
    window.scrollTo(0, 0);
    h.el.sel = { anchor: { block: 0, offset: 20 }, focus: { block: 0, offset: 60 } };
    await until(bubbleOpen);
    await tick(50);
    const b = bubble().getBoundingClientRect();
    const words = document.getSelection()!.getRangeAt(0).getBoundingClientRect();
    expect(b.left).toBeGreaterThanOrEqual(vv.offsetLeft);
    expect(b.right).toBeLessThanOrEqual(vv.offsetLeft + vv.width + 0.5);
    expect(b.top).toBeGreaterThanOrEqual(words.bottom);
    expect(b.bottom).toBeLessThanOrEqual(vv.offsetTop + vv.height + 0.5);
    expect(document.documentElement.scrollWidth).toBeLessThanOrEqual(390);
  } finally {
    await page.viewport(1100, 800);
  }
});

test('the box holds the blocks and nothing else: one line of words is one line tall, whatever the shape', async () => {
  for (const shape of ['line', 'lines', 'doc'] as const) {
    const h = await mount('- [ ] One line\n', shape);
    const tx = h.el.tx;
    expect([...tx.childNodes].filter((n) => n.nodeType === Node.TEXT_NODE)).toHaveLength(0);
    expect(tx.getBoundingClientRect().height).toBeCloseTo(tx.firstElementChild!.getBoundingClientRect().height, 0);
  }
});

test('a block typed in keeps its element (updated in place, never swapped under the caret); a composed block is drawn afresh', async () => {
  const h = await mount('- one\n- two\n', 'lines', caret(0, 3));
  const li = h.el.tx.querySelector('li')!;
  await typeIn(h, 's');
  expect(h.tlo).toBe('- ones\n- two\n');
  expect(h.el.tx.querySelector('li')).toBe(li);
  expect(li.textContent).toBe('ones');
  // A letter typed never puts a stray node in: the element holds exactly what the model says.
  await key(h, 'Backspace');
  expect(h.el.tx.querySelector('li')).toBe(li);
  expect(li.textContent).toBe('one');
  // The caret still follows the model.
  expect(domSel().offset).toBe(3);
});

test('in a line, Delete at the end says text-exit (forward) and Backspace at the start says it (back); Select All twice says text-selectall', async () => {
  const h = await mount('- one\n', 'line', caret(0, 3));
  const dirs: string[] = [];
  h.el.addEventListener('text-exit', (e) => dirs.push((e as CustomEvent<{ dir: string }>).detail.dir));
  await key(h, 'Delete');
  expect(dirs).toEqual(['forward']);
  expect(h.tlo).toBe('- one\n');
  h.el.sel = caret(0, 0);
  await h.el.updateComplete;
  await key(h, 'Backspace');
  expect(dirs).toEqual(['forward', 'back']);
  let all = 0;
  h.el.addEventListener('text-selectall', () => all++);
  const press = () => {
    const ev = new KeyboardEvent('keydown', { key: 'a', ctrlKey: true, bubbles: true, cancelable: true });
    h.el.tx.dispatchEvent(ev);
    return ev.defaultPrevented;
  };
  // The caret alone: the first press is the browser's (the line), not ours.
  expect(press()).toBe(false);
  expect(all).toBe(0);
  // The line whole: the host is asked for everything.
  h.el.sel = { anchor: caret(0, 0).anchor, focus: caret(0, 3).focus };
  await h.el.updateComplete;
  expect(press()).toBe(true);
  expect(all).toBe(1);
  // An empty line counts as whole.
  const e = await mount('', 'line', caret(0, 0));
  let empties = 0;
  e.el.addEventListener('text-selectall', () => empties++);
  e.el.tx.dispatchEvent(new KeyboardEvent('keydown', { key: 'a', ctrlKey: true, bubbles: true, cancelable: true }));
  expect(empties).toBe(1);
});
