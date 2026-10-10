/**
 * The words' commands (the registry's 'text' scope, kit/commands.ts), in force wherever words are typed: a
 * <to-text> is their context. Its keydown answers their keys (kit/text.ts), its selection bubble is drawn from the
 * ones with `where: 'context'`, and an app's bar draws the ones it shows (the Word Processor's marks, the Presentation
 * Builder's, the Outliner's) with its <to-text> as the context: declared once, the same words, icon and keys
 * everywhere.
 *
 * On a phone the bubble is a row of the bottom bar (kit/context.ts) and begins with Cut, Copy and Paste: iOS draws
 * its own callout over the words, and our row is where ours are. They go through the editor's own clipboard path
 * (kit/clipboard.ts: our TLO and our HTML); their keys stay the browser's (`native`), which raise the same events.
 */
import { ClipboardPaste, Copy, Scissors } from 'lucide';
import { coarse, command, register, type Command } from './commands.ts';
import { t } from './i18n.ts';
import { UI, type IconNode } from './icons.ts';
import type { Mark } from './textops.ts';
import type { ToText } from './text.ts';

/** Some words are selected (a range, not a caret). */
const ranged = (x: ToText) => !!x.sel && (x.sel.anchor.block !== x.sel.focus.block || x.sel.anchor.offset !== x.sel.focus.offset);
const rich = (x: ToText) => !x.marksOnly;
const lists = (x: ToText) => !x.marksOnly && x.shape !== 'line';

const mark = (m: Mark, name: string, label: () => string, icon: IconNode, keys: string): Command<ToText> =>
  command<ToText>({ id: `text.${name}`, scope: 'text', label, icon, keys, where: ['bar', 'context'], group: 'marks', pressed: (x) => !!x.sel && !!x.marks[m], does: (x) => x.exec(m) });

export const CUT = command<ToText>({ id: 'text.cut', scope: 'text', label: () => t('Cut'), icon: Scissors, keys: 'Mod+X', native: true, where: ['context'], group: 'clip', context: () => coarse(), disabled: (x) => !ranged(x), does: (x) => x.copyOut(true) });
export const COPY = command<ToText>({ id: 'text.copy', scope: 'text', label: () => t('Copy'), icon: Copy, keys: 'Mod+C', native: true, where: ['context'], group: 'clip', context: () => coarse(), disabled: (x) => !ranged(x), does: (x) => x.copyOut(false) });
export const PASTE = command<ToText>({ id: 'text.paste', scope: 'text', label: () => t('Paste'), icon: ClipboardPaste, keys: 'Mod+V', native: true, where: ['context'], group: 'clip', context: () => coarse(), does: (x) => x.pasteIn() });
export const BOLD = mark('b', 'bold', () => t('Bold'), UI.bold, 'Mod+B');
export const ITALIC = mark('i', 'italic', () => t('Italic'), UI.italic, 'Mod+I');
export const UNDERLINE = mark('u', 'underline', () => t('Underline'), UI.underline, 'Mod+U');
export const STRIKE = mark('s', 'strike', () => t('Strikethrough'), UI.strike, 'Mod+Shift+X');
export const HIGHLIGHT = mark('h', 'highlight', () => t('Highlight'), UI.highlight, 'Mod+Shift+H');
export const LINK = command<ToText>({ id: 'text.link', scope: 'text', label: () => t('Link'), icon: UI.link, keys: 'Mod+K', where: ['bar', 'context'], group: 'link', when: rich, pressed: (x) => !!x.sel && !!x.marks.href, does: (x) => x.exec('link') });
export const FOOTNOTE = command<ToText>({ id: 'text.footnote', scope: 'text', label: () => t('Footnote'), icon: UI.footnote, where: ['bar', 'context'], group: 'link', when: (x) => x.notes && !x.marksOnly, does: (x) => x.exec('fn') });
export const BULLETS = command<ToText>({ id: 'text.bullets', scope: 'text', label: () => t('Bulleted list'), icon: UI.list, where: ['bar', 'context'], group: 'lists', when: lists, context: (x) => x.listable(), pressed: (x) => x.kind === 'ul', does: (x) => x.exec('ul') });
export const NUMBERS = command<ToText>({ id: 'text.numbers', scope: 'text', label: () => t('Numbered list'), icon: UI.listOrdered, where: ['bar', 'context'], group: 'lists', when: lists, context: (x) => x.listable(), pressed: (x) => x.kind === 'ol', does: (x) => x.exec('ol') });
/** Indent and Bring out: an item that can move moves; anywhere else Tab goes on to move the focus (never trapped). */
export const OUTDENT = command<ToText>({ id: 'text.outdent', scope: 'text', label: () => t('Bring out'), icon: UI.outdent, keys: 'Shift+Tab', where: ['bar'], when: lists, disabled: (x) => !x.sel || (x.kind !== 'ul' && x.kind !== 'ol'), does: (x, e) => (e instanceof KeyboardEvent ? x.shiftItem(-1) : x.exec('outdent')) });
export const INDENT = command<ToText>({ id: 'text.indent', scope: 'text', label: () => t('Indent'), icon: UI.indent, keys: 'Tab', where: ['bar'], when: lists, disabled: (x) => !x.sel || (x.kind !== 'ul' && x.kind !== 'ol'), does: (x, e) => (e instanceof KeyboardEvent ? x.shiftItem(1) : x.exec('indent')) });

/** Every command of the words, in the order the bubble and the shortcuts dialog list them. */
export const TEXT_COMMANDS = register([
  CUT,
  COPY,
  PASTE,
  BOLD,
  ITALIC,
  UNDERLINE,
  STRIKE,
  HIGHLIGHT,
  LINK,
  FOOTNOTE,
  BULLETS,
  NUMBERS,
  INDENT,
  OUTDENT,
  command<ToText>({ id: 'text.up', scope: 'text', label: () => t('Move up'), keys: 'Alt+ArrowUp', where: ['keys-only'], when: (x) => x.shape !== 'line', does: (x) => x.moveItem(-1) }),
  command<ToText>({ id: 'text.down', scope: 'text', label: () => t('Move down'), keys: 'Alt+ArrowDown', where: ['keys-only'], when: (x) => x.shape !== 'line', does: (x) => x.moveItem(1) }),
  command<ToText>({ id: 'text.tick', scope: 'text', label: () => t('Tick or untick a task'), keys: 'Mod+Enter', where: ['keys-only'], when: (x) => x.shape !== 'line', does: (x, e) => x.tick(e) }),
  command<ToText>({ id: 'text.all', scope: 'text', label: () => t('Select all: the words of the box, then everything'), keys: 'Mod+A', where: ['keys-only'], does: (x) => x.selectAllKey() }),
]) as Command<ToText>[];
