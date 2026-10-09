/**
 * <to-meter>: how much of the URL budget a document has used, with a copy
 * button for the link (the shell listens for "to-copy"). Clicking the ring or the count opens the document
 * dialog (the shell listens for "to-info").
 */
import { LitElement, html, property, btn } from '../kit.ts';
import { roomRows, type Room } from '../lib/limits.ts';
import type { TipEvent } from '../kit/tip.ts';

/** The rooms as a table, for anywhere they are shown. */
export const roomsTable = (rooms: Room[]) => html`<table class="to-rooms">
  <thead><tr><th scope="col">Where</th><th scope="col">Limit</th><th scope="col">This link</th><th scope="col">Left</th><th scope="col">Note</th></tr></thead>
  <tbody>${roomRows(rooms).map((r) => html`<tr class=${r.over ? 'over' : ''}><th scope="row">${r.name}</th><td>${r.max}</td><td>${r.used}</td><td>${r.left}</td><td class="to-hint">${r.note}</td></tr>`)}</tbody>
</table>`;

export class ToMeter extends LitElement {
  @property({ type: Number }) used = 0;
  @property({ type: Number }) available = 1;
  @property() href = '';
  /** How the link fits in the places links get pasted; shown in the tip. */
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
      <span class="to-meter-main" data-tip=${title} @to-tip=${(e: TipEvent) => (e.detail.content = html`<div class="to-meter-rooms">${roomsTable(this.rooms)}</div>`)}>
        <sl-progress-ring
          value=${Math.round(pct * 10) / 10}
          label=${title}
          aria-label=${`${title}: how much room the link has, and where it fits`}
          role="button"
          tabindex="0"
          @click=${this.info}
          @keydown=${(e: KeyboardEvent) => (e.key === 'Enter' || e.key === ' ') && this.info()}
        ></sl-progress-ring>
        <span class="text" @click=${this.info}>${left < 0 ? html`<b>${(-left).toLocaleString()} over</b>` : html`<b>${left.toLocaleString()}</b> left`}</span>
      </span>
      ${btn('Copy link', 'copy', () => this.dispatchEvent(new CustomEvent('to-copy', { bubbles: true, composed: true })), { cls: 'copy', size: 22 })}
    </div>`;
  }
}

declare global {
  interface HTMLElementTagNameMap {
    'to-meter': ToMeter;
  }
}
if (!customElements.get('to-meter')) customElements.define('to-meter', ToMeter);
