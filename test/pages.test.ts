import { test } from 'node:test';
import assert from 'node:assert/strict';
import '../src/apps/index.ts';
import '../src/lib/pageedit.ts';
import { apps, pageScripts } from '../src/kit/core.ts';
import { EDIT_SCRIPT, editData } from '../src/lib/pageedit.ts';

const SAMPLE = `# Title
A line
Another | 12
- one
- two`;

/** The inline scripts of a page: [type attribute, text]. */
const scriptsOf = (html: string) => [...html.matchAll(/<script([^>]*)>([\s\S]*?)<\/script>/g)].map((m) => [m[1], m[2]] as const);

test('every script a page carries is a registered, fixed one, so the CSP can allow it by hash', () => {
  const known = new Set(pageScripts());
  assert.ok(known.size >= 10, `only ${known.size} page scripts are registered`);
  let seen = 0;
  for (const def of apps()) {
    if (!def.document) continue;
    for (const body of ['', SAMPLE, def.read?.(SAMPLE) ?? SAMPLE]) {
      for (const [attrs, text] of scriptsOf(def.document(body, { created: null }))) {
        if (/type="application\/json"/.test(attrs)) continue;
        assert.ok(known.has(text), `${def.id}: a script that is not registered: ${text.slice(0, 80)}`);
        seen++;
      }
    }
  }
  assert.ok(seen > 0);
  // The in-place editing script is one of them, and its data travels as JSON.
  assert.ok(known.has(EDIT_SCRIPT.slice(8, -9)));
  assert.match(editData([['a']], [], null), /^<script type="application\/json" id="lf">/);
});

test('no page puts document text inside a script, where it could run', () => {
  for (const def of apps()) {
    if (!def.document) continue;
    const html = def.document('# </script><script>alert(1)</script>\nx | 1', { created: null });
    for (const [attrs, text] of scriptsOf(html)) if (/type="application\/json"/.test(attrs)) assert.ok(!text.includes('</script'), def.id);
    assert.ok(!html.includes('<script>alert(1)</script>'), def.id);
  }
});
