import { test, expect } from '@playwright/test';
import AxeBuilder from '@axe-core/playwright';
import { shot } from './helpers';

// As anyone opening a link finds it.
test.use({ storageState: { cookies: [], origins: [] } });

test('a link opens as the document, with Edit a button away', async ({ page }) => {
  const { encodeEnvelope } = await import('../src/lib/envelope.ts');
  const link = (app: string, body: string, title?: string) => `/#/v2/${app}/${encodeEnvelope({ created: 1, body, title })}`;
  // A text is its words: no toolbar, links that work.
  await page.goto(link('write', '# Hello\nSee https://example.com for *more*.', 'A letter'));
  await expect(page.locator('.to-view.prose h1')).toHaveText('Hello');
  await expect(page.locator('.to-view.prose a')).toHaveAttribute('href', 'https://example.com');
  await expect(page.getByRole('textbox', { name: 'Document' })).toHaveCount(0);
  await expect(page.getByRole('button', { name: 'Undo' })).toHaveCount(0);
  await expect(page).toHaveTitle('A letter · TinyLittleOffice');
  await shot(page, 'view-write');
  expect((await new AxeBuilder({ page }).disableRules(['label-title-only']).analyze()).violations.map((v) => v.id)).toEqual([]);
  // Edit, and it is the editor, on the same link.
  const before = page.url();
  await page.getByRole('button', { name: 'Edit' }).click();
  await expect(page.getByRole('textbox', { name: 'Document' })).toContainText('See https://example.com');
  expect(page.url()).toBe(before);

  // A game is the game.
  await page.goto('about:blank');
  await page.goto(link('adventure', '# Cave\n## start\nDark.\n> Light a match | lit\n## lit\nBats.'));
  const game = page.frameLocator('iframe.to-view');
  await game.getByRole('button', { name: 'Light a match' }).click();
  await expect(game.locator('#scene')).toContainText('Bats.');
  await expect(page.locator('to-adventure')).toHaveCount(0);
  await page.getByRole('button', { name: 'Edit' }).click();
  await expect(page.locator('to-adventure iframe')).toBeVisible();
  await page.getByRole('button', { name: 'List', exact: true }).click();
  await expect(page.locator('to-adventure to-lines')).toBeVisible();

  // Anything else is its pages; a deck presents.
  await page.goto('about:blank');
  await page.goto(link('todo', '- Book flights\nx Renew passport'));
  await expect(page.locator('.to-view.pages svg')).toContainText('Book flights');
  await expect(page.locator('to-todo')).toHaveCount(0);
  await page.goto('about:blank');
  await page.goto(link('zine', 'Small Joys\nIssue one\n\nCoffee\nThe first cup.'));
  await expect(page.frameLocator('iframe.to-view').locator('section.on')).toContainText('Small Joys');
  await page.goto('about:blank');
  await page.goto(link('deck', 'Hello\none\ntwo'));
  await expect(page.locator('.deck-show')).toBeVisible();

  // Something new opens ready to make; so does a link written for a program to fill in.
  await page.goto('about:blank');
  await page.goto('/#/write');
  await expect(page.getByRole('textbox', { name: 'Document' })).toBeVisible();
  await page.goto('about:blank');
  await page.goto('/menu/#doc=%23+Cafe%0AEspresso+%7C+3.00');
  await expect(page.locator('.to-view.pages .sheet > svg')).toContainText('Espresso');
  await expect(page.getByRole('button', { name: 'Edit' })).toBeVisible();
});
