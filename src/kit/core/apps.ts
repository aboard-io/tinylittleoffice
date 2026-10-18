/**
 * The registry: every app's definition, in the order the home page shows them. A definition is light (no
 * DOM, no templates: those are a file of their own, asked for with `templates()`), so the API reads it without the
 * editors (vite.api.config.ts); the build reads it too (vite.config.ts).
 *
 * An app built outside the suite (docs/library.md, An app built outside) is registered by the page that holds it,
 * with `registerApp`, after the suite's: `appOf` finds it, so `editorTag` and `mount` draw it, and a document of it
 * placed in another is drawn by its own view. `apps()` stays the suite's, in their order, since everything that
 * lists it is the site's: the home page, the routes and pages the build writes, Insert ▾'s new documents, the drawer,
 * the API, the skill and its examples. The site never registers one.
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

const SUITE: AppDef[] = [write, outline, deck, sheet, calc, draw, diagram, anim, cal, trip];
/** The suite's apps, then those registered from outside it. */
const ALL: AppDef[] = [...SUITE];

export const apps = (): AppDef[] => SUITE;
export const appOf = (id: string): AppDef | undefined => ALL.find((a) => a.id === id);
// A document's QR code (kit/draw/qr-picture.ts) and a document locked with a password (kit/share/locked.ts) are drawn by the hosts as documents they hold, though neither is an app.
lookup.appOf = (id) => appOf(id) ?? (id === QR_LANG ? qrPicture : id === LOCKED_LANG ? lockedDoc : undefined);

/**
 * Whether two definitions are the same app: the same object, or (a module loaded twice, or again by a hot reload) the
 * same fields, each the same value, and each function and getter the same code.
 */
function sameDef(a: object, b: object): boolean {
  if (a === b) return true;
  const [da, db] = [Object.getOwnPropertyDescriptors(a), Object.getOwnPropertyDescriptors(b)];
  const keys = Object.keys(da);
  if (keys.length !== Object.keys(db).length) return false;
  const same = (x: unknown, y: unknown) =>
    x === y || (typeof x === 'function' && typeof y === 'function' ? String(x) === String(y) : typeof x !== 'function' && typeof y !== 'function' && JSON.stringify(x) === JSON.stringify(y));
  return keys.every((k) => k in db && same(da[k].value, db[k].value) && same(da[k].get, db[k].get));
}

/**
 * An app built outside the suite, put in the registry after the suite's: from now on `appOf(def.id)` is `def`. Its id
 * names nothing the registry knows (an app's, or the QR code's and the locked document's above), or this throws, so a
 * second registration of one id is an error rather than an app quietly replaced; unless it is the same definition
 * again (sameDef: the module imported twice, or reloaded unchanged), which is nothing to do.
 */
export function registerApp(def: AppDef): void {
  if (!def || typeof def.id !== 'string' || !/^[a-z][a-z0-9-]*$/.test(def.id) || typeof def.editor !== 'function' || typeof def.view !== 'function' || typeof def.blank !== 'function')
    throw new TypeError('an app is a definition (defineApp): an id of lower-case letters, digits and dashes, an editor, a view and a blank document');
  const known = lookup.appOf(def.id);
  if (known && sameDef(known, def)) return;
  if (known) throw new Error(`an app "${def.id}" is registered already`);
  ALL.push(def);
}

/** The site's own address, whichever app page we were opened from ("/text/" is a page of the site at "/"): route.ts siteOf. */
export const siteRoot = (): string => siteOf(location.href, (id) => !!appOf(id));
