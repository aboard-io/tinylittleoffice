// Every browser test file: the site's commands it runs (src/kit/core/commands.ts `trace`) are added, when it ends, to the
// map the registry's lint reads (test/commands-covered.json; vitest.config.ts recordCommands). A command a test declares
// for a page (its `host` scope) or for an app built outside the suite (test/browser/kit.test.ts) is not the site's, and
// is left out: the site's scopes are the kit's, the words', the rows' and each of the suite's apps'.
import { afterAll } from 'vitest';
import { commands } from 'vitest/browser';
import { trace } from '../../src/kit/core/commands.ts';
import { size } from '../../src/kit/ui/zoom.ts';
import { theme } from '../../src/kit/ui/theme.ts';

const ran = new Set<string>();
trace.ran = (id) => void ran.add(id);
afterAll(async () => {
  if (!ran.size) return;
  const { apps } = await import('../../src/kit/core/apps.ts');
  const site = new Set(['kit', 'text', 'rows', ...apps().map((a) => a.id)]);
  const ids = [...ran].filter((id) => site.has(id.slice(0, id.indexOf('.'))));
  if (ids.length) await (commands as unknown as { recordCommands(ids: string[]): Promise<void> }).recordCommands(ids);
});

// The size of everything and the theme are kept on the device in either state (kit/core/store.ts), and this origin's
// localStorage is every file's at once: each file starts at the normal size and the device's theme, whatever another
// file has set for the moment. Each module reads its preference once, so it is read here with the device's keys out
// of the way and put straight back: one synchronous turn, which no other file (on this page's one thread) sees.
const PREFS = ['tinyoffice.size', 'to-theme'];
const held = PREFS.map((k) => localStorage.getItem(k));
for (const k of PREFS) localStorage.removeItem(k);
size();
theme();
PREFS.forEach((k, i) => held[i] !== null && localStorage.setItem(k, held[i]!));
