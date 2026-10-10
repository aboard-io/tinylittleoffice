/**
 * Tiny Little Office for programs and agents: served by the site at /api.js (an entry of the build of its
 * own) and used by the command line (packages/doc). A document is a link; this makes links and reads them,
 * over the same codec, routes and kernel the site uses. Nothing here touches the DOM: it runs in a page, in
 * Node 24, Deno or Bun as it is.
 *
 *   import { link, read } from 'https://tinylittleoffice.com/api.js';
 *   const url = link('sheet', 'Item | Cost:money\n--- | ---\nRent | 1200\n', { title: 'Budget' });
 *   read(url).text;   // the document's TLO text, its title in the head
 *
 * The apps' definitions (their names and templates) are a lazy import: `apps()` and `templates()` are
 * asynchronous so that the rest stays small.
 */
import { parse as parseText, write as writeDoc, withHead, type Doc } from './doc/index.ts';
import { decodeDoc, encodeDoc, URL_LIMIT } from './kit/codec.ts';
import { parseHash, routeHash } from './kit/route.ts';
import { appInHead, plainLink, readPlain, tloText } from './kit/plain.ts';
import { diff, tally, type Change } from './kit/diff.ts';
import { origin } from './kit/network.ts';

export type { Change, Doc };
export { diff, URL_LIMIT };

/** Where links point by default. Any copy of the site works: the document is in the link, not on the server. */
export const SITE = `${origin('site')}/`;

/** A document's text as a link's payload (the shortest of the codec's three forms). */
export const encode = (text: string): string => encodeDoc(text);
/** A payload's text; '' for one that cannot be read. */
export const decode = (payload: string): string => decodeDoc(payload);
/** TLO text as the kernel's document: a head of fields and a list of blocks (docs/kernel.md). */
export const parse = (text: string): Doc => parseText(text);
/** The kernel's document as canonical TLO text. */
export const write = (doc: Doc): string => writeDoc(doc);

export interface LinkOptions {
  /** The document's name (into its head). */
  title?: string;
  /** Who made it: a person, or an agent's name; a claim, shown as such. */
  by?: string;
  /** A view: a file to download on arrival ('pdf', 'docx', 'csv', …), or 'embed'. */
  view?: string;
  /** Open as pages to read (the Display Link), not in the editor. */
  display?: boolean;
  /** A deck's show link: open presenting. */
  show?: boolean;
  /** The site the link opens on; this one by default. */
  site?: string;
}

const APP = /^[a-z][a-z0-9-]*$/;

/** The packed link for a document in an app: "<site><app>/#/v1/<app>/<payload>". */
export function link(app: string, text: string, opts: LinkOptions = {}): string {
  if (!APP.test(app)) throw new Error(`Not an app id: "${app}"`);
  const head: Record<string, string> = {};
  if (opts.title) head.title = opts.title.replace(/\s+/g, ' ').trim();
  if (opts.by) head.by = opts.by.replace(/\s+/g, ' ').trim();
  const doc = Object.keys(head).length ? withHead(text, head) : text;
  const site = (opts.site ?? SITE).replace(/\/?$/, '/');
  return `${site}${app}/${routeHash(app, encodeDoc(doc), opts.view ?? '', null, !!opts.display)}${opts.show ? (opts.display ? '&show' : '?show') : ''}`;
}

/** The plain-parameter link for a document ("<site><app>/#title=…&doc=…"): longer, but readable and writable by hand. */
export const plain = (app: string, text: string, opts: Pick<LinkOptions, 'title' | 'by' | 'view' | 'site'> = {}): string => plainLink(opts.site ?? SITE, app, text, opts);

export interface Read {
  app: string;
  /** '' for the editor; a file's extension, or 'embed'. */
  view: string;
  /** The document's TLO text. */
  text: string;
  /** The head's title, '' when it names none (an app may also take its name from its words). */
  title: string;
  /** The head's by, '' when it names no one. */
  by: string;
  display: boolean;
}

/** Read a link (packed or plain, or only its fragment): the app, the view, and the document. Throws when it is not one. */
export function read(url: string): Read {
  const at = url.indexOf('#');
  const hash = at < 0 ? '#' + url : url.slice(at);
  const route = parseHash(hash);
  let app = route.app ?? '';
  let text = '';
  let view = route.view;
  if (route.app) {
    text = decodeDoc(route.payload);
    if (route.payload && !text) throw new Error('The link holds something that cannot be read (cut short when it was copied?)');
  } else {
    const page = /\/([a-z][a-z0-9-]*)\/(?:index\.html)?#/.exec(url)?.[1] ?? '';
    const p = readPlain(hash, page, (id) => APP.test(id));
    if (!p) throw new Error('Not a Tiny Little Office link');
    ({ app, view } = p);
    text = p.title ? withHead(p.text, { title: p.title }) : p.text;
  }
  const head = parseText(text).head;
  return { app, view, text, title: head.title ?? '', by: head.by ?? '', display: route.display };
}

/** A document as a .tlo file's text (its app in its head); and a .tlo file's text as the app and the document. */
export const tlo = (app: string, text: string): string => tloText(app, text);
export function fromTlo(file: string): { app: string; text: string } {
  const [app, text] = appInHead(file.replace(/\r\n?/g, '\n'));
  return { app, text };
}

/** What the second link changed, block by block, and whether they are the same document. */
export function compare(a: string, b: string): { same: boolean; removed: number; added: number; changes: Change[] } {
  const [ra, rb] = [read(a), read(b)];
  const changes = diff(ra.text, rb.text);
  return { same: ra.app === rb.app && changes.every((c) => c.kind === ' '), ...tally(changes), changes };
}

export type { Finding, Measure } from './lint.ts';

/**
 * What the eye would have seen in a document, said in words, so nothing need be opened to check it: a diagram's
 * connection that names no thing, a comma splitting a number into two things, a label too long for its box or
 * lying over another, a slide's bullets under a chart (not drawn), a headline shrunk or cut, a link too long to
 * paste. Each finding has its app, where it is ("slide 3"), its block, its kind, its words and what to do; a
 * document fenced inside another is linted too. [] is a clean document. The measures are the layouts' own.
 */
export async function lint(app: string, text: string, opts: LinkOptions = {}): Promise<import('./lint.ts').Finding[]> {
  return (await import('./lint.ts')).lint(app, text, link(app, text, opts));
}

/** The numbers the layouts chose, so words can be set from them: per slide the headline's and the words' sizes, lines and what was cut; per diagram its things and connections, drawn and dropped, and how each label was set. */
export async function measure(app: string, text: string, opts: LinkOptions = {}): Promise<import('./lint.ts').Measure> {
  return (await import('./lint.ts')).measure(app, text, link(app, text, opts));
}

/** Every app: its id, name, what one document is called, its group and a line on what it is for. */
export async function apps(): Promise<{ id: string; name: string; noun: string; group: string; blurb: string }[]> {
  const { apps: all } = await import('./kit/apps.ts');
  return all().map((a) => ({ id: a.id, name: a.name, noun: a.noun, group: a.group, blurb: a.blurb }));
}

/** The templates an app starts from: an id, a name, a line, and the document. */
export async function templates(app: string): Promise<{ id: string; name: string; blurb: string; text: string }[]> {
  const { appOf } = await import('./kit/apps.ts');
  const def = appOf(app);
  if (!def) throw new Error(`No app "${app}"`);
  return def.templates.map((t) => ({ id: t.id, name: t.name, blurb: t.blurb, text: t.doc }));
}

/** The files an app makes from a document without a browser (its own formats that need no drawing), by extension. */
export async function formats(app: string): Promise<string[]> {
  const { appOf } = await import('./kit/apps.ts');
  return ['md', 'tlo', ...(appOf(app)?.exports ?? []).map((x) => x.ext).filter((x) => x !== 'md')];
}

/**
 * A document as a file of one of its app's formats: 'md' and 'tlo' for every app, and the app's own where they
 * need no browser to draw them (a sheet's csv and xlsx, a calendar's ics, a text's docx…). Throws for a
 * format the app does not have, or one that needs a browser.
 */
export async function file(app: string, text: string, ext: string, ctx: { title?: string; link?: string } = {}): Promise<Uint8Array | string> {
  const [{ appOf }, { formatOf }] = await Promise.all([import('./kit/apps.ts'), import('./kit/exports.ts')]);
  const def = appOf(app);
  if (!def) throw new Error(`No app "${app}"`);
  // The site's own formats (kit/exports.ts formatsOf), those it can build here.
  const format = (await formats(app)).includes(ext) ? formatOf(def, ext) : undefined;
  if (format) return format.build(text, { def, title: ctx.title ?? def.title(text), link: ctx.link ?? link(app, text) });
  throw new Error(`${def.name} makes no .${ext} without a browser: ${(await formats(app)).join(', ')}`);
}
