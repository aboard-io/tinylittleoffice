/**
 * Comments beside the words, as a host whose documents several people write keeps them (docs/library.md, Tracked
 * changes and comments for a host): each comment kept as `{ id, quote }`, the words it is about, and found by them in
 * the words as they are now (`pinComments`), highlighted, its note placed in a column beside them at the height it
 * returns. A comment whose words are gone is not pinned, and the host lists it apart. Where the host marks an element
 * around the editor `data-comments`, words selected bring up the bubble with Comment, which tells the host in
 * "text-comment" to open its own box (marked `data-comment-box`). And "@" offers the host's people (`mentions`). The
 * comments, their box and their storage are the story's, as they would be the host's: the kit finds and draws them.
 */
import type { Meta, StoryObj } from '@storybook/web-components-vite';
import { action } from 'storybook/actions';
import { pinComments, textOf, track, unpaint, unpin, wordsOf, type Mounted, type ToText } from '../../../src/editors.ts';
import { box, editorBox } from '../../support.ts';
import { ALICE, BOB, CAROL, LATEST, PEOPLE, VERSIONS, nameOf, redline } from './contract.ts';

interface Note {
  id: string;
  quote: string;
  by: string;
  says: string;
}
interface Args {
  readOnly: boolean;
  /** Who did what drawn under the comments too. */
  redline: boolean;
}

const meta = {
  title: 'Kit/Text/Comments',
  component: 'to-write-editor',
  args: { readOnly: false, redline: false },
  argTypes: {
    readOnly: { control: 'boolean', description: 'A reader who comments and does not edit: the bubble is Comment alone' },
    redline: { control: 'boolean', description: 'Who did what (Kit/Text/Changes) drawn under the comments' },
  },
} satisfies Meta<Args>;
export default meta;
type Story = StoryObj<Args>;

/** The comments the host keeps on the contract: the last one's words were taken out by Carol, so it is pinned nowhere. */
const NOTES: Note[] = [
  { id: 'c1', quote: 'from 1 November 2026', by: CAROL, says: 'Can we start on the 15th instead?' },
  { id: 'c2', quote: 'by 15 December', by: ALICE, says: 'The sign has to be up before the holidays.' },
  { id: 'c3', quote: 'Brooklyn', by: BOB, says: 'I sign in Queens; does it matter?' },
  { id: 'c4', quote: 'What the other pays or does in return.', by: BOB, says: 'Half now and half on delivery, as we said.' },
];

/** The words a selection in one block covers, as the editor counts them: the quote a new comment keeps. */
function quoteOf(words: ToText): string {
  const sel = words.sel;
  if (!sel || sel.anchor.block !== sel.focus.block) return '';
  const [from, to] = [sel.anchor.offset, sel.focus.offset].sort((a, b) => a - b);
  return textOf(words.model[sel.anchor.block]).slice(from, to);
}

/** A comment's note: who, what they said, and the words it is about. */
function noteEl(n: Note, top?: number): HTMLElement {
  const el = document.createElement('article');
  el.className = 'sb-note';
  el.dataset.comment = n.id;
  if (top !== undefined) el.style.top = `${top}px`;
  el.innerHTML = '<b></b><p></p><q></q>';
  el.querySelector('b')!.textContent = nameOf(n.by);
  el.querySelector('p')!.textContent = n.says;
  el.querySelector('q')!.textContent = n.quote;
  return el;
}

/**
 * The contract in a Word Processor with its comments in a column beside it, pinned again whenever the words change;
 * the bubble's Comment opens a box for a new one on the words selected.
 */
function commented(args: Args, notes: Note[] = [...NOTES]) {
  unpaint();
  unpin();
  const frame = box('sb-review');
  frame.dataset.comments = '';
  const col = box('sb-review-words');
  const margin = box('sb-notes');
  const gone = box('sb-notes-gone');
  frame.append(col, margin);
  let words: ToText | null = null;
  const pin = () => {
    if (!words) return;
    const pinned = pinComments(words, frame, notes);
    action('pinned')(pinned);
    const at = new Map(pinned.map((p) => [p.id, p.top]));
    // Notes placed at their words' height, each pushed below the one before where two would meet.
    const els = notes.filter((n) => at.has(n.id)).sort((a, b) => at.get(a.id)! - at.get(b.id)!);
    margin.replaceChildren(...els.map((n) => noteEl(n, at.get(n.id))));
    let floor = 0;
    for (const el of margin.children as HTMLCollectionOf<HTMLElement>) {
      const top = Math.max(parseFloat(el.style.top), floor);
      el.style.top = `${top}px`;
      floor = top + el.offsetHeight + 8;
    }
    const missing = notes.filter((n) => !at.has(n.id));
    gone.replaceChildren(...(missing.length ? [Object.assign(document.createElement('h4'), { textContent: 'On words no longer there' }), ...missing.map((n) => noteEl(n))] : []));
  };
  /** The host's box for a new comment on `quote`, inside data-comment-box, where the bubble offers no Comment. */
  const ask = (quote: string) => {
    const form = document.createElement('form');
    form.className = 'sb-comment-box';
    form.dataset.commentBox = '';
    form.innerHTML = '<q></q><textarea rows="2" aria-label="Comment"></textarea><button class="to-btn" type="submit">Comment</button>';
    form.querySelector('q')!.textContent = quote;
    form.addEventListener('submit', (e) => {
      e.preventDefault();
      const says = form.querySelector('textarea')!.value.trim();
      if (says) notes.push({ id: `c${notes.length + 1}`, quote, by: ALICE, says });
      form.remove();
      pin();
    });
    margin.before(form);
    form.querySelector('textarea')!.focus();
  };
  frame.addEventListener('text-comment', (e) => {
    const quote = quoteOf(e.target as ToText);
    action('text-comment')({ quote });
    if (quote) ask(quote);
  });
  col.append(
    editorBox('write', LATEST, {
      readOnly: args.readOnly,
      ready: (m: Mounted) => {
        words = wordsOf(m.editor)!;
        const draw = async () => {
          if (args.redline) await redline(words!, track(VERSIONS));
          pin();
        };
        void draw();
        m.editor.addEventListener('docchange', () => void words!.updateComplete.then(pin));
      },
    }),
    gone,
  );
  return frame;
}

/** The comments pinned by their quotes beside the words, the one whose words were taken out listed under the words. */
export const Pinned: Story = { render: (args) => commented(args) };

/** The same over who did what: the comments' yellow over each person's color. */
export const OverChanges: Story = { args: { redline: true }, render: (args) => commented(args) };

/** A reader who comments and does not edit: selecting words brings up the bubble with Comment alone. */
export const Reader: Story = { args: { readOnly: true }, render: (args) => commented(args) };

/** No comments yet: select some words and choose Comment in the bubble to add one. */
export const FromTheBubble: Story = { render: (args) => commented(args, []) };

/** "@" offers the host's people (`mentions`), the one picked put in by name: type "@" and a letter in the words. */
export const Mentions: Story = {
  argTypes: { redline: { table: { disable: true } } },
  render: (args) =>
    editorBox('write', LATEST, {
      readOnly: args.readOnly,
      ready: (m) => {
        wordsOf(m.editor)!.mentions = PEOPLE.map((p) => ({ name: p.name, detail: p.email }));
      },
    }),
};
