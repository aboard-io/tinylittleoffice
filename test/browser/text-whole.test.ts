// Two faults Paul saw in the Word Processor (2026-10-10), with real keys through the shell: Mod+A did not select
// the document ("that seems symptomatic"), and a long document would not stay scrolled up ("it just keeps pushing
// me back down"). Select All in a doc is the editor's own model selection, cards and all; the page scrolls to the
// caret only after an edit the person made, never after a draw, a restore or an autosave.
import { afterEach, expect, test } from 'vitest';
import { page, userEvent } from 'vitest/browser';
import { mount, tick, until } from './helpers.ts';
import { encodeDoc } from '../../src/kit/codec.ts';
import { caret } from '../../src/kit/textops.ts';
import type { ToShell } from '../../src/kit/shell.ts';
import type { ToWriteEditor } from '../../src/apps/write/editor.ts';

afterEach(async () => {
  window.scrollTo(0, 0);
  history.replaceState(null, '', location.pathname);
  await page.viewport(414, 896);
});

const frame = () => new Promise<void>((r) => requestAnimationFrame(() => requestAnimationFrame(() => r())));
const MIXED = '# A heading\n\nThe first paragraph.\n\n- one item\n- another item\n\nCol | Two\n--- | ---\n1 | 2\n\n![a picture](https://example.com/a.png)\n\nThe last words.\n\n![the end](https://example.com/b.png)\n';

async function write(tlo: string): Promise<{ shell: ToShell; el: ToWriteEditor }> {
  const shell = await mount(`#/v1/write/${encodeDoc(tlo)}`);
  await until(() => !!shell.querySelector('to-write-editor to-text .tx'));
  const el = shell.querySelector<ToWriteEditor>('to-write-editor')!;
  await el.updateComplete;
  await el.text.updateComplete;
  await frame();
  return { shell, el };
}

test('Mod+A in the Word Processor selects the whole document, cards too: Backspace empties it, typing replaces it, Escape collapses', async () => {
  const { el } = await write(MIXED);
  const text = el.text;
  const n = text.blocks.length;
  text.tx.focus();
  text.sel = caret(2, 4);
  await text.updateComplete;
  await frame();
  await userEvent.keyboard('{Control>}a{/Control}');
  await frame();
  // The model: from the start of the first words to the end of the last.
  const last = n - 2;
  expect(text.sel).toEqual({ anchor: { block: 0, offset: 0 }, focus: { block: last, offset: 'The last words.'.length } });
  // The DOM: every block inside the range, the cards at both ends too.
  const r = document.getSelection()!.getRangeAt(0);
  for (const b of text.tx.children) expect(r.intersectsNode(b)).toBe(true);
  // Escape collapses to the focus.
  await userEvent.keyboard('{Escape}');
  await frame();
  expect(text.sel).toEqual(caret(last, 'The last words.'.length));
  // Again, then Backspace: one empty paragraph is left, the table and the pictures gone with the words.
  await userEvent.keyboard('{Control>}a{/Control}');
  await frame();
  await userEvent.keyboard('{Backspace}');
  await until(() => text.blocks.length === 1);
  expect(text.blocks[0]).toEqual({ k: 'p', runs: [] });
  // Typing over everything replaces it.
  await userEvent.keyboard('Hello');
  await until(() => text.tx.textContent === 'Hello');
  await userEvent.keyboard('{Control>}a{/Control}');
  await frame();
  await userEvent.keyboard('X');
  await until(() => text.tx.textContent === 'X');
  expect(text.blocks).toEqual([{ k: 'p', runs: [{ t: 'X' }] }]);
});

test('Mod+A then typing over a document that starts with a card replaces the card too; Delete empties it', async () => {
  const { el } = await write('![first](https://example.com/a.png)\n\nWords between.\n\nCol | Two\n--- | ---\n1 | 2\n');
  const text = el.text;
  text.tx.focus();
  text.sel = caret(1, 2);
  await text.updateComplete;
  await frame();
  await userEvent.keyboard('{Control>}a{/Control}');
  await frame();
  expect(text.sel).toEqual({ anchor: { block: 1, offset: 0 }, focus: { block: 1, offset: 'Words between.'.length } });
  await userEvent.keyboard('Z');
  await until(() => text.blocks.length === 1);
  expect(text.blocks).toEqual([{ k: 'p', runs: [{ t: 'Z' }] }]);
  await userEvent.keyboard('{Control>}a{/Control}{Delete}');
  await until(() => text.tx.textContent === '');
  expect(text.blocks).toEqual([{ k: 'p', runs: [] }]);
});

test('Mod+A then Mod+C copies the whole document, cards and all', async () => {
  const { el } = await write(MIXED);
  const text = el.text;
  text.tx.focus();
  text.sel = caret(1, 3);
  await text.updateComplete;
  await frame();
  await userEvent.keyboard('{Control>}a{/Control}');
  await frame();
  const got: Record<string, string> = {};
  const ev = new ClipboardEvent('copy', { clipboardData: new DataTransfer(), bubbles: true, cancelable: true });
  text.tx.dispatchEvent(ev);
  got.text = ev.clipboardData!.getData('text/plain');
  expect(got.text).toContain('A heading');
  expect(got.text).toContain('Col | Two');
  expect(got.text).toContain('https://example.com/a.png');
  expect(got.text).toContain('https://example.com/b.png');
});

const BIG = `${Array.from({ length: 300 }, (_, i) => `Paragraph ${i + 1}, long enough to take a line or two of the page when it is drawn.`).join('\n\n')}\n`;

test('a long document stays where the reader scrolled it: no draw, restore or autosave pulls it back to the caret', async () => {
  await page.viewport(414, 700);
  const { shell, el } = await write(BIG);
  const text = el.text;
  text.tx.focus();
  const n = text.blocks.length;
  text.sel = caret(n - 1, 5);
  await text.updateComplete;
  await frame();
  await userEvent.keyboard('more');
  await until(() => (shell as unknown as { edited: string }).edited.includes('Paragmoreraph 300'));
  // Typed at the end: the caret is on the screen.
  expect(window.scrollY).toBeGreaterThan(1000);
  // The reader scrolls up at once (a wheel), and the editor's selection is written again under them (a restore, a draw).
  document.dispatchEvent(new WheelEvent('wheel', { deltaY: -5000, bubbles: true }));
  window.scrollTo(0, 0);
  text.sel = text.sel;
  await text.updateComplete;
  await frame();
  expect(window.scrollY).toBe(0);
  // Two seconds with no key pressed: the link's projection, the library's keep, the word count, the history.
  await tick(2000);
  await frame();
  expect(window.scrollY).toBe(0);
  // A selection put back by the host with nothing done (an undo point restored, a note left): still there.
  text.sel = caret(n - 1, 3);
  el.requestUpdate();
  await el.updateComplete;
  await text.updateComplete;
  await frame();
  expect(window.scrollY).toBe(0);
  // A letter typed is the person's own edit: the caret is brought back into view.
  await userEvent.keyboard('Q');
  await until(() => window.scrollY > 1000);
});

test('an arrow key with the caret off the screen brings it back; with it on the screen the page does not jump', async () => {
  await page.viewport(414, 700);
  const { el } = await write(BIG);
  const text = el.text;
  text.tx.focus();
  text.sel = caret(3, 2);
  await text.updateComplete;
  await frame();
  window.scrollTo(0, 0);
  await frame();
  await userEvent.keyboard('{ArrowRight}');
  await frame();
  await tick(300);
  expect(window.scrollY).toBe(0);
  // Typed at the end, scrolled up: a letter typed brings the caret back into view (an edit the person made).
  const n = text.blocks.length;
  text.sel = caret(n - 1, 0);
  await text.updateComplete;
  await frame();
  window.scrollTo(0, 0);
  await frame();
  await userEvent.keyboard('Q');
  await until(() => window.scrollY > 1000);
});

test('in the Outliner and the Presentation Builder Select All is still the box first, then the host (lines and a line)', async () => {
  for (const [app, tlo, sel] of [
    ['outline', '- one\n- two\n- three\n', 'to-outline-editor to-text'],
    ['deck', '# A slide\n\n- one point\n- another\n\n---\n\n# Two\n', 'to-deck-editor to-text[shape=lines]'],
  ] as const) {
    const shell = await mount(`#/v1/${app}/${encodeDoc(tlo)}`);
    await until(() => !!shell.querySelector(`${sel} .tx`));
    const box = shell.querySelector<HTMLElement & { sel: unknown; updateComplete: Promise<unknown>; tx: HTMLElement }>(sel)!;
    const host = box.closest(`to-${app}-editor`) as unknown as { rows: { range: unknown }; updateComplete: Promise<unknown> };
    await host.updateComplete;
    box.tx.focus();
    box.sel = caret(0, 1);
    await box.updateComplete;
    await frame();
    await userEvent.keyboard('{Control>}a{/Control}');
    await frame();
    // The first press: the box's words, and nothing of the host's.
    expect(document.getSelection()!.toString()).toBe(app === 'outline' ? 'one' : 'one point\nanother');
    expect(host.rows.range).toBe(null);
    await userEvent.keyboard('{Control>}a{/Control}');
    await until(() => host.rows.range !== null);
  }
});
