/**
 * The Pinboard's commands (kit/core/commands.ts), its editor the context. The bar: Insert ▾ (a note, words, a frame,
 * and a picture where the page keeps pictures), the tools with their letters, the zoom and Fit everything. The
 * context bar under what is in hand: its colors | edit its words (or describe a picture), connect two, an arrowhead on
 * a join | bring to front, duplicate | delete. The canvas's keys: the letters pick tools, never from a bar button, a
 * field or the words; Escape steps out; Mod+A, Mod+D; Enter edits the words; the arrows nudge (Shift by ten).
 */
import { ArrowUpToLine, Copy, Frame, Image, MousePointer2, MoveRight, Pencil, Scan, Spline, StickyNote, Tag, Trash2, Type, ZoomIn, ZoomOut } from 'lucide';
import { register, type Command, commandsOf } from '../../kit/core/commands.ts';
import { t } from '../../kit/core/i18n.ts';
import { UI } from '../../kit/draw/icons.ts';
import { imagesKept } from '../../kit/draw/image-picture.ts';
import { COLORS, COLOR_NAMES, isJoin, type Color } from './model.ts';
import type { ToPinboardEditor } from './editor.ts';

type Pb = ToPinboardEditor;
const cmd = commandsOf<Pb>('pinboard');
type Icon = Command['icon'];

/** What a press on the board makes: nothing (Select), a thing of a kind, a stroke, or an arrow from one thing to another. */
export type Tool = 'select' | 'note' | 'text' | 'frame' | 'pen' | 'arrow';
export const TOOLS: { id: Tool; name: string; icon: Icon; key: string }[] = [
  { id: 'select', name: 'pinboard-select', icon: MousePointer2, key: 'V' },
  { id: 'note', name: 'common-note', icon: StickyNote, key: 'N' },
  { id: 'text', name: 'common-text', icon: Type, key: 'T' },
  { id: 'frame', name: 'pinboard-frame', icon: Frame, key: 'F' },
  { id: 'pen', name: 'pinboard-pen', icon: Pencil, key: 'P' },
  { id: 'arrow', name: 'pinboard-arrow', icon: MoveRight, key: 'A' },
];
/** The colors' names, in the order the context bar shows them. */
const NAMED: Record<Color, string> = { yellow: 'common-yellow', orange: 'common-orange', pink: 'pinboard-pink', purple: 'common-purple', blue: 'common-blue', green: 'common-green' };

const held = (d: Pb) => d.held;
const has = (d: Pb) => d.chosen.length > 0 && d.editing === null;
const one = (d: Pb) => has(d) && d.chosen.length === 1;
/** Whether every thing in hand is a note (whose own color is yellow, so it has no "none"). */
const notes = (d: Pb) => d.chosenItems.every((i) => i.k === 'note');
/** Whether any thing in hand takes a color (a picture does not). */
const colored = (d: Pb) => has(d) && d.chosenItems.some((i) => i.k !== 'picture');

const COLOR: Command<Pb>[] = [
  cmd('color.none', 'common-black', {
    data: true,
    swatch: () => '#18181b',
    where: ['context'],
    group: 'color',
    when: (d) => colored(d) && !notes(d),
    pressed: (d) => d.chosenItems.every((i) => !i.color),
    does: (d) => d.colorSel(''),
  }),
  ...COLOR_NAMES.map((c) =>
    cmd(`color.${c}`, NAMED[c], {
      data: true,
      swatch: (d) => (d && notes(d) ? COLORS[c].paper : COLORS[c].ink),
      where: ['context'],
      group: 'color',
      when: colored,
      pressed: (d) => d.chosenItems.every((i) => (i.color || (i.k === 'note' ? 'yellow' : '')) === c),
      does: (d) => d.colorSel(c),
    }),
  ),
];

const ACT: Command<Pb>[] = [
  cmd('words', (d) => t(d && held(d)?.k === 'picture' ? 'pinboard-describe-picture' : 'common-edit-words'), {
    at: 'canvas',
    icon: Tag,
    keys: 'Enter',
    where: ['context'],
    group: 'act',
    when: (d) => one(d) && held(d)!.k !== 'pen',
    does: (d) => d.openWords(),
  }),
  cmd('connect', 'pinboard-connect', { icon: Spline, where: ['context'], group: 'act', when: (d) => has(d) && !!d.pair, does: (d) => d.connect(d.pair![0], d.pair![1]) }),
  cmd('head', 'pinboard-arrowhead', {
    icon: MoveRight,
    where: ['context'],
    group: 'act',
    when: (d) => has(d) && d.chosenItems.every((i) => isJoin(i.k)),
    pressed: (d) => d.chosenItems.every((i) => i.k === 'arrow'),
    does: (d) => d.toggleHead(),
  }),
  cmd('front', 'pinboard-bring-to-front', { icon: ArrowUpToLine, where: ['context'], group: 'arrange', when: has, does: (d) => d.front() }),
  cmd('duplicate', 'common-duplicate', {
    at: 'canvas',
    icon: Copy,
    keys: 'Mod+D',
    where: ['context'],
    group: 'arrange',
    when: has,
    disabled: (d) => d.chosenItems.every((i) => isJoin(i.k)),
    does: (d) => d.duplicateSel(),
  }),
  cmd('delete', 'common-delete', { at: 'canvas', icon: Trash2, keys: 'Delete / Backspace', where: ['context'], group: 'delete', when: has, does: (d) => d.removeSel() }),
];

const INSERTS: Command<Pb>[] = [
  cmd('insert.note', 'common-note', { icon: StickyNote, where: ['menu:insert'], does: (d) => d.insert('note') }),
  cmd('insert.text', 'common-text', { icon: Type, where: ['menu:insert'], does: (d) => d.insert('text') }),
  cmd('insert.frame', 'pinboard-frame', { icon: Frame, where: ['menu:insert'], does: (d) => d.insert('frame') }),
  cmd('insert.picture', 'common-picture-ellipsis', { icon: Image, where: ['menu:insert'], when: () => imagesKept(), does: (d) => d.choosePicture() }),
];

const KEYS: Command<Pb>[] = [
  cmd('out', 'common-step-out-close-collapse-let', { at: 'canvas', keys: 'Escape', where: ['keys-only'], does: (d) => d.stepOut() }),
  cmd('all', 'common-select-all-words-of-box', { at: 'canvas', keys: 'Mod+A', where: ['keys-only'], does: (d) => d.chooseAll() }),
  cmd('nudge', 'common-nudge-shapes-in-hand', {
    at: 'canvas',
    keys: ['', 'Shift+'].map((m) => ['ArrowLeft', 'ArrowRight', 'ArrowUp', 'ArrowDown'].map((k) => m + k).join(' / ')).join(' / '),
    where: ['keys-only'],
    when: (d) => d.chosen.length > 0,
    does: (d, e) => e instanceof KeyboardEvent && d.nudgeKey(e),
  }),
];

const TOOL_CMDS: Command<Pb>[] = TOOLS.map((x) =>
  cmd(`tool.${x.id}`, x.name, { at: 'canvas', icon: x.icon, keys: x.key, where: ['bar'], pressed: (d) => d.tool === x.id, does: (d) => d.pickTool(x.id) }),
);

const ALL: Command<Pb>[] = [
  cmd('insert', 'common-insert', { icon: UI.insert, menu: 'insert', where: ['bar'], takesFocus: true, does: () => undefined }),
  ...INSERTS,
  ...TOOL_CMDS,
  cmd('zoomout', 'common-zoom-out', { icon: ZoomOut, where: ['bar'], document: true, disabled: (d) => d.zoom <= d.minZoom, does: (d) => d.zoomBy(1 / 1.25) }),
  cmd('zoomin', 'common-zoom-in', { icon: ZoomIn, where: ['bar'], document: true, disabled: (d) => d.zoom >= d.maxZoom, does: (d) => d.zoomBy(1.25) }),
  cmd('fit', 'pinboard-fit-everything', { icon: Scan, where: ['bar'], document: true, does: (d) => d.fit() }),
  ...COLOR,
  ...ACT,
  ...KEYS,
];
/** The keys on the canvas. */
export const CANVAS_KEYS = ALL.filter((c) => c.keys);

export default register(ALL) as Command<Pb>[];
