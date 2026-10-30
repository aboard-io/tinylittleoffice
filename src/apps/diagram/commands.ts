/**
 * The Diagram Maker's commands (kit/core/commands.ts), its editor the context: the bar (the kind ▾, Insert ▾, Join where
 * things join, Print place cards for a seating plan, the zoom), the bar under the thing open (§6's order: Move up,
 * Move down, the kind's own (Add under it, Icon, Add a step, Join, a connection's arrow), a tree's Indent and Bring out,
 * Duplicate | Copy, Cut, Paste | Delete), and the keys (docs/editing.md §8): on a focused thing Enter or Space opens
 * its words (or ends a join on it), Delete takes it away, Mod+D, Alt+Up/Down, Tab and Shift+Tab in a tree,
 * Mod+Alt+Left/Right across, the arrows to the nearest thing; on the picture the first arrow goes in and Escape stops
 * a join; in the words Mod+Enter is done, and Mod+D, Alt+Up/Down and Tab act on the thing open. The thing a key acts
 * on is `here` (the editor sets it as the key comes), else the thing open.
 */
import { ArrowDown, ArrowRight, ArrowUp, ClipboardPaste, CopyPlus, Scissors, Smile, Spline, ZoomIn, ZoomOut } from 'lucide';
import { register, type Command, commandsOf } from '../../kit/core/commands.ts';
import { t } from '../../kit/core/i18n.ts';
import { UI } from '../../kit/draw/icons.ts';
import { KIND_ICON, kindName, thingName } from './kinds.ts';
import { KINDS, canDuplicate, childOf, edgesOf, isListed, isTree, joins, moveThing, newThing, nextThing, type Hit } from './model.ts';
import type { ToDiagramEditor } from './editor.ts';

type G = ToDiagramEditor;
const cmd = commandsOf<G>('diagram');
/** The thing a command acts on: the one the key was typed on, else the thing open. */
const hit = (g: G): Hit | null => g.here ?? g.target?.hit ?? null;
const line = (g: G) => hit(g)?.k === 'line';
const tree = (g: G) => isTree(g.view.kind);
const arrowed = (g: G) => {
  const h = hit(g);
  const e = h?.k === 'edge' ? edgesOf(g.doc).find((x) => x.at === h.at) : undefined;
  return e?.dir === '->' || e?.dir === '<-';
};

const DIAGRAM: Command<G>[] = [
  cmd('kind', (g) => kindName(g?.view.kind ?? 'mind'), { menu: 'kind', where: ['bar'], document: true, takesFocus: true, does: () => undefined }),
  ...KINDS.map((k) => cmd(`kind.${k}`, () => kindName(k), { icon: KIND_ICON[k], where: ['menu:kind'], pressed: (g) => g.view.kind === k, does: (g) => g.setKindTo(k) })),
  cmd('insert', 'common-insert', { icon: UI.insert, menu: 'insert', where: ['bar'], takesFocus: true, does: () => undefined }),
  cmd('insert.thing', (g) => thingName(g?.view.kind ?? 'mind'), { icon: UI.plus, where: ['menu:insert'], does: (g) => g.addThing() }),
  cmd('join', 'diagram-join', { icon: Spline, where: ['bar'], disabled: (g) => !joins(g.view.kind), pressed: (g) => g.joining !== null, does: (g) => g.armJoin() }),
  cmd('cards', 'diagram-print-place-cards', {
    hint: 'diagram-print-place-cards-card-guest',
    icon: UI.print,
    where: ['bar'],
    document: true,
    takesFocus: true,
    when: (g) => g.view.kind === 'seating',
    does: (g) => g.printCards(),
  }),
  cmd('zoomout', 'common-zoom-out', { icon: ZoomOut, where: ['bar'], group: 'zoom', document: true, takesFocus: true, does: (g) => g.zoomBy(-0.25) }),
  cmd('zoomin', 'common-zoom-in', { icon: ZoomIn, where: ['bar'], group: 'zoom', document: true, takesFocus: true, does: (g) => g.zoomBy(0.25) }),
  cmd('up', 'common-move-up', {
    at: 'thing',
    icon: ArrowUp,
    keys: 'Alt+ArrowUp',
    where: ['context'],
    group: 'own',
    when: (g) => !!hit(g),
    context: line,
    disabled: (g) => line(g) && !moveThing(g.doc, hit(g)!, -1),
    does: (g) => g.move(hit(g)!, -1),
  }),
  cmd('down', 'common-move-down', {
    at: 'thing',
    icon: ArrowDown,
    keys: 'Alt+ArrowDown',
    where: ['context'],
    group: 'own',
    when: (g) => !!hit(g),
    context: line,
    disabled: (g) => line(g) && !moveThing(g.doc, hit(g)!, 1),
    does: (g) => g.move(hit(g)!, 1),
  }),
  cmd('add', (g) => (g && tree(g) ? t('diagram-add-under-it') : g && isListed(g.view.kind) ? t('diagram-add-one-more') : t('diagram-add-after-it')), {
    icon: UI.plus,
    where: ['context'],
    group: 'own',
    when: line,
    does: (g) => g.addFrom(tree(g) || isListed(g.view.kind) ? childOf(g.doc, (hit(g) as Extract<Hit, { k: 'line' }>).at) : nextThing(g.doc, hit(g)!)),
  }),
  cmd('icon', 'common-icon', { icon: Smile, where: ['context'], group: 'own', when: line, does: (g) => g.iconFor(hit(g)!) }),
  cmd('step', 'diagram-add-step', {
    icon: UI.plus,
    where: ['context'],
    group: 'own',
    when: (g) => hit(g)?.k === 'lane',
    does: (g) => g.addFrom(newThing(g.doc, (hit(g) as Extract<Hit, { k: 'lane' }>).name)),
  }),
  cmd('joinfrom', 'diagram-join', {
    icon: Spline,
    where: ['context'],
    group: 'own',
    when: (g) => joins(g.view.kind) && !!hit(g) && hit(g)!.k !== 'edge' && !!g.nameOfHit(hit(g)!),
    does: (g) => g.armJoin(),
  }),
  cmd('arrow', (g) => (g && arrowed(g) ? t('diagram-make-it-plain-line') : t('diagram-make-it-arrow')), {
    icon: ArrowRight,
    where: ['context'],
    group: 'own',
    when: (g) => hit(g)?.k === 'edge' && joins(g.view.kind),
    does: (g) => g.toggleArrow(hit(g)!, arrowed(g)),
  }),
  cmd('indent', 'common-indent', {
    at: 'thing',
    icon: UI.indent,
    keys: 'Tab',
    where: ['context'],
    group: 'own',
    when: (g) => line(g) && tree(g),
    disabled: (g) => !g.canShift(hit(g)!, 1),
    does: (g) => g.shift(hit(g)!, 1),
  }),
  cmd('outdent', 'common-bring-out', {
    at: 'thing',
    icon: UI.outdent,
    keys: 'Shift+Tab',
    where: ['context'],
    group: 'own',
    when: (g) => line(g) && tree(g),
    disabled: (g) => !g.canShift(hit(g)!, -1),
    does: (g) => g.shift(hit(g)!, -1),
  }),
  cmd('duplicate', 'common-duplicate', {
    at: 'thing',
    icon: CopyPlus,
    keys: 'Mod+D',
    where: ['context'],
    group: 'own',
    when: (g) => !!hit(g) && canDuplicate(g.doc, hit(g)!),
    does: (g) => g.duplicate(hit(g)!),
  }),
  cmd('copy', 'common-copy', { at: 'thing', icon: UI.copy, keys: 'Mod+C', native: true, where: ['context'], group: 'clip', when: (g) => !!hit(g), does: (g) => g.copyOut(hit(g)!, false) }),
  cmd('cut', 'common-cut', { at: 'thing', icon: Scissors, keys: 'Mod+X', native: true, where: ['context'], group: 'clip', when: (g) => !!hit(g), does: (g) => g.copyOut(hit(g)!, true) }),
  cmd('paste', 'common-paste', { at: 'thing', icon: ClipboardPaste, keys: 'Mod+V', native: true, where: ['context'], group: 'clip', when: (g) => !!hit(g), does: (g) => g.pasteIn(hit(g)) }),
  cmd('delete', 'common-delete', { at: 'thing', icon: UI.trash, keys: 'Delete / Backspace', where: ['context'], group: 'delete', when: (g) => !!hit(g), does: (g) => g.removeHit(hit(g)!) }),
  cmd('open', 'common-edit', { at: 'thing', keys: 'Enter / Space', where: ['keys-only'], when: (g) => !!g.here, does: (g) => g.openKey(g.here!) }),
  cmd('left', 'common-move-left', { at: 'thing', keys: 'Mod+Alt+ArrowLeft', where: ['keys-only'], when: (g) => !!g.here, does: (g) => g.across(g.here!, -1) }),
  cmd('right', 'common-move-right', { at: 'thing', keys: 'Mod+Alt+ArrowRight', where: ['keys-only'], when: (g) => !!g.here, does: (g) => g.across(g.here!, 1) }),
  cmd('nearest', 'common-next-or-one-before', {
    at: 'thing',
    keys: 'ArrowUp / ArrowDown / ArrowLeft / ArrowRight',
    where: ['keys-only'],
    when: (g) => !!g.here,
    does: (g, e) => e instanceof KeyboardEvent && g.nearestKey(e),
  }),
  cmd('into', 'common-next-or-one-before', { at: 'picture', keys: 'ArrowDown / ArrowRight', where: ['keys-only'], when: (g) => !g.here, does: (g) => g.focusFirstThing() }),
  cmd('stop', 'common-step-out-close-collapse-let', { at: 'picture', keys: 'Escape', where: ['keys-only'], when: (g) => g.joining !== null, does: (g) => void (g.joining = null) }),
  cmd('done', 'common-done', { at: 'words', keys: 'Mod+Enter', where: ['keys-only'], does: (g) => g.shutAndFocus() }),
];
/** What the keys on the picture answer, and what they answer in the words (where the thing open is the thing). */
export const PICTURE = DIAGRAM.filter((c) => c.keys && c.at !== 'words');
export const WORDS = DIAGRAM.filter((c) => ['diagram.done', 'diagram.duplicate', 'diagram.up', 'diagram.down', 'diagram.indent', 'diagram.outdent'].includes(c.id));

export default register(DIAGRAM) as Command<G>[];
