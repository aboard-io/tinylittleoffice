/**
 * The agent guide, skill/tinyoffice/SKILL.md, is written from its template
 * (SKILL.tpl.md): each example there is a document, and here it becomes a
 * link. An example that its app would not keep exactly as written stops
 * the build of the guide, so the guide cannot teach a shape the apps do not
 * read. `npm run skill` writes it; test/skill.test.ts checks it is current.
 *
 *   {{doc:<app>:<title>}}  the document on the lines after, up to {{end}}
 *   {{ex:<app>:<title>}}   the app's own example (src/api.ts example())
 */
import { readFileSync, writeFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import '../src/apps/index.ts';
import { appOf } from '../src/kit/core.ts';
import { example } from '../src/api.ts';

const at = (p: string) => fileURLToPath(new URL(`../skill/tinyoffice/${p}`, import.meta.url));
const enc = (s: string) => encodeURIComponent(s).replace(/%20/g, '+').replace(/[!'()*]/g, (c) => '%' + c.charCodeAt(0).toString(16).toUpperCase());

function url(app: string, title: string, body: string): string {
  const def = appOf(app);
  if (!def) throw new Error(`No app "${app}"`);
  const read = def.read ? def.read(body) : body;
  if (read.trimEnd() !== body.trimEnd()) throw new Error(`${app}: the example is not as the app writes it:\n${read}`);
  return `https://tinylittleoffice.com/${app}/#title=${enc(title)}&doc=${enc(body.trimEnd())}`;
}

export function makeSkill(): string {
  return readFileSync(at('SKILL.tpl.md'), 'utf8')
    .replace(/\{\{doc:(\w+):([^}]*)\}\}\n([\s\S]*?)\n\{\{end\}\}/g, (_, app, title, body) => url(app, title, body))
    .replace(/\{\{ex:(\w+):([^}]*)\}\}/g, (_, app, title) => url(app, title, example(app)));
}

if (process.argv[1] === fileURLToPath(import.meta.url)) writeFileSync(at('SKILL.md'), makeSkill());
