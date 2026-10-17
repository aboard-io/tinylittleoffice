// The walks' model of the chrome: what a random walk over the shell can do, and when. Pure: the
// node test (test/walks.test.ts) reads it to prove every registry command joins the walk by being registered, and the
// browser walk (test/browser/walks.test.ts) runs it against the real page with fast-check's model-based testing.
//
// A step is a thing a person does: a registry command in force (kit/core/commands.ts, through its `when`), a key, a word
// typed, a tap outside whatever is open, the column scrolled, the drawer, a menu of the bar, Share, the templates, the
// drawer's search by its key (Mod+K), a pinch, a phone's keyboard coming up or going, another app and back. The model says when a step may be
// taken (`allowed`); the walk does it to the page and reads back what is open.
import type { Command } from '../src/kit/core/commands.ts';

export type Size = 'phone' | 'desktop';
/** What is open over the document, the topmost: the menu's drawer, a modal dialog, a menu (a popover), the context bar. */
export type Open = null | 'drawer' | 'dialog' | 'menu' | 'context';

export interface Model {
  app: string;
  /** The app the walk began in: a route away comes back to it. */
  home: string;
  mode: 'editing' | 'presenting';
  open: Open;
  /** Where the focus was when the topmost open thing opened (a description of the element), null when nothing is open. */
  focusWas: string | null;
  /** The column has been scrolled from its top. */
  scrolled: boolean;
  size: Size;
  /** A phone's keyboard is up: the visual viewport is shorter than the window. */
  keyboard: boolean;
}

/** The app families the walks run over, an app each at a time (Calc is a grid of lines). */
export const FAMILIES: Record<string, string[]> = {
  text: ['write', 'outline', 'deck'],
  grid: ['sheet', 'cal', 'calc'],
  canvas: ['draw', 'diagram', 'anim'],
  lists: ['trip', 'board'],
};
/** The scopes in force in every app: the page's, the words', the rows'. */
export const SHARED_SCOPES = ['kit', 'text', 'rows'];

/** The keys a walk presses, as the registry spells them. */
export const KEYS = ['Escape', 'Tab', 'Shift+Tab', 'Enter', 'ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight', 'Mod+A'] as const;
/** The words a walk types. */
export const WORDS = ['tiny', 'little', 'office', 'ok', 'the link', 'café', '12'] as const;

export type Step =
  | { kind: 'command'; id: string }
  | { kind: 'key'; key: (typeof KEYS)[number] }
  | { kind: 'type'; word: string }
  | { kind: 'tap-outside' }
  | { kind: 'tap-doc'; at: number }
  | { kind: 'scroll'; by: number }
  | { kind: 'drawer' }
  | { kind: 'menu'; nth: number }
  | { kind: 'share' }
  | { kind: 'templates' }
  | { kind: 'search' }
  | { kind: 'pinch'; wider: boolean }
  | { kind: 'keyboard'; up: boolean }
  | { kind: 'route'; to: string }
  | { kind: 'back' };

/** A step in words, for the message that names a walk. */
export function stepName(s: Step): string {
  switch (s.kind) {
    case 'command':
      return `run ${s.id}`;
    case 'key':
      return `key ${s.key}`;
    case 'type':
      return `type "${s.word}"`;
    case 'tap-doc':
      return `tap the document at ${s.at.toFixed(2)}`;
    case 'scroll':
      return `scroll the column ${s.by}`;
    case 'menu':
      return `open the bar's menu ${s.nth}`;
    case 'pinch':
      return `pinch ${s.wider ? 'out' : 'in'}`;
    case 'keyboard':
      return `the keyboard ${s.up ? 'up' : 'down'}`;
    case 'route':
      return `go to ${s.to}`;
    default:
      return s.kind;
  }
}

/** The registry commands a family's walk runs: the page's, the words', the rows' and its apps' (a menu is opened as a menu, not run). */
export function familyCommands(all: readonly Command[], family: string): Command[] {
  const scopes = new Set([...SHARED_SCOPES, ...FAMILIES[family]]);
  return all.filter((c) => scopes.has(c.scope) && !c.menu);
}

/**
 * Whether a step may be taken in this state. The model is strict where a person is: no pinch or keyboard on a desktop,
 * nothing opened over a dialog but what the dialog holds (Escape, Tab, the arrows, a tap outside), nothing of the
 * document while presenting but its keys, and a route back only after a route away.
 */
export function allowed(s: Step, m: Model, cmd?: Command): boolean {
  const modal = m.open === 'drawer' || m.open === 'dialog';
  switch (s.kind) {
    case 'command':
      // A command of an app is the open app's; one of the page, the words or the rows is anyone's. Over a modal, none.
      return !modal && !!cmd && (SHARED_SCOPES.includes(cmd.scope) || cmd.scope === m.app);
    case 'key':
    case 'tap-outside':
      return true;
    case 'type':
      return m.mode === 'editing' || modal;
    case 'tap-doc':
    case 'scroll':
      return !modal;
    case 'drawer':
    case 'share':
    case 'templates':
    case 'search':
    case 'menu':
      return !modal && m.mode === 'editing';
    case 'pinch':
      return m.size === 'phone' && !modal && m.mode === 'editing';
    case 'keyboard':
      return m.size === 'phone' && m.keyboard !== s.up;
    case 'route':
      return !modal && m.app === m.home && s.to !== m.home;
    case 'back':
      return !modal && m.app !== m.home;
  }
}
