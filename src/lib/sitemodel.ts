/**
 * A website as a few lines of text: "# Name" and a line about it, then
 * "=== Title" for each further page, "## Section" within a page,
 * "- Point | detail" cards, "> Label | url" buttons, "@@app/payload" for
 * another document on the page, "theme: amber serif dark" for the look.
 * A line that is only a picture's address is a picture; a line that is
 * only ":icon-name" is a big icon. The home page is whatever comes before
 * the first "===".
 */
import { linkToRef, resolve } from '../kit/embed.ts';
import { iconOf } from './drawmodel.ts';

export interface Button {
  icon: string;
  label: string;
  url: string;
}

export interface Section {
  title: string;
  text: string[];
  points: string[];
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

const section = (title = ''): Section => ({ title, text: [], points: [], buttons: [], pics: [], icon: '', embeds: [] });
const page = (title = ''): Page => ({ title, sections: [section()] });

/** A line that is only a picture's address. */
export const isPicture = (s: string) => /^https?:\/\/\S+\.(png|jpe?g|gif|webp|svg|avif)(\?\S*)?$/i.test(s);
/** Where a button may go: out to the web, to mail, or to a page or section of the site. */
const safeUrl = (url: string) => (/^(https?:|mailto:|tel:|#)/.test(url) ? url : '#');

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
  for (const raw of text.split('\n')) {
    const line = raw.trim();
    if (!line) continue;
    const last = site.pages[site.pages.length - 1];
    const cur = last.sections[last.sections.length - 1];
    const np = /^===+\s*(.*?)\s*=*$/.exec(line);
    if (line.startsWith('# ') && !site.name) site.name = line.slice(2).trim();
    else if (np) site.pages.push(page(np[1]));
    else if (line.startsWith('## ')) last.sections.push(section(line.slice(3).trim()));
    else if (/^theme:/i.test(line)) parseTheme(line.slice(6), site.theme);
    else if (/^[-*] /.test(line)) cur.points.push(line.slice(2).trim());
    else if (line.startsWith('> ')) {
      const [label, url] = line.slice(2).split('|').map((p) => p.trim());
      const [icon, words] = iconOf(label);
      cur.buttons.push({ icon, label: words, url: safeUrl(url ?? '') });
    } else if (line.startsWith('@@')) cur.embeds.push(line.slice(2).trim());
    else if (isPicture(line)) cur.pics.push(line);
    else if (/^:[a-z0-9-]+$/.test(line)) cur.icon = line.slice(1);
    else cur.text.push(line);
  }
  return site;
}

/* ---------- friendly input ---------- */

/**
 * Text written by hand, made into the format: a whole TinyLittleOffice link on a
 * line becomes "@@app/payload", a Markdown link "[Label](url)" on a line of
 * its own a button, a Markdown picture "![alt](url)" a picture. Lines
 * already in the format pass through.
 */
export function readSite(text: string): string {
  return text
    .split('\n')
    .map((raw) => {
      const line = raw.trim();
      const ref = linkToRef(line);
      if (ref) return '@@' + ref;
      const pic = /^!\[[^\]]*\]\(([^)\s]+)\)$/.exec(line);
      if (pic) return pic[1];
      const link = /^\[([^\]]+)\]\(([^)\s]+)\)$/.exec(line);
      if (link) return `> ${link[1]} | ${link[2]}`;
      return raw;
    })
    .join('\n');
}

/* ---------- Markdown ---------- */

/** The site as Markdown: "# Name", the home page, then each page as "# Title" with its "## Section"s. */
export function siteToMd(text: string): string {
  const site = parseSite(text);
  const out: string[] = [];
  const part = (s: Section) => {
    if (s.title) out.push(`## ${s.title}`, '');
    if (s.icon) out.push(`:${s.icon}:`, '');
    for (const p of s.pics) out.push(`![](${p})`, '');
    for (const t of s.text) out.push(t, '');
    if (s.points.length) out.push(...s.points.map((p) => `- ${(([icon, words]) => (icon ? `:${icon}: ${words}` : words))(iconOf(p))}`), '');
    for (const e of s.embeds) out.push(`[${resolve(e).title}](${resolve(e).hash})`, '');
    if (s.buttons.length) out.push(...s.buttons.map((b) => `[${b.icon ? `:${b.icon}: ` : ''}${b.label}](${b.url})`), '');
  };
  site.pages.forEach((p, i) => {
    out.push(`# ${i ? p.title || `Page ${i + 1}` : site.name || 'My site'}`, '');
    if (!i && (site.theme.color !== 'indigo' || site.theme.serif || site.theme.dark)) out.push(`**Theme:** ${themeWords(site.theme)}`, '');
    p.sections.forEach(part);
  });
  return out.join('\n').replace(/\n{3,}/g, '\n\n').trim() + '\n';
}

/** Markdown as a site: the first "#" is the name, each further "#" a page, "##" a section; lists are cards, links on a line of their own buttons. */
export function mdToSite(md: string): string {
  const out: string[] = [];
  let named = false;
  for (const raw of md.split('\n')) {
    const line = raw.trim();
    if (!line || /^(-{3,}|\*{3,})$/.test(line)) continue;
    const h = /^(#{1,6})\s+(.*)$/.exec(line);
    const li = /^[-*+]\s+(.*)$/.exec(line) ?? /^\d+[.)]\s+(.*)$/.exec(line);
    const theme = /^\*\*theme:\*\*\s*(.*)$/i.exec(line);
    if (h && h[1].length === 1 && !named) (out.push(`# ${h[2]}`), (named = true));
    else if (h && h[1].length === 1) out.push(`=== ${h[2]}`);
    else if (h) out.push(`## ${h[2]}`);
    else if (theme) out.push(`theme: ${themeWords(parseTheme(theme[1]))}`);
    else if (li) out.push(`- ${li[1].replace(/^:([a-z0-9-]+):\s*/, ':$1 ')}`);
    else out.push(readSite(line).replace(/^> :([a-z0-9-]+):\s*/, '> :$1 '));
  }
  return out.join('\n');
}
