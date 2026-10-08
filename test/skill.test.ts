// The agent guide is written from its template, and every example in it is a document its app keeps as written.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { makeSkill } from '../scripts/make-skill.ts';

test('the agent guide is current with its template (npm run skill)', () => {
  assert.equal(readFileSync(new URL('../skill/tinyoffice/SKILL.md', import.meta.url), 'utf8'), makeSkill());
});
