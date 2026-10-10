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
import { command, register, type Command } from '../../kit/commands.ts';
import { t } from '../../kit/i18n.ts';
import { UI } from '../../kit/icons.ts';
import { MAX_STOPS, setLinked, setUnits, type Units } from './model.ts';
import type { ToTripEditor } from './editor.ts';

type R = ToTripEditor;
const full = (r: R) => r.view.stops.length >= MAX_STOPS;
const unit = (u: Units, label: () => string) => command<R>({ id: `trip.units.${u}`, scope: 'trip', label, where: ['menu:units'], pressed: (r) => r.view.units === u, does: (r) => r.edit(setUnits(r.doc, u)) });
const by = (e?: Event) => (e instanceof KeyboardEvent && e.key === 'ArrowUp' ? -1 : 1);

const TRIP: Command<R>[] = [
  command<R>({ id: 'trip.insert', scope: 'trip', label: () => t('Insert'), icon: UI.insert, menu: 'insert', where: ['bar'], takesFocus: true, does: () => undefined }),
  command<R>({ id: 'trip.insert.find', scope: 'trip', label: () => t('A place by name…'), icon: UI.search, where: ['menu:insert'], disabled: full, does: (r) => r.findPlace() }),
  command<R>({ id: 'trip.insert.middle', scope: 'trip', label: () => t('A stop at the middle of the map'), icon: Crosshair, where: ['menu:insert'], disabled: (r) => full(r) || !r.hasMap, does: (r) => r.addAtMiddle() }),
  command<R>({ id: 'trip.units', scope: 'trip', label: () => t('Measure in'), icon: Ruler, menu: 'units', where: ['bar'], document: true, takesFocus: true, does: () => undefined }),
  unit('h', () => t('Hours of driving')),
  unit('m', () => t('Miles')),
  unit('k', () => t('Kilometres')),
  command<R>({ id: 'trip.linked', scope: 'trip', label: () => t('Join the stops in order'), icon: Spline, where: ['bar'], document: true, pressed: (r) => r.view.linked, does: (r) => r.edit(setLinked(r.doc, !r.view.linked)) }),
  command<R>({ id: 'trip.fit', scope: 'trip', label: () => t('Show the whole route'), icon: Scan, where: ['bar'], document: true, disabled: (r) => !r.view.stops.length || !r.showMap, does: (r) => r.fit() }),
  command<R>({ id: 'trip.map', scope: 'trip', label: () => t('Map'), icon: MapIcon, where: ['bar'], document: true, pressed: (r) => r.showMap, does: (r) => (r.showMap = !r.showMap) }),
  command<R>({ id: 'trip.present', scope: 'trip', label: () => t('Present'), hint: () => t('Present: the map flies stop to stop'), icon: UI.play, keys: 'Mod+Alt+Enter', where: ['bar'], document: true, takesFocus: true, disabled: (r) => !r.view.stops.length, does: (r) => r.present() }),
  // Chosen stops (the rows controller draws this after Move down).
  command<R>({ id: 'trip.show', scope: 'trip', at: 'rows', label: () => t('Show on the map'), icon: Crosshair, where: ['context'], disabled: (r) => !r.hasMap, does: (r) => r.showChosen() }),
  // A stop's words.
  command<R>({ id: 'trip.move', scope: 'trip', at: 'words', label: () => t('Move the selected items up or down'), keys: 'Alt+ArrowUp / Alt+ArrowDown', where: ['keys-only'], when: (r) => !!r.here, does: (r, e) => r.moveOne(r.here!.i, by(e), r.here!.field) }),
  command<R>({ id: 'trip.duplicate', scope: 'trip', at: 'words', label: () => t('Duplicate'), keys: 'Mod+D', where: ['keys-only'], when: (r) => !!r.here, does: (r) => r.duplicateOne(r.here!.i, r.here!.field) }),
  command<R>({ id: 'trip.step', scope: 'trip', at: 'words', label: () => t('The next or the one before'), keys: 'ArrowUp / ArrowDown', where: ['keys-only'], when: (r) => !!r.here, does: (r, e) => r.stepStop(by(e)) }),
  // Presenting.
  command<R>({ id: 'trip.show.next', scope: 'trip', at: 'show', label: () => t('Presenting: the next stop'), keys: 'ArrowRight / Space / PageDown / Enter', where: ['keys-only'], does: (r) => r.goStop(r.presenting + 1) }),
  command<R>({ id: 'trip.show.back', scope: 'trip', at: 'show', label: () => t('Presenting: the stop before'), keys: 'ArrowLeft / PageUp / Backspace', where: ['keys-only'], does: (r) => r.goStop(r.presenting - 1) }),
  command<R>({ id: 'trip.show.ends', scope: 'trip', at: 'show', label: () => t('The first, the last'), keys: 'Home / End', where: ['keys-only'], does: (r, e) => r.goStop(e instanceof KeyboardEvent && e.key === 'Home' ? 0 : r.view.stops.length - 1) }),
  command<R>({ id: 'trip.show.stop', scope: 'trip', at: 'show', label: () => t('Stop presenting'), icon: UI.close, keys: 'Escape', where: ['keys-only'], does: (r) => r.endPresenting() }),
  // A focused pin.
  command<R>({ id: 'trip.pin.nudge', scope: 'trip', at: 'pin', label: () => t('Nudge the shapes in hand'), keys: 'ArrowLeft / ArrowRight / ArrowUp / ArrowDown / Shift+ArrowLeft / Shift+ArrowRight / Shift+ArrowUp / Shift+ArrowDown', where: ['keys-only'], does: (r, e) => e instanceof KeyboardEvent && r.nudgePin(e) }),
  command<R>({ id: 'trip.pin.delete', scope: 'trip', at: 'pin', label: () => t('Delete'), keys: 'Delete / Backspace', where: ['keys-only'], does: (r) => r.deleteStops([r.pinAt]) }),
  command<R>({ id: 'trip.pin.out', scope: 'trip', at: 'pin', label: () => t('Step out: close, collapse, let go'), keys: 'Escape', where: ['keys-only'], does: (r) => r.leavePin() }),
];
export const AT = (at: string) => TRIP.filter((c) => c.at === at);

export default register(TRIP) as Command<R>[];
