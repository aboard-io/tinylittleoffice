/**
 * The registry: every app's definition, in the order the home page shows them. A definition is light (no
 * editor, no DOM), so this list costs the home page nothing; the build reads it too (vite.config.ts).
 */
import type { AppDef } from './app.ts';
import text from '../apps/text/def.ts';
import sheet from '../apps/sheet/def.ts';
import draw from '../apps/draw/def.ts';
import outline from '../apps/outline/def.ts';

const ALL: AppDef[] = [text, sheet, draw, outline];

export const apps = (): AppDef[] => ALL;
export const appOf = (id: string): AppDef | undefined => ALL.find((a) => a.id === id);

/** The apps by group, in order of first appearance. */
export function groups(): { group: string; apps: AppDef[] }[] {
  const out: { group: string; apps: AppDef[] }[] = [];
  for (const a of ALL) (out.find((g) => g.group === a.group) ?? out[out.push({ group: a.group, apps: [] }) - 1]).apps.push(a);
  return out;
}
