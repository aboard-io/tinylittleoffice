// The strings: t() fills placeables and plurals from Fluent's messages; every id the code uses is in en.ftl.
import { test, expect } from 'vitest';
import { readFileSync, readdirSync } from 'node:fs';
import { join } from 'node:path';
import { t, addStrings, register, setLanguage, browserLanguage, directionOf, languages } from '../src/kit/core/i18n.ts';
import { apply, commandKeys, englishHash, languageFiles, main, placeholders, rulesFor, sheet, usedKeys, withMissing, work, MARK } from '../scripts/i18n-extract.ts';
import { flatMessages, readFtl } from '../scripts/ftl.ts';
import { british } from './british.ts';
import { bare, LIBRARY_APPS } from '../scripts/ftl-plugin.ts';

const root = join(import.meta.dirname, '..');
const en = flatMessages(readFileSync(join(root, 'src/i18n/en.ftl'), 'utf8'), 'en');
function* sources(dir: string): Generator<string> {
  for (const f of readdirSync(dir, { withFileTypes: true })) {
    const p = join(dir, f.name);
    if (f.isDirectory()) yield* sources(p);
    else if (/\.ts$/.test(f.name) && !/\.test\.ts$/.test(f.name) && !p.includes(join('src', 'i18n'))) yield p;
  }
}

test('placeables and plurals, in English', () => {
  expect(t('download-downloaded-name', { name: 'a.pdf' })).toBe('Downloaded a.pdf');
  expect(t('example-n-slides', { n: 1 })).toBe('one slide');
  expect(t('example-n-slides', { n: 3 })).toBe('3 slides');
  expect(t('example-n-slides', { n: 1234 })).toBe('1,234 slides');
  // A count given as words is its number.
  expect(t('example-n-slides', { n: '1234' })).toBe('1,234 slides');
  expect(t('shell-n-of-max-link-characters', { n: 1500, max: 2000 })).toBe('1,500 of 2,000 link characters left');
  // A placeable with nothing to fill shows its name, so the gap can be seen; an id English lacks is itself.
  expect(t('download-downloaded-name')).toBe('Downloaded {name}');
  expect(t('no-such-message')).toBe('no-such-message');
  // No bidi marks round a placeable: the page takes the language's direction.
  expect(t('download-downloaded-name', { name: 'a.pdf' })).not.toMatch(/[⁨⁩]/);
});

test('another language: its words, its plural forms, its number', async () => {
  register(
    'pl',
    `example-n-slides = { $n ->
        [one] { $n } slajd
        [few] { $n } slajdy
        [many] { $n } slajdów
       *[other] { $n } slajdu
    }
drawer-find-app-template-or-command = Znajdź aplikację
`,
  );
  await setLanguage('pl');
  expect(t('drawer-find-app-template-or-command')).toBe('Znajdź aplikację');
  expect(t('example-n-slides', { n: 1 })).toBe('1 slajd');
  expect(t('example-n-slides', { n: 3 })).toBe('3 slajdy');
  expect(t('example-n-slides', { n: 5 })).toBe('5 slajdów');
  expect(t('example-n-slides', { n: 1.5 })).toBe('1,5 slajdu');
  // A message the language lacks is said in English.
  expect(t('shell-menu')).toBe('Menu');
  await setLanguage(null);
  expect(t('drawer-find-app-template-or-command')).toBe('Find app, template, or command');
});

test('an outside app’s words are added beside the site’s, to English and to a language loaded before or after, and replace none', async () => {
  addStrings('en', 'tally-name = Tally\ntally-n-marks = { $n ->\n    [one] one mark\n   *[other] { $n } marks\n}\nshell-menu = Not the menu\n');
  expect([t('tally-name'), t('tally-n-marks', { n: 3 }), t('shell-menu')]).toStrictEqual(['Tally', '3 marks', 'Menu']);
  // Loaded later: a language whose file arrives after the words were added to it gets them with its own.
  let fetched = 0;
  register('sv', async () => (fetched++, 'shell-menu = Meny\n'));
  addStrings('sv', 'tally-name = Räkning\n');
  expect(fetched).toBe(0);
  await setLanguage('sv');
  expect([t('shell-menu'), t('tally-name'), t('tally-n-marks', { n: 1 })]).toStrictEqual(['Meny', 'Räkning', 'one mark']);
  // Loaded already: added at once, and an id the language has keeps its message.
  addStrings('sv', 'tally-n-marks = { $n } streck\nshell-menu = Inte menyn\n');
  expect([t('tally-n-marks', { n: 2 }), t('shell-menu')]).toStrictEqual(['2 streck', 'Meny']);
  await setLanguage(null);
  // A code the site has no file for is no language for the words added to it.
  addStrings('tlh', 'tally-name = Qagh\n');
  expect(languages()).not.toContain('tlh');
});

test('the browser language is matched to what is present', () => {
  register('pt-br', '');
  expect(languages()).toContain('pt-br');
  expect(browserLanguage(['pt-BR', 'en'])).toBe('pt-br');
  expect(browserLanguage(['pt', 'en'])).toBe('en');
  expect(browserLanguage(['pt-PT'])).toBe('en');
  expect(browserLanguage(['PL-pl'])).toBe('pl');
  expect(browserLanguage(['xx'])).toBe('en');
  expect(browserLanguage([])).toBe('en');
});

test('the browser language of the second nine and Hebrew and Yiddish: each code itself, a Chinese tag by its script', () => {
  for (const code of ['ru', 'uk', 'pl', 'bn', 'hi', 'ur', 'ht', 'ko', 'he', 'yi', 'zh-hant', 'zh-hans']) register(code, '');
  for (const code of ['ru', 'uk', 'pl', 'bn', 'hi', 'ur', 'ht', 'ko', 'he', 'yi']) {
    expect(browserLanguage([code]), code).toBe(code);
    expect(browserLanguage([`${code}-${code === 'ur' ? 'PK' : code === 'ko' ? 'KR' : code === 'he' ? 'IL' : 'US'}`]), code).toBe(code);
  }
  for (const tag of ['zh-TW', 'zh-HK', 'zh-MO', 'zh-Hant', 'zh-Hant-TW', 'zh-Hant-HK', 'zh-hant']) expect(browserLanguage([tag, 'en']), tag).toBe('zh-hant');
  for (const tag of ['zh-CN', 'zh-SG', 'zh', 'zh-Hans', 'zh-Hans-CN', 'zh-Hans-SG']) expect(browserLanguage([tag, 'en']), tag).toBe('zh-hans');
  expect(browserLanguage(['xx', 'zh-TW'])).toBe('zh-hant');
  expect(browserLanguage(['sr-Latn'])).toBe('en');
});

test('which way a language runs', () => {
  expect(directionOf('en')).toBe('ltr');
  expect(directionOf('ar')).toBe('rtl');
  expect(directionOf('ur')).toBe('rtl');
  expect(directionOf('ur-PK')).toBe('rtl');
  for (const code of ['ru', 'uk', 'pl', 'bn', 'hi', 'ht', 'ko', 'zh-hant']) expect(directionOf(code), code).toBe('ltr');
  expect(directionOf('he-IL')).toBe('rtl');
  expect(directionOf('he')).toBe('rtl');
  expect(directionOf('yi')).toBe('rtl');
  expect(directionOf('not a tag at all!!')).toBe('ltr');
});

test('every id the code uses is in en.ftl, and every id is kebab-case, once', () => {
  const used = new Set<string>();
  for (const f of sources(join(root, 'src'))) for (const k of usedKeys(readFileSync(f, 'utf8'))) used.add(k);
  expect(used.size).toBeGreaterThan(20);
  expect([...used].filter((k) => !(k in en))).toEqual([]);
  const ids = readFtl(readFileSync(join(root, 'src/i18n/en.ftl'), 'utf8'), 'en').entries.map((e) => e.id);
  expect(new Set(ids).size).toBe(ids.length);
  expect(ids.filter((id) => !/^[a-z][a-z0-9]*(-[a-z0-9]+)+$/.test(id))).toEqual([]);
});

test('npm run i18n:check passes: every id the code and the command files use is in en.ftl, and every language is safe to merge', () => {
  expect(main(root, true)).toBe(0);
});

test('a command file’s words are ids without t(): a label, hint, heading or letter given as a string always, any other string only when en.ftl has it', () => {
  const src = `cmd('bold', 'bar-bold', { heading: "editor-marks", keys: 'Mod+B' }); block('title', 'title', 'common-title', UI.text); cmd('x', (c) => t('look'), {})`;
  expect(commandKeys(src, new Set(['common-title', 'bar-bold']))).toEqual(['editor-marks', 'bar-bold', 'common-title']);
});

test('the extractor reads t() calls, and appends what is new at the end under the mark, its English to write', () => {
  expect(usedKeys(`t('a-b'); t("c-d"); t(\`e-f\`); not(t); t(name)`)).toEqual(['a-b', 'c-d', 'e-f']);
  expect(placeholders('{n|one|# many} of {max}')).toEqual(['max', 'n']);
  const file = '## a\n\na-one = A\n';
  const once = withMissing(file, ['b-two', 'c-three']);
  expect(once).toContain(MARK);
  const read = readFtl(once, 'en');
  expect(read.entries.map((e) => [e.id, e.flat, e.group, !!e.draft])).toEqual([
    ['a-one', 'A', 'a', false],
    ['b-two', 'b-two', MARK.slice(3), true],
    ['c-three', 'c-three', MARK.slice(3), true],
  ]);
  // A second time, under the same mark, after what was there.
  const twice = withMissing(once, ['d-four']);
  expect(twice.split(MARK).length).toBe(2);
  expect(readFtl(twice, 'en').entries.map((e) => e.id)).toEqual(['a-one', 'b-two', 'c-three', 'd-four']);
  expect(withMissing(file, [])).toBe(file);
});

test('every language file has every id en.ftl has, and no English string is British (Paul, 2026-10-11: "American English")', () => {
  const ids = Object.keys(en).sort();
  for (const [code, path] of languageFiles(root)) {
    const have = new Set(Object.keys(flatMessages(readFileSync(path, 'utf8'), code)));
    expect(
      ids.filter((k) => !have.has(k)),
      code,
    ).toEqual([]);
  }
  expect(Object.values(en).flatMap((s, i) => british(s, `en ${i}`))).toEqual([]);
  // And the list knows a British string when it sees one.
  expect(british('Colour for new: {colour}', 'x')).toHaveLength(1);
});

test('a language as a page fetches it is its file without its comments, and says every message the same', () => {
  for (const [code, path] of languageFiles(root)) {
    const source = readFileSync(path, 'utf8');
    const shipped = bare(source);
    expect(shipped, code).not.toMatch(/^#/m);
    expect(flatMessages(shipped, code), code).toEqual(flatMessages(source, code));
  }
});

test('the site’s build leaves out the messages of the library’s own apps, whole, and keeps every other; the library’s keeps them', async () => {
  // The library's own apps are the apps under src/apps/ the site does not list (scripts/ftl-plugin.ts LIBRARY_APPS).
  const { apps } = await import('../src/kit/core/apps.ts');
  const site = new Set(apps().map((a) => a.id));
  expect(readdirSync(join(root, 'src/apps')).filter((a) => !site.has(a))).toStrictEqual(LIBRARY_APPS);
  for (const [code, path] of languageFiles(root)) {
    const source = readFileSync(path, 'utf8');
    const all = flatMessages(source, code);
    const library = (id: string) => LIBRARY_APPS.some((a) => id.startsWith(`${a}-`));
    expect(Object.keys(all).filter(library).length, code).toBeGreaterThan(30);
    // A plural's lines go with its id's.
    expect(flatMessages(bare(source, false), code), code).toEqual(Object.fromEntries(Object.entries(all).filter(([id]) => !library(id))));
    expect(bare(source, false), code).not.toMatch(/^\s+\[one\][^\n]*card/m);
    expect(flatMessages(bare(source, true), code), code).toEqual(all);
  }
});

// The loop for translating in bulk (Paul, 2026-10-15, on holding the state of 21 files in a head: "avoid loading and
// unloading tons of context every time we update translations"): --work says what each language has to do and nothing
// else, --apply writes the words back where they go, and the check confirms them.
const EN = `### The strings, in English.

## the shell

shell-menu = Menu
# A verb: the button that saves.
common-save = Save
common-document = Document
common-n-slides = { $n ->
        [one] one slide
       *[other] { $n } slides
    }

## the Outliner

outline-agenda = Agenda
outline-due-date = Due date
`;
const FR = `### Tiny Little Office en français.

## the shell

# same
# en: ${englishHash('Menu')}
shell-menu = Menu
# en: ${englishHash('Save it')}
common-save = Garder
# same
# en: ${englishHash('Document')}
common-document = Document
# en: ${englishHash('{n|one slide|# slides}')}
common-n-slides = { $n ->
        [one] une diapositive
        [many] { $n } diapositives
       *[other] { $n } diapositives
    }

## the Outliner

# en: ${englishHash('Due date')}
outline-due-date = Échéance
`;

test('--work: the messages a language lacks or whose English moved, with their comment, group, old words and plural forms; its head, rules and terms', () => {
  const doc = `## For a translator\n\n- **French:** \`vous\`; the infinitive on buttons.\n- **German:** \`du\`.\n`;
  const list = work(EN, FR, 'fr', { 'common-save': 'Save it' }, doc);
  expect(list.head).toEqual(['Tiny Little Office en français.']);
  expect(list.rules).toBe('`vous`; the infinitive on buttons.');
  expect(list.terms).toEqual({ document: 'Document', save: 'enregistrer' });
  expect(list.todo).toEqual([
    { id: 'outline-agenda', en: 'Agenda', group: 'the Outliner' },
    { id: 'common-save', en: 'Save', comment: ['A verb: the button that saves.'], group: 'the shell', old: 'Garder', was: 'Save it' },
  ]);
  expect(work(EN, FR, 'fr').todo.map((w) => w.id)).toEqual(['outline-agenda', 'common-save']);
  // A plural to do says the language's forms.
  expect(work(EN, FR.replace(/# en: .*\ncommon-n-slides[\s\S]*?\n    \}\n/, ''), 'fr').todo[0]).toMatchObject({ id: 'common-n-slides', forms: ['one', 'many', 'other'] });
  expect(rulesFor('de', doc)).toBe('`du`.');
  expect(rulesFor('xx', doc)).toBeUndefined();
});

test('--apply: a message the language has is replaced where it stands, a new one goes where en.ftl puts it, each hashed; a file that would fail is not returned', () => {
  const r = apply(EN, FR, 'fr', { 'common-save': 'Enregistrer', 'outline-agenda': { text: 'Agenda', same: true } });
  expect(r.errors).toEqual([]);
  expect(r.written).toEqual(['common-save', 'outline-agenda']);
  const out = r.source!;
  // Replaced in place, its hash the English's now.
  expect(out).toContain(`shell-menu = Menu\n# en: ${englishHash('Save')}\ncommon-save = Enregistrer\n# same\n# en: ${englishHash('Document')}\ncommon-document = Document`);
  // New, after the message before it in en.ftl's order that the file has: the group's heading, since it is the group's first.
  expect(out).toContain(`## the Outliner\n\n# same\n# en: ${englishHash('Agenda')}\noutline-agenda = Agenda\n# en: ${englishHash('Due date')}\noutline-due-date = Échéance`);
  // The result passes the check, and nothing else moved.
  expect(out.split('\n').length).toBe(FR.split('\n').length + 3);
  expect(apply(EN, out, 'fr', {}).errors).toEqual([]);
  // A translation that loses the placeable, or a message en.ftl lacks, is refused and the file is not returned.
  expect(apply(EN, FR, 'fr', { 'common-n-slides': '{n|une diapo|# diapos|# diapos}' }).errors).toEqual([]);
  const bad = apply(EN, FR, 'fr', { 'common-n-slides': 'des diapositives', 'no-such': 'x' });
  expect(bad.source).toBeUndefined();
  expect(bad.errors.some((e) => e.startsWith('no-such'))).toBe(true);
  expect(bad.errors.some((e) => e.includes('common-n-slides'))).toBe(true);
  // A draft mark goes when the words are given.
  const drafted = FR.replace('# en: ' + englishHash('Save it') + '\ncommon-save', '# draft from common-keep\n# en: ' + englishHash('Save it') + '\ncommon-save');
  expect(apply(EN, drafted, 'fr', { 'common-save': 'Enregistrer' }).source).not.toContain('draft from');
});

test('--sheet: every message of a language beside its English, by group, with its words as they stand', () => {
  const all = sheet(EN, FR, 'fr');
  expect(all.messages.map((m) => m.id)).toEqual(['shell-menu', 'common-save', 'common-document', 'common-n-slides', 'outline-due-date']);
  expect(all.messages[1]).toEqual({ id: 'common-save', en: 'Save', comment: ['A verb: the button that saves.'], group: 'the shell', words: 'Garder' });
  expect(all.messages[0].same).toBe(true);
  expect(all.messages[3].forms).toEqual(['one', 'many', 'other']);
  expect(sheet(EN, FR, 'fr', '', ['outliner']).messages.map((m) => m.id)).toEqual(['outline-due-date']);
  expect(all.todo.map((w) => w.id)).toEqual(['outline-agenda', 'common-save']);
});
