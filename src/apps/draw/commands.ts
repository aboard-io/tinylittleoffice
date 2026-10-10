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
import { command, register, type Command } from '../../kit/commands.ts';
import { t } from '../../kit/i18n.ts';
import { UI } from '../../kit/icons.ts';
import { TILE_INKS, TILE_SIDES, tileFilled } from '../../kit/tile.ts';
import { COLORS, isLink, nextAlign, type Align, type Color, type Fill, type Kind, type TextSize } from './model.ts';
import type { ToDrawEditor } from './editor.ts';

type Dr = ToDrawEditor;
/** 'f' draws by hand: a drag is a stroke, closed into a shape when it ends where it began. */
export type Tool = 'select' | Kind | 'f';
type Icon = Command['icon'];

/** How far a turn goes by the keys and the bar. */
export const TURN_STEP = 15;
/** The tools in the bar, a key each. */
export const TOOLS: { id: Tool; name: () => string; icon: Icon; key: string }[] = [
  { id: 'select', name: () => t('Select'), icon: MousePointer2, key: 'V' },
  { id: 'r', name: () => t('Rectangle'), icon: Square, key: 'R' },
  { id: 'e', name: () => t('Ellipse'), icon: Circle, key: 'E' },
  { id: 'd', name: () => t('Diamond'), icon: Diamond, key: 'D' },
  { id: 'l', name: () => t('Line'), icon: Minus, key: 'L' },
  { id: 'a', name: () => t('Arrow'), icon: MoveRight, key: 'A' },
  { id: 't', name: () => t('Text'), icon: Type, key: 'T' },
  { id: 'k', name: () => t('Join two shapes'), icon: Spline, key: 'K' },
  { id: 'v', name: () => t('Pen: any shape, a tap for each corner'), icon: PenTool, key: 'P' },
  { id: 'f', name: () => t('Freehand: drag to draw a line or a shape'), icon: Brush, key: 'F' },
];
/** Every shape Insert ▾ can place, the bar's and the rest. */
const SHAPES: { id: Kind; name: () => string }[] = [
  { id: 'r', name: () => t('Rectangle') },
  { id: 'o', name: () => t('Rounded box') },
  { id: 'e', name: () => t('Ellipse') },
  { id: 'd', name: () => t('Diamond') },
  { id: 'h', name: () => t('Hexagon') },
  { id: 'p', name: () => t('Parallelogram') },
  { id: 'c', name: () => t('Cylinder') },
  { id: 'n', name: () => t('Note') },
  { id: 't', name: () => t('Text') },
];
const INKS: { c: Color | ''; name: () => string; hex: string }[] = [
  { c: '', name: () => t('Black'), hex: '#18181b' },
  { c: 'r', name: () => t('Red'), hex: COLORS.r },
  { c: 'o', name: () => t('Orange'), hex: COLORS.o },
  { c: 'g', name: () => t('Green'), hex: COLORS.g },
  { c: 'b', name: () => t('Blue'), hex: COLORS.b },
  { c: 'p', name: () => t('Purple'), hex: COLORS.p },
];
const SIZES: { z: TextSize; name: () => string; letter: () => string }[] = [
  { z: 1, name: () => t('Small text'), letter: () => t('S') },
  { z: 2, name: () => t('Medium text'), letter: () => t('M') },
  { z: 3, name: () => t('Large text'), letter: () => t('L') },
  { z: 4, name: () => t('Extra large text'), letter: () => t('XL') },
];
/** A text's three alignments: the bar's one button shows the one it has and goes on to the next; Mod+Shift+L, E and R set each (the Word Processor's keys, and every word processor's). */
export const ALIGNS: { al: Align | ''; name: () => string; icon: Icon; key: string }[] = [
  { al: '', name: () => t('Align: left'), icon: UI.alignLeft, key: 'L' },
  { al: 'c', name: () => t('Align: centre'), icon: UI.alignCenter, key: 'E' },
  { al: 'r', name: () => t('Align: right'), icon: UI.alignRight, key: 'R' },
];
/** The pixel inks, by letter, named. */
export const PIXEL_INKS: { k: string; name: () => string }[] = [
  { k: 'a', name: () => t('Black') },
  { k: 'b', name: () => t('Indigo') },
  { k: 'c', name: () => t('Red') },
  { k: 'd', name: () => t('Orange') },
  { k: 'e', name: () => t('Yellow') },
  { k: 'f', name: () => t('Green') },
  { k: 'g', name: () => t('Sky') },
  { k: 'h', name: () => t('Pink') },
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
    { f: 0 as Fill, label: () => t('Solid line'), icon: Minus },
    { f: 1 as Fill, label: () => t('Dashed line'), icon: GripHorizontal },
    { f: 2 as Fill, label: () => t('Dotted line'), icon: Ellipsis },
  ].map((x) => command<Dr>({ id: `draw.line.${x.f}`, scope: 'draw', label: x.label, icon: x.icon, where: ['context'], group: 'style', when: styleShown(true), pressed: (d) => sameFill(d, x.f), does: (d) => d.patchSel({ f: x.f }) })),
  ...[
    { f: 0 as Fill, label: () => t('No fill'), icon: Square },
    { f: 1 as Fill, label: () => t('Grey fill'), icon: Blend },
    { f: 2 as Fill, label: () => t('Solid fill'), icon: PaintBucket },
  ].map((x) => command<Dr>({ id: `draw.fill.${x.f}`, scope: 'draw', label: x.label, icon: x.icon, where: ['context'], group: 'style', when: styleShown(false), pressed: (d) => sameFill(d, x.f), does: (d) => d.patchSel({ f: x.f }) })),
];
const INK: Command<Dr>[] = INKS.map((ink) =>
  command<Dr>({ id: `draw.ink.${ink.c || 'black'}`, scope: 'draw', label: ink.name, swatch: () => ink.hex, where: ['context'], group: 'inks', when: has, pressed: (d) => (held(d).c ?? '') === ink.c, does: (d) => d.patchSel({ c: (ink.c || undefined) as Color | undefined }) }),
);
const SIZE: Command<Dr>[] = [
  ...SIZES.map((x) => command<Dr>({ id: `draw.size.${x.z}`, scope: 'draw', label: x.name, letter: x.letter, where: ['context'], group: 'size', when: (d) => has(d) && held(d).k !== 'i', pressed: (d) => (held(d).z ?? 2) === x.z, does: (d) => d.patchSel({ z: x.z === 2 ? undefined : x.z }) })),
  // A text's alignment, beside its size: the one it has, and a tap for the next.
  command<Dr>({
    id: 'draw.align',
    scope: 'draw',
    label: (d) => (ALIGNS.find((x) => x.al === ((d && held(d)?.al) ?? '')) ?? ALIGNS[0]).name(),
    icon: UI.alignLeft,
    where: ['context'],
    group: 'size',
    when: allTexts,
    does: (d) => d.alignSel(nextAlign(held(d).al), texts(d)),
  }),
];
/** Mod+Shift+L, E and R: the texts in hand (or the one being typed in) aligned. */
export const ALIGN_KEYS: Command<Dr>[] = ALIGNS.map((x) =>
  command<Dr>({ id: `draw.align.${x.key.toLowerCase()}`, scope: 'draw', label: x.name, icon: x.icon, keys: `Mod+Shift+${x.key}`, where: ['keys-only'], when: (d) => d.chosen.length > 0 || typing(d), does: (d) => d.alignSel(x.al, texts(d)) }),
);
const ACT: Command<Dr>[] = [
  command<Dr>({ id: 'draw.left', scope: 'draw', label: () => t('Rotate left'), icon: RotateCcw, keys: '[', where: ['context'], group: 'act', when: (d) => shapeAct(d) && d.turnable, does: (d) => d.turnBy(-TURN_STEP) }),
  command<Dr>({ id: 'draw.right', scope: 'draw', label: () => t('Rotate right'), icon: RotateCw, keys: ']', where: ['context'], group: 'act', when: (d) => shapeAct(d) && d.turnable, does: (d) => d.turnBy(TURN_STEP) }),
  command<Dr>({ id: 'draw.words', scope: 'draw', label: (d) => (d && held(d)?.k === 'i' ? t('Change the icon') : t('Edit the words')), icon: Tag, keys: 'Enter', where: ['context'], group: 'act', when: (d) => shapeAct(d) && !many(d), does: (d) => d.openWords() }),
  command<Dr>({ id: 'draw.join', scope: 'draw', label: () => t('Join two shapes'), icon: Spline, where: ['context'], group: 'act', when: (d) => shapeAct(d) && !!d.pair, does: (d) => d.join(d.pair![0], d.pair![1]) }),
  command<Dr>({ id: 'draw.duplicate', scope: 'draw', label: () => t('Duplicate'), icon: Copy, keys: 'Mod+D', where: ['context', 'menu:arrange'], group: 'act', when: canvas, disabled: (d) => !!d.selected && !many(d) && isLink(d.selected.k), does: (d) => d.duplicateSel() }),
  command<Dr>({ id: 'draw.front', scope: 'draw', label: () => t('Bring to front'), icon: ArrowUpToLine, where: ['context', 'menu:arrange'], group: 'act', when: canvas, disabled: (d) => !d.selected, does: (d) => d.reorder(true) }),
  command<Dr>({ id: 'draw.back', scope: 'draw', label: () => t('Send to back'), icon: ArrowDownToLine, where: ['context', 'menu:arrange'], group: 'act', when: canvas, disabled: (d) => !d.selected, does: (d) => d.reorder(false) }),
  command<Dr>({ id: 'draw.copy', scope: 'draw', label: () => t('Copy'), icon: UI.copy, keys: 'Mod+C', native: true, where: ['context'], group: 'clip', when: shapeAct, disabled: (d) => isLink(held(d).k) && d.chosen.length < 2, does: (d) => d.copyOut(false) }),
  command<Dr>({ id: 'draw.cut', scope: 'draw', label: () => t('Cut'), icon: Scissors, keys: 'Mod+X', native: true, where: ['context'], group: 'clip', when: shapeAct, disabled: (d) => isLink(held(d).k) && d.chosen.length < 2, does: (d) => d.copyOut(true) }),
  command<Dr>({ id: 'draw.paste', scope: 'draw', label: () => t('Paste'), icon: ClipboardPaste, keys: 'Mod+V', native: true, where: ['context', 'menu:insert'], heading: () => t('More'), group: 'clip', when: (d) => canvas(d) && !typing(d), does: (d) => d.pasteIn() }),
  command<Dr>({ id: 'draw.delete', scope: 'draw', label: () => t('Delete'), icon: Trash2, keys: 'Delete / Backspace', where: ['context', 'menu:arrange'], group: 'delete', when: canvas, disabled: (d) => !d.selected, does: (d) => d.removeSel() }),
];

const INSERTS: Command<Dr>[] = [
  ...SHAPES.map((s) => command<Dr>({ id: `draw.insert.${s.id}`, scope: 'draw', label: s.name, heading: () => t('Shapes'), where: ['menu:insert'], does: (d) => d.insert(s.id) })),
  command<Dr>({ id: 'draw.insert.l', scope: 'draw', label: () => t('Line'), icon: Minus, heading: () => t('Lines'), where: ['menu:insert'], does: (d) => d.insert('l') }),
  command<Dr>({ id: 'draw.insert.a', scope: 'draw', label: () => t('Arrow'), icon: MoveRight, heading: () => t('Lines'), where: ['menu:insert'], does: (d) => d.insert('a') }),
  command<Dr>({ id: 'draw.insert.k', scope: 'draw', label: () => t('Join two shapes'), icon: Spline, hint: () => t('Press on one shape and let go on another'), heading: () => t('Lines'), where: ['menu:insert'], does: (d) => (d.tool = 'k') }),
  command<Dr>({ id: 'draw.insert.icon', scope: 'draw', label: () => t('Icon…'), icon: Smile, heading: () => t('More'), where: ['menu:insert'], does: (d) => d.pickIcon() }),
  command<Dr>({ id: 'draw.insert.pen', scope: 'draw', label: () => t('Pen: any shape, a tap for each corner'), icon: PenTool, heading: () => t('More'), where: ['menu:insert'], does: (d) => (d.tool = 'v') }),
  command<Dr>({ id: 'draw.insert.free', scope: 'draw', label: () => t('Freehand: drag to draw a line or a shape'), icon: Brush, heading: () => t('More'), where: ['menu:insert'], does: (d) => (d.tool = 'f') }),
];

/** The canvas's own keys: a pen's, the Join tool's, a step out, the letters, and what acts on the shapes in hand. */
const KEYS: Command<Dr>[] = [
  command<Dr>({ id: 'draw.pen.close', scope: 'draw', label: () => t('Close the pen’s shape'), keys: 'Enter', where: ['keys-only'], when: (d) => d.pen.length > 0, does: (d) => d.closePen() }),
  command<Dr>({ id: 'draw.pen.cancel', scope: 'draw', label: () => t('Let the pen’s shape go'), keys: 'Escape', where: ['keys-only'], when: (d) => d.pen.length > 0, does: (d) => void (d.pen = []) }),
  command<Dr>({ id: 'draw.pen.back', scope: 'draw', label: () => t('Take the last corner back'), keys: 'Backspace', where: ['keys-only'], when: (d) => d.pen.length > 0, does: (d) => void (d.pen = d.pen.slice(0, -1)) }),
  command<Dr>({ id: 'draw.out', scope: 'draw', label: () => t('Step out: a join begun, the shapes in hand, the tool'), keys: 'Escape', where: ['keys-only'], does: (d) => d.stepOut() }),
  command<Dr>({ id: 'draw.joinkeys', scope: 'draw', label: () => t('Join: the arrows go from shape to shape, Enter takes each end'), keys: 'ArrowLeft / ArrowRight / ArrowUp / ArrowDown / Enter', where: ['keys-only'], when: (d) => d.tool === 'k', does: (d, e) => e instanceof KeyboardEvent && d.joinKey(e) }),
  ...TOOLS.map((x) =>
    // K with two shapes chosen joins them, Shift still held from the Shift+tap that chose the second.
    command<Dr>({ id: `draw.tool.${x.id}`, scope: 'draw', label: x.name, icon: x.icon, keys: x.id === 'k' ? 'K / Shift+K' : x.key, where: ['bar'], pressed: (d) => d.tool === x.id, does: (d, e) => d.pickTool(x.id, e) }),
  ),
  command<Dr>({ id: 'draw.all', scope: 'draw', label: () => t('Choose every shape'), keys: 'Mod+A', where: ['keys-only'], does: (d) => d.chooseAll() }),
  ...ALIGN_KEYS,
  command<Dr>({ id: 'draw.restack', scope: 'draw', label: () => t('A place forward or back in the stack'), keys: 'Alt+ArrowUp / Alt+ArrowDown', where: ['keys-only'], when: (d) => d.chosen.length > 0, does: (d, e) => d.reorder(!(e instanceof KeyboardEvent) || e.key === 'ArrowUp' ? 1 : -1) }),
  command<Dr>({
    id: 'draw.nudge',
    scope: 'draw',
    label: () => t('Nudge the shapes in hand (Shift: five steps; Mod: resize)'),
    keys: ['', 'Shift+', 'Mod+'].map((m) => ['ArrowLeft', 'ArrowRight', 'ArrowUp', 'ArrowDown'].map((k) => m + k).join(' / ')).join(' / '),
    where: ['keys-only'],
    when: (d) => d.chosen.length > 0,
    does: (d, e) => e instanceof KeyboardEvent && d.nudgeKey(e),
  }),
];

const PIXELS: Command<Dr>[] = [
  ...PIXEL_INKS.map((ink) => command<Dr>({ id: `draw.pixel.${ink.k}`, scope: 'draw', label: ink.name, swatch: () => TILE_INKS[ink.k], where: ['bar'], when: (d) => !!d.view.grid, pressed: (d) => d.ink === ink.k, does: (d) => (d.ink = ink.k) })),
  command<Dr>({ id: 'draw.eraser', scope: 'draw', label: () => t('Eraser'), icon: Eraser, where: ['bar'], when: (d) => !!d.view.grid, pressed: (d) => d.ink === '.', does: (d) => (d.ink = '.') }),
  command<Dr>({ id: 'draw.pencil', scope: 'draw', label: () => t('Pencil'), icon: Pencil, where: ['bar'], when: (d) => !!d.view.grid, pressed: (d) => d.pmode === 'pen', does: (d) => d.paintWith('pen') }),
  command<Dr>({ id: 'draw.bucket', scope: 'draw', label: () => t('Fill'), icon: PaintBucket, where: ['bar'], when: (d) => !!d.view.grid, pressed: (d) => d.pmode === 'fill', does: (d) => d.paintWith('fill') }),
  command<Dr>({ id: 'draw.clear', scope: 'draw', label: () => t('Clear the grid'), icon: Trash2, where: ['bar'], when: (d) => !!d.view.grid, disabled: (d) => !tileFilled(d.view.pixels), does: (d) => d.clearPixels() }),
  command<Dr>({ id: 'draw.background', scope: 'draw', label: () => t('Background'), hint: () => t('Use as background'), icon: Wallpaper, where: ['bar'], when: (d) => !!d.view.grid, disabled: (d) => !tileFilled(d.view.pixels), does: (d) => d.useAsBackground() }),
  command<Dr>({ id: 'draw.pixel.move', scope: 'draw', label: () => t('Move about the grid'), keys: 'ArrowLeft / ArrowRight / ArrowUp / ArrowDown', where: ['keys-only'], when: (d) => !!d.view.grid, does: (d, e) => e instanceof KeyboardEvent && d.moveCursor(e.key) }),
  command<Dr>({ id: 'draw.pixel.paint', scope: 'draw', label: () => t('Paint the square'), keys: 'Enter / Space', where: ['keys-only'], when: (d) => !!d.view.grid, does: (d) => d.paintHere() }),
];

const DRAW: Command<Dr>[] = [
  command<Dr>({ id: 'draw.insert', scope: 'draw', label: () => t('Insert'), icon: UI.insert, menu: 'insert', where: ['bar'], takesFocus: true, when: canvas, does: () => undefined }),
  ...INSERTS,
  command<Dr>({ id: 'draw.mode', scope: 'draw', label: (d) => (d?.view.grid ? t('Pixels {n}×{n}', { n: d.view.grid }) : t('Shapes')), icon: Shapes, menu: 'mode', where: ['bar'], document: true, takesFocus: true, does: () => undefined }),
  command<Dr>({ id: 'draw.mode.shapes', scope: 'draw', label: () => t('Shapes'), icon: Shapes, where: ['menu:mode'], pressed: (d) => !d.view.grid, does: (d) => d.setMode(0) }),
  ...TILE_SIDES.map((n) => command<Dr>({ id: `draw.mode.${n}`, scope: 'draw', label: () => t('Pixels {n}×{n}', { n }), icon: Grid2x2, where: ['menu:mode'], pressed: (d) => d.view.grid === n, does: (d) => d.setMode(n) })),
  command<Dr>({ id: 'draw.mode.untile', scope: 'draw', label: () => t('Remove the background tile'), icon: Trash2, heading: () => t('Background'), where: ['menu:mode'], when: (d) => !!d.view.tile && !d.view.grid, does: (d) => d.removeTile() }),
  command<Dr>({ id: 'draw.icon', scope: 'draw', label: (d) => (d?.selected && !isLink(d.selected.k) ? t('Put an icon on this shape') : t('Place an icon')), icon: Smile, where: ['bar'], when: canvas, pressed: (d) => d.tool === 'i', does: (d) => d.pickIcon() }),
  command<Dr>({ id: 'draw.arrange', scope: 'draw', label: () => t('Arrange'), icon: Layers, menu: 'arrange', where: ['bar'], takesFocus: true, when: canvas, does: () => undefined }),
  command<Dr>({ id: 'draw.alt', scope: 'draw', label: (d) => (d?.view.alt ? t('Alt text: {alt}', { alt: d.view.alt }) : t('Add alt text: describe this drawing for people who cannot see it')), where: ['bar'], document: true, takesFocus: true, when: canvas, does: (d) => d.openAlt() }),
  command<Dr>({ id: 'draw.zoomout', scope: 'draw', label: () => t('Zoom out'), icon: ZoomOut, where: ['bar'], document: true, takesFocus: true, when: canvas, disabled: (d) => d.zoom <= 0.5, does: (d) => d.zoomBy(-0.25) }),
  command<Dr>({ id: 'draw.zoomin', scope: 'draw', label: () => t('Zoom in'), icon: ZoomIn, where: ['bar'], document: true, takesFocus: true, when: canvas, disabled: (d) => d.zoom >= 4, does: (d) => d.zoomBy(0.25) }),
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
export const CANVAS_KEYS = [...KEYS, ...DRAW.filter((c) => !KEYS.includes(c))].filter((c) => c.keys && !c.id.startsWith('draw.pixel.'));
export const PIXEL_KEYS = PIXELS.filter((c) => c.keys);

export default register(DRAW) as Command<Dr>[];
