/**
 * The Word Processor's commands (kit/commands.ts), its editor the context: the bar's own (the kinds of block, Icon,
 * the menus Insert ▾, Align, Look and Paper with their items), the keys it adds to the words' (Mod+Shift+L, E, R
 * and J align the block in hand, Docs' and Word's keys; Mod+Shift+Enter is a page break; both only while the words
 * have the focus, so Mod+Shift+R reloads the page from anywhere else), and the bar under a card in hand, in §6's
 * order with its keys (Enter, Alt+Up/Down, Mod+D, Mod+C/X/V, Delete; Escape or an arrow back to the words). The
 * marks, Link, Footnote, the lists and Indent are the words' own (kit/text-commands.ts), drawn in this bar with the
 * editor's <to-text> as their context.
 */
import { ArrowDown, ArrowUp, ClipboardPaste, Copy, CopyPlus, Palette, Pilcrow, Ruler, Scissors, SeparatorHorizontal, CornerDownLeft } from 'lucide';
import { apps } from '../../kit/apps.ts';
import { register, type Command, commandsOf } from '../../kit/commands.ts';
import { t } from '../../kit/i18n.ts';
import { UI } from '../../kit/icons.ts';
import { lookOf, LOOK_IDS, LOOKS } from './look.ts';
import { PAPERS, paperOf, type Paper } from './model.ts';
import type { ToWriteEditor } from './editor.ts';

type W = ToWriteEditor;
const cmd = commandsOf<W>('write');
type Alignment = 'left' | 'center' | 'right' | 'justify';

/** A key is the words' only while they have the focus (not a card's, not a field's); a button's always. */
const inWords = (w: W, e?: Event) => !(e instanceof KeyboardEvent) || w.wordsHave(e);
const kind = (w: W) => (w.text?.sel ? w.text.kind : null);
const heldCard = (w: W) => w.cardAt >= 0 && w.isCard(w.cardAt);

const block = (id: string, k: 'title' | 'h1' | 'h2' | 'p', label: string, icon: Command['icon']): Command<W> =>
  cmd(id, label, { icon, where: ['bar'], pressed: (w) => kind(w) === k, does: (w) => w.text.exec(k === 'p' || kind(w) !== k ? k : 'p') });
const align = (how: Alignment, label: string, icon: Command['icon'], key: string): Command<W> =>
  cmd(how, label, {
    at: 'words',
    icon,
    keys: `Mod+Shift+${key}`,
    where: ['menu:align'],
    pressed: (w) => (w.text?.sel ? w.text.alignment : 'left') === how,
    does: (w, e) => (inWords(w, e) ? w.text.exec(how) : false),
  });
const ALIGN_ICON = { left: UI.alignLeft, center: UI.alignCenter, right: UI.alignRight, justify: UI.alignJustify };

/** Insert ▾: what goes in at the caret. */
const INSERTS: Command<W>[] = [
  cmd('insert.table', 'Table', { icon: UI.table, where: ['menu:insert'], does: (w) => w.insertTable() }),
  cmd('insert.picture', 'Web Picture…', { icon: UI.image, where: ['menu:insert'], does: (w) => w.insertPicture() }),
  cmd('insert.web', 'Web Embed…', { icon: UI.globe, where: ['menu:insert'], does: (w) => w.insertWeb() }),
  cmd('insert.doc', 'Tiny Little Office Doc…', { icon: UI.insert, where: ['menu:insert'], does: (w) => w.insertDocument() }),
  cmd('insert.qr', 'QR code of this document', { icon: UI.qr, where: ['menu:insert'], does: (w) => w.insertQr() }),
  cmd('insert.date', 'Date', { icon: UI.calendar, where: ['menu:insert'], does: (w) => w.text.exec('date') }),
  cmd('insert.break', 'Page break', { at: 'words', icon: SeparatorHorizontal, keys: 'Mod+Shift+Enter', where: ['menu:insert'], does: (w, e) => (inWords(w, e) ? w.insertBlock({ k: 'hr' }) : false) }),
  ...apps()
    .filter((a) => a.id !== 'write')
    .map((a) => cmd(`insert.app.${a.id}`, () => a.name, { icon: a.icon, data: true, heading: 'A new document', where: ['menu:insert'], does: (w) => w.insertApp(a.id) })),
];

/** The bar under a card in hand (§6's order), and its keys. */
export const CARD: Command<W>[] = [
  cmd('card.edit', (w) => (w ? w.editLabel(w.cardAt) : t('Edit')), {
    at: 'card',
    icon: UI.pen,
    keys: 'Enter',
    where: ['context'],
    group: 'edit',
    when: (w) => heldCard(w) && !!w.editLabel(w.cardAt),
    does: (w) => w.editHeld(),
  }),
  cmd('card.open', 'Open in a new tab', { icon: UI.open, where: ['context'], group: 'edit', when: (w) => heldCard(w) && w.opensIn(w.cardAt), does: (w) => w.openHeld() }),
  cmd('card.up', 'Move up', {
    at: 'card',
    icon: ArrowUp,
    keys: 'Alt+ArrowUp',
    where: ['context'],
    group: 'edit',
    when: heldCard,
    disabled: (w) => w.cardAt === 0,
    does: (w) => w.moveCard(w.cardAt, -1),
  }),
  cmd('card.down', 'Move down', {
    at: 'card',
    icon: ArrowDown,
    keys: 'Alt+ArrowDown',
    where: ['context'],
    group: 'edit',
    when: heldCard,
    disabled: (w) => w.cardAt >= w.blockCount - 1,
    does: (w) => w.moveCard(w.cardAt, 1),
  }),
  cmd('card.duplicate', 'Duplicate', { at: 'card', icon: CopyPlus, keys: 'Mod+D', where: ['context'], group: 'edit', when: heldCard, does: (w) => w.duplicateCard(w.cardAt) }),
  cmd('card.copy', 'Copy', { at: 'card', icon: Copy, keys: 'Mod+C', native: true, where: ['context'], group: 'clip', when: heldCard, does: (w) => w.copyOut(w.cardAt, false) }),
  cmd('card.cut', 'Cut', { at: 'card', icon: Scissors, keys: 'Mod+X', native: true, where: ['context'], group: 'clip', when: heldCard, does: (w) => w.copyOut(w.cardAt, true) }),
  cmd('card.paste', 'Paste', { at: 'card', icon: ClipboardPaste, keys: 'Mod+V', native: true, where: ['context'], group: 'clip', when: heldCard, does: (w) => w.pasteIn(w.cardAt) }),
  cmd('card.delete', 'Delete', { at: 'card', icon: UI.trash, keys: 'Delete / Backspace', where: ['context'], group: 'delete', when: heldCard, does: (w) => w.removeCard(w.cardAt) }),
  cmd('card.back', 'Back to the words', { at: 'card', icon: CornerDownLeft, keys: 'Escape / ArrowDown / ArrowRight', where: ['keys-only'], when: heldCard, does: (w) => w.afterCard(w.cardAt, 1) }),
  cmd('card.before', 'Back to the words', { at: 'card', keys: 'ArrowUp / ArrowLeft', where: ['keys-only'], when: heldCard, does: (w) => w.afterCard(w.cardAt, -1) }),
];

/** Every command of the Word Processor, the bar's in its order. */
const WRITE: Command<W>[] = [
  cmd('insert', 'Insert', { icon: UI.insert, menu: 'insert', where: ['bar'], takesFocus: true, does: () => undefined }),
  ...INSERTS,
  block('title', 'title', 'Title', UI.text),
  block('heading', 'h1', 'Heading', UI.heading1),
  block('subheading', 'h2', 'Subheading', UI.heading),
  block('paragraph', 'p', 'Paragraph', Pilcrow),
  cmd('icon', 'Icon', { icon: UI.icon, where: ['bar'], does: (w) => w.insertIcon() }),
  cmd('align', 'Align', { icon: UI.alignLeft, menu: 'align', where: ['bar'], does: () => undefined }),
  align('left', 'Align left', UI.alignLeft, 'L'),
  align('center', 'Centre', UI.alignCenter, 'E'),
  align('right', 'Align right', UI.alignRight, 'R'),
  align('justify', 'Justify', UI.alignJustify, 'J'),
  cmd('look', (w) => t('Look: {theme}', { theme: (w ? lookOf(w.doc) : LOOKS.sans).name() }), { icon: Palette, menu: 'look', where: ['bar'], document: true, does: () => undefined }),
  ...LOOK_IDS.map((id) => cmd(`look.${id}`, LOOKS[id].name, { data: true, hint: () => LOOKS[id].sample(), where: ['menu:look'], pressed: (w) => lookOf(w.doc).id === id, does: (w) => w.setLook(id) })),
  cmd('paper', (w) => t('Paper: {paper}', { paper: PAPERS[w ? paperOf(w.doc) : 'letter'].name }), { icon: Ruler, menu: 'paper', where: ['bar'], document: true, does: () => undefined }),
  ...(Object.keys(PAPERS) as Paper[]).map((p) => cmd(`paper.${p}`, p === 'a4' ? 'A4' : 'Letter', { where: ['menu:paper'], pressed: (w) => paperOf(w.doc) === p, does: (w) => w.setPaper(p) })),
  ...CARD,
];

/** The icon the Align menu shows: the alignment the block in hand has. */
export const alignIcon = (w: W) => ALIGN_ICON[w.text?.sel ? w.text.alignment : 'left'];

export default register(WRITE) as Command<W>[];
