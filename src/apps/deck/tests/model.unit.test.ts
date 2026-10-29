// The Deck under node: slides as spans, the layouts and the icon, every command as ops that round-trip, the
// settings in the header, loose Markdown made slides, the themes read on their paper, the formats' page
// counts and impositions, the closing QR slide, every template canonical, PowerPoint and the player page.
import { strFromU8, unzipSync } from 'fflate';
import { expect, test } from 'vitest';
import { applyAll, parse, plainText, write } from '../../../doc/index.ts';
import deck from '../def.ts';
// The registry, so a sheet on a slide is drawn by its own app.
import '../../../kit/core/apps.ts';
import {
  addSlide,
  duplicateSlides,
  FORMATS,
  isBlank,
  loosen,
  moveSlide,
  panelOf,
  removeSlide,
  retitle,
  slideBlocks,
  setIcon,
  setLayout,
  setSub,
  settingsOf,
  slideNotes,
  slidesOf,
  titleOf,
} from '../model.ts';
import { buildPptx, deckToPptx } from '../pptx.ts';
import { decodeDoc } from '../../../kit/core/codec.ts';
import { parseHash } from '../../../kit/core/route.ts';
import { templates } from '../templates.ts';
import { contrast, THEMES } from '../theme.ts';
import { closingPage, deckFrames, frameMs, takeHomeLink, wantsClosing, deckPages, deckToHtml, layoutSlide, lookOf, pageCount, pagesOf, sheetsOf, slidePage, slideSteps, wrap } from '../view.ts';

const TALK = templates().find((x) => x.id === 'talk')!.doc;
const tpl = (id: string) => templates().find((x) => x.id === id)!.doc;
const ctx = { def: deck, title: 'Test', link: 'https://tinylittleoffice.com/#/v1/deck/rAbc' };

test('slides are spans between rules: headline, icon, layout, words, the right column, notes, a document', () => {
  const doc = parse(
    '## :rocket: Hello {.title}\n\n- Sub\n\n---\n\n## Two {.two}\n\n- a\n  - a2\n\n|\n\n1. b\n2. c\n\n> say this\n> and this\n\n---\n\n```sheet\n| A | B |\n| --- | --- |\n| 1 | 2 |\n```\n',
  );
  const [s1, s2, s3] = slidesOf(doc);
  expect([s1.from, s1.to, s1.head, s1.layout, s1.icon, plainText(s1.title)]).toEqual([0, 2, 0, 't', 'rocket', 'Hello']);
  expect(s1.items.map((it) => plainText(it.runs))).toEqual(['Sub']);
  expect([s2.from, s2.to, s2.layout, s2.pipe]).toEqual([3, 10, '2', 6]);
  expect(s2.items.map((it) => [plainText(it.runs), it.depth])).toEqual([
    ['a', 0],
    ['a2', 1],
  ]);
  expect(s2.right.map((it) => [plainText(it.runs), it.n])).toEqual([
    ['b', 1],
    ['c', 2],
  ]);
  expect(s2.notes).toEqual([9, 10]);
  expect(s2.noteLines).toEqual(['say this', 'and this']);
  expect(s2.words).toEqual([4, 9]);
  expect([s3.sub, s3.head, isBlank(s3)]).toEqual([11, -1, false]);
  // A slide whose only words are a web address, or a picture's line, shows them as words with a link: nothing else.
  const web = slidesOf(parse('## Watch\n\nhttps://www.youtube.com/watch?v=abc\n\n![A cat](https://x.y/cat.png)\n'))[0];
  expect(web.sub).toBe(-1);
  expect(web.items.map((it) => plainText(it.runs))).toEqual(['https://www.youtube.com/watch?v=abc', '!A cat']);
  // An empty document is one blank slide.
  expect(slidesOf(parse('')).map(isBlank)).toEqual([true]);
  expect(slidesOf(parse('a\n\n---\n\n---\n\nb\n')).map((s) => [s.from, s.to])).toEqual([
    [0, 1],
    [2, 2],
    [3, 4],
  ]);
});

test('slides chosen together: removed, duplicated after the last of them, copied with the rules between', () => {
  const doc = parse('## A\n\n---\n\n## B\n\n- b\n\n---\n\n## C\n\n---\n\n## D\n');
  const titles = (d: typeof doc) => slidesOf(d).map((s) => plainText(s.title));
  expect(titles(applyAll(doc, removeSlide(doc, 1, 2)))).toEqual(['A', 'D']);
  expect(titles(applyAll(doc, removeSlide(doc, 0, 1)))).toEqual(['C', 'D']);
  expect(write(applyAll(doc, removeSlide(doc, 0, 3)))).toBe('');
  expect(write({ head: {}, blocks: slideBlocks(doc, 1, 2) })).toBe('## B\n\n- b\n\n---\n\n## C\n');
  const dup = duplicateSlides(doc, 1, 2);
  const after = applyAll(doc, dup.ops);
  expect(dup.at).toBe(3);
  expect(titles(after)).toEqual(['A', 'B', 'C', 'B', 'C', 'D']);
  expect(write(parse(write(after)))).toBe(write(after));
  expect(titles(applyAll(doc, duplicateSlides(doc, 3).ops))).toEqual(['A', 'B', 'C', 'D', 'D']);
});

test('commands are ops: a slide added, removed, moved; a layout, an icon, a document set; each writes back canonically', () => {
  let doc = parse(TALK);
  const n = slidesOf(doc).length;
  const added = addSlide(doc, 0, 't');
  doc = applyAll(doc, added.ops);
  expect([added.at, slidesOf(doc).length, slidesOf(doc)[1].layout]).toEqual([1, n + 1, 't']);
  expect(write(doc)).toContain('\n\n---\n\n##  {.title}\n\n---\n\n');
  // An empty headline with its class survives the round trip.
  expect(write(parse(write(doc)))).toBe(write(doc));
  doc = applyAll(doc, removeSlide(doc, 1));
  expect(write(doc)).toBe(TALK);
  // Moved: slide 1 (Tonight) after slide 2, and back; every block the same object.
  const before = doc.blocks;
  doc = applyAll(doc, moveSlide(doc, 1, 2));
  expect(slidesOf(doc).map((s) => plainText(s.title))).toEqual(['Small sites, made by hand', 'The right size', 'Tonight', 'The two weeks', 'What goes wrong', 'To close']);
  expect(doc.blocks.every((b) => b.k === 'hr' || before.includes(b))).toBe(true);
  doc = applyAll(doc, moveSlide(doc, 2, 1));
  expect(write(doc)).toBe(TALK);
  // A layout: the class on the headline; two columns puts a pipe among the words, leaving them takes it out.
  const s0 = slidesOf(doc)[2];
  doc = applyAll(doc, setLayout(doc, s0, '2'));
  expect(slidesOf(doc)[2].layout).toBe('2');
  expect(slidesOf(doc)[2].pipe).toBeGreaterThan(0);
  doc = applyAll(doc, setLayout(doc, slidesOf(doc)[2], 'i'));
  expect([slidesOf(doc)[2].layout, slidesOf(doc)[2].pipe]).toEqual(['i', -1]);
  doc = applyAll(doc, setLayout(doc, slidesOf(doc)[2], ''));
  expect(write(doc)).toBe(TALK);
  // The icon is the headline's leading icon run.
  doc = applyAll(doc, setIcon(doc, slidesOf(doc)[1], 'map'));
  expect(write(doc)).toContain('## :map: Tonight\n');
  doc = applyAll(doc, setIcon(doc, slidesOf(doc)[1], ''));
  expect(write(doc)).toContain('\n## Tonight\n');
  doc = applyAll(doc, setIcon(doc, slidesOf(doc)[1], 'compass'));
  expect(write(doc)).toBe(TALK);
  // A headline born for a slide without one, carrying the layout.
  let bare = parse('- just words\n');
  bare = applyAll(bare, setLayout(bare, slidesOf(bare)[0], 't'));
  expect(write(bare)).toBe('##  {.title}\n\n- just words\n');
  bare = applyAll(bare, setIcon(bare, slidesOf(bare)[0], 'star'));
  expect(write(bare)).toBe('## :star: {.title}\n\n- just words\n');
  // A document on the slide goes after the words, and is replaced in place.
  let withSub = applyAll(doc, setSub(slidesOf(doc)[1], { k: 'fence', lang: 'sheet', body: 'A | B' }));
  expect(slidesOf(withSub)[1].sub).toBeGreaterThan(0);
  withSub = applyAll(withSub, setSub(slidesOf(withSub)[1], null));
  expect(write(withSub)).toBe(TALK);
});

test('the header: theme, transition, colour, qr and format read leniently; the name is the first headline', () => {
  const s = settingsOf(parse('---\ntheme: Midnight\ntransition: ZOOM\ncolor: red\nqr: no\nformat: zine\nsides: 2\npages: 12\n---\n## Hi\n'));
  expect(s).toEqual({ theme: 'midnight', transition: 'zoom', color: 'red', qr: false, format: 'zine', two: true, pages: 12 });
  expect(settingsOf(parse('---\ntheme: nope\nformat: nope\n---\n'))).toEqual({ theme: '', transition: '', color: '', qr: true, format: '', two: false, pages: 0 });
  expect(titleOf(TALK)).toBe('Small sites, made by hand');
  expect(titleOf('---\ntitle: Named\n---\n## Hi\n')).toBe('Named');
  expect(retitle('## Hi\n', 'Named')).toBe('---\ntitle: Named\n---\n## Hi\n');
  expect(FORMATS.map((f) => f.id)).toEqual(['', 'zine', 'booklet', 'brochure', 'comic', 'poster', 'badges']);
});

test('loose Markdown becomes slides: each heading starts one, a lone top heading is the title slide', () => {
  const loose = loosen(parse('# Talk\n\nsub\n\n## One\n\n- a\n\n## Two\n\n- b\n'));
  expect(slidesOf(loose).map((s) => [plainText(s.title), s.layout])).toEqual([
    ['Talk', 't'],
    ['One', ''],
    ['Two', ''],
  ]);
  // A document with rules, or one heading, is left alone.
  const d = parse(TALK);
  expect(loosen(d)).toBe(d);
  const one = parse('## One\n\n- a\n');
  expect(loosen(one)).toBe(one);
});

test('every theme reads: ink at 4.5:1 on its paper, accent and muted at 3:1; eleven of them', () => {
  const ids = Object.keys(THEMES);
  expect(ids).toHaveLength(11);
  for (const id of ids) {
    const T = THEMES[id];
    expect(contrast(T.ink, T.paper), `${id} ink`).toBeGreaterThanOrEqual(4.5);
    expect(contrast(T.muted, T.paper), `${id} muted`).toBeGreaterThanOrEqual(4.5);
    expect(contrast(T.accent, T.paper), `${id} accent`).toBeGreaterThanOrEqual(3);
    expect(contrast(T.link ?? T.accent, T.paper), `${id} link`).toBeGreaterThanOrEqual(4.5);
    expect(T.name()).toBeTruthy();
  }
});

test('a slide is laid out so everything fits: type shrinks as words grow; footnotes sit at the foot, numbered per slide', () => {
  const short = slidesOf(parse('## Hi\n\n- one\n'))[0];
  const long = slidesOf(parse('## Hi\n\n' + Array.from({ length: 14 }, (_, i) => `- line ${i} with a good many words in it to fill the slide`).join('\n') + '\n'))[0];
  expect(layoutSlide(short).bodyPx).toBeGreaterThan(layoutSlide(long).bodyPx);
  const noted = slidesOf(parse('## Hi^[first]\n\n- a^[second]\n\n---\n\n## Two\n\n- b^[third]\n'));
  expect(slideNotes(noted[0])).toEqual(['first', 'second']);
  expect(slideNotes(noted[1])).toEqual(['third']);
  const L = layoutSlide(noted[0]);
  expect(L.notes?.lines).toHaveLength(2);
  const look = lookOf(settingsOf(parse('')));
  const svg = slidePage({ head: {}, blocks: [] }, noted[1], look).svg;
  expect(svg).toContain('>1</tspan>');
  expect(svg).toContain('third');
  // Reveals: a line a click; none on a title slide or one given to a document.
  expect(slideSteps(long)).toBe(14);
  expect(slideSteps(slidesOf(parse('## T {.title}\n\n- sub\n'))[0])).toBe(0);
  // Only the revealed lines are drawn.
  expect(slidePage({ head: {}, blocks: [] }, long, look, 2).svg.match(/line \d+/g)).toHaveLength(2);
  // Wrapping keeps marks, breaks a long address.
  expect(wrap([{ t: 'a ' }, { t: 'bold word', b: true }], 60, 16).length).toBeGreaterThan(1);
  expect(wrap([{ t: 'https://example.com/a/very/long/path/that/keeps/going/and/going' }], 120, 16).every((l) => l.length >= 1)).toBe(true);
});

test('themes draw their paper and decoration; a table on a slide is drawn by the sheet; a web address alone is words with a link', () => {
  const doc = parse('---\ntheme: midnight\n---\n## Hi\n\n| A | B |\n| --- | --- |\n| 1 | 2 |\n\n---\n\n## Web\n\nhttps://www.youtube.com/watch?v=abc\n');
  const look = lookOf(settingsOf(doc));
  const [s1, s2] = slidesOf(doc);
  const p1 = slidePage(doc, s1, look);
  expect(p1.svg).toContain('#0b1220');
  expect(p1.svg).toContain('rx="12"'); // the white card under a document on a dark slide
  expect(p1.svg).toContain('Hi');
  const p2 = slidePage(doc, s2, look);
  expect(p2.svg).toContain('<a href="https://www.youtube.com/watch?v=abc"');
  expect(p2.svg).not.toMatch(/<image|data-kind/);
});

test('formats: page counts, geometry and impositions; a comic draws panels; a poster is one letter page', () => {
  const zine = parse(tpl('zine'));
  const zs = settingsOf(zine);
  expect(pageCount(zine, zs)).toBe(8);
  expect(pagesOf(zine, zs).map((p) => [p.w, p.h])).toEqual(Array(8).fill([264, 408]));
  // One-sided: one sheet, letter on its side, the top row upside down.
  const one = sheetsOf(zine, zs);
  expect(one).toHaveLength(1);
  expect([one[0].w, one[0].h]).toEqual([1056, 816]);
  expect(one[0].svg.match(/rotate\(180/g)).toHaveLength(4);
  // Two-sided: two upright sheets.
  const two = sheetsOf(zine, { ...zs, two: true });
  expect(two).toHaveLength(2);
  expect([two[0].w, two[0].h]).toEqual([816, 1056]);
  expect(two[0].svg).not.toContain('rotate(180');
  // The booklet grows four pages at a time, by what is written or asked; sheets are saddle-stitched.
  const booklet = parse(tpl('booklet'));
  expect(pageCount(booklet, settingsOf(booklet))).toBe(8);
  expect(pageCount(booklet, { ...settingsOf(booklet), pages: 12 })).toBe(12);
  expect(pageCount(parse('---\nformat: booklet\n---\n' + Array(9).fill('## p').join('\n\n---\n\n') + '\n'), settingsOf(parse('---\nformat: booklet\n---\n')))).toBe(12);
  expect(sheetsOf(booklet, settingsOf(booklet))).toHaveLength(4);
  // A brochure: six panels, two sides.
  const brochure = parse(tpl('brochure'));
  expect(sheetsOf(brochure, settingsOf(brochure))).toHaveLength(2);
  // The comic: panels in boxes, a bubble and a caption.
  const comic = parse(tpl('comic'));
  const page2 = pagesOf(comic, settingsOf(comic))[1];
  expect(page2.svg.match(/stroke-width="1.5"/g)!.length).toBe(3);
  expect(page2.svg).toContain('Seven in the morning.');
  expect(panelOf(slidesOf(comic)[1].items[0])).toEqual({ glyph: 'dog', said: 'Walk?', caption: 'Seven in the morning.' });
  // A poster is one letter page, as big as will fit; badges tile six to a sheet.
  const poster = parse(tpl('poster'));
  expect(sheetsOf(poster, settingsOf(poster)).map((p) => [p.w, p.h])).toEqual([[816, 1056]]);
  const badges = parse(tpl('badges'));
  expect(pageCount(badges, settingsOf(badges))).toBe(6);
  expect(sheetsOf(badges, settingsOf(badges))).toHaveLength(1);
  expect(sheetsOf(badges, settingsOf(badges))[0].svg).toContain('Mara Quill');
  // Drawn small, the first page alone.
  expect(deck.view(tpl('zine'), { small: true })).toHaveLength(1);
});

test("the take-home QR is the slides: the Display Link, every speaker note cut; the lesson's answers on a slide of their own", () => {
  const doc = parse(TALK);
  expect(slidesOf(doc).some((s) => s.noteLines.length)).toBe(true);
  const link = takeHomeLink(doc, 'https://tinylittleoffice.com/');
  const route = parseHash(new URL(link).hash);
  expect([route.app, route.display, route.lang]).toEqual(['deck', true, undefined]);
  // In the language the deck is shown in, when one was chosen.
  expect(parseHash(new URL(takeHomeLink(doc, 'https://tinylittleoffice.com/', 'ht')).hash)).toMatchObject({ app: 'deck', display: true, lang: 'ht' });
  const home = parse(decodeDoc(route.payload));
  expect(home.blocks.some((b) => b.k === 'quote')).toBe(false);
  expect(slidesOf(home).map((s) => plainText(s.title))).toEqual(slidesOf(doc).map((s) => plainText(s.title)));
  expect(decodeDoc(route.payload)).not.toContain('Twenty minutes, then questions');
  // Too long for a code: wanted still, so the editor's end card can say why there is none.
  const long = `## Words\n\n${Array.from({ length: 900 }, (_, i) => `word${(i * 7919) % 100003}`).join(' ')}\n`;
  expect([closingPage(long), wantsClosing(parse(long), settingsOf(parse(long)))]).toEqual([null, true]);
  // The teacher's answers are not in her notes, which the room never sees, but on the last slide.
  for (const id of ['lesson', 'trivia']) {
    const d = parse(tpl(id));
    expect(
      slidesOf(d)
        .flatMap((s) => s.noteLines)
        .join(' '),
    ).not.toContain('Answers');
    expect(plainText(slidesOf(d).at(-1)!.title)).toContain('Answers');
  }
});

test('the deck ends with a QR code of itself, unless told not to, unless printed, unless empty', () => {
  const end = closingPage(TALK);
  expect(end).not.toBeNull();
  expect(end!.svg).toContain('Take this deck with you');
  expect(closingPage('---\nqr: no\n---\n## Hi\n')).toBeNull();
  expect(closingPage(tpl('zine'))).toBeNull();
  expect(closingPage('')).toBeNull();
  const pages = deckPages(TALK);
  expect(pages).toHaveLength(slidesOf(parse(TALK)).length + 1);
  // The film: a frame per reveal, the code last.
  const frames = deckFrames('## One\n\n- a\n- b\n');
  expect(frames).toHaveLength(4);
  // Each frame holds for as long as its words take to read: three seconds at the least, more for a wordy slide, ten at the most (Paul, 2026-10-14: "a readable speed").
  expect(frames.map((f) => f.ms)).toEqual([3000, 3000, 3000, 30000]);
  const wordy = deckFrames(`## A long one\n\n${Array.from({ length: 4 }, (_, i) => `- Line ${i + 1} ${'word '.repeat(12)}`).join('\n')}\n`);
  // Fifty-six words over five frames, eleven and a bit each: a breath and then four words a second.
  expect(wordy[0].ms).toBeGreaterThan(3000);
  expect(wordy[0].ms).toBeLessThan(5000);
  expect(wordy[4].ms).toBe(wordy[0].ms);
  const plain = deckFrames(`## A speech\n\n${'word '.repeat(200)}\n`);
  expect(plain[0].ms).toBe(10000);
  expect(frameMs(0)).toBe(3000);
  // The last frame holds thirty seconds: the code, or the last slide where there is none.
  expect(deckFrames('---\nqr: no\n---\n## Only\n\n- a\n').map((f) => f.ms)).toEqual([3000, 30000]);
  // A slide holding an animation plays it through, a frame a frame at its own rate, then rests for its words.
  const moving = deckFrames(
    '## Go\n\n```anim\n---\nframes: 6\nfps: 12\n---\nKind | X | Y | W | H | Style | Label\n--- | --- | --- | --- | --- | --- | ---\ne | 4 | 4 | 8 | 8 | 2r |\n\nShape | Keys\n--- | ---\n0 | 0,0,0,0,1,0; 5,80,0,0,1,0\n```\n',
  );
  expect(moving.map((f) => f.ms)).toEqual([83, 83, 83, 83, 83, 83, 3000, 30000]);
  // The frames differ as the ball moves; the resting frame is the last one's picture.
  expect(moving[0].svg).not.toBe(moving[5].svg);
  expect(moving[6].svg).toBe(moving[5].svg);
  // A drawing on a slide builds a shape a blink, three a second, and rests for its words once whole; a slide of lines still holds for each line.
  const built = deckFrames(
    '---\nqr: no\n---\n## Three shapes\n\n```draw\nKind | X | Y | W | H | Style | Label\n--- | --- | --- | --- | --- | --- | ---\nr | 2 | 2 | 8 | 8 | 1 |\ne | 12 | 2 | 8 | 8 | 1 |\nd | 22 | 2 | 8 | 8 | 1 |\n```\n\n---\n\n## Lines\n\n- one\n- two\n',
  );
  expect(built.map((f) => f.ms)).toEqual([300, 300, 300, 3000, 3000, 3000, 30000]);
});

test('every template is canonical, has a name, and draws', () => {
  // The everyday decks, then the occasions, then the printed things, two of each format.
  expect(templates().map((x) => x.id)).toEqual([
    'talk',
    'status',
    'proposal',
    'pitch',
    'lesson',
    'conference',
    'quarterly',
    'workshop',
    'launch',
    'townhall',
    'trivia',
    'wedding',
    'zine',
    'soups',
    'booklet',
    'program',
    'brochure',
    'farm',
    'comic',
    'umbrella',
    'poster',
    'lost',
    'badges',
    'speakers',
  ]);
  expect(new Set(templates().map((x) => x.name)).size).toBe(templates().length);
  for (const x of templates()) {
    expect(write(parse(x.doc)), x.id).toBe(x.doc);
    expect(titleOf(x.doc), x.id).toBeTruthy();
    expect(deck.view(x.doc).length, x.id).toBeGreaterThan(0);
    // A real document: a blurb, no filler, no blank slide, dates this year's and next.
    expect(x.blurb.length, x.id).toBeGreaterThan(20);
    expect(x.doc, x.id).not.toMatch(/[Ll]orem|ipsum|TODO|TBD|xxx/);
    expect(slidesOf(parse(x.doc)).some(isBlank), x.id).toBe(false);
    for (const [y] of x.doc.matchAll(/\b20[2-9]\d\b/g)) expect(+y, x.id).toBeLessThanOrEqual(2027);
    // Drawn small for the home page's list: the first page, with something on it.
    const small = deck.view(x.doc, { small: true });
    expect(small, x.id).toHaveLength(1);
    expect(small[0].svg.length, x.id).toBeGreaterThan(200);
    // Every icon exists in the starter library (drawn on the slide and in PowerPoint).
    const d = parse(x.doc);
    for (const s of slidesOf(d)) if (s.icon && !settingsOf(d).format) expect(slidePage(d, s, lookOf(settingsOf(d))).svg, `${x.id} ${s.icon}`).toContain('<g transform');
  }
  // What the decks use of the app: themes, a chart on a slide, another document on a slide, a footnote, notes kept off the room's code.
  const head = (id: string) => settingsOf(parse(tpl(id)));
  expect(
    new Set(
      templates()
        .map((x) => settingsOf(parse(x.doc)).theme)
        .filter(Boolean),
    ).size,
  ).toBeGreaterThanOrEqual(10);
  expect(parse(tpl('townhall')).blocks.find((b) => b.k === 'table')?.a?.kv?.chart).toBe('pie');
  expect(slidesOf(parse(tpl('workshop'))).some((s) => s.sub >= 0 && parse(tpl('workshop')).blocks[s.sub].k === 'fence')).toBe(true);
  expect(slidesOf(parse(tpl('conference'))).every((s, i) => i === 0 || s.noteLines.length > 0)).toBe(true);
  expect([head('trivia').qr, head('wedding').qr, closingPage(tpl('trivia'))]).toEqual([false, false, null]);
  // The quiz's scores add up.
  expect(deck.view(tpl('trivia'))[6].svg).toContain('>14<');
});

test('PowerPoint off a browser: a host-kept PNG on a slide goes in as its own bytes, from the host’s answer, its shape kept', () => {
  // A PNG's signature and header, 640 by 320: all the writer reads of it.
  const png = new Uint8Array([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a, 0, 0, 0, 0x0d, 0x49, 0x48, 0x44, 0x52, 0, 0, 2, 128, 0, 0, 1, 64]);
  const url = `data:image/png;base64,${btoa(String.fromCharCode(...png))}`;
  const text = '---\ntitle: Pictures\n---\n# A picture\n\n```image {alt="A cat"}\nasset:cat\n```\n';
  const files = unzipSync(deckToPptx(text, { ...ctx, image: (ref) => (ref === 'asset:cat' ? url : null) }));
  expect(files['ppt/media/sub-1.png']).toStrictEqual(png);
  const slide = strFromU8(files['ppt/slides/slide1.xml']);
  expect(slide).toContain('name="A cat"');
  const ext = /<p:pic>[\s\S]*?<a:ext cx="(\d+)" cy="(\d+)"/.exec(slide)!;
  expect(Number(ext[1]) / Number(ext[2])).toBeCloseTo(2, 2);
  // No answer from the host, no picture: the words alone.
  expect(Object.keys(unzipSync(deckToPptx(text, ctx))).filter((n) => n.startsWith('ppt/media/'))).toStrictEqual([]);
});

test('PowerPoint off a browser: the host’s drawing makes the theme’s decoration and the icons; with none, the file goes without them', async () => {
  const drawn: [number, number, string | null][] = [];
  const raster = async (_svg: string, w: number, h: number, paper: string | null) => (drawn.push([w, h, paper]), new Uint8Array([w % 256, h % 256]));
  const media = (f: Record<string, Uint8Array>) =>
    Object.keys(f)
      .filter((n) => n.startsWith('ppt/media/'))
      .sort();
  const files = unzipSync(await buildPptx(TALK, { ...ctx, raster }));
  expect(media(files)).toContain('ppt/media/theme.png');
  expect(media(files).some((n) => n.startsWith('ppt/media/icon-'))).toBe(true);
  expect(drawn.find(([, , paper]) => paper)?.[2]).toMatch(/^#/);
  expect(media(unzipSync(await buildPptx(TALK, ctx)))).toStrictEqual([]);
});

test('PowerPoint: a slide a file, the theme as the colour scheme, the words with their marks, the parts Keynote wants', () => {
  const files = unzipSync(deckToPptx(TALK, ctx));
  const names = Object.keys(files);
  expect(names.filter((n) => /^ppt\/slides\/slide\d+\.xml$/.test(n))).toHaveLength(6);
  for (const part of ['ppt/presProps.xml', 'ppt/viewProps.xml', 'ppt/tableStyles.xml', 'docProps/core.xml', 'docProps/app.xml', 'ppt/theme/theme1.xml']) expect(names).toContain(part);
  const theme = strFromU8(files['ppt/theme/theme1.xml']);
  expect(theme).toContain('<a:lt1><a:srgbClr val="0B1220"/></a:lt1>');
  const s4 = strFromU8(files['ppt/slides/slide4.xml']);
  expect(s4).toContain('Week one: words first');
  expect(s4).toContain('Week two: the pages built');
  const s5 = strFromU8(files['ppt/slides/slide5.xml']);
  expect(s5).toContain('baseline="30000"');
  expect(s5).toContain('Sam drafts from a half-hour conversation');
  expect(strFromU8(files['docProps/app.xml'])).toContain('<Slides>6</Slides>');
  expect(strFromU8(files['[Content_Types].xml'])).toContain('slide6.xml');
});

test('the web page plays the deck: a section a slide, the transition on the body, the code last, one fixed script', () => {
  const html = deckToHtml('---\ntransition: slide\n---\n## One\n\n- a\n\n---\n\n## Two\n\n- b\n', 'Two slides', ctx.link);
  expect(html.match(/<section/g)).toHaveLength(3);
  expect(html).toContain('<body class="slide">');
  expect(html).toContain('aria-label="Slide 1"');
  expect(html).toContain('aria-label="A QR code of this deck"');
  expect(html).toContain('Open in Tiny Little Office');
  expect(html.match(/<script>/g)).toHaveLength(1);
  // A zine reads a page at a time, its pages named.
  const zine = deckToHtml(tpl('zine'), 'Small Joys');
  expect(zine.match(/<section/g)).toHaveLength(8);
  expect(zine).toContain('aria-label="Front cover"');
  expect(zine).toContain('aria-label="Back cover"');
});

// A thumbnail of a deck (the rail, a kept deck's preview) draws a trip on a slide plain, as the trip's own thumbnail is:
// a visitor who has not opened the trip tells OpenStreetMap nothing. A slide, a print or a picture has the tiles.
test('a deck drawn as a thumbnail puts no map tiles under a trip on its slide; drawn still, it does', () => {
  const text = '# A walk\n\n```trip\nPlace | Lat:number | Lon:number\n--- | --- | ---\nProspect Park | 40.6602 | -73.969\nConey Island | 40.5749 | -73.9859\n```\n';
  const tiles = (pages: ReturnType<typeof deckPages>) => pages[0].svg.includes('<image href="https://tile.openstreetmap.org/');
  expect(tiles(deckPages(text, true, true))).toBe(true);
  expect(tiles(deckPages(text, true, true, true))).toBe(false);
  expect(tiles(deck.view(text, { small: true, thumb: true }))).toBe(false);
  expect(tiles(deck.view(text, { small: true, still: true }))).toBe(true);
});

test('a theme or a colour named for an Object\'s own property is none (a document naming "constructor" drew every slide with no fill; a review, 2026-10-17)', () => {
  for (const name of ['constructor', 'toString', '__proto__', 'hasOwnProperty']) {
    const s = settingsOf(parse(`---\ntheme: ${name}\ncolor: ${name}\n---\n# A\n`));
    expect([s.theme, s.color], name).toEqual(['', '']);
  }
  expect(settingsOf(parse('---\ntheme: midnight\n---\n# A\n')).theme).toBe('midnight');
});
