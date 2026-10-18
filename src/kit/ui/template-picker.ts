/**
 * <to-template-picker> and `pickTemplate(app?)`: a document to start from, chosen from the apps' templates and handed
 * back to the page, never opened (docs/library.md, A template picker). The home page's templates dialog (kit/ui/home.ts)
 * opens the document it is chosen in; this one gives it to the page that asked, as `{ app, id, title, text }`
 * (PickedTemplate: the app's id, the template's, its name, and its TLO text), for a host that keeps its documents
 * itself (a CRM built on the library writes an exploration from one).
 *
 * The templates are the registry's (`appOf(id).templates()`, an app built outside the suite's too), each drawn small
 * from its own document (<to-preview>), under its app's name, Blank first where the app's templates carry no blank of
 * their own (its `blank()`, named as a new document of the app is). `app` names one app; `apps`, a few (a host that
 * keeps documents of a few apps: a text, a deck, a sheet), offered first as a menu of the apps, each its icon, name and
 * line, the one chosen's templates then, with a way back to the apps; without either, every app of the suite. It is a listbox in a dialog, its keys a menu's (kit/ui/menu.ts): the arrows, Home and End, letters, Enter;
 * Escape or a click outside lets it go.
 *
 *   const picked = await pickTemplate('write');   // null when let go
 *   const one = await pickTemplate(['write', 'deck', 'sheet', 'outline', 'board']);   // the apps first, then one's templates
 *   if (picked) save(picked.title, picked.text);
 *
 * The element is for a page that places it itself: `show()` opens it and resolves as `pickTemplate` does, and a
 * template chosen is told in `templatepick` too.
 */
import { LitElement, html, nothing, type TemplateResult } from 'lit';
import type { AppDef, Template } from '../core/app.ts';
import { appOf, apps } from '../core/apps.ts';
import { encodeDoc } from '../core/codec.ts';
import { ChevronLeft } from 'lucide';
import { icon, UI } from '../draw/icons.ts';
import { t } from '../core/i18n.ts';
import { routeHash } from '../core/route.ts';
import { hoverFocus, menuKey } from './menu.ts';
import { focusBack } from './dialog.ts';
import './preview.ts';

/** A document to start from: its app, the template's id ("blank" for Blank), its name, and its text. */
export interface PickedTemplate {
  app: string;
  id: string;
  title: string;
  text: string;
}

let n = 0;

export class ToTemplatePicker extends LitElement {
  static properties = { app: {}, apps: { attribute: false }, chosen: { state: true }, lists: { state: true } };
  /** The one app whose templates are offered; '' for every app of the suite. */
  declare app: string;
  /** The apps offered, by id, when they are a few: more than one, a menu of them first. */
  declare apps: string[];
  /** The app chosen from the menu of `apps`; '' while the menu is shown. */
  declare chosen: string;
  /** Each app's templates as they arrive. */
  declare lists: Map<string, Template[]>;
  readonly uid = `to-template-picker-${++n}`;
  private answer: ((p: PickedTemplate | null) => void) | null = null;
  private from: HTMLElement | null = null;

  constructor() {
    super();
    this.app = '';
    this.apps = [];
    this.chosen = '';
    this.lists = new Map();
  }
  createRenderRoot() {
    return this;
  }
  get dialog(): HTMLDialogElement | null {
    return this.querySelector('dialog');
  }
  private get listbox(): HTMLElement {
    return this.querySelector<HTMLElement>('[role=listbox]')!;
  }
  private options(): HTMLElement[] {
    return [...this.querySelectorAll<HTMLElement>('[role=option]')];
  }
  /** The apps of the menu, where `apps` names more than one (each one the registry knows). */
  private offered(): AppDef[] {
    return this.apps.length > 1 ? this.apps.flatMap((id) => appOf(id) ?? []) : [];
  }
  /** The menu of apps is what is shown: several offered and none chosen yet. */
  private get choosing(): boolean {
    return this.offered().length > 1 && !this.chosen;
  }
  /** The apps whose templates are offered: the one chosen from the menu, the one named, the one of `apps`, or the suite's. */
  private defs(): AppDef[] {
    const one = this.chosen || this.app || (this.apps.length === 1 ? this.apps[0] : '');
    if (!one) return this.offered().length > 1 ? [] : apps();
    const def = appOf(one);
    return def ? [def] : [];
  }
  /** An app's templates asked for, once. */
  private load(defs: AppDef[]) {
    for (const def of defs)
      if (!this.lists.has(def.id))
        void def.templates().then(
          (list) => (this.lists = new Map(this.lists).set(def.id, list)),
          () => undefined,
        );
  }
  /** An app chosen from the menu: its templates, the first one in hand. */
  private async pickApp(id: string) {
    this.chosen = id;
    this.load(this.defs());
    await this.updateComplete;
    (this.options()[0] ?? this.listbox).focus({ preventScroll: true });
  }
  /** Back to the menu of apps, the one that was chosen in hand. */
  private async back() {
    const was = this.chosen;
    this.chosen = '';
    await this.updateComplete;
    (this.querySelector<HTMLElement>(`[data-picks="${CSS.escape(was)}"]`) ?? this.options()[0])?.focus({ preventScroll: true });
  }

  /** The picker opened: resolves with the template chosen, or null when it is let go. */
  show(): Promise<PickedTemplate | null> {
    this.answer?.(null);
    const at = document.activeElement;
    this.from = at instanceof HTMLElement && at !== document.body ? at : null;
    this.chosen = '';
    this.load(this.defs());
    const chosen = new Promise<PickedTemplate | null>((ok) => (this.answer = ok));
    void this.updateComplete.then(() => {
      if (!this.dialog!.open) this.dialog!.showModal();
      (this.options()[0] ?? this.listbox).focus({ preventScroll: true });
    });
    return chosen;
  }
  /** Let go: resolves null. */
  close() {
    if (this.dialog?.open) this.dialog.close();
  }
  private choose(picked: PickedTemplate) {
    const answer = this.answer;
    this.answer = null;
    this.dispatchEvent(new CustomEvent<PickedTemplate>('templatepick', { detail: picked, bubbles: true, composed: true }));
    this.close();
    answer?.(picked);
  }
  private onClose = () => {
    focusBack(this.from);
    const answer = this.answer;
    this.answer = null;
    answer?.(null);
  };
  private option(def: AppDef, tpl: Template | null): TemplateResult {
    const text = tpl ? tpl.doc : def.blank();
    const name = tpl?.name ?? t('home-blank');
    const picked: PickedTemplate = { app: def.id, id: tpl?.id ?? 'blank', title: tpl?.name ?? t('common-untitled-noun', { noun: def.noun }), text };
    return html`<div role="option" class="to-option" tabindex="-1" aria-selected="false" @pointermove=${hoverFocus} @click=${() => this.choose(picked)}>
      <to-preview hash=${routeHash(def.id, encodeDoc(text))}></to-preview>
      <span class="to-option-words"><span>${name}</span>${tpl?.blurb ? html`<small>${tpl.blurb}</small>` : nothing}</span>
    </div>`;
  }
  /** One of the menu's apps: its icon, its name and its line. */
  private appOption(def: AppDef): TemplateResult {
    return html`<div role="option" class="to-option to-tp-app" data-picks=${def.id} tabindex="-1" aria-selected="false" @pointermove=${hoverFocus} @click=${() => void this.pickApp(def.id)}>
      <span class="to-tp-icon" aria-hidden="true">${icon(def.icon, 24)}</span>
      <span class="to-option-words"><span>${def.name}</span><small>${def.blurb}</small></span>
    </div>`;
  }
  render() {
    const defs = this.defs();
    const choosing = this.choosing;
    const heading = !choosing && defs.length === 1 ? t('home-app-templates', { app: defs[0].name }) : t('common-templates');
    const backable = !!this.chosen && this.offered().length > 1;
    return html`<dialog
      class="to-dialog to-templates-dialog to-tp-dialog"
      aria-labelledby="${this.uid}-h"
      @close=${this.onClose}
      @click=${(e: Event) => e.target === e.currentTarget && this.close()}
    >
      <div class="to-dialog-inner">
        <header class="to-dialog-head to-listbox-head">
          ${backable ? html`<button type="button" class="to-btn to-tool to-tp-back" aria-label=${t('template-picker-all-apps')} title=${t('template-picker-all-apps')} @click=${() => void this.back()}>${icon(ChevronLeft, 18)}</button>` : nothing}
          <h2 id="${this.uid}-h">${heading}</h2>
          <button type="button" class="to-btn to-tool to-listbox-close" aria-label=${t('common-close')} title=${t('common-close')} @click=${() => this.close()}>${icon(UI.close, 18)}</button>
        </header>
        <div class="to-listbox" role="listbox" tabindex="-1" aria-labelledby="${this.uid}-h" @keydown=${(e: KeyboardEvent) => menuKey(e, this.listbox, this.options(), () => this.close())}>
          ${choosing ? html`<div class="to-tp-group to-tp-apps" role="group" aria-label=${t('common-templates')}>${this.offered().map((def) => this.appOption(def))}</div>` : nothing}
          ${defs.map(
            (def) => html`<div class="to-tp-group" role="group" aria-label=${def.name}>
              ${defs.length > 1 ? html`<h3 aria-hidden="true">${def.name}</h3>` : nothing}
              ${def.blankInTemplates ? nothing : this.option(def, null)} ${(this.lists.get(def.id) ?? []).map((tpl) => this.option(def, tpl))}
            </div>`,
          )}
        </div>
      </div>
    </dialog>`;
  }
}
customElements.define('to-template-picker', ToTemplatePicker);

/**
 * A template chosen, handed back: `app`'s templates (every app's in the suite, without it; given a list of apps, a
 * menu of them first, and then the one chosen's) in a dialog over the page,
 * resolving with the one chosen (PickedTemplate) or null when the dialog is let go. Nothing is opened or navigated to.
 */
export async function pickTemplate(app?: string | string[]): Promise<PickedTemplate | null> {
  const picker = document.createElement('to-template-picker') as ToTemplatePicker;
  if (Array.isArray(app)) picker.apps = app;
  else picker.app = app ?? '';
  document.body.append(picker);
  try {
    return await picker.show();
  } finally {
    picker.remove();
  }
}
