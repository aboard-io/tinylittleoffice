/**
 * <to-compare>: two links side by side, and the lines the second changed.
 * For a person reviewing what an agent (or a colleague) did to a document,
 * and for the agents themselves. Reached at #/compare, or from Share.
 */
import { LINK, LitElement, html, nothing } from '../kit.ts';
import { appOf } from '../kit/core.ts';
import { decodeEnvelope, type Envelope } from '../lib/envelope.ts';
import { diff } from '../lib/diff.ts';
import { toMarkdown } from '../lib/markdown.ts';
import { icon, UI } from '../lib/icons.ts';
import type { SlInput } from '../lib/shoelace.ts';

export interface Side {
  app: string;
  payload: string;
}

const ROUTE = /#\/(?:v\d+\/)?([a-z0-9-]+)(?:\.[A-Za-z0-9]+)?\/([^/?#]+)/;

/** The app and payload in a link, or null when it is not one of ours (or is sealed). */
export function sideOf(link: string): Side | null {
  const m = ROUTE.exec(link.trim());
  if (!m || !appOf(m[1]) || m[2][0] === 'E') return null;
  return { app: m[1], payload: m[2] };
}

/** #/compare/<app>/<payload>/<app>/<payload> */
export function compareHash(a: Side, b: Side): string {
  return `#/compare/${a.app}/${a.payload}/${b.app}/${b.payload}`;
}
export function parseCompare(hash: string): [Side | null, Side | null] | null {
  const m = /^#\/compare(?:\/([a-z0-9-]+)\/([^/]+)(?:\/([a-z0-9-]+)\/([^/]+))?)?$/.exec(hash);
  if (!m) return null;
  return [m[1] ? { app: m[1], payload: m[2] } : null, m[3] ? { app: m[3], payload: m[4] } : null];
}

export class ToCompare extends LitElement {
  static properties = { a: { attribute: false }, b: { attribute: false }, mode: { state: true } };
  declare a: Side | null;
  declare b: Side | null;
  declare mode: 'doc' | 'md';
  constructor() {
    super();
    this.a = null;
    this.b = null;
    this.mode = 'md';
  }
  protected createRenderRoot() {
    return this;
  }

  private env(s: Side | null): Envelope | null {
    return s ? decodeEnvelope(s.payload, s.app) : null;
  }
  private set(which: 'a' | 'b', link: string) {
    const side = sideOf(link);
    if (!side) return;
    const a = which === 'a' ? side : this.a;
    const b = which === 'b' ? side : this.b;
    location.hash = a && b ? compareHash(a, b) : `#/compare${a ? `/${a.app}/${a.payload}` : ''}`;
  }
  private swap() {
    if (this.a && this.b) location.hash = compareHash(this.b, this.a);
  }

  private side(which: 'a' | 'b', s: Side | null, env: Envelope | null) {
    const def = s ? appOf(s.app) : null;
    const made = env?.created ? new Date(env.created).toISOString().slice(0, 16).replace('T', ' ') + ' UTC' : '';
    return html`<section class="cmp-side">
      <sl-input class="sr-label" size="small" label=${which === 'a' ? 'The first link' : 'The second link'} placeholder=${which === 'a' ? 'Paste the first link' : 'Paste the second link'} .value=${s ? `${location.origin}${location.pathname.replace(/[^/]*$/, '')}${LINK}${s.app}/${s.payload}` : ''} @sl-change=${(e: Event) => this.set(which, (e.target as SlInput).value)}></sl-input>
      ${def && env
        ? html`<p class="to-hint cmp-meta"><b>${env.title || def.name}</b> · ${def.name}${env.by ? html` · by ${env.by}` : nothing}${made ? html` · ${made}` : nothing}${env.sig ? html` · ${icon(UI.shield, 12)} signed` : nothing}</p>
            <iframe title="${env.title || def.name}" sandbox="allow-scripts allow-same-origin" src="${location.pathname.replace(/[^/]*$/, '')}${LINK}${s!.app}.embed/${s!.payload}" loading="lazy"></iframe>`
        : html`<p class="to-empty">${which === 'a' ? 'The document as it was.' : 'The document as it is now.'}</p>`}
    </section>`;
  }

  render() {
    const [ea, eb] = [this.env(this.a), this.env(this.b)];
    const [da, db] = [this.a && appOf(this.a.app), this.b && appOf(this.b.app)];
    const text = (d: typeof da, e: Envelope | null) => (d && e ? (this.mode === 'md' ? toMarkdown(d, e.body, e.title) : e.body) : '');
    const changes = ea && eb ? diff(text(da, ea), text(db, eb)) : [];
    const n = { '+': changes.filter((c) => c.kind === '+').length, '-': changes.filter((c) => c.kind === '-').length };
    return html`<section class="to-compare">
      <h1>${icon(UI.compare, 20)} Compare</h1>
      <p class="to-hint">Two links to documents; what the second changed is marked below. Nothing leaves this page.</p>
      <div class="cmp-sides">${this.side('a', this.a, ea)}${this.side('b', this.b, eb)}</div>
      ${ea && eb
        ? html`<div class="to-toolbar cmp-bar">
              <span class="to-hint">${n['+'] || n['-'] ? html`<b>${n['-']}</b> removed, <b>${n['+']}</b> added` : 'No difference'}${da !== db ? html` · different apps (${da?.name} vs ${db?.name})` : nothing}</span>
              <span class="to-spacer"></span>
              <sl-radio-group size="small" value=${this.mode} @sl-change=${(e: Event) => (this.mode = (e.target as HTMLInputElement).value as 'doc' | 'md')}>
                <sl-radio-button value="md">As Markdown</sl-radio-button>
                <sl-radio-button value="doc">As stored</sl-radio-button>
              </sl-radio-group>
              <sl-button size="small" @click=${this.swap}>${icon(UI.swap, 14)} Swap</sl-button>
            </div>
            <pre class="cmp-diff" aria-label="Changes">${changes.map((c) => html`<span class=${c.kind === '+' ? 'add' : c.kind === '-' ? 'del' : ''}>${c.kind} ${c.line}\n</span>`)}</pre>`
        : nothing}
    </section>`;
  }
}
if (!customElements.get('to-compare')) customElements.define('to-compare', ToCompare);
