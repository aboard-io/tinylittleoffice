/**
 * Two fingers on a touch screen, read once for every use: `onPinch(el, { start, move, end })` reports a gesture's
 * scale (from 1 when the second finger came down) and its midpoint, for the kit's size of everything and for the
 * spatial canvases' own zoom alike. The fingers are pointer events (two active `touch` pointers); where the browser
 * cancels them to pan, the reading goes on from the same spread: WebKit's gesturechange, else the touch events, which
 * go on arriving while the page pans. WebKit's gesturestart/gesturechange/gestureend also stand in where two pointers
 * never arrive. A mouse, a pen and one finger are never a pinch.
 *
 * The kit's own use (`pinchSizes`, started by the shell): the browser's pinch is off (`touch-action: pan-x pan-y` on
 * the root, page.css), and unless the gesture began inside a `[data-spatial]` element, which takes its own, the size of
 * everything (zoom.ts) follows the fingers live: size × scale, drawn each frame without being kept, the point under
 * the fingers kept under them (the element there and how far down it they were: the words reflow, so an element, not
 * a pixel), a pill top centre saying the size. Lifted, the size is kept to the nearest 5% and the pill goes half a
 * second later.
 *
 * A spatial canvas's use (`pinchZoom`: the Drawing Tool's canvas, the Diagram Maker's picture, the Animator's stage): its
 * frame is marked `data-spatial`, and the same reading zooms the picture in it instead, live and unrounded, about the
 * fingers: the point of the picture under them when the second finger came down is kept under their midpoint, by
 * scrolling the frame, so two fingers moving together pan it. Lifted, the canvas rounds the zoom to its step. The
 * browser is told not to pan under two fingers there (a touchmove with two touches is prevented), so the frame moves
 * by the fingers once, not twice. One reading for every canvas.
 */
import { keepSize, pinchSize, size } from './zoom.ts';
import { scrollerOf } from './scroll.ts';

export interface Pinch {
  /** The spread now over the spread when the second finger came down. */
  scale: number;
  /** The midpoint between the fingers, in the viewport's coordinates. */
  x: number;
  y: number;
  /** Where the fingers came down. */
  targets: Element[];
}
export interface PinchHandlers {
  /** False declines the gesture: no move or end follows. */
  start?(p: Pinch): void | boolean;
  move(p: Pinch): void;
  end?(p: Pinch): void;
}

type Gesture = Event & { scale: number; clientX?: number; clientY?: number };

/** Reads pinches begun on `el` (the document for all of them). Returns what stops it. */
function onPinch(el: Document | HTMLElement, h: PinchHandlers): () => void {
  const fingers = new Map<number, { x: number; y: number; at: Element }>();
  let now: (Pinch & { from: 'pointer' | 'gesture' | 'touch'; d0: number; base: number }) | null = null;
  /** WebKit's gesture in progress, and its scale. */
  let gesturing = false;
  let gScale = 1;

  const begin = (p: Pinch, from: 'pointer' | 'gesture' | 'touch', d0: number) => {
    now = { ...p, from, d0, base: 1 };
    if (h.start?.(p) === false) now = null;
  };
  const report = () => now && h.move({ scale: now.scale, x: now.x, y: now.y, targets: now.targets });
  const finish = () => {
    const p = now;
    now = null;
    if (p) h.end?.({ scale: p.scale, x: p.x, y: p.y, targets: p.targets });
  };
  const spread = () => {
    const [a, b] = [...fingers.values()];
    return { d: Math.hypot(a.x - b.x, a.y - b.y), x: (a.x + b.x) / 2, y: (a.y + b.y) / 2 };
  };

  const down = (e: Event) => {
    const p = e as PointerEvent;
    if (p.pointerType !== 'touch') return;
    // A first finger down with a pinch still in hand: whatever was to end it never came.
    if (!fingers.size && now && now.from !== 'gesture') finish();
    fingers.set(p.pointerId, { x: p.clientX, y: p.clientY, at: p.target as Element });
    if (fingers.size !== 2 || now) return;
    const s = spread();
    if (s.d > 0) begin({ scale: 1, x: s.x, y: s.y, targets: [...fingers.values()].map((f) => f.at) }, 'pointer', s.d);
  };
  const move = (e: Event) => {
    const p = e as PointerEvent;
    const f = fingers.get(p.pointerId);
    if (!f) return;
    f.x = p.clientX;
    f.y = p.clientY;
    if (!now || now.from !== 'pointer' || fingers.size < 2) return;
    const s = spread();
    now.scale = s.d / now.d0;
    now.x = s.x;
    now.y = s.y;
    report();
  };
  const up = (e: Event) => {
    const p = e as PointerEvent;
    if (!fingers.delete(p.pointerId) || !now || now.from !== 'pointer' || fingers.size >= 2) return;
    // The browser took the fingers to pan: WebKit's gesture goes on reading them from the scale reached, or the
    // touches from the same spread.
    if (e.type === 'pointercancel' && (gesturing || typeof TouchEvent !== 'undefined')) {
      now.from = gesturing ? 'gesture' : 'touch';
      now.base = now.scale / (gScale || 1);
      return;
    }
    finish();
  };
  const touchMove = (e: Event) => {
    const ts = (e as TouchEvent).touches;
    if (now?.from !== 'touch' || ts.length < 2) return;
    const [a, b] = [ts[0], ts[1]];
    now.scale = Math.hypot(a.clientX - b.clientX, a.clientY - b.clientY) / now.d0;
    now.x = (a.clientX + b.clientX) / 2;
    now.y = (a.clientY + b.clientY) / 2;
    report();
  };
  const touchEnd = (e: Event) => {
    if (now?.from === 'touch' && (e as TouchEvent).touches.length < 2) finish();
  };
  const gStart = (e: Event) => {
    const g = e as Gesture;
    g.preventDefault();
    gesturing = true;
    gScale = 1;
    if (now) return;
    const x = g.clientX ?? innerWidth / 2;
    const y = g.clientY ?? innerHeight / 2;
    begin({ scale: 1, x, y, targets: [g.target as Element] }, 'gesture', 0);
  };
  const gChange = (e: Event) => {
    const g = e as Gesture;
    g.preventDefault();
    gScale = g.scale || 1;
    if (!now || now.from !== 'gesture') return;
    now.scale = now.base * gScale;
    if (typeof g.clientX === 'number' && typeof g.clientY === 'number') ((now.x = g.clientX), (now.y = g.clientY));
    report();
  };
  const gEnd = (e: Event) => {
    e.preventDefault();
    gesturing = false;
    if (now?.from === 'gesture') finish();
  };

  const opts = { capture: true, passive: true } as const;
  el.addEventListener('pointerdown', down, opts);
  document.addEventListener('pointermove', move, opts);
  for (const t of ['pointerup', 'pointercancel']) document.addEventListener(t, up, opts);
  document.addEventListener('touchmove', touchMove, opts);
  for (const t of ['touchend', 'touchcancel']) document.addEventListener(t, touchEnd, opts);
  el.addEventListener('gesturestart', gStart, { capture: true });
  el.addEventListener('gesturechange', gChange, { capture: true });
  el.addEventListener('gestureend', gEnd, { capture: true });
  return () => {
    el.removeEventListener('pointerdown', down, opts);
    document.removeEventListener('pointermove', move, opts);
    for (const t of ['pointerup', 'pointercancel']) document.removeEventListener(t, up, opts);
    document.removeEventListener('touchmove', touchMove, opts);
    for (const t of ['touchend', 'touchcancel']) document.removeEventListener(t, touchEnd, opts);
    el.removeEventListener('gesturestart', gStart, { capture: true });
    el.removeEventListener('gesturechange', gChange, { capture: true });
    el.removeEventListener('gestureend', gEnd, { capture: true });
  };
}

export interface ZoomHandlers {
  /** The frame that scrolls the picture (the `data-spatial` element); null when there is none to pinch. */
  frame(): HTMLElement | null;
  /** The picture the zoom scales: measured to keep the point under the fingers. */
  picture(): Element | null;
  /** The zoom as shown now. */
  zoom(): number;
  /** The second finger is down: whatever the first began is let go. */
  start?(): void;
  /** The zoom drawn while the fingers are down, unrounded (the canvas holds it to its range); resolves once drawn. */
  set(z: number): unknown;
  /** The fingers lifted: the zoom rounded to the canvas's step and kept; resolves once drawn. */
  end(z: number): unknown;
}

/** A spatial canvas's pinch: on `host`, for gestures begun in its frame. Returns what stops it. */
export function pinchZoom(host: HTMLElement, h: ZoomHandlers): () => void {
  let z0 = 1;
  let scale = 1;
  let at = { x: 0, y: 0 };
  /** Where the fingers came down, as a fraction of the picture's box. */
  let point: [number, number] | null = null;
  let frame = 0;
  let wrap: HTMLElement | null = null;

  /** The frame scrolled so the noted point of the picture is under the fingers again; what the frame cannot take
   * (a frame that grows with its picture until its limit), the column round it does. */
  const keep = (p: [number, number] | null) => {
    const pic = h.picture();
    if (!p || !pic || !wrap) return;
    const off = () => {
      const r = pic.getBoundingClientRect();
      return [r.left + p[0] * r.width - at.x, r.top + p[1] * r.height - at.y];
    };
    let [dx, dy] = off();
    wrap.scrollLeft += dx;
    wrap.scrollTop += dy;
    [dx, dy] = off();
    if (Math.abs(dx) >= 1) scrollerOf(wrap.parentElement, 'x').scrollLeft += dx;
    if (Math.abs(dy) >= 1) scrollerOf(wrap.parentElement).scrollTop += dy;
  };
  const draw = async () => {
    frame = 0;
    const p = point;
    await h.set(z0 * scale);
    if (p === point) keep(p);
  };
  const stop = onPinch(host, {
    start(p) {
      wrap = h.frame();
      if (!wrap || !p.targets.some((t) => wrap!.contains(t))) return false;
      h.start?.();
      z0 = h.zoom();
      scale = 1;
      at = { x: p.x, y: p.y };
      const r = h.picture()?.getBoundingClientRect();
      point = r && r.width && r.height ? [(p.x - r.left) / r.width, (p.y - r.top) / r.height] : null;
    },
    move(p) {
      scale = p.scale;
      at = { x: p.x, y: p.y };
      if (!frame) frame = requestAnimationFrame(() => void draw());
    },
    async end(p) {
      if (frame) cancelAnimationFrame(frame);
      frame = 0;
      scale = p.scale;
      at = { x: p.x, y: p.y };
      const was = point;
      point = null;
      await h.end(z0 * scale);
      keep(was);
    },
  });
  // Two fingers in the frame are the canvas's: the browser neither pans nor zooms under them.
  const hold = (e: TouchEvent) => {
    const w = h.frame();
    if (e.touches.length > 1 && e.cancelable && w?.contains(e.target as Node)) e.preventDefault();
  };
  host.addEventListener('touchmove', hold, { passive: false });
  return () => {
    stop();
    host.removeEventListener('touchmove', hold);
  };
}

/** What is nav, not document: the point kept under the fingers is the document's. */
const NAV = 'to-bar, .to-header, dialog, [popover], to-find, to-toast';

let started = false;
/** The kit's pinch: the size of everything, outside the spatial canvases. Once per page. */
export function pinchSizes() {
  if (started || typeof document === 'undefined') return;
  started = true;
  let base = 1;
  let scale = 1;
  let at = { x: 0, y: 0 };
  let anchor: { el: Element; frac: number } | null = null;
  let frame = 0;
  let pill: HTMLElement | null = null;
  let gone = 0;

  const say = () => {
    if (!pill) {
      pill = document.createElement('div');
      pill.className = 'to-pinch-pill';
      pill.setAttribute('aria-hidden', 'true');
      if ('popover' in pill) pill.popover = 'manual';
      document.body.append(pill);
    }
    clearTimeout(gone);
    if (!pill.isConnected) document.body.append(pill);
    pill.textContent = `${Math.round(size() * 100)}%`;
    if (pill.popover && !pill.matches(':popover-open')) pill.showPopover();
    pill.classList.add('shown');
  };
  const hush = () => {
    clearTimeout(gone);
    gone = window.setTimeout(() => {
      pill?.classList.remove('shown');
      if (pill?.popover && pill.matches(':popover-open')) pill.hidePopover();
    }, 500);
  };
  /** The document's element under the fingers, and how far down it they are. */
  const note = () => {
    const el = document.elementsFromPoint(at.x, at.y).find((e) => e !== document.documentElement && e !== document.body && !e.closest(NAV));
    if (!el) return null;
    const r = el.getBoundingClientRect();
    return { el, frac: r.height ? (at.y - r.top) / r.height : 0 };
  };
  /** Scrolled so the noted point is back under the fingers. */
  const keep = () => {
    if (!anchor?.el.isConnected) return;
    const r = anchor.el.getBoundingClientRect();
    const off = r.top + anchor.frac * r.height - at.y;
    if (Math.abs(off) >= 1) scrollerOf(anchor.el).scrollTop += off;
  };
  const draw = () => {
    frame = 0;
    pinchSize(base * scale);
    keep();
    say();
  };

  onPinch(document, {
    start(p) {
      if (p.targets.some((t) => t.closest?.('[data-spatial]'))) return false;
      base = size();
      scale = 1;
      at = { x: p.x, y: p.y };
      anchor = note();
      say();
    },
    move(p) {
      scale = p.scale;
      at = { x: p.x, y: p.y };
      if (!frame) frame = requestAnimationFrame(draw);
    },
    end(p) {
      if (frame) cancelAnimationFrame(frame);
      frame = 0;
      scale = p.scale;
      keepSize(base * scale);
      keep();
      say();
      anchor = null;
      hush();
    },
  });
}
