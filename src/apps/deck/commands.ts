/**
 * The Presentation Builder's commands (kit/commands.ts), its editor the context: the bar (Insert ▾ with the kinds of
 * slide, Present or the sheets to print, the marks, Link and Footnote and the lists' Indent and Bring out, which are
 * the words' own with the box in hand as their context, Icon, the menus Layout, Look, Transition and Format, the
 * closing QR code, Move slide up and down, Delete slide), the keys of the slide being edited (docs/editing.md §8:
 * Mod+Shift+Enter a new slide, Mod+Alt+Enter present, Mod+Enter in the headline on to the words, Mod+D the slide
 * again, Alt+Up/Down in the headline the slide past its neighbour, PageUp and PageDown on the rail) and the keys of
 * the show (Space, Enter and the right arrow on, the left arrow back, End the whole slide, N the notes, Escape out).
 */
import { ChevronDown, ChevronUp, LayoutTemplate, Palette, Play, Printer, Scroll, Shuffle } from 'lucide';
import { apps } from '../../kit/apps.ts';
import { command, register, type Command } from '../../kit/commands.ts';
import { t } from '../../kit/i18n.ts';
import { UI } from '../../kit/icons.ts';
import { FORMATS, LAYOUTS, setHead, TRANSITIONS, type Layout } from './model.ts';
import { ICON_COLORS, THEMES } from './theme.ts';
import { geometryOf } from './view.ts';
import type { ToDeckEditor } from './editor.ts';

type D = ToDeckEditor;
const paged = (d?: D) => !!d && !!geometryOf(d.settings.format);
const showing = (d: D) => d.showing >= 0;
const LAYOUT_ICONS: Record<Layout, Command['icon']> = { '': UI.list, t: UI.heading1, '2': LayoutTemplate, i: UI.icon };
const LAYOUT_NAMES: Record<Layout, [() => string, () => string]> = {
  '': [() => t('Page'), () => t('Bullets slide')],
  t: [() => t('Title page'), () => t('Title slide')],
  '2': [() => t('Two-column page'), () => t('Two-column slide')],
  i: [() => t('Big icon page'), () => t('Big icon slide')],
};
/** A printed format that grows by sheets: Insert ▾ offers four more pages rather than a kind of slide. */
const bySheet = (d: D) => {
  const g = geometryOf(d.settings.format);
  return !!g?.grow && (g.by ?? 4) > 1;
};
const full = (d: D) => {
  const g = geometryOf(d.settings.format);
  return !!g?.grow && d.count >= g.grow;
};
const slides = (d?: D) => (paged(d) ? t('Pages') : t('Slides'));
const onSlide = (d?: D) => (paged(d) ? t('On the page') : t('On the slide'));

const INSERTS: Command<D>[] = [
  ...LAYOUTS.map((l) =>
    command<D>({ id: `deck.insert.${l.id || 'bullets'}`, scope: 'deck', label: (d) => LAYOUT_NAMES[l.id][paged(d) ? 0 : 1](), icon: LAYOUT_ICONS[l.id], heading: slides, where: ['menu:insert'], when: (d) => !bySheet(d), disabled: full, does: (d) => d.newSlide(l.id) }),
  ),
  command<D>({ id: 'deck.insert.pages', scope: 'deck', label: () => t('Four more pages'), icon: UI.plus, heading: slides, where: ['menu:insert'], when: bySheet, disabled: full, does: (d) => d.morePages() }),
  command<D>({ id: 'deck.insert.picture', scope: 'deck', label: () => t('Web Picture…'), icon: UI.image, heading: onSlide, where: ['menu:insert'], does: (d) => d.insertPicture() }),
  command<D>({ id: 'deck.insert.table', scope: 'deck', label: () => t('Table'), icon: UI.table, heading: onSlide, where: ['menu:insert'], does: (d) => d.insertTable() }),
  command<D>({ id: 'deck.insert.web', scope: 'deck', label: () => t('Web Embed…'), icon: UI.globe, heading: onSlide, where: ['menu:insert'], does: (d) => d.insertWeb() }),
  command<D>({ id: 'deck.insert.doc', scope: 'deck', label: () => t('Tiny Little Office Doc…'), icon: UI.insert, heading: onSlide, where: ['menu:insert'], does: (d) => d.insertDocument() }),
  command<D>({ id: 'deck.insert.qr', scope: 'deck', label: () => t('QR code of this document'), icon: UI.qr, heading: onSlide, where: ['menu:insert'], does: (d) => d.insertQr() }),
  ...apps()
    .filter((a) => a.id !== 'deck')
    .map((a) => command<D>({ id: `deck.insert.app.${a.id}`, scope: 'deck', label: () => a.name, icon: a.icon, heading: () => t('A new document'), where: ['menu:insert'], does: (d) => d.insertApp(a.id) })),
];

const DECK: Command<D>[] = [
  command<D>({ id: 'deck.insert', scope: 'deck', label: () => t('Insert'), icon: UI.insert, menu: 'insert', where: ['bar'], takesFocus: true, does: () => undefined }),
  ...INSERTS,
  command<D>({ id: 'deck.present', scope: 'deck', label: () => t('Present'), icon: Play, keys: 'Mod+Alt+Enter', where: ['bar'], document: true, takesFocus: true, when: (d) => !paged(d) && !showing(d), does: (d) => d.show(d.cur) }),
  command<D>({ id: 'deck.sheets', scope: 'deck', label: (d) => (d?.sheets ? t('Back to the pages') : t('See the sheets to print')), icon: Printer, where: ['bar'], document: true, when: paged, pressed: (d) => d.sheets, does: (d) => (d.sheets = !d.sheets) }),
  command<D>({ id: 'deck.icon', scope: 'deck', label: () => t('Icon'), icon: UI.icon, where: ['bar'], takesFocus: true, does: (d) => d.pickIcon() }),
  command<D>({ id: 'deck.layout', scope: 'deck', label: (d) => t('Layout: {layout}', { layout: LAYOUTS.find((l) => l.id === (d?.slide.layout ?? ''))!.name() }), icon: LayoutTemplate, menu: 'layout', where: ['bar'], takesFocus: true, does: () => undefined }),
  ...LAYOUTS.map((l) => command<D>({ id: `deck.layout.${l.id || 'bullets'}`, scope: 'deck', label: () => l.name(), where: ['menu:layout'], pressed: (d) => d.slide.layout === l.id, does: (d) => d.setLayout(l.id) })),
  command<D>({ id: 'deck.look', scope: 'deck', label: (d) => t('Look: {theme}', { theme: THEMES[d?.settings.theme ?? 'paper']?.name() ?? '' }), icon: Palette, menu: 'look', where: ['bar'], document: true, takesFocus: true, does: () => undefined }),
  ...Object.keys(THEMES).map((id) =>
    command<D>({ id: `deck.look.${id}`, scope: 'deck', label: () => THEMES[id].name(), swatch: () => (THEMES[id].dark ? THEMES[id].paper : THEMES[id].accent), heading: () => (THEMES[id].fun ? t('Fun') : t('Theme')), where: ['menu:look'], pressed: (d) => d.settings.theme === id, does: (d) => d.change(setHead('theme', id)) }),
  ),
  command<D>({ id: 'deck.look.color', scope: 'deck', label: () => t("The theme's colour"), swatch: (d) => THEMES[d?.settings.theme ?? 'paper']?.accent ?? '', heading: () => t('Icons'), where: ['menu:look'], pressed: (d) => !d.settings.color, does: (d) => d.change(setHead('color', '')) }),
  ...Object.entries(ICON_COLORS).map(([id, c]) =>
    command<D>({ id: `deck.color.${id}`, scope: 'deck', label: () => c.name(), swatch: () => c.hex, heading: () => t('Icons'), where: ['menu:look'], pressed: (d) => d.settings.color === id, does: (d) => d.change(setHead('color', id)) }),
  ),
  command<D>({ id: 'deck.transition', scope: 'deck', label: (d) => t('Transition: {transition}', { transition: TRANSITIONS.find((x) => x.id === (d?.settings.transition ?? ''))?.name() ?? '' }), icon: Shuffle, menu: 'transition', where: ['bar'], document: true, takesFocus: true, when: (d) => !paged(d), does: () => undefined }),
  ...TRANSITIONS.map((x) => command<D>({ id: `deck.transition.${x.id || 'fade'}`, scope: 'deck', label: () => x.name(), where: ['menu:transition'], pressed: (d) => d.settings.transition === x.id, does: (d) => d.change(setHead('transition', x.id)) })),
  command<D>({ id: 'deck.format', scope: 'deck', label: (d) => t('Format: {format}', { format: FORMATS.find((f) => f.id === (d?.settings.format ?? ''))?.name() ?? '' }), icon: Scroll, menu: 'format', where: ['bar'], document: true, takesFocus: true, does: () => undefined }),
  ...FORMATS.map((f) => command<D>({ id: `deck.format.${f.id || 'deck'}`, scope: 'deck', label: () => f.name(), heading: () => t('Format'), where: ['menu:format'], pressed: (d) => d.settings.format === f.id, does: (d) => d.setFormat(f.id) })),
  command<D>({ id: 'deck.sides.one', scope: 'deck', label: () => t('One-sided: fold and cut'), heading: () => t('Printing'), where: ['menu:format'], when: (d) => !!geometryOf(d.settings.format)?.sides, pressed: (d) => !d.settings.two, does: (d) => d.change(setHead('sides', '')) }),
  command<D>({ id: 'deck.sides.two', scope: 'deck', label: () => t('Two-sided: cut and nest'), heading: () => t('Printing'), where: ['menu:format'], when: (d) => !!geometryOf(d.settings.format)?.sides, pressed: (d) => d.settings.two, does: (d) => d.change(setHead('sides', '2')) }),
  command<D>({ id: 'deck.qr', scope: 'deck', label: () => t('End with a QR code of this deck'), icon: UI.qr, where: ['bar'], document: true, when: (d) => !paged(d), pressed: (d) => d.settings.qr, does: (d) => d.change(setHead('qr', d.settings.qr ? 'no' : '')) }),
  command<D>({ id: 'deck.up', scope: 'deck', label: (d) => (paged(d) ? t('Move page up') : t('Move slide up')), icon: ChevronUp, keys: 'Alt+ArrowUp', where: ['bar'], disabled: (d) => d.cur === 0, does: (d, e) => d.moveKey(-1, e) }),
  command<D>({ id: 'deck.down', scope: 'deck', label: (d) => (paged(d) ? t('Move page down') : t('Move slide down')), icon: ChevronDown, keys: 'Alt+ArrowDown', where: ['bar'], disabled: (d) => d.cur >= d.count - 1, does: (d, e) => d.moveKey(1, e) }),
  command<D>({ id: 'deck.delete', scope: 'deck', label: (d) => (paged(d) ? t('Delete page') : t('Delete slide')), icon: UI.trash, where: ['bar'], disabled: (d) => d.cur >= d.slides.length, does: (d) => d.deleteSlide() }),
  command<D>({ id: 'deck.new', scope: 'deck', label: () => t('A new slide'), keys: 'Mod+Shift+Enter', where: ['keys-only'], when: (d) => !showing(d), does: (d) => d.newSlide() }),
  command<D>({ id: 'deck.onto', scope: 'deck', label: () => t('On to the words'), keys: 'Mod+Enter', where: ['keys-only'], when: (d) => !showing(d), does: (d, e) => d.ontoWords(e) }),
  command<D>({ id: 'deck.duplicate', scope: 'deck', label: () => t('Duplicate slide'), keys: 'Mod+D', where: ['keys-only'], when: (d) => !showing(d), does: (d, e) => d.duplicateKey(e) }),
  command<D>({ id: 'deck.rail', scope: 'deck', label: () => t('The slide before, the slide after (on the rail)'), keys: 'PageUp / PageDown', where: ['keys-only'], when: (d) => !showing(d), does: (d, e) => d.railStep(e) }),
  command<D>({ id: 'deck.show.next', scope: 'deck', label: () => t('Presenting: the next line or slide'), keys: 'ArrowRight / Space / PageDown / Enter', where: ['keys-only'], when: showing, does: (d) => d.forward() }),
  command<D>({ id: 'deck.show.back', scope: 'deck', label: () => t('Presenting: back'), keys: 'ArrowLeft / PageUp / Backspace', where: ['keys-only'], when: showing, does: (d) => d.back() }),
  command<D>({ id: 'deck.show.whole', scope: 'deck', label: () => t('Presenting: the whole slide'), keys: 'End', where: ['keys-only'], when: showing, does: (d) => (d.shown = d.steps()) }),
  command<D>({ id: 'deck.show.notes', scope: 'deck', label: () => t('Presenting: the notes, shown or hidden'), keys: 'N / Shift+N', where: ['keys-only'], when: showing, does: (d) => (d.noting = !d.noting) }),
  command<D>({ id: 'deck.show.stop', scope: 'deck', label: () => t('Stop presenting'), icon: UI.close, keys: 'Escape', where: ['keys-only'], when: showing, does: (d) => d.show(-1) }),
];

/** The show's keys (while presenting, heard on the window), and the rest. */
export const SHOW = DECK.filter((c) => c.id.startsWith('deck.show.'));
export const EDIT = DECK.filter((c) => !c.id.startsWith('deck.show.'));

export default register(DECK) as Command<D>[];
