// A keystroke costs what it changed (round six, Paul 2026-10-10: "it's starting to feel really slow"). In the Word
// Processor with a 1,500-word document: the link is projected once typing pauses, not per key; it is flushed at once
// before anything reads it (the window's blur, leaving the page, Copy link); the bar is drawn again only when what it
// shows changes; and one keystroke's synchronous work stays inside a budget.
import { afterEach, expect, test, vi } from 'vitest';
import { mount, tick, until } from './helpers.ts';
import { decodeDoc, encodeDoc } from '../../src/kit/codec.ts';
import { parseHash } from '../../src/kit/route.ts';
import type { ToShell } from '../../src/kit/shell.ts';
import type { ToText } from '../../src/kit/text.ts';
import type { ToWriteEditor } from '../../src/apps/write/editor.ts';

afterEach(() => {
  vi.restoreAllMocks();
  history.replaceState(null, '', location.pathname);
});

const WORDS = ['tiny', 'little', 'office', 'keeps', 'every', 'document', 'in', 'the', 'link', 'and', 'nothing', 'else', 'ever', 'leaves', 'this', 'page'];
/** 1,500 words: a title, then thirty paragraphs of fifty words, every tenth with a bold word, a list now and then. */
function bigDoc(): string {
  const out = ['# A long letter {.title}', ''];
  let n = 0;
  for (let p = 0; p < 30; p++) {
    const words = Array.from({ length: 50 }, (_, i) => `${WORDS[(n + i * 7) % WORDS.length]}${(n + i) % 13}`);
    n += 50;
    if (p % 3 === 1) words[4] = `**${words[4]}**`;
    out.push(p % 5 === 4 ? `- ${words.join(' ')}` : words.join(' '), '');
  }
  return out.join('\n');
}

/** The shell on the big document, the caret at the end of the last paragraph. */
async function opened(): Promise<{ shell: ToShell; ed: ToWriteEditor; text: ToText }> {
  const shell = await mount(`#/v1/write/${encodeDoc(bigDoc())}`);
  await until(() => !!shell.querySelector('to-write-editor to-text .tx'));
  const ed = shell.querySelector<ToWriteEditor>('to-write-editor')!;
  const text = ed.text;
  await ed.updateComplete;
  await text.updateComplete;
  await shell.updateComplete;
  text.focus();
  const last = ed['doc'].blocks.length - 1;
  const len = ed['doc'].blocks[last].runs.reduce((s: number, r: { t: string }) => s + r.t.length, 0);
  text.sel = { anchor: { block: last, offset: len }, focus: { block: last, offset: len } };
  await text.updateComplete;
  return { shell, ed, text };
}
const key = (text: ToText, ch: string) => text.tx.dispatchEvent(new InputEvent('beforeinput', { inputType: 'insertText', data: ch, bubbles: true, cancelable: true }));
/** Letters typed quickly: each drawn before the next, as a fast typist's are. */
async function typeFast(ed: ToWriteEditor, text: ToText, words: string) {
  for (const ch of words) {
    key(text, ch);
    await ed.updateComplete;
    await text.updateComplete;
  }
}
const linkText = () => decodeDoc(parseHash(location.hash).payload);
const TYPED = ' and forty more letters typed quickly ok';

test('typing forty letters quickly writes the link at most twice; docchange fires for every letter', async () => {
  const { shell, ed, text } = await opened();
  const replace = vi.spyOn(history, 'replaceState');
  let changes = 0;
  shell.addEventListener('docchange', () => changes++);
  expect(TYPED.length).toBe(40);
  await typeFast(ed, text, TYPED);
  expect(changes).toBe(40);
  // The link is the document again once typing pauses.
  await tick(300);
  expect(replace.mock.calls.length).toBeGreaterThan(0);
  expect(replace.mock.calls.length).toBeLessThanOrEqual(2);
  expect(linkText().includes(TYPED)).toBe(true);
});

test('the window losing focus, leaving the page and Copy link each flush the link at once', async () => {
  const { shell, ed, text } = await opened();
  await typeFast(ed, text, ' blur');
  expect(linkText().includes(' blur')).toBe(false);
  window.dispatchEvent(new Event('blur'));
  expect(linkText().includes(' blur')).toBe(true);

  await typeFast(ed, text, ' hide');
  expect(linkText().includes(' hide')).toBe(false);
  window.dispatchEvent(new Event('pagehide'));
  expect(linkText().includes(' hide')).toBe(true);

  await typeFast(ed, text, ' copy');
  expect(linkText().includes(' copy')).toBe(false);
  // Copy link reads the link: it is current before the copy is made.
  expect(decodeDoc(parseHash(new URL(shell.link).hash).payload).includes(' copy')).toBe(true);
  expect(linkText().includes(' copy')).toBe(true);
});

test('a reload after typing shows the typed text; undo after a pause still works', async () => {
  const { ed, text } = await opened();
  await typeFast(ed, text, ' kept');
  window.dispatchEvent(new Event('pagehide'));
  const hash = location.hash;
  // The page again, from its address alone.
  const again = await mount(hash);
  await until(() => !!again.querySelector('to-write-editor to-text .tx'));
  const ed2 = again.querySelector<ToWriteEditor>('to-write-editor')!;
  await ed2.updateComplete;
  expect(ed2.value.includes(' kept')).toBe(true);

  const { ed: ed3, text: text3 } = await opened();
  await typeFast(ed3, text3, ' undone');
  await tick(300);
  expect(linkText().includes(' undone')).toBe(true);
  ed3.dispatchEvent(new CustomEvent('docundo', { cancelable: true }));
  await ed3.updateComplete;
  expect(ed3.value.includes(' undone')).toBe(false);
  await tick(300);
  expect(linkText().includes(' undone')).toBe(false);
});

test('the bar is drawn again only when what it shows changes: under five times over forty letters', async () => {
  const { ed, text } = await opened();
  // Settled: the first letter turns Undo on, which is the bar changing.
  key(text, 'x');
  await ed.updateComplete;
  await tick(30);
  const draw = vi.spyOn(ed as unknown as { renderBar: () => unknown }, 'renderBar');
  await typeFast(ed, text, TYPED);
  await tick(30);
  expect(draw.mock.calls.length).toBeLessThan(5);
  // A mark at the caret is the bar changing: it is drawn, pressed.
  text.exec('b');
  await ed.updateComplete;
  await tick(30);
  key(text, 'B');
  await ed.updateComplete;
  await tick(30);
  expect(ed.querySelector('.write-bar button[aria-label^="Bold"]')!.getAttribute('aria-pressed')).toBe('true');
});

test('one keystroke in a 1,500-word document is under 12 ms of synchronous work', async () => {
  const { ed, text } = await opened();
  // Warm.
  await typeFast(ed, text, 'warm up ');
  const sync: number[] = [];
  const drawn: number[] = [];
  for (const ch of TYPED) {
    const t0 = performance.now();
    key(text, ch);
    const t1 = performance.now();
    await ed.updateComplete;
    await text.updateComplete;
    drawn.push(performance.now() - t0);
    sync.push(t1 - t0);
  }
  const median = (xs: number[]) => [...xs].sort((a, b) => a - b)[xs.length >> 1];
  console.log(`keystroke, 1,500 words: ${median(sync).toFixed(2)} ms synchronous, ${median(drawn).toFixed(2)} ms drawn (medians of ${sync.length})`);
  expect(median(sync)).toBeLessThan(12);
});
