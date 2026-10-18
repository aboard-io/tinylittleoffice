/**
 * <to-text>, the one editor of words (kit/text/text.ts), alone: given its blocks, it turns every edit into the kernel's
 * operations in "text-ops", and the host applies them and hands the blocks back, as every app does. Its three shapes:
 * `doc` (any block; Enter splits), `lines` (items and paragraphs: a slide's words) and `line` (one block: a title, a
 * cell, a shape's label; Enter says "text-enter"). The words are the Word Processor's meeting template's.
 */
import type { Meta, StoryObj } from '@storybook/web-components-vite';
import { action } from 'storybook/actions';
import { templates } from '../../../src/apps/write/templates.ts';
import { applyAll, parse, type Block } from '../../../src/doc/index.ts';
import { ToText, type Shape, type TextOps } from '../../../src/kit/text/text.ts';
import { box } from '../../support.ts';
import { PEOPLE } from './contract.ts';

interface Args {
  shape: Shape;
  readOnly: boolean;
  marksOnly: boolean;
  noBubble: boolean;
  placeholder: string;
  /** Offer the host's people after "@". */
  mentions: boolean;
  /** Given no words. */
  empty: boolean;
}

const MEETING = templates().find((t) => t.id === 'meeting')!.doc;
/** The words each shape is given: the whole meeting for a doc, its agenda's items for lines, its title for a line. */
const blocksFor = (shape: Shape): Block[] => {
  const all = parse(MEETING).blocks;
  if (shape === 'doc') return all;
  if (shape === 'lines') return all.filter((b) => b.k.startsWith('li'));
  return all.slice(0, 1);
};

/** A <to-text> over `blocks`, its ops applied by the story as a host applies them, the blocks handed back. */
function textBox(args: Args): HTMLElement {
  const host = box();
  // A read-only editor is one inside an element marked readonly (kit/core/element.ts), as an app's editor is.
  if (args.readOnly) host.setAttribute('readonly', '');
  const el = new ToText();
  el.shape = args.shape;
  el.blocks = args.empty ? [] : blocksFor(args.shape);
  el.label = 'Words';
  el.placeholder = args.placeholder;
  el.marksOnly = args.marksOnly;
  el.noBubble = args.noBubble;
  if (args.mentions) el.mentions = PEOPLE.map((p) => ({ name: p.name, detail: p.email }));
  el.addEventListener('text-ops', (e) => {
    const { ops, sel } = (e as CustomEvent<TextOps>).detail;
    action('text-ops')(ops);
    el.blocks = applyAll({ head: {}, blocks: el.blocks }, ops).blocks;
    el.sel = sel;
  });
  for (const name of ['text-enter', 'text-exit', 'text-escape', 'text-selectall', 'text-select']) el.addEventListener(name, (e) => action(name)((e as CustomEvent).detail));
  host.append(el);
  return host;
}

const meta = {
  title: 'Kit/Text/Text',
  component: 'to-text',
  args: { shape: 'doc', readOnly: false, marksOnly: false, noBubble: false, placeholder: 'Type here', mentions: false, empty: false },
  argTypes: {
    shape: { control: 'inline-radio', options: ['doc', 'lines', 'line'], description: '`doc`, `lines` or `line`' },
    readOnly: { control: 'boolean', description: 'Inside an element marked `readonly`: shown, not edited' },
    marksOnly: { control: 'boolean', description: '`marks-only`: the six marks and nothing else (a shape’s label)' },
    noBubble: { control: 'boolean', description: '`no-bubble`: no selection bubble' },
    placeholder: { control: 'text' },
    mentions: { control: 'boolean', description: '`mentions`: "@" offers these people' },
    empty: { control: 'boolean', description: 'Given no blocks' },
  },
  render: textBox,
} satisfies Meta<Args>;
export default meta;
type Story = StoryObj<Args>;

/** A document: headings, items, tasks; select words for the bubble, type ":" and a letter for an icon. */
export const Doc: Story = {};
/** Items and paragraphs, as a slide's words: Backspace at the start says "text-exit". */
export const Lines: Story = { args: { shape: 'lines' } };
/** One block, as a title or a cell: Enter says "text-enter". */
export const Line: Story = { args: { shape: 'line' } };
/** Nothing in it yet: the placeholder. */
export const Empty: Story = { args: { shape: 'line', placeholder: 'A title', empty: true } };
/** Shown, not edited. */
export const ReadOnly: Story = { args: { readOnly: true } };
/** A shape's label: bold, italic and the rest, no links, no notes, no lists. */
export const MarksOnly: Story = { args: { shape: 'line', marksOnly: true } };
/** "@" and a letter offers the host's people. */
export const Mentions: Story = { args: { mentions: true } };
