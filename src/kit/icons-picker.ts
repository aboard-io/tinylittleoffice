/**
 * chooseIcon(): the icon library in a dialog, searchable, for any app that wants an icon (Draw, Write, Deck,
 * Diagram). A lazy chunk: importing it brings the rest of Lucide (some 1,800 icons) and their tags and
 * categories (icons-meta.ts) with it, which join kit/icons.ts LIBRARY under Lucide's own names, so a
 * document may name any of them, and the Emoji set (emoji.ts). Resolves with the icon's name, or an
 * emoji's character; '' for "No icon" when that is offered; null if nothing was picked. Suggestions (from the words on a slide, say) sit above the library.
 */
import { html, nothing, type TemplateResult } from 'lit';
import { icon, iconNamed, UI } from './icons.ts';
import { allIcons } from './icons-full.ts';
import { addIconNames, iconCategories, iconCount, iconsIn, searchIcons } from './icons-search.ts';
import { CATEGORIES, META } from './icons-meta.ts';
import { EMOJI_GROUPS, emojiIn, emojiName, searchEmoji } from './emoji.ts';
import { t } from './i18n.ts';
import type { ToDialog } from './dialog.ts';
import './dialog.ts';

/** The whole of Lucide's tags and categories, joined to the search once, as this chunk loads. */
addIconNames(allIcons, META, CATEGORIES);

export interface IconChoice {
  /** Icons to offer first, by name. */
  suggested?: string[];
  /** The icon there now, marked as pressed. */
  current?: string;
  /** Offer "No icon", which resolves ''. */
  none?: boolean;
  /**
   * Offer the Emoji set beside the icons (the default): for a caller that puts the result into words, where an
   * emoji is a character like any other. false where an icon's name is needed (a shape's icon, a slide's glyph).
   */
  emoji?: boolean;
}

/** Unicode's groups, named for the reader (EMOJI_GROUPS holds them in English, in this order). */
const groupNames = () => [t('Smileys & Emotion'), t('People & Body'), t('Animals & Nature'), t('Food & Drink'), t('Travel & Places'), t('Activities'), t('Objects'), t('Symbols'), t('Flags')];

/**
 * The library in a dialog. Resolves with an icon's name, or with an emoji's character itself when the Emoji
 * set is offered and one is picked (an emoji is words: the caller puts the character in as text; isIconName
 * tells the two apart). With emoji, a two-way switch (Icons · Emoji) chooses which set is browsed: one
 * scroll of both would put the emoji under some forty sections of icons, a long way down on a phone. The
 * search spans both sets at once, the set being browsed first.
 */
export function chooseIcon(opts: IconChoice = {}): Promise<string | null> {
  const withEmoji = opts.emoji !== false;
  return new Promise((done) => {
    const dialog = document.createElement('to-dialog') as ToDialog;
    dialog.heading = withEmoji ? t('Icon or emoji') : t('Icon');
    dialog.className = 'to-icons';
    let picked: string | null = null;
    let query = '';
    let set: 'icons' | 'emoji' = 'icons';
    const pick = (name: string) => {
      picked = name;
      dialog.close();
    };
    const button = (name: string) => {
      const node = iconNamed(name);
      return node ? html`<button type="button" class="to-icon-btn" title=${name} aria-label=${name} aria-pressed=${opts.current === name ? 'true' : 'false'} @click=${() => pick(name)}>${icon(node, 22)}</button>` : nothing;
    };
    const emojiButton = (char: string) => {
      const name = emojiName(char);
      return html`<button type="button" class="to-icon-btn to-emoji-btn" title=${name} aria-label=${name} @click=${() => pick(char)}>${char}</button>`;
    };
    const section = (name: string, items: string[], draw: (x: string) => unknown, count = true) =>
      html`<section class="to-icons-section">${name ? html`<h3>${name}${count ? html` <span>${items.length}</span>` : nothing}</h3>` : nothing}<div class="to-icons-grid" role="group" aria-label=${name || t('Icons')}>${items.map(draw)}</div></section>`;
    const body = (): TemplateResult => {
      const typed = query.trim();
      const suggested = opts.suggested?.filter((n) => iconNamed(n)) ?? [];
      // Searched: the matches in both sets, the one browsed first. Otherwise the set browsed, in its sections, each named, to scroll through.
      const icons = typed ? searchIcons(query) : [];
      const emoji = typed && withEmoji ? searchEmoji(query) : [];
      const sections: { name: string; items: string[]; emoji: boolean }[] = typed
        ? withEmoji
          ? (set === 'emoji' ? [1, 0] : [0, 1]).map((k) => (k ? { name: t('Emoji'), items: emoji, emoji: true } : { name: t('Icons'), items: icons, emoji: false })).filter((x) => x.items.length)
          : [{ name: '', items: icons, emoji: false }]
        : set === 'emoji'
          ? EMOJI_GROUPS.map((_, i) => ({ name: groupNames()[i], items: emojiIn(i), emoji: true }))
          : [{ name: t('Favourites'), items: searchIcons(''), emoji: false }, ...iconCategories().map((c) => ({ name: c.name, items: iconsIn(c.id), emoji: false }))];
      const first = sections.find((x) => x.items.length)?.items[0];
      const label = withEmoji ? t('Search icons and emoji') : t('Search icons');
      return html`<input class="to-icons-search" type="search" placeholder=${label} aria-label=${label} autocomplete="off" .value=${query} @input=${(e: Event) => ((query = (e.target as HTMLInputElement).value), draw())} @keydown=${(e: KeyboardEvent) => e.key === 'Enter' && first && pick(first)} />
        ${withEmoji
          ? html`<div class="to-seg to-icons-sets" role="group" aria-label=${t('Icons or emoji')}>
              <button type="button" class="to-btn" aria-pressed=${String(set === 'icons')} @click=${() => ((set = 'icons'), draw())}>${t('Icons')}</button>
              <button type="button" class="to-btn" aria-pressed=${String(set === 'emoji')} @click=${() => ((set = 'emoji'), draw())}>${t('Emoji')}</button>
            </div>`
          : nothing}
        ${!typed && set === 'icons' && suggested.length ? section(t('Suggested'), suggested, button, false) : nothing}
        ${sections.map((x) => section(x.name, x.items, x.emoji ? emojiButton : button))}
        ${first ? nothing : html`<p class="to-hint">${withEmoji ? t('No icons or emoji match “{q}”.', { q: typed }) : t('No icons match “{q}”.', { q: typed })}</p>`}
        ${typed || set === 'emoji' ? nothing : html`<p class="to-hint">${t('Search by name or by what it means (“money”, “weather”, “ai”) to find any of {n} icons.', { n: iconCount().toLocaleString(document.documentElement.lang || undefined) })}</p>`}
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
