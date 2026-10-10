/**
 * The Website Builder's commands (kit/commands.ts), its editor the context: the bar (Insert ▾ what the section in hand
 * can take, a QR code and a new document of any other app; Look ▾ the theme, light or dark, the type and the shape;
 * Preview, and Edit back from it), the bar beside the thing in hand (§8's order: Edit, where it goes, Move up and
 * down, left and right in a row, Duplicate | Delete) and the keys of the thing in hand (docs/editing.md §6 and §8):
 * Enter edits it, Escape lets it go, Delete takes it away, Alt+Up/Down and Mod+Alt+Left/Right move it, Up and Down go
 * to the thing before or after, Mod+D duplicates it; Escape in the preview goes back to editing.
 */
import { ArrowDown, ArrowLeft, ArrowRight, ArrowUp, CopyPlus, Eye, Palette, SquarePen } from 'lucide';
import { apps } from '../../kit/apps.ts';
import { command, register, type Command } from '../../kit/commands.ts';
import { t } from '../../kit/i18n.ts';
import { UI } from '../../kit/icons.ts';
import { duplicateObj, kindName, kindsOf, linksOp, moveObj, objectAt, removeObj, ROW, type Kind } from './model.ts';
import { FACES, THEMES, faceOf, isDark, type Face } from './theme.ts';
import type { ToSiteEditor } from './editor.ts';

type S = ToSiteEditor;
const KINDS: Kind[] = ['page', 'section', 'heading', 'p', 'button', 'card', 'link', 'picture', 'icon', 'web', 'doc', 'product'];
const KIND_ICON: Record<Kind, Command['icon']> = {
  page: UI.heading1, section: UI.heading, heading: UI.heading, p: UI.text, button: UI.link, card: UI.list, link: UI.link, picture: UI.image, icon: UI.icon, web: UI.globe, doc: UI.insert, product: UI.table,
};
export const THEME_NAMES = (): Record<string, string> => ({
  indigo: t('Indigo'), teal: t('Teal'), rose: t('Rose'), amber: t('Amber'), ink: t('Ink'), forest: t('Forest'), ocean: t('Ocean'), sunset: t('Sunset'),
  plum: t('Plum'), candy: t('Candy'), olive: t('Olive'), slate: t('Slate'), paper: t('Paper'), typewriter: t('Typewriter'), midnight: t('Midnight'), coal: t('Coal'),
});
const FACE_NAMES = (): Record<Face, string> => ({ sans: t('Sans serif'), serif: t('Serif'), rounded: t('Rounded'), mono: t('Monospace') });
const held = (s: S) => s.held;
/** A place as its chip shows it: a page of the site by its name, an address by its host, short. */
function shortPlace(url: string): string {
  const u = url.trim();
  if (!u) return '';
  const words = u.startsWith('#') ? u.slice(1) : u.replace(/^(https?:\/\/|mailto:|tel:)/, '').replace(/\/.*$/, '');
  return words.length > 16 ? `${words.slice(0, 15)}…` : words;
}
const thing = (s: S) => (s.held === null ? undefined : objectAt(s.view, s.held));
const mode = (s: S) => (s.view.theme.dark === undefined ? 'auto' : s.view.theme.dark ? 'dark' : 'light');
const move = (dir: 'up' | 'down' | 'left' | 'right', label: () => string, icon: Command['icon'], keys: string) =>
  command<S>({ id: `site.${dir}`, scope: 'site', at: 'box', label, icon, keys, where: ['context'], group: 'edit', when: (s) => !!thing(s) && (dir === 'up' || dir === 'down' || ROW.has(thing(s)!.kind)), disabled: (s) => !moveObj(s.doc, s.view, held(s)!, dir), does: (s) => s.fromBarDo(() => s.change(moveObj(s.doc, s.view, held(s)!, dir))) });
const light = (m: 'auto' | 'light' | 'dark', label: () => string) => command<S>({ id: `site.look.${m}`, scope: 'site', label, heading: () => t('Light or dark'), where: ['menu:look'], pressed: (s) => mode(s) === m, does: (s) => s.setTheme({ dark: m === 'auto' ? undefined : m === 'dark' }) });

const SITE: Command<S>[] = [
  command<S>({ id: 'site.insert', scope: 'site', label: () => t('Insert'), icon: UI.insert, menu: 'insert', where: ['bar'], takesFocus: true, when: (s) => !s.preview, does: () => undefined }),
  ...KINDS.map((k) => command<S>({ id: `site.insert.${k}`, scope: 'site', label: () => kindName(k), icon: KIND_ICON[k], where: ['menu:insert'], when: (s) => kindsOf(s.view, thing(s)?.n ?? s.cur).includes(k), does: (s) => s.insert(k) })),
  command<S>({ id: 'site.insert.qr', scope: 'site', label: () => t('QR code of this document'), icon: UI.qr, where: ['menu:insert'], does: (s) => s.insertQr() }),
  // A new document of another app, made in its own editor in the dialog (kit/doc-dialog.ts): a website of pages holds them, a Quick Links page does not.
  ...apps()
    .filter((a) => a.id !== 'site')
    .map((a) => command<S>({ id: `site.insert.app.${a.id}`, scope: 'site', label: () => a.name, icon: a.icon, heading: () => t('A new document'), where: ['menu:insert'], when: (s) => !s.view.links, does: (s) => s.insertApp(a.id) })),
  command<S>({ id: 'site.look', scope: 'site', label: (s) => t('Look: {theme}', { theme: s ? `${THEME_NAMES()[s.view.theme.id] ?? s.view.theme.id}${isDark(s.view.theme) ? ' · ' + t('Dark') : ''}` : '' }), icon: Palette, menu: 'look', where: ['bar'], document: true, takesFocus: true, when: (s) => !s.preview, does: () => undefined }),
  ...Object.entries(THEMES).map(([id, T]) => command<S>({ id: `site.theme.${id}`, scope: 'site', label: () => THEME_NAMES()[id], swatch: () => T.a, heading: () => t('Theme'), where: ['menu:look'], pressed: (s) => s.view.theme.id === id, does: (s) => s.setTheme({ id }) })),
  light('auto', () => t('As the theme is')),
  light('light', () => t('Light')),
  light('dark', () => t('Dark')),
  ...FACES.map((f) => command<S>({ id: `site.face.${f}`, scope: 'site', label: () => FACE_NAMES()[f], heading: () => t('Type'), where: ['menu:look'], pressed: (s) => faceOf(s.view.theme) === f, does: (s) => s.setTheme({ face: f }) })),
  command<S>({ id: 'site.shape.pages', scope: 'site', label: () => t('A website of pages'), heading: () => t('Shape'), where: ['menu:look'], pressed: (s) => !s.view.links, does: (s) => s.edit([linksOp(false)]) }),
  command<S>({ id: 'site.shape.links', scope: 'site', label: () => t('Quick links: one column'), heading: () => t('Shape'), where: ['menu:look'], pressed: (s) => s.view.links, does: (s) => s.edit([linksOp(true)]) }),
  command<S>({ id: 'site.preview', scope: 'site', label: () => t('Preview'), icon: Eye, where: ['bar'], document: true, takesFocus: true, when: (s) => !s.preview, does: (s) => s.startPreview() }),
  command<S>({ id: 'site.edit', scope: 'site', label: () => t('Edit'), icon: UI.pen, keys: 'Escape', at: 'preview', where: ['bar'], document: true, takesFocus: true, when: (s) => s.preview, does: (s) => s.endPreview() }),
  // The thing in hand.
  command<S>({ id: 'site.open', scope: 'site', at: 'box', label: () => t('Edit'), icon: SquarePen, keys: 'Enter', where: ['context'], group: 'edit', when: (s) => !!thing(s), does: (s) => s.editObj(held(s)!) }),
  command<S>({
    id: 'site.place',
    scope: 'site',
    label: (s) => {
      const p = s && held(s) !== null ? s.placeOf(held(s)!) : null;
      return p?.url ? t('Goes to {place}', { place: p.url }) : t('Where it goes');
    },
    letter: (s) => (s && held(s) !== null ? shortPlace(s.placeOf(held(s)!)?.url ?? '') : '') || t('Link'),
    where: ['context'],
    group: 'edit',
    when: (s) => !!thing(s) && ROW.has(thing(s)!.kind) && !!s.placeOf(held(s)!),
    does: (s) => s.fromBarDo(() => void s.editPlace(held(s)!)),
  }),
  move('up', () => t('Move up'), ArrowUp, 'Alt+ArrowUp'),
  move('down', () => t('Move down'), ArrowDown, 'Alt+ArrowDown'),
  move('left', () => t('Move left'), ArrowLeft, 'Mod+Alt+ArrowLeft'),
  move('right', () => t('Move right'), ArrowRight, 'Mod+Alt+ArrowRight'),
  command<S>({ id: 'site.duplicate', scope: 'site', at: 'box', label: () => t('Duplicate'), icon: CopyPlus, keys: 'Mod+D', where: ['context'], group: 'edit', when: (s) => !!thing(s), disabled: (s) => !duplicateObj(s.doc, s.view, held(s)!), does: (s) => s.fromBarDo(() => s.change(duplicateObj(s.doc, s.view, held(s)!))) }),
  command<S>({ id: 'site.delete', scope: 'site', at: 'box', label: () => t('Delete'), icon: UI.trash, keys: 'Delete / Backspace', where: ['context'], group: 'delete', when: (s) => !!thing(s), disabled: (s) => !removeObj(s.doc, s.view, held(s)!), does: (s) => s.fromBarDo(() => s.change(removeObj(s.doc, s.view, held(s)!))) }),
  command<S>({ id: 'site.letgo', scope: 'site', at: 'box', label: () => t('Step out: close, collapse, let go'), keys: 'Escape', where: ['keys-only'], when: (s) => !!thing(s), does: (s) => s.letGo() }),
  command<S>({ id: 'site.step', scope: 'site', at: 'box', label: () => t('The next or the one before'), keys: 'ArrowUp / ArrowDown', where: ['keys-only'], when: (s) => !!thing(s), does: (s, e) => s.step(e instanceof KeyboardEvent && e.key === 'ArrowUp' ? -1 : 1) }),
];
export const BOX = SITE.filter((c) => c.at === 'box' && c.keys);
export const PREVIEW = SITE.filter((c) => c.at === 'preview');

export default register(SITE) as Command<S>[];
