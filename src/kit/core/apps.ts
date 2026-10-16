/**
 * The registry: every app's definition, in the order the home page shows them. A definition is light (no
 * DOM, no templates: those are a file of their own, asked for with `templates()`), so the API reads it without the
 * editors (vite.api.config.ts); the build reads it too (vite.config.ts).
 */
import { lookup, type AppDef } from './app.ts';
import { siteOf } from './route.ts';
import write from '../../apps/write/def.ts';
import sheet from '../../apps/sheet/def.ts';
import draw from '../../apps/draw/def.ts';
import outline from '../../apps/outline/def.ts';
import deck from '../../apps/deck/def.ts';
import cal from '../../apps/cal/def.ts';
import diagram from '../../apps/diagram/def.ts';
import anim from '../../apps/anim/def.ts';
import trip from '../../apps/trip/def.ts';
import calc from '../../apps/calc/def.ts';
import { QR_LANG, qrPicture } from '../draw/qr-picture.ts';
import { LOCKED_LANG, lockedDoc } from '../share/locked.ts';

const ALL: AppDef[] = [write, outline, deck, sheet, calc, draw, diagram, anim, cal, trip];

export const apps = (): AppDef[] => ALL;
export const appOf = (id: string): AppDef | undefined => ALL.find((a) => a.id === id);
// A document's QR code (kit/draw/qr-picture.ts) and a document locked with a password (kit/share/locked.ts) are drawn by the hosts as documents they hold, though neither is an app.
lookup.appOf = (id) => appOf(id) ?? (id === QR_LANG ? qrPicture : id === LOCKED_LANG ? lockedDoc : undefined);

/** The site's own address, whichever app page we were opened from ("/text/" is a page of the site at "/"): route.ts siteOf. */
export const siteRoot = (): string => siteOf(location.href, (id) => !!appOf(id));
