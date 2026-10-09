/**
 * chooseTemplate(): an app's templates (lib/templates.ts) in a dialog,
 * each with its name, a line on what it is for, and a small picture the
 * app draws of it. Resolves with the template picked, or null if none was.
 *
 * templateTool() and templateGallery() are the two ways an app offers
 * them: a button in the toolbar, and the templates laid out on the blank
 * document, Blank first. An app shows them only while the document is
 * empty; nothing is ever forced.
 */
import { LitElement, html, nothing, property, state, render, type TemplateResult } from '../kit.ts';
import { appOf, pageSvg } from '../kit/core.ts';
import { unsafeHTML } from 'lit/directives/unsafe-html.js';
import { icon, UI } from '../lib/icons.ts';
import { templatesOf, type Template } from '../lib/templates.ts';
import type { SlDialog } from '../lib/shoelace.ts';

/** A template as a card: its first page, drawn by the app itself (what the document will look like, small), its name and its line. */
const card = (app: string, t: Template, pick: () => void) =>
  html`<button class="to-template" role="listitem" aria-label="${t.name}: ${t.blurb}" @click=${pick}><span class="pic">${unsafeHTML(pageSvg(appOf(app)!.view(t.body)[0], 'aria-hidden="true"'))}</span><b>${t.name}</b><small>${t.blurb}</small></button>`;

export function chooseTemplate(app: string): Promise<Template | null> {
  return new Promise((done) => {
    const def = appOf(app);
    const list = templatesOf(app);
    if (!def || !list.length) return done(null);
    const dialog = document.createElement('sl-dialog') as SlDialog;
    dialog.label = 'Start from a template';
    dialog.className = 'to-templates';
    let picked: Template | null = null;
    const pick = (t: Template) => {
      picked = t;
      void dialog.hide();
    };
    render(
      html`<p class="to-hint">A start, not a finish: everything in it is yours to change. Undo brings the blank page back.</p>
        <div class="to-templates-list" role="list" data-app=${app}>${list.map((t) => card(app, t, () => pick(t)))}</div>`,
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

/**
 * <to-template-gallery>: the blank document's way in, every template laid
 * out as a card, Blank the first. Blank puts the gallery away and the
 * cursor on the page; any other fires "template-pick" with the template.
 */
export class TemplateGallery extends LitElement {
  @property() app = '';
  /** Blank was chosen: the gallery is put away for as long as this document is open. */
  @state() private gone = false;

  createRenderRoot() {
    return this;
  }

  private blank() {
    this.gone = true;
    // The first place to type after the gallery: the page, not the toolbar above it.
    void this.updateComplete.then(() =>
      [...(this.parentElement?.querySelectorAll<HTMLElement>('[contenteditable]:not([contenteditable="false"]), input, textarea') ?? [])]
        .find((el) => this.compareDocumentPosition(el) & Node.DOCUMENT_POSITION_FOLLOWING)
        ?.focus(),
    );
  }

  render() {
    if (this.gone) return nothing;
    const list = templatesOf(this.app);
    return html`<section class="to-gallery" aria-label="Start from">
      <div class="to-templates-list" role="list" data-app=${this.app}>
        <button class="to-template blank" role="listitem" aria-label="Blank: an empty page" @click=${this.blank}><span class="pic" aria-hidden="true"></span><b>Blank</b><small>An empty page</small></button>
        ${list.map((t) => card(this.app, t, () => this.dispatchEvent(new CustomEvent<Template>('template-pick', { detail: t, bubbles: true }))))}
      </div>
    </section>`;
  }
}
if (!customElements.get('to-template-gallery')) customElements.define('to-template-gallery', TemplateGallery);

/** The gallery on a blank document; a template picked becomes the document. */
export function templateGallery(app: string, apply: (t: Template) => void): TemplateResult {
  return html`<to-template-gallery app=${app} @template-pick=${(e: CustomEvent<Template>) => apply(e.detail)}></to-template-gallery>`;
}
