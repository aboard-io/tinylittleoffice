/**
 * The API for programs (and agents): TinyLittleOffice without a browser.
 * A document is a link; this makes links, reads them, turns documents to
 * and from Markdown or CSV, evaluates a sheet or a stock-and-flow model,
 * and signs and verifies. Nothing here touches the DOM; it runs in Node
 * as it runs in the page. Published as @tinylittleoffice/doc.
 */
import { altOf } from './lib/drawmodel.ts';
import './apps/index.ts';
import { LINK, appOf, apps as registry, type AppDef } from './kit/core.ts';
import { decodeEnvelope, encodeEnvelope, packEnvelope, quantizeCreated, signingMessage, unpackEnvelope, type Envelope } from './lib/envelope.ts';
import { fromMarkdown, toMarkdown, parseCsv, looksLikeCsv, readPlainLink } from './lib/markdown.ts';
import { evaluateGrid, formatCell, parseGrid, typesOf } from './lib/formula.ts';
import { parseFlow, runFlow } from './apps/flow.def.ts';
import { createSigner, fingerprintOf, verify, type KeyStore, type Signer } from './lib/sign.ts';
import { newLocker, seal, unseal, isSealed } from './lib/crypt.ts';
import { URL_LIMIT } from './lib/codec.ts';
import { specOf } from './lib/diagram.ts';
import { templatesOf, type Template } from './lib/templates.ts';
import { LIBRARY, allIcons } from './lib/icons.ts';
import { searchIcons } from './lib/iconsearch.ts';
export { searchIcons };
import { diff } from './lib/diff.ts';
export { diff };

export type { AppDef, Envelope, KeyStore, Signer, Template };
export { toMarkdown, fromMarkdown, parseCsv, looksLikeCsv, signingMessage, quantizeCreated, fingerprintOf, verify, createSigner, isSealed, URL_LIMIT };

/** Where the links point. Any copy of the site works: the document is in the link, not on the server. */
export const SITE = 'https://tinylittleoffice.com/';

/** Every app: its id, name, group and a line on what it is for. */
export function apps(): { id: string; name: string; group: string; blurb: string }[] {
  return registry().filter((d) => !d.hidden).map((d) => ({ id: d.id, name: d.name, group: d.group ?? '', blurb: d.blurb ?? '' }));
}

/** The templates an app can start from (Write, Sheet and Deck have them): a name, a line, and the body in the app's format. */
export function templates(app: string): Template[] {
  if (!appOf(app)) throw new Error(`No app "${app}"`);
  return templatesOf(app).map((t) => ({ ...t }));
}

/** Example bodies for the apps that have no form spec; the rest carry their own. */
const EXAMPLES: Record<string, string> = {
  sheet: 'Item | Cost:money\n--- | ---\nRent | 1200\nFood | 600\nTotal | =SUM(B1:B2)',
  outline: '- Launch\n  - Product\n    - Pricing\n    - Onboarding\n  - Marketing\n    - Press\n  - Support',
  write: '# Memo\n\nSome **bold** and *slant* text with ==shine== and :star:\n\n- one\n  - nested\n1. first',
  deck: '## :rocket: Spring launch {.title}\n\n- What ships\n\n---\n\n## Agenda {.two}\n\n- one\n  - under one\n\n|\n\n- two',
  draw: 'Kind | X | Y | W | H | Style | Label\n--- | --- | --- | --- | --- | --- | ---\nr | 2 | 1 | 12 | 6 | 1b3 | Box\no | 20 | 2 | 10 | 6 | 0 | Ball',
  cal: '---\nzone: Europe/London\ngreen: Sam\n---\n- 2027-03-01: Launch\n- 2027-03-01 to 2027-03-03: Offsite {color=green}\n- 2027-03-10 09:00-10:30: Retro {every=week times=6}',
  todo: '- [ ] Book flights\n- [x] Renew passport {.star due=2027-03-01}\n- [ ] Pack',
  board: '## To do {limit=2}\n\n- Write the brief\n- Design the page\n\n## Doing\n\n- Build the form\n\n## Done\n\n- Choose a name',
  gantt: 'Task | Start:date | Days:number | Done:percent\n--- | --- | --- | ---\nDesign | 2027-03-01 | 10 | 50%\n- Wireframes | 2027-03-01 | 4 | 100%\n- Visual design | 2027-03-05 | 6 | 50%\nBuild | 2027-03-11 | 15 | 0%',
  trip: '---\nunits: km\n---\nPlace | Lat:number | Lon:number | Note\n--- | --- | --- | ---\nLisbon | 38.7223 | -9.1393 | Pastel de nata first\nCoimbra | 40.2033 | -8.4103 |\nPorto | 41.1579 | -8.6291 | Port cellars',
  anim: '---\nframes: 24\nfps: 8\n---\nKind | X | Y | W | H | Style | Label\n--- | --- | --- | --- | --- | --- | ---\nt | 4 | 20 | 20 | 4 | 04 | Lift off\ni | 8 | 36 | 8 | 8 | 0b | rocket\n\nShape | Keys\n--- | ---\n0 | 0,0,0,0,1,0; 23,0,-80,0,1,0,i\n1 | 0,0,0,0,1,0; 23,200,-200,80,1,-30,d',
  pixel: 'ab.c\n.dd',
  zine: '## :coffee: Small Joys\n\nIssue one\n\n---\n\n## Coffee\n\nThe first cup.',
  booklet: '## A book\n\nby me\n\n---\n\n## One\n\nwords',
  calc: '---\nmode: mortgage\n---\n- price = 400000\n- deposit = 80000\n- rate = 6.5\n- years = 30',
  poster: '## :music: Open mic night\n\nFriday 12 March, 8pm\n\nThe Anchor, 14 Quay Street\n\nFree. Bring a song.',
  badges: '## Ada Lovelace\n\nEngineering\n\nLondon\n\n---\n\n## Grace Hopper\n\nCompilers\n\nNew York',
  brochure: '## Visit\n\n---\n\n## Why\n\nbecause',
  comic: '## Biscuit\n\n---\n\n- :dog: Walk? | Monday',
  web: 'https://youtu.be/dQw4w9WgXcQ',
};

/** An app's example document, in its own format: the quickest way to see what a body looks like. */
export function example(app: string): string {
  if (!appOf(app)) throw new Error(`No app "${app}"`);
  return specOf(app)?.example ?? EXAMPLES[app] ?? '';
}

export interface MakeOptions {
  /** The document's name. */
  title?: string;
  /** Who made it: a person, or an agent's name. A claim until signed. */
  by?: string;
  /** When it was made, ms since the Unix epoch; now by default. */
  created?: number | null;
  /** 'show' presents a deck; 'embed' shows the document alone; 'pdf', 'png', 'html', 'md' download it. */
  view?: string;
  /** The site the link opens on. */
  site?: string;
}

/** The envelope for a document: when, who, what. */
export function envelope(body: string, opts: MakeOptions = {}): Envelope {
  const env: Envelope = { created: opts.created === undefined ? quantizeCreated(Date.now()) : opts.created, body };
  if (opts.title) env.title = opts.title;
  if (opts.by) env.by = opts.by;
  return env;
}

/** The link for a document in an app's own format. */
export function link(app: string, body: string, opts: MakeOptions = {}): string {
  const def = appOf(app);
  if (!def) throw new Error(`No app "${app}"`);
  const read = def.read ? def.read(body) : body;
  const payload = encodeEnvelope(envelope(read, opts));
  const site = (opts.site ?? SITE).replace(/\/?$/, '/');
  return `${site}${app}/${LINK}${app}${opts.view ? '.' + opts.view : ''}/${payload}`;
}

/** Text as the app's document: TLO (which is Markdown) or CSV, read the way the app reads it. */
export function read(app: string, text: string): string {
  const def = appOf(app);
  if (!def) throw new Error(`No app "${app}"`);
  return fromMarkdown(def, text);
}

/** The link for a document written as Markdown (or CSV), shaped the way the app reads it. */
export function linkFromMarkdown(app: string, markdown: string, opts: MakeOptions = {}): string {
  const def = appOf(app);
  if (!def) throw new Error(`No app "${app}"`);
  return link(app, fromMarkdown(def, markdown), opts);
}

export interface Parsed {
  app: string;
  /** '' for the editor; 'show', 'embed' or a file extension otherwise. */
  view: string;
  /** True when the link is sealed under a password: `open` needs it. */
  sealed: boolean;
  env: Envelope;
  /** The whole document as Markdown. */
  markdown: string;
}

const ROUTE = /#\/v\d+\/([a-z0-9-]+)(?:\.([A-Za-z0-9]+))?(?:\/(.*))?$/;

/** Read a link (or just its fragment): the app, the view, and the document. */
export function parse(url: string): Parsed {
  const hash = url.includes('#') ? url.slice(url.indexOf('#')) : '#' + url.replace(/^#/, '');
  const m = ROUTE.exec(hash);
  if (!m) {
    // A plain link: /<app>/#title=…&doc=… or &md=…
    const plain = readPlainLink(new URLSearchParams(hash.slice(1)), /\/([a-z0-9-]+)\/#/.exec(url)?.[1]);
    if (!plain) throw new Error('Not a TinyLittleOffice link');
    const { def, body, title, by, view } = plain;
    const env = envelope(body, { title, by, created: null });
    return { app: def.id, view, sealed: false, env, markdown: toMarkdown(body, title) };
  }
  const [, app, view = '', payload = ''] = m;
  const def = appOf(app);
  if (!def) throw new Error(`No app "${app}"`);
  if (isSealed(payload)) return { app, view, sealed: true, env: { created: null, body: '' }, markdown: '' };
  const env = decodeEnvelope(payload);
  return { app, view, sealed: false, env, markdown: toMarkdown(env.body, env.title) };
}

/** Open a sealed link with its password. */
export async function open(url: string, password: string): Promise<Parsed> {
  const m = ROUTE.exec(url.slice(url.indexOf('#')));
  if (!m) throw new Error('Not a TinyLittleOffice link');
  const r = await unseal(password, m[3] ?? '');
  if (!r) throw new Error('Wrong password');
  const env = unpackEnvelope(r.flag, r.bytes);
  return { app: m[1], view: m[2] ?? '', sealed: false, env, markdown: toMarkdown(env.body, env.title) };
}

/** The same document, sealed under a password: only someone with the password can read the link. */
export async function sealed(url: string, password: string): Promise<string> {
  const p = parse(url);
  const { flag, bytes } = packEnvelope(p.env);
  const payload = await seal(await newLocker(password), flag, bytes);
  return url.slice(0, url.indexOf('#')) + `${LINK}${p.app}${p.view ? '.' + p.view : ''}/${payload}`;
}

/** The link, signed with a key: the signature covers the app, time, body, title and author. */
export async function signed(url: string, signer: Signer): Promise<string> {
  const p = parse(url);
  const created = p.env.created ?? quantizeCreated(Date.now());
  const { key, sig } = await signer.sign(signingMessage(p.app, created, p.env.body, p.env.title, p.env.by));
  const payload = encodeEnvelope({ ...p.env, created, key, sig });
  return url.slice(0, url.indexOf('#')) + `${LINK}${p.app}${p.view ? '.' + p.view : ''}/${payload}`;
}

/** Whether a link's signature holds, and whose it is (a fingerprint), or null when unsigned. */
export async function verified(url: string): Promise<{ ok: boolean; by: string } | null> {
  const p = parse(url);
  const { key, sig } = p.env;
  if (!key || !sig) return null;
  const [ok, by] = await Promise.all([verify(key, sig, signingMessage(p.app, p.env.created, p.env.body, p.env.title, p.env.by)), fingerprintOf(key)]);
  return { ok, by };
}

/** A key store in memory: pass your own (a file, a secret manager) to keep a key. */
export function memoryStore(initial: string | null = null): KeyStore {
  let v = initial;
  return { get: () => v, set: (x) => void (v = x), remove: () => void (v = null) };
}

/** A sheet, computed: each cell's shown value, row by row. */
export function evaluateSheet(body: string): string[][] {
  const grid = parseGrid(body);
  const types = typesOf(body);
  const rows = evaluateGrid(grid, types).map((row) => row.map((v, c) => formatCell(v, types[c] ?? 't')));
  // Only as far as there is anything: the grid itself is padded.
  while (rows.length && rows[rows.length - 1].every((v) => !v)) rows.pop();
  const w = Math.max(1, ...rows.map((r) => r.reduce((n, v, i) => (v ? i + 1 : n), 0)));
  return rows.map((r) => r.slice(0, w));
}

/** A stock-and-flow model, run: every flow's value for the sliders as set (by id or name), with the model's own values where not. */
export function runModel(body: string, sliders: Record<string, number> = {}): { flows: { from: string; to: string; value: number }[]; sliders: { id: string; name: string; value: number; min: number; max: number; unit: string }[] } {
  const m = parseFlow(body);
  const values: Record<string, number> = {};
  for (const [k, v] of Object.entries(sliders)) values[m.sliders.find((s) => s.name.toLowerCase() === k.toLowerCase())?.id ?? k] = v;
  const out = runFlow(m, values);
  return { flows: m.flows.map((f, i) => ({ from: f.from, to: f.to, value: out[i] })), sliders: m.sliders };
}

export interface Warning {
  /** 'error' means the link will not do what was meant; 'warning' that it may look wrong; 'note' is advice. */
  level: 'error' | 'warning' | 'note';
  /** The line of the body, 1-based, where known. */
  line?: number;
  message: string;
}

/**
 * Check a document before sending its link: what a browser would not tell
 * a program. Unknown icons (drawn as nothing), a deck layout that does not
 * exist, a link too long for a QR code or some chat apps, an app that does
 * not exist. Icons are checked against the whole Lucide set.
 */
export async function lint(app: string, body: string, opts: MakeOptions = {}): Promise<Warning[]> {
  const out: Warning[] = [];
  const def = appOf(app);
  if (!def) return [{ level: 'error', message: `No app "${app}". apps() lists them.` }];
  await allIcons;
  const lines = body.split('\n');
  const bad = (name: string, i: number) => out.push({ level: 'warning', line: i + 1, message: `Icon "${name}" is not in the library (it will be left out). searchIcons('${name.split('-')[0]}') finds names.` });
  lines.forEach((l, i) => {
    // ":name" opening a line (a slide's or a shape's icon), and ":name:" among words.
    const lead = /^\s*(?:[^:|>]{1,24}:\s+)?:([a-z][a-z0-9-]*)(?=[\s:]|$)/.exec(l);
    if (lead && !LIBRARY[lead[1]]) bad(lead[1], i);
    for (const m of l.slice(lead ? lead[0].length : 0).matchAll(/:([a-z][a-z0-9-]*):/g)) if (!LIBRARY[m[1]]) bad(m[1], i);
  });
  if (app === 'deck') {
    lines.forEach((l, i) => {
      // (Both colons: ":rocket" alone is an icon line, not a layout.)
      const m = /^:([a-z0-9-]*):([a-z0-9]*)$/.exec(l.trim());
      if (m && m[2] && !['t', '2', 'i', 'b'].includes(m[2])) out.push({ level: 'warning', line: i + 1, message: `Layout ":${m[2]}" is not one of :t (title), :2 (two columns), :i (big icon); the slide is drawn as bullets.` });
    });
  }
  if ((app === 'draw' || app === 'anim') && body.trim() && !altOf(body))
    out.push({ level: 'note', message: `No alt text: a line "# <what it shows>" describes the ${app === 'draw' ? 'drawing' : 'animation'} for people who cannot see it. Without one, a description is made from the labels.` });
  const url = link(app, body, opts);
  if (url.length > 2953) out.push({ level: 'error', message: `The link is ${url.length} characters: too long for a QR code (2,953), and some apps truncate links. Split the document, or embed less.` });
  else if (url.length > URL_LIMIT) out.push({ level: 'warning', message: `The link is ${url.length} characters. Browsers open it; a QR code holds it up to 2,953; some chat apps cut links past about 2,000. Shorter is safer.` });
  if (!body.trim()) out.push({ level: 'note', message: 'The document is empty.' });
  return out;
}

/** Two links compared: the apps, the titles, and the lines the second changed. */
export function compare(a: string, b: string): { same: boolean; a: Parsed; b: Parsed; changes: ReturnType<typeof diff> } {
  const [pa, pb] = [parse(a), parse(b)];
  const changes = diff(pa.env.body, pb.env.body);
  return { same: pa.app === pb.app && changes.every((c) => c.kind === ' '), a: pa, b: pb, changes };
}
