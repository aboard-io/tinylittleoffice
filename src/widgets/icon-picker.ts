/**
 * chooseIcon(): the icon library in a dialog, searchable, for any app that
 * wants an icon. Resolves with the icon's name; '' for "No icon" when that
 * is offered; null if nothing was picked. Suggestions (from the words on a
 * slide, say) sit above the library, and a footer can hold an app's own
 * controls (a deck's icon colour).
 */
import { html, render, nothing, type TemplateResult } from '../kit.ts';
import { icon, LIBRARY, UI, allIcons } from '../lib/icons.ts';
import { iconCategories, iconCount, iconsIn, searchIcons } from '../lib/iconsearch.ts';
import type { SlDialog, SlInput } from '../lib/shoelace.ts';

export interface IconChoice {
  /** Icons to offer first, by name. */
  suggested?: string[];
  /** The icon there now, marked as pressed. */
  current?: string;
  /** Offer "No icon", which resolves ''. */
  none?: boolean;
  /** Drawn in the footer, again after any click in it. */
  footer?: () => TemplateResult;
}

export function chooseIcon(opts: IconChoice = {}): Promise<string | null> {
  return new Promise((done) => {
    const dialog = document.createElement('sl-dialog') as SlDialog;
    dialog.label = 'Icon';
    dialog.id = 'icon-picker';
    dialog.className = 'to-icons';
    let picked: string | null = null;
    const pick = (name: string) => {
      picked = name;
      void dialog.hide();
    };
    const button = (name: string) => html`<button data-tip=${name} aria-label=${name} aria-pressed=${opts.current === name ? 'true' : 'false'} @click=${() => pick(name)}>${icon(LIBRARY[name], 22)}</button>`;
    const draw = (query: string) => {
      const typed = query.trim();
      const suggested = opts.suggested?.filter((n) => LIBRARY[n]) ?? [];
      const cats = iconCategories();
      // Searched: the matches. Otherwise the whole library in its sections, each named, to scroll through; the starter set first.
      const sections: { name: string; icons: string[] }[] = typed ? [{ name: '', icons: searchIcons(query) }] : [{ name: 'Favourites', icons: searchIcons('') }, ...cats.map((c) => ({ name: c.name, icons: iconsIn(c.id) }))];
      const found = sections.flatMap((x) => x.icons);
      render(
        html`<sl-input class="deck-search" size="small" type="search" placeholder="Search icons" aria-label="Search icons" autofocus clearable .value=${query} @sl-input=${(e: Event) => draw((e.target as SlInput).value)} @keydown=${(e: KeyboardEvent) => e.key === 'Enter' && found[0] && pick(found[0])}></sl-input>
          ${!typed && suggested.length
            ? html`<div class="deck-picker-label">Suggested</div>
                <div class="deck-picker suggested" role="group" aria-label="Suggested">${suggested.map(button)}</div>`
            : nothing}
          ${sections.map((x) => html`<section class="to-icons-section">
            ${x.name ? html`<h3 class="deck-picker-label">${x.name} <span>${x.icons.length}</span></h3>` : nothing}
            <div class="deck-picker" role="group" aria-label=${x.name || 'Icons'}>${x.icons.map(button)}</div>
          </section>`)}
          ${found.length ? nothing : html`<p class="deck-picker-none">No icons match “${typed}”.</p>`}
          ${typed ? nothing : html`<p class="deck-picker-more">Search by name or by what it means (“money”, “weather”, “ai”) to find any of ${iconCount().toLocaleString()} icons.</p>`}
          ${opts.footer ? html`<div slot="footer" class="to-icons-footer" @click=${() => draw(query)}>${opts.footer()}</div>` : nothing}
          ${opts.none ? html`<sl-button slot="footer" size="small" @click=${() => pick('')}>${icon(UI.close, 14)} No icon</sl-button>` : nothing}`,
        dialog,
      );
    };
    draw('');
    // The whole library and its groups arrive a moment after the first paint.
    void allIcons.then(() => dialog.isConnected && draw(dialog.querySelector<SlInput>('sl-input')?.value ?? ''));
    dialog.addEventListener('sl-after-hide', (e) => {
      if (e.target !== dialog) return;
      dialog.remove();
      done(picked);
    });
    document.body.append(dialog);
    void customElements.whenDefined('sl-dialog').then(() => dialog.show());
  });
}
