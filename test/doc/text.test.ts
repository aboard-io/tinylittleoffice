// The text layer (src/doc/text.ts): a document as what it says, for a screen reader, the Text view, the exports and
// the API. textOf over the blocks every text app shares, and the nodes written as Markdown, stably.
import { expect, test } from 'vitest';
import { parse, textMarkdown, textOf, textCounts, type TextNode } from '../../src/doc/index.ts';
import { apps } from '../../src/kit/apps.ts';
import { textLayer } from '../../src/kit/text-layer.ts';

const tpl = async (app: string, id: string) =>
  (
    await apps()
      .find((a) => a.id === app)!
      .templates()
  ).find((t) => t.id === id)!.doc;

test('headings, paragraphs with their marks and links', () => {
  const nodes = textOf(parse('# Title\n\n###### Small\n\nSome **bold** and *italic* words with a [link](https://example.com/).\n'));
  expect(nodes).toStrictEqual<TextNode[]>([
    { k: 'h', level: 1, runs: [{ t: 'Title' }] },
    // h5 and h6 are drawn as h4: four levels are all a reader needs.
    { k: 'h', level: 4, runs: [{ t: 'Small' }] },
    { k: 'p', runs: [{ t: 'Some ' }, { t: 'bold', b: true }, { t: ' and ' }, { t: 'italic', i: true }, { t: ' words with a ' }, { t: 'link', href: 'https://example.com/' }, { t: '.' }] },
  ]);
});

test('nested lists keep their order and their tasks', () => {
  const nodes = textOf(parse('- One\n  - [x] Done\n  - [ ] Not yet\n    1. First\n    2. Second\n- Two\n\nAfter.\n'));
  expect(nodes).toStrictEqual<TextNode[]>([
    {
      k: 'list',
      ord: false,
      items: [
        {
          runs: [{ t: 'One' }],
          list: {
            k: 'list',
            ord: false,
            items: [
              { runs: [{ t: 'Done' }], done: true },
              { runs: [{ t: 'Not yet' }], done: false, list: { k: 'list', ord: true, items: [{ runs: [{ t: 'First' }] }, { runs: [{ t: 'Second' }] }] } },
            ],
          },
        },
        { runs: [{ t: 'Two' }] },
      ],
    },
    { k: 'p', runs: [{ t: 'After.' }] },
  ]);
});

test('a table as its values, worked out and formatted; a fence as written; a break between pages', () => {
  const nodes = textOf(parse('Item | Cost:money\n--- | ---\nRent | 1200\nFood | 300\nTotal | =SUM(B1:B2)\n | \n\n---\n\n```\ncode here\n```\n'));
  expect(nodes).toStrictEqual<TextNode[]>([
    {
      k: 'table',
      head: ['Item', 'Cost'],
      rows: [
        ['Rent', '$1,200.00'],
        ['Food', '$300.00'],
        ['Total', '$1,500.00'],
      ],
    },
    { k: 'break' },
    { k: 'pre', lang: '', body: 'code here' },
  ]);
});

test('footnotes are numbered where they sit and listed at the end; an icon is left out', () => {
  const nodes = textOf(parse('## :rocket: Lift off\n\nWords^[The *first* note.] and more^[Second.].\n'));
  expect(nodes).toStrictEqual<TextNode[]>([
    { k: 'h', level: 2, runs: [{ t: 'Lift off' }] },
    { k: 'p', runs: [{ t: 'Words' }, { t: '1', note: 'The *first* note.' }, { t: ' and more' }, { t: '2', note: 'Second.' }, { t: '.' }] },
    { k: 'notes', notes: [[{ t: 'The ' }, { t: 'first', i: true }, { t: ' note.' }], [{ t: 'Second.' }]] },
  ]);
  expect(textMarkdown(nodes)).toBe('## Lift off\n\nWords[^1] and more[^2].\n\n[^1]: The *first* note.\n\n[^2]: Second.\n');
});

test('a document held in another is its own nodes when the host says so, else its text as written', () => {
  const doc = parse('Before.\n\n```sheet\nA | B\n--- | ---\n1 | 2\n```\n');
  expect(textOf(doc)[1]).toStrictEqual({ k: 'pre', lang: 'sheet', body: 'A | B\n--- | ---\n1 | 2' });
  const inner = (lang: string, body: string): TextNode => ({ k: 'doc', app: lang, title: '', nodes: textOf(parse(body)) });
  expect(textOf(doc, { inner })[1]).toStrictEqual({ k: 'doc', app: 'sheet', title: '', nodes: [{ k: 'table', head: ['A', 'B'], rows: [['1', '2']] }] });
});

test("every text app's templates: the nodes they hold, and their Markdown written again the same", async () => {
  const kinds = new Set<string>();
  const walk = (ns: TextNode[]) => {
    for (const n of ns) {
      kinds.add(n.k === 'h' ? `h${n.level}` : n.k);
      if (n.k === 'doc') walk(n.nodes);
    }
  };
  for (const id of ['write', 'outline', 'deck', 'sheet', 'calc']) {
    for (const t of await apps()
      .find((a) => a.id === id)!
      .templates()) {
      const nodes = textOf(parse(t.doc));
      walk(nodes);
      const md = textMarkdown(nodes);
      // Written once, the Markdown is the text layer's own: read and written again, it is the same bytes.
      expect(textMarkdown(textOf(parse(md))), `${id}/${t.id}`).toBe(md);
    }
  }
  for (const k of ['h1', 'h2', 'p', 'list', 'table', 'quote', 'break', 'notes']) expect(kinds, k).toContain(k);
});

test('the Word Processor’s minutes: heading, words, a table and a list, in order', async () => {
  const kinds = textOf(parse(await tpl('write', 'minutes'))).map((n) => (n.k === 'h' ? `h${n.level}` : n.k));
  expect(kinds[0]).toBe('h1');
  for (const k of ['p', 'table', 'list']) expect(kinds).toContain(k);
});

test('an outline: one nested list, footnotes at the end', async () => {
  const nodes = textOf(parse(await tpl('outline', 'packing')));
  expect(nodes.map((n) => n.k)).toEqual(['list', 'notes']);
  const top = nodes[0] as Extract<TextNode, { k: 'list' }>;
  expect(top.items[0].runs).toEqual([{ t: 'Lisbon, Wednesday 14 to Monday 19 October 2026' }]);
  expect(top.items[0].list!.items.map((i) => i.runs[0].t)).toEqual(['Clothes', 'Washbag', 'Papers and money', 'Tech', 'Before leaving']);
  expect(top.items[0].list!.items[4].list!.ord).toBe(true);
});

test('a deck: its slides between breaks, the speaker’s notes as quotes', async () => {
  const nodes = textOf(parse(await tpl('deck', 'talk')));
  expect(nodes[0]).toStrictEqual({ k: 'h', level: 2, runs: [{ t: 'Small sites, made by hand' }] });
  expect(nodes.filter((n) => n.k === 'break').length).toBeGreaterThan(2);
  expect(nodes.some((n) => n.k === 'quote')).toBe(true);
});

test('a calculation is its lines', async () => {
  expect(textOf(parse(await tpl('calc', 'bill')))).toStrictEqual([{ k: 'p', runs: [{ t: 'food = 164.50\ndrinks = 58\ntip = (food + drinks) * 18%\ntotal = food + drinks + tip\ntotal / 6' }] }]);
});

test('the counts measure gives: words and headings', () => {
  expect(textCounts(textOf(parse('# One two\n\nThree four five.\n\n- six\n\nA | B\n--- | ---\nseven | eight\n')))).toEqual({ words: 10, headings: 1 });
});

test('the kit’s layer takes an app’s own when it has one, and a fenced document through its app', () => {
  const write = apps().find((a) => a.id === 'write')!;
  const nodes = textLayer(write, 'Before.\n\n```sheet\nA | B\n--- | ---\n1 | 2\n```\n');
  expect(nodes[1]).toMatchObject({ k: 'doc', app: 'Spreadsheet', nodes: [{ k: 'table', head: ['A', 'B'], rows: [['1', '2']] }] });
});
