/**
 * The API for programs (and agents): TinyLittleOffice without a browser.
 * A document is a link; this makes links, reads them, turns documents to
 * and from Markdown or CSV, evaluates a sheet or a stock-and-flow model,
 * and signs and verifies. Nothing here touches the DOM; it runs in Node
 * as it runs in the page. Published as @tinylittleoffice/doc.
 */
import './apps/index.ts';
import { appOf, apps as registry, type AppDef } from './kit/core.ts';
import { decodeEnvelope, encodeEnvelope, quantizeCreated, signingMessage, type Envelope } from './lib/envelope.ts';
import { fromMarkdown, toMarkdown, parseCsv, looksLikeCsv } from './lib/markdown.ts';
import { evaluateGrid, formatCell, parseGrid, typesOf } from './lib/formula.ts';
import { parseFlow, runFlow } from './apps/flow.def.ts';
import { createSigner, fingerprintOf, verify, type KeyStore, type Signer } from './lib/sign.ts';
import { newLocker, seal, unseal, isSealed } from './lib/crypt.ts';
import { URL_LIMIT } from './lib/codec.ts';
import { specOf } from './lib/diagram.ts';
import { diff } from './lib/diff.ts';
export { diff };

export type { AppDef, Envelope, KeyStore, Signer };
export { toMarkdown, fromMarkdown, parseCsv, looksLikeCsv, signingMessage, quantizeCreated, fingerprintOf, verify, createSigner, isSealed, URL_LIMIT };

/** Where the links point. Any copy of the site works: the document is in the link, not on the server. */
export const SITE = 'https://tinylittleoffice.com/';

/** Every app: its id, name, group and a line on what it is for. */
export function apps(): { id: string; name: string; group: string; blurb: string }[] {
  return registry().map((d) => ({ id: d.id, name: d.name, group: d.group ?? '', blurb: d.blurb ?? '' }));
}

/** Example bodies for the apps that have no form spec; the rest carry their own. */
const EXAMPLES: Record<string, string> = {
  sheet: 'Item\tCost\nRent\t1200\nFood\t600\nTotal\t=SUM(B2:B3)',
  write: '# Memo\nSome *bold* and _slant_ text with =shine= and :star:\n- one\n-- nested\n+ first',
  deck: ':rocket:t\nSpring launch\nWhat ships\n\n::2\nAgenda\none\n  under one\n|\ntwo',
  draw: 'r,2,1,12,6,1b3,Box\no,20,2,10,6,0,Ball',
  cal: 'd2,2.g,Offsite\ndb,1,Launch',
  todo: '- Book flights\nx!@1jk Renew passport\n- Pack',
  board: '#To do|2\nx\ny\n#Done\nz',
  gantt: '1jk,5,1e,Design\n>1jk,2,2s,Sketch',
  trip: '3xa8g,-fuyo,Lisbon\tnote here\n3zkdp,-ep8q,Coimbra',
  anim: '9\nirocket\t0,a,14,a;8,1y,a,p\ntLift off\t4,14,p,a',
  pixel: 'ab.c\n.dd',
  zine: ':coffee\nSmall Joys\nIssue one\n\nCoffee\nThe first cup.',
  booklet: 'A book\nby me\n\nOne\nwords',
  brochure: 'Visit\n\nWhy\nbecause',
  comic: 'Biscuit\n\n \n:dog Walk? | Monday',
  qr: 'https://tinylittleoffice.com/',
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
  const payload = encodeEnvelope(envelope(read, opts), app);
  const site = (opts.site ?? SITE).replace(/\/?$/, '/');
  return `${site}${app}/#/v2/${app}${opts.view ? '.' + opts.view : ''}/${payload}`;
}

/** Text as a body in the app's format: Markdown or CSV is shaped the way the app reads it; anything else is read as the app reads plain text. */
export function read(app: string, text: string): string {
  const def = appOf(app);
  if (!def) throw new Error(`No app "${app}"`);
  // Only what is unmistakably Markdown (a heading, a table, a checkbox, bold) or CSV is shaped; a plain list may be the app's own format.
  const md = /^(#{1,6}\s|\||\s*[-*+]\s\[[ xX]\]|.*\*\*)/m.test(text) || looksLikeCsv(text);
  return md ? fromMarkdown(def, text) : def.read ? def.read(text) : text;
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

const ROUTE = /#\/(?:v(\d+)\/)?([a-z0-9-]+)(?:\.([A-Za-z0-9]+))?(?:\/(.*))?$/;

/** Read a link (or just its fragment): the app, the view, and the document. */
export function parse(url: string): Parsed {
  const hash = url.includes('#') ? url.slice(url.indexOf('#')) : '#' + url.replace(/^#/, '');
  const m = ROUTE.exec(hash);
  if (!m) {
    // A plain link: /<app>/#title=…&doc=… or &md=…
    const q = new URLSearchParams(hash.slice(1));
    const app = q.get('app') ?? /\/([a-z0-9-]+)\/#/.exec(url)?.[1] ?? '';
    const def = appOf(app);
    if (!def) throw new Error('Not a TinyLittleOffice link');
    const body = q.has('md') ? fromMarkdown(def, q.get('md') ?? '') : def.read ? def.read(q.get('doc') ?? '') : (q.get('doc') ?? '');
    const env = envelope(body, { title: q.get('title') ?? undefined, by: q.get('by') ?? undefined, created: null });
    return { app, view: q.get('view') ?? '', sealed: false, env, markdown: toMarkdown(def, body, env.title) };
  }
  const app = m[2];
  const def = appOf(app);
  if (!def) throw new Error(`No app "${app}"`);
  const payload = m[4] ?? '';
  if (isSealed(payload)) return { app, view: m[3] ?? '', sealed: true, env: { created: null, body: '' }, markdown: '' };
  const env = decodeEnvelope(payload, app);
  return { app, view: m[3] ?? '', sealed: false, env, markdown: toMarkdown(def, env.body, env.title) };
}

/** Open a sealed link with its password. */
export async function open(url: string, password: string): Promise<Parsed> {
  const m = ROUTE.exec(url.slice(url.indexOf('#')));
  if (!m) throw new Error('Not a TinyLittleOffice link');
  const r = await unseal(password, m[4] ?? '');
  if (!r) throw new Error('Wrong password');
  const { unpackEnvelope } = await import('./lib/envelope.ts');
  const env = unpackEnvelope(r.flag, r.bytes, m[2]);
  return { app: m[2], view: m[3] ?? '', sealed: false, env, markdown: toMarkdown(appOf(m[2])!, env.body, env.title) };
}

/** The same document, sealed under a password: only someone with the password can read the link. */
export async function sealed(url: string, password: string): Promise<string> {
  const p = parse(url);
  const { packEnvelope } = await import('./lib/envelope.ts');
  const { flag, bytes } = packEnvelope(p.env, p.app);
  const payload = await seal(await newLocker(password), flag, bytes);
  return url.slice(0, url.indexOf('#')) + `#/v2/${p.app}${p.view ? '.' + p.view : ''}/${payload}`;
}

/** The link, signed with a key: the signature covers the app, time, body, title and author. */
export async function signed(url: string, signer: Signer): Promise<string> {
  const p = parse(url);
  const created = p.env.created ?? quantizeCreated(Date.now());
  const { key, sig } = await signer.sign(signingMessage(p.app, created, p.env.body, p.env.title, p.env.by));
  const payload = encodeEnvelope({ ...p.env, created, key, sig }, p.app);
  return url.slice(0, url.indexOf('#')) + `#/v2/${p.app}${p.view ? '.' + p.view : ''}/${payload}`;
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

/** Two links compared: the apps, the titles, and the lines the second changed. */
export function compare(a: string, b: string): { same: boolean; a: Parsed; b: Parsed; changes: ReturnType<typeof diff> } {
  const [pa, pb] = [parse(a), parse(b)];
  const changes = diff(pa.env.body, pb.env.body).filter((c) => c.kind !== ' ');
  return { same: changes.length === 0 && pa.app === pb.app, a: pa, b: pb, changes: diff(pa.env.body, pb.env.body) };
}
