/**
 * The whole of Lucide (some 1,800 icons) joined to kit/icons.ts LIBRARY under Lucide's own kebab-case
 * names: a lazy chunk, loaded once by loadIcons() (a document naming an icon the starter set lacks) or with
 * the picker (icons-picker.ts), never in the first chunk.
 */
import { icons } from 'lucide';
import { addIcons, fullJoined } from './icons.ts';

/** "ChartColumn" as a document names it: "chart-column". */
export const kebab = (name: string) =>
  name
    .replace(/([A-Z])([A-Z][a-z])/g, '$1-$2')
    .replace(/([a-z])([A-Z0-9])/g, '$1-$2')
    .replace(/([0-9])([A-Z])/g, '$1-$2')
    .toLowerCase();

/** The names that joined (the starter set's short names keep their own icons). */
export const allIcons: string[] = addIcons(Object.fromEntries(Object.entries(icons).map(([name, node]) => [kebab(name), node])));
fullJoined();
