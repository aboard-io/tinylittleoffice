/**
 * `confirm({ title, body, yes, no, danger })`: a question asked in the kit's dialog before something is done (docs/library.md,
 * The kit's small pieces), "Delete Acme?", resolving true for yes and false for no, Escape, a click outside, or Close.
 * The browser's own confirm() stops the page and looks like nothing of the kit's; this is a modal <dialog>, its focus
 * on the answer that changes nothing where the question is `danger` (a delete: its yes in the danger color,
 * `.to-btn.to-danger`), else on yes, and given back where it was when it closes.
 *
 *   if (await confirm({ title: 'Delete Acme?', body: 'Its people and leads stay.', yes: 'Delete', danger: true })) remove(acme);
 *
 * `into` puts the dialog in an element the page's theme or styles are on (the body otherwise), as editDoc's does.
 */
import { html, nothing, render } from 'lit';
import { t } from '../core/i18n.ts';
import { focusBack } from './dialog.ts';

/** What a confirmation asks: its question, more words under it, the words of its two answers, whether yes destroys something. */
export interface Confirm {
  title: string;
  body?: string;
  /** Yes's words (OK unless said: better, the verb, "Delete"). */
  yes?: string;
  /** No's words (Cancel unless said). */
  no?: string;
  /** Yes destroys something: drawn in the danger color, and the focus starts on no. */
  danger?: boolean;
  /** Where the dialog goes: an element the page's theme is on; the body otherwise. */
  into?: Element;
}

let n = 0;

/** The question asked in a dialog over the page: true for yes, false for anything else. */
export function confirm(ask: Confirm): Promise<boolean> {
  const id = `to-confirm-${++n}`;
  const at = document.activeElement;
  const from = at instanceof HTMLElement && at !== document.body ? at : null;
  const holder = document.createElement('div');
  (ask.into ?? document.body).append(holder);
  return new Promise<boolean>((done) => {
    let answer = false;
    const close = (yes: boolean) => {
      answer = yes;
      dialog.close();
    };
    render(
      html`<dialog class="to-dialog to-confirm" role="alertdialog" aria-labelledby="${id}-h" aria-describedby=${ask.body ? `${id}-b` : nothing} @click=${(e: Event) => e.target === e.currentTarget && close(false)}>
        <div class="to-dialog-inner">
          <header class="to-dialog-head"><h2 id="${id}-h">${ask.title}</h2></header>
          <div class="to-dialog-body">
            ${ask.body ? html`<p id="${id}-b">${ask.body}</p>` : nothing}
            <p class="to-confirm-acts">
              <button type="button" class="to-btn to-confirm-no" @click=${() => close(false)}>${ask.no || t('common-cancel')}</button>
              <button type="button" class="to-btn ${ask.danger ? 'to-danger' : 'primary'} to-confirm-yes" @click=${() => close(true)}>${ask.yes || t('common-ok')}</button>
            </p>
          </div>
        </div>
      </dialog>`,
      holder,
    );
    const dialog = holder.querySelector('dialog')!;
    dialog.addEventListener('close', () => {
      holder.remove();
      focusBack(from);
      done(answer);
    });
    dialog.showModal();
    holder.querySelector<HTMLElement>(ask.danger ? '.to-confirm-no' : '.to-confirm-yes')?.focus();
  });
}
