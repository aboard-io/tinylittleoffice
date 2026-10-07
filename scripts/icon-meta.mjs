// Builds src/lib/icon-meta.ts from a Lucide release: every icon's tags and categories, and the categories' titles.
// Usage: node scripts/icon-meta.mjs <path to an unpacked lucide-<version> directory>
import { readdirSync, readFileSync, writeFileSync } from 'node:fs';
import { resolve, basename } from 'node:path';
const root = process.argv[2];
if (!root) throw new Error('Where is the unpacked Lucide release?');
const cats = {};
for (const f of readdirSync(resolve(root, 'categories')).filter((f) => f.endsWith('.json'))) {
  const j = JSON.parse(readFileSync(resolve(root, 'categories', f), 'utf8'));
  cats[basename(f, '.json')] = j.title;
}
const icons = {};
for (const f of readdirSync(resolve(root, 'icons')).filter((f) => f.endsWith('.json')).sort()) {
  const j = JSON.parse(readFileSync(resolve(root, 'icons', f), 'utf8'));
  icons[basename(f, '.json')] = [j.tags ?? [], j.categories ?? []];
}
const version = basename(root).replace(/^lucide-/, '');
writeFileSync(
  resolve(import.meta.dirname, '../src/lib/icon-meta.ts'),
  `/** Every Lucide icon's tags and categories, and the categories' names: from Lucide ${version} by scripts/icon-meta.mjs. Loaded with the full library, not before. */
export const CATEGORIES: Record<string, string> = ${JSON.stringify(cats)};
/** name → [tags, categories] */
export const META: Record<string, [string[], string[]]> = ${JSON.stringify(icons)};
`,
);
console.log(Object.keys(icons).length, 'icons,', Object.keys(cats).length, 'categories');
