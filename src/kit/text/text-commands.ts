/**
 * The words' commands (the registry's 'text' scope, kit/core/commands.ts), in force wherever words are typed: a
 * <to-text> is their context. Its keydown answers their keys (kit/text/text.ts), its selection bubble is drawn from the
 * ones with `where: 'context'`, and an app's bar draws the ones it shows (the Word Processor's marks, the Presentation
 * Builder's, the Outliner's) with its <to-text> as the context: declared once, the same words, icon and keys
 * everywhere.
 *
 * On a phone the bubble is a row of the bottom bar (kit/ui/context.ts) and begins with Cut, Copy and Paste: iOS draws
 * its own callout over the words, and our row is where ours are. They go through the editor's own clipboard path
 * (kit/text/clipboard.ts: our TLO and our HTML); their keys stay the browser's (`native`), which raise the same events.
 */
import { ClipboardPaste, Copy, Scissors } from 'lucide';
import { coarse, register, type Command, commandsOf } from '../core/commands.ts';
import { UI, type IconNode } from '../draw/icons.ts';
import type { Mark } from './textops.ts';
import type { ToText } from './text.ts';
const cmd = commandsOf<ToText>('text');

/** Some words are selected (a range, not a caret). */
const ranged = (x: ToText) => !!x.sel && (x.sel.anchor.block !== x.sel.focus.block || x.sel.anchor.offset !== x.sel.focus.offset);
const rich = (x: ToText) => !x.marksOnly;
const lists = (x: ToText) => !x.marksOnly && x.shape !== 'line';

const mark = (m: Mark, name: string, label: string, icon: IconNode, keys: string): Command<ToText> =>
  cmd(name, label, { icon, keys, where: ['bar', 'context'], group: 'marks', pressed: (x) => !!x.sel && !!x.marks[m], does: (x) => x.exec(m) });

const CUT = cmd('cut', 'common-cut', {
  icon: Scissors,
  keys: 'Mod+X',
  native: true,
  where: ['context'],
  group: 'clip',
  context: () => coarse(),
  disabled: (x) => !ranged(x),
  does: (x) => x.copyOut(true),
});
const COPY = cmd('copy', 'common-copy', {
  icon: Copy,
  keys: 'Mod+C',
  native: true,
  where: ['context'],
  group: 'clip',
  context: () => coarse(),
  disabled: (x) => !ranged(x),
  does: (x) => x.copyOut(false),
});
const PASTE = cmd('paste', 'common-paste', { icon: ClipboardPaste, keys: 'Mod+V', native: true, where: ['context'], group: 'clip', context: () => coarse(), does: (x) => x.pasteIn() });
export const BOLD = mark('b', 'bold', 'bar-bold', UI.bold, 'Mod+B');
export const ITALIC = mark('i', 'italic', 'bar-italic', UI.italic, 'Mod+I');
export const UNDERLINE = mark('u', 'underline', 'bar-underline', UI.underline, 'Mod+U');
export const STRIKE = mark('s', 'strike', 'bar-strikethrough', UI.strike, 'Mod+Shift+X');
export const HIGHLIGHT = mark('h', 'highlight', 'bar-highlight', UI.highlight, 'Mod+Shift+H');
export const CODE = mark('c', 'code', 'editor-code', UI.code, 'Mod+E');
export const LINK = cmd('link', 'common-link', {
  icon: UI.link,
  keys: 'Mod+K',
  where: ['bar', 'context'],
  group: 'link',
  when: rich,
  pressed: (x) => !!x.sel && !!x.marks.href,
  does: (x) => x.exec('link'),
});
export const FOOTNOTE = cmd('footnote', 'bar-footnote', { icon: UI.footnote, where: ['bar', 'context'], group: 'link', when: (x) => x.notes && !x.marksOnly, does: (x) => x.exec('fn') });
export const BULLETS = cmd('bullets', 'bar-bulleted-list', {
  icon: UI.list,
  where: ['bar', 'context'],
  group: 'lists',
  when: lists,
  context: (x) => x.listable(),
  pressed: (x) => x.kind === 'ul',
  does: (x) => x.exec('ul'),
});
export const NUMBERS = cmd('numbers', 'bar-numbered-list', {
  icon: UI.listOrdered,
  where: ['bar', 'context'],
  group: 'lists',
  when: lists,
  context: (x) => x.listable(),
  pressed: (x) => x.kind === 'ol',
  does: (x) => x.exec('ol'),
});
/**
 * Indent and Outdent: an item that can move moves; in a document a plain paragraph is indented as a quote and a
 * quote brought out to one, as "> " makes it (Paul, 2026-10-19: indenting a plain paragraph was greyed out). Tab moves
 * only an item: anywhere else it goes on to move the focus (never trapped).
 */
const listed = (x: { kind: string | null }) => x.kind === 'ul' || x.kind === 'ol';
export const OUTDENT = cmd('outdent', 'common-bring-out', {
  icon: UI.outdent,
  keys: 'Shift+Tab',
  where: ['bar'],
  group: 'lists',
  when: lists,
  disabled: (x) => !x.sel || !(listed(x) || (x.shape === 'doc' && x.kind === 'quote')),
  does: (x, e) => (e instanceof KeyboardEvent ? x.shiftItem(-1) : x.exec('outdent')),
});
export const INDENT = cmd('indent', 'common-indent', {
  icon: UI.indent,
  keys: 'Tab',
  where: ['bar'],
  group: 'lists',
  when: lists,
  disabled: (x) => !x.sel || !(listed(x) || (x.shape === 'doc' && x.kind === 'p')),
  does: (x, e) => (e instanceof KeyboardEvent ? x.shiftItem(1) : x.exec('indent')),
});

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
  CODE,
  LINK,
  FOOTNOTE,
  BULLETS,
  NUMBERS,
  INDENT,
  OUTDENT,
  cmd('up', 'common-move-up', { keys: 'Alt+ArrowUp', where: ['keys-only'], when: (x) => x.shape !== 'line', does: (x) => x.moveItem(-1) }),
  cmd('down', 'common-move-down', { keys: 'Alt+ArrowDown', where: ['keys-only'], when: (x) => x.shape !== 'line', does: (x) => x.moveItem(1) }),
  cmd('tick', 'common-check-or-uncheck-task', { keys: 'Mod+Enter', where: ['keys-only'], when: (x) => x.shape !== 'line', does: (x, e) => x.tick(e) }),
  cmd('all', 'common-select-all-words-of-box', { keys: 'Mod+A', where: ['keys-only'], does: (x) => x.selectAllKey() }),
]) as Command<ToText>[];
