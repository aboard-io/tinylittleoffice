/**
 * The Kanban Board's commands (kit/commands.ts), its editor the context: the bar (Insert ▾ with a card, a checklist
 * item and a stage; the marks and Link, which are the words' own with the card's <to-text> as their context; Icon;
 * Stages as rows), a stage's menu (Add a card, move it, its limit, its colour, Delete), the board's own items in the
 * bar under chosen cards (Move to the stage before and after) and the keys in a card's words (docs/editing.md §6 and
 * §8): Mod+Alt+Left/Right carry the card to the stage beside (on a stage's name, the stage itself), Alt+Up/Down move
 * the card or the checklist item along, Up and Down go from line to line at the edge of the words, Mod+D duplicates
 * the card, Mod+Enter ticks an item. A key acts on the line it is typed in (`here`, which the editor sets).
 */
import { ArrowDown, ArrowLeft, ArrowRight, ArrowUp, Columns3, ListChecks, Rows3 } from 'lucide';
import { register, type Command, type Words, commandsOf } from '../../kit/commands.ts';
import { t } from '../../kit/i18n.ts';
import { UI } from '../../kit/icons.ts';
import { LIMITS, STAGE_COLORS, autoHue, cardsIn, moveStage, removeStage, setLook, setStage, stageOf } from './model.ts';
import type { ToBoardEditor } from './editor.ts';

type B = ToBoardEditor;
const cmd = commandsOf<B>('board');
/** The stage whose menu is open, and its place. */
const menuStage = (b: B) => {
  const m = b.menu;
  const i = m === null ? -1 : b.view.stages.findIndex((s) => s.at === m || (m < 0 && s.at < 0));
  return { i, s: b.view.stages[i] };
};
/** The stages beside the chosen cards. */
const beside = (b: B, by: -1 | 1) => {
  const s = b.rows.range ? b.rows.span() : null;
  const from = s ? stageOf(b.view, cardsIn(b.view, s.from, s.to)) : undefined;
  const i = from ? b.view.stages.indexOf(from) : -1;
  return i >= 0 ? b.view.stages[i + by] : undefined;
};
const stageMenu = (id: string, label: Words<B>, rest: Omit<Command<B>, 'id' | 'scope' | 'label' | 'where'>) =>
  cmd(`stage.${id}`, label, { where: ['menu:stage'], ...rest, when: (b) => !!menuStage(b).s && (!rest.when || rest.when(b)) });

const BOARD: Command<B>[] = [
  cmd('insert', 'Insert', { icon: UI.insert, menu: 'insert', where: ['bar'], takesFocus: true, does: () => undefined }),
  cmd('insert.card', 'Card', { icon: UI.plus, where: ['menu:insert'], disabled: (b) => !b.inHand().stage, does: (b) => b.insertCard() }),
  cmd('insert.item', 'Checklist item', { icon: ListChecks, where: ['menu:insert'], disabled: (b) => !b.inHand().card, does: (b) => b.insertItem() }),
  cmd('insert.stage', 'Stage', { icon: Columns3, where: ['menu:insert'], does: (b) => b.newStage() }),
  cmd('icon', 'Icon', { icon: UI.icon, where: ['bar'], disabled: (b) => !b.mark?.isConnected, does: (b) => b.insertIcon() }),
  cmd('rows', 'Stages as rows', { icon: Rows3, where: ['bar'], document: true, pressed: (b) => b.view.rows, does: (b) => b.edit(setLook(b.doc, !b.view.rows)) }),
  cmd('stage', 'Stage options', { menu: 'stage', where: ['in-doc'], does: () => undefined }),
  stageMenu('card', 'Add a card', { icon: UI.plus, does: (b) => menuStage(b).s && b.newCard(menuStage(b).s) }),
  stageMenu('left', 'Move left', { icon: UI.outdent, when: (b) => !b.view.rows, disabled: (b) => menuStage(b).i === 0, does: (b) => b.edit(moveStage(b.view, menuStage(b).i, -1)) }),
  stageMenu('up', 'Move up', { icon: ArrowUp, when: (b) => b.view.rows, disabled: (b) => menuStage(b).i === 0, does: (b) => b.edit(moveStage(b.view, menuStage(b).i, -1)) }),
  stageMenu('right', 'Move right', {
    icon: UI.indent,
    when: (b) => !b.view.rows,
    disabled: (b) => menuStage(b).i === b.view.stages.length - 1,
    does: (b) => b.edit(moveStage(b.view, menuStage(b).i, 1)),
  }),
  stageMenu('down', 'Move down', {
    icon: ArrowDown,
    when: (b) => b.view.rows,
    disabled: (b) => menuStage(b).i === b.view.stages.length - 1,
    does: (b) => b.edit(moveStage(b.view, menuStage(b).i, 1)),
  }),
  ...LIMITS.map((n) =>
    stageMenu(`limit.${n}`, () => (n ? String(n) : t('No limit')), { heading: 'Limit', pressed: (b) => menuStage(b).s?.limit === n, does: (b) => b.edit(setStage(menuStage(b).s, { limit: n })) }),
  ),
  stageMenu('auto', 'Automatic', {
    swatch: (b) => STAGE_COLORS[autoHue(b ? Math.max(0, menuStage(b).i) : 0)].hex,
    heading: 'Color',
    pressed: (b) => !menuStage(b).s?.color,
    does: (b) => b.edit(setStage(menuStage(b).s, { color: '' })),
  }),
  ...Object.entries(STAGE_COLORS).map(([k, c]) =>
    stageMenu(`color.${k}`, c.name, { data: true, swatch: () => c.hex, heading: 'Color', pressed: (b) => menuStage(b).s?.color === k, does: (b) => b.edit(setStage(menuStage(b).s, { color: k })) }),
  ),
  stageMenu('delete', 'Delete stage', { icon: UI.trash, heading: 'Stage', does: (b) => b.edit(removeStage(menuStage(b).s)) }),
  cmd('before', (b) => (b && beside(b, -1) ? t('Move to {stage}', { stage: beside(b, -1)!.name || t('Stage') }) : t('Move to the stage before')), {
    at: 'rows',
    icon: ArrowLeft,
    keys: 'Mod+Alt+ArrowLeft',
    where: ['context'],
    disabled: (b) => !beside(b, -1),
    does: (b) => b.carryChosen(-1),
  }),
  cmd('after', (b) => (b && beside(b, 1) ? t('Move to {stage}', { stage: beside(b, 1)!.name || t('Stage') }) : t('Move to the stage after')), {
    at: 'rows',
    icon: ArrowRight,
    keys: 'Mod+Alt+ArrowRight',
    where: ['context'],
    disabled: (b) => !beside(b, 1),
    does: (b) => b.carryChosen(1),
  }),
  cmd('carry', 'Move the cards to the stage before or after', {
    at: 'words',
    keys: 'Mod+Alt+ArrowLeft / Mod+Alt+ArrowRight',
    when: (b) => !!b.here,
    where: ['keys-only'],
    does: (b, e) => b.carryKey(e instanceof KeyboardEvent && e.key === 'ArrowLeft' ? -1 : 1),
  }),
  cmd('move', 'Move the selected items up or down', {
    at: 'words',
    keys: 'Alt+ArrowUp / Alt+ArrowDown',
    when: (b) => !!b.here,
    where: ['keys-only'],
    does: (b, e) => b.moveKey(e instanceof KeyboardEvent && e.key === 'ArrowUp' ? -1 : 1),
  }),
  cmd('line', 'The next or the one before', {
    at: 'words',
    keys: 'ArrowUp / ArrowDown',
    when: (b) => !!b.here,
    where: ['keys-only'],
    does: (b, e) => b.lineKey(e instanceof KeyboardEvent && e.key === 'ArrowUp'),
  }),
  cmd('duplicate', 'Duplicate', { at: 'words', keys: 'Mod+D', when: (b) => !!b.here, where: ['keys-only'], does: (b) => b.duplicateKey() }),
  cmd('tick', 'Check or uncheck a task', { at: 'words', keys: 'Mod+Enter', when: (b) => !!b.here, where: ['keys-only'], does: (b) => b.tickKey() }),
];
export const CHOSEN = BOARD.filter((c) => c.at === 'rows');
export const WORDS = BOARD.filter((c) => c.at === 'words');

export default register(BOARD) as Command<B>[];
