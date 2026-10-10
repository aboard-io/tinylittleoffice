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
import { register, type Command, commandsOf } from '../../kit/commands.ts';
import { t } from '../../kit/i18n.ts';
import { UI } from '../../kit/icons.ts';
import { duplicateObj, kindName, kindsOf, linksOp, moveObj, objectAt, removeObj, ROW, type Kind } from './model.ts';
import { FACES, THEMES, faceOf, isDark, type Face } from './theme.ts';
import type { ToSiteEditor } from './editor.ts';

type S = ToSiteEditor;
const cmd = commandsOf<S>('site');
const KINDS: Kind[] = ['page', 'section', 'heading', 'p', 'button', 'card', 'link', 'picture', 'icon', 'web', 'doc', 'product'];
const KIND_ICON: Record<Kind, Command['icon']> = {
  page: UI.heading1,
  section: UI.heading,
  heading: UI.heading,
  p: UI.text,
  button: UI.link,
  card: UI.list,
  link: UI.link,
  picture: UI.image,
  icon: UI.icon,
  web: UI.globe,
  doc: UI.insert,
  product: UI.table,
};
export const THEME_NAMES = (): Record<string, string> => ({
  indigo: t('Indigo'),
  teal: t('Teal'),
  rose: t('Rose'),
  amber: t('Amber'),
  ink: t('Ink'),
  forest: t('Forest'),
  ocean: t('Ocean'),
  sunset: t('Sunset'),
  plum: t('Plum'),
  candy: t('Candy'),
  olive: t('Olive'),
  slate: t('Slate'),
  paper: t('Paper'),
  typewriter: t('Typewriter'),
  midnight: t('Midnight'),
  coal: t('Coal'),
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
const move = (dir: 'up' | 'down' | 'left' | 'right', label: string, icon: Command['icon'], keys: string) =>
  cmd(dir, label, {
    at: 'box',
    icon,
    keys,
    where: ['context'],
    group: 'edit',
    when: (s) => !!thing(s) && (dir === 'up' || dir === 'down' || ROW.has(thing(s)!.kind)),
    disabled: (s) => !moveObj(s.doc, s.view, held(s)!, dir),
    does: (s) => s.fromBarDo(() => s.change(moveObj(s.doc, s.view, held(s)!, dir))),
  });
const light = (m: 'auto' | 'light' | 'dark', label: string) =>
  cmd(`look.${m}`, label, { heading: 'Light or dark', where: ['menu:look'], pressed: (s) => mode(s) === m, does: (s) => s.setTheme({ dark: m === 'auto' ? undefined : m === 'dark' }) });

const SITE: Command<S>[] = [
  cmd('insert', 'Insert', { icon: UI.insert, menu: 'insert', where: ['bar'], takesFocus: true, when: (s) => !s.preview, does: () => undefined }),
  ...KINDS.map((k) => cmd(`insert.${k}`, () => kindName(k), { icon: KIND_ICON[k], where: ['menu:insert'], when: (s) => kindsOf(s.view, thing(s)?.n ?? s.cur).includes(k), does: (s) => s.insert(k) })),
  cmd('insert.qr', 'QR code of this document', { icon: UI.qr, where: ['menu:insert'], does: (s) => s.insertQr() }),
  ...apps()
    .filter((a) => a.id !== 'site')
    .map((a) => cmd(`insert.app.${a.id}`, () => a.name, { icon: a.icon, data: true, heading: 'A new document', where: ['menu:insert'], when: (s) => !s.view.links, does: (s) => s.insertApp(a.id) })),
  cmd('look', (s) => t('Look: {theme}', { theme: s ? `${THEME_NAMES()[s.view.theme.id] ?? s.view.theme.id}${isDark(s.view.theme) ? ' · ' + t('Dark') : ''}` : '' }), {
    icon: Palette,
    menu: 'look',
    where: ['bar'],
    document: true,
    takesFocus: true,
    when: (s) => !s.preview,
    does: () => undefined,
  }),
  ...Object.entries(THEMES).map(([id, T]) =>
    cmd(`theme.${id}`, () => THEME_NAMES()[id], { data: true, swatch: () => T.a, heading: 'Theme', where: ['menu:look'], pressed: (s) => s.view.theme.id === id, does: (s) => s.setTheme({ id }) }),
  ),
  light('auto', 'As the theme is'),
  light('light', 'Light'),
  light('dark', 'Dark'),
  ...FACES.map((f) => cmd(`face.${f}`, () => FACE_NAMES()[f], { heading: 'Type', where: ['menu:look'], pressed: (s) => faceOf(s.view.theme) === f, does: (s) => s.setTheme({ face: f }) })),
  cmd('shape.pages', 'A website of pages', { heading: 'Shape', where: ['menu:look'], pressed: (s) => !s.view.links, does: (s) => s.edit([linksOp(false)]) }),
  cmd('shape.links', 'Quick links: one column', { heading: 'Shape', where: ['menu:look'], pressed: (s) => s.view.links, does: (s) => s.edit([linksOp(true)]) }),
  cmd('preview', 'Preview', { icon: Eye, where: ['bar'], document: true, takesFocus: true, when: (s) => !s.preview, does: (s) => s.startPreview() }),
  cmd('edit', 'Edit', { icon: UI.pen, keys: 'Escape', at: 'preview', where: ['bar'], document: true, takesFocus: true, when: (s) => s.preview, does: (s) => s.endPreview() }),
  cmd('open', 'Edit', { at: 'box', icon: SquarePen, keys: 'Enter', where: ['context'], group: 'edit', when: (s) => !!thing(s), does: (s) => s.editObj(held(s)!) }),
  cmd(
    'place',
    (s) => {
      const p = s && held(s) !== null ? s.placeOf(held(s)!) : null;
      return p?.url ? t('Goes to {place}', { place: p.url }) : t('Where it goes');
    },
    {
      letter: (s) => (s && held(s) !== null ? shortPlace(s.placeOf(held(s)!)?.url ?? '') : '') || t('Link'),
      where: ['context'],
      group: 'edit',
      when: (s) => !!thing(s) && ROW.has(thing(s)!.kind) && !!s.placeOf(held(s)!),
      does: (s) => s.fromBarDo(() => void s.editPlace(held(s)!)),
    },
  ),
  move('up', 'Move up', ArrowUp, 'Alt+ArrowUp'),
  move('down', 'Move down', ArrowDown, 'Alt+ArrowDown'),
  move('left', 'Move left', ArrowLeft, 'Mod+Alt+ArrowLeft'),
  move('right', 'Move right', ArrowRight, 'Mod+Alt+ArrowRight'),
  cmd('duplicate', 'Duplicate', {
    at: 'box',
    icon: CopyPlus,
    keys: 'Mod+D',
    where: ['context'],
    group: 'edit',
    when: (s) => !!thing(s),
    disabled: (s) => !duplicateObj(s.doc, s.view, held(s)!),
    does: (s) => s.fromBarDo(() => s.change(duplicateObj(s.doc, s.view, held(s)!))),
  }),
  cmd('delete', 'Delete', {
    at: 'box',
    icon: UI.trash,
    keys: 'Delete / Backspace',
    where: ['context'],
    group: 'delete',
    when: (s) => !!thing(s),
    disabled: (s) => !removeObj(s.doc, s.view, held(s)!),
    does: (s) => s.fromBarDo(() => s.change(removeObj(s.doc, s.view, held(s)!))),
  }),
  cmd('letgo', 'Step out: close, collapse, let go', { at: 'box', keys: 'Escape', where: ['keys-only'], when: (s) => !!thing(s), does: (s) => s.letGo() }),
  cmd('step', 'The next or the one before', {
    at: 'box',
    keys: 'ArrowUp / ArrowDown',
    where: ['keys-only'],
    when: (s) => !!thing(s),
    does: (s, e) => s.step(e instanceof KeyboardEvent && e.key === 'ArrowUp' ? -1 : 1),
  }),
];
export const BOX = SITE.filter((c) => c.at === 'box' && c.keys);
export const PREVIEW = SITE.filter((c) => c.at === 'preview');

export default register(SITE) as Command<S>[];
