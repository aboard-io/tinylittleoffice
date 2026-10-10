// <to-notes> in a real Chromium: a document's footnotes drawn where they are listed, each a one-line <to-text> typed in
// place; what it tells its host (note-change with the note's words as inline Markdown, note-back on Enter, Escape and
// ↩, note-remove for a note emptied and left or Backspace at the start of an empty one), focusNote, and the helpers a
// host finds a mark with (noteMarks, noteIndex).
import { expect, test } from 'vitest';
import { parse } from '../../src/doc/index.ts';
import { noteIndex, noteMarks, type ToNotes } from '../../src/kit/notes.ts';
import type { ToText } from '../../src/kit/text.ts';
import { tick, until } from './helpers.ts';
import '../../src/styles.css';
import '../../src/kit/notes.ts';

async function mount(notes: string[], backs = false) {
  document.body.innerHTML = '';
  const el = document.createElement('to-notes') as ToNotes;
  el.notes = notes;
  el.backs = backs;
  const heard: [string, unknown][] = [];
  for (const type of ['note-change', 'note-back', 'note-remove']) el.addEventListener(type, (e) => heard.push([type, (e as CustomEvent).detail]));
  // The host: it writes what it hears and hands the notes back.
  el.addEventListener('note-change', (e) => {
    const { nth, fn } = (e as CustomEvent<{ nth: number; fn: string }>).detail;
    el.notes = el.notes.map((x, i) => (i === nth ? fn : x));
  });
  const outside = document.createElement('button');
  outside.textContent = 'elsewhere';
  document.body.append(el, outside);
  await el.updateComplete;
  return { el, heard, outside, field: (i: number) => el.querySelectorAll<ToText>('to-text')[i] };
}
const input = (x: ToText, inputType: string, data: string | null = null) => x.tx.dispatchEvent(new InputEvent('beforeinput', { inputType, data, bubbles: true, cancelable: true }));
const key = (x: ToText, k: string) => x.tx.dispatchEvent(new KeyboardEvent('keydown', { key: k, bubbles: true, cancelable: true }));

test('the marks among blocks: each one\'s block, offset and words; a mark of a block counted among them all', () => {
  const blocks = parse('A :star: b^[one] c^[**two**]\n\nD^[three]\n').blocks;
  const marks = noteMarks(blocks);
  expect(marks).toEqual([
    { block: 0, offset: 5, fn: 'one' },
    { block: 0, offset: 8, fn: '**two**' },
    { block: 1, offset: 1, fn: 'three' },
  ]);
  expect(noteIndex(marks, 1, 0)).toBe(2);
  expect(noteIndex(marks, 0, 1)).toBe(1);
});

test('each note is a line of rich words typed in place: its marks drawn, a letter typed is note-change with the words as inline Markdown, the element kept', async () => {
  const { el, heard, field } = await mount(['a **bold** note', 'two']);
  expect(el.querySelectorAll('li')).toHaveLength(2);
  expect(field(0).getAttribute('shape')).toBe('line');
  expect(field(0).tx.querySelector('b')!.textContent).toBe('bold');
  expect(field(0).tx.getAttribute('aria-label')).toBe('Footnote 1');
  await el.focusNote(0);
  await until(() => field(0).hasFocus());
  expect(field(0).sel?.focus.offset).toBe('a bold note'.length);
  const p = field(0).tx.firstElementChild;
  input(field(0), 'insertText', '!');
  await el.updateComplete;
  await field(0).updateComplete;
  expect(heard).toEqual([['note-change', { nth: 0, fn: 'a **bold** note!' }]]);
  expect(field(0).tx.firstElementChild).toBe(p);
  // A note offers its marks and a link, never a footnote of its own.
  expect(field(0).notes).toBe(false);
});

test('Enter and Escape go back to the mark (note-back); emptied and left, or Backspace at the start of an empty note, the mark goes (note-remove)', async () => {
  const { el, heard, field, outside } = await mount(['one', 'two', 'three'], true);
  await el.focusNote(0);
  input(field(0), 'insertParagraph');
  key(field(1), 'Escape');
  (el.querySelectorAll<HTMLButtonElement>('.to-note-back')[2]).click();
  expect(heard).toEqual([
    ['note-back', { nth: 0 }],
    ['note-back', { nth: 1 }],
    ['note-back', { nth: 2 }],
  ]);
  expect(el.querySelector('.to-note-back')!.getAttribute('aria-label')).toBe('Back to footnote 1 in the text');
  heard.length = 0;
  // Emptied, then the focus goes elsewhere: the mark goes; the caret stays where it went.
  await el.focusNote(1);
  for (let i = 0; i < 3; i++) {
    input(field(1), 'deleteContentBackward');
    await el.updateComplete;
    await tick();
  }
  outside.focus();
  expect(heard.at(-1)).toEqual(['note-remove', { nth: 1, back: false }]);
  // Escape in an empty note: the mark goes, and the caret goes back where it was.
  el.notes = ['one', '', 'three'];
  await el.updateComplete;
  await el.focusNote(1);
  key(field(1), 'Escape');
  expect(heard.at(-1)).toEqual(['note-remove', { nth: 1, back: true }]);
  // Backspace at the start of an empty note: the same; at the start of words, nothing.
  heard.length = 0;
  await el.focusNote(1);
  input(field(1), 'deleteContentBackward');
  expect(heard).toEqual([['note-remove', { nth: 1, back: true }]]);
  heard.length = 0;
  await el.focusNote(2);
  field(2).sel = { anchor: { block: 0, offset: 0 }, focus: { block: 0, offset: 0 } };
  input(field(2), 'deleteContentBackward');
  outside.focus();
  expect(heard).toEqual([]);
});
