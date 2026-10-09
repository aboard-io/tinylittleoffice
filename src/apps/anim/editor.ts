/**
 * <to-anim-editor>: a drawing that moves. Draw mode is Draw's own editor, given the drawing alone; what it
 * changes comes back as one splice of the table of shapes, and the keys follow their shapes. Move mode puts
 * the time on a moment and lets you drag a shape to where it should be then, bring it nearer, grow it, spin
 * it and give it effects; between the moments you set, it travels in straight lines. Every change is
 * operations on the document (model.ts). Under either, the time: Draw/Move, the clock, the scrubber with
 * the selected shape's keys on it, and a strip of moments.
 */
import { html, nothing, svg, type PropertyDeclarations, type PropertyValues } from 'lit';
import { unsafeSVG } from 'lit/directives/unsafe-svg.js';
import { Copy, Key, Pause, PenTool, Play, Sparkles, Timer } from 'lucide';
import { tool } from '../../kit/bar.ts';
import { DocElement } from '../../kit/element.ts';
import { icon, UI } from '../../kit/icons.ts';
import { t } from '../../kit/i18n.ts';
import type { MenuItem } from '../../kit/menu.ts';
import { applyAll, parse, write, type Doc, type Op } from '../../doc/index.ts';
import { H, W, bounds, isDrawn, isLink } from '../draw/model.ts';
import { THEME } from '../draw/editor.ts';
import { EFFECTS, FPS_CHOICES, MAX_FRAMES, MAX_Z, drawingOf, duplicateShape, hasKey, loosen, readAnim, redraw, removeKey, removeShape, restKey, setLength, stateAt, withKey, type AnimView, type Key as AnimKey } from './model.ts';
import { frameSvg, transformOf, altOf } from './view.ts';
import '../../kit/bar.ts';
import '../../kit/menu.ts';
import './style.css';

export const tag = 'to-anim-editor';

/** At most this many little pictures under the scrubber. */
const THUMBS = 16;
/** The lengths offered, in frames. */
const LENGTHS = [12, 24, 36, 48, 72, 96, MAX_FRAMES];
const clamp = (n: number, lo: number, hi: number) => Math.max(lo, Math.min(hi, n));

/** The effects' names, by letter. */
const FX_NAMES: Record<string, () => string> = {
  i: () => t('Impact'),
  '3': () => t('3D'),
  d: () => t('Shadow'),
  n: () => t('Neon'),
  o: () => t('Outline'),
  g: () => t('Rainbow'),
  m: () => t('Mirror'),
  w: () => t('Wobble'),
  b: () => t('Blur'),
};

interface Drag {
  i: number;
  x: number;
  y: number;
  dx: number;
  dy: number;
  /** A pen shape's corner, when that is what is dragged. */
  corner?: number;
  /** The ops the drag has come to so far; written when the pointer lets go. */
  ops: Op[];
}

export class ToAnimEditor extends DocElement<AnimView> {
  static properties: PropertyDeclarations = { mode: { state: true }, frame: { state: true }, sel: { state: true }, playing: { state: true }, clock: { state: true }, live: { state: true } };
  declare mode: 'draw' | 'move';
  declare frame: number;
  /** The selected shape, -1 for none. */
  declare sel: number;
  declare playing: boolean;
  /** The fractional frame while playing. */
  declare clock: number;
  /** The motion as shown while a shape is dragged; the document is written when the pointer lets go. */
  declare live: AnimView | null;
  /** Once the mode has been chosen by hand, a new reading of the document does not choose it again. */
  private chosen = false;
  private raf = 0;
  private drag: Drag | null = null;
  private thumbs: { of: AnimView; list: { at: number; svg: string }[] } | null = null;

  constructor() {
    super();
    this.mode = 'draw';
    this.frame = 0;
    this.sel = -1;
    this.playing = false;
    this.clock = 0;
    this.live = null;
  }
  protected read(doc: Doc): AnimView {
    return readAnim(doc);
  }
  protected willUpdate(changed: PropertyValues) {
    super.willUpdate(changed);
    // A document arriving (it has no history yet): a list of things with no drawing is made one, one splice that
    // undoes; and a drawing that is there is there to be moved, while an empty stage wants drawing on.
    if (changed.has('value') && !this.canUndo && !this.canRedo) {
      this.edit(loosen(this.doc));
      if (!this.chosen) this.mode = this.view.shapes.length ? 'move' : 'draw';
    }
    this.frame = Math.min(this.frame, this.view.frames - 1);
    if (this.sel >= this.view.shapes.length) this.sel = -1;
  }
  protected undone() {
    this.live = null;
    this.drag = null;
  }
  connectedCallback() {
    super.connectedCallback();
    this.addEventListener('keydown', this.onKey);
  }
  disconnectedCallback() {
    super.disconnectedCallback();
    this.removeEventListener('keydown', this.onKey);
    cancelAnimationFrame(this.raf);
  }

  /** What is drawn: the document's motion, or the one under the pointer. */
  private get anim(): AnimView {
    return this.live ?? this.view;
  }

  /* ---------- time ---------- */

  private seek(frame: number) {
    this.pause();
    this.frame = clamp(Math.round(frame), 0, this.view.frames - 1);
  }
  private pause() {
    if (!this.playing) return;
    this.playing = false;
    cancelAnimationFrame(this.raf);
    this.frame = Math.min(this.view.frames - 1, Math.round(this.clock));
  }
  private toggle() {
    if (this.playing) return this.pause();
    this.playing = true;
    const t0 = performance.now() - (this.frame / this.view.fps) * 1000;
    const tick = () => {
      if (!this.playing) return;
      this.clock = (((performance.now() - t0) / 1000) * this.view.fps) % this.view.frames;
      this.raf = requestAnimationFrame(tick);
    };
    tick();
  }
  private setMode(mode: 'draw' | 'move') {
    this.chosen = true;
    this.pause();
    this.mode = mode;
  }
  private secs(frame: number) {
    return (frame / this.view.fps).toFixed(1);
  }

  /* ---------- the selected shape ---------- */

  /** The selected shape's key at this moment, changed as asked. */
  private key(change: Partial<AnimKey> = {}, burst?: string) {
    if (this.sel < 0) return;
    this.edit(withKey(this.doc, this.sel, { ...stateAt(this.view, this.sel, this.frame), ...change, t: this.frame }), burst);
  }
  private toggleFx(letter: string) {
    const fx = stateAt(this.view, this.sel, this.frame).fx;
    this.key({ fx: fx.includes(letter) ? fx.replace(letter, '') : fx + letter });
  }
  private removeSel() {
    if (this.sel < 0) return;
    this.edit(removeShape(this.doc, this.sel));
    this.sel = -1;
  }
  private duplicateSel() {
    if (this.sel < 0) return;
    const ops = duplicateShape(this.doc, this.sel);
    if (!ops.length) return;
    this.edit(ops);
    this.sel = this.view.shapes.length - 1;
  }

  private onKey = (e: KeyboardEvent) => {
    // In Draw mode the keys are Draw's; typing, or a control with its own idea of a key, is not ours.
    if (this.mode !== 'move') return;
    const at = e.composedPath()[0] as HTMLElement;
    if (at.matches?.('input, textarea, select, button') || at.closest?.('[popover], dialog')) return;
    if (e.key === ' ') this.toggle();
    else if (e.key === 'ArrowLeft') this.seek(this.frame - 1);
    else if (e.key === 'ArrowRight') this.seek(this.frame + 1);
    else if (e.key === 'Home') this.seek(0);
    else if (e.key === 'End') this.seek(this.view.frames - 1);
    else if ((e.key === 'k' || e.key === 'K') && !e.metaKey && !e.ctrlKey) this.key();
    else if (e.key === 'Delete' || e.key === 'Backspace') this.removeSel();
    else if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === 'd') this.duplicateSel();
    else if (e.key === 'Escape') this.sel = -1;
    else return;
    e.preventDefault();
  };

  /* ---------- the stage ---------- */

  private point(e: PointerEvent): [number, number] {
    const box = (e.currentTarget as Element).getBoundingClientRect();
    return [((e.clientX - box.left) / box.width) * W, ((e.clientY - box.top) / box.height) * H];
  }
  private onDown(e: PointerEvent) {
    if (e.button !== 0) return;
    const target = e.target as Element;
    const idx = target.closest('[data-idx]')?.getAttribute('data-idx');
    const corner = target.closest('[data-corner]')?.getAttribute('data-corner');
    this.pause();
    (e.currentTarget as SVGElement).focus({ preventScroll: true });
    // A corner of a pen shape: dragged, it moves at this moment (and the shape morphs between moments).
    const onCorner = corner != null && this.sel >= 0;
    if (!onCorner && idx == null) {
      this.sel = -1;
      return;
    }
    e.preventDefault();
    if (!onCorner) this.sel = parseInt(idx!, 10);
    const [x, y] = this.point(e);
    const at = stateAt(this.view, this.sel, this.frame);
    this.drag = { i: this.sel, x, y, dx: at.dx, dy: at.dy, corner: onCorner ? +corner! : undefined, ops: [] };
    (e.currentTarget as Element).setPointerCapture(e.pointerId);
  }
  private onMove(e: PointerEvent) {
    const d = this.drag;
    if (!d) return;
    const [x, y] = this.point(e);
    const v = this.view;
    const at = stateAt(v, d.i, this.frame);
    const s = v.shapes[d.i];
    let change: Partial<AnimKey>;
    let rest = restKey(0);
    if (d.corner !== undefined) {
      // The corner goes where the pointer is, in hundredths of the shape's box (its offset undone).
      const pts = (at.pts ?? s.pts ?? []).slice();
      pts[2 * d.corner] = Math.round(((x - at.dx - s.x) / s.w) * 100);
      pts[2 * d.corner + 1] = Math.round(((y - at.dy - s.y) / s.h) * 100);
      change = { pts };
      rest = { ...rest, pts: s.pts };
    } else change = { dx: Math.round(d.dx + x - d.x), dy: Math.round(d.dy + y - d.y) };
    // A shape moved for the first time at a later moment starts from where it was drawn.
    const first = !v.keys[d.i]?.length && this.frame ? withKey(this.doc, d.i, rest) : [];
    const from = first.length ? applyAll(this.doc, first) : this.doc;
    d.ops = [...first, ...withKey(from, d.i, { ...stateAt(readAnim(from), d.i, this.frame), ...change, t: this.frame })];
    this.live = readAnim(applyAll(this.doc, d.ops));
  }
  private onUp() {
    const d = this.drag;
    this.drag = null;
    this.live = null;
    if (d?.ops.length) this.edit(d.ops);
  }

  /** Draw mode's change: Draw's text is not the document, ours is, with the drawing inside it. */
  private onDrawChange(e: CustomEvent<string>) {
    e.stopPropagation();
    this.edit(redraw(this.doc, parse(e.detail)));
  }

  /* ---------- menus ---------- */

  private fxItems(): MenuItem[] {
    const fx = this.sel >= 0 ? stateAt(this.view, this.sel, this.frame).fx : '';
    return EFFECTS.map((f) => ({ label: FX_NAMES[f.letter](), checked: fx.includes(f.letter), disabled: this.sel < 0, does: () => this.toggleFx(f.letter) }));
  }
  private lengthItems(): MenuItem[] {
    const { frames, fps } = this.view;
    const lengths = [...new Set([...LENGTHS, frames])].sort((a, b) => a - b);
    return [
      ...lengths.map((n) => ({ group: t('Length'), label: t('{n} frames', { n }), hint: t('{s} seconds', { s: (n / fps).toFixed(1) }), checked: n === frames, does: () => this.edit(setLength(this.doc, n, fps)) })),
      ...FPS_CHOICES.map((f) => ({ group: t('Speed'), label: t('{n} frames a second', { n: f }), checked: f === fps, does: () => this.edit(setLength(this.doc, frames, f)) })),
    ];
  }

  /* ---------- drawing ---------- */

  render() {
    return html`${this.mode === 'draw'
        ? html`<to-draw-editor class="anim-draw" .value=${write(drawingOf(this.doc))} @docchange=${this.onDrawChange}></to-draw-editor>`
        : html`${this.renderBar()}
            <p class="anim-hint to-hint">${this.hint()}</p>
            ${this.renderStage()}${this.renderProps()}`}
      ${this.renderTime()}`;
  }

  private hint(): string {
    if (!this.view.shapes.length) return t('Nothing here yet: switch to Draw and draw something.');
    if (this.sel < 0) return t('Tap a shape, then drag it to where it should be at this moment.');
    return t('Drag to move it at {s} s; depth, size and spin below; K keeps it here.', { s: this.secs(this.frame) });
  }

  private renderBar() {
    const s = this.view.shapes[this.sel];
    const keyed = !!s && hasKey(this.view, this.sel, this.frame);
    return html`<to-bar class="anim-bar">
      ${tool({ label: this.playing ? t('Pause') : t('Play'), icon: this.playing ? Pause : Play, keys: 'Space', pressed: this.playing, does: () => this.toggle() })}
      ${tool({ label: t('Add a key here'), icon: Key, keys: 'K', disabled: !s || keyed, does: () => this.key() })}
      ${tool({ label: t('Remove this key'), icon: UI.close, disabled: !keyed, does: () => this.edit(removeKey(this.doc, this.sel, this.frame)) })}
      <to-menu class="anim-fx" .label=${t('Effects')} .icon=${Sparkles} caret ?disabled=${!s} .items=${this.fxItems()}></to-menu>
      ${tool({ label: t('Duplicate'), icon: Copy, keys: 'Mod+D', disabled: !s || isLink(s.k), does: () => this.duplicateSel() })}
      ${tool({ label: t('Delete'), icon: UI.trash, keys: 'Delete', disabled: !s, does: () => this.removeSel() })}
      <to-menu class="anim-length" icon-only .label=${t('Length and speed')} .icon=${Timer} .items=${this.lengthItems()}></to-menu>
    </to-bar>`;
  }

  private renderStage() {
    const a = this.anim;
    const now = this.playing ? this.clock : this.frame;
    return html`<div class="anim-wrap">
      <svg class="anim-stage" viewBox="0 0 ${W} ${H}" xmlns="http://www.w3.org/2000/svg" role="application" aria-label=${t('Stage: {alt}. Arrow keys move in time, Space plays, K keeps a key.', { alt: altOf(a) })} tabindex="0"
        @pointerdown=${this.onDown} @pointermove=${this.onMove} @pointerup=${this.onUp} @pointercancel=${this.onUp}>
        ${unsafeSVG(frameSvg(a, now, THEME))}
        ${this.playing
          ? nothing
          : a.shapes.map((s, i) => {
              const [x, y, w, h] = bounds(s, a.shapes);
              const k = stateAt(a, i, now);
              const pts = isDrawn(s.k) && i === this.sel ? (k.pts ?? s.pts ?? []) : [];
              return svg`<g class="hit ${i === this.sel ? 'sel' : ''}" data-idx=${i} transform=${transformOf(s, a.shapes, k, now)}><rect x=${x - 6} y=${y - 6} width=${w + 12} height=${h + 12} rx="4" />
                ${Array.from({ length: Math.floor(pts.length / 2) }, (_, c) => svg`<circle class="corner" data-corner=${c} cx=${s.x + (pts[2 * c] / 100) * s.w} cy=${s.y + (pts[2 * c + 1] / 100) * s.h} r="7" />`)}</g>`;
            })}
      </svg>
    </div>`;
  }

  private renderProps() {
    if (this.sel < 0 || !this.view.shapes[this.sel]) return nothing;
    const at = stateAt(this.anim, this.sel, this.frame);
    const slider = (label: string, field: 'z' | 's' | 'r', min: number, max: number, step: number, shown: string) =>
      html`<label class="anim-slider"><span>${label} <b>${shown}</b></span>
        <input type="range" min=${min} max=${max} step=${step} .value=${String(at[field])} @input=${(e: Event) => this.key({ [field]: parseFloat((e.target as HTMLInputElement).value) }, `${field}:${this.sel}:${this.frame}`)} /></label>`;
    return html`<div class="anim-props">
      ${slider(t('Depth'), 'z', -MAX_Z, MAX_Z, 1, `${Math.round(at.z)}`)}
      ${slider(t('Size'), 's', 0.2, 4, 0.1, `${at.s.toFixed(1)}×`)}
      ${slider(t('Spin'), 'r', -360, 360, 1, `${Math.round(at.r)}°`)}
    </div>`;
  }

  /** The little pictures of moments, one every few frames; drawn again when the document changes. */
  private thumbnails() {
    const v = this.view;
    if (this.thumbs?.of !== v) {
      const step = Math.ceil(v.frames / THUMBS);
      const list: { at: number; svg: string }[] = [];
      for (let at = 0; at < v.frames; at += step) list.push({ at, svg: frameSvg(v, at, THEME) });
      this.thumbs = { of: v, list };
    }
    return this.thumbs.list;
  }

  private renderTime() {
    const { frames } = this.view;
    const shown = this.playing ? Math.floor(this.clock) : this.frame;
    const keys = this.view.keys[this.sel] ?? [];
    const move = this.mode === 'move';
    return html`<div class="anim-time">
      <div class="anim-transport">
        <span class="anim-modes" role="group" aria-label=${t('Mode')}>
          <button type="button" class="to-btn" aria-pressed=${String(!move)} @click=${() => this.setMode('draw')}>${icon(PenTool, 16)}<span>${t('Draw')}</span></button>
          <button type="button" class="to-btn" aria-pressed=${String(move)} @click=${() => this.setMode('move')}>${icon(Play, 16)}<span>${t('Move')}</span></button>
        </span>
        <span class="anim-clock to-hint">${t('{now} s of {all} s', { now: this.secs(shown), all: this.secs(frames - 1) })}</span>
      </div>
      ${move
        ? html`<div class="anim-scrub">
              <input type="range" aria-label=${t('Time')} min="0" max=${frames - 1} step="1" .value=${String(shown)} @input=${(e: Event) => this.seek(parseInt((e.target as HTMLInputElement).value, 10))} />
              <div class="anim-keys">
                ${keys.map((k) => html`<button type="button" class=${k.t === this.frame && !this.playing ? 'key on' : 'key'} style="left:${(k.t / Math.max(1, frames - 1)) * 100}%" aria-label=${t('Key at {s} s', { s: this.secs(k.t) })} @click=${() => this.seek(k.t)}></button>`)}
              </div>
            </div>
            <div class="anim-thumbs" role="group" aria-label=${t('Moments')}>
              ${this.thumbnails().map(
                (m) => html`<button type="button" class=${m.at === shown ? 'on' : ''} aria-label=${t('Frame {n}, {s} s', { n: m.at + 1, s: this.secs(m.at) })} aria-pressed=${String(m.at === shown)} @click=${() => this.seek(m.at)}>
                  <svg viewBox="0 0 ${W} ${H}" aria-hidden="true">${unsafeSVG(m.svg)}</svg>
                </button>`,
              )}
            </div>`
        : nothing}
    </div>`;
  }
}
if (!customElements.get(tag)) customElements.define(tag, ToAnimEditor);
