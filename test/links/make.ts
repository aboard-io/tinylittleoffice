// Makes the links of test/links/corpus.json as one release of the site made them: scripts/link-corpus.sh copies this
// file into a checkout of that release's tag (as test/zz-make-links.test.ts, where its unit project finds it, its imports one folder up), runs it,
// and merges what it writes. It uses only what every v1 release has: the API's apps, templates, link and plain, and
// the kit's packDoc, newLocker and seal, wherever that release kept them. Never run on this tree: the corpus is what
// the releases made, frozen.
import { test } from 'vitest';
import { writeFileSync } from 'node:fs';
import { createHash } from 'node:crypto';
import * as api from '../../src/api.ts';

const first = async <T>(paths: string[]): Promise<T> => {
  for (const p of paths)
    try {
      return (await import(/* @vite-ignore */ p)) as T;
    } catch {
      // Not in this release; the next place.
    }
  throw new Error(`none of ${paths.join(', ')}`);
};

type Entry = { name: string; kind: string; app: string; link: string; sha256: string; bytes: number; password?: string };
const sha = (s: string) => createHash('sha256').update(s, 'utf8').digest('hex');

/** Documents no template is: what people type, and what stresses the packing. */
const EDGES: { name: string; app: string; text: string }[] = [
  { name: 'one word', app: 'write', text: 'Hello\n' },
  { name: 'unicode', app: 'write', text: '# Café ☕ 東京 שלום مرحبا 🙂👍🏽\n\nZero‑width: a​b, combining: é, NBSP: end.\n' },
  { name: 'spaces kept', app: 'write', text: 'Two  spaces,\ttab, trailing   \n\n\n\nThree blank lines above.\n' },
  { name: 'long, past every break', app: 'write', text: Array.from({ length: 120 }, (_, i) => `Line ${i}: the quick brown fox ${i * 7919} jumps.`).join('\n') + '\n' },
  { name: 'incompressible', app: 'write', text: Array.from({ length: 400 }, (_, i) => String.fromCharCode(33 + ((i * 7919 + (i >> 3) * 104729) % 94))).join('') + '\n' },
  {
    name: 'markdown everything',
    app: 'write',
    text: '# H1\n\n## H2\n\n**bold** _it_ `code` [link](https://example.com)\n\n- a\n- b\n  - c\n\n1. one\n2. two\n\n> quote\n\n```\nfenced\n```\n\n| a | b |\n| --- | --- |\n| 1 | 2 |\n',
  },
  { name: 'formulas', app: 'sheet', text: 'Item | Cost:money | Qty:number | Total:money\n--- | --- | --- | ---\nTea | 3.5 | 4 | =B2*C2\nCake | 12 | 1 | =B3*C3\nSum | | | =SUM(D2:D3)\n' },
];

test('make the links', async () => {
  const out = process.env.LINK_CORPUS_OUT;
  if (!out) throw new Error('LINK_CORPUS_OUT');
  const tag = process.env.LINK_CORPUS_TAG ?? '';
  const codec = await first<{ packDoc: (t: string) => { flag: string; bytes: Uint8Array } }>(['../../src/kit/core/codec.ts', '../../src/kit/codec.ts']);
  const crypt = await first<{ newLocker: (p: string) => Promise<unknown>; seal: (l: unknown, f: string, b: Uint8Array) => Promise<string> }>([
    '../../src/kit/share/crypt.ts',
    '../../src/kit/crypt.ts',
  ]);
  const entries: Entry[] = [];
  const add = (name: string, kind: string, app: string, link: string, text: string, password?: string) =>
    entries.push({ name, kind, app, link, sha256: sha(text), bytes: new TextEncoder().encode(text).length, ...(password ? { password } : {}) });
  const site = 'https://tinylittleoffice.com/';
  const apps = await api.apps();
  for (const { id } of apps) {
    const tpls = await api.templates(id);
    for (const t of tpls) add(`${id}/${t.id}`, 'packed', id, api.link(id, t.text, { site }), t.text);
    const t = tpls[0];
    if (!t) continue;
    // The ways a link carries more than its document.
    add(`${id}/${t.id} display`, 'display', id, api.link(id, t.text, { site, display: true }), t.text);
    add(`${id}/${t.id} plain`, 'plain', id, api.plain(id, t.text, { site }), t.text);
    const titled = api.read(api.link(id, t.text, { site, title: 'Named by the link', by: 'A person' }));
    add(`${id}/${t.id} title and by`, 'titled', id, api.link(id, t.text, { site, title: 'Named by the link', by: 'A person' }), titled.text);
  }
  for (const e of EDGES) {
    add(`edge: ${e.name}`, 'packed', e.app, api.link(e.app, e.text, { site }), e.text);
    add(`edge: ${e.name} plain`, 'plain', e.app, api.plain(e.app, e.text, { site }), e.text);
  }
  // Sealed under a password, as the Password dialog seals: the page's app path and the payload.
  for (const e of EDGES.slice(0, 4)) {
    const password = `corpus-${sha(e.name).slice(0, 8)}`;
    const { flag, bytes } = codec.packDoc(e.text);
    const payload = await crypt.seal(await crypt.newLocker(password), flag, bytes);
    add(`edge: ${e.name} sealed`, 'sealed', e.app, `${site}${e.app}/#/v1/${e.app}/${payload}`, e.text, password);
  }
  writeFileSync(out, JSON.stringify({ tag, entries }));
}, 600_000);
