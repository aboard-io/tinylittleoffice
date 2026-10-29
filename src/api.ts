/**
 * Tiny Little Office for programs and agents: served by the site at /api.js (an entry of the build of its
 * own) and used by the command line (packages/doc). A document is a link; this makes links and reads them,
 * over the same codec, routes and kernel the site uses. Nothing here touches the DOM: it runs in a page, in
 * Node 24, Deno or Bun as it is.
 *
 *   import { link, read } from 'https://tinylittleoffice.com/api.js';
 *   const url = link('sheet', 'Item | Cost:money\n--- | ---\nRent | 1200\n', { title: 'Budget' });
 *   read(url).text;   // the document's TLO text, its title in the head
 *   await text(url);  // what the document says, as Markdown (its text layer: src/doc/text.ts)
 *   const { url, password } = await link('write', 'Salaries…\n', { seal: true });  // under a password the app made
 *   toJson(read(url).text);  // the kernel's document as JSON (packages/doc/schema/tlo.schema.json); fromJson gives the text back
 *
 * The apps' definitions (their names and templates) are a lazy import: `apps()` and `templates()` are
 * asynchronous so that the rest stays small (budgets.json holds /api.js to its size). So are the examples:
 * `shapes(app)` lists what an app reads, `example(app, shape)` gives the smallest document that shows a shape
 * (cut from the app's templates by scripts/make-skill.ts into packages/doc/examples/<app>.json), and
 * `tryDraft(app, text)` checks a draft in one call. In Node, which imports no module from a URL, the npm package
 * `tinylittleoffice` is this module (packages/doc).
 */
import { parse as parseText, plainText, textMarkdown, textOf, write as writeDoc, withHead, type Doc } from './doc/index.ts';
import { docJson, jsonDoc } from './doc/json.ts';
import { decodeDoc, encodeDoc, packDoc, URL_LIMIT } from './kit/core/codec.ts';
import { newLocker, seal } from './kit/share/crypt.ts';
import { generatePassword } from './kit/share/passwords.ts';
import { isLang, parseHash, routeHash } from './kit/core/route.ts';
import { appInHead, plainLink, readPlain, tloText } from './kit/core/plain.ts';
import { diff, tally, type Change } from './kit/text/diff.ts';
import { origin } from './kit/core/network.ts';

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
/**
 * TLO text as the kernel's document in JSON: its keys in the order the types name them, two-space indent. The
 * contract is the JSON Schema at packages/doc/schema/tlo.schema.json, written from the kernel's types.
 */
export const toJson = (text: string): string => docJson(parseText(text));
/** A document in JSON as canonical TLO text; one that does not fit the schema throws, naming the path of the fault. */
export const fromJson = (json: string): string => writeDoc(jsonDoc(json));

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
  /** The language the link opens in, as src/i18n names it ('ht', 'pt-br'); the reader's browser's when absent. */
  lang?: string;
  /** The site the link opens on; this one by default. */
  site?: string;
  /** Refused: the app makes every password (Paul, 2026-10-11); ask for one with `seal: true`. */
  password?: never;
}

/** Under a password: the link holds only ciphertext, and the password, made here, is returned beside it. */
export interface SealOptions extends LinkOptions {
  seal: true;
}

/** What a sealed link is: the link, and the password that opens it (send it another way than the link). */
export interface Sealed {
  url: string;
  password: string;
}

/** Said when a password is handed in: nobody chooses one, so nobody chooses a weak one. */
export const PASSWORD_REFUSED = 'The app makes the password; ask for one with seal.';

const APP = /^[a-z][a-z0-9-]*$/;

/**
 * The packed link for a document in an app: "<site><app>/#/v1/<app>/<payload>". With `seal: true`, the document
 * sealed under a password the app makes (kit/share/passwords.ts, kit/share/crypt.ts), as the Password dialog does: the
 * link and the password, asynchronously (WebCrypto is). A `password` given is refused.
 */
export function link(app: string, text: string, opts: SealOptions): Promise<Sealed>;
export function link(app: string, text: string, opts?: LinkOptions): string;
export function link(app: string, text: string, opts: LinkOptions & { seal?: boolean } = {}): string | Promise<Sealed> {
  if ((opts as { password?: unknown }).password !== undefined) throw new Error(PASSWORD_REFUSED);
  if (!APP.test(app)) throw new Error(`Not an app id: "${app}"`);
  const head: Record<string, string> = {};
  if (opts.title) head.title = opts.title.replace(/\s+/g, ' ').trim();
  if (opts.by) head.by = opts.by.replace(/\s+/g, ' ').trim();
  const doc = Object.keys(head).length ? withHead(text, head) : text;
  if (opts.lang && !isLang(opts.lang)) throw new Error(`Not a language code: "${opts.lang}" (as src/i18n names them: ht, pt-br, zh-hant)`);
  const site = (opts.site ?? SITE).replace(/\/?$/, '/');
  const at = (payload: string) => {
    const hash = routeHash(app, payload, opts.view ?? '', !!opts.display, null, opts.lang || null);
    return `${site}${app}/${hash}${opts.show ? (hash.includes('?') ? '&show' : '?show') : ''}`;
  };
  if (!opts.seal) return at(encodeDoc(doc));
  return (async () => {
    const password = generatePassword();
    const { flag, bytes } = packDoc(doc);
    return { url: at(await seal(await newLocker(password), flag, bytes)), password };
  })();
}

/** The plain-parameter link for a document ("<site><app>/#title=…&doc=…"): longer, but readable and writable by hand. */
export const plain = (app: string, text: string, opts: Pick<LinkOptions, 'title' | 'by' | 'view' | 'site'> = {}): string => plainLink(opts.site ?? SITE, app, text, opts);

export interface Read {
  app: string;
  /** '' for the editor; a file's extension, or 'embed'. */
  view: string;
  /** The document's TLO text. */
  text: string;
  /** The same document as JSON (toJson). */
  json: string;
  /** The head's title, '' when it names none (an app may also take its name from its words). */
  title: string;
  /** The head's by, '' when it names no one. */
  by: string;
  display: boolean;
  /** The language the link opens in, when it names one. */
  lang?: string;
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
  const doc = parseText(text);
  const head = doc.head;
  return { app, view, text, json: docJson(doc), title: head.title ?? '', by: head.by ?? '', display: route.display, ...(route.lang ? { lang: route.lang } : {}) };
}

/**
 * A document in an app as what it says, in Markdown: its text layer (src/doc/text.ts; a spatial app's own, a
 * diagram's things and connections, a calendar's days), what a screen reader reads on its Display Link. Its title
 * first, unless its first heading says it already.
 */
export async function markdown(app: string, text: string): Promise<string> {
  const [{ appOf }, { textLayer }] = await Promise.all([import('./kit/core/apps.ts'), import('./kit/text/text-layer.ts')]);
  const def = appOf(app);
  const nodes = def ? textLayer(def, text) : textOf(parseText(text));
  const title = (def ? def.title(text) : (parseText(text).head.title ?? '')).trim();
  const first = nodes[0];
  const said = first?.k === 'h' && first.level === 1 && plainText(first.runs).trim() === title;
  return textMarkdown(title && !said ? [{ k: 'h', level: 1, runs: [{ t: title }] }, ...nodes] : nodes);
}
/** A link's document as what it says, in Markdown (markdown(app, text)). */
export async function text(url: string): Promise<string> {
  const r = read(url);
  return markdown(r.app, r.text);
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

/** The numbers the layouts chose, so words can be set from them: per slide the headline's and the words' sizes, lines and what was cut; per diagram its things and connections, drawn and dropped, and how each label was set; and whether the link fits in a short link (`short: { fits, over }`). */
export async function measure(app: string, text: string, opts: LinkOptions = {}): Promise<import('./lint.ts').Measure> {
  return (await import('./lint.ts')).measure(app, text, link(app, text, opts));
}

/** Every app: its id, name, what one document is called, its group and a line on what it is for. */
export async function apps(): Promise<{ id: string; name: string; noun: string; group: string; blurb: string }[]> {
  const { apps: all } = await import('./kit/core/apps.ts');
  return all().map((a) => ({ id: a.id, name: a.name, noun: a.noun, group: a.group, blurb: a.blurb }));
}

/** The templates an app starts from: an id, a name, a line, and the document. */
export async function templates(app: string): Promise<{ id: string; name: string; blurb: string; text: string }[]> {
  const { appOf } = await import('./kit/core/apps.ts');
  const def = appOf(app);
  if (!def) throw new Error(`No app "${app}"`);
  return (await def.templates()).map((t) => ({ id: t.id, name: t.name, blurb: t.blurb, text: t.doc }));
}

/** The files an app makes from a document without a browser (its own formats that need no drawing), by extension. */
export async function formats(app: string): Promise<string[]> {
  const { appOf } = await import('./kit/core/apps.ts');
  return ['md', 'tlo', 'json', ...(appOf(app)?.exports ?? []).map((x) => x.ext).filter((x) => x !== 'md')];
}

/**
 * A document as a file of one of its app's formats: 'md', 'tlo' and 'json' for every app, and the app's own where they
 * need no browser to draw them (a sheet's csv and xlsx, a calendar's ics, a text's docx…). Throws for a
 * format the app does not have, or one that needs a browser. `image`, a host's answer for where a picture it keeps
 * is (a data: URL, which a .docx or an RTF writes in), by its reference (doc/image.ts): a server has no page's host.
 */
export async function file(app: string, text: string, ext: string, ctx: { title?: string; link?: string; image?: (ref: string) => string | null } = {}): Promise<Uint8Array | string> {
  const [{ appOf }, { formatOf }] = await Promise.all([import('./kit/core/apps.ts'), import('./kit/file/exports.ts')]);
  const def = appOf(app);
  if (!def) throw new Error(`No app "${app}"`);
  // The site's own formats (kit/file/exports.ts formatsOf), those it can build here; one this place cannot make (a WebM,
  // which wants a browser's encoder) is asked to, and says where it is made.
  const format = (await formats(app)).includes(ext) ? (formatOf(def, ext) ?? def.exports?.find((x) => x.ext === ext)) : undefined;
  if (format) return format.build(text, { def, title: ctx.title ?? def.title(text), link: ctx.link ?? link(app, text), ...(ctx.image ? { image: ctx.image } : {}) });
  throw new Error(`${def.name} makes no .${ext} without a browser: ${(await formats(app)).join(', ')}`);
}

/** A shape an app reads (a heading, a money column, a Venn, a title slide): its id, what it is called and what it is for. */
export interface Shape {
  id: string;
  name: string;
  for: string;
}
/** A shape's example: the smallest document cut from the app's templates that shows it, its plain link and its JSON (the kernel's document), with what the lint and the measures say of it. */
export interface Example extends Shape {
  /** Where it was cut from: "template budget". */
  from: string;
  text: string;
  link: string;
  json: Doc;
  lint: import('./lint.ts').Finding[];
  measure: import('./lint.ts').Measure;
}
type Kept = Omit<Example, 'lint' | 'measure'>;

/** An app's examples as packages/doc/examples/<app>.json keeps them (written by scripts/make-skill.ts; the site serves them at /examples/<app>.json). */
async function kept(app: string): Promise<Kept[]> {
  if (!APP.test(app)) throw new Error(`Not an app id: "${app}"`);
  try {
    return ((await import(`../packages/doc/examples/${app}.json`, { with: { type: 'json' } })) as { default: { shapes: Kept[] } }).default.shapes;
  } catch {
    throw new Error(`No app "${app}"`);
  }
}

/** The shapes an app reads, a line each: what to ask `example` for. */
export async function shapes(app: string): Promise<Shape[]> {
  return (await kept(app)).map(({ id, name, for: f }) => ({ id, name, for: f }));
}

/** The smallest document that shows a shape, its JSON, and what the lint and the measures say of it; every shape of the app's without one. Throws for a shape the app does not read, naming those it does. */
export async function example(app: string, shape?: string): Promise<Example[]> {
  const all = await kept(app);
  const some = shape ? all.filter((x) => x.id === shape) : all;
  if (!some.length) throw new Error(`${app} has no shape "${shape}"; its shapes: ${all.map((x) => x.id).join(', ')}`);
  return Promise.all(some.map(async (x) => ({ ...x, lint: await lint(app, x.text), measure: await measure(app, x.text) })));
}

/** A draft in one call: what the lint finds, what the layouts measured, and the document as JSON (the kernel's). */
export async function tryDraft(app: string, text: string): Promise<{ lint: import('./lint.ts').Finding[]; measure: import('./lint.ts').Measure; json: Doc }> {
  return { lint: await lint(app, text), measure: await measure(app, text), json: parseText(text) };
}
