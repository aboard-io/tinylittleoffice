/**
 * The Drawing Tool's commands (kit/core/commands.ts), its editor the context, and the tables they are made from (the
 * tools, the shapes, the inks, the text sizes, the alignments, the pixel inks). The bar: Insert ▾, Shapes or Pixels ▾,
 * the tools with their letters, an icon, Arrange ▾, the zoom; in pixel mode the inks, Eraser, Pencil, Fill, Clear and
 * Background. The context bar under the shape in hand: inks | fill or line style | text size and a text's alignment |
 * rotate, edit the words, duplicate, front, back | copy, cut, paste | delete (§5's order); while its words are typed,
 * size and alignment | inks. The canvas's keys (docs/editing.md §5 and §8): the letters pick tools, never from a bar
 * button, a field or the words; Escape steps out; Mod+A, Mod+D; Mod+Shift+L, E and R align a text; [ and ] rotate;
 * Enter edits the words; Alt+Up/Down restack; the arrows nudge (Shift by five, Mod resizes); a pen's Enter, Escape
 * and Backspace; the Join tool's arrows and Enter; in pixel mode the arrows move and Enter or Space paints.
 */
import {
  ArrowDownToLine,
  ArrowUpToLine,
  Blend,
  Brush,
  Circle,
  ClipboardPaste,
  Copy,
  Diamond,
  Ellipsis,
  Eraser,
  Grid2x2,
  GripHorizontal,
  Layers,
  Minus,
  MousePointer2,
  MoveRight,
  PaintBucket,
  PenTool,
  Pencil,
  RotateCcw,
  RotateCw,
  Scissors,
  Shapes,
  Smile,
  Spline,
  Square,
  Tag,
  Trash2,
  Type,
  Wallpaper,
  ZoomIn,
  ZoomOut,
} from 'lucide';
import { register, type Command, commandsOf } from '../../kit/core/commands.ts';
import { t } from '../../kit/core/i18n.ts';
import { UI } from '../../kit/draw/icons.ts';
import { TILE_INKS, TILE_SIDES, tileFilled } from '../../kit/draw/tile.ts';
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
  { id: 'select', name: 'draw-select', icon: MousePointer2, key: 'V' },
  { id: 'r', name: 'draw-rectangle', icon: Square, key: 'R' },
  { id: 'e', name: 'draw-ellipse', icon: Circle, key: 'E' },
  { id: 'd', name: 'draw-diamond', icon: Diamond, key: 'D' },
  { id: 'l', name: 'draw-line', icon: Minus, key: 'L' },
  { id: 'a', name: 'draw-arrow', icon: MoveRight, key: 'A' },
  { id: 't', name: 'common-text', icon: Type, key: 'T' },
  { id: 'k', name: 'draw-join-two-shapes', icon: Spline, key: 'K' },
  { id: 'v', name: 'draw-pen', hint: 'draw-any-shape-tap-for-each', icon: PenTool, key: 'P' },
  { id: 'f', name: 'draw-freehand', hint: 'draw-drag-to-draw-line-or', icon: Brush, key: 'F' },
];
/** Every shape Insert ▾ can place, the bar's and the rest. */
const SHAPES: { id: Kind; name: string }[] = [
  { id: 'r', name: 'draw-rectangle' },
  { id: 'o', name: 'draw-rounded-box' },
  { id: 'e', name: 'draw-ellipse' },
  { id: 'd', name: 'draw-diamond' },
  { id: 'h', name: 'draw-hexagon' },
  { id: 'p', name: 'draw-parallelogram' },
  { id: 'c', name: 'draw-cylinder' },
  { id: 'n', name: 'common-note' },
  { id: 't', name: 'common-text' },
];
const INKS: { c: Color | ''; name: string; hex: string }[] = [
  { c: '', name: 'common-black', hex: '#18181b' },
  { c: 'r', name: 'common-red', hex: COLORS.r },
  { c: 'o', name: 'common-orange', hex: COLORS.o },
  { c: 'g', name: 'common-green', hex: COLORS.g },
  { c: 'b', name: 'common-blue', hex: COLORS.b },
  { c: 'p', name: 'common-purple', hex: COLORS.p },
];
const SIZES: { z: TextSize; name: string; letter: string }[] = [
  { z: 1, name: 'draw-small-text', letter: 'draw-s' },
  { z: 2, name: 'draw-medium-text', letter: 'draw-m' },
  { z: 3, name: 'draw-large-text', letter: 'draw-l' },
  { z: 4, name: 'draw-extra-large-text', letter: 'draw-xl' },
];
/** A text's three alignments: the bar's one button shows the one it has and goes on to the next; Mod+Shift+L, E and R set each (the Word Processor's keys, and every word processor's). */
export const ALIGNS: { al: Align | ''; name: string; icon: Icon; key: string }[] = [
  { al: '', name: 'draw-align-left', icon: UI.alignLeft, key: 'L' },
  { al: 'c', name: 'draw-align-center', icon: UI.alignCenter, key: 'E' },
  { al: 'r', name: 'draw-align-right', icon: UI.alignRight, key: 'R' },
];
/** The pixel inks, by letter, named. */
export const PIXEL_INKS: { k: string; name: string }[] = [
  { k: 'a', name: 'common-black' },
  { k: 'b', name: 'common-indigo' },
  { k: 'c', name: 'common-red' },
  { k: 'd', name: 'common-orange' },
  { k: 'e', name: 'common-yellow' },
  { k: 'f', name: 'common-green' },
  { k: 'g', name: 'draw-sky' },
  { k: 'h', name: 'draw-pink' },
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
    { f: 0 as Fill, label: 'draw-solid-line', icon: Minus },
    { f: 1 as Fill, label: 'draw-dashed-line', icon: GripHorizontal },
    { f: 2 as Fill, label: 'draw-dotted-line', icon: Ellipsis },
  ].map((x) => cmd(`line.${x.f}`, x.label, { icon: x.icon, where: ['context'], group: 'style', when: styleShown(true), pressed: (d) => sameFill(d, x.f), does: (d) => d.patchSel({ f: x.f }) })),
  ...[
    { f: 0 as Fill, label: 'draw-no-fill', icon: Square },
    { f: 1 as Fill, label: 'draw-gray-fill', icon: Blend },
    { f: 2 as Fill, label: 'draw-solid-fill', icon: PaintBucket },
  ].map((x) => cmd(`fill.${x.f}`, x.label, { icon: x.icon, where: ['context'], group: 'style', when: styleShown(false), pressed: (d) => sameFill(d, x.f), does: (d) => d.patchSel({ f: x.f }) })),
];
const INK: Command<Dr>[] = INKS.map((ink) =>
  cmd(`ink.${ink.c || 'black'}`, ink.name, {
    data: true,
    swatch: () => ink.hex,
    where: ['context'],
    group: 'inks',
    when: has,
    pressed: (d) => (held(d).c ?? '') === ink.c,
    does: (d) => d.patchSel({ c: (ink.c || undefined) as Color | undefined }),
  }),
);
const SIZE: Command<Dr>[] = [
  ...SIZES.map((x) =>
    cmd(`size.${x.z}`, x.name, {
      letter: x.letter,
      where: ['context'],
      group: 'size',
      when: (d) => has(d) && held(d).k !== 'i',
      pressed: (d) => (held(d).z ?? 2) === x.z,
      does: (d) => d.patchSel({ z: x.z === 2 ? undefined : x.z }),
    }),
  ),
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
  cmd(`align.${x.key.toLowerCase()}`, x.name, {
    at: 'canvas',
    icon: x.icon,
    keys: `Mod+Shift+${x.key}`,
    where: ['keys-only'],
    when: (d) => d.chosen.length > 0 || typing(d),
    does: (d) => d.alignSel(x.al, texts(d)),
  }),
);
const ACT: Command<Dr>[] = [
  cmd('left', 'draw-rotate-left', { at: 'canvas', icon: RotateCcw, keys: '[', where: ['context'], group: 'act', when: (d) => shapeAct(d) && d.turnable, does: (d) => d.turnBy(-TURN_STEP) }),
  cmd('right', 'draw-rotate-right', { at: 'canvas', icon: RotateCw, keys: ']', where: ['context'], group: 'act', when: (d) => shapeAct(d) && d.turnable, does: (d) => d.turnBy(TURN_STEP) }),
  cmd('words', (d) => (d && held(d)?.k === 'i' ? t('common-change-icon') : t('common-edit-words')), {
    at: 'canvas',
    icon: Tag,
    keys: 'Enter',
    where: ['context'],
    group: 'act',
    when: (d) => shapeAct(d) && !many(d),
    does: (d) => d.openWords(),
  }),
  cmd('join', 'draw-join-two-shapes', { icon: Spline, where: ['context'], group: 'act', when: (d) => shapeAct(d) && !!d.pair, does: (d) => d.join(d.pair![0], d.pair![1]) }),
  cmd('duplicate', 'common-duplicate', {
    at: 'canvas',
    icon: Copy,
    keys: 'Mod+D',
    where: ['context', 'menu:arrange'],
    group: 'act',
    when: canvas,
    disabled: (d) => !!d.selected && !many(d) && isLink(d.selected.k),
    does: (d) => d.duplicateSel(),
  }),
  cmd('front', 'draw-bring-to-front', { icon: ArrowUpToLine, where: ['context', 'menu:arrange'], group: 'act', when: canvas, disabled: (d) => !d.selected, does: (d) => d.reorder(true) }),
  cmd('back', 'draw-send-to-back', { icon: ArrowDownToLine, where: ['context', 'menu:arrange'], group: 'act', when: canvas, disabled: (d) => !d.selected, does: (d) => d.reorder(false) }),
  cmd('copy', 'common-copy', {
    at: 'canvas',
    icon: UI.copy,
    keys: 'Mod+C',
    native: true,
    where: ['context'],
    group: 'clip',
    when: shapeAct,
    disabled: (d) => isLink(held(d).k) && d.chosen.length < 2,
    does: (d) => d.copyOut(false),
  }),
  cmd('cut', 'common-cut', {
    at: 'canvas',
    icon: Scissors,
    keys: 'Mod+X',
    native: true,
    where: ['context'],
    group: 'clip',
    when: shapeAct,
    disabled: (d) => isLink(held(d).k) && d.chosen.length < 2,
    does: (d) => d.copyOut(true),
  }),
  cmd('paste', 'common-paste', {
    at: 'canvas',
    icon: ClipboardPaste,
    keys: 'Mod+V',
    native: true,
    where: ['context', 'menu:insert'],
    heading: 'draw-more',
    group: 'clip',
    when: (d) => canvas(d) && !typing(d),
    does: (d) => d.pasteIn(),
  }),
  cmd('delete', 'common-delete', {
    at: 'canvas',
    icon: Trash2,
    keys: 'Delete / Backspace',
    where: ['context', 'menu:arrange'],
    group: 'delete',
    when: canvas,
    disabled: (d) => !d.selected,
    does: (d) => d.removeSel(),
  }),
];

const INSERTS: Command<Dr>[] = [
  ...SHAPES.map((s) => cmd(`insert.${s.id}`, s.name, { heading: 'draw-shapes', where: ['menu:insert'], does: (d) => d.insert(s.id) })),
  cmd('insert.l', 'draw-line', { icon: Minus, heading: 'common-lines', where: ['menu:insert'], does: (d) => d.insert('l') }),
  cmd('insert.a', 'draw-arrow', { icon: MoveRight, heading: 'common-lines', where: ['menu:insert'], does: (d) => d.insert('a') }),
  cmd('insert.k', 'draw-join-two-shapes', { icon: Spline, hint: 'draw-press-on-one-shape-and', heading: 'common-lines', where: ['menu:insert'], does: (d) => (d.tool = 'k') }),
  cmd('insert.icon', 'draw-icon', { icon: Smile, heading: 'draw-more', where: ['menu:insert'], does: (d) => d.pickIcon() }),
  cmd('insert.pen', 'draw-pen', { icon: PenTool, hint: 'draw-any-shape-tap-for-each', heading: 'draw-more', where: ['menu:insert'], does: (d) => (d.tool = 'v') }),
  cmd('insert.free', 'draw-freehand', { icon: Brush, hint: 'draw-drag-to-draw-line-or', heading: 'draw-more', where: ['menu:insert'], does: (d) => (d.tool = 'f') }),
];

/** The canvas's own keys: a pen's, the Join tool's, a step out, the letters, and what acts on the shapes in hand. */
const KEYS: Command<Dr>[] = [
  cmd('pen.close', 'common-done', { at: 'canvas', keys: 'Enter', where: ['keys-only'], when: (d) => d.pen.length > 0, does: (d) => d.closePen() }),
  cmd('pen.cancel', 'common-step-out-close-collapse-let', { at: 'canvas', keys: 'Escape', where: ['keys-only'], when: (d) => d.pen.length > 0, does: (d) => void (d.pen = []) }),
  cmd('pen.back', 'common-delete', { at: 'canvas', keys: 'Backspace', where: ['keys-only'], when: (d) => d.pen.length > 0, does: (d) => void (d.pen = d.pen.slice(0, -1)) }),
  cmd('out', 'common-step-out-close-collapse-let', { at: 'canvas', keys: 'Escape', where: ['keys-only'], does: (d) => d.stepOut() }),
  cmd('joinkeys', 'draw-join-two-shapes', {
    at: 'canvas',
    keys: 'ArrowLeft / ArrowRight / ArrowUp / ArrowDown / Enter',
    where: ['keys-only'],
    when: (d) => d.tool === 'k',
    does: (d, e) => e instanceof KeyboardEvent && d.joinKey(e),
  }),
  cmd('all', 'common-select-all-words-of-box', { at: 'canvas', keys: 'Mod+A', where: ['keys-only'], does: (d) => d.chooseAll() }),
  ...ALIGN_KEYS,
  cmd('restack', 'common-move-selected-items-up-or', {
    at: 'canvas',
    keys: 'Alt+ArrowUp / Alt+ArrowDown',
    where: ['keys-only'],
    when: (d) => d.chosen.length > 0,
    does: (d, e) => d.reorder(!(e instanceof KeyboardEvent) || e.key === 'ArrowUp' ? 1 : -1),
  }),
  cmd('nudge', 'common-nudge-shapes-in-hand', {
    at: 'canvas',
    keys: ['', 'Shift+', 'Mod+'].map((m) => ['ArrowLeft', 'ArrowRight', 'ArrowUp', 'ArrowDown'].map((k) => m + k).join(' / ')).join(' / '),
    where: ['keys-only'],
    when: (d) => d.chosen.length > 0,
    does: (d, e) => e instanceof KeyboardEvent && d.nudgeKey(e),
  }),
];

const PIXELS: Command<Dr>[] = [
  ...PIXEL_INKS.map((ink) =>
    cmd(`pixel.${ink.k}`, ink.name, {
      data: true,
      swatch: () => TILE_INKS[ink.k],
      where: ['bar'],
      group: 'inks',
      when: (d) => !!d.view.grid,
      pressed: (d) => d.ink === ink.k,
      does: (d) => (d.ink = ink.k),
    }),
  ),
  cmd('eraser', 'draw-eraser', { icon: Eraser, where: ['bar'], group: 'paint', when: (d) => !!d.view.grid, pressed: (d) => d.ink === '.', does: (d) => (d.ink = '.') }),
  cmd('pencil', 'draw-pencil', { icon: Pencil, where: ['bar'], group: 'paint', when: (d) => !!d.view.grid, pressed: (d) => d.pmode === 'pen', does: (d) => d.paintWith('pen') }),
  cmd('bucket', 'draw-fill', { icon: PaintBucket, where: ['bar'], group: 'paint', when: (d) => !!d.view.grid, pressed: (d) => d.pmode === 'fill', does: (d) => d.paintWith('fill') }),
  cmd('clear', 'draw-clear-grid', { icon: Trash2, where: ['bar'], when: (d) => !!d.view.grid, disabled: (d) => !tileFilled(d.view.pixels), does: (d) => d.clearPixels() }),
  cmd('background', 'draw-background', {
    hint: 'draw-use-as-background',
    icon: Wallpaper,
    where: ['bar'],
    when: (d) => !!d.view.grid,
    disabled: (d) => !tileFilled(d.view.pixels),
    does: (d) => d.useAsBackground(),
  }),
  cmd('pixel.move', 'draw-tap-or-drag-to-paint', {
    at: 'pixels',
    keys: 'ArrowLeft / ArrowRight / ArrowUp / ArrowDown',
    where: ['keys-only'],
    when: (d) => !!d.view.grid,
    does: (d, e) => e instanceof KeyboardEvent && d.moveCursor(e.key),
  }),
  cmd('pixel.paint', 'draw-tap-or-drag-to-paint', { at: 'pixels', keys: 'Enter / Space', where: ['keys-only'], when: (d) => !!d.view.grid, does: (d) => d.paintHere() }),
];

/** The tools, a letter each: the bar's, and the first keys the shortcuts dialog lists (Shift+K too: two shapes chosen with Shift+tap are joined with Shift still held). */
const TOOL_CMDS: Command<Dr>[] = [
  ...TOOLS.map((x) =>
    cmd(`tool.${x.id}`, x.name, {
      at: 'canvas',
      icon: x.icon,
      hint: x.hint,
      keys: x.id === 'k' ? 'K / Shift+K' : x.key,
      where: ['bar'],
      group: 'tools',
      pressed: (d) => d.tool === x.id,
      does: (d, e) => d.pickTool(x.id, e),
    }),
  ),
];

const DRAW: Command<Dr>[] = [
  ...TOOL_CMDS,
  cmd('insert', 'common-insert', { icon: UI.insert, menu: 'insert', where: ['bar'], takesFocus: true, when: canvas, does: () => undefined }),
  ...INSERTS,
  cmd('mode', (d) => (d?.view.grid ? t('draw-pixels-n-n', { n: d.view.grid }) : t('draw-shapes')), {
    icon: Shapes,
    menu: 'mode',
    where: ['bar'],
    document: true,
    takesFocus: true,
    does: () => undefined,
  }),
  cmd('mode.shapes', 'draw-shapes', { icon: Shapes, where: ['menu:mode'], pressed: (d) => !d.view.grid, does: (d) => d.setMode(0) }),
  ...TILE_SIDES.map((n) => cmd(`mode.${n}`, () => t('draw-pixels-n-n', { n }), { icon: Grid2x2, where: ['menu:mode'], pressed: (d) => d.view.grid === n, does: (d) => d.setMode(n) })),
  cmd('mode.untile', 'draw-remove-background-tile', { icon: Trash2, heading: 'draw-background', where: ['menu:mode'], when: (d) => !!d.view.tile && !d.view.grid, does: (d) => d.removeTile() }),
  cmd('icon', (d) => (d?.selected && !isLink(d.selected.k) ? t('draw-put-icon-on-this-shape') : t('draw-place-icon')), {
    icon: Smile,
    where: ['bar'],
    when: canvas,
    pressed: (d) => d.tool === 'i',
    does: (d) => d.pickIcon(),
  }),
  cmd('arrange', 'draw-arrange', { icon: Layers, menu: 'arrange', where: ['bar'], takesFocus: true, when: canvas, does: () => undefined }),
  cmd('alt', (d) => (d?.view.alt ? t('draw-alt-text-alt', { alt: d.view.alt }) : t('draw-add-alt-text-describe-this')), {
    where: ['bar'],
    document: true,
    takesFocus: true,
    when: canvas,
    does: (d) => d.openAlt(),
  }),
  cmd('zoomout', 'common-zoom-out', { icon: ZoomOut, where: ['bar'], group: 'zoom', document: true, takesFocus: true, when: canvas, disabled: (d) => d.zoom <= 0.5, does: (d) => d.zoomBy(-0.25) }),
  cmd('zoomin', 'common-zoom-in', { icon: ZoomIn, where: ['bar'], group: 'zoom', document: true, takesFocus: true, when: canvas, disabled: (d) => d.zoom >= 4, does: (d) => d.zoomBy(0.25) }),
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
