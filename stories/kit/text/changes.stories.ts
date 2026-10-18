/**
 * Who did what in a document several people write (docs/library.md, Tracked changes and comments for a host): three
 * people's versions of the contract template (contract.ts) tracked (`track`), and drawn over a mounted Word Processor's
 * words with nothing written into them: the words taken out struck through in place, each edit bracketed in its
 * author's color with a lozenge of initials (`ghostsOf`, `showGhosts`), each person's words put in painted in their
 * color (`paint`). The review panel a host draws beside it (the list of `changesOf`, Accept and Reject) is the story's
 * own, as it would be the host's: the kit gives the changes and the edit that rejects one (`rejectOps`), not the panel.
 */
import type { Meta, StoryObj } from '@storybook/web-components-vite';
import { action } from 'storybook/actions';
import { changesOf, rejectOps, track, trackOn, unpaint, unpin, wordsOf, type Change, type GhostAt, type Mounted, type Step, type ToText } from '../../../src/editors.ts';
import { applyAll, parse, write } from '../../../src/doc/index.ts';
import { box, editorBox } from '../../support.ts';
import { ALICE, LATEST, VERSIONS, drawingOf, nameOf, redline } from './contract.ts';

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

/**
 * Alice rejects Carol's taking out of the line on what is paid: the line is back, put in by Alice, beside Carol's taking
 * out, still drawn. (A paragraph put back whole is not paired with the one taken out, so it is not drawn as restored, as
 * words put back in a paragraph are.)
 */
export const RejectedParagraph = rejected(changesWith((c) => c.took.includes('pays')));

/** A reviewer who reads and does not edit: the same drawing over a read-only Word Processor; Alt+Enter still reaches an edit. */
export const Reviewer: Story = {
  args: { readOnly: true },
  render: Redline.render,
};

/** One change, as the panel lists it: who, what they put in and took out, and its Accept and Reject. */
function changeRow(c: Change, versions: Step[], accept: () => void, reject: () => void, done: string): HTMLElement {
  const row = document.createElement('li');
  row.className = 'sb-change';
  row.tabIndex = -1;
  row.dataset.change = c.id;
  const who = nameOf(authorOf(c.id, versions));
  const words = [c.put && `put in “${c.put}”`, c.took && `took out “${c.took}”`, c.styled && `restyled “${c.styled}” (${c.styles.join(', ')})`].filter(Boolean).join('; ');
  row.innerHTML = `<span class="sb-change-dot" style="background:${drawingOf().color(authorOf(c.id, versions))}"></span><div><b></b> <span class="sb-change-what"></span><div class="sb-change-acts"></div></div>`;
  row.querySelector('b')!.textContent = who;
  row.querySelector('.sb-change-what')!.textContent = `${words} (${c.kind})`;
  const acts = row.querySelector('.sb-change-acts')!;
  if (done) acts.textContent = done;
  else
    for (const [label, does] of [
      ['Accept', accept],
      ['Reject', reject],
    ] as const) {
      const b = Object.assign(document.createElement('button'), { type: 'button', className: 'to-btn', textContent: label });
      b.addEventListener('click', does);
      acts.append(b);
    }
  return row;
}

/**
 * The host's review panel beside the words: every change (`changesOf`) in reading order with Accept, which settles it
 * (drawn as plain words), and Reject, which makes the edit that takes it back (`rejectOps` against the words as they are,
 * applied through `applyRemote` as the host's server would hand it in) and keeps the rejection as a version of the
 * reader's. A lozenge reached by Alt+Enter puts the focus on its row.
 */
export const ReviewPanel: Story = {
  argTypes: { accepted: { table: { disable: true } } },
  render: (args) => {
    let versions = [...VERSIONS];
    const accepted = new Set<string>();
    const rejected = new Map<string, number>();
    const rejectedBy = (id: string, seq: number) => (rejected.get(id) ?? Infinity) <= seq;
    const settled = (id: string) => accepted.has(id);
    return review(() => versions, {
      readOnly: args.readOnly,
      settled,
      rejectedBy,
      panel: (m, words) => {
        const panel = document.createElement('aside');
        panel.className = 'sb-changes';
        const draw = async () => {
          const tracked = track(versions, rejectedBy, rejectedBy);
          await redline(words, tracked, settled);
          const list = document.createElement('ol');
          for (const c of changesOf(tracked))
            list.append(
              changeRow(
                c,
                versions,
                () => {
                  accepted.add(c.id);
                  action('accept')(c.id);
                  void draw();
                },
                () => {
                  const ops = rejectOps(track(versions, rejectedBy, rejectedBy), words.model, [c.id]);
                  action('reject')({ id: c.id, ops });
                  if (!ops) return;
                  m.applyRemote(ops);
                  const seq = versions.length;
                  rejected.set(c.id, seq);
                  versions = [...versions, { author: ALICE, text: write(applyAll(parse(versions.at(-1)!.text), ops)), hash: `r${seq}`, seq }];
                  void words.updateComplete.then(draw);
                },
                accepted.has(c.id) ? 'Accepted' : c.kind === 'rejection' ? 'Rejected' : '',
              ),
            );
          panel.replaceChildren(Object.assign(document.createElement('h3'), { textContent: 'Changes' }), list);
        };
        void draw();
        return panel;
      },
    });
  },
};

/** No versions but one: nothing drawn over the words, as on the site's pages, which give none. */
export const NothingTracked: Story = {
  argTypes: { accepted: { table: { disable: true } } },
  render: (args) => review([VERSIONS[2]], { readOnly: args.readOnly }),
};
