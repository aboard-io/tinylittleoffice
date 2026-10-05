/**
 * <to-meter>: how much of the URL budget a document has used, with a copy
 * button for the link (the shell listens for "to-copy"). Clicking the ring or the count opens the document
 * dialog (the shell listens for "to-info").
 */
import { LitElement, html } from 'lit';
import { customElement, property } from 'lit/decorators.js';
import type { Room } from '../lib/limits.ts';
import { icon, UI } from '../lib/icons.ts';

@customElement('to-meter')
export class ToMeter extends LitElement {
  @property({ type: Number }) used = 0;
  @property({ type: Number }) available = 1;
  @property() href = '';
  /** How the link fits in the places links get pasted; shown on hover. */
  @property({ attribute: false }) rooms: Room[] = [];

  createRenderRoot() {
    return this;
  }

  private info() {
    this.dispatchEvent(new CustomEvent('to-info', { bubbles: true, composed: true }));
  }

  render() {
    const left = this.available - this.used;
    const pct = Math.max(0, Math.min(100, (this.used / Math.max(1, this.available)) * 100));
    const state = left < 0 ? 'over' : pct > 85 ? 'warn' : '';
    const title = left < 0 ? `${(-left).toLocaleString()} characters over the URL limit` : `${left.toLocaleString()} of ${this.available.toLocaleString()} URL characters left`;
    return html`<div class="to-meter ${state}" role="group" aria-label="URL space">
      <sl-tooltip hoist placement="bottom" trigger="hover" style="--max-width: 22rem">
      <div slot="content" class="to-meter-rooms">
        ${this.rooms.map((r) => html`<div class=${r.left < 0 ? 'over' : ''}><b>${r.target.name}</b><span>${r.left < 0 ? `${(-r.left).toLocaleString()} over` : `${r.left.toLocaleString()} left`}</span><i>${r.target.note}</i></div>`)}
      </div>
      <span class="to-meter-main">
      <sl-progress-ring
        value=${pct}
        label=${title}
        role="button"
        tabindex="0"
        @click=${this.info}
        @keydown=${(e: KeyboardEvent) => (e.key === 'Enter' || e.key === ' ') && this.info()}
      ></sl-progress-ring>
      <span class="text" @click=${this.info}>${left < 0 ? html`<b>${(-left).toLocaleString()} over</b>` : html`<b>${left.toLocaleString()}</b> left`}</span>
      </span>
      </sl-tooltip>
      <button class="copy" type="button" aria-label="Copy link" title="Copy link" @click=${() => this.dispatchEvent(new CustomEvent('to-copy', { bubbles: true, composed: true }))}>${icon(UI.copy, 15)}</button>
    </div>`;
  }
}

declare global {
  interface HTMLElementTagNameMap {
    'to-meter': ToMeter;
  }
}
