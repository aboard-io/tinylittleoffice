// There is no Website Builder (Paul, 2026-10-11): a page of arbitrary HTML, style and script from a link, served
// from our own domain, is a phishing kit, and no sandbox makes it safe. A document never runs code: twelve apps,
// none of them draws a web page of its own, and the site serves no frame script for one.
import { test, expect } from 'vitest';
import { existsSync, readFileSync } from 'node:fs';
import { apps, appOf } from '../src/kit/apps.ts';

const file = (path: string) => new URL(`../${path}`, import.meta.url);

test('twelve apps, and no website among them', () => {
  expect(apps().map((a) => a.id)).toHaveLength(12);
  expect(appOf('site')).toBeUndefined();
  expect(apps().some((a) => 'page' in a)).toBe(false);
  expect(existsSync(file('src/apps/site'))).toBe(false);
});

test('no frame script is built or allowed', () => {
  expect(existsSync(file('scripts/site-frame.ts'))).toBe(false);
  for (const f of ['vite.config.ts', 'vitest.config.ts', 'public/_headers', 'src/kit/shell.ts'])
    expect(readFileSync(file(f), 'utf8'), f).not.toMatch(/site-frame|siteFrame|to-display-site|allow-popups/);
});
