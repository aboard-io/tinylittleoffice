// Every browser test file: the commands it runs (src/kit/commands.ts `trace`) are added, when it ends, to the map the
// registry's lint reads (test/commands-covered.json; vitest.config.ts recordCommands).
import { afterAll } from 'vitest';
import { commands } from 'vitest/browser';
import { trace } from '../../src/kit/commands.ts';

const ran = new Set<string>();
trace.ran = (id) => void ran.add(id);
afterAll(async () => {
  if (ran.size) await (commands as unknown as { recordCommands(ids: string[]): Promise<void> }).recordCommands([...ran]);
});
