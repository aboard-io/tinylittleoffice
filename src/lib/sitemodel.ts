/**
 * A website as TLO text (lib/tlo.ts): "# Name" and a line about it are the
 * home page; each further "# Title" starts another page (a "---" before it,
 * as a break, is welcome); "## Section" is a part of a page;
 * "- Point | detail" a card; "> Label | url" a button; "![alt](url)" (or a
 * line that is only a picture's address) a picture; a table
 * "Name | Price | About | Image" the products of a shop, with a cart;
 * a fenced document another document on the page; "theme: forest dark"
 * the look; a line that is only ":icon-name:" a big icon. The header may
 * hold "currency: £" and "orders: you@example.com" for the shop.
 *
 * Quick Links (apps/links.def.ts) is the same model with one page, and
 * "- :icon: Label | url" a small link at the foot rather than a card.
 */
import { readLines, writeLines, kindsOf, type Kind } from './lines.ts';
import { refFence, parse as parseTlo, write as writeTlo, writeBlock, columnsOf, amountOf, type Block } from './tlo.ts';
import { linkToRef, resolve } from '../kit/embed.ts';
import { embedOf, webRef } from './embeds.ts';

export interface Button {
  icon: string;
  label: string;
  url: string;
  /** Its row in the text, for editing in place. */
  row: number;
}

export interface Card {
  icon: string;
  head: string;
  detail: string;
  row: number;
}

export interface Product {
  name: string;
  price: number;
  about: string;
  image: string;
}

export interface Section {
  title: string;
  text: string[];
  points: Card[];
  buttons: Button[];
  pics: string[];
  icon: string;
  embeds: string[];
  products: Product[];
  /** Small links at the foot (a Quick Links page's social accounts). */
  socials: Button[];
  /** Where it is in the text, for editing in place: its heading's row (-1 for the words under a page's title), its last row, its big icon's row (-1 for none), and for each picture the row and the field its address is in. */
  rows: { head: number; end: number; icon: number; pics: [number, number][] };
}

/** A page: an untitled first section (its words under the title), then its "## Section"s. */
export interface Page {
  title: string;
  /** Its heading's row in the text; -1 for the home page, which is the site's name. */
  row: number;
  sections: Section[];
}

/* ---------- themes ---------- */

export type Face = 'sans' | 'serif' | 'rounded' | 'mono';

/** A look: one accent, from which every shade is derived (themeCss); the type; how round the corners are. */
export interface SiteTheme {
  name: string;
  a: string;
  face: Face;
  /** Corner radius, in rem. */
  round: number;
  /** Light words on a dark page by nature; "light" asks for the other. */
  dark?: boolean;
}

export const THEMES: Record<string, SiteTheme> = {
  indigo: { name: 'Indigo', a: '#4f46e5', face: 'sans', round: 0.9 },
  teal: { name: 'Teal', a: '#0f766e', face: 'sans', round: 0.9 },
  rose: { name: 'Rose', a: '#be123c', face: 'serif', round: 1.2 },
  amber: { name: 'Amber', a: '#b45309', face: 'serif', round: 0.6 },
  ink: { name: 'Ink', a: '#18181b', face: 'sans', round: 0.3 },
  forest: { name: 'Forest', a: '#15803d', face: 'serif', round: 0.9 },
  ocean: { name: 'Ocean', a: '#0369a1', face: 'sans', round: 1.4 },
  sunset: { name: 'Sunset', a: '#c2410c', face: 'rounded', round: 1.6 },
  plum: { name: 'Plum', a: '#7e22ce', face: 'sans', round: 1.2 },
  candy: { name: 'Candy', a: '#db2777', face: 'rounded', round: 2 },
  olive: { name: 'Olive', a: '#4d7c0f', face: 'serif', round: 0.4 },
  slate: { name: 'Slate', a: '#334155', face: 'sans', round: 0.5 },
  paper: { name: 'Paper', a: '#78350f', face: 'serif', round: 0 },
  typewriter: { name: 'Typewriter', a: '#111827', face: 'mono', round: 0 },
  midnight: { name: 'Midnight', a: '#818cf8', face: 'sans', round: 0.9, dark: true },
  coal: { name: 'Coal', a: '#f59e0b', face: 'rounded', round: 1.2, dark: true },
};

export interface Theme {
  /** A key of THEMES. */
  id: string;
  /** The type, when asked for apart from the theme's own. */
  face?: Face;
  /** Dark or light, when asked for apart from the theme's own nature. */
  dark?: boolean;
}

const FACES: Record<Face, string> = {
  sans: 'ui-sans-serif,system-ui,-apple-system,"Segoe UI",Roboto,sans-serif',
  serif: "'Iowan Old Style','Palatino Linotype',Palatino,Georgia,serif",
  rounded: 'ui-rounded,"SF Pro Rounded","Nunito","Varela Round",system-ui,sans-serif',
  mono: 'ui-monospace,"SF Mono",Menlo,Consolas,monospace',
};

export const defaultTheme = (): Theme => ({ id: 'indigo' });
const FACE_WORDS: Record<string, Face> = { sans: 'sans', serif: 'serif', rounded: 'rounded', round: 'rounded', mono: 'mono' };

/** "theme: forest serif dark": a look, a type, a mode, any of them, in any order. */
export function parseTheme(words: string, into: Theme = defaultTheme()): Theme {
  for (const w of words.toLowerCase().split(/[\s,]+/)) {
    if (THEMES[w]) into.id = w;
    else if (FACE_WORDS[w]) into.face = FACE_WORDS[w];
    else if (w === 'dark' || w === 'light') into.dark = w === 'dark';
  }
  return into;
}
export const themeWords = (t: Theme) => {
  const T = THEMES[t.id] ?? THEMES.indigo;
  return [t.id, t.face && t.face !== T.face ? t.face : '', t.dark === true && !T.dark ? 'dark' : t.dark === false && T.dark ? 'light' : ''].filter(Boolean).join(' ');
};

/** Whether the page is dark: by the theme's nature, or asked for. */
export const isDark = (t: Theme) => t.dark ?? !!(THEMES[t.id] ?? THEMES.indigo).dark;

/** A shade of the accent: its lightness, exactly or as a bound (`at`), and the most chroma it keeps, if capped. */
export interface Shade {
  l: number;
  at?: 'min' | 'max';
  c?: number;
}
/**
 * Every shade is the accent's hue at a lightness fixed for its role, in
 * oklch, where one lightness reads the same in every hue. On a light page
 * the accent is held dark enough for white words on it, the tint is nearly
 * white and the deep shade (links, words on the tint) nearly black; on a
 * dark page the accent is lifted for dark words, the tint is a dark wash
 * and the deep shade pale. test/site.test.ts checks every pair at AA.
 */
export const SHADES: Record<'light' | 'dark', Record<'a' | 'tint' | 'deep', Shade>> = {
  light: { a: { l: 0.52, at: 'min' }, tint: { l: 0.96, c: 0.05 }, deep: { l: 0.4 } },
  dark: { a: { l: 0.75, at: 'max', c: 0.15 }, tint: { l: 0.28, c: 0.06 }, deep: { l: 0.85, c: 0.12 } },
};
/** The shade as CSS: the browser derives it from the accent (relative colour syntax). */
const shade = (a: string, s: Shade) => `oklch(from ${a} ${s.at === 'min' ? `min(l, ${s.l})` : s.at === 'max' ? `max(l, ${s.l})` : s.l} ${s.c === undefined ? 'c' : `min(c, ${s.c})`} h)`;

/** The theme as CSS variables on :root, and the face. */
export function themeCss(t: Theme): string {
  const T = THEMES[t.id] ?? THEMES.indigo;
  const S = SHADES[isDark(t) ? 'dark' : 'light'];
  const vars = isDark(t)
    ? `--a:${shade(T.a, S.a)};--on:#18181b;--tint:${shade(T.a, S.tint)};--deep:${shade(T.a, S.deep)};--bg:${T.dark ? '#141418' : '#18181b'};--glass:rgba(20,20,24,.92);--ink:#fafafa;--ink2:#d4d4d8;--ink3:#a1a1aa;--line:#3f3f46`
    : `--a:${shade(T.a, S.a)};--on:#fff;--tint:${shade(T.a, S.tint)};--deep:${shade(T.a, S.deep)};--bg:${t.id === 'paper' ? '#fffdf5' : '#fff'};--glass:rgba(255,255,255,.92);--ink:#18181b;--ink2:#3f3f46;--ink3:#52525b;--line:#e4e4e7`;
  return `:root{${vars};--r:${T.round}rem;--font:${FACES[t.face ?? T.face]}}body,h1,h2,h3,button,.btn{font-family:var(--font)}`;
}

/* ---------- the lines ---------- */

export interface Site {
  name: string;
  theme: Theme;
  /** The shop's: the currency's symbol, and where orders go (an email address, or '' to let the shopper copy their order). */
  currency: string;
  orders: string;
  /** The rows the shop's settings are on, -1 where not written, for editing in place. */
  rows: { currency: number; orders: number };
  /** The home page first. */
  pages: Page[];
}

/** The kinds of line a site is made of: what the page edited in place is built from. */
export const FORM: Kind[] = [
  { name: 'Page', is: '# {Title}', head: true },
  { name: 'Theme', is: `theme: {Look:choice=${Object.keys(THEMES).join(',')}}[ {Type:choice=sans,serif,rounded,mono}][ {Mode:choice=light,dark}]`, once: true, key: 'theme' },
  { name: 'Currency', is: 'currency: {Symbol}', once: true, key: 'currency' },
  { name: 'Orders go to', is: 'orders: {Email}', once: true, key: 'orders' },
  { name: 'Section', is: '## {Section}', head: true },
  { name: 'Card', is: '- [:{Picture:icon}: ]{Heading}[ | {Detail}]' },
  { name: 'Button', is: '> [:{Picture:icon}: ]{Label} | {Link}' },
  { name: 'Picture', is: '!\\[[{Alt}]\\]({Address})' },
  { name: 'Product', is: '{Name} | {Price:money}[ | {About}][ | {Image}]', table: true },
  { name: 'Document', is: '@@{Link}' },
  { name: 'Big icon', is: ':{Icon:icon}:' },
  { name: 'Paragraph', is: '{Text:long}' },
];
export const kindNamed = (form: Kind[], name: string) => form.findIndex((k) => k.name === name);

export const section = (title = '', head = -1): Section => ({ title, text: [], points: [], buttons: [], pics: [], icon: '', embeds: [], products: [], socials: [], rows: { head, end: head, icon: -1, pics: [] } });
const page = (title = '', row = -1): Page => ({ title, row, sections: [section()] });

/** A line that is only a picture's address. */
export const isPicture = (s: string) => /^https?:\/\/\S+\.(png|jpe?g|gif|webp|svg|avif)(\?\S*)?$/i.test(s);
/** Where a button may go: out to the web, to mail, or to a page or section of the site. */
export const safeUrl = (url: string) => (/^(https?:|mailto:|tel:|#)/.test(url) ? url : '#');
/**
 * The lines of a site (or of a Quick Links page, whose form is a part of
 * this one) read into pages and sections.
 */
export function parseSite(text: string, form: Kind[] = FORM): Site {
  const site: Site = { name: '', theme: defaultTheme(), currency: '$', orders: '', rows: { currency: -1, orders: -1 }, pages: [page()] };
  const { kinds } = kindsOf(form);
  let named = false;
  readLines(text, form).forEach(({ kind, values: v }, i) => {
    const last = site.pages[site.pages.length - 1];
    const cur = last.sections[last.sections.length - 1];
    const line = v[0]?.trim() ?? '';
    switch (kinds[kind].name) {
      case 'Page':
      case 'Name':
        // The first is the site's name, over the home page.
        if (named) site.pages.push(page(line, i));
        else (site.name = line), (named = true);
        break;
      case 'Theme':
        parseTheme(v.join(' '), site.theme);
        break;
      case 'Currency':
        site.currency = line || '$';
        site.rows.currency = i;
        break;
      case 'Orders go to':
        site.orders = line;
        site.rows.orders = i;
        break;
      case 'Section':
        last.sections.push(section(line, i));
        break;
      case 'Card':
        cur.points.push({ icon: v[0], head: v[1], detail: v[2], row: i });
        break;
      case 'Button':
        cur.buttons.push({ icon: v[0], label: v[1], url: safeUrl(v[2]), row: i });
        break;
      case 'Small link':
        cur.socials.push({ icon: v[0], label: v[1], url: safeUrl(v[2]), row: i });
        break;
      case 'Big icon':
        cur.icon = v[0];
        cur.rows.icon = i;
        break;
      case 'Picture':
        cur.pics.push(/^https?:\/\//.test(v[1]) ? v[1] : '');
        cur.rows.pics.push([i, 1]);
        break;
      case 'Product':
        if (v[0]) cur.products.push({ name: v[0], price: amountOf(v[1]) || 0, about: v[2] ?? '', image: /^https?:\/\//.test(v[3] ?? '') ? v[3] : '' });
        break;
      case 'Document':
        cur.embeds.push(v[0]);
        break;
      default:
        if (isPicture(line)) cur.pics.push(line), cur.rows.pics.push([i, 0]);
        // A line that is the address of a video, a post, a song or a place is that, as a card (lib/embeds.ts), with the documents.
        else if (embedOf(line)) cur.embeds.push(webRef(line));
        else if (/^:[a-z0-9-]+:$/.test(line)) (cur.icon = line.slice(1, -1)), (cur.rows.icon = i);
        else if (line) cur.text.push(line);
    }
    // The row is the last of the section it went to (a heading's own, for a heading).
    const now = site.pages[site.pages.length - 1].sections;
    now[now.length - 1].rows.end = i;
  });
  return site;
}

/** The site's lines as words: the name, each page and section, each card, each product, each embedded document by its name. */
export function siteOutline(text: string, form: Kind[] = FORM): string[] {
  const site = parseSite(text, form);
  return site.pages.flatMap((p, i) => [
    ...(i ? [p.title] : site.name ? [site.name] : []),
    ...p.sections.flatMap((s) => [...(s.title ? [s.title] : []), ...s.text, ...s.points.map((c) => c.head), ...s.products.map((x) => `${x.name}  ·  ${site.currency}${x.price.toFixed(2)}`), ...s.embeds.map((e) => `↗  ${resolve(e).title}`)]),
  ]);
}

/* ---------- friendly input ---------- */

/**
 * Markdown as a person or a model writes a site, made canonical: a "---"
 * with no "# Title" after it gets one; deeper headings are sections; a link
 * alone on a line ("[Label](url)", "{.button}" or not) is a button; a
 * picture "![alt](url)" a picture; a whole TinyLittleOffice link on a line
 * the document it holds; a table of things with prices (as a shop was once
 * written) the products of a shop, any other table an embedded sheet;
 * "theme", "currency" and "orders" in the header what they say.
 */
export function readSite(text: string, form: Kind[] = FORM): string {
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
  for (const key of ['currency', 'orders']) if (doc.head[key]) line(`${key}: ${doc.head[key]}`);
  let broke = false;
  for (const b of doc.blocks) {
    if (b.k === 'hr') {
      broke = true;
      continue;
    }
    if (broke && !(b.k === 'h' && b.level === 1)) out.push({ k: 'h', level: 1, text: `Page ${out.filter((o) => o.k === 'h' && o.level === 1).length + 1}` });
    broke = false;
    if (b.k === 'h') out.push({ k: 'h', level: Math.min(b.level, 2), text: b.text });
    else if (b.k === 'img') embed(b.url) || out.push(b);
    else if (b.k === 'table') {
      // Things with prices are products; the columns may be named otherwise ("Product", "Cost", "Description", "Picture") or come in another order.
      const at = columnsOf(b, /^(name|product|item|thing)$/, /^(price|cost)$/, /^(about|description|details?)$/, /^(image|picture|photo)$/);
      if (at[0] >= 0 && at[1] >= 0) out.push({ k: 'table', head: ['Name', 'Price:money', 'About', 'Image'], rows: b.rows.map((r) => at.map((i) => (i >= 0 ? (r[i] ?? '').trim() : ''))) });
      else out.push({ k: 'fence', lang: 'sheet', body: writeBlock(b) });
    } else if (b.k === 'li') out.push({ k: 'li', depth: 0, text: b.text });
    else if (b.k === 'p')
      for (const l of b.text.split('\n').map((l) => l.trim())) {
        const link = /^\[((?::[a-z0-9-]+:\s*)?)([^\]]+)\]\(([^)\s]+)\)(?:\s*\{\.button\})?$/.exec(l);
        const setting = /^(theme|currency|orders):\s*(.*)$/i.exec(l);
        if (link) out.push({ k: 'quote', text: `${link[1]}${link[2].trim()} | ${link[3]}` });
        else if (setting) line(`${setting[1].toLowerCase()}: ${setting[1].toLowerCase() === 'theme' ? themeWords(parseTheme(setting[2])) : setting[2]}`);
        else if (!embed(l)) line(l);
      }
    else out.push(b);
  }
  return writeLines(readLines(writeTlo({ head: {}, blocks: out }), form), form);
}
