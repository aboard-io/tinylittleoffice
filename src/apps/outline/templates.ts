/**
 * Outline's templates: Blank is the app's own page; these are the rest, each a real outline written by the
 * kernel (so each is canonical and round-trips byte for byte). The old tree had none; these are the shapes
 * people reach for: a launch, a talk, a book, a decision.
 */
import type { Template } from '../../kit/app.ts';
import { t } from '../../kit/i18n.ts';
import { text, write, type Block, type Dir } from '../../doc/index.ts';
import { itemBlock } from './model.ts';

/** "  - words" style lines: two spaces a level; "{.from}", "{.to}", "{.both}" and "label=" ride on the item as in the format. */
const item = (depth: number, words: string, dir?: Dir, label?: string): Block => itemBlock(depth, text(words), dir, label);
const edge = (from: string, to: string, dir: Dir, label?: string): Block => ({ k: 'edge', from, to, dir, ...(label ? { label } : {}) });
const outline = (...blocks: Block[]): string => write({ head: {}, blocks });

export const templates = (): Template[] => [
  {
    id: 'launch',
    name: t('Launch plan'),
    blurb: t('A product launch: the product, the marketing and the support under it, with a join between two branches.'),
    doc: outline(
      item(0, 'Launch'),
      item(1, 'Product'),
      item(2, 'Pricing', '->', 'sets'),
      item(2, 'Onboarding'),
      item(1, 'Marketing'),
      item(2, 'Press'),
      item(2, 'Newsletter'),
      item(1, 'Support'),
      item(2, 'Help pages'),
      item(2, 'A reply within a day'),
      edge('Pricing', 'Press', '->', 'informs'),
    ),
  },
  {
    id: 'talk',
    name: t('A talk'),
    blurb: t('Twenty minutes in three parts: the problem, the idea, what it means; a slide a top item when shown as a deck.'),
    doc: outline(
      item(0, 'The link is the document'),
      item(1, 'The problem'),
      item(2, 'A file needs a place to live, an account to reach it, a server to keep it'),
      item(2, 'Sharing a file is sharing a place'),
      item(1, 'The idea'),
      item(2, 'Put the whole document after the # in the address'),
      item(2, 'Nothing is sent anywhere; the browser never shares the fragment'),
      item(2, 'Copy the link and you have copied the file'),
      item(1, 'What it means'),
      item(2, 'No sign-up, no saving, no servers to trust'),
      item(2, 'A document is as private as the link'),
      item(2, 'Try it: tinylittleoffice.com'),
    ),
  },
  {
    id: 'book',
    name: t('A book'),
    blurb: t('Parts and chapters, with a line under each chapter for what happens in it.'),
    doc: outline(
      item(0, 'The Lighthouse Keeper'),
      item(1, 'Part one: Arrival'),
      item(2, 'Chapter 1: The ferry'),
      item(3, 'Mara takes the last ferry of the season to the island'),
      item(2, 'Chapter 2: The keeper'),
      item(3, 'Old Finn shows her the lamp and will not say why he is leaving'),
      item(1, 'Part two: Winter'),
      item(2, 'Chapter 3: The storm'),
      item(3, 'The light fails on the worst night of the year'),
      item(2, 'Chapter 4: The letters'),
      item(3, 'A box of letters under the stairs, every one unopened'),
      item(1, 'Part three: Spring'),
      item(2, 'Chapter 5: The first ferry'),
      item(3, 'Mara decides whether to be on it'),
    ),
  },
  {
    id: 'decision',
    name: t('A decision'),
    blurb: t('The question, the options under it, and for each what speaks for it and against it.'),
    doc: outline(
      item(0, 'Should we move the office?'),
      item(1, 'Stay where we are'),
      item(2, 'For: the lease is cheap and everyone knows the way'),
      item(2, 'Against: no room for the two people we are hiring'),
      item(1, 'Take the floor above'),
      item(2, 'For: twice the room, the same address'),
      item(2, 'Against: the rent goes up by a third'),
      item(1, 'Go remote'),
      item(2, 'For: no rent at all; hire anywhere'),
      item(2, 'Against: the workshop needs a room with a bench in it'),
      item(1, 'Decide by the end of the month', '<-', 'then'),
    ),
  },
];
