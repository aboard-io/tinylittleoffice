/**
 * The Trip Planner's commands (kit/commands.ts), its editor the context: the bar (Insert ▾ a place by name or a stop
 * at the map's middle, Measure in ▾, Join the stops in order, Show the whole route, Map, Present), the stops' own item
 * in the bar under chosen stops (Show on the map), and the keys (docs/editing.md §8): Mod+Alt+Enter presents from
 * anywhere in the editor; in a stop's words Alt+Up/Down move it, Mod+D duplicates it, Up and Down go to the stop before
 * or after; presenting, the right arrow, Space, Enter and PageDown go on, the left arrow, PageUp and Backspace back,
 * Home and End to the ends, Escape out; on a pin the arrows nudge its stop, Delete takes it away, Escape gives the focus
 * back to the map. A key acts on what `here` says (the stop and its field, or the pin), set as the key comes.
 */
import { Crosshair, Map as MapIcon, Ruler, Scan, Spline } from 'lucide';
import { register, type Command, commandsOf } from '../../kit/commands.ts';
import { UI } from '../../kit/icons.ts';
import { MAX_STOPS, setLinked, setUnits, type Units } from './model.ts';
import type { ToTripEditor } from './editor.ts';

type R = ToTripEditor;
const cmd = commandsOf<R>('trip');
const full = (r: R) => r.view.stops.length >= MAX_STOPS;
const unit = (u: Units, label: string) => cmd(`units.${u}`, label, { where: ['menu:units'], pressed: (r) => r.view.units === u, does: (r) => r.edit(setUnits(r.doc, u)) });
const by = (e?: Event) => (e instanceof KeyboardEvent && e.key === 'ArrowUp' ? -1 : 1);

const TRIP: Command<R>[] = [
  cmd('insert', 'Insert', { icon: UI.insert, menu: 'insert', where: ['bar'], takesFocus: true, does: () => undefined }),
  cmd('insert.find', 'A place by name…', { icon: UI.search, where: ['menu:insert'], disabled: full, does: (r) => r.findPlace() }),
  cmd('insert.middle', 'A stop at the middle of the map', { icon: Crosshair, where: ['menu:insert'], disabled: (r) => full(r) || !r.hasMap, does: (r) => r.addAtMiddle() }),
  cmd('units', 'Measure in', { icon: Ruler, menu: 'units', where: ['bar'], document: true, takesFocus: true, does: () => undefined }),
  unit('h', 'Hours of driving'),
  unit('m', 'Miles'),
  unit('k', 'Kilometres'),
  cmd('linked', 'Join the stops in order', { icon: Spline, where: ['bar'], document: true, pressed: (r) => r.view.linked, does: (r) => r.edit(setLinked(r.doc, !r.view.linked)) }),
  cmd('fit', 'Show the whole route', { icon: Scan, where: ['bar'], document: true, disabled: (r) => !r.view.stops.length || !r.showMap, does: (r) => r.fit() }),
  cmd('map', 'Map', { icon: MapIcon, where: ['bar'], document: true, pressed: (r) => r.showMap, does: (r) => (r.showMap = !r.showMap) }),
  cmd('present', 'Present', { icon: UI.play, keys: 'Mod+Alt+Enter', where: ['bar'], document: true, takesFocus: true, disabled: (r) => !r.view.stops.length, does: (r) => r.present() }),
  cmd('show', 'Show on the map', { at: 'rows', icon: Crosshair, where: ['context'], disabled: (r) => !r.hasMap, does: (r) => r.showChosen() }),
  cmd('move', 'Move the selected items up or down', { at: 'words', keys: 'Alt+ArrowUp / Alt+ArrowDown', where: ['keys-only'], when: (r) => !!r.here, does: (r, e) => r.moveOne(r.here!.i, by(e), r.here!.field) }),
  cmd('duplicate', 'Duplicate', { at: 'words', keys: 'Mod+D', where: ['keys-only'], when: (r) => !!r.here, does: (r) => r.duplicateOne(r.here!.i, r.here!.field) }),
  cmd('step', 'The next or the one before', { at: 'words', keys: 'ArrowUp / ArrowDown', where: ['keys-only'], when: (r) => !!r.here, does: (r, e) => r.stepStop(by(e)) }),
  cmd('show.next', 'Presenting: the next stop', { at: 'show', keys: 'ArrowRight / Space / PageDown / Enter', where: ['keys-only'], does: (r) => r.goStop(r.presenting + 1) }),
  cmd('show.back', 'Presenting: the stop before', { at: 'show', keys: 'ArrowLeft / PageUp / Backspace', where: ['keys-only'], does: (r) => r.goStop(r.presenting - 1) }),
  cmd('show.ends', 'The first, the last', { at: 'show', keys: 'Home / End', where: ['keys-only'], does: (r, e) => r.goStop(e instanceof KeyboardEvent && e.key === 'Home' ? 0 : r.view.stops.length - 1) }),
  cmd('show.stop', 'Stop presenting', { at: 'show', icon: UI.close, keys: 'Escape', where: ['keys-only'], does: (r) => r.endPresenting() }),
  cmd('pin.nudge', 'Nudge the shapes in hand', { at: 'pin', keys: 'ArrowLeft / ArrowRight / ArrowUp / ArrowDown / Shift+ArrowLeft / Shift+ArrowRight / Shift+ArrowUp / Shift+ArrowDown', when: (r) => r.pinAt >= 0, where: ['keys-only'], does: (r, e) => e instanceof KeyboardEvent && r.nudgePin(e) }),
  cmd('pin.delete', 'Delete', { at: 'pin', keys: 'Delete / Backspace', when: (r) => r.pinAt >= 0, where: ['keys-only'], does: (r) => r.deleteStops([r.pinAt]) }),
  cmd('pin.out', 'Step out: close, collapse, let go', { at: 'pin', keys: 'Escape', when: (r) => r.pinAt >= 0, where: ['keys-only'], does: (r) => r.leavePin() }),
];
export const AT = (at: string) => TRIP.filter((c) => c.at === at);

export default register(TRIP) as Command<R>[];
