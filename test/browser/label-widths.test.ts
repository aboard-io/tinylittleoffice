// Each command's words, in each language, measured against the room its slot gives them: the source of the length rule
// (src/i18n/en.ts's header points here). The registry says where a command is drawn (kit/commands.ts `where`); the
// stylesheet says how wide that place is; the box's own fonts say how wide the words are, measured with the font the
// slot's words are drawn in (the canvas's measureText, given the slot's computed font), with the family of the
// language's script first where it is not Latin or Cyrillic (test/browser/fonts.ts: the Noto of each script, which the
// box must have).
//
// The slots, and the room each gives:
// - a bar button that shows its words (bar.ts cmdBtn, a menu with words, a <to-menu> labelled with a command):
//   the English words' width and a third more (the bar is one row that scrolls sideways; a label a third longer keeps
//   the row about as long as the English one, and the stylesheet sets the bar no max label width of its own);
// - a menu row (menu.ts): the menu's widest (kit.css .to-menu, min(22.5em, 100vw - 1em)) less its padding, the row's,
//   the icon and the keys, at a phone's 390px; the stylesheet lets a row's words wrap, so the room is as many lines
//   as the English takes (one, nearly always: a translation may not wrap where the English does not);
// - a dialog's button (the Share dialog's, drawn in English at 390px and read from the page): the English words' width,
//   and what room the dialog leaves it, raised from the English width alone (the starting rule) since no language
//   here met it: the button's own room past its words (a button as wide as the dialog has plenty), and its share of
//   the room its line has to grow into (a row of buttons shares it; a field beside it gives way to 8em, no further).
// A bar button that is an icon (cmdTool) and a context bar's are not measured: their words are a tooltip and a name
// for a screen reader, never drawn in the bar. The drawer's rows are laid out at 390px by test/browser/languages.test.ts.
//
// A label too wide fails, naming the language, the key, the command and slot, the measured and the allowed widths. A
// translator shortens it where a shorter word with the meaning exists; where none does, RAISED below says so with the
// reason, for that slot and key.
import { test, expect, beforeAll, afterAll } from 'vitest';
import { page } from 'vitest/browser';
import { html, render } from 'lit';
import { mount, openShare, tick, until } from './helpers.ts';
import { encodeDoc } from '../../src/kit/codec.ts';
import type { ToDialog } from '../../src/kit/dialog.ts';
import '../../src/kit/bar.ts';
import { icon, UI } from '../../src/kit/icons.ts';
import { keysText, registered, type Command } from '../../src/kit/commands.ts';
import type { Strings } from '../../src/kit/i18n.ts';
import '../../src/kit/keys.ts';
import '../../src/kit/text-commands.ts';
import '../../src/kit/rows-commands.ts';
import en from '../../src/i18n/en.ts';
import { FAMILIES, fontIn, installed } from './fonts.ts';

import.meta.glob('../../src/apps/*/commands.ts', { eager: true });
const sources = import.meta.glob<string>(['../../src/apps/*/*.ts', '!../../src/apps/*/commands.ts'], { query: '?raw', import: 'default', eager: true });
const files = import.meta.glob<{ default: Strings }>(['../../src/i18n/*.ts', '!../../src/i18n/en.ts']);
const codeOf = (path: string) => path.replace(/^.*\/([^/]+)\.ts$/, '$1');

/**
 * The bar commands drawn with their words, read from the apps' code: cmdBtn(own('x')), cmdMenu(own('x'), …, { words:
 * true }), and a <to-menu> labelled labelOf(own('x')) that is not icon-only. Every other bar command is cmdTool's icon.
 */
function worded(): Set<string> {
  const out = new Set<string>();
  for (const [path, text] of Object.entries(sources)) {
    const app = path.replace(/^.*\/apps\/([^/]+)\/.*$/, '$1');
    const id = (m: RegExpMatchArray) => (m[1] ? `${app}.${m[1]}` : m[2]);
    const ref = String.raw`(?:own\('([\w.-]+)'\)|COMMANDS\.find\(\(c\) => c\.id === '([\w.-]+)'\)!)`;
    // A call may be laid out over several lines (npm run format): its arguments run to the parenthesis that closes it.
    const call = (from: number) => {
      let depth = 0;
      for (let i = from; i < text.length; i++) {
        if (text[i] === '(') depth++;
        else if (text[i] === ')' && --depth === 0) return text.slice(from, i);
      }
      return text.slice(from);
    };
    for (const m of text.matchAll(new RegExp(String.raw`cmdBtn\(\s*${ref}`, 'g'))) out.add(id(m));
    for (const m of text.matchAll(new RegExp(String.raw`cmdMenu\(\s*${ref}`, 'g'))) if (/words: true/.test(call(m.index!))) out.add(id(m));
    for (const m of text.matchAll(new RegExp(String.raw`<to-menu(?![^>]*icon-only)[^>]*\.label=\$\{labelOf\(${ref}`, 'g'))) out.add(id(m));
  }
  return out;
}

/** Labels too long for their slot in languages that have no shorter words with the meaning: the key, the slot, the languages, why. */
const RAISED: { key: string; slot: Slot; langs: string[]; why: string }[] = [
  // The menus' rows: a second line where the words cannot be fewer.
  ...['Tiny Little Office Doc…', 'Tiny Little Office Doc'].map((key) => ({
    key,
    slot: 'menu' as const,
    langs: ['de', 'es', 'fr', 'it', 'ja', 'nl', 'pt-br'],
    why: 'the name said in the language’s own words (Paul, 2026-10-10) and the word for a document: no shorter words keep both',
  })),
  { key: 'Page break', slot: 'menu', langs: ['de', 'es', 'it', 'pt-br'], why: 'the word processors’ own term in each language; the row’s keys (Ctrl+Enter) take a third of it' },
  { key: 'Align right', slot: 'menu', langs: ['nl'], why: 'Rechts uitlijnen is what a Dutch office suite says; the row’s keys take a third of it' },
  { key: 'Two-column slide', slot: 'menu', langs: ['es', 'fr'], why: 'diapositiva, diapositive: the glossary’s word for a slide, the longest of the deck’s; a few pixels over' },
  { key: 'Big icon slide', slot: 'menu', langs: ['es', 'it'], why: 'diapositiva: the glossary’s word for a slide, the longest of the deck’s; a few pixels over' },
  { key: 'Quick links: one column', slot: 'menu', langs: ['es'], why: 'enlaces rápidos is the glossary’s name for Quick Links' },
  ...['Draw as a mind map', 'Draw as an org chart', 'Draw as a family tree'].map((key) => ({
    key,
    slot: 'menu' as const,
    langs: key.includes('family') ? ['es', 'fr', 'it', 'pt-br'] : ['it', 'pt-br'],
    why: 'the verb and the diagram’s name, both needed: the outline’s view menu offers the outline itself beside these',
  })),
  // The bar's buttons with words: the one-third rule is cruel to a word of four or five letters.
  { key: 'Edit', slot: 'bar', langs: ['de', 'es', 'fr', 'it', 'nl', 'pt-br'], why: 'a third more than "Edit" is five letters; no word for editing is that short in these languages' },
  { key: 'Preview', slot: 'bar', langs: ['es', 'it'], why: 'Vista previa, Anteprima: the word, and Anteprima a pixel over' },
  { key: 'Chart', slot: 'bar', langs: ['de', 'fr'], why: 'Diagramm, Graphique: the glossary’s word for a chart' },
  { key: 'Time zone', slot: 'bar', langs: ['fr'], why: 'fuseau horaire is the only term' },
  // The Share dialog.
  { key: 'Copy embed code', slot: 'dialog', langs: ['pt-br'], why: 'incorporação is the glossary’s embed; no shorter phrase keeps it; a few pixels over' },
  { key: 'Mind map', slot: 'bar', langs: ['fr', 'it', 'ja'], why: 'carte mentale, mappa mentale, マインドマップ: the diagram’s name in each' },
];

type Slot = 'bar' | 'menu' | 'dialog';
interface Measure {
  cmd: string;
  key: string;
  slot: Slot;
  /** The font the slot's words are drawn in. */
  font: string;
  /** The room, in px: a menu row's line (as many lines as the English takes), or the English width times this (bar: 4/3). */
  room: { line: number } | { times: number } | { px: number };
}

const ctx = document.createElement('canvas').getContext('2d')!;
/** Words as drawn: placeholders filled alike in every language, a plural in its last form. */
const fill = (s: string) => s.replace(/\{(\w+)\|([^}]*)\}/g, (_, _n, f: string) => f.split('|').pop()!.replace(/#/g, '2')).replace(/\{\w+\}/g, 'Ab');
function width(text: string, font: string): number {
  ctx.font = font;
  return ctx.measureText(fill(text)).width;
}
const round = (n: number) => Math.round(n * 10) / 10;

/** A command's words as a key of en.ts: its label, or what a function of the context says with nothing in hand. */
function keyOf(cmd: Command): string | undefined {
  const words = typeof cmd.label === 'string' ? cmd.label : cmd.label(undefined);
  return typeof words === 'string' && words in en ? words : undefined;
}

/** The room a slot gives this key's words in any language. */
function allowedFor(m: Measure): number {
  const english = width(m.key, m.font);
  if ('px' in m.room) return m.room.px;
  return 'times' in m.room ? english * m.room.times : m.room.line * Math.max(1, Math.ceil(english / m.room.line));
}

let measures: Measure[] = [];
let wordedIds = new Set<string>();

/** Lays out a slot as the kit draws it, and reads its font and room. */
function slots(cmds: Command[]): Measure[] {
  const out: Measure[] = [];
  const host = document.createElement('div');
  document.body.append(host);
  // A bar button with its words (bar.ts btn).
  render(html`<to-bar><button type="button" class="to-btn"><span>x</span></button></to-bar>`, host);
  const barFont = getComputedStyle(host.querySelector('to-bar .to-btn > span')!).font;
  for (const cmd of cmds) {
    const key = keyOf(cmd);
    if (!key) continue;
    if (cmd.where.includes('bar') && wordedIds.has(cmd.id)) out.push({ cmd: cmd.id, key, slot: 'bar', font: barFont, room: { times: 4 / 3 } });
    if (cmd.where.some((w) => w.startsWith('menu:'))) {
      // A menu row (menu.ts): at the menu's widest, its icon (or swatch), the words, its keys and the check of a state.
      render(
        html`<div class="to-menu" style="width: 100vw; position: static"><button type="button" class="to-menu-item">${cmd.icon || cmd.swatch ? icon(UI.check, 18) : ''}<span class="to-menu-words"><span></span></span>${cmd.keys ? html`<kbd class="to-menu-keys">${keysText(cmd.keys)}</kbd>` : ''}${cmd.pressed ? icon(UI.check, 16, 'to-menu-check') : ''}</button></div>`,
        host,
      );
      const words = host.querySelector<HTMLElement>('.to-menu-words')!;
      out.push({ cmd: cmd.id, key, slot: 'menu', font: getComputedStyle(words.firstElementChild!).font, room: { line: words.getBoundingClientRect().width } });
    }
  }
  host.remove();
  return out;
}

/** The room in a box past what it holds: its content box less its children (side by side, or the widest of a column), less the gaps. */
function slack(box: HTMLElement): number {
  const floor = (el: Element) => el.getBoundingClientRect().width;
  const css = getComputedStyle(box);
  const inner = box.clientWidth - parseFloat(css.paddingLeft) - parseFloat(css.paddingRight);
  const kids = [...box.children].filter((k) => k.getClientRects().length && getComputedStyle(k).position !== 'absolute');
  if (!kids.length) return 0;
  const gap = parseFloat(css.columnGap) || 0;
  const used = css.flexDirection.startsWith('column') || css.display === 'block' ? Math.max(...kids.map(floor)) : kids.reduce((n, k) => n + floor(k), 0) + gap * (kids.length - 1);
  return Math.max(0, inner - used);
}

/** The Share dialog's buttons with words, drawn in English at 390px: each a key, its font, and its room (see the header). */
async function dialogButtons(): Promise<Measure[]> {
  const shell = await mount(`#/v1/write/${encodeDoc('Hello\n')}`);
  await until(() => !!shell.querySelector('to-write-editor'));
  await openShare(shell);
  const share = shell.querySelector<ToDialog>('to-dialog.to-share-dialog')!;
  await until(() => share.dialog.open && !!share.querySelector('.to-share-links'));
  await tick(100);
  const out: Measure[] = [];
  for (const b of share.querySelectorAll<HTMLElement>('.to-btn')) {
    const holder = b.querySelector('span') ?? b;
    const key = holder.textContent!.replace(/\s+/g, ' ').trim();
    if (!b.getClientRects().length || !(key in en)) continue;
    const font = getComputedStyle(holder).font;
    // The run of things on the button's line: its row, where that is a flex row that does not wrap; else itself. The
    // run may grow to the width of what holds it, its buttons sharing that, and a field in it gives way to 8em.
    const parent = b.parentElement!;
    const pcss = getComputedStyle(parent);
    const run = pcss.display.endsWith('flex') && !pcss.flexDirection.startsWith('column') && pcss.flexWrap === 'nowrap' ? parent : b;
    const holderBox = run.parentElement!;
    const hcss = getComputedStyle(holderBox);
    const room = holderBox.clientWidth - parseFloat(hcss.paddingLeft) - parseFloat(hcss.paddingRight) - run.getBoundingClientRect().width;
    const fields = run === b ? [] : [...run.querySelectorAll<HTMLElement>(':scope > input, :scope > textarea')];
    const giving = fields.reduce((n, f) => n + Math.max(0, f.getBoundingClientRect().width - 8 * parseFloat(getComputedStyle(f).fontSize)), 0);
    const sharing = run === b ? 1 : [...run.children].filter((k) => k.classList.contains('to-btn') && k.getClientRects().length).length;
    const own = slack(b) + (holder !== b ? slack(holder as HTMLElement) : 0);
    out.push({ cmd: 'Share dialog', key, slot: 'dialog', font, room: { px: width(key, font) + own + (Math.max(0, room) + giving) / sharing } });
  }
  share.close();
  document.body.innerHTML = '';
  return out;
}

beforeAll(async () => {
  await page.viewport(390, 844);
  wordedIds = worded();
  measures = [...slots(registered()), ...(await dialogButtons())];
});
afterAll(() => page.viewport(1100, 800));

test('the slots are found: the bar commands that show their words, the menus’ rows, each with a font and a room', () => {
  // The scan of the apps' code finds the bar buttons with words; these are some it must find.
  for (const id of ['site.preview', 'site.edit', 'outline.connect', 'draw.mode', 'draw.background', 'diagram.kind', 'sheet.chart', 'anim.draw', 'anim.move', 'anim.fx', 'cal.zone'])
    expect(wordedIds, id).toContain(id);
  const bar = measures.filter((m) => m.slot === 'bar');
  const menu = measures.filter((m) => m.slot === 'menu');
  expect(bar.length).toBeGreaterThanOrEqual(8);
  expect(menu.length).toBeGreaterThan(50);
  for (const m of menu) {
    // At 390px a menu is at most 374px, and its padding, an icon and keys leave the words less.
    const line = (m.room as { line: number }).line;
    expect(line, m.cmd).toBeGreaterThan(100);
    expect(line, m.cmd).toBeLessThan(374);
  }
  expect(bar[0].font).toMatch(/px/);
  expect(measures.filter((m) => m.slot === 'dialog').map((m) => m.key)).toEqual(expect.arrayContaining(['Copy link']));
  // A row's words are its name alone, the instructions on its hint line (Paul, 2026-10-10): the pen's take one line,
  // and a row whose English did take two would give every language two.
  const pen = menu.find((m) => m.cmd === 'draw.insert.pen')!;
  const line = (pen.room as { line: number }).line;
  expect(allowedFor(pen)).toBe(line);
  const long = allowedFor({ ...pen, key: Array(12).fill(pen.key).join(' ') });
  expect(long).toBeGreaterThan(line);
  expect(long % line).toBe(0);
});

test('the box has the type of every script it measures, so a width is a width and not a row of fallback boxes', () => {
  const missing = FAMILIES.filter(([family, sample]) => !installed(family, sample)).map(([family]) => family);
  expect(missing, 'install fonts-noto-core, fonts-noto-cjk and fonts-noto-extra').toEqual([]);
  expect(fontIn('bn', '600 13.6px system-ui, sans-serif')).toBe("600 13.6px 'Noto Sans Bengali', system-ui, sans-serif");
  expect(fontIn('ru', '600 13.6px system-ui, sans-serif')).toBe('600 13.6px system-ui, sans-serif');
});

for (const path of Object.keys(files)) {
  const lang = codeOf(path);
  test(`${lang}: every command's words fit their slot`, async () => {
    const strings = (await files[path]()).default;
    const over: string[] = [];
    const raised = new Set<string>();
    for (const m of measures) {
      const words = strings[m.key];
      if (!words) continue;
      const allowed = allowedFor(m);
      const measured = width(words, fontIn(lang, m.font));
      if (measured <= allowed + 0.5) continue;
      if (RAISED.some((r) => r.langs.includes(lang) && r.key === m.key && r.slot === m.slot)) {
        raised.add(`${m.slot}|${m.key}`);
        continue;
      }
      over.push(`"${m.key}" → "${words}" (${m.cmd}, ${m.slot}): ${round(measured)}px, allowed ${round(allowed)}px`);
    }
    expect([...new Set(over)], `${lang}: shorten these, or raise the rule for the slot with the reason in RAISED`).toEqual([]);
    const stale = RAISED.filter((r) => r.langs.includes(lang) && !raised.has(`${r.slot}|${r.key}`)).map((r) => `${r.key} (${r.slot})`);
    expect(stale, `${lang}: raised and fitting now; take them out of RAISED`).toEqual([]);
  });
}
