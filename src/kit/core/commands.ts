/**
 * The command registry: every thing a person can do from a bar, a menu, a context bar, the drawer or a key, declared
 * once. A command is an id, its words (through t()), an icon, its keys, the scope it is bound in, where it is drawn,
 * when it is in force, and what it does to its scope's context: the shell for 'kit', a <to-text> for 'text', an app's
 * editor element for that app's id. The kit's are keys.ts, the words' text-commands.ts, the rows' rows-commands.ts,
 * an app's its own commands.ts beside its editor (reached through AppDef.commands). Everything else is drawn or
 * checked from these:
 *
 * - the bars (bar.ts `cmdTool`), the menus (`menuOf`), the context bars and the selection bubble (`entryOf`);
 * - the keys: each scope's element answers its own keydown with `runKey(e, its commands, its context)`, inner first
 *   (the words inside an app inside the page), and a key an inner scope took is not an outer one's;
 * - the shortcuts dialog and the drawer's search for anything (kit/ui/drawer.ts), which read the registry as the page runs;
 * - docs/editing.md's tables and the skill's list of commands (scripts/commands.ts, `npm run commands`);
 * - the graph lints (test/commands.test.ts): no key bound twice in one chain of scopes unless allowed, every bar
 *   command reachable by its keys or the bar's arrows, every label a message of en.ftl, every command run by a test.
 *
 * A command's words are a message's id (src/i18n/en.ftl), put through t() when drawn (a function of the context only where they say what
 * is in hand), and a scope declares its commands through its maker (`commandsOf`), terse, since an app's load with it.
 * Rows that are data rather than commands (themes, inks, a new document of each app) are `data: true`: drawn and found
 * by the drawer's search, left out of the generated tables. Menus whose rows are the document's data and not commands
 * stay hand-built and are not to be moved here: the sheet's column kinds and formula functions, the deck's
 * slide-document menu, the outline's line menu, the calendar's date and time-zone dialogs, and themes and inks wherever they are
 * not rows of a menu here already.
 *
 * Keys are written "Mod+Alt+Shift+Key" (Mod is ⌘ on Apple devices, Ctrl elsewhere), alternatives joined by " / ";
 * the key is a letter in capitals, a digit, a sign (".", ",", "[", "=", "/"), or a key's name (Enter, Escape, Tab,
 * Space, Delete, Backspace, ArrowUp…, Home, End, PageUp, PageDown, F2). keysText() is the one place they are spelled
 * for a person, a Mac's way or Windows'. Nothing here touches the DOM: the lints and the scripts read it under node.
 */
import type { IconNode } from 'lucide';
import { t } from './i18n.ts';

/** Words a command shows: a message's id, put through t() when drawn, or, where they say what is in hand, a function of the context. */
export type Words<C, R = string> = string | ((c?: C) => R);
/** Words drawn in this context (none in hand: undefined). */
export const say = <C, R extends string | undefined>(w: Words<C, R> | undefined, c?: C): R | string | undefined => (typeof w === 'string' ? t(w) : w?.(c));

/** Where a command is drawn: the app's bar, a menu of it (`menu:align`), the context bar, the drawer's This document, in the document itself (a row's number, a task's options), or nowhere (a key alone). */
export type Where = 'bar' | `menu:${string}` | 'context' | 'drawer' | 'in-doc' | 'keys-only';

// The context a command acts on is its scope's own (the shell, a <to-text>, an editor), typed by each scope's file.
export interface Command<C = any> {
  /** "write.title", "text.bold", "kit.undo": the scope, a dot, a name. */
  id: string;
  /** Its words: a message's id ('bar-bold'), or a function of the context where they say what is in hand ("Move slide up", "Pause"). */
  label: Words<C>;
  icon?: IconNode;
  /** A second line or a tooltip's longer words, through t() (none, given the context, where there is nothing to add). */
  hint?: Words<C, string | undefined>;
  /** The keys that run it, alternatives joined by " / ". */
  keys?: string;
  /** 'kit', 'text', or an app's id. */
  scope: string;
  /**
   * Where in its scope the key is answered: the canvas, a cell, the rail, the show, a card, an entry line. Two commands
   * of one scope may bind the same key at different places (the lints read it); none is everywhere in the scope.
   */
  at?: string;
  where: Where[];
  /** In force: drawn, offered by the drawer's search, answered by its keys. Absent: always. */
  when?: (c: C) => boolean;
  /** Drawn but not to be done now (dimmed; its keys go on to whatever else answers them). */
  disabled?: (c: C) => boolean;
  /** A state it shows (aria-pressed in a bar, a check in a menu). */
  pressed?: (c: C) => boolean;
  /** Toolbars and context bars visually separate commands of different groups. */
  group?: string;
  /** In the context bar only while this holds too (the lists, over whole blocks of words), where the bar shows it always. */
  context?: (c: C) => boolean;
  /** A menu (the bar draws a <to-menu>): its items are the commands drawn in `menu:<this>`. */
  menu?: string;
  /** Words drawn on the button in the icon's place ("S", "M", "L": a text size). */
  letter?: Words<C>;
  /** A colour shown as a dot in the icon's place (a theme's, an ink's). */
  swatch?: (c?: C) => string;
  /** The heading a menu item sits under (Insert ▾'s "A new document"), through t(). */
  heading?: Words<C>;
  /** A row of data (a theme, an ink, a new document of each app), not a command a person learns: drawn and offered by the drawer's search, but left out of the generated tables. */
  data?: boolean;
  /** Needs nothing in hand: shown in the drawer's This document too, so a phone reaches it while the bar is away (reading). */
  document?: boolean;
  /** The key is the browser's (Copy, Cut, Paste raise their own events): listed and drawn, but never taken from a keydown. */
  native?: boolean;
  /** Takes the focus when tapped (a button that opens a dialog); others keep it where it is, so a phone's keyboard stays up. */
  takesFocus?: boolean;
  /** Under a finger, kept at the bar's inline end outside its scroll, always on screen (Undo, Redo: bar.ts, responsive.css). */
  pinned?: boolean;
  /** Done. `false`: it did not apply here after all (Tab where no item can move), and the key goes on. */
  does: (c: C, e?: Event) => unknown;
}

/** A command typed for its context: an identity, for inference. */
export const command = <C>(c: Command<C>): Command<C> => c;
/** A scope's maker: `id` without the scope's prefix, the scope filled in (`const cmd = commandsOf<W>('write')`). */
export const commandsOf =
  <C>(scope: string) =>
  (id: string, label: Words<C>, rest: Omit<Command<C>, 'id' | 'scope' | 'label'>): Command<C> => ({ id: `${scope}.${id}`, scope, label, ...rest });
/** A command's words in this context. */
export const labelOf = <C>(cmd: Command<C>, c?: C): string => say(cmd.label, c) as string;

const all = new Map<string, Command>();

/** Commands put in the registry (an app's when its editor loads; the kit's and the words' when their modules do). The same id again replaces it. */
export function register(cmds: readonly Command[]): readonly Command[] {
  for (const c of cmds) all.set(c.id, c);
  return cmds;
}
/** Every command registered so far. */
export const registered = (): Command[] => [...all.values()];
/** The commands of one scope, in the order they were declared. */
export const inScope = (scope: string): Command[] => registered().filter((c) => c.scope === scope);

/* ---------- running ---------- */

/** Whether a command is in force and may be done in this context. */
export const live = <C>(cmd: Command<C>, c: C): boolean => (cmd.when ? cmd.when(c) : true) && !cmd.disabled?.(c);

/** A hook the tests set to learn which commands ran (test/browser/setup.ts writes the coverage map from it); null in the page. */
export const trace: { ran: ((id: string) => void) | null } = { ran: null };

/** A command done in its context; what it returns (false: it did not apply). */
export function run<C>(cmd: Command<C>, c: C, e?: Event): unknown {
  trace.ran?.(cmd.id);
  return cmd.does(c, e);
}

/* ---------- keys ---------- */

const MODS = ['Mod', 'Alt', 'Shift'] as const;
/** The signs, by the key that types them (its place on the keyboard, whatever the layout or Alt makes of it). */
const SIGNS: Record<string, string> = { Period: '.', Comma: ',', Slash: '/', Backslash: '\\', BracketLeft: '[', BracketRight: ']', Equal: '=', Minus: '-', Semicolon: ';', Quote: "'", Backquote: '`' };
/** A sign typed with Shift, by the sign under it (a US keyboard's), for an event that says no key's place. */
const SHIFTED: Record<string, string> = { '>': '.', '<': ',', '?': '/', '|': '\\', '{': '[', '}': ']', '+': '=', _: '-', ':': ';', '"': "'", '~': '`' };
const NAMES: Record<string, string> = { ' ': 'Space', Esc: 'Escape', Del: 'Delete', Up: 'ArrowUp', Down: 'ArrowDown', Left: 'ArrowLeft', Right: 'ArrowRight' };

/** One key's spelling put in order: "Shift+Mod+b" → "Mod+Shift+B". */
export function normalKey(one: string): string {
  const parts = one.trim().split('+');
  // A "+" key itself would be an empty last part; none is bound, but "Mod++" reads as Mod and "+".
  let key = parts.pop() || '+';
  const mods = new Set(parts.map((p) => (p === 'Ctrl' || p === 'Cmd' || p === 'Meta' ? 'Mod' : p)));
  key = NAMES[key] ?? key;
  if (key.length === 1) key = key.toUpperCase();
  return [...MODS.filter((m) => mods.has(m)), key].join('+');
}
/** A keys string's alternatives, each in order. */
export const keyList = (keys: string | undefined): string[] => (keys ? keys.split(' / ').map(normalKey) : []);

/** A key pressed, spelled as the registry spells it: "Mod+Shift+K", "Alt+ArrowUp", "V", "Space". */
export function keyOf(e: Pick<KeyboardEvent, 'key' | 'code' | 'metaKey' | 'ctrlKey' | 'altKey' | 'shiftKey'>): string {
  let key = e.key;
  if (/^[a-z]$/i.test(key)) key = key.toUpperCase();
  else if (/^Key[A-Z]$/.test(e.code ?? '')) key = e.code.slice(3);
  else if (/^Digit\d$/.test(e.code ?? '')) key = e.code.slice(5);
  else if (SIGNS[e.code]) key = SIGNS[e.code];
  else if (e.shiftKey && SHIFTED[key]) key = SHIFTED[key];
  else key = NAMES[key] ?? key;
  const mods = [e.metaKey || e.ctrlKey ? 'Mod' : '', e.altKey ? 'Alt' : '', e.shiftKey ? 'Shift' : ''].filter(Boolean);
  return [...mods, key].join('+');
}
/** Whether a key pressed is one of a command's. */
const pressedIs = (cmd: Command, key: string): boolean => keyList(cmd.keys).includes(key);

/**
 * A key answered by a scope: the first command among `cmds` in force here whose keys it is runs, and the key stops
 * (its default prevented: the next scope out lets it be). Nothing during an IME's composition, nothing a scope
 * inside already took, nothing the browser owns (`native`). True when a command took it.
 */
export function runKey<C>(e: KeyboardEvent, cmds: readonly Command<C>[], c: C): boolean {
  if (e.defaultPrevented || e.isComposing || ['Meta', 'Control', 'Alt', 'Shift'].includes(e.key)) return false;
  const key = keyOf(e);
  for (const cmd of cmds) {
    if (cmd.native || !pressedIs(cmd, key) || !live(cmd, c)) continue;
    if (run(cmd, c, e) === false) continue;
    e.preventDefault();
    return true;
  }
  return false;
}

/* ---------- spelling ---------- */

const MAC = typeof navigator !== 'undefined' && /Mac|iPhone|iPad/.test(navigator.platform);
const ARROWS: Record<string, string> = { ArrowUp: '↑', ArrowDown: '↓', ArrowLeft: '←', ArrowRight: '→' };

/** Keys as a person reads them on this device (or on a Mac, `mac`): "⌘⇧K" on a Mac, "Ctrl+Shift+K" elsewhere; arrows as arrows; alternatives joined by " / ". */
export function keysText(keys: string, mac = MAC): string {
  return keys
    .split(' / ')
    .map((one) => {
      const parts = normalKey(one).split('+');
      const key = ARROWS[parts[parts.length - 1]] ?? parts[parts.length - 1];
      const mods = parts.slice(0, -1);
      if (mac) return mods.map((m) => ({ Mod: '⌘', Alt: '⌥', Shift: '⇧' })[m]).join('') + key;
      return [...mods.map((m) => (m === 'Mod' ? 'Ctrl' : m)), key].join('+');
    })
    .join(' / ');
}

/** Keys as aria-keyshortcuts says them ("Control+Shift+S Meta+Shift+S" is two): Mod is Meta on a Mac, Control elsewhere. */
export function ariaKeys(keys: string, mac = MAC): string {
  const ARIA: Record<string, string> = { Mod: mac ? 'Meta' : 'Control', Alt: 'Alt', Shift: 'Shift' };
  return keyList(keys)
    .map((one) => {
      const parts = one.split('+');
      const key = parts.pop()!;
      return [...parts.map((m) => ARIA[m]), key].join('+');
    })
    .join(' ');
}

/**
 * Whether the keys are written beside a command: always under a mouse; under a finger only once a keyboard has been
 * seen (a key typed with Ctrl, ⌘ or Alt: a phone's own keyboard types none), since a phone has none to press them on
 * (the review of 2026-10-11). Either way the keys are the control's aria-keyshortcuts, never part of its name.
 */
export const keyboard = { seen: false };
export const chords = (): boolean => keyboard.seen || !coarse();

/* ---------- drawing (plain objects: bar.ts, menu.ts and context.ts draw them) ---------- */

/** What a menu (menu.ts MenuItem) or a context bar (context.ts ContextItem) needs of a command, in its context. */
export interface Drawn {
  label: string;
  /** A menu item's heading. */
  group?: string;
  swatch?: string;
  /** Words in the icon's place (context.ts ContextItem.text). */
  text?: string;
  icon?: IconNode;
  hint?: string;
  keys?: string;
  disabled?: boolean;
  pressed?: boolean;
  checked?: boolean;
  does(): void;
}
/** A command as an item of a menu or a context bar, in this context (null: none in hand, drawn disabled). */
export function drawn<C>(cmd: Command<C>, c: C | null | undefined): Drawn {
  const has = c !== null && c !== undefined;
  const pressed = has && cmd.pressed ? cmd.pressed(c) : undefined;
  return {
    label: labelOf(cmd, has ? c : undefined),
    icon: cmd.icon,
    hint: say(cmd.hint, has ? c : undefined),
    ...(cmd.heading ? { group: say(cmd.heading, has ? c : undefined) } : {}),
    ...(cmd.swatch ? { swatch: cmd.swatch(has ? c : undefined) } : {}),
    ...(cmd.letter ? { text: say(cmd.letter, has ? c : undefined) } : {}),
    keys: cmd.keys,
    disabled: !has || !!cmd.disabled?.(c),
    ...(cmd.pressed ? { pressed: !!pressed, checked: !!pressed } : {}),
    does: () => void (has && run(cmd, c)),
  };
}
/** The commands of a list drawn where `where` says, in force in this context, as menu items. */
export const drawnIn = <C>(cmds: readonly Command<C>[], where: Where, c: C | null | undefined): Drawn[] =>
  cmds
    .filter((cmd) => cmd.where.includes(where) && (c === null || c === undefined || ((!cmd.when || cmd.when(c)) && (where !== 'context' || !cmd.context || cmd.context(c)))))
    .map((cmd) => drawn(cmd, c));
/** The same as a context bar's entries (context.ts): a gap, "|", between groups. */
export function contextOf<C>(cmds: readonly Command<C>[], c: C): (Drawn | '|')[] {
  const sep = '|' as const;
  const out: (Drawn | '|')[] = [];
  let group: string | undefined;
  for (const cmd of cmds) {
    if (!cmd.where.includes('context') || (cmd.when && !cmd.when(c)) || (cmd.context && !cmd.context(c))) continue;
    if (out.length && cmd.group !== group) out.push(sep);
    group = cmd.group;
    out.push(drawn(cmd, c));
  }
  return out;
}

/** Whether the pointer is a finger (a phone, a tablet): the context bar is a row of the bottom bar, and a bar comes with the focus. */
export const coarse = (): boolean => typeof matchMedia !== 'undefined' && matchMedia('(pointer: coarse)').matches;
