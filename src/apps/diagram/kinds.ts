/**
 * The eight kinds by name, icon and the words that help: what a kind is called, what one of its things is
 * called (Insert's item), the words a new one is made with and the hint under the
 * bar. Kept apart from model.ts so the model stays free of the strings and the icons.
 */
import { Armchair, Blend, Brain, GitCommitHorizontal, Network, Rows3, Share2, TreeDeciduous, type IconNode } from 'lucide';
import { t } from '../../kit/i18n.ts';
import type { KindId } from './model.ts';

export const KIND_ICON: Record<KindId, IconNode> = { mind: Brain, org: Network, family: TreeDeciduous, lanes: Rows3, timeline: GitCommitHorizontal, venn: Blend, seating: Armchair, net: Share2 };

export const kindName = (k: KindId): string =>
  ({ mind: t('Mind map'), org: t('Org chart'), family: t('Family tree'), lanes: t('Swimlanes'), timeline: t('Timeline'), venn: t('Venn'), seating: t('Seating chart'), net: t('Network') })[k];

/** One of its things: Insert ▾ offers "Idea", "Person", "Step"… */
export const thingName = (k: KindId): string =>
  ({ mind: t('Idea'), org: t('Person'), family: t('Person'), lanes: t('Step'), timeline: t('Event'), venn: t('Set'), seating: t('Table'), net: t('Thing') })[k];

/** The words a new thing is made with, chosen so the first letter typed replaces them; the placeholder of a thing whose words are all gone. `item`: one thing of a list (a guest at a table, a thing in a set). */
export const newWords = (k: KindId, item = false): string =>
  item
    ? k === 'seating'
      ? t('Guest')
      : t('Thing')
    : { mind: t('New idea'), org: t('Name'), family: t('Name'), lanes: t('Step'), timeline: t('When'), venn: t('Set'), seating: t('Table'), net: t('Thing') }[k];

/** What the picture does, said once under the bar. */
export const kindHint = (k: KindId): string =>
  ({
    mind: t('Tap empty space for a branch; tap an idea to type on it, Enter for the next; drag one onto another to put it under; Join links two across the map.'),
    org: t('Tap empty space for a person; tap one to type on it, Shift+Enter for their role under the name, Enter for the next; drag one onto another to put them under.'),
    family: t(
      'Tap a person to type on them, + after the name for their partner, Shift+Enter for their years under the name; Enter for the next; drag one onto another to put them under; Join draws a dotted line between two.',
    ),
    lanes: t('Tap in a lane to add a step there; tap a step to type on it; drag it to another lane, or onto a step to go after it.'),
    timeline: t('Tap empty space for an event: type when, Shift+Enter, then what happened; years and dates are spaced as they fell; a span is a band.'),
    venn: t("Tap inside the circles to add a thing there, a comma after it for the next; tap a set's name to rename it; drag a thing into other circles."),
    seating: t('Tap empty space for a table; tap a table or a person to type, a comma after a name for the next guest; drag a person to another table.'),
    net: t('Tap empty space for a thing; Join in the bar, then the two things, connects them; or drag one onto another.'),
  })[k];
