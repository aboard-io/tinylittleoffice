/**
 * Search and suggestion over the icon library, with no DOM and no Lucide (it runs under node). Each
 * starter icon (kit/icons.ts LIBRARY) carries a few keywords; a slide's own words are matched against them
 * to suggest icons, and the picker's search box does the same with what is typed. The rest of Lucide joins
 * through addIconNames once the lazy chunk (icons-picker.ts) has it: searched by name and tag, grouped by
 * Lucide's categories.
 */
export const KEYWORDS: Record<string, string> = {
  rocket: 'launch ship startup space fast growth release liftoff kickoff',
  lightbulb: 'idea insight innovation concept think brainstorm bright',
  target: 'goal aim objective focus mission okr kpi bullseye priority',
  'trending-up': 'growth increase up rise gain improve progress momentum revenue',
  'trending-down': 'decline decrease down fall drop loss reduce churn',
  'bar-chart': 'chart graph data stats statistics metrics numbers results analytics report',
  'pie-chart': 'chart share breakdown percent percentage split segment portion market',
  users: 'team people group audience customers community staff everyone hiring',
  user: 'person profile account me individual persona customer about',
  heart: 'love like health care favorite thanks passion values',
  star: 'favorite rating best highlight review quality feature featured',
  flag: 'milestone country mark goal finish checkpoint',
  globe: 'world global international web internet earth worldwide language',
  mail: 'email message contact letter inbox newsletter send',
  phone: 'call contact telephone support dial',
  calendar: 'date schedule event day plan timeline agenda month week roadmap',
  clock: 'time hour schedule deadline wait duration timing late soon',
  'map-pin': 'location place address where pin office venue local',
  home: 'house welcome start main family residential',
  building: 'company office business corporate organization enterprise city headquarters',
  briefcase: 'work job business career portfolio professional client',
  dollar: 'money price cost budget revenue cash finance sales profit pay funding pricing',
  cart: 'shop shopping buy store purchase ecommerce checkout order retail',
  gift: 'present reward bonus offer surprise free giveaway birthday',
  coffee: 'break cafe drink morning pause tea chat',
  sun: 'day light bright summer weather morning sunny energy',
  moon: 'night dark sleep evening',
  cloud: 'weather storage hosting saas sky upload online',
  zap: 'energy power fast electric lightning quick speed performance instant',
  flame: 'fire hot burn trending popular urgent heat',
  leaf: 'nature green eco environment plant sustainable organic climate',
  trees: 'forest nature park outdoors environment woods',
  mountain: 'peak climb challenge summit hike outdoors obstacle',
  car: 'drive vehicle auto transport road commute traffic',
  plane: 'flight travel trip fly airport airline vacation',
  bike: 'bicycle cycle ride cycling',
  camera: 'photo picture image photography snapshot',
  music: 'song audio sound note tune band listen',
  book: 'read reading learn story library documentation guide manual',
  bookmark: 'save saved later reference remember',
  graduation: 'education school learn learning student degree university training course teach',
  megaphone: 'announce announcement marketing promote news campaign tell shout awareness pr',
  message: 'chat comment talk conversation feedback discuss discussion question say',
  bell: 'notification alert remind reminder ring notify',
  settings: 'gear config configuration preferences options setup process operations',
  wrench: 'fix repair tool maintenance adjust support',
  hammer: 'build construct construction make tool craft',
  shield: 'security secure protect protection safe safety defense privacy trust',
  lock: 'secure security private password locked protect encryption',
  key: 'access unlock password login credential important essential takeaway',
  search: 'find look discover research explore magnify investigate',
  compass: 'direction navigate strategy explore guide vision north',
  map: 'route plan journey location roadmap navigation path',
  idea: 'lightbulb insight innovation concept inspiration',
  puzzle: 'piece solve solution fit integration problem plugin',
  trophy: 'win winner award champion prize success victory achievement compete',
  award: 'medal prize recognition badge honor certificate achievement',
  smile: 'happy joy good positive satisfied fun delight',
  frown: 'sad unhappy bad negative disappointed pain',
  'thumbs-up': 'like approve yes good agree pro pros advantage benefit',
  'thumbs-down': 'dislike reject no bad disagree con cons disadvantage',
  warning: 'alert caution danger risk attention careful problem issue',
  check: 'done complete yes success ok approved correct tick finished',
  x: 'no cancel wrong error fail failure stop never remove',
  info: 'information about details note fyi',
  help: 'question faq support ask why how unknown',
  package: 'box product delivery bundle parcel release',
  truck: 'delivery shipping logistics transport freight supply',
  database: 'data storage sql records backend',
  server: 'hosting backend infrastructure rack datacenter cloud api',
  laptop: 'computer device work remote code software tech technology developer',
  phone2: 'mobile smartphone app device iphone android',
  printer: 'print paper document',
  scissors: 'cut trim edit snip reduce',
  brush: 'paint design art decorate style',
  palette: 'color design art theme creative brand',
  film: 'movie video cinema clip watch media',
  headphones: 'audio listen podcast music support',
  gamepad: 'game gaming play controller',
  dumbbell: 'fitness gym exercise workout strength training',
  apple: 'fruit food healthy nutrition diet',
  pizza: 'food lunch dinner slice party eat',
  beer: 'drink bar pub cheers celebrate party',
  baby: 'child kid infant newborn parent',
  dog: 'pet puppy animal',
  cat: 'pet kitten animal',
  bird: 'animal fly tweet',
  fish: 'animal sea ocean water',
  bug: 'insect error defect issue debug',
  flower: 'plant garden spring bloom nature',
};

const words = (text: string): string[] => text.toLowerCase().match(/[a-z0-9]+/g) ?? [];

/** Crude stemmer: enough to make "launching", "launched" and "launches" meet "launch". */
export function stem(word: string): string {
  let w = word;
  if (w.length > 4 && w.endsWith('ies')) return w.slice(0, -3) + 'y';
  for (const suffix of ['ing', 'ed']) {
    if (w.length > suffix.length + 2 && w.endsWith(suffix)) {
      w = w.slice(0, -suffix.length);
      // "shipping" -> "shipp" -> "ship", but leave "sell", "miss" alone.
      if (/([^aeiouls])\1$/.test(w)) w = w.slice(0, -1);
      return w;
    }
  }
  if (w.length > 4 && /(ch|sh|ss|x)es$/.test(w)) return w.slice(0, -2);
  if (w.length > 3 && w.endsWith('s') && !w.endsWith('ss')) return w.slice(0, -1);
  return w;
}

interface Entry {
  name: string;
  nameWords: string[];
  keywords: string[];
  /** Lucide's categories for it: how the library is grouped. */
  cats: string[];
}

const ENTRIES: Entry[] = Object.entries(KEYWORDS).map(([name, kw]) => ({ name, nameWords: words(name), keywords: words(kw), cats: [] }));
const CURATED = ENTRIES.length;

/** The categories the library is sorted into: id → name. */
let CATS: Record<string, string> = {};

/** The rest of the library, once it has loaded: every icon by name, with its tags (searched like keywords) and categories (how the picker groups them). */
export function addIconNames(names: string[], meta?: Record<string, [string[], string[]]>, cats?: Record<string, string>) {
  if (cats) CATS = cats;
  for (const name of names) ENTRIES.push({ name, nameWords: words(name), keywords: words((meta?.[name]?.[0] ?? []).join(' ')), cats: meta?.[name]?.[1] ?? [] });
  // The starter set learns its categories too.
  if (meta) for (const e of ENTRIES.slice(0, CURATED)) e.cats = meta[e.name]?.[1] ?? e.cats;
}

/** The library's categories, with how many icons each holds; only those with any, by name. */
export function iconCategories(): { id: string; name: string; count: number }[] {
  const counts = new Map<string, number>();
  for (const e of ENTRIES) for (const c of e.cats) counts.set(c, (counts.get(c) ?? 0) + 1);
  return Object.entries(CATS)
    .filter(([id]) => counts.get(id))
    .map(([id, name]) => ({ id, name, count: counts.get(id)! }))
    .sort((a, b) => a.name.localeCompare(b.name));
}

/** The icons in one category, the starter set's first. */
export const iconsIn = (category: string): string[] => ENTRIES.filter((e) => e.cats.includes(category)).map((e) => e.name);

/** How many icons can be searched right now. */
export const iconCount = () => ENTRIES.length;

/** stem -> [icon name, weight] for every starter icon that answers to it. */
const INDEX = new Map<string, [string, number][]>();
for (const e of ENTRIES.slice(0, CURATED)) {
  const add = (w: string, weight: number) => {
    const s = stem(w);
    if (!INDEX.has(s)) INDEX.set(s, []);
    if (!INDEX.get(s)!.some(([n]) => n === e.name)) INDEX.get(s)!.push([e.name, weight]);
  };
  for (const w of e.nameWords) add(w, 2);
  for (const w of e.keywords) add(w, 1);
}

/** Icons that suit some words, best first: the headline's count three times as much as the rest's. [] when nothing rings a bell. */
export function suggestIcons(title: string, bullets: string[] = [], limit = 5): string[] {
  const score = new Map<string, number>();
  const feed = (text: string, weight: number) => {
    for (const w of new Set(words(text).map(stem))) for (const [name, kw] of INDEX.get(w) ?? []) score.set(name, (score.get(name) ?? 0) + weight * kw);
  };
  feed(title, 3);
  feed(bullets.join(' '), 1);
  const order = (n: string) => ENTRIES.findIndex((e) => e.name === n);
  return [...score.entries()]
    .sort((a, b) => b[1] - a[1] || order(a[0]) - order(b[0]))
    .slice(0, limit)
    .map(([name]) => name);
}

/** Icons matching what was typed, best first: every word must begin a word of the icon's name or one of its keywords. Nothing typed gives the starter set. */
export function searchIcons(query: string, limit = 180): string[] {
  const q = words(query);
  if (!q.length) return ENTRIES.slice(0, CURATED).map((e) => e.name);
  const hits: [string, number][] = [];
  for (const e of ENTRIES) {
    let rank = 0;
    const ok = q.every((t) => {
      if (e.nameWords.some((w) => w.startsWith(t))) return true;
      rank++;
      return e.keywords.some((w) => w.startsWith(t) || stem(w) === stem(t));
    });
    if (ok) hits.push([e.name, rank]);
  }
  return hits.sort((a, b) => a[1] - b[1]).slice(0, limit).map(([name]) => name);
}

/**
 * Best first, for a completion (":ca" typed in words, kit/complete.ts): a name that is what was typed, then a name
 * with a word that is, then a name that starts with it, then a name with a word that does, then a tag that does;
 * ties by the shorter name, then by name. Typed hyphens part words ("thumbs-up"). With `alias`, a keyword that is
 * what was typed counts as a word of the name: an emoji's CLDR name is a description ("automobile") and its
 * keywords are what people call it (":car:"), where an icon's name is already short and its tags are loose.
 * The matches come back as their indexes.
 */
export function rankMatches(query: string, entries: readonly { nameWords: string[]; keywords: string[] }[], limit: number, alias = false): number[] {
  const q = query.toLowerCase().split(/[^\p{L}\p{N}]+/u).filter(Boolean);
  if (!q.length) return [];
  const key = q.join('-');
  const hits: [number, number, string][] = [];
  entries.forEach((e, i) => {
    const name = e.nameWords.join('-');
    const starts = (ws: string[]) => q.every((t) => ws.some((w) => w.startsWith(t)));
    const tier =
      name === key ? 0
      : q.length === 1 && (e.nameWords.includes(key) || (alias && e.keywords.includes(key))) ? 1
      : name.startsWith(key) ? 2
      : starts(e.nameWords) ? 3
      : starts([...e.nameWords, ...e.keywords]) ? 4
      : -1;
    if (tier >= 0) hits.push([i, tier, name]);
  });
  return hits
    .sort((a, b) => a[1] - b[1] || a[2].length - b[2].length || (a[2] < b[2] ? -1 : a[2] > b[2] ? 1 : 0))
    .slice(0, limit)
    .map(([i]) => i);
}

/** Icons for a completion, best first (rankMatches): the starter set until the rest of Lucide has joined. */
export const completeIcons = (query: string, limit = 8): string[] => rankMatches(query, ENTRIES, limit).map((i) => ENTRIES[i].name);
