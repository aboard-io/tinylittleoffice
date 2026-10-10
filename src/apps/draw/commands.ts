/**
 * The Drawing Tool's commands (kit/commands.ts), its editor the context, and the tables they are made from (the
 * tools, the shapes, the inks, the text sizes, the alignments, the pixel inks). The bar: Insert ▾, Shapes or Pixels ▾,
 * the tools with their letters, an icon, Arrange ▾, the zoom; in pixel mode the inks, Eraser, Pencil, Fill, Clear and
 * Background. The context bar under the shape in hand: inks | fill or line style | text size and a text's alignment |
 * rotate, edit the words, duplicate, front, back | copy, cut, paste | delete (§5's order); while its words are typed,
 * size and alignment | inks. The canvas's keys (docs/editing.md §5 and §8): the letters pick tools, never from a bar
 * button, a field or the words; Escape steps out; Mod+A, Mod+D; Mod+Shift+L, E and R align a text; [ and ] rotate;
 * Enter edits the words; Alt+Up/Down restack; the arrows nudge (Shift by five, Mod resizes); a pen's Enter, Escape
 * and Backspace; the Join tool's arrows and Enter; in pixel mode the arrows move and Enter or Space paints.
 */
import { ArrowDownToLine, ArrowUpToLine, Blend, Brush, Circle, ClipboardPaste, Copy, Diamond, Ellipsis, Eraser, Grid2x2, GripHorizontal, Layers, Minus, MousePointer2, MoveRight, PaintBucket, PenTool, Pencil, RotateCcw, RotateCw, Scissors, Shapes, Smile, Spline, Square, Tag, Trash2, Type, Wallpaper, ZoomIn, ZoomOut } from 'lucide';
import { register, type Command, commandsOf } from '../../kit/commands.ts';
import { t } from '../../kit/i18n.ts';
import { UI } from '../../kit/icons.ts';
import { TILE_INKS, TILE_SIDES, tileFilled } from '../../kit/tile.ts';
import { COLORS, isLink, nextAlign, type Align, type Color, type Fill, type Kind, type TextSize } from './model.ts';
import type { ToDrawEditor } from './editor.ts';

type Dr = ToDrawEditor;
const cmd = commandsOf<Dr>('draw');
/** 'f' draws by hand: a drag is a stroke, closed into a shape when it ends where it began. */
export type Tool = 'select' | Kind | 'f';
type Icon = Command['icon'];

/** How far a turn goes by the keys and the bar. */
export const TURN_STEP = 15;
/** The tools in the bar, a key each. */
export const TOOLS: { id: Tool; name: string; hint?: string; icon: Icon; key: string }[] = [
  { id: 'select', name: 'Select', icon: MousePointer2, key: 'V' },
  { id: 'r', name: 'Rectangle', icon: Square, key: 'R' },
  { id: 'e', name: 'Ellipse', icon: Circle, key: 'E' },
  { id: 'd', name: 'Diamond', icon: Diamond, key: 'D' },
  { id: 'l', name: 'Line', icon: Minus, key: 'L' },
  { id: 'a', name: 'Arrow', icon: MoveRight, key: 'A' },
  { id: 't', name: 'Text', icon: Type, key: 'T' },
  { id: 'k', name: 'Join two shapes', icon: Spline, key: 'K' },
  { id: 'v', name: 'Pen', hint: 'Any shape, a tap for each corner', icon: PenTool, key: 'P' },
  { id: 'f', name: 'Freehand', hint: 'Drag to draw a line or a shape', icon: Brush, key: 'F' },
];
/** Every shape Insert ▾ can place, the bar's and the rest. */
const SHAPES: { id: Kind; name: string }[] = [
  { id: 'r', name: 'Rectangle' },
  { id: 'o', name: 'Rounded box' },
  { id: 'e', name: 'Ellipse' },
  { id: 'd', name: 'Diamond' },
  { id: 'h', name: 'Hexagon' },
  { id: 'p', name: 'Parallelogram' },
  { id: 'c', name: 'Cylinder' },
  { id: 'n', name: 'Note' },
  { id: 't', name: 'Text' },
];
const INKS: { c: Color | ''; name: string; hex: string }[] = [
  { c: '', name: 'Black', hex: '#18181b' },
  { c: 'r', name: 'Red', hex: COLORS.r },
  { c: 'o', name: 'Orange', hex: COLORS.o },
  { c: 'g', name: 'Green', hex: COLORS.g },
  { c: 'b', name: 'Blue', hex: COLORS.b },
  { c: 'p', name: 'Purple', hex: COLORS.p },
];
const SIZES: { z: TextSize; name: string; letter: string }[] = [
  { z: 1, name: 'Small text', letter: 'S' },
  { z: 2, name: 'Medium text', letter: 'M' },
  { z: 3, name: 'Large text', letter: 'L' },
  { z: 4, name: 'Extra large text', letter: 'XL' },
];
/** A text's three alignments: the bar's one button shows the one it has and goes on to the next; Mod+Shift+L, E and R set each (the Word Processor's keys, and every word processor's). */
export const ALIGNS: { al: Align | ''; name: string; icon: Icon; key: string }[] = [
  { al: '', name: 'Align: left', icon: UI.alignLeft, key: 'L' },
  { al: 'c', name: 'Align: centre', icon: UI.alignCenter, key: 'E' },
  { al: 'r', name: 'Align: right', icon: UI.alignRight, key: 'R' },
];
/** The pixel inks, by letter, named. */
export const PIXEL_INKS: { k: string; name: string }[] = [
  { k: 'a', name: 'Black' },
  { k: 'b', name: 'Indigo' },
  { k: 'c', name: 'Red' },
  { k: 'd', name: 'Orange' },
  { k: 'e', name: 'Yellow' },
  { k: 'f', name: 'Green' },
  { k: 'g', name: 'Sky' },
  { k: 'h', name: 'Pink' },
];

/** The shape the context bar is for: the one whose words are typed, else the one in hand. */
const held = (d: Dr) => d.shapes[d.editing >= 0 ? d.editing : d.sel];
const has = (d: Dr) => !!held(d) && !d.view.grid;
const typing = (d: Dr) => d.editing >= 0;
const many = (d: Dr) => d.chosen.length > 1;
const lineLike = (k: Kind) => k === 'l' || k === 'a' || isLink(k) || k === 'w';
/** The shapes the alignment is for: the one being typed in, else those in hand, all texts. */
const texts = (d: Dr) => (typing(d) ? [d.editing] : d.chosen);
const allTexts = (d: Dr) => has(d) && texts(d).every((j) => d.shapes[j]?.k === 't');
/** The chosen shapes that have a style: lines, or shapes with an inside (a text and an icon have none). */
const styled = (d: Dr) => d.chosen.map((j) => d.shapes[j].k).filter((k) => k !== 't' && k !== 'i');
const styleShown = (line: boolean) => (d: Dr) => {
  if (!has(d) || typing(d)) return false;
  if (!many(d)) return held(d).k !== 't' && held(d).k !== 'i' && lineLike(held(d).k) === line;
  const kinds = styled(d);
  return kinds.length > 0 && kinds.every((k) => lineLike(k) === line);
};
const sameFill = (d: Dr, f: Fill) => (many(d) ? d.chosen.every((j) => d.shapes[j].k === 't' || d.shapes[j].k === 'i' || d.shapes[j].f === f) : held(d)?.f === f);
const shapeAct = (d: Dr) => has(d) && !typing(d);
const canvas = (d: Dr) => !d.view.grid;

const STYLES: Command<Dr>[] = [
  ...[
    { f: 0 as Fill, label: 'Solid line', icon: Minus },
    { f: 1 as Fill, label: 'Dashed line', icon: GripHorizontal },
    { f: 2 as Fill, label: 'Dotted line', icon: Ellipsis },
  ].map((x) => cmd(`line.${x.f}`, x.label, { icon: x.icon, where: ['context'], group: 'style', when: styleShown(true), pressed: (d) => sameFill(d, x.f), does: (d) => d.patchSel({ f: x.f }) })),
  ...[
    { f: 0 as Fill, label: 'No fill', icon: Square },
    { f: 1 as Fill, label: 'Grey fill', icon: Blend },
    { f: 2 as Fill, label: 'Solid fill', icon: PaintBucket },
  ].map((x) => cmd(`fill.${x.f}`, x.label, { icon: x.icon, where: ['context'], group: 'style', when: styleShown(false), pressed: (d) => sameFill(d, x.f), does: (d) => d.patchSel({ f: x.f }) })),
];
const INK: Command<Dr>[] = INKS.map((ink) =>
  cmd(`ink.${ink.c || 'black'}`, ink.name, { data: true, swatch: () => ink.hex, where: ['context'], group: 'inks', when: has, pressed: (d) => (held(d).c ?? '') === ink.c, does: (d) => d.patchSel({ c: (ink.c || undefined) as Color | undefined }) }),
);
const SIZE: Command<Dr>[] = [
  ...SIZES.map((x) => cmd(`size.${x.z}`, x.name, { letter: x.letter, where: ['context'], group: 'size', when: (d) => has(d) && held(d).k !== 'i', pressed: (d) => (held(d).z ?? 2) === x.z, does: (d) => d.patchSel({ z: x.z === 2 ? undefined : x.z }) })),
  cmd('align', (d) => t((ALIGNS.find((x) => x.al === ((d && held(d)?.al) ?? '')) ?? ALIGNS[0]).name), {
    icon: UI.alignLeft,
    where: ['context'],
    group: 'size',
    when: allTexts,
    does: (d) => d.alignSel(nextAlign(held(d).al), texts(d)),
  }),
];
/** Mod+Shift+L, E and R: the texts in hand (or the one being typed in) aligned. */
export const ALIGN_KEYS: Command<Dr>[] = ALIGNS.map((x) =>
  cmd(`align.${x.key.toLowerCase()}`, x.name, { at: 'canvas', icon: x.icon, keys: `Mod+Shift+${x.key}`, where: ['keys-only'], when: (d) => d.chosen.length > 0 || typing(d), does: (d) => d.alignSel(x.al, texts(d)) }),
);
const ACT: Command<Dr>[] = [
  cmd('left', 'Rotate left', { at: 'canvas', icon: RotateCcw, keys: '[', where: ['context'], group: 'act', when: (d) => shapeAct(d) && d.turnable, does: (d) => d.turnBy(-TURN_STEP) }),
  cmd('right', 'Rotate right', { at: 'canvas', icon: RotateCw, keys: ']', where: ['context'], group: 'act', when: (d) => shapeAct(d) && d.turnable, does: (d) => d.turnBy(TURN_STEP) }),
  cmd('words', (d) => (d && held(d)?.k === 'i' ? t('Change the icon') : t('Edit the words')), { at: 'canvas', icon: Tag, keys: 'Enter', where: ['context'], group: 'act', when: (d) => shapeAct(d) && !many(d), does: (d) => d.openWords() }),
  cmd('join', 'Join two shapes', { icon: Spline, where: ['context'], group: 'act', when: (d) => shapeAct(d) && !!d.pair, does: (d) => d.join(d.pair![0], d.pair![1]) }),
  cmd('duplicate', 'Duplicate', { at: 'canvas', icon: Copy, keys: 'Mod+D', where: ['context', 'menu:arrange'], group: 'act', when: canvas, disabled: (d) => !!d.selected && !many(d) && isLink(d.selected.k), does: (d) => d.duplicateSel() }),
  cmd('front', 'Bring to front', { icon: ArrowUpToLine, where: ['context', 'menu:arrange'], group: 'act', when: canvas, disabled: (d) => !d.selected, does: (d) => d.reorder(true) }),
  cmd('back', 'Send to back', { icon: ArrowDownToLine, where: ['context', 'menu:arrange'], group: 'act', when: canvas, disabled: (d) => !d.selected, does: (d) => d.reorder(false) }),
  cmd('copy', 'Copy', { at: 'canvas', icon: UI.copy, keys: 'Mod+C', native: true, where: ['context'], group: 'clip', when: shapeAct, disabled: (d) => isLink(held(d).k) && d.chosen.length < 2, does: (d) => d.copyOut(false) }),
  cmd('cut', 'Cut', { at: 'canvas', icon: Scissors, keys: 'Mod+X', native: true, where: ['context'], group: 'clip', when: shapeAct, disabled: (d) => isLink(held(d).k) && d.chosen.length < 2, does: (d) => d.copyOut(true) }),
  cmd('paste', 'Paste', { at: 'canvas', icon: ClipboardPaste, keys: 'Mod+V', native: true, where: ['context', 'menu:insert'], heading: 'More', group: 'clip', when: (d) => canvas(d) && !typing(d), does: (d) => d.pasteIn() }),
  cmd('delete', 'Delete', { at: 'canvas', icon: Trash2, keys: 'Delete / Backspace', where: ['context', 'menu:arrange'], group: 'delete', when: canvas, disabled: (d) => !d.selected, does: (d) => d.removeSel() }),
];

const INSERTS: Command<Dr>[] = [
  ...SHAPES.map((s) => cmd(`insert.${s.id}`, s.name, { heading: 'Shapes', where: ['menu:insert'], does: (d) => d.insert(s.id) })),
  cmd('insert.l', 'Line', { icon: Minus, heading: 'Lines', where: ['menu:insert'], does: (d) => d.insert('l') }),
  cmd('insert.a', 'Arrow', { icon: MoveRight, heading: 'Lines', where: ['menu:insert'], does: (d) => d.insert('a') }),
  cmd('insert.k', 'Join two shapes', { icon: Spline, hint: 'Press on one shape and let go on another', heading: 'Lines', where: ['menu:insert'], does: (d) => (d.tool = 'k') }),
  cmd('insert.icon', 'Icon…', { icon: Smile, heading: 'More', where: ['menu:insert'], does: (d) => d.pickIcon() }),
  cmd('insert.pen', 'Pen', { icon: PenTool, hint: 'Any shape, a tap for each corner', heading: 'More', where: ['menu:insert'], does: (d) => (d.tool = 'v') }),
  cmd('insert.free', 'Freehand', { icon: Brush, hint: 'Drag to draw a line or a shape', heading: 'More', where: ['menu:insert'], does: (d) => (d.tool = 'f') }),
];

/** The canvas's own keys: a pen's, the Join tool's, a step out, the letters, and what acts on the shapes in hand. */
const KEYS: Command<Dr>[] = [
  cmd('pen.close', 'Done', { at: 'canvas', keys: 'Enter', where: ['keys-only'], when: (d) => d.pen.length > 0, does: (d) => d.closePen() }),
  cmd('pen.cancel', 'Step out: close, collapse, let go', { at: 'canvas', keys: 'Escape', where: ['keys-only'], when: (d) => d.pen.length > 0, does: (d) => void (d.pen = []) }),
  cmd('pen.back', 'Delete', { at: 'canvas', keys: 'Backspace', where: ['keys-only'], when: (d) => d.pen.length > 0, does: (d) => void (d.pen = d.pen.slice(0, -1)) }),
  cmd('out', 'Step out: close, collapse, let go', { at: 'canvas', keys: 'Escape', where: ['keys-only'], does: (d) => d.stepOut() }),
  cmd('joinkeys', 'Join two shapes', { at: 'canvas', keys: 'ArrowLeft / ArrowRight / ArrowUp / ArrowDown / Enter', where: ['keys-only'], when: (d) => d.tool === 'k', does: (d, e) => e instanceof KeyboardEvent && d.joinKey(e) }),
  cmd('all', 'Select all: the words of the box, then everything', { at: 'canvas', keys: 'Mod+A', where: ['keys-only'], does: (d) => d.chooseAll() }),
  ...ALIGN_KEYS,
  cmd('restack', 'Move the selected items up or down', { at: 'canvas', keys: 'Alt+ArrowUp / Alt+ArrowDown', where: ['keys-only'], when: (d) => d.chosen.length > 0, does: (d, e) => d.reorder(!(e instanceof KeyboardEvent) || e.key === 'ArrowUp' ? 1 : -1) }),
  cmd('nudge', 'Nudge the shapes in hand', {
    at: 'canvas',
    keys: ['', 'Shift+', 'Mod+'].map((m) => ['ArrowLeft', 'ArrowRight', 'ArrowUp', 'ArrowDown'].map((k) => m + k).join(' / ')).join(' / '),
    where: ['keys-only'],
    when: (d) => d.chosen.length > 0,
    does: (d, e) => e instanceof KeyboardEvent && d.nudgeKey(e),
  }),
];

const PIXELS: Command<Dr>[] = [
  ...PIXEL_INKS.map((ink) => cmd(`pixel.${ink.k}`, ink.name, { data: true, swatch: () => TILE_INKS[ink.k], where: ['bar'], when: (d) => !!d.view.grid, pressed: (d) => d.ink === ink.k, does: (d) => (d.ink = ink.k) })),
  cmd('eraser', 'Eraser', { icon: Eraser, where: ['bar'], when: (d) => !!d.view.grid, pressed: (d) => d.ink === '.', does: (d) => (d.ink = '.') }),
  cmd('pencil', 'Pencil', { icon: Pencil, where: ['bar'], when: (d) => !!d.view.grid, pressed: (d) => d.pmode === 'pen', does: (d) => d.paintWith('pen') }),
  cmd('bucket', 'Fill', { icon: PaintBucket, where: ['bar'], when: (d) => !!d.view.grid, pressed: (d) => d.pmode === 'fill', does: (d) => d.paintWith('fill') }),
  cmd('clear', 'Clear the grid', { icon: Trash2, where: ['bar'], when: (d) => !!d.view.grid, disabled: (d) => !tileFilled(d.view.pixels), does: (d) => d.clearPixels() }),
  cmd('background', 'Background', { hint: 'Use as background', icon: Wallpaper, where: ['bar'], when: (d) => !!d.view.grid, disabled: (d) => !tileFilled(d.view.pixels), does: (d) => d.useAsBackground() }),
  cmd('pixel.move', 'Tap or drag to paint; the arrow keys move, Enter paints.', { at: 'pixels', keys: 'ArrowLeft / ArrowRight / ArrowUp / ArrowDown', where: ['keys-only'], when: (d) => !!d.view.grid, does: (d, e) => e instanceof KeyboardEvent && d.moveCursor(e.key) }),
  cmd('pixel.paint', 'Tap or drag to paint; the arrow keys move, Enter paints.', { at: 'pixels', keys: 'Enter / Space', where: ['keys-only'], when: (d) => !!d.view.grid, does: (d) => d.paintHere() }),
];

/** The tools, a letter each: the bar's, and the first keys the shortcuts dialog lists (Shift+K too: two shapes chosen with Shift+tap are joined with Shift still held). */
const TOOL_CMDS: Command<Dr>[] = [
  ...TOOLS.map((x) =>
    cmd(`tool.${x.id}`, x.name, { at: 'canvas', icon: x.icon, hint: x.hint, keys: x.id === 'k' ? 'K / Shift+K' : x.key, where: ['bar'], pressed: (d) => d.tool === x.id, does: (d, e) => d.pickTool(x.id, e) }),
  ),
];

const DRAW: Command<Dr>[] = [
  ...TOOL_CMDS,
  cmd('insert', 'Insert', { icon: UI.insert, menu: 'insert', where: ['bar'], takesFocus: true, when: canvas, does: () => undefined }),
  ...INSERTS,
  cmd('mode', (d) => (d?.view.grid ? t('Pixels {n}×{n}', { n: d.view.grid }) : t('Shapes')), { icon: Shapes, menu: 'mode', where: ['bar'], document: true, takesFocus: true, does: () => undefined }),
  cmd('mode.shapes', 'Shapes', { icon: Shapes, where: ['menu:mode'], pressed: (d) => !d.view.grid, does: (d) => d.setMode(0) }),
  ...TILE_SIDES.map((n) => cmd(`mode.${n}`, () => t('Pixels {n}×{n}', { n }), { icon: Grid2x2, where: ['menu:mode'], pressed: (d) => d.view.grid === n, does: (d) => d.setMode(n) })),
  cmd('mode.untile', 'Remove the background tile', { icon: Trash2, heading: 'Background', where: ['menu:mode'], when: (d) => !!d.view.tile && !d.view.grid, does: (d) => d.removeTile() }),
  cmd('icon', (d) => (d?.selected && !isLink(d.selected.k) ? t('Put an icon on this shape') : t('Place an icon')), { icon: Smile, where: ['bar'], when: canvas, pressed: (d) => d.tool === 'i', does: (d) => d.pickIcon() }),
  cmd('arrange', 'Arrange', { icon: Layers, menu: 'arrange', where: ['bar'], takesFocus: true, when: canvas, does: () => undefined }),
  cmd('alt', (d) => (d?.view.alt ? t('Alt text: {alt}', { alt: d.view.alt }) : t('Add alt text: describe this drawing for people who cannot see it')), { where: ['bar'], document: true, takesFocus: true, when: canvas, does: (d) => d.openAlt() }),
  cmd('zoomout', 'Zoom out', { icon: ZoomOut, where: ['bar'], document: true, takesFocus: true, when: canvas, disabled: (d) => d.zoom <= 0.5, does: (d) => d.zoomBy(-0.25) }),
  cmd('zoomin', 'Zoom in', { icon: ZoomIn, where: ['bar'], document: true, takesFocus: true, when: canvas, disabled: (d) => d.zoom >= 4, does: (d) => d.zoomBy(0.25) }),
  ...INK,
  ...STYLES,
  ...SIZE,
  ...ACT,
  ...KEYS,
  ...PIXELS,
];
/** The context bar while the words are typed: size and alignment | inks. */
export const TYPING = [...SIZE, ...INK];
/** The keys on the canvas, and in pixel mode. */
export const CANVAS_KEYS = [...KEYS, ...TOOL_CMDS, ...DRAW.filter((c) => !KEYS.includes(c) && !TOOL_CMDS.includes(c))].filter((c) => c.keys && !c.id.startsWith('draw.pixel.'));
export const PIXEL_KEYS = PIXELS.filter((c) => c.keys);

export default register(DRAW) as Command<Dr>[];
