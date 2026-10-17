/**
 * Every string a person sees goes through t(), by its message's id: t('shell-menu'). A language is a Fluent file in
 * src/i18n/ (en.ftl is the source of every message, in groups, with a comment where the English is ambiguous; es.ftl
 * gives each id its Spanish), read by @fluent/bundle (Paul, 2026-10-15: "Use Fluent"), and the browser chooses the one
 * nearest navigator.languages, unless the link names one ("?lang=ht", kit/core/route.ts) or a choice was made in the
 * menu, which puts it in the link.
 *
 *   t('download-downloaded-name', { name })  a placeable: download-downloaded-name = Downloaded { $name }
 *   t('example-n-slides', { n: 3 })          a plural, a select on the number in the language's own categories
 *                                            (zero, one, two, few, many, other: those it has; English one and other),
 *                                            { $n } the number as the language writes it:
 *                                              example-n-slides = { $n ->
 *                                                      [one] one slide
 *                                                     *[other] { $n } slides
 *                                                  }
 *
 * English ships in the app file; another language is a file of its own, fetched when chosen. A message the language
 * lacks is said in English, and an id English lacks is said as itself. Fluent picks a plural with Intl.PluralRules and
 * writes a number with Intl.NumberFormat; Intl.DisplayNames names the language and Intl.Locale says which way it runs.
 * Fluent's bidi isolation (U+2068 and U+2069 round each placeable) is off: the page's root takes the language's
 * direction (`dir`), the placeables are the document's own words and numbers, and the marks would be characters in
 * every string copied, measured and compared, where none were before.
 *
 * An app built outside the suite (docs/library.md, An app built outside) brings its own words: `addStrings(code,
 * source)` adds a Fluent source to a language beside the site's messages, English included, and t() finds them as it
 * finds the site's. Added to a language not loaded yet, they wait for it and join its messages when its file arrives;
 * added to one loaded, they join at once; added to a code the site has no file for, they make no language of it.
 * Nothing is replaced: an id the language has already keeps its message, so an app's ids carry a prefix of its own
 * (`tally-…`), as each app's here carry its id. Words are added before an editor that says them is drawn, since
 * nothing draws again for them.
 */
import { FluentBundle, FluentResource, type FluentVariable } from '@fluent/bundle';

/** A language's Fluent file, or a loader of one (Vite's ?raw import: the file's text as its default). */
type Loader = () => Promise<string | { default: string }>;
/**
 * The language chosen is a parameter of the link and is never written to the device, in any state (Paul, 2026-10-11:
 * "Why are we writing language at all instead of encoding the parameter in the link?"): no storage, no cookie. A link
 * with "?lang=" opens in that language; the menu's choice puts it in the address (kit/core/shell.ts) and so in every link
 * the page makes; the visit holds it in memory as the person goes from page to page. A link without one follows the
 * browser's language.
 */
// Languages written right to left, for a browser whose Intl.Locale cannot say.
const RTL = ['ar', 'he', 'fa', 'ur', 'ps', 'sd', 'ug', 'yi', 'dv', 'ckb'];

// Vite rewrites the glob calls themselves, not a typeof test of them; outside Vite (node running the code as it is: a
// script, the command line from a checkout) the call throws and there are no files, and English is read from its file.
const glob = <T>(get: () => Record<string, T>): Record<string, T> => {
  try {
    return get();
  } catch {
    return {};
  }
};
const files = glob(() => import.meta.glob<string>(['../../i18n/*.ftl', '!../../i18n/en.ftl'], { query: '?raw', import: 'default' }));
const english = glob(() => import.meta.glob<string>('../../i18n/en.ftl', { query: '?raw', import: 'default', eager: true }));
const loaders = new Map<string, Loader>(Object.entries(files).map(([path, load]) => [path.replace(/^.*\/([^/]+)\.ftl$/, '$1'), load]));
const bundles = new Map<string, FluentBundle>();
let current = 'en';
const listeners = new Set<() => void>();

/**
 * Names a language's own data in Intl does not have yet: Haitian Creole is named in English by every engine today, and
 * NYC's Haitian community reads Kreyòl ayisyen (the 1979 orthography); Chromium names Yiddish in English (WebKit has
 * ייִדיש, and so does Node).
 */
const NATIVE: Record<string, string> = { ht: 'Kreyòl ayisyen', yi: 'ייִדיש' };
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
  const others = [...loaders.keys(), ...bundles.keys()].filter((c, i, all) => c !== 'en' && all.indexOf(c) === i);
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

/** The Fluent sources added to each language from outside the site (addStrings), in the order added. */
const added = new Map<string, string[]>();

/** A language's messages, as a bundle: the file read, then what was added to it (addStrings), the bidi marks off (above). */
function bundleOf(code: string, source: string): FluentBundle {
  const b = new FluentBundle(code, { useIsolating: false });
  for (const s of [source, ...(added.get(code) ?? [])]) b.addResource(new FluentResource(s));
  return b;
}
/** en.ftl from the disk, where node runs this file as it is and no glob brought it (never in a page, which has the glob's). */
function englishOnDisk(): string | undefined {
  try {
    const fs = (globalThis as { process?: { getBuiltinModule?(id: string): { readFileSync(path: string, enc: string): string } } }).process?.getBuiltinModule?.('node:fs');
    const dir = (import.meta as { dirname?: string }).dirname;
    return dir ? fs?.readFileSync(`${dir}/../../i18n/en.ftl`, 'utf8') : undefined;
  } catch {
    return undefined;
  }
}
const englishSource = Object.values(english)[0] ?? englishOnDisk();
if (englishSource !== undefined) bundles.set('en', bundleOf('en', englishSource));

/** A language's file given by hand (a test's in-memory Spanish), or a loader of one (a test's slow file). */
export function register(code: string, source: string | Loader) {
  if (typeof source === 'function') loaders.set(code, source);
  else bundles.set(code, bundleOf(code, source));
}

/**
 * Messages added to a language, as a Fluent source (an app built outside the suite: the header): kept, so the language
 * gets them whenever its bundle is made, and added at once to the bundle there is. An id already there keeps its
 * message. English is made here if no file brought it (a program run from source with no en.ftl beside it).
 */
export function addStrings(code: string, source: string) {
  added.set(code, [...(added.get(code) ?? []), source]);
  const b = bundles.get(code);
  if (b) b.addResource(new FluentResource(source));
  else if (code === 'en') bundles.set('en', bundleOf('en', ''));
}

/**
 * In development only: the ids asked for in the language in use and not found there, so English showed
 * through. A test clears it, draws, and reads it; a build drops the recording.
 */
export const missed = new Set<string>();

/** The variables a message's plurals count: given as words, each is read as its number, as a count is. */
const counted = new WeakMap<object, string[]>();
function countedIn(value: object): string[] {
  let names = counted.get(value);
  if (!names) {
    const walk = (p: unknown): string[] =>
      Array.isArray(p)
        ? p.flatMap((e) => (e?.type === 'select' ? [...(e.selector?.type === 'var' ? [e.selector.name as string] : []), ...e.variants.flatMap((v: { value: unknown }) => walk(v.value))] : []))
        : [];
    counted.set(value, (names = walk(value)));
  }
  return names;
}

/** The message in the language in use, its placeables filled; a variable not given shows as {name}, so the gap can be seen. */
export function t(id: string, vars: Record<string, string | number> = {}): string {
  const here = current === 'en' ? undefined : bundles.get(current);
  const found = here?.hasMessage(id) ? here : undefined;
  if (!found && current !== 'en' && import.meta.env?.DEV) missed.add(id);
  const b = found ?? bundles.get('en');
  const value = b?.getMessage(id)?.value;
  if (!b || !value) return id;
  if (typeof value === 'string') return value;
  let args: Record<string, FluentVariable> = vars;
  for (const name of countedIn(value)) if (typeof vars[name] === 'string') args = { ...args, [name]: Number(vars[name]) };
  const errors: Error[] = [];
  const out = b.formatPattern(value, args, errors);
  return errors.length ? out.replace(/\{\$(\w+)\}/g, '{$1}') : out;
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

/** The newest language asked for: a slower file arriving after a newer choice is not put in force. */
let wanted = '';
/** A language's file on its way: the shell draws once it is here, so a link in Kreyòl never flashes English first. */
let loading: Promise<void> | null = null;
async function use(code: string) {
  wanted = code;
  if (code !== 'en' && !bundles.has(code)) {
    const load = loaders.get(code);
    if (!load) return;
    try {
      const got = await load();
      bundles.set(code, bundleOf(code, typeof got === 'string' ? got : got.default));
    } catch {
      // Not fetched (offline, its file never kept): the page stays in the language it was in.
      return;
    }
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
