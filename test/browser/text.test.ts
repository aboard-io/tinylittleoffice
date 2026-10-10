// <to-text> in a real Chromium: typing through beforeinput, Enter and Backspace per shape, marks, chips, cards, the
// clipboard, the selection round trip for every kind of block, an IME composition, undo and redo through the op log,
// the selection bubble, footnote marks asking their host for the note (`text-note`: the notes are typed where the
// host draws them, kit/notes.ts, tested with the hosts), and a 390px run (no page scroll on focus; the bubble inside
// the visual viewport).
import { expect, test } from 'vitest';
import { page } from 'vitest/browser';
import { applyAll, parse, write, type Doc } from '../../src/doc/index.ts';
import { htmlToBlocks } from '../../src/kit/clipboard.ts';
import { encodeDoc } from '../../src/kit/codec.ts';
import { History } from '../../src/kit/history.ts';
import { caret, type Sel, type Shape } from '../../src/kit/textops.ts';
import type { NoteAt, TextOps, ToText } from '../../src/kit/text.ts';
import { tick, until } from './helpers.ts';
import '../../src/styles.css';
import '../../src/kit/text.ts';
import { appOf } from '../../src/kit/apps.ts';

/** The smallest host: applies the ops with the kernel, keeps the op log, hands the blocks back. */
class Host {
  doc: Doc;
  history = new History();
  events: string[] = [];
  /** What each `text-note` asked for. */
  notes: NoteAt[] = [];
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
    this.el.addEventListener('text-note', (e) => this.notes.push((e as CustomEvent<NoteAt>).detail));
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

async function mount(tlo = '', shape: Shape = 'doc', sel: Sel | null = caret(0, 0), notes = false): Promise<Host> {
  document.body.innerHTML = '';
  const h = new Host(tlo, shape);
  h.el.notes = notes;
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
  expect(h.tlo).toBe('# Head\n\nwords\n\n\\ here\n');
  expect(h.el.sel).toEqual(caret(2, 0));
  h.el.sel = caret(0, 4);
  await key(h, 'Enter');
  expect(h.tlo).toBe('# Head\n\n<br>\n\nwords\n\n\\ here\n');
  expect(h.doc.blocks[1]).toMatchObject({ k: 'p', runs: [] });
  expect(parse(h.tlo).blocks).toHaveLength(4);
  const lines = await mount('- a\n- b\n', 'lines', caret(1, 1));
  await key(lines, 'Enter');
  expect(lines.tlo).toBe('- a\n- b\n-\n');
  // Enter on an empty item takes it out of the list instead.
  await key(lines, 'Enter');
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

test('a heading pulled up into an empty line stays a heading: one <h1> left, nothing stale styled as it, the caret at its start', async () => {
  for (const how of ['Delete', 'Backspace'] as const) {
    const h = await mount('# Title\n', 'doc', caret(0, 0));
    // The empty line above the heading, as Enter at its start leaves it.
    await key(h, 'Enter');
    expect(h.doc.blocks.map((b) => b.k)).toEqual(['p', 'h']);
    const heading = h.el.tx.querySelector('h1')!;
    h.el.sel = how === 'Delete' ? caret(0, 0) : caret(1, 0);
    await h.el.updateComplete;
    await key(h, how);
    await tick();
    expect(h.tlo).toBe('# Title\n');
    expect(h.el.tx.children).toHaveLength(1);
    expect(h.el.tx.querySelectorAll('h1')).toHaveLength(1);
    expect(h.el.tx.querySelector('h1')).toBe(heading);
    expect(heading.textContent).toBe('Title');
    expect(h.el.tx.querySelector('p')).toBeNull();
    expect(h.el.sel).toEqual(caret(0, 0));
    expect(domSel().node && heading.contains(domSel().node!)).toBe(true);
  }
  // And the empty line below the heading goes the same way, the caret at the heading's end.
  const below = await mount('# Title\n', 'doc', caret(0, 5));
  await key(below, 'Enter');
  await key(below, 'Backspace');
  expect(below.tlo).toBe('# Title\n');
  expect(below.el.tx.children).toHaveLength(1);
  expect(below.el.tx.firstElementChild!.tagName).toBe('H1');
  expect(below.el.sel).toEqual(caret(0, 5));
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
  // A footnote put in is its mark, numbered; the host is asked for its note (whose words it draws and takes, kit/notes.ts).
  const n = await mount('x\n', 'doc', caret(0, 1), true);
  n.el.exec('fn');
  await n.el.updateComplete;
  expect(n.tlo).toBe('x^[]\n');
  expect(n.notes).toEqual([{ block: 0, nth: 0 }]);
  expect(n.el.tx.querySelector('.fn')!.textContent).toBe('1');
  expect(document.querySelector('to-note-pop, .to-note-pop')).toBeNull();
  // Where the host draws no notes, there is no footnote to put in.
  const none = await mount('x\n', 'doc', caret(0, 1));
  none.el.exec('fn');
  await none.el.updateComplete;
  expect(none.tlo).toBe('x\n');
});

test('a footnote mark asks its host for its note: a tap, or Enter on it, says text-note with the block and which of its marks', async () => {
  const h = await mount('one^[a] two^[b]\n\nthree^[c]\n', 'doc', caret(0, 0), true);
  const chips = h.el.tx.querySelectorAll<HTMLElement>('.fn');
  expect([...chips].map((c) => c.textContent)).toEqual(['1', '2', '3']);
  chips[1].click();
  chips[2].dispatchEvent(new KeyboardEvent('keydown', { key: 'Enter', bubbles: true, cancelable: true }));
  expect(h.notes).toEqual([{ block: 0, nth: 1 }, { block: 1, nth: 0 }]);
  // The mark numbers on from where the host says its span starts.
  h.el.noteStart = 4;
  await h.el.updateComplete;
  expect(h.el.tx.querySelector('.fn')!.textContent).toBe('5');
  expect(h.tlo).toBe('one^[a] two^[b]\n\nthree^[c]\n');
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

test('paste, each source: our HTML, a Tiny Little Office link, an address, HTML from elsewhere, Markdown, words', async () => {
  const h = await mount('ab\n', 'doc', caret(0, 1));
  await paste(h, { 'text/plain': '# T\n\n- i\n', 'text/html': '<meta name="generator" content="TinyLittleOffice"><h1>T</h1>' });
  expect(h.tlo).toBe('aT\n\n- ib\n');
  const link = await mount('ab\n', 'doc', caret(0, 1));
  await paste(link, { 'text/plain': `https://tinylittleoffice.com/#/v1/sheet/${encodeDoc('A | B\n--- | ---\n1 | 2\n')}` });
  expect(link.doc.blocks.map((b) => b.k)).toEqual(['p', 'fence', 'p']);
  expect(link.doc.blocks[1]).toMatchObject({ lang: 'sheet' });
  expect(link.el.tx.querySelector('.tx-card-kind')!.textContent).toBe(`A ${appOf('sheet')!.noun}`);
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

test('the spaces at a copied fragment\'s ends survive the paste; a copy across whole blocks still pastes as blocks', async () => {
  // "a sentence " with its space, cut from the middle of a paragraph and pasted inside other words.
  const h = await mount('First a sentence here.\n\nSecond.\n', 'doc', { anchor: { block: 0, offset: 6 }, focus: { block: 0, offset: 17 } });
  const dt = new DataTransfer();
  h.el.tx.dispatchEvent(new ClipboardEvent('cut', { clipboardData: dt, bubbles: true, cancelable: true }));
  await h.el.updateComplete;
  expect(h.tlo).toBe('First here.\n\nSecond.\n');
  h.el.sel = caret(1, 0);
  await h.el.updateComplete;
  await paste(h, { 'text/plain': dt.getData('text/plain'), 'text/html': dt.getData('text/html') });
  expect(h.tlo).toBe('First here.\n\na sentence Second.\n');
  expect(h.el.sel).toEqual(caret(1, 11));
  // A leading space too, and the marks with it.
  const m = await mount('one **two** three\n', 'doc', { anchor: { block: 0, offset: 3 }, focus: { block: 0, offset: 8 } });
  const md = new DataTransfer();
  m.el.tx.dispatchEvent(new ClipboardEvent('copy', { clipboardData: md, bubbles: true, cancelable: true }));
  m.el.sel = caret(0, 0);
  await m.el.updateComplete;
  await paste(m, { 'text/plain': md.getData('text/plain'), 'text/html': md.getData('text/html') });
  expect(m.doc.blocks[0]).toMatchObject({ runs: [{ t: ' ' }, { t: 'two', b: true }, { t: ' one ' }, { t: 'two', b: true }, { t: ' three' }] });
  // Two whole blocks copied go in as blocks, as before: the first one's words join the line, the second stands on its own.
  const w = await mount('# Head\n\nBody\n\nend\n', 'doc', { anchor: { block: 0, offset: 0 }, focus: { block: 1, offset: 4 } });
  const wd = new DataTransfer();
  w.el.tx.dispatchEvent(new ClipboardEvent('copy', { clipboardData: wd, bubbles: true, cancelable: true }));
  expect(wd.getData('text/html')).not.toContain('tlo-runs');
  w.el.sel = caret(2, 3);
  await w.el.updateComplete;
  await paste(w, { 'text/plain': wd.getData('text/plain'), 'text/html': wd.getData('text/html') });
  expect(w.tlo).toBe('# Head\n\nBody\n\nendHead\n\nBody\n');
  expect(w.doc.blocks).toHaveLength(4);
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

test('marks-only: the bubble has the five marks and nothing else, Mod+K is no link, and a paste brings words without their link', async () => {
  document.body.innerHTML = '';
  const h = new Host('A label here\n', 'line');
  h.el.marksOnly = true;
  document.body.append(h.el);
  await h.el.updateComplete;
  h.el.focus();
  h.el.sel = range(0, 2, 7);
  await until(bubbleOpen);
  expect([...bubble().querySelectorAll('button')].map((b) => b.getAttribute('aria-label'))).toEqual(['Bold', 'Italic', 'Underline', 'Strikethrough', 'Highlight']);
  inBubble('Underline')!.click();
  await h.el.updateComplete;
  expect(h.tlo).toBe('A ++label++ here\n');
  const k = new KeyboardEvent('keydown', { key: 'k', ctrlKey: true, bubbles: true, cancelable: true });
  h.el.tx.dispatchEvent(k);
  expect(k.defaultPrevented).toBe(false);
  h.el.sel = caret(0, 0);
  await h.el.updateComplete;
  await paste(h, { 'text/html': '<a href="https://example.com">site</a>', 'text/plain': 'site' });
  expect(h.tlo).toBe('siteA ++label++ here\n');
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
  // Footnote is offered only where the host draws the notes; from the bubble the mark goes after the words, and the host is asked for its note.
  expect(inBubble('Footnote')).toBeNull();
  const fn = await mount('a word here\n', 'doc', range(0, 2, 6), true);
  await until(bubbleOpen);
  inBubble('Footnote')!.click();
  await until(() => fn.tlo === 'a word^[] here\n');
  expect(fn.notes).toEqual([{ block: 0, nth: 0 }]);
  await until(() => !bubbleOpen());
});

test('at 390px: focusing scrolls nothing, nothing is wider than the screen, the bubble sits inside the visual viewport', async () => {
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
    const vv = window.visualViewport!;
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

/* ---------- after the editing audit (docs/editing.md §1, §2, §7) ---------- */

const press = (target: EventTarget, init: KeyboardEventInit) => {
  const ev = new KeyboardEvent('keydown', { bubbles: true, cancelable: true, ...init });
  target.dispatchEvent(ev);
  return ev;
};

test('Mod+A in lines: the first press is the browser\'s, with the box already whole the host is asked for everything; a doc takes it itself', async () => {
  const h = await mount('- one\n- two\n', 'lines', caret(0, 1));
  let all = 0;
  h.el.addEventListener('text-selectall', () => all++);
  expect(press(h.el.tx, { key: 'a', ctrlKey: true }).defaultPrevented).toBe(false);
  expect(all).toBe(0);
  h.el.sel = { anchor: { block: 0, offset: 0 }, focus: { block: 1, offset: 3 } };
  await h.el.updateComplete;
  expect(press(h.el.tx, { key: 'a', ctrlKey: true }).defaultPrevented).toBe(true);
  expect(all).toBe(1);
  // A doc takes Select All itself, every press: the whole document as its own selection, the host not asked.
  const d = await mount('a\n\nb\n', 'doc', range(0, 0, 1));
  d.el.addEventListener('text-selectall', () => all++);
  expect(press(d.el.tx, { key: 'a', ctrlKey: true }).defaultPrevented).toBe(true);
  expect(d.el.sel).toEqual({ anchor: { block: 0, offset: 0 }, focus: { block: 1, offset: 1 } });
  expect(press(d.el.tx, { key: 'a', ctrlKey: true }).defaultPrevented).toBe(true);
  expect(all).toBe(1);
});

test('Escape steps out one step per press: the link box closes (and the key stops), then a range collapses to its focus, then the host hears text-escape', async () => {
  const h = await mount('see [this](https://x.y) words\n', 'doc', caret(0, 0));
  // The caret put in the link by the DOM (a tap): the link bubble comes.
  const linked = [...h.el.tx.querySelector('a')!.childNodes].find((n) => n.nodeType === Node.TEXT_NODE)!;
  document.getSelection()!.collapse(linked, 2);
  await until(() => !!document.querySelector('.to-link-pop:popover-open'));
  let escapes = 0;
  let reached = 0;
  h.el.addEventListener('text-escape', () => escapes++);
  document.body.addEventListener('keydown', () => reached++);
  expect(press(h.el.tx, { key: 'Escape' }).defaultPrevented).toBe(true);
  expect(document.querySelector('.to-link-pop:popover-open')).toBeNull();
  expect(reached + escapes).toBe(0);
  // A range: it collapses to where the selection was going.
  h.el.sel = range(0, 9, 14);
  await h.el.updateComplete;
  await tick();
  expect(press(h.el.tx, { key: 'Escape' }).defaultPrevented).toBe(true);
  expect(h.el.sel).toEqual(caret(0, 14));
  expect(reached + escapes).toBe(0);
  // A caret: the host is told and the key goes on.
  expect(press(h.el.tx, { key: 'Escape' }).defaultPrevented).toBe(false);
  expect(escapes).toBe(1);
  expect(reached).toBe(1);
});

test('Escape in the address box gives the focus and the selection back to the words; a tap outside hides the box', async () => {
  const h = await mount('make this a link\n', 'doc', range(0, 5, 9));
  h.el.exec('link');
  await until(() => document.activeElement?.classList.contains('to-link-input') ?? false);
  press(document.activeElement!, { key: 'Escape' });
  await tick(30);
  expect(h.el.hasFocus()).toBe(true);
  expect(h.el.sel).toEqual(range(0, 5, 9));
  expect(domSel().text).toBe('this');
  // Asked again, then a tap on the page outside the box and the editor.
  h.el.exec('link');
  await until(() => !!document.querySelector('.to-link-pop:popover-open'));
  const out = document.createElement('div');
  out.style.height = '40px';
  document.body.append(out);
  out.dispatchEvent(new PointerEvent('pointerdown', { bubbles: true }));
  await until(() => !document.querySelector('.to-link-pop:popover-open'));
});

test('Shift+Enter: a line break in a paragraph, an item and a quote, in doc and lines; a heading splits; a line says shift in text-enter', async () => {
  const h = await mount('- ab\n\n> cd\n\n# ef\n', 'doc', caret(0, 1));
  await key(h, 'Shift+Enter');
  expect(h.doc.blocks[0]).toMatchObject({ k: 'li', runs: [{ t: 'a\nb' }] });
  h.el.sel = caret(1, 1);
  await key(h, 'Shift+Enter');
  expect(h.doc.blocks[1]).toMatchObject({ k: 'quote', runs: [{ t: 'c\nd' }] });
  h.el.sel = caret(2, 1);
  await key(h, 'Shift+Enter');
  expect(h.doc.blocks).toHaveLength(4);
  // What is written reads back as the same blocks.
  expect(parse(h.tlo).blocks.slice(0, 2)).toEqual(h.doc.blocks.slice(0, 2));
  const lines = await mount('- ab\n', 'lines', caret(0, 1));
  await key(lines, 'Shift+Enter');
  expect(lines.doc.blocks).toEqual([{ k: 'li', depth: 0, runs: [{ t: 'a\nb' }] }]);
  const line = await mount('one\n', 'line', caret(0, 1));
  const shifts: boolean[] = [];
  line.el.addEventListener('text-enter', (e) => shifts.push((e as CustomEvent<{ shift: boolean }>).detail.shift));
  await key(line, 'Shift+Enter');
  await key(line, 'Enter');
  expect(shifts).toEqual([true, false]);
  expect(line.tlo).toBe('one\n');
});

test('Backspace on an empty item with children takes it away and brings them out a level; the caret ends the block before', async () => {
  const h = await mount('- a\n-\n  - b\n    - c\n- d\n', 'doc', caret(1, 0));
  await key(h, 'Backspace');
  expect(h.tlo).toBe('- a\n- b\n  - c\n- d\n');
  expect(h.el.sel).toEqual(caret(0, 1));
  expect(domSel().offset).toBe(1);
});

test('Enter at the end of an item whose children follow makes their first child; elsewhere a sibling', async () => {
  const h = await mount('- a\n  - b\n', 'doc', caret(0, 1));
  await key(h, 'Enter');
  expect(h.doc.blocks.map((b) => (b.k === 'li' ? b.depth : -1))).toEqual([0, 1, 1]);
  expect(h.el.sel).toEqual(caret(1, 0));
  await typeIn(h, 'x');
  expect(h.tlo).toBe('- a\n  - x\n  - b\n');
});

test('"> " makes a quote; a shortcut undoes in two steps, the kind and then the marker as typed', async () => {
  const h = await mount('', 'doc');
  await typeIn(h, '> ');
  expect(h.doc.blocks[0]).toMatchObject({ k: 'quote', runs: [] });
  await typeIn(h, 'hi');
  expect(h.tlo).toBe('> hi\n');
  const l = await mount('', 'doc');
  await typeIn(l, '- ');
  expect(l.doc.blocks[0]).toMatchObject({ k: 'li' });
  l.step('undo');
  await l.el.updateComplete;
  expect(l.doc.blocks[0]).toMatchObject({ k: 'p', runs: [{ t: '- ' }] });
  expect(l.el.sel).toEqual(caret(0, 2));
  // The bar's Quote: setKind takes 'quote', and asking again makes it a paragraph.
  l.el.exec('quote');
  await l.el.updateComplete;
  expect(l.doc.blocks[0].k).toBe('quote');
  l.el.exec('quote');
  await l.el.updateComplete;
  expect(l.doc.blocks[0].k).toBe('p');
});

test('Tab is taken only when the item moves: on the first item it moves the focus; nothing during an IME composition', async () => {
  const h = await mount('- a\n- b\n', 'doc', caret(0, 1));
  expect(press(h.el.tx, { key: 'Tab' }).defaultPrevented).toBe(false);
  expect(h.tlo).toBe('- a\n- b\n');
  h.el.sel = caret(1, 1);
  await h.el.updateComplete;
  expect(press(h.el.tx, { key: 'Tab', isComposing: true }).defaultPrevented).toBe(false);
  expect(h.tlo).toBe('- a\n- b\n');
  expect(press(h.el.tx, { key: 'Tab' }).defaultPrevented).toBe(true);
  await h.el.updateComplete;
  expect(h.tlo).toBe('- a\n  - b\n');
  // At the third level an item goes no deeper, and Tab goes on.
  const deep = await mount('- a\n  - b\n    - c\n      - d\n', 'doc', caret(3, 0));
  expect(press(deep.el.tx, { key: 'Tab' }).defaultPrevented).toBe(false);
});

test('Alt+Up/Down moves an item with its family past its neighbour; the caret goes with it', async () => {
  const h = await mount('- a\n- b\n  - c\n- d\n', 'doc', caret(1, 1));
  expect(press(h.el.tx, { key: 'ArrowDown', altKey: true }).defaultPrevented).toBe(true);
  await h.el.updateComplete;
  expect(h.tlo).toBe('- a\n- d\n- b\n  - c\n');
  expect(h.el.sel).toEqual(caret(2, 1));
  press(h.el.tx, { key: 'ArrowUp', altKey: true });
  await h.el.updateComplete;
  press(h.el.tx, { key: 'ArrowUp', altKey: true });
  await h.el.updateComplete;
  expect(h.tlo).toBe('- b\n  - c\n- a\n- d\n');
  expect(h.el.sel).toEqual(caret(0, 1));
  // At the top there is nowhere to go: the key is the browser's.
  expect(press(h.el.tx, { key: 'ArrowUp', altKey: true }).defaultPrevented).toBe(false);
  // Not in a paragraph.
  const p = await mount('a\n\nb\n', 'doc', caret(0, 0));
  expect(press(p.el.tx, { key: 'ArrowDown', altKey: true }).defaultPrevented).toBe(false);
});

test('Mod+Enter on a task item ticks and unticks it; on other words it is the host\'s', async () => {
  const h = await mount('- [ ] buy milk\n\nwords\n', 'doc', caret(0, 3));
  let reached = 0;
  document.body.addEventListener('keydown', () => reached++);
  expect(press(h.el.tx, { key: 'Enter', ctrlKey: true }).defaultPrevented).toBe(true);
  await h.el.updateComplete;
  expect(h.tlo).toBe('- [x] buy milk\n\nwords\n');
  expect(h.el.tx.querySelector('li')!.dataset.done).toBe('true');
  press(h.el.tx, { key: 'Enter', metaKey: true });
  await h.el.updateComplete;
  expect(h.tlo).toBe('- [ ] buy milk\n\nwords\n');
  expect(reached).toBe(0);
  h.el.sel = caret(1, 1);
  await h.el.updateComplete;
  expect(press(h.el.tx, { key: 'Enter', ctrlKey: true }).defaultPrevented).toBe(false);
  expect(reached).toBe(1);
});

test('a click anywhere in a task\'s box ticks it, the box measured at the size of everything', async () => {
  const h = await mount('- [ ] buy milk\n', 'doc', caret(0, 3));
  const li = h.el.tx.querySelector<HTMLElement>('li')!;
  const r = li.getBoundingClientRect();
  // The box's right edge on the screen: its padding, drawn at the zoom (1.3 at the normal size).
  const edge = r.left + parseFloat(getComputedStyle(li).paddingLeft);
  li.dispatchEvent(new MouseEvent('click', { bubbles: true, cancelable: true, clientX: edge - 2, clientY: r.top + r.height / 2 }));
  await h.el.updateComplete;
  expect(h.tlo).toBe('- [x] buy milk\n');
  // Past it, in the words: nothing ticks.
  li.dispatchEvent(new MouseEvent('click', { bubbles: true, cancelable: true, clientX: edge + 4, clientY: r.top + r.height / 2 }));
  await h.el.updateComplete;
  expect(h.tlo).toBe('- [x] buy milk\n');
});

test('Mod+Shift+X strikes through and Mod+Shift+H highlights the words selected', async () => {
  const h = await mount('make this\n', 'doc', range(0, 5, 9));
  press(h.el.tx, { key: 'X', ctrlKey: true, shiftKey: true });
  await h.el.updateComplete;
  expect(h.doc.blocks[0]).toMatchObject({ runs: [{ t: 'make ' }, { t: 'this', s: true }] });
  press(h.el.tx, { key: 'H', ctrlKey: true, shiftKey: true });
  await h.el.updateComplete;
  expect(h.doc.blocks[0]).toMatchObject({ runs: [{ t: 'make ' }, { t: 'this', s: true, h: true }] });
});

test('no selection is written during an IME composition: a host\'s caret waits for compositionend', async () => {
  const h = await mount('hello world\n', 'doc', caret(0, 5));
  const p = h.el.tx.querySelector('p')!;
  p.dispatchEvent(new CompositionEvent('compositionstart', { bubbles: true }));
  const text = [...p.childNodes].find((n) => n.nodeType === Node.TEXT_NODE) as Text;
  document.getSelection()!.collapse(text, 5);
  h.el.sel = caret(0, 0);
  await tick(30);
  expect(domSel().offset).toBe(5);
  p.dispatchEvent(new CompositionEvent('compositionend', { data: '', bubbles: true }));
  await tick(30);
  expect(h.tlo).toBe('hello world\n');
});

test('editing surfaces: touch-action manipulation on the box; under a finger the bubble\'s buttons and a task\'s box are 44px', async () => {
  const h = await mount('- [ ] task\n', 'doc', caret(0, 0));
  expect(getComputedStyle(h.el.tx).touchAction).toBe('manipulation');
  const coarse: string[] = [];
  const walk = (rules: CSSRuleList, inCoarse: boolean) => {
    for (const r of rules) {
      if (r instanceof CSSMediaRule) walk(r.cssRules, inCoarse || r.conditionText.includes('pointer: coarse'));
      else if (r instanceof CSSStyleRule) inCoarse && coarse.push(`${r.selectorText} { ${r.style.cssText} }`);
      else if ('cssRules' in r) walk((r as CSSGroupingRule).cssRules, inCoarse);
    }
  };
  for (const s of document.styleSheets) walk(s.cssRules, false);
  expect(coarse.some((r) => r.startsWith('.to-context .to-tool') && r.includes('var(--to-touch)'))).toBe(true);
  expect(coarse.some((r) => r.startsWith('.to-context .to-btn') && r.includes('min-height: var(--to-touch)'))).toBe(true);
  expect(coarse.some((r) => r.includes('li[data-done]') && r.includes('var(--to-touch)'))).toBe(true);
});
