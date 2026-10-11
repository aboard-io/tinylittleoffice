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
import { command, register, type Command, commandsOf } from '../../kit/commands.ts';
import { t } from '../../kit/i18n.ts';
import { UI } from '../../kit/icons.ts';
import { FORMATS, LAYOUTS, setHead, TRANSITIONS, type Layout } from './model.ts';
import { ICON_COLORS, THEMES } from './theme.ts';
import { geometryOf } from './view.ts';
import type { ToDeckEditor } from './editor.ts';

type D = ToDeckEditor;
const cmd = commandsOf<D>('deck');
const paged = (d?: D) => !!d && !!geometryOf(d.settings.format);
const showing = (d: D) => d.showing >= 0;
const LAYOUT_ICONS: Record<Layout, Command['icon']> = { '': UI.list, t: UI.heading1, '2': LayoutTemplate, i: UI.icon };
const LAYOUT_NAMES: Record<Layout, [string, string]> = {
  '': ['Page', 'Bullets slide'],
  t: ['Title page', 'Title slide'],
  '2': ['Two-column page', 'Two-column slide'],
  i: ['Big icon page', 'Big icon slide'],
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
    command<D>({
      id: `deck.insert.${l.id || 'bullets'}`,
      scope: 'deck',
      label: (d) => t(LAYOUT_NAMES[l.id][paged(d) ? 0 : 1]),
      icon: LAYOUT_ICONS[l.id],
      heading: slides,
      where: ['menu:insert'],
      when: (d) => !bySheet(d),
      disabled: full,
      does: (d) => d.newSlide(l.id),
    }),
  ),
  cmd('insert.pages', 'Four more pages', { icon: UI.plus, heading: slides, where: ['menu:insert'], when: bySheet, disabled: full, does: (d) => d.morePages() }),
  cmd('insert.table', 'Table', { icon: UI.table, heading: onSlide, where: ['menu:insert'], does: (d) => d.insertTable() }),
  cmd('insert.doc', 'Tiny Little Office Doc…', { icon: UI.insert, heading: onSlide, where: ['menu:insert'], does: (d) => d.insertDocument() }),
  cmd('insert.qr', 'QR code of this document', { icon: UI.qr, heading: onSlide, where: ['menu:insert'], does: (d) => d.insertQr() }),
  ...apps()
    .filter((a) => a.id !== 'deck')
    .map((a) => cmd(`insert.app.${a.id}`, () => a.name, { icon: a.icon, data: true, heading: 'A new document', where: ['menu:insert'], does: (d) => d.insertApp(a.id) })),
];

const DECK: Command<D>[] = [
  cmd('insert', 'Insert', { icon: UI.insert, menu: 'insert', where: ['bar'], takesFocus: true, does: () => undefined }),
  ...INSERTS,
  cmd('present', 'Present', { at: 'slide', icon: Play, keys: 'Mod+Alt+Enter', where: ['bar'], document: true, takesFocus: true, when: (d) => !paged(d) && !showing(d), does: (d) => d.show(d.cur) }),
  cmd('sheets', (d) => (d?.sheets ? t('Back to the pages') : t('See the sheets to print')), {
    icon: Printer,
    where: ['bar'],
    document: true,
    when: paged,
    pressed: (d) => d.sheets,
    does: (d) => (d.sheets = !d.sheets),
  }),
  cmd('icon', 'Icon', { icon: UI.icon, where: ['bar'], takesFocus: true, does: (d) => d.pickIcon() }),
  cmd('layout', (d) => t('Layout: {layout}', { layout: LAYOUTS.find((l) => l.id === (d?.slide.layout ?? ''))!.name() }), {
    icon: LayoutTemplate,
    menu: 'layout',
    where: ['bar'],
    takesFocus: true,
    does: () => undefined,
  }),
  ...LAYOUTS.map((l) => cmd(`layout.${l.id || 'bullets'}`, l.name, { where: ['menu:layout'], pressed: (d) => d.slide.layout === l.id, does: (d) => d.setLayout(l.id) })),
  cmd('look', (d) => t('Look: {theme}', { theme: THEMES[d?.settings.theme ?? 'paper']?.name() ?? '' }), {
    icon: Palette,
    menu: 'look',
    where: ['bar'],
    document: true,
    takesFocus: true,
    does: () => undefined,
  }),
  ...Object.keys(THEMES).map((id) =>
    cmd(`look.${id}`, THEMES[id].name, {
      data: true,
      swatch: () => (THEMES[id].dark ? THEMES[id].paper : THEMES[id].accent),
      heading: () => (THEMES[id].fun ? t('Fun') : t('Theme')),
      where: ['menu:look'],
      pressed: (d) => d.settings.theme === id,
      does: (d) => d.change(setHead('theme', id)),
    }),
  ),
  cmd('look.color', "The theme's color", {
    swatch: (d) => THEMES[d?.settings.theme ?? 'paper']?.accent ?? '',
    heading: 'Icons',
    where: ['menu:look'],
    pressed: (d) => !d.settings.color,
    does: (d) => d.change(setHead('color', '')),
  }),
  ...Object.entries(ICON_COLORS).map(([id, c]) =>
    cmd(`color.${id}`, c.name, { data: true, swatch: () => c.hex, heading: 'Icons', where: ['menu:look'], pressed: (d) => d.settings.color === id, does: (d) => d.change(setHead('color', id)) }),
  ),
  cmd('transition', (d) => t('Transition: {transition}', { transition: TRANSITIONS.find((x) => x.id === (d?.settings.transition ?? ''))?.name() ?? '' }), {
    icon: Shuffle,
    menu: 'transition',
    where: ['bar'],
    document: true,
    takesFocus: true,
    when: (d) => !paged(d),
    does: () => undefined,
  }),
  ...TRANSITIONS.map((x) =>
    cmd(`transition.${x.id || 'fade'}`, x.name, { where: ['menu:transition'], pressed: (d) => d.settings.transition === x.id, does: (d) => d.change(setHead('transition', x.id)) }),
  ),
  cmd('format', (d) => t('Format: {format}', { format: FORMATS.find((f) => f.id === (d?.settings.format ?? ''))?.name() ?? '' }), {
    icon: Scroll,
    menu: 'format',
    where: ['bar'],
    document: true,
    takesFocus: true,
    does: () => undefined,
  }),
  ...FORMATS.map((f) => cmd(`format.${f.id || 'deck'}`, f.name, { heading: 'Format', where: ['menu:format'], pressed: (d) => d.settings.format === f.id, does: (d) => d.setFormat(f.id) })),
  cmd('sides.one', 'One-sided', {
    hint: 'Fold and cut',
    heading: 'Printing',
    where: ['menu:format'],
    when: (d) => !!geometryOf(d.settings.format)?.sides,
    pressed: (d) => !d.settings.two,
    does: (d) => d.change(setHead('sides', '')),
  }),
  cmd('sides.two', 'Two-sided', {
    hint: 'Cut and nest',
    heading: 'Printing',
    where: ['menu:format'],
    when: (d) => !!geometryOf(d.settings.format)?.sides,
    pressed: (d) => d.settings.two,
    does: (d) => d.change(setHead('sides', '2')),
  }),
  cmd('qr', 'End with a QR code of this deck', {
    icon: UI.qr,
    where: ['bar'],
    document: true,
    when: (d) => !paged(d),
    pressed: (d) => d.settings.qr,
    does: (d) => d.change(setHead('qr', d.settings.qr ? 'no' : '')),
  }),
  cmd('up', (d) => (paged(d) ? t('Move page up') : t('Move slide up')), {
    at: 'words',
    icon: ChevronUp,
    keys: 'Alt+ArrowUp',
    where: ['bar'],
    disabled: (d) => d.cur === 0,
    does: (d, e) => d.moveKey(-1, e),
  }),
  cmd('down', (d) => (paged(d) ? t('Move page down') : t('Move slide down')), {
    at: 'words',
    icon: ChevronDown,
    keys: 'Alt+ArrowDown',
    where: ['bar'],
    disabled: (d) => d.cur >= d.count - 1,
    does: (d, e) => d.moveKey(1, e),
  }),
  cmd('delete', (d) => (paged(d) ? t('Delete page') : t('Delete slide')), { icon: UI.trash, where: ['bar'], disabled: (d) => d.cur >= d.slides.length, does: (d) => d.deleteSlide() }),
  cmd('new', 'A new slide', { at: 'slide', keys: 'Mod+Shift+Enter', where: ['keys-only'], when: (d) => !showing(d), does: (d) => d.newSlide() }),
  cmd('onto', 'Done', { at: 'words', keys: 'Mod+Enter', where: ['keys-only'], when: (d) => !showing(d), does: (d, e) => d.ontoWords(e) }),
  cmd('duplicate', 'Duplicate', { at: 'slide', keys: 'Mod+D', where: ['keys-only'], when: (d) => !showing(d), does: (d, e) => d.duplicateKey(e) }),
  cmd('rail', 'The slide before, the slide after (on the rail)', { at: 'rail', keys: 'PageUp / PageDown', where: ['keys-only'], when: (d) => !showing(d), does: (d, e) => d.railStep(e) }),
  cmd('show.next', 'Presenting: the next line or slide', { at: 'show', keys: 'ArrowRight / Space / PageDown / Enter', where: ['keys-only'], when: showing, does: (d) => d.forward() }),
  cmd('show.back', 'Presenting: back', { at: 'show', keys: 'ArrowLeft / PageUp / Backspace', where: ['keys-only'], when: showing, does: (d) => d.back() }),
  cmd('show.whole', 'Presenting: the whole slide', { at: 'show', keys: 'End', where: ['keys-only'], when: showing, does: (d) => (d.shown = d.steps()) }),
  cmd('show.notes', 'Notes', { at: 'show', keys: 'N / Shift+N', where: ['keys-only'], when: showing, does: (d) => (d.noting = !d.noting) }),
  cmd('show.stop', 'Stop presenting', { at: 'show', icon: UI.close, keys: 'Escape', where: ['keys-only'], when: showing, does: (d) => d.show(-1) }),
];

/** The show's keys (while presenting, heard on the window), and the rest. */
export const SHOW = DECK.filter((c) => c.id.startsWith('deck.show.'));
export const EDIT = DECK.filter((c) => !c.id.startsWith('deck.show.'));

export default register(DECK) as Command<D>[];
