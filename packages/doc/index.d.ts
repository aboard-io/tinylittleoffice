/** TinyLittleOffice without a browser. A document is a link; this makes, reads, compares, signs and evaluates them. */

export interface Envelope {
  /** Creation time in ms since the Unix epoch, null for links without one. */
  created: number | null;
  /** The document's name. */
  title?: string;
  /** Who made it: a person, or an agent's name. A claim until signed. */
  by?: string;
  /** Public key and signature, base64url, when signed. */
  key?: string;
  sig?: string;
  /** The document in the app's own format. */
  body: string;
}

export interface MakeOptions {
  title?: string;
  by?: string;
  /** ms since the Unix epoch; now by default; null for none. */
  created?: number | null;
  /** 'show' presents a deck; 'embed' shows the document alone; 'pdf', 'png', 'html', 'md' download it. */
  view?: string;
  /** The site the link opens on; https://tinylittleoffice.com/ by default. */
  site?: string;
}

export interface Parsed {
  app: string;
  view: string;
  /** True when the link is sealed under a password: `open` needs it. */
  sealed: boolean;
  env: Envelope;
  /** The whole document as Markdown. */
  markdown: string;
}

export interface KeyStore {
  get(): string | null;
  set(v: string): void;
  remove(): void;
}
export interface Signer {
  fingerprint(): Promise<string | null>;
  sign(message: string): Promise<{ key: string; sig: string }>;
  exportKey(): Promise<string>;
  importKey(json: string): Promise<string>;
  forget(): void;
}
export interface AppDef {
  id: string;
  name: string;
  group?: string;
  blurb?: string;
}

export const SITE: string;
export const URL_LIMIT: number;

/** Every app: id, name, group and a line on what it is for. */
export function apps(): { id: string; name: string; group: string; blurb: string }[];
/** An app's example body, in its own format. */
export function example(app: string): string;
/** The envelope for a document: when, who, what. */
export function envelope(body: string, opts?: MakeOptions): Envelope;
/** The link for a document in an app's own format. */
export function link(app: string, body: string, opts?: MakeOptions): string;
/** Text as a body in the app's format: Markdown or CSV shaped the way the app reads it, else plain text as the app reads it. */
export function read(app: string, text: string): string;
/** The link for a document written as Markdown or CSV, shaped the way the app reads it. */
export function linkFromMarkdown(app: string, markdown: string, opts?: MakeOptions): string;
/** Read a link (or a fragment): the app, the view and the document. Throws if it is not a TinyLittleOffice link. */
export function parse(url: string): Parsed;
/** Open a sealed link with its password. */
export function open(url: string, password: string): Promise<Parsed>;
/** The same document, sealed under a password. */
export function sealed(url: string, password: string): Promise<string>;
/** The link, signed with a key. */
export function signed(url: string, signer: Signer): Promise<string>;
/** Whether a link's signature holds and whose it is (a fingerprint), or null when unsigned. */
export function verified(url: string): Promise<{ ok: boolean; by: string } | null>;
/** A signer over a key store (the key is made on first use). */
export function createSigner(store: KeyStore): Signer;
/** A key store in memory: pass your own to keep a key. */
export function memoryStore(initial?: string | null): KeyStore;
export function fingerprintOf(keyB64: string): Promise<string>;
export function verify(keyB64: string, sigB64: string, message: string): Promise<boolean>;
export function signingMessage(app: string, created: number | null, body: string, title?: string, by?: string): string;
export function quantizeCreated(ms: number): number;
export function isSealed(payload: string): boolean;

/** Any document as Markdown, shaped for its kind. */
export function toMarkdown(def: AppDef, body: string, title?: string): string;
/** Markdown (or CSV) as a document of the app's kind. */
export function fromMarkdown(def: AppDef, markdown: string): string;
export function parseCsv(text: string): string[][];
export function looksLikeCsv(text: string): boolean;

/** A sheet, computed: each cell's shown value, row by row, trimmed to what there is. */
export function evaluateSheet(body: string): string[][];
/** A model is a sheet with named cells: run it with some assumptions changed, by name; the flows (rows of From | To | Amount) and every named cell's value come back. */
export function runModel(body: string, assumptions?: Record<string, number>): { flows: { from: string; to: string; value: number }[]; values: Record<string, number> };

export interface Warning {
  level: 'error' | 'warning' | 'note';
  line?: number;
  message: string;
}
/** What a browser would not tell a program: unknown icons, a layout that does not exist, a link too long for a QR code. */
export function lint(app: string, body: string, opts?: MakeOptions): Promise<Warning[]>;
/** Icons whose names or keywords match, best first. */
export function searchIcons(query: string, limit?: number): string[];

/** A line-by-line diff of two documents. */
export function diff(a: string, b: string): { kind: ' ' | '-' | '+'; line: string }[];
/** Two links compared. */
export function compare(a: string, b: string): { same: boolean; a: Parsed; b: Parsed; changes: { kind: ' ' | '-' | '+'; line: string }[] };
