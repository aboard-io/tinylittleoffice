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

const EXPECTED = ['write: 99d352286d96c4d9 99d352286d96c4d9', 'deck: c0a9ad69b66ce9ca 2b93a1c61971ee4d', 'draw: 2d08ac410fa23349 2d08ac410fa23349'];
