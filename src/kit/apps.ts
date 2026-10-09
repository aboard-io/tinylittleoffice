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
import todo from '../apps/todo/def.ts';
import board from '../apps/board/def.ts';
import cal from '../apps/cal/def.ts';
import diagram from '../apps/diagram/def.ts';
import anim from '../apps/anim/def.ts';
import trip from '../apps/trip/def.ts';
import site from '../apps/site/def.ts';
import calc from '../apps/calc/def.ts';
import { QR_LANG, qrPicture } from './qr-picture.ts';

const ALL: AppDef[] = [write, outline, deck, sheet, calc, draw, diagram, anim, board, todo, cal, trip, site];

export const apps = (): AppDef[] => ALL;
export const appOf = (id: string): AppDef | undefined => ALL.find((a) => a.id === id);
// A document's QR code (kit/qr-picture.ts) is drawn by the hosts as a document they hold, though it is not an app.
lookup.appOf = (id) => appOf(id) ?? (id === QR_LANG ? qrPicture : undefined);
