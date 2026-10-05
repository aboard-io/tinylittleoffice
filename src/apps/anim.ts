/**
 * <to-anim>: icons and text that move around a stage. Put the slider on a
 * moment, drag something to where it should be at that moment, and it will
 * travel there from wherever it was before.
 * Document format: see lib/animmodel.ts.
 */
import { LitElement, html, svg, nothing, type PropertyValues } from 'lit';
import { customElement, property, state } from 'lit/decorators.js';
import { unsafeSVG } from 'lit/directives/unsafe-svg.js';
import { icon, iconInner, LIBRARY, UI } from '../lib/icons.ts';
import { searchIcons } from '../lib/iconsearch.ts';
import { animItemSvg } from '../lib/exports.ts';
import { FPS, GRID, H, MAX_FRAMES, MAX_ITEMS, W, parseAnim, serializeAnim, stateAt, withKey, type Anim, type Item } from '../lib/animmodel.ts';
import type { SlDialog, SlInput } from '../lib/shoelace.ts';

/** Every library icon as SVG markup, for drawing on the stage and in exports. */
export const ICON_SVG: Record<string, string> = Object.fromEntries(Object.entries(LIBRARY).map(([name, node]) => [name, iconInner(node)]));

@customElement('to-anim')
export class ToAnim extends LitElement {
  @property() value = '';
  @state() private anim: Anim = parseAnim('');
  @state() private frame = 0;
  @state() private sel = -1;
  @state() private playing = false;
  /** Fractional frame while playing. */
  @state() private clock = 0;
  @state() private query = '';
  private lastEmitted = '';
  private raf = 0;
  private drag: { i: number; dx: number; dy: number } | null = null;

  createRenderRoot() {
    return this;
  }

  willUpdate(changed: PropertyValues) {
    if (changed.has('value') && this.value !== this.lastEmitted) {
      this.anim = parseAnim(this.value);
      this.lastEmitted = this.value;
      this.frame = Math.min(this.frame, this.anim.frames - 1);
      this.sel = Math.min(this.sel, this.anim.items.length - 1);
    }
  }

  disconnectedCallback() {
    super.disconnectedCallback();
    cancelAnimationFrame(this.raf);
  }

  private commit(anim: Anim) {
    this.anim = anim;
    this.lastEmitted = serializeAnim(anim);
    this.dispatchEvent(new CustomEvent('docchange', { detail: this.lastEmitted, bubbles: true, composed: true }));
  }

  private setItem(i: number, item: Item) {
    this.commit({ ...this.anim, items: this.anim.items.map((it, j) => (j === i ? item : it)) });
  }

  private add(kind: 'i' | 't', value: string) {
    if (this.anim.items.length >= MAX_ITEMS) return;
    // New things start in the middle and stay there until they are given somewhere to go.
    const item: Item = { kind, value, keys: [{ t: 0, x: W / 2, y: H / 2, s: 1 }] };
    this.commit({ ...this.anim, items: [...this.anim.items, item] });
    this.sel = this.anim.items.length - 1;
  }

  private toggle() {
    if (this.playing) {
      this.playing = false;
      cancelAnimationFrame(this.raf);
      return;
    }
    this.playing = true;
    const t0 = performance.now();
    const span = this.anim.frames - 1;
    const tick = () => {
      if (!this.playing) return;
      this.clock = (((performance.now() - t0) / 1000) * FPS) % span;
      this.raf = requestAnimationFrame(tick);
    };
    tick();
  }

  private point(e: PointerEvent): [number, number] {
    const box = this.querySelector('.anim-stage')!.getBoundingClientRect();
    return [((e.clientX - box.left) / box.width) * W, ((e.clientY - box.top) / box.height) * H];
  }

  private onItemDown(e: PointerEvent, i: number) {
    if (this.playing) return;
    e.preventDefault();
    this.sel = i;
    const [x, y] = this.point(e);
    const at = stateAt(this.anim.items[i], this.frame);
    this.drag = { i, dx: at.x - x, dy: at.y - y };
    this.querySelector('.anim-stage')!.setPointerCapture(e.pointerId);
  }

  private onMove(e: PointerEvent) {
    const d = this.drag;
    if (!d) return;
    const [px, py] = this.point(e);
    const snap = (v: number, max: number) => Math.max(0, Math.min(max, Math.round((v) / GRID) * GRID));
    const item = this.anim.items[d.i];
    const at = stateAt(item, this.frame);
    const x = snap(px + d.dx, W);
    const y = snap(py + d.dy, H);
    if (x !== at.x || y !== at.y || !item.keys.some((k) => k.t === this.frame)) this.setItem(d.i, withKey(item, { t: this.frame, x, y, s: at.s }));
  }

  private picker(): SlDialog | null {
    return this.querySelector<SlDialog>('#anim-icons');
  }

  render() {
    const { frames, items } = this.anim;
    const now = this.playing ? this.clock : this.frame;
    const cur = items[this.sel];
    const at = cur ? stateAt(cur, this.frame) : null;
    const hasKey = !!cur?.keys.some((k) => k.t === this.frame);
    const full = items.length >= MAX_ITEMS;
    return html`
      <div class="to-toolbar">
        <sl-button size="small" ?disabled=${full} @click=${() => { this.query = ''; this.picker()?.show(); }}>${icon(UI.smile, 14)} Icon</sl-button>
        <sl-button size="small" ?disabled=${full} @click=${() => this.add('t', 'Text')}>${icon(UI.text, 14)} Text</sl-button>
        <sl-tooltip content="Delete the selected thing" hoist><sl-button class="icon" size="small" aria-label="Delete" ?disabled=${!cur} @click=${() => { this.commit({ ...this.anim, items: items.filter((_, j) => j !== this.sel) }); this.sel = -1; }}>${icon(UI.trash, 14)}<span class="sr-only">Delete</span></sl-button></sl-tooltip>
        <span class="to-spacer"></span>
        <sl-input
          class="anim-len"
          size="small"
          type="number"
          min="1"
          max=${MAX_FRAMES / FPS}
          label="Length"
          .value=${String((frames - 1) / FPS)}
          @sl-change=${(e: Event) => {
            const f = Math.max(2, Math.min(MAX_FRAMES, Math.round((parseFloat((e.target as SlInput).value) || 1) * FPS) + 1));
            this.frame = Math.min(this.frame, f - 1);
            this.commit({ frames: f, items: items.map((it) => ({ ...it, keys: it.keys.filter((k, n) => k.t < f || n === 0).map((k) => ({ ...k, t: Math.min(k.t, f - 1) })) })) });
          }}
        ><span slot="suffix">s</span></sl-input>
        <sl-button size="small" variant="primary" @click=${this.toggle}>${this.playing ? html`${icon(UI.stop, 14)} Stop` : html`${icon(UI.play, 14)} Play`}</sl-button>
      </div>
      <div class="anim">
        <svg class="anim-stage" viewBox="0 0 ${W} ${H}" role="application" aria-label="Stage" @pointermove=${this.onMove} @pointerup=${() => (this.drag = null)} @pointercancel=${() => (this.drag = null)} @pointerdown=${(e: PointerEvent) => e.target === e.currentTarget && (this.sel = -1)}>
          ${items.map((it, i) => {
            const k = stateAt(it, now);
            return svg`<g class="item ${i === this.sel && !this.playing ? 'sel' : ''}" data-idx=${i} transform="translate(${k.x} ${k.y}) scale(${k.s})" @pointerdown=${(e: PointerEvent) => this.onItemDown(e, i)}>
              <rect class="hit" x="-30" y="-30" width="60" height="60" rx="8" />
              ${unsafeSVG(animItemSvg(it, ICON_SVG))}
            </g>`;
          })}
        </svg>
        <div class="anim-time">
          <input type="range" aria-label="Time" min="0" max=${frames - 1} step="1" .value=${String(this.frame)} ?disabled=${this.playing} @input=${(e: Event) => (this.frame = parseInt((e.target as HTMLInputElement).value, 10))} />
          <span class="to-hint">${(this.frame / FPS).toFixed(2)} s</span>
        </div>
        <ul class="anim-rows" aria-label="Things">
          ${items.map(
            (it, i) => html`<li class=${i === this.sel ? 'sel' : ''}>
              <button class="who" @click=${() => (this.sel = i)}>${it.kind === 'i' && LIBRARY[it.value] ? icon(LIBRARY[it.value], 14) : icon(UI.text, 14)}<span>${it.value}</span></button>
              <span class="track">
                ${it.keys.map((k) => html`<button class=${k.t === this.frame ? 'key on' : 'key'} style="left:${(k.t / (frames - 1)) * 100}%" aria-label="${it.value} at ${(k.t / FPS).toFixed(2)} s" @click=${() => { this.sel = i; this.frame = k.t; }}></button>`)}
              </span>
            </li>`,
          )}
          ${items.length ? nothing : html`<li class="to-empty">Add an icon or some text, then give it somewhere to go.</li>`}
        </ul>
        ${cur && at
          ? html`<div class="anim-props">
              ${cur.kind === 't' ? html`<sl-input size="small" label="Text" .value=${cur.value} @sl-input=${(e: Event) => this.setItem(this.sel, { ...cur, value: (e.target as SlInput).value })}></sl-input>` : nothing}
              <label>Size <input type="range" aria-label="Size" min="0.5" max="4" step="0.1" .value=${String(at.s)} @input=${(e: Event) => this.setItem(this.sel, withKey(cur, { ...at, t: this.frame, s: parseFloat((e.target as HTMLInputElement).value) }))} /></label>
              <sl-button size="small" ?disabled=${!hasKey || cur.keys.length < 2} @click=${() => this.setItem(this.sel, { ...cur, keys: cur.keys.filter((k) => k.t !== this.frame) })}>Forget this moment</sl-button>
            </div>`
          : nothing}
      </div>
      <sl-dialog id="anim-icons" label="Icon">
        <sl-input class="deck-search" size="small" type="search" placeholder="Search icons" aria-label="Search icons" autofocus clearable .value=${this.query} @sl-input=${(e: Event) => (this.query = (e.target as SlInput).value)}><span slot="prefix">${icon(UI.search, 14)}</span></sl-input>
        <div class="deck-picker" role="listbox" aria-label="Icon library">
          ${searchIcons(this.query).map((name) => html`<button title=${name} aria-label=${name} @click=${() => { this.add('i', name); this.picker()?.hide(); }}>${icon(LIBRARY[name], 22)}</button>`)}
        </div>
      </sl-dialog>
    `;
  }
}

declare global {
  interface HTMLElementTagNameMap {
    'to-anim': ToAnim;
  }
}
