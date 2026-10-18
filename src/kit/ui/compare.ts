/**
 * <to-compare>: two documents side by side, block by block, with what the second changed marked: a block
 * taken out struck through on the left, a block put in marked on the right, a block changed shown as both on
 * one row. For a person reviewing what an agent (or a colleague) did to a document. Reached at "#/compare" by
 * its link alone (not the menu: Paul, 2026-10-12), each side a link pasted in; the address
 * holds both, "#/compare/<app>/<payload>/<app>/<payload>", so a comparison is a link too. Nothing leaves
 * the page. On a phone the rows stack: the old block, then the new one under it. kit/text/diff.ts compares the
 * blocks as TLO writes them. A page that is not the site gives the sides as `a` and `b`, and takes "compare-change"
 * to keep its address its own.
 */
import { LitElement, html, nothing } from 'lit';
import { appOf } from '../core/apps.ts';
import { decodeDoc, withBreaks, withoutBreaks } from '../core/codec.ts';
import { diff, tally, type Change } from '../text/diff.ts';
import { icon, UI } from '../draw/icons.ts';
import { t } from '../core/i18n.ts';
import { routeHash } from '../core/route.ts';

export interface Side {
  app: string;
  payload: string;
}

/** What "compare-change" carries: the two sides now, and the fragment that names them. */
export interface CompareChange {
  a: Side | null;
  b: Side | null;
  hash: string;
}

const LINKED = /#\/v\d+\/([a-z][a-z0-9-]*)(?:\.[A-Za-z0-9.]+)?\/([A-Za-z0-9_~+-]+)/;

/** The app and payload in a link (or a fragment), or null when it is not a document of ours. */
export function sideOf(link: string): Side | null {
  const m = LINKED.exec(link.trim());
  return m && appOf(m[1]) && decodeDoc(m[2]) ? { app: m[1], payload: withoutBreaks(m[2]) } : null;
}

/** "#/compare/<app>/<payload>[/<app>/<payload>]". */
const compareHash = (a: Side | null, b: Side | null = null): string => `#/compare${[a, b].map((s) => (s ? `/${s.app}/${withBreaks(s.payload)}` : '')).join('')}`;

/** The two sides a compare fragment names; null when the fragment is not one. */
export function parseCompare(hash: string): [Side | null, Side | null] | null {
  const m = /^#\/compare(?:\/([a-z][a-z0-9-]*)\/([A-Za-z0-9_~+-]+)(?:\/([a-z][a-z0-9-]*)\/([A-Za-z0-9_~+-]+))?)?\/?(?:\?.*)?$/.exec(hash);
  if (!m) return null;
  return [m[1] ? { app: m[1], payload: withoutBreaks(m[2]) } : null, m[3] ? { app: m[3], payload: withoutBreaks(m[4]) } : null];
}

/** Changes as rows of two cells: kept on both sides; a run taken out paired with the run put in after it; the rest alone. */
function rowsOf(changes: Change[]): [Change | null, Change | null][] {
  const rows: [Change | null, Change | null][] = [];
  for (let i = 0; i < changes.length;) {
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
    box.setCustomValidity(link.trim() && !side ? t('compare-not-link-to-tiny-little') : '');
    box.reportValidity();
    if (link.trim() && !side) return;
    this.choose(which === 'a' ? side : this.a, which === 'a' ? this.b : side);
  }
  private swap = () => this.choose(this.b, this.a);
  /**
   * Two sides chosen (a link pasted, Swap): drawn at once, and said in "compare-change" (bubbling, cancelable, its
   * detail the sides and their fragment). Unless the page takes it (preventDefault: a page whose address is its own),
   * the fragment goes in the address, as the site's comparison is its link.
   */
  private choose(a: Side | null, b: Side | null) {
    this.a = a;
    this.b = b;
    const hash = compareHash(a, b);
    if (this.dispatchEvent(new CustomEvent<CompareChange>('compare-change', { detail: { a, b, hash }, bubbles: true, cancelable: true }))) location.hash = hash;
  }

  private renderSide(which: 'a' | 'b', s: Side | null) {
    const def = s ? appOf(s.app) : undefined;
    const text = s ? decodeDoc(s.payload) : '';
    const label = which === 'a' ? t('compare-first-link') : t('compare-second-link');
    const href = s ? `${location.origin}${location.pathname}${routeHash(s.app, s.payload)}` : '';
    return html`<div class="cmp-side">
      <label class="to-field cmp-field"><span>${label}</span>
        <input type="url" class="cmp-${which}" placeholder=${which === 'a' ? t('compare-paste-link-to-document-as-it-was') : t('compare-paste-link-to-document-as')} .value=${href} @change=${(e: Event) => this.set(which, (e.target as HTMLInputElement).value, e.target as HTMLInputElement)} />
      </label>
      ${def ? html`<p class="cmp-meta">${icon(def.icon, 16)}<b>${def.title(text) || t('common-untitled-noun', { noun: def.noun })}</b><span>· ${def.name}</span><a href=${routeHash(s!.app, s!.payload)}>${t('common-open')}</a></p>` : nothing}
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
            ? html`<del class="cmp-cell cmp-del"><span class="sr-only">${t('compare-taken-out')} </span>${c.line}</del>`
            : html`<ins class="cmp-cell cmp-add ${side}"><span class="sr-only">${t('compare-put-in')} </span>${c.line}</ins>`;
    return html`<section class="to-compare" aria-labelledby="cmp-h">
      <h1 id="cmp-h">${icon(UI.compare, 22)}<span>${t('compare-compare')}</span></h1>
      <p class="to-hint">${t('compare-two-links-to-documents-side')}</p>
      <div class="cmp-sides">${this.renderSide('a', this.a)}${this.renderSide('b', this.b)}</div>
      ${
        both
          ? html`<div class="cmp-bar">
              <p class="cmp-sum" role="status">${removed || added ? `${t('compare-n-blocks-taken-out', { n: removed })}, ${t('compare-n-put-in', { n: added })}` : t('compare-no-difference')}${this.a!.app !== this.b!.app ? ` · ${t('compare-different-apps')}` : ''}</p>
              <button type="button" class="to-btn cmp-swap" @click=${this.swap}>${icon(UI.compare, 16)}<span>${t('compare-swap')}</span></button>
            </div>
            <div class="cmp-rows" role="list" aria-label=${t('compare-changes')}>${rowsOf(changes).map(([o, n]) => html`<div class="cmp-row ${o?.kind === ' ' ? '' : 'changed'}" role="listitem">${cell(o, 'old')}${o?.kind === ' ' ? html`<div class="cmp-cell cmp-same" aria-hidden="true">${o.line}</div>` : cell(n, 'new')}</div>`)}</div>`
          : html`<p class="to-empty">${t('compare-paste-second-link-to-see')}</p>`
      }
    </section>`;
  }
}
customElements.define('to-compare', ToCompare);
