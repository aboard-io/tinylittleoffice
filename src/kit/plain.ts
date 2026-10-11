/**
 * A document from words alone, without the codec: what an agent or a person writes by hand, and what a
 * file holds. Pure: the shell, the API (src/api.ts) and the tests read them through here.
 *
 * Plain-parameter links: "/<app>/#title=…&doc=…&by=…" (or "#app=sheet&doc=…", or "#md=…"): the document
 * as its TLO text, URL-encoded, after "#" so no server sees it. `doc` and `md` are the same thing (TLO is
 * Markdown; nothing is read leniently, the kernel parses it as written); `md` alone, with no app named,
 * is a text for the Word Processor. The app is the `app` parameter, else the head's `app:`, else the page's
 * own (the path), else the Word Processor. The shell turns one into the packed "#/v1/<app>/<payload>" on
 * arrival (replaceState), so the person goes on with the ordinary link.
 *
 * A .tlo file is the document's text with `app: <id>` in its head, so it opens as its own app: the head's
 * `app` is taken out again on opening (the link never carries it).
 */
import { splitHead, takeHead, withHead, writeHead } from '../doc/index.ts';
import { parseHash } from './route.ts';

/** What a plain link or a file holds: the app it opens in, and the document's text. */
export interface Plain {
  app: string;
  text: string;
  /** A view asked for (`view=pdf`, `view=show`), '' for the editor. */
  view: string;
  /** The name it is to have, '' for none: given to the app's own retitle (an app may keep its name in its words). */
  title: string;
}

const APP = /^[a-z][a-z0-9-]*$/;

/** The text as kept: Windows and old Mac line ends made "\n", no byte order mark, one "\n" at the end (none when empty). */
const tidy = (s: string) => {
  const t = s.replace(/\r\n?/g, '\n').replace(/^﻿/, '').replace(/\s+$/, '');
  return t ? t + '\n' : '';
};

/** The app a text names in its head ("app: sheet"), and the text without it. */
export function appInHead(text: string): [string, string] {
  const [took, rest] = takeHead(text, ['app']);
  const app = (took.app ?? '').trim().toLowerCase();
  return APP.test(app) ? [app, rest] : ['', took.app !== undefined ? rest : text];
}

/**
 * A plain-parameter fragment ("#title=…&doc=…"), read; null when the fragment is not one (a packed link,
 * the home page). `pageApp` is the app whose page this is ("/sheet/"), `known` says which ids are apps.
 */
export function readPlain(hash: string, pageApp: string, known: (id: string) => boolean): Plain | null {
  const h = hash.replace(/^#/, '');
  if (!h || h.startsWith('/')) return null;
  const q = new URLSearchParams(h);
  const body = q.get('doc') ?? q.get('md');
  if (body === null) return null;
  const [named, text] = appInHead(tidy(body));
  const asked = (q.get('app') ?? '').toLowerCase();
  const app = [asked, named, pageApp].find((id) => id && known(id)) ?? 'write';
  const one = (k: string) => q.get(k)?.replace(/\s+/g, ' ').trim() ?? '';
  const by = one('by');
  const view = one('view').replace(/[^A-Za-z0-9.]/g, '');
  return { app, text: by ? withHead(text, { by }) : text, view, title: one('title') };
}

/** URL-encoding as a form does it: a space is "+", and the characters a fragment would misread are escaped. */
const enc = (s: string) =>
  encodeURIComponent(s)
    .replace(/%20/g, '+')
    .replace(/[!'()*]/g, (c) => '%' + c.charCodeAt(0).toString(16).toUpperCase());

/** A plain-parameter link for a document: what the skill teaches an agent to write. */
export function plainLink(site: string, app: string, text: string, opts: { title?: string; by?: string; view?: string } = {}): string {
  const parts = [
    ...(opts.title ? [`title=${enc(opts.title)}`] : []),
    ...(opts.by ? [`by=${enc(opts.by)}`] : []),
    ...(opts.view ? [`view=${enc(opts.view)}`] : []),
    `doc=${enc(text.replace(/\n+$/, ''))}`,
  ];
  return `${site.replace(/\/?$/, '/')}${app}/#${parts.join('&')}`;
}

/** A document as a .tlo file: its text with the app that opens it in the head. */
export const tloText = (app: string, text: string): string => withHead(text, { app });

/**
 * A document as Download everything writes it (kit/privacy.ts everything): with the title the library gives it
 * (an automatic name, its first words) first in a head that names none, so it comes back from the zip as it was
 * named (Paul, 2026-10-11). A text whose head has its title, or no title to give, is as it was.
 */
export function titledText(text: string, title: string): string {
  const [head, body] = splitHead(text);
  if (head.title || !title) return text;
  const { title: _, ...rest } = head;
  return writeHead({ title, ...rest }) + body;
}

/**
 * A file's words, as a document: a .tlo (or any text whose head names its app) opens in that app; any other
 * text (a .md, a .txt) opens in `fallback`, the app open now, else the Word Processor. Its title is the file's
 * name, for a document that names none. null for a file that is not words.
 */
export function readFile(name: string, text: string, fallback: string, known: (id: string) => boolean): Plain | null {
  if (text.includes('\u0000')) return null;
  const [named, rest] = appInHead(tidy(text));
  const app = named && known(named) ? named : known(fallback) ? fallback : 'write';
  return { app, text: rest, view: '', title: name.replace(/\.[A-Za-z0-9]+$/, '').trim() };
}

/** A document found in a zip: its app and text (or, locked, its link's payload and no text), and the name its file gives it. */
export interface InZip {
  app: string;
  text: string;
  title: string;
  /** A locked document's payload ("E…"), '' for one that is words. */
  payload: string;
}

/**
 * The documents in a zip's files (kit/zip.ts unzip), in the zip's order: what Download everything writes (a folder
 * by app; the folder names the app where the head does not, else `fallback`), or any zip of .tlo and .md files. A
 * .txt that is one link to a document (a locked one, as Download everything writes it) is that document; anything
 * else (a README, a picture, the dot files an archiver adds) is left alone. The name Download
 * everything gives a document with none ("untitled", "locked") is no name.
 */
export function readZip(files: Record<string, Uint8Array>, fallback: string, known: (id: string) => boolean): InZip[] {
  const found: InZip[] = [];
  for (const [path, bytes] of Object.entries(files)) {
    const parts = path.split('/');
    const name = parts.at(-1)!;
    if (!name || parts.some((p) => p.startsWith('.') || p === '__MACOSX')) continue;
    const dir = parts.at(-2) ?? '';
    const here = known(dir) ? dir : fallback;
    const words = new TextDecoder().decode(bytes);
    if (/\.txt$/i.test(name)) {
      // (The link is the last line: a line before it, "title: …", is for the person who opens the file.)
      const link = words.trim().split('\n').at(-1)!.trim();
      const { app, payload } = /^\S*#\/v\d+\/\S+$/.test(link) ? parseHash(link.slice(link.indexOf('#'))) : { app: null, payload: '' };
      if (app && known(app) && payload) found.push({ app, text: '', title: '', payload });
      continue;
    }
    if (!/\.(?:tlo|md|markdown)$/i.test(name)) continue;
    const doc = readFile(name, words, here, known);
    if (doc?.text) found.push({ app: doc.app, text: doc.text, title: /^(?:untitled|locked)(?:-\d+)?$/.test(doc.title) ? '' : doc.title, payload: '' });
  }
  return found;
}
