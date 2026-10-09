/**
 * <to-home>: the apps, as tiles, in the registry's order: each its icon and name (open it blank), a listbox
 * of its templates to the right of its name (Blank first and chosen, each drawn small from its own document; choosing one opens the
 * app with that document), and under it the documents of that app kept on this device (kit/library.ts),
 * newest first. No copy. (Paul, 2026-10-09: "Small icon and app name, then templates menu. Then documents
 * in that format … Drive is just documents under the icons. No descriptions of apps.")
 */
import { LitElement, html, nothing } from 'lit';
import { unsafeSVG } from 'lit/directives/unsafe-svg.js';
import type { AppDef, Template } from './app.ts';
import { apps } from './apps.ts';
import { encodeDoc } from './codec.ts';
import { icon, UI } from './icons.ts';
import { onLanguage, t } from './i18n.ts';
import { place } from './menu.ts';
import { pageSvg } from './draw.ts';
import { routeHash } from './route.ts';
import { ago, forget, library, type Kept } from './library.ts';
import { onPrivacy } from './privacy.ts';

/** The documents shown under an app before "n more". */
const SHOWN = 5;

let n = 0;

/** The link that opens an app with a template's document; Blank is the app's own page. */
export const templateHash = (app: AppDef, tpl: Template | null) => (tpl ? routeHash(app.id, encodeDoc(tpl.doc)) : routeHash(app.id));

export class ToTemplates extends LitElement {
  static properties = { app: { attribute: false }, chosen: { state: true }, drawn: { state: true } };
  declare app: AppDef;
  /** The template's id, '' for Blank. */
  declare chosen: string;
  /** The thumbnails are drawn once the list first opens: a home page of many apps costs nothing until then. */
  declare drawn: boolean;
  readonly uid = `to-templates-${++n}`;

  private off = () => {};

  constructor() {
    super();
    this.chosen = '';
    this.drawn = false;
  }
  createRenderRoot() {
    return this;
  }
  connectedCallback() {
    super.connectedCallback();
    this.off = onLanguage(() => this.requestUpdate());
  }
  disconnectedCallback() {
    super.disconnectedCallback();
    this.off();
  }
  get button(): HTMLButtonElement {
    return this.querySelector<HTMLButtonElement>(':scope > button')!;
  }
  get listbox(): HTMLElement {
    return this.querySelector<HTMLElement>(':scope > [popover]')!;
  }
  private options(): HTMLElement[] {
    return [...this.querySelectorAll<HTMLElement>('[role=option]')];
  }
  private onToggle = (e: Event) => {
    const open = (e as ToggleEvent).newState === 'open';
    this.button.setAttribute('aria-expanded', String(open));
    if (open) {
      this.drawn = true;
      void this.updateComplete.then(() => {
        place(this.listbox, this.button);
        (this.options().find((o) => o.getAttribute('aria-selected') === 'true') ?? this.options()[0])?.focus();
      });
    } else if (document.activeElement === document.body || this.listbox.contains(document.activeElement)) this.button.focus();
  };
  private onKey = (e: KeyboardEvent) => {
    const opts = this.options();
    const at = opts.indexOf(document.activeElement as HTMLElement);
    const go = (i: number) => {
      e.preventDefault();
      opts[(i + opts.length) % opts.length]?.focus();
    };
    if (e.key === 'ArrowDown') go(at + 1);
    else if (e.key === 'ArrowUp') go(at - 1);
    else if (e.key === 'Home') go(0);
    else if (e.key === 'End') go(opts.length - 1);
  };
  private choose(tpl: Template | null) {
    this.chosen = tpl?.id ?? '';
    this.listbox.hidePopover();
    location.hash = templateHash(this.app, tpl);
  }
  private option(tpl: Template | null) {
    const id = tpl?.id ?? '';
    const name = tpl?.name ?? t('Blank');
    const page = this.drawn ? this.app.view(tpl?.doc ?? this.app.blank(), { small: true })[0] : null;
    return html`<div role="option" class="to-option" tabindex="-1" aria-selected=${String(this.chosen === id)} @click=${() => this.choose(tpl)} @keydown=${(e: KeyboardEvent) => (e.key === 'Enter' || e.key === ' ') && (e.preventDefault(), this.choose(tpl))}>
      <span class="to-thumb" aria-hidden="true">${page ? unsafeSVG(pageSvg(page)) : nothing}</span>
      <span class="to-option-words"><span>${name}</span>${tpl?.blurb ? html`<small>${tpl.blurb}</small>` : nothing}</span>
    </div>`;
  }
  render() {
    const chosen = this.app.templates.find((x) => x.id === this.chosen);
    // The button is the affordance alone: the icon of a sheet of paper and a caret, no words (Paul, 2026-10-09: "don't use the word Blank over and over"); its name says what it holds.
    return html`<button type="button" class="to-btn to-tool to-templates-btn" popovertarget=${this.uid} aria-haspopup="listbox" aria-expanded="false" aria-label=${chosen ? t('Templates for {app}: {name}', { app: this.app.name, name: chosen.name }) : t('Templates for {app}', { app: this.app.name })} title=${t('Templates')}>
        ${icon(UI.text, 18)}${icon(UI.down, 14, 'to-caret')}
      </button>
      <div id=${this.uid} popover="auto" class="to-menu to-listbox" role="listbox" aria-label=${t('Templates')} @toggle=${this.onToggle} @keydown=${this.onKey}>
        ${this.option(null)}${this.app.templates.map((tpl) => this.option(tpl))}
      </div>`;
  }
}
customElements.define('to-templates', ToTemplates);

export class ToHome extends LitElement {
  static properties = { unfolded: { state: true } };
  /** The apps whose whole list of documents is shown, past the first five. */
  declare unfolded: Set<string>;
  private offs: (() => void)[] = [];
  private redraw = () => this.requestUpdate();
  private onVisible = () => document.visibilityState === 'visible' && this.redraw();

  constructor() {
    super();
    this.unfolded = new Set();
  }
  createRenderRoot() {
    return this;
  }
  connectedCallback() {
    super.connectedCallback();
    window.addEventListener('pageshow', this.redraw);
    document.addEventListener('visibilitychange', this.onVisible);
    this.offs = [onLanguage(this.redraw), onPrivacy(this.redraw), () => window.removeEventListener('pageshow', this.redraw), () => document.removeEventListener('visibilitychange', this.onVisible)];
  }
  disconnectedCallback() {
    super.disconnectedCallback();
    for (const off of this.offs) off();
  }
  private forget(k: Kept) {
    forget(k.id);
    this.redraw();
  }
  /** An app's kept documents, newest first: five, then "n more". Nothing kept, nothing shown. */
  private drive(app: AppDef, kept: Kept[]) {
    if (!kept.length) return nothing;
    const all = this.unfolded.has(app.id);
    const shown = all ? kept : kept.slice(0, SHOWN);
    const lang = document.documentElement.lang;
    return html`<ul class="to-drive" aria-label=${t('{app} documents', { app: app.name })}>
        ${shown.map((k) => {
          const title = k.title || t('Untitled');
          return html`<li>
            <a class="to-drive-open" href=${k.hash}><span>${title}</span><small>${ago(k.at, lang)}</small></a>
            <button type="button" class="to-btn to-tool" aria-label=${t('Forget {title}', { title })} title=${t('Forget')} @click=${() => this.forget(k)}>${icon(UI.close, 16)}</button>
          </li>`;
        })}
      </ul>
      ${kept.length > SHOWN && !all ? html`<button type="button" class="to-btn to-drive-more" @click=${() => (this.unfolded = new Set([...this.unfolded, app.id]))}>${t('{n} more', { n: kept.length - SHOWN })}</button>` : nothing}`;
  }
  render() {
    const kept = library();
    return html`<div class="to-home">
      <h1 class="sr-only">TinyLittleOffice</h1>
      <div class="to-tiles">
        ${apps().map(
          (a) => html`<article class="to-tile">
            <div class="to-tile-head">
              <a class="to-tile-open" href=${routeHash(a.id)}>${icon(a.icon, 20)}<b>${a.name}</b></a>
              <to-templates .app=${a}></to-templates>
            </div>
            ${this.drive(a, kept.filter((k) => k.app === a.id))}
          </article>`,
        )}
      </div>
    </div>`;
  }
}
customElements.define('to-home', ToHome);
