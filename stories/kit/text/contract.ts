/**
 * The sample the Kit/Text stories share: the Word Processor's contract template (src/apps/write/templates.ts), and three
 * people's versions of it as a host keeps them (`Step`s): Alice starts from the template, Bob fills in who it is between
 * and what is done, Carol takes out the line on what is paid, makes the heading smaller and puts in where it is signed. And a host's
 * drawing of who did what over a mounted Word Processor (docs/library.md, Tracked changes and comments for a host),
 * written as a host writes it: the ghosts first, awaited, then the paint.
 */
import { templates } from '../../../src/apps/write/templates.ts';
import { COLORS, ghostsOf, initialsOf, paint, type Drawing, type Step, type ToText, type Tracked } from '../../../src/editors.ts';

export const PEOPLE = [
  { email: 'alice@sunset.example', name: 'Alice Adams' },
  { email: 'bob@ada.example', name: 'Bob Brown' },
  { email: 'carol@sunset.example', name: 'Carol Chen' },
];
/** The order the host gives its people: a person's color is their place in it. */
export const ORDER = PEOPLE.map((p) => p.email);
export const [ALICE, BOB, CAROL] = ORDER;
const nameOf = (who: string) => PEOPLE.find((p) => p.email === who)?.name ?? who;
const initials = initialsOf(PEOPLE);

/** The template as the kernel writes it: Alice's first version. */
export const CONTRACT = templates().find((t) => t.id === 'contract')!.doc;
/** Bob's: the title, who it is between, and the first thing agreed, in place of their hints. */
const BOBS = CONTRACT.replace('*What this agreement is about*', 'Design services agreement')
  .replace('*Between whom, and from when.*', 'Between Sunset Bakery and Ada Studio, from 1 November 2026.')
  .replace('*What one of you does, and when.*', 'Ada Studio designs the menus and the sign by 15 December.');
/**
 * Carol's: the line on what is paid taken out (it goes in a schedule of its own), the heading one level smaller, and a
 * line put in at the foot. (A paragraph taken out is drawn before the block after it; the last of a document's blocks
 * taken out, with none after it, is not drawn at all, so the line taken out here is one with a line after it.)
 */
const CAROLS = `${BOBS.replace('- *What the other pays or does in return.*\n', '').replace('## What is agreed', '### What is agreed')}\nSigned in Brooklyn on 20 October 2026.\n`;

export const VERSIONS: Step[] = [
  { author: ALICE, text: CONTRACT, hash: 'v0', seq: 0 },
  { author: BOB, text: BOBS, hash: 'v1', seq: 1 },
  { author: CAROL, text: CAROLS, hash: 'v2', seq: 2 },
];
/** The document as it stands: the last version's text. */
export const LATEST = CAROLS;

/** How the host names and draws its people, in its own words; `accepted` says which edits this reader has accepted. */
export const drawingOf = (accepted: (ids: string[]) => boolean = () => false): Drawing => ({
  color: (who) => COLORS[Math.max(0, ORDER.indexOf(who)) % COLORS.length],
  initials: (who) => initials.get(who) ?? '?',
  name: nameOf,
  accepted,
  takenOutBy: (name) => `Taken out by ${name}`,
  cardChanged: 'Changed',
  rejected: 'rejected',
  restored: 'restored',
});

/** Who did what, drawn over the words as a host draws it: the ghosts given and drawn first, then each person's words painted. */
export async function redline(words: ToText, tracked: Tracked[], settled: (id: string) => boolean = () => false) {
  const ghosts = ghostsOf(
    tracked,
    words.model,
    settled,
    drawingOf((ids) => ids.every(settled)),
  );
  await words.showGhosts(ghosts.size ? (i) => ghosts.get(i) ?? [] : null);
  paint(words, tracked, ORDER, settled);
}

export { nameOf };
