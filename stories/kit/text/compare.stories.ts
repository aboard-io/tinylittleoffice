/**
 * <to-compare> (kit/ui/compare.ts): two documents side by side, block by block, what the second changed marked; for a
 * person reviewing what an agent or a colleague did. Given its two sides as `a` and `b` (an app and a payload, as a
 * link holds them), here the contract template and Carol's version of it (contract.ts). It is drawn by the site's
 * page.css, so the story asks for it. Swap and a link pasted say "compare-change", which the story takes (preventDefault),
 * so the Storybook's address stays its own.
 */
import type { Meta, StoryObj } from '@storybook/web-components-vite';
import { html } from 'lit';
import { action } from 'storybook/actions';
import { encodeDoc } from '../../../src/kit/core/codec.ts';
import type { CompareChange, Side } from '../../../src/kit/ui/compare.ts';
import '../../../src/kit/ui/compare.ts';
import { CONTRACT, LATEST } from './contract.ts';

interface Args {
  /** Which sides are given. */
  sides: 'both' | 'first' | 'none';
}

const side = (text: string): Side => ({ app: 'write', payload: encodeDoc(text) });
const A = side(CONTRACT);
const B = side(LATEST);

const meta = {
  title: 'Kit/Text/Compare',
  component: 'to-compare',
  parameters: { page: true },
  args: { sides: 'both' },
  argTypes: { sides: { control: 'inline-radio', options: ['both', 'first', 'none'], description: '`a` and `b`: the documents as they were and as they are' } },
  render: ({ sides }) =>
    html`<to-compare
      .a=${sides === 'none' ? null : A}
      .b=${sides === 'both' ? B : null}
      @compare-change=${(e: CustomEvent<CompareChange>) => {
        e.preventDefault();
        action('compare-change')(e.detail);
      }}
    ></to-compare>`,
} satisfies Meta<Args>;
export default meta;
type Story = StoryObj<Args>;

/** The template, and the contract after three people's edits: blocks taken out on the left, put in on the right. */
export const TwoVersions: Story = {};
/** One side given: the second link is asked for. */
export const OneSide: Story = { args: { sides: 'first' } };
/** Neither given, as "#/compare" opens. */
export const Empty: Story = { args: { sides: 'none' } };
