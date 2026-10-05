/**
 * Embedding one TinyOffice document in another. A link pasted into a text
 * is kept as "<app>/<payload>" (the part of the link that is the document)
 * and shown as a preview: the drawing or animation itself, or the title and
 * first lines of anything else. Pure, so exports can use it too.
 */
import { decodeEnvelope } from './envelope.ts';
import { APP_NAMES, animToSvg, drawingToSvg, outlineOf, titleOf } from './exports.ts';

/** "<app>/<payload>" if the text is exactly one TinyOffice link, otherwise null. */
export function linkToRef(text: string): string | null {
  const m = /^\S*#\/(?:v\d+\/)?([a-z]+)(?:\.[A-Za-z0-9]+)?\/([A-Za-z0-9_-]+)$/.exec(text.trim());
  return m && m[1] in APP_NAMES ? `${m[1]}/${m[2]}` : null;
}

export interface Preview {
  app: string;
  /** The app's name: "Sheet", "Deck"... */
  kind: string;
  title: string;
  lines: string[];
  /** The document as an SVG picture, for drawings and animations. */
  svg: string;
  locked: boolean;
  /** Fragment that opens the document: "#/v2/<app>/<payload>". */
  hash: string;
}

export function previewOf(ref: string, iconSvg: Record<string, string> = {}): Preview {
  const slash = ref.indexOf('/');
  const app = ref.slice(0, slash);
  const payload = ref.slice(slash + 1);
  const kind = APP_NAMES[app] ?? 'Document';
  const hash = `#/v2/${app}/${payload}`;
  // A password-locked document gives nothing away.
  if (payload[0] === 'E') return { app, kind, title: `Locked ${kind.toLowerCase()}`, lines: [], svg: '', locked: true, hash };
  const body = decodeEnvelope(payload).body;
  const title = titleOf(app, body) || kind;
  const svg = app === 'draw' ? drawingToSvg(body) : app === 'anim' ? animToSvg(body, { created: null, iconSvg }) : '';
  const lines = outlineOf(app, body).filter((l) => l.replace(/^•\s+/, '') !== title);
  return { app, kind, title, lines: lines.slice(0, 4), svg, locked: false, hash };
}

/** An SVG as a data: address, for an <img>. */
export const svgDataUri = (svg: string) => 'data:image/svg+xml;charset=utf-8,' + encodeURIComponent(svg.replace(/^<\?xml[^>]*\?>\s*/, ''));
