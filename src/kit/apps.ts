/**
 * The registry: every app's definition, in the order the home page shows them. A definition is light (no
 * editor, no DOM), so this list costs the home page nothing; the build reads it too (vite.config.ts).
 */
import { lookup, type AppDef } from './app.ts';
import write from '../apps/write/def.ts';
import sheet from '../apps/sheet/def.ts';
import draw from '../apps/draw/def.ts';
import outline from '../apps/outline/def.ts';
import deck from '../apps/deck/def.ts';
import cal from '../apps/cal/def.ts';
import diagram from '../apps/diagram/def.ts';
import anim from '../apps/anim/def.ts';
import trip from '../apps/trip/def.ts';
import site from '../apps/site/def.ts';
import calc from '../apps/calc/def.ts';
import { QR_LANG, qrPicture } from './qr-picture.ts';
import { LOCKED_LANG, lockedDoc } from './locked.ts';

const ALL: AppDef[] = [write, outline, deck, sheet, calc, draw, diagram, anim, cal, trip, site];

export const apps = (): AppDef[] => ALL;
export const appOf = (id: string): AppDef | undefined => ALL.find((a) => a.id === id);
// A document's QR code (kit/qr-picture.ts) and a document locked with a password (kit/locked.ts) are drawn by the hosts as documents they hold, though neither is an app.
lookup.appOf = (id) => appOf(id) ?? (id === QR_LANG ? qrPicture : id === LOCKED_LANG ? lockedDoc : undefined);

/** The site's own address, whichever app page we were opened from ("/text/" is a page of the site at "/"). */
export function siteRoot(): string {
  const dir = location.pathname.split('/').slice(-2)[0];
  const onAppPage = /\/[a-z]+\/$/.test(location.pathname) && ALL.some((a) => a.id === dir);
  return new URL(onAppPage ? '..' : '.', location.origin + location.pathname).href;
}
