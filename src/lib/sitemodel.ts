/**
 * A website as TLO text (lib/tlo.ts): "# Name" and a line about it are the
 * home page; each further "# Title" starts another page (a "---" before it,
 * as a break, is welcome); "## Section" is a part of a page;
 * "- Point | detail" a card; "> Label | url" a button; a fenced document
 * another document on the page; "theme: amber serif dark" the look. A line
 * that is only a picture's address is a picture; a line that is only
 * ":icon-name:" a big icon.
 */
import { readLines, writeLines, kindsOf, type Kind } from './lines.ts';
import { refFence, parse as parseTlo, write as writeTlo, writeBlock, type Block } from './tlo.ts';
import { linkToRef, resolve } from '../kit/embed.ts';

export interface Button {
  icon: string;
  label: string;
  url: string;
}

export interface Card {
  icon: string;
  head: string;
  detail: string;
}

export interface Section {
  title: string;
  text: string[];
  points: Card[];
  buttons: Button[];
  pics: string[];
  icon: string;
  embeds: string[];
}

/** A page: an untitled first section (its words under the title), then its "## Section"s. */
export interface Page {
  title: string;
  sections: Section[];
}

export const COLORS = ['indigo', 'teal', 'rose', 'amber', 'ink'] as const;
export type Color = (typeof COLORS)[number];

export interface Theme {
  color: Color;
  serif: boolean;
  dark: boolean;
}

export interface Site {
  name: string;
  theme: Theme;
  /** The home page first. */
  pages: Page[];
}

/** The kinds of line a site is made of: what its form, and the page edited in place, are built from. */
export const FORM: Kind[] = [
  { name: 'Page', is: '# {Title}', head: true },
  { name: 'Theme', is: `theme: {Colour:choice=${COLORS.join(',')}}[ {Type:choice=sans,serif}][ {Mode:choice=light,dark}]`, once: true, key: 'theme' },
  { name: 'Section', is: '## {Section}', head: true },
  { name: 'Card', is: '- [:{Picture:icon}: ]{Heading}[ | {Detail}]' },
  { name: 'Button', is: '> [:{Picture:icon}: ]{Label} | {Link}' },
  { name: 'Document', is: '@@{Link}' },
  { name: 'Paragraph', is: '{Text:long}' },
];

const section = (title = ''): Section => ({ title, text: [], points: [], buttons: [], pics: [], icon: '', embeds: [] });
const page = (title = ''): Page => ({ title, sections: [section()] });

/** A line that is only a picture's address. */
export const isPicture = (s: string) => /^https?:\/\/\S+\.(png|jpe?g|gif|webp|svg|avif)(\?\S*)?$/i.test(s);
/** Where a button may go: out to the web, to mail, or to a page or section of the site. */
export const safeUrl = (url: string) => (/^(https?:|mailto:|tel:|#)/.test(url) ? url : '#');

/** "theme: amber serif dark": a colour, a type, a mode, any of them, in any order. */
export function parseTheme(words: string, into: Theme = { color: 'indigo', serif: false, dark: false }): Theme {
  for (const w of words.toLowerCase().split(/[\s,]+/)) {
    if ((COLORS as readonly string[]).includes(w)) into.color = w as Color;
    else if (w === 'serif' || w === 'sans') into.serif = w === 'serif';
    else if (w === 'dark' || w === 'light') into.dark = w === 'dark';
  }
  return into;
}
export const themeWords = (t: Theme) => [t.color, t.serif ? 'serif' : '', t.dark ? 'dark' : ''].filter(Boolean).join(' ');

export function parseSite(text: string): Site {
  const site: Site = { name: '', theme: { color: 'indigo', serif: false, dark: false }, pages: [page()] };
  const { kinds } = kindsOf(FORM);
  let named = false;
  for (const { kind, values: v } of readLines(text, FORM)) {
    const last = site.pages[site.pages.length - 1];
    const cur = last.sections[last.sections.length - 1];
    const line = v[0]?.trim() ?? '';
    switch (kinds[kind].name) {
      case 'Page':
        // The first is the site's name, over the home page.
        if (named) site.pages.push(page(line));
        else (site.name = line), (named = true);
        break;
      case 'Theme':
        parseTheme(v.join(' '), site.theme);
        break;
      case 'Section':
        last.sections.push(section(line));
        break;
      case 'Card':
        cur.points.push({ icon: v[0], head: v[1], detail: v[2] });
        break;
      case 'Button':
        cur.buttons.push({ icon: v[0], label: v[1], url: safeUrl(v[2]) });
        break;
      case 'Document':
        cur.embeds.push(v[0]);
        break;
      default:
        if (isPicture(line)) cur.pics.push(line);
        else if (/^:[a-z0-9-]+:$/.test(line)) cur.icon = line.slice(1, -1);
        else if (line) cur.text.push(line);
    }
  }
  return site;
}

/** The site's lines as words: the name, each page and section, each card, each embedded document by its name. */
export function siteOutline(text: string): string[] {
  const site = parseSite(text);
  return site.pages.flatMap((p, i) => [
    ...(i ? [p.title] : site.name ? [site.name] : []),
    ...p.sections.flatMap((s) => [...(s.title ? [s.title] : []), ...s.text, ...s.points.map((c) => c.head), ...s.embeds.map((e) => `↗  ${resolve(e).title}`)]),
  ]);
}

/* ---------- friendly input ---------- */

/**
 * Markdown as a person or a model writes a site, made canonical: a "---"
 * with no "# Title" after it gets one; deeper headings are sections; a link
 * alone on a line ("[Label](url)", "{.button}" or not) is a button; a
 * picture "![alt](url)" a picture; a whole TinyLittleOffice link on a line
 * the document it holds; a table an embedded sheet; "theme" in the header
 * the look.
 */
export function readSite(text: string): string {
  const doc = parseTlo(text);
  const out: Block[] = [];
  const line = (t: string) => out.push({ k: 'p', text: t });
  const embed = (url: string) => {
    const ref = linkToRef(url);
    if (!ref) return false;
    out.push(refFence(ref));
    return true;
  };
  if (doc.head.theme) line(`theme: ${themeWords(parseTheme(doc.head.theme))}`);
  let broke = false;
  for (const b of doc.blocks) {
    if (b.k === 'hr') {
      broke = true;
      continue;
    }
    if (broke && !(b.k === 'h' && b.level === 1)) out.push({ k: 'h', level: 1, text: `Page ${out.filter((o) => o.k === 'h' && o.level === 1).length + 1}` });
    broke = false;
    if (b.k === 'h') out.push({ k: 'h', level: Math.min(b.level, 2), text: b.text });
    else if (b.k === 'img') embed(b.url) || line(b.url);
    else if (b.k === 'table') out.push({ k: 'fence', lang: 'sheet', body: writeBlock(b) });
    else if (b.k === 'li') out.push({ k: 'li', depth: 0, text: b.text });
    else if (b.k === 'p')
      for (const l of b.text.split('\n').map((l) => l.trim())) {
        const link = /^\[((?::[a-z0-9-]+:\s*)?)([^\]]+)\]\(([^)\s]+)\)(?:\s*\{\.button\})?$/.exec(l);
        const theme = /^theme:\s*(.*)$/i.exec(l);
        if (link) out.push({ k: 'quote', text: `${link[1]}${link[2].trim()} | ${link[3]}` });
        else if (theme) line(`theme: ${themeWords(parseTheme(theme[1]))}`);
        else if (!embed(l)) line(l);
      }
    else out.push(b);
  }
  return writeLines(readLines(writeTlo({ head: {}, blocks: out }), FORM), FORM);
}

