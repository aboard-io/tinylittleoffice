import { test } from 'node:test';
import { writeFileSync } from 'node:fs';
import './src/apps/index.ts';
import { apps } from './src/kit/core.ts';
import { specOf } from './src/lib/diagram.ts';
import { readLines, writeLines } from './src/lib/lines.ts';
test('canon', () => {
  const out: Record<string, [string, string]> = {};
  for (const def of apps()) {
    const spec = specOf(def.id);
    if (!spec?.form || def.id === 'db') continue;
    const read = def.read ? def.read(spec.example) : spec.example;
    const canon = writeLines(readLines(read, spec.form), spec.form);
    if (canon !== spec.example) out[def.id] = [spec.example, canon];
  }
  writeFileSync('/tmp/claude-1000/-home-exedev-workspace-tinyoffice/32386e2e-fa6f-4ad3-96f4-db85d20bf3ac/scratchpad/canon.json', JSON.stringify(out, null, 1));
  console.log(Object.keys(out).join(' '));
});
