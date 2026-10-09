/**
 * Every string a person sees goes through t(). English is the key: t('Find an app'). A language is a file
 * in src/i18n/ (en.ts is the list of every key, hand-edited; es.ts would map each key to Spanish), and the
 * browser chooses the one nearest navigator.languages, unless a choice was made in the menu.
 *
 *   t('Downloaded {name}', { name })            a placeholder: {name}
 *   t('{n|one slide|# slides}', { n: 3 })       a plural: the forms of the word in the language's own order
 *                                               (zero, one, two, few, many, other: of those the language has;
 *                                               English has one and other), "#" the number as the language writes it
 *
 * English ships alone; another language is a lazy chunk, fetched when chosen. Nothing here is a framework:
 * Intl.PluralRules picks the form, Intl.NumberFormat writes the number, Intl.DisplayNames names the language,
 * and Intl.Locale says which way it runs.
 */
import { store } from './store.ts';

export type Strings = Record<string, string>;
type Loader = () => Promise<{ default: Strings }>;

const KEY = 'tinyoffice.lang';
const ORDER = ['zero', 'one', 'two', 'few', 'many', 'other'];
// Languages written right to left, for a browser whose Intl.Locale cannot say.
const RTL = ['ar', 'he', 'fa', 'ur', 'ps', 'sd', 'ug', 'yi', 'dv', 'ckb'];

const files: Record<string, Loader> = typeof import.meta.glob === 'function' ? (import.meta.glob(['../i18n/*.ts', '!../i18n/en.ts']) as Record<string, Loader>) : {};
const loaders = new Map<string, Loader>(Object.entries(files).map(([path, load]) => [path.replace(/^.*\/([^/]+)\.ts$/, '$1'), load]));
const dicts = new Map<string, Strings>();
let current = 'en';
const listeners = new Set<() => void>();

/** The codes of the languages present, English first. */
export const languages = (): string[] => ['en', ...[...loaders.keys(), ...dicts.keys()].filter((c, i, all) => c !== 'en' && all.indexOf(c) === i).sort()];
/** A language's name, in itself: "Español". */
export const languageName = (code: string): string => {
  try {
    return new Intl.DisplayNames([code], { type: 'language' }).of(code) ?? code;
  } catch {
    return code;
  }
};
/** The language in use. */
export const language = () => current;
/** Whoever shows strings is told when the language changes, so they can draw again. */
export function onLanguage(cb: () => void): () => void {
  listeners.add(cb);
  return () => listeners.delete(cb);
}

/** A dictionary given by hand (a test's in-memory Spanish). */
export function register(code: string, strings: Strings) {
  dicts.set(code, strings);
}

const plural = (code: string, n: number, forms: string[]): string => {
  let rules: Intl.PluralRules;
  try {
    rules = new Intl.PluralRules(code);
  } catch {
    rules = new Intl.PluralRules('en');
  }
  const have = ORDER.filter((c) => rules.resolvedOptions().pluralCategories.includes(c as Intl.LDMLPluralRule));
  const at = have.indexOf(rules.select(n));
  const form = forms[at] ?? forms[forms.length - 1];
  let number: string;
  try {
    number = new Intl.NumberFormat(code).format(n);
  } catch {
    number = String(n);
  }
  return form.replaceAll('#', number);
};

/** The string in the language in use, its placeholders filled. */
export function t(text: string, vars: Record<string, string | number> = {}): string {
  const s = (current === 'en' ? undefined : dicts.get(current)?.[text]) ?? text;
  return s.replace(/\{(\w+)(?:\|([^}]*))?\}/g, (whole, name: string, forms?: string) => {
    const v = vars[name];
    if (v === undefined) return whole;
    if (forms !== undefined) return plural(current, Number(v), forms.split('|'));
    return typeof v === 'number' ? plural(current, v, ['#']) : v;
  });
}

/** Which way a language runs. */
export function directionOf(code: string): 'ltr' | 'rtl' {
  try {
    const loc = new Intl.Locale(code) as Intl.Locale & { getTextInfo?(): { direction: string }; textInfo?: { direction: string } };
    const dir = loc.getTextInfo?.().direction ?? loc.textInfo?.direction;
    if (dir === 'rtl' || dir === 'ltr') return dir;
    return RTL.includes(loc.language) ? 'rtl' : 'ltr';
  } catch {
    return 'ltr';
  }
}

async function use(code: string) {
  if (code !== 'en' && !dicts.has(code)) {
    const load = loaders.get(code);
    if (!load) return;
    dicts.set(code, (await load()).default);
  }
  current = code;
  if (typeof document !== 'undefined') {
    document.documentElement.lang = code;
    document.documentElement.dir = directionOf(code);
  }
  for (const cb of listeners) cb();
}

/** The language chosen in the menu, or null to follow the browser. */
export const chosenLanguage = (): string | null => store.get(KEY);

/** Choose a language (null: the browser's), from now on. */
export async function setLanguage(code: string | null) {
  if (code) store.set(KEY, code);
  else store.remove(KEY);
  await use(code ?? browserLanguage());
}

/** The language of the browser's nearest to one present: "pt-BR" finds pt-br, then pt; else English. */
export function browserLanguage(wanted: readonly string[] = typeof navigator !== 'undefined' ? navigator.languages : []): string {
  const have = languages();
  for (const tag of wanted) {
    const lower = tag.toLowerCase();
    const hit = have.find((c) => c.toLowerCase() === lower) ?? have.find((c) => c.toLowerCase() === lower.split('-')[0]);
    if (hit) return hit;
  }
  return 'en';
}

/** At load: the chosen language, or the browser's. */
export const initLanguage = () => use(chosenLanguage() ?? browserLanguage());
