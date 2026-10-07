/**
 * <to-anim>: a drawing that moves. Draw mode is Draw itself; Move mode puts
 * the slider on a moment and lets you drag a shape to where it should be
 * then, bring it nearer, grow it, spin it, and give it effects. Between the
 * moments you set, it travels in straight lines.
 * Document format: see lib/animmodel.ts.
 */
import './anim.css';
import './draw.ts';
import { DocElement, defineElement, html, svg, nothing, state, unsafeSVG, tool, icon, UI, isKey } from '../kit.ts';
import type { SlInput, SlSelect } from '../kit.ts';
import { GRID, isLink, parseDrawing, removeShape, serializeDrawing } from '../lib/drawmodel.ts';
import { EFFECTS, FPS_CHOICES, MAX_FRAMES, MAX_Z, W, H, hasKey, parseAnim, removeKey, restKey, serializeAnim, stateAt, withKey, withShapes, type Anim, type Key } from '../lib/animmodel.ts';
import { bounds, frameSvg, transformOf } from './anim.def.ts';
import type { Theme } from './draw.def.ts';

/** The page's own colours, so the stage looks right in the dark too. */
const THEME: Theme = { ink: 'var(--to-ink)', paper: 'var(--to-surface)', shade: 'var(--to-surface-2)' };
/** At most this many little pictures under the slider. */
const THUMBS = 16;

export class ToAnim extends DocElement<Anim> {
  @state() private mode: 'draw' | 'move' = 'draw';
  @state() private frame = 0;
  @state() private sel = -1;
  @state() private playing = false;
  /** Fractional frame while playing. */
  @state() private clock = 0;
  private touched = false;
  private raf = 0;
  private drag: { i: number; x: number; y: number; dx: number; dy: number; moved: boolean; corner?: number } | null = null;
  private thumbs: { at: number; svg: string }[] | null = null;

  protected parse(text: string) {
    return parseAnim(text);
  }
  protected serialize(doc: Anim) {
    return serializeAnim(doc);
  }
  protected loaded() {
    this.thumbs = null;
    this.frame = Math.min(this.frame, this.doc.frames - 1);
    this.sel = Math.min(this.sel, this.doc.shapes.length - 1);
    // A drawing that is already there is there to be moved; an empty stage wants drawing on.
    if (!this.touched) this.mode = this.doc.shapes.length ? 'move' : 'draw';
  }
  protected commit(doc: Anim) {
    this.thumbs = null;
    this.touched = true;
    super.commit(doc);
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

  /* ---------- time ---------- */

  private seek(frame: number) {
    this.pause();
    this.frame = Math.max(0, Math.min(this.doc.frames - 1, Math.round(frame)));
  }

  private pause() {
    if (!this.playing) return;
    this.playing = false;
    cancelAnimationFrame(this.raf);
    this.frame = Math.min(this.doc.frames - 1, Math.round(this.clock));
  }

  private toggle() {
    if (this.playing) return this.pause();
    this.playing = true;
    const t0 = performance.now() - (this.frame / this.doc.fps) * 1000;
    const tick = () => {
      if (!this.playing) return;
      this.clock = (((performance.now() - t0) / 1000) * this.doc.fps) % this.doc.frames;
      this.raf = requestAnimationFrame(tick);
    };
    tick();
  }

  private setLength(frames: number, fps: number) {
    const f = Math.max(2, Math.min(MAX_FRAMES, Math.round(frames) || this.doc.frames));
    this.frame = Math.min(this.frame, f - 1);
    this.commit({ ...this.doc, frames: f, fps, keys: this.doc.keys.map((ks) => ks.filter((k) => k.t < f)) });
  }

  /* ---------- the selected shape ---------- */

  /** Set the selected shape's key at this moment, changed as asked. */
  private key(change: Partial<Key> = {}) {
    if (this.sel < 0) return;
    this.commit(withKey(this.doc, this.sel, { ...stateAt(this.doc, this.sel, this.frame), ...change, t: this.frame }));
  }

  private toggleFx(letter: string) {
    const fx = stateAt(this.doc, this.sel, this.frame).fx;
    this.key({ fx: fx.includes(letter) ? fx.replace(letter, '') : fx + letter });
  }

  private removeSel() {
    if (this.sel < 0) return;
    this.commit(withShapes(this.doc, removeShape(this.doc.shapes, this.sel)));
    this.sel = -1;
  }

  private duplicate() {
    const s = this.doc.shapes[this.sel];
    if (!s || isLink(s.k)) return;
    const copy = { ...s, x: s.x + GRID * 2, y: s.y + GRID * 2 };
    this.commit({ ...this.doc, shapes: [...this.doc.shapes, copy], keys: [...this.doc.keys, this.doc.keys[this.sel].map((k) => ({ ...k }))] });
    this.sel = this.doc.shapes.length - 1;
  }

  private onKey = (e: KeyboardEvent) => {
    // Typing, or a control that has its own idea of what a key does: not ours.
    if (e.composedPath().some((el) => el instanceof Element && el.matches('input, textarea, select, button, sl-button, sl-select, sl-input, [role="combobox"]'))) return;
    if (e.key === ' ') this.toggle();
    // In Draw mode the keys are Draw's.
    else if (this.mode !== 'move') return;
    else if (e.key === 'ArrowLeft') this.seek(this.frame - 1);
    else if (e.key === 'ArrowRight') this.seek(this.frame + 1);
    else if (e.key === 'Home') this.seek(0);
    else if (e.key === 'End') this.seek(this.doc.frames - 1);
    else if (e.key === 'k' || e.key === 'K') this.key();
    else if (e.key === 'Delete' || e.key === 'Backspace') this.removeSel();
    else if (isKey(e, 'Mod+d')) this.duplicate();
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
    const idx = (e.target as Element).closest('[data-idx]')?.getAttribute('data-idx');
    const corner = (e.target as Element).closest('[data-corner]')?.getAttribute('data-corner');
    this.pause();
    (e.currentTarget as HTMLElement).focus({ preventScroll: true });
    if (corner !== undefined && corner !== null && this.sel >= 0) {
      // A corner of a pen shape: dragged, it moves at this moment (and the shape morphs between moments).
      e.preventDefault();
      const [x, y] = this.point(e);
      const at = stateAt(this.doc, this.sel, this.frame);
      this.drag = { i: this.sel, x, y, dx: at.dx, dy: at.dy, moved: false, corner: +corner };
      (e.currentTarget as Element).setPointerCapture(e.pointerId);
      return;
    }
    if (idx === undefined || idx === null) {
      this.sel = -1;
      return;
    }
    e.preventDefault();
    this.sel = parseInt(idx, 10);
    const [x, y] = this.point(e);
    const at = stateAt(this.doc, this.sel, this.frame);
    this.drag = { i: this.sel, x, y, dx: at.dx, dy: at.dy, moved: false };
    (e.currentTarget as Element).setPointerCapture(e.pointerId);
  }

  private onMove(e: PointerEvent) {
    const d = this.drag;
    if (!d) return;
    const [x, y] = this.point(e);
    const at = stateAt(this.doc, d.i, this.frame);
    if (d.corner !== undefined) {
      // The corner goes where the pointer is, in hundredths of the shape's box (its offset undone).
      const s = this.doc.shapes[d.i];
      const pts = (at.pts ?? s.pts ?? []).slice();
      pts[2 * d.corner] = Math.round(((x - at.dx - s.x) / s.w) * 100);
      pts[2 * d.corner + 1] = Math.round(((y - at.dy - s.y) / s.h) * 100);
      d.moved = true;
      const from = this.doc.keys[d.i]?.length || !this.frame ? this.doc : withKey(this.doc, d.i, { ...restKey(0), pts: s.pts });
      this.doc = withKey(from, d.i, { ...at, t: this.frame, pts });
      this.requestUpdate();
      return;
    }
    const [dx, dy] = [Math.round(d.dx + x - d.x), Math.round(d.dy + y - d.y)];
    if (dx === at.dx && dy === at.dy && d.moved) return;
    d.moved = true;
    // Shown as it goes; written to the link when the pointer lets go. A shape moved for the
    // first time at a later moment starts from where it was drawn.
    const from = this.doc.keys[d.i]?.length || !this.frame ? this.doc : withKey(this.doc, d.i, restKey(0));
    this.doc = withKey(from, d.i, { ...at, t: this.frame, dx, dy });
    this.requestUpdate();
  }

  private onUp() {
    const d = this.drag;
    this.drag = null;
    if (d?.moved) this.commit(this.doc);
  }

  private onDrawChange(e: CustomEvent<string>) {
    // Draw's text is not the document: ours is, with the drawing inside it.
    e.stopPropagation();
    this.commit(withShapes(this.doc, parseDrawing(e.detail)));
  }

  /** The little pictures under the slider, one every few frames; remade when the document changes. */
  private thumbnails() {
    if (!this.thumbs) {
      const step = Math.ceil(this.doc.frames / THUMBS);
      this.thumbs = [];
      for (let at = 0; at < this.doc.frames; at += step) this.thumbs.push({ at, svg: frameSvg(this.doc, at, THEME) });
    }
    return this.thumbs;
  }

  private secs(frame: number) {
    return `${(frame / this.doc.fps).toFixed(1)} s`;
  }

  private renderStage() {
    const { shapes } = this.doc;
    const now = this.playing ? this.clock : this.frame;
    return html`<svg
      class="motion-stage"
      viewBox="0 0 ${W} ${H}"
      xmlns="http://www.w3.org/2000/svg"
      role="application"
      aria-label="Stage"
      tabindex="0"
      @pointerdown=${this.onDown}
      @pointermove=${this.onMove}
      @pointerup=${this.onUp}
      @pointercancel=${this.onUp}
    >
      ${unsafeSVG(frameSvg(this.doc, now, THEME))}
      ${this.playing
        ? nothing
        : shapes.map((s, i) => {
            const [x, y, w, h] = bounds(s, shapes);
            const pad = 6;
            const k = stateAt(this.doc, i, now);
            const pts = s.k === 'v' && i === this.sel ? (k.pts ?? s.pts ?? []) : [];
            return svg`<g class="hit ${i === this.sel ? 'sel' : ''}" data-idx=${i} transform=${transformOf(s, shapes, k, now)}><rect x=${x - pad} y=${y - pad} width=${w + pad * 2} height=${h + pad * 2} rx="4" />
              ${Array.from({ length: Math.floor(pts.length / 2) }, (_, c) => svg`<circle class="corner" data-corner=${c} cx=${s.x + (pts[2 * c] / 100) * s.w} cy=${s.y + (pts[2 * c + 1] / 100) * s.h} r="6" />`)}</g>`;
          })}
    </svg>`;
  }

  private renderProps() {
    const s = this.doc.shapes[this.sel];
    if (!s) return html`<p class="motion-props to-hint">${this.doc.shapes.length ? 'Tap a shape, then drag it to where it should be at this moment.' : 'Nothing here yet: switch to Draw and draw something.'}</p>`;
    const at = stateAt(this.doc, this.sel, this.frame);
    const keyed = hasKey(this.doc, this.sel, this.frame);
    const slider = (label: string, field: 'z' | 's' | 'r', min: number, max: number, step: number, shown: string) =>
      html`<label class="motion-slider">
        <span>${label} <b>${shown}</b></span>
        <input type="range" aria-label=${label} min=${min} max=${max} step=${step} .value=${String(at[field])} @input=${(e: Event) => this.key({ [field]: parseFloat((e.target as HTMLInputElement).value) })} />
      </label>`;
    return html`<div class="motion-props">
      <div class="motion-sliders">
        ${slider('Depth', 'z', -MAX_Z, MAX_Z, 1, `${Math.round(at.z)}`)}
        ${slider('Size', 's', 0.2, 4, 0.1, `${at.s.toFixed(1)}×`)}
        ${slider('Spin', 'r', -360, 360, 1, `${Math.round(at.r)}°`)}
      </div>
      <sl-button-group label="Effects" class="motion-fx">
        ${EFFECTS.map((f) => html`<sl-button size="small" aria-pressed=${at.fx.includes(f.letter) ? 'true' : 'false'} @click=${() => this.toggleFx(f.letter)}>${f.name}</sl-button>`)}
      </sl-button-group>
      <sl-button-group label="Keys">
        <sl-button size="small" ?disabled=${keyed} @click=${() => this.key()}>${icon(UI.key, 14)} Add key here</sl-button>
        <sl-button size="small" ?disabled=${!keyed} @click=${() => this.commit(removeKey(this.doc, this.sel, this.frame))}>Remove key</sl-button>
      </sl-button-group>
      <sl-button-group label="Shape">
        ${tool('Duplicate', 'copy', () => this.duplicate(), { disabled: isLink(s.k), key: 'Mod+D', size: 16 })}
        ${tool('Delete', 'trash', () => this.removeSel(), { key: 'Delete', size: 16 })}
      </sl-button-group>
    </div>`;
  }

  private renderTimeline() {
    const { frames, fps } = this.doc;
    const shown = this.playing ? Math.floor(this.clock) : this.frame;
    const keys = this.doc.keys[this.sel] ?? [];
    return html`<div class="motion-time">
      <div class="motion-transport">
        <sl-button size="small" variant="primary" @click=${this.toggle}>${this.playing ? html`${icon(UI.pause, 14)} Pause` : html`${icon(UI.play, 14)} Play`}</sl-button>
        <span class="to-hint motion-clock" aria-live="off">${this.secs(shown)} / ${this.secs(frames - 1)}</span>
        <span class="to-spacer"></span>
        <sl-input class="motion-len" size="small" type="number" min="2" max=${MAX_FRAMES} label="Frames" .value=${String(frames)} @sl-change=${(e: Event) => this.setLength(parseInt((e.target as SlInput).value, 10), fps)}></sl-input>
        <sl-select class="motion-fps" size="small" label="Speed" hoist .value=${String(fps)} @sl-change=${(e: Event) => this.setLength(frames, parseInt((e.target as SlSelect).value as string, 10))}>
          ${FPS_CHOICES.map((f) => html`<sl-option value=${f}>${f} a second</sl-option>`)}
        </sl-select>
      </div>
      <div class="motion-scrub">
        <input type="range" aria-label="Time" min="0" max=${frames - 1} step="1" .value=${String(shown)} @input=${(e: Event) => this.seek(parseInt((e.target as HTMLInputElement).value, 10))} />
        <div class="motion-keys">
          ${keys.map((k) => html`<button class=${k.t === this.frame && !this.playing ? 'key on' : 'key'} style="left:${(k.t / Math.max(1, frames - 1)) * 100}%" aria-label="Key at ${this.secs(k.t)}" @click=${() => this.seek(k.t)}></button>`)}
        </div>
      </div>
      <div class="motion-thumbs" role="group" aria-label="Moments">
        ${this.thumbnails().map(
          (t) => html`<button class=${t.at === shown ? 'on' : ''} aria-label="Frame ${t.at + 1}, ${this.secs(t.at)}" aria-pressed=${t.at === shown ? 'true' : 'false'} @click=${() => this.seek(t.at)}>
            <svg viewBox="0 0 ${W} ${H}" aria-hidden="true">${unsafeSVG(t.svg)}</svg>
          </button>`,
        )}
      </div>
    </div>`;
  }

  render() {
    return html`
      <div class="to-toolbar" role="toolbar" aria-label="Motion">
        <sl-radio-group class="sr-label" size="small" label="Mode" value=${this.mode} @sl-change=${(e: Event) => { this.touched = true; this.pause(); this.mode = (e.target as HTMLInputElement).value as 'draw' | 'move'; }}>
          <sl-radio-button value="draw">${icon(UI.draw, 14)} Draw</sl-radio-button>
          <sl-radio-button value="move">${icon(UI.anim, 14)} Move</sl-radio-button>
        </sl-radio-group>
        <span class="to-hint">${this.mode === 'draw' ? 'Draw the things that will move.' : 'Pick a moment below, then drag a shape to where it should be.'}</span>
      </div>
      ${this.mode === 'draw'
        ? html`<to-draw class="motion-draw" .value=${serializeDrawing(this.doc.shapes)} @docchange=${this.onDrawChange}></to-draw>`
        : html`<div class="motion">${this.renderStage()}${this.renderProps()}</div>`}
      ${this.renderTimeline()}
    `;
  }
}

defineElement('anim', ToAnim);

declare global {
  interface HTMLElementTagNameMap {
    'to-anim': ToAnim;
  }
}
