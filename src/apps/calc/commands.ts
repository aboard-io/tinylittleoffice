/**
 * The Calculator's commands (kit/commands.ts), its editor the context: the bar (Calculator, Graph, Insert ▾ with the
 * functions and the units, Clear the tape), the entry line's keys (docs/editing.md §8: Enter works the line out, Up
 * and Down recall the tape with no modifier, Escape clears the line, Mod+A twice takes the tape) and a tape line's
 * (Enter puts it down, Escape puts back what it said or chooses it, Alt+Up/Down move it, Shift+Up/Down choose it,
 * Up and Down go between lines, Mod+D copies it, Backspace in an empty line takes it away). A key acts on the line it
 * is typed in (`here`, which the editor sets as the key comes).
 */
import { Calculator, ChartSpline } from 'lucide';
import { register, type Command, commandsOf } from '../../kit/commands.ts';
import { t } from '../../kit/i18n.ts';
import { UI } from '../../kit/icons.ts';
import type { ToCalcEditor } from './editor.ts';

type K = ToCalcEditor;
const cmd = commandsOf<K>('calc');
const graph = (k?: K) => k?.view.mode === 'graph';
/** Insert ▾: what is typed into the line where its caret is. */
const typed = (id: string, label: string, words: string, heading: string) =>
  cmd(`insert.${id}`, label, { hint: () => words, heading, where: ['menu:insert'], does: (k) => k.typeIn(words) });
const fns = 'Functions';
const more = 'Units and algebra';

const CALC: Command<K>[] = [
  cmd('calc', 'Calculator', { icon: Calculator, where: ['bar'], document: true, pressed: (k) => !graph(k), does: (k) => k.mode('calc') }),
  cmd('graph', 'Graph', { icon: ChartSpline, where: ['bar'], document: true, pressed: graph, does: (k) => k.mode('graph') }),
  cmd('insert', 'Insert', { icon: UI.insert, menu: 'insert', where: ['bar'], takesFocus: true, does: () => undefined }),
  typed('sin', 'Sine', 'sin(', fns),
  typed('cos', 'Cosine', 'cos(', fns),
  typed('tan', 'Tangent', 'tan(', fns),
  typed('ln', 'Natural log', 'ln(', fns),
  typed('log', 'Log base ten', 'log(', fns),
  typed('sqrt', 'Square root', 'sqrt(', fns),
  typed('abs', 'Absolute value', 'abs(', fns),
  typed('factorial', 'Factorial', '!', fns),
  typed('e', 'e, the number', 'e', fns),
  typed('x', 'x, for a graph', 'x', fns),
  typed('to', 'Convert to', ' to ', more),
  typed('derivative', 'Derivative', 'derivative("x^2", "x")', more),
  typed('simplify', 'Simplify', 'simplify("2x + 3x")', more),
  cmd('clear', (k) => (graph(k) ? t('Clear the graph') : t('Clear the tape')), { icon: UI.trash, where: ['bar'], document: true, disabled: (k) => !k.view.lines.length, does: (k) => k.clearTape() }),
  cmd('enter', 'Done', { at: 'entry', keys: 'Enter', where: ['keys-only'], does: (k) => k.enter() }),
  cmd('recall', 'The next or the one before', { at: 'entry', keys: 'ArrowUp / ArrowDown', where: ['keys-only'], does: (k, e) => k.recallKey(e instanceof KeyboardEvent && e.key === 'ArrowUp' ? 1 : -1) }),
  cmd('wipe', 'Clear the line', { at: 'entry', keys: 'Escape', where: ['keys-only'], when: (k) => !!k.entry, does: (k) => k.setEntry('') }),
  cmd('all', 'Select all: the words of the box, then everything', { at: 'entry', keys: 'Mod+A', where: ['keys-only'], does: (k, e) => k.allKey(e) }),
  cmd('line.done', 'Done', { at: 'line', keys: 'Enter', when: (k) => !!k.here, where: ['keys-only'], does: (k) => k.lineDone() }),
  cmd('line.back', 'Step out: close, collapse, let go', { at: 'line', keys: 'Escape', when: (k) => !!k.here, where: ['keys-only'], does: (k) => k.lineBack() }),
  cmd('line.move', 'Move the selected items up or down', { at: 'line', keys: 'Alt+ArrowUp / Alt+ArrowDown', when: (k) => !!k.here, where: ['keys-only'], does: (k, e) => k.lineMove(e instanceof KeyboardEvent && e.key === 'ArrowUp' ? -1 : 1) }),
  cmd('line.choose', 'Extend the selection', { at: 'line', keys: 'Shift+ArrowUp / Shift+ArrowDown', when: (k) => !!k.here, where: ['keys-only'], does: (k) => k.lineChoose() }),
  cmd('line.step', 'The next or the one before', { at: 'line', keys: 'ArrowUp / ArrowDown', when: (k) => !!k.here, where: ['keys-only'], does: (k, e) => k.lineStep(e instanceof KeyboardEvent && e.key === 'ArrowUp' ? -1 : 1) }),
  cmd('line.duplicate', 'Duplicate', { at: 'line', keys: 'Mod+D', when: (k) => !!k.here, where: ['keys-only'], does: (k) => k.lineDuplicate() }),
  cmd('line.all', 'Select all: the words of the box, then everything', { at: 'line', keys: 'Mod+A', where: ['keys-only'], does: (k, e) => k.allKey(e) }),
  cmd('line.remove', 'Delete', { at: 'line', keys: 'Backspace', when: (k) => !!k.here, where: ['keys-only'], does: (k) => k.lineRemove() }),
];
export const ENTRY = CALC.filter((c) => c.at === 'entry');
export const LINE = CALC.filter((c) => c.at === 'line');

export default register(CALC) as Command<K>[];
