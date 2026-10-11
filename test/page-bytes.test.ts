// Nothing drawn outside the page follows the screen's lengths (round eight: the stylesheet in rem and em, the root's
// zoom gone): the pages of three documents, as pageSvg writes them and as their thumbnails are drawn, are the bytes
// they were before. The hashes were taken from the tree before the change and are kept here; a change to how a page
// is drawn changes them on purpose, in its own commit.
import { test, expect } from 'vitest';
import { createHash } from 'node:crypto';
import { appOf } from '../src/kit/apps.ts';
import { pageSvg } from '../src/kit/draw.ts';

const DOCS: [string, string][] = [
  ['write', '# The quay\n\nThe ferry leaves the quay at **nine** and the café closes at five.\n\n- a list\n- of two\n'],
  ['deck', '# A talk\n\n## One\n\n- a point\n\n---\n\n## Two\n\nWords on a slide.\n'],
  ['draw', 'rect 10 10 100 60 "A box"\nellipse 160 40 80 50\n'],
];

const hash = (s: string) => createHash('sha256').update(s).digest('hex').slice(0, 16);

/** Every page of each, then its thumbnail, hashed. */
const drawn = () =>
  DOCS.map(([id, doc]) => {
    const app = appOf(id)!;
    const pages = app.view(doc, { still: true }).map((p) => pageSvg(p));
    const thumb = app.view(doc, { small: true, thumb: true }).map((p) => pageSvg(p));
    return `${id}: ${hash(pages.join('\n'))} ${hash(thumb.join('\n'))}`;
  });

test('the pages of three documents, and their thumbnails, are the same bytes as before the stylesheet went to rem', () => {
  expect(drawn()).toEqual(EXPECTED);
});

// Taken again when the type became IBM Plex (r17-plex): the pages name Plex first, a bold word is 600, and the widths
// they are laid out by are Plex's (kit/draw.ts textWidth). The deck's page again when the codec's dictionary primed America/New_York
// (r17-finish): the page's QR code carries the deck's link, and the link's bytes moved.
const EXPECTED = ['write: 14652a4b18137bcc 14652a4b18137bcc', 'deck: 2d9654cfbd24e547 bd6ffaa363d2de69', 'draw: 9191bafafdf3e32c 9191bafafdf3e32c'];
