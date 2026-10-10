// The drawing as a view of the document, and each command as the ops it produces: under node, no DOM.
import { expect, test } from 'vitest';
import { applyAll, parse, write, type Doc, type Op } from '../../../doc/index.ts';
import { blankTile, parseTile, tileCss, tilePattern, tileRef, tileSvg } from '../../../kit/tile.ts';
import { addShape, describeDrawing, type Shape, duplicate, pasteShapes, pickShapes, shapesFromText, shapesToTlo, floodSquare, paintSquare, patchShape, readDrawing, removeShape, removeShapes, patchShapes, restack, restackShapes, restackTo, duplicateShapes, setAlt, setGrid, setPixels, setTile, simplify, strokeShape, shapesWithin, labelLines, labelText, labelPlain, alignOp, nextAlign, wordsOver } from '../model.ts';
import { drawingPage, drawingToSvg, shapeSvg } from '../view.ts';
import { templates } from '../templates.ts';
import def, { tileOfDoc } from '../def.ts';

const DRAWING = 'Kind | X | Y | W | H | Style | Label\n--- | --- | --- | --- | --- | --- | ---\no | 4 | 6 | 16 | 8 | 1b | Browser\no | 32 | 6 | 16 | 8 | 1b | Server\nk | 0 | 1 | 0 | 0 | 0 | asks\n';
const PIXELS = '---\ngrid: 8\n---\na..b\n.\nc\n';

/** A document edited: the ops applied, the text written. */
const after = (text: string, ops: (doc: Doc) => Op[]) => {
  const doc = parse(text);
  return write(applyAll(doc, ops(doc)));
};
const kinds = (text: string) => readDrawing(parse(text)).shapes.map((s) => s.k).join('');

test('read: shapes from the table, leniently; the alt; no grid', () => {
  const v = readDrawing(parse(DRAWING));
  expect(v.at).toBe(0);
  expect(v.shapes).toHaveLength(3);
  expect(v.shapes[0]).toEqual({ k: 'o', x: 32, y: 48, w: 128, h: 64, f: 1, text: 'Browser', c: 'b' });
  expect(v.shapes[2]).toEqual({ k: 'k', x: 0, y: 1, w: 0, h: 0, f: 0, text: 'asks' });
  expect(v.rows).toEqual([0, 1, 2]);
  expect(v.grid).toBe(0);
  expect(v.tile).toBeNull();
  // Kinds by name, columns in any order, rows that are no shape skipped (and remembered by row number).
  const loose = readDrawing(parse('Label | Kind | X | Y | W | H | Style\n--- | --- | --- | --- | --- | --- | ---\nA | rectangle | 1 | 1 | 4 | 4 | 2r3\nnothing | ? | | | | |\nB | arrow | 2 | 2 | 6 | 0 | 1\n'));
  expect(loose.shapes.map((s) => [s.k, s.text])).toEqual([['r', 'A'], ['a', 'B']]);
  expect(loose.shapes[0]).toMatchObject({ f: 2, c: 'r', z: 3 });
  expect(loose.rows).toEqual([0, 2]);
  expect(readDrawing(parse('')).at).toBe(-1);
  expect(readDrawing(parse('---\nalt: Two boxes\n---\n' + DRAWING)).alt).toBe('Two boxes');
});

test('a shape added: the table is born with the first (one splice), then each is a row', () => {
  const box: Shape = { k: 'r', x: 16, y: 16, w: 96, h: 48, f: 0, text: 'Hi' };
  const ops = addShape(parse(''), box);
  expect(ops.map((o) => o.op)).toEqual(['splice', 'rows']);
  const one = after('', (d) => addShape(d, box));
  expect(one).toBe('Kind | X | Y | W | H | Style | Label\n--- | --- | --- | --- | --- | --- | ---\nr | 2 | 2 | 12 | 6 | 0 | Hi\n');
  expect(addShape(parse(one), { ...box, c: 'g', z: 4 }).map((o) => o.op)).toEqual(['rows']);
  expect(after(one, (d) => addShape(d, { ...box, c: 'g', z: 4, f: 2 }))).toContain('\nr | 2 | 2 | 12 | 6 | 2g4 | Hi\n');
  // A missing column is added before the row that needs it.
  const partial = 'Kind | X | Y\n--- | --- | ---\nr | 1 | 1\n';
  expect(addShape(parse(partial), box).map((o) => o.op)).toEqual(['cols', 'rows']);
  expect(after(partial, (d) => addShape(d, box))).toBe('Kind | X | Y | W | H | Style | Label\n--- | --- | --- | --- | --- | --- | ---\nr | 1 | 1 |  |  |  |\nr | 2 | 2 | 12 | 6 | 0 | Hi\n');
});

test('a shape changed is cells on its row, only where the row differs', () => {
  const moved = patchShape(parse(DRAWING), 1, { x: 320, y: 96 });
  expect(moved).toEqual([{ op: 'cells', at: 0, r: 1, c: 1, values: [['40', '12']] }]);
  // Style and Label sit side by side: one rectangle of cells.
  const styled = patchShape(parse(DRAWING), 0, { f: 2, text: 'Client' });
  expect(styled).toEqual([{ op: 'cells', at: 0, r: 0, c: 5, values: [['2b', 'Client']] }]);
  expect(patchShape(parse(DRAWING), 0, { k: 'r', text: 'Client' }).map((o) => o.op)).toEqual(['cells', 'cells']);
  expect(after(DRAWING, (d) => patchShape(d, 0, { f: 2, text: 'Client' }))).toContain('o | 4 | 6 | 16 | 8 | 2b | Client\n');
  expect(patchShape(parse(DRAWING), 0, { x: 32 })).toEqual([]);
  expect(patchShape(parse(DRAWING), 9, { x: 0 })).toEqual([]);
  // A label's newline becomes a space; nudging a join does nothing to its place (its x and y are shape numbers).
  expect(after(DRAWING, (d) => patchShape(d, 0, { text: 'Web\nbrowser' }))).toContain('| Web browser\n');
});

test('a shape taken out takes its joins with it, and the joins that remain are renumbered', () => {
  const three = DRAWING + 'e | 4 | 30 | 10 | 8 | 0 | Cache\nj | 3 | 1 | 0 | 0 | 1 | \n';
  // Shape 0 (Browser) goes: the join 0->1 goes too (rows out from the last); the join 3--1 now reads 1--0.
  const ops = removeShape(parse(three), 0);
  expect(ops.map((o) => o.op)).toEqual(['rows', 'rows', 'cells']);
  const gone = after(three, (d) => removeShape(d, 0));
  expect(gone).toBe('Kind | X | Y | W | H | Style | Label\n--- | --- | --- | --- | --- | --- | ---\no | 32 | 6 | 16 | 8 | 1b | Server\ne | 4 | 30 | 10 | 8 | 0 | Cache\nj | 1 | 0 | 0 | 0 | 1 |\n');
  // The last shape gone takes the table with it.
  expect(after('Kind | X | Y | W | H | Style | Label\n--- | --- | --- | --- | --- | --- | ---\nr | 1 | 1 | 4 | 4 | 0 | A\n', (d) => removeShape(d, 0))).toBe('');
  expect(removeShape(parse(DRAWING), 5)).toEqual([]);
});

test('restack: a row leaves and arrives at the far end; the joins follow; duplicate is a row at the end', () => {
  const up = restack(parse(DRAWING), 0, true);
  expect(up.at).toBe(2);
  expect(up.ops.map((o) => o.op)).toEqual(['rows', 'rows', 'cells']);
  const front = after(DRAWING, (d) => restack(d, 0, true).ops);
  expect(kinds(front)).toBe('oko');
  expect(readDrawing(parse(front)).shapes[1]).toMatchObject({ k: 'k', x: 2, y: 0 });
  const back = after(front, (d) => restack(d, 2, false).ops);
  expect(back).toBe(DRAWING);
  expect(restack(parse(DRAWING), 2, true).ops).toEqual([]);
  const dup = after(DRAWING, (d) => duplicate(d, 1));
  expect(dup).toContain('\no | 34 | 8 | 16 | 8 | 1b | Server\n');
  expect(duplicate(parse(DRAWING), 2)).toEqual([]);
});

test('the pen: a Points column comes with the first drawn shape and goes with the last', () => {
  const stroke = strokeShape([[0, 0], [96, 0], [96, 96], [0, 96]], true)!;
  expect(stroke.k).toBe('v');
  expect(addShape(parse(DRAWING), stroke).map((o) => o.op)).toEqual(['cols', 'rows']);
  const drawn = after(DRAWING, (d) => addShape(d, stroke));
  expect(drawn.split('\n')[0]).toBe('Kind | X | Y | W | H | Style | Label | Points');
  expect(drawn).toContain('v | 0 | 0 | 12 | 12 | 1 |  | 0:0;100:0;100:100;0:100\n');
  expect(after(drawn, (d) => removeShape(d, 3))).toBe(DRAWING);
  // An open line that does not come back to its start is a stroke; one that does is closed.
  expect(strokeShape([[0, 0], [50, 50], [100, 0]])!.k).toBe('w');
  expect(strokeShape([[0, 0], [50, 50], [100, 0], [3, 2]])!.k).toBe('v');
  expect(strokeShape([[1, 1]])).toBeNull();
  expect(simplify([[0, 0], [1, 0.1], [2, 0], [3, 0.2], [10, 0]])).toEqual([[0, 0], [10, 0]]);
  expect(simplify([[0, 0], [5, 10], [10, 0]])).toHaveLength(3);
});

test('alt, grid and tile are head ops; nothing when nothing changes', () => {
  expect(setAlt(parse(DRAWING), ' A  browser\nasks ')).toEqual([{ op: 'head', key: 'alt', value: 'A browser asks' }]);
  expect(after(DRAWING, (d) => setAlt(d, 'A browser asks a server.'))).toBe('---\nalt: A browser asks a server.\n---\n' + DRAWING);
  expect(after('---\nalt: x\n---\n' + DRAWING, (d) => setAlt(d, ''))).toBe(DRAWING);
  expect(setAlt(parse(DRAWING), '')).toEqual([]);
  expect(setGrid(parse(DRAWING), 16)).toEqual([{ op: 'head', key: 'grid', value: '16' }]);
  expect(setGrid(parse(PIXELS), 8)).toEqual([]);
  expect(after(PIXELS, (d) => setGrid(d, 0))).toBe('a..b\n.\nc\n');
  expect(after(DRAWING, (d) => setTile(d, '8:a/.a'))).toBe('---\ntile: 8:a/.a\n---\n' + DRAWING);
  expect(readDrawing(parse('---\ntile: 8:a/.a\n---\n' + DRAWING)).tile!.rows[1]).toBe('.a......');
});

test('pixel mode: the one paragraph is the grid, replaced whole; painting and filling', () => {
  const v = readDrawing(parse(PIXELS));
  expect(v.grid).toBe(8);
  expect(v.pixels.n).toBe(8);
  expect(v.pixels.rows[0]).toBe('a..b....');
  expect(v.pixels.rows[1]).toBe('........');
  expect(v.pixels.rows[2]).toBe('c.......');
  expect(v.pixelsAt).toBe(0);
  const painted = paintSquare(v.pixels, 7, 7, 'h');
  expect(painted.rows[7]).toBe('.......h');
  expect(setPixels(parse(PIXELS), painted)).toEqual([{ op: 'splice', at: 0, n: 1, blocks: [{ k: 'p', runs: [{ t: 'a..b\n.\nc\n.\n.\n.\n.\n.......h' }] }] }]);
  expect(after(PIXELS, (d) => setPixels(d, painted))).toBe('---\ngrid: 8\n---\na..b\n.\nc\n.\n.\n.\n.\n.......h\n');
  // Cleared, the paragraph goes; an empty grid in a document with none writes nothing.
  expect(after(PIXELS, (d) => setPixels(d, blankTile(8)))).toBe('---\ngrid: 8\n---\n');
  expect(setPixels(parse('---\ngrid: 8\n---\n'), blankTile(8))).toEqual([]);
  expect(after('---\ngrid: 16\n---\n', (d) => setPixels(d, paintSquare(blankTile(16), 2, 1, 'c')))).toBe('---\ngrid: 16\n---\n.\n..c\n');
  // The eraser is '.', an unknown ink is nothing, a square already that ink is nothing.
  expect(paintSquare(v.pixels, 0, 0, '.').rows[0]).toBe('...b....');
  expect(paintSquare(v.pixels, 0, 0, 'z')).toBe(v.pixels);
  expect(paintSquare(v.pixels, 0, 0, 'a')).toBe(v.pixels);
  // Fill: the clear squares joined to (1, 0) all become 'e'; the 'a' at (0, 0) is left alone.
  const filled = floodSquare(v.pixels, 1, 0, 'e');
  expect(filled.rows[0]).toBe('aeebeeee');
  expect(filled.rows[2]).toBe('ceeeeeee');
  // A document in pixel mode with a table keeps both; the grid wins the view.
  const both = readDrawing(parse('---\ngrid: 16\n---\n' + DRAWING + '\n..c\n'));
  expect(both.shapes).toHaveLength(3);
  expect(both.pixels.rows[0]).toBe('..c.............');
  expect(both.pixelsAt).toBe(1);
});

test('the tile: its field, its pattern, one tile as SVG and CSS', () => {
  const t = parseTile('8:a..a/.a.a////b')!;
  expect(t.n).toBe(8);
  expect(t.rows).toHaveLength(8);
  expect(t.rows[0]).toBe('a..a....');
  expect(t.rows[5]).toBe('b.......');
  expect(tileRef(t)).toBe('8:a..a/.a.a////b');
  expect(tileRef(blankTile(16))).toBe('16:');
  expect(parseTile('1:a')).toBeNull();
  expect(parseTile('abc')).toBeNull();
  expect(parseTile('4:zzzz')!.rows[0]).toBe('....');
  const pattern = tilePattern(t, 'tile', 64);
  expect(pattern).toMatch(/^<pattern id="tile" width="64" height="64" patternUnits="userSpaceOnUse">/);
  expect(pattern.match(/<rect/g)).toHaveLength(5);
  expect(tileSvg(t, 128)).toContain('viewBox="0 0 128 128"');
  expect(tileCss(t)).toMatch(/^url\("data:image\/svg\+xml,/);
});

test('describing a drawing from its shapes', () => {
  expect(describeDrawing(readDrawing(parse(DRAWING)).shapes)).toBe('A drawing of Browser, Server. Browser leads to Server (asks).');
  expect(describeDrawing(readDrawing(parse('Kind | X | Y | W | H | Style | Label\n--- | --- | --- | --- | --- | --- | ---\nr | 1 | 1 | 4 | 4 | 0 |\n')).shapes)).toBe('A drawing of one unlabelled shape.');
  expect(describeDrawing([])).toBe('');
});

test('the pages: shapes as SVG with their labels and arrowheads, over the tile; pixel mode as squares; the files', () => {
  const page = drawingPage(parse(DRAWING));
  expect(page.w).toBe(640);
  expect(page.svg).toContain('>Browser<');
  expect(page.svg).toContain('marker-end="url(#arrow)"');
  expect(page.alt).toBe('A drawing of Browser, Server. Browser leads to Server (asks).');
  expect(drawingPage(parse('---\nalt: Said\n---\n' + DRAWING)).alt).toBe('Said');
  expect(drawingPage(parse('')).alt).toBe('An empty drawing');
  const tiled = drawingPage(parse('---\ntile: 8:a/.a\n---\n' + DRAWING));
  expect(tiled.svg).toContain('<pattern id="tile"');
  expect(tiled.svg).toContain('fill="url(#tile)"');
  const px = drawingPage(parse(PIXELS));
  expect(px.w).toBe(480);
  expect(px.svg.match(/<rect/g)).toHaveLength(3);
  expect(px.alt).toBe('Pixel art, 8 by 8: 3 squares filled.');
  // An icon shape draws its glyph; a label's icon too; an unknown icon draws nothing and the words stay.
  expect(shapeSvg({ k: 'i', x: 0, y: 0, w: 48, h: 48, f: 0, text: 'rocket' })).toContain('<g transform=');
  expect(shapeSvg({ k: 'r', x: 0, y: 0, w: 96, h: 48, f: 0, text: ':star Launch' })).toContain('>Launch<');
  expect(shapeSvg({ k: 'i', x: 0, y: 0, w: 48, h: 48, f: 0, text: 'no-such-icon' })).toBe('');
  const svg = new TextDecoder().decode(def.exports!.find((x) => x.ext === 'svg')!.build(DRAWING, { title: '', link: '' }) as Uint8Array);
  expect(svg.startsWith('<?xml')).toBe(true);
  expect(svg).toContain('<svg');
  expect(drawingToSvg(parse(DRAWING))).toContain('role="img"');
  const tile = new TextDecoder().decode(def.exports!.find((x) => x.ext === 'tile.svg')!.build(PIXELS, { title: '', link: '' }) as Uint8Array);
  expect(tile).toContain('viewBox="0 0 128 128"');
  expect(tileOfDoc('---\ntile: 4:ab\n---\n').rows[0]).toBe('ab..');
  expect(tileOfDoc('').n).toBe(8);
  expect(def.handoffs!.map((h) => h.to)).toEqual(['anim']);
  expect(def.handoffs![0].convert(DRAWING)).toBe(DRAWING);
});

test('every template is a real document that round-trips byte for byte and draws', () => {
  const all = templates();
  expect(all.map((x) => x.id)).toEqual(['flowchart', 'card', 'event', 'floorplan', 'room', 'wireframe', 'logo', 'badge', 'order', 'request', 'tiers', 'heart', 'icons', 'sprite', 'tile']);
  // Every one has its own title, a name and a blurb.
  for (const tpl of all) expect([parse(tpl.doc).head.title, tpl.name, tpl.blurb].every(Boolean), tpl.id).toBe(true);
  for (const tpl of all) {
    expect(write(parse(tpl.doc)), tpl.id).toBe(tpl.doc);
    expect(tpl.doc.endsWith('\n')).toBe(true);
    const v = readDrawing(parse(tpl.doc));
    if (v.grid) expect(v.pixels.rows.join('').replace(/\./g, '').length, tpl.id).toBeGreaterThan(8);
    else expect(v.shapes.length, tpl.id).toBeGreaterThan(3);
    expect(def.view(tpl.doc)[0].svg.length, tpl.id).toBeGreaterThan(100);
  }
  expect(def.blank()).toBe('');
  expect(def.title('---\ntitle: Flow\n---\n' + DRAWING)).toBe('Flow');
  expect(def.retitle(DRAWING, 'Flow')).toBe('---\ntitle: Flow\n---\n' + DRAWING);
  expect(def.retitle('---\ntitle: Flow\n---\n' + DRAWING, '')).toBe(DRAWING);
});

test('the clipboard: shapes picked out as a drawing of their own, the joins among them renumbered and the rest dropped', () => {
  const all = readDrawing(parse(DRAWING + 'r | 10 | 20 | 4 | 4 | 0 | Cache\nj | 1 | 3 | 0 | 0 | 0 |\n')).shapes;
  // Server, the cache and the line between them: the join from Browser goes, the line is numbered within the copy.
  const picked = pickShapes(all, [3, 4, 1, 2]);
  expect(picked.map((s) => [s.k, s.x, s.y])).toEqual([['o', 256, 48], ['r', 80, 160], ['j', 0, 1]]);
  expect(pickShapes(all, [2])).toEqual([]);
  const tlo = shapesToTlo(picked);
  expect(tlo).toBe('Kind | X | Y | W | H | Style | Label\n--- | --- | --- | --- | --- | --- | ---\no | 32 | 6 | 16 | 8 | 1b | Server\nr | 10 | 20 | 4 | 4 | 0 | Cache\nj | 0 | 1 | 0 | 0 | 0 |\n');
  expect(write(parse(tlo))).toBe(tlo);
  expect(shapesFromText(tlo)).toEqual(picked);
  // Points come along for a shape drawn by hand.
  expect(shapesToTlo([{ k: 'w', x: 8, y: 8, w: 16, h: 16, f: 0, text: '', pts: [0, 0, 100, 100] }])).toContain('| Points\n');
  // Read from anything holding a drawing's table: words around it, CRLF; a join to a shape not there is dropped.
  expect(shapesFromText('Some words\r\n\r\nKind | X | Y\r\n--- | --- | ---\r\nr | 1 | 1\r\nk | 0 | 5\r\n').map((s) => s.k)).toEqual(['r']);
  expect(shapesFromText('just words')).toEqual([]);
});

test('the clipboard: shapes pasted as one rows op, a grid step down and right (further while a copy sits there), joins renumbered, the last shape chosen', () => {
  const doc = parse(DRAWING);
  const copy = shapesFromText(shapesToTlo(pickShapes(readDrawing(doc).shapes, [0, 1, 2])));
  const { ops, sel } = pasteShapes(doc, copy);
  expect(ops).toEqual([{ op: 'rows', at: 0, r: 3, n: 3, rows: [['o', '5', '7', '16', '8', '1b', 'Browser'], ['o', '33', '7', '16', '8', '1b', 'Server'], ['k', '3', '4', '0', '0', '0', 'asks']] }]);
  expect(sel).toBe(4);
  const once = applyAll(doc, ops);
  // A second paste of the same copy lands a step further on, so it shows.
  const again = pasteShapes(once, copy);
  expect((again.ops[0] as Extract<Op, { op: 'rows' }>).rows![0].slice(0, 3)).toEqual(['o', '6', '8']);
  // Into an empty drawing: the table is born, then the rows.
  const fresh = pasteShapes(parse(''), [{ k: 'r', x: 8, y: 8, w: 32, h: 16, f: 0, text: 'Hi' }]);
  expect(fresh.ops.map((o) => o.op)).toEqual(['splice', 'rows']);
  expect(write(applyAll(parse(''), fresh.ops))).toBe('Kind | X | Y | W | H | Style | Label\n--- | --- | --- | --- | --- | --- | ---\nr | 2 | 2 | 4 | 2 | 0 | Hi\n');
  expect(pasteShapes(doc, [])).toEqual({ ops: [], sel: -1, all: [] });
});

test('a text shape draws " | " as a new line, like a note', () => {
  const svg = shapeSvg({ k: 't', x: 0, y: 0, w: 200, h: 40, f: 0, text: 'One | Two' });
  expect(svg.match(/<text /g)).toHaveLength(2);
  expect(svg).not.toContain('|');
});

const FOUR = 'Kind | X | Y | W | H | Style | Label\n--- | --- | --- | --- | --- | --- | ---\nr | 1 | 1 | 4 | 4 | 0 | A\nr | 8 | 1 | 4 | 4 | 0 | B\nk | 0 | 1 | 0 | 0 | 0 |\nr | 16 | 1 | 4 | 4 | 0 | C\n';
const labels = (text: string) => readDrawing(parse(text)).shapes.map((s) => (s.k === 'k' ? `${s.x}>${s.y}` : s.text)).join(' ');

test('several shapes at once: removed with their joins, patched each its own way', () => {
  expect(labels(after(FOUR, (d) => removeShapes(d, [0, 3])))).toBe('B');
  expect(labels(after(FOUR, (d) => removeShapes(d, [3])))).toBe('A B 0>1');
  expect(removeShapes(parse(FOUR), [9])).toEqual([]);
  const moved = readDrawing(parse(after(FOUR, (d) => patchShapes(d, [[0, { x: 16 }], [3, { x: 200, text: 'D' }]])))).shapes;
  expect([moved[0].x, moved[3].x, moved[3].text, moved[1].x]).toEqual([16, 200, 'D', 64]);
});

test('restackTo and restackShapes: one place forward or back, to the front or back, together and in order; the joins follow', () => {
  expect(labels(after(FOUR, (d) => restackTo(d, 0, 1)))).toBe('B A 1>0 C');
  expect(labels(after(FOUR, (d) => restackShapes(d, [0, 1], 1).ops))).toBe('1>2 A B C');
  const front = restackShapes(parse(FOUR), [0, 1], 'front');
  expect(labels(after(FOUR, () => front.ops))).toBe('2>3 C A B');
  expect(front.at).toEqual([2, 3]);
  expect(labels(after(FOUR, (d) => restackShapes(d, [3], 'back').ops))).toBe('C A B 1>2');
  // Already at the front: nothing moves, and none passes another.
  expect(restackShapes(parse(FOUR), [3], 1).ops).toEqual([]);
  expect(labels(after(FOUR, (d) => restackShapes(d, [1, 3], -1).ops))).toBe('B A C 1>0');
});

test('duplicateShapes: copies of the chosen shapes and the joins among them, two steps down and right, all chosen', () => {
  const d = duplicateShapes(parse(FOUR), [0, 1, 2]);
  const text = after(FOUR, () => d.ops);
  expect(labels(text)).toBe('A B 0>1 C A B 4>5');
  expect(d.sel).toEqual([4, 5, 6]);
  expect(readDrawing(parse(text)).shapes[4].x).toBe(8 + 16);
  expect(duplicateShapes(parse(FOUR), [2]).ops).toEqual([]);
});

test('rot: a Rot column read leniently, written only while a shape is turned, the text byte-stable; lines are never turned', () => {
  const turned = 'Kind | X | Y | W | H | Style | Label | Rot\n--- | --- | --- | --- | --- | --- | --- | ---\nr | 4 | 6 | 16 | 8 | 0 | A | 30\nl | 1 | 1 | 4 | 0 | 0 |  | 45\no | 2 | 2 | 4 | 4 | 0 | B |\n';
  const v = readDrawing(parse(turned));
  expect(v.shapes[0].rot).toBe(30);
  expect(v.shapes[1].rot).toBeUndefined();
  expect(v.shapes[2].rot).toBeUndefined();
  expect(write(parse(turned))).toBe(turned);
  expect(readDrawing(parse(turned.replace('| 30', '| -90'))).shapes[0].rot).toBe(270);
  // Turning a shape adds the column; turning it back takes the column away again.
  const on = after(DRAWING, (d) => patchShape(d, 0, { rot: 45 }));
  expect(on).toBe('Kind | X | Y | W | H | Style | Label | Rot\n--- | --- | --- | --- | --- | --- | --- | ---\no | 4 | 6 | 16 | 8 | 1b | Browser | 45\no | 32 | 6 | 16 | 8 | 1b | Server |\nk | 0 | 1 | 0 | 0 | 0 | asks |\n');
  expect(after(on, (d) => patchShape(d, 0, { rot: 360 }))).toBe(DRAWING);
  // Drawn turned about the centre; a copy keeps its turn.
  expect(shapeSvg(readDrawing(parse(on)).shapes[0])).toMatch(/^<g transform="rotate\(45 96 80\)">/);
  expect(shapesToTlo(pickShapes(readDrawing(parse(on)).shapes, [0]))).toContain('| Rot\n');
  expect(shapesFromText(shapesToTlo(pickShapes(readDrawing(parse(on)).shapes, [0])))[0].rot).toBe(45);
});

test('the marquee takes every shape whose box lies inside it (as it shows, turned), and the joins whose two ends it takes', () => {
  const shapes = readDrawing(parse(DRAWING)).shapes;
  // Browser is 32..160 by 48..112, Server 256..384 by 48..112.
  expect(shapesWithin(shapes, 0, 0, 200, 200)).toEqual([0]);
  expect(shapesWithin(shapes, 400, 300, 0, 0)).toEqual([0, 1, 2]);
  expect(shapesWithin(shapes, 40, 40, 400, 200)).toEqual([1]);
  // Turned a quarter, Browser stands 64 wide and 128 tall about its centre (96, 80): out of a box it fitted unturned.
  const turned = shapes.map((s, i) => (i === 0 ? { ...s, rot: 90 } : s));
  expect(shapesWithin(turned, 0, 40, 200, 120)).toEqual([]);
  expect(shapesWithin(turned, 60, 10, 140, 150)).toEqual([0]);
});

test('a rich label: inline Markdown read as runs and written back the same; " | " lines; drawn as tspans', () => {
  const label = '**Bold** and *italic* ++under++ | ~~gone~~ ==marked==';
  const lines = labelLines(label);
  expect(lines).toHaveLength(2);
  expect(lines[0]).toEqual([{ t: 'Bold', b: true }, { t: ' and ' }, { t: 'italic', i: true }, { t: ' ' }, { t: 'under', u: true }]);
  expect(labelText(lines)).toBe(label);
  expect(labelPlain(':rocket **Go** now')).toBe(':rocket Go now');
  const doc = `Kind | X | Y | W | H | Style | Label\n--- | --- | --- | --- | --- | --- | ---\nr | 4 | 6 | 30 | 8 | 0 | ${label.replace(/\|/g, '\\|')}\n`;
  expect(write(parse(doc))).toBe(doc);
  const svg = shapeSvg(readDrawing(parse(doc)).shapes[0]);
  expect(svg).toContain('<tspan font-weight="700">Bold</tspan>');
  expect(svg).toContain('<tspan font-style="italic">italic</tspan>');
  expect(svg).toContain('<tspan text-decoration="underline">under</tspan>');
  expect(svg).toContain('<tspan text-decoration="line-through">gone</tspan>');
  expect(svg).toMatch(/<tspan stroke="#facc15"[^>]*>marked<\/tspan>/);
  // A link's words are drawn, not its address; the description reads plain words.
  expect(labelText(labelLines('[Site](https://example.com) here'))).toBe('Site here');
  expect(describeDrawing(readDrawing(parse(doc)).shapes)).toBe('A drawing of Bold and italic under | gone marked.');
});

const TEXTS = 'Kind | X | Y | W | H | Style | Label\n--- | --- | --- | --- | --- | --- | ---\nt | 2 | 2 | 20 | 4 | 0 | Left\nt | 2 | 8 | 20 | 4 | 1b3= | Middle\nt | 2 | 14 | 20 | 4 | 0> | Right\nr | 2 | 20 | 20 | 4 | 0 | Box\n';

test('align: a text\'s "=" (centred) and ">" (right) end its Style; read anywhere in the cell, written last, only for a text; byte-stable', () => {
  const v = readDrawing(parse(TEXTS));
  expect(v.shapes.map((s) => s.al)).toEqual([undefined, 'c', 'r', undefined]);
  expect(v.shapes[1]).toMatchObject({ f: 1, c: 'b', z: 3, al: 'c' });
  expect(write(parse(TEXTS))).toBe(TEXTS);
  // Leniently: the mark before the rest, or between; written back last.
  const loose = (style: string, k = 't') => readDrawing(parse(`Kind | X | Y | W | H | Style | Label\n--- | --- | --- | --- | --- | --- | ---\n${k} | 1 | 1 | 4 | 4 | ${style} | A\n`));
  expect(loose('=1b').shapes[0]).toMatchObject({ f: 1, c: 'b', al: 'c' });
  expect(loose('2>r3').shapes[0]).toMatchObject({ f: 2, c: 'r', z: 3, al: 'r' });
  const doc = parse('Kind | X | Y | W | H | Style | Label\n--- | --- | --- | --- | --- | --- | ---\nt | 1 | 1 | 4 | 4 | =1b | A\n');
  expect(write(applyAll(doc, patchShape(doc, 0, { z: 4 })))).toContain('| 1b4= | A\n');
  // Never on a shape that is not a text: read past, and written as nothing.
  expect(loose('1=').shapes[0].al).toBe('c');
  expect(loose('1=', 'r').shapes[0].al).toBeUndefined();
  expect(loose('1=', 'r').shapes[0].f).toBe(1);
  expect(after(TEXTS, (d) => patchShape(d, 3, { al: 'c' }))).toBe(TEXTS);
});

test('alignOp: the texts among those given set left, centred or right; the others left alone; nothing for no change', () => {
  expect(after(TEXTS, (d) => alignOp(d, [0], 'c'))).toContain('| 0= | Left\n');
  expect(after(TEXTS, (d) => alignOp(d, [1], ''))).toContain('| 1b3 | Middle\n');
  expect(after(TEXTS, (d) => alignOp(d, [0, 1, 2, 3], 'r'))).toBe(TEXTS.replace('| 0 | Left', '| 0> | Left').replace('1b3=', '1b3>'));
  expect(alignOp(parse(TEXTS), [2, 3], 'r')).toEqual([]);
  expect(alignOp(parse(TEXTS), [3], 'c')).toEqual([]);
  expect([nextAlign(undefined), nextAlign('c'), nextAlign('r')]).toEqual(['c', 'r', '']);
});

test('align drawn: a text\'s words from the left edge, the centre or the right edge; an icon stays with them', () => {
  const at = (s: string) => [...s.matchAll(/<text x="([\d.]+)" text-anchor="(\w+)"/g)].map((m) => [+m[1], m[2]]);
  const t = { k: 't' as const, x: 16, y: 16, w: 160, h: 32, f: 0 as const, text: 'Hi' };
  expect(at(shapeSvg(t))).toEqual([[20, 'start']]);
  expect(at(shapeSvg({ ...t, al: 'c' }))).toEqual([[96, 'middle']]);
  expect(at(shapeSvg({ ...t, al: 'r' }))).toEqual([[172, 'end']]);
  // A box's words are centred, whatever a stray alignment says.
  expect(at(shapeSvg({ ...t, k: 'r', al: 'r' }))).toEqual([[96, 'middle']]);
  // With an icon: on the left it leads; centred, icon and words are centred as one; on the right the words end at the edge and the icon is just before them.
  const iconX = (s: string) => +/<g transform="translate\(([\d.-]+) /.exec(s)![1];
  const ic = { ...t, text: ':star Hi' };
  const left = shapeSvg(ic);
  expect(iconX(left)).toBe(20);
  const mid = shapeSvg({ ...ic, al: 'c' });
  const [[mx]] = at(mid);
  expect(iconX(mid)).toBeLessThan(96);
  expect(mx).toBeGreaterThan(96);
  const right = shapeSvg({ ...ic, al: 'r' });
  expect(at(right)).toEqual([[172, 'end']]);
  expect(iconX(right)).toBeGreaterThan(100);
  expect(iconX(right)).toBeLessThan(172 - 20);
});

test('align over: the words editor sits as the text\'s words do, aligned the same way', () => {
  const th = { ink: '#000', paper: '#fff', shade: '#eee' };
  const t = { k: 't' as const, x: 16, y: 16, w: 160, h: 32, f: 0 as const, text: 'Hi' };
  const o = (s: typeof t & { al?: 'c' | 'r' }) => wordsOver(s, [s], 1, 0, 0, th).style;
  expect(o(t)).toMatchObject({ left: '20px', textAlign: 'left' });
  expect(o(t).transform).toContain('translate(0, -50%)');
  expect(o({ ...t, al: 'c' })).toMatchObject({ left: '96px', textAlign: 'center' });
  expect(o({ ...t, al: 'c' }).transform).toContain('translate(-50%, -50%)');
  expect(o({ ...t, al: 'r' })).toMatchObject({ left: '172px', textAlign: 'right' });
  expect(o({ ...t, al: 'r' }).transform).toContain('translate(-100%, -50%)');
});
