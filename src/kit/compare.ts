/**
 * <to-compare>: two documents side by side, block by block, with what the second changed marked: a block
 * taken out struck through on the left, a block put in marked on the right, a block changed shown as both on
 * one row. For a person reviewing what an agent (or a colleague) did to a document. Reached at "#/compare"
 * (Compare… in the menu starts it with the document open now), each side a link pasted in; the address
 * holds both, "#/compare/<app>/<payload>/<app>/<payload>", so a comparison is a link too. Nothing leaves
 * the page. On a phone the rows stack: the old block, then the new one under it. (The old tree's
 * widgets/compare.ts, over the kernel: kit/diff.ts compares the blocks as TLO writes them.)
 */
import { LitElement, html, nothing } from 'lit';
import { appOf } from './apps.ts';
import { decodeDoc } from './codec.ts';
import { diff, tally, type Change } from './diff.ts';
import { icon, UI } from './icons.ts';
import { t } from './i18n.ts';
import { routeHash } from './route.ts';

export interface Side {
  app: string;
  payload: string;
}

const LINKED = /#\/v\d+\/([a-z][a-z0-9-]*)(?:\.[A-Za-z0-9.]+)?\/([A-Za-z0-9_-]+)/;

/** The app and payload in a link (or a fragment), or null when it is not a document of ours. */
export function sideOf(link: string): Side | null {
  const m = LINKED.exec(link.trim());
  return m && appOf(m[1]) && decodeDoc(m[2]) ? { app: m[1], payload: m[2] } : null;
}

/** "#/compare/<app>/<payload>[/<app>/<payload>]". */
export const compareHash = (a: Side | null, b: Side | null = null): string => `#/compare${[a, b].map((s) => (s ? `/${s.app}/${s.payload}` : '')).join('')}`;

/** The two sides a compare fragment names; null when the fragment is not one. */
export function parseCompare(hash: string): [Side | null, Side | null] | null {
  const m = /^#\/compare(?:\/([a-z][a-z0-9-]*)\/([A-Za-z0-9_-]+)(?:\/([a-z][a-z0-9-]*)\/([A-Za-z0-9_-]+))?)?\/?$/.exec(hash);
  if (!m) return null;
  return [m[1] ? { app: m[1], payload: m[2] } : null, m[3] ? { app: m[3], payload: m[4] } : null];
}

/** Changes as rows of two cells: kept on both sides; a run taken out paired with the run put in after it; the rest alone. */
export function rowsOf(changes: Change[]): [Change | null, Change | null][] {
  const rows: [Change | null, Change | null][] = [];
  for (let i = 0; i < changes.length; ) {
    if (changes[i].kind === ' ') {
      rows.push([changes[i], changes[i]]);
      i++;
      continue;
    }
    const out: Change[] = [];
    const put: Change[] = [];
    while (i < changes.length && changes[i].kind === '-') out.push(changes[i++]);
    while (i < changes.length && changes[i].kind === '+') put.push(changes[i++]);
    for (let k = 0; k < Math.max(out.length, put.length); k++) rows.push([out[k] ?? null, put[k] ?? null]);
  }
  return rows;
}

export class ToCompare extends LitElement {
  static properties = { a: { attribute: false }, b: { attribute: false } };
  declare a: Side | null;
  declare b: Side | null;

  constructor() {
    super();
    this.a = null;
    this.b = null;
  }
  createRenderRoot() {
    return this;
  }

  private set(which: 'a' | 'b', link: string, box: HTMLInputElement) {
    const side = link.trim() ? sideOf(link) : null;
    box.setCustomValidity(link.trim() && !side ? t('Not a link to a Tiny Little Office document') : '');
    box.reportValidity();
    if (link.trim() && !side) return;
    location.hash = which === 'a' ? compareHash(side, this.b) : compareHash(this.a, side);
  }
  private swap = () => {
    location.hash = compareHash(this.b, this.a);
  };

  private renderSide(which: 'a' | 'b', s: Side | null) {
    const def = s ? appOf(s.app) : undefined;
    const text = s ? decodeDoc(s.payload) : '';
    const label = which === 'a' ? t('The first link') : t('The second link');
    const href = s ? `${location.origin}${location.pathname}${routeHash(s.app, s.payload)}` : '';
    return html`<div class="cmp-side">
      <label class="to-field cmp-field"><span>${label}</span>
        <input type="url" class="cmp-${which}" placeholder=${which === 'a' ? t('Paste the link to the document as it was') : t('Paste the link to the document as it is now')} .value=${href} @change=${(e: Event) => this.set(which, (e.target as HTMLInputElement).value, e.target as HTMLInputElement)} />
      </label>
      ${def ? html`<p class="cmp-meta">${icon(def.icon, 16)}<b>${def.title(text) || t('Untitled {noun}', { noun: def.noun })}</b><span>· ${def.name}</span><a href=${routeHash(s!.app, s!.payload)}>${t('Open')}</a></p>` : nothing}
    </div>`;
  }

  render() {
    const [ta, tb] = [this.a ? decodeDoc(this.a.payload) : '', this.b ? decodeDoc(this.b.payload) : ''];
    const both = !!(this.a && this.b);
    const changes = both ? diff(ta, tb) : [];
    const { removed, added } = tally(changes);
    const cell = (c: Change | null, side: 'old' | 'new') =>
      !c
        ? html`<div class="cmp-cell cmp-none" aria-hidden="true"></div>`
        : c.kind === ' '
          ? html`<div class="cmp-cell">${c.line}</div>`
          : c.kind === '-'
            ? html`<del class="cmp-cell cmp-del"><span class="sr-only">${t('Taken out:')} </span>${c.line}</del>`
            : html`<ins class="cmp-cell cmp-add ${side}"><span class="sr-only">${t('Put in:')} </span>${c.line}</ins>`;
    return html`<section class="to-compare" aria-labelledby="cmp-h">
      <h1 id="cmp-h">${icon(UI.compare, 22)}<span>${t('Compare')}</span></h1>
      <p class="to-hint">${t('Two links to documents, side by side: what the second changed is marked. Nothing leaves this page.')}</p>
      <div class="cmp-sides">${this.renderSide('a', this.a)}${this.renderSide('b', this.b)}</div>
      ${both
        ? html`<div class="cmp-bar">
              <p class="cmp-sum" role="status">${removed || added ? `${t('{n|# block taken out|# blocks taken out}', { n: removed })}, ${t('{n|# put in|# put in}', { n: added })}` : t('No difference')}${this.a!.app !== this.b!.app ? ` · ${t('different apps')}` : ''}</p>
              <button type="button" class="to-btn cmp-swap" @click=${this.swap}>${icon(UI.compare, 16)}<span>${t('Swap')}</span></button>
            </div>
            <div class="cmp-rows" role="list" aria-label=${t('Changes')}>${rowsOf(changes).map(([o, n]) => html`<div class="cmp-row ${o?.kind === ' ' ? '' : 'changed'}" role="listitem">${cell(o, 'old')}${o?.kind === ' ' ? html`<div class="cmp-cell cmp-same" aria-hidden="true">${o.line}</div>` : cell(n, 'new')}</div>`)}</div>`
        : html`<p class="to-empty">${t('Paste a second link to see what changed.')}</p>`}
    </section>`;
  }
}
customElements.define('to-compare', ToCompare);
