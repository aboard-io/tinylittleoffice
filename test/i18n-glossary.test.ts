// Glossary drift: a product term said two ways in one language. For each language, each term of TERMS is aligned on
// the keys that are the term alone (its word in that language), and then looked for in every short key that holds it
// (test/glossary.ts says how). A term with two words, or a label that says it another way, fails, naming the term,
// the words and the keys, unless ALLOW lists it with a reason. ALLOW began as the nine translators' glossaries (round
// "languages", 2026-10-09: where a translator gave a term two words on purpose) and the senses they noted as other.
import { test, expect } from 'vitest';
import { join } from 'node:path';
import en from '../src/i18n/en.ts';
import { languageFiles } from '../scripts/i18n-extract.ts';
import { alone, drift, holds, says, stem, type Term } from './glossary.ts';

/** The product's terms, and the senses of their English words that are something else. */
export const TERMS: Term[] = [
  { term: 'document' },
  { term: 'link', not: [/quick links/i] },
  { term: 'short link' },
  { term: 'Display Link' },
  { term: 'template' },
  // A rate card, a birthday card, a title card, a flash card and a place card are things in a template, not the board's cards.
  { term: 'card', not: [/rate card|birthday card|title card|flash card|place card/i] },
  // "Slide" alone is a transition (the deck's "Slide in"); "Slides" alone is the Presentation Builder's short name.
  { term: 'slide', not: ['Slide', 'Slides'] },
  { term: 'sheet' },
  { term: 'cell' },
  { term: 'row' },
  // A page's columns (a layout of two columns, a left and a right column) are not a table's.
  { term: 'column', not: [/two.columns?|left column|right column|one column/i] },
  { term: 'page' },
  { term: 'bar' },
  { term: 'Share' },
  { term: 'Download' },
  { term: 'Undo' },
  { term: 'Redo' },
  { term: 'Keep' },
  { term: 'Kept' },
  { term: 'Forget' },
  { term: 'Private' },
  { term: 'Saved' },
  { term: 'password' },
  // A neon sign is a sign; a sign-up is a subscription.
  { term: 'sign', not: [/neon sign|sign-up/i] },
  // The signing key. The Calculator's keys are keys of a keyboard; an animation's key is a keyframe.
  { term: 'key', not: ['Keys', /arrow keys|add a key here|key at \{s\}|remove this key/i] },
  // "Present" is to show a deck; "a present" is a gift.
  { term: 'Present', not: [/a present\b/i] },
  { term: 'Insert' },
  { term: 'Look' },
  // "Paper" alone is a colour of the looks; "Paper: {paper}" is the size of the paper.
  { term: 'paper', not: ['Paper'] },
  { term: 'Print' },
  // A copy of a document: the noun, where Copy alone is the verb.
  { term: 'Copy', not: [/copy of/i] },
  { term: 'Paste' },
  // The page's theme (light, dark); "the theme" of a document's colours is its look.
  { term: 'Theme', not: [/theme's colour|as the theme is/i] },
  { term: 'signature' },
  { term: 'footnote' },
  // An org chart and a seating chart are diagrams of their own; "to chart" is to draw.
  { term: 'chart', not: [/org chart|seating chart|nothing to chart/i] },
  // A Kanban stage; the animation's stage is a theatre's.
  { term: 'stage', not: [/an empty stage/i] },
];

/** Drift a language has on purpose: the term, the key (none: the term's two words), and why. */
const ALLOW: { lang: string; term: string; key?: string; why: string }[] = [
  // The translators' glossaries.
  { lang: 'de', term: 'Download', key: 'Download everything', why: 'glossary: Download as a noun and the button, herunterladen as the verb' },
  { lang: 'de', term: 'Download', key: 'Download everything (.zip)', why: 'glossary: herunterladen as the verb' },
  { lang: 'de', term: 'Download', key: 'Download the .{ext}', why: 'glossary: herunterladen as the verb' },
  { lang: 'it', term: 'Download', key: 'Download failed', why: 'the noun: Italian says "il download", Scarica is the verb on the button' },
  { lang: 'pt-br', term: 'Download', key: 'Download failed', why: 'the noun: Portuguese says "o download", Baixar is the verb on the button' },
  // A verb that splits or bends round its object.
  { lang: 'de', term: 'Insert', key: 'No stages. Insert a stage.', why: 'einfügen is a separable verb: "Füge … ein"' },
  { lang: 'de', term: 'Insert', key: 'Insert a place by name.', why: 'einfügen is a separable verb: "Füge … ein"' },
  { lang: 'nl', term: 'Insert', key: 'No stages. Insert a stage.', why: 'invoegen is a separable verb: "Voeg … in"' },
  { lang: 'nl', term: 'Insert', key: 'Insert a place by name.', why: 'invoegen is a separable verb: "Voeg … in"' },
  { lang: 'pt-br', term: 'Insert', key: 'No stages. Insert a stage.', why: 'the imperative of inserir is insira' },
  { lang: 'pt-br', term: 'Insert', key: 'Insert a place by name.', why: 'the imperative of inserir is insira' },
  { lang: 'nl', term: 'Print', key: 'See the sheets to print', why: 'afdrukken is a separable verb: "af te drukken"' },
  { lang: 'fr', term: 'chart', key: 'Chart, scrolls sideways', why: 'a Gantt chart: in French a diagramme de Gantt' },
  { lang: 'ar', term: 'sign', key: 'Sign this contract', why: 'وقّع is the imperative of the verb whose noun is توقيع' },
  { lang: 'zh-hans', term: 'sign', key: 'Sign this contract', why: 'a contract is 签署, signed as a party; 签名 is a signature' },
  // Counted things: Japanese counts cards with 枚 and does not say the word.
  { lang: 'ja', term: 'card', key: '{n} cards, limit {limit}', why: 'counted with the counter 枚, the word left out' },
  { lang: 'ja', term: 'card', key: '{n} cards, over the limit of {limit}', why: 'counted with the counter 枚, the word left out' },
  { lang: 'zh-hans', term: 'slide', key: 'Slide {n} of {total}', why: 'counted with the counter 张 (第 {n} 张，共 {total} 张), the word left out' },
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

test('the lint finds a term said two ways, and a label that says it otherwise', () => {
  const base = { Share: 'Share', 'Share this': 'Share this', 'Share the link': 'Share the link', 'Share it with everyone you know today': '' };
  const es = { Share: 'Compartir', 'Share this': 'Comparte esto', 'Share the link': 'Enviar el enlace', 'Share it with everyone you know today': 'Mándalo a todos' };
  const [d] = drift(base, es, [{ term: 'Share' }]);
  expect([...d.words.keys()]).toEqual(['Compartir']);
  expect(d.elsewhere).toEqual([{ key: 'Share the link', value: 'Enviar el enlace' }]);
  const two = drift({ Share: '', 'Share…': '' }, { Share: 'Compartir', 'Share…': 'Enviar…' }, [{ term: 'Share' }])[0];
  expect([...two.words]).toEqual([
    ['Compartir', ['Share']],
    ['Enviar', ['Share…']],
  ]);
});

const files = languageFiles(join(import.meta.dirname, '..')).filter(([code]) => code !== 'en');

for (const [lang, path] of files) {
  test(`${lang}: each product term said one way`, async () => {
    const strings = (await import(/* @vite-ignore */ path)).default as Record<string, string>;
    const problems: string[] = [];
    const used = new Set<string>();
    for (const d of drift(en, strings, TERMS)) {
      if (d.words.size > 1) {
        if (allowed(lang, d.term)) used.add(`${d.term}|`);
        else problems.push(`"${d.term}" is said two ways: ${[...d.words].map(([w, keys]) => `"${w}" (${keys.join(', ')})`).join(' and ')}`);
      }
      const word = [...d.words.keys()].map((w) => `"${w}"`).join(' or ');
      for (const e of d.elsewhere) {
        if (allowed(lang, d.term, e.key)) used.add(`${d.term}|${e.key}`);
        else problems.push(`"${d.term}" is ${word}, but "${e.key}" → "${e.value}" says neither`);
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
