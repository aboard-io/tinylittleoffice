/**
 * The Trip Planner's commands (kit/core/commands.ts), its editor the context: the bar (Insert ▾ a place by name or a stop
 * at the map's middle, Measure in ▾, Join the stops in order, Show the whole route, Where I am, Map, Present), the stops' own item
 * in the bar under chosen stops (Show on the map), and the keys (docs/editing.md §8): Mod+Alt+Enter presents from
 * anywhere in the editor; in a stop's words Alt+Up/Down move it, Mod+D duplicates it, Up and Down go to the stop before
 * or after; presenting, the right arrow, Space, Enter and PageDown go on, the left arrow, PageUp and Backspace back,
 * Home and End to the ends, Escape out; on a pin the arrows nudge its stop, Delete takes it away, Escape gives the focus
 * back to the map. A key acts on what `here` says (the stop and its field, or the pin), set as the key comes.
 */
import { Crosshair, LocateFixed, Map as MapIcon, Ruler, Scan, Spline } from 'lucide';
import { register, type Command, commandsOf } from '../../kit/core/commands.ts';
import { UI } from '../../kit/draw/icons.ts';
import { MAX_STOPS, setLinked, setUnits, type Units } from './model.ts';
import type { ToTripEditor } from './editor.ts';

type R = ToTripEditor;
const cmd = commandsOf<R>('trip');
const full = (r: R) => r.view.stops.length >= MAX_STOPS;
const unit = (u: Units, label: string) => cmd(`units.${u}`, label, { where: ['menu:units'], pressed: (r) => r.view.units === u, does: (r) => r.edit(setUnits(r.doc, u)) });
const by = (e?: Event) => (e instanceof KeyboardEvent && e.key === 'ArrowUp' ? -1 : 1);

const TRIP: Command<R>[] = [
  cmd('insert', 'common-insert', { icon: UI.insert, menu: 'insert', where: ['bar'], takesFocus: true, does: () => undefined }),
  cmd('insert.find', 'trip-a-place-by-name', { icon: UI.search, where: ['menu:insert'], disabled: full, does: (r) => r.findPlace() }),
  cmd('insert.middle', 'trip-stop-at-middle-of-map', { icon: Crosshair, where: ['menu:insert'], disabled: (r) => full(r) || !r.hasMap, does: (r) => r.addAtMiddle() }),
  cmd('units', 'trip-measure-in', { icon: Ruler, menu: 'units', where: ['bar'], group: 'route', document: true, takesFocus: true, does: () => undefined }),
  unit('h', 'trip-hours-of-driving'),
  unit('m', 'trip-miles'),
  unit('k', 'trip-kilometers'),
  cmd('linked', 'trip-join-stops-in-order', { icon: Spline, where: ['bar'], group: 'route', document: true, pressed: (r) => r.view.linked, does: (r) => r.edit(setLinked(r.doc, !r.view.linked)) }),
  cmd('fit', 'trip-show-whole-route', { icon: Scan, where: ['bar'], group: 'map', document: true, disabled: (r) => !r.view.stops.length || !r.showMap, does: (r) => r.fit() }),
  cmd('locate', 'trip-where-i-am', { icon: LocateFixed, where: ['bar'], group: 'map', document: true, disabled: (r) => !r.showMap, does: (r) => r.locate() }),
  cmd('map', 'trip-map', { icon: MapIcon, where: ['bar'], group: 'map', document: true, pressed: (r) => r.showMap, does: (r) => r.toggleMap() }),
  cmd('present', 'common-present', { icon: UI.play, keys: 'Mod+Alt+Enter', where: ['bar'], document: true, takesFocus: true, disabled: (r) => !r.view.stops.length, does: (r) => r.present() }),
  cmd('show', 'trip-show-on-map', { at: 'rows', icon: Crosshair, where: ['context'], disabled: (r) => !r.hasMap, does: (r) => r.showChosen() }),
  cmd('move', 'common-move-selected-items-up-or', {
    at: 'words',
    keys: 'Alt+ArrowUp / Alt+ArrowDown',
    where: ['keys-only'],
    when: (r) => !!r.here,
    does: (r, e) => r.moveOne(r.here!.i, by(e), r.here!.field),
  }),
  cmd('duplicate', 'common-duplicate', { at: 'words', keys: 'Mod+D', where: ['keys-only'], when: (r) => !!r.here, does: (r) => r.duplicateOne(r.here!.i, r.here!.field) }),
  cmd('step', 'common-next-or-one-before', { at: 'words', keys: 'ArrowUp / ArrowDown', where: ['keys-only'], when: (r) => !!r.here, does: (r, e) => r.stepStop(by(e)) }),
  cmd('show.next', 'trip-presenting-next-stop', { at: 'show', keys: 'ArrowRight / Space / PageDown / Enter', where: ['keys-only'], does: (r) => r.goStop(r.presenting + 1) }),
  cmd('show.back', 'trip-presenting-stop-before', { at: 'show', keys: 'ArrowLeft / PageUp / Backspace', where: ['keys-only'], does: (r) => r.goStop(r.presenting - 1) }),
  cmd('show.ends', 'trip-first-last', {
    at: 'show',
    keys: 'Home / End',
    where: ['keys-only'],
    does: (r, e) => r.goStop(e instanceof KeyboardEvent && e.key === 'Home' ? 0 : r.view.stops.length - 1),
  }),
  cmd('show.stop', 'common-stop-presenting', { at: 'show', icon: UI.close, keys: 'Escape', where: ['keys-only'], does: (r) => r.endPresenting() }),
  cmd('pin.nudge', 'common-nudge-shapes-in-hand', {
    at: 'pin',
    keys: 'ArrowLeft / ArrowRight / ArrowUp / ArrowDown / Shift+ArrowLeft / Shift+ArrowRight / Shift+ArrowUp / Shift+ArrowDown',
    when: (r) => r.pinAt >= 0,
    where: ['keys-only'],
    does: (r, e) => e instanceof KeyboardEvent && r.nudgePin(e),
  }),
  cmd('pin.delete', 'common-delete', { at: 'pin', keys: 'Delete / Backspace', when: (r) => r.pinAt >= 0, where: ['keys-only'], does: (r) => r.deleteStops([r.pinAt]) }),
  cmd('pin.out', 'common-step-out-close-collapse-let', { at: 'pin', keys: 'Escape', when: (r) => r.pinAt >= 0, where: ['keys-only'], does: (r) => r.leavePin() }),
];
export const AT = (at: string) => TRIP.filter((c) => c.at === at);

export default register(TRIP) as Command<R>[];
