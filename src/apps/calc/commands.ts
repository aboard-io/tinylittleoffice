/**
 * The Calculator's commands (kit/core/commands.ts), its editor the context: the bar (Calculator, Graph, Insert ▾ with the
 * functions and the units, Clear the tape), the entry line's keys (docs/editing.md §8: Enter works the line out, Up
 * and Down recall the tape with no modifier, Escape clears the line, Mod+A twice takes the tape) and a tape line's
 * (Enter puts it down, Escape puts back what it said or chooses it, Alt+Up/Down move it, Shift+Up/Down choose it,
 * Up and Down go between lines, Mod+D copies it, Backspace in an empty line takes it away). A key acts on the line it
 * is typed in (`here`, which the editor sets as the key comes).
 */
import { Calculator, ChartSpline } from 'lucide';
import { register, type Command, commandsOf } from '../../kit/core/commands.ts';
import { t } from '../../kit/core/i18n.ts';
import { UI } from '../../kit/draw/icons.ts';
import type { ToCalcEditor } from './editor.ts';

type K = ToCalcEditor;
const cmd = commandsOf<K>('calc');
const graph = (k?: K) => k?.view.mode === 'graph';
/** Insert ▾: what is typed into the line where its caret is. */
const typed = (id: string, label: string, words: string, heading: string) => cmd(`insert.${id}`, label, { hint: () => words, heading, where: ['menu:insert'], does: (k) => k.typeIn(words) });
const fns = 'calc-functions';
const more = 'calc-units-and-algebra';

const CALC: Command<K>[] = [
  cmd('calc', 'common-calculator', { icon: Calculator, where: ['bar'], group: 'mode', document: true, pressed: (k) => !graph(k), does: (k) => k.mode('calc') }),
  cmd('graph', 'calc-graph', { icon: ChartSpline, where: ['bar'], group: 'mode', document: true, pressed: graph, does: (k) => k.mode('graph') }),
  cmd('insert', 'common-insert', { icon: UI.insert, menu: 'insert', where: ['bar'], takesFocus: true, does: () => undefined }),
  typed('sin', 'calc-sine', 'sin(', fns),
  typed('cos', 'calc-cosine', 'cos(', fns),
  typed('tan', 'calc-tangent', 'tan(', fns),
  typed('ln', 'calc-natural-log', 'ln(', fns),
  typed('log', 'calc-log-base-ten', 'log(', fns),
  typed('sqrt', 'calc-square-root', 'sqrt(', fns),
  typed('abs', 'calc-absolute-value', 'abs(', fns),
  typed('factorial', 'calc-factorial', '!', fns),
  typed('e', 'calc-e-number', 'e', fns),
  typed('x', 'calc-x-for-graph', 'x', fns),
  typed('to', 'calc-convert-to', ' to ', more),
  typed('derivative', 'calc-derivative', 'derivative("x^2", "x")', more),
  typed('simplify', 'calc-simplify', 'simplify("2x + 3x")', more),
  cmd('clear', (k) => (graph(k) ? t('calc-clear-graph') : t('calc-clear-tape')), { icon: UI.trash, where: ['bar'], document: true, disabled: (k) => !k.view.lines.length, does: (k) => k.clearTape() }),
  cmd('enter', 'common-done', { at: 'entry', keys: 'Enter', where: ['keys-only'], does: (k) => k.enter() }),
  cmd('recall', 'common-next-or-one-before', {
    at: 'entry',
    keys: 'ArrowUp / ArrowDown',
    where: ['keys-only'],
    does: (k, e) => k.recallKey(e instanceof KeyboardEvent && e.key === 'ArrowUp' ? 1 : -1),
  }),
  cmd('wipe', 'calc-clear-line', { at: 'entry', keys: 'Escape', where: ['keys-only'], when: (k) => !!k.entry, does: (k) => k.setEntry('') }),
  cmd('all', 'common-select-all-words-of-box', { at: 'entry', keys: 'Mod+A', where: ['keys-only'], does: (k, e) => k.allKey(e) }),
  cmd('line.done', 'common-done', { at: 'line', keys: 'Enter', when: (k) => !!k.here, where: ['keys-only'], does: (k) => k.lineDone() }),
  cmd('line.back', 'common-step-out-close-collapse-let', { at: 'line', keys: 'Escape', when: (k) => !!k.here, where: ['keys-only'], does: (k) => k.lineBack() }),
  cmd('line.move', 'common-move-selected-items-up-or', {
    at: 'line',
    keys: 'Alt+ArrowUp / Alt+ArrowDown',
    when: (k) => !!k.here,
    where: ['keys-only'],
    does: (k, e) => k.lineMove(e instanceof KeyboardEvent && e.key === 'ArrowUp' ? -1 : 1),
  }),
  cmd('line.choose', 'common-extend-selection', { at: 'line', keys: 'Shift+ArrowUp / Shift+ArrowDown', when: (k) => !!k.here, where: ['keys-only'], does: (k) => k.lineChoose() }),
  cmd('line.step', 'common-next-or-one-before', {
    at: 'line',
    keys: 'ArrowUp / ArrowDown',
    when: (k) => !!k.here,
    where: ['keys-only'],
    does: (k, e) => k.lineStep(e instanceof KeyboardEvent && e.key === 'ArrowUp' ? -1 : 1),
  }),
  cmd('line.duplicate', 'common-duplicate', { at: 'line', keys: 'Mod+D', when: (k) => !!k.here, where: ['keys-only'], does: (k) => k.lineDuplicate() }),
  cmd('line.all', 'common-select-all-words-of-box', { at: 'line', keys: 'Mod+A', where: ['keys-only'], does: (k, e) => k.allKey(e) }),
  cmd('line.remove', 'common-delete', { at: 'line', keys: 'Backspace', when: (k) => !!k.here, where: ['keys-only'], does: (k) => k.lineRemove() }),
];
export const ENTRY = CALC.filter((c) => c.at === 'entry');
export const LINE = CALC.filter((c) => c.at === 'line');

export default register(CALC) as Command<K>[];
