/**
 * The Calculator's commands (kit/commands.ts), its editor the context: the bar (Calculator, Graph, Insert ▾ with the
 * functions and the units, Clear the tape), the entry line's keys (docs/editing.md §8: Enter works the line out, Up
 * and Down recall the tape with no modifier, Escape clears the line, Mod+A twice takes the tape) and a tape line's
 * (Enter puts it down, Escape puts back what it said or chooses it, Alt+Up/Down move it, Shift+Up/Down choose it,
 * Up and Down go between lines, Mod+D copies it, Backspace in an empty line takes it away). A key acts on the line it
 * is typed in (`here`, which the editor sets as the key comes).
 */
import { Calculator, ChartSpline } from 'lucide';
import { command, register, type Command } from '../../kit/commands.ts';
import { t } from '../../kit/i18n.ts';
import { UI } from '../../kit/icons.ts';
import type { ToCalcEditor } from './editor.ts';

type K = ToCalcEditor;
const graph = (k?: K) => k?.view.mode === 'graph';
/** Insert ▾: what is typed into the line where its caret is. */
const typed = (id: string, label: () => string, words: string, heading: () => string) =>
  command<K>({ id: `calc.insert.${id}`, scope: 'calc', label, hint: () => words, heading, where: ['menu:insert'], does: (k) => k.typeIn(words) });
const fns = () => t('Functions');
const more = () => t('Units and algebra');

const CALC: Command<K>[] = [
  command<K>({ id: 'calc.calc', scope: 'calc', label: () => t('Calculator'), icon: Calculator, where: ['bar'], document: true, pressed: (k) => !graph(k), does: (k) => k.mode('calc') }),
  command<K>({ id: 'calc.graph', scope: 'calc', label: () => t('Graph'), icon: ChartSpline, where: ['bar'], document: true, pressed: graph, does: (k) => k.mode('graph') }),
  command<K>({ id: 'calc.insert', scope: 'calc', label: () => t('Insert'), icon: UI.insert, menu: 'insert', where: ['bar'], takesFocus: true, does: () => undefined }),
  typed('sin', () => t('Sine'), 'sin(', fns),
  typed('cos', () => t('Cosine'), 'cos(', fns),
  typed('tan', () => t('Tangent'), 'tan(', fns),
  typed('ln', () => t('Natural log'), 'ln(', fns),
  typed('log', () => t('Log base ten'), 'log(', fns),
  typed('sqrt', () => t('Square root'), 'sqrt(', fns),
  typed('abs', () => t('Absolute value'), 'abs(', fns),
  typed('factorial', () => t('Factorial'), '!', fns),
  typed('e', () => t('e, the number'), 'e', fns),
  typed('x', () => t('x, for a graph'), 'x', fns),
  typed('to', () => t('Convert to'), ' to ', more),
  typed('derivative', () => t('Derivative'), 'derivative("x^2", "x")', more),
  typed('simplify', () => t('Simplify'), 'simplify("2x + 3x")', more),
  command<K>({ id: 'calc.clear', scope: 'calc', label: (k) => (graph(k) ? t('Clear the graph') : t('Clear the tape')), icon: UI.trash, where: ['bar'], document: true, disabled: (k) => !k.view.lines.length, does: (k) => k.clearTape() }),
  // The entry line.
  command<K>({ id: 'calc.enter', scope: 'calc', at: 'entry', label: () => t('Done'), keys: 'Enter', where: ['keys-only'], does: (k) => k.enter() }),
  command<K>({ id: 'calc.recall', scope: 'calc', at: 'entry', label: () => t('The next or the one before'), keys: 'ArrowUp / ArrowDown', where: ['keys-only'], does: (k, e) => k.recallKey(e instanceof KeyboardEvent && e.key === 'ArrowUp' ? 1 : -1) }),
  command<K>({ id: 'calc.wipe', scope: 'calc', at: 'entry', label: () => t('Clear the line'), keys: 'Escape', where: ['keys-only'], when: (k) => !!k.entry, does: (k) => k.setEntry('') }),
  command<K>({ id: 'calc.all', scope: 'calc', at: 'entry', label: () => t('Select all: the words of the box, then everything'), keys: 'Mod+A', where: ['keys-only'], does: (k, e) => k.allKey(e) }),
  // A line of the tape.
  command<K>({ id: 'calc.line.done', scope: 'calc', at: 'line', label: () => t('Done'), keys: 'Enter', when: (k) => !!k.here, where: ['keys-only'], does: (k) => k.lineDone() }),
  command<K>({ id: 'calc.line.back', scope: 'calc', at: 'line', label: () => t('Step out: close, collapse, let go'), keys: 'Escape', when: (k) => !!k.here, where: ['keys-only'], does: (k) => k.lineBack() }),
  command<K>({ id: 'calc.line.move', scope: 'calc', at: 'line', label: () => t('Move the selected items up or down'), keys: 'Alt+ArrowUp / Alt+ArrowDown', when: (k) => !!k.here, where: ['keys-only'], does: (k, e) => k.lineMove(e instanceof KeyboardEvent && e.key === 'ArrowUp' ? -1 : 1) }),
  command<K>({ id: 'calc.line.choose', scope: 'calc', at: 'line', label: () => t('Extend the selection'), keys: 'Shift+ArrowUp / Shift+ArrowDown', when: (k) => !!k.here, where: ['keys-only'], does: (k) => k.lineChoose() }),
  command<K>({ id: 'calc.line.step', scope: 'calc', at: 'line', label: () => t('The next or the one before'), keys: 'ArrowUp / ArrowDown', when: (k) => !!k.here, where: ['keys-only'], does: (k, e) => k.lineStep(e instanceof KeyboardEvent && e.key === 'ArrowUp' ? -1 : 1) }),
  command<K>({ id: 'calc.line.duplicate', scope: 'calc', at: 'line', label: () => t('Duplicate'), keys: 'Mod+D', when: (k) => !!k.here, where: ['keys-only'], does: (k) => k.lineDuplicate() }),
  command<K>({ id: 'calc.line.all', scope: 'calc', at: 'line', label: () => t('Select all: the words of the box, then everything'), keys: 'Mod+A', where: ['keys-only'], does: (k, e) => k.allKey(e) }),
  command<K>({ id: 'calc.line.remove', scope: 'calc', at: 'line', label: () => t('Delete'), keys: 'Backspace', when: (k) => !!k.here, where: ['keys-only'], does: (k) => k.lineRemove() }),
];
export const ENTRY = CALC.filter((c) => c.at === 'entry');
export const LINE = CALC.filter((c) => c.at === 'line');

export default register(CALC) as Command<K>[];
