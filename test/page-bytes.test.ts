// Nothing drawn outside the page follows the screen's lengths (the stylesheet in rem and em, no zoom on the root): the pages of three documents, as pageSvg writes them and as their thumbnails are drawn, are the bytes
// they were before. The hashes were taken from the tree before the change and are kept here; a change to how a page
// is drawn changes them on purpose, in its own commit.
import { test, expect } from 'vitest';
import { createHash } from 'node:crypto';
import { appOf } from '../src/kit/core/apps.ts';
import { pageSvg } from '../src/kit/draw/draw.ts';

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

// Taken again when the type became IBM Plex: the pages name Plex first, a bold word is 600, and the widths
// they are laid out by are Plex's (kit/draw/draw.ts textWidth). The deck's page again when the codec's dictionary primed America/New_York
// the page's QR code carries the deck's link, and the link's bytes moved. Again when Plex Sans Hebrew joined the stack
// the pages name (2026-10-12: Hebrew and Yiddish). The Word Processor's thumbnail again when a page drawn small was
// cut to what is on it (2026-10-13, Paul: the letter on a slide "incredibly tiny"); its pages are the same bytes. The
// deck's pages again when its closing slide's words became plain English (2026-10-15: "Final slide: a QR code of this
// deck"); its thumbnail is the same bytes. The deck's pages again when links became v2's (2026-11-28, issue #23): that
// QR code carries the new link; nothing else on them moved.
const EXPECTED = ['write: 7fa7e906573f1eb5 191769917eca34cf', 'deck: 9b21d424f8d583a5 4591013f70b3b48d', 'draw: ae66f4e757ef97b9 ae66f4e757ef97b9'];
