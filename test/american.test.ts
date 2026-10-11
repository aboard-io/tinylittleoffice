// The product's English is American (Paul, 2026-10-11): every string in en.ts and every template's sample
// content, placed in New York where a template is placed anywhere, a calendar's times in the reader's zone.
import { test, expect } from 'vitest';
import { readFileSync, readdirSync } from 'node:fs';
import { join } from 'node:path';
import { british } from './british.ts';

const root = join(import.meta.dirname, '..');
const apps = join(root, 'src', 'apps');

/** Every template file: each app's templates.ts and its templates.md. */
const templateFiles = readdirSync(apps).flatMap((id) =>
  ['templates.ts', 'templates.md']
    .map((f) => join(apps, id, f))
    .filter((p) => {
      try {
        readFileSync(p);
        return true;
      } catch {
        return false;
      }
    }),
);

test('the list catches what it is for, and lets American words by', () => {
  expect(british('A colour, the centre, organised, a postcode, nappies, 07700 900123, zone: Europe/London, £5', 'x')).toHaveLength(8);
  expect(british('A color, the center, organized, a ZIP code, diapers, (212) 555-0123, $5, a flat tangent, ticket, shopping', 'x')).toEqual([]);
});

test('en.ts says nothing British', () => {
  expect(british(readFileSync(join(root, 'src', 'i18n', 'en.ts'), 'utf8'), 'en.ts')).toEqual([]);
});

test('no template says anything British, and no calendar or trip template carries a zone', () => {
  expect(templateFiles.length).toBeGreaterThanOrEqual(24);
  expect(templateFiles.flatMap((p) => british(readFileSync(p, 'utf8'), p.slice(root.length + 1)))).toEqual([]);
  for (const id of ['cal', 'trip']) expect(readFileSync(join(apps, id, 'templates.ts'), 'utf8'), id).not.toMatch(/^zone:/m);
});
