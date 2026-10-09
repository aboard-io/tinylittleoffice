// Footnotes worked as a person would: put in from the bar, written in the box a mark opens, taken away with
// Backspace; the notes under the text keep up; a slide shows its notes at its foot.
import { test, expect } from 'vitest';
import { mount, settle, button, press, type Editor } from './helpers.ts';

const page = (el: Editor) => el.querySelector<HTMLElement>('.write-page[aria-label="Document"]')!;
const chips = (el: Editor) => [...el.querySelectorAll<HTMLElement>('.write-page[aria-label="Document"] sup.fn')];
const box = () => document.querySelector<HTMLElement & { open?: boolean }>('.fn-pop');
/** Words typed into the box a footnote opens: its field is the same editor, one line (`html`: marked up, as Mod+I would). */
async function typeNote(el: Editor, words: string, html = false) {
  const field = box()!.querySelector<HTMLElement>('.write-page')!;
  if (html) field.innerHTML = words;
  else field.textContent = words;
  field.dispatchEvent(new InputEvent('input', { bubbles: true, composed: true }));
  await settle(el);
}

test('write: a footnote from the bar, its words in the box it opens, the notes under the text; Backspace takes it away', async () => {
  const { el, last } = await mount('write', 'Some words');
  // The caret at the end of the words (happy-dom keeps a selection as a browser does).
  const text = page(el).querySelector('p')!.firstChild!;
  getSelection()!.collapse(text, 10);
  button(el, 'Footnote').click();
  await settle(el);
  // The mark is in the text, numbered 1, carrying nothing yet; its box is open with the field focused.
  expect(chips(el)).toHaveLength(1);
  expect(chips(el)[0].textContent).toBe('1');
  expect(chips(el)[0].getAttribute('contenteditable')).toBe('false');
  expect(box()).toBeTruthy();
  // (happy-dom has no Popover API, so the box is the dialog it falls back to.)
  expect(box()!.tagName).toBe('DIALOG');
  expect(box()!.open).toBe(true);
  expect(document.activeElement).toBe(box()!.querySelector('.write-page'));
  await typeNote(el, 'Said in passing');
  expect(last()).toBe('Some words^[Said in passing]');
  // The notes under the text keep up as the note is written.
  const notes = () => el.querySelector('section[role="doc-endnotes"]');
  expect(notes()!.querySelectorAll('li')).toHaveLength(1);
  expect(notes()!.querySelector('li')!.textContent).toContain('Said in passing');
  expect(notes()!.querySelector('li')!.id).toMatch(/^fn\d+-1$/);
  await typeNote(el, 'Said <i>quietly</i> in passing', true);
  expect(last()).toBe('Some words^[Said *quietly* in passing]');
  expect(notes()!.querySelector('li i')!.textContent).toBe('quietly');
  // Done closes the box (and takes it off the page); the focus comes back to the mark.
  button(box()!, 'Done').click();
  await settle(el);
  expect(box()).toBeNull();
  expect(document.activeElement).toBe(chips(el)[0]);
  // A second note, after the first: numbered 2, and the list has two.
  getSelection()!.collapse(chips(el)[0].parentNode!, 2);
  button(el, 'Footnote').click();
  await settle(el);
  await typeNote(el, 'Another');
  expect(chips(el).map((c) => c.textContent)).toEqual(['1', '2']);
  expect(last()).toBe('Some words^[Said *quietly* in passing]^[Another]');
  expect([...notes()!.querySelectorAll('li')].map((li) => li.textContent!.trim())).toEqual(['Said quietly in passing ↩', 'Another ↩']);
  button(box()!, 'Done').click();
  await settle(el);
  // The way back from a note goes to its mark.
  button(notes()!, /Back to footnote 2/).click();
  expect(document.activeElement).toBe(chips(el)[1]);
  // Backspace with the caret right after the first mark takes that note away; the rest renumber.
  const para = chips(el)[0].parentNode!;
  getSelection()!.collapse(para, [...para.childNodes].indexOf(chips(el)[0]) + 1);
  press(page(el), 'Backspace');
  await settle(el);
  expect(chips(el)).toHaveLength(1);
  expect(chips(el)[0].textContent).toBe('1');
  expect(last()).toBe('Some words^[Another]');
  expect(notes()!.querySelectorAll('li')).toHaveLength(1);
  // A mark with the focus goes the same way; with no notes left, the list goes too.
  chips(el)[0].focus();
  press(chips(el)[0], 'Backspace');
  await settle(el);
  expect(chips(el)).toHaveLength(0);
  expect(last()).toBe('Some words');
  expect(notes()).toBeNull();
});

test('write: a note left empty goes with its box; Escape closes the box; what was written comes back as marks', async () => {
  const { el, last } = await mount('write', 'Words^[Kept]');
  expect(chips(el)).toHaveLength(1);
  expect(el.querySelector('section[role="doc-endnotes"] li')!.textContent).toContain('Kept');
  // A tap on a mark opens its words.
  chips(el)[0].dispatchEvent(new MouseEvent('click', { bubbles: true, cancelable: true }));
  await settle(el);
  expect(box()!.open).toBe(true);
  expect(box()!.querySelector('.write-page')!.textContent).toBe('Kept');
  box()!.querySelector('.write-page')!.dispatchEvent(new KeyboardEvent('keydown', { key: 'Escape', bubbles: true, composed: true }));
  await settle(el);
  expect(box()).toBeNull();
  expect(document.activeElement).toBe(chips(el)[0]);
  // A new note closed with nothing in it was never a note.
  getSelection()!.collapse(page(el).querySelector('p')!, 2);
  button(el, 'Footnote').click();
  await settle(el);
  expect(chips(el)).toHaveLength(2);
  button(box()!, 'Done').click();
  await settle(el);
  expect(chips(el)).toHaveLength(1);
  expect(last() ?? 'Words^[Kept]').toBe('Words^[Kept]');
  // Remove in the box takes a note away.
  chips(el)[0].dispatchEvent(new MouseEvent('click', { bubbles: true, cancelable: true }));
  await settle(el);
  button(box()!, 'Remove footnote').click();
  await settle(el);
  expect(chips(el)).toHaveLength(0);
  expect(last()).toBe('Words');
});

test('deck: a slide shows its notes at its foot, numbered from the headline on; the thumbnail draws them too', async () => {
  const { el } = await mount('deck', '## Head^[On the head]\n\n- One^[First point]\n- Two\n\n---\n\n## Next\n\n- Three^[Only here]');
  const slide = el.querySelector<HTMLElement>('.deck-slide')!;
  const foot = () => [...slide.querySelectorAll<HTMLElement>('.deck-fn li')].map((li) => li.textContent!.trim());
  expect(foot()).toEqual(['On the head', 'First point']);
  // The headline's mark is 1 and the bullets' mark counts on from it.
  expect(slide.querySelector('to-rich.title sup.fn')!.textContent).toBe('1');
  expect(slide.querySelector('.bullets sup.fn')!.textContent).toBe('2');
  // The slides in the rail are drawn with their notes.
  const thumbs = el.querySelectorAll('.deck-rail .deck-thumb svg');
  expect(thumbs[0].textContent).toContain('On the head');
  expect(thumbs[0].textContent).not.toContain('Only here');
  expect(thumbs[1].textContent).toContain('Only here');
  // The Footnote tool works on the box last typed in: one more note in the bullets.
  const words = slide.querySelector<HTMLElement>('.bullets .write-page')!;
  words.dispatchEvent(new FocusEvent('focusin', { bubbles: true, composed: true }));
  getSelection()!.collapse(words.querySelectorAll('p')[1].firstChild!, 3);
  button(el, 'Footnote').click();
  await settle(el);
  const field = box()!.querySelector<HTMLElement>('.write-page')!;
  field.textContent = 'Second point';
  field.dispatchEvent(new InputEvent('input', { bubbles: true, composed: true }));
  await settle(el);
  expect(foot()).toEqual(['On the head', 'First point', 'Second point']);
  expect([...slide.querySelectorAll('.bullets sup.fn')].map((c) => c.textContent)).toEqual(['2', '3']);
});
