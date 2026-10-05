/**
 * <to-tune>: a two-bar piano roll. Tap a square to put a note there, drag to
 * the right to make it longer, tap a note to remove it.
 * Document format: see lib/tunemodel.ts.
 */
import { LitElement, html, svg, nothing, type PropertyValues } from 'lit';
import { customElement, property, state } from 'lit/decorators.js';
import { icon, UI } from '../lib/icons.ts';
import { PITCHES, STEPS, frequency, isBlackKey, parseTune, pitchName, serializeTune, stepSeconds, type Note, type Tune } from '../lib/tunemodel.ts';
import type { SlInput } from '../lib/shoelace.ts';

const CW = 24; // cell width
const CH = 16; // cell height
const KEYS = 44; // width of the note names

@customElement('to-tune')
export class ToTune extends LitElement {
  @property() value = '';
  @state() private tune: Tune = parseTune('');
  @state() private playing = false;
  @state() private head = -1;
  private lastEmitted = '';
  private drag: { note: Note; fresh: boolean; moved: boolean } | null = null;
  private audio: AudioContext | null = null;
  private nextPass = 0;
  private raf = 0;

  createRenderRoot() {
    return this;
  }

  willUpdate(changed: PropertyValues) {
    if (changed.has('value') && this.value !== this.lastEmitted) {
      this.tune = parseTune(this.value);
      this.lastEmitted = this.value;
    }
  }

  disconnectedCallback() {
    super.disconnectedCallback();
    this.stop();
  }

  private commit(tune: Tune) {
    this.tune = tune;
    this.lastEmitted = serializeTune(tune);
    this.dispatchEvent(new CustomEvent('docchange', { detail: this.lastEmitted, bubbles: true, composed: true }));
  }

  /* ---------- sound ---------- */

  private ctx(): AudioContext | null {
    try {
      this.audio ??= new AudioContext();
      if (this.audio.state === 'suspended') void this.audio.resume();
      return this.audio;
    } catch {
      return null;
    }
  }

  private beep(pitch: number, at: number, seconds: number) {
    const ctx = this.audio;
    if (!ctx) return;
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.type = 'triangle';
    osc.frequency.value = frequency(pitch);
    gain.gain.setValueAtTime(0, at);
    gain.gain.linearRampToValueAtTime(0.22, at + 0.01);
    gain.gain.setValueAtTime(0.22, at + Math.max(0.02, seconds - 0.03));
    gain.gain.linearRampToValueAtTime(0, at + seconds);
    osc.connect(gain).connect(ctx.destination);
    osc.start(at);
    osc.stop(at + seconds + 0.02);
  }

  private play() {
    const ctx = this.ctx();
    if (!ctx) return;
    this.playing = true;
    this.nextPass = ctx.currentTime + 0.05;
    const start = this.nextPass;
    const tick = () => {
      if (!this.playing) return;
      const step = stepSeconds(this.tune.bpm);
      const loop = step * STEPS;
      // Queue each pass through the loop a little before it starts.
      if (ctx.currentTime > this.nextPass - 0.15) {
        for (const n of this.tune.notes) this.beep(n.pitch, this.nextPass + n.step * step, n.len * step);
        this.nextPass += loop;
      }
      const t = ctx.currentTime - start;
      this.head = t < 0 ? -1 : Math.floor((t % loop) / step);
      this.raf = requestAnimationFrame(tick);
    };
    tick();
  }

  private stop() {
    this.playing = false;
    this.head = -1;
    cancelAnimationFrame(this.raf);
    void this.audio?.close();
    this.audio = null;
  }

  /* ---------- editing ---------- */

  private cellAt(e: PointerEvent): [number, number] {
    const box = this.querySelector('.tune-roll')!.getBoundingClientRect();
    const scale = box.width / (KEYS + STEPS * CW);
    const step = Math.floor(((e.clientX - box.left) / scale - KEYS) / CW);
    const row = Math.floor((e.clientY - box.top) / scale / CH);
    return [Math.max(0, Math.min(STEPS - 1, step)), PITCHES - 1 - Math.max(0, Math.min(PITCHES - 1, row))];
  }

  private onDown(e: PointerEvent) {
    const [step, pitch] = this.cellAt(e);
    if ((e.clientX - this.querySelector('.tune-roll')!.getBoundingClientRect().left) < 0) return;
    (e.currentTarget as Element).setPointerCapture(e.pointerId);
    const hit = this.tune.notes.find((n) => n.pitch === pitch && step >= n.step && step < n.step + n.len);
    if (hit) {
      this.drag = { note: hit, fresh: false, moved: false };
      return;
    }
    const note: Note = { step, pitch, len: 1 };
    this.commit({ ...this.tune, notes: [...this.tune.notes, note] });
    this.drag = { note, fresh: true, moved: false };
    if (!this.playing && this.ctx()) this.beep(pitch, this.audio!.currentTime, 0.18);
  }

  private onMove(e: PointerEvent) {
    const d = this.drag;
    if (!d) return;
    const [step] = this.cellAt(e);
    const len = Math.max(1, Math.min(STEPS - d.note.step, step - d.note.step + 1));
    if (len === d.note.len) return;
    d.moved = true;
    const note = { ...d.note, len };
    this.commit({ ...this.tune, notes: this.tune.notes.map((n) => (n === d.note ? note : n)) });
    d.note = note;
  }

  private onUp() {
    const d = this.drag;
    this.drag = null;
    // A tap on an existing note removes it.
    if (d && !d.fresh && !d.moved) this.commit({ ...this.tune, notes: this.tune.notes.filter((n) => n !== d.note) });
  }

  render() {
    const w = KEYS + STEPS * CW;
    const h = PITCHES * CH;
    const rows = Array.from({ length: PITCHES }, (_, r) => PITCHES - 1 - r);
    return html`
      <div class="to-toolbar">
        <sl-button size="small" variant="primary" @click=${() => (this.playing ? this.stop() : this.play())}>${this.playing ? html`${icon(UI.stop, 14)} Stop` : html`${icon(UI.play, 14)} Play`}</sl-button>
        <sl-input
          class="tune-bpm"
          size="small"
          type="number"
          min="30"
          max="300"
          label="Tempo"
          .value=${String(this.tune.bpm)}
          @sl-change=${(e: Event) => this.commit({ ...this.tune, bpm: Math.max(30, Math.min(300, parseInt((e.target as SlInput).value, 10) || 120)) })}
        ><span slot="suffix">bpm</span></sl-input>
        <span class="to-spacer"></span>
        <span class="to-hint">${this.tune.notes.length} notes</span>
        <sl-tooltip content="Remove every note" hoist><sl-button class="icon" size="small" aria-label="Clear" ?disabled=${!this.tune.notes.length} @click=${() => this.commit({ ...this.tune, notes: [] })}>${icon(UI.trash, 14)}<span class="sr-only">Clear</span></sl-button></sl-tooltip>
      </div>
      <div class="tune-scroll">
        <svg class="tune-roll" viewBox="0 0 ${w} ${h}" width=${w} height=${h} role="application" aria-label="Piano roll" @pointerdown=${this.onDown} @pointermove=${this.onMove} @pointerup=${this.onUp} @pointercancel=${this.onUp}>
          ${rows.map(
            (p, r) => svg`<rect class=${isBlackKey(p) ? 'row black' : 'row'} x=${KEYS} y=${r * CH} width=${STEPS * CW} height=${CH} />
              <text class=${p % 12 === 0 ? 'key c' : 'key'} x=${KEYS - 6} y=${r * CH + CH / 2} text-anchor="end" dominant-baseline="central">${pitchName(p)}</text>`,
          )}
          ${Array.from({ length: STEPS + 1 }, (_, s) => svg`<line class=${s % 16 === 0 ? 'bar' : s % 4 === 0 ? 'beat' : 'step'} x1=${KEYS + s * CW} y1="0" x2=${KEYS + s * CW} y2=${h} />`)}
          ${rows.map((_, r) => svg`<line class="step" x1=${KEYS} y1=${r * CH} x2=${w} y2=${r * CH} />`)}
          ${this.head >= 0 ? svg`<rect class="head" x=${KEYS + this.head * CW} y="0" width=${CW} height=${h} />` : nothing}
          ${this.tune.notes.map((n) => svg`<rect class="note" data-note="${n.step},${n.pitch},${n.len}" x=${KEYS + n.step * CW + 1} y=${(PITCHES - 1 - n.pitch) * CH + 1} width=${n.len * CW - 2} height=${CH - 2} rx="3" />`)}
        </svg>
      </div>
    `;
  }
}

declare global {
  interface HTMLElementTagNameMap {
    'to-tune': ToTune;
  }
}
