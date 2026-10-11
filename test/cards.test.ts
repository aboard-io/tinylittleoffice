// The share cards (scripts/make-cards.ts, public/og/<app>.png) and the home page's (scripts/icons.ts, og.png) are
// drawn in IBM Plex like the rest of the site (Paul, 2026-10-11: "we use Plex everywhere"): the page Chromium draws
// names the site's stack and carries the site's own faces from public/fonts/, so nothing is fetched and nothing
// falls back to the machine's system-ui.
import { test, expect } from 'vitest';
import { cardHtml } from '../scripts/make-cards.ts';
import { ogHtml } from '../scripts/icons.ts';
import { appOf } from '../src/kit/apps.ts';
import { FONT } from '../src/kit/draw.ts';

const plex = (html: string) => {
  expect(html).toContain(`font-family:${FONT}`);
  expect(FONT.startsWith("'IBM Plex Sans'")).toBe(true);
  expect(html).not.toMatch(/font-family="?system-ui/);
  // Every face of src/styles/fonts.css, its file inline.
  const faces = [...html.matchAll(/@font-face\s*\{[^}]*\}/g)].map((m) => m[0]);
  expect(faces).toHaveLength(14);
  for (const f of faces) expect(f).toMatch(/src:\s*url\('data:font\/woff2;base64,[A-Za-z0-9+/=]{1000,}'\) format\('woff2'\)/);
  expect(html).not.toContain('/fonts/');
};

test("an app card is drawn in the Plex stack, with the site's faces inline", async () => {
  plex(await cardHtml(appOf('write')!));
});

test("og.png is drawn in the Plex stack, with the site's faces inline", () => {
  plex(ogHtml);
  expect(ogHtml).toContain('Tiny Little Office');
});
