// A thing from the web on a slide is the thing, not its address (Paul, 2026-10-11, on a deck of the Bronx's history:
// "The markdown images show as markdown with line breaks, other images don't show and YouTube links are URLs with
// nothing else"), and a link in a slide's words is a link. Under node: the card each kind is drawn as, the picture
// with its card beneath, the links as <a href>, and what the lint and the measure say of it.
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { expect, test } from 'vitest';
import { parse } from '../../../doc/index.ts';
import '../../../kit/apps.ts';
import { appInHead } from '../../../kit/plain.ts';
import { lint, measure } from '../../../lint.ts';
import { lookOf, slidePage, subPage, deckToHtml } from '../view.ts';
import { settingsOf, slidesOf } from '../model.ts';

const BRONX = appInHead(readFileSync(join(import.meta.dirname, '../../../../test/fixtures/lint/bronx.tlo'), 'utf8'))[1];
const one = (text: string) => {
  const doc = parse(text);
  const s = slidesOf(doc)[0];
  return { doc, s, sub: subPage(doc, s), page: slidePage(doc, s, lookOf(settingsOf(doc))) };
};
/** The words an SVG draws: what is inside its <text>s, tags taken away. */
const drawnWords = (svg: string) => [...svg.matchAll(/<text\b[^>]*>([\s\S]*?)<\/text>/g)].map((m) => m[1].replace(/<[^>]+>/g, '')).join(' | ');

test('a film is a card: the play mark on a dark field, the provider small, the title large, the address not drawn, the card a link to it', () => {
  const url = 'https://www.youtube.com/watch?v=eRVYwDtI2E8';
  const { s, sub } = one(`## Film\n\n[The neighbourhood the road replaced](${url})\n`);
  expect(s.sub).toBe(1);
  expect(s.items).toEqual([]);
  expect(sub!.alt).toBe('The neighbourhood the road replaced');
  expect(sub!.svg).toContain(`<a href="${url.replace(/&/g, '&amp;')}" target="_blank" rel="noopener noreferrer"`);
  expect(sub!.svg).toContain('data-kind="video"');
  expect(drawnWords(sub!.svg).replace(/ \| /g, ' ')).toContain('The neighbourhood the road replaced');
  expect(drawnWords(sub!.svg)).toContain('YouTube');
  expect(drawnWords(sub!.svg)).not.toContain('youtube.com');
  expect(drawnWords(sub!.svg)).not.toContain('eRVYwDtI2E8');
  // A bare address: the provider's best, no id in it.
  const bare = one(`## Film\n\n${url}\n`).sub!;
  expect(drawnWords(bare.svg)).toContain('YouTube video');
  expect(drawnWords(bare.svg)).not.toContain('eRVYwDtI2E8');
});

test("an article is a card with the article's glyph and its title; a page nobody embeds, the globe and its host", () => {
  const wiki = one('## Read\n\nhttps://en.wikipedia.org/wiki/History_of_the_Bronx\n').sub!;
  expect(wiki.svg).toContain('data-kind="article"');
  expect(drawnWords(wiki.svg)).toContain('History of the Bronx');
  expect(drawnWords(wiki.svg)).toContain('Wikipedia');
  expect(drawnWords(wiki.svg)).not.toContain('https://');
  // A bare address nobody embeds: the globe and its host. The same address with a title is words (Paul, 2026-10-11:
  // "Plain link should stay words"), so the slide shows the link in its lines and no card.
  const page = one('## Read\n\nhttps://bronxhistoricalsociety.org/\n').sub!;
  expect(page.svg).toContain('data-kind="link"');
  expect(drawnWords(page.svg)).toContain('bronxhistoricalsociety.org');
  const titled = one('## Read\n\n[The society](https://bronxhistoricalsociety.org/)\n');
  expect(titled.sub ?? null).toBeNull();
  expect(titled.s.items.length).toBe(1);
});

test('a picture is drawn over its card: where it cannot be fetched, the alt text and the picture glyph, never a broken glyph', () => {
  const { sub } = one('## Pic\n\n![Opening day, 1923](https://upload.wikimedia.org/x/Opening_Day_(baseball)_1.jpg)\n');
  const svg = sub!.svg;
  expect(svg).toContain('data-pic=""');
  expect(svg.indexOf('data-pic-card')).toBeGreaterThan(-1);
  expect(svg.indexOf('data-pic-card')).toBeLessThan(svg.indexOf('<image'));
  expect(drawnWords(svg)).toContain('Opening day, 1923');
  expect(svg).toContain('href="https://upload.wikimedia.org/x/Opening_Day_(baseball)_1.jpg"');
});

test('a link in the words of a slide is an <a href> round its words, underlined in the link colour; a javascript: address is not', () => {
  const { page } = one('## Links\n\n- The [Lenape](https://en.wikipedia.org/wiki/Lenape) called it Rananchqua\n');
  expect(page.svg).toMatch(/<a href="https:\/\/en\.wikipedia\.org\/wiki\/Lenape" target="_blank" rel="noopener noreferrer"><tspan[^>]*text-decoration="underline"[^>]*>Lenape<\/tspan><\/a>/);
  // A model made by hand can hold any address: only a web, mail or phone address is drawn as a link.
  const doc = parse('## Links\n\n- Not this one\n');
  doc.blocks[1] = { k: 'li', depth: 0, runs: [{ t: 'Not ' }, { t: 'this', href: 'javascript:alert(1)' }, { t: ' one' }] };
  const bad = slidePage(doc, slidesOf(doc)[0], lookOf(settingsOf(doc))).svg;
  expect(bad).not.toContain('javascript:');
  expect(drawnWords(bad)).toContain('Not this one');
  // The headline's links too.
  expect(one('## [Ada](https://en.wikipedia.org/wiki/Ada_Lovelace)\n').page.svg).toContain('<a href="https://en.wikipedia.org/wiki/Ada_Lovelace"');
});

test('the Bronx deck: no slide draws Markdown or a raw address, every film and article is a card, every link in the words an <a href>', () => {
  const doc = parse(BRONX);
  const look = lookOf(settingsOf(doc));
  const pages = slidesOf(doc).map((s) => slidePage(doc, s, look));
  for (const p of pages) {
    expect(drawnWords(p.svg)).not.toMatch(/!\[|\]\(|https?:\/\//);
  }
  expect(pages.filter((p) => p.svg.includes('data-kind="video"'))).toHaveLength(5);
  expect(pages.filter((p) => p.svg.includes('data-kind="article"'))).toHaveLength(1);
  expect(pages.filter((p) => p.svg.includes('data-pic=""'))).toHaveLength(4);
  // Every Wikipedia link in the words is drawn as one (a link a line breaks is two): at least as many as the deck writes.
  const written = BRONX.match(/\]\(https:\/\/en\.wikipedia\.org/g)!.length;
  expect(written).toBe(12);
  expect(pages.map((p) => (p.svg.match(/<a href="https:\/\/en\.wikipedia\.org/g) ?? []).length).reduce((a, b) => a + b)).toBeGreaterThanOrEqual(written);
});

test('the player page follows a link and turns no slide for it', () => {
  const html = deckToHtml('## A\n\n- [Ada](https://en.wikipedia.org/wiki/Ada_Lovelace)\n', 'A');
  expect(html).toContain('<a href="https://en.wikipedia.org/wiki/Ada_Lovelace"');
  expect(html).toMatch(/closest\('a'\)/);
});

test("the lint tells the truth: what each slide shows, by kind, provider and title; a picture's address that redirects is a finding", () => {
  const m = measure('deck', BRONX).slides!;
  expect(m[2]).toMatchObject({ shows: 'picture' });
  expect(m[4]).toMatchObject({ shows: 'web', embed: { kind: 'article', provider: 'Wikipedia', title: 'History of the Bronx' } });
  expect(m[9]).toMatchObject({ shows: 'web', embed: { kind: 'video', provider: 'YouTube', title: 'YouTube video' } });
  expect(m[1]).toMatchObject({ shows: '' });
  expect(m[1].embed).toBeUndefined();
  expect(lint('deck', BRONX).filter((f) => f.kind !== 'length')).toEqual([]);
  const commons = '## Pic\n\n![The flag](https://commons.wikimedia.org/wiki/Special:FilePath/Opening_Day.jpg)\n';
  expect(lint('deck', commons)).toMatchObject([
    {
      kind: 'picture-indirect',
      at: 'slide 1',
      fix: "Commons: use the file's upload.wikimedia.org address; the link page redirects and the proxy does not follow it",
    },
  ]);
  expect(lint('deck', '## Pic\n\n![The flag](https://commons.wikimedia.org/wiki/File:Opening_Day.jpg)\n').map((f) => f.kind)).toEqual(['picture-indirect']);
});
