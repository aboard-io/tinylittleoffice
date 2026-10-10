// The glossary lint's parts (test/i18n-glossary.test.ts runs them): each product term of the English, the words a
// language uses for it, and where a language says it another way.
//
// How a term's words are found: the keys that are the term alone ("Share", "Share…", "Slides", "Key:") give the
// language's word for it (alignment on one-term keys). Two words for one term there is drift. Then every short key
// that holds the term as a word (a label, a button, a menu row: at most SHORT words) is looked at: its translation
// should hold one of those words, matched by its stem (the word less its last few letters, so a plural, a gender or a
// verb's ending still matches; any substring for a script without spaces, so a compound or an Arabic article still
// matches). A sentence is left out: a sentence is free to say a thing as the language says it.

/** A term of the product: its English word, the senses of that word that are not the term (keys or patterns), and why. */
export interface Term {
  term: string;
  /** Keys (exactly) or patterns of keys where the word means something else: "Slide" is a transition, "Neon sign" a sign. */
  not?: (string | RegExp)[];
}

/** Keys of at most this many words are labels; longer ones are sentences and are not looked in. */
export const SHORT = 5;

/** Words without placeholders: a plural's forms are words ({n|one card|# cards}: one card cards), a name is not. */
const bare = (s: string) => s.replace(/\{\w+\|([^}]*)\}/g, (_, f: string) => ` ${f.replace(/[|#]/g, ' ')} `).replace(/\{[^}]*\}/g, ' ');
const words = (s: string) =>
  bare(s)
    .split(/[^\p{L}\p{N}'’-]+/u)
    .filter(Boolean);
/** A word without its placeholders, spaces, numbers, signs and the ordinal round a number (第 {n} 页: 页). */
const core = (s: string) => [...bare(s).replace(/[\s\p{N}\p{P}第目]/gu, '')];
/** How many words a key is, a plural read in its last form. */
const length = (key: string) => words(key.replace(/\{\w+\|([^}]*)\}/g, (_, f: string) => f.split('|').pop()!.replace(/#/g, ' '))).length;
const CJK = /[\p{Script=Han}\p{Script=Hiragana}\p{Script=Katakana}]/u;

/** A key with the term alone: "Share", "Share…", "Key {fp}", "Paper:" (case aside; a plural is a longer key). */
export function alone(key: string, term: string): boolean {
  const k = bare(key)
    .replace(/[…:.]+$/u, '')
    .replace(/[…:.]+\s*$/u, '')
    .trim()
    .toLowerCase();
  const t = term.toLowerCase();
  return k === t;
}

/** Whether a key holds the term as a word or words (a plural "s" allowed). */
export function holds(key: string, term: string): boolean {
  const t = term.toLowerCase().replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  return new RegExp(`(^|[^\\p{L}])${t}s?($|[^\\p{L}])`, 'iu').test(bare(key));
}

const excluded = (key: string, t: Term) => !!t.not?.some((n) => (typeof n === 'string' ? n === key : n.test(key)));

/** A word's stem, for a script that spaces its words: lower case, the last letters off a long word (a plural, a gender, a verb's ending). */
export function stem(word: string): string {
  const w = word
    .toLowerCase()
    .replace(/^[^\p{L}\p{N}]+|[^\p{L}\p{N}]+$/gu, '')
    .replace(/['’]s$/u, '');
  if (w.length <= 3) return w;
  return w.slice(0, Math.max(3, w.length - 3));
}

/** An Arabic word's letters that carry its root: the article and the long vowels, hamza seats and endings out (رابط and روابط are both ربط). */
const root = (w: string) =>
  w
    .replace(/^(وال|بال|لل|ال)/u, '')
    .replace(/[أإآ]/gu, 'ا')
    .replace(/(ات|ة)$/u, '')
    .replace(/[اويىئؤءً-ْ]/gu, '');
const inOrder = (needle: string, hay: string) => {
  let i = 0;
  for (const ch of hay) if (ch === needle[i]) i++;
  return i === needle.length;
};

/** Whether a translation says a word: by stem where words are spaced, by a character pair (or the one character) in Chinese and Japanese, by root in Arabic. */
export function says(value: string, word: string): boolean {
  const v = bare(value).toLowerCase();
  const w = bare(word).trim().toLowerCase();
  if (CJK.test(w)) {
    // The ordinal round a number is not the word (第 {n} 行, {n}行目: 行).
    const cs = core(w).filter((c) => !/\p{Script=Latin}/u.test(c));
    if (cs.length < 2) return cs.length === 1 && v.includes(cs[0]);
    return cs.slice(1).some((c, i) => v.includes(cs[i] + c));
  }
  if (/\p{Script=Arabic}/u.test(w)) {
    const vs = words(v).map(root);
    return words(w).every((p) => root(p).length < 2 || vs.some((x) => inOrder(root(p), x)));
  }
  const parts = words(w).filter((p) => p.length >= 3);
  if (!parts.length) return v.includes(w);
  return parts.every((p) => v.includes(stem(p)));
}

/** Two words for one term are the same word when either's stems are in the other (Diapositiva, Diapositivas). */
const same = (a: string, b: string) => says(a, b) || says(b, a);

export interface Drift {
  term: string;
  /** The words used for the term alone, each with the keys it was found on. */
  words: Map<string, string[]>;
  /** Short keys that hold the term but whose translation says none of its words. */
  elsewhere: { key: string; value: string }[];
}

/** One language's drift: for each term, its words (more than one is drift) and the short keys that say it otherwise. */
export function drift(en: Record<string, string>, strings: Record<string, string>, terms: Term[]): Drift[] {
  const out: Drift[] = [];
  for (const t of terms) {
    const found = new Map<string, string[]>();
    for (const key of Object.keys(en)) {
      if (!alone(key, t.term) || excluded(key, t) || !strings[key]) continue;
      const value = bare(strings[key])
        .replace(/[…:：]+\s*$/u, '')
        .trim();
      const like = [...found.keys()].find((w) => same(w, value));
      if (!like) found.set(value, [key]);
      else if (core(value).length < core(like).length) {
        // The shorter of two forms of one word stands for it (页 for 页面, 第 {n} 页): it is found in more.
        const keys = found.get(like)!;
        found.delete(like);
        found.set(value, [...keys, key]);
      } else found.get(like)!.push(key);
    }
    if (!found.size) continue;
    const elsewhere: { key: string; value: string }[] = [];
    for (const key of Object.keys(en)) {
      if (alone(key, t.term) || !holds(key, t.term) || excluded(key, t) || length(key) > SHORT || !strings[key]) continue;
      if (![...found.keys()].some((w) => says(strings[key], w))) elsewhere.push({ key, value: strings[key] });
    }
    out.push({ term: t.term, words: found, elsewhere });
  }
  return out;
}
