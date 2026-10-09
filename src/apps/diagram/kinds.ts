/**
 * The eight kinds by name, icon and the words that help: what a kind is called, what one of its things is
 * called (Insert's item), how a line of it is written (the empty line's placeholder) and the hint under the
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

/** How a line of the kind is written: the placeholder of an empty one. */
export const lineHint = (k: KindId): string =>
  ({ mind: t('An idea'), org: t('Name | Role'), family: t('Name + partner | b. 1950'), lanes: t('Who: what they do'), timeline: t('When: what happened'), venn: t('Set: thing, thing'), seating: t('Table: Ann, Bob, Cy'), net: t('A thing') })[k];

/** What the picture does, said once under the bar. */
export const kindHint = (k: KindId): string =>
  ({
    mind: t('Tap empty space for a branch; tap an idea to type on it, Enter for the next; drag one onto another to put it under.'),
    org: t('Tap empty space for a person; tap one to type "Name | Role", Enter for the next; drag one onto another to put them under.'),
    family: t('Tap a person to type, "Name + partner | years"; Enter for the next; drag one onto another to put them under.'),
    lanes: t('Tap in a lane to add a step there; tap a step to type on it; drag it to another lane, or onto a step to go after it.'),
    timeline: t('Tap empty space for an event, "When: what happened"; years and dates are spaced as they fell; a span is a band.'),
    venn: t('Tap inside the circles to add a thing there; tap a set\'s name to rename it; drag a thing into other circles.'),
    seating: t('Tap empty space for a table; tap a table or a person to type; drag a person to another table.'),
    net: t('Tap empty space for a thing; Join in the bar, then the two things, connects them; or drag one onto another.'),
  })[k];
