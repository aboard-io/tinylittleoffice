import { test, expect } from '@playwright/test';
import AxeBuilder from '@axe-core/playwright';
import { shot } from './helpers';

// As anyone opening a link finds it. (The rest of reading a link is in test/dom/view.test.ts.)
test.use({ storageState: { cookies: [], origins: [] } });

test('a link opens as the document, with Edit a button away', async ({ page }) => {
  const { encodeEnvelope } = await import('../src/lib/envelope.ts');
  const link = (app: string, body: string, title?: string) => `/#/v0/${app}/${encodeEnvelope({ created: 1, body, title })}`;
  // Accessibility scanned by axe, which needs a real browser's rendering.
  await page.goto(link('write', '# Hello\nSee https://example.com for *more*.', 'A letter'));
  await expect(page.locator('.to-view.prose h1')).toHaveText('Hello');
  await shot(page, 'view-write');
  expect((await new AxeBuilder({ page }).disableRules(['label-title-only']).analyze()).violations.map((v) => v.id)).toEqual([]);

  // A game is the game: played by its frame's own script, which only a real browser runs.
  await page.goto('about:blank');
  await page.goto(link('adventure', '# Cave\n## start\nDark.\n> Light a match | lit\n## lit\nBats.'));
  const game = page.frameLocator('iframe.to-view');
  await game.getByRole('button', { name: 'Light a match' }).click();
  await expect(game.locator('#scene')).toContainText('Bats.');
});
