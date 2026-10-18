/**
 * Who did what in a document several people write (docs/library.md, Tracked changes and comments for a host): three
 * people's versions of the contract template (contract.ts) tracked (`track`), and drawn over a mounted Word Processor's
 * words with nothing written into them (`drawChanges`): the words taken out struck through in place, each edit
 * bracketed in its author's color with a lozenge of initials (`ghostsOf`, `showGhosts`), each person's words put in
 * painted in their color (`paint`). The list of changes beside them, with Accept and Reject, is Kit/Text/Review panel.
 */
import type { Meta, StoryObj } from '@storybook/web-components-vite';
import { action } from 'storybook/actions';
import { changesOf, rejectOps, track, trackOn, unpaint, unpin, wordsOf, type Change, type GhostAt, type Mounted, type Step, type ToText } from '../../../src/editors.ts';
import { applyAll, parse, write } from '../../../src/doc/index.ts';
import { box, editorBox } from '../../support.ts';
import { ALICE, LATEST, VERSIONS, redline } from './contract.ts';

interface Args {
  /** Whose changes this reader has accepted: drawn as plain words. */
  accepted: string[];
  readOnly: boolean;
}

const meta = {
  title: 'Kit/Text/Changes',
  component: 'to-write-editor',
  args: { accepted: [], readOnly: false },
  argTypes: {
    accepted: { control: 'check', options: VERSIONS.map((v) => v.author), description: 'The people whose changes this reader has accepted (`settled`)' },
    readOnly: { control: 'boolean', description: 'A reviewer who reads and does not edit (`readOnly`)' },
  },
  parameters: { layout: 'padded' },
} satisfies Meta<Args>;
export default meta;
type Story = StoryObj<Args>;

/** The author of a change's id ("v1:0" is the version hashed "v1"'s first). */
const authorOf = (id: string, versions: Step[]) => versions.find((v) => id.startsWith(`${v.hash}:`))?.author ?? '';

/**
 * A Word Processor over the last of `versions`, with who did what drawn over its words, drawn again whenever the words
 * change: what is typed is a version of the reader's (Alice's) too, the last tracking taken one version further
 * (`trackOn`). Alt+Enter in an edit's words tells the host which edit it is ("text-ghost"). `panel` is drawn beside it.
 */
function review(
  given: Step[] | (() => Step[]),
  opts: { readOnly?: boolean; settled?: (id: string) => boolean; rejectedBy?: (id: string, seq: number) => boolean; panel?: (m: Mounted, words: ToText) => HTMLElement },
) {
  const versions = typeof given === 'function' ? given : () => given;
  // The highlights are the page's, not the editor's: another story's go first.
  unpaint();
  unpin();
  const frame = box('sb-review');
  const col = box('sb-review-words');
  frame.append(col);
  const settled = opts.settled ?? (() => false);
  frame.addEventListener('text-ghost', (e) => {
    const { id, block } = (e as CustomEvent<GhostAt>).detail;
    action('text-ghost')({ id, block });
    frame.querySelector<HTMLElement>(`[data-change="${id.replace(/^edit:/, '').split(',')[0]}"]`)?.focus();
  });
  const tracked = () => track(versions(), opts.rejectedBy, opts.rejectedBy);
  const editor = editorBox('write', versions().at(-1)!.text, {
    readOnly: opts.readOnly,
    ready: (m) => {
      const words = wordsOf(m.editor)!;
      if (!opts.panel) void redline(words, tracked(), settled);
      m.editor.addEventListener('docchange', (e) => {
        void redline(words, trackOn(tracked(), { author: ALICE, text: (e as CustomEvent<string>).detail, hash: 'typing' }, versions().length), settled);
      });
      if (opts.panel) frame.append(opts.panel(m, words));
    },
  });
  col.append(editor);
  return frame;
}

/** Three people's versions of the contract, every change drawn: Bob's in his color, Carol's in hers, the line she took out struck through. */
export const Redline: Story = {
  render: (args) => review(VERSIONS, { readOnly: args.readOnly, settled: (id) => args.accepted.includes(authorOf(id, VERSIONS)) }),
};

/** Bob's changes accepted by this reader: drawn as plain words, Carol's still waiting. */
export const Accepted: Story = {
  args: { accepted: [VERSIONS[1].author] },
  render: Redline.render,
};

/** The ids of the changes whose words `has`, among the three versions' changes. */
const changesWith = (has: (c: Change) => boolean) =>
  changesOf(track(VERSIONS))
    .filter(has)
    .map((c) => c.id);
/** The versions with `ids` rejected by Alice: `rejectOps` against the last version's blocks, applied, a version of hers. */
const rejecting = (ids: string[]): Step[] => [...VERSIONS, { author: ALICE, text: write(applyAll(parse(LATEST), rejectOps(track(VERSIONS), parse(LATEST).blocks, ids) ?? [])), hash: 'v3', seq: 3 }];
/** A story of `ids` rejected: the host says they were, from the fourth version on (`rejectedBy`). */
const rejected = (ids: string[]): Story => ({
  argTypes: { accepted: { table: { disable: true } } },
  render: (args) => review(rejecting(ids), { readOnly: args.readOnly, rejectedBy: (id, seq) => ids.includes(id) && seq >= 3 }),
});

/** Alice rejects Bob's words on who it is between: his words are taken out again as rejected, the template's put back. */
export const Rejected = rejected(changesWith((c) => c.put.includes('Bakery')));

/** Alice rejects Carol's taking out of the line on what is paid: the line is back where it was, drawn as restored by Alice. */
export const RejectedParagraph = rejected(changesWith((c) => c.took.includes('pays')));

/** A reviewer who reads and does not edit: the same drawing over a read-only Word Processor; Alt+Enter still reaches an edit. */
export const Reviewer: Story = {
  args: { readOnly: true },
  render: Redline.render,
};

/** No versions but one: nothing drawn over the words, as on the site's pages, which give none. */
export const NothingTracked: Story = {
  argTypes: { accepted: { table: { disable: true } } },
  render: (args) => review([VERSIONS[2]], { readOnly: args.readOnly }),
};
