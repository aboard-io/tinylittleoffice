/**
 * A preview card: what a link shared with a network previews with, made only when the person shares with one from the
 * Share dialog (Bluesky, Mastodon, X, LinkedIn or the device's share sheet) with 'Show a preview of the first page'
 * on (Paul, 2026-10-11: "When we explicitly share with a social network from in the app, that's when we do this"). The
 * document's first page (or the page its app puts on a card: a sheet's chart, by ViewOpts.card) is drawn by its
 * app's own view() on the card's ground (kit/draw/card.ts) as a PNG of 1200 by 630, and posted with the title and the first words to the site's own /card (backends/cards/cards.ts, the site's Worker),
 * which keeps them readable for a month so the network can fetch them; the document itself is not sent. The link
 * shared then carries the card's id in its path, `/c/<id>` before the "#": the one page the site's Worker serves
 * (backends/cards/site.ts, with the card's tags), every other page being a static file (2026-10-15, when the Worker in front
 * of every page passed the free plan's requests a day; before that the id rode as `?c=` on the app's page, which the
 * shell still reads). Copy link and Email make none, nor does a document with a password, which says nothing of itself.
 *
 * A card is drawn once per document state: kept in memory by the link's text, so pressing two networks uploads one.
 */
import type { AppDef, Doc } from '../core/app.ts';
import { textWords } from '../../doc/index.ts';
import { textLayer } from '../text/text-layer.ts';
import { cardSvg, CARD_H, CARD_W, GROUND } from '../draw/card.ts';
import { raster } from '../draw/raster.ts';
import { t } from '../core/i18n.ts';
import { store } from '../core/store.ts';

/**
 * Whether this copy of the site makes cards at all: they need the site's Worker (/card and /c/<id>), which a copy on a
 * static host has not. The mirror on GitHub Pages is built with VITE_CARDS=0 (docs/mirror.md): no switch, and a link
 * goes to a network as itself.
 */
export const CARDS = import.meta.env?.VITE_CARDS !== '0';

/** Where the switch's choice is kept (under Saved; for the visit under Private): '0' off, on by default. */
const PREVIEW_KEY = 'tinyoffice.preview';
export const previewOn = () => store.get(PREVIEW_KEY) !== '0';
export const setPreview = (on: boolean) => store.set(PREVIEW_KEY, on ? '1' : '0');

/** What the server takes (backends/cards/cards.ts holds the same numbers; test/cards.test.ts holds them together). */
export const CARD_PNG_MAX = 400 * 1024;
export const CARD_TITLE_MAX = 120;
/** The first words sent: 200 characters of the server's 300. */
export const CARD_TEXT = 200;

const clipped = (s: string, most: number) => {
  const chars = [...s];
  return chars.length <= most
    ? s
    : chars
        .slice(0, most - 1)
        .join('')
        .replace(/\s+\S*$/, '') + '…';
};

/** What the card says: the document's title, and its first words (the title not said twice), or the app's line when it has none. */
export function cardWords(def: AppDef, doc: Doc, title: string): { title: string; text: string } {
  let words = textWords(textLayer(def, doc));
  if (title && words.startsWith(title)) words = words.slice(title.length).trim();
  return { title: clipped(title.trim(), CARD_TITLE_MAX), text: words ? clipped(words, CARD_TEXT) : def.blurb };
}

/** The card as a PNG: the first page (a sheet's chart), letterboxed on the ground; null where the browser could not draw it. */
function drawCard(def: AppDef, doc: Doc): Promise<Uint8Array | null> {
  const page = def.view(doc, { still: true, card: true })[0];
  return page ? raster(cardSvg(page), CARD_W, CARD_H, 1, GROUND) : Promise.resolve(null);
}

const base64 = (bytes: Uint8Array) => {
  let s = '';
  for (let i = 0; i < bytes.length; i += 0x8000) s += String.fromCharCode(...bytes.subarray(i, i + 0x8000));
  return btoa(s);
};

/** The link with the card's id in its path, `<site>c/<id>` before the "#": what a network's fetcher reads. `site` is the site's own address, ending in "/". */
export function withCardId(link: string, id: string, site: string): string {
  return `${site}c/${id}${new URL(link).hash}`;
}

const made = new Map<string, Promise<string>>();

/**
 * The card's id for this link: drawn and posted to `at` (the site's /card) the first time, the same id after. A card
 * that could not be made says why, as the end of "Shared without a preview: …", and is tried again next time.
 */
export function cardFor(at: string, link: string, def: AppDef, doc: Doc, title: string): Promise<string> {
  let id = made.get(link);
  if (!id) {
    id = upload(at, def, doc, title);
    made.set(link, id);
    id.catch(() => made.delete(link));
  }
  return id;
}

async function upload(at: string, def: AppDef, doc: Doc, title: string): Promise<string> {
  const png = await drawCard(def, doc);
  if (!png) throw new Error(t('share-page-could-not-be-drawn'));
  if (png.length > CARD_PNG_MAX) throw new Error(t('share-picture-is-over-400-kb'));
  let res: Response;
  try {
    res = await fetch(at, { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify({ png: base64(png), ...cardWords(def, doc, title), app: def.id }) });
  } catch {
    throw new Error(t('share-server-could-not-be-reached'));
  }
  if (res.status === 429) throw new Error(t('share-hundred-previews-day-from-one'));
  if (!res.ok) throw new Error(res.status === 400 ? t('share-server-refused-picture') : t('share-server-could-not-be-reached'));
  return ((await res.json()) as { id: string }).id;
}
