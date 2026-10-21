/**
 * The Animator's commands (kit/core/commands.ts), its editor the context: the bar (Play or Pause, Settings), the chosen shape's
 * Effects ▾ (beside its sliders), the mode (Draw or Move, one control in the row above the bar), the repeat ▾ (in Settings), the frame in hand's menu in the
 * filmstrip (duplicate, delete, a frame earlier or later), the bar under the shapes in hand (§5's order, for a motion: add a key here, remove this key
 * | edit the words, duplicate | copy, cut, paste | delete), and the stage's keys in Move mode (docs/editing.md §8:
 * Space plays, "," and "." step a frame, Home and End, K keys the shapes in hand, the arrows nudge them, Mod+arrows
 * size them, with none in hand Left and Right step a frame, Escape stops the playing and then lets the shapes go,
 * Mod+A, Mod+D, Enter edits the words, Delete). In Draw mode the keys are the Drawing Tool's.
 */
import { ArrowLeft, ArrowRight, ClipboardPaste, Copy, CopyPlus, Ellipsis, Key, PenTool, Play, Repeat, Scissors, Settings2, Sparkles, Tag } from 'lucide';
import { register, type Command, commandsOf } from '../../kit/core/commands.ts';
import { t } from '../../kit/core/i18n.ts';
import { UI } from '../../kit/draw/icons.ts';
import { isLink } from '../draw/model.ts';
import { EFFECTS, MAX_FRAMES, MIN_FRAMES, hasKey, setLoop, stateAt, type Loop } from './model.ts';
import type { ToAnimEditor } from './editor.ts';

type A = ToAnimEditor;
const cmd = commandsOf<A>('anim');
/** The numbers of times the repeat menu offers (the motion's own, if another, is offered too). */
const TIMES = [2, 3, 5, 10];
/** A repeat, named. */
export const loopName = (l: Loop): string => (l === 'forever' ? t('anim-loop-forever') : l === 'once' ? t('anim-play-once') : l === 'bounce' ? t('anim-back-and-forth') : t('anim-n-times', { n: l }));
/** The effects' names, by letter. */
const FX_NAMES: Record<string, string> = {
  i: 'anim-impact',
  '3': 'anim-3d',
  d: 'anim-shadow',
  n: 'anim-neon',
  o: 'common-outline',
  g: 'anim-rainbow',
  m: 'anim-mirror',
  w: 'anim-wobble',
  b: 'anim-blur',
};
const any = (a: A) => a.sels.length > 0;
const joins = (a: A) => a.sels.every((i) => isLink(a.view.shapes[i]?.k));
const moving = (a: A) => a.mode === 'move';
const loop = (l: Loop) =>
  cmd(`loop.${l}`, () => (typeof l === 'number' ? t('anim-n-times', { n: l }) : loopName(l)), {
    hint: () => (l === 'bounce' ? t('anim-forward-then-back') : undefined),
    where: ['menu:loop'],
    pressed: (a) => a.view.loop === l,
    does: (a) => a.act(setLoop(a.doc, l)),
  });

const ANIM: Command<A>[] = [
  cmd('play', (a) => (a?.playing ? t('anim-pause') : t('anim-play')), {
    hint: 'anim-play-or-pause',
    icon: Play,
    keys: 'Space',
    at: 'stage',
    where: ['bar'],
    group: 'playback',
    document: true,
    when: moving,
    pressed: (a) => a.playing,
    does: (a) => a.toggle(),
  }),
  cmd('fx', 'anim-effects', { icon: Sparkles, menu: 'fx', where: ['in-doc'], when: moving, does: () => undefined }),
  ...EFFECTS.map((f) =>
    cmd(`fx.${f.letter}`, FX_NAMES[f.letter], {
      where: ['menu:fx'],
      disabled: (a) => a.sel < 0,
      pressed: (a) => a.sel >= 0 && stateAt(a.view, a.sel, a.frame).fx.includes(f.letter),
      does: (a) => a.toggleFx(f.letter),
    }),
  ),
  cmd('settings', 'anim-settings', { icon: Settings2, hint: 'anim-length-speed-and-repeat', where: ['bar'], group: 'playback', takesFocus: true, when: moving, does: (a) => a.openSettings() }),
  cmd('frame', 'anim-this-frame', { icon: Ellipsis, menu: 'frame', where: ['in-doc'], when: moving, does: () => undefined }),
  cmd('frame.duplicate', 'anim-duplicate-this-frame', { icon: CopyPlus, where: ['menu:frame'], disabled: (a) => a.view.frames >= MAX_FRAMES, does: (a) => a.duplicateFrame() }),
  cmd('frame.earlier', 'anim-frame-earlier', { icon: ArrowLeft, where: ['menu:frame'], disabled: (a) => a.frame <= 0, does: (a) => a.moveFrame(-1) }),
  cmd('frame.later', 'anim-frame-later', { icon: ArrowRight, where: ['menu:frame'], disabled: (a) => a.frame >= a.view.frames - 1, does: (a) => a.moveFrame(1) }),
  cmd('frame.delete', 'anim-delete-this-frame', { icon: UI.trash, where: ['menu:frame'], disabled: (a) => a.view.frames <= MIN_FRAMES, does: (a) => a.removeFrame() }),
  cmd('draw', 'draw-draw', { icon: PenTool, where: ['drawer'], document: true, pressed: (a) => !moving(a), does: (a) => a.setMode('draw') }),
  cmd('move', 'anim-move', { icon: Play, where: ['drawer'], document: true, pressed: moving, does: (a) => a.setMode('move') }),
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
  cmd('key', 'anim-add-key-here', {
    icon: Key,
    keys: 'K',
    at: 'stage',
    where: ['context'],
    group: 'keys',
    when: any,
    disabled: (a) => a.sels.every((i) => hasKey(a.view, i, a.frame)),
    does: (a) => a.key(),
  }),
  cmd('unkey', 'anim-remove-this-key', {
    icon: UI.close,
    where: ['context'],
    group: 'keys',
    when: any,
    disabled: (a) => !a.sels.some((i) => hasKey(a.view, i, a.frame)),
    does: (a) => a.removeKeyHere(),
  }),
  cmd('words', 'common-edit-words', {
    icon: Tag,
    keys: 'Enter',
    at: 'stage',
    where: ['context'],
    group: 'edit',
    when: any,
    disabled: (a) => a.sels.length !== 1 || isLink(a.view.shapes[a.sel]?.k),
    does: (a) => a.editWords(),
  }),
  cmd('duplicate', 'common-duplicate', { icon: Copy, keys: 'Mod+D', at: 'stage', where: ['context'], group: 'edit', when: any, disabled: joins, does: (a) => a.duplicateSel() }),
  cmd('copy', 'common-copy', { at: 'stage', icon: UI.copy, keys: 'Mod+C', native: true, where: ['context'], group: 'clip', when: any, disabled: joins, does: (a) => a.copyOut(false) }),
  cmd('cut', 'common-cut', { at: 'stage', icon: Scissors, keys: 'Mod+X', native: true, where: ['context'], group: 'clip', when: any, disabled: joins, does: (a) => a.copyOut(true) }),
  cmd('paste', 'common-paste', { at: 'stage', icon: ClipboardPaste, keys: 'Mod+V', native: true, where: ['context'], group: 'clip', when: any, does: (a) => a.pasteIn() }),
  cmd('delete', 'common-delete', { icon: UI.trash, keys: 'Delete / Backspace', at: 'stage', where: ['context'], group: 'delete', when: any, does: (a) => a.removeSel() }),
  cmd('step', 'anim-frame-back-frame-on', {
    keys: ', / .',
    at: 'stage',
    where: ['keys-only'],
    does: (a, e) => a.seek(a.frame + (e instanceof KeyboardEvent && (e.key === ',' || e.key === '<') ? -1 : 1)),
  }),
  cmd('ends', 'anim-first-frame-last', { keys: 'Home / End', at: 'stage', where: ['keys-only'], does: (a, e) => a.seek(e instanceof KeyboardEvent && e.key === 'Home' ? 0 : a.view.frames - 1) }),
  cmd('nudge', 'anim-nudge-shapes-in-hand-with', {
    keys: ['', 'Shift+', 'Mod+'].map((m) => ['ArrowLeft', 'ArrowRight', 'ArrowUp', 'ArrowDown'].map((k) => m + k).join(' / ')).join(' / '),
    at: 'stage',
    where: ['keys-only'],
    does: (a, e) => e instanceof KeyboardEvent && a.arrowKey(e),
  }),
  cmd('all', 'common-select-all-words-of-box', { keys: 'Mod+A', at: 'stage', where: ['keys-only'], does: (a) => a.selectAll() }),
  cmd('out', 'common-step-out-close-collapse-let', { keys: 'Escape', at: 'stage', where: ['keys-only'], does: (a) => a.stepOut() }),
];

export default register(ANIM) as Command<A>[];
