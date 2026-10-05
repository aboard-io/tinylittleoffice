/**
 * chooseIcon(): the icon library in a dialog, searchable, for any app that
 * wants an icon. Resolves with the icon's name, or null if nothing was picked.
 */
import { html, render } from 'lit';
import { icon, LIBRARY, UI } from '../lib/icons.ts';
import { iconCount, searchIcons } from '../lib/iconsearch.ts';
import type { SlDialog, SlInput } from '../lib/shoelace.ts';

export function chooseIcon(): Promise<string | null> {
  return new Promise((done) => {
    const dialog = document.createElement('sl-dialog') as SlDialog;
    dialog.label = 'Icon';
    dialog.className = 'to-icons';
    let picked: string | null = null;
    const draw = (query: string) => {
      const found = searchIcons(query);
      render(
        html`<sl-input class="deck-search" size="small" type="search" placeholder="Search icons" aria-label="Search icons" autofocus clearable .value=${query} @sl-input=${(e: Event) => draw((e.target as SlInput).value)}><span slot="prefix">${icon(UI.search, 14)}</span></sl-input>
          <div class="deck-picker" role="group" aria-label="Icon library">
            ${found.map((name) => html`<button title=${name} aria-label=${name} @click=${() => { picked = name; void dialog.hide(); }}>${icon(LIBRARY[name], 22)}</button>`)}
          </div>
          ${found.length ? '' : html`<p class="deck-picker-none">No icons match “${query.trim()}”.</p>`}
          ${query.trim() ? '' : html`<p class="deck-picker-more">Search to find any of ${iconCount().toLocaleString()} icons.</p>`}`,
        dialog,
      );
    };
    draw('');
    dialog.addEventListener('sl-after-hide', (e) => {
      if (e.target !== dialog) return;
      dialog.remove();
      done(picked);
    });
    document.body.append(dialog);
    void customElements.whenDefined('sl-dialog').then(() => dialog.show());
  });
}
