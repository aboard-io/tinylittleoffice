// The lint says what the eye would have seen, and measure gives the numbers the layouts chose (src/lint.ts), so an
// agent checks a document through the API and never opens a page (Paul, 2026-10-11). Each finding has a document
// in test/fixtures/lint/ that trips it (<kind>.tlo) and one that does not (<kind>.ok.tlo): the mistakes of the
// internals deck of 2026-10-10, as it was first written.
import { readdirSync, readFileSync } from 'node:fs';
import { join } from 'node:path';
import { describe, expect, test } from 'vitest';
import { lint as apiLint, measure as apiMeasure, link } from '../src/api.ts';
import { lint, measure, findingLine, LINK_MAX } from '../src/lint.ts';
import { SHORT_LINK_MAX } from '../src/kit/short.ts';
import { appInHead } from '../src/kit/plain.ts';
import { apps } from '../src/kit/apps.ts';
import { parse, withHead } from '../src/doc/index.ts';
import { layout } from '../src/apps/diagram/view.ts';
import { fitLabel, shapeSvg } from '../src/apps/draw/view.ts';
import { layoutSlide } from '../src/apps/deck/view.ts';
import { slidesOf } from '../src/apps/deck/model.ts';

const FIX = join(import.meta.dirname, 'fixtures/lint');
const fixture = (name: string) => {
  const [app, text] = appInHead(readFileSync(join(FIX, `${name}.tlo`), 'utf8'));
  return { app, text };
};
const kinds = (name: string) => {
  const { app, text } = fixture(name);
  return lint(app, text).map((f) => f.kind);
};

describe('each finding: a document that trips it, and one that does not', () => {
  test.each([
    ['edge-end', 'edge-end'],
    ['edge-unused', 'edge-unused'],
    ['comma-number', 'comma-number'],
    ['net-colon', 'net-colon'],
    ['label-long', 'label-long'],
    ['label-over', 'label-over'],
    ['fence-bullets', 'fence-bullets'],
    ['title', 'title-cut'],
    ['body', 'body-over'],
    ['sheet-circ', 'formula-error'],
  ])('%s', (name, kind) => {
    expect(kinds(name)).toContain(kind);
    expect(kinds(`${name}.ok`)).toStrictEqual([]);
  });

  test('every fixture is one of those pairs', () => {
    const names = readdirSync(FIX).filter((f) => f.endsWith('.tlo'));
    for (const f of names.filter((x) => !x.endsWith('.ok.tlo') && x !== 'deck-diagram.tlo')) expect(names).toContain(f.replace(/\.tlo$/, '.ok.tlo'));
  });
});

describe('what each finding says', () => {
  test('an org chart’s dotted line to a thing not in the list: named, with the things there are', () => {
    const [f] = lint(fixture('edge-end').app, fixture('edge-end').text);
    expect(f).toMatchObject({ app: 'diagram', block: 4, at: 'block 5', kind: 'edge-end' });
    expect(f.words).toBe('A dotted line from Diagram to Drawing Tool is not drawn: no thing is called Diagram or Drawing Tool; the things are The kit, Words, Pictures, Plans');
    // And the layout agrees: the line is not among the shapes.
    expect(layout(parse(fixture('edge-end').text)).shapes.some((s) => s.hit?.k === 'edge')).toBe(false);
  });

  test('a comma inside a number in a Venn: the two things it makes', () => {
    const [f] = lint('diagram', fixture('comma-number').text);
    expect(f.words).toBe('"2,000 cases a run" reads as two things: "2" and "000 cases a run"');
    expect(f.fix).toContain('2000');
    // A seating chart's guests are cut the same way.
    expect(lint('diagram', '---\nkind: seating\n---\n- Table 1: Ann, Bob, 1,500 guests\n').map((x) => x.kind)).toStrictEqual(['comma-number']);
  });

  test('a network of "Name: description" lines: the whole line is the name, and a connection to the name makes a second thing', () => {
    const found = lint('diagram', fixture('net-colon').text);
    expect(found.map((f) => f.block)).toStrictEqual([0, 1]);
    expect(found[0].words).toBe('the thing is named "Header: the paper logo and the title", the whole line, and a connection to Header makes a second thing');
  });

  test('a label too long for its box, and the few words its box holds', () => {
    const [f] = lint('diagram', fixture('label-long').text);
    expect(f.kind).toBe('label-long');
    expect(f.words).toMatch(/is too long for its box: it is (set at \d+% of its size|cut to)/);
    expect(f.fix).toMatch(/^a thing is a name of \d+ words? or so here/);
  });

  test('connections whose labels pile on each other: said once, at the first', () => {
    const found = lint('diagram', fixture('label-over').text);
    expect(found.map((f) => [f.kind, f.block])).toStrictEqual([['label-over', 4]]);
  });

  test('a slide with a chart and bullets: the bullets are not drawn', () => {
    const [f] = lint('deck', fixture('fence-bullets').text);
    expect(findingLine(f)).toBe(
      'deck · slide 1 · the slide shows the chart alone; the 3 lines beside it ("Measured at the end of round ten", …) are not drawn · put them in the notes (> lines) or on a slide of their own',
    );
  });

  test('a headline cut, and one set at its smallest size; words over the foot, and at their smallest', () => {
    expect(lint('deck', fixture('title').text)[0].words).toMatch(/^the headline ".+" is cut after 2 lines: 1 more is not drawn$/);
    // The headline that just fits at the smallest size, and the words that just do: found by adding words until the layout says so.
    const grow = (make: (n: number) => string, done: (k: string[]) => boolean) => {
      for (let n = 1; n < 400; n++) if (done(lint('deck', make(n)).map((f) => f.kind))) return lint('deck', make(n));
      throw new Error('never');
    };
    const small = grow(
      (n) => `## ${Array.from({ length: n }, (_, i) => `word${i}`).join(' ')}\n`,
      (k) => k.includes('title-small') || k.includes('title-cut'),
    );
    expect(small.map((f) => f.kind)).toStrictEqual(['title-small']);
    expect(small[0].words).toMatch(/is set at its smallest size, 28px, to fit$/);
    const words = grow(
      (n) => `## Lints\n\n${Array.from({ length: n }, (_, i) => `- Line ${i} of the words`).join('\n')}\n`,
      (k) => k.includes('body-small') || k.includes('body-over'),
    );
    expect(words.map((f) => f.kind)).toStrictEqual(['body-small']);
    expect(words[0].words).toBe('the words are set at their smallest size, 14px, to fit');
    expect(lint('deck', fixture('body').text)[0].words).toMatch(/^the words run \d+px past the foot of the slide, at their smallest size \(14px\)$/);
  });

  test('a diagram fenced on a slide is linted by its own app, at its slide', () => {
    const found = lint('deck', fixture('deck-diagram').text);
    expect(found.map((f) => [f.app, f.at, f.kind])).toStrictEqual([['diagram', 'slide 1', 'edge-end']]);
  });

  test('a total whose range takes in its own cell: the table, the cell, the formula, the error, and the range it meant', () => {
    const found = lint('sheet', fixture('sheet-circ').text);
    expect(found).toHaveLength(1);
    expect(findingLine(found[0])).toBe('sheet · block 1 · the table "The codebase": B8, =SUM(B2:B8), is #CIRC · the range includes the cell itself; rows count from the first data row: =SUM(B1:B7)');
    // A range that starts at the first row has nowhere to move to: it stops above the cell.
    expect(lint('sheet', 'Day | Miles:number\n--- | ---\nMon | 1\nTue | 2\nAll | =SUM(B1:B3)\n')[0].fix).toBe('the range includes the cell itself; rows count from the first data row: =SUM(B1:B2)');
  });

  test('every error the engine has is a finding, at the cell it starts in, not the cells that read it', () => {
    const doc = [
      'Item | Cost:number | Note',
      '--- | --- | ---',
      'Rent | 1200 | =B1/0',
      'Food | =B5 | =C1 + 1',
      'Fun | =BOGUS(B1) | =nowhere * 2',
      'Odd | =A1 * 2 | =SQRT(-1)',
      'Loop | =B2 | =SUM(B1:',
      'Far | =B1001 | ',
    ].join('\n');
    const found = lint('sheet', doc + '\n');
    expect(found.map((f) => /: (\w+), (.+), is (#[A-Z/0]+)$/.exec(f.words)!.slice(1))).toStrictEqual([
      ['C1', '=B1/0', '#DIV/0'],
      ['B2', '=B5', '#CIRC'],
      ['B3', '=BOGUS(B1)', '#NAME'],
      ['C3', '=nowhere * 2', '#NAME'],
      ['B4', '=A1 * 2', '#VALUE'],
      ['C4', '=SQRT(-1)', '#NUM'],
      ['B5', '=B2', '#CIRC'],
      ['C5', '=SUM(B1:', '#ERR'],
      ['B6', '=B1001', '#REF'],
    ]);
    // C2 reads C1's error and is not said again; each fix says what to do.
    expect(found.find((f) => f.words.includes('B3'))!.fix).toContain('BOGUS');
    expect(found.find((f) => f.words.includes('C3'))!.fix).toContain('NOWHERE');
    expect(found.find((f) => f.words.includes('B2'))!.fix).toBe('the formula comes back to its own cell through B5: point one of them at another cell');
  });

  test('a table anywhere: in a text, and fenced on a slide, at its block and its slide', () => {
    const text = '# Costs\n\nItem | Cost:number\n--- | ---\nRent | 1200\nTotal | =SUM(B1:B2)\n';
    expect(lint('write', text).map((f) => [f.app, f.at, f.words])).toStrictEqual([['write', 'block 2', 'the table "Costs": B2, =SUM(B1:B2), is #CIRC']]);
    const deck = '## The weight of it\n\n```sheet\nChunk | Kilobytes:number\n--- | ---\nMain | 40\nAll | =SUM(B1:B2)\n```\n';
    expect(lint('deck', deck).map((f) => [f.app, f.at, f.kind, f.words])).toStrictEqual([['sheet', 'slide 1', 'formula-error', 'the table (Chunk | Kilobytes): B2, =SUM(B1:B2), is #CIRC']]);
  });

  test('a link past 2,000 characters', () => {
    const text = Array.from({ length: 300 }, (_, i) => `- [ ] ${((i * 2654435761) % 4294967296).toString(36)} ${((i * 40503) % 65536).toString(36)}`).join('\n') + '\n';
    const url = link('outline', text);
    expect(url.length).toBeGreaterThan(LINK_MAX);
    expect(lint('outline', text, url).map((f) => [f.kind, f.at])).toStrictEqual([['length', 'the link']]);
    expect(lint('outline', '- [ ] One\n', link('outline', '- [ ] One\n'))).toStrictEqual([]);
  });
});

describe('the measures are the layouts’ own', () => {
  test('a slide: the sizes chosen, the lines, and the bullets a document hides', () => {
    const m = measure('deck', fixture('fence-bullets').text);
    expect(m.slides).toStrictEqual([
      { slide: 1, layout: 'bullets', title: { px: 40, lines: 1, smallest: false, cut: 0 }, body: { px: 0, lines: 0, smallest: false, over: 0 }, bullets: 3, hidden: 3, shows: 'sheet', notes: 0 },
    ]);
    const s = slidesOf(parse(fixture('body.ok').text))[0];
    expect(measure('deck', fixture('body.ok').text).slides![0].body.px).toBe(layoutSlide(s).bodyPx);
  });

  test('a table: its formulas, and the ones that fail', () => {
    expect(measure('sheet', fixture('sheet-circ').text).tables).toStrictEqual([{ block: 0, formulas: 1, errors: [{ cell: 'B8', formula: '=SUM(B2:B8)', error: '#CIRC' }] }]);
    expect(measure('sheet', fixture('sheet-circ.ok').text).tables).toStrictEqual([{ block: 0, formulas: 1, errors: [] }]);
    expect(measure('deck', fixture('deck-diagram').text).tables).toBeUndefined();
  });

  test('a diagram: its things, its connections drawn and dropped, each label as set', () => {
    const m = measure('diagram', fixture('edge-end').text).diagram!;
    expect(m).toMatchObject({ kind: 'org', things: 4, edges: { written: 1, drawn: 0, dropped: 1 } });
    expect(m.labels[0]).toStrictEqual({ words: 'The kit / shell, chrome, drawer', px: 14, scale: 1, lines: 2, cut: false });
    // A fenced one is measured where it is.
    expect(measure('deck', fixture('deck-diagram').text).fences).toMatchObject([{ at: 'slide 1', app: 'diagram', diagram: { edges: { dropped: 1 } } }]);
  });

  test('fitLabel is what the page draws: the size in the SVG is the size it chose', () => {
    const shapes = layout(parse(fixture('label-long').text)).shapes;
    const s = shapes.find((x) => x.text.startsWith('The column'))!;
    const f = fitLabel(s);
    expect(f.scale).toBeLessThan(1);
    expect(shapeSvg(s, shapes)).toContain(`font-size="${Math.round(f.laid.px * 100) / 100}"`);
  });
});

describe('what the apps ship lints clean', () => {
  test('every template of every app', async () => {
    const all = await Promise.all(apps().map(async (a) => ({ a, templates: await a.templates() })));
    const found = all.flatMap(({ a, templates }) => templates.flatMap((t) => lint(a.id, t.doc).map((f) => `${a.id}/${t.id}: ${findingLine(f)}`)));
    expect(found).toStrictEqual([]);
  });

  test('every document of the corpus (an old diagram app’s as a diagram of its kind)', () => {
    const dir = join(import.meta.dirname, 'doc/corpus');
    const KINDS = ['mind', 'org', 'family', 'lanes', 'timeline', 'venn', 'seating', 'net'];
    const files = [...readdirSync(dir).filter((f) => f.endsWith('.json')), ...readdirSync(join(dir, 'apps')).map((f) => `apps/${f}`)];
    const found = files.flatMap((file) =>
      (JSON.parse(readFileSync(join(dir, file), 'utf8')) as { docs: { name: string; text: string }[] }).docs.flatMap(({ name, text }) => {
        let app = file.startsWith('apps/') ? file.slice(5, -5) : name.split('/')[0];
        if (KINDS.includes(app)) [app, text] = ['diagram', parse(text).head.kind ? text : withHead(text, { kind: app })];
        return lint(app, text).map((f) => `${file} ${name}: ${findingLine(f)}`);
      }),
    );
    expect(found).toStrictEqual([]);
  });
});

test('the API: lint and measure from a document, its link made to check its length', async () => {
  expect((await apiLint('deck', fixture('fence-bullets').text)).map((f) => f.kind)).toStrictEqual(['fence-bullets']);
  expect(await apiLint('deck', fixture('fence-bullets.ok').text)).toStrictEqual([]);
  const m = await apiMeasure('diagram', fixture('edge-end').text);
  expect(m.length).toBe(link('diagram', fixture('edge-end').text).length);
  expect(m.diagram?.edges.dropped).toBe(1);
  expect(m.short).toStrictEqual({ fits: true, over: 0 });
  // A document whose link is past what a short link holds says so, by how much, before anyone asks the shortener.
  const words = Array.from({ length: 4000 }, (_, i) => ((i * 2654435761) % 4294967296).toString(36)).join(' ');
  const big = await apiMeasure('write', words);
  expect(big.length).toBe(link('write', words).length);
  expect(big.short).toStrictEqual({ fits: false, over: big.length - SHORT_LINK_MAX });
  expect(big.short.over).toBeGreaterThan(0);
});
