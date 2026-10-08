/**
 * One document inside another. Wherever a document can hold another (a
 * text, a slide), it keeps the other's whole text, written as a fenced
 * block named for its app (lib/tlo.ts). In memory that is a "ref": the
 * app's name, a new line, and the text. From that the kit can draw it,
 * describe it and link to it.
 */
import { decodeEnvelope, encodeEnvelope } from '../lib/envelope.ts';
import { takeHead, withHead } from '../lib/tlo.ts';
import { LINK, appOf, listPage, type AppDef, type Page, type ViewOpts } from './core.ts';

/** The document a TinyLittleOffice link holds, as a ref, if the text is exactly one such link; otherwise null. */
export function linkToRef(text: string): string | null {
  const m = /^\S*#\/(?:v\d+\/)?([a-z]+)(?:\.[A-Za-z0-9]+)?\/([A-Za-z0-9_-]+)$/.exec(text.trim());
  if (!m || !appOf(m[1]) || m[2][0] === 'E') return null;
  const env = decodeEnvelope(m[2], m[1]);
  return makeRef(m[1], env.body, env.title);
}

/** A document to embed: its app and its text (and its name, kept in its own header). */
export const makeRef = (app: string, body: string, title?: string) => `${app}\n${title ? withHead(body, { title }) : body}`;

/** The fragment that opens a document: "#/v0/<app>/<payload>". */
export const hashOf = (app: string, body: string, title?: string) => {
  const payload = encodeEnvelope({ created: null, body, title }, app);
  return `${LINK}${app}${payload ? '/' + payload : ''}`;
};

export interface Resolved {
  def: AppDef | undefined;
  body: string;
  /** Password-locked: nothing about it can be shown. */
  locked: boolean;
  /** Fragment that opens the document. */
  hash: string;
  title: string;
}

/**
 * "qr/self": a QR code of the very document it sits in, so a reader can take
 * their own copy. The shell says what the link is; the code is drawn from
 * that, so the document never has to hold itself.
 */
export const SELF = 'qr\n@self';
let selfLink = '';
export const setSelfLink = (link: string) => (selfLink = link);

export function resolve(ref: string): Resolved {
  if (ref === SELF) {
    const def = appOf('qr');
    const link = selfLink || (typeof location !== 'undefined' ? location.href : '');
    return { def, body: link, locked: false, hash: '#/qr', title: 'This document, as a QR code' };
  }
  const nl = ref.indexOf('\n');
  const id = nl < 0 ? ref : ref.slice(0, nl);
  const [head, body] = takeHead(nl < 0 ? '' : ref.slice(nl + 1), ['title']);
  const def = appOf(id);
  const kind = def?.name ?? 'Document';
  return { def, body, locked: false, hash: hashOf(id, body, head.title), title: head.title || def?.title(body) || kind };
}

/** The embedded document as one page, ready to place on another. */
export function refPage(ref: string, opts: ViewOpts = {}): Page {
  const d = resolve(ref);
  if (!d.def || d.locked) return listPage(d.title, []);
  return d.def.view(d.body, { embed: true, ...opts })[0];
}

/** How many reveals the embedded document has when presented. */
export function refSteps(ref: string): number {
  const d = resolve(ref);
  return d.def?.steps?.(d.body) ?? 0;
}
