// Glossary drift: a product term said two ways in one language. For each language, each term of TERMS is aligned on
// the messages whose English is the term alone (its word in that language), and then looked for in every short message
// that holds it (test/glossary.ts says how). A term with two words, or a label that says it another way, fails, naming
// the term, the words and the ids, unless ALLOW lists it, by id, with a reason. ALLOW began as the nine translators' glossaries (round
// "languages", 2026-10-09: where a translator gave a term two words on purpose) and the senses they noted as other.
import { test, expect } from 'vitest';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { languageFiles } from '../scripts/i18n-extract.ts';
import { flatMessages } from '../scripts/ftl.ts';
import { alone, drift, holds, says, stem } from './glossary.ts';
import { TERMS } from '../scripts/terms.ts';

const en = flatMessages(readFileSync(join(import.meta.dirname, '../src/i18n/en.ftl'), 'utf8'), 'en');

/** Drift a language has on purpose: the term, the message's id (none: the term's two words), and why. */
const ALLOW: { lang: string; term: string; key?: string; why: string }[] = [
  // The translators' glossaries.
  { lang: 'de', term: 'Download', key: 'export-download-ext', why: 'glossary: herunterladen as the verb' },
  { lang: 'it', term: 'Download', key: 'download-failed', why: 'the noun: Italian says "il download", Scarica is the verb on the button' },
  { lang: 'pt-br', term: 'Download', key: 'download-failed', why: 'the noun: Portuguese says "o download", Baixar is the verb on the button' },
  // A verb that splits or bends round its object.
  { lang: 'de', term: 'Insert', key: 'trip-insert-place-by-name', why: 'einfügen is a separable verb: "Füge … ein"' },
  { lang: 'nl', term: 'Insert', key: 'trip-insert-place-by-name', why: 'invoegen is a separable verb: "Voeg … in"' },
  { lang: 'pt-br', term: 'Insert', key: 'trip-insert-place-by-name', why: 'the imperative of inserir is insira' },
  { lang: 'fr', term: 'chart', key: 'cal-chart-scrolls-sideways', why: 'a Gantt chart: in French a diagramme de Gantt' },
  // Counted things: Japanese counts cards with 枚 and does not say the word.
  { lang: 'zh-hans', term: 'slide', key: 'deck-slide-n-of-total', why: 'counted with the counter 张 (第 {n} 张，共 {total} 张), the word left out' },
];

const allowed = (lang: string, term: string, key?: string) => ALLOW.some((a) => a.lang === lang && a.term === term && a.key === key);

test('the matcher: a term alone, a term held, a word found by its stem, by a character pair, by its root', () => {
  expect(alone('Share…', 'Share')).toBe(true);
  expect(alone('Key {fp}', 'key')).toBe(true);
  expect(alone('Slides', 'slide')).toBe(false);
  expect(holds('Move slide up', 'slide')).toBe(true);
  expect(holds('Show as slides', 'slide')).toBe(true);
  expect(holds('Slideshow', 'slide')).toBe(false);
  expect(holds('Open {link}', 'link')).toBe(false);
  expect(stem('Diapositivas')).toBe('diapositi');
  expect(says('Mostrar como diapositivas', 'Diapositiva')).toBe(true);
  expect(says('Copier le lien d’affichage', 'Lien d’affichage')).toBe(true);
  expect(says('Righe', 'Riga')).toBe(true);
  expect(says('Exportar URL', 'enlace')).toBe(false);
  expect(says('显示为幻灯片', '第 {n} 张幻灯片')).toBe(true);
  expect(says('上の行', '{n}行目')).toBe(true);
  expect(says('الروابط القصيرة', 'رابط قصير')).toBe(true);
  expect(says('الأعمدة', 'العمود')).toBe(true);
});

test('the matcher in the scripts of the second nine: two words that match and one that does not, per script', () => {
  // Devanagari (Hindi): by stem, a vowel sign and a virama kept with their consonant.
  expect(stem('टेम्पलेट')).toBe('टेम्पले');
  expect(says('दस्तावेज़ों की सूची', 'दस्तावेज़')).toBe(true);
  expect(says('पंक्तियाँ जोड़ें', 'पंक्ति')).toBe(true);
  expect(says('लिंक कॉपी करें', 'दस्तावेज़')).toBe(false);
  // Bengali: the same.
  expect(says('ডকুমেন্টগুলো খুলুন', 'ডকুমেন্ট')).toBe(true);
  expect(says('নতুন সারি', 'সারি')).toBe(true);
  expect(says('লিংক কপি করুন', 'সারি')).toBe(false);
  // Korean: the first syllable block or two, the particle off the end.
  expect(stem('슬라이드를')).toBe('슬라');
  expect(says('링크를 복사', '링크')).toBe(true);
  expect(says('슬라이드 추가', '슬라이드')).toBe(true);
  expect(says('문서 열기', '템플릿')).toBe(false);
  // Urdu: an Arabic-derived word by its root (صفحہ, صفحات: صفح), and so an English one with no long vowel (لنک in لنکس).
  expect(says('صفحات', 'صفحہ')).toBe(true);
  expect(says('لنکس کاپی کریں', 'لنک')).toBe(true);
  // A Hindustani word by its stem alone: کھولیں's root کھلں is not in کھولنا's کھلن, but its stem کھو is in کھولنا.
  expect(stem('کھولیں')).toBe('کھو');
  expect(says('کھولنا', 'کھولیں')).toBe(true);
  // Neither: no root and no stem, with Urdu's letters and without.
  expect(says('لنکس کاپی کریں', 'کھولیں')).toBe(false);
  expect(says('صفحات', 'فائل')).toBe(false);
  // Traditional Chinese: by a character pair.
  expect(says('顯示為投影片', '第 {n} 張投影片')).toBe(true);
  expect(says('複製連結', '連結')).toBe(true);
  expect(says('複製連結', '範本')).toBe(false);
  // Cyrillic (Russian, Ukrainian) and Polish, Haitian Creole: by stem.
  expect(says('Скопировать ссылку', 'Ссылка')).toBe(true);
  expect(says('Копіювати посилання', 'Посилання')).toBe(true);
  expect(says('Kopiuj link', 'Szablon')).toBe(false);
});

test('the lint finds a term said two ways, and a label that says it otherwise', () => {
  const base = { 'x-share': 'Share', 'x-share-this': 'Share this', 'x-share-link': 'Share the link', 'x-share-everyone': 'Share it with everyone you know today' };
  const es = { 'x-share': 'Compartir', 'x-share-this': 'Comparte esto', 'x-share-link': 'Enviar el enlace', 'x-share-everyone': 'Mándalo a todos' };
  const [d] = drift(base, es, [{ term: 'Share' }]);
  expect([...d.words.keys()]).toEqual(['Compartir']);
  expect(d.elsewhere).toEqual([{ id: 'x-share-link', key: 'Share the link', value: 'Enviar el enlace' }]);
  const two = drift({ 'x-share': 'Share', 'x-share-more': 'Share…' }, { 'x-share': 'Compartir', 'x-share-more': 'Enviar…' }, [{ term: 'Share' }])[0];
  expect([...two.words]).toEqual([
    ['Compartir', ['x-share']],
    ['Enviar', ['x-share-more']],
  ]);
});

const files = languageFiles(join(import.meta.dirname, '..')).filter(([code]) => code !== 'en');

for (const [lang, path] of files) {
  test(`${lang}: each product term said one way`, async () => {
    const strings = flatMessages(readFileSync(path, 'utf8'), lang);
    const problems: string[] = [];
    const used = new Set<string>();
    for (const d of drift(en, strings, TERMS, lang)) {
      if (d.words.size > 1) {
        if (allowed(lang, d.term)) used.add(`${d.term}|`);
        else problems.push(`"${d.term}" is said two ways: ${[...d.words].map(([w, ids]) => `"${w}" (${ids.join(', ')})`).join(' and ')}`);
      }
      const word = [...d.words.keys()].map((w) => `"${w}"`).join(' or ');
      for (const e of d.elsewhere) {
        if (allowed(lang, d.term, e.id)) used.add(`${d.term}|${e.id}`);
        else problems.push(`"${d.term}" is ${word}, but ${e.id} "${e.key}" → "${e.value}" says neither`);
      }
    }
    expect(problems, `${lang}: say each term one way, or list it in ALLOW with the reason`).toEqual([]);
    const stale = ALLOW.filter((a) => a.lang === lang && !used.has(`${a.term}|${a.key ?? ''}`));
    expect(
      stale.map((a) => `${a.term}: ${a.key ?? '(two words)'}`),
      `${lang}: allowed and no longer drifting; take them out of ALLOW`,
    ).toEqual([]);
  });
}
