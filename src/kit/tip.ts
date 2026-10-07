/**
 * One tooltip for the whole page. Anything with a `data-tip` has one: it
 * shows on hover and on keyboard focus, as tooltips do, and on a phone on a
 * long press, which then does not count as a tap. An element that wants
 * more than words in it answers the `to-tip` event with content.
 *
 * It is installed once, by being imported. There is nothing to wrap and no
 * element per button, and it works the same inside shadow roots.
 */
import { render, type TemplateResult } from 'lit';

export type TipContent = string | TemplateResult;
/** Fired on an element as its tip opens. Set `detail.content` to show something other than its `data-tip`. */
export type TipEvent = CustomEvent<{ content: TipContent | null }>;

const HOVER_DELAY = 350;
const PRESS_DELAY = 450;
/** How long a tip opened by a long press stays after the finger lifts. */
const LINGER = 1800;
/** A finger that moves this far is scrolling, not pressing. */
const SLOP = 8;

let box: HTMLElement | null = null;
let shownFor: Element | null = null;
let timer = 0;
let press: { el: Element; x: number; y: number } | null = null;
/** The element whose long press opened the tip: its next click is not a tap. */
let held: Element | null = null;
/** The last thing the person did was press a key, so a focus is a keyboard focus. */
let keyboard = false;

/** The element with a tip under this event, through shadow roots. */
function tipOf(e: Event): Element | null {
  for (const n of e.composedPath()) if (n instanceof Element && n.getAttribute('data-tip')) return n;
  return null;
}

function show(el: Element) {
  const ev: TipEvent = new CustomEvent('to-tip', { bubbles: true, composed: true, detail: { content: null } });
  el.dispatchEvent(ev);
  const content = ev.detail.content ?? el.getAttribute('data-tip') ?? '';
  if (!content) return;
  if (!box) {
    box = document.createElement('div');
    box.className = 'to-tip';
    box.id = 'to-tip';
    box.setAttribute('role', 'tooltip');
    document.body.append(box);
  }
  if (shownFor !== el) forget();
  shownFor = el;
  // Assistive technology reads it too, unless it already says the same thing.
  const said = el.getAttribute('aria-label') ?? el.textContent?.trim();
  if (typeof content === 'string' && said !== content && !el.hasAttribute('aria-describedby')) el.setAttribute('aria-describedby', 'to-tip');
  render(content, box);
  // Above the element, centred; below when there is no room above; never off the sides.
  const r = el.getBoundingClientRect();
  const gap = 6;
  const edge = 8;
  box.classList.add('open');
  const w = box.offsetWidth;
  const h = box.offsetHeight;
  const x = Math.max(edge, Math.min(innerWidth - w - edge, r.left + r.width / 2 - w / 2));
  let y = r.top - gap - h;
  if (y < edge) y = r.bottom + gap;
  box.style.left = `${Math.round(x)}px`;
  box.style.top = `${Math.round(y)}px`;
}

function forget() {
  if (shownFor?.getAttribute('aria-describedby') === 'to-tip') shownFor.removeAttribute('aria-describedby');
  shownFor = null;
}

function hide() {
  clearTimeout(timer);
  timer = 0;
  forget();
  box?.classList.remove('open');
}

function cancelPress() {
  if (!press) return;
  clearTimeout(timer);
  timer = 0;
  press = null;
}

// A mouse: hover shows it after a moment, leaving hides it.
document.addEventListener('pointerover', (e) => {
  if (e.pointerType !== 'mouse') return;
  const el = tipOf(e);
  if (el === shownFor) return;
  clearTimeout(timer);
  if (!el) {
    if (shownFor) hide();
    return;
  }
  timer = window.setTimeout(() => show(el), HOVER_DELAY);
});
document.addEventListener('pointerout', (e) => {
  if (e.pointerType !== 'mouse') return;
  const el = tipOf(e);
  const to = e.relatedTarget;
  if (!el || (to instanceof Node && el.contains(to))) return;
  clearTimeout(timer);
  if (shownFor === el) hide();
});

// A finger: a long press shows it, and the press is then not a tap.
document.addEventListener('pointerdown', (e) => {
  keyboard = false;
  held = null;
  hide();
  if (e.pointerType === 'mouse') return;
  const el = tipOf(e);
  if (!el) return;
  press = { el, x: e.clientX, y: e.clientY };
  timer = window.setTimeout(() => {
    press = null;
    held = el;
    show(el);
  }, PRESS_DELAY);
});
document.addEventListener('pointermove', (e) => {
  if (press && Math.hypot(e.clientX - press.x, e.clientY - press.y) > SLOP) cancelPress();
});
const lift = () => {
  cancelPress();
  if (held) timer = window.setTimeout(hide, LINGER);
};
document.addEventListener('pointerup', lift);
document.addEventListener('pointercancel', lift);
window.addEventListener(
  'click',
  (e) => {
    if (!held) return;
    e.preventDefault();
    e.stopImmediatePropagation();
    held = null;
  },
  true,
);
document.addEventListener('contextmenu', (e) => (press || held) && e.preventDefault());

// A keyboard: focus shows it, Escape and leaving hide it.
document.addEventListener('keydown', (e) => {
  keyboard = true;
  if (e.key === 'Escape') hide();
});
document.addEventListener('focusin', (e) => {
  if (!keyboard) return;
  const el = tipOf(e);
  if (el) show(el);
});
document.addEventListener('focusout', (e) => {
  if (shownFor && tipOf(e) === shownFor) hide();
});

// The page moving under it: gone.
document.addEventListener('scroll', () => shownFor && hide(), { capture: true, passive: true });
window.addEventListener('resize', hide);
window.addEventListener('blur', hide);
