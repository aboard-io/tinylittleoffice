/**
 * chooseTemplate(): an app's templates (lib/templates.ts) in a dialog,
 * each with its name, a line on what it is for, and a small picture the
 * app draws of it. Resolves with the template picked, or null if none was.
 *
 * templateTool() and templateGallery() are the two ways an app offers
 * them: a button in the toolbar, and, the moment a blank document opens,
 * the same dialog over it, Blank the first card. Both only while the
 * document is empty; Blank, or closing the dialog, leaves it blank.
 */
import { LitElement, html, nothing, property, render, type TemplateResult } from '../kit.ts';
import { appOf, pageSvg } from '../kit/core.ts';
import { unsafeHTML } from 'lit/directives/unsafe-html.js';
import { icon, UI } from '../lib/icons.ts';
import { templatesOf, type Template } from '../lib/templates.ts';
import type { SlDialog } from '../lib/shoelace.ts';

/** A template as a card: its first page, drawn by the app itself (what the document will look like, small), its name and its line. */
const card = (app: string, t: Template, pick: () => void) =>
  html`<button class="to-template" aria-label="${t.name}: ${t.blurb}" @click=${pick}><span class="pic">${unsafeHTML(pageSvg(appOf(app)!.view(t.body)[0], 'aria-hidden="true"'))}</span><b>${t.name}</b><small>${t.blurb}</small></button>`;

export function chooseTemplate(app: string, opts: { blank?: boolean } = {}): Promise<Template | null> {
  return new Promise((done) => {
    const def = appOf(app);
    const list = templatesOf(app);
    if (!def || !list.length) return done(null);
    const dialog = document.createElement('sl-dialog') as SlDialog;
    dialog.label = opts.blank ? `A new ${def.name.toLowerCase()}` : 'Start from a template';
    dialog.className = 'to-templates';
    let picked: Template | null = null;
    const pick = (t: Template | null) => {
      picked = t;
      void dialog.hide();
    };
    render(
      html`<p class="to-hint">A start, not a finish: everything in it is yours to change. Undo brings the blank page back.</p>
        <div class="to-templates-list" role="group" aria-label="Templates" data-app=${app}>
          ${opts.blank ? html`<button class="to-template blank" aria-label="Blank: an empty page" @click=${() => pick(null)}><span class="pic" aria-hidden="true"></span><b>Blank</b><small>An empty page</small></button>` : nothing}
          ${list.map((t) => card(app, t, () => pick(t)))}
        </div>`,
      dialog,
    );
    dialog.addEventListener('sl-after-hide', (e) => {
      if (e.target !== dialog) return;
      dialog.remove();
      done(picked);
    });
    document.body.append(dialog);
    void customElements.whenDefined('sl-dialog').then(() => dialog.show());
  });
}

/** The toolbar's way in: a button, like "Start from an example" in the text apps. */
export function templateTool(app: string, apply: (t: Template) => void): TemplateResult {
  return html`<sl-button class="to-template-tool" size="small" @click=${() => void chooseTemplate(app).then((t) => t && apply(t))}>${icon(UI.sparkles, 14)} Start from a template…</sl-button>`;
}

/** Whether a blank document opens with the templates over it: off for tests of the page beneath. */
export const templatePrompt = { auto: true };

/**
 * <to-template-gallery>: the blank document's way in. The moment it is
 * on the page it opens the dialog over the document, Blank the first
 * card, once for this editor; a template picked fires "template-pick".
 * Inside another document's editor (a dialog already) it stays quiet.
 */
export class TemplateGallery extends LitElement {
  @property() app = '';
  /** The editors already asked, so undo back to blank does not ask again. */
  private static asked = new WeakSet<Element>();

  createRenderRoot() {
    return this;
  }

  connectedCallback() {
    super.connectedCallback();
    const host = this.parentElement;
    if (!host || !templatePrompt.auto || TemplateGallery.asked.has(host) || this.closest('sl-dialog')) return;
    TemplateGallery.asked.add(host);
    void chooseTemplate(this.app, { blank: true }).then((t) => {
      if (t) this.dispatchEvent(new CustomEvent<Template>('template-pick', { detail: t, bubbles: true }));
      // The first place to type after the dialog: the page, which follows this element, not the bar above it. (The dialog gives the focus back to where it was a moment after it closes; this comes after that.)
      else setTimeout(() => [...host.querySelectorAll<HTMLElement>('[contenteditable]:not([contenteditable="false"]), input, textarea')].find((el) => this.compareDocumentPosition(el) & Node.DOCUMENT_POSITION_FOLLOWING)?.focus());
    });
  }

  render() {
    return nothing;
  }
}
if (!customElements.get('to-template-gallery')) customElements.define('to-template-gallery', TemplateGallery);

/** On a blank document: the templates, over it, once. A template picked becomes the document. */
export function templateGallery(app: string, apply: (t: Template) => void): TemplateResult {
  return html`<to-template-gallery app=${app} @template-pick=${(e: CustomEvent<Template>) => apply(e.detail)}></to-template-gallery>`;
}
