/**
 * <to-home>: the apps, as tiles, by group. Under each tile a listbox of its templates, Blank first and
 * chosen, each drawn small from its own document; choosing one opens the app with that document. (Paul,
 * 2026-10-09: templates with the apps, on the home page; no template popup inside an app.)
 */
import { LitElement, html, nothing } from 'lit';
import { unsafeSVG } from 'lit/directives/unsafe-svg.js';
import type { AppDef, Template } from './app.ts';
import { groups } from './apps.ts';
import { encodeDoc } from './codec.ts';
import { icon, UI } from './icons.ts';
import { onLanguage, t } from './i18n.ts';
import { place } from './menu.ts';
import { pageSvg } from './draw.ts';
import { routeHash } from './route.ts';

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
    return html`<button type="button" class="to-btn to-templates-btn" popovertarget=${this.uid} aria-haspopup="listbox" aria-expanded="false" aria-label=${t('Start {app} from', { app: this.app.name })}>
        <span>${chosen?.name ?? t('Blank')}</span>${icon(UI.down, 14, 'to-caret')}
      </button>
      <div id=${this.uid} popover="auto" class="to-menu to-listbox" role="listbox" aria-label=${t('Templates')} @toggle=${this.onToggle} @keydown=${this.onKey}>
        ${this.option(null)}${this.app.templates.map((tpl) => this.option(tpl))}
      </div>`;
  }
}
customElements.define('to-templates', ToTemplates);

export class ToHome extends LitElement {
  private off = () => {};
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
  render() {
    return html`<div class="to-home">
      <p class="to-home-lede">${t('A tiny office suite that lives entirely in the URL. The link is the document.')}</p>
      ${groups().map(
        (g) => html`<section class="to-group" aria-labelledby="group-${g.group}">
          <h2 id="group-${g.group}">${g.group}</h2>
          <div class="to-tiles">
            ${g.apps.map(
              (a) => html`<article class="to-tile">
                <a class="to-tile-open" href=${routeHash(a.id)}>${icon(a.icon, 28)}<b>${a.name}</b><small>${a.blurb}</small></a>
                <to-templates .app=${a}></to-templates>
              </article>`,
            )}
          </div>
        </section>`,
      )}
    </div>`;
  }
}
customElements.define('to-home', ToHome);
