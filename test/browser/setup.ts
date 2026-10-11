// Every browser test file: the commands it runs (src/kit/commands.ts `trace`) are added, when it ends, to the map the
// registry's lint reads (test/commands-covered.json; vitest.config.ts recordCommands).
import { afterAll } from 'vitest';
import { commands } from 'vitest/browser';
import { trace } from '../../src/kit/commands.ts';
import { size } from '../../src/kit/zoom.ts';
import { theme } from '../../src/kit/theme.ts';

const ran = new Set<string>();
trace.ran = (id) => void ran.add(id);
afterAll(async () => {
  if (ran.size) await (commands as unknown as { recordCommands(ids: string[]): Promise<void> }).recordCommands([...ran]);
});

// The size of everything and the theme are kept on the device in either state (kit/store.ts), and this origin's
// localStorage is every file's at once: each file starts at the normal size and the device's theme, whatever another
// file has set for the moment. Each module reads its preference once, so it is read here with the device's keys out
// of the way and put straight back: one synchronous turn, which no other file (on this page's one thread) sees.
const PREFS = ['tinyoffice.size', 'to-theme'];
const held = PREFS.map((k) => localStorage.getItem(k));
for (const k of PREFS) localStorage.removeItem(k);
size();
theme();
PREFS.forEach((k, i) => held[i] !== null && localStorage.setItem(k, held[i]!));
