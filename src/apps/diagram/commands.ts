/**
 * The Diagram Maker's commands (kit/commands.ts), its editor the context: the bar (the kind ▾, Insert ▾, Join where
 * things join, Print place cards for a seating plan, the zoom), the bar under the thing open (§6's order: Move up,
 * Move down, the kind's own (Add under it, Icon, Add a step, Join, a connection's arrow), a tree's Indent and Bring out,
 * Duplicate | Copy, Cut, Paste | Delete), and the keys (docs/editing.md §8): on a focused thing Enter or Space opens
 * its words (or ends a join on it), Delete takes it away, Mod+D, Alt+Up/Down, Tab and Shift+Tab in a tree,
 * Mod+Alt+Left/Right across, the arrows to the nearest thing; on the picture the first arrow goes in and Escape stops
 * a join; in the words Mod+Enter is done, and Mod+D, Alt+Up/Down and Tab act on the thing open. The thing a key acts
 * on is `here` (the editor sets it as the key comes), else the thing open.
 */
import { ArrowDown, ArrowRight, ArrowUp, ClipboardPaste, CopyPlus, Scissors, Smile, Spline, ZoomIn, ZoomOut } from 'lucide';
import { command, register, type Command } from '../../kit/commands.ts';
import { t } from '../../kit/i18n.ts';
import { UI } from '../../kit/icons.ts';
import { KIND_ICON, kindName, thingName } from './kinds.ts';
import { KINDS, canDuplicate, childOf, edgesOf, isListed, isTree, joins, moveThing, newThing, nextThing, type Hit } from './model.ts';
import type { ToDiagramEditor } from './editor.ts';

type G = ToDiagramEditor;
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
  command<G>({ id: 'diagram.kind', scope: 'diagram', label: (g) => kindName(g?.view.kind ?? 'mind'), menu: 'kind', where: ['bar'], document: true, takesFocus: true, does: () => undefined }),
  ...KINDS.map((k) => command<G>({ id: `diagram.kind.${k}`, scope: 'diagram', label: () => kindName(k), icon: KIND_ICON[k], where: ['menu:kind'], pressed: (g) => g.view.kind === k, does: (g) => g.setKindTo(k) })),
  command<G>({ id: 'diagram.insert', scope: 'diagram', label: () => t('Insert'), icon: UI.insert, menu: 'insert', where: ['bar'], takesFocus: true, does: () => undefined }),
  command<G>({ id: 'diagram.insert.thing', scope: 'diagram', label: (g) => thingName(g?.view.kind ?? 'mind'), icon: UI.plus, where: ['menu:insert'], does: (g) => g.addThing() }),
  command<G>({ id: 'diagram.join', scope: 'diagram', label: () => t('Join'), icon: Spline, where: ['bar'], disabled: (g) => !joins(g.view.kind), pressed: (g) => g.joining !== null, does: (g) => g.armJoin() }),
  command<G>({ id: 'diagram.cards', scope: 'diagram', label: () => t('Print place cards'), hint: () => t('Print place cards: a card a guest, eight to a letter sheet, to cut out'), icon: UI.print, where: ['bar'], document: true, takesFocus: true, when: (g) => g.view.kind === 'seating', does: (g) => g.printCards() }),
  command<G>({ id: 'diagram.zoomout', scope: 'diagram', label: () => t('Zoom out'), icon: ZoomOut, where: ['bar'], document: true, takesFocus: true, does: (g) => g.zoomBy(-0.25) }),
  command<G>({ id: 'diagram.zoomin', scope: 'diagram', label: () => t('Zoom in'), icon: ZoomIn, where: ['bar'], document: true, takesFocus: true, does: (g) => g.zoomBy(0.25) }),
  // The thing open (or focused).
  command<G>({ id: 'diagram.up', scope: 'diagram', at: 'thing', label: () => t('Move up'), icon: ArrowUp, keys: 'Alt+ArrowUp', where: ['context'], group: 'own', when: (g) => !!hit(g), context: line, disabled: (g) => line(g) && !moveThing(g.doc, hit(g)!, -1), does: (g) => g.move(hit(g)!, -1) }),
  command<G>({ id: 'diagram.down', scope: 'diagram', at: 'thing', label: () => t('Move down'), icon: ArrowDown, keys: 'Alt+ArrowDown', where: ['context'], group: 'own', when: (g) => !!hit(g), context: line, disabled: (g) => line(g) && !moveThing(g.doc, hit(g)!, 1), does: (g) => g.move(hit(g)!, 1) }),
  command<G>({
    id: 'diagram.add',
    scope: 'diagram',
    label: (g) => (g && tree(g) ? t('Add under it') : g && isListed(g.view.kind) ? t('Add one more') : t('Add after it')),
    icon: UI.plus,
    where: ['context'],
    group: 'own',
    when: line,
    does: (g) => g.addFrom(tree(g) || isListed(g.view.kind) ? childOf(g.doc, (hit(g) as Extract<Hit, { k: 'line' }>).at) : nextThing(g.doc, hit(g)!)),
  }),
  command<G>({ id: 'diagram.icon', scope: 'diagram', label: () => t('Icon'), icon: Smile, where: ['context'], group: 'own', when: line, does: (g) => g.iconFor(hit(g)!) }),
  command<G>({ id: 'diagram.step', scope: 'diagram', label: () => t('Add a step'), icon: UI.plus, where: ['context'], group: 'own', when: (g) => hit(g)?.k === 'lane', does: (g) => g.addFrom(newThing(g.doc, (hit(g) as Extract<Hit, { k: 'lane' }>).name)) }),
  command<G>({ id: 'diagram.joinfrom', scope: 'diagram', label: () => t('Join'), icon: Spline, where: ['context'], group: 'own', when: (g) => joins(g.view.kind) && hit(g)?.k !== 'edge' && !!g.nameOfHit(hit(g)!), does: (g) => g.armJoin() }),
  command<G>({ id: 'diagram.arrow', scope: 'diagram', label: (g) => (g && arrowed(g) ? t('Make it a plain line') : t('Make it an arrow')), icon: ArrowRight, where: ['context'], group: 'own', when: (g) => hit(g)?.k === 'edge' && joins(g.view.kind), does: (g) => g.toggleArrow(hit(g)!, arrowed(g)) }),
  command<G>({ id: 'diagram.indent', scope: 'diagram', at: 'thing', label: () => t('Indent'), icon: UI.indent, keys: 'Tab', where: ['context'], group: 'own', when: (g) => line(g) && tree(g), disabled: (g) => !g.canShift(hit(g)!, 1), does: (g) => g.shift(hit(g)!, 1) }),
  command<G>({ id: 'diagram.outdent', scope: 'diagram', at: 'thing', label: () => t('Bring out'), icon: UI.outdent, keys: 'Shift+Tab', where: ['context'], group: 'own', when: (g) => line(g) && tree(g), disabled: (g) => !g.canShift(hit(g)!, -1), does: (g) => g.shift(hit(g)!, -1) }),
  command<G>({ id: 'diagram.duplicate', scope: 'diagram', at: 'thing', label: () => t('Duplicate'), icon: CopyPlus, keys: 'Mod+D', where: ['context'], group: 'own', when: (g) => !!hit(g) && canDuplicate(g.doc, hit(g)!), does: (g) => g.duplicate(hit(g)!) }),
  command<G>({ id: 'diagram.copy', scope: 'diagram', at: 'thing', label: () => t('Copy'), icon: UI.copy, keys: 'Mod+C', native: true, where: ['context'], group: 'clip', when: (g) => !!hit(g), does: (g) => g.copyOut(hit(g)!, false) }),
  command<G>({ id: 'diagram.cut', scope: 'diagram', at: 'thing', label: () => t('Cut'), icon: Scissors, keys: 'Mod+X', native: true, where: ['context'], group: 'clip', when: (g) => !!hit(g), does: (g) => g.copyOut(hit(g)!, true) }),
  command<G>({ id: 'diagram.paste', scope: 'diagram', at: 'thing', label: () => t('Paste'), icon: ClipboardPaste, keys: 'Mod+V', native: true, where: ['context'], group: 'clip', when: (g) => !!hit(g), does: (g) => g.pasteIn(hit(g)) }),
  command<G>({ id: 'diagram.delete', scope: 'diagram', at: 'thing', label: () => t('Delete'), icon: UI.trash, keys: 'Delete / Backspace', where: ['context'], group: 'delete', when: (g) => !!hit(g), does: (g) => g.removeHit(hit(g)!) }),
  // The keys on a focused thing, on the picture, and in the words.
  command<G>({ id: 'diagram.open', scope: 'diagram', at: 'thing', label: () => t('Edit'), keys: 'Enter / Space', where: ['keys-only'], when: (g) => !!g.here, does: (g) => g.openKey(g.here!) }),
  command<G>({ id: 'diagram.left', scope: 'diagram', at: 'thing', label: () => t('Move left'), keys: 'Mod+Alt+ArrowLeft', where: ['keys-only'], when: (g) => !!g.here, does: (g) => g.across(g.here!, -1) }),
  command<G>({ id: 'diagram.right', scope: 'diagram', at: 'thing', label: () => t('Move right'), keys: 'Mod+Alt+ArrowRight', where: ['keys-only'], when: (g) => !!g.here, does: (g) => g.across(g.here!, 1) }),
  command<G>({ id: 'diagram.nearest', scope: 'diagram', at: 'thing', label: () => t('The next or the one before'), keys: 'ArrowUp / ArrowDown / ArrowLeft / ArrowRight', where: ['keys-only'], when: (g) => !!g.here, does: (g, e) => e instanceof KeyboardEvent && g.nearestKey(e) }),
  command<G>({ id: 'diagram.into', scope: 'diagram', at: 'picture', label: () => t('The next or the one before'), keys: 'ArrowDown / ArrowRight', where: ['keys-only'], when: (g) => !g.here, does: (g) => g.focusFirstThing() }),
  command<G>({ id: 'diagram.stop', scope: 'diagram', at: 'picture', label: () => t('Step out: close, collapse, let go'), keys: 'Escape', where: ['keys-only'], when: (g) => g.joining !== null, does: (g) => void (g.joining = null) }),
  command<G>({ id: 'diagram.done', scope: 'diagram', at: 'words', label: () => t('Done'), keys: 'Mod+Enter', where: ['keys-only'], does: (g) => g.shutAndFocus() }),
];
/** What the keys on the picture answer, and what they answer in the words (where the thing open is the thing). */
export const PICTURE = DIAGRAM.filter((c) => c.keys && c.at !== 'words');
export const WORDS = DIAGRAM.filter((c) => ['diagram.done', 'diagram.duplicate', 'diagram.up', 'diagram.down', 'diagram.indent', 'diagram.outdent'].includes(c.id));

export default register(DIAGRAM) as Command<G>[];
