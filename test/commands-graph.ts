// The registry as a graph, for the lints (test/commands.test.ts) and the browser tests that walk it: every command,
// the keys each binds, and which pairs of commands one key reaches at once (a collision).
import { keyList, type Command } from '../src/kit/commands.ts';
import { allCommands, scopes } from '../scripts/commands.ts';

export { allCommands, scopes };

/** Where a command's keys are heard: its scope, and its place in it ('' for everywhere in the scope). */
const placeOf = (c: Command): string => (c.scope === 'text' ? 'words' : c.scope === 'rows' ? 'rows' : (c.at ?? ''));

/**
 * Whether one key can reach both commands: the same scope at the same place (or one of them everywhere in it); the
 * page's everywhere; an app's commands everywhere in the app, or at the place the words' or the rows' are heard.
 * Two commands whose key is the browser's (Copy, Cut, Paste) are the browser's to route, to whatever has the focus.
 */
export function overlap(a: Command, b: Command): boolean {
  if (a.native && b.native) return false;
  const [pa, pb] = [placeOf(a), placeOf(b)];
  if (a.scope === b.scope) return pa === pb || !pa || !pb;
  if (a.scope === 'kit' || b.scope === 'kit') return true;
  const inner = (x: Command) => x.scope === 'text' || x.scope === 'rows';
  if (inner(a) && inner(b)) return false;
  const [app, kit] = inner(a) ? [b, a] : [a, b];
  const at = placeOf(app);
  return !at || at === placeOf(kit);
}

/** Every pair of commands one key reaches at once: `a ~ b`, the ids in order, with the key. */
export function collisions(cmds: Command[] = allCommands()): { id: string; key: string; a: Command; b: Command }[] {
  const out: { id: string; key: string; a: Command; b: Command }[] = [];
  const keyed = cmds.filter((c) => c.keys);
  for (let i = 0; i < keyed.length; i++)
    for (let j = i + 1; j < keyed.length; j++) {
      const [a, b] = [keyed[i], keyed[j]];
      const shared = keyList(a.keys).filter((k) => keyList(b.keys).includes(k));
      if (!shared.length || !overlap(a, b)) continue;
      // Two apps never meet: each is in force only in its own editor.
      const apps = new Set(scopes().map((s) => s.id).filter((s) => !['kit', 'text', 'rows'].includes(s)));
      if (apps.has(a.scope) && apps.has(b.scope) && a.scope !== b.scope) continue;
      const [x, y] = [a.id, b.id].sort();
      out.push({ id: `${x} ~ ${y}`, key: shared[0], a, b });
    }
  return out;
}
