/**
 * The Animator's commands (kit/commands.ts), its editor the context: the bar (Play or Pause, Effects ▾), the mode (Draw
 * or Move), the repeat ▾, the bar under the shapes in hand (§5's order, for a motion: add a key here, remove this key
 * | edit the words, duplicate | copy, cut, paste | delete), and the stage's keys in Move mode (docs/editing.md §8:
 * Space plays, "," and "." step a frame, Home and End, K keys the shapes in hand, the arrows nudge them, Mod+arrows
 * size them, with none in hand Left and Right step a frame, Escape stops the playing and then lets the shapes go,
 * Mod+A, Mod+D, Enter edits the words, Delete). In Draw mode the keys are the Drawing Tool's.
 */
import { ClipboardPaste, Copy, Key, PenTool, Play, Repeat, Scissors, Sparkles, Tag } from 'lucide';
import { command, register, type Command } from '../../kit/commands.ts';
import { t } from '../../kit/i18n.ts';
import { UI } from '../../kit/icons.ts';
import { isLink } from '../draw/model.ts';
import { EFFECTS, hasKey, setLoop, stateAt, type Loop } from './model.ts';
import type { ToAnimEditor } from './editor.ts';

type A = ToAnimEditor;
/** The numbers of times the repeat menu offers (the motion's own, if another, is offered too). */
const TIMES = [2, 3, 5, 10];
/** A repeat, named. */
export const loopName = (l: Loop): string => (l === 'forever' ? t('Loop for ever') : l === 'once' ? t('Play once') : l === 'bounce' ? t('Back and forth') : t('{n} times', { n: l }));
/** The effects' names, by letter. */
const FX_NAMES: Record<string, () => string> = {
  i: () => t('Impact'),
  '3': () => t('3D'),
  d: () => t('Shadow'),
  n: () => t('Neon'),
  o: () => t('Outline'),
  g: () => t('Rainbow'),
  m: () => t('Mirror'),
  w: () => t('Wobble'),
  b: () => t('Blur'),
};
const any = (a: A) => a.sels.length > 0;
const joins = (a: A) => a.sels.every((i) => isLink(a.view.shapes[i]?.k));
const moving = (a: A) => a.mode === 'move';
const loop = (l: Loop) => command<A>({ id: `anim.loop.${l}`, scope: 'anim', label: () => loopName(l), hint: () => (l === 'bounce' ? t('Forward, then back') : undefined), where: ['menu:loop'], pressed: (a) => a.view.loop === l, does: (a) => a.act(setLoop(a.doc, l)) });

const ANIM: Command<A>[] = [
  command<A>({ id: 'anim.play', scope: 'anim', label: (a) => (a?.playing ? t('Pause') : t('Play')), icon: Play, keys: 'Space', at: 'stage', where: ['bar'], document: true, when: moving, pressed: (a) => a.playing, does: (a) => a.toggle() }),
  command<A>({ id: 'anim.fx', scope: 'anim', label: () => t('Effects'), icon: Sparkles, menu: 'fx', where: ['bar'], when: moving, does: () => undefined }),
  ...EFFECTS.map((f) => command<A>({ id: `anim.fx.${f.letter}`, scope: 'anim', label: () => FX_NAMES[f.letter](), where: ['menu:fx'], disabled: (a) => a.sel < 0, pressed: (a) => a.sel >= 0 && stateAt(a.view, a.sel, a.frame).fx.includes(f.letter), does: (a) => a.toggleFx(f.letter) })),
  command<A>({ id: 'anim.draw', scope: 'anim', label: () => t('Draw'), icon: PenTool, where: ['drawer'], document: true, pressed: (a) => !moving(a), does: (a) => a.setMode('draw') }),
  command<A>({ id: 'anim.move', scope: 'anim', label: () => t('Move'), icon: Play, where: ['drawer'], document: true, pressed: moving, does: (a) => a.setMode('move') }),
  command<A>({ id: 'anim.loop', scope: 'anim', label: (a) => loopName(a?.view.loop ?? 'forever'), icon: Repeat, menu: 'loop', where: ['drawer'], document: true, when: moving, does: () => undefined }),
  loop('forever'),
  loop('once'),
  loop('bounce'),
  ...TIMES.map(loop),
  command<A>({ id: 'anim.loop.own', scope: 'anim', label: (a) => loopName(a?.view.loop ?? 'forever'), where: ['menu:loop'], when: (a) => typeof a.view.loop === 'number' && !TIMES.includes(a.view.loop), pressed: () => true, does: () => undefined }),
  // The shapes in hand.
  command<A>({ id: 'anim.key', scope: 'anim', label: () => t('Add a key here'), icon: Key, keys: 'K', at: 'stage', where: ['context'], group: 'keys', when: any, disabled: (a) => a.sels.every((i) => hasKey(a.view, i, a.frame)), does: (a) => a.key() }),
  command<A>({ id: 'anim.unkey', scope: 'anim', label: () => t('Remove this key'), icon: UI.close, where: ['context'], group: 'keys', when: any, disabled: (a) => !a.sels.some((i) => hasKey(a.view, i, a.frame)), does: (a) => a.removeKeyHere() }),
  command<A>({ id: 'anim.words', scope: 'anim', label: () => t('Edit the words'), icon: Tag, keys: 'Enter', at: 'stage', where: ['context'], group: 'edit', when: any, disabled: (a) => a.sels.length !== 1 || isLink(a.view.shapes[a.sel]?.k), does: (a) => a.editWords() }),
  command<A>({ id: 'anim.duplicate', scope: 'anim', label: () => t('Duplicate'), icon: Copy, keys: 'Mod+D', at: 'stage', where: ['context'], group: 'edit', when: any, disabled: joins, does: (a) => a.duplicateSel() }),
  command<A>({ id: 'anim.copy', scope: 'anim', label: () => t('Copy'), icon: UI.copy, keys: 'Mod+C', native: true, where: ['context'], group: 'clip', when: any, disabled: joins, does: (a) => a.copyOut(false) }),
  command<A>({ id: 'anim.cut', scope: 'anim', label: () => t('Cut'), icon: Scissors, keys: 'Mod+X', native: true, where: ['context'], group: 'clip', when: any, disabled: joins, does: (a) => a.copyOut(true) }),
  command<A>({ id: 'anim.paste', scope: 'anim', label: () => t('Paste'), icon: ClipboardPaste, keys: 'Mod+V', native: true, where: ['context'], group: 'clip', when: any, does: (a) => a.pasteIn() }),
  command<A>({ id: 'anim.delete', scope: 'anim', label: () => t('Delete'), icon: UI.trash, keys: 'Delete / Backspace', at: 'stage', where: ['context'], group: 'delete', when: any, does: (a) => a.removeSel() }),
  // The stage's keys.
  command<A>({ id: 'anim.step', scope: 'anim', label: () => t('A frame back, a frame on'), keys: ', / .', at: 'stage', where: ['keys-only'], does: (a, e) => a.seek(a.frame + (e instanceof KeyboardEvent && (e.key === ',' || e.key === '<') ? -1 : 1)) }),
  command<A>({ id: 'anim.ends', scope: 'anim', label: () => t('The first frame, the last'), keys: 'Home / End', at: 'stage', where: ['keys-only'], does: (a, e) => a.seek(e instanceof KeyboardEvent && e.key === 'Home' ? 0 : a.view.frames - 1) }),
  command<A>({ id: 'anim.nudge', scope: 'anim', label: () => t('Nudge the shapes in hand; with none, step a frame'), keys: ['', 'Shift+', 'Mod+'].map((m) => ['ArrowLeft', 'ArrowRight', 'ArrowUp', 'ArrowDown'].map((k) => m + k).join(' / ')).join(' / '), at: 'stage', where: ['keys-only'], does: (a, e) => e instanceof KeyboardEvent && a.arrowKey(e) }),
  command<A>({ id: 'anim.all', scope: 'anim', label: () => t('Choose every shape'), keys: 'Mod+A', at: 'stage', where: ['keys-only'], does: (a) => a.selectAll() }),
  command<A>({ id: 'anim.out', scope: 'anim', label: () => t('Stop the playing, then let the shapes go'), keys: 'Escape', at: 'stage', where: ['keys-only'], does: (a) => a.stepOut() }),
];

export default register(ANIM) as Command<A>[];
