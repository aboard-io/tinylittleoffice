/**
 * The Board's commands (kit/core/commands.ts), its editor the context: the bar (Insert ▾ a card after the one in hand,
 * or a lane after the one in hand), a lane's menu (Add a card, Move left, Move right, Delete lane), the board's own
 * items in the bar under chosen cards (Move to the lane before and after), and the keys in a card's title
 * (docs/editing.md §6): Alt+Up/Down move the card along its lane, Mod+Alt+Left/Right carry it to the lane before or
 * after, Up and Down go to the card before or after, Mod+D duplicates it. A key acts on the card it is typed in
 * (`here`, which the editor sets as the key comes); a lane's menu on the lane whose menu is open (`menuLane`).
 */
import { ArrowLeft, ArrowRight, Columns3 } from 'lucide';
import { register, type Command, commandsOf } from '../../kit/core/commands.ts';
import { t } from '../../kit/core/i18n.ts';
import { UI } from '../../kit/draw/icons.ts';
import type { ToBoardEditor } from './editor.ts';

type B = ToBoardEditor;
const cmd = commandsOf<B>('board');
const side = (e?: Event): -1 | 1 => (e instanceof KeyboardEvent && e.key.endsWith('Left') ? -1 : 1);
const by = (e?: Event): -1 | 1 => (e instanceof KeyboardEvent && e.key === 'ArrowUp' ? -1 : 1);
/** The lane beside the chosen cards, where they can go. */
const beside = (b: B, to: -1 | 1) => b.chosenLane(to);

const BOARD: Command<B>[] = [
  cmd('insert', 'common-insert', { icon: UI.insert, menu: 'insert', where: ['bar'], takesFocus: true, does: () => undefined }),
  cmd('insert.card', 'board-card', { icon: UI.plus, where: ['menu:insert'], does: (b) => b.insertCard() }),
  cmd('insert.lane', 'board-lane', { icon: Columns3, where: ['menu:insert'], does: (b) => b.insertLane() }),
  cmd('lane', 'board-lane-options', { menu: 'lane', where: ['in-doc'], does: () => undefined }),
  cmd('lane.card', 'board-add-card', { icon: UI.plus, where: ['menu:lane'], when: (b) => !!b.menuLane, does: (b) => b.addToLane(b.menuLane!.name) }),
  cmd('lane.left', 'common-move-left', { icon: ArrowLeft, where: ['menu:lane'], when: (b) => !!b.menuLane, disabled: (b) => !b.laneCanMove(-1), does: (b) => b.moveMenuLane(-1) }),
  cmd('lane.right', 'common-move-right', { icon: ArrowRight, where: ['menu:lane'], when: (b) => !!b.menuLane, disabled: (b) => !b.laneCanMove(1), does: (b) => b.moveMenuLane(1) }),
  cmd('lane.delete', 'board-delete-lane', { icon: UI.trash, where: ['menu:lane'], when: (b) => !!b.menuLane, does: (b) => b.deleteMenuLane() }),
  cmd('before', (b) => (b && beside(b, -1) ? t('board-move-to-lane', { lane: beside(b, -1)!.name || '–' }) : t('board-move-to-lane-before')), {
    at: 'rows',
    icon: ArrowLeft,
    keys: 'Mod+Alt+ArrowLeft',
    where: ['context'],
    disabled: (b) => !beside(b, -1),
    does: (b) => b.carryChosen(-1),
  }),
  cmd('after', (b) => (b && beside(b, 1) ? t('board-move-to-lane', { lane: beside(b, 1)!.name || '–' }) : t('board-move-to-lane-after')), {
    at: 'rows',
    icon: ArrowRight,
    keys: 'Mod+Alt+ArrowRight',
    where: ['context'],
    disabled: (b) => !beside(b, 1),
    does: (b) => b.carryChosen(1),
  }),
  cmd('carry', 'board-move-card-to-lane-before-or', {
    at: 'words',
    keys: 'Mod+Alt+ArrowLeft / Mod+Alt+ArrowRight',
    where: ['keys-only'],
    when: (b) => !!b.here,
    does: (b, e) => b.carryOne(b.here!, side(e)),
  }),
  cmd('move', 'common-move-selected-items-up-or', { at: 'words', keys: 'Alt+ArrowUp / Alt+ArrowDown', where: ['keys-only'], when: (b) => !!b.here, does: (b, e) => b.moveOne(b.here!, by(e)) }),
  cmd('step', 'common-next-or-one-before', { at: 'words', keys: 'ArrowUp / ArrowDown', where: ['keys-only'], when: (b) => !!b.here, does: (b, e) => b.stepCard(b.here!, by(e)) }),
  cmd('duplicate', 'common-duplicate', { at: 'words', keys: 'Mod+D', where: ['keys-only'], when: (b) => !!b.here, does: (b) => b.duplicateOne(b.here!) }),
];
/** The items in the bar under chosen cards, and the keys in a card's title. */
export const CHOSEN = BOARD.filter((c) => c.at === 'rows');
export const WORDS = BOARD.filter((c) => c.at === 'words');

export default register(BOARD) as Command<B>[];
