/**
 * One document inside another. Wherever a document can hold another (a
 * text, a slide), it keeps "<app>/<payload>": the part of a TinyOffice link
 * that is the document. From that the kit can draw it, describe it and link
 * to it.
 */
import { decodeEnvelope, encodeEnvelope } from '../lib/envelope.ts';
import { appOf, listPage, type AppDef, type Page, type ViewOpts } from './core.ts';

/** "<app>/<payload>" if the text is exactly one TinyOffice link, otherwise null. */
export function linkToRef(text: string): string | null {
  const m = /^\S*#\/(?:v\d+\/)?([a-z]+)(?:\.[A-Za-z0-9]+)?\/([A-Za-z0-9_-]+)$/.exec(text.trim());
  return m && appOf(m[1]) ? `${m[1]}/${m[2]}` : null;
}

export const makeRef = (app: string, body: string) => `${app}/${encodeEnvelope({ created: null, body })}`;

export interface Resolved {
  def: AppDef | undefined;
  body: string;
  /** Password-locked: nothing about it can be shown. */
  locked: boolean;
  /** Fragment that opens the document. */
  hash: string;
  title: string;
}

export function resolve(ref: string): Resolved {
  const slash = ref.indexOf('/');
  const id = ref.slice(0, slash);
  const payload = ref.slice(slash + 1);
  const def = appOf(id);
  const locked = payload[0] === 'E';
  const body = locked ? '' : decodeEnvelope(payload).body;
  const kind = def?.name ?? 'Document';
  return { def, body, locked, hash: `#/v2/${id}${payload ? '/' + payload : ''}`, title: locked ? `Locked ${kind.toLowerCase()}` : def?.title(body) || kind };
}

/** The embedded document as one page, ready to place on another. */
export function refPage(ref: string, opts: ViewOpts = {}): Page {
  const d = resolve(ref);
  if (!d.def || d.locked) return listPage(d.title, []);
  return d.def.view(d.body, { embed: true, ...opts })[0];
}

/** How many reveals the embedded document has when presented, and whether they play by themselves. */
export function refSteps(ref: string): { steps: number; auto: boolean } {
  const d = resolve(ref);
  return { steps: d.def?.steps?.(d.body) ?? 0, auto: d.def?.build === 'auto' };
}
