/**
 * The byte-stability corpus, written from the old tree: every template
 * body, every fenced TLO example in docs/tlo.md and the skill, every
 * document behind a link in the skill, and every `example` of every app
 * definition. One JSON file a source, so a diff shows what moved. The old
 * tree's pictures from the web are left out, as main left them out of its
 * templates: a picture's line goes with the blank line after it, and a
 * table's Image column of addresses goes whole. A file whose source is the
 * rebuilt tree (written by hand from this tree's templates) is kept, and its
 * pictures are left out the same way.
 *
 *   node test/doc/corpus/make.ts [path to the old tree]
 */
import { existsSync, mkdirSync, readdirSync, readFileSync, writeFileSync } from 'node:fs';
import { basename, join, resolve } from 'node:path';
import { pathToFileURL } from 'node:url';

const old = resolve(process.argv[2] ?? join(import.meta.dirname, '../../../../tinyoffice'));
const here = import.meta.dirname;
const unpicture = (text: string) => {
  const lines = text.split('\n').filter((l, i, all) => !/^!\[[^\]]*\]\(\S+\)$/.test(l) && !(l === '' && /^!\[[^\]]*\]\(\S+\)$/.test(all[i - 1] ?? '')));
  for (let i = 0; i < lines.length; i++) {
    const head = lines[i].split(' | ');
    const col = head.indexOf('Image');
    if (col < 0 || head.length < 2 || !/^---( \| ---)*$/.test(lines[i + 1] ?? '')) continue;
    for (let j = i; j < lines.length && lines[j].includes(' | '); j++)
      lines[j] = lines[j]
        .split(' | ')
        .filter((_, k) => k !== col)
        .join(' | ');
  }
  return lines.join('\n');
};
const read = (file: string) => JSON.parse(readFileSync(join(here, file), 'utf8')) as { source: string; docs: { name: string; text: string }[] };
const rebuilt = (file: string) => existsSync(join(here, file)) && read(file).source.includes('(the rebuilt tree)');
const put = (file: string, source: string, docs: { name: string; text: string }[]) => {
  docs = docs.map((d) => ({ ...d, text: unpicture(d.text) }));
  mkdirSync(join(here, file, '..'), { recursive: true });
  // A file keeps its indent (Prettier holds apps/ to two spaces; the top level is in .prettierignore), so a diff shows only what moved.
  const indent = existsSync(join(here, file)) ? (/^\{\n( +)/.exec(readFileSync(join(here, file), 'utf8'))?.[1].length ?? 1) : file.startsWith('apps/') ? 2 : 1;
  writeFileSync(join(here, file), JSON.stringify({ source, docs }, null, indent) + '\n');
  console.log(`${file}: ${docs.length}`);
};

// Templates: the module's own bodies, as the old writer wrote them.
const { TEMPLATES } = (await import(pathToFileURL(join(old, 'src/lib/templates.ts')).href)) as { TEMPLATES: Record<string, { id: string; body: string }[]> };
put(
  'templates.json',
  'src/lib/templates.ts',
  Object.entries(TEMPLATES).flatMap(([app, ts]) => ts.map((t) => ({ name: `${app}/${t.id}`, text: t.body }))),
);

// Fenced examples with no language: TLO as a person learns it.
const fences = (text: string) => [...text.matchAll(/^```\n([\s\S]*?)\n```$/gm)].map((m) => m[1]);
for (const [file, source] of [
  ['tlo-md.json', 'docs/tlo.md'],
  ['skill.json', 'skill/tinyoffice/SKILL.md'],
] as const) {
  const text = readFileSync(join(old, source), 'utf8');
  put(
    file,
    source,
    fences(text).map((t, i) => ({ name: `fence ${i + 1}`, text: t })),
  );
}

// The documents behind the skill's links: the old guide checked each against its app.
const skill = readFileSync(join(old, 'skill/tinyoffice/SKILL.md'), 'utf8');
const links = [...skill.matchAll(/https:\/\/tinylittleoffice\.com\/([a-z]+)\/#(\S+)/g)].flatMap((m) => {
  const params = new URLSearchParams(m[2]);
  const doc = params.get('doc');
  return doc ? [{ name: `${m[1]}: ${params.get('title') ?? ''}`, text: doc }] : [];
});
put('skill-links.json', 'skill/tinyoffice/SKILL.md (doc= of each link)', links);

// Each app definition's `example`: a string literal, read as JavaScript reads it.
const apps = join(old, 'src/apps');
for (const file of readdirSync(apps)
  .filter((f) => f.endsWith('.def.ts'))
  .sort()) {
  const src = readFileSync(join(apps, file), 'utf8');
  const docs: { name: string; text: string }[] = [];
  for (const m of src.matchAll(/\bexample:\s*(['"`])/g)) {
    const q = m[1];
    let i = m.index + m[0].length;
    let lit = q;
    while (i < src.length && src[i] !== q) {
      if (src[i] === '\\') lit += src[i++];
      lit += src[i++];
    }
    lit += q;
    docs.push({ name: `example ${docs.length + 1}`, text: new Function(`return ${lit}`)() as string });
  }
  const out = `apps/${basename(file, '.def.ts')}.json`;
  if (docs.length && !rebuilt(out)) put(out, `src/apps/${file}`, docs);
}

// The rebuilt tree's files, kept as they are but for pictures.
for (const file of readdirSync(join(here, 'apps')).map((f) => `apps/${f}`))
  if (rebuilt(file)) {
    const { source, docs } = read(file);
    put(file, source, docs);
  }
