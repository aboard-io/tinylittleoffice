/**
 * Every string a person sees goes through t(). English is the key: t('Find app, template'). A language is a file
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

export type Strings = Record<string, string>;
type Loader = () => Promise<{ default: Strings }>;

/**
 * The language chosen in the menu is kept on the device in every state, Private or Saved, in localStorage and never a
 * cookie (Paul, 2026-10-10: "Language change should be persistent across reloads. But no cookies!"): it says nothing
 * about the person or their documents, and a page that comes back in the wrong words is a wall. kit/store.ts leaves
 * this one key alone when Private forgets the rest.
 */
export const LANG_KEY = 'tinyoffice.lang';
const device = (): Storage | null => {
  try {
    return localStorage;
  } catch {
    return null;
  }
};
const ORDER = ['zero', 'one', 'two', 'few', 'many', 'other'];
// Languages written right to left, for a browser whose Intl.Locale cannot say.
const RTL = ['ar', 'he', 'fa', 'ur', 'ps', 'sd', 'ug', 'yi', 'dv', 'ckb'];

// Vite rewrites the glob call itself, not a typeof test of it; outside Vite the call throws and there are no files.
const files: Record<string, Loader> = (() => {
  try {
    return import.meta.glob(['../i18n/*.ts', '!../i18n/en.ts']) as Record<string, Loader>;
  } catch {
    return {};
  }
})();
const loaders = new Map<string, Loader>(Object.entries(files).map(([path, load]) => [path.replace(/^.*\/([^/]+)\.ts$/, '$1'), load]));
const dicts = new Map<string, Strings>();
let current = 'en';
const listeners = new Set<() => void>();

/**
 * Names a language's own data in Intl does not have yet: Haitian Creole is named in English by every engine today, and
 * NYC's Haitian community reads Kreyòl ayisyen (the 1979 orthography).
 */
const NATIVE: Record<string, string> = { ht: 'Kreyòl ayisyen' };
/** A language's name, in itself, as a menu begins it: "Español", "Русский", "Kreyòl ayisyen". */
export const languageName = (code: string): string => {
  if (NATIVE[code]) return NATIVE[code];
  try {
    const name = new Intl.DisplayNames([code], { type: 'language' }).of(code) ?? code;
    return name.charAt(0).toLocaleUpperCase(code) + name.slice(1);
  } catch {
    return code;
  }
};
/**
 * The codes of the languages present, English first, then by their names in themselves under the root collation:
 * the Latin names A to Z, then Cyrillic, Arabic, Devanagari, Bengali, Hangul and Han, as a reader of each finds theirs.
 */
export const languages = (): string[] => {
  const others = [...loaders.keys(), ...dicts.keys()].filter((c, i, all) => c !== 'en' && all.indexOf(c) === i);
  const name = new Map(others.map((c) => [c, languageName(c)]));
  const order = new Intl.Collator('und');
  return ['en', ...others.sort((a, b) => order.compare(name.get(a)!, name.get(b)!) || (a < b ? -1 : 1))];
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

/** A language's plural rules, the categories it has in ORDER's order, and its numbers: made once per language (each is costly to make, and a word count is plural on every keystroke). */
const counting = new Map<string, { rules: Intl.PluralRules; have: string[]; format: (n: number) => string }>();
function countingIn(code: string) {
  let c = counting.get(code);
  if (!c) {
    let rules: Intl.PluralRules;
    try {
      rules = new Intl.PluralRules(code);
    } catch {
      rules = new Intl.PluralRules('en');
    }
    const cats = rules.resolvedOptions().pluralCategories;
    let format: (n: number) => string;
    try {
      const nf = new Intl.NumberFormat(code);
      format = (n) => nf.format(n);
    } catch {
      format = String;
    }
    c = { rules, have: ORDER.filter((x) => cats.includes(x as Intl.LDMLPluralRule)), format };
    counting.set(code, c);
  }
  return c;
}

const plural = (code: string, n: number, forms: string[]): string => {
  const { rules, have, format } = countingIn(code);
  const at = have.indexOf(rules.select(n));
  const form = forms[at] ?? forms[forms.length - 1];
  return form.replaceAll('#', format(n));
};

/**
 * In development only: the keys asked for in the language in use and not found there, so English showed
 * through. A test clears it, draws, and reads it; a build drops the recording.
 */
export const missed = new Set<string>();

/** The string in the language in use, its placeholders filled. */
export function t(text: string, vars: Record<string, string | number> = {}): string {
  const found = current === 'en' ? undefined : dicts.get(current)?.[text];
  if (found === undefined && current !== 'en' && import.meta.env?.DEV) missed.add(text);
  const s = found ?? text;
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
export const chosenLanguage = (): string | null => device()?.getItem(LANG_KEY) ?? null;

/** Choose a language (null: the browser's), from now on. */
export async function setLanguage(code: string | null) {
  if (code) device()?.setItem(LANG_KEY, code);
  else device()?.removeItem(LANG_KEY);
  await use(code ?? browserLanguage());
}

/**
 * The language of the browser's nearest to one present: "pt-BR" finds pt-br, then pt; a Chinese tag finds its script
 * (zh-TW, zh-HK and zh-Hant-* are zh-hant; zh-CN, zh-SG, zh-Hans-* and zh alone are zh-hans), as Intl.Locale's
 * maximize() says it is written; else English.
 */
export function browserLanguage(wanted: readonly string[] = typeof navigator !== 'undefined' ? navigator.languages : []): string {
  const have = languages();
  const find = (c: string) => have.find((h) => h.toLowerCase() === c.toLowerCase());
  for (const tag of wanted) {
    let script = '';
    try {
      const loc = new Intl.Locale(tag).maximize();
      script = loc.script ? `${loc.language}-${loc.script}` : '';
    } catch {
      // Not a tag: matched as written.
    }
    const hit = find(tag) ?? (script ? find(script) : undefined) ?? find(tag.split('-')[0]);
    if (hit) return hit;
  }
  return 'en';
}

/** At load: the chosen language, or the browser's. */
export const initLanguage = () => use(chosenLanguage() ?? browserLanguage());
