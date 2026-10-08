import { test, expect, type Page } from '@playwright/test';
import { shot } from './helpers';

/** Open the picker from the toolbar and choose a template by name. */
async function startFrom(page: Page, name: string) {
  await page.locator('.to-toolbar, .sheet-bar').getByRole('button', { name: 'Start from a template…' }).click();
  const dialog = page.locator('sl-dialog.to-templates');
  await expect(dialog).toHaveAttribute('open');
  await dialog.locator('.to-template', { hasText: name }).click();
  await expect(dialog).toHaveCount(0);
}

test('an empty text starts from a template: a picture of each, one undo back to blank', async ({ page }) => {
  await page.goto('/#/write');
  // Offered twice, quietly: a line on the blank page and a button in the toolbar. Never a dialog by itself.
  const line = page.locator('.to-template-line');
  await expect(line).toContainText('Start from a template');
  await expect(page.locator('sl-dialog.to-templates')).toHaveCount(0);
  await line.getByRole('button').click();
  const dialog = page.locator('sl-dialog.to-templates');
  await expect(dialog).toHaveAttribute('open');
  const cards = dialog.locator('.to-template');
  await expect(cards).toHaveCount(8);
  await expect(cards.locator('.pic svg')).toHaveCount(8);
  await expect(cards.filter({ hasText: 'Business plan' })).toHaveCount(1);
  await shot(page, 'templates');
  await cards.filter({ hasText: 'Meeting notes' }).click();
  await expect(dialog).toHaveCount(0);
  const doc = page.getByRole('textbox', { name: 'Document' });
  await expect(doc.locator('h1')).toHaveText('Meeting notes');
  await expect(doc.locator('h2')).toHaveText(['Agenda', 'Notes', 'Decisions', 'Actions']);
  await expect.poll(() => page.url()).toMatch(/#\/v2\/write\/[WYZR]/);
  // Once there are words, the offer is gone; one undo and the blank page is back, offer and all.
  await expect(line).toHaveCount(0);
  await expect(page.getByRole('button', { name: 'Start from a template…' })).toHaveCount(0);
  await page.getByRole('button', { name: 'Undo' }).click();
  await expect(doc.locator('h1')).toHaveCount(0);
  await expect(line).toBeVisible();
  // The plans are templates here now: the sections, each with its questions in italics.
  await startFrom(page, 'Go-to-market plan');
  await expect(doc.locator('h1')).toHaveText('Go-to-market plan');
  await expect(doc.locator('h2')).toHaveCount(7);
  await expect(doc.locator('h2').first()).toHaveText('The customer');
  // (The first italic line is the subtitle; the questions follow each heading.)
  await expect(doc.locator('h2 + p i').first()).toContainText('Who buys first');
});

test('a sheet starts from a template, sums and chart included', async ({ page }) => {
  await page.goto('/#/sheet');
  await expect(page.locator('.to-template-line')).toBeVisible();
  await startFrom(page, 'Budget');
  await expect(page.getByRole('textbox', { name: 'A1', exact: true })).toHaveValue('Item');
  await expect(page.getByRole('textbox', { name: 'D8', exact: true })).toHaveValue('$65.00');
  await expect(page.locator('.to-template-line')).toHaveCount(0);
  await page.getByRole('button', { name: 'Undo' }).click();
  await expect(page.getByRole('textbox', { name: 'A1', exact: true })).toHaveValue('');
  await startFrom(page, 'Comparison');
  await expect(page.locator('.sheet-chart svg')).toBeVisible();
  await expect(page.getByRole('textbox', { name: 'A2', exact: true })).toHaveValue('Alpha');
});

test('a deck starts from a template: slides with icons, from the first', async ({ page }) => {
  await page.goto('/#/deck');
  await expect(page.locator('.to-template-line')).toBeVisible();
  await startFrom(page, 'A talk');
  await expect(page.locator('.deck-thumb')).toHaveCount(6);
  await expect(page.locator('to-rich.title .write-page')).toHaveText('Talk title');
  await expect(page.locator('.deck-kind')).toHaveText('Title');
  await expect(page.locator('.to-template-line')).toHaveCount(0);
  await page.getByRole('button', { name: 'Undo' }).click();
  await expect(page.locator('.deck-thumb')).toHaveCount(1);
  await expect(page.locator('.to-template-line')).toBeVisible();
});

