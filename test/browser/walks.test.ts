// Random walks over the chrome's state machine (directive r9-walks). The bugs found by hand on a phone (the bar parked
// mid-screen, a dialog cut by the edge, the keyboard taking focus) are invariants broken after some sequence of
// actions; fast-check's model-based testing walks thousands of sequences. The model and its steps are
// test/walks-model.ts; here each step is done to the real page (a registry command in force, a key, a word, a tap, a
// scroll, the drawer, a menu, Share, the templates, the palette, a pinch, a phone's keyboard, another app and back),
// and after every one the invariants are asserted, each failure naming the steps that led to it:
//
//   focus      the focus is inside whatever is open, else inside the document or the chrome; never under aria-hidden
//   back       after Escape (or a tap on a dialog's backdrop) the focus is where it was when the thing opened (or on what
//              was tapped to open it, or, for a command's dialog opened from a button, on the words it acts on)
//   modal      at most one modal <dialog> is open, and none is shown while another is (one hands over to the next)
//   window     the window never scrolls, nor the chrome round the column (the column does)
//   link       the address, flushed, is the document the shell holds, which the kernel writes back as it reads it
//   bar        the app's bar, where it is shown, is one row inside the visible window
//   undo       on a phone, wherever the bar is shown, its Undo is inside the visible window, beside the palette's button
//   hidden     nothing faded away (opacity 0, no pointer) or slid out of the visible window can be tabbed or swiped to:
//              what is away is inert (the phone's bar while reading, kit/chrome.ts)
//   overflow   no words run off the screen sideways; the page is no wider than the window
//   names      everything open has an accessible name
//   keystroke  a word typed costs under the keystroke budget (perf.test.ts: 12 ms of synchronous work)
//   errors     nothing throws
//
// One test per app family at a phone's size (390×844, a coarse pointer) and a desktop's (1440×900). The default
// suite runs short walks from fixed seeds; `npm run walks` runs 200-step walks from fresh seeds. A failure prints the
// seed, the path and the replay path; VITE_WALK_SEED, VITE_WALK_PATH and VITE_WALK_REPLAY replay it.
import { afterAll, afterEach, beforeEach, describe, expect, test, vi } from 'vitest';
import { cdp, page, userEvent } from 'vitest/browser';
import fc from 'fast-check';
import { mount, tick, until } from './helpers.ts';
import { decodeDoc, encodeDoc } from '../../src/kit/codec.ts';
import { appOf } from '../../src/kit/apps.ts';
import { commandOf, inScope, live, register, registered, run, type Command } from '../../src/kit/commands.ts';
import { go, parseHash, routeHash } from '../../src/kit/route.ts';
import { stepSize } from '../../src/kit/zoom.ts';
import { ENVELOPE_KEYS } from '../../src/kit/envelope.ts';
import { parse, write } from '../../src/doc/index.ts';
import { takeHead } from '../../src/doc/tlo.ts';
import type { ToShell } from '../../src/kit/shell.ts';
import type { ToText } from '../../src/kit/text.ts';
import '../../src/kit/keys.ts';
import '../../src/kit/text-commands.ts';
import '../../src/kit/rows-commands.ts';
import { KNOWN } from '../walks-known.ts';
import { allowed, FAMILIES, familyCommands, KEYS, stepName, WORDS, type Model, type Open, type Size, type Step } from '../walks-model.ts';

const env = (import.meta as { env?: Record<string, string | undefined> }).env ?? {};
/** The longest walk: short in the default suite, 200 steps under `npm run walks`. */
const STEPS = Number(env.VITE_WALK_STEPS) || 16;
/** Steps drawn for a walk of STEPS: some are passed over where they are not allowed. */
const DRAWN = STEPS * 3;
/** Walks a test: one in the default suite. */
const RUNS = Number(env.VITE_WALK_RUNS) || 1;
/** A seed to replay; else fixed seeds in the default suite, fresh ones under `npm run walks` (VITE_WALK_FRESH). */
const SEED = env.VITE_WALK_SEED ? Number(env.VITE_WALK_SEED) : undefined;
const PATH = env.VITE_WALK_PATH || undefined;
const REPLAY = env.VITE_WALK_REPLAY || undefined;
const FRESH = !!env.VITE_WALK_FRESH;
/** The keystroke budget of perf.test.ts. */
const KEYSTROKE_MS = 12;

const SIZES: Record<Size, [number, number]> = { phone: [390, 844], desktop: [1440, 900] };
/** How tall a phone's keyboard is. */
const KEYBOARD = 300;

/* ---------- the page's doubles: a finger, a visible window a keyboard shortens, nothing that leaves ---------- */

const coarse = (on: boolean) => cdp().send('Emulation.setTouchEmulationEnabled', on ? { enabled: true, maxTouchPoints: 5 } : { enabled: false });
const REAL_VV = window.visualViewport!;
type FakeVV = EventTarget & { offsetTop: number; offsetLeft: number; pageTop: number; pageLeft: number; width: number; height: number; scale: number };
/** A visual viewport of our own, the window's size until a keyboard takes some of its height. */
function fakeViewport(): FakeVV {
  const vv = Object.assign(new EventTarget(), { offsetTop: 0, offsetLeft: 0, pageTop: 0, pageLeft: 0, width: innerWidth, height: innerHeight, scale: 1 });
  Object.defineProperty(window, 'visualViewport', { configurable: true, value: vv });
  return vv;
}

/** Where the focus was when each dialog or popover opened: a dialog's showModal and a popover's beforetoggle say. */
const openedFrom = new WeakMap<Element, Element | null>();
/** Each showModal() made while another modal was open, said by the next check: stacked, even if closed again within the step. */
const stacked: string[] = [];
const showModal = HTMLDialogElement.prototype.showModal;
function watchOpening() {
  stacked.length = 0;
  HTMLDialogElement.prototype.showModal = function (this: HTMLDialogElement) {
    const under = [...document.querySelectorAll('dialog')].filter((d) => d !== this && d.matches(':modal'));
    if (!this.open && under.length) stacked.push(`${describeEl(this)} was shown over ${under.map(describeEl).join(', ')}`);
    if (!this.open) openedFrom.set(this, document.activeElement);
    return showModal.call(this);
  };
  document.addEventListener('beforetoggle', onBeforeToggle, true);
}
function unwatchOpening() {
  HTMLDialogElement.prototype.showModal = showModal;
  document.removeEventListener('beforetoggle', onBeforeToggle, true);
}
const onBeforeToggle = (e: Event) => {
  if ((e as ToggleEvent).newState === 'open') openedFrom.set(e.target as Element, document.activeElement);
};

/* ---------- the real side ---------- */

interface Layer {
  el: Element;
  kind: Exclude<Open, null>;
}
interface Real {
  shell: ToShell;
  family: string;
  size: Size;
  vv: FakeVV | null;
  /** The steps so far, in words. */
  log: string[];
  /** What is open, in the order it opened. */
  layers: Layer[];
  /** The link to come back to after a route away. */
  backTo: string;
  /** Errors the page raised since the last step. */
  errors: string[];
  /** The focus was tabbed out past a modal's ends (to the browser's own, in a real one). */
  out: boolean;
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
type Ed = any;
const editorOf = (r: Real): Ed => r.shell.editor as Ed;
const column = (r: Real) => r.shell.querySelector<HTMLElement>('.to-main');
const frame = () => new Promise<void>((res) => requestAnimationFrame(() => requestAnimationFrame(() => res())));

/** An element in words, for a message: its tag, its class, its name. */
function describeEl(el: Element | null): string {
  if (!el) return 'nothing';
  if (el === document.body) return 'the body';
  const name = (nameOf(el) || el.getAttribute('title') || (el.textContent ?? '').trim().replace(/\s+/g, ' ')).slice(0, 40);
  const cls = typeof el.className === 'string' && el.className ? `.${el.className.trim().split(/\s+/).slice(0, 2).join('.')}` : '';
  const host = el.closest('[class*="-editor"], to-chrome, dialog, [popover]');
  return `<${el.tagName.toLowerCase()}${cls}>${name ? ` "${name}"` : ''}${host && host !== el ? ` in <${host.tagName.toLowerCase()}${typeof host.className === 'string' && host.className ? '.' + host.className.trim().split(/\s+/)[0] : ''}>` : ''}`;
}

/** The open things, in the order they opened (the new ones after the old). */
function openNow(prev: Layer[]): Layer[] {
  const open = [...document.querySelectorAll('dialog[open]'), ...[...document.querySelectorAll('[popover]')].filter((p) => p.matches(':popover-open') && !p.matches('.to-pinch-pill'))];
  const kind = (el: Element): Layer['kind'] =>
    el.matches('dialog.to-drawer') ? 'drawer' : el.matches('dialog.to-palette') ? 'palette' : el.matches('dialog') ? 'dialog' : el.matches('.to-context') ? 'context' : 'menu';
  const kept = prev.filter((l) => open.includes(l.el));
  return [...kept, ...open.filter((el) => !kept.some((l) => l.el === el)).map((el) => ({ el, kind: kind(el) }))];
}
const presenting = (ed: Ed) => !!ed && ((ed.showing ?? -1) >= 0 || (ed.presenting ?? -1) >= 0);

/** The page at rest after a step: drawn, the column settled, the chrome's own movements done, a new editor up. */
async function settle(r: Real) {
  await frame();
  const moving = () =>
    document.querySelector('to-chrome[gliding]') ||
    document
      .getAnimations()
      .some(
        (a) =>
          a.playState === 'running' &&
          (a.effect as KeyframeEffect | null)?.target instanceof Element &&
          !!((a.effect as KeyframeEffect).target as Element).closest('to-bar, .to-header, .to-burger, .to-context, dialog, [popover]'),
      );
  await until(() => !moving(), 1500).catch(() => undefined);
  if (r.shell.app && appOf(r.shell.app)) await until(() => !!r.shell.editor || !!r.shell.querySelector('.to-empty:not(.to-loading)'), 5000).catch(() => undefined);
  await (editorOf(r)?.updateComplete ?? Promise.resolve());
  await r.shell.updateComplete;
  await frame();
}

/* ---------- the steps, done ---------- */

const KEY_SPELLED: Record<(typeof KEYS)[number], string> = {
  Escape: '{Escape}',
  Tab: '{Tab}',
  'Shift+Tab': '{Shift>}{Tab}{/Shift}',
  Enter: '{Enter}',
  ArrowUp: '{ArrowUp}',
  ArrowDown: '{ArrowDown}',
  ArrowLeft: '{ArrowLeft}',
  ArrowRight: '{ArrowRight}',
  'Mod+A': '{Control>}a{/Control}',
};
/** A tap at a point of the window, on whatever is there (a dialog's backdrop included). */
/** What the last tap landed on, by the thing it opened: a dialog a tap opens gives the focus back to what was tapped. */
const tappedFor = new WeakMap<Element, Element>();
let tapped: Element | null = null;
const tapAt = (x: number, y: number) => (
  (tapped = document.elementFromPoint(x, y)),
  userEvent.click(document.documentElement, { position: { x: Math.round(x), y: Math.round(y) }, force: true } as never)
);
const visible = (el: Element | null): el is HTMLElement => !!el && (el as HTMLElement).offsetParent !== null;
/** Whether a person could tap it now: laid out, not faded or slid away, and the thing under its middle. */
function tappable(el: Element | null): el is HTMLElement {
  if (!visible(el)) return false;
  const b = el.getBoundingClientRect();
  const hit = document.elementFromPoint(b.left + b.width / 2, b.top + b.height / 2);
  return !!hit && (el === hit || el.contains(hit)) && getComputedStyle(el).opacity !== '0';
}

/** The context a registry command acts on, where the walk is: the page, the words in hand, the rows chosen, the editor. */
function contextOf(cmd: Command, r: Real): unknown {
  const ed = editorOf(r);
  if (cmd.scope === 'kit') return r.shell.page;
  if (cmd.scope === 'text') {
    const at = document.activeElement?.closest('to-text') as ToText | null;
    return at && ed?.contains(at) ? at : null;
  }
  if (cmd.scope === 'rows') return ed?.rows?.range ? ed.rows : null;
  return ed && r.shell.app === cmd.scope ? ed : null;
}

/**
 * The focus where a person's way to a command leaves it: a command with keys runs where the focus is (its keys were
 * pressed there); one reached by a menu of the bar runs with the focus on that menu's button (a menu item chosen gives
 * it back there, menu.ts), unless the menu keeps the focus in the words; a bar button that takes the focus has it.
 */
function placeFocus(cmd: Command) {
  if (cmd.keys) return;
  const cls = (id: string) => `.cmd-${id.replace(/\./g, '-')}`;
  const menu = cmd.where.find((w) => w.startsWith('menu:'))?.slice(5);
  const opener = menu ? registered().find((c) => c.scope === cmd.scope && c.menu === menu) : undefined;
  // A menu drawn as the bar's <to-menu> carries its command's class; Insert ▾ is <to-insert>.
  const menuEl = opener
    ? (document.querySelector<HTMLElement>(`to-menu${cls(opener.id)}:not([keep])`) ?? (menu === 'insert' ? document.querySelector<HTMLElement>('.to-editor to-bar to-insert') : null))
    : null;
  const button = menuEl?.querySelector<HTMLElement>(':scope > button') ?? (cmd.takesFocus && cmd.where.includes('bar') ? document.querySelector<HTMLElement>(`button${cls(cmd.id)}`) : null);
  if (!visible(button)) return;
  // Reaching it closes a menu open elsewhere, as the tap on its button would.
  for (const m of document.querySelectorAll<HTMLElement>('.to-menu[popover]:popover-open')) if (!m.contains(button)) m.hidePopover();
  button.focus({ preventScroll: true });
}

/** The keystroke budget broken by a word typed: the median of its letters' synchronous work, over KEYSTROKE_MS. */
let slowWord = '';
const warmed = new WeakSet<Element>();
async function typeWord(word: string) {
  const at = document.activeElement;
  const text = at?.closest('to-text') as ToText | null;
  if (!text || !text.tx?.contains(at)) return void (await userEvent.keyboard(word));
  const sync: number[] = [];
  for (const ch of word) {
    const t0 = performance.now();
    text.tx.dispatchEvent(new InputEvent('beforeinput', { inputType: 'insertText', data: ch, bubbles: true, cancelable: true }));
    sync.push(performance.now() - t0);
    await text.updateComplete;
  }
  const median = [...sync].sort((a, b) => a - b)[sync.length >> 1];
  // The first word into a box warms it, as perf.test.ts's "warm up " does: its cost is the code's first run, not a keystroke's.
  if (!warmed.has(text)) return void warmed.add(text);
  if (median > KEYSTROKE_MS) slowWord = `"${word}" took ${median.toFixed(1)} ms a letter (median of ${sync.length}), over ${KEYSTROKE_MS} ms`;
}

/** Two fingers on the column, spreading or closing a step (kit/pinch.ts). */
async function pinch(r: Real, wider: boolean) {
  const col = column(r);
  if (!col) return;
  const box = col.getBoundingClientRect();
  const [cx, cy] = [box.left + box.width / 2, box.top + Math.min(box.height, innerHeight) / 2];
  const [from, to] = wider ? [30, 90] : [90, 30];
  const fire = (type: string, id: number, x: number, y: number) =>
    (type === 'pointerdown' ? col : (document.elementFromPoint(x, y) ?? document.body)).dispatchEvent(
      new PointerEvent(type, { pointerId: id, pointerType: 'touch', isPrimary: id === 11, clientX: x, clientY: y, bubbles: true, cancelable: true, composed: true }),
    );
  fire('pointerdown', 11, cx - from, cy);
  fire('pointerdown', 12, cx + from, cy);
  for (let i = 1; i <= 4; i++) {
    const d = from + ((to - from) * i) / 4;
    fire('pointermove', 11, cx - d, cy);
    fire('pointermove', 12, cx + d, cy);
    await new Promise(requestAnimationFrame);
  }
  fire('pointerup', 11, cx - to, cy);
  fire('pointerup', 12, cx + to, cy);
}

/** The drawer open, as a person opens it: the menu button. */
async function openDrawer(r: Real): Promise<HTMLElement | null> {
  const burger = r.shell.querySelector<HTMLElement>('.to-burger');
  if (!tappable(burger)) return null;
  await userEvent.click(burger, { force: true } as never);
  await until(() => !!r.shell.querySelector('dialog.to-drawer[open]'), 1500).catch(() => undefined);
  return r.shell.querySelector<HTMLElement>('dialog.to-drawer[open]');
}

/** A template of another app, as its link. */
const templateLink = (app: string) => {
  const def = appOf(app)!;
  return routeHash(app, encodeDoc(def.templates[0]?.doc ?? def.blank()));
};

async function act(s: Step, r: Real): Promise<string> {
  switch (s.kind) {
    case 'command': {
      const cmd = commandOf(s.id);
      const ctx = cmd && contextOf(cmd, r);
      if (!cmd || !ctx) return '(nothing in hand for it)';
      let ok = false;
      try {
        ok = live(cmd, ctx as never);
      } catch (e) {
        r.errors.push(`${s.id} (when): ${(e as Error).message}`);
      }
      if (!ok) return '(not in force)';
      placeFocus(cmd);
      try {
        const out = run(cmd, ctx as never);
        if (out instanceof Promise) await Promise.race([out.catch((e) => r.errors.push(`${s.id}: ${(e as Error)?.message ?? e}`)), tick(60)]);
      } catch (e) {
        r.errors.push(`${s.id}: ${(e as Error).message}`);
      }
      return '';
    }
    case 'key':
      await userEvent.keyboard(KEY_SPELLED[s.key]);
      return '';
    case 'type':
      await typeWord(s.word);
      return '';
    case 'tap-outside': {
      const top = r.layers[r.layers.length - 1];
      if (!top) return '(nothing open)';
      const box = top.el.getBoundingClientRect();
      const h = r.vv?.height ?? innerHeight;
      // A point outside it: beside it, or above or below it; none where it covers the window.
      const spots: [number, number][] = [
        [box.left / 2, h / 2],
        [(box.right + innerWidth) / 2, h / 2],
        [innerWidth / 2, box.top / 2],
        [innerWidth / 2, (box.bottom + h) / 2],
      ];
      const spot = spots.find(([x, y], i) => (i === 0 ? box.left > 12 : i === 1 ? box.right < innerWidth - 12 : i === 2 ? box.top > 12 : box.bottom < h - 12) && x >= 0 && y >= 0);
      if (!spot) return '(it covers the window)';
      await tapAt(...spot);
      return '';
    }
    case 'tap-doc': {
      const col = column(r);
      if (!col) return '(no column)';
      const box = col.getBoundingClientRect();
      const h = Math.min(box.bottom, r.vv?.height ?? innerHeight) - box.top;
      const [x, y] = [box.left + 12 + s.at * (box.width - 24), box.top + 8 + ((s.at * 7.3) % 1) * (h - 16)];
      const hit = document.elementFromPoint(x, y);
      const on = hit
        ? describeEl(hit)
        : `nothing at ${Math.round(x)},${Math.round(y)} (the column ${Math.round(box.left)},${Math.round(box.top)}–${Math.round(box.right)},${Math.round(box.bottom)}; the window ${innerWidth}×${innerHeight}, the visible ${r.vv?.height ?? innerHeight})`;
      await tapAt(x, y);
      return `on ${on}`;
    }
    case 'scroll': {
      const col = column(r);
      if (col) col.scrollTop += s.by;
      return '';
    }
    case 'drawer':
      await openDrawer(r);
      return '';
    case 'menu': {
      const menus = [...(editorOf(r)?.querySelectorAll('to-menu > button') ?? [])].filter((b) => tappable(b as Element) && !(b as Element).closest('dialog, [popover]')) as HTMLElement[];
      if (!menus.length) return '(no menu in the bar)';
      const b = menus[s.nth % menus.length];
      await userEvent.click(b, { force: true } as never);
      return describeEl(b);
    }
    case 'share': {
      const drawer = await openDrawer(r);
      const share = drawer?.querySelector<HTMLElement>('.to-drawer-share');
      if (!share) return '(no Share in the drawer)';
      await userEvent.click(share, { force: true } as never);
      await until(() => !!document.querySelector('to-share dialog[open]'), 4000).catch(() => undefined);
      return '';
    }
    case 'templates': {
      const drawer = await openDrawer(r);
      const app = r.shell.app;
      const head = [...(drawer?.querySelectorAll('.to-app-head') ?? [])].find((h) => h.querySelector('a')?.getAttribute('href') === routeHash(app ?? ''));
      const b = head?.querySelector<HTMLElement>('to-templates > button');
      if (!b) return '(no templates)';
      await userEvent.click(b, { force: true } as never);
      return '';
    }
    case 'palette': {
      const b = r.shell.querySelector<HTMLElement>('.to-palette-btn');
      if (tappable(b)) await userEvent.click(b, { force: true } as never);
      else if (r.size === 'desktop') await userEvent.keyboard('{Control>}k{/Control}');
      else return '(its button is away)';
      return '';
    }
    case 'pinch':
      await pinch(r, s.wider);
      return '';
    case 'keyboard': {
      if (!r.vv) return '';
      r.vv.height = s.up ? innerHeight - KEYBOARD : innerHeight;
      r.vv.dispatchEvent(new Event('resize'));
      return '';
    }
    case 'route':
      r.shell.flushLink();
      r.backTo = location.hash;
      go(templateLink(s.to));
      return '';
    case 'back':
      go(r.backTo || templateLink(FAMILIES[r.family][0]));
      return '';
  }
}

/* ---------- the invariants ---------- */

class Broken extends Error {}
/** Where the focus was as the step began. */
let focusBefore: Element | null = null;
/** The findings met so far that are known and left for the next round (test/walks-known.ts), by their id. */
const met = new Set<string>();
function broke(r: Real, rule: string, detail: string): void {
  const known = KNOWN.find((k) => k.rule === rule && k.matches.test(detail));
  if (known) return void met.add(known.id);
  throw new Broken(`walk broke "${rule}": ${detail}\n  in ${r.family} at ${r.size} size, after ${r.log.length} steps:\n${r.log.map((l, i) => `    ${i + 1}. ${l}`).join('\n')}`);
}

/** The accessible name an element is given (aria-label, or the words of what aria-labelledby names). */
function nameOf(el: Element): string {
  return nameOfEl(el);
}
const nameOfEl = (el: Element) =>
  (
    el.getAttribute('aria-label') ??
    (el.getAttribute('aria-labelledby') ?? '')
      .split(/\s+/)
      .map((id) => (id ? (document.getElementById(id)?.textContent ?? '') : ''))
      .join(' ')
  ).trim();

/** What clips an element sideways: the boxes round it, up to the top layer it is in, that hide what overflows them. */
function clipped(el: Element, rect: DOMRect, cache: Map<Element, string>): { left: number; right: number } {
  let [left, right] = [rect.left, rect.right];
  for (let at = el.parentElement; at && at !== document.body && at !== document.documentElement; at = at.parentElement) {
    let ox = cache.get(at);
    if (ox === undefined) cache.set(at, (ox = getComputedStyle(at).overflowX));
    if (ox !== 'visible') {
      const b = at.getBoundingClientRect();
      [left, right] = [Math.max(left, b.left), Math.min(right, b.right)];
    }
    if (at.matches('dialog[open], [popover]:popover-open')) break;
  }
  return { left, right };
}

/** Undo, in a phone's bar that is shown: inside the visible window, whatever the bar is scrolled to, and not under the palette's button. */
function undoOnScreen(r: Real, bar: HTMLElement, h: number) {
  const undo = bar.querySelector<HTMLElement>('button.cmd-kit-undo');
  if (!undo) return broke(r, 'undo', `the bar has no Undo`);
  const u = undo.getBoundingClientRect();
  const view = bar.getBoundingClientRect();
  const palette = r.shell.querySelector<HTMLElement>('.to-column.barred > .to-palette-btn')?.getBoundingClientRect();
  const end = Math.min(innerWidth, view.right, palette && palette.width ? palette.left : Infinity);
  if (u.left < Math.max(0, view.left) - 1 || u.right > end + 1 || u.top < -1 || u.bottom > h + 1)
    broke(
      r,
      'undo',
      `Undo is at ${Math.round(u.left)},${Math.round(u.top)}–${Math.round(u.right)},${Math.round(u.bottom)}, outside the bar's visible ${Math.round(Math.max(0, view.left))}–${Math.round(end)} in a window ${innerWidth}×${h}`,
    );
}

/** What a Tab or a swipe reaches. */
const REACHABLE = 'button:not([disabled]), a[href], input:not([disabled]), select:not([disabled]), textarea:not([disabled]), [tabindex]:not([tabindex="-1"]), [contenteditable="true"]';
/**
 * The first thing a Tab or a swipe reaches that a person cannot see: under a box faded away (opacity 0 and no pointer:
 * not a fade on hover) or slid by a transform out of the visible window `h` tall (not the skip link, which comes in
 * with the focus); '' when there is none.
 */
function hiddenReachable(h: number): string {
  const looks = new Map<Element, CSSStyleDeclaration>();
  const look = (el: Element) => looks.get(el) ?? looks.set(el, getComputedStyle(el)).get(el)!;
  for (const el of document.querySelectorAll<HTMLElement>(REACHABLE)) {
    // The skip link is off the screen until it has the focus, and then on it: that is what it is for.
    if (el.closest('[inert], [aria-hidden="true"], .to-skip') || !el.checkVisibility({ visibilityProperty: true })) continue;
    for (let at: HTMLElement | null = el; at && at !== document.body; at = at.parentElement) {
      const s = look(at);
      if (s.opacity === '0' && s.pointerEvents === 'none') return `${describeEl(el)} can be reached though ${describeEl(at)} is faded away: it is not inert`;
      if (s.transform.startsWith('matrix')) {
        const b = at.getBoundingClientRect();
        if (b.width && b.height && (b.top >= h - 1 || b.bottom <= 1 || b.left >= innerWidth - 1 || b.right <= 1))
          return `${describeEl(el)} can be reached though ${describeEl(at)} is slid out of the window: it is not inert`;
      }
    }
  }
  return '';
}

function check(r: Real, s: Step, before: Layer[]) {
  const at = document.activeElement;
  const ed = editorOf(r);

  // errors
  if (r.errors.length) broke(r, 'errors', r.errors.splice(0).join('; '));

  // modal
  const modals = [...document.querySelectorAll('dialog')].filter((d) => d.matches(':modal'));
  if (modals.length > 1) broke(r, 'modal', `${modals.length} modal dialogs open: ${modals.map(describeEl).join(', ')}`);
  if (stacked.length) broke(r, 'modal', stacked.splice(0).join('; '));

  // focus
  const inLayer = (l: Layer) => !!at && l.el.contains(at);
  const topModal = [...r.layers].reverse().find((l) => l.el.matches('dialog:modal'));
  // Tab past a modal's ends takes the focus out of the page to the browser's own (a native <dialog> traps nothing; in the
  // test's frame it lands on the body, under the dialog): the page has none to place until a Tab brings it back.
  // The same past the page's last control or before its first: out to the browser's own, until a Tab or a tap brings it back.
  if (s.kind === 'key' && (s.key === 'Tab' || s.key === 'Shift+Tab') && (at === document.body || !document.hasFocus())) r.out = true;
  else if (at !== document.body) r.out = false;
  const away = !document.hasFocus() || r.out;
  if (away) {
    // Out of the page: nothing here holds the focus.
  } else if (topModal) {
    const above = r.layers.slice(r.layers.indexOf(topModal));
    if (!above.some(inLayer)) broke(r, 'focus', `a modal is open (${describeEl(topModal.el)}) and the focus is outside it, on ${describeEl(at)}`);
  } else if (!at || at === document.body || !(at.closest('to-chrome, to-find, .to-skip') || r.layers.some(inLayer))) {
    broke(r, 'focus', `the focus is on ${describeEl(at)}, not in the document, the chrome or anything open`);
  }
  if (at && at !== document.body && at.closest('[aria-hidden="true"], [inert]'))
    broke(r, 'focus', `${describeEl(at)} has the focus inside ${describeEl(at.closest('[aria-hidden="true"], [inert]'))}, which is hidden from a screen reader`);

  // back: Escape (or a tap outside a dialog) closed the topmost thing, and nothing else opened.
  const closed = before.filter((l) => !r.layers.some((x) => x.el === l.el));
  const opened = r.layers.filter((l) => !before.some((x) => x.el === l.el));
  const last = before[before.length - 1];
  if ((s.kind === 'key' && s.key === 'Escape') || (s.kind === 'tap-outside' && last?.el.matches('dialog'))) {
    if (last && closed.length === 1 && closed[0] === last && !opened.length && last.kind !== 'context') {
      const was = openedFrom.get(last.el);
      const hit = tappedFor.get(last.el);
      const onTapped = !!hit && !!at && (hit.contains(at) || at.contains(hit) || hit.closest('td, th, li, [role=gridcell], [role=option]')?.contains(at) === true);
      // Or it never held the focus (a popover beside the focused button) and the focus stayed where it was.
      const stayed = !!focusBefore && !last.el.contains(focusBefore) && at === focusBefore;
      // Or a command's dialog, opened from a button (the bar's, a menu's, the palette's), gives the focus to the words it acts on.
      const onWords = !!was?.matches('button, [role^=menuitem]') && !!at?.closest('to-text') && !!editorOf(r)?.contains(at);
      if (was && was !== document.body && was.isConnected && (was as HTMLElement).offsetParent !== null && at !== was && !onTapped && !onWords && !stayed)
        broke(r, 'back', `${describeEl(last.el)} closed and the focus is on ${describeEl(at)}, not back on ${describeEl(was)} where it was when it opened`);
    }
  }

  // window
  if (window.scrollX || window.scrollY) broke(r, 'window', `the window scrolled to ${window.scrollX}, ${window.scrollY}`);
  // Nor the chrome round the column (kit/chrome.ts): only the column's main scrolls.
  for (const box of r.shell.querySelectorAll<HTMLElement>('to-chrome, .to-column'))
    if (box.scrollTop || box.scrollLeft) broke(r, 'window', `${describeEl(box)} scrolled to ${box.scrollLeft}, ${box.scrollTop}: only the column scrolls`);

  // link
  if (r.shell.app && ed && !r.shell.sealed && !r.shell.unreadable) {
    r.shell.flushLink();
    const { app, payload } = parseHash(location.hash);
    if (app === r.shell.app && payload) {
      const link = decodeDoc(payload);
      const held = (r.shell as unknown as { doc: string }).doc;
      if (link !== held) broke(r, 'link', `the address holds another document than the shell:\n${JSON.stringify(link).slice(0, 300)}\n  ≠\n${JSON.stringify(held).slice(0, 300)}`);
      const back = write(parse(link));
      if (back !== link)
        broke(r, 'link', `the document in the address is not written back as it is read: ${JSON.stringify(link).slice(0, 300)}\n  written back: ${JSON.stringify(back).slice(0, 300)}`);
      const value = ed.value as string;
      if (!r.shell.fresh && appOf(app)!.title(value) && takeHead(link, ENVELOPE_KEYS)[1] !== takeHead(value, ENVELOPE_KEYS)[1])
        broke(r, 'link', `the address is not the document the editor holds:\n${JSON.stringify(link).slice(0, 300)}\n  ≠\n${JSON.stringify(value).slice(0, 300)}`);
    }
  }

  // bar
  const chrome = r.shell.querySelector('to-chrome');
  const bar = [...(ed?.querySelectorAll('to-bar') ?? [])].find((b) => visible(b as Element) && !(b as Element).closest('dialog, [popover]')) as HTMLElement | undefined;
  const reading = r.size === 'phone' && !chrome?.hasAttribute('indoc') && ed?.getAttribute('data-bar') !== 'always';
  if (bar && !presenting(ed) && !reading && !document.documentElement.hasAttribute('data-context-row')) {
    const look = getComputedStyle(bar);
    if (look.opacity === '1' && look.transform === 'none') {
      const b = bar.getBoundingClientRect();
      const h = r.vv?.height ?? innerHeight;
      if (b.top < -1 || b.bottom > h + 1 || b.left < -1 || b.right > innerWidth + 1)
        broke(r, 'bar', `the bar is at ${Math.round(b.left)},${Math.round(b.top)}–${Math.round(b.right)},${Math.round(b.bottom)}, outside the visible window ${innerWidth}×${h}`);
      const stops = [...bar.querySelectorAll<HTMLElement>('button')]
        .filter((x) => !x.closest('[popover], dialog') && x.offsetParent !== null)
        .map((x) => x.getBoundingClientRect())
        .filter((x) => x.height > 0);
      if (stops.length) {
        const tops = stops.map((x) => x.top);
        const least = Math.min(...stops.map((x) => x.height));
        if (Math.max(...tops) - Math.min(...tops) >= least / 2)
          broke(r, 'bar', `the bar is more than one row: its buttons' tops run from ${Math.round(Math.min(...tops))} to ${Math.round(Math.max(...tops))}`);
      }
      // undo: on a phone Undo is pinned at the bar's end, outside its scroll, so it is always on screen (round sixteen).
      if (r.size === 'phone') undoOnScreen(r, bar, h);
    }
  }

  // hidden
  const unseen = hiddenReachable(r.vv?.height ?? innerHeight);
  if (unseen) broke(r, 'hidden', unseen);

  // overflow
  if (document.documentElement.scrollWidth > innerWidth) broke(r, 'overflow', `the page is ${document.documentElement.scrollWidth}px wide in a ${innerWidth}px window`);
  const cache = new Map<Element, string>();
  const walker = document.createTreeWalker(document.body, NodeFilter.SHOW_TEXT);
  const seen = new Set<Element>();
  for (let n = walker.nextNode(); n; n = walker.nextNode()) {
    const el = n.parentElement;
    if (!el || seen.has(el) || !(n.textContent ?? '').trim() || el.closest('script, style, template, .sr-only, [aria-hidden="true"], .to-skip')) continue;
    seen.add(el);
    const rect = el.getBoundingClientRect();
    if (rect.width <= 1 || rect.height <= 1) continue;
    const { left, right } = clipped(el, rect, cache);
    if (right - left <= 1) continue;
    if (right > innerWidth + 1 || left < -1) broke(r, 'overflow', `${describeEl(el)} runs off the screen sideways: ${Math.round(left)}–${Math.round(right)} in a ${innerWidth}px window`);
  }

  // names
  for (const l of r.layers) if (!l.el.matches('[aria-hidden="true"]') && !nameOf(l.el)) broke(r, 'names', `${describeEl(l.el)} is open with no accessible name`);

  // keystroke
  if (slowWord) {
    const w = slowWord;
    slowWord = '';
    broke(r, 'keystroke', w);
  }
}

/* ---------- the walk, as fast-check's commands ---------- */

class Walk implements fc.AsyncCommand<Model, Real> {
  constructor(readonly step: Step) {}
  check(m: Readonly<Model>) {
    // A walk is STEPS steps taken: more are drawn (a step not allowed where the walk is is passed over), the rest left.
    if ((current?.log.length ?? 0) >= STEPS) return false;
    return allowed(this.step, m as Model, this.step.kind === 'command' ? commandOf(this.step.id) : undefined);
  }
  async run(m: Model, r: Real) {
    const before = r.layers;
    focusBefore = document.activeElement;
    const note = await act(this.step, r);
    await settle(r);
    r.log.push(`${stepName(this.step)}${note ? ` ${note}` : ''}  [the focus then on ${describeEl(document.activeElement)}]`);
    // The model follows the page: what is open, the app, presenting, scrolled, the keyboard.
    r.layers = openNow(before);
    for (const l of r.layers) if (!before.includes(l) && tapped) tappedFor.set(l.el, tapped);
    tapped = null;
    // The topmost modal, if any, stands for what is open: nothing behind it can be reached.
    const top = [...r.layers].reverse().find((l) => l.el.matches('dialog:modal')) ?? r.layers[r.layers.length - 1];
    m.open = top?.kind ?? null;
    m.focusWas = top ? describeEl(openedFrom.get(top.el) ?? null) : null;
    m.app = r.shell.app ?? '';
    m.mode = presenting(editorOf(r)) ? 'presenting' : 'editing';
    m.scrolled = (column(r)?.scrollTop ?? 0) > 0;
    m.keyboard = !!r.vv && r.vv.height < innerHeight;
    check(r, this.step, before);
  }
  toString() {
    return stepName(this.step);
  }
}

/** The steps of a family's walk: its commands (weighted: there are many), the keys, words, taps and the chrome's own. */
function stepsOf(family: string): fc.Arbitrary<Walk>[] {
  // Sorted: the same seed is the same walk whatever was registered before.
  const ids = familyCommands(registered(), family)
    .map((c) => c.id)
    .sort();
  const others = [...FAMILIES[family].slice(1), ...(FAMILIES[family].length > 1 ? [] : ['write'])];
  const commandArb = fc.constantFrom(...ids).map((id) => new Walk({ kind: 'command', id }));
  return [
    commandArb,
    commandArb,
    commandArb,
    fc.constantFrom(...KEYS).map((key) => new Walk({ kind: 'key', key })),
    fc.constantFrom(...KEYS).map((key) => new Walk({ kind: 'key', key })),
    fc.constantFrom(...WORDS).map((word) => new Walk({ kind: 'type', word })),
    fc.constant(new Walk({ kind: 'tap-outside' })),
    fc.double({ min: 0, max: 1, noNaN: true }).map((at) => new Walk({ kind: 'tap-doc', at })),
    fc.double({ min: 0, max: 1, noNaN: true }).map((at) => new Walk({ kind: 'tap-doc', at })),
    fc.integer({ min: -600, max: 600 }).map((by) => new Walk({ kind: 'scroll', by })),
    fc.constant(new Walk({ kind: 'drawer' })),
    fc.nat(20).map((nth) => new Walk({ kind: 'menu', nth })),
    fc.constant(new Walk({ kind: 'share' })),
    fc.constant(new Walk({ kind: 'templates' })),
    fc.constant(new Walk({ kind: 'palette' })),
    fc.boolean().map((wider) => new Walk({ kind: 'pinch', wider })),
    fc.boolean().map((up) => new Walk({ kind: 'keyboard', up })),
    fc.constantFrom(...others).map((to) => new Walk({ kind: 'route', to })),
    fc.constant(new Walk({ kind: 'back' })),
  ];
}

/** A walk's start: the app open on its first template, nothing open, the keyboard down, the normal size. */
async function start(app: string, family: string, size: Size): Promise<{ model: Model; real: Real }> {
  stepSize(0);
  slowWord = '';
  let vv: FakeVV | null = null;
  if (size === 'phone') vv = fakeViewport();
  const shell = await mount(templateLink(app));
  const real: Real = { shell, family, size, vv, log: [], layers: [], backTo: '', errors: [], out: false };
  await until(() => !!shell.editor && !!(shell.editor as Ed).updateComplete, 5000);
  await until(() => inScope(app).length > 0);
  await settle(real);
  real.layers = openNow([]);
  return { model: { app, home: app, mode: 'editing', open: null, focusWas: null, scrolled: false, size, keyboard: false }, real };
}

let current: Real | null = null;
const onError = (e: ErrorEvent | PromiseRejectionEvent) => {
  const reason = 'reason' in e ? e.reason : e.error;
  const message = String(reason?.message ?? reason ?? (e as ErrorEvent).message);
  // A clipboard the test browser refuses, a picture or a map tile it cannot fetch, a frame's own: the browser's, not the walk's.
  if (/clipboard|Document is not focused|NotAllowedError|Failed to fetch|NetworkError|ResizeObserver loop|play\(\) request/i.test(message)) return;
  current?.errors.push(message);
};

beforeEach(() => {
  vi.spyOn(window, 'open').mockImplementation(() => null);
  vi.spyOn(window, 'print').mockImplementation(() => undefined);
  vi.spyOn(window, 'confirm').mockImplementation(() => false);
  vi.spyOn(window, 'alert').mockImplementation(() => undefined);
  vi.spyOn(window, 'prompt').mockImplementation(() => null);
  window.addEventListener('error', onError);
  window.addEventListener('unhandledrejection', onError);
  watchOpening();
});
afterEach(async () => {
  window.removeEventListener('error', onError);
  window.removeEventListener('unhandledrejection', onError);
  unwatchOpening();
  vi.restoreAllMocks();
  Object.defineProperty(window, 'visualViewport', { configurable: true, value: REAL_VV });
  await coarse(false);
  stepSize(0);
  history.replaceState(null, '', location.pathname);
});
afterAll(() => page.viewport(414, 896));

/**
 * A family's walk: fast-check's commands, every walk DRAWN long as generated (fc.commands draws a length from 0 to its
 * most; it has no least, so its length's generator is swapped for one that always says DRAWN, its shrinking kept, so a
 * failure still shrinks to the fewest steps that break the rule). Throws if fast-check's commands change shape.
 */
function walkOf(family: string): fc.Arbitrary<Iterable<Walk>> {
  const arb = fc.commands(stepsOf(family), { maxCommands: DRAWN, size: 'max', replayPath: REPLAY }) as unknown as { lengthArb: fc.Arbitrary<number> };
  const length = arb.lengthArb;
  if (!length?.shrink) throw new Error('fast-check’s commands no longer have a lengthArb: see walkOf');
  arb.lengthArb = Object.assign(Object.create(Object.getPrototypeOf(length)), length, { generate: () => new fc.Value(DRAWN, undefined) });
  return arb as unknown as fc.Arbitrary<Iterable<Walk>>;
}

/** A fixed seed a family and size in the default suite, so it is the same walk every time. */
const fixedSeed = (family: string, size: Size) => [...`${family}:${size}`].reduce((h, c) => (h * 31 + c.charCodeAt(0)) | 0, 7);

for (const size of ['phone', 'desktop'] as Size[])
  describe(`walks at a ${size}'s size`, () => {
    for (const family of Object.keys(FAMILIES))
      test(`${family} (${FAMILIES[family].join(', ')}): the chrome's invariants hold after every step`, { timeout: Math.max(120_000, STEPS * RUNS * 2_000) }, async () => {
        await page.viewport(...SIZES[size]);
        await coarse(size === 'phone');
        // Every app of the family's commands in the registry, for the steps to choose from.
        for (const id of FAMILIES[family]) {
          const cmds = await appOf(id)!.commands?.();
          if (cmds) register(cmds.default);
        }
        const seed = SEED ?? (FRESH ? Date.now() ^ fixedSeed(family, size) : fixedSeed(family, size));
        console.log(`walk ${family} at ${size}: seed ${seed}${PATH ? `, path ${PATH}` : ''}`);
        await fc.assert(
          fc.asyncProperty(fc.constantFrom(...FAMILIES[family]), walkOf(family), async (app, steps) => {
            const setup = await start(app, family, size);
            current = setup.real;
            await fc.asyncModelRun(() => setup, steps);
          }),
          { numRuns: RUNS, seed, path: PATH, interruptAfterTimeLimit: Math.max(100_000, STEPS * RUNS * 600), markInterruptAsFailure: false },
        );
        console.log(`  ${current?.log.length ?? 0} steps in the last walk`);
        if (met.size) console.log(`  known findings met: ${[...met].join(', ')}`);
      });
  });

// The review of 2026-10-11: "Undo is never on screen in any app's bar". Every app at a phone's size, its bar shown (the
// focus in the document), the bar scrolled to its start and to its end: Undo is inside the visible window each time.
test('on a phone, every app’s Undo is on screen wherever its bar is scrolled', { timeout: 120_000 }, async () => {
  await page.viewport(...SIZES.phone);
  await coarse(true);
  const all = Object.entries(FAMILIES).flatMap(([family, ids]) => ids.map((app) => [app, family] as const));
  expect(all.length).toBe(13);
  for (const [app, family] of all) {
    const { real } = await start(app, family, 'phone');
    current = real;
    const chrome = real.shell.querySelector<HTMLElement & { indoc: boolean }>('to-chrome')!;
    const bar = [...editorOf(real).querySelectorAll('to-bar')].find((b) => visible(b as Element) && !(b as Element).closest('dialog, [popover]')) as HTMLElement;
    expect(bar, app).toBeTruthy();
    // The focus in the bar (the document's, so the bar is shown): words a page opens with chosen (the Website Builder's) would make the context bar the row.
    // The bar is shown first: while it is away (reading, or under a docked context row) it is inert (kit/chrome.ts), and an
    // inert button takes no focus; so the thing a page holds (the Website Builder's) is let go, its context row with it.
    (editorOf(real) as HTMLElement & { release?: () => void }).release?.();
    for (const c of document.querySelectorAll<HTMLElement & { hide(): void }>('to-context')) c.hide();
    chrome.indoc = true;
    await settle(real);
    bar.querySelector<HTMLElement>('button:not([disabled])')!.focus();
    await settle(real);
    expect(bar.contains(document.activeElement), app).toBe(true);
    expect(document.documentElement.hasAttribute('data-context-row'), app).toBe(false);
    // Shown, so the rule looks (it passes over a bar slid away).
    await until(() => getComputedStyle(bar).opacity === '1' && getComputedStyle(bar).transform === 'none').catch(() => undefined);
    expect([getComputedStyle(bar).opacity, getComputedStyle(bar).transform], app).toEqual(['1', 'none']);
    expect(bar.querySelector('button.cmd-kit-undo'), app).toBeTruthy();
    for (const to of [0, 100_000]) {
      bar.scrollLeft = to;
      await frame();
      check(real, { kind: 'key', key: 'ArrowDown' }, real.layers);
    }
  }
});

// The rules themselves: each catches what it is for, so a walk that passes has looked.
test('each rule of the walks breaks on the fault it is for, naming it', async () => {
  await page.viewport(...SIZES.desktop);
  await coarse(false);
  const { real } = await start('write', 'text', 'desktop');
  current = real;
  const step: Step = { kind: 'key', key: 'ArrowDown' };
  const words = real.shell.querySelector<HTMLElement>('to-write-editor to-text .tx')!;
  words.focus();
  const breaks = (fault: () => () => void): string => {
    const undo = fault();
    try {
      real.layers = openNow([]);
      check(real, step, real.layers);
      return '';
    } catch (e) {
      return (e as Error).message;
    } finally {
      undo();
      real.layers = openNow([]);
      words.focus();
    }
  };
  const add = <K extends keyof HTMLElementTagNameMap>(tag: K, css: string, text = ''): HTMLElementTagNameMap[K] => {
    const el = document.createElement(tag);
    el.style.cssText = css;
    el.textContent = text;
    document.body.append(el);
    return el;
  };
  expect(breaks(() => () => undefined)).toBe('');
  expect(
    breaks(() => {
      const d = add('div', 'position:fixed;top:10px;left:1300px;width:400px', 'Words off the edge');
      return () => d.remove();
    }),
  ).toMatch(/^walk broke "overflow": <div> "Words off the edge" runs off the screen sideways/);
  expect(
    breaks(() => {
      const b = add('button', 'position:fixed;top:0;left:0', 'Stray');
      b.focus();
      return () => b.remove();
    }),
  ).toMatch(/^walk broke "focus": the focus is on <button> "Stray"/);
  expect(
    breaks(() => {
      const ed = real.shell.editor!;
      ed.setAttribute('aria-hidden', 'true');
      return () => ed.removeAttribute('aria-hidden');
    }),
  ).toMatch(/^walk broke "focus": .* which is hidden from a screen reader/);
  expect(
    breaks(() => {
      const d = add('dialog', '', '');
      d.append(document.createElement('button'));
      d.showModal();
      return () => (d.close(), d.remove());
    }),
  ).toMatch(/^walk broke "names": <dialog> .*is open with no accessible name/);
  expect(
    breaks(() => {
      const [a, b] = [add('dialog', ''), add('dialog', '')];
      for (const d of [a, b]) (d.setAttribute('aria-label', 'A dialog'), d.showModal());
      return () => ((stacked.length = 0), [a, b].forEach((d) => (d.close(), d.remove())));
    }),
  ).toMatch(/^walk broke "modal": 2 modal dialogs open/);
  // Shown over another and closed again before the step ended: still one modal over another.
  expect(
    breaks(() => {
      const [a, b] = [add('dialog', ''), add('dialog', '')];
      for (const d of [a, b]) (d.setAttribute('aria-label', 'A dialog'), d.showModal());
      b.close();
      return () => ((stacked.length = 0), [a, b].forEach((d) => (d.close(), d.remove())));
    }),
  ).toMatch(/^walk broke "modal": <dialog> "A dialog" was shown over <dialog> "A dialog"/);
  expect(
    breaks(() => {
      const bar = real.shell.querySelector<HTMLElement>('to-write-editor to-bar')!;
      const was = bar.style.cssText;
      bar.style.cssText = 'flex-wrap:wrap;width:200px;overflow:visible';
      return () => (bar.style.cssText = was);
    }),
  ).toMatch(/^walk broke "bar": the bar is more than one row/);
  expect(
    breaks(() => {
      const was = location.hash;
      history.replaceState(history.state, '', routeHash('write', encodeDoc('# Another\n')));
      return () => history.replaceState(history.state, '', was);
    }),
  ).toMatch(/^walk broke "link": the address holds another document than the shell/);
  expect(
    breaks(() => {
      const chrome = real.shell.querySelector<HTMLElement>('to-chrome')!;
      const pad = add('div', 'height:3000px;flex-shrink:0');
      const was = chrome.style.overflow;
      chrome.style.overflow = 'hidden';
      chrome.append(pad);
      chrome.scrollTop = 40;
      return () => (pad.remove(), (chrome.style.overflow = was), (chrome.scrollTop = 0));
    }),
  ).toMatch(/^walk broke "window": <to-chrome>.* scrolled to 0, 40: only the column scrolls/);
  expect(
    breaks(() => {
      const bar = real.shell.querySelector<HTMLElement>('to-write-editor to-bar')!;
      const was = bar.style.cssText;
      bar.style.cssText = 'opacity:0;pointer-events:none';
      return () => (bar.style.cssText = was);
    }),
  ).toMatch(/^walk broke "hidden": <button.* can be reached though <to-bar.write-bar> .*is faded away/);
  expect(
    breaks(() => {
      const bar = real.shell.querySelector<HTMLElement>('to-write-editor to-bar')!;
      const was = bar.style.cssText;
      bar.style.cssText = 'transform:translateY(200vh)';
      return () => (bar.style.cssText = was);
    }),
  ).toMatch(/^walk broke "hidden": .* is slid out of the window/);
  expect(
    breaks(() => {
      const bar = real.shell.querySelector<HTMLElement>('to-write-editor to-bar')!;
      bar.style.cssText = 'opacity:0;pointer-events:none';
      bar.inert = true;
      return () => ((bar.style.cssText = ''), (bar.inert = false));
    }),
  ).toBe('');
  expect(
    breaks(() => {
      slowWord = '"tiny" took 20 ms a letter';
      return () => (slowWord = '');
    }),
  ).toMatch(/^walk broke "keystroke"/);
  expect(
    breaks(() => {
      real.errors.push('boom');
      return () => undefined;
    }),
  ).toMatch(/^walk broke "errors": boom/);
  // back: a dialog opened from the words, closed by Escape; the focus put back on the words is quiet, put elsewhere breaks.
  const escape: Step = { kind: 'key', key: 'Escape' };
  const elsewhere = [...real.shell.querySelectorAll<HTMLElement>('to-chrome button')].find((b) => visible(b) && !b.closest('to-write-editor'))!;
  expect(elsewhere).toBeTruthy();
  const closedOnto = (to: HTMLElement): string => {
    words.focus();
    const d = add('dialog', '');
    d.setAttribute('aria-label', 'A dialog');
    const inside = d.appendChild(document.createElement('button'));
    d.showModal();
    openedFrom.set(d, words);
    inside.focus();
    const before = openNow([]);
    focusBefore = inside;
    d.close();
    d.remove();
    to.focus();
    try {
      check(real, escape, before);
      return '';
    } catch (e) {
      return (e as Error).message;
    } finally {
      focusBefore = null;
      real.layers = openNow([]);
      words.focus();
    }
  };
  expect(closedOnto(words)).toBe('');
  expect(closedOnto(elsewhere)).toMatch(/^walk broke "back": <dialog> "A dialog" closed and the focus is on .* not back on .*\.tx.* where it was when it opened/);
});
