/**
 * chooseTemplate(): an app's templates (lib/templates.ts) in a dialog,
 * each with its name, a line on what it is for, and a small picture the
 * app draws of it. Resolves with the template picked, or null if none was.
 *
 * templateTool() and templateLine() are the two ways an app offers it: a
 * button in the toolbar, and a quiet line on the blank document. An app
 * shows them only while the document is empty; nothing is ever forced.
 */
import { html, render, type TemplateResult } from '../kit.ts';
import { appOf, pageSvg } from '../kit/core.ts';
import { unsafeHTML } from 'lit/directives/unsafe-html.js';
import { icon, UI } from '../lib/icons.ts';
import { templatesOf, type Template } from '../lib/templates.ts';
import type { SlDialog } from '../lib/shoelace.ts';

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
    // The first page of each, drawn by the app itself: what the document will look like, small.
    const preview = (t: Template) => unsafeHTML(pageSvg(def.view(t.body)[0], 'aria-hidden="true"'));
    render(
      html`<p class="to-hint">A start, not a finish: everything in it is yours to change. Undo brings the blank page back.</p>
        <div class="to-templates-list" role="list">
          ${list.map((t) => html`<button class="to-template" role="listitem" aria-label="${t.name}: ${t.blurb}" @click=${() => pick(t)}><span class="pic">${preview(t)}</span><b>${t.name}</b><small>${t.blurb}</small></button>`)}
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

/** The blank document's way in: one quiet line, where the first words would go. */
export function templateLine(app: string, apply: (t: Template) => void): TemplateResult {
  return html`<p class="to-template-line">Blank. <button type="button" @click=${() => void chooseTemplate(app).then((t) => t && apply(t))}>Start from a template…</button></p>`;
}
