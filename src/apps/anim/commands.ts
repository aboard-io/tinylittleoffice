/**
 * The Animator's commands (kit/commands.ts), its editor the context: the bar (Play or Pause, Effects ▾), the mode (Draw
 * or Move), the repeat ▾, the bar under the shapes in hand (§5's order, for a motion: add a key here, remove this key
 * | edit the words, duplicate | copy, cut, paste | delete), and the stage's keys in Move mode (docs/editing.md §8:
 * Space plays, "," and "." step a frame, Home and End, K keys the shapes in hand, the arrows nudge them, Mod+arrows
 * size them, with none in hand Left and Right step a frame, Escape stops the playing and then lets the shapes go,
 * Mod+A, Mod+D, Enter edits the words, Delete). In Draw mode the keys are the Drawing Tool's.
 */
import { ClipboardPaste, Copy, Key, PenTool, Play, Repeat, Scissors, Sparkles, Tag } from 'lucide';
import { register, type Command, commandsOf } from '../../kit/commands.ts';
import { t } from '../../kit/i18n.ts';
import { UI } from '../../kit/icons.ts';
import { isLink } from '../draw/model.ts';
import { EFFECTS, hasKey, setLoop, stateAt, type Loop } from './model.ts';
import type { ToAnimEditor } from './editor.ts';

type A = ToAnimEditor;
const cmd = commandsOf<A>('anim');
/** The numbers of times the repeat menu offers (the motion's own, if another, is offered too). */
const TIMES = [2, 3, 5, 10];
/** A repeat, named. */
export const loopName = (l: Loop): string => (l === 'forever' ? t('Loop for ever') : l === 'once' ? t('Play once') : l === 'bounce' ? t('Back and forth') : t('{n} times', { n: l }));
/** The effects' names, by letter. */
const FX_NAMES: Record<string, string> = {
  i: 'Impact',
  '3': '3D',
  d: 'Shadow',
  n: 'Neon',
  o: 'Outline',
  g: 'Rainbow',
  m: 'Mirror',
  w: 'Wobble',
  b: 'Blur',
};
const any = (a: A) => a.sels.length > 0;
const joins = (a: A) => a.sels.every((i) => isLink(a.view.shapes[i]?.k));
const moving = (a: A) => a.mode === 'move';
const loop = (l: Loop) =>
  cmd(`loop.${l}`, () => (typeof l === 'number' ? t('{n} times', { n: l }) : loopName(l)), {
    hint: () => (l === 'bounce' ? t('Forward, then back') : undefined),
    where: ['menu:loop'],
    pressed: (a) => a.view.loop === l,
    does: (a) => a.act(setLoop(a.doc, l)),
  });

const ANIM: Command<A>[] = [
  cmd('play', (a) => (a?.playing ? t('Pause') : t('Play')), {
    hint: 'Play or pause',
    icon: Play,
    keys: 'Space',
    at: 'stage',
    where: ['bar'],
    document: true,
    when: moving,
    pressed: (a) => a.playing,
    does: (a) => a.toggle(),
  }),
  cmd('fx', 'Effects', { icon: Sparkles, menu: 'fx', where: ['bar'], when: moving, does: () => undefined }),
  ...EFFECTS.map((f) =>
    cmd(`fx.${f.letter}`, FX_NAMES[f.letter], {
      where: ['menu:fx'],
      disabled: (a) => a.sel < 0,
      pressed: (a) => a.sel >= 0 && stateAt(a.view, a.sel, a.frame).fx.includes(f.letter),
      does: (a) => a.toggleFx(f.letter),
    }),
  ),
  cmd('draw', 'Draw', { icon: PenTool, where: ['drawer'], document: true, pressed: (a) => !moving(a), does: (a) => a.setMode('draw') }),
  cmd('move', 'Move', { icon: Play, where: ['drawer'], document: true, pressed: moving, does: (a) => a.setMode('move') }),
  cmd('loop', (a) => loopName(a?.view.loop ?? 'forever'), { icon: Repeat, menu: 'loop', where: ['drawer'], document: true, when: moving, does: () => undefined }),
  loop('forever'),
  loop('once'),
  loop('bounce'),
  ...TIMES.map(loop),
  cmd('loop.own', (a) => loopName(a?.view.loop ?? 'forever'), {
    where: ['menu:loop'],
    when: (a) => typeof a.view.loop === 'number' && !TIMES.includes(a.view.loop),
    pressed: () => true,
    does: () => undefined,
  }),
  cmd('key', 'Add a key here', {
    icon: Key,
    keys: 'K',
    at: 'stage',
    where: ['context'],
    group: 'keys',
    when: any,
    disabled: (a) => a.sels.every((i) => hasKey(a.view, i, a.frame)),
    does: (a) => a.key(),
  }),
  cmd('unkey', 'Remove this key', { icon: UI.close, where: ['context'], group: 'keys', when: any, disabled: (a) => !a.sels.some((i) => hasKey(a.view, i, a.frame)), does: (a) => a.removeKeyHere() }),
  cmd('words', 'Edit the words', {
    icon: Tag,
    keys: 'Enter',
    at: 'stage',
    where: ['context'],
    group: 'edit',
    when: any,
    disabled: (a) => a.sels.length !== 1 || isLink(a.view.shapes[a.sel]?.k),
    does: (a) => a.editWords(),
  }),
  cmd('duplicate', 'Duplicate', { icon: Copy, keys: 'Mod+D', at: 'stage', where: ['context'], group: 'edit', when: any, disabled: joins, does: (a) => a.duplicateSel() }),
  cmd('copy', 'Copy', { at: 'stage', icon: UI.copy, keys: 'Mod+C', native: true, where: ['context'], group: 'clip', when: any, disabled: joins, does: (a) => a.copyOut(false) }),
  cmd('cut', 'Cut', { at: 'stage', icon: Scissors, keys: 'Mod+X', native: true, where: ['context'], group: 'clip', when: any, disabled: joins, does: (a) => a.copyOut(true) }),
  cmd('paste', 'Paste', { at: 'stage', icon: ClipboardPaste, keys: 'Mod+V', native: true, where: ['context'], group: 'clip', when: any, does: (a) => a.pasteIn() }),
  cmd('delete', 'Delete', { icon: UI.trash, keys: 'Delete / Backspace', at: 'stage', where: ['context'], group: 'delete', when: any, does: (a) => a.removeSel() }),
  cmd('step', 'A frame back, a frame on', {
    keys: ', / .',
    at: 'stage',
    where: ['keys-only'],
    does: (a, e) => a.seek(a.frame + (e instanceof KeyboardEvent && (e.key === ',' || e.key === '<') ? -1 : 1)),
  }),
  cmd('ends', 'The first frame, the last', { keys: 'Home / End', at: 'stage', where: ['keys-only'], does: (a, e) => a.seek(e instanceof KeyboardEvent && e.key === 'Home' ? 0 : a.view.frames - 1) }),
  cmd('nudge', 'Nudge the shapes in hand; with none, step a frame', {
    keys: ['', 'Shift+', 'Mod+'].map((m) => ['ArrowLeft', 'ArrowRight', 'ArrowUp', 'ArrowDown'].map((k) => m + k).join(' / ')).join(' / '),
    at: 'stage',
    where: ['keys-only'],
    does: (a, e) => e instanceof KeyboardEvent && a.arrowKey(e),
  }),
  cmd('all', 'Select all: the words of the box, then everything', { keys: 'Mod+A', at: 'stage', where: ['keys-only'], does: (a) => a.selectAll() }),
  cmd('out', 'Step out: close, collapse, let go', { keys: 'Escape', at: 'stage', where: ['keys-only'], does: (a) => a.stepOut() }),
];

export default register(ANIM) as Command<A>[];
