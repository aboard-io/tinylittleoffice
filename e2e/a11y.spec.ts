/**
 * Axe over every app at phone size (WebKit, 390 by 844), in light and in dark: the home page, then each app
 * of the registry opened on its first template. One test with soft assertions, so a run reports every app
 * and theme that fails rather than the first. (The smoke's axe covers the home, a text and the Display Link
 * at both sizes; the site and diagram specs, their own pages.)
 *
 *   PW_PORT=4423 npx playwright test e2e/a11y.spec.ts --project=phone
 */
import { test, expect, type Page } from '@playwright/test';
import AxeBuilder from '@axe-core/playwright';
import { apps } from '../src/kit/apps.ts';
import { encodeDoc } from '../src/kit/codec.ts';
import { routeHash } from '../src/kit/route.ts';

// theme.js tells iOS alone that the page may not zoom (see smoke.spec.ts), which axe's meta-viewport rule cannot know.
const axe = (page: Page) => new AxeBuilder({ page }).disableRules(['meta-viewport']).analyze();
/** A violation in a line: the rule, and where. */
const said = (v: Awaited<ReturnType<typeof axe>>['violations'][number]) =>
  `${v.id} (${v.impact}): ${v.nodes.slice(0, 3).map((n) => `${n.target.map(String).join(' >> ')}${n.any[0]?.message ? ` [${n.any[0].message}]` : ''}`).join(', ')}${v.nodes.length > 3 ? ` and ${v.nodes.length - 3} more` : ''}`;

/** Until the editor's element is defined and drawn, and the fonts are in. */
async function drawn(page: Page) {
  await page.waitForFunction(() => {
    const el = document.querySelector('main.to-main > *');
    return !!el && !!customElements.get(el.localName) && !!(el.shadowRoot ?? el).childElementCount;
  });
  await page.evaluate(() => document.fonts.ready.then(() => new Promise((r) => requestAnimationFrame(() => requestAnimationFrame(r)))));
}

test('axe finds nothing in any app, at phone size, light and dark', async ({ page }, info) => {
  test.skip(info.project.name !== 'phone', 'at phone size');
  test.setTimeout(300_000);
  const errors: string[] = [];
  page.on('pageerror', (e) => errors.push(String(e)));
  for (const scheme of ['light', 'dark'] as const) {
    await page.emulateMedia({ colorScheme: scheme });
    await page.goto('/');
    await expect(page.locator('html')).toHaveAttribute('data-theme', scheme);
    await expect(page.locator('.to-app-open').first()).toBeVisible();
    expect.soft((await axe(page)).violations.map(said), `home, ${scheme}`).toEqual([]);
    for (const app of apps()) {
      const tpl = app.templates[0];
      // A fresh load each time, so nothing of the app before is on the page.
      await page.goto('about:blank');
      await page.goto(`/${routeHash(app.id, encodeDoc(tpl.doc))}`);
      await expect(page.locator('html')).toHaveAttribute('data-theme', scheme);
      await drawn(page);
      expect.soft((await axe(page)).violations.map(said), `${app.id} (${tpl.name}), ${scheme}`).toEqual([]);
    }
  }
  expect(errors).toEqual([]);
});
