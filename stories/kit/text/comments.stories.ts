/**
 * <to-comments> (kit/ui/comments.ts), the margin: the comments of a document several people write beside its words
 * (docs/library.md, Tracked changes and comments for a host). Each thread is a note at the height of the words it
 * quotes (`pinComments`), the notes kept from meeting, placed again as the words move (an edit, a scroll, a width, who
 * did what drawn again); on a phone a sheet, opened by the button at the foot. A note opens its thread: every comment,
 * a reply (with "@" for the host's people), Resolve. Words selected bring up the bubble's Comment, which opens a box
 * beside them (kit/text/quote.ts `quoteAt`). The comments are the host's, kept here in memory as a host's server keeps
 * them (kit/text/review.ts Comment): the margin says what was asked ("comment-send", "comment-resolve",
 * "comment-delete") and the host keeps it, then hands the comments back. Asking the host's assistant is the last
 * story: a comment that asks it is answered in the thread, with a tracked change the assistant made in answer.
 */
import type { Meta, StoryObj } from '@storybook/web-components-vite';
import { action } from 'storybook/actions';
import {
  changesOf,
  covers,
  drawChanges,
  rejectOps,
  reviewsOf,
  track,
  unpaint,
  unpin,
  wordsOf,
  type Comment,
  type CommentSend,
  type Mounted,
  type Person,
  type Review,
  type ReviewAsk,
  type Step,
  type ToComments,
} from '../../../src/editors.ts';
import { applyAll, parse, write, type Op } from '../../../src/doc/index.ts';
import { box, editorBox } from '../../support.ts';
import { ALICE, BOB, CAROL, CAST, LATEST, ORDER, PEOPLE, VERSIONS, drawingOf, redline } from './contract.ts';

interface Args {
  /** A reader who comments and does not edit: the bubble is Comment alone. */
  readOnly: boolean;
  /** Who did what (Kit/Text/Changes) drawn under the comments too. */
  redline: boolean;
  /** Whoever reads may comment. */
  canComment: boolean;
}

const meta = {
  title: 'Kit/Text/Comments',
  component: 'to-comments',
  args: { readOnly: false, redline: false, canComment: true },
  argTypes: {
    readOnly: { control: 'boolean', description: 'A reader who comments and does not edit: the bubble is Comment alone' },
    redline: { control: 'boolean', description: 'Who did what (Kit/Text/Changes) drawn under the comments' },
    canComment: { control: 'boolean', description: 'The boxes, Resolve and the bubble’s Comment (`can-comment`)' },
  },
  parameters: { layout: 'padded', covers: ['to-comment-box'] },
} satisfies Meta<Args>;
export default meta;
type Story = StoryObj<Args>;

const at = (minutes: number) => new Date(Date.UTC(2026, 9, 18, 14, minutes)).toISOString();
/** The comments the host keeps on the contract, as its server gives them: the fifth one's words were taken out by Carol. */
const NOTES: Comment[] = [
  { id: 'c1', quote: 'from 1 November 2026', by: CAROL, text: 'Can we start on the 15th instead?', created_at: at(1) },
  { id: 'c2', parent_id: 'c1', by: BOB, text: 'Fine by us.', created_at: at(5) },
  { id: 'c3', quote: 'by 15 December', by: ALICE, text: 'The sign has to be up before the holidays.', created_at: at(2) },
  { id: 'c4', quote: 'Brooklyn', by: BOB, text: 'I sign in Queens; does it matter?', created_at: at(3) },
  { id: 'c5', quote: 'What the other pays or does in return.', by: BOB, text: 'Half now and half on delivery, as we said.', created_at: at(4) },
  { id: 'c6', by: CAROL, text: 'Looks good overall.', created_at: at(6), resolved_at: at(7) },
];

/** The host's assistant, as the margin offers it. */
const ASSISTANT: Person = { id: 'assistant', name: 'Assistant' };

/**
 * The contract in a Word Processor with the margin beside it, the host keeping its comments: a comment sent is kept
 * (`done`), a thread resolved or opened again, a comment of the reader's deleted. `onSend` is the host's own besides.
 */
function commented(args: Args, given: Comment[] = NOTES, o: { ask?: Person; onSend?: (sent: CommentSend, kept: Comment, m: Mounted, margin: ToComments) => void } = {}) {
  unpaint();
  unpin();
  let comments = given.map((c) => ({ ...c }));
  const frame = box('sb-review');
  const col = box('sb-review-words');
  const margin = document.createElement('to-comments');
  Object.assign(margin, { comments, people: CAST, me: ALICE, canComment: args.canComment, ask: o.ask ?? null });
  frame.append(col, margin);
  const keep = (next: Comment[]) => {
    comments = next;
    margin.comments = comments;
  };
  let mounted: Mounted | null = null;
  margin.addEventListener('comment-send', (e) => {
    const sent = (e as CustomEvent<CommentSend>).detail;
    action('comment-send')({ ...sent, done: undefined });
    const kept: Comment = {
      id: `c${comments.length + 1}-${Date.now()}`,
      parent_id: sent.parent_id,
      by: ALICE,
      text: sent.text,
      to_assistant: sent.ask,
      created_at: new Date().toISOString(),
      ...(sent.quote ? { quote: sent.quote.quote, block: sent.quote.block, offset: sent.quote.offset } : {}),
    };
    keep([...comments, kept]);
    sent.done(true);
    if (mounted) o.onSend?.(sent, kept, mounted, margin);
  });
  margin.addEventListener('comment-resolve', (e) => {
    const { thread_id, resolved } = (e as CustomEvent<{ thread_id: string; resolved: boolean }>).detail;
    action('comment-resolve')({ thread_id, resolved });
    keep(comments.map((c) => (c.id === thread_id ? { ...c, resolved_at: resolved ? new Date().toISOString() : null } : c)));
  });
  margin.addEventListener('comment-delete', (e) => {
    const { id } = (e as CustomEvent<{ id: string }>).detail;
    action('comment-delete')(id);
    keep(comments.map((c) => (c.id === id ? { ...c, deleted_at: new Date().toISOString() } : c)));
  });
  col.append(
    editorBox('write', LATEST, {
      readOnly: args.readOnly,
      ready: (m) => {
        mounted = m;
        const words = wordsOf(m.editor)!;
        words.mentions = [...PEOPLE.map((p) => ({ name: p.name, detail: p.email })), ...(o.ask ? [{ name: o.ask.name }] : [])];
        margin.words = words;
        if (args.redline) void redline(words, track(VERSIONS));
      },
    }),
  );
  return frame;
}

/** The threads pinned by their quotes beside the words; the one whose words were taken out under them, and one resolved, folded. */
export const Pinned: Story = { render: (args) => commented(args) };

/** The same over who did what: the comments' yellow over each person's color, the notes placed after the ghosts are drawn. */
export const OverChanges: Story = { args: { redline: true }, render: (args) => commented(args) };

/** A reader who comments and does not edit: selecting words brings up the bubble with Comment alone. */
export const Reader: Story = { args: { readOnly: true }, render: (args) => commented(args) };

/** No comments yet: select some words and choose Comment in the bubble to add one. */
export const FromTheBubble: Story = { render: (args) => commented(args, []) };

/** A reader who may not comment: the threads to read, no box, no Resolve, no Comment in the bubble. */
export const ReadOnlyThreads: Story = { args: { canComment: false, readOnly: true }, render: (args) => commented(args) };

/**
 * Asking the host's assistant: "@Assistant" in a comment, or Ask Assistant beside Comment, asks it; the thread says it
 * is answering, and its answer comes in the thread with the change it made, tracked as its own (a version of the
 * assistant's), to accept or reject there (a rejection the reader's edit, `rejectOps`). Here the story stands in for the
 * host's assistant: a comment that asks gets, a moment later, the quoted words in capitals and a reply saying so. The
 * change accepted or rejected says by whom ("Accepted by Alice Adams"), and the asker may delete the assistant's reply
 * (`canDelete`).
 */
export const AskTheAssistant: Story = {
  args: { redline: true },
  render: (args) => {
    let versions: Step[] = [...VERSIONS];
    const reviews: Review[] = [];
    let held: Mounted | null = null;
    const draw = (m: Mounted, margin: ToComments) => {
      held = m;
      const r = reviewsOf(reviews);
      const tracked = track(versions, r.rejectedBy, r.reviewedBy);
      margin.changes = changesOf(tracked);
      margin.reviews = [...reviews];
      return drawChanges(wordsOf(m.editor)!, tracked, { settled: r.settled, drawing: drawingOf((ids) => ids.every(r.settled)), order: [...ORDER, ASSISTANT.id] });
    };
    const frame = commented(args, NOTES.slice(0, 2), {
      ask: ASSISTANT,
      onSend: (sent, kept, m, margin) => {
        if (!sent.ask) return;
        const thread = margin.threads.find((th) => th.comments.some((c) => c.id === kept.id))!;
        const quote = thread.quote.split('\n')[0];
        setTimeout(() => {
          const doc = parse(versions.at(-1)!.text);
          const words = (i: number) => {
            const b = doc.blocks[i];
            return 'runs' in b ? b.runs.map((x) => x.t).join('') : '';
          };
          const block = quote ? doc.blocks.findIndex((_, i) => words(i).includes(quote)) : -1;
          const reply: Comment = {
            id: `a${Date.now()}`,
            parent_id: kept.id,
            by: ASSISTANT.id,
            text: block < 0 ? 'I can only change words a thread is about.' : `Done: “${quote.toUpperCase()}”.`,
            created_at: new Date().toISOString(),
          };
          if (block >= 0) {
            const from = words(block).indexOf(quote);
            const ops: Op[] = [{ op: 'text', at: block, from, to: from + quote.length, runs: [{ t: quote.toUpperCase() }] }];
            m.applyRemote(ops);
            const seq = versions.length;
            versions = [...versions, { author: ASSISTANT.id, text: write(applyAll(doc, ops)), hash: `assistant${seq}`, seq }];
            reply.change_ids = [`assistant${seq}:*`];
          }
          margin.comments = [...margin.comments, reply];
          void draw(m, margin);
        }, 700);
      },
    });
    const margin = frame.querySelector('to-comments')!;
    margin.canReview = true;
    // Whoever asked may take the assistant's answer away, as well as their own comments (`canDelete`).
    margin.canDelete = (c) => c.by === ALICE || c.by === ASSISTANT.id;
    for (const verdict of ['accept', 'reject'] as const)
      margin.addEventListener(`review-${verdict}`, (e) => {
        const { ids } = (e as CustomEvent<ReviewAsk>).detail;
        action(`review-${verdict}`)(ids);
        const m = held;
        if (!m) return;
        // A rejection is the reader's edit: the words the assistant changed put back as they were (rejectOps), a version of Alice's.
        const r = reviewsOf(reviews);
        const ops =
          verdict === 'reject'
            ? rejectOps(
                track(versions, r.rejectedBy, r.reviewedBy),
                wordsOf(m.editor)!.model,
                margin.changes.filter((c) => ids.some((id) => covers(id, c.id))).map((c) => c.id),
              )
            : [];
        if (!ops) return;
        for (const id of ids) reviews.push({ change_id: id, by: ALICE, verdict: verdict === 'accept' ? 'accepted' : 'rejected', at_seq: versions.length - 1 });
        if (ops.length) {
          m.applyRemote(ops);
          versions = [...versions, { author: ALICE, text: write(applyAll(parse(versions.at(-1)!.text), ops)), hash: `r${versions.length}`, seq: versions.length }];
        }
        void draw(m, margin);
      });
    return frame;
  },
};

/** "@" offers the host's people (`mentions`) in the words too, the one picked put in by name: type "@" and a letter. */
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

/**
 * The margin in a frame narrower than 760px on a wide screen: a sheet by the width it and the words share, not the
 * screen's, its button at the foot's start (`anchor="start"`), clear of a host's own button at the end.
 */
export const SheetAtTheStart: Story = {
  render: (args) => {
    const frame = commented(args);
    Object.assign(frame.style, { maxWidth: '36rem', gridTemplateColumns: 'minmax(0, 1fr)' });
    frame.querySelector('to-comments')!.anchor = 'start';
    return frame;
  },
};
