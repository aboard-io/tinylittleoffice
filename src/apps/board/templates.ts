/**
 * The Board's templates: Blank is the app's own (To do, Doing and Done, no cards); these are the rest, each a table
 * with a status column, a title column and two or three typed fields, its lanes fixed in the head so an empty lane
 * shows and the lanes keep their order. Written by the kernel (the model's `boardDoc`, as a host builds a board from
 * its own records), so each is canonical and round-trips byte for byte (tests/view.test.ts holds every one).
 * templates.md beside this file says what each is for. Their names and blurbs are the reader's language; their cards
 * are English, as the suite's templates are.
 */
import { column, write } from '../../doc/index.ts';
import { t } from '../../kit/core/i18n.ts';
import type { Template } from '../../kit/core/app.ts';
import { boardDoc } from './model.ts';

/** A template's text: its lanes, its columns by their headings (`Status:option`), its rows. */
const board = (lanes: string[], head: string[], ...rows: string[][]) => write(boardDoc(lanes, head.map(column), rows));

const PROJECT = board(
  ['To do', 'Doing', 'Done'],
  ['Task', 'Status:option', 'Owner', 'Due:date'],
  ['Write the launch brief', 'Done', 'Maya', '2026-11-02'],
  ['Book the photographer', 'Done', 'Leo', '2026-11-04'],
  ['Draft the press release', 'Doing', 'Maya', '2026-11-09'],
  ['Build the landing page', 'Doing', 'Sam', '2026-11-13'],
  ['Order the samples', 'To do', 'Leo', '2026-11-16'],
  ['Plan the launch party', 'To do', 'Priya', '2026-11-20'],
  ['Send the thank-you notes', 'To do', 'Maya', '2026-11-30'],
);

const PIPELINE = board(
  ['Inbound', 'Qualifying', 'Proposal', 'Negotiating', 'Won', 'Lost'],
  ['Deal', 'Stage:option', 'Company', 'Owner', 'Value:money', 'Close:date'],
  ['Website redesign', 'Inbound', 'Hudson Bakery', 'Maya Patel', '12000', '2026-12-15'],
  ['Office move', 'Inbound', 'Greenpoint Dental', 'Leo Brooks', '8500', '2027-01-10'],
  ['Annual retainer', 'Qualifying', 'Harbor Law', 'Maya Patel', '48000', '2026-12-01'],
  ['Spring catalog', 'Proposal', 'Bowery Outfitters', 'Sam Okafor', '22000', '2026-11-20'],
  ['Event series', 'Negotiating', 'Queens Museum Friends', 'Priya Shah', '30000', '2026-11-14'],
  ['Brand refresh', 'Won', 'Flatiron Coffee', 'Leo Brooks', '18000', '2026-10-30'],
  ['App prototype', 'Lost', 'Canal Street Labs', 'Sam Okafor', '40000', '2026-10-21'],
);

const HIRING = board(
  ['Applied', 'Phone screen', 'Interview', 'Offer', 'Hired'],
  ['Candidate', 'Stage:option', 'Role', 'Next step:date'],
  ['Jordan Lee', 'Applied', 'Designer', '2026-11-03'],
  ['Ana Ruiz', 'Applied', 'Engineer', '2026-11-03'],
  ['Kwame Mensah', 'Phone screen', 'Engineer', '2026-11-05'],
  ['Hana Sato', 'Interview', 'Designer', '2026-11-06'],
  ['Omar Haddad', 'Offer', 'Product manager', '2026-11-10'],
  ['Grace Kim', 'Hired', 'Engineer', '2026-11-17'],
);

const CONTENT = board(
  ['Ideas', 'Writing', 'Editing', 'Scheduled', 'Published'],
  ['Piece', 'Status:option', 'Channel', 'Author', 'Publish:date'],
  ['Ten years of the store', 'Ideas', 'Blog', 'Maya', ''],
  ['Winter gift guide', 'Writing', 'Newsletter', 'Sam', '2026-11-24'],
  ['Behind the counter: Leo', 'Writing', 'Instagram', 'Priya', '2026-11-12'],
  ['How we roast', 'Editing', 'Blog', 'Leo', '2026-11-05'],
  ['Holiday hours', 'Scheduled', 'Newsletter', 'Maya', '2026-12-01'],
  ['Fall menu is here', 'Published', 'Instagram', 'Sam', '2026-10-14'],
);

export const templates = (): Template[] => [
  { id: 'project', name: t('board-project-board'), blurb: t('board-to-do-doing-done-owner'), doc: PROJECT },
  { id: 'pipeline', name: t('board-sales-pipeline'), blurb: t('board-deals-from-inbound-to-won'), doc: PIPELINE },
  { id: 'hiring', name: t('board-hiring'), blurb: t('board-candidates-from-application-to-hire'), doc: HIRING },
  { id: 'content', name: t('board-content-calendar'), blurb: t('board-pieces-from-idea-to-published'), doc: CONTENT },
];
