// A sentence copied with its space and pasted three times is three sentences and three spaces, in the words and in
// the link read back (Paul, 2026-10-10: "we cannot ever lose spaces if they're there. This is why we struggled with
// cut and paste before trying to copy one sentence multiple times."). The format says them: "\ " at a line's ends.
import { expect, test } from 'vitest';
import { parse, plainText, write, type Block } from '../../src/doc/index.ts';
import { decodeDoc, encodeDoc } from '../../src/kit/core/codec.ts';
import { parseHash } from '../../src/kit/core/route.ts';
import type { ToShell } from '../../src/kit/core/shell.ts';
import type { ToText } from '../../src/kit/text/text.ts';
import { caret, type Sel } from '../../src/kit/text/textops.ts';
import { mount, tick, until } from './helpers.ts';

/** The Word Processor at a document, its words' editor ready. */
async function open(tlo: string): Promise<{ shell: ToShell; text: ToText }> {
  const shell = await mount(`#/v1/write/${encodeDoc(tlo)}`);
  await until(() => !!shell.querySelector('to-write-editor to-text .tx'));
  const text = shell.querySelector<ToText>('to-write-editor to-text')!;
  await text.updateComplete;
  text.tx.focus();
  return { shell, text };
}

/** The blocks the editor holds, and the blocks the link holds once it is flushed and read back. */
function held(shell: ToShell, text: ToText): { words: Block[]; link: Block[] } {
  shell.flushLink();
  const { payload } = parseHash(location.hash);
  return { words: text.blocks, link: parse(decodeDoc(payload!)).blocks };
}

/** Copy what `sel` holds, then paste it `n` times where `at` is, as a person does with the keys. */
async function copyPaste(text: ToText, sel: Sel, at: (t: ToText) => Sel, n: number): Promise<void> {
  text.sel = sel;
  await text.updateComplete;
  const dt = new DataTransfer();
  text.tx.dispatchEvent(new ClipboardEvent('copy', { clipboardData: dt, bubbles: true, cancelable: true }));
  text.sel = at(text);
  await text.updateComplete;
  for (let k = 0; k < n; k++) {
    const p = new DataTransfer();
    for (const type of ['text/plain', 'text/html']) p.setData(type, dt.getData(type));
    text.tx.dispatchEvent(new ClipboardEvent('paste', { clipboardData: p, bubbles: true, cancelable: true }));
    await text.updateComplete;
  }
}

const words = (bs: Block[]) => bs.map((b) => ('runs' in b ? plainText(b.runs) : b.k));
const end = (block: number) => (t: ToText) => caret(block, plainText((t.blocks[block] as Extract<Block, { runs: unknown }>).runs).length);

test('a sentence that ends in a space, copied and pasted three times, is three sentences and every space, in the link too', async () => {
  // The space typed, as a person types it.
  const { shell, text } = await open('Copy me.\n');
  text.sel = caret(0, 8);
  await text.updateComplete;
  text.tx.dispatchEvent(new InputEvent('beforeinput', { inputType: 'insertText', data: ' ', bubbles: true, cancelable: true, composed: true }));
  await text.updateComplete;
  expect(words(held(shell, text).link)).toStrictEqual(['Copy me. ']);
  await copyPaste(text, { anchor: { block: 0, offset: 0 }, focus: { block: 0, offset: 9 } }, end(0), 3);
  const { words: w, link } = held(shell, text);
  expect(words(w)).toStrictEqual(['Copy me. Copy me. Copy me. Copy me. ']);
  expect(words(link)).toStrictEqual(words(w));
});

test('a sentence that begins with a space, pasted three times after words, keeps every space', async () => {
  const { shell, text } = await open('Start\n\n\\ and more\n');
  await copyPaste(text, { anchor: { block: 1, offset: 0 }, focus: { block: 1, offset: 9 } }, end(0), 3);
  const { words: w, link } = held(shell, text);
  expect(words(w)).toStrictEqual(['Start and more and more and more', ' and more']);
  expect(words(link)).toStrictEqual(words(w));
});

test('a paragraph that ends in a line break, and one that is only spaces, come back from the link as they were', async () => {
  const { shell, text } = await open('Line one\n\\\n\n\\ \\ \n');
  expect(words(text.blocks)).toStrictEqual(['Line one\n', '  ']);
  await copyPaste(text, { anchor: { block: 0, offset: 0 }, focus: { block: 0, offset: 9 } }, end(1), 2);
  const { words: w, link } = held(shell, text);
  expect(words(link)).toStrictEqual(words(w));
  expect(w.length).toBeGreaterThan(1);
  expect(words(w).join('|')).toContain('Line one\n');
});

test("the walks' replay: Enter where the letter's words leave a space or a break at a block's end, and the link is written back as it is read", async () => {
  // (VITE_WALK_SEED=1891995401, text at a desktop: "Portland,  {.right}" once lost its space in the link.)
  // The letter as its template was then, its address written out (the template is hints since 2026-10-11).
  const letter = 'Mara Quill\nHarbor Studio, 14 Quay Street\nPortland, ME 04101\nmara@harborstudio.example {.right}\n\n2 October 2026\n\nDear Ms Okafor,\n';
  const { shell, text } = await open(letter);
  const first = () => plainText((text.blocks[0] as Extract<Block, { runs: unknown }>).runs);
  // After "Portland, ", at the end of "Mara Quill" (before its line break), and at the very start.
  for (const at of [() => first().indexOf('Portland, ') + 10, () => first().indexOf('\n'), () => 0]) {
    text.sel = caret(0, at());
    await text.updateComplete;
    for (const [inputType, data] of [
      ['insertText', 'tiny '],
      ['insertParagraph', null],
    ] as const) {
      text.tx.dispatchEvent(new InputEvent('beforeinput', { inputType, data, bubbles: true, cancelable: true, composed: true }));
      await text.updateComplete;
      await tick(20);
    }
    const { words: w, link } = held(shell, text);
    expect(write({ head: {}, blocks: link })).toBe(write({ head: {}, blocks: parse(write({ head: {}, blocks: link })).blocks }));
    expect(words(link)).toStrictEqual(words(w));
  }
  expect(words(text.blocks).some((w) => /\s$/.test(w))).toBe(true);
});

test('an underlined word and its space, pasted before an underlined word, are one underline: the space is the pasted words’ own where it lands', async () => {
  // The pasted words join the words where they go, and only then is a mark let go of a space at its edge (settle):
  // "a " alone would be "++a++ ", but before "c" its space is inside the underline.
  const { shell, text } = await open('++a b++\n\n++c++\n');
  await copyPaste(text, { anchor: { block: 0, offset: 0 }, focus: { block: 0, offset: 2 } }, () => caret(1, 0), 1);
  const { words: w, link } = held(shell, text);
  expect(write({ head: {}, blocks: link })).toBe('++a b++\n\n++a c++\n');
  expect(w).toStrictEqual(link);
  // At a block's end the space is plain, as the text says it.
  await copyPaste(text, { anchor: { block: 0, offset: 0 }, focus: { block: 0, offset: 2 } }, end(1), 1);
  const after = held(shell, text);
  expect(write({ head: {}, blocks: after.link })).toBe('++a b++\n\n++a ca++\\ \n');
  expect(after.words).toStrictEqual(after.link);
});
