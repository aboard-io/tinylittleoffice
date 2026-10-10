// The agent skill and /llms.txt are written from their template and the registry (npm run skill); test/lints.test.ts holds them current.
import { test, expect } from 'vitest';
import { makeLlms, makeSkill } from '../scripts/make-skill.ts';
import { apps } from '../src/kit/apps.ts';


test('the skill names every app, teaches the plain link, and leaves no placeholder behind', () => {
  const skill = makeSkill();
  expect(skill.startsWith('---\nname: tinyoffice\ndescription: ')).toBe(true);
  for (const a of apps()) expect(skill).toContain(`| \`${a.id}\` | ${a.name} |`);
  expect(skill).toContain('#title=<title>&doc=<document>');
  expect(skill).toContain('https://tinylittleoffice.com/sheet/#doc=');
  expect(skill).not.toMatch(/\{\{[a-z]/);
  expect(makeLlms(skill).startsWith('# Tiny Little Office links')).toBe(true);
});
