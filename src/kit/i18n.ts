/**
 * Every string a person sees goes through t(). English is the key: t('Find app, template'). A language is a file
 * in src/i18n/ (en.ts is the list of every key, hand-edited; es.ts would map each key to Spanish), and the
 * browser chooses the one nearest navigator.languages, unless the link names one ("?lang=ht", kit/route.ts) or a choice
 * was made in the menu, which puts it in the link.
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
 * The language chosen is a parameter of the link and is never written to the device, in any state (Paul, 2026-10-11:
 * "Why are we writing language at all instead of encoding the parameter in the link?"): no storage, no cookie. A link
 * with "?lang=" opens in that language; the menu's choice puts it in the address (kit/shell.ts) and so in every link
 * the page makes; the visit holds it in memory as the person goes from page to page. A link without one follows the
 * browser's language.
 */
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

/** A dictionary given by hand (a test's in-memory Spanish), or a loader for one (a test's slow chunk). */
export function register(code: string, strings: Strings | Loader) {
  if (typeof strings === 'function') loaders.set(code, strings);
  else dicts.set(code, strings);
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

/** The newest language asked for: a slower dictionary arriving after a newer choice is not put in force. */
let wanted = '';
/** A dictionary on its way: the shell draws once it is here, so a link in Kreyòl never flashes English first. */
let loading: Promise<void> | null = null;
async function use(code: string) {
  wanted = code;
  if (code !== 'en' && !dicts.has(code)) {
    const load = loaders.get(code);
    if (!load) return;
    dicts.set(code, (await load()).default);
    if (wanted !== code) return;
  }
  current = code;
  if (typeof document !== 'undefined') {
    document.documentElement.lang = code;
    document.documentElement.dir = directionOf(code);
  }
  for (const cb of listeners) cb();
}
/** The language being loaded, or null when the one in force is the one asked for. */
export const languagePending = (): Promise<void> | null => loading;

/** The language chosen, in the menu or by the link that brought the page, for this visit; null to follow the browser. */
let chosen: string | null = null;
/** The language chosen, or null to follow the browser: what the link carries as "lang". */
export const chosenLanguage = (): string | null => chosen;

/** Choose a language (null: the browser's), from now on. The shell puts it in the address (onLanguage). */
export function setLanguage(code: string | null): Promise<void> {
  chosen = code && languages().includes(code) ? code : null;
  const run = use(chosen ?? browserLanguage());
  loading = run;
  void run.finally(() => loading === run && (loading = null));
  return run;
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

/** At load: the language the link chose (the shell has read it already), or the browser's. */
export const initLanguage = (): Promise<void> => (chosen ? (loading ?? Promise.resolve()) : setLanguage(null));
