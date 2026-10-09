// The outline as a view of the document, and each command as the ops it produces: under node, no DOM. The
// lines between items (their kinds and names as an item's attributes), joins as edges "~ A -> B: name",
// documents as fences; loose words listified; the conversions a deck, a network and an org chart read.
import { expect, test } from 'vitest';
import { applyAll, parse, write, type Doc, type Op } from '../../../doc/index.ts';
import { appendItem, connect, insertDoc, listify, moveItem, nameOf, newItem, outlineLines, outlineToDeck, outlineToMind, outlineToNet, outlineToOrg, placeItem, readOutline, removeAt, renameIn, setDoc, setLine, setLink, shiftItem, toOpml, unlink } from '../model.ts';
import { docGist, outlinePage, richText, wrapRuns } from '../view.ts';
import { templates } from '../templates.ts';
import def from '../def.ts';

const DOC = '- Launch\n  - Product {.from}\n    - Pricing {.from label=sets}\n  - Marketing {.both}\n  - Ops {label="part of"}\n  - Support {.to}\n\n~ Pricing -> Marketing: feeds\n~ Ops -- Product\n';
const TREE = '- Launch\n  - Product\n    - Pricing\n  - Marketing\n';

/** A document edited: the ops applied, the text written. */
const after = (text: string, ops: (doc: Doc, v: ReturnType<typeof readOutline>) => Op[] | null | { ops: Op[] }) => {
  const doc = parse(text);
  const got = ops(doc, readOutline(doc));
  const list = got === null ? [] : 'ops' in got ? got.ops : got;
  return write(applyAll(doc, list));
};

test('read: each kind of line, its name, the joins, and which joins are live', () => {
  const v = readOutline(parse(DOC));
  expect(v.items.map((it) => [nameOf(it.runs), it.depth, it.dir ?? '--', it.label ?? ''])).toEqual([
    ['Launch', 0, '--', ''],
    ['Product', 1, '->', ''],
    ['Pricing', 2, '->', 'sets'],
    ['Marketing', 1, '<->', ''],
    ['Ops', 1, '--', 'part of'],
    ['Support', 1, '<-', ''],
  ]);
  expect(v.items.map((it) => it.at)).toEqual([0, 1, 2, 3, 4, 5]);
  expect(v.links).toEqual([
    { at: 6, from: 'Pricing', to: 'Marketing', dir: '->', label: 'feeds', live: true },
    { at: 7, from: 'Ops', to: 'Product', dir: '--', live: true },
  ]);
  expect(v.depths).toEqual([0, 1, 2, 1, 1, 1, -1, -1]);
  expect(v.loose).toBe(false);
  expect(readOutline(parse('- A\n  - B\n\n~ A -> Gone\n')).links[0].live).toBe(false);
  // Words that only look like a line are left alone.
  expect(readOutline(parse('- A\n  - -5 degrees\n  - <-ish\n  - ~strike~ me\n')).items.map((it) => nameOf(it.runs))).toEqual(['A', '-5 degrees', '<-ish', '~strike~ me']);
  // An empty document is an empty outline.
  expect(readOutline(parse('')).items).toEqual([]);
});

test('documents under items are fences that say their depth; an item that is a web address is a thing from the web', () => {
  const text = '- A\n  - B\n\n```sheet {depth=2}\nx | y\n--- | ---\n1 | 2\n```\n\n    - C\n  - D\n- E\n  - https://example.com/a-video\n';
  const v = readOutline(parse(text));
  expect(v.items.map((it) => [it.depth, it.doc ? it.doc.split('\n')[0] : nameOf(it.runs)])).toEqual([
    [0, 'A'],
    [1, 'B'],
    [2, 'sheet'],
    [2, 'C'],
    [1, 'D'],
    [0, 'E'],
    [1, 'web'],
  ]);
  expect(v.items[2].doc).toBe('sheet\nx | y\n--- | ---\n1 | 2');
  expect(v.items[6].doc).toBe('web\nhttps://example.com/a-video');
  expect(write(parse(text))).toBe(text);
  // A fence with no depth of its own sits at the margin, and Tab gives it one before moving it.
  const loose = '- A\n\n```draw\nKind | X\n--- | ---\n```\n';
  expect(readOutline(parse(loose)).items[1].depth).toBe(0);
  expect(after(loose, (d, v) => shiftItem(d, v, 1, 1))).toBe('- A\n\n```draw {depth=1}\nKind | X\n--- | ---\n```\n');
  // The document under an item replaced by another of the same app keeps the fence's depth.
  expect(after('- A\n\n```sheet {depth=1}\na | b\n--- | ---\n```\n', (d) => setDoc(d, 1, 'sheet\nc | d\n--- | ---\n1 | 2'))).toBe('- A\n\n```sheet {depth=1}\nc | d\n--- | ---\n1 | 2\n```\n');
});

test('loose words read as a tree, and listify is the one splice that makes them an outline', () => {
  const v = readOutline(parse('# Plan\n\n- a\n  - b\n\n## Later\n\nc\nd\n\nhttps://example.com/x\n'));
  expect(v.loose).toBe(true);
  expect(v.items.map((it) => [it.depth, it.doc ?? nameOf(it.runs)])).toEqual([
    [0, 'Plan'],
    [1, 'a'],
    [2, 'b'],
    [1, 'Later'],
    [2, 'c d'],
    [2, 'web\nhttps://example.com/x'],
  ]);
  expect(after('# Plan\n\n- a\n  - b\n\n## Later\n\nc\nd\n\nhttps://example.com/x\n\n~ a -> b\n', listify)).toBe('- Plan\n  - a\n    - b\n  - Later\n    - c\n    - d\n    - https://example.com/x\n\n~ a -> b\n');
  // Canonical text is left alone.
  expect(listify(parse(DOC))).toEqual([]);
  expect(listify(parse(''))).toEqual([]);
});

test('Tab and Shift+Tab shift a family; an item goes at most one deeper than the one above', () => {
  expect(after(TREE, (d, v) => shiftItem(d, v, 3, 1))).toBe('- Launch\n  - Product\n    - Pricing\n    - Marketing\n');
  expect(after(TREE, (d, v) => shiftItem(d, v, 1, -1))).toBe('- Launch\n- Product\n  - Pricing\n  - Marketing\n');
  expect(shiftItem(parse(TREE), readOutline(parse(TREE)), 0, 1)).toBeNull();
  expect(shiftItem(parse(TREE), readOutline(parse(TREE)), 2, 1)).toBeNull();
  expect(shiftItem(parse(TREE), readOutline(parse(TREE)), 0, -1)).toBeNull();
  // A line's attributes travel with the item.
  expect(after(DOC, (d, v) => shiftItem(d, v, 3, 1))).toContain('\n    - Marketing {.both}\n');
});

test('Alt+arrows move a family past its neighbour at its level; drag places it under or after another', () => {
  expect(after(TREE, (d, v) => moveItem(d, v, 3, -1))).toBe('- Launch\n  - Marketing\n  - Product\n    - Pricing\n');
  expect(after(TREE, (d, v) => moveItem(d, v, 1, 1))).toBe('- Launch\n  - Marketing\n  - Product\n    - Pricing\n');
  expect(moveItem(parse(TREE), readOutline(parse(TREE)), 0, -1)).toBeNull();
  expect(moveItem(parse(TREE), readOutline(parse(TREE)), 3, 1)).toBeNull();
  const ops = moveItem(parse(TREE), readOutline(parse(TREE)), 1, 1)!;
  expect(ops).toEqual([{ op: 'move', at: 1, n: 2, to: 2 }]);
  expect(after(TREE, (d, v) => placeItem(d, v, 3, 2, 'under'))).toBe('- Launch\n  - Product\n    - Pricing\n      - Marketing\n');
  expect(after(TREE, (d, v) => placeItem(d, v, 1, 3, 'after'))).toBe('- Launch\n  - Marketing\n  - Product\n    - Pricing\n');
  expect(after(TREE, (d, v) => placeItem(d, v, 3, 0, 'after'))).toBe('- Launch\n  - Product\n    - Pricing\n- Marketing\n');
  expect(placeItem(parse(TREE), readOutline(parse(TREE)), 1, 2, 'under')).toBeNull();
});

test('Enter: a new item as the first child of an open parent, a leaf split at the caret, else after the family; Backspace on empty takes the item away', () => {
  const d = parse(TREE);
  const v = readOutline(d);
  expect(newItem(d, v, 1)).toEqual({ ops: [{ op: 'splice', at: 2, n: 0, blocks: [{ k: 'li', depth: 2, runs: [] }] }], at: 2 });
  expect(newItem(d, v, 1, 3, true)).toEqual({ ops: [{ op: 'splice', at: 3, n: 0, blocks: [{ k: 'li', depth: 1, runs: [] }] }], at: 3 });
  expect(after(TREE, (d, v) => newItem(d, v, 2, 3))).toBe('- Launch\n  - Product\n    - Pri\n    - cing\n  - Marketing\n');
  expect(after(TREE, (d, v) => newItem(d, v, 2, 7))).toBe('- Launch\n  - Product\n    - Pricing\n    -\n  - Marketing\n');
  expect(after(TREE, (d, v) => newItem(d, v, 3))).toBe('- Launch\n  - Product\n    - Pricing\n  - Marketing\n  -\n');
  expect(after('', (d, v) => appendItem(d, v))).toBe('-\n');
  expect(after(DOC, (d, v) => appendItem(d, v, 1)).split('\n')[6]).toBe('  -');
  expect(after(TREE, (d, v) => removeAt(d, v, 1))).toBe('- Launch\n  - Pricing\n  - Marketing\n');
  expect(after('-\n', (d, v) => removeAt(d, v, 0))).toBe('');
});

test('the line to the parent: its kind and its name are the item’s attributes; a root has no line', () => {
  expect(after(TREE, (d, v) => setLine(d, v, 2, { dir: '->' }))).toContain('\n    - Pricing {.from}\n');
  expect(after(TREE, (d, v) => setLine(d, v, 2, { dir: '<->', label: 'sets' }))).toContain('\n    - Pricing {.both label=sets}\n');
  expect(after(DOC, (d, v) => setLine(d, v, 2, { dir: '--' }))).toContain('\n    - Pricing {label=sets}\n');
  expect(after(DOC, (d, v) => setLine(d, v, 2, { label: '' }))).toContain('\n    - Pricing {.from}\n');
  expect(after(DOC, (d, v) => setLine(d, v, 4, { label: 'part of it' }))).toContain('\n  - Ops {label="part of it"}\n');
  expect(setLine(parse(TREE), readOutline(parse(TREE)), 0, { dir: '->' })).toEqual([]);
  expect(setLine(parse(DOC), readOutline(parse(DOC)), 2, { dir: '->' })).toEqual([]);
});

test('joins: connected by their words, turned, named, taken away; a renamed item carries its joins', () => {
  expect(after(TREE, (d, v) => connect(d, v, 2, 3))).toBe(TREE + '\n~ Pricing -- Marketing\n');
  expect(connect(parse(TREE), readOutline(parse(TREE)), 2, 2)).toEqual([]);
  expect(connect(parse(DOC), readOutline(parse(DOC)), 3, 2)).toEqual([]);
  expect(after(DOC, (d) => setLink(d, 7, { dir: '->' })).split('\n').at(-2)).toBe('~ Ops -> Product');
  expect(after(DOC, (d) => setLink(d, 7, { label: 'runs' })).split('\n').at(-2)).toBe('~ Ops -- Product: runs');
  expect(after(DOC, (d) => setLink(d, 6, { label: '' })).split('\n').at(-3)).toBe('~ Pricing -> Marketing');
  expect(after(DOC, (d) => unlink(d, 6)).split('\n').at(-2)).toBe('~ Ops -- Product');
  expect(unlink(parse(DOC), 0)).toEqual([]);
  // Renamed: the edges follow, unless another item still has the old name.
  const renamed = parse(DOC.replace('- Marketing {.both}', '- Growth {.both}'));
  expect(write(applyAll(renamed, renameIn(renamed, readOutline(renamed), 'Marketing', 'Growth'))).split('\n').at(-3)).toBe('~ Pricing -> Growth: feeds');
  expect(renameIn(parse(DOC), readOutline(parse(DOC)), 'Marketing', 'Growth')).toEqual([]);
});

test('a document goes under an item after its family, at its depth; a web address is an item of its own', () => {
  expect(after(TREE, (d, v) => insertDoc(d, v, 1, 'sheet\na | b\n--- | ---\n1 | 2'))).toBe('- Launch\n  - Product\n    - Pricing\n\n```sheet {depth=1}\na | b\n--- | ---\n1 | 2\n```\n\n  - Marketing\n');
  expect(after(TREE, (d, v) => insertDoc(d, v, -1, 'draw\n'))).toBe(TREE + '\n```draw {depth=0}\n```\n');
  expect(after(TREE, (d, v) => insertDoc(d, v, 2, 'web\nhttps://example.com/v'))).toBe('- Launch\n  - Product\n    - Pricing\n    - https://example.com/v\n  - Marketing\n');
  // The edges stay last.
  expect(after(DOC, (d, v) => insertDoc(d, v, -1, 'draw\n')).split('\n').slice(-3)).toEqual(['~ Pricing -> Marketing: feeds', '~ Ops -- Product', '']);
});

test('a mind map gets the plain list; an org chart its joins as dotted lines; a network every line and join; a deck a slide per parent', () => {
  const v = readOutline(parse(DOC));
  expect(outlineToMind(v)).toBe('---\nkind: mind\n---\n- Launch\n  - Product\n    - Pricing\n  - Marketing\n  - Ops\n  - Support\n');
  expect(outlineToOrg(v, { title: 'Co' })).toBe('---\ntitle: Co\nkind: org\n---\n- Launch\n  - Product\n    - Pricing\n  - Marketing\n  - Ops\n  - Support\n\n~ Pricing -- Marketing: feeds\n~ Ops -- Product\n');
  expect(outlineToNet(v)).toBe('---\nkind: net\n---\n~ Launch -> Product\n~ Product -> Pricing: sets\n~ Launch <-> Marketing\n~ Launch -- Ops: part of\n~ Launch <- Support\n~ Pricing -> Marketing: feeds\n~ Ops -- Product\n');
  expect(outlineToNet(readOutline(parse('- Alone\n- A\n  - B\n')))).toBe('---\nkind: net\n---\n- Alone\n\n~ A -- B\n');
  const deck = outlineToDeck(readOutline(parse('- Launch\n  - Product\n    - Pricing\n      - Tiers\n    - Onboarding\n  - Marketing\n    - Press\n\n```sheet {depth=1}\na | b\n--- | ---\n```\n\n  - Done\n')));
  expect(deck).toBe('## Launch {.title}\n\n- Product\n- Marketing\n- Done\n\n---\n\n## Product\n\n- Pricing\n- Onboarding\n\n---\n\n## Pricing\n\n- Tiers\n\n---\n\n## Marketing\n\n- Press\n\n---\n\n```sheet\na | b\n--- | ---\n```\n');
  expect(outlineToDeck(readOutline(parse('- A\n  - a1\n- B\n  - b1\n')))).toBe('## A\n\n- a1\n\n---\n\n## B\n\n- b1\n');
  expect(def.handoffs!.map((h) => h.to)).toEqual(['deck', 'diagram', 'diagram', 'diagram']);
  expect(def.handoffs![0].convert('---\ntitle: Plan\n---\n' + TREE)).toBe('---\ntitle: Plan\n---\n## Launch {.title}\n\n- Product\n- Marketing\n\n---\n\n## Product\n\n- Pricing\n');
});

test('OPML, plain text and Markdown, and the page', () => {
  const v = readOutline(parse(DOC));
  expect(toOpml(v, 'Launch')).toBe(
    '<?xml version="1.0" encoding="UTF-8"?>\n<opml version="2.0">\n  <head><title>Launch</title></head>\n  <body>\n    <outline text="Launch">\n      <outline text="Product">\n        <outline text="Pricing"/>\n      </outline>\n      <outline text="Marketing"/>\n      <outline text="Ops"/>\n      <outline text="Support"/>\n    </outline>\n  </body>\n</opml>\n',
  );
  expect(outlineLines(v)).toEqual(['Launch', '  Product', '    Pricing', '  Marketing', '  Ops', '  Support']);
  const built = (ext: string, doc: string) => new TextDecoder().decode(def.exports!.find((x) => x.ext === ext)!.build(doc, { title: '', link: '' }) as Uint8Array);
  expect(built('txt', TREE)).toBe('Launch\n  Product\n    Pricing\n  Marketing\n');
  expect(built('md', '- A^[a note]\n  - B\n')).toBe('- A[^1]\n  - B\n\n[^1]: a note\n');
  expect(built('opml', TREE)).toContain('<title>Launch</title>');
  expect(built('opml', '---\ntitle: Plan\n---\n' + TREE)).toContain('<title>Plan</title>');
  // The page: every item's words, the kind of line before a named one, the notes and the joins under it; a document as a card.
  const page = outlinePage(parse(DOC.replace('- Launch', '- **Launch**^[the plan]') + '\n```sheet {depth=1}\na | b\n--- | ---\n```\n'));
  for (const w of ['Launch', 'Product', 'Pricing', 'Marketing', 'Ops', 'Support', '→ sets', '↔', '— part of', 'the plan', 'Connections', 'Pricing  → feeds  Marketing', 'Sheet', 'a | b']) expect(page.svg).toContain(w);
  expect(page.svg).toContain('font-weight="700">Launch</tspan>');
  expect(page.svg).toContain('baseline-shift="super"');
  expect(page.alt).toBe('Launch');
  expect(page.h).toBeGreaterThan(300);
  expect(def.view('')[0].svg).toContain('An empty outline');
  expect(def.view(DOC, { small: true })[0].svg).not.toContain('Connections');
  expect(docGist('sheet\n---\nchart: pie\n---\na | b\n--- | ---')).toEqual({ app: 'sheet', gist: 'a | b' });
});

test('rich words wrap between words with their marks, and are drawn as tspans', () => {
  const lines = wrapRuns([{ t: 'one two ', b: true }, { t: 'three four five six' }], 90, 16);
  expect(lines.length).toBeGreaterThan(1);
  expect(lines[0][0].b).toBe(true);
  expect(lines.flat().map((p) => p.t).join('')).toBe('one two three four five six');
  const svg = richText(10, 20, [{ t: 'a ', i: true }, { t: 'b', href: 'https://x.y' }, { t: '', ic: 'rocket' }, { t: '1', sup: true }], 16);
  expect(svg).toContain('font-style="italic">a </tspan>');
  expect(svg).toContain('fill="#4f46e5">b</tspan>');
  expect(svg).toContain('<g transform=');
  expect(svg).toContain('baseline-shift="super" font-size="10.4">1</tspan>');
});

test('every template is a real outline that round-trips byte for byte and draws', () => {
  const all = templates();
  expect(all.map((x) => x.id)).toEqual(['launch', 'talk', 'book', 'decision']);
  for (const tpl of all) {
    expect(write(parse(tpl.doc)), tpl.id).toBe(tpl.doc);
    expect(tpl.doc.endsWith('\n')).toBe(true);
    const v = readOutline(parse(tpl.doc));
    expect(v.loose, tpl.id).toBe(false);
    expect(v.items.length, tpl.id).toBeGreaterThan(8);
    expect(v.items.some((it) => it.depth > 1), tpl.id).toBe(true);
    expect(def.view(tpl.doc)[0].svg.length, tpl.id).toBeGreaterThan(400);
  }
  expect(all[0].doc).toContain('{.from label=sets}');
  expect(all[0].doc).toContain('\n~ Pricing -> Press: informs\n');
  expect(def.blank()).toBe('');
  expect(def.title('---\ntitle: Plan\n---\n' + TREE)).toBe('Plan');
  expect(def.retitle(TREE, 'Plan')).toBe('---\ntitle: Plan\n---\n' + TREE);
  expect(def.retitle('---\ntitle: Plan\n---\n' + TREE, '')).toBe(TREE);
});
