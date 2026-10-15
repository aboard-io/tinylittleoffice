/**
 * Where an empty trip's map opens (Paul, 2026-10-11: "Always open the map on the country for the language or New York
 * City if you don't know where"): the country of the site's language, from nothing but what the browser already says.
 * The browser's own region wins where one of its languages is the site's (es-AR is Argentina, fr-CA Canada, en-GB the
 * United Kingdom); else the language's home, chosen for where most of its speakers are (Spanish is Mexico, Portuguese
 * Brazil). English with no region, a region of the United States, and anything not known open on New York City. No
 * position is asked for, no address looked up and nothing kept.
 */
import { COUNTRIES } from './countries.ts';

/** The zoom of a city: New York City's, and where the map goes when the device says where it is. */
export const CITY = 12;
// (These zooms are written for 256px tiles, as Leaflet's were; the map, MapLibre on 512px tiles, takes one less: editor.ts Z.)
/** New York City: City Hall. */
export const NYC = { lat: 40.7128, lon: -74.006, zoom: CITY };

/** Each language's home, by the code of its file in src/i18n/. */
export const HOMES: Record<string, string> = {
  ar: 'EG',
  bn: 'BD',
  de: 'DE',
  es: 'MX',
  fr: 'FR',
  he: 'IL',
  hi: 'IN',
  ht: 'HT',
  it: 'IT',
  ja: 'JP',
  ko: 'KR',
  nl: 'NL',
  pl: 'PL',
  'pt-br': 'BR',
  ru: 'RU',
  uk: 'UA',
  ur: 'PK',
  // Yiddish is the city's own: its readers here are Hasidic New York, so it opens where English does.
  yi: 'US',
  'zh-hans': 'CN',
  'zh-hant': 'TW',
};

export interface View {
  lat: number;
  lon: number;
  zoom: number;
}

/** A tag's language and script (maximized: zh-TW is written in Hant), or null where it is not a tag. */
function parts(tag: string): { language: string; script: string; region: string } | null {
  try {
    const loc = new Intl.Locale(tag);
    return { language: loc.language, script: loc.maximize().script ?? '', region: loc.region ?? '' };
  } catch {
    return null;
  }
}

/** The country to open on, by its code: the first of `locales` in the site's language that names a region, else the language's home; '' for none. */
export function homeCountry(language: string, locales: readonly string[]): string {
  const site = parts(language);
  if (!site) return '';
  for (const tag of locales) {
    const p = parts(tag);
    // The site's language in the site's script (a Traditional Chinese site is not zh-CN's).
    if (!p || p.language !== site.language || p.script !== site.script) continue;
    if (p.region) return COUNTRIES[p.region] ? p.region : (HOMES[language.toLowerCase()] ?? '');
    break;
  }
  return HOMES[language.toLowerCase()] ?? '';
}

/**
 * Where the map opens for a site in `language` read by a browser that prefers `locales`: that country whole, or New
 * York City where the country is not known or is the United States (the city the site is made in, rather than a
 * continent from Alaska to Florida).
 */
export function homeView(language: string, locales: readonly string[]): View {
  const code = homeCountry(language, locales);
  const c = code && code !== 'US' ? COUNTRIES[code] : undefined;
  return c ? { lat: c[0], lon: c[1], zoom: c[2] } : { ...NYC };
}
