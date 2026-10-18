/**
 * <to-template-picker> and `pickTemplate(app?)`: a document to start from, chosen from the apps' templates and handed
 * back to the page, never opened (docs/library.md, A template picker). The home page's templates dialog (kit/ui/home.ts)
 * opens the document it is chosen in; this one gives it to the page that asked, as `{ app, id, title, text }`
 * (PickedTemplate: the app's id, the template's, its name, and its TLO text), for a host that keeps its documents
 * itself (a CRM built on the library writes an exploration from one).
 *
 * The templates are the registry's (`appOf(id).templates()`, an app built outside the suite's too), each drawn small
 * from its own document (<to-preview>), under its app's name, Blank first where the app's templates carry no blank of
 * their own (its `blank()`, named as a new document of the app is). `app` names one app; without it, every app of the
 * suite. It is a listbox in a dialog, its keys a menu's (kit/ui/menu.ts): the arrows, Home and End, letters, Enter;
 * Escape or a click outside lets it go.
 *
 *   const picked = await pickTemplate('write');   // null when let go
 *   if (picked) save(picked.title, picked.text);
 *
 * The element is for a page that places it itself: `show()` opens it and resolves as `pickTemplate` does, and a
 * template chosen is told in `templatepick` too.
 */
import { LitElement, html, nothing, type TemplateResult } from 'lit';
import type { AppDef, Template } from '../core/app.ts';
import { appOf, apps } from '../core/apps.ts';
import { encodeDoc } from '../core/codec.ts';
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
  static properties = { app: {}, lists: { state: true } };
  /** The one app whose templates are offered; '' for every app of the suite. */
  declare app: string;
  /** Each app's templates as they arrive. */
  declare lists: Map<string, Template[]>;
  readonly uid = `to-template-picker-${++n}`;
  private answer: ((p: PickedTemplate | null) => void) | null = null;
  private from: HTMLElement | null = null;

  constructor() {
    super();
    this.app = '';
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
  /** The apps offered: the one named, or the suite's. */
  private defs(): AppDef[] {
    if (!this.app) return apps();
    const def = appOf(this.app);
    return def ? [def] : [];
  }

  /** The picker opened: resolves with the template chosen, or null when it is let go. */
  show(): Promise<PickedTemplate | null> {
    this.answer?.(null);
    const at = document.activeElement;
    this.from = at instanceof HTMLElement && at !== document.body ? at : null;
    for (const def of this.defs())
      void def.templates().then(
        (list) => (this.lists = new Map(this.lists).set(def.id, list)),
        () => undefined,
      );
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
  render() {
    const defs = this.defs();
    const heading = defs.length === 1 ? t('home-app-templates', { app: defs[0].name }) : t('common-templates');
    return html`<dialog
      class="to-dialog to-templates-dialog to-tp-dialog"
      aria-labelledby="${this.uid}-h"
      @close=${this.onClose}
      @click=${(e: Event) => e.target === e.currentTarget && this.close()}
    >
      <div class="to-dialog-inner">
        <header class="to-dialog-head to-listbox-head">
          <h2 id="${this.uid}-h">${heading}</h2>
          <button type="button" class="to-btn to-tool to-listbox-close" aria-label=${t('common-close')} title=${t('common-close')} @click=${() => this.close()}>${icon(UI.close, 18)}</button>
        </header>
        <div class="to-listbox" role="listbox" tabindex="-1" aria-labelledby="${this.uid}-h" @keydown=${(e: KeyboardEvent) => menuKey(e, this.listbox, this.options(), () => this.close())}>
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
 * A template chosen, handed back: `app`'s templates (every app's in the suite, without it) in a dialog over the page,
 * resolving with the one chosen (PickedTemplate) or null when the dialog is let go. Nothing is opened or navigated to.
 */
export async function pickTemplate(app?: string): Promise<PickedTemplate | null> {
  const picker = document.createElement('to-template-picker') as ToTemplatePicker;
  picker.app = app ?? '';
  document.body.append(picker);
  try {
    return await picker.show();
  } finally {
    picker.remove();
  }
}
