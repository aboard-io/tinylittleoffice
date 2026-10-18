/**
 * <to-review-panel> (kit/ui/review-panel.ts): who did what in a document several people write, listed beside its words
 * by author, each in their color, every change in words with where it stands for the reader, and Accept and Reject,
 * one change or all of one person's (docs/library.md, Tracked changes and comments for a host). The panel says what
 * was asked ("review-accept", "review-reject", "review-show") and changes nothing; the host keeps the reviews, here in
 * memory as a host's server would (kit/text/review.ts Review), and makes a rejection an edit of the reader's own
 * (`rejectOps`), applied through `applyRemote` as a server hands it in. The sample is the contract (contract.ts).
 */
import type { Meta, StoryObj } from '@storybook/web-components-vite';
import { action } from 'storybook/actions';
import { changesOf, drawChanges, rejectOps, reviewsOf, track, trackOn, unpaint, unpin, wordsOf, type GhostAt, type Person, type Review, type ReviewAsk, type Step } from '../../../src/editors.ts';
import { applyAll, parse, write } from '../../../src/doc/index.ts';
import { box, editorBox } from '../../support.ts';
import { ALICE, CAST, ORDER, VERSIONS, drawingOf } from './contract.ts';

interface Args {
  /** Who reads: their changes are theirs, the others' wait for them. */
  me: string;
  /** Whoever edits the document reviews it: Accept and Reject. */
  canReview: boolean;
}

const meta = {
  title: 'Kit/Text/Review panel',
  component: 'to-review-panel',
  args: { me: ALICE, canReview: true },
  argTypes: {
    me: { control: 'select', options: ORDER, description: 'Who reads (`me`)' },
    canReview: { control: 'boolean', description: 'Accept and Reject drawn (`can-review`)' },
  },
  parameters: { layout: 'padded' },
} satisfies Meta<Args>;
export default meta;
type Story = StoryObj<Args>;

/** The panel alone, over the contract's three versions, with no review given yet; what it asks said in Actions. */
export const Alone: Story = {
  render: (args) => {
    const panel = document.createElement('to-review-panel');
    Object.assign(panel, { changes: changesOf(track(VERSIONS)), people: CAST, me: args.me, canReview: args.canReview, reviews: [] as Review[] });
    for (const type of ['review-accept', 'review-reject', 'review-show']) panel.addEventListener(type, (e) => action(type)((e as CustomEvent).detail));
    return panel;
  },
};

/** A reader who may not review: where each change stands, and no Accept or Reject. */
export const Reader: Story = { args: { canReview: false }, render: Alone.render };

/** Some reviewed already, as the host's server gives them: Bob's first change accepted, Carol's taking out rejected, each saying by whom (Alice). */
export const Reviewed: Story = {
  render: (args) => {
    const changes = changesOf(track(VERSIONS));
    const reviews: Review[] = [
      { id: 'r1', change_id: changes.find((c) => c.author === VERSIONS[1].author)!.id, by: ALICE, verdict: 'accepted', at_seq: 3 },
      { id: 'r2', change_id: changes.find((c) => c.took.includes('pays'))!.id, by: ALICE, verdict: 'rejected', at_seq: 3 },
    ];
    const panel = document.createElement('to-review-panel');
    Object.assign(panel, { changes, people: CAST, me: args.me, canReview: args.canReview, reviews });
    return panel;
  },
};

/** Twelve people, each a color of their own past the six, read on the paper of either theme (`colorAt`). */
export const ManyPeople: Story = {
  render: (args) => {
    const names = ['Alice Adams', 'Bob Brown', 'Carol Chen', 'Dana Diaz', 'Eli Evans', 'Fay Fox', 'Gus Grant', 'Hana Hill', 'Ivo Ito', 'Jun Jones', 'Kim Kerr', 'Lea Lund'];
    const people: Person[] = names.map((name) => ({ id: name.toLowerCase().replace(' ', '.'), name }));
    let text = 'Payment is due in 30 days.\n';
    const versions: Step[] = [{ author: people[0].id, text, hash: 'v0', seq: 0 }];
    people.slice(1).forEach((p, i) => {
      text = text.replace('.\n', `, ${p.name.split(' ')[0].toLowerCase()}.\n`);
      versions.push({ author: p.id, text, hash: `v${i + 1}`, seq: i + 1 });
    });
    const panel = document.createElement('to-review-panel');
    Object.assign(panel, { changes: changesOf(track(versions)), people, me: args.me, canReview: args.canReview });
    return panel;
  },
};

/**
 * Beside the words, as a host holds it: the contract drawn with who did what (`drawChanges`), the panel beside it. Accept
 * keeps a review, and the change is drawn as plain words; Reject keeps one and makes the edit that takes the change back
 * (`rejectOps`), a version of the reader's, so the rejection is a change of its own. Alt+Enter in an edit's words, or
 * a lozenge, brings its change into view in the panel (`show`); a change chosen in the panel is said in Actions.
 */
export const BesideTheWords: Story = {
  render: (args) => {
    unpaint();
    unpin();
    let versions = [...VERSIONS];
    const reviews: Review[] = [];
    const frame = box('sb-review');
    const col = box('sb-review-words');
    const panel = document.createElement('to-review-panel');
    Object.assign(panel, { people: CAST, me: args.me, canReview: args.canReview, reviews });
    frame.append(col, panel);
    col.append(
      editorBox('write', versions.at(-1)!.text, {
        ready: (m) => {
          const words = wordsOf(m.editor)!;
          const tracking = () => {
            const r = reviewsOf(reviews);
            return { r, tracked: track(versions, r.rejectedBy, r.reviewedBy) };
          };
          const draw = (tracked = tracking().tracked) => {
            const { r } = tracking();
            panel.changes = changesOf(tracked);
            panel.reviews = [...reviews];
            return drawChanges(words, tracked, { settled: r.settled, drawing: drawingOf((ids) => ids.every(r.settled)), order: ORDER });
          };
          void draw();
          m.editor.addEventListener('docchange', (e) => {
            const { r, tracked } = tracking();
            void draw(trackOn(tracked, { author: args.me, text: (e as CustomEvent<string>).detail, hash: 'typing' }, versions.length, r.rejectedBy, r.reviewedBy));
          });
          frame.addEventListener('text-ghost', (e) => {
            const id = (e as CustomEvent<GhostAt>).detail.id.replace(/^edit:/, '').split(' ')[0];
            void panel.show(id);
          });
          panel.addEventListener('review-accept', (e) => {
            const { ids } = (e as CustomEvent<ReviewAsk>).detail;
            action('review-accept')(ids);
            for (const id of ids) reviews.push({ id: `r${reviews.length}`, change_id: id, by: args.me, verdict: 'accepted', at_seq: versions.length - 1 });
            void draw();
          });
          panel.addEventListener('review-reject', (e) => {
            const { ids } = (e as CustomEvent<ReviewAsk>).detail;
            const ops = rejectOps(tracking().tracked, words.model, ids);
            action('review-reject')({ ids, ops });
            if (!ops) return;
            m.applyRemote(ops);
            const seq = versions.length;
            for (const id of ids) reviews.push({ id: `r${reviews.length}`, change_id: id, by: args.me, verdict: 'rejected', at_seq: seq - 1 });
            versions = [...versions, { author: args.me, text: write(applyAll(parse(versions.at(-1)!.text), ops)), hash: `r${seq}`, seq }];
            void draw();
          });
          panel.addEventListener('review-show', (e) => action('review-show')((e as CustomEvent<{ id: string }>).detail.id));
        },
      }),
    );
    return frame;
  },
};
