/**
 * The Board's commands (the kit's registry, kit/core/commands.ts), its editor the context: the bar (Insert ▾ a card
 * after the one in hand or a lane after the one in hand, and the hand-off, the cards opened in the Spreadsheet), a
 * lane's menu (Rename lane, Add a card, Move left, Move right, Narrow lane, Widen lane, Collapse lane or Expand lane,
 * Lane color…, Delete lane; carried only, where the page makes the lanes' changes, `own-lanes`, all but Add a card),
 * the board's own items in the bar under
 * chosen cards (Open, which edits a card's fields in a dialog, and Move to…, a menu of the lanes: a phone's way across,
 * having no drag), the card's dialog's Delete, and the keys (the editing standard, docs/editing.md §6, and the
 * Board's line in §8, which says them for a person). On chosen cards Mod+Left/Right, and the
 * standard's Mod+Alt+Left/Right, carry them to the lane on that side, and Alt+Enter opens one. In a card's title
 * Alt+Up/Down move the card along its lane, Mod+Alt+Left/Right carry it across (Mod+Left/Right stay the caret's: a
 * line's start and end on a Mac, a word on Windows), Up and Down go to the card before or after, Left at the title's
 * start and Right at its end to the card beside it in the lane on that side, Mod+D duplicates it and Alt+Enter opens
 * it. Left and right are the screen's: in a language written right to left the lane before is on the right. A key acts
 * on the card it is typed in (`here`, which the editor sets as the key comes); a lane's menu on the lane whose menu is
 * open (`menuLane`).
 *
 * They are declared in the scope `board`, the app's id, as each app of the suite declares its own; `mount` registers
 * them (the definition's `commands`) before it draws the editor. A label is the id of a message (src/i18n/, the Board's or the suite's
 * `common-…`), said by `t()` in the reader's language; Collapse lane's says what the lane would become, so it is a
 * function of the editor that asks `t()` for one of two.
 */
import { ArrowLeft, ArrowRight, ChevronsLeftRight, ChevronsRightLeft, Columns3, FoldHorizontal, MoveHorizontal, Palette, PanelTop, SquarePen, Table2 } from 'lucide';
import { UI } from '../../kit/draw/icons.ts';
import { commandsOf, register, type Command } from '../../kit/core/commands.ts';
import { t } from '../../kit/core/i18n.ts';
import type { ToBoardEditor } from './editor.ts';

type B = ToBoardEditor;
const cmd = commandsOf<B>('board');
/** Which way a key goes among the lanes: -1 the lane before, 1 the lane after, as the screen shows them. */
const side = (b: B, e?: Event): -1 | 1 => (e instanceof KeyboardEvent ? b.sideOf(e.key) : 1);
const by = (e?: Event): -1 | 1 => (e instanceof KeyboardEvent && e.key === 'ArrowUp' ? -1 : 1);

const BOARD: Command<B>[] = [
  cmd('insert', 'common-insert', { icon: UI.insert, menu: 'insert', where: ['bar'], takesFocus: true, does: () => undefined }),
  cmd('card.new', 'board-card', { icon: UI.plus, where: ['menu:insert'], does: (b) => b.insertCard() }),
  cmd('lane.new', 'board-lane', { icon: Columns3, where: ['menu:insert'], does: (b) => b.insertLane() }),
  // The hand-off: the same table, as the Spreadsheet draws it, in a tab of its own (the Download table has it too).
  cmd('view.sheet', 'board-open-cards-in-spreadsheet', { icon: Table2, where: ['bar'], document: true, does: (b) => b.openInSheet() }),
  cmd('lane', 'board-lane-options', { menu: 'lane', where: ['in-doc'], does: () => undefined }),
  cmd('lane.rename', 'board-rename-lane', { icon: SquarePen, where: ['menu:lane'], when: (b) => !!b.menuLane, does: (b) => b.renameMenuLane() }),
  cmd('lane.card', 'board-add-card', { icon: UI.plus, where: ['menu:lane'], when: (b) => !!b.menuLane && !b.carryOnly, does: (b) => b.addToLane(b.menuLane!.name) }),
  cmd('lane.left', 'common-move-left', { icon: ArrowLeft, where: ['menu:lane'], when: (b) => !!b.menuLane, disabled: (b) => !b.laneCanMove(-1), does: (b) => b.moveMenuLane(-1) }),
  cmd('lane.right', 'common-move-right', { icon: ArrowRight, where: ['menu:lane'], when: (b) => !!b.menuLane, disabled: (b) => !b.laneCanMove(1), does: (b) => b.moveMenuLane(1) }),
  // The lane's look (editor.ts, A lane's look): a step narrower or wider, folded to a strip or opened, and its color from the palette.
  cmd('lane.narrow', 'board-narrow-lane', {
    icon: ChevronsRightLeft,
    where: ['menu:lane'],
    when: (b) => !!b.menuLane,
    disabled: (b) => b.menuLook().width === 'narrow',
    does: (b) => b.sizeMenuLane(-1),
  }),
  cmd('lane.widen', 'board-widen-lane', { icon: ChevronsLeftRight, where: ['menu:lane'], when: (b) => !!b.menuLane, disabled: (b) => b.menuLook().width === 'wide', does: (b) => b.sizeMenuLane(1) }),
  cmd('lane.collapse', (b) => (b?.menuLook().collapsed ? t('board-expand-lane') : t('board-collapse-lane')), {
    icon: FoldHorizontal,
    where: ['menu:lane'],
    when: (b) => !!b.menuLane,
    does: (b) => b.foldMenuLane(),
  }),
  cmd('lane.color', 'board-lane-color', { icon: Palette, where: ['menu:lane'], when: (b) => !!b.menuLane, takesFocus: true, does: (b) => b.colorMenu() }),
  cmd('lane.delete', 'board-delete-lane', { icon: UI.trash, where: ['menu:lane'], when: (b) => !!b.menuLane, does: (b) => b.deleteMenuLane() }),
  // Chosen cards: the bar under them, and their keys.
  cmd('card.open', 'common-open', {
    at: 'rows',
    icon: PanelTop,
    keys: 'Alt+Enter',
    where: ['context'],
    takesFocus: true,
    disabled: (b) => !b.chosenOne(),
    does: (b) => b.openCard(b.chosenOne()!.row),
  }),
  cmd('card.moveto', 'board-move-to', { at: 'rows', icon: MoveHorizontal, where: ['context'], takesFocus: true, disabled: (b) => b.view.lanes.length < 2, does: (b) => b.moveToMenu() }),
  cmd('card.move-left', 'common-move-left', { at: 'rows', keys: 'Mod+ArrowLeft / Mod+Alt+ArrowLeft', where: ['keys-only'], when: (b) => !!b.rows.range, does: (b, e) => b.carryChosen(side(b, e)) }),
  cmd('card.move-right', 'common-move-right', {
    at: 'rows',
    keys: 'Mod+ArrowRight / Mod+Alt+ArrowRight',
    where: ['keys-only'],
    when: (b) => !!b.rows.range,
    does: (b, e) => b.carryChosen(side(b, e)),
  }),
  // The dialog's Delete: the card whose fields it holds.
  cmd('card.delete', 'common-delete', { icon: UI.trash, where: ['in-doc'], when: (b) => !!b.opened, does: (b) => b.deleteOpened() }),
  // The keys in a card's title.
  cmd('title.open', 'common-open', { at: 'words', keys: 'Alt+Enter', where: ['keys-only'], when: (b) => !!b.here, does: (b) => b.openCard(b.here!.row) }),
  cmd('card.move-up', 'common-move-up', { at: 'words', keys: 'Alt+ArrowUp', where: ['keys-only'], when: (b) => !!b.here, does: (b) => b.moveOne(b.here!, -1) }),
  cmd('card.move-down', 'common-move-down', { at: 'words', keys: 'Alt+ArrowDown', where: ['keys-only'], when: (b) => !!b.here, does: (b) => b.moveOne(b.here!, 1) }),
  cmd('title.across', 'board-move-card-to-lane-before-or', {
    at: 'words',
    keys: 'Mod+Alt+ArrowLeft / Mod+Alt+ArrowRight',
    where: ['keys-only'],
    when: (b) => !!b.here,
    does: (b, e) => b.carryOne(b.here!, side(b, e)),
  }),
  cmd('step', 'common-next-or-one-before', { at: 'words', keys: 'ArrowUp / ArrowDown', where: ['keys-only'], when: (b) => !!b.here, does: (b, e) => b.stepCard(b.here!, by(e)) }),
  cmd('beside', 'board-card-in-lane-beside', { at: 'words', keys: 'ArrowLeft / ArrowRight', where: ['keys-only'], when: (b) => !!b.here, does: (b, e) => b.besideCard(b.here!, side(b, e)) }),
  cmd('duplicate', 'common-duplicate', { at: 'words', keys: 'Mod+D', where: ['keys-only'], when: (b) => !!b.here, does: (b) => b.duplicateOne(b.here!) }),
];
/** The items in the bar under chosen cards and their keys; the keys in a card's title. */
export const CHOSEN = BOARD.filter((c) => c.at === 'rows');
export const WORDS = BOARD.filter((c) => c.at === 'words');

export default register(BOARD) as Command<B>[];
