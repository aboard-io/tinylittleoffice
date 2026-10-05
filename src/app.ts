/**
 * <to-app>: the shell. Owns the URL. Routes "#/<app>/<payload>" to one of the
 * mini apps, hands it the decoded document, and writes every change straight
 * back into the URL via history.replaceState.
 */
import { LitElement, html, css, nothing } from 'lit';
import { customElement, state } from 'lit/decorators.js';
import { encodeDoc, decodeDoc, budgetFor, URL_LIMIT } from './lib/codec.ts';
import { icon, UI } from './lib/icons.ts';
import { retro } from './lib/styles.ts';

export type AppId = 'sheet' | 'write' | 'deck' | 'draw' | 'cal';

const APPS: { id: AppId; name: string; blurb: string; icon: keyof typeof UI }[] = [
  { id: 'sheet', name: 'Sheet', blurb: '20 rows, 3 columns, formulas.', icon: 'sheet' },
  { id: 'write', name: 'Write', blurb: 'A rich-text page.', icon: 'write' },
  { id: 'deck', name: 'Deck', blurb: 'Up to ten slides with icons.', icon: 'deck' },
  { id: 'draw', name: 'Draw', blurb: 'Boxes, arrows and labels.', icon: 'draw' },
  { id: 'cal', name: 'Calendar', blurb: 'Labelled spans of time, in any zone.', icon: 'cal' },
];

function parseHash(hash: string): { app: AppId | null; payload: string } {
  const m = /^#\/(sheet|write|deck|draw|cal)(?:\/(.*))?$/.exec(hash);
  if (!m) return { app: null, payload: '' };
  return { app: m[1] as AppId, payload: m[2] ?? '' };
}

@customElement('to-app')
export class ToApp extends LitElement {
  static styles = [
    retro,
    css`
      :host {
        display: flex;
        flex-direction: column;
        min-height: 100vh;
      }
      .menubar {
        display: flex;
        align-items: center;
        gap: 4px;
        padding: 3px 8px;
        background: var(--paper);
        border-bottom: 1px solid var(--ink);
        box-shadow: 0 1px 0 var(--paper), 0 2px 0 var(--ink);
        position: sticky;
        top: 0;
        z-index: 5;
      }
      .brand {
        font-weight: bold;
        display: inline-flex;
        align-items: center;
        gap: 6px;
        margin-right: 8px;
        color: inherit;
        text-decoration: none;
      }
      .menubar a.app {
        padding: 2px 8px;
        color: inherit;
        text-decoration: none;
        border-radius: 3px;
        display: inline-flex;
        align-items: center;
        gap: 4px;
      }
      .menubar a.app:hover {
        background: var(--paper-dim);
      }
      .menubar a.app[aria-current='page'] {
        background: var(--ink);
        color: var(--paper);
      }
      .spacer {
        flex: 1;
      }
      .window {
        margin: 24px auto;
        width: min(960px, calc(100% - 24px));
        background: var(--paper);
        border: 1px solid var(--ink);
        box-shadow: 2px 2px 0 var(--ink);
        display: flex;
        flex-direction: column;
      }
      .titlebar {
        position: relative;
        height: 22px;
        border-bottom: 1px solid var(--ink);
        background: repeating-linear-gradient(to bottom, var(--ink) 0 1px, var(--paper) 1px 3px);
        background-clip: content-box;
        padding: 3px 4px;
        display: flex;
        align-items: center;
        justify-content: center;
      }
      .titlebar .title {
        background: var(--paper);
        padding: 0 10px;
        font-weight: bold;
        font-size: 12px;
        line-height: 16px;
        position: relative;
      }
      .titlebar .closebox {
        position: absolute;
        left: 8px;
        top: 4px;
        width: 13px;
        height: 13px;
        border: 1px solid var(--ink);
        background: var(--paper);
        box-shadow: 1px 1px 0 var(--paper), -1px -1px 0 var(--paper);
        text-decoration: none;
        display: block;
      }
      .titlebar .closebox:hover {
        background: var(--ink);
      }
      .body {
        min-height: 300px;
      }
      .status {
        display: flex;
        align-items: center;
        gap: 10px;
        padding: 4px 8px;
        border-top: 1px solid var(--ink);
        background: var(--paper-dim);
        font-size: 11px;
      }
      .meter {
        flex: 1;
        max-width: 320px;
        height: 10px;
        border: 1px solid var(--ink);
        background: var(--paper);
        position: relative;
      }
      .meter > i {
        position: absolute;
        inset: 0;
        right: auto;
        background: var(--ink);
        background-image: repeating-linear-gradient(90deg, transparent 0 2px, var(--paper) 2px 3px);
      }
      .status.over .meter > i {
        background: #c00;
        background-image: none;
      }
      .status.over .count {
        color: #c00;
        font-weight: bold;
      }
      .status .count {
        font-variant-numeric: tabular-nums;
        white-space: nowrap;
      }
      .home {
        padding: 32px 24px;
        text-align: center;
      }
      .home h1 {
        font-size: 22px;
        margin: 0 0 4px;
      }
      .home p.lede {
        margin: 0 0 24px;
      }
      .launcher {
        display: grid;
        grid-template-columns: repeat(auto-fit, minmax(160px, 1fr));
        gap: 16px;
        max-width: 720px;
        margin: 0 auto 24px;
      }
      .launcher a {
        display: flex;
        flex-direction: column;
        align-items: center;
        gap: 8px;
        padding: 20px 12px;
        border: 1px solid var(--ink);
        box-shadow: 2px 2px 0 var(--ink);
        color: inherit;
        text-decoration: none;
        background: var(--paper);
      }
      .launcher a:hover {
        background: var(--paper-dim);
      }
      .launcher a:active {
        transform: translate(1px, 1px);
        box-shadow: 1px 1px 0 var(--ink);
      }
      .launcher b {
        font-size: 15px;
      }
      .launcher span {
        font-size: 11px;
        opacity: 0.8;
      }
      .fine {
        font-size: 11px;
        opacity: 0.75;
        max-width: 520px;
        margin: 0 auto;
      }
      .toast {
        position: fixed;
        bottom: 16px;
        left: 50%;
        transform: translateX(-50%);
        background: var(--ink);
        color: var(--paper);
        padding: 6px 14px;
        border-radius: 4px;
        font-size: 12px;
        z-index: 20;
      }
    `,
  ];

  @state() private app: AppId | null = null;
  @state() private doc = '';
  @state() private payloadLength = 0;
  @state() private toast = '';
  private toastTimer = 0;

  connectedCallback() {
    super.connectedCallback();
    window.addEventListener('hashchange', this.onHash);
    this.onHash();
  }
  disconnectedCallback() {
    super.disconnectedCallback();
    window.removeEventListener('hashchange', this.onHash);
  }

  private onHash = () => {
    const { app, payload } = parseHash(location.hash);
    this.app = app;
    this.doc = decodeDoc(payload);
    this.payloadLength = payload.length;
  };

  private get urlPrefix(): string {
    return `${location.origin}${location.pathname}${location.search}#/${this.app}/`;
  }

  private onDocChange(e: CustomEvent<string>) {
    if (!this.app) return;
    this.doc = e.detail;
    const payload = encodeDoc(this.doc);
    this.payloadLength = payload.length;
    history.replaceState(null, '', `#/${this.app}/${payload}`);
  }

  private async copyLink() {
    try {
      await navigator.clipboard.writeText(location.href);
      this.showToast('Link copied. The link is the document.');
    } catch {
      this.showToast('Copy failed. Grab the URL from the address bar.');
    }
  }

  private showToast(msg: string) {
    this.toast = msg;
    clearTimeout(this.toastTimer);
    this.toastTimer = window.setTimeout(() => (this.toast = ''), 2200);
  }

  render() {
    const current = APPS.find((a) => a.id === this.app);
    return html`
      <nav class="menubar">
        <a class="brand" href="#/">${icon(UI.sparkles, 14)} TinyOffice</a>
        ${APPS.map(
          (a) => html`<a class="app" href="#/${a.id}" aria-current=${a.id === this.app ? 'page' : nothing}>${icon(UI[a.icon], 14)} ${a.name}</a>`,
        )}
        <span class="spacer"></span>
        ${current
          ? html`
              <a class="btn" href="#/${current.id}" title="Start a blank ${current.name} document">${icon(UI.plus, 14)} New</a>
              <button @click=${this.copyLink} title="Copy the URL, which is the whole document">${icon(UI.link, 14)} Copy link</button>
            `
          : nothing}
      </nav>
      ${current ? this.renderWindow(current) : this.renderHome()}
      ${this.toast ? html`<div class="toast" role="status">${this.toast}</div>` : nothing}
    `;
  }

  private renderWindow(current: (typeof APPS)[number]) {
    const { available } = budgetFor(this.urlPrefix);
    const used = this.payloadLength;
    const over = used > available;
    const pct = Math.min(100, (used / Math.max(1, available)) * 100);
    return html`
      <section class="window" aria-label=${current.name}>
        <div class="titlebar">
          <a class="closebox" href="#/" title="Close (back to the launcher)" aria-label="Close"></a>
          <span class="title">${current.name}</span>
        </div>
        <div class="body" @docchange=${this.onDocChange}>${this.renderApp()}</div>
        <div class="status ${over ? 'over' : ''}">
          <span class="count">${used.toLocaleString()} / ${available.toLocaleString()} URL chars</span>
          <div class="meter" role="progressbar" aria-valuemin="0" aria-valuemax=${available} aria-valuenow=${used}>
            <i style="width:${pct}%"></i>
          </div>
          <span class="hint">${over ? `Over the ${URL_LIMIT} character limit. Trim a little so the link stays shareable.` : 'Everything lives in the URL. Copy the link to save or share.'}</span>
        </div>
      </section>
    `;
  }

  private renderApp() {
    switch (this.app) {
      case 'sheet':
        return html`<to-sheet .value=${this.doc}></to-sheet>`;
      case 'write':
        return html`<to-write .value=${this.doc}></to-write>`;
      case 'deck':
        return html`<to-deck .value=${this.doc}></to-deck>`;
      case 'draw':
        return html`<to-draw .value=${this.doc}></to-draw>`;
      case 'cal':
        return html`<to-cal .value=${this.doc}></to-cal>`;
    }
    return nothing;
  }

  private renderHome() {
    return html`
      <section class="window">
        <div class="titlebar"><span class="title">TinyOffice</span></div>
        <div class="body home">
          <h1>TinyOffice</h1>
          <p class="lede">Five tiny apps. No server. Every document lives entirely in its URL, under 2,048 characters.</p>
          <div class="launcher">
            ${APPS.map((a) => html`<a href="#/${a.id}">${icon(UI[a.icon], 40)}<b>${a.name}</b><span>${a.blurb}</span></a>`)}
          </div>
          <p class="fine">
            There is nothing to save: the address bar is the file. Bookmark it, paste it in a chat, or write it on a napkin.
            Text is compressed before it goes into the link, so you'll fit more than you'd think.
          </p>
        </div>
      </section>
    `;
  }
}

declare global {
  interface HTMLElementTagNameMap {
    'to-app': ToApp;
  }
}
