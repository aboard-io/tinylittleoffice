/**
 * The command registry: every thing a person can do from a bar, a menu, a context bar, the drawer or a key, declared
 * once. A command is an id, its words (through t()), an icon, its keys, the scope it is bound in, where it is drawn,
 * when it is in force, and what it does to its scope's context: the shell for 'kit', a <to-text> for 'text', an app's
 * editor element for that app's id. The kit's are kit-commands.ts, the words' text-commands.ts, an app's its own
 * commands.ts beside its editor (reached through AppDef.commands). Everything else is drawn or checked from these:
 *
 * - the bars (bar.ts `cmdTool`), the menus (`menuOf`), the context bars and the selection bubble (`entryOf`);
 * - the keys: each scope's element answers its own keydown with `runKey(e, its commands, its context)`, inner first
 *   (the words inside an app inside the page), and a key an inner scope took is not an outer one's;
 * - the shortcuts dialog and the command palette (kit/palette.ts), which read the registry as the page runs;
 * - docs/editing.md's tables and the skill's list of commands (scripts/commands.ts, `npm run commands`);
 * - the graph lints (test/commands.test.ts): no key bound twice in one chain of scopes unless allowed, every bar
 *   command reachable by its keys or the bar's arrows, every label a string of en.ts, every command run by a test.
 *
 * Keys are written "Mod+Alt+Shift+Key" (Mod is ⌘ on Apple devices, Ctrl elsewhere), alternatives joined by " / ";
 * the key is a letter in capitals, a digit, a sign (".", ",", "[", "=", "/"), or a key's name (Enter, Escape, Tab,
 * Space, Delete, Backspace, ArrowUp…, Home, End, PageUp, PageDown, F2). keysText() is the one place they are spelled
 * for a person, a Mac's way or Windows'. Nothing here touches the DOM: the lints and the scripts read it under node.
 */
import type { IconNode } from 'lucide';

/** Where a command is drawn: the app's bar, a menu of it (`menu:align`), the context bar, the drawer's This document, or nowhere (a key alone). */
export type Where = 'bar' | `menu:${string}` | 'context' | 'drawer' | 'keys-only';

// The context a command acts on is its scope's own (the shell, a <to-text>, an editor), typed by each scope's file.
export interface Command<C = any> {
  /** "write.title", "text.bold", "kit.undo": the scope, a dot, a name. */
  id: string;
  /** Its words, through t(); given the context where they say what is in hand ("Move slide up", "Pause"). */
  label: (c?: C) => string;
  icon?: IconNode;
  /** A second line or a tooltip's longer words, through t(). */
  hint?: () => string;
  /** The keys that run it, alternatives joined by " / ". */
  keys?: string;
  /** 'kit', 'text', or an app's id. */
  scope: string;
  where: Where[];
  /** In force: drawn, offered by the palette, answered by its keys. Absent: always. */
  when?: (c: C) => boolean;
  /** Drawn but not to be done now (dimmed; its keys go on to whatever else answers them). */
  disabled?: (c: C) => boolean;
  /** A state it shows (aria-pressed in a bar, a check in a menu). */
  pressed?: (c: C) => boolean;
  /** The context bar draws a gap between commands of different groups (§6's order: edit | copy, cut, paste | delete). */
  group?: string;
  /** In the context bar only while this holds too (the lists, over whole blocks of words), where the bar shows it always. */
  context?: (c: C) => boolean;
  /** A menu (the bar draws a <to-menu>): its items are the commands drawn in `menu:<this>`. */
  menu?: string;
  /** Words drawn on the button in the icon's place ("S", "M", "L": a text size). */
  letter?: () => string;
  /** A colour shown as a dot in the icon's place (a theme's, an ink's). */
  swatch?: (c?: C) => string;
  /** The heading a menu item sits under (Insert ▾'s "A new document"), through t(). */
  heading?: (c?: C) => string;
  /** Needs nothing in hand: shown in the drawer's This document too, so a phone reaches it while the bar is away (reading). */
  document?: boolean;
  /** The key is the browser's (Copy, Cut, Paste raise their own events): listed and drawn, but never taken from a keydown. */
  native?: boolean;
  /** Takes the focus when tapped (a button that opens a dialog); others keep it where it is, so a phone's keyboard stays up. */
  takesFocus?: boolean;
  /** Done. `false`: it did not apply here after all (Tab where no item can move), and the key goes on. */
  does: (c: C, e?: Event) => unknown;
}

/** A command typed for its context: an identity, for inference. */
export const command = <C>(c: Command<C>): Command<C> => c;

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
/** The command with this id. */
export const commandOf = (id: string): Command | undefined => all.get(id);

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
export const pressedIs = (cmd: Command, key: string): boolean => keyList(cmd.keys).includes(key);

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
    label: cmd.label(has ? c : undefined),
    icon: cmd.icon,
    hint: cmd.hint?.(),
    ...(cmd.heading ? { group: cmd.heading(has ? c : undefined) } : {}),
    ...(cmd.swatch ? { swatch: cmd.swatch(has ? c : undefined) } : {}),
    ...(cmd.letter ? { text: cmd.letter() } : {}),
    keys: cmd.keys,
    disabled: !has || !!cmd.disabled?.(c),
    ...(cmd.pressed ? { pressed: !!pressed, checked: !!pressed } : {}),
    does: () => void (has && run(cmd, c)),
  };
}
/** The commands of a list drawn where `where` says, in force in this context, as menu items. */
export const drawnIn = <C>(cmds: readonly Command<C>[], where: Where, c: C | null | undefined): Drawn[] => cmds.filter((cmd) => cmd.where.includes(where) && (c === null || c === undefined || ((!cmd.when || cmd.when(c)) && (where !== 'context' || !cmd.context || cmd.context(c))))).map((cmd) => drawn(cmd, c));
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
