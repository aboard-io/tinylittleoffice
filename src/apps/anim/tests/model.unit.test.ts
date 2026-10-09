// Motion as a view of the document, and each command as the ops it produces: under node, no DOM.
import { expect, test } from 'vitest';
import { applyAll, invertAll, parse, write, type Doc, type Op } from '../../../doc/index.ts';
import { depthDim, drawingOf, duplicateShape, duplicateShapes, follow, frameOrder, gifLoop, keysOf, loopOf, loosen, motionOf, pasteMotion, playhead, readAnim, redraw, removeKey, removeShape, removeShapes, restKey, room, setLength, setLoop, stateAt, turnScale, withKey, withKeys } from '../model.ts';
import { animFrames, animPage, animToSvg, drawOrder, frameSvg, transformOf } from '../view.ts';
import { templates } from '../templates.ts';
import def from '../def.ts';
import draw from '../../draw/def.ts';
import { appOf } from '../../../kit/apps.ts';
import { readDrawing } from '../../draw/model.ts';

const LIFT = '---\nframes: 24\nfps: 8\n---\nKind | X | Y | W | H | Style | Label\n--- | --- | --- | --- | --- | --- | ---\nt | 4 | 20 | 20 | 4 | 04 | Lift off\ni | 8 | 36 | 8 | 8 | 0b | rocket\n\nShape | Keys\n--- | ---\n0 | 0,0,0,0,1,0; 23,0,-80,0,1,0,i\n1 | 0,0,0,0,1,0; 23,200,-200,80,1,-30,d\n';
const DRAWING = 'Kind | X | Y | W | H | Style | Label\n--- | --- | --- | --- | --- | --- | ---\no | 4 | 6 | 16 | 8 | 1b | Browser\no | 32 | 6 | 16 | 8 | 1b | Server\nk | 0 | 1 | 0 | 0 | 0 | asks\n';

/** A document edited: the ops applied, the text written; and the ops undone give the text back. */
function after(text: string, ops: (doc: Doc) => Op[]): string {
  const doc = parse(text);
  const list = ops(doc);
  const out = applyAll(doc, list);
  expect(write(applyAll(out, invertAll(doc, list)))).toBe(write(doc));
  return write(out);
}
const keysTable = (text: string) => text.slice(text.indexOf('Shape | Keys'));

test('read: length, speed, shapes, keys by shape number; defaults for a bare drawing', () => {
  const v = readAnim(parse(LIFT));
  expect([v.frames, v.fps, v.shapes.length, v.keysAt]).toEqual([24, 8, 2, 1]);
  expect(v.keys[1]).toEqual([restKey(0), { t: 23, dx: 200, dy: -200, z: 80, s: 1, r: -30, fx: 'd' }]);
  const bare = readAnim(parse(DRAWING));
  expect([bare.frames, bare.fps, bare.keysAt, bare.keys]).toEqual([24, 8, -1, [[], [], []]]);
  // Leniently: out-of-range length and speed, a frame past the end, a duplicate frame (the last wins), unknown effects, corners.
  const loose = readAnim(parse('---\nframes: 900\nfps: 5\n---\n' + DRAWING + '\nShape | Keys\n--- | ---\n0 | 3,1,2,999,0.04,5,xyzd; 3,9,9,0,1,0; 500,0,0,0,1,0,,p0:0/100:50\n7 | 0,1,1,1,1,1\n'));
  expect([loose.frames, loose.fps]).toEqual([120, 5]);
  expect(readAnim(parse('---\nfps: 99\n---\n' + DRAWING)).fps).toBe(30);
  expect(readAnim(parse('---\nfps: x\n---\n' + DRAWING)).fps).toBe(8);
  expect(loose.keys[0]).toEqual([{ t: 3, dx: 9, dy: 9, z: 0, s: 1, r: 0, fx: '' }, { t: 119, dx: 0, dy: 0, z: 0, s: 1, r: 0, fx: '', pts: [0, 0, 100, 50] }]);
  expect(keysOf('2,0,0,999,0.04,0,ddz', 24)).toEqual([{ t: 2, dx: 0, dy: 0, z: 200, s: 0.1, r: 0, fx: 'd' }]);
});

test('stateAt: straight lines between keys, held before the first and after the last; effects held; corners morph only when they match', () => {
  const v = readAnim(parse(LIFT));
  expect(stateAt(v, 1, 11.5)).toMatchObject({ dx: 100, dy: -100, z: 40, r: -15, fx: '' });
  expect(stateAt(v, 1, 30)).toMatchObject({ dx: 200, fx: 'd' });
  expect(stateAt(v, 0, 0)).toMatchObject({ dx: 0, dy: 0 });
  const pen = readAnim(parse('Kind | X | Y | W | H | Style | Label | Points\n--- | --- | --- | --- | --- | --- | --- | ---\nv | 0 | 0 | 10 | 10 | 1 | | 0:0;100:0;50:100\n\nShape | Keys\n--- | ---\n0 | 0,0,0,0,1,0,,p0:0/100:0/50:100; 10,0,0,0,1,0,,p0:0/100:0/50:0\n'));
  expect(stateAt(pen, 0, 5).pts).toEqual([0, 0, 100, 0, 50, 50]);
  expect(readAnim(parse(DRAWING)).keys[0]).toEqual([]);
  expect(stateAt(readAnim(parse(DRAWING)), 0, 4)).toEqual(restKey(4));
});

test('withKey: the keys table replaced by one splice (put in with the first key), with the length and speed in the head; removeKey takes it out with the last', () => {
  const doc = parse(DRAWING);
  const ops = withKey(doc, 1, { ...restKey(12), dx: 40.4, s: 1.26, fx: 'nn' });
  expect(ops).toEqual([
    { op: 'head', key: 'frames', value: '24' },
    { op: 'head', key: 'fps', value: '8' },
    { op: 'splice', at: 1, n: 0, blocks: [{ k: 'table', cols: [{ name: 'Shape', type: 'text' }, { name: 'Keys', type: 'text' }], rows: [['1', '12,40,0,0,1.3,0,n']] }] },
  ]);
  const one = after(DRAWING, () => ops);
  expect(one).toBe('---\nframes: 24\nfps: 8\n---\n' + DRAWING + '\nShape | Keys\n--- | ---\n1 | 12,40,0,0,1.3,0,n\n');
  // A second key on the same shape: the row grows, sorted by frame; a key at a frame that has one replaces it.
  const two = after(one, (d) => withKey(d, 1, { ...restKey(3), dy: -8 }));
  expect(keysTable(two)).toBe('Shape | Keys\n--- | ---\n1 | 3,0,-8,0,1,0; 12,40,0,0,1.3,0,n\n');
  expect(withKey(parse(two), 1, readAnim(parse(two)).keys[1][0]).filter((o) => o.op === 'splice')).toEqual([]);
  expect(after(two, (d) => removeKey(d, 1, 3))).toBe(one);
  // The last key out: the table goes; the head stays.
  expect(after(one, (d) => removeKey(d, 1, 12))).toBe('---\nframes: 24\nfps: 8\n---\n' + DRAWING);
  expect(withKey(doc, 9, restKey(0))).toEqual([]);
});

test('setLength: head ops, and the keys past the new end gone', () => {
  expect(after(LIFT, (d) => setLength(d, 12, 12))).toBe('---\nframes: 12\nfps: 12\n---\nKind | X | Y | W | H | Style | Label\n--- | --- | --- | --- | --- | --- | ---\nt | 4 | 20 | 20 | 4 | 04 | Lift off\ni | 8 | 36 | 8 | 8 | 0b | rocket\n\nShape | Keys\n--- | ---\n0 | 0,0,0,0,1,0\n1 | 0,0,0,0,1,0\n');
  expect(setLength(parse(LIFT), 24, 8)).toEqual([]);
  expect(setLength(parse(LIFT), 999, 7)).toEqual([{ op: 'head', key: 'frames', value: '120' }, { op: 'head', key: 'fps', value: '7' }]);
  expect(setLength(parse(LIFT), 24, 0)).toEqual([]);
  expect(setLength(parse(LIFT), 24, 60)).toEqual([{ op: 'head', key: 'fps', value: '30' }]);
});

test('removeShape and duplicateShape: Draw ops on the shapes, and the keys go with their shapes', () => {
  const text = LIFT.replace('i | 8 | 36 | 8 | 8 | 0b | rocket\n', 'i | 8 | 36 | 8 | 8 | 0b | rocket\no | 40 | 10 | 8 | 4 | 0 | Moon\nk | 1 | 2 | 0 | 0 | 0 |\n').replace('1 | 0,0,0,0,1,0; 23,200', '2 | 5,1,1,0,1,0\n1 | 0,0,0,0,1,0; 23,200');
  // Taking out the title: the rocket is now shape 0 and the moon shape 1, their keys with them; the join renumbered.
  const out = after(text, (d) => removeShape(d, 0));
  expect(out).toContain('\ni | 8 | 36 | 8 | 8 | 0b | rocket\no | 40 | 10 | 8 | 4 | 0 | Moon\nk | 0 | 1 | 0 | 0 | 0 |\n');
  expect(keysTable(out)).toBe('Shape | Keys\n--- | ---\n0 | 0,0,0,0,1,0; 23,200,-200,80,1,-30,d\n1 | 5,1,1,0,1,0\n');
  // The moon out takes its join and its keys.
  const moonless = after(text, (d) => removeShape(d, 2));
  expect(moonless).not.toContain('Moon');
  expect(keysTable(moonless)).toBe(keysTable(LIFT));
  const dup = after(LIFT, (d) => duplicateShape(d, 1));
  expect(dup).toContain('\ni | 10 | 38 | 8 | 8 | 0b | rocket\n');
  expect(keysTable(dup)).toBe(keysTable(LIFT) + '2 | 0,0,0,0,1,0; 23,200,-200,80,1,-30,d\n');
});

test('follow: which old shape each new one is, across a reorder, an edit, an addition and a removal', () => {
  const s = readDrawing(parse(DRAWING)).shapes;
  const moved = { ...s[0], x: s[0].x + 8 };
  expect(follow(s, [s[1], s[0], { ...s[2], x: 1, y: 0 }])).toEqual([1, 0, 2]);
  expect(follow(s, [moved, s[1], s[2]])).toEqual([0, 1, 2]);
  expect(follow(s, [...s, s[0]])).toEqual([0, 1, 2, -1]);
  expect(follow(s, [s[1]])).toEqual([1]);
});

test('redraw: Draw mode hands back a drawing; the shapes table replaced by one splice, the alt and tile into the head, the keys following', () => {
  expect(write(drawingOf(parse(LIFT)))).toBe('Kind | X | Y | W | H | Style | Label\n--- | --- | --- | --- | --- | --- | ---\nt | 4 | 20 | 20 | 4 | 04 | Lift off\ni | 8 | 36 | 8 | 8 | 0b | rocket\n');
  const doc = parse(LIFT);
  // The title sent to the back after the rocket was brought forward: rows swapped.
  const swapped = parse('---\nalt: Up\n---\nKind | X | Y | W | H | Style | Label\n--- | --- | --- | --- | --- | --- | ---\ni | 8 | 36 | 8 | 8 | 0b | rocket\nt | 4 | 20 | 20 | 4 | 04 | Lift off\n');
  const ops = redraw(doc, swapped);
  expect(ops.map((o) => o.op)).toEqual(['splice', 'head', 'splice']);
  const out = write(applyAll(doc, ops));
  expect(out.startsWith('---\nframes: 24\nfps: 8\nalt: Up\n---\nKind')).toBe(true);
  expect(keysTable(out)).toBe('Shape | Keys\n--- | ---\n0 | 0,0,0,0,1,0; 23,200,-200,80,1,-30,d\n1 | 0,0,0,0,1,0; 23,0,-80,0,1,0,i\n');
  expect(redraw(doc, drawingOf(doc))).toEqual([]);
  // A first shape drawn on an empty stage: the table goes in; the last taken away: out, with the keys.
  expect(write(applyAll(parse(''), redraw(parse(''), parse(DRAWING))))).toBe(DRAWING);
  expect(write(applyAll(doc, redraw(doc, parse(''))))).toBe('---\nframes: 24\nfps: 8\n---\n');
});

test('loosen: a list with no drawing becomes things on the stage that drift to the right; a drawing is left alone', () => {
  expect(loosen(parse(LIFT))).toEqual([]);
  expect(loosen(parse(''))).toEqual([]);
  const out = after('- :rocket:\n- Hello there\n\n> Hi, drifting.\n', loosen);
  expect(out).toBe('---\nframes: 24\nfps: 8\nalt: Hi, drifting.\n---\nKind | X | Y | W | H | Style | Label\n--- | --- | --- | --- | --- | --- | ---\ni | 10 | 15 | 6 | 6 | 0 | rocket\nt | 10 | 31 | 20 | 4 | 03 | Hello there\n\nShape | Keys\n--- | ---\n0 | 0,0,0,0,1,0; 23,384,0,0,1,0\n1 | 0,0,0,0,1,0; 23,384,0,0,1,0\n');
});

test('view: a frame drawn with its effects and the nearest last; the playing SVG; a frame a page for the GIF; a still for thumbnails', () => {
  const v = readAnim(parse(LIFT));
  const at0 = frameSvg(v, 0);
  // Effects hold from their key: none at the start, impact and shadow from the last.
  expect(at0).not.toContain('font-weight="800"');
  expect(at0).not.toContain('url(#fx-d)');
  expect(frameSvg(v, 23)).toContain('font-weight="800"');
  expect(frameSvg(v, 23)).toContain('<g filter="url(#fx-d)">');
  // Nearer things are drawn over farther ones.
  const near = readAnim(parse(LIFT.replace('23,0,-80,0,1,0,i', '23,0,-80,150,1,0,i')));
  expect(frameSvg(near, 23).indexOf('LIFT OFF')).toBeGreaterThan(frameSvg(near, 23).indexOf('<g filter="url(#fx-d)">'));
  const svg = animToSvg(parse(LIFT));
  expect(svg).toContain('<animateTransform attributeName="transform" type="translate"');
  expect(svg).toContain('repeatCount="indefinite"');
  expect(animPage(v, true).svg).toContain('fill="freeze"');
  const { pages, delayMs } = animFrames(parse(LIFT));
  expect([pages.length, delayMs, pages[0].w, pages[0].h]).toEqual([24, 125, 640, 400]);
  expect(def.view(LIFT, { small: true })[0].svg).not.toContain('animateTransform');
  expect(def.view(LIFT)[0].alt).toBe('A drawing of Lift off, rocket.');
  expect(def.view('')[0].alt).toBe('An empty stage');
  // A tile carried in the head is drawn behind.
  expect(frameSvg(readAnim(parse('---\ntile: 8:a\n---\n' + DRAWING)), 0)).toContain('fill="url(#tile)"');
});

test('the definition: Draw hands its drawing over, and the hand-off is live now Motion is registered; the templates read as motions', () => {
  expect(appOf('anim')).toBe(def);
  const handoff = draw.handoffs!.find((h) => h.to === 'anim')!;
  expect(handoff.convert(DRAWING)).toBe(DRAWING);
  expect(readAnim(parse(handoff.convert(DRAWING))).shapes).toHaveLength(3);
  expect(def.title('---\ntitle: Up\n---\n')).toBe('Up');
  expect(def.retitle('', 'Up')).toBe('---\ntitle: Up\n---\n');
  expect(def.exports!.map((e) => e.ext)).toEqual(['gif', 'svg']);
  expect(templates().map((x) => x.id)).toEqual(['liftoff', 'bounce', 'green', 'sunrise']);
  expect(templates()[0].doc).toBe(LIFT.replace('---\n', '---\n').replace('fps: 8\n', 'fps: 8\nalt: A rocket lifts off and flies up and away to the right, under the words Lift off.\n'));
  for (const tpl of templates()) {
    const v = readAnim(parse(tpl.doc));
    expect(v.shapes.length).toBeGreaterThan(1);
    expect(v.keys.some((k) => k.length > 1)).toBe(true);
    expect(v.alt).not.toBe('');
    expect(write(parse(tpl.doc))).toBe(tpl.doc);
  }
});

test('withKeys: the shapes in hand keyed in one splice; a shape keyed first at a later moment starts where it was drawn', () => {
  const out = after(LIFT, (d) => withKeys(d, [{ i: 0, key: { ...restKey(5), dx: 8 } }, { i: 1, key: { ...restKey(5), dy: 16 } }]));
  expect(keysTable(out)).toBe('Shape | Keys\n--- | ---\n0 | 0,0,0,0,1,0; 5,8,0,0,1,0; 23,0,-80,0,1,0,i\n1 | 0,0,0,0,1,0; 5,0,16,0,1,0; 23,200,-200,80,1,-30,d\n');
  expect(withKeys(parse(LIFT), [{ i: 0, key: { ...restKey(5), dx: 8 } }]).filter((o) => o.op === 'splice')).toHaveLength(1);
  const fresh = after(DRAWING, (d) => withKeys(d, [{ i: 0, key: { ...restKey(6), dx: 24 } }]));
  expect(keysTable(fresh)).toBe('Shape | Keys\n--- | ---\n0 | 0,0,0,0,1,0; 6,24,0,0,1,0\n');
  // At the start, no second key.
  expect(keysTable(after(DRAWING, (d) => withKeys(d, [{ i: 0, key: { ...restKey(0), dx: 24 } }])))).toBe('Shape | Keys\n--- | ---\n0 | 0,24,0,0,1,0\n');
  // The room a shape has on the stage: the Browser box is at (32, 48), 128 by 64.
  expect(room(readAnim(parse(DRAWING)), 0)).toEqual([-32, 640 - 32 - 128, -48, 400 - 48 - 64]);
});

test('removeShapes and duplicateShapes: several shapes at once, the keys following theirs', () => {
  const gone = after(LIFT, (d) => removeShapes(d, [1, 0]));
  expect(gone).not.toContain('rocket');
  expect(gone).not.toContain('Lift off');
  expect(gone).not.toContain('Shape | Keys');
  const { ops, sel } = duplicateShapes(parse(LIFT), [0, 1]);
  expect(sel).toEqual([2, 3]);
  const two = write(applyAll(parse(LIFT), ops));
  expect(keysTable(two)).toBe('Shape | Keys\n--- | ---\n0 | 0,0,0,0,1,0; 23,0,-80,0,1,0,i\n1 | 0,0,0,0,1,0; 23,200,-200,80,1,-30,d\n2 | 0,0,0,0,1,0; 23,0,-80,0,1,0,i\n3 | 0,0,0,0,1,0; 23,200,-200,80,1,-30,d\n');
  // A join has no copy.
  expect(duplicateShapes(parse(DRAWING), [2]).sel).toEqual([]);
});

test('motionOf and pasteMotion: the shapes in hand travel with their keys, and come back beside themselves, moving as they did', () => {
  const clip = motionOf(parse(LIFT), [1])!;
  expect(write(clip)).toBe('---\nframes: 24\nfps: 8\n---\nKind | X | Y | W | H | Style | Label\n--- | --- | --- | --- | --- | --- | ---\ni | 8 | 36 | 8 | 8 | 0b | rocket\n\nShape | Keys\n--- | ---\n0 | 0,0,0,0,1,0; 23,200,-200,80,1,-30,d\n');
  // A join goes only with both its ends.
  expect(motionOf(parse(DRAWING), [0, 2])!.blocks[0]).toMatchObject({ rows: [['o', '4', '6', '16', '8', '1b', 'Browser']] });
  expect(write(motionOf(parse(DRAWING), [0, 1, 2])!)).toContain('\nk | 0 | 1 | 0 | 0 | 0 | asks\n');
  const out = after(LIFT, (d) => pasteMotion(d, clip).ops);
  expect(out).toContain('\ni | 8 | 36 | 8 | 8 | 0b | rocket\ni | 9 | 37 | 8 | 8 | 0b | rocket\n');
  expect(keysTable(out)).toContain('\n2 | 0,0,0,0,1,0; 23,200,-200,80,1,-30,d\n');
  expect(pasteMotion(parse(LIFT), clip).sel).toEqual([2]);
  // Into a shorter motion, the keys past its end are left out; a bare drawing pastes with no keys.
  const short = after(LIFT.replace('frames: 24', 'frames: 12'), (d) => pasteMotion(d, clip).ops);
  expect(keysTable(short)).toContain('\n2 | 0,0,0,0,1,0\n');
  expect(after(DRAWING, (d) => pasteMotion(d, parse(DRAWING)).ops)).not.toContain('Shape | Keys');
  expect(pasteMotion(parse(LIFT), parse('just words\n'))).toEqual({ ops: [], sel: [] });
});

test('loop: the head field read leniently and written only when not for ever; byte-stable', () => {
  expect(['', 'forever', 'once', '1', 'bounce', '3', '0', 'often'].map((v) => loopOf(v))).toEqual(['forever', 'forever', 'once', 'once', 'bounce', 3, 'forever', 'forever']);
  expect(readAnim(parse(LIFT)).loop).toBe('forever');
  const bounced = after(LIFT, (d) => setLoop(d, 'bounce'));
  expect(bounced.startsWith('---\nframes: 24\nfps: 8\nloop: bounce\n---\n')).toBe(true);
  expect(write(parse(bounced))).toBe(bounced);
  expect(readAnim(parse(bounced)).loop).toBe('bounce');
  expect(after(bounced, (d) => setLoop(d, 3)).includes('\nloop: 3\n')).toBe(true);
  expect(after(bounced, (d) => setLoop(d, 'forever'))).toBe(LIFT);
  expect(setLoop(parse(bounced), 'bounce')).toEqual([]);
  // A copy carries it.
  expect(write(motionOf(parse(bounced), [0])!)).toContain('loop: bounce');
});

test('playback: for ever wraps, once and n times stop on the last frame, bounce goes there and back; the GIF\'s frames and loop count follow', () => {
  expect(playhead(4, 'forever', 5)).toEqual({ frame: 1, done: false });
  expect(playhead(4, 'once', 3.5)).toEqual({ frame: 3.5, done: false });
  expect(playhead(4, 'once', 4)).toEqual({ frame: 3, done: true });
  expect(playhead(4, 2, 7)).toEqual({ frame: 3, done: false });
  expect(playhead(4, 2, 8)).toEqual({ frame: 3, done: true });
  expect([0, 1, 2, 3, 4, 5, 6, 7].map((f) => playhead(4, 'bounce', f).frame)).toEqual([0, 1, 2, 3, 2, 1, 0, 1]);
  expect(frameOrder(4, 'bounce')).toEqual([0, 1, 2, 3, 2, 1]);
  expect(frameOrder(4, 'once')).toEqual([0, 1, 2, 3]);
  expect([gifLoop('forever'), gifLoop('bounce'), gifLoop('once'), gifLoop(3)]).toEqual([0, 0, false, 2]);
  const doc = parse(LIFT.replace('fps: 8\n', 'fps: 8\nloop: bounce\n'));
  const frames = animFrames(doc);
  expect(frames.pages).toHaveLength(24 + 22);
  expect(frames.loop).toBe('bounce');
  expect(frames.pages[25].svg).toBe(frames.pages[21].svg);
});

test('the animated SVG repeats as the motion says: for ever, a number of times, or there and back on twice the time', () => {
  expect(animPage(readAnim(parse(LIFT))).svg).toContain('repeatCount="indefinite"');
  const thrice = animPage(readAnim(parse(LIFT.replace('fps: 8\n', 'fps: 8\nloop: 3\n')))).svg;
  expect(thrice).toContain('repeatCount="3" fill="freeze"');
  const bounce = animPage(readAnim(parse(LIFT.replace('fps: 8\n', 'fps: 8\nloop: bounce\n')))).svg;
  // 23 frames there and 23 back at 8 a second: 5.75 s, the keys at 0, 23 and 46 of 46.
  expect(bounce).toContain('dur="5.75s" repeatCount="indefinite"');
  expect(bounce).toContain('keyTimes="0;0.5;1"');
  // A still rests where it ends, whatever the loop.
  expect(animPage(readAnim(parse(LIFT.replace('fps: 8\n', 'fps: 8\nloop: bounce\n'))), true).svg).toContain('repeatCount="1" fill="freeze"');
});

test('depth is the order, not the size: the stage sorts by depth at the moment, a far shape is a little dimmer, never smaller', () => {
  const v = readAnim(parse(LIFT));
  // Shape 1 comes forward (z 0 to 80): at the end it is drawn last.
  expect(drawOrder(v, 0)).toEqual([0, 1]);
  const back = readAnim(parse(LIFT.replace('23,200,-200,80,1,-30,d', '23,200,-200,-200,1,-30,d').replace('0 | 0,0,0,0,1,0; 23,0,-80,0,1,0,i', '0 | 0,0,0,50,1,0')));
  expect(drawOrder(back, 23)).toEqual([1, 0]);
  expect(transformOf(v.shapes[1], v.shapes, { ...restKey(0), z: 200 })).toContain('scale(1 1)');
  expect(depthDim(0)).toBe(1);
  expect(depthDim(120)).toBe(1);
  expect(depthDim(-200)).toBe(0.67);
  expect(frameSvg(back, 23)).toContain('opacity="0.67"');
});

test('turn: a keyed turn about the upright axis, written as u<deg> and read back; drawn as a squeeze across of cos(turn), mirrored past 90°', () => {
  expect(keysOf('3,0,0,0,1,0,,u120', 24)).toEqual([{ t: 3, dx: 0, dy: 0, z: 0, s: 1, r: 0, fx: '', u: 120 }]);
  expect(keysOf('3,0,0,0,1,0,d,p0:0/100:50,u-45', 24)[0]).toMatchObject({ fx: 'd', pts: [0, 0, 100, 50], u: -45 });
  const doc = after(LIFT, (d) => withKey(d, 1, { ...restKey(12), u: 180 }));
  expect(keysTable(doc)).toContain('12,0,0,0,1,0,,u180');
  expect(write(parse(doc))).toBe(doc);
  const v = readAnim(parse(doc));
  expect(stateAt(v, 1, 6).u).toBe(90);
  expect(turnScale(0)).toBe(1);
  expect(turnScale(90)).toBe(0);
  expect(turnScale(180)).toBe(-1);
  expect(turnScale(60)).toBeCloseTo(0.5);
  expect(transformOf(v.shapes[1], v.shapes, { ...restKey(0), u: 180 })).toContain('scale(-1 1)');
  expect(transformOf(v.shapes[1], v.shapes, { ...restKey(0), u: 60, s: 2 })).toContain('scale(1 2)');
  // The self-playing SVG samples a turning shape every frame.
  expect(animPage(v).svg.split('keyTimes="').at(-1)!.split('"')[0].split(';')).toHaveLength(24);
});
