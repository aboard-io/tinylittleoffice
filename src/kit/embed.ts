/**
 * One document inside another. Wherever a document can hold another (a
 * text, a slide), it keeps "<app>/<payload>": the part of a TinyLittleOffice link
 * that is the document. From that the kit can draw it, describe it and link
 * to it.
 */
import { decodeEnvelope, encodeEnvelope } from '../lib/envelope.ts';
import { LINK, appOf, listPage, type AppDef, type Page, type ViewOpts } from './core.ts';

/** "<app>/<payload>" if the text is exactly one TinyLittleOffice link, otherwise null. */
export function linkToRef(text: string): string | null {
  const m = /^\S*#\/(?:v\d+\/)?([a-z]+)(?:\.[A-Za-z0-9]+)?\/([A-Za-z0-9_-]+)$/.exec(text.trim());
  return m && appOf(m[1]) ? `${m[1]}/${m[2]}` : null;
}

export const makeRef = (app: string, body: string, title?: string) => `${app}/${encodeEnvelope({ created: null, body, title }, app)}`;

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
export const SELF = 'qr/self';
let selfLink = '';
export const setSelfLink = (link: string) => (selfLink = link);

export function resolve(ref: string): Resolved {
  if (ref === SELF) {
    const def = appOf('qr');
    const link = selfLink || (typeof location !== 'undefined' ? location.href : '');
    return { def, body: link, locked: false, hash: '#/qr', title: 'This document, as a QR code' };
  }
  const slash = ref.indexOf('/');
  const id = ref.slice(0, slash);
  const payload = ref.slice(slash + 1);
  const def = appOf(id);
  const locked = payload[0] === 'E';
  const env = locked ? { body: '', title: undefined } : decodeEnvelope(payload, id);
  const body = env.body;
  const kind = def?.name ?? 'Document';
  return { def, body, locked, hash: `${LINK}${id}${payload ? '/' + payload : ''}`, title: locked ? `Locked ${kind.toLowerCase()}` : env.title || def?.title(body) || kind };
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
