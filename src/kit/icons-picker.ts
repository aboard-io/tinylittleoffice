/**
 * chooseIcon(): the icon library in a dialog, searchable, for any app that wants an icon (Draw, Write, Deck,
 * Diagram). A lazy chunk: importing it brings the rest of Lucide (some 1,800 icons) and their tags and
 * categories (icons-meta.ts) with it, which join kit/icons.ts LIBRARY under Lucide's own names, so a
 * document may name any of them. Resolves with the icon's name; '' for "No icon" when that is offered;
 * null if nothing was picked. Suggestions (from the words on a slide, say) sit above the library.
 */
import { html, nothing, type TemplateResult } from 'lit';
import { icons } from 'lucide';
import { addIcons, icon, iconNamed, UI } from './icons.ts';
import { addIconNames, iconCategories, iconCount, iconsIn, searchIcons } from './icons-search.ts';
import { CATEGORIES, META } from './icons-meta.ts';
import { t } from './i18n.ts';
import type { ToDialog } from './dialog.ts';
import './dialog.ts';

/** "ChartColumn" as a document names it: "chart-column". */
const kebab = (name: string) =>
  name
    .replace(/([A-Z])([A-Z][a-z])/g, '$1-$2')
    .replace(/([a-z])([A-Z0-9])/g, '$1-$2')
    .replace(/([0-9])([A-Z])/g, '$1-$2')
    .toLowerCase();

/** The whole of Lucide joined to the library, by name, with its tags and categories; done once, as this chunk loads. */
export const allIcons: string[] = addIcons(Object.fromEntries(Object.entries(icons).map(([name, node]) => [kebab(name), node])));
addIconNames(allIcons, META, CATEGORIES);

export interface IconChoice {
  /** Icons to offer first, by name. */
  suggested?: string[];
  /** The icon there now, marked as pressed. */
  current?: string;
  /** Offer "No icon", which resolves ''. */
  none?: boolean;
}

export function chooseIcon(opts: IconChoice = {}): Promise<string | null> {
  return new Promise((done) => {
    const dialog = document.createElement('to-dialog') as ToDialog;
    dialog.heading = t('Icon');
    dialog.className = 'to-icons';
    let picked: string | null = null;
    let query = '';
    const pick = (name: string) => {
      picked = name;
      dialog.close();
    };
    const button = (name: string) => {
      const node = iconNamed(name);
      return node ? html`<button type="button" class="to-icon-btn" title=${name} aria-label=${name} aria-pressed=${opts.current === name ? 'true' : 'false'} @click=${() => pick(name)}>${icon(node, 22)}</button>` : nothing;
    };
    const body = (): TemplateResult => {
      const typed = query.trim();
      const suggested = opts.suggested?.filter((n) => iconNamed(n)) ?? [];
      // Searched: the matches. Otherwise the whole library in its sections, each named, to scroll through; the starter set first.
      const sections: { name: string; icons: string[] }[] = typed ? [{ name: '', icons: searchIcons(query) }] : [{ name: t('Favourites'), icons: searchIcons('') }, ...iconCategories().map((c) => ({ name: c.name, icons: iconsIn(c.id) }))];
      const found = sections.flatMap((x) => x.icons);
      return html`<input class="to-icons-search" type="search" placeholder=${t('Search icons')} aria-label=${t('Search icons')} autocomplete="off" .value=${query} @input=${(e: Event) => ((query = (e.target as HTMLInputElement).value), draw())} @keydown=${(e: KeyboardEvent) => e.key === 'Enter' && found[0] && pick(found[0])} />
        ${!typed && suggested.length ? html`<section class="to-icons-section"><h3>${t('Suggested')}</h3><div class="to-icons-grid" role="group" aria-label=${t('Suggested')}>${suggested.map(button)}</div></section>` : nothing}
        ${sections.map((x) => html`<section class="to-icons-section">${x.name ? html`<h3>${x.name} <span>${x.icons.length}</span></h3>` : nothing}<div class="to-icons-grid" role="group" aria-label=${x.name || t('Icons')}>${x.icons.map(button)}</div></section>`)}
        ${found.length ? nothing : html`<p class="to-hint">${t('No icons match “{q}”.', { q: typed })}</p>`}
        ${typed ? nothing : html`<p class="to-hint">${t('Search by name or by what it means (“money”, “weather”, “ai”) to find any of {n} icons.', { n: iconCount().toLocaleString(document.documentElement.lang || undefined) })}</p>`}
        ${opts.none ? html`<div class="to-row"><button type="button" class="to-btn" @click=${() => pick('')}>${icon(UI.close, 16)}<span>${t('No icon')}</span></button></div>` : nothing}`;
    };
    const draw = () => {
      dialog.body = body();
    };
    draw();
    dialog.addEventListener('to-close', () => {
      dialog.remove();
      done(picked);
    });
    document.body.append(dialog);
    void dialog.show().then(() => dialog.querySelector<HTMLInputElement>('.to-icons-search')?.focus());
  });
}
