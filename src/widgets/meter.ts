/**
 * <to-meter>: how much of the URL budget a document has used, with a copy
 * button for the link. Clicking the ring or the count opens the document
 * dialog (the shell listens for "to-info").
 */
import { LitElement, html } from 'lit';
import { customElement, property } from 'lit/decorators.js';

@customElement('to-meter')
export class ToMeter extends LitElement {
  @property({ type: Number }) used = 0;
  @property({ type: Number }) available = 1;
  @property() href = '';

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
      <sl-progress-ring
        value=${pct}
        label=${title}
        title=${title}
        role="button"
        tabindex="0"
        @click=${this.info}
        @keydown=${(e: KeyboardEvent) => (e.key === 'Enter' || e.key === ' ') && this.info()}
      ></sl-progress-ring>
      <span class="text" @click=${this.info}>${left < 0 ? html`<b>${(-left).toLocaleString()} over</b>` : html`<b>${left.toLocaleString()}</b> left`}</span>
      <sl-copy-button
        value=${this.href}
        copy-label="Copy link (the link is the document)"
        success-label="Copied"
        error-label="Couldn't copy; use the address bar"
        hoist
      ></sl-copy-button>
    </div>`;
  }
}

declare global {
  interface HTMLElementTagNameMap {
    'to-meter': ToMeter;
  }
}
